
import React, { useState, useRef, useEffect } from 'react';
import { DeviceCategory, RepairJob, AISuggestion, User, PaymentRequest, AdminMessage, DraftRepair, SubscriptionPlan } from '../types';
import { analyzeFault } from '../geminiService';
import { signRecord } from '../cryptoUtils';
import { getAllRepairs, getSetting, savePayment, getMessagesForCompany, saveUser, saveSMS, saveDraft, deleteDraft, getAllPlans } from '../db';
import { 
  Smartphone, Laptop, Printer, Tablet, Package, User as UserIcon, Phone, 
  Tag, Terminal, CheckCircle2, ShieldCheck, Sparkles, PlusCircle, 
  PenTool, AlertTriangle, Hash, Activity, Mail, Landmark, Shield, 
  Keyboard, MousePointer2, CreditCard, Banknote, X, MessageSquare,
  WifiOff, Lock, Save, Camera, RefreshCw, Image
} from 'lucide-react';

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

  // Photo State
  const [photos, setPhotos] = useState<{front?: string, back?: string}>({});
  const [activeCamera, setActiveCamera] = useState<'front' | 'back' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [draftId, setDraftId] = useState<string | null>(null);

  // Core State
  const [ndprConsent, setNdprConsent] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  
  const [showPaywall, setShowPaywall] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [bankDetails, setBankDetails] = useState({ bank: '', account: '', name: '' });
  const [paymentStep, setPaymentStep] = useState<'plan' | 'bank' | 'done'>('plan');

  const [sigMode, setSigMode] = useState<{client: 'draw' | 'type', tech: 'draw' | 'type'}>({ client: 'draw', tech: 'draw' });
  const [typedSigs, setTypedSigs] = useState({ client: '', tech: '' });
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [techSignature, setTechSignature] = useState<string | null>(null);
  
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const techCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCanvas, setActiveCanvas] = useState<'client' | 'tech' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
      setPhotos({
        front: initialData.devicePhotoFront,
        back: initialData.devicePhotoBack
      });
      setSuggestions(initialData.aiSuggestions || []);
      setDraftId(initialData.id);
    } else {
      // Reset form if initialData is explicitly null (switching to New Asset)
      setFormData({
        clientName: '', clientPhone: '', clientEmail: '',
        category: 'Phone', brand: '', model: '',
        serial: '', initialCondition: '', fault: '',
        agreedAmount: '', initialDeposit: ''
      });
      setPhotos({});
      setDraftId(null);
      setSuggestions([]);
      setClientSignature(null);
      setTechSignature(null);
      setTypedSigs({ client: '', tech: '' });
      setSigMode({ client: 'draw', tech: 'draw' });
      setShowPaywall(false);
      setAiLoading(false);
      setActiveCamera(null);
    }
  }, [initialData]);

  useEffect(() => {
    loadContext();
    return () => stopCameraStream();
  }, [user]);

  const loadContext = async () => {
    const b = await getSetting('bank_details') || { bank: 'Access Bank', account: '0123456789', name: 'RepairGuard HQ' };
    const m = await getMessagesForCompany(user.company);
    const p = await getAllPlans();
    setBankDetails(b);
    setMessages(m);
    
    // Set plans or default if none exist
    if (p.length > 0) {
      setPlans(p);
    } else {
      setPlans([
        { id: 'def1', name: '2 Weeks', price: 5000, durationDays: 14, description: 'Standard Access', isActive: true },
        { id: 'def2', name: '1 Month', price: 9000, durationDays: 30, description: 'Extended Access', isActive: true }
      ]);
    }
  };

  const checkAIEligibility = (): boolean => {
    const isSubscribed = user.subscriptionExpiry && user.subscriptionExpiry > Date.now();
    if (isSubscribed) return true;
    const usage = user.aiUsageCount || 0;
    if (usage < 10) return true;
    return false;
  };

  // Camera Functions
  const startCamera = async (type: 'front' | 'back') => {
    setActiveCamera(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera for asset photos
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied or unavailable.");
      setActiveCamera(null);
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
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
        stopCameraStream();
        setActiveCamera(null);
      }
    }
  };

  const cancelCamera = () => {
    stopCameraStream();
    setActiveCamera(null);
  };

  const retakePhoto = (type: 'front' | 'back') => {
    if (confirm("Retake photo? Existing image will be lost.")) {
      setPhotos(prev => ({ ...prev, [type]: undefined }));
    }
  };

  const startAnalysis = async () => {
    if (!formData.fault || !isOnline) return;
    
    if (!checkAIEligibility()) {
      setShowPaywall(true);
      return;
    }

    setAiLoading(true);
    const results = await analyzeFault(formData.category, formData.brand, formData.model, formData.fault, formData.initialCondition);
    setSuggestions(results);
    
    // Increment usage count and update user
    const updatedUser = { ...user, aiUsageCount: (user.aiUsageCount || 0) + 1 };
    await saveUser(updatedUser);
    if (onUserUpdate) {
        onUserUpdate(updatedUser);
    }
    
    setAiLoading(false);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPlan) return;
    const payId = `pay-${Date.now()}`;
    await savePayment({
      id: payId,
      userId: user.id,
      userName: user.name,
      company: user.company,
      amount: selectedPlan.price,
      confirmedAmount: selectedPlan.price,
      plan: selectedPlan.name,
      durationDays: selectedPlan.durationDays,
      status: 'pending',
      timestamp: Date.now()
    });
    setPaymentStep('done');
  };

  const generateTypedSignature = (name: string): string | null => {
    if (!name.trim()) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px "Great Vibes"';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    ctx.beginPath();
    ctx.moveTo(50, canvas.height / 2 + 35);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 45, canvas.width - 50, canvas.height / 2 + 35);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();
    return canvas.toDataURL();
  };

  const handleSignStart = (canvasType: 'client' | 'tech', e: any) => {
    if (sigMode[canvasType] === 'type') return;
    setActiveCanvas(canvasType); setIsDrawing(true);
    const canvas = canvasType === 'client' ? clientCanvasRef.current : techCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.moveTo(x, y);
      }
    }
  };

  const handleSignMove = (e: any) => {
    if (!isDrawing || !activeCanvas) return;
    const canvas = activeCanvas === 'client' ? clientCanvasRef.current : techCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.lineTo(x, y); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !activeCanvas) return;
    const canvas = activeCanvas === 'client' ? clientCanvasRef.current : techCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      if (activeCanvas === 'client') setClientSignature(dataUrl);
      else setTechSignature(dataUrl);
    }
    setIsDrawing(false); setActiveCanvas(null);
  };

  const clearCanvas = (type: 'client' | 'tech') => {
    if (sigMode[type] === 'type') {
      setTypedSigs(prev => ({ ...prev, [type]: '' }));
      if (type === 'client') setClientSignature(null); else setTechSignature(null);
    } else {
      const canvas = type === 'client' ? clientCanvasRef.current : techCanvasRef.current;
      if (canvas) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        if (type === 'client') setClientSignature(null); else setTechSignature(null);
      }
    }
  };

  const handleTypedChange = (type: 'client' | 'tech', value: string) => {
    setTypedSigs(prev => ({ ...prev, [type]: value }));
    const sigImage = generateTypedSignature(value);
    if (type === 'client') setClientSignature(sigImage); else setTechSignature(sigImage);
  };

  const handleSaveDraft = async () => {
    if (!formData.clientName) {
      alert('Client Name is required to save a draft.');
      return;
    }

    const idToUse = draftId || `draft-${Date.now()}`;

    const draft: DraftRepair = {
      id: idToUse,
      company: user.company,
      createdBy: user.id,
      ...formData,
      timestamp: Date.now(),
      devicePhotoFront: photos.front,
      devicePhotoBack: photos.back,
      aiSuggestions: suggestions // Persist AI diagnosis
    };

    await saveDraft(draft);
    setDraftId(idToUse); // Prevent duplication
    alert('Form saved to Drafts.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndprConsent) return alert("NDPR Consent Required for forensic audit trail.");
    if (!clientSignature || !techSignature) return alert("Signatures are required to seal the digital contract.");

    const repairs = await getAllRepairs();
    const prevHash = repairs.length > 0 ? repairs[0].recordHash : "0xGENESIS";
    const agreedNGN = parseFloat(formData.agreedAmount) || 0;
    const depositNGN = parseFloat(formData.initialDeposit) || 0;

    const baseData = {
      clientName: formData.clientName, clientPhone: formData.clientPhone,
      device: `${formData.brand} ${formData.model}`, fault: formData.fault,
      agreedAmount: agreedNGN, deposit: depositNGN, timestamp: Date.now()
    };

    const recordHash = await signRecord(baseData, prevHash);

    const newJob: RepairJob = {
      id: `RG-${Date.now()}`, userId: user.id, company: user.company,
      ...formData, agreedAmount: agreedNGN, initialDeposit: depositNGN,
      deviceCategory: formData.category, deviceBrand: formData.brand, deviceModel: formData.model,
      faultDescription: formData.fault, status: 'Pending',
      createdAt: Date.now(), updatedAt: Date.now(),
      clientSignature, technicianSignature: techSignature,
      aiSuggestions: suggestions, isSynced: false,
      recordHash, prevRecordHash: prevHash, timestampProof: `Local Node Verified ${new Date().toISOString()}`,
      serialNumber: formData.serial,
      devicePhotoFront: photos.front,
      devicePhotoBack: photos.back
    };

    if (formData.clientPhone) {
      await saveSMS({
        id: `sms-${Date.now()}`,
        repairId: newJob.id,
        recipient: formData.clientPhone,
        message: `Hello ${formData.clientName}, your device (${formData.brand} ${formData.model}) has been received by ${user.company}. Case ID: ${newJob.id}. You will be notified of updates.`,
        status: 'Sent',
        timestamp: Date.now(),
        deliveryProof: `sim_gw_${Math.random().toString(36).substr(2,8)}`
      });
    }

    if (draftId) {
      await deleteDraft(draftId);
    }

    onSubmit(newJob);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* HQ Notifications */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map(m => (
            <div key={m.id} className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white flex items-center space-x-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><MessageSquare className="w-20 h-20" /></div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md"><MessageSquare className="w-8 h-8" /></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Security Directive</p>
                <p className="text-base font-black leading-tight mt-1">{m.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paywall Overlay */}
      {showPaywall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
             <button onClick={() => setShowPaywall(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
               <X className="w-5 h-5" />
             </button>
             
             {paymentStep === 'plan' && (
               <div className="space-y-6">
                 <div className="text-center">
                   <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                     <Sparkles className="w-8 h-8" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900">Unlock AI Diagnostics</h3>
                   <p className="text-sm text-slate-500 font-bold mt-2">Free quota exceeded. Choose a forensic pass.</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    {plans.map(plan => (
                      <button 
                        key={plan.id}
                        onClick={() => { setSelectedPlan(plan); setPaymentStep('bank'); }}
                        className="p-6 rounded-3xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left flex flex-col justify-between"
                      >
                        <div>
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{plan.name}</p>
                           <p className="text-[10px] font-bold text-blue-600 mt-1">{plan.durationDays} Days</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-4">₦{plan.price.toLocaleString()}</p>
                      </button>
                    ))}
                 </div>
               </div>
             )}

             {paymentStep === 'bank' && selectedPlan && (
                <div className="space-y-6">
                   <div className="text-center">
                     <h3 className="text-xl font-black text-slate-900">Bank Transfer</h3>
                     <p className="text-xs text-slate-500 font-bold mt-1">Transfer ₦{selectedPlan.price.toLocaleString()} to activate.</p>
                   </div>
                   
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bank Name</p>
                      <p className="font-black text-lg">{bankDetails.bank}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Account Number</p>
                      <p className="font-black text-2xl font-mono tracking-wider text-blue-600 select-all">{bankDetails.account}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-2">Beneficiary</p>
                      <p className="font-black">{bankDetails.name}</p>
                   </div>

                   <button 
                     onClick={handlePaymentConfirm} 
                     className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 transition-all"
                   >
                     I HAVE SENT THE MONEY
                   </button>
                   <button onClick={() => setPaymentStep('plan')} className="w-full text-xs font-black text-slate-400 hover:text-slate-600">BACK TO PLANS</button>
                </div>
             )}
             
             {paymentStep === 'done' && (
               <div className="text-center space-y-6 py-8">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                   <CheckCircle2 className="w-10 h-10" />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-900">Payment Pending</h3>
                   <p className="text-sm text-slate-500 font-bold mt-2 px-8">Admin will verify your transfer shortly. Access will be restored automatically.</p>
                 </div>
                 <button onClick={() => setShowPaywall(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest">Return to Dashboard</button>
               </div>
             )}
          </div>
        </div>
      )}
      
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-blue-100 rounded-3xl text-blue-600 shadow-inner">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Forensic Intake</h2>
              <div className="flex items-center space-x-3 mt-1">
                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user.company}</span>
                 <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                 <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Protocol v4.0</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {isOnline ? <Activity className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'Network Secured' : 'Isolated Cache'}</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Identity & Asset Logic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Client Credentials</span>
              </h3>
              <div className="space-y-4">
                <InputGroup icon={<UserIcon className="w-4 h-4" />} placeholder="Client Full Name" value={formData.clientName} onChange={v => setFormData({...formData, clientName: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup icon={<Phone className="w-4 h-4" />} placeholder="Contact Phone" value={formData.clientPhone} onChange={v => setFormData({...formData, clientPhone: v})} />
                  <InputGroup icon={<Mail className="w-4 h-4" />} placeholder="Email Registry" value={formData.clientEmail} onChange={v => setFormData({...formData, clientEmail: v})} />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>Asset Specification</span>
              </h3>
              <div className="space-y-4">
                <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                  {['Phone', 'Laptop', 'Printer', 'Other'].map(cat => (
                    <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat as DeviceCategory})} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${formData.category === cat ? 'bg-white text-blue-600 shadow-lg scale-[1.05]' : 'text-slate-400 hover:text-slate-600'}`}>{cat}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup icon={<Tag className="w-4 h-4" />} placeholder="Manufacturer" value={formData.brand} onChange={v => setFormData({...formData, brand: v})} />
                  <InputGroup icon={<Package className="w-4 h-4" />} placeholder="Model/Revision" value={formData.model} onChange={v => setFormData({...formData, model: v})} />
                </div>
                <InputGroup icon={<Hash className="w-4 h-4" />} placeholder="Serial / IMEI Identification" value={formData.serial} onChange={v => setFormData({...formData, serial: v})} />
              </div>
            </section>
          </div>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
              <span>Financial Metadata</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Agreed Service Fee (₦)</label>
                 <InputGroup icon={<Landmark className="w-4 h-4" />} type="number" placeholder="0.00" value={formData.agreedAmount} onChange={v => setFormData({...formData, agreedAmount: v})} />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Security Deposit (₦)</label>
                 <InputGroup icon={<Banknote className="w-4 h-4" />} type="number" placeholder="0.00" value={formData.initialDeposit} onChange={v => setFormData({...formData, initialDeposit: v})} />
               </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center space-x-3">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span>Forensic Diagnostics</span>
            </h3>

            {/* Visual Evidence (Camera) Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visual Evidence (Front)</label>
                 <div className="aspect-[4/3] bg-slate-900 rounded-[2rem] overflow-hidden relative group border-4 border-slate-100 shadow-lg">
                    {photos.front ? (
                      <>
                        <img src={photos.front} className="w-full h-full object-cover" alt="Front" />
                        <button type="button" onClick={() => retakePhoto('front')} className="absolute bottom-4 right-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all"><RefreshCw className="w-5 h-5" /></button>
                      </>
                    ) : activeCamera === 'front' ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                          <button type="button" onClick={capturePhoto} className="w-14 h-14 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center"><div className="w-10 h-10 bg-red-500 rounded-full" /></button>
                          <button type="button" onClick={cancelCamera} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><X className="w-6 h-6" /></button>
                        </div>
                      </>
                    ) : (
                      <button type="button" onClick={() => startCamera('front')} className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition-colors">
                        <Camera className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Click to Capture Front</span>
                      </button>
                    )}
                 </div>
               </div>
               
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Visual Evidence (Back)</label>
                 <div className="aspect-[4/3] bg-slate-900 rounded-[2rem] overflow-hidden relative group border-4 border-slate-100 shadow-lg">
                    {photos.back ? (
                      <>
                        <img src={photos.back} className="w-full h-full object-cover" alt="Back" />
                        <button type="button" onClick={() => retakePhoto('back')} className="absolute bottom-4 right-4 p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all"><RefreshCw className="w-5 h-5" /></button>
                      </>
                    ) : activeCamera === 'back' ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                          <button type="button" onClick={capturePhoto} className="w-14 h-14 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center"><div className="w-10 h-10 bg-red-500 rounded-full" /></button>
                          <button type="button" onClick={cancelCamera} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><X className="w-6 h-6" /></button>
                        </div>
                      </>
                    ) : (
                      <button type="button" onClick={() => startCamera('back')} className="w-full h-full flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition-colors">
                        <Camera className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Click to Capture Back</span>
                      </button>
                    )}
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <textarea required className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[140px]" value={formData.initialCondition} onChange={e => setFormData({...formData, initialCondition: e.target.value})} placeholder="Describe initial physical state (Scratches, dents, etc.)..." />
              <div className="relative">
                <textarea required className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm focus:ring-4 focus:ring-blue-100 outline-none min-h-[140px] pr-20" value={formData.fault} onChange={e => setFormData({...formData, fault: e.target.value})} placeholder="Detailed fault description..." />
                {isOnline ? (
                  <button type="button" onClick={startAnalysis} disabled={aiLoading || !formData.fault} className="absolute bottom-6 right-6 p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                    {aiLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  </button>
                ) : (
                  <div className="absolute bottom-6 right-6 p-4 bg-slate-200 text-slate-500 rounded-2xl cursor-not-allowed group">
                    <WifiOff className="w-5 h-5" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 text-white text-[9px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase font-black text-center">AI Diagnostics Unavailable Offline</div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Display AI Suggestions if available */}
            {suggestions.length > 0 && (
              <div className="col-span-1 md:col-span-2 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">Gemini Forensic Analysis</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {suggestions.map((s, idx) => (
                     <div key={idx} className="p-5 bg-blue-50/50 border border-blue-100 rounded-3xl">
                       <div className="flex justify-between items-start mb-2">
                         <span className="px-2 py-1 bg-white rounded-lg text-[8px] font-black uppercase text-blue-600 shadow-sm">{s.riskLevel} Risk</span>
                         <span className="text-[10px] font-black text-slate-400">{s.accuracy}% Conf.</span>
                       </div>
                       <p className="font-black text-sm text-slate-800 mb-1">{s.solution}</p>
                       <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </section>

          {/* Signature Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Seal</h4>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, client: 'draw'}))} className={`p-2 rounded-lg transition-all ${sigMode.client === 'draw' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}><MousePointer2 className="w-4 h-4" /></button>
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, client: 'type'}))} className={`p-2 rounded-lg transition-all ${sigMode.client === 'type' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}><Keyboard className="w-4 h-4" /></button>
                 </div>
               </div>
               <div className="h-48 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 relative group overflow-hidden touch-none">
                 {sigMode.client === 'draw' ? (
                   <canvas ref={clientCanvasRef} width={400} height={180} className="w-full h-full cursor-crosshair touch-none" onMouseDown={(e) => handleSignStart('client', e)} onMouseMove={handleSignMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={(e) => handleSignStart('client', e)} onTouchMove={handleSignMove} onTouchEnd={stopDrawing} />
                 ) : (
                   <div className="p-6 h-full flex flex-col justify-center space-y-4">
                     <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Type Legal Full Name" value={typedSigs.client} onChange={(e) => handleTypedChange('client', e.target.value)} />
                     <div className="h-20 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-inner"><span className="font-signature-2 text-4xl text-slate-800">{typedSigs.client || "Your Signature"}</span></div>
                   </div>
                 )}
                 <button type="button" onClick={() => clearCanvas('client')} className="absolute top-4 right-4 p-2 text-[8px] bg-rose-50 text-rose-500 rounded-lg font-black uppercase hover:bg-rose-500 hover:text-white transition-all">Reset</button>
               </div>
             </div>

             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Officer Identification</h4>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, tech: 'draw'}))} className={`p-2 rounded-lg transition-all ${sigMode.tech === 'draw' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}><MousePointer2 className="w-4 h-4" /></button>
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, tech: 'type'}))} className={`p-2 rounded-lg transition-all ${sigMode.tech === 'type' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}><Keyboard className="w-4 h-4" /></button>
                 </div>
               </div>
               <div className="h-48 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 relative group overflow-hidden touch-none">
                 {sigMode.tech === 'draw' ? (
                   <canvas ref={techCanvasRef} width={400} height={180} className="w-full h-full cursor-crosshair touch-none" onMouseDown={(e) => handleSignStart('tech', e)} onMouseMove={handleSignMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={(e) => handleSignStart('tech', e)} onTouchMove={handleSignMove} onTouchEnd={stopDrawing} />
                 ) : (
                   <div className="p-6 h-full flex flex-col justify-center space-y-4">
                     <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Type Technician Name" value={typedSigs.tech} onChange={(e) => handleTypedChange('tech', e.target.value)} />
                     <div className="h-20 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-inner"><span className="font-signature-1 text-3xl text-slate-800">{typedSigs.tech || "Officer Seal"}</span></div>
                   </div>
                 )}
                 <button type="button" onClick={() => clearCanvas('tech')} className="absolute top-4 right-4 p-2 text-[8px] bg-rose-50 text-rose-500 rounded-lg font-black uppercase hover:bg-rose-500 hover:text-white transition-all">Reset</button>
               </div>
             </div>
          </div>

          <div className="pt-6">
             <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Shield className="w-48 h-48" /></div>
               <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-600 rounded-2xl"><ShieldCheck className="w-6 h-6" /></div>
                  <h3 className="font-black uppercase tracking-widest text-sm">NDPR Digital Integrity Pact</h3>
               </div>
               <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-3xl">
                 By sealing this record, I confirm that the asset state recorded above is accurate. 
                 Data is processed under the <strong>Nigeria Data Protection Regulation (NDPR)</strong> for legal compliance 
                 and asset verification. Integrity is secured via cryptographic fingerprinting.
               </p>
               <label className="flex items-center space-x-4 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <input required type="checkbox" className="w-6 h-6 rounded-lg bg-slate-800 border-slate-700 text-blue-500" checked={ndprConsent} onChange={e => setNdprConsent(e.target.checked)} />
                  <span className="text-sm font-black">ACKNOWLEDGE & CONSENT TO FORENSIC RECORDING</span>
               </label>
             </div>
          </div>

          <div className="flex space-x-4">
            <button type="button" onClick={handleSaveDraft} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-6 rounded-[2rem] text-lg transition-all flex items-center justify-center space-x-3">
              <Save className="w-6 h-6" />
              <span>SAVE DRAFT</span>
            </button>
            <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] text-xl transition-all shadow-2xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center space-x-4">
              <Lock className="w-6 h-6" />
              <span>FINALIZE & SEAL CASE LOG</span>
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
    <input 
      {...props}
      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all"
      onChange={e => props.onChange(e.target.value)}
    />
  </div>
);

export default RepairForm;
