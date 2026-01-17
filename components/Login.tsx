
import React, { useState, useEffect } from 'react';
import { getUserByUsername, saveUser } from '../db';
import { User } from '../types';
import { Wrench, ShieldCheck, Lock, User as UserIcon, AlertCircle, Download, X, Building2, ChevronRight, ArrowRight, Phone, Mail } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    company: '',
    email: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const timer = setTimeout(() => {
      setShowInstallPrompt(true);
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    } else {
      alert("To install: Use your browser's 'Add to Home Screen' option.");
    }
    setShowInstallPrompt(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await getUserByUsername(formData.username);
      if (user && user.password === formData.password) {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const existing = await getUserByUsername(formData.username);
      if (existing) {
        setError('Personnel ID (Phone Number) already registered.');
        setLoading(false);
        return;
      }

      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: formData.username,
        password: formData.password,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        role: 'manager',
        createdAt: Date.now(),
        aiUsageCount: 0,
        registrationStatus: 'pending_verification' // Triggers RegistrationGate in App.tsx
      };

      await saveUser(newUser);
      
      // Auto-login after registration
      onLogin(newUser);
      
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* PWA Install Popup */}
      {showInstallPrompt && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-sm z-50 animate-pwa">
          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 flex items-center space-x-4">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-900">Install as app on your device</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Offline Forensic Access</p>
            </div>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={handleInstall}
                className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                INSTALL
              </button>
              <button 
                onClick={() => setShowInstallPrompt(false)}
                className="text-slate-400 text-[10px] font-bold hover:text-rose-500"
              >
                LATER
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
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

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6 relative z-10">
            <div className="flex justify-center mb-6">
               <div className="flex bg-slate-100 p-1 rounded-2xl">
                 <button type="button" onClick={() => setIsRegistering(false)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${!isRegistering ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>ACCESS PORTAL</button>
                 <button type="button" onClick={() => setIsRegistering(true)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${isRegistering ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>REGISTER ORG</button>
               </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            {isRegistering && (
              <>
                <div className="space-y-1 animate-in slide-in-from-left-4 fade-in">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                      placeholder="Tech Solutions Ltd"
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1 animate-in slide-in-from-left-4 fade-in delay-75">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Administrator Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1 animate-in slide-in-from-left-4 fade-in delay-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Recovery Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      required
                      type="email"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                      placeholder="admin@company.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{isRegistering ? 'Mobile Number (Personnel ID)' : 'Mobile Number'}</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    required
                    type="tel"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                    placeholder="080 1234 5678"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{isRegistering ? 'Create Access Key' : 'Access Key'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    required
                    type="password"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center space-x-3 active:scale-95 group"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (
                <>
                  {isRegistering ? <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <ShieldCheck className="w-5 h-5" />}
                  <span>{isRegistering ? 'INITIATE REGISTRATION' : 'AUTHORIZE ACCESS'}</span>
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
