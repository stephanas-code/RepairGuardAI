
import React, { useState, useEffect } from 'react';
import { User, AdminMessage } from '../types';
import { getMessagesForCompany, saveUser, saveMessage } from '../db';
import { MessageSquare, ShieldCheck, Clock, Bell, Lock, Send, AlertTriangle, CheckCircle2, Inbox, Send as SendIcon } from 'lucide-react';

interface BroadcastPageProps {
  user: User;
  onUserUpdate: (u: User) => void;
}

const BroadcastPage: React.FC<BroadcastPageProps> = ({ user, onUserUpdate }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'inbox' | 'sent'>('inbox');
  
  // Reply State
  const [replyText, setReplyText] = useState('');
  const [isComplaint, setIsComplaint] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [user]);

  // Mark as read on mount
  useEffect(() => {
    if (user.lastReadBroadcastTime === undefined || user.lastReadBroadcastTime < Date.now()) {
        const updateReadStatus = async () => {
            const now = Date.now();
            const updated = { ...user, lastReadBroadcastTime: now };
            await saveUser(updated);
            onUserUpdate(updated);
        };
        const timer = setTimeout(updateReadStatus, 1000);
        return () => clearTimeout(timer);
    }
  }, []);

  const loadMessages = async () => {
    const msgs = await getMessagesForCompany(user.company);
    // Sort all by timestamp desc
    const sorted = msgs.sort((a, b) => b.timestamp - a.timestamp);
    setMessages(sorted);
    setLoading(false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);

    const messageType = isComplaint ? 'complaint' : 'reply';
    const newMessage: AdminMessage = {
        id: `reply-${Date.now()}`,
        from: `${user.name} (${user.company})`,
        toCompany: 'HQ', // Direct to Admin
        senderCompany: user.company,
        content: replyText,
        timestamp: Date.now(),
        type: messageType,
        status: 'pending' // Initial status for complaints
    };

    await saveMessage(newMessage);
    setSending(false);
    setSentSuccess(true);
    setReplyText('');
    setIsComplaint(false);
    await loadMessages(); // Refresh list

    // Hide success message after 3s
    setTimeout(() => setSentSuccess(false), 3000);
  };

  const isProfessional = user.skillLevel === 'Professional';
  
  // Filter messages for views
  const inboxMessages = messages.filter(m => m.toCompany !== 'HQ');
  const sentMessages = messages.filter(m => m.toCompany === 'HQ' || m.senderCompany === user.company);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <span>HQ Broadcasts</span>
            </h2>
            <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Official Directives & Security Bulletins</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
                onClick={() => setViewMode('inbox')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${viewMode === 'inbox' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <Inbox className="w-4 h-4" />
                <span>Inbox</span>
            </button>
            <button 
                onClick={() => setViewMode('sent')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${viewMode === 'sent' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
                <SendIcon className="w-4 h-4" />
                <span>My Reports</span>
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feed Section */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
                <div className="py-20 text-center text-slate-400">Loading secure feed...</div>
            ) : viewMode === 'inbox' ? (
                inboxMessages.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 bg-white rounded-[3rem] border border-slate-200">
                        <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-xs">No active directives found</p>
                    </div>
                ) : (
                    inboxMessages.map((msg) => (
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
                    ))
                )
            ) : (
                sentMessages.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 bg-white rounded-[3rem] border border-slate-200">
                        <SendIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-xs">No reports submitted</p>
                    </div>
                ) : (
                    sentMessages.map((msg) => (
                        <div key={msg.id} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center ${msg.type === 'complaint' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                                    {msg.type === 'complaint' ? <AlertTriangle className="w-3 h-3 mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                                    {msg.type || 'REPLY'}
                                </div>
                                <div className="text-right">
                                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                                        msg.status === 'resolved' ? 'text-emerald-600' : 
                                        msg.status === 'reviewing' ? 'text-blue-600' : 'text-amber-600'
                                    }`}>
                                        {msg.status || 'Pending Review'}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-400">
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                {msg.content}
                            </p>
                        </div>
                    ))
                )
            )}
          </div>

          {/* Reply Section */}
          <div className="lg:col-span-1">
             <div className={`p-8 rounded-[2.5rem] border shadow-xl relative overflow-hidden ${isProfessional ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-200'}`}>
                {!isProfessional && (
                     <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6">
                         <Lock className="w-12 h-12 text-slate-400 mb-4" />
                         <h3 className="text-slate-600 font-black text-sm uppercase tracking-widest mb-1">Restricted Uplink</h3>
                         <p className="text-[10px] text-slate-500 font-bold">Only Professional Tier personnel can reply directly to HQ.</p>
                     </div>
                )}
                
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center space-x-2">
                    <Send className="w-5 h-5 text-indigo-600" />
                    <span>Secure Reply</span>
                </h3>

                {sentSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Transmission Sent</p>
                    </div>
                ) : (
                    <form onSubmit={handleSendReply} className="space-y-4 relative z-10">
                        <textarea
                            disabled={!isProfessional || sending}
                            rows={6}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none resize-none"
                            placeholder="Type your response or report..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        />
                        
                        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <input 
                                type="checkbox" 
                                id="complaint" 
                                disabled={!isProfessional || sending}
                                checked={isComplaint}
                                onChange={(e) => setIsComplaint(e.target.checked)}
                                className="w-5 h-5 rounded-md text-rose-600 focus:ring-rose-500 border-slate-300" 
                             />
                             <label htmlFor="complaint" className={`text-xs font-black uppercase tracking-widest cursor-pointer ${isComplaint ? 'text-rose-600' : 'text-slate-400'}`}>
                                Mark as Complaint
                             </label>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!isProfessional || sending || !replyText.trim()}
                            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all shadow-lg ${
                                isComplaint 
                                ? 'bg-rose-600 text-white shadow-rose-500/30 hover:bg-rose-700' 
                                : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-black'
                            }`}
                        >
                            {isComplaint ? <AlertTriangle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            <span>{isComplaint ? 'Submit Complaint' : 'Send Reply'}</span>
                        </button>
                    </form>
                )}
             </div>
          </div>
      </div>
    </div>
  );
};

export default BroadcastPage;
