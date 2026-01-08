
import React, { useState, useEffect, useCallback } from 'react';
import { RepairJob, SyncStats, User } from './types';
import { getRepairsForUser, saveRepair, getUserByUsername, saveUser } from './db';
import RepairForm from './components/RepairForm';
import RepairList from './components/RepairList';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';
import { 
  Wrench, 
  LayoutDashboard, 
  History, 
  PlusCircle, 
  Wifi, 
  WifiOff, 
  LogOut,
  Settings,
  ShieldCheck
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'history' | 'admin'>('dashboard');
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStats>({ pending: 0, lastSynced: null });

  useEffect(() => {
    const initAdmin = async () => {
      const existing = await getUserByUsername('admin');
      if (!existing) {
        await saveUser({
          id: 'admin-001',
          username: 'admin',
          password: 'admin123',
          name: 'System Admin',
          company: 'RepairGuard HQ',
          role: 'admin',
          createdAt: Date.now(),
          aiUsageCount: 0
        });
      }
    };
    initAdmin();
  }, []);

  const loadRepairs = useCallback(async () => {
    if (!user) return;
    const data = await getRepairsForUser(user.id, user.role);
    setRepairs(data.sort((a, b) => b.createdAt - a.createdAt));
    const unsyncedCount = data.filter(r => !r.isSynced).length;
    setSyncStatus(prev => ({ ...prev, pending: unsyncedCount }));
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRepairs();
      // Periodically refresh user data to catch subscription updates from admin
      const interval = setInterval(async () => {
        const fresh = await getUserByUsername(user.username);
        if (fresh) setUser(fresh);
      }, 10000);
      return () => clearInterval(interval);
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

  useEffect(() => {
    if (isOnline && syncStatus.pending > 0 && user) {
      const sync = async () => {
        const unsynced = repairs.filter(r => !r.isSynced);
        for (const job of unsynced) {
          await new Promise(res => setTimeout(res, 500));
          await saveRepair({ ...job, isSynced: true });
        }
        await loadRepairs();
        setSyncStatus(prev => ({ ...prev, lastSynced: Date.now() }));
      };
      sync();
    }
  }, [isOnline, syncStatus.pending, repairs, loadRepairs, user]);

  const handleLogin = (u: User) => {
    setUser(u);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setRepairs([]);
  };

  const handleAddRepair = async (job: RepairJob) => {
    if (!user) return;
    const scopedJob = { ...job, userId: user.id, company: user.company };
    await saveRepair(scopedJob);
    await loadRepairs();
    setActiveTab('history');
  };

  const handleUpdateRepair = async (job: RepairJob) => {
    await saveRepair({ ...job, updatedAt: Date.now(), isSynced: false });
    await loadRepairs();
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <nav className="w-full md:w-64 bg-slate-900 text-white flex flex-col sticky top-0 md:h-screen z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Wrench className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">RepairGuard AI</h1>
          </div>
          <div className="mt-4 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest truncate">{user.company}</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={activeTab === 'new'} onClick={() => setActiveTab('new')} icon={<PlusCircle />} label="New Repair" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="Job History" />
          
          {user.role === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="text-[9px] font-black text-slate-500 uppercase px-4 mb-2 tracking-[0.2em]">HQ Management</p>
              <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings />} label="HQ Console" />
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user.name}</p>
              <p className="text-[9px] text-slate-500 uppercase font-bold">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-between text-[10px] opacity-50 px-2">
            <div className="flex items-center space-x-2">
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {syncStatus.pending > 0 && <span className="text-blue-400">{syncStatus.pending} Pending</span>}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard repairs={repairs} onTabChange={setActiveTab} />}
          {activeTab === 'new' && <RepairForm user={user} onSubmit={handleAddRepair} isOnline={isOnline} />}
          {activeTab === 'history' && <RepairList repairs={repairs} onUpdate={handleUpdateRepair} />}
          {activeTab === 'admin' && user.role === 'admin' && <AdminPortal user={user} onUserUpdate={setUser} />}
        </div>
      </main>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
    {React.cloneElement(icon as any, { className: 'w-5 h-5' })}
    <span className="text-sm font-bold">{label}</span>
  </button>
);

export default App;
