
import React, { useState, useEffect } from 'react';
import { User, UserRole, PaymentRequest, AdminMessage, RepairJob, SubscriptionPlan, APP_FEATURES } from '../types';
import { getAllUsers, saveUser, getAllPayments, savePayment, saveMessage, getAllRepairs, setSetting, getSetting, getAllPlans, savePlan, deletePlan } from '../db';
import { 
  Users, UserPlus, Key, ShieldAlert, CheckCircle2, 
  Settings, Building, Fingerprint, Lock, ShieldCheck,
  CreditCard, MessageSquare, Send, LayoutGrid, ListChecks, Banknote,
  Mail, Server, Globe, Users as UsersIcon, Shield, Landmark,
  FileCheck, Eye, FileText, X, Camera, AlertTriangle, Crown, Plug, Phone,
  Sparkles, Trash2, Calendar, GraduationCap, Award, CheckSquare, Square, PowerOff
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
  const [emailRouting, setEmailRouting] = useState<Record<string, { cc: string, bcc: string }>>({});
  const [ninConfig, setNinConfig] = useState({ apiKey: '', endpoint: '' });
  const [cacConfig, setCacConfig] = useState({ apiKey: '', endpoint: '' });
  
  // Plan Form State
  const [newPlan, setNewPlan] = useState({ name: '', price: '', duration: '', description: '' });
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  const [messageForm, setMessageForm] = useState({ target: 'ALL', content: '' });
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
    const b = await getSetting('bank_details') || { bank: 'Access Bank', account: '0123456789', name: 'RepairGuard HQ' };
    const s = await getSetting('smtp_config') || { host: 'smtp.repairguardai.io', port: '465', user: 'system@repairguardai.io', pass: '', secure: true };
    const er = await getSetting('email_routing') || {};
    const n = await getSetting('nin_config') || { apiKey: '', endpoint: 'https://api.nin-verifier.ng/v1/verify' };
    const c = await getSetting('cac_config') || { apiKey: '', endpoint: 'https://api.cac-verifier.ng/v1/search' };
    
    setUsers(u);
    setPayments(p.sort((a,b) => b.timestamp - a.timestamp));
    setRepairs(r);
    setPlans(pl);
    setBankDetails(b);
    setSmtpConfig(s);
    setEmailRouting(er);
    setNinConfig(n);
    setCacConfig(c);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveUser({ 
        id: `usr-${Date.now()}`, 
        ...newUserInfo, 
        createdAt: Date.now(), 
        aiUsageCount: 0,
        registrationStatus: 'verified' // Direct admin creation verifies automatically
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

  const expireSubscription = async (targetUser: User) => {
    if (confirm(`Revoke access for ${targetUser.name}? They will be locked out immediately.`)) {
        // Set expiry to 1 second in the past
        await saveUser({ ...targetUser, subscriptionExpiry: Date.now() - 1000 });
        await loadData();
        setMsg({ type: 'success', text: `Access revoked for ${targetUser.name}` });
    }
  };

  const toggleFeature = (feature: string) => {
    const updated = selectedFeatures.includes(feature)
      ? selectedFeatures.filter(f => f !== feature)
      : [...selectedFeatures, feature];
    setSelectedFeatures(updated);
    // Auto-update description based on features
    setNewPlan(prev => ({ ...prev, description: updated.join(', ') }));
  };

  const toggleAllFeatures = () => {
    if (selectedFeatures.length === APP_FEATURES.length) {
      setSelectedFeatures([]);
      setNewPlan(prev => ({ ...prev, description: '' }));
    } else {
      setSelectedFeatures([...APP_FEATURES]);
      setNewPlan(prev => ({ ...prev, description: APP_FEATURES.join(', ') }));
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.price || !newPlan.duration) return;
    
    const plan: SubscriptionPlan = {
      id: `plan-${Date.now()}`,
      name: newPlan.name,
      price: parseFloat(newPlan.price),
      durationDays: parseInt(newPlan.duration),
      description: newPlan.description,
      features: selectedFeatures,
      isActive: true
    };
    
    await savePlan(plan);
    await loadData();
    setNewPlan({ name: '', price: '', duration: '', description: '' });
    setSelectedFeatures([]);
    setMsg({ type: 'success', text: 'New service plan activated.' });
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm("Are you sure? Users won't be able to select this plan anymore.")) {
      await deletePlan(id);
      await loadData();
    }
  };

  const verifyOrganization = async (target: User) => {
     if (!confirm(`Are you sure you want to verify ${target.company}? This will grant full system access.`)) return;
     
     await saveUser({
        ...target,
        registrationStatus: 'verified'
     });
     
     await loadData();
     setSelectedRegistry(null);
     setMsg({ type: 'success', text: `Organization ${target.company} successfully verified.` });
  };

  const approvePayment = async (pay: PaymentRequest) => {
    const targetUser = users.find(u => u.id === pay.userId);
    if (!targetUser) return;
    
    // Dynamic duration based on plan or fallback to name-based logic for legacy
    let duration = 0;
    if (pay.durationDays) {
       duration = pay.durationDays * 24 * 60 * 60 * 1000;
    } else {
       // Legacy fallback
       if (pay.plan === '2 Weeks') duration = 14 * 24 * 60 * 60 * 1000;
       if (pay.plan === '1 Month') duration = 30 * 24 * 60 * 60 * 1000;
    }

    // Extend current expiry or start from now
    const currentExpiry = targetUser.subscriptionExpiry || 0;
    // If expired, start from now. If active, add to current expiry.
    const startBase = Math.max(Date.now(), currentExpiry);
    const newExpiry = startBase + duration;

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

  const saveSettings = async (type: 'bank' | 'smtp' | 'routing' | 'nin' | 'cac') => {
    if (type === 'bank') await setSetting('bank_details', bankDetails);
    if (type === 'smtp') await setSetting('smtp_config', smtpConfig);
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

  // Role-Based Tab Definition
  const availableTabs = [
    { id: 'overview', icon: <LayoutGrid />, label: 'Overview', restricted: false },
    { id: 'registries', icon: <FileCheck />, label: 'Registries', restricted: false },
    { id: 'payments', icon: <CreditCard />, label: 'Payments', restricted: false },
    { id: 'messages', icon: <MessageSquare />, label: 'HQ Comms', restricted: false },
    // Restricted Tabs
    { id: 'users', icon: <Users />, label: 'Personnel', restricted: true },
    { id: 'plans', icon: <Sparkles />, label: 'Service Pricing', restricted: true },
    { id: 'settings', icon: <Settings />, label: 'Config', restricted: true },
    { id: 'api', icon: <Plug />, label: 'API Integrations', restricted: true },
  ].filter(tab => !tab.restricted || isSuperAdmin);

  return (
    <div className="space-y-8 pb-20">
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
             <CreditCard className="w-8 h-8 text-emerald-500 mb-4" />
             <div className="text-3xl font-black">{payments.filter(p => p.status === 'pending').length}</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</div>
          </div>
        </div>
      )}

      {/* Plans Management Tab */}
      {view === 'plans' && isSuperAdmin && (
         <div className="space-y-8 animate-in fade-in">
           {/* Plan Creation */}
           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
             <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center space-x-2">
               <Sparkles className="w-5 h-5 text-blue-600" />
               <span>Define Service Plan</span>
             </h3>
             <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-2">Plan Name</label>
                 <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} placeholder="e.g. Gold Forensic" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-2">Price (NGN)</label>
                 <input required type="number" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} placeholder="25000" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-2">Duration (Days)</label>
                 <input required type="number" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: e.target.value})} placeholder="30" />
               </div>
               
               {/* Feature Selector */}
               <div className="md:col-span-4 space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2">Included Features</label>
                    <button type="button" onClick={toggleAllFeatures} className="text-xs font-bold text-blue-600 hover:underline">
                      {selectedFeatures.length === APP_FEATURES.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {APP_FEATURES.map(feature => (
                      <button 
                        key={feature}
                        type="button"
                        onClick={() => toggleFeature(feature)}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${selectedFeatures.includes(feature) ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                      >
                         {selectedFeatures.includes(feature) ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                         <span className="truncate">{feature}</span>
                      </button>
                    ))}
                  </div>
               </div>

               <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2">Generated Description</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" 
                    value={newPlan.description} 
                    onChange={e => setNewPlan({...newPlan, description: e.target.value})} 
                    placeholder="Plan features will appear here..." 
                    rows={3}
                  />
               </div>

               <button type="submit" className="md:col-span-4 bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2">
                 <CheckCircle2 className="w-4 h-4" /> <span>ACTIVATE PLAN</span>
               </button>
             </form>
           </div>

           {/* Plan List */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(plan => (
                 <div key={plan.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-lg relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 scale-150 group-hover:scale-125 transition-transform"><Sparkles className="w-24 h-24" /></div>
                    
                    <div className="relative z-10">
                       <h4 className="text-xl font-black text-slate-900">{plan.name}</h4>
                       <p className="text-3xl font-black text-blue-600 mt-2 mb-1">₦{plan.price.toLocaleString()}</p>
                       <div className="flex items-center space-x-1 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
                          <Calendar className="w-3 h-3" /> <span>{plan.durationDays} Days Access</span>
                       </div>
                       
                       <div className="bg-slate-50 p-4 rounded-2xl mb-6 min-h-[100px]">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Enabled Modules</p>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{plan.description}</p>
                       </div>
                       
                       <button onClick={() => handleDeletePlan(plan.id)} className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center space-x-2">
                          <Trash2 className="w-4 h-4" /> <span>DEACTIVATE</span>
                       </button>
                    </div>
                 </div>
              ))}
              {plans.length === 0 && (
                <div className="col-span-1 md:col-span-3 py-20 text-center text-slate-300">
                   <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                   <p className="font-black uppercase tracking-widest text-xs">No Pricing Plans Configured</p>
                </div>
              )}
           </div>
         </div>
      )}

      {/* Other views remain unchanged */}
      {view === 'registries' && (
        <>
          <div className="grid grid-cols-1 gap-6">
            {users.filter(u => u.cacNumber).map(u => (
               <div key={u.id} className={`bg-white p-8 rounded-[2.5rem] border-2 shadow-xl flex flex-col md:flex-row justify-between gap-6 animate-in fade-in slide-in-from-bottom-2 ${u.registrationStatus === 'pending_verification' ? 'border-amber-400/50 shadow-amber-500/10' : 'border-slate-200'}`}>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">{u.company}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-bold text-slate-500">{u.name}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">{u.role}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                       <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CAC Number</p>
                         <p className="font-mono text-sm font-bold">{u.cacNumber}</p>
                       </div>
                       <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NDPC Status</p>
                         <p className={`text-sm font-bold ${u.ndpcStatus === 'Registered' ? 'text-emerald-600' : 'text-amber-600'}`}>{u.ndpcStatus || 'N/A'}</p>
                       </div>
                       <div className="col-span-2">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                         <p className="text-sm font-bold truncate">{u.businessAddress}</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col justify-center space-y-3 min-w-[200px]">
                    <button onClick={() => setSelectedRegistry(u)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors shadow-lg">
                       <Eye className="w-4 h-4" /> <span>Inspect Documents</span>
                    </button>
                    {u.registrationStatus === 'pending_verification' ? (
                       <div className="flex items-center justify-center space-x-2 text-[10px] font-black text-amber-500 bg-amber-50 py-2 rounded-xl border border-amber-100 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Action Required</span>
                       </div>
                    ) : (
                       <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-emerald-500">
                          <ShieldCheck className="w-3 h-3" />
                          <span>System Verified</span>
                       </div>
                    )}
                 </div>
               </div>
            ))}
            {users.filter(u => u.cacNumber).length === 0 && (
               <div className="p-20 text-center text-slate-300">
                  <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-xs">No registered entities found</p>
               </div>
            )}
          </div>

          {/* Document Inspector Modal */}
          {selectedRegistry && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
               <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] p-8 shadow-2xl overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                     <div>
                       <h3 className="text-2xl font-black text-slate-900">Compliance Audit</h3>
                       <p className="text-sm font-bold text-slate-500">{selectedRegistry.company} • {selectedRegistry.cacNumber}</p>
                     </div>
                     <button onClick={() => setSelectedRegistry(null)} className="p-3 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                     </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 p-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* CAC Document */}
                       <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-blue-600">
                             <FileText className="w-5 h-5" />
                             <span className="font-black uppercase tracking-widest text-xs">Certificate of Incorporation</span>
                          </div>
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 min-h-[200px] flex items-center justify-center relative group">
                             {renderDoc(selectedRegistry.cacDocument)}
                          </div>
                       </div>

                       {/* NDPC Document */}
                       <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-emerald-600">
                             <ShieldCheck className="w-5 h-5" />
                             <span className="font-black uppercase tracking-widest text-xs">NDPC Audit Report</span>
                          </div>
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 min-h-[200px] flex items-center justify-center relative group">
                             {renderDoc(selectedRegistry.ndpcDocument)}
                          </div>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                       {/* Government ID */}
                       <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-indigo-600">
                             <CreditCard className="w-5 h-5" />
                             <span className="font-black uppercase tracking-widest text-xs">Government ID</span>
                          </div>
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 min-h-[200px] flex items-center justify-center relative group">
                             {renderDoc(selectedRegistry.governmentId)}
                          </div>
                       </div>

                       {/* Biometric Selfie */}
                       <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-purple-600">
                             <Camera className="w-5 h-5" />
                             <span className="font-black uppercase tracking-widest text-xs">Biometric Selfie</span>
                          </div>
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 min-h-[200px] flex items-center justify-center relative group">
                             {renderDoc(selectedRegistry.biometricSelfie)}
                          </div>
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Data Protection Officer</p>
                          <p className="font-bold">{selectedRegistry.dpoName || 'Not Assigned'}</p>
                          <p className="text-xs text-blue-600">{selectedRegistry.dpoEmail}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase">NDPC Reference ID</p>
                           <p className="font-mono font-bold">{selectedRegistry.ndpcReference || 'Pending'}</p>
                        </div>
                     </div>
                  </div>

                  {/* Verification Action Bar */}
                  {selectedRegistry.registrationStatus !== 'verified' && (
                     <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end space-x-4 shrink-0">
                        <button onClick={() => setSelectedRegistry(null)} className="px-8 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 uppercase text-xs tracking-widest hover:bg-slate-200">
                           Cancel Review
                        </button>
                        <button onClick={() => verifyOrganization(selectedRegistry)} className="px-8 py-4 rounded-2xl font-black text-white bg-emerald-600 uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 flex items-center space-x-2">
                           <ShieldCheck className="w-5 h-5" />
                           <span>VERIFY & APPROVE ORGANIZATION</span>
                        </button>
                     </div>
                  )}
               </div>
            </div>
          )}
        </>
      )}

      {/* User Management Tab */}
      {view === 'users' && isSuperAdmin && (
        <div className="space-y-8 animate-in fade-in">
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
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Phone Number</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.username} onChange={e => setNewUserInfo({...newUserInfo, username: e.target.value})} placeholder="080 1234 5678" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-2">Skill Level</label>
                 <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={newUserInfo.skillLevel} onChange={e => setNewUserInfo({...newUserInfo, skillLevel: e.target.value as any})}>
                    <option value="Apprentice">Apprentice</option>
                    <option value="Professional">Professional</option>
                 </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Access Key</label>
                <input required type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-mono" value={newUserInfo.password} onChange={e => setNewUserInfo({...newUserInfo, password: e.target.value})} placeholder="Password" />
              </div>
              <button type="submit" className="md:col-span-5 bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">AUTHORIZE</button>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                <tr>
                   <th className="px-6 py-4">Staff</th>
                   <th className="px-6 py-4">Company</th>
                   <th className="px-6 py-4">Skill Designation</th>
                   <th className="px-6 py-4">AI Usage</th>
                   <th className="px-6 py-4">Subscription</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold">{u.name}</td>
                    <td className="px-6 py-4">{u.company}</td>
                    <td className="px-6 py-4">
                       <div className="flex items-center space-x-2">
                          {u.skillLevel === 'Professional' ? (
                             <Award className="w-4 h-4 text-emerald-500" />
                          ) : (
                             <GraduationCap className="w-4 h-4 text-slate-400" />
                          )}
                          <select 
                            value={u.skillLevel || 'Apprentice'} 
                            onChange={(e) => handleSkillUpdate(u, e.target.value as any)}
                            className="bg-transparent border-b border-slate-200 font-bold text-xs uppercase tracking-wide focus:border-blue-500 outline-none pb-1"
                          >
                             <option value="Apprentice">Apprentice</option>
                             <option value="Professional">Professional</option>
                          </select>
                       </div>
                    </td>
                    <td className="px-6 py-4 font-mono">{u.aiUsageCount}/10 Free</td>
                    <td className="px-6 py-4">
                      {u.subscriptionExpiry ? (
                        <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${u.subscriptionExpiry > Date.now() ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {u.subscriptionExpiry > Date.now() ? `Expires ${new Date(u.subscriptionExpiry).toLocaleDateString()}` : 'Expired'}
                            </span>
                            {u.subscriptionExpiry > Date.now() && (
                                <button onClick={() => expireSubscription(u)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors" title="Revoke Access">
                                    <PowerOff className="w-3 h-3" />
                                </button>
                            )}
                        </div>
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
          {payments.filter(p => p.status === 'pending').length === 0 && (
            <div className="py-20 text-center text-slate-300">
                <Banknote className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">No pending payment approvals</p>
            </div>
          )}
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

      {view === 'api' && isSuperAdmin && (
        <div className="space-y-12 animate-in fade-in">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
             <h3 className="text-xl font-black mb-8 flex items-center space-x-3 text-indigo-600">
               <Plug className="w-6 h-6" /> <span>External API Gateways</span>
             </h3>
             <div className="space-y-8">
               {/* NIN Section */}
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <h4 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>National Identity (NIN) Verifier</span>
                 </h4>
                 <div className="space-y-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Endpoint URL</label>
                     <input className="w-full px-4 py-3 bg-white border rounded-xl font-bold" value={ninConfig.endpoint} onChange={e => setNinConfig({...ninConfig, endpoint: e.target.value})} placeholder="https://api.nin-verifier.ng/v1/verify" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Secret Key</label>
                     <input type="password" className="w-full px-4 py-3 bg-white border rounded-xl font-bold font-mono" value={ninConfig.apiKey} onChange={e => setNinConfig({...ninConfig, apiKey: e.target.value})} placeholder="sk_live_..." />
                   </div>
                   <button onClick={() => saveSettings('nin')} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg mt-2 flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> <span>SAVE NIN CONFIGURATION</span>
                   </button>
                 </div>
               </div>

               {/* CAC Section */}
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <h4 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center space-x-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span>CAC Business Verification</span>
                 </h4>
                 <div className="space-y-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Endpoint URL</label>
                     <input className="w-full px-4 py-3 bg-white border rounded-xl font-bold" value={cacConfig.endpoint} onChange={e => setCacConfig({...cacConfig, endpoint: e.target.value})} placeholder="https://api.cac-verifier.ng/v1/search" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase px-2">API Secret Key</label>
                     <input type="password" className="w-full px-4 py-3 bg-white border rounded-xl font-bold font-mono" value={cacConfig.apiKey} onChange={e => setCacConfig({...cacConfig, apiKey: e.target.value})} placeholder="sk_live_..." />
                   </div>
                   <button onClick={() => saveSettings('cac')} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg mt-2 flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> <span>SAVE CAC CONFIGURATION</span>
                   </button>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}

      {view === 'settings' && isSuperAdmin && (
        <div className="space-y-12 animate-in fade-in">
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
    </div>
  );
};

export default AdminPortal;
