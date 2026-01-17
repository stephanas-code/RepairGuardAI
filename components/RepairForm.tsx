
import React, { useState, useRef, useEffect } from 'react';
import { DeviceCategory, RepairJob, AISuggestion, User, DraftRepair, TIER_FEATURES } from '../types';
import { analyzeFault, extractDeviceMetadata } from '../geminiService';
import { signRecord } from '../cryptoUtils';
import { getAllRepairs, saveUser, saveSMS, saveDraft, deleteDraft, checkJobLimit, saveAuditLog } from '../db';
import TrustReceipt from './TrustReceipt';
import { 
  Smartphone, Laptop, Printer, Tablet, Package, User as UserIcon, Phone, 
  Tag, Terminal, CheckCircle2, ShieldCheck, Sparkles, PlusCircle, 
  PenTool, AlertTriangle, Hash, Activity, Mail, Landmark, Shield, 
  Keyboard, MousePointer2, CreditCard, Banknote, X, MessageSquare,
  WifiOff, Lock, Save, Camera, RefreshCw, Image, Eye, Loader2,
  Usb, Download, Check, Scale, Gavel, BrainCircuit
} from 'lucide-react';

declare global {
  interface Navigator {
    usb?: {
      requestDevice(options: { filters: any[] }): Promise<any>;
    };
  }
}

interface RepairFormProps {
  user: User;
  onSubmit: (job: RepairJob) => void;
  isOnline: boolean;
  initialData?: DraftRepair | null;
  onUserUpdate?: (user: User) => void;
}

const RepairForm: React.FC<RepairFormProps> = ({ user, onSubmit, isOnline, initialData, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    category: 'Phone' as DeviceCategory, brand: '', model: '',
    serial: '', initialCondition: '', fault: '',
    agreedAmount: '', initialDeposit: ''
  });

  const [photos, setPhotos] = useState<{front?: string, back?: string}>({});
  const [activeCamera, setActiveCamera] = useState<'front' | 'back' | null>(null);
  const [scanningPhoto, setScanningPhoto] = useState<'front' | 'back' | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isRegeneratingAI, setIsRegeneratingAI] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [bridgeAvailable, setBridgeAvailable] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [bridgeStatusMsg, setBridgeStatusMsg] = useState<string>("Checking verification service...");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTierId = user.currentPlanId ? user.currentPlanId.toUpperCase() : 'FREE';
  const features = TIER_FEATURES[currentTierId as keyof typeof TIER_FEATURES] || TIER_FEATURES.FREE;

  useEffect(() => {
    const checkBridge = () => {
      try {
        const ws = new WebSocket("ws://127.0.0.1:8765");
        ws.onopen = () => {
          setBridgeAvailable(true);
          setBridgeStatusMsg("✅ Bridge Driver detected");
          ws.close();
        };
        ws.onerror = () => {
          setBridgeAvailable(false);
          setBridgeStatusMsg("❌ Bridge Driver not installed");
        };
      } catch {
        setBridgeAvailable(false);
      }
    };
    checkBridge();
  }, []);

  const verifyDevice = () => {
    setIsVerifying(true);
    const ws = new WebSocket("ws://127.0.0.1:8765");
    ws.onmessage = async (event) => {
      try {
        const deviceData = JSON.parse(event.data);
        setFormData(prev => ({
          ...prev,
          serial: deviceData.serial || deviceData.imei || prev.serial,
          brand: deviceData.brand || prev.brand,
          model: deviceData.model || prev.model
        }));
        alert("Device verified via local Bridge Driver.");
      } catch (err) {
        console.error("Error parsing bridge data", err);
      } finally {
        setIsVerifying(false);
        ws.close();
      }
    };
    ws.onerror = () => {
      setIsVerifying(false);
      alert("Bridge Driver not responding.");
    };
  };

  const [draftId, setDraftId] = useState<string | null>(null);
  const [ndprConsent, setNdprConsent] = useState(false);
  const [ownershipConsent, setOwnershipConsent] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [techSignature, setTechSignature] = useState<string | null>(null);
  const [generatedJob, setGeneratedJob] = useState<RepairJob | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        clientName: initialData.clientName || '',
        clientPhone: initialData.clientPhone || '',
        clientEmail: initialData.clientEmail || '',
        category: initialData.category || 'Phone',
        brand: initialData.brand || '',
        model: initialData.model || '',
        serial: initialData.serial || '',
        initialCondition: initialData.initialCondition || '',
        fault: initialData.fault || '',
        agreedAmount: initialData.agreedAmount || '',
        initialDeposit: initialData.initialDeposit || ''
      });
      setPhotos({ front: initialData.devicePhotoFront, back: initialData.devicePhotoBack });
      setAiSuggestions(initialData.aiSuggestions || []);
      setDraftId(initialData.id);
    }
  }, [initialData]);

  const handleSaveDraft = async () => {
    if (!formData.clientName && !formData.clientPhone) {
      return alert('Client Name or Phone required to save a draft.');
    }
    
    const draft: DraftRepair = {
      id: draftId || `draft-${Date.now()}`,
      company: user.company,
      createdBy: user.id,
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      clientEmail: formData.clientEmail,
      category: formData.category,
      brand: formData.brand,
      model: formData.model,
      serial: formData.serial,
      initialCondition: formData.initialCondition,
      fault: formData.fault,
      agreedAmount: formData.agreedAmount,
      initialDeposit: formData.initialDeposit,
      timestamp: Date.now(),
      devicePhotoFront: photos.front,
      devicePhotoBack: photos.back,
      aiSuggestions: aiSuggestions
    };

    try {
      await saveDraft(draft);
      setDraftId(draft.id);
      alert('Draft saved successfully to local storage.');
    } catch (err) {
      console.error('Failed to save draft:', err);
      alert('Error: Could not save draft.');
    }
  };

  const handleRegenerateAI = async () => {
    if (!formData.fault) return alert("Please enter a fault description first.");
    setIsRegeneratingAI(true);
    try {
      const suggestions = await analyzeFault(
        formData.category,
        formData.brand,
        formData.model,
        formData.fault,
        formData.initialCondition
      );
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegeneratingAI(false);
    }
  };

  const startCamera = async (type: 'front' | 'back') => {
    setActiveCamera(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied.");
      setActiveCamera(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && activeCamera) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotos(prev => ({ ...prev, [activeCamera]: dataUrl }));
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
        setActiveCamera(null);
      }
    }
  };

  const handleMetadataAutoDetect = async (type: 'front' | 'back') => {
    const photo = photos[type];
    if (!photo || !isOnline) return;
    setScanningPhoto(type);
    try {
      const metadata = await extractDeviceMetadata(photo);
      if (metadata.imei || metadata.serial) {
        setFormData(prev => ({ ...prev, serial: metadata.imei || metadata.serial || prev.serial, model: metadata.modelInfo || prev.model }));
      }
    } catch (e) { console.error(e); }
    finally { setScanningPhoto(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndprConsent || !ownershipConsent) return alert("All legal acknowledgments are required.");
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const limitCheck = await checkJobLimit(user);
      if (!limitCheck.allowed) {
        setIsSubmitting(false);
        return;
      }

      // Final AI Analysis check
      let finalAi = aiSuggestions;
      if (isOnline && features.allowAI && finalAi.length === 0) {
        finalAi = await analyzeFault(
          formData.category,
          formData.brand,
          formData.model,
          formData.fault,
          formData.initialCondition
        );
      }
      
      const repairs = await getAllRepairs();
      const prevHash = repairs.length > 0 ? repairs[0].recordHash : "0xGENESIS";
      const recordHash = await signRecord({...formData, agreedAmount: parseFloat(formData.agreedAmount) || 0}, prevHash);

      const newJob: RepairJob = {
        id: `RG-${Date.now()}`, userId: user.id, company: user.company,
        ...formData, agreedAmount: parseFloat(formData.agreedAmount) || 0, initialDeposit: parseFloat(formData.initialDeposit) || 0,
        deviceCategory: formData.category, deviceBrand: formData.brand, deviceModel: formData.model,
        faultDescription: formData.fault, status: 'Pending',
        createdAt: Date.now(), updatedAt: Date.now(),
        clientSignature: clientSignature || 'pending', technicianSignature: techSignature || 'pending',
        isSynced: false, recordHash, prevRecordHash: prevHash, timestampProof: `Local Node ${new Date().toISOString()}`,
        serialNumber: formData.serial, devicePhotoFront: photos.front, devicePhotoBack: photos.back,
        businessCAC: user.cacNumber || 'N/A', technicianVerifiedId: user.id,
        aiSuggestions: finalAi
      };

      if (draftId) await deleteDraft(draftId);
      await saveAuditLog({ id: `log-${Date.now()}`, adminId: user.id, adminName: user.name, action: 'INTAKE', details: `Intake finalized with ${finalAi.length} AI suggestions.`, timestamp: Date.now() });
      setGeneratedJob(newJob);
    } catch (err) {
      console.error(err);
      alert("Error finalizing record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {generatedJob && (
        <TrustReceipt 
          job={generatedJob} 
          user={user}
          onClose={() => { onSubmit(generatedJob); setGeneratedJob(null); }}
          onWhatsApp={() => {}}
          onPrint={() => window.print()}
        />
      )}

      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-blue-100 rounded-3xl text-blue-600"><ShieldCheck className="w-10 h-10" /></div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Forensic Intake</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user.company} • {currentTierId} TIER</p>
              <div className="flex items-center gap-4 mt-1">
                <p id="bridge-status" className={`text-[9px] font-black uppercase tracking-widest ${bridgeAvailable ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {bridgeStatusMsg}
                </p>
                {features.allowAI && isOnline && (
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse">
                        <BrainCircuit className="w-3 h-3" />
                        AI Diagnostics Ready
                    </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isOnline ? <Activity className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'Secured' : 'Offline'}</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /><span>Client Info</span></h3>
              <InputGroup icon={<UserIcon className="w-4 h-4" />} placeholder="Client Name" value={formData.clientName} onChange={v => setFormData({...formData, clientName: v})} />
              <div className="grid grid-cols-2 gap-4">
                <InputGroup icon={<Phone className="w-4 h-4" />} placeholder="Phone" value={formData.clientPhone} onChange={v => setFormData({...formData, clientPhone: v})} />
                <InputGroup icon={<Mail className="w-4 h-4" />} placeholder="Email" value={formData.clientEmail} onChange={v => setFormData({...formData, clientEmail: v})} />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /><span>Asset Specs</span></h3>
                <button 
                  type="button" 
                  disabled={!bridgeAvailable || isVerifying}
                  onClick={verifyDevice}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center space-x-2 shadow-sm ${bridgeAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`}
                >
                  {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Usb className="w-3 h-3" />}
                  <span>{isVerifying ? 'Verifying...' : 'Verify Device'}</span>
                </button>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                {['Phone', 'Laptop', 'Printer', 'Other'].map(cat => (
                  <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat as any})} className={`flex-1 py-3 text-[10px] font-black rounded-xl ${formData.category === cat ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup icon={<Tag className="w-4 h-4" />} placeholder="Manufacturer" value={formData.brand} onChange={v => setFormData({...formData, brand: v})} />
                <InputGroup icon={<Package className="w-4 h-4" />} placeholder="Model" value={formData.model} onChange={v => setFormData({...formData, model: v})} />
              </div>
              <InputGroup icon={<Hash className="w-4 h-4" />} placeholder="IMEI / Serial" value={formData.serial} onChange={v => setFormData({...formData, serial: v})} />
            </section>
          </div>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /><span>Visual Evidence</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[ 'front', 'back' ].map(side => (
                 <div key={side} className="space-y-1">
                   <div className="aspect-[4/3] bg-slate-900 rounded-[2rem] overflow-hidden relative border-4 border-slate-100 shadow-lg">
                      {photos[side as 'front'|'back'] ? (
                        <>
                          <img src={photos[side as 'front'|'back']} className={`w-full h-full object-cover ${scanningPhoto === side ? 'animate-pulse brightness-50' : ''}`} alt={side} />
                          <div className="absolute bottom-4 right-4 flex space-x-2">
                             {isOnline && !scanningPhoto && <button type="button" onClick={() => handleMetadataAutoDetect(side as any)} className="p-3 bg-blue-600 text-white rounded-full shadow-xl"><Sparkles className="w-4 h-4" /></button>}
                             <button type="button" onClick={() => setPhotos(p => ({...p, [side]: undefined}))} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full"><RefreshCw className="w-5 h-5" /></button>
                          </div>
                        </>
                      ) : activeCamera === side ? (
                        <>
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <button type="button" onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center"><div className="w-10 h-10 bg-red-500 rounded-full" /></button>
                        </>
                      ) : (
                        <button type="button" onClick={() => startCamera(side as any)} className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:text-white transition-colors">
                          <Camera className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Capture {side}</span>
                        </button>
                      )}
                   </div>
                 </div>
               ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <textarea required className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[120px]" value={formData.initialCondition} onChange={e => setFormData({...formData, initialCondition: e.target.value})} placeholder="Initial Physical Condition (Dents, Scratches, Liquid)..." />
              <textarea required className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[120px]" value={formData.fault} onChange={e => setFormData({...formData, fault: e.target.value})} placeholder="Technician Fault Diagnostic..." />
            </div>
          </section>

          {/* AI Insights Display & Regenerate */}
          {features.allowAI && (
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  <span>Forensic Insights</span>
                </h3>
                {isOnline && (
                  <button 
                    type="button" 
                    onClick={handleRegenerateAI}
                    disabled={isRegeneratingAI || !formData.fault}
                    className={`flex items-center space-x-2 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all disabled:opacity-50 ${aiSuggestions.length === 0 && formData.fault ? 'bg-indigo-600 text-white border-indigo-500 animate-bounce' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                  >
                    {isRegeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>{aiSuggestions.length > 0 ? 'Update Diagnostic' : 'Generate Diagnostic'}</span>
                  </button>
                )}
              </div>

              {aiSuggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {aiSuggestions.map((s, i) => (
                    <div key={i} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-600' : s.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                          {s.riskLevel} Risk
                        </div>
                        <div className="text-[10px] font-black text-indigo-600">{s.accuracy}% Accuracy</div>
                      </div>
                      <h5 className="font-black text-slate-900 text-sm mb-1">{s.solution}</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{s.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] text-center">
                  <BrainCircuit className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {formData.fault ? "Diagnostic suggestions pending..." : "Complete fault description to unlock AI analysis"}
                  </p>
                </div>
              )}
            </section>
          )}

          <div className="space-y-4">
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl space-y-4">
              <label className="flex items-start space-x-4 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5">
                  <input required type="checkbox" className="mt-1 w-6 h-6 rounded-lg bg-slate-800 border-slate-700 text-blue-500" checked={ownershipConsent} onChange={e => setOwnershipConsent(e.target.checked)} />
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                       <Gavel className="w-4 h-4 text-amber-500" /> Ownership & Anti-Theft Declaration
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 leading-relaxed mt-1">
                      I declare I am the rightful owner/authorized possessor of this device. I am not a "co-author" of any theft or fraud related to this asset.
                    </span>
                  </div>
              </label>
              <label className="flex items-start space-x-4 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5">
                  <input required type="checkbox" className="mt-1 w-6 h-6 rounded-lg bg-slate-800 border-slate-700 text-blue-500" checked={ndprConsent} onChange={e => setNdprConsent(e.target.checked)} />
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" /> NDPR Privacy & Limited Liability
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 leading-relaxed mt-1">
                      The technician's only involvement is fixing the fault defined above. I acknowledge the forensic seal of this record.
                    </span>
                  </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              type="button" 
              onClick={handleSaveDraft}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-6 rounded-[2rem] text-xl transition-all flex items-center justify-center space-x-3"
            >
              <Save className="w-6 h-6" />
              <span>SAVE DRAFT</span>
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] text-xl transition-all shadow-2xl flex items-center justify-center space-x-4 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Lock className="w-6 h-6" />}
              <span>{isSubmitting ? 'ANALYZING & SEALING...' : 'SEAL & FINALIZE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InputGroup = ({ icon, ...props }: { icon: React.ReactNode, [key: string]: any }) => (
  <div className="relative group">
    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">{icon}</div>
    <input {...props} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all" onChange={e => props.onChange(e.target.value)} />
  </div>
);

export default RepairForm;
