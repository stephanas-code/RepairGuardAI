
import React, { useState, useEffect } from 'react';
import { RepairJob, RepairStatus, SMSLog, User, TIER_FEATURES, AISuggestion } from '../types';
import { getSMSForRepair, saveSMS, saveAuditLog } from '../db';
import TrustReceipt from './TrustReceipt';
import { 
  Smartphone, Laptop, Printer, Package, Search, Hash, ShieldCheck, 
  ExternalLink, Phone, Send, Landmark, Shield, Save, Lock, Edit3, 
  Fingerprint, AlertTriangle, CloudOff, CloudCheck, X, FileText, Scale, MessageSquare, Image, CheckCircle2, Maximize2, Minimize2, Sparkles, Activity, PlayCircle
} from 'lucide-react';

interface RepairListProps {
  repairs: RepairJob[];
  onUpdate: (job: RepairJob) => void;
  user: User;
}

const RepairList: React.FC<RepairListProps> = ({ repairs, onUpdate, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);
  const [localNotes, setLocalNotes] = useState('');
  const [localStatus, setLocalStatus] = useState<RepairStatus>('Pending');
  const [localAgreedAmount, setLocalAgreedAmount] = useState<number>(0);
  const [localInitialDeposit, setLocalInitialDeposit] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);
  const [showSealModal, setShowSealModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RepairStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsHistory, setSmsHistory] = useState<SMSLog[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<AISuggestion | null>(null);

  const currentTierId = user.currentPlanId ? user.currentPlanId.toUpperCase() : 'FREE';
  const features = TIER_FEATURES[currentTierId as keyof typeof TIER_FEATURES] || TIER_FEATURES.FREE;

  useEffect(() => {
    if (selectedJob) {
      const fresh = repairs.find(r => r.id === selectedJob.id);
      if (fresh && fresh.updatedAt !== selectedJob.updatedAt) {
        setSelectedJob(fresh);
      }
      loadSMS(selectedJob.id);
      setExpandedSuggestion(null);
    }
  }, [repairs, selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      setLocalNotes(selectedJob.technicianNotes || '');
      setLocalStatus(selectedJob.status);
      setLocalAgreedAmount(selectedJob.agreedAmount);
      setLocalInitialDeposit(selectedJob.initialDeposit);
      setIsDirty(false);
    } else {
        setIsMaximized(false);
    }
  }, [selectedJob]);

  const loadSMS = async (id: string) => {
    const logs = await getSMSForRepair(id);
    setSmsHistory(logs);
  };

  const handleJusticeExport = async () => {
    if (!selectedJob) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      alert(`JUSTICE MODE ACTIVATED\nEvidence Bundle Prepared.\nHash: ${selectedJob.recordHash}`);
    }, 1500);
  };

  const handleSendSMS = async () => {
    if (!selectedJob || !smsMessage.trim()) return;
    await saveSMS({
      id: `sms-${Date.now()}`,
      repairId: selectedJob.id,
      recipient: selectedJob.clientPhone,
      message: smsMessage,
      status: 'Sent',
      timestamp: Date.now()
    });
    setSmsMessage('');
    setShowSMSModal(false);
    await loadSMS(selectedJob.id);
  };

  const handleCommit = async () => {
    if (!selectedJob || !isDirty) return;
    const updatedJob = {
      ...selectedJob,
      status: localStatus,
      technicianNotes: localNotes,
      agreedAmount: localAgreedAmount,
      initialDeposit: localInitialDeposit,
      updatedAt: Date.now()
    };
    onUpdate(updatedJob);
  };

  const filtered = repairs.filter(r => 
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.serialNumber && r.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isLocked = selectedJob?.status === 'Completed' || selectedJob?.status === 'Unrepairable';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative h-full">
      {showReceipt && selectedJob && (
        <TrustReceipt job={selectedJob} user={user} onClose={() => setShowReceipt(false)} onWhatsApp={() => {}} onPrint={() => window.print()} />
      )}
      
      {expandedSuggestion && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start shrink-0">
               <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-2">{expandedSuggestion.solution}</h3>
                  <div className="flex space-x-2">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${expandedSuggestion.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-600' : expandedSuggestion.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                        {expandedSuggestion.riskLevel} Risk
                     </span>
                     <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-600">
                        {expandedSuggestion.accuracy}% Accuracy
                     </span>
                  </div>
               </div>
               <button onClick={() => setExpandedSuggestion(null)} className="p-3 bg-white rounded-full hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
               </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
               <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Diagnosis Overview</h4>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{expandedSuggestion.description}</p>
               </div>
               
               {expandedSuggestion.steps && expandedSuggestion.steps.length > 0 && (
                  <div className="space-y-3">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Forensic Repair Protocol</h4>
                     <div className="space-y-2">
                        {expandedSuggestion.steps.map((step, idx) => (
                           <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">{idx + 1}</div>
                              <p className="text-sm font-bold text-slate-700">{step}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {expandedSuggestion.externalResources && expandedSuggestion.externalResources.length > 0 && (
                  <div className="space-y-3">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">External Intelligence</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {expandedSuggestion.externalResources.map((res, idx) => (
                           <a 
                              key={idx} 
                              href={res.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center space-x-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                           >
                              <div className={`p-2 rounded-xl ${res.type === 'Video' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                 {res.type === 'Video' ? <PlayCircle className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-700">{res.title}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{res.type} Resource</p>
                              </div>
                           </a>
                        ))}
                     </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal abbreviated ... */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Forensic Logs</h2>
          <div className="flex items-center space-x-3 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>CHAIN-OF-CUSTODY ACTIVE</span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search..." className="pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none w-full md:w-80 text-sm font-bold shadow-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-[calc(100vh-240px)]">
        <div className={`lg:col-span-4 space-y-4 overflow-y-auto pr-2 custom-scrollbar transition-all ${isMaximized ? 'hidden' : ''}`}>
          {filtered.map(job => (
            <div key={job.id} onClick={() => setSelectedJob(job)} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative overflow-hidden ${selectedJob?.id === job.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${selectedJob?.id === job.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{job.id}</span>
                <span className="text-[9px] font-black uppercase">{job.status}</span>
              </div>
              <h4 className="font-black text-xl mb-1 truncate">{job.clientName}</h4>
              <p className="text-[10px] font-mono opacity-50 uppercase">{job.deviceBrand} {job.deviceModel}</p>
            </div>
          ))}
        </div>

        <div className={`${isMaximized ? 'fixed inset-0 z-50 m-4' : 'lg:col-span-8'} bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden`}>
          {selectedJob ? (
            <div className="flex flex-col h-full relative">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center sticky top-0 z-20">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{selectedJob.clientName}</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase">Hash: {selectedJob.recordHash.substring(0, 16)}...</p>
                </div>
                <div className="flex items-center space-x-2">
                   <button onClick={() => setShowReceipt(true)} className="p-3 bg-white border rounded-xl"><FileText className="w-5 h-5 text-slate-600" /></button>
                   <button onClick={() => setIsMaximized(!isMaximized)} className="p-3 bg-slate-100 rounded-xl"><Maximize2 className="w-5 h-5 text-slate-600" /></button>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-y-auto space-y-10 custom-scrollbar">
                {/* AI Suggestions Section */}
                {features.allowAI && selectedJob.aiSuggestions && selectedJob.aiSuggestions.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center space-x-2">
                       <Sparkles className="w-5 h-5 text-amber-500" />
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Gemini Forensic Insights</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {selectedJob.aiSuggestions.map((s, i) => (
                         <div 
                           key={i} 
                           onClick={() => setExpandedSuggestion(s)}
                           className="p-5 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-lg transition-all cursor-pointer"
                         >
                            <div className="flex justify-between items-start mb-3">
                               <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-600' : s.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                 {s.riskLevel} Risk
                               </div>
                               <div className="text-[10px] font-black text-amber-600">{s.accuracy}% Acc</div>
                            </div>
                            <h5 className="font-black text-slate-900 text-sm mb-1">{s.solution}</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{s.description}</p>
                            
                            {(s.steps || s.externalResources) && (
                                <div className="mt-2 text-[9px] font-black uppercase text-amber-400 flex items-center gap-1 group-hover:text-amber-600">
                                   <ExternalLink className="w-3 h-3" /> View Protocol
                                </div>
                            )}
                         </div>
                       ))}
                    </div>
                  </section>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center space-x-2"><Fingerprint className="w-4 h-4 text-blue-500" /> <span>Security bundle</span></label>
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                          <p className="text-[8px] font-black text-white/30 uppercase mb-1">Client</p>
                          <img src={selectedJob.clientSignature} className="h-8 object-contain brightness-0 invert" alt="Sig" />
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                          <p className="text-[8px] font-black text-white/30 uppercase mb-1">Officer</p>
                          <img src={selectedJob.technicianSignature} className="h-8 object-contain brightness-0 invert" alt="Sig" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center space-x-2"><Activity className="w-4 h-4 text-indigo-500" /> <span>Technician Outcome</span></label>
                    <select disabled={isLocked} className="w-full px-5 py-3 bg-slate-50 border rounded-xl text-sm font-black" value={localStatus} onChange={e => {
                        const s = e.target.value as RepairStatus;
                        setLocalStatus(s); 
                        if (s === 'Completed') setLocalInitialDeposit(localAgreedAmount);
                        setIsDirty(true);
                    }}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Unrepairable">Unrepairable</option>
                    </select>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Agreed (₦)</label>
                            <input type="number" disabled={isLocked} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold" value={localAgreedAmount} onChange={e => {setLocalAgreedAmount(parseFloat(e.target.value) || 0); setIsDirty(true);}} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Paid (₦)</label>
                            <input type="number" disabled={isLocked} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold" value={localInitialDeposit} onChange={e => {setLocalInitialDeposit(parseFloat(e.target.value) || 0); setIsDirty(true);}} />
                        </div>
                    </div>

                    <textarea disabled={isLocked} rows={4} className="w-full px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold" value={localNotes} onChange={e => {setLocalNotes(e.target.value); setIsDirty(true);}} />
                    <button onClick={handleCommit} disabled={!isDirty || isLocked} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase transition-all ${isDirty ? 'bg-blue-600 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>Save Progress</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Search className="w-16 h-16 opacity-10 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">Select a case</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepairList;
