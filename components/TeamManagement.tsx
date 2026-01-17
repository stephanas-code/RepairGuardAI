
import React, { useState, useEffect } from 'react';
import { User, RepairJob } from '../types';
import { getUsersByCompany, saveUser, getAllRepairs } from '../db';
import { Users, UserPlus, ShieldCheck, AlertCircle, Clock, Search, Lock, Smartphone, User as UserIcon, CheckCircle2 } from 'lucide-react';

interface TeamManagementProps {
  user: User;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ user }) => {
  const [team, setTeam] = useState<User[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadTeamData();
  }, [user]);

  const loadTeamData = async () => {
    const users = await getUsersByCompany(user.company);
    const allRepairs = await getAllRepairs();
    const companyRepairs = allRepairs.filter(r => r.company === user.company);
    
    setTeam(users);
    setRepairs(companyRepairs);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const existing = team.find(u => u.username === newWorker.phone);
      if (existing) {
        setError('A user with this phone number already exists in your team.');
        return;
      }

      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: newWorker.phone,
        password: newWorker.password,
        name: newWorker.name,
        company: user.company,
        role: 'staff',
        createdAt: Date.now(),
        aiUsageCount: 0,
        registrationStatus: 'pending_verification', // Needs Admin approval
        currentPlanId: 'free',
        jobsCreatedThisMonth: 0,
        skillLevel: 'Apprentice',
        // Inherit compliance from company owner
        cacNumber: user.cacNumber,
        businessAddress: user.businessAddress,
        cacDocument: user.cacDocument, // Inherit proof so they don't get stuck at upload gate if ever needed
        ndpcStatus: user.ndpcStatus,
        ndpcReference: user.ndpcReference,
        // Removed legalAcceptedTimestamp to force Identity Verification flow in RegistrationGate
      };

      await saveUser(newUser);
      await loadTeamData();
      setShowAddModal(false);
      setNewWorker({ name: '', phone: '', password: '' });
    } catch (e) {
      setError('Failed to add worker. Please try again.');
    }
  };

  const getWorkerStats = (workerId: string) => {
    const workerRepairs = repairs.filter(r => r.userId === workerId);
    return {
      total: workerRepairs.length,
      active: workerRepairs.filter(r => r.status === 'Pending' || r.status === 'In Progress').length,
      completed: workerRepairs.filter(r => r.status === 'Completed').length
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            <span>Team Overview</span>
          </h2>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">{user.company} Workforce</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-3xl font-black text-sm flex items-center justify-center space-x-3 transition-all shadow-xl shadow-indigo-500/30"
        >
          <UserPlus className="w-5 h-5" />
          <span>ADD WORKER</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(member => {
          const stats = getWorkerStats(member.id);
          const isMe = member.id === user.id;
          const isPending = member.registrationStatus === 'pending_verification';

          return (
            <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-lg relative overflow-hidden group">
               {/* Header */}
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                     <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${isMe ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                        {member.name.charAt(0)}
                     </div>
                     <div>
                        <h3 className="font-black text-slate-900">{member.name}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{member.role} {isMe && '(YOU)'}</p>
                     </div>
                  </div>
                  {isPending ? (
                     <div className="p-2 bg-amber-50 text-amber-600 rounded-xl" title="Pending HQ Verification">
                        <Clock className="w-4 h-4" />
                     </div>
                  ) : (
                     <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl" title="Verified">
                        <ShieldCheck className="w-4 h-4" />
                     </div>
                  )}
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100 mb-2">
                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                     <div className="text-xs font-black text-slate-900">{stats.total}</div>
                     <div className="text-[8px] font-black uppercase text-slate-400">Total</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                     <div className="text-xs font-black text-blue-600">{stats.active}</div>
                     <div className="text-[8px] font-black uppercase text-slate-400">Active</div>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                     <div className="text-xs font-black text-emerald-600">{stats.completed}</div>
                     <div className="text-[8px] font-black uppercase text-slate-400">Done</div>
                  </div>
               </div>
               
               {isPending && (
                  <div className="bg-amber-50 p-3 rounded-xl flex items-center space-x-2 text-[10px] font-bold text-amber-800">
                     <AlertCircle className="w-3 h-3 shrink-0" />
                     <span>Access limited until HQ Verification.</span>
                  </div>
               )}
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center space-x-3">
                 <UserPlus className="w-6 h-6 text-indigo-600" />
                 <span>Onboard Staff</span>
              </h3>
              
              <form onSubmit={handleAddWorker} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative">
                       <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                       <input required className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" placeholder="Technician Name" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone (Login ID)</label>
                    <div className="relative">
                       <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                       <input required type="tel" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" placeholder="080..." value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Access Key</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                       <input required type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" placeholder="Password" value={newWorker.password} onChange={e => setNewWorker({...newWorker, password: e.target.value})} />
                    </div>
                 </div>

                 {error && <p className="text-xs font-bold text-rose-500">{error}</p>}

                 <div className="pt-4 flex space-x-3">
                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">Create Profile</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
