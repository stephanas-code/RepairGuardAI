
import React, { useState, useEffect } from 'react';
import { DraftRepair, User } from '../types';
import { getDraftsForCompany, deleteDraft } from '../db';
import { FileText, Clock, Trash2, Edit3, Smartphone, Laptop, Printer, Package, AlertCircle } from 'lucide-react';

interface DraftListProps {
  user: User;
  onSelect: (draft: DraftRepair) => void;
}

const DraftList: React.FC<DraftListProps> = ({ user, onSelect }) => {
  const [drafts, setDrafts] = useState<DraftRepair[]>([]);

  useEffect(() => {
    loadDrafts();
  }, [user]);

  const loadDrafts = async () => {
    const data = await getDraftsForCompany(user.company);
    setDrafts(data);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to discard this draft?')) {
      await deleteDraft(id);
      await loadDrafts();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-slate-400" />
          <span>Incomplete Intakes</span>
        </h2>
        <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest">Helpdesk & Preliminary Cases</p>
      </header>

      {drafts.length === 0 ? (
        <div className="py-20 text-center text-slate-300 bg-white rounded-[3rem] border border-slate-200">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-black uppercase tracking-widest text-xs">No pending drafts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map(draft => (
            <div 
              key={draft.id} 
              onClick={() => onSelect(draft)}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${draft.category === 'Phone' ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>
                  {draft.category === 'Phone' ? <Smartphone className="w-5 h-5" /> : 
                   draft.category === 'Laptop' ? <Laptop className="w-5 h-5" /> :
                   draft.category === 'Printer' ? <Printer className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div className="flex items-center space-x-2">
                   <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Draft</span>
                   <button 
                     onClick={(e) => handleDelete(e, draft.id)}
                     className="p-2 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
              
              <h3 className="text-lg font-black text-slate-900 mb-1 truncate">{draft.clientName || 'Untitled Client'}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                {draft.brand || 'Unknown'} {draft.model}
              </p>
              
              <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(draft.timestamp).toLocaleDateString()}</span>
                </span>
                <span className="text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                  Resume <Edit3 className="w-3 h-3 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DraftList;
