
import React, { useState, useEffect } from 'react';
import { User, UserRole, PaymentRequest, AdminMessage, RepairJob } from '../types';
import { getAllUsers, saveUser, getAllPayments, savePayment, saveMessage, getAllRepairs, setSetting, getSetting } from '../db';
import { 
  Users, UserPlus, Key, ShieldAlert, CheckCircle2, 
  Settings, Building, Fingerprint, Lock, ShieldCheck,
  CreditCard, MessageSquare, Send, LayoutGrid, ListChecks, Banknote,
  Mail, Server, Globe, Users as UsersIcon, Shield, Landmark
} from 'lucide-react';

interface AdminPortalProps {
  user: User;
  onUserUpdate: (u: User) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ user, onUserUpdate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [view, setView] = useState<'overview' | 'users' | 'payments' | 'messages' | 'settings'>('overview');
  
  const [newUserInfo, setNewUserInfo] = useState({ username: '', password: '', name: '', company: '', role: 'staff' as UserRole });
  const [bankDetails, setBankDetails] = useState({ bank: '', account: '', name: '' });
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '', user: '', pass: '', secure: true });
  const [emailRouting, setEmailRouting] = useState<Record<string, { cc: string, bcc: string }>>({});
  
  const [messageForm, setMessageForm] = useState({ target: 'ALL', content: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await getAllUsers();
    const p = await getAllPayments();
    const r = await getAllRepairs();
    const b = await getSetting('bank_details') || { bank: 'Access Bank', account: '0123456789', name: 'RepairGuard HQ' };
    const s = await getSetting('smtp_config') || { host: 'smtp.repairguardai.io', port: '465', user: 'system@repairguardai.io', pass: '', secure: true };
    const er = await getSetting('email_routing') || {};
    
    setUsers(u);
    setPayments(p.sort((a,b) => b.timestamp - a.timestamp));
    setRepairs(r);
    setBankDetails(b);
    setSmtpConfig(s);
    setEmailRouting(er);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveUser({ 
        id: `usr-${Date.now()}`, 
        ...newUserInfo, 
        createdAt: Date.now(), 
        aiUsageCount: 0 
      });
      await loadData();
      setNewUserInfo({ username: '', password: '', name: '', company: '', role: 'staff' });
      setMsg({ type: 'success', text: 'Personnel authorized with secure access key.' });
    } catch {
      setMsg({ type: 'error', text: 'Authorization failed. Username might already exist.' });
    }
  };

  const approvePayment = async (pay: PaymentRequest) => {
    const targetUser = users.find(u => u.id === pay.userId);
    if (!targetUser) return;
    
    let duration = 7 * 24 * 60 * 60 * 1000;
    if (pay.plan === '2 Weeks') duration = 14 * 24 * 60 * 60 * 1000;
    if (pay.plan === '1 Month') duration = 30 * 24 * 60 * 60 * 1000;

    const newExpiry = Math.max(Date.now(), targetUser.subscriptionExpiry || 0) + duration;
    await saveUser({ ...targetUser, subscriptionExpiry: newExpiry, aiUsageCount: 0 });
    await savePayment({ ...pay, status: 'approved' });
    await loadData();
    setMsg({ type: 'success', text: `Approved ${pay.userName}. AI access granted.` });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMessage({ id: `msg-${Date.now()}`, from: 'HQ', toCompany: messageForm.target, content: messageForm.content, timestamp: Date.now() });
    setMessageForm({ ...messageForm, content: '' });
    setMsg({ type: 'success', text: 'Message dispatched.' });
  };

  const saveSettings = async (type: 'bank' | 'smtp' | 'routing') => {
    if (type === 'bank') await setSetting('bank_details', bankDetails);
    if (type === 'smtp') await setSetting('smtp_config', smtpConfig);
    if (type === 'routing') await setSetting('email_routing', emailRouting);
    setMsg({ type: 'success', text: `${type.toUpperCase()} configuration updated.` });
  };

  const companies = Array.from(new Set(users.map(u => u.company)));

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">HQ Command</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Global Intelligence & Asset Control</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { id: 'overview', icon: <LayoutGrid />, label: 'Overview' },
            { id: 'users', icon: <Users />, label: 'Personnel' },
            { id: 'payments', icon: <CreditCard />, label: 'Payments' },
            { id: 'messages', icon: <MessageSquare />, label: 'HQ Comms' },
            { id: 'settings', icon: <Settings />, label: 'Config' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${view === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {React.cloneElement(tab.icon as any, { className: 'w-4 h-4' })}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {msg && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold border animate-in fade-in slide-in-from-top-4 ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          <p>{msg.text}</p>
        </div>
      )}

      {view === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl">
             <Building className="w-8 h-8 text-blue-500 mb-4" />
             <div className="text-3xl font-black">{companies.length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Organizations</div>
          </div>
          <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl">
             <Users className="w-8 h-8 text-indigo-500 mb-4" />
             <div className="text-3xl font-black">{users.length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Personnel</div>
          </div>
          <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl">
             <CreditCard className="w-8 h-8 text-emerald-500 mb-4" />
             <div className="text-3xl font-black">{payments.filter(p => p.status === 'pending').length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</div>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* SMTP Config */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
              <h3 className="text-xl font-black mb-8 flex items-center space-x-3 text-blue-600">
                <Server className="w-6 h-6" /> <span>Master SMTP Gateway</span>
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Host Address</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} placeholder="smtp.repairguardai.io" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2">Port</label>
                    <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} placeholder="465" />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={smtpConfig.secure} onChange={e => setSmtpConfig({...smtpConfig, secure: e.target.checked})} className="rounded text-blue-600" />
                      <span className="text-xs font-black uppercase text-slate-500">Secure (SSL/TLS)</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Master User</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})} placeholder="auth@domain.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Master Pass</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smtpConfig.pass} onChange={e => setSmtpConfig({...smtpConfig, pass: e.target.value})} />
                </div>
                <button onClick={() => saveSettings('smtp')} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg mt-4 flex items-center justify-center space-x-2">
                   <ShieldCheck className="w-4 h-4" /> <span>SAVE GATEWAY CONFIG</span>
                </button>
              </div>
            </div>

            {/* Bank Config */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
              <h3 className="text-xl font-black mb-8 flex items-center space-x-3 text-emerald-600">
                <Landmark className="w-6 h-6" /> <span>HQ Bank Registry</span>
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Bank Name</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={bankDetails.bank} onChange={e => setBankDetails({...bankDetails, bank: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Account Number</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold font-mono" value={bankDetails.account} onChange={e => setBankDetails({...bankDetails, account: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Account Name</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={bankDetails.name} onChange={e => setBankDetails({...bankDetails, name: e.target.value})} />
                </div>
                <button onClick={() => saveSettings('bank')} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg mt-4 flex items-center justify-center space-x-2">
                   <CheckCircle2 className="w-4 h-4" /> <span>SAVE BANK DETAILS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Email Routing Table */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
            <h3 className="text-xl font-black mb-2 flex items-center space-x-3 text-slate-800">
              <Globe className="w-6 h-6" /> <span>Corporate Email Routing (CC/BCC)</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest">Map forensic compliance reporting per organization</p>
            
            <div className="space-y-4">
               {companies.map(orgName => {
                 const org = orgName as string;
                 const slug = org.toLowerCase().replace(/\s+/g, '');
                 const routing = emailRouting[org] || { cc: '', bcc: '' };
                 return (
                   <div key={org} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                     <div>
                       <p className="font-black text-slate-900">{org}</p>
                       <p className="text-[10px] font-mono text-blue-600 font-black">{slug}@repairguardai.io</p>
                     </div>
                     <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase px-2 tracking-widest">Internal CC (Admin)</label>
                       <input 
                         className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold" 
                         value={routing.cc} 
                         placeholder="admin@branch.com"
                         onChange={e => setEmailRouting({...emailRouting, [org]: { ...routing, cc: e.target.value }})}
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase px-2 tracking-widest">Forensic BCC (Auditor)</label>
                       <input 
                         className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold" 
                         value={routing.bcc} 
                         placeholder="archive@repairguardai.io"
                         onChange={e => setEmailRouting({...emailRouting, [org]: { ...routing, bcc: e.target.value }})}
                       />
                     </div>
                   </div>
                 );
               })}
               {companies.length === 0 && <p className="text-center py-10 text-slate-300 font-black uppercase text-xs">No active organizations recorded</p>}
               
               <button onClick={() => saveSettings('routing')} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl mt-6 flex items-center justify-center space-x-3">
                 <Shield className="w-5 h-5" />
                 <span>SEAL ROUTING TABLE</span>
               </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Existing views (users, payments, messages) remain as is... */}
      {view === 'users' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>Authorize New Personnel</span>
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Full Name</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.name} onChange={e => setNewUserInfo({...newUserInfo, name: e.target.value})} placeholder="Technician Name" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Organization</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.company} onChange={e => setNewUserInfo({...newUserInfo, company: e.target.value})} placeholder="Company Name" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Login ID</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.username} onChange={e => setNewUserInfo({...newUserInfo, username: e.target.value})} placeholder="Unique ID" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Access Key</label>
                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-mono" value={newUserInfo.password} onChange={e => setNewUserInfo({...newUserInfo, password: e.target.value})} placeholder="Password" />
              </div>
              <button type="submit" className="bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">AUTHORIZE</button>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                <tr><th className="px-6 py-4">Staff</th><th className="px-6 py-4">Company</th><th className="px-6 py-4">AI Usage</th><th className="px-6 py-4">Subscription</th></tr>
              </thead>
              <tbody className="divide-y text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold">{u.name}</td>
                    <td className="px-6 py-4">{u.company}</td>
                    <td className="px-6 py-4 font-mono">{u.aiUsageCount}/10 Free</td>
                    <td className="px-6 py-4">
                      {u.subscriptionExpiry ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-black ${u.subscriptionExpiry > Date.now() ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {u.subscriptionExpiry > Date.now() ? `Expires ${new Date(u.subscriptionExpiry).toLocaleDateString()}` : 'Expired'}
                        </span>
                      ) : <span className="text-slate-400 italic">No Active Plan</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'payments' && (
        <div className="grid grid-cols-1 gap-6">
          {payments.filter(p => p.status === 'pending').map(pay => (
            <div key={pay.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="p-4 bg-emerald-50 rounded-2xl"><Banknote className="w-8 h-8 text-emerald-600" /></div>
                <div>
                  <p className="text-xl font-black">₦{pay.amount.toLocaleString()} - {pay.plan}</p>
                  <p className="text-xs text-slate-500 font-bold">{pay.userName} • {pay.company}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">{new Date(pay.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => approvePayment(pay)} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">APPROVE ACCESS</button>
                <button className="px-8 py-3 bg-rose-50 text-rose-600 font-black rounded-xl">REJECT</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'messages' && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
           <h3 className="text-xl font-black mb-6 flex items-center space-x-3 text-slate-800">
             <MessageSquare className="w-6 h-6 text-blue-600" />
             <span>HQ Broadcast Center</span>
           </h3>
           <form onSubmit={handleSendMessage} className="space-y-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recipient Target</label>
               <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={messageForm.target} onChange={e => setMessageForm({...messageForm, target: e.target.value})}>
                 <option value="ALL">ALL ORGANIZATIONS (Global Broadcast)</option>
                 {companies.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Directive Content</label>
               <textarea required rows={5} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={messageForm.content} onChange={e => setMessageForm({...messageForm, content: e.target.value})} placeholder="Enter command or information for organizations..." />
             </div>
             <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl flex items-center justify-center space-x-3">
               <Send className="w-5 h-5" />
               <span>DISPATCH HQ DIRECTIVE</span>
             </button>
           </form>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
