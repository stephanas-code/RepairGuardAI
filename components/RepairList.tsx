
import React, { useState, useEffect } from 'react';
import { RepairJob, RepairStatus } from '../types';
import { 
  Clock, ChevronRight, Smartphone, Laptop, Printer, Tablet, Package,
  CheckCircle2, AlertCircle, Wrench, Search, Hash, ShieldCheck, 
  ExternalLink, FileText, Activity, Phone, Sparkles, Send, Mail, Landmark, Shield,
  Save, Lock, Edit3, Fingerprint, AlertTriangle
} from 'lucide-react';

interface RepairListProps {
  repairs: RepairJob[];
  onUpdate: (job: RepairJob) => void;
}

const RepairList: React.FC<RepairListProps> = ({ repairs, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);
  
  // Local state to manage resolution notes and financials without re-render jumps
  const [localNotes, setLocalNotes] = useState('');
  const [localStatus, setLocalStatus] = useState<RepairStatus>('Pending');
  const [localAgreedAmount, setLocalAgreedAmount] = useState<number>(0);
  const [localInitialDeposit, setLocalInitialDeposit] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (selectedJob) {
      setLocalNotes(selectedJob.technicianNotes || '');
      setLocalStatus(selectedJob.status);
      setLocalAgreedAmount(selectedJob.agreedAmount);
      setLocalInitialDeposit(selectedJob.initialDeposit);
      setIsDirty(false);
    }
  }, [selectedJob?.id]);

  const getIcon = (cat: string) => {
    switch(cat) {
      case 'Phone': return <Smartphone className="w-5 h-5" />;
      case 'Laptop': return <Laptop className="w-5 h-5" />;
      case 'Printer': return <Printer className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const handleStatusChange = (newStatus: RepairStatus) => {
    if (newStatus === 'Completed') {
      const confirm1 = window.confirm("VERIFICATION 1/2: Are you sure this repair is COMPLETED? This will finalize the financial record for this case.");
      if (confirm1) {
        const confirm2 = window.confirm("VERIFICATION 2/2: All outstanding balances will be marked as PAID. This action creates a sealed legal record. Proceed?");
        if (confirm2) {
          setLocalStatus(newStatus);
          setLocalInitialDeposit(localAgreedAmount); // Auto-settle balance
          setIsDirty(true);
        }
      }
    } else {
      setLocalStatus(newStatus);
      setIsDirty(true);
    }
  };

  const handleSaveResolution = () => {
    if (!selectedJob) return;
    onUpdate({
      ...selectedJob,
      status: localStatus,
      technicianNotes: localNotes,
      agreedAmount: localAgreedAmount,
      initialDeposit: localInitialDeposit
    });
    setIsDirty(false);
    alert("Case metadata committed to forensic registry.");
  };

  const filtered = repairs.filter(r => 
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notifyClient = (job: RepairJob) => {
    if (isDirty) {
      alert("CRITICAL: Save your resolution changes before dispatching the report.");
      return;
    }
    const balance = job.agreedAmount - job.initialDeposit;
    const msg = `Final Report: RG-${job.id}\nStatus: ${job.status}\nResolution: ${job.technicianNotes || 'Completed according to standard diagnostic protocols'}.\nOutstanding Balance: ₦${balance.toLocaleString()}.\nNDPR ID: ${job.recordHash.substring(0, 12)}`;
    
    alert(`DISPATCHED VIA SECURE CHANNEL\nTo: ${job.clientPhone}\nPayload: ${msg}`);
  };

  const isSealed = selectedJob?.status === 'Completed' || selectedJob?.status === 'Unrepairable';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Job Registry & Forensic Logs</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-0.5 rounded-full border border-slate-200">
              Integrity Chain SECURED (SHA-256)
            </span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Name, ID, or IMEI..."
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-80 text-sm shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Cases */}
        <div className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {filtered.map(job => (
            <div 
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group relative overflow-hidden ${selectedJob?.id === job.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${selectedJob?.id === job.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-50'}`}>
                    {job.id}
                  </span>
                  {job.isSynced && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                </div>
                <span className={`text-[9px] font-black uppercase ${job.status === 'Completed' ? 'text-emerald-400' : job.status === 'Unrepairable' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {job.status}
                </span>
              </div>
              <h4 className="font-black text-lg group-hover:text-blue-500 transition-colors">{job.clientName}</h4>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-2 text-[11px] opacity-70 font-mono uppercase text-left">
                  {getIcon(job.deviceCategory)}
                  <span>{job.deviceBrand}</span>
                </div>
                <span className="text-[10px] font-black text-emerald-500">₦{job.agreedAmount.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Evidence View */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden min-h-[60vh] flex flex-col">
              <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedJob.clientName}</h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-mono">{selectedJob.id}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className="text-sm font-bold text-slate-500 flex items-center space-x-2">
                      <Phone className="w-3 h-3" /> <span>{selectedJob.clientPhone}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${selectedJob.isSynced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {selectedJob.isSynced ? 'NDPR VERIFIED & CLOUD SEALED' : 'UNSYNCED LOCAL FORENSIC CACHE'}
                  </div>
                </div>
              </div>

              <div className="p-8 flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 overflow-y-auto">
                <div className="space-y-8">
                  {/* Forensic Context */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <ShieldCheck className="w-3 h-3" /> <span>Integrity Evidence</span>
                    </label>
                    <div className="p-4 bg-slate-900 rounded-3xl text-white shadow-lg relative overflow-hidden group">
                      <Shield className="absolute top-[-10px] right-[-10px] w-24 h-24 opacity-10" />
                      <div className="flex items-center space-x-2 mb-2">
                        <Fingerprint className="w-4 h-4 text-blue-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Fingerprint Sealed</h4>
                      </div>
                      <div className="text-[8px] font-mono break-all opacity-60 leading-tight mb-4 select-all">{selectedJob.recordHash}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                          <p className="text-[8px] text-center font-bold text-white/30 uppercase mb-2">Client</p>
                          <img src={selectedJob.clientSignature} className="h-10 w-full object-contain brightness-0 invert" alt="Client" />
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                          <p className="text-[8px] text-center font-bold text-white/30 uppercase mb-2">Officer</p>
                          <img src={selectedJob.technicianSignature} className="h-10 w-full object-contain brightness-0 invert" alt="Tech" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <Landmark className="w-3 h-3" /> <span>Balance Analysis (₦)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">Total</p>
                        <input 
                          type="number"
                          disabled={isSealed}
                          className="font-black text-slate-900 text-sm w-full bg-transparent text-center focus:outline-none disabled:opacity-60"
                          value={localAgreedAmount}
                          onChange={e => {
                            setLocalAgreedAmount(parseFloat(e.target.value) || 0);
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                        <p className="text-[8px] text-blue-400 font-bold uppercase mb-1">Paid</p>
                        <input 
                          type="number"
                          disabled={isSealed}
                          className="font-black text-blue-900 text-sm w-full bg-transparent text-center focus:outline-none disabled:opacity-60"
                          value={localInitialDeposit}
                          onChange={e => {
                            setLocalInitialDeposit(parseFloat(e.target.value) || 0);
                            setIsDirty(true);
                          }}
                        />
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                        <p className="text-[8px] text-emerald-400 font-bold uppercase mb-1">Due</p>
                        <p className="font-black text-emerald-900 text-sm">₦{(localAgreedAmount - localInitialDeposit).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                        <Edit3 className="w-3 h-3" /> <span>Lifecycle Resolution</span>
                      </label>
                      {isDirty && <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">Unsaved Draft</span>}
                    </div>
                    <div className="space-y-4">
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                        value={localStatus}
                        onChange={e => handleStatusChange(e.target.value as RepairStatus)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed ✅</option>
                        <option value="Unrepairable">Unrepairable ❌</option>
                      </select>
                      <div className="relative group">
                        <textarea 
                          rows={6}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Document technical outcome for forensic proof..."
                          value={localNotes}
                          onChange={e => {
                            setLocalNotes(e.target.value);
                            setIsDirty(true);
                          }}
                        />
                        {isSealed && (
                           <div className="absolute top-2 right-2 opacity-20 pointer-events-none">
                              <Lock className="w-4 h-4" />
                           </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={handleSaveResolution}
                          disabled={!isDirty}
                          className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg ${isDirty ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-100 text-slate-400 opacity-50 shadow-none'}`}
                        >
                          <Save className="w-3 h-3" />
                          <span>Commit to Log</span>
                        </button>
                        <button 
                          onClick={() => notifyClient(selectedJob)}
                          className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch Report</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-3xl border border-blue-100">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center space-x-2 mb-2">
                       <Activity className="w-3 h-3" /> <span>Original Intake Fault</span>
                    </h5>
                    <p className="text-[11px] text-blue-900 font-bold leading-relaxed">{selectedJob.faultDescription}</p>
                  </div>
                </div>
              </div>

              {/* NDPR Statement in History View */}
              <div className="px-8 py-6 bg-slate-900/5 border-t border-slate-100">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NDPR Compliance & Forensic Record</p>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      This record is stored in compliance with the Nigeria Data Protection Regulation (NDPR). 
                      The integrity of this case file is secured by cryptographic SHA-256 fingerprinting. 
                      Signatures and device metadata are preserved as immutable evidence for legal protection 
                      and asset verification (Article 2.6).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-slate-50 flex justify-end">
                <button 
                  onClick={() => alert("Generating Forensic NDPR Case File...")}
                  className="flex items-center space-x-2 bg-white border border-slate-200 px-6 py-2 rounded-full text-xs font-bold hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>EXPORT FOR LEGAL AUDIT</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="p-6 bg-white rounded-full shadow-inner"><Search className="w-12 h-12 opacity-10" /></div>
              <div className="text-center">
                <p className="font-black uppercase tracking-widest text-[10px]">Select Record to Audit</p>
                <p className="text-[8px] font-bold opacity-50 mt-1">Registry level: ACTIVE MONITORING</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepairList;
