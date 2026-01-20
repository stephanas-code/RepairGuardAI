
import React from 'react';
import { RepairJob, User, TIER_FEATURES } from '../types';
import { ShieldCheck, Smartphone, Laptop, Printer, Package, Calendar, Clock, Hash, MapPin, ExternalLink, AlertTriangle, Gavel, Scale, Phone, User as UserIcon, Sparkles, BrainCircuit } from 'lucide-react';

interface TrustReceiptProps {
  job: RepairJob;
  user?: User; // Optional user passed to determine tier visuals
  onClose: () => void;
  onWhatsApp: () => void;
  onPrint: () => void;
}

const TrustReceipt: React.FC<TrustReceiptProps> = ({ job, user, onClose, onWhatsApp, onPrint }) => {
  
  // Determine if this receipt is from a Free/Trial tier
  const currentTierId = user?.currentPlanId ? user.currentPlanId.toUpperCase() : 'FREE';
  const isFreeTier = currentTierId === 'FREE';

  const getIcon = () => {
    switch (job.deviceCategory) {
      case 'Phone': return <Smartphone className="w-8 h-8" />;
      case 'Laptop': return <Laptop className="w-8 h-8" />;
      case 'Printer': return <Printer className="w-8 h-8" />;
      default: return <Package className="w-8 h-8" />;
    }
  };

  // Mock QR Code generation URL
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=RG-VERIFY:${job.id}-${job.recordHash.substring(0,8)}`;

  const handleShareWhatsApp = () => {
      const text = `*RepairGuard Intake Receipt*\n` +
                   `------------------------\n` +
                   `*Case ID:* ${job.id}\n` +
                   `*Client:* ${job.clientName}\n` +
                   `*Device:* ${job.deviceBrand} ${job.deviceModel} (S/N: ${job.serialNumber})\n` +
                   `*Reported Fault:* ${job.faultDescription}\n` +
                   `*Initial Deposit:* ₦${job.initialDeposit.toLocaleString()}\n` +
                   `------------------------\n` +
                   `*Preliminary AI Diagnosis:*\n` +
                   `${job.aiSuggestions && job.aiSuggestions.length > 0 ? job.aiSuggestions[0].solution : 'Pending Analysis'}\n` +
                   `------------------------\n` +
                   `Powered by RepairGuard AI`;
      
      const url = `https://wa.me/${job.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      if (onWhatsApp) onWhatsApp();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-sm animate-in fade-in">
      <div className="printable-area bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Receipt Header */}
        <div className={`p-8 text-white text-center relative overflow-hidden ${isFreeTier ? 'bg-slate-700' : 'bg-slate-900'}`}>
           <div className="absolute top-0 right-0 p-6 opacity-10"><ShieldCheck className="w-32 h-32" /></div>
           <div className="relative z-10">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${isFreeTier ? 'bg-slate-500' : 'bg-blue-600 shadow-blue-500/30'}`}>
                {isFreeTier ? <AlertTriangle className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />}
             </div>
             <h2 className="text-xl font-black uppercase tracking-widest">{isFreeTier ? 'Unverified Intake Log' : 'Trust Receipt'}</h2>
             <p className={`text-[10px] font-bold mt-1 ${isFreeTier ? 'text-slate-400' : 'text-blue-400'}`}>
                {isFreeTier ? 'Not Legally Protected • Basic Log Only' : 'Official Forensic Intake Record'}
             </p>
           </div>
        </div>

        {/* Receipt Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
           {isFreeTier && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
                  <div className="text-4xl font-black uppercase text-slate-900 -rotate-45 border-4 border-slate-900 p-4">UNVERIFIED RECORD</div>
              </div>
           )}

           <div className="relative z-10">
               {/* Issued By & Client Details Section */}
               <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
                  <div className="flex-1 pr-4">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued By</p>
                     <h3 className="font-black text-lg text-slate-900 leading-tight">{job.company}</h3>
                     <div className="flex items-center text-xs text-slate-500 mt-1 font-bold">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{job.businessCAC}</span>
                     </div>
                  </div>
                  <div className="text-right flex-1 pl-4 border-l border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Details</p>
                     <h3 className="font-black text-lg text-slate-900 leading-tight">{job.clientName}</h3>
                     <div className="flex items-center justify-end text-xs text-slate-500 mt-1 font-bold">
                        <Phone className="w-3 h-3 mr-1" />
                        <span>{job.clientPhone}</span>
                     </div>
                  </div>
               </div>
               
               {/* Case Metadata */}
               <div className="flex justify-between items-center mb-6">
                    <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID</p>
                         <p className="font-mono font-black text-lg text-blue-600">{job.id}</p>
                    </div>
                    <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intake Date</p>
                         <p className="font-bold text-slate-700">{new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
               </div>

               {/* Asset Details */}
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-6">
                  <div className="flex items-center space-x-4 mb-4">
                     <div className="p-3 bg-white rounded-xl shadow-sm text-slate-700 border border-slate-100">
                        {getIcon()}
                     </div>
                     <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Asset Deposited</p>
                        <p className="font-black text-slate-900 text-lg leading-tight">{job.deviceBrand} {job.deviceModel}</p>
                        <p className="text-xs font-mono text-slate-500 mt-0.5 font-bold uppercase tracking-wide">S/N: {job.serialNumber}</p>
                     </div>
                  </div>
                  <div className="space-y-2 text-xs">
                     <div className="flex justify-between">
                        <span className="font-bold text-slate-500">Reported Fault</span>
                        <span className="font-black text-slate-900 text-right max-w-[60%]">{job.faultDescription}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="font-bold text-slate-500">Initial Deposit</span>
                        <span className="font-black text-slate-900">₦{job.initialDeposit.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                        <span className="font-bold text-slate-500">Agreed Balance</span>
                        <span className="font-black text-slate-900">₦{(job.agreedAmount - job.initialDeposit).toLocaleString()}</span>
                     </div>
                  </div>
               </div>

               {/* AI Diagnosis Section */}
               {job.aiSuggestions && job.aiSuggestions.length > 0 && (
                  <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 mb-6 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="w-16 h-16 text-indigo-900" /></div>
                     <div className="relative z-10">
                        <div className="flex items-center space-x-2 mb-3">
                           <Sparkles className="w-4 h-4 text-indigo-600" />
                           <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Gemini Forensic Diagnosis</h4>
                        </div>
                        <div className="space-y-3">
                           {job.aiSuggestions.slice(0, 2).map((suggestion, idx) => (
                              <div key={idx} className="relative pl-3 border-l-2 border-indigo-300">
                                 <div className="flex justify-between items-start">
                                    <span className="font-black text-xs text-indigo-800">{suggestion.solution}</span>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${suggestion.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-700' : suggestion.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {suggestion.riskLevel} Risk
                                        </span>
                                        <span className="text-[8px] font-bold bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded">{Math.round(suggestion.accuracy)}% Conf.</span>
                                    </div>
                                 </div>
                                 <p className="text-[9px] text-indigo-700 leading-tight mt-1 line-clamp-2">{suggestion.description}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}

               {/* Legal Protection Declaration on Receipt */}
               <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-3 h-3 text-blue-600" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Client Legal Acknowledgment</span>
                  </div>
                  <p className="text-[9.5px] font-medium text-slate-600 leading-relaxed italic">
                    "I declare that I am the sole owner/authorized possessor of this asset. I am not a co-author of theft. 
                    The technician's only involvement is limited to fixing the fault described herein. 
                    All information provided by me is NDPR-protected and hashed for forensic truth."
                  </p>
               </div>

               <div className="flex items-center justify-between">
                  <div className="flex-1 pr-4">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Verification & Security</p>
                     <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        {isFreeTier 
                            ? "This record is generated via the Free Tier. It lacks cryptographic assurance and legal dispute protection." 
                            : "Scan this code to verify authenticity. This receipt is cryptographically hashed and protected by the RepairGuard AI Forensic Layer."}
                     </p>
                     <div className="mt-3 flex items-center space-x-2">
                        <img src={job.technicianSignature} className="h-8 object-contain opacity-50" alt="Tech Sig" />
                        <span className="text-[8px] font-mono text-slate-400">OFFICER SEAL</span>
                     </div>
                  </div>
                  <div className="w-24 h-24 bg-white p-2 rounded-xl border-2 border-slate-900 shadow-lg shrink-0 overflow-hidden relative">
                     {isFreeTier ? (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-center">
                            <span className="text-[8px] font-black uppercase text-slate-400">Upgrade for QR</span>
                        </div>
                     ) : (
                        <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                     )}
                  </div>
               </div>
           </div>
        </div>

        {/* Footer Actions - Hidden during print */}
        <div className="no-print p-6 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
           <button onClick={handleShareWhatsApp} className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all">
              <ExternalLink className="w-5 h-5" />
              <span>Whatsapp</span>
           </button>
           <div className="flex gap-3">
              <button onClick={onPrint} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                 Save PDF (Ctrl+P)
              </button>
              <button onClick={onClose} className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                 Close
              </button>
           </div>
           <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mt-2">Protected by RepairGuard AI</p>
        </div>
      </div>
    </div>
  );
};

export default TrustReceipt;
