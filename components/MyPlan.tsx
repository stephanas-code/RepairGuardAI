
import React, { useState, useEffect } from 'react';
import { User, SubscriptionPlan } from '../types';
import { getAllPlans, savePayment, getSetting } from '../db';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Clock, CreditCard, Banknote } from 'lucide-react';

interface MyPlanProps {
  user: User;
}

const MyPlan: React.FC<MyPlanProps> = ({ user }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [bankDetails, setBankDetails] = useState({ bank: '', account: '', name: '' });
  const [paymentStep, setPaymentStep] = useState<'list' | 'pay' | 'confirm'>('list');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getAllPlans();
    const b = await getSetting('bank_details') || { bank: 'Access Bank', account: '0123456789', name: 'RepairGuard HQ' };
    setPlans(p);
    setBankDetails(b);
  };

  const isActive = user.subscriptionExpiry && user.subscriptionExpiry > Date.now();
  const expiryDate = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
  const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPaymentStep('pay');
  };

  const confirmPayment = async () => {
    if (!selectedPlan) return;
    
    await savePayment({
        id: `pay-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        company: user.company,
        amount: selectedPlan.price,
        confirmedAmount: selectedPlan.price,
        plan: selectedPlan.name,
        durationDays: selectedPlan.durationDays,
        status: 'pending',
        timestamp: Date.now()
    });

    setPaymentStep('confirm');
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <span>My Subscription</span>
        </h2>
        <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Manage Access & Billing</p>
      </header>

      {/* Current Status Card */}
      <div className={`p-8 rounded-[3rem] border-2 shadow-xl relative overflow-hidden ${isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-rose-50 border-rose-200 text-slate-900'}`}>
         {isActive ? (
             <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck className="w-48 h-48" /></div>
         ) : (
             <div className="absolute top-0 right-0 p-8 opacity-5"><AlertTriangle className="w-48 h-48" /></div>
         )}
         
         <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
                {isActive ? (
                    <div className="px-4 py-2 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest flex items-center shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Active License
                    </div>
                ) : (
                    <div className="px-4 py-2 bg-rose-500 text-white rounded-full text-xs font-black uppercase tracking-widest flex items-center shadow-lg shadow-rose-500/30">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Subscription Expired
                    </div>
                )}
            </div>
            
            <h3 className="text-4xl font-black mb-2">{isActive ? `${daysRemaining} Days Remaining` : 'Access Restricted'}</h3>
            <p className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                {isActive ? `Expires on ${expiryDate?.toLocaleDateString()} at ${expiryDate?.toLocaleTimeString()}` : 'Please renew to regain system access.'}
            </p>
         </div>
      </div>

      {paymentStep === 'list' && (
        <div className="space-y-6">
           <h3 className="text-xl font-black text-slate-900 flex items-center space-x-2">
             <CreditCard className="w-6 h-6 text-blue-600" />
             <span>Available Plans</span>
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(plan => (
                 <div key={plan.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl hover:scale-105 transition-transform flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform"><Sparkles className="w-32 h-32" /></div>
                    
                    <div className="mb-4">
                        <h4 className="text-xl font-black text-slate-900">{plan.name}</h4>
                        <div className="flex items-baseline mt-2">
                            <span className="text-3xl font-black text-blue-600">₦{plan.price.toLocaleString()}</span>
                            <span className="text-xs font-bold text-slate-400 ml-1">/ {plan.durationDays} Days</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 mb-8">
                       {plan.features?.map((feat, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-xs font-bold text-slate-600">
                             <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                             <span>{feat}</span>
                          </div>
                       ))}
                       {(!plan.features || plan.features.length === 0) && (
                          <p className="text-xs text-slate-400 italic">Standard features included.</p>
                       )}
                    </div>

                    <button 
                       onClick={() => handleSelectPlan(plan)}
                       className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg"
                    >
                       {isActive ? 'Extend / Upgrade' : 'Purchase Plan'}
                    </button>
                 </div>
              ))}
           </div>
        </div>
      )}

      {paymentStep === 'pay' && selectedPlan && (
         <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 animate-in zoom-in-95">
             <div className="text-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900">Bank Transfer</h3>
                 <p className="text-sm font-bold text-slate-500 mt-2">To activate <span className="text-blue-600">{selectedPlan.name}</span></p>
             </div>

             <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 text-center space-y-4 mb-8">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Pay</p>
                      <p className="text-4xl font-black text-slate-900">₦{selectedPlan.price.toLocaleString()}</p>
                  </div>
                  <div className="w-full h-px bg-slate-200" />
                  <div className="grid grid-cols-2 gap-4 text-left">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank</p>
                          <p className="font-bold">{bankDetails.bank}</p>
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account No.</p>
                          <p className="font-mono font-bold text-xl select-all">{bankDetails.account}</p>
                      </div>
                      <div className="col-span-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Name</p>
                          <p className="font-bold">{bankDetails.name}</p>
                      </div>
                  </div>
             </div>

             <div className="space-y-4">
                 <button onClick={confirmPayment} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2">
                     <CheckCircle2 className="w-5 h-5" /> <span>I Have Made The Transfer</span>
                 </button>
                 <button onClick={() => setPaymentStep('list')} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200">
                     Cancel
                 </button>
             </div>
         </div>
      )}

      {paymentStep === 'confirm' && (
          <div className="max-w-xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-emerald-100 text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Payment Submitted</h3>
              <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                  Your transaction ID has been logged. Admin verification usually takes 10-30 minutes. 
                  Your access will be restored or extended automatically upon approval.
              </p>
              <button onClick={() => setPaymentStep('list')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                  Return to Plans
              </button>
          </div>
      )}
    </div>
  );
};

export default MyPlan;
