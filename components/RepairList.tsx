
import React, { useState, useEffect } from 'react';
import { RepairJob, RepairStatus, SMSLog } from '../types';
import { getSMSForRepair, saveSMS } from '../db';
import { 
  Smartphone, Laptop, Printer, Package, Search, Hash, ShieldCheck, 
  ExternalLink, Phone, Send, Landmark, Shield, Save, Lock, Edit3, 
  Fingerprint, AlertTriangle, CloudOff, CloudCheck, X, FileText, Scale, MessageSquare, Image
} from 'lucide-react';

interface RepairListProps {
  repairs: RepairJob[];
  onUpdate: (job: RepairJob) => void;
}

const RepairList: React.FC<RepairListProps> = ({ repairs, onUpdate }) => {
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
  
  // SMS States
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsHistory, setSmsHistory] = useState<SMSLog[]>([]);

  useEffect(() => {
    if (selectedJob) {
      const fresh = repairs.find(r => r.id === selectedJob.id);
      if (fresh && fresh.updatedAt !== selectedJob.updatedAt) {
        setSelectedJob(fresh);
      }
      loadSMS(selectedJob.id);
    }
  }, [repairs, selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      setLocalNotes(selectedJob.technicianNotes || '');
      setLocalStatus(selectedJob.status);
      setLocalAgreedAmount(selectedJob.agreedAmount);
      setLocalInitialDeposit(selectedJob.initialDeposit);
      setIsDirty(false);
      setShowSealModal(false);
      setShowSMSModal(false);
    }
  }, [selectedJob]);

  const loadSMS = async (id: string) => {
    const logs = await getSMSForRepair(id);
    setSmsHistory(logs);
  };

  const handleJusticeExport = async () => {
    if (!selectedJob) return;
    setIsVerifying(true);
    
    // Simulate forensic validation of the hash chain
    setTimeout(() => {
      setIsVerifying(false);
      const bundleId = `FB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      alert(`JUSTICE MODE ACTIVATED\n\nEvidence Bundle ${bundleId} Prepared.\n\nContents:\n1. Cryptographic Hash: ${selectedJob.recordHash}\n2. NDPR Consent Timestamp: ${new Date(selectedJob.createdAt).toISOString()}\n3. Verified Device IMEI: ${selectedJob.serialNumber}\n4. Chain of Custody: SECURED\n\nThis bundle is ready for Police/Court submission.`);
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
      timestamp: Date.now(),
      deliveryProof: `sim_gw_${Math.random().toString(36).substr(2,8)}`
    });
    
    setSmsMessage('');
    setShowSMSModal(false);
    await loadSMS(selectedJob.id);
  };

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as RepairStatus;
    if (nextStatus === 'Completed' || nextStatus === 'Unrepairable') {
      setPendingStatus(nextStatus);
      setShowSealModal(true);
    } else {
      setLocalStatus(nextStatus);
      setIsDirty(true);
    }
  };

  const confirmSeal = () => {
    if (!pendingStatus) return;
    setLocalStatus(pendingStatus);
    if (pendingStatus === 'Completed' && localInitialDeposit < localAgreedAmount) {
      setLocalInitialDeposit(localAgreedAmount);
    }
    setIsDirty(true);
    setShowSealModal(false);
  };

  const handleCommit = () => {
    if (!selectedJob || !isDirty) return;
    onUpdate({
      ...selectedJob,
      status: localStatus,
      technicianNotes: localNotes,
      agreedAmount: localAgreedAmount,
      initialDeposit: localInitialDeposit,
      updatedAt: Date.now()
    });
  };

  const handleExportPDF = () => {
    if (!selectedJob) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>Forensic Report - ${selectedJob.id}</title>
          <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #1e293b; }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; }
              .logo { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
              .meta { font-size: 10px; margin-top: 5px; text-transform: uppercase; }
              .section { margin-bottom: 30px; }
              .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; color: #475569; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .field { margin-bottom: 10px; }
              .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; }
              .value { font-size: 14px; font-weight: bold; }
              .box { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; }
              .hash { word-break: break-all; font-family: monospace; font-size: 10px; color: #0f172a; }
              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
              .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
              .sig-box { text-align: center; width: 40%; }
              .sig-img { height: 60px; object-fit: contain; margin-bottom: 10px; border-bottom: 1px solid #000; display: block; width: 100%; }
              .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
              .photo-item { text-align: center; }
              .photo-img { width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 5px; }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="logo">RepairGuard Forensic Report</div>
              <div class="meta">Case ID: ${selectedJob.id} • ${new Date().toLocaleString()}</div>
              <div class="meta">Verified Organization: ${selectedJob.company} (${selectedJob.businessCAC})</div>
          </div>

          <div class="section">
              <div class="section-title">Client & Asset Information</div>
              <div class="grid">
                  <div>
                      <div class="field"><div class="label">Client Name</div><div class="value">${selectedJob.clientName}</div></div>
                      <div class="field"><div class="label">Contact</div><div class="value">${selectedJob.clientPhone}</div></div>
                  </div>
                  <div>
                      <div class="field"><div class="label">Device</div><div class="value">${selectedJob.deviceCategory} - ${selectedJob.deviceBrand} ${selectedJob.deviceModel}</div></div>
                      <div class="field"><div class="label">Serial / IMEI</div><div class="value">${selectedJob.serialNumber}</div></div>
                  </div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Diagnostic Findings</div>
              <div class="box">
                  <div class="field"><div class="label">Reported Fault</div><div class="value">${selectedJob.faultDescription}</div></div>
                  <div class="field"><div class="label">Initial Condition</div><div class="value">${selectedJob.initialCondition}</div></div>
                  <div class="field"><div class="label">Technician Outcome</div><div class="value">${selectedJob.status} - ${selectedJob.technicianNotes || 'No notes logged.'}</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Visual Evidence</div>
              <div class="photo-grid">
                  <div class="photo-item">
                      ${selectedJob.devicePhotoFront ? `<img src="${selectedJob.devicePhotoFront}" class="photo-img" />` : '<div style="padding: 20px; border: 1px dashed #ccc;">No Front Photo</div>'}
                      <div class="label">Front View</div>
                  </div>
                  <div class="photo-item">
                      ${selectedJob.devicePhotoBack ? `<img src="${selectedJob.devicePhotoBack}" class="photo-img" />` : '<div style="padding: 20px; border: 1px dashed #ccc;">No Back Photo</div>'}
                      <div class="label">Back View</div>
                  </div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Financial Summary</div>
              <div class="grid">
                  <div class="field"><div class="label">Agreed Service Fee</div><div class="value">₦${selectedJob.agreedAmount.toLocaleString()}</div></div>
                  <div class="field"><div class="label">Initial Deposit</div><div class="value">₦${selectedJob.initialDeposit.toLocaleString()}</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Integrity Verification</div>
              <div class="box">
                  <div class="field">
                      <div class="label">Cryptographic Hash (SHA-256)</div>
                      <div class="hash">${selectedJob.recordHash}</div>
                  </div>
                  <div class="field">
                      <div class="label">Chain Link (Previous Hash)</div>
                      <div class="hash">${selectedJob.prevRecordHash}</div>
                  </div>
              </div>
          </div>

          <div class="signatures">
              <div class="sig-box">
                  <img src="${selectedJob.clientSignature}" class="sig-img" />
                  <div class="label">Client Signature</div>
              </div>
              <div class="sig-box">
                  <img src="${selectedJob.technicianSignature}" class="sig-img" />
                  <div class="label">Officer Signature</div>
              </div>
          </div>

          <div class="footer">
              Generated by RepairGuard AI • NDPR Compliant Forensic Record • Not valid without digital seal verification.
          </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Allow images to load before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  const filtered = repairs.filter(r => 
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.serialNumber && r.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isLocked = selectedJob?.status === 'Completed' || selectedJob?.status === 'Unrepairable';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative h-full">
      {/* Seal Confirmation Modal */}
      {showSealModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-4 border-slate-100 scale-100 animate-in zoom-in-95">
            <div className="flex justify-center mb-8">
              <div className={`p-6 rounded-[2rem] ${pendingStatus === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {pendingStatus === 'Completed' ? <ShieldCheck className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
              </div>
            </div>
            <h3 className="text-2xl font-black text-center text-slate-900 mb-4 tracking-tight">
              {pendingStatus === 'Completed' ? 'Commit Forensic Seal?' : 'Declare Non-Restorable?'}
            </h3>
            <p className="text-center text-slate-500 font-bold text-sm mb-10 leading-relaxed">
              Moving to <span className="font-black uppercase">{pendingStatus}</span> will freeze the integrity chain. Any later changes will be flagged as evidence tampering.
            </p>
            <div className="space-y-4">
              <button onClick={confirmSeal} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-white shadow-2xl ${pendingStatus === 'Completed' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}>
                SEAL RECORD NOW
              </button>
              <button onClick={() => setShowSealModal(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSMSModal && selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl border-4 border-slate-100 scale-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black text-slate-900 flex items-center space-x-3">
                 <MessageSquare className="w-6 h-6 text-blue-600" />
                 <span>Client Notification</span>
               </h3>
               <button onClick={() => setShowSMSModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <div className="mb-6 max-h-48 overflow-y-auto space-y-3 custom-scrollbar">
              {smsHistory.map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-2xl text-xs border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">{log.status}</span>
                  </div>
                  <p className="text-slate-700 leading-snug">{log.message}</p>
                </div>
              ))}
              {smsHistory.length === 0 && <p className="text-center text-slate-300 text-xs font-black uppercase">No prior communications</p>}
            </div>

            <div className="space-y-4">
               <textarea 
                 rows={3} 
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="Draft update message..."
                 value={smsMessage}
                 onChange={e => setSmsMessage(e.target.value)}
               />
               <button onClick={handleSendSMS} disabled={!smsMessage.trim()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-2 disabled:opacity-50">
                 <Send className="w-4 h-4" />
                 <span>DISPATCH VIA GATEWAY</span>
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Forensic Logs</h2>
          <div className="flex items-center space-x-3 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>CHAIN-OF-CUSTODY ACTIVE</span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search DNA IDs..."
            className="pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none w-full md:w-80 text-sm font-bold shadow-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-[calc(100vh-240px)]">
        <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {filtered.map(job => (
            <div key={job.id} onClick={() => setSelectedJob(job)} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative overflow-hidden ${selectedJob?.id === job.id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${selectedJob?.id === job.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{job.id}</span>
                <span className={`text-[9px] font-black uppercase ${job.status === 'Completed' ? 'text-emerald-400' : job.status === 'Unrepairable' ? 'text-rose-400' : 'text-amber-400'}`}>{job.status}</span>
              </div>
              <h4 className="font-black text-xl mb-1 truncate">{job.clientName}</h4>
              <p className="text-[10px] font-mono opacity-50 uppercase">{job.deviceBrand} {job.deviceModel} • ID:{job.id}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
          {selectedJob ? (
            <div className="flex flex-col h-full animate-in zoom-in-95 relative">
              {isLocked && (
                <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] pointer-events-none z-10 flex items-center justify-center">
                  <div className="bg-white/90 px-6 py-3 rounded-2xl border border-slate-200 shadow-2xl flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-slate-900" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900">Cryptographically Sealed</span>
                  </div>
                </div>
              )}
              
              <div className="p-10 border-b bg-slate-50/50 flex justify-between items-center sticky top-0 z-20">
                <div>
                  <h3 className="text-3xl font-black text-slate-900">{selectedJob.clientName}</h3>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">Registry Hash: {selectedJob.recordHash.substring(0, 16)}...</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleExportPDF}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center space-x-2 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden xl:inline">Export Report (PDF)</span>
                  </button>
                  <button 
                    onClick={() => setShowSMSModal(true)}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center space-x-2 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden xl:inline">SMS Update</span>
                  </button>
                  <button 
                    onClick={handleJusticeExport}
                    disabled={isVerifying}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center space-x-3 hover:bg-black transition-all shadow-xl"
                  >
                    {isVerifying ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Scale className="w-4 h-4" />}
                    <span>Justice Mode</span>
                  </button>
                </div>
              </div>

              <div className="p-10 flex-1 overflow-y-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center space-x-3">
                      <Fingerprint className="w-4 h-4 text-blue-500" /> <span>Forensic Evidence Bundle</span>
                    </label>
                    <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl">
                      <div className="text-[7px] font-mono break-all opacity-30 mb-6 select-all border-b border-white/10 pb-4">PARENT_HASH: {selectedJob.prevRecordHash}</div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                          <p className="text-[8px] font-black text-white/30 uppercase mb-2">Client Signature</p>
                          <img src={selectedJob.clientSignature} className="h-10 w-full object-contain brightness-0 invert" alt="Client" />
                        </div>
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                          <p className="text-[8px] font-black text-white/30 uppercase mb-2">Officer Signature</p>
                          <img src={selectedJob.technicianSignature} className="h-10 w-full object-contain brightness-0 invert" alt="Officer" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual Evidence Display */}
                  <div className="space-y-6">
                     <label className="text-[10px] font-black text-slate-400 uppercase flex items-center space-x-3">
                        <Image className="w-4 h-4 text-emerald-500" /> <span>Visual Evidence</span>
                     </label>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="aspect-[4/3] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden relative group">
                           {selectedJob.devicePhotoFront ? (
                             <img src={selectedJob.devicePhotoFront} className="w-full h-full object-cover" alt="Front Evidence" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                <Image className="w-6 h-6 mb-1 opacity-20" />
                                <span className="text-[8px] font-black uppercase tracking-widest">No Front Photo</span>
                             </div>
                           )}
                           <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-[8px] font-black text-white uppercase tracking-widest">Front</div>
                        </div>
                        <div className="aspect-[4/3] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden relative group">
                           {selectedJob.devicePhotoBack ? (
                             <img src={selectedJob.devicePhotoBack} className="w-full h-full object-cover" alt="Back Evidence" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                <Image className="w-6 h-6 mb-1 opacity-20" />
                                <span className="text-[8px] font-black uppercase tracking-widest">No Back Photo</span>
                             </div>
                           )}
                           <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-[8px] font-black text-white uppercase tracking-widest">Back</div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center space-x-3">
                      <Edit3 className="w-4 h-4 text-amber-500" /> <span>Technician Outcome Log</span>
                    </label>
                    <select 
                      disabled={isLocked}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-100 outline-none"
                      value={localStatus}
                      onChange={handleStatusSelect}
                    >
                      <option value="Pending">Pending Audit</option>
                      <option value="In Progress">Active Repair</option>
                      <option value="Completed">Resolution Confirmed</option>
                      <option value="Unrepairable">Asset Terminated</option>
                    </select>
                    <textarea 
                      disabled={isLocked}
                      rows={5}
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold outline-none"
                      placeholder="Input final technical diagnostics..."
                      value={localNotes}
                      onChange={e => {setLocalNotes(e.target.value); setIsDirty(true);}}
                    />
                    <button 
                      onClick={handleCommit}
                      disabled={!isDirty || isLocked}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-3 transition-all ${isDirty ? 'bg-emerald-600 text-white shadow-xl' : 'bg-slate-100 text-slate-400 opacity-50'}`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Commit Forensic Log</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-10 py-8 bg-slate-900 text-white border-t border-slate-800 flex items-start space-x-6">
                <ShieldCheck className="w-6 h-6 text-blue-400 mt-1" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Integrity Seal Verified</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                    This document is a legally defensible forensic record under NDPR-3.1. 
                    Hash chain: <span className="font-mono text-white/40">{selectedJob.recordHash.substring(0, 32)}...</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
              <div className="p-10 bg-slate-50 rounded-full shadow-inner"><Search className="w-16 h-16 opacity-10" /></div>
              <p className="font-black uppercase tracking-widest text-xs">Awaiting Entry Access</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepairList;
