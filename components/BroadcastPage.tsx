
import React, { useState, useEffect } from 'react';
import { User, AdminMessage } from '../types';
import { getMessagesForCompany } from '../db';
import { MessageSquare, ShieldCheck, Clock, Bell } from 'lucide-react';

interface BroadcastPageProps {
  user: User;
}

const BroadcastPage: React.FC<BroadcastPageProps> = ({ user }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    const msgs = await getMessagesForCompany(user.company);
    setMessages(msgs.sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <span>HQ Broadcasts</span>
        </h2>
        <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Official Directives & Security Bulletins</p>
      </header>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading secure feed...</div>
      ) : messages.length === 0 ? (
        <div className="py-20 text-center text-slate-300 bg-white rounded-[3rem] border border-slate-200">
          <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-black uppercase tracking-widest text-xs">No active directives found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative overflow-hidden group">
               {/* Decorative Background Element */}
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-32 h-32" />
               </div>
               
               <div className="relative z-10">
                 <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                       <ShieldCheck className="w-3 h-3 mr-1" />
                       HQ COMMAND
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 flex items-center">
                       <Clock className="w-3 h-3 mr-1" />
                       {new Date(msg.timestamp).toLocaleString()}
                    </div>
                 </div>
                 
                 <p className="text-lg font-medium text-slate-800 leading-relaxed font-sans">
                    {msg.content}
                 </p>
                 
                 <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target: {msg.toCompany === 'ALL' ? 'Global Network' : msg.toCompany}</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">VERIFIED SOURCE</span>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BroadcastPage;
