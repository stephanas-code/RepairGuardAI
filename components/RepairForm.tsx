
import React, { useState, useRef, useEffect } from 'react';
import { DeviceCategory, RepairJob, AISuggestion, User, PaymentRequest, AdminMessage } from '../types';
import { analyzeFault } from '../geminiService';
import { signRecord } from '../cryptoUtils';
import { getAllRepairs, getSetting, savePayment, getMessagesForCompany, saveUser } from '../db';
import { 
  Smartphone, Laptop, Printer, Tablet, Package, User as UserIcon, Phone, 
  Tag, Terminal, CheckCircle2, ShieldCheck, Sparkles, PlusCircle, 
  PenTool, AlertTriangle, Hash, Activity, Mail, Landmark, Shield, 
  Keyboard, MousePointer2, CreditCard, Banknote, X, MessageSquare
} from 'lucide-react';

interface RepairFormProps {
  user: User;
  onSubmit: (job: RepairJob) => void;
  isOnline: boolean;
}

const NGN_USD_RATE = 1600; 

const RepairForm: React.FC<RepairFormProps> = ({ user, onSubmit, isOnline }) => {
  const [formData, setFormData] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    category: 'Phone' as DeviceCategory, brand: '', model: '',
    serial: '', initialCondition: '', fault: '',
    agreedAmount: '', initialDeposit: ''
  });

  const [ndprConsent, setNdprConsent] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  
  // Paywall & UI states
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: number} | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<string>('');
  const [bankDetails, setBankDetails] = useState({ bank: '', account: '', name: '' });
  const [paymentStep, setPaymentStep] = useState<'plan' | 'bank' | 'done'>('plan');

  const [sigMode, setSigMode] = useState<{client: 'draw' | 'type', tech: 'draw' | 'type'}>({ client: 'draw', tech: 'draw' });
  const [typedSigs, setTypedSigs] = useState({ client: '', tech: '' });
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [techSignature, setTechSignature] = useState<string | null>(null);
  
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const techCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCanvas, setActiveCanvas] = useState<'client' | 'tech' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadContext();
  }, [user]);

  const loadContext = async () => {
    const b = await getSetting('bank_details') || { bank: 'Access Bank', account: '0123456789', name: 'RepairGuard HQ' };
    const m = await getMessagesForCompany(user.company);
    setBankDetails(b);
    setMessages(m);
  };

  const checkAIEligibility = (): boolean => {
    const isSubscribed = user.subscriptionExpiry && user.subscriptionExpiry > Date.now();
    if (isSubscribed) return true;
    if (user.aiUsageCount < 10) return true;
    return false;
  };

  const startAnalysis = async () => {
    if (!formData.fault || !isOnline) return;
    
    if (!checkAIEligibility()) {
      setShowPaywall(true);
      return;
    }

    setAiLoading(true);
    const results = await analyzeFault(formData.category, formData.brand, formData.model, formData.fault, formData.initialCondition);
    setSuggestions(results);
    
    // Increment usage if not subscribed
    if (!user.subscriptionExpiry || user.subscriptionExpiry < Date.now()) {
      const updatedUser = { ...user, aiUsageCount: (user.aiUsageCount || 0) + 1 };
      await saveUser(updatedUser);
    }
    
    setAiLoading(false);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !confirmedAmount) {
      alert("Please enter the amount you paid.");
      return;
    }
    const req: PaymentRequest = {
      id: `PAY-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      company: user.company,
      amount: selectedPlan.price,
      confirmedAmount: parseFloat(confirmedAmount) || 0,
      plan: selectedPlan.name,
      status: 'pending',
      timestamp: Date.now()
    };
    await savePayment(req);
    setPaymentStep('done');
  };

  const generateTypedSignature = (name: string, type: 'client' | 'tech'): string | null => {
    if (!name.trim()) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px "Great Vibes"';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    ctx.beginPath();
    ctx.moveTo(50, canvas.height / 2 + 35);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 45, canvas.width - 50, canvas.height / 2 + 35);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();
    return canvas.toDataURL();
  };

  const handleSignStart = (canvasType: 'client' | 'tech', e: any) => {
    if (sigMode[canvasType] === 'type') return;
    setActiveCanvas(canvasType); setIsDrawing(true);
    const canvas = canvasType === 'client' ? clientCanvasRef.current : techCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.moveTo(x, y);
      }
    }
  };

  const handleSignMove = (e: any) => {
    if (!isDrawing || !activeCanvas) return;
    const canvas = activeCanvas === 'client' ? clientCanvasRef.current : techCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.lineTo(x, y); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !activeCanvas) return;
    const canvas = activeCanvas === 'client' ? clientCanvasRef.current : techCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      if (activeCanvas === 'client') setClientSignature(dataUrl);
      else setTechSignature(dataUrl);
    }
    setIsDrawing(false); setActiveCanvas(null);
  };

  const clearCanvas = (type: 'client' | 'tech') => {
    if (sigMode[type] === 'type') {
      setTypedSigs(prev => ({ ...prev, [type]: '' }));
      if (type === 'client') setClientSignature(null); else setTechSignature(null);
    } else {
      const canvas = type === 'client' ? clientCanvasRef.current : techCanvasRef.current;
      if (canvas) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        if (type === 'client') setClientSignature(null); else setTechSignature(null);
      }
    }
  };

  const handleTypedChange = (type: 'client' | 'tech', value: string) => {
    setTypedSigs(prev => ({ ...prev, [type]: value }));
    const sigImage = generateTypedSignature(value, type);
    if (type === 'client') setClientSignature(sigImage); else setTechSignature(sigImage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndprConsent) return alert("NDPR Consent Required.");
    if (!clientSignature || !techSignature) return alert("Signatures Required.");

    const repairs = await getAllRepairs();
    const prevHash = repairs.length > 0 ? repairs[0].recordHash : "0xGENESIS";
    const agreedNGN = parseFloat(formData.agreedAmount) || 0;
    const depositNGN = parseFloat(formData.initialDeposit) || 0;

    const baseData = {
      clientName: formData.clientName, clientPhone: formData.clientPhone,
      device: `${formData.brand} ${formData.model}`, fault: formData.fault,
      agreedAmount: agreedNGN, deposit: depositNGN, timestamp: Date.now()
    };

    const recordHash = await signRecord(baseData, prevHash);

    const newJob: RepairJob = {
      id: `RG-${Date.now()}`, userId: user.id, company: user.company,
      ...formData, agreedAmount: agreedNGN, initialDeposit: depositNGN,
      deviceCategory: formData.category, deviceBrand: formData.brand, deviceModel: formData.model,
      faultDescription: formData.fault, status: 'Pending',
      createdAt: Date.now(), updatedAt: Date.now(),
      clientSignature, technicianSignature: techSignature,
      aiSuggestions: suggestions, isSynced: false,
      recordHash, prevRecordHash: prevHash, timestampProof: `Verified ${new Date().toISOString()}`
    };

    onSubmit(newJob);
    alert(`Case RG-${newJob.id} Sealed.`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HQ Notifications */}
      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className="bg-blue-600 p-4 rounded-3xl text-white flex items-center space-x-4 shadow-xl animate-in slide-in-from-right">
              <MessageSquare className="w-10 h-10 opacity-20" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">HQ Directive</p>
                <p className="text-sm font-bold">{m.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-2xl w-full bg-white rounded-[3rem] p-10 shadow-2xl relative">
            <button onClick={() => setShowPaywall(false)} className="absolute top-8 right-8 text-slate-400 hover:text-rose-500"><X /></button>
            
            {paymentStep === 'plan' && (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 bg-blue-100 rounded-3xl mb-4"><Sparkles className="w-10 h-10 text-blue-600" /></div>
                  <h2 className="text-3xl font-black text-slate-900">AI Intelligence Limit</h2>
                  <p className="text-slate-500 text-sm">Your free diagnostic credits have expired. Choose a forensic intelligence plan to continue.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: '1 Week', price: 10000, desc: 'Naira 10k' },
                    { name: '2 Weeks', price: 15000, desc: 'Naira 15k' },
                    { name: '1 Month', price: 25000, desc: 'Naira 25k' },
                  ].map(plan => (
                    <button 
                      key={plan.name} 
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-6 rounded-[2rem] border-2 transition-all text-center ${selectedPlan?.name === plan.name ? 'border-blue-600 bg-blue-50 shadow-inner' : 'border-slate-100 bg-slate-50 hover:bg-white'}`}
                    >
                      <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">{plan.name}</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">₦{plan.price/1000}k</p>
                    </button>
                  ))}
                </div>
                <button 
                  disabled={!selectedPlan} 
                  onClick={() => setPaymentStep('bank')}
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl disabled:opacity-50"
                >
                  PROCEED TO PAYMENT
                </button>
              </div>
            )}

            {paymentStep === 'bank' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-900">Transfer Funds</h2>
                  <p className="text-slate-500 text-sm">Transfer ₦{selectedPlan?.price.toLocaleString()} to HQ Registry.</p>
                </div>
                <div className="bg-emerald-50 p-8 rounded-[2rem] border-2 border-dashed border-emerald-200 text-center space-y-2">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Account Metadata</p>
                   <p className="text-3xl font-black text-emerald-900">{bankDetails.account}</p>
                   <p className="text-sm font-bold text-emerald-700">{bankDetails.bank}</p>
                   <p className="text-xs text-emerald-600 opacity-60 uppercase font-black">{bankDetails.name}</p>
                </div>
                
                {/* Confirm Amount Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Confirmed Amount Paid (₦)</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg"
                    placeholder="Enter exact amount sent"
                    value={confirmedAmount}
                    onChange={(e) => setConfirmedAmount(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handlePaymentSubmit}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl"
                >
                  I HAVE MADE PAYMENT
                </button>
                <button onClick={() => setPaymentStep('plan')} className="w-full text-slate-400 font-bold text-sm">GO BACK</button>
              </div>
            )}

            {paymentStep === 'done' && (
              <div className="text-center py-10 space-y-6 animate-in zoom-in-50">
                 <div className="inline-flex p-6 bg-emerald-100 rounded-full"><CheckCircle2 className="w-16 h-16 text-emerald-600" /></div>
                 <h2 className="text-3xl font-black text-slate-900">Request Dispatched</h2>
                 <p className="text-slate-500 text-sm">HQ has been notified of your payment. Your forensic credits will be updated shortly after verification.</p>
                 <button onClick={() => setShowPaywall(false)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black">RETURN TO REGISTRY</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Form UI */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black flex items-center space-x-3 text-slate-800">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
              <span>Forensic Intake</span>
            </h2>
            <div className="flex items-center space-x-2 mt-1">
               <span className="text-[10px] text-slate-400 font-bold uppercase">{user.company}</span>
               <span className="text-[10px] text-blue-500 font-black uppercase">AI Uses: {user.subscriptionExpiry && user.subscriptionExpiry > Date.now() ? 'PRO ACTIVE' : `${user.aiUsageCount}/10 Free`}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase font-bold">
            <Shield className="w-3 h-3" />
            <span>NDPR PROTOCOL v3</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Identity & Hardware (Condensed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2"><UserIcon className="w-4 h-4" /> <span>Client Identity</span></h3>
              <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Legal Full Name" />
              <div className="grid grid-cols-2 gap-4">
                <input required className="px-4 py-3 bg-slate-50 border rounded-xl" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} placeholder="Phone" />
                <input type="email" className="px-4 py-3 bg-slate-50 border rounded-xl" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} placeholder="Email (Opt)" />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2"><Tag className="w-4 h-4" /> <span>Asset Metadata</span></h3>
              <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl">
                {['Phone', 'Laptop', 'Printer', 'Other'].map(cat => (
                  <button key={cat} type="button" onClick={() => setFormData({...formData, category: cat as DeviceCategory})} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${formData.category === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required className="px-4 py-3 bg-slate-50 border rounded-xl" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Brand" />
                <input required className="px-4 py-3 bg-slate-50 border rounded-xl" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Model" />
              </div>
            </div>
          </div>

          {/* Financial Metadata Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2"><Landmark className="w-4 h-4" /> <span>Financial Metadata</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Total Agreed Amount (₦)</label>
                <input 
                  required 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" 
                  value={formData.agreedAmount} 
                  onChange={e => setFormData({...formData, agreedAmount: e.target.value})} 
                  placeholder="e.g. 50000" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2">Initial Deposit (₦)</label>
                <input 
                  required 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold" 
                  value={formData.initialDeposit} 
                  onChange={e => setFormData({...formData, initialDeposit: e.target.value})} 
                  placeholder="e.g. 20000" 
                />
              </div>
            </div>
          </div>

          {/* Fault & Diagnostics */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2"><Activity className="w-4 h-4" /> <span>Forensic Evidence</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea required rows={3} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" value={formData.initialCondition} onChange={e => setFormData({...formData, initialCondition: e.target.value})} placeholder="Initial Physical State..." />
              <div className="relative">
                <textarea required rows={3} className="w-full px-4 py-3 bg-slate-50 border rounded-xl pr-32" value={formData.fault} onChange={e => setFormData({...formData, fault: e.target.value})} placeholder="Detailed Fault..." />
                <button type="button" onClick={startAnalysis} disabled={aiLoading || !isOnline || !formData.fault} className="absolute bottom-4 right-4 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50 text-xs font-bold shadow-lg transition-all active:scale-95">
                  {aiLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>AI DIAGNOSE</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Suggestions with Percentage */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-3xl border border-blue-100">
              {suggestions.map((s, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-xs">{s.accuracy}%</div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${s.riskLevel === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>Risk: {s.riskLevel}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1 uppercase tracking-tight">{s.solution}</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">Precision: {s.precision}% • {s.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* NDPR Consent Statement */}
          <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-32 h-32" /></div>
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
              <h3 className="font-bold text-sm uppercase tracking-widest">Legal Integrity Consent</h3>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed italic relative z-10">Data processed under <strong>NDPR (2019) Article 2.1b</strong>. Integrity sealed via SHA-256 fingerprinting for forensic protection.</p>
            <label className="flex items-start space-x-3 cursor-pointer group relative z-10">
              <input type="checkbox" className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500" checked={ndprConsent} onChange={e => setNdprConsent(e.target.checked)} />
              <span className="text-xs font-bold">I acknowledge the recorded device state and consent to data processing.</span>
            </label>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Seal</label>
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, client: 'draw'}))} className={`p-1.5 rounded ${sigMode.client === 'draw' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}><MousePointer2 className="w-3 h-3"/></button>
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, client: 'type'}))} className={`p-1.5 rounded ${sigMode.client === 'type' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}><Keyboard className="w-3 h-3"/></button>
                 </div>
               </div>
               <div className="h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 relative group overflow-hidden">
                 {sigMode.client === 'draw' ? (
                   <canvas ref={clientCanvasRef} width={400} height={150} className="w-full h-full cursor-crosshair touch-none" onMouseDown={(e) => handleSignStart('client', e)} onMouseMove={handleSignMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={(e) => handleSignStart('client', e)} onTouchMove={handleSignMove} onTouchEnd={stopDrawing} />
                 ) : (
                   <div className="p-4 h-full flex flex-col justify-center space-y-4">
                     <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Type Legal Full Name" value={typedSigs.client} onChange={(e) => handleTypedChange('client', e.target.value)} />
                     <div className="h-16 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-inner"><span className="font-signature-2 text-3xl text-slate-800">{typedSigs.client || "Your Signature"}</span></div>
                   </div>
                 )}
                 <button type="button" onClick={() => clearCanvas('client')} className="absolute top-2 right-2 p-1 text-[8px] bg-rose-50 text-rose-500 rounded font-black uppercase">Reset</button>
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Officer Seal</label>
                 <div className="flex bg-slate-100 p-1 rounded-lg">
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, tech: 'draw'}))} className={`p-1.5 rounded ${sigMode.tech === 'draw' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}><MousePointer2 className="w-3 h-3"/></button>
                   <button type="button" onClick={() => setSigMode(prev => ({...prev, tech: 'type'}))} className={`p-1.5 rounded ${sigMode.tech === 'type' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}><Keyboard className="w-3 h-3"/></button>
                 </div>
               </div>
               <div className="h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 relative group overflow-hidden">
                 {sigMode.tech === 'draw' ? (
                   <canvas ref={techCanvasRef} width={400} height={150} className="w-full h-full cursor-crosshair touch-none" onMouseDown={(e) => handleSignStart('tech', e)} onMouseMove={handleSignMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={(e) => handleSignStart('tech', e)} onTouchMove={handleSignMove} onTouchEnd={stopDrawing} />
                 ) : (
                   <div className="p-4 h-full flex flex-col justify-center space-y-4">
                     <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Type Technician Name" value={typedSigs.tech} onChange={(e) => handleTypedChange('tech', e.target.value)} />
                     <div className="h-16 flex items-center justify-center bg-white rounded-xl border border-slate-100 shadow-inner"><span className="font-signature-1 text-2xl text-slate-800">{typedSigs.tech || "Officer Seal"}</span></div>
                   </div>
                 )}
                 <button type="button" onClick={() => clearCanvas('tech')} className="absolute top-2 right-2 p-1 text-[8px] bg-rose-50 text-rose-500 rounded font-black uppercase">Reset</button>
               </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
            VALIDATE & SEAL CASE
          </button>
        </form>
      </div>
    </div>
  );
};

export default RepairForm;
