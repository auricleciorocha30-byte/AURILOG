
import React from 'react';
import { X, Bell, AlertTriangle, Clock, Calendar, Gauge, CreditCard, CheckCircle2, ChevronRight, Trash2, MessageCircle, Info, ShieldAlert } from 'lucide-react';

interface Notification {
  id: string;
  type: 'URGENT' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  category: 'JORNADA' | 'MAINTENANCE' | 'FINANCE' | 'TRIP' | 'GENERAL';
  date: string;
  target_user_email?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: () => void;
  onAction: (category: any) => void;
  onDismiss: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onAction, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[110] flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Central de Alertas</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {notifications.length} notificações ativas
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white shadow-sm rounded-full text-slate-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-10">
              <div className="bg-emerald-50 text-emerald-500 p-8 rounded-full mb-6">
                <CheckCircle2 size={64} />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tudo em dia!</h4>
              <p className="text-slate-400 font-medium text-sm mt-2">
                Nenhum alerta pendente no momento.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 group relative overflow-hidden ${
                  n.type === 'URGENT' ? 'border-rose-100 bg-rose-50/30' : 
                  n.type === 'WARNING' ? 'border-amber-100 bg-amber-50/30' : 'border-slate-50 bg-slate-50/30'
                }`}
                onClick={() => { if (n.category !== 'GENERAL') { onAction(n.category); onClose(); } }}
              >
                <div className="flex gap-4">
                  <div className={`p-4 rounded-2xl shrink-0 h-fit ${
                    n.type === 'URGENT' ? 'bg-rose-100 text-rose-600' : 
                    n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {n.type === 'URGENT' ? <ShieldAlert size={24} /> : <Info size={24} />}
                  </div>
                  
                  <div className="flex-1 pr-8">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tighter">{n.title}</h4>
                      <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase tracking-widest">{n.category || 'GERAL'}</span>
                      {n.target_user_email && (
                        <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 uppercase tracking-widest">PRIVADO</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2">{n.message}</p>
                    
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">
                       <span>{n.date}</span>
                       {n.target_user_email && (
                         <>
                           <span className="text-slate-200">•</span>
                           <span className="text-primary-600">PARA: {n.target_user_email.toUpperCase()}</span>
                         </>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="absolute right-3 top-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                    className="p-2 bg-white/80 hover:bg-rose-500 hover:text-white shadow-sm rounded-full text-slate-300 transition-all"
                    title="Descartar"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t">
          <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            Fechar Central
          </button>
        </div>
      </div>
    </div>
  );
};
