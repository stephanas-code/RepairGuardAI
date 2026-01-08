
import React, { useState } from 'react';
import { getUserByUsername } from '../db';
import { User } from '../types';
import { Wrench, ShieldCheck, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await getUserByUsername(username);
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Access Denied.');
      }
    } catch (err) {
      setError('System integrity error. Please check database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-500/20 mb-6">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2">RepairGuard AI</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Secure Forensic Gateway</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="w-32 h-32" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Personnel ID</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    required
                    type="text"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access Key</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    required
                    type="password"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center space-x-3 active:scale-95"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>AUTHORIZE ACCESS</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">
          Encrypted Offline Session • Forensic Compliance: NDPR-3.1
        </div>
      </div>
    </div>
  );
};

export default Login;
