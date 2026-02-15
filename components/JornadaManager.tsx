
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Timer, Coffee, Play, Square, History, AlertCircle, BellRing, Trash2, Clock, CheckCircle, Activity, Loader2, CalendarDays, ArrowRight, Eraser } from 'lucide-react';
import { JornadaLog } from '../types';

const LIMIT_DRIVING = 19800; // 5h 30min em segundos
const LIMIT_REST = 1800;    // 30min em segundos

interface JornadaManagerProps {
  mode: 'IDLE' | 'DRIVING' | 'RESTING';
  startTime: number | null;
  currentTime: number; // Recebido do App.tsx global
  logs: JornadaLog[];
  setMode: (mode: 'IDLE' | 'DRIVING' | 'RESTING') => void;
  setStartTime: (time: number | null) => void;
  onSaveLog: (log: Omit<JornadaLog, 'id' | 'user_id'>) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
  addGlobalNotification: (title: string, msg: string, type?: 'warning' | 'info') => void;
  isSaving?: boolean;
}

export const JornadaManager: React.FC<JornadaManagerProps> = ({ mode, startTime, currentTime, logs, setMode, setStartTime, onSaveLog, onDeleteLog, onClearHistory, addGlobalNotification, isSaving }) => {
  const [alert, setAlert] = useState<string | null>(null);
  
  const drivingAlertFired = useRef(false);
  const restAlertFired = useRef(false);

  // Função para pegar a data local em formato YYYY-MM-DD
  const getLocalDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatClockTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Memoizar apenas logs salvos
  const savedLogs = useMemo(() => {
    const todayStr = getLocalDateStr();
    return [...logs]
      .filter(l => (l.date || l.start_time?.split('T')[0]) === todayStr)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [logs]);

  useEffect(() => {
    if (mode === 'DRIVING' && currentTime >= LIMIT_DRIVING) {
      const msg = "⚠️ LIMITE DE 5h30 ATINGIDO!";
      setAlert(msg);
      if (!drivingAlertFired.current) {
        addGlobalNotification("Alerta de Direção", msg, "warning");
        drivingAlertFired.current = true;
      }
    } 
    else if (mode === 'RESTING' && currentTime >= LIMIT_REST) {
      const msg = "✅ DESCANSO CONCLUÍDO!";
      setAlert(msg);
      if (!restAlertFired.current) {
        addGlobalNotification("Descanso Concluído", msg, "info");
        restAlertFired.current = true;
      }
    } else {
      setAlert(null);
    }
  }, [currentTime, mode]);

  const handleAction = async (newMode: 'IDLE' | 'DRIVING' | 'RESTING') => {
    if (mode !== 'IDLE' && startTime) {
      const now = Date.now();
      const duration = Math.floor((now - startTime) / 1000);
      
      if (duration >= 1) {
        const newLog: Omit<JornadaLog, 'id' | 'user_id'> = { 
          start_time: new Date(startTime).toISOString(), 
          end_time: new Date(now).toISOString(), 
          duration_seconds: duration,
          type: mode === 'DRIVING' ? 'Direção' : 'Descanso',
          date: getLocalDateStr()
        };
        await onSaveLog(newLog);
      }
    }

    if (newMode === 'IDLE') {
      setStartTime(null);
      setMode('IDLE');
    } else {
      const now = Date.now();
      setStartTime(now);
      setMode(newMode);
      drivingAlertFired.current = false;
      restAlertFired.current = false;
    }
  };

  const confirmClearHistory = async () => {
    if (window.confirm("Deseja apagar TODO o seu histórico de jornada? Esta ação removerá todos os registros permanentemente.")) {
      await onClearHistory();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Painel de Controle Principal Compactado */}
      <div className={`rounded-[3rem] p-8 md:p-12 text-center text-white shadow-2xl transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center min-h-[380px] ${mode === 'DRIVING' ? 'bg-primary-950' : mode === 'RESTING' ? 'bg-emerald-950' : 'bg-slate-900'}`}>
        
        {/* Camada de Decoração de Fundo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] ${mode === 'DRIVING' ? 'bg-blue-400' : mode === 'RESTING' ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
           <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[100px] ${mode === 'DRIVING' ? 'bg-indigo-400' : mode === 'RESTING' ? 'bg-teal-400' : 'bg-slate-400'}`}></div>
        </div>

        <div className="relative z-10 flex flex-col items-center w-full">
          <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border flex items-center gap-2 mb-8 ${mode === 'DRIVING' ? 'bg-primary-500/20 border-primary-500/50 text-primary-300' : mode === 'RESTING' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-500'}`}>
            <Activity size={14} className={mode !== 'IDLE' ? 'animate-spin' : ''} />
            {mode === 'DRIVING' ? 'Direção em Curso' : mode === 'RESTING' ? 'Descanso em Curso' : 'Jornada em Espera'}
          </div>

          {/* Cronômetro com cores temáticas e brilho dinâmico baseado no modo */}
          <div className={`text-6xl md:text-8xl font-black font-mono tracking-tighter select-none tabular-nums leading-none mb-6 flex items-baseline gap-2 transition-all duration-500 ${
            mode === 'DRIVING' ? 'text-primary-500 drop-shadow-[0_0_25px_rgba(99,102,241,0.4)]' : 
            mode === 'RESTING' ? 'text-emerald-500 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 
            'text-slate-300 drop-shadow-none'
          }`}>
            {formatTime(currentTime)}
          </div>

          {mode !== 'IDLE' && startTime && (
            <div className="mb-8 flex items-center gap-2 text-white/40 font-bold uppercase text-[9px] tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
              <Clock size={10}/> Iniciado às {new Date(startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </div>
          )}

          {alert && (
            <div className="mb-8 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 px-6 py-3 rounded-2xl flex items-center gap-3 text-white animate-pulse shadow-lg">
              <BellRing size={20} className="text-rose-400" />
              <p className="font-black text-xs uppercase tracking-tight">{alert}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 w-full max-w-2xl px-2">
            <button 
              disabled={isSaving || mode === 'DRIVING'} 
              onClick={() => handleAction('DRIVING')} 
              className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${mode === 'DRIVING' ? 'bg-primary-800 text-primary-200 border border-primary-500/50 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500 text-white'}`}
            >
              {mode === 'DRIVING' ? <Activity size={20} className="animate-spin"/> : <Play size={20}/>} 
              Direção
            </button>

            <button 
              disabled={isSaving || mode === 'RESTING'} 
              onClick={() => handleAction('RESTING')} 
              className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${mode === 'RESTING' ? 'bg-emerald-800 text-emerald-200 border border-emerald-500/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              {mode === 'RESTING' ? <Coffee size={20} className="animate-pulse"/> : <Coffee size={20}/>} 
              Descanso
            </button>
            
            <button 
              disabled={isSaving || mode === 'IDLE'} 
              onClick={() => handleAction('IDLE')} 
              className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${mode === 'IDLE' ? 'bg-slate-800 text-slate-700 cursor-not-allowed opacity-20' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Square size={20}/>} 
              Finalizar
            </button>
          </div>
        </div>
      </div>

      {/* Histórico e Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4">
        {/* Histórico Detalhado */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] border shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                <History className="text-primary-600" size={20}/> Histórico de Hoje
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                <CalendarDays size={12}/> {getLocalDateStr().split('-').reverse().join('/')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">
                {savedLogs.length} seções
              </span>
              {savedLogs.length > 0 && (
                <button 
                  onClick={confirmClearHistory}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors p-1"
                >
                  <Eraser size={12}/> Limpar Tudo
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {savedLogs.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <Clock className="mx-auto text-slate-200 mb-3" size={48} />
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhuma seção finalizada hoje.</p>
              </div>
            ) : savedLogs.map((log) => (
              <div 
                key={log.id} 
                className={`group p-4 rounded-[2rem] border transition-all hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  log.type === 'Direção' ? 'bg-blue-50/20 border-blue-50' : 'bg-emerald-50/20 border-emerald-50'
                }`}
              >
                <div className="flex gap-3 items-center">
                  <div className={`p-3 rounded-2xl shrink-0 ${log.type === 'Direção' ? 'bg-primary-100 text-primary-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {log.type === 'Direção' ? <Activity size={20}/> : <Coffee size={20}/>}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${log.type === 'Direção' ? 'text-primary-600' : 'text-emerald-600'}`}>
                      {log.type}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                      <span>{formatClockTime(log.start_time)}</span>
                      <ArrowRight size={12} className="text-slate-300" />
                      <span>{log.end_time ? formatClockTime(log.end_time) : '---'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className={`px-4 py-2 rounded-2xl border ${log.type === 'Direção' ? 'bg-primary-50 border-primary-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className={`text-[9px] font-black uppercase mb-0.5 ${log.type === 'Direção' ? 'text-primary-400' : 'text-emerald-400'}`}>Duração</p>
                    <p className={`font-black text-sm tabular-nums ${log.type === 'Direção' ? 'text-primary-700' : 'text-emerald-700'}`}>
                      {formatTime(log.duration_seconds)}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => { if(confirm("Remover este registro?")) onDeleteLog(log.id) }} 
                    className="p-3 text-slate-200 hover:text-rose-500 transition-all sm:opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={20}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Informativo Legal */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
             <h3 className="text-lg font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
               <AlertCircle className="text-amber-500" size={18}/> Lei do Motorista
             </h3>
             <div className="space-y-5">
                <div className="flex gap-3">
                   <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                   <p className="text-slate-400 text-xs font-bold leading-tight">Direção contínua máx: <span className="text-white">5h 30min</span>.</p>
                </div>
                <div className="flex gap-3">
                   <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                   <p className="text-slate-400 text-xs font-bold leading-tight">Descanso obrigatório: <span className="text-white">30 min</span>.</p>
                </div>
                <div className="flex gap-3">
                   <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                   <p className="text-slate-400 text-xs font-bold leading-tight">Descanso diário total: <span className="text-white">11 horas</span>.</p>
                </div>
             </div>
             
             <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Funcionamento</p>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                  O cronômetro global permite que você monitore o tempo de qualquer tela do app.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
