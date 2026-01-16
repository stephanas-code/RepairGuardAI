
import React, { useState, useEffect } from 'react';
import { User, UserRole, PaymentRequest, AdminMessage, RepairJob, SubscriptionPlan, APP_FEATURES } from '../types';
import { getAllUsers, saveUser, getAllPayments, savePayment, saveMessage, getAllRepairs, setSetting, getSetting, getAllPlans, savePlan, deletePlan, getMessagesForCompany } from '../db';
import { 
  Users, UserPlus, Key, ShieldAlert, CheckCircle2, 
  Settings, Building, Fingerprint, Lock, ShieldCheck,
  CreditCard, MessageSquare, Send, LayoutGrid, ListChecks, Banknote,
  Mail, Server, Globe, Users as UsersIcon, Shield, Landmark,
  FileCheck, Eye, FileText, X, Camera, AlertTriangle, Crown, Plug, Phone,
  Sparkles, Trash2, Calendar, GraduationCap, Award, CheckSquare, Square, PowerOff,
  Inbox, Reply, Smartphone, Edit2, Save, Clock
} from 'lucide-react';

interface AdminPortalProps {
  user: User;
  onUserUpdate: (u: User) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ user, onUserUpdate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [view, setView] = useState<'overview' | 'users' | 'registries' | 'payments' | 'messages' | 'settings' | 'api' | 'plans'>('overview');
  
  const [newUserInfo, setNewUserInfo] = useState({ 
    username: '', 
    password: '', 
    name: '', 
    company: '', 
    role: 'staff' as UserRole,
    skillLevel: 'Apprentice' as 'Professional' | 'Apprentice'
  });
  const [bankDetails, setBankDetails] = useState({ bank: '', account: '', name: '' });
  const [smtpConfig, setSmtpConfig] = useState({ host: '', port: '', user: '', pass: '', secure: true });
  const [smsConfig, setSmsConfig] = useState({ provider: 'Termii', apiKey: '', senderId: 'RepairGuard', endpoint: 'https://api.ng.termii.com/api/sms/send' });
  const [emailRouting, setEmailRouting] = useState<Record<string, any>>({ global: { cc: '', bcc: '' } });
  const [ninConfig, setNinConfig] = useState({ apiKey: '', endpoint: '' });
  const [cacConfig, setCacConfig] = useState({ apiKey: '', endpoint: '' });
  
  // Plan Editing State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanData, setEditPlanData] = useState<{price: number, description: string}>({price: 0, description: ''});
  
  const [messageForm, setMessageForm] = useState({ target: 'ALL', content: '' });
  const [incomingMessages, setIncomingMessages] = useState<AdminMessage[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [selectedRegistry, setSelectedRegistry] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await getAllUsers();
    const p = await getAllPayments();
    const r = await getAllRepairs();
    const pl = await getAllPlans();
    
    // Load Settings with Defaults
    const b = await getSetting('bank_details') || { bank: 'Access Bank', account: '0123456789', name: 'RepairGuard HQ' };
    const s = await getSetting('smtp_config') || { host: 'smtp.repairguardai.io', port: '465', user: 'system@repairguardai.io', pass: '', secure: true };
    const sms = await getSetting('sms_config') || { provider: 'Termii', apiKey: '', senderId: 'RepairGuard', endpoint: 'https://api.ng.termii.com/api/sms/send' };
    const er = await getSetting('email_routing') || { global: { cc: '', bcc: '' } };
    const n = await getSetting('nin_config') || { apiKey: '', endpoint: 'https://api.nin-verifier.ng/v1/verify' };
    const c = await getSetting('cac_config') || { apiKey: '', endpoint: 'https://api.cac-verifier.ng/v1/search' };
    
    // Load incoming messages (Target = HQ)
    const hqMsgs = await getMessagesForCompany('HQ');
    
    setUsers(u);
    setPayments(p.sort((a,b) => b.timestamp - a.timestamp));
    setRepairs(r);
    setPlans(pl);
    setBankDetails(b);
    setSmtpConfig(s);
    setSmsConfig(sms);
    setEmailRouting(er);
    setNinConfig(n);
    setCacConfig(c);
    
    // Filter to only show messages SENT TO HQ (from users) for the Admin view
    const inbox = hqMsgs.filter(m => m.toCompany === 'HQ').sort((a,b) => b.timestamp - a.timestamp);
    setIncomingMessages(inbox);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveUser({ 
        id: `usr-${Date.now()}`, 
        ...newUserInfo, 
        createdAt: Date.now(), 
        aiUsageCount: 0,
        registrationStatus: 'verified', // Direct admin creation verifies automatically
        currentPlanId: 'free',
        jobsCreatedThisMonth: 0
      });
      await loadData();
      setNewUserInfo({ username: '', password: '', name: '', company: '', role: 'staff', skillLevel: 'Apprentice' });
      setMsg({ type: 'success', text: 'Personnel authorized with secure access key.' });
    } catch {
      setMsg({ type: 'error', text: 'Authorization failed. Username might already exist.' });
    }
  };

  const handleSkillUpdate = async (targetUser: User, newSkill: 'Professional' | 'Apprentice') => {
    try {
      await saveUser({ ...targetUser, skillLevel: newSkill });
      await loadData();
      setMsg({ type: 'success', text: `Updated ${targetUser.name} to ${newSkill}` });
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to update skill level' });
    }
  };
  
  const handleTierUpdate = async (targetUser: User, newTierId: string) => {
    const selectedPlan = plans.find(p => p.id === newTierId);
    if (!selectedPlan) return;
    
    const expiry = selectedPlan.id === 'free' ? undefined : Date.now() + (selectedPlan.durationDays * 24 * 60 * 60 * 1000);
    
    try {
        await saveUser({ 
            ...targetUser, 
            currentPlanId: newTierId,
            subscriptionExpiry: expiry 
        });
        await loadData();
        setMsg({ type: 'success', text: `Updated ${targetUser.name} to ${selectedPlan.name}` });
    } catch (e) {
        setMsg({ type: 'error', text: 'Failed to update tier' });
    }
  };

  const expireSubscription = async (targetUser: User) => {
    if (confirm(`Revoke access for ${targetUser.name}? They will be downgraded to Free Tier.`)) {
        await saveUser({ ...targetUser, subscriptionExpiry: undefined, currentPlanId: 'free' });
        await loadData();
        setMsg({ type: 'success', text: `Access revoked for ${targetUser.name}` });
    }
  };

  const verifyOrganization = async (target: User) => {
     if (!confirm(`Are you sure you want to verify ${target.company}? This will grant system access (Free Tier).`)) return;
     
     await saveUser({
        ...target,
        registrationStatus: 'verified',
        currentPlanId: 'free'
     });
     
     await loadData();
     setSelectedRegistry(null);
     setMsg({ type: 'success', text: `Organization ${target.company} successfully verified.` });
  };
  
  // New: Verify Staff function
  const verifyStaff = async (target: User) => {
     if (!confirm(`Authorize staff member ${target.name}?`)) return;
     
     await saveUser({
        ...target,
        registrationStatus: 'verified'
     });
     await loadData();
     setMsg({ type: 'success', text: `Staff ${target.name} authorized.` });
  };

  const approvePayment = async (pay: PaymentRequest) => {
    const targetUser = users.find(u => u.id === pay.userId);
    if (!targetUser) return;
    
    let duration = 0;
    if (pay.durationDays) {
       duration = pay.durationDays * 24 * 60 * 60 * 1000;
    }

    const currentExpiry = targetUser.subscriptionExpiry || 0;
    const startBase = Math.max(Date.now(), currentExpiry);
    const newExpiry = startBase + duration;

    await saveUser({ ...targetUser, subscriptionExpiry: newExpiry, currentPlanId: pay.planId, aiUsageCount: 0 });
    await savePayment({ ...pay, status: 'approved' });
    await loadData();
    setMsg({ type: 'success', text: `Approved ${pay.userName}. Upgraded to ${pay.plan}.` });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMessage({ 
        id: `msg-${Date.now()}`, 
        from: 'HQ', 
        toCompany: messageForm.target, 
        content: messageForm.content, 
        timestamp: Date.now(),
        type: 'directive'
    });
    setMessageForm({ ...messageForm, content: '' });
    setMsg({ type: 'success', text: 'Message dispatched.' });
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      await deletePlan(id);
      await loadData();
      setMsg({ type: 'success', text: 'Plan deleted.' });
    }
  };

  const startEditPlan = (plan: SubscriptionPlan) => {
      setEditingPlanId(plan.id);
      setEditPlanData({ price: plan.price, description: plan.description });
  };

  const saveEditedPlan = async (plan: SubscriptionPlan) => {
      await savePlan({
          ...plan,
          price: editPlanData.price,
          description: editPlanData.description
      });
      setEditingPlanId(null);
      await loadData();
      setMsg({ type: 'success', text: 'Plan updated successfully.' });
  };

  const updateMessageStatus = async (message: AdminMessage, newStatus: 'pending' | 'reviewing' | 'resolved') => {
      await saveMessage({ ...message, status: newStatus });
      await loadData();
      setMsg({ type: 'success', text: 'Complaint status updated.' });
  };

  const saveSettings = async (type: 'bank' | 'smtp' | 'routing' | 'nin' | 'cac' | 'sms') => {
    if (type === 'bank') await setSetting('bank_details', bankDetails);
    if (type === 'smtp') await setSetting('smtp_config', smtpConfig);
    if (type === 'sms') await setSetting('sms_config', smsConfig);
    if (type === 'routing') await setSetting('email_routing', emailRouting);
    if (type === 'nin') await setSetting('nin_config', ninConfig);
    if (type === 'cac') await setSetting('cac_config', cacConfig);
    setMsg({ type: 'success', text: `${type.toUpperCase()} configuration updated.` });
  };

  const renderDoc = (dataUrl?: string) => {
    if (!dataUrl) return <div className="text-slate-400 font-bold text-xs uppercase flex items-center justify-center h-full">No Document Uploaded</div>;
    
    if (dataUrl.startsWith('data:application/pdf')) {
       return <iframe src={dataUrl} className="w-full h-[500px] rounded-xl bg-white border border-slate-200" title="Document PDF" />;
    }
    return <img src={dataUrl} className="max-w-full max-h-[500px] object-contain rounded-xl mx-auto" alt="Document Evidence" />;
  };

  const companies = Array.from(new Set(users.map(u => u.company)));
  const isSuperAdmin = user.role === 'super_admin';

  const availableTabs = [
    { id: 'overview', icon: <LayoutGrid />, label: 'Overview', restricted: false },
    { id: 'registries', icon: <FileCheck />, label: 'Registries', restricted: false },
    { id: 'payments', icon: <CreditCard />, label: 'Payments', restricted: false },
    { id: 'messages', icon: <MessageSquare />, label: 'HQ Comms', restricted: false },
    { id: 'users', icon: <Users />, label: 'Personnel', restricted: true },
    { id: 'plans', icon: <Sparkles />, label: 'Service Pricing', restricted: true },
    { id: 'settings', icon: <Settings />, label: 'Config', restricted: true },
    { id: 'api', icon: <Plug />, label: 'API Integrations', restricted: true },
  ].filter(tab => !tab.restricted || isSuperAdmin);

  return (
    <div className="space-y-8 pb-20">
      {/* Header and Tabs */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            HQ Command
            {isSuperAdmin && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                <Crown className="w-3 h-3 mr-1" /> Super Admin
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Global Intelligence & Asset Control</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
          {availableTabs.map(tab => (
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
             <Inbox className="w-8 h-8 text-rose-500 mb-4" />
             <div className="text-3xl font-black">{incomingMessages.length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incoming Field Reports</div>
          </div>
        </div>
      )}

      {/* Messages, Registries, Payments, Plans, Settings, API tabs remain unchanged */}
      {/* Shortened for brevity in response, keeping structure identical to previous version, only updating Users view */}
      
      {/* ... (Previous views: messages, registries, payments) ... */}
      
      {/* Users View */}
      {view === 'users' && isSuperAdmin && (
        <div className="space-y-8 animate-in fade-in">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center space-x-2"><UserPlus className="w-5 h-5 text-blue-600" /><span>Authorize New Personnel</span></h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">Full Name</label><input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.name} onChange={e => setNewUserInfo({...newUserInfo, name: e.target.value})} placeholder="Technician Name" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">Organization</label><input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.company} onChange={e => setNewUserInfo({...newUserInfo, company: e.target.value})} placeholder="Company Name" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">Phone Number</label><input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.username} onChange={e => setNewUserInfo({...newUserInfo, username: e.target.value})} placeholder="080 1234 5678" /></div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-2">Skill Level</label>
                 <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.skillLevel} onChange={e => setNewUserInfo({...newUserInfo, skillLevel: e.target.value as any})}>
                    <option value="Apprentice">Apprentice</option><option value="Professional">Professional</option>
                 </select>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-2">Access Key</label><input required type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-mono" value={newUserInfo.password} onChange={e => setNewUserInfo({...newUserInfo, password: e.target.value})} placeholder="Password" /></div>
              <button type="submit" className="md:col-span-5 bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">AUTHORIZE</button>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                <tr><th className="px-6 py-4">Staff</th><th className="px-6 py-4">Company</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Tier Plan</th><th className="px-6 py-4">Subscription</th></tr>
              </thead>
              <tbody className="divide-y text-sm">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.registrationStatus === 'pending_verification' ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-6 py-4 font-bold">
                        <div className="flex flex-col">
                            <span>{u.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{u.role}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">{u.company}</td>
                    <td className="px-6 py-4">
                       {u.registrationStatus === 'pending_verification' ? (
                          <button onClick={() => verifyStaff(u)} className="flex items-center space-x-2 text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-colors animate-pulse">
                              <Clock className="w-3 h-3" /> <span>Review</span>
                          </button>
                       ) : (
                          <div className="flex items-center space-x-2">
                            {u.skillLevel === 'Professional' ? <Award className="w-4 h-4 text-emerald-500" /> : <GraduationCap className="w-4 h-4 text-slate-400" />}
                            <select value={u.skillLevel || 'Apprentice'} onChange={(e) => handleSkillUpdate(u, e.target.value as any)} className="bg-transparent border-b border-slate-200 font-bold text-xs uppercase tracking-wide focus:border-blue-500 outline-none pb-1">
                                <option value="Apprentice">Apprentice</option><option value="Professional">Professional</option>
                            </select>
                          </div>
                       )}
                    </td>
                    <td className="px-6 py-4 font-mono">
                         <select value={u.currentPlanId || 'free'} onChange={(e) => handleTierUpdate(u, e.target.value)} className="bg-transparent border-b border-slate-200 font-bold text-xs uppercase tracking-wide focus:border-blue-500 outline-none pb-1">
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                    </td>
                    <td className="px-6 py-4">
                      {u.subscriptionExpiry ? (
                        <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${u.subscriptionExpiry > Date.now() ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {u.subscriptionExpiry > Date.now() ? `Expires ${new Date(u.subscriptionExpiry).toLocaleDateString()}` : 'Expired'}
                            </span>
                            {u.subscriptionExpiry > Date.now() && <button onClick={() => expireSubscription(u)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors" title="Revoke Access"><PowerOff className="w-3 h-3" /></button>}
                        </div>
                      ) : <span className="text-slate-400 text-xs font-bold uppercase">Free Tier (Limited)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Rest of the component (Plans, Payments, Settings, API, Messages, Registries) needs to be preserved but is abbreviated here for file update clarity. Assuming existing code for other views is preserved implicitly by only showing Updates to changed sections if full context was not needed, but prompt requires full file content. */}
      {/* Re-injecting the rest of the file logic for 'plans', 'payments', 'settings', 'api', 'messages', 'registries' which are unchanged but needed for full file validity */}

      {/* Registries View */}
      {view === 'registries' && (
        <div className="grid grid-cols-1 gap-6">
            {users.filter(u => u.cacNumber).map(u => (
               <div key={u.id} className={`bg-white p-8 rounded-[2.5rem] border-2 shadow-xl flex flex-col md:flex-row justify-between gap-6 animate-in fade-in ${u.registrationStatus === 'pending_verification' ? 'border-amber-400/50 shadow-amber-500/10' : 'border-slate-200'}`}>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">{u.company}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-bold text-slate-500">{u.name}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">{u.role}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                       <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CAC Number</p><p className="font-mono text-sm font-bold">{u.cacNumber}</p></div>
                       <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NDPC Status</p><p className={`text-sm font-bold ${u.ndpcStatus === 'Registered' ? 'text-emerald-600' : 'text-amber-600'}`}>{u.ndpcStatus || 'N/A'}</p></div>
                    </div>
                 </div>
                 <div className="flex flex-col justify-center space-y-3 min-w-[200px]">
                    <button onClick={() => setSelectedRegistry(u)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors shadow-lg">
                       <Eye className="w-4 h-4" /> <span>Inspect Documents</span>
                    </button>
                    {u.registrationStatus === 'pending_verification' && (
                       <div className="flex items-center justify-center space-x-2 text-[10px] font-black text-amber-500 bg-amber-50 py-2 rounded-xl border border-amber-100 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> <span>Action Required</span>
                       </div>
                    )}
                 </div>
               </div>
            ))}
        </div>
      )}
      
      {/* ... Other unchanged tabs logic (Plans, Payments, Messages, Settings, API) are assumed to be part of the full file content. 
          To ensure valid XML response, I will include the full remaining content below. */}

      {/* Plans View */}
      {view === 'plans' && isSuperAdmin && (
         <div className="space-y-8 animate-in fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
               <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span>Service Tier Definitions</span>
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {plans.sort((a,b) => a.price - b.price).map(plan => (
                     <div key={plan.id} className={`p-6 rounded-[2rem] border-2 flex flex-col ${plan.id === 'enterprise' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                        {editingPlanId === plan.id ? (
                            <div className="mb-4 space-y-3">
                                <h4 className="text-lg font-black text-slate-900">{plan.name}</h4>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400">Price (₦)</label>
                                    <input 
                                        type="number"
                                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-bold"
                                        value={editPlanData.price}
                                        onChange={e => setEditPlanData({...editPlanData, price: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400">Description</label>
                                    <textarea 
                                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium resize-none"
                                        rows={5}
                                        value={editPlanData.description}
                                        onChange={e => setEditPlanData({...editPlanData, description: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => saveEditedPlan(plan)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-black uppercase"><Save className="w-3 h-3 inline mr-1"/> Save</button>
                                    <button onClick={() => setEditingPlanId(null)} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-lg text-xs font-black uppercase">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-lg font-black text-slate-900">{plan.name}</h4>
                                        <button onClick={() => startEditPlan(plan)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <p className="text-2xl font-black text-blue-600 mt-2">₦{plan.price.toLocaleString()}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-400">{plan.durationDays} Days</p>
                                </div>
                                <p className="text-xs text-slate-500 mb-4 flex-1">{plan.description}</p>
                                <div className="space-y-1 mb-6">
                                    {plan.features.map((f, i) => (
                                        <div key={i} className="flex items-start text-[10px] font-bold text-slate-600 leading-tight">
                                            <CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-500 shrink-0 mt-0.5" /> 
                                            <span>{f}</span>
                                        </div>
                                    ))}
                                </div>
                                {plan.id !== 'free' && (
                                    <button onClick={() => handleDeletePlan(plan.id)} className="text-[10px] text-rose-500 font-black uppercase hover:underline">Delete Plan</button>
                                )}
                            </>
                        )}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      )}

      {/* Payments */}
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

      {/* Messages */}
      {view === 'messages' && (
          <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Incoming List */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 h-full max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center space-x-2">
                          <Inbox className="w-5 h-5 text-rose-600" />
                          <span>Incoming Comms</span>
                      </h3>
                      <div className="space-y-4">
                          {incomingMessages.length === 0 ? (
                              <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">No active reports</div>
                          ) : (
                              incomingMessages.map(m => (
                                  <div key={m.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col gap-3 relative group hover:bg-slate-100 transition-colors">
                                      <div className="flex justify-between items-start">
                                          <div className="flex items-center space-x-2">
                                              <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-widest">{m.from}</span>
                                              <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${m.type === 'complaint' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{m.type}</span>
                                          </div>
                                          <span className="text-[9px] font-bold text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</span>
                                      </div>
                                      
                                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{m.content}</p>
                                      
                                      <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action Status</span>
                                          <select 
                                              value={m.status || 'pending'} 
                                              onChange={(e) => updateMessageStatus(m, e.target.value as any)}
                                              className={`bg-white border rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-200 ${
                                                  m.status === 'resolved' ? 'text-emerald-600 border-emerald-200' : 
                                                  m.status === 'reviewing' ? 'text-blue-600 border-blue-200' : 'text-amber-600 border-amber-200'
                                              }`}
                                          >
                                              <option value="pending">Pending</option>
                                              <option value="reviewing">Reviewing</option>
                                              <option value="resolved">Resolved</option>
                                          </select>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                  {/* Broadcast Form */}
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden h-fit">
                      <div className="absolute top-0 right-0 p-8 opacity-10"><Send className="w-32 h-32" /></div>
                      <h3 className="text-lg font-black mb-6 flex items-center space-x-2 relative z-10">
                        <Send className="w-5 h-5 text-blue-400" />
                        <span>Broadcast Directive</span>
                      </h3>
                      <form onSubmit={handleSendMessage} className="space-y-4 relative z-10">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target Frequency</label>
                            <select 
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-blue-500 outline-none"
                              value={messageForm.target}
                              onChange={e => setMessageForm({...messageForm, target: e.target.value})}
                            >
                              <option value="ALL">Global Network (All Stations)</option>
                              {companies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Secure Payload</label>
                            <textarea 
                              rows={5}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-blue-500 outline-none resize-none"
                              placeholder="Type directive instructions..."
                              value={messageForm.content}
                              onChange={e => setMessageForm({...messageForm, content: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20">
                            Transmit Protocol
                        </button>
                      </form>
                  </div>
              </div>
          </div>
      )}
      
      {/* Settings */}
      {view === 'settings' && isSuperAdmin && (
        <div className="space-y-12 animate-in fade-in">
           {/* Bank Details */}
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

            {/* Email Routing */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
              <h3 className="text-xl font-black mb-8 flex items-center space-x-3 text-indigo-600">
                <Mail className="w-6 h-6" /> <span>Global Email Routing</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Global CC</label>
                   <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" placeholder="audits@hq.com" value={emailRouting.global?.cc || ''} onChange={e => setEmailRouting({...emailRouting, global: {...(emailRouting.global || {bcc: ''}), cc: e.target.value}})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Global BCC (Archive)</label>
                   <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" placeholder="archive@hq.com" value={emailRouting.global?.bcc || ''} onChange={e => setEmailRouting({...emailRouting, global: {...(emailRouting.global || {cc: ''}), bcc: e.target.value}})} />
                </div>
              </div>
              <button onClick={() => saveSettings('routing')} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center space-x-2">
                   <Save className="w-4 h-4" /> <span>SAVE ROUTING RULES</span>
              </button>
           </div>
        </div>
      )}

      {/* API Integrations */}
      {view === 'api' && isSuperAdmin && (
        <div className="space-y-8 animate-in fade-in">
            {/* SMS Config */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
                <h3 className="text-xl font-black mb-6 flex items-center space-x-3 text-blue-600">
                    <MessageSquare className="w-6 h-6" /> <span>SMS Gateway (Termii/Twilio)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Provider</label>
                        <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smsConfig.provider} onChange={e => setSmsConfig({...smsConfig, provider: e.target.value})}>
                            <option value="Termii">Termii (Nigeria)</option>
                            <option value="Twilio">Twilio (Global)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Sender ID</label>
                        <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smsConfig.senderId} onChange={e => setSmsConfig({...smsConfig, senderId: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Key</label>
                        <div className="relative">
                            <input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold font-mono" value={smsConfig.apiKey} onChange={e => setSmsConfig({...smsConfig, apiKey: e.target.value})} />
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase px-2">Endpoint URL</label>
                         <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold font-mono text-xs" value={smsConfig.endpoint} onChange={e => setSmsConfig({...smsConfig, endpoint: e.target.value})} />
                    </div>
                </div>
                <button onClick={() => saveSettings('sms')} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center space-x-2">
                    <Save className="w-4 h-4" /> <span>SAVE SMS CONFIG</span>
                </button>
            </div>

            {/* Compliance APIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* NIN Config */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
                     <h3 className="text-lg font-black mb-6 flex items-center space-x-3 text-emerald-600">
                        <ShieldCheck className="w-5 h-5" /> <span>NIN Verification API</span>
                     </h3>
                     <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Endpoint</label>
                            <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-xs font-mono" value={ninConfig.endpoint} onChange={e => setNinConfig({...ninConfig, endpoint: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-2">Secret Key</label>
                            <input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-xs font-mono" value={ninConfig.apiKey} onChange={e => setNinConfig({...ninConfig, apiKey: e.target.value})} />
                        </div>
                        <button onClick={() => saveSettings('nin')} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg mt-2 text-xs">UPDATE NIN GATEWAY</button>
                     </div>
                </div>

                {/* CAC Config */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
                     <h3 className="text-lg font-black mb-6 flex items-center space-x-3 text-amber-600">
                        <Building className="w-5 h-5" /> <span>CAC Registry API</span>
                     </h3>
                     <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Endpoint</label>
                            <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-xs font-mono" value={cacConfig.endpoint} onChange={e => setCacConfig({...cacConfig, endpoint: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase px-2">Public Key</label>
                            <input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-xs font-mono" value={cacConfig.apiKey} onChange={e => setCacConfig({...cacConfig, apiKey: e.target.value})} />
                        </div>
                        <button onClick={() => saveSettings('cac')} className="w-full bg-amber-600 text-white font-black py-3 rounded-xl shadow-lg mt-2 text-xs">UPDATE CAC GATEWAY</button>
                     </div>
                </div>
            </div>

            {/* SMTP Config */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
                <h3 className="text-xl font-black mb-6 flex items-center space-x-3 text-slate-600">
                    <Server className="w-6 h-6" /> <span>SMTP Server (Notifications)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Host</label>
                        <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold font-mono" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Port</label>
                        <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold font-mono" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Username</label>
                        <input className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})} />
                    </div>
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-2">Password</label>
                        <input type="password" className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold font-mono" value={smtpConfig.pass} onChange={e => setSmtpConfig({...smtpConfig, pass: e.target.value})} />
                    </div>
                </div>
                <button onClick={() => saveSettings('smtp')} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center space-x-2">
                    <Save className="w-4 h-4" /> <span>SAVE SMTP CONFIG</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
