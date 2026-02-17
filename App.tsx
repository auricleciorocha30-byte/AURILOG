
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutDashboard, Truck, Wallet, Calculator, Menu, X, LogOut, Bell, Settings, CheckSquare, Timer, Fuel, Loader2, Mail, Key, UserPlus, LogIn, AlertCircle, Share2, AlertTriangle, KeyRound, Wifi, WifiOff, CloudUpload, CheckCircle2, Coffee, Play, RefreshCcw, Undo2, Send, Clock, ShieldAlert, MapPinHouse, Lock, ShieldCheck, Smartphone, Download, MapPin } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TripManager } from './components/TripManager';
import { ExpenseManager } from './components/ExpenseManager';
import { FreightCalculator } from './components/FreightCalculator';
import { VehicleManager } from './components/VehicleManager';
import { MaintenanceManager } from './components/MaintenanceManager';
import { JornadaManager } from './components/JornadaManager';
import { StationLocator } from './components/StationLocator';
import { NotificationCenter } from './components/NotificationCenter';
import { AdminPanel } from './components/AdminPanel';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, TripStatus, JornadaLog, ExpenseCategory, DbNotification, RoadService } from './types';
import { supabase } from './lib/supabase';
import { offlineStorage } from './lib/offlineStorage';

const App: React.FC = () => {
  const isUserMode = new URLSearchParams(window.location.search).get('mode') === 'user';

  const [session, setSession] = useState<any>(null);
  
  // Inicializa o estado de admin checando o localStorage para persistência no refresh
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('aurilog_admin_auth') === 'true';
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [jornadaMode, setJornadaMode] = useState<'IDLE' | 'DRIVING' | 'RESTING'>('IDLE');
  const [jornadaStartTime, setJornadaStartTime] = useState<number | null>(null);
  const [jornadaElapsed, setJornadaElapsed] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [jornadaLogs, setJornadaLogs] = useState<JornadaLog[]>([]);
  const [dbNotifications, setDbNotifications] = useState<DbNotification[]>([]);
  const [roadServices, setRoadServices] = useState<RoadService[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('aurilog_dismissed_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const watchId = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('aurilog_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  // Serviço de Rastreamento de Localização Otimizado
  useEffect(() => {
    if (!session?.user || !isUserMode || !navigator.geolocation) return;

    const startTracking = () => {
      watchId.current = navigator.geolocation.watchPosition(
        async (pos) => {
          try {
            const { error: upsertError } = await supabase.from('user_locations').upsert({
              user_id: session.user.id,
              email: session.user.email,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              updated_at: new Date().toISOString()
            });
            if (upsertError) console.error("Erro ao enviar localização:", upsertError);
          } catch (e) {
            console.error("Localização track error:", e);
          }
        },
        (err) => {
          console.warn("Geolocation watch error:", err.message);
          if (err.code === 1) { // PERMISSION_DENIED
            console.error("Permissão de localização negada pelo usuário.");
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 20000, 
          maximumAge: 10000 
        }
      );
    };

    startTracking();

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [session, isUserMode]);

  // Real-time listener para alertas administrativos e sincronização global
  useEffect(() => {
    const channel = supabase
      .channel('aurilog-global-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDbNotifications(prev => [payload.new as DbNotification, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setDbNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setDbNotifications(prev => prev.map(n => n.id === payload.new.id ? (payload.new as DbNotification) : n));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    return () => window.removeEventListener('beforeinstallprompt', () => {});
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Para instalar no iPhone/iOS:\n1. Toque no ícone de Compartilhar\n2. Role para baixo e toque em 'Adicionar à Tela de Início'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  useEffect(() => {
    let interval: any;
    if (jornadaMode !== 'IDLE' && jornadaStartTime) {
      const update = () => {
        const elapsed = Math.floor((Date.now() - jornadaStartTime) / 1000);
        setJornadaElapsed(elapsed > 0 ? elapsed : 0);
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setJornadaElapsed(0);
    }
    return () => clearInterval(interval);
  }, [jornadaMode, jornadaStartTime]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncData = useCallback(async () => {
    if (!navigator.onLine || syncing || !session?.user) return;
    setSyncing(true);
    try {
      const pending = await offlineStorage.getPendingSync();
      if (pending.length === 0) {
        setSyncing(false);
        return;
      }
      for (const item of pending) {
        let error = null;
        if (item.action === 'insert' || item.action === 'update') {
          const { sync_status, updated_at, ...cleanPayload } = item.data;
          cleanPayload.user_id = session.user.id;
          const { error: syncError } = await supabase.from(item.table).upsert([cleanPayload]);
          error = syncError;
        } else if (item.action === 'delete') {
          const { error: syncError } = await supabase.from(item.table).delete().eq('id', item.data.id).eq('user_id', session.user.id);
          error = syncError;
        }
        if (!error) await offlineStorage.markAsSynced(item.id);
      }
      await fetchData(true); 
    } catch (err) { console.error("Sync error:", err); } finally { setSyncing(false); }
  }, [syncing, session]);

  const fetchData = async (forceCloud = false) => {
    try {
      if (navigator.onLine) {
        const [notifRes, servRes] = await Promise.all([
          supabase.from('notifications').select('*').order('created_at', { ascending: false }),
          supabase.from('road_services').select('*').order('name', { ascending: true })
        ]);
        if (notifRes.data) setDbNotifications(notifRes.data);
        if (servRes.data) setRoadServices(servRes.data);
      }
    } catch (e) { console.log("Global data fetch failed"); }

    if (!session?.user) return;
    const userId = session.user.id;

    try {
      if (navigator.onLine) {
        const [tripsRes, expRes, vehRes, mainRes, jornRes] = await Promise.all([
          supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('vehicles').select('*').eq('user_id', userId).order('plate', { ascending: true }),
          supabase.from('maintenance').select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
          supabase.from('jornada_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        ]);

        if (tripsRes.data) await offlineStorage.bulkSave('trips', tripsRes.data);
        if (expRes.data) await offlineStorage.bulkSave('expenses', expRes.data);
        if (vehRes.data) await offlineStorage.bulkSave('vehicles', vehRes.data);
        if (mainRes.data) await offlineStorage.bulkSave('maintenance', mainRes.data);
        if (jornRes.data) await offlineStorage.bulkSave('jornada_logs', jornRes.data);
      }

      const [lTrips, lExp, lVeh, lMain, lJorn] = await Promise.all([
        offlineStorage.getAll('trips'),
        offlineStorage.getAll('expenses'),
        offlineStorage.getAll('vehicles'),
        offlineStorage.getAll('maintenance'),
        offlineStorage.getAll('jornada_logs')
      ]);

      setTrips(lTrips);
      setExpenses(lExp);
      setVehicles(lVeh);
      setMaintenance(lMain);
      setJornadaLogs(lJorn);
    } catch (err) { console.error("User data fetch error:", err); }
  };

  const activeNotifications = useMemo(() => {
    const list: any[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = today.toISOString().split('T')[0];
    
    // 1. Notificações do Painel Administrativo
    dbNotifications.forEach(n => {
      if (!n.target_user_email || (session?.user?.email === n.target_user_email)) {
        list.push({ 
          ...n, 
          category: n.category as any, 
          date: 'Alerta Admin',
          persistent: false 
        });
      }
    });

    // 2. Alertas de Manutenção de Veículos
    maintenance.forEach(m => {
      const vehicle = vehicles.find(v => v.id === m.vehicle_id);
      if (!vehicle) return;
      const pDate = new Date(m.purchase_date + 'T12:00:00');
      const expiryDate = new Date(pDate);
      expiryDate.setMonth(pDate.getMonth() + (m.warranty_months || 0));
      const kmLimit = (m.km_at_purchase || 0) + (m.warranty_km || 0);
      
      if ((m.warranty_months > 0 && expiryDate < today) || (m.warranty_km > 0 && vehicle.current_km >= kmLimit)) {
        list.push({ 
          id: `maint-${m.id}`, 
          type: 'URGENT', 
          category: 'MAINTENANCE', 
          title: `Manutenção Vencida: ${m.part_name}`, 
          message: `Verifique o veículo ${vehicle.plate}.`, 
          date: 'Agora',
          persistent: true 
        });
      }
    });

    // 3. Alertas de Finanças (Persiste no sininho se estiver atrasado)
    expenses.forEach(e => {
      if (!e.is_paid && e.due_date) {
        const dueDate = new Date(e.due_date + 'T12:00:00');
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dueDate < today && e.due_date !== todayStr) {
          list.push({
            id: `exp-overdue-${e.id}-${e.installment_number || 1}`,
            type: 'URGENT',
            category: 'FINANCE',
            title: `Parcela Atrasada (${e.installment_number}/${e.installments_total})`,
            message: `${e.description} - R$ ${e.amount.toLocaleString('pt-BR')}`,
            date: e.due_date,
            persistent: true 
          });
        } else if (diffDays >= 0 && diffDays <= 3) {
          list.push({
            id: `exp-upcoming-${e.id}-${e.installment_number || 1}`,
            type: 'WARNING',
            category: 'FINANCE',
            title: diffDays === 0 ? 'Vence Hoje!' : `Vence em ${diffDays} dias`,
            message: `${e.description} - R$ ${e.amount.toLocaleString('pt-BR')}`,
            date: e.due_date,
            persistent: false
          });
        }
      }
    });

    // 4. Alertas de Viagens (Viagens agendadas para hoje ou atrasadas)
    trips.forEach(t => {
      if (t.status === TripStatus.SCHEDULED) {
        const isOverdue = t.date < todayStr;
        const isToday = t.date === todayStr;

        if (isOverdue) {
          list.push({
            id: `trip-overdue-${t.id}`,
            type: 'URGENT',
            category: 'TRIP',
            title: 'Viagem em Atraso!',
            message: `Saída pendente: ${t.origin.split(' - ')[0]} para ${t.destination.split(' - ')[0]}`,
            date: t.date,
            persistent: true
          });
        } else if (isToday) {
          list.push({
            id: `trip-today-${t.id}`,
            type: 'WARNING',
            category: 'TRIP',
            title: 'Viagem para Hoje',
            message: `Você tem uma viagem agendada: ${t.origin.split(' - ')[0]} ➔ ${t.destination.split(' - ')[0]}`,
            date: 'Hoje',
            persistent: false
          });
        }
      }
    });

    // Filtra as notificações descartadas, EXCETO aquelas que são marcadas como persistentes
    return list.filter(n => {
      if (n.persistent) return true; 
      return !dismissedNotificationIds.includes(n.id);
    });
  }, [trips, expenses, maintenance, vehicles, dbNotifications, dismissedNotificationIds, session]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      } catch (e) { console.log("Session recovery failed"); } finally { setLoading(false); }
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) { 
      fetchData(); 
      if (session?.user && isOnline) syncData(); 
    }
  }, [session, loading, isOnline]);

  const handleAction = async (table: string, data: any, action: 'insert' | 'update' | 'delete' = 'insert') => {
    setIsSaving(true);
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error("User not identified.");
      const payload = { ...data, user_id: userId };
      const savedData = await offlineStorage.save(table, payload, action);
      const updateState = (prev: any[]) => {
        if (action === 'insert') return [savedData, ...prev];
        if (action === 'update') return prev.map(item => item.id === savedData.id ? savedData : item);
        if (action === 'delete') return prev.filter(item => item.id !== data.id);
        return prev;
      };
      if (table === 'jornada_logs') setJornadaLogs(updateState);
      else if (table === 'trips') setTrips(updateState);
      else if (table === 'expenses') setExpenses(updateState);
      else if (table === 'vehicles') setVehicles(updateState);
      else if (table === 'maintenance') setMaintenance(updateState);
      if (isOnline) syncData(); 
    } catch (err) { alert("Erro ao salvar dados."); } finally { setIsSaving(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setAuthLoading(true);
    try {
      if (isPasswordRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '?mode=user' });
        if (error) throw error;
        setSuccessMsg("E-mail de recuperação enviado!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error("E-mail ou senha incorretos.");
        if (data.session) {
          if (!isUserMode) {
            setIsAdminAuthenticated(true);
            // Salva no localStorage para persistir no refresh
            localStorage.setItem('aurilog_admin_auth', 'true');
          }
          else setSession(data.session);
          setSuccessMsg("Acesso autorizado!");
        }
      }
    } catch (err: any) { setError(err.message || "Erro no login."); } finally { setAuthLoading(false); }
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
    // Remove do localStorage ao sair
    localStorage.removeItem('aurilog_admin_auth');
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary-500" size={48} /></div>;

  if (!isUserMode && !isAdminAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg bg-slate-900 rounded-[3.5rem] shadow-2xl p-12 border border-slate-800 animate-fade-in text-center">
           <div className="flex flex-col items-center mb-10">
              <div className="bg-primary-600 p-5 rounded-[1.8rem] shadow-xl mb-6 text-white"><ShieldAlert size={48} /></div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Painel de Controle</h2>
              <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-widest">Acesso Restrito ao Administrador</p>
           </div>
           <form onSubmit={handleAuth} className="space-y-6 text-left">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Usuário Master</label>
                 <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input required type="email" placeholder="admin@aurilog.com" className="w-full p-5 pl-14 bg-slate-800 border border-slate-700 rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={email} onChange={e => setEmail(e.target.value)} />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Chave de Acesso</label>
                 <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input required type="password" placeholder="••••••••" className="w-full p-5 pl-14 bg-slate-800 border border-slate-700 rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
                 </div>
              </div>
              {error && <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-500 text-xs font-black text-center">{error}</div>}
              {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-500 text-xs font-black text-center">{successMsg}</div>}
              <button disabled={authLoading} type="submit" className="w-full py-6 bg-primary-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-3">
                 {authLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} />} Autenticar Painel
              </button>
           </form>
        </div>
      </div>
    );
  }

  if (!isUserMode && isAdminAuthenticated) return <div className="min-h-screen bg-slate-50 overflow-y-auto"><AdminPanel onRefresh={fetchData} onLogout={handleAdminLogout} /></div>;

  if (!session) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-10 animate-fade-in border border-white/10">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary-600 p-4 rounded-[1.5rem] shadow-lg mb-4 text-white"><Truck size={40} /></div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none text-center">AuriLog</h1>
          <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest text-center">{isPasswordRecovery ? 'Recuperar Senha' : 'Acesso ao Sistema'}</p>
        </div>
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
            <input required type="email" placeholder="seu@email.com" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {!isPasswordRecovery && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha</label>
              <input required type="password" placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
              <div className="flex justify-end mt-1"><button type="button" onClick={() => setIsPasswordRecovery(true)} className="text-[10px] font-black uppercase text-primary-600 hover:underline">Esqueceu a senha?</button></div>
            </div>
          )}
          {error && <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-600 text-xs font-bold animate-pulse">{error}</div>}
          {successMsg && <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-600 text-xs font-bold">{successMsg}</div>}
          <button disabled={authLoading} type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-3">
            {authLoading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />} {isPasswordRecovery ? 'Enviar E-mail' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );

  const MenuBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all active:scale-95 ${active ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><Icon size={20} /><span className="font-bold text-sm">{label}</span></button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <aside className={`fixed md:relative z-[200] w-64 h-full bg-slate-900 text-slate-300 p-4 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-10 px-2 shrink-0">
          <div className="flex items-center gap-2"><Truck className="text-primary-500" size={28} /><span className="text-xl font-bold text-white tracking-tighter uppercase">AuriLog</span></div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-3 text-slate-500 hover:text-white"><X size={24} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          <MenuBtn icon={LayoutDashboard} label="Dashboard" active={currentView === AppView.DASHBOARD} onClick={() => {setCurrentView(AppView.DASHBOARD); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={Truck} label="Viagens" active={currentView === AppView.TRIPS} onClick={() => {setCurrentView(AppView.TRIPS); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={Wallet} label="Financeiro" active={currentView === AppView.EXPENSES} onClick={() => {setCurrentView(AppView.EXPENSES); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={Settings} label="Veículos" active={currentView === AppView.VEHICLES} onClick={() => {setCurrentView(AppView.VEHICLES); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={CheckSquare} label="Manutenções" active={currentView === AppView.MAINTENANCE} onClick={() => {setCurrentView(AppView.MAINTENANCE); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={Calculator} label="Frete ANTT" active={currentView === AppView.CALCULATOR} onClick={() => {setCurrentView(AppView.CALCULATOR); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={Timer} label="Jornada" active={currentView === AppView.JORNADA} onClick={() => {setCurrentView(AppView.JORNADA); setIsMobileMenuOpen(false);}} />
          <MenuBtn icon={MapPinHouse} label="Serviços Estrada" active={currentView === AppView.STATIONS} onClick={() => {setCurrentView(AppView.STATIONS); setIsMobileMenuOpen(false);}} />
        </nav>
        <div className="px-2 mb-2"><button onClick={handleInstallClick} className="w-full flex items-center gap-3 px-4 py-4 bg-primary-600/10 text-primary-400 rounded-2xl border border-primary-600/20 hover:bg-primary-600 hover:text-white transition-all group"><Download size={20} className="group-hover:animate-bounce" /><div className="text-left"><p className="text-[10px] font-black uppercase tracking-widest leading-none">Baixar App</p><p className="text-[8px] font-bold opacity-60 uppercase">Instalar no Celular</p></div></button></div>
        <div className="pt-4 border-t border-white/5 mt-auto pb-12"><button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="w-full flex items-center gap-3 px-6 py-4 text-rose-400 font-black uppercase text-xs hover:bg-white/5 rounded-2xl transition-all"><LogOut size={18} /> Sair da Conta</button></div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg"><Menu size={24} /></button>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsNotificationOpen(true)} className="relative p-3 text-slate-500 hover:bg-slate-50 rounded-full transition-all active:scale-90">
              <Bell size={24} className={activeNotifications.some(n => n.type === 'URGENT') ? 'text-rose-500 animate-pulse' : ''} />
              {activeNotifications.length > 0 && <span className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{activeNotifications.length}</span>}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {currentView === AppView.EXPENSES && <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={(e) => handleAction('expenses', e, 'insert')} onUpdateExpense={(id, e) => handleAction('expenses', { ...e, id }, 'update')} onDeleteExpense={(id) => handleAction('expenses', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.TRIPS && <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={(t) => handleAction('trips', t, 'insert')} onUpdateTrip={(id, t) => handleAction('trips', { ...t, id }, 'update')} onUpdateStatus={async (id, s, km) => { await handleAction('trips', { id, status: s }, 'update'); if (km) { const trip = trips.find(x => x.id === id); if (trip?.vehicle_id) await handleAction('vehicles', { id: trip.vehicle_id, current_km: km }, 'update'); } }} onDeleteTrip={(id) => handleAction('trips', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.VEHICLES && <VehicleManager vehicles={vehicles} onAddVehicle={(v) => handleAction('vehicles', v, 'insert')} onUpdateVehicle={(id, v) => handleAction('vehicles', { ...v, id }, 'update')} onDeleteVehicle={(id) => handleAction('vehicles', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.MAINTENANCE && <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={(m) => handleAction('maintenance', m, 'insert')} onDeleteMaintenance={(id) => handleAction('maintenance', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.CALCULATOR && <FreightCalculator />}
          {currentView === AppView.JORNADA && <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaElapsed} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setJornadaStartTime} onSaveLog={(l) => handleAction('jornada_logs', l, 'insert')} onDeleteLog={(id) => handleAction('jornada_logs', { id }, 'delete')} onClearHistory={async () => { if(session?.user) { await supabase.from('jornada_logs').delete().eq('user_id', session.user.id); setJornadaLogs([]); } }} addGlobalNotification={() => {}} isSaving={isSaving} />}
          {currentView === AppView.STATIONS && <StationLocator roadServices={roadServices} />}
          {currentView === AppView.DASHBOARD && <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setCurrentView} />}
        </div>
      </main>

      {isNotificationOpen && <NotificationCenter notifications={activeNotifications} onClose={() => setIsNotificationOpen(false)} onAction={(cat) => { switch(cat) { case 'MAINTENANCE': setCurrentView(AppView.MAINTENANCE); break; case 'FINANCE': setCurrentView(AppView.EXPENSES); break; case 'TRIP': setCurrentView(AppView.TRIPS); break; } setIsNotificationOpen(false); }} onDismiss={(id) => setDismissedNotificationIds(prev => [...prev, id])} />}
    </div>
  );
};

export default App;
