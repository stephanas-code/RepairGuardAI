
import React from 'react';
import { RepairJob } from '../types';
import { 
  TrendingUp, CheckCircle2, Clock, AlertTriangle, Activity,
  PlusCircle, Smartphone, Laptop, Printer, ShieldAlert,
  Fingerprint, Database, HardDrive
} from 'lucide-react';

interface DashboardProps {
  repairs: RepairJob[];
  onTabChange: (tab: 'dashboard' | 'new' | 'history') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ repairs, onTabChange }) => {
  const stats = {
    total: repairs.length,
    active: repairs.filter(r => r.status === 'Pending' || r.status === 'In Progress').length,
    completed: repairs.filter(r => r.status === 'Completed').length,
    failed: repairs.filter(r => r.status === 'Unrepairable').length,
    unsynced: repairs.filter(r => !r.isSynced).length
  };

  const recentRepairs = repairs.slice(0, 6);

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Command</h1>
          <div className="flex items-center space-x-4 mt-2">
             <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase border border-emerald-100">
               <Fingerprint className="w-3 h-3" />
               <span>Biometric Registry Active</span>
             </div>
             <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase border border-blue-100">
               <Database className="w-3 h-3" />
               <span>{stats.total} Records Hashed</span>
             </div>
          </div>
        </div>
        <button 
          onClick={() => onTabChange('new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-3xl font-black text-lg flex items-center justify-center space-x-3 transition-all shadow-2xl shadow-blue-500/30 active:scale-95"
        >
          <PlusCircle className="w-6 h-6" />
          <span>OPEN NEW CASE</span>
        </button>
      </header>

      {/* Forensic Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Protocols" value={stats.active} icon={<Clock className="text-amber-500" />} color="bg-amber-50" />
        <StatCard title="Resolved Cases" value={stats.completed} icon={<CheckCircle2 className="text-emerald-500" />} color="bg-emerald-50" />
        <StatCard title="Non-Restorable" value={stats.failed} icon={<ShieldAlert className="text-rose-500" />} color="bg-rose-50" />
        <StatCard title="Local Cache" value={stats.unsynced} icon={<HardDrive className="text-slate-500" />} color="bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Hardware Intelligence */}
        <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl flex flex-col">
          <h3 className="font-black text-slate-800 mb-8 flex items-center space-x-3 text-xl">
            <Activity className="w-6 h-6 text-blue-500" />
            <span>Volume Analysis</span>
          </h3>
          <div className="space-y-6 flex-1">
            <DeviceBar label="Mobile Units" count={repairs.filter(r => r.deviceCategory === 'Phone').length} total={stats.total} icon={<Smartphone className="w-5 h-5" />} color="bg-blue-500" />
            <DeviceBar label="Computing Systems" count={repairs.filter(r => r.deviceCategory === 'Laptop').length} total={stats.total} icon={<Laptop className="w-5 h-5" />} color="bg-indigo-500" />
            <DeviceBar label="Imaging/Print" count={repairs.filter(r => r.deviceCategory === 'Printer').length} total={stats.total} icon={<Printer className="w-5 h-5" />} color="bg-orange-500" />
          </div>
          <div className="mt-8 pt-8 border-t border-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            Diagnostics powered by Gemini 3.0
          </div>
        </div>

        {/* Forensic Activity Feed */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl">
          <div className="flex justify-between items-center mb-8">
             <h3 className="font-black text-slate-800 text-xl">Event Log</h3>
             <button onClick={() => onTabChange('history')} className="text-xs font-bold text-blue-600 hover:underline">VIEW REGISTRY</button>
          </div>
          <div className="space-y-4">
            {recentRepairs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => onTabChange('history')}>
                <div className="flex items-center space-x-4">
                   <div className={`p-3 rounded-2xl shadow-sm bg-white group-hover:scale-110 transition-transform`}>
                     {job.deviceCategory === 'Phone' ? <Smartphone className="w-5 h-5 text-blue-500" /> : <Laptop className="w-5 h-5 text-indigo-500" />}
                   </div>
                   <div>
                     <p className="font-black text-slate-900 leading-tight">{job.clientName}</p>
                     <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter mt-1">{job.deviceBrand} {job.deviceModel} • ID:{job.id}</p>
                   </div>
                </div>
                <div className="text-right">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                     job.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                     job.status === 'Unrepairable' ? 'bg-rose-100 text-rose-700' :
                     'bg-amber-100 text-amber-700'
                   }`}>
                     {job.status}
                   </span>
                   <p className="text-[9px] text-slate-400 mt-1 font-mono">{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {recentRepairs.length === 0 && (
              <div className="py-20 text-center text-slate-300">
                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-xs">No Events Recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => (
  <div className={`p-8 rounded-[40px] border border-slate-200 shadow-xl transition-all hover:translate-y-[-4px] ${color}`}>
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-white rounded-2xl shadow-md">{icon}</div>
      <Activity className="w-4 h-4 text-slate-300" />
    </div>
    <div className="text-4xl font-black text-slate-900 tracking-tighter">{value}</div>
    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">{title}</div>
  </div>
);

const DeviceBar = ({ label, count, total, icon, color }: { label: string, count: number, total: number, icon: React.ReactNode, color: string }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end text-sm">
        <div className="flex items-center space-x-3 text-slate-700 font-bold">
          {icon} <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        <span className="font-black text-lg text-slate-900 leading-none">{count}</span>
      </div>
      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner p-0.5">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-lg`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
