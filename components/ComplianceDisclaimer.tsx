
import React from 'react';
import { Shield, Scale, FileText, Lock, AlertTriangle, CheckCircle2, FileCheck, Gavel, UserX } from 'lucide-react';

const ComplianceDisclaimer = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <header>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Scale className="w-8 h-8 text-slate-900" />
                <span>Legal & Compliance</span>
            </h2>
            <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Regulatory Standards & Liability</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Main Disclaimer Card */}
            <div className="lg:col-span-2 bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Shield className="w-64 h-64" /></div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-3 bg-amber-500 rounded-xl text-slate-900 shadow-lg">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Operational Disclaimer</h3>
                    </div>
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                        RepairGuard AI is a <strong>Data Processor</strong> providing forensic logging and workshop management infrastructure. 
                        The Organization/Workshop using this software acts as the <strong>Data Controller</strong> under the Nigeria Data Protection Act (NDPA) 2023 and NDPR 2019.
                    </p>
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-xs font-bold leading-relaxed opacity-90">
                            It is the sole responsibility of the Workshop to ensure that:
                        </p>
                        <ul className="list-disc pl-5 mt-3 space-y-2 text-xs font-medium opacity-80">
                            <li>Explicit consent is obtained from device owners before data entry.</li>
                            <li>Biometric data (facial capture) is collected lawfully with user awareness.</li>
                            <li>Physical assets are handled according to consumer protection laws (FCCPC).</li>
                            <li>Data retention policies align with local regulations.</li>
                        </ul>
                    </div>
                    <div className="pt-6 border-t border-white/10 text-[10px] font-mono uppercase tracking-widest opacity-60 flex justify-between">
                        <span>Ref: RG-LEGAL-001</span>
                        <span>v2.4.0 (Compliance Build)</span>
                    </div>
                </div>
            </div>

            {/* Anti-Theft Protection */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                <div className="flex items-center space-x-3 mb-6 text-amber-600">
                    <Gavel className="w-6 h-6" />
                    <h3 className="font-black text-lg uppercase tracking-tight">Anti-Theft Defense</h3>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                    The platform provides technicians with a <strong>Legal Shield</strong> against stolen asset claims:
                </p>
                <div className="space-y-4">
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                      <UserX className="w-5 h-5 text-rose-500 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                        By forcing clients to sign the "Ownership Declaration," the system establishes that the technician relies purely on client claims. This mitigates charges of "co-authorship" in theft cases.
                      </p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                      <Scale className="w-5 h-5 text-blue-500 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                        In the event of police interrogation, the <strong>Justice Mode Bundle</strong> provides timestamped, biometric, and signed proof that the technician's involvement was strictly for a specific repair service.
                      </p>
                   </div>
                </div>
            </div>

            {/* Forensic Integrity */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                <div className="flex items-center space-x-3 mb-6 text-blue-600">
                    <Lock className="w-6 h-6" />
                    <h3 className="font-black text-lg uppercase tracking-tight">Forensic Integrity</h3>
                </div>
                <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">
                    RepairGuard AI generates a <strong>Non-Repudiation Chain</strong> for every repair job, making records legally defensible:
                </p>
                <div className="space-y-4">
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Hash Chaining Protocol</p>
                        <p className="text-xs font-mono font-black text-slate-800">Current_Hash = SHA256(Data + Previous_Hash)</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                        The ownership declaration is part of the hash. If a client attempts to change their claim later (e.g., denying they said the device worked), the hash will break, proving record manipulation.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ComplianceDisclaimer;
