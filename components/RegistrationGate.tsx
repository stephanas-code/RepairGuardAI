
import React, { useState, useRef, useEffect } from 'react';
import { User, RegistrationStatus } from '../types';
import { logComplianceEvent } from '../db';
import { ShieldCheck, Building, Scale, Fingerprint, Lock, FileCheck, AlertTriangle, Camera, CreditCard, ChevronRight, UserCheck, UploadCloud, FileText, X, RefreshCw, Clock, Loader2 } from 'lucide-react';

interface RegistrationGateProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const RegistrationGate: React.FC<RegistrationGateProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    cacNumber: user.cacNumber || '',
    address: user.businessAddress || '',
    businessType: '',
    ndpcStatus: user.ndpcStatus || 'Not Registered' as any,
    ndpcRef: user.ndpcReference || '',
    dpoName: user.dpoName || '',
    dpoEmail: user.dpoEmail || '',
    idType: 'NIN',
    idNumber: '',
    legalAccepted: false
  });

  const [documents, setDocuments] = useState<{cac?: string, ndpc?: string, id?: string, selfie?: string}>({
     cac: user.cacDocument,
     ndpc: user.ndpcDocument,
     id: user.governmentId,
     selfie: user.biometricSelfie
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if already submitted but pending admin approval
  const isPendingApproval = user.registrationStatus === 'pending_verification' && user.legalAcceptedTimestamp;

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Camera access is required for biometric verification.");
      console.error(err);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setDocuments(prev => ({ ...prev, selfie: dataUrl }));
        stopCamera();
      }
    }
  };

  const handleFileChange = (field: 'cac' | 'ndpc' | 'id', e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
           setDocuments(prev => ({ ...prev, [field]: ev.target?.result as string }));
        };
        reader.readAsDataURL(file);
     }
  };

  const handleFinish = async () => {
    if (!formData.legalAccepted) return;
    setIsVerifying(true);
    
    // Log final compliance acceptance
    await logComplianceEvent({
      action: 'REGISTRATION_SUBMITTED',
      data: {
        userId: user.id,
        company: user.company,
        cac: formData.cacNumber,
        timestamp: Date.now()
      }
    });

    // Simulate upload delay
    setTimeout(() => {
      onComplete({
        ...user,
        registrationStatus: 'pending_verification', // Remains pending until Admin verifies
        cacNumber: formData.cacNumber,
        businessAddress: formData.address,
        ndpcStatus: formData.ndpcStatus,
        ndpcReference: formData.ndpcRef,
        dpoName: formData.dpoName,
        dpoEmail: formData.dpoEmail,
        legalAcceptedTimestamp: Date.now(),
        cacDocument: documents.cac,
        ndpcDocument: documents.ndpc,
        governmentId: documents.id,
        biometricSelfie: documents.selfie
      });
      setIsVerifying(false);
    }, 2000);
  };

  const nextStep = async (currentStep: number) => {
    if (currentStep === 1) {
       await logComplianceEvent({
         action: 'BUSINESS_VERIFICATION_PASSED',
         data: { userId: user.id, cac: formData.cacNumber }
       });
       setStep(2);
    } else if (currentStep === 2) {
       await logComplianceEvent({
         action: 'NDPC_CONTROLLER_DECLARED',
         data: { userId: user.id, status: formData.ndpcStatus }
       });
       setStep(3);
    }
  };

  const isStep1Valid = formData.cacNumber.length > 4 && formData.address.length > 5 && !!documents.cac;
  const isStep2Valid = formData.ndpcStatus !== 'Not Registered' ? (formData.ndpcRef.length > 3 && !!documents.ndpc) : true;
  const isStep3Valid = formData.idNumber.length > 5 && formData.legalAccepted && !!documents.id && !!documents.selfie;

  if (isPendingApproval) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-6">
         <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl border-4 border-slate-800 animate-in zoom-in-95 duration-500">
            <div className="flex justify-center mb-6">
              <div className="p-6 bg-amber-50 rounded-full animate-pulse">
                 <Clock className="w-12 h-12 text-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Compliance Review Pending</h2>
            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
               Your forensic identity proofs have been securely hashed and submitted. 
               HQ Command will verify your credentials (CAC/NDPC) shortly.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left mb-8">
               <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Reference ID</span>
                  <span className="font-mono text-slate-900">{user.id}</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Status</span>
                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase text-[10px] font-black tracking-widest">Awaiting Approval</span>
               </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status</span>
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-4 md:p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl w-full bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border-4 border-slate-900/10">
        
        {/* Progress Header */}
        <div className="bg-slate-900 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck className="w-24 h-24" />
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Access Control Gating</h2>
              <p className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Compliance Prerequisite Required</p>
            </div>
          </div>
          
          <div className="flex mt-8 space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                  <Building className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Business Verification</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-5">
                <Input label="CAC Registration Number (MANDATORY)" placeholder="RC1234567" value={formData.cacNumber} onChange={v => setFormData({...formData, cacNumber: v})} />
                <Input label="Registered Business Address" placeholder="Verified physical location..." value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                
                {/* File Upload for CAC */}
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Evidence of Incorporation</label>
                   <label className={`block w-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${documents.cac ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileChange('cac', e)} />
                      {documents.cac ? (
                         <div className="flex flex-col items-center text-emerald-600">
                           <FileCheck className="w-8 h-8 mb-2" />
                           <span className="text-xs font-black uppercase">Certificate Uploaded</span>
                           <span className="text-[9px]">Tap to change</span>
                         </div>
                      ) : (
                         <div className="flex flex-col items-center text-slate-400">
                           <UploadCloud className="w-8 h-8 mb-2" />
                           <span className="text-xs font-black uppercase">Upload CAC Certificate</span>
                           <span className="text-[9px]">PDF or Image Required</span>
                         </div>
                      )}
                   </label>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Repair Specialization</label>
                   <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-100" value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})}>
                     <option value="">Select Category...</option>
                     <option value="consumer">Consumer Electronics</option>
                     <option value="computing">Computing Systems</option>
                     <option value="mobile">Mobile Communication Units</option>
                     <option value="forensic">Data Recovery & Forensics</option>
                   </select>
                </div>
              </div>

              {!isStep1Valid && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider leading-relaxed">
                     {!documents.cac ? 'CAC Certificate document is required.' : 'System locked until valid CAC details are provided.'}
                  </p>
                </div>
              )}

              <button 
                onClick={() => nextStep(1)} 
                disabled={!isStep1Valid} 
                className="group w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Initialize Compliance</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                  <Scale className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">NDPA Data Controller Registry</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <button onClick={() => setFormData({...formData, ndpcStatus: 'Registered'})} className={`p-5 rounded-3xl border-2 transition-all text-left ${formData.ndpcStatus === 'Registered' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex justify-between items-center mb-2">
                         <div className={`w-4 h-4 rounded-full border-2 ${formData.ndpcStatus === 'Registered' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                         <ShieldCheck className={`w-5 h-5 ${formData.ndpcStatus === 'Registered' ? 'text-blue-600' : 'text-slate-300'}`} />
                      </div>
                      <p className="font-black text-sm uppercase">Registered</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">Authorized Data Controller</p>
                   </button>
                   <button onClick={() => setFormData({...formData, ndpcStatus: 'Not Registered'})} className={`p-5 rounded-3xl border-2 transition-all text-left ${formData.ndpcStatus === 'Not Registered' ? 'border-rose-600 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex justify-between items-center mb-2">
                         <div className={`w-4 h-4 rounded-full border-2 ${formData.ndpcStatus === 'Not Registered' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'}`} />
                         <AlertTriangle className={`w-5 h-5 ${formData.ndpcStatus === 'Not Registered' ? 'text-rose-600' : 'text-slate-300'}`} />
                      </div>
                      <p className="font-black text-sm uppercase">Not Registered</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 text-rose-600">Restricted Mode Policy</p>
                   </button>
                </div>

                {formData.ndpcStatus !== 'Not Registered' && (
                  <>
                     <Input label="NDPC Reference (Forensic Audit ID)" placeholder="NDPC/2024/APP/..." value={formData.ndpcRef} onChange={v => setFormData({...formData, ndpcRef: v})} />
                     
                     {/* File Upload for NDPC */}
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Compliance Audit Report / Certificate</label>
                        <label className={`block w-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${documents.ndpc ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                           <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileChange('ndpc', e)} />
                           {documents.ndpc ? (
                              <div className="flex flex-col items-center text-emerald-600">
                                 <FileCheck className="w-8 h-8 mb-2" />
                                 <span className="text-xs font-black uppercase">Audit Report Uploaded</span>
                              </div>
                           ) : (
                              <div className="flex flex-col items-center text-slate-400">
                                 <FileText className="w-8 h-8 mb-2" />
                                 <span className="text-xs font-black uppercase">Upload NDPC Proof</span>
                              </div>
                           )}
                        </label>
                     </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Data Protection Officer" placeholder="Name" value={formData.dpoName} onChange={v => setFormData({...formData, dpoName: v})} />
                   <Input label="DPO Email" placeholder="dpo@company.io" value={formData.dpoEmail} onChange={v => setFormData({...formData, dpoEmail: v})} />
                </div>
              </div>

              <div className="flex space-x-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs">Back</button>
                <button 
                   onClick={() => nextStep(2)} 
                   disabled={!isStep2Valid} 
                   className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3"
                >
                  <span>Identity Protocol</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Identity Verification</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Biometric Selfie Section */}
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Biometric Liveness Check</label>
                    <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 aspect-square flex flex-col items-center justify-center border-4 border-slate-100 shadow-xl">
                       {documents.selfie ? (
                          <>
                             <img src={documents.selfie} alt="Selfie" className="w-full h-full object-cover" />
                             <button onClick={() => setDocuments(prev => ({...prev, selfie: undefined}))} className="absolute bottom-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 border border-white/20 transition-all">
                                <RefreshCw className="w-3 h-3" /> <span>RETAKE</span>
                             </button>
                          </>
                       ) : isCameraActive ? (
                          <>
                             <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                             <div className="absolute bottom-4 flex space-x-3">
                                <button onClick={captureSelfie} className="w-12 h-12 rounded-full bg-white border-4 border-slate-300 shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-90">
                                   <div className="w-8 h-8 rounded-full bg-red-500" />
                                </button>
                                <button onClick={stopCamera} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white">
                                   <X className="w-5 h-5" />
                                </button>
                             </div>
                          </>
                       ) : (
                          <button onClick={startCamera} className="flex flex-col items-center justify-center space-y-3 group w-full h-full hover:bg-slate-800 transition-colors">
                             <div className="p-4 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                                <Camera className="w-8 h-8 text-white" />
                             </div>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Start Camera</p>
                          </button>
                       )}
                    </div>
                 </div>

                 {/* ID Upload Section */}
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Government ID</label>
                       <label className={`block w-full border-2 border-dashed rounded-[2rem] p-6 text-center cursor-pointer transition-colors aspect-square flex flex-col items-center justify-center ${documents.id ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('id', e)} />
                          {documents.id ? (
                             <div className="flex flex-col items-center text-emerald-600">
                                <img src={documents.id} alt="ID" className="w-32 h-20 object-cover rounded-lg shadow-sm mb-4" />
                                <span className="text-xs font-black uppercase">ID Uploaded</span>
                                <span className="text-[9px]">Tap to change</span>
                             </div>
                          ) : (
                             <div className="flex flex-col items-center text-slate-400">
                                <CreditCard className="w-10 h-10 mb-3" />
                                <span className="text-xs font-black uppercase">Upload ID Card</span>
                                <span className="text-[9px]">NIN / Driver's License</span>
                             </div>
                          )}
                       </label>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Document Reference No.</label>
                       <Input label="" placeholder="Enter ID Number" value={formData.idNumber} onChange={v => setFormData({...formData, idNumber: v})} />
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                <label className="flex items-start space-x-4 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-6 h-6 rounded-lg bg-slate-800 border-slate-700 text-blue-500" checked={formData.legalAccepted} onChange={e => setFormData({...formData, legalAccepted: e.target.checked})} />
                  <span className="text-[11px] font-bold text-slate-400 leading-relaxed">
                    I, the undersigned, confirm I am the authorized Data Controller for <span className="text-white font-black">{user.company}</span>. 
                    I accept legal responsibility for the forensic truth of all records hashed on this platform. 
                    I understand that data is stored locally first and synced under NDPA encryption.
                  </span>
                </label>
              </div>

              <div className="flex space-x-4">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs">Back</button>
                <button 
                  onClick={handleFinish} 
                  disabled={!isStep3Valid || isVerifying} 
                  className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/20 flex items-center justify-center space-x-3 transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>SUBMIT FOR VERIFICATION</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center space-x-3 opacity-50">
           <ShieldCheck className="w-4 h-4 text-slate-400" />
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Forensic Protocol v4.0.1 Registered Session</p>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, placeholder, value, onChange }: { label: string, placeholder: string, value: string, onChange: (v: string) => void }) => (
  <div className="space-y-1">
    {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>}
    <input 
      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-300" 
      placeholder={placeholder} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default RegistrationGate;
