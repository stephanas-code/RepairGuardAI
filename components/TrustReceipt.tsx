
import React from 'react';
import { RepairJob, User, TIER_FEATURES } from '../types';
import { ShieldCheck, Smartphone, Laptop, Printer, Package, Calendar, Clock, Hash, MapPin, ExternalLink, AlertTriangle, Gavel, Scale } from 'lucide-react';

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
               <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued By</p>
                     <h3 className="font-black text-lg text-slate-900">{job.company}</h3>
                     <div className="flex items-center text-xs text-slate-500 mt-1 font-bold">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{job.businessCAC}</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID</p>
                     <p className="font-mono font-black text-lg text-blue-600">{job.id}</p>
                     <div className="flex items-center justify-end text-xs text-slate-500 mt-1 font-bold">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-6">
                  <div className="flex items-center space-x-4 mb-4">
                     <div className="p-3 bg-white rounded-xl shadow-sm text-slate-700 border border-slate-100">
                        {getIcon()}
                     </div>
                     <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Asset Deposited</p>
                        <p className="font-black text-slate-900 text-lg leading-tight">{job.deviceBrand} {job.deviceModel}</p>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">S/N: {job.serialNumber}</p>
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
           {!isFreeTier && (
               <button onClick={onWhatsApp} className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all">
                  <ExternalLink className="w-5 h-5" />
                  <span>Send via WhatsApp</span>
               </button>
           )}
           <div className="flex gap-3">
              <button onClick={onPrint} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                 Print
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
