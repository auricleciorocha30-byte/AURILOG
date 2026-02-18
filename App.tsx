import React, { useState, useEffect, useCallback } from 'react';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, JornadaLog, DbNotification, TripStatus, Driver } from './types';
import { supabase } from './lib/supabase';
import { offlineStorage } from './lib/offlineStorage';
import { Dashboard } from './components/Dashboard';
import { TripManager } from './components/TripManager';
import { ExpenseManager } from './components/ExpenseManager';
import { VehicleManager } from './components/VehicleManager';
import { MaintenanceManager } from './components/MaintenanceManager';
import { FreightCalculator } from './components/FreightCalculator';
import { JornadaManager } from './components/JornadaManager';
import { StationLocator } from './components/StationLocator';
import { AdminPanel } from './components/AdminPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  ReceiptText, 
  Calculator, 
  Truck, 
  Wrench, 
  Timer, 
  MapPinned, 
  Bell,
  Wifi,
  WifiOff,
  LogOut,
  User,
  ShieldCheck,
  Loader2,
  Lock,
  Unlock,
  X,
  Menu,
  AlertCircle,
  Database,
  ExternalLink,
  ShieldAlert,
  Smartphone
} from 'lucide-react';

const App: React.FC = () => {
  // Detector de Contexto: O padrão agora é ADMIN. MOTORISTA só entra via ?mode=driver
  const queryParams = new URLSearchParams(window.location.search);
  const isDriverContext = queryParams.get('mode') === 'driver';

  const [authRole, setAuthRole] = useState<'DRIVER' | 'ADMIN' | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  // Data states
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [jornadaLogs, setJornadaLogs] = useState<JornadaLog[]>([]);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Jornada State
  const [jornadaMode, setJornadaMode] = useState<'IDLE' | 'DRIVING' | 'RESTING'>('IDLE');
  const [jornadaStartTime, setJornadaStartTime] = useState<number | null>(null);
  const [jornadaCurrentTime, setJornadaCurrentTime] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (jornadaMode !== 'IDLE' && jornadaStartTime) {
      interval = window.setInterval(() => {
        setJornadaCurrentTime(Math.floor((Date.now() - jornadaStartTime) / 1000));
      }, 1000);
    } else {
      setJornadaCurrentTime(0);
    }
    return () => clearInterval(interval);
  }, [jornadaMode, jornadaStartTime]);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    const userId = currentUser.id;

    if (!isOnline) {
      const allTrips = await offlineStorage.getAll('trips');
      const allExpenses = await offlineStorage.getAll('expenses');
      setTrips(allTrips.filter((t: any) => t.user_id === userId));
      setExpenses(allExpenses.filter((e: any) => e.user_id === userId));
      return;
    }

    try {
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, jornadaRes, notificationsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', userId).order('plate', { ascending: true }),
        supabase.from('maintenance').select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
        supabase.from('jornada_logs').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
        supabase.from('notifications').select('*').or(`target_user_email.is.null,target_user_email.eq.${currentUser.email}`).order('created_at', { ascending: false })
      ]);
      
      if (tripsRes.data) setTrips(tripsRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setMaintenance(maintenanceRes.data);
      if (jornadaRes.data) setJornadaLogs(jornadaRes.data);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
    } catch (error) {
      console.warn("Isolamento de dados offline.");
    }
  }, [isOnline, currentUser]);

  useEffect(() => {
    if (currentUser) fetchData();
  }, [fetchData, currentUser]);

  const handleAction = async (table: string, data: any, action: 'insert' | 'update' | 'delete') => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const userId = currentUser.id;
      const payload = { ...data, user_id: userId };

      if (!isOnline) {
        await offlineStorage.save(table, payload, action);
        await fetchData();
        return;
      }
      
      let response;
      if (action === 'insert') response = await supabase.from(table).insert([payload]).select().single();
      else if (action === 'update') {
        const { id, user_id, ...updateData } = payload;
        response = await supabase.from(table).update(updateData).eq('id', id).eq('user_id', userId).select().single();
      } else if (action === 'delete') {
        response = await supabase.from(table).delete().eq('id', data.id).eq('user_id', userId);
      }
      
      if (response?.error) throw response.error;
      await fetchData();
    } catch (error: any) {
      alert(`Erro no Banco: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    const inputEmail = loginForm.email.toLowerCase().trim();
    const inputPassword = loginForm.password.trim();
    
    if (!inputEmail || !inputPassword) return alert("Por favor, digite e-mail e senha.");
    
    setIsLoggingIn(true);

    // 1. FAILSAFE MASTER (Somente se NÃO for contexto de motorista)
    if (!isDriverContext && inputEmail === 'admin@aurilog.com' && inputPassword === 'admin123') {
      setCurrentUser({ id: '00000000-0000-0000-0000-000000000000', name: 'Gestor Master', email: 'admin@aurilog.com' });
      setAuthRole('ADMIN');
      setIsLoggingIn(false);
      return;
    }

    try {
      // Tabela baseada no contexto da URL
      const table = isDriverContext ? 'drivers' : 'admins';
      const { data: dbUser, error } = await supabase.from(table)
        .select('*')
        .eq('email', inputEmail)
        .eq('password', inputPassword)
        .maybeSingle();
      
      if (error) throw new Error(`Conexão com banco falhou: ${error.message}`);

      if (!dbUser) {
        throw new Error(`Credenciais inválidas no Portal ${isDriverContext ? 'do Motorista' : 'Administrativo'}.`);
      }
      
      setCurrentUser(dbUser);
      setAuthRole(isDriverContext ? 'DRIVER' : 'ADMIN');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthRole(null);
    setCurrentUser(null);
    setLoginForm({ email: '', password: '' });
  };

  const handleOpenDriverAppInNewTab = () => {
    const url = window.location.origin + '?mode=driver';
    window.open(url, '_blank');
  };

  // TELA DE LOGIN INDEPENDENTE - MOTORISTA (Só aparece se mode=driver)
  if (!authRole && isDriverContext) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
        <div className="w-full max-w-md relative z-10 space-y-10 animate-fade-in">
          <div className="text-center">
             <div className="inline-block p-4 bg-primary-600 text-white rounded-[2rem] shadow-2xl shadow-primary-600/30 mb-8">
                <Truck size={40} />
             </div>
             <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">AURILOG</h1>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mt-4">Aplicativo do Motorista</p>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] border shadow-2xl space-y-8">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-600 transition-colors" size={20} />
                <input 
                  type="email" 
                  placeholder="Seu E-mail" 
                  className="w-full bg-slate-50 border-none p-6 pl-16 rounded-3xl text-slate-900 outline-none focus:ring-4 focus:ring-primary-600/10 transition-all font-bold placeholder:text-slate-300" 
                  value={loginForm.email} 
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})} 
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-600 transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Sua Senha" 
                  className="w-full bg-slate-50 border-none p-6 pl-16 rounded-3xl text-slate-900 outline-none focus:ring-4 focus:ring-primary-600/10 transition-all font-bold placeholder:text-slate-300" 
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                />
              </div>
            </div>

            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full py-6 bg-primary-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl shadow-primary-600/30 active:scale-95 transition-all flex items-center justify-center gap-3">
              {isLoggingIn ? <Loader2 className="animate-spin" /> : <ExternalLink size={20} />}
              Acessar Aplicativo
            </button>
          </div>
          
          <div className="text-center opacity-40 px-8">
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
               Problemas com o acesso? Entre em contato com seu gestor de frota.
             </p>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE LOGIN INDEPENDENTE - GESTÃO (TELA PADRÃO DO APP)
  if (!authRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary-900/30 rounded-full blur-[180px]"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-900/20 rounded-full blur-[180px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 space-y-8 animate-fade-in">
          <div className="text-center">
             <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-6">
                Management Portal
             </div>
             <h1 className="text-6xl font-black tracking-tighter text-white leading-none">AURI<span className="text-amber-500">LOG</span></h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Painel de Auditoria e Controle de Frota</p>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
            <div className="space-y-4">
              <div className="relative group">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={20} />
                <input 
                  type="email" 
                  placeholder="E-mail Administrativo" 
                  className="w-full bg-white/5 border border-white/10 p-6 pl-16 rounded-3xl text-white outline-none focus:ring-4 focus:ring-amber-500/20 transition-all font-bold placeholder:text-slate-700" 
                  value={loginForm.email} 
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})} 
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Senha de Gestor" 
                  className="w-full bg-white/5 border border-white/10 p-6 pl-16 rounded-3xl text-white outline-none focus:ring-4 focus:ring-amber-500/20 transition-all font-bold placeholder:text-slate-700" 
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                />
              </div>
            </div>

            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full py-6 bg-amber-600 text-white rounded-3xl font-black uppercase text-xs shadow-2xl shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-3">
              {isLoggingIn ? <Loader2 className="animate-spin" /> : <Database size={20} />}
              Entrar no Painel Master
            </button>
          </div>
          
          <div className="text-center opacity-30">
             <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Acesso Restrito a Administradores</p>
          </div>
        </div>
      </div>
    );
  }

  // Visualização Admin
  if (authRole === 'ADMIN') {
    return <AdminPanel onRefresh={() => {}} onLogout={handleLogout} onUnlockDriverApp={handleOpenDriverAppInNewTab} />;
  }

  // Visualização Motorista (Operacional)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-['Plus_Jakarta_Sans'] overflow-hidden">
      <div className={`fixed md:relative inset-0 md:inset-auto z-40 bg-white md:bg-transparent ${isMenuOpen ? 'flex' : 'hidden'} md:flex md:w-80 md:flex-col md:border-r p-6 md:sticky md:top-0 md:h-screen transition-all shadow-sm`}>
        <div className="flex md:flex-col justify-between items-center md:items-start mb-10 w-full">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-primary-600">AURILOG</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Olá, {currentUser?.name?.split(' ')[0]}</p>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="md:hidden p-3 bg-slate-100 rounded-full"><X size={24}/></button>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.DASHBOARD ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => { setCurrentView(AppView.TRIPS); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.TRIPS ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><MapIcon size={20} /> Viagens</button>
          <button onClick={() => { setCurrentView(AppView.EXPENSES); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.EXPENSES ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><ReceiptText size={20} /> Financeiro</button>
          <button onClick={() => { setCurrentView(AppView.VEHICLES); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.VEHICLES ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Truck size={20} /> Frota</button>
          <button onClick={() => { setCurrentView(AppView.MAINTENANCE); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.MAINTENANCE ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Wrench size={20} /> Manutenção</button>
          <button onClick={() => { setCurrentView(AppView.CALCULATOR); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.CALCULATOR ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Calculator size={20} /> ANTT</button>
          <button onClick={() => { setCurrentView(AppView.JORNADA); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.JORNADA ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Timer size={20} /> Jornada</button>
          <button onClick={() => { setCurrentView(AppView.STATIONS); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.STATIONS ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><MapPinned size={20} /> Radar</button>
        </div>

        <div className="mt-6 pt-6 border-t space-y-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'Conectado' : 'Offline'}
          </div>
          {/* Fix: Added missing onClick attribute for the logout button */}
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-rose-500 hover:bg-rose-50 transition-all">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="md:hidden bg-white p-4 flex justify-between items-center border-b sticky top-0 z-30">
          <h1 className="text-xl font-black text-primary-600 tracking-tighter">AURILOG</h1>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-500"><Menu size={24}/></button>
        </div>
        
        <div className="max-w-7xl mx-auto p-4 md:p-10">
          {currentView === AppView.DASHBOARD && <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setCurrentView} />}
          {currentView === AppView.TRIPS && <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={(t) => handleAction('trips', t, 'insert')} onUpdateTrip={(id, t) => handleAction('trips', { ...t, id }, 'update')} onUpdateStatus={async (id, s, km) => { await handleAction('trips', { id, status: s }, 'update'); if (km) { const trip = trips.find(x => x.id === id); if (trip?.vehicle_id) await handleAction('vehicles', { id: trip.vehicle_id, current_km: km }, 'update'); } }} onDeleteTrip={(id) => handleAction('trips', { id }, 'delete')} isSaving={isSaving} isOnline={isOnline} />}
          {currentView === AppView.EXPENSES && <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={(e) => handleAction('expenses', e, 'insert')} onUpdateExpense={(id, e) => handleAction('expenses', { ...e, id }, 'update')} onDeleteExpense={(id) => handleAction('expenses', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.VEHICLES && <VehicleManager vehicles={vehicles} onAddVehicle={(v) => handleAction('vehicles', v, 'insert')} onUpdateVehicle={(id, v) => handleAction('vehicles', { ...v, id }, 'update')} onDeleteVehicle={(id) => handleAction('vehicles', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.MAINTENANCE && <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={(m) => handleAction('maintenance', m, 'insert')} onDeleteMaintenance={(id) => handleAction('maintenance', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.CALCULATOR && <FreightCalculator />}
          {currentView === AppView.JORNADA && <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaCurrentTime} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setStartTime => setJornadaStartTime(setStartTime)} onSaveLog={(l) => handleAction('jornada_logs', l, 'insert')} onDeleteLog={(id) => handleAction('jornada_logs', { id }, 'delete')} onClearHistory={async () => {}} addGlobalNotification={() => {}} isSaving={isSaving} />}
          {currentView === AppView.STATIONS && <StationLocator />}
        </div>
      </main>

      {showNotifications && (
        <NotificationCenter notifications={notifications as any} onClose={() => setShowNotifications(false)} onAction={(cat) => { setCurrentView(cat as AppView); setShowNotifications(false); }} onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      )}
    </div>
  );
};

export default App;