
import React, { useState, useEffect, useCallback } from 'react';
import { RepairJob, SyncStats, User, DraftRepair } from './types';
import { getRepairsForUser, saveRepair, getUserByUsername, saveUser, getAllRepairs } from './db';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';
import RegistrationGate from './components/RegistrationGate';
import DraftList from './components/DraftList';
import { 
  Wrench, 
  LayoutDashboard, 
  History, 
  PlusCircle, 
  Wifi, 
  WifiOff, 
  LogOut,
  Settings,
  CloudSync,
  AlertCircle,
  X,
  ChevronDown,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Crown,
  FileText
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'history' | 'drafts' | 'admin'>('dashboard');
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStats>({ pending: 0, lastSynced: null });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftRepair | null>(null);

  useEffect(() => {
    const initSystemUsers = async () => {
      // 1. Initialize Admin
      const existingAdmin = await getUserByUsername('admin');
      if (!existingAdmin) {
        await saveUser({
          id: 'admin-001',
          username: 'admin',
          password: 'admin123',
          name: 'System Admin',
          company: 'RepairGuard HQ',
          role: 'super_admin',
          createdAt: Date.now(),
          aiUsageCount: 0,
          registrationStatus: 'verified'
        });
      }

      // 2. Initialize Demo User
      const existingDemo = await getUserByUsername('demo');
      if (!existingDemo) {
        await saveUser({
          id: 'demo-001',
          username: 'demo',
          password: 'demo',
          name: 'Demo Technician',
          company: 'QuickFix Demo Labs',
          role: 'manager',
          createdAt: Date.now(),
          aiUsageCount: 0,
          registrationStatus: 'verified',
          cacNumber: 'RC-DEMO-999',
          businessAddress: '123 Innovation Dr, Tech City',
          ndpcStatus: 'Registered',
          ndpcReference: 'NDPC/DEMO/2025/001'
        });
      }
    };
    initSystemUsers();
  }, []);

  const loadRepairs = useCallback(async () => {
    if (!user || user.registrationStatus !== 'verified') return;
    const data = await getRepairsForUser(user.id, user.role);
    setRepairs(data.sort((a, b) => b.createdAt - a.createdAt));
    const unsyncedCount = data.filter(r => !r.isSynced).length;
    setSyncStatus(prev => ({ ...prev, pending: unsyncedCount }));
  }, [user]);

  useEffect(() => {
    if (user && user.registrationStatus === 'verified') {
      loadRepairs();
    }
  }, [user, loadRepairs]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline || syncStatus.pending === 0 || !user || syncing || user.registrationStatus !== 'verified') return;
    setSyncing(true);
    try {
      const allData = await getAllRepairs();
      const unsynced = allData.filter(r => !r.isSynced && (user.role === 'admin' || user.role === 'super_admin' || r.userId === user.id));
      for (const job of unsynced) {
        await new Promise(res => setTimeout(res, 500));
        await saveRepair({ ...job, isSynced: true });
      }
      await loadRepairs();
      setSyncStatus(prev => ({ ...prev, lastSynced: Date.now() }));
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncStatus.pending, user, syncing, loadRepairs]);

  useEffect(() => {
    if (isOnline && syncStatus.pending > 0) triggerSync();
  }, [isOnline, syncStatus.pending, triggerSync]);

  const handleRegistrationComplete = async (updatedUser: User) => {
    await saveUser(updatedUser);
    setUser(updatedUser);
    // Success UX: refresh repair list immediately
    loadRepairs();
  };

  const handleDraftSelect = (draft: DraftRepair) => {
    setSelectedDraft(draft);
    setActiveTab('new');
  };

  if (!user) return <Login onLogin={setUser} />;
  
  // Mandatory Compliance Gating
  if (user.registrationStatus !== 'verified') {
    return <RegistrationGate user={user} onComplete={handleRegistrationComplete} />;
  }

  const isAdminOrSuper = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden h-screen font-inter">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white z-50 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase italic">RepairGuard</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-800 rounded-xl flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{activeTab}</span>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className="p-4 space-y-2 bg-slate-900 border-b border-slate-800 animate-in slide-in-from-top-4 duration-300">
            <NavButton mobile active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard />} label="Command Center" />
            <NavButton mobile active={activeTab === 'new'} onClick={() => { setActiveTab('new'); setSelectedDraft(null); setIsMobileMenuOpen(false); }} icon={<PlusCircle />} label="Intake Asset" />
            <NavButton mobile active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }} icon={<History />} label="Forensic Logs" />
            <NavButton mobile active={activeTab === 'drafts'} onClick={() => { setActiveTab('drafts'); setIsMobileMenuOpen(false); }} icon={<FileText />} label="Drafts" />
            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-xs">{user.name.charAt(0)}</div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{user.name}</span>
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest flex items-center"><ShieldCheck className="w-2 h-2 mr-1" /> Verified</span>
                </div>
              </div>
              <button onClick={() => setUser(null)} className="p-2 text-rose-400 bg-rose-500/10 rounded-lg"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-72 bg-slate-900 text-white flex-col z-20 shadow-2xl shrink-0">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight italic uppercase">RepairGuard</h1>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
             <div className="flex items-center justify-between mb-1">
               <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Compliance Level</span>
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             </div>
             <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest truncate">Verified: {user.cacNumber || 'HQ-ROOT'}</p>
          </div>
        </div>
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Command Center" />
          <NavButton active={activeTab === 'new'} onClick={() => { setActiveTab('new'); setSelectedDraft(null); }} icon={<PlusCircle />} label="Intake Asset" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="Forensic Logs" />
          <NavButton active={activeTab === 'drafts'} onClick={() => setActiveTab('drafts')} icon={<FileText />} label="Drafts" />
          {isAdminOrSuper && (
            <div className="pt-6 mt-6 border-t border-slate-800">
              <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings />} label="Registry Config" />
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-950/50 border-t border-slate-800 space-y-6">
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border-2 border-white/10 shadow-lg ${user.role === 'super_admin' ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
               {user.role === 'super_admin' ? <Crown className="w-5 h-5 text-white" /> : user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{user.name}</p>
              <span className="flex items-center text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">
                <Fingerprint className="w-3 h-3 mr-1" /> Legal Identity Linked
              </span>
            </div>
            <button onClick={() => setUser(null)} title="Revoke Session" className="p-2.5 text-slate-500 hover:text-rose-400 transition-colors bg-slate-800 rounded-xl hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {!isOnline && (
          <div className="absolute top-0 left-0 right-0 z-40 bg-amber-500 text-amber-950 px-6 py-2 flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4" /> <span>Isolated Forensic Mode (Offline Storage Active)</span>
            </div>
            <p className="text-[9px] font-black opacity-50">NDPR COMPLIANT LOCAL CACHE</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full">
            {activeTab === 'dashboard' && <Dashboard repairs={repairs} onTabChange={setActiveTab} />}
            {activeTab === 'new' && <RepairForm user={user} initialData={selectedDraft} onSubmit={async (job) => {
              const scopedJob = { 
                ...job, 
                userId: user.id, 
                company: user.company, 
                businessCAC: user.cacNumber || 'UNVERIFIED', 
                isSynced: false,
                technicianVerifiedId: user.id
              };
              await saveRepair(scopedJob);
              await loadRepairs();
              setActiveTab('history');
            }} isOnline={isOnline} />}
            {activeTab === 'history' && <RepairList repairs={repairs} onUpdate={async (job) => {
              await saveRepair({ ...job, isSynced: false });
              await loadRepairs();
            }} />}
            {activeTab === 'drafts' && <DraftList user={user} onSelect={handleDraftSelect} />}
            {activeTab === 'admin' && isAdminOrSuper && <AdminPortal user={user} onUserUpdate={setUser} />}
          </div>
        </div>
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, mobile }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, mobile?: boolean }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-5 rounded-2xl transition-all ${mobile ? 'py-3' : 'py-4'} ${active ? 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] scale-[1.02]' : 'text-slate-400 hover:bg-slate-800/50'}`}>
    {React.cloneElement(icon as any, { className: 'w-5 h-5' })}
    <span className="text-sm font-black tracking-tight">{label}</span>
  </button>
);

export default App;
