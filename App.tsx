
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
  ShieldAlert, 
  Bell,
  Wifi,
  WifiOff,
  LogOut,
  Menu,
  X,
  User,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Lock,
  Smartphone,
  Building2,
  Unlock
} from 'lucide-react';

const App: React.FC = () => {
  const [authRole, setAuthRole] = useState<'DRIVER' | 'ADMIN' | null>(null);
  const [loginMode, setLoginMode] = useState<'ADMIN' | 'DRIVER'>('ADMIN');
  const [isDriverAppUnlocked, setIsDriverAppUnlocked] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

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

  // Jornada (Workday) Timer State
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
    if (authRole !== 'DRIVER' || !currentUser) return;

    if (!isOnline) {
      setTrips(await offlineStorage.getAll('trips'));
      setExpenses(await offlineStorage.getAll('expenses'));
      setVehicles(await offlineStorage.getAll('vehicles'));
      setMaintenance(await offlineStorage.getAll('maintenance'));
      setJornadaLogs(await offlineStorage.getAll('jornada_logs'));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || currentUser.id;

      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, jornadaRes, notificationsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', userId).order('plate', { ascending: true }),
        supabase.from('maintenance').select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
        supabase.from('jornada_logs').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
        supabase.from('notifications').select('*').or(`target_user_email.is.null,target_user_email.eq.${currentUser.email}`).order('created_at', { ascending: false })
      ]);

      if (tripsRes.data) { setTrips(tripsRes.data); await offlineStorage.bulkSave('trips', tripsRes.data); }
      if (expensesRes.data) { setExpenses(expensesRes.data); await offlineStorage.bulkSave('expenses', expensesRes.data); }
      if (vehiclesRes.data) { setVehicles(vehiclesRes.data); await offlineStorage.bulkSave('vehicles', vehiclesRes.data); }
      if (maintenanceRes.data) { setMaintenance(maintenanceRes.data); await offlineStorage.bulkSave('maintenance', maintenanceRes.data); }
      if (jornadaRes.data) { setJornadaLogs(jornadaRes.data); await offlineStorage.bulkSave('jornada_logs', jornadaRes.data); }
      if (notificationsRes.data) setNotifications(notificationsRes.data);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [isOnline, authRole, currentUser]);

  useEffect(() => {
    if (authRole === 'DRIVER') fetchData();
  }, [fetchData, authRole]);

  const handleAction = async (table: string, data: any, action: 'insert' | 'update' | 'delete') => {
    setIsSaving(true);
    try {
      if (!isOnline) {
        await offlineStorage.save(table, data, action);
        await fetchData();
        return;
      }

      const userId = currentUser.id;
      const payload = { ...data, user_id: userId };
      let response;

      if (action === 'insert') response = await supabase.from(table).insert([payload]).select().single();
      else if (action === 'update') {
        const { id, user_id, ...updateData } = payload;
        response = await supabase.from(table).update(updateData).eq('id', id).select().single();
      } else if (action === 'delete') response = await supabase.from(table).delete().eq('id', data.id);

      if (response?.error) throw response.error;
      await fetchData();
    } catch (error) {
      console.error(`Error in ${action} on ${table}:`, error);
      alert("Erro ao salvar dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) return alert("Preencha e-mail e senha.");
    setIsLoggingIn(true);
    try {
      if (loginMode === 'DRIVER') {
        const { data, error } = await supabase.from('drivers').select('*').eq('email', loginForm.email.toLowerCase().trim()).eq('password', loginForm.password).maybeSingle();
        if (error || !data) throw new Error("Credenciais de motorista inválidas.");
        setCurrentUser(data);
        setAuthRole('DRIVER');
      } else {
        // Admin Login Master
        if (loginForm.email === 'admin@aurilog.com' && loginForm.password === 'admin123') {
          setAuthRole('ADMIN');
          setCurrentUser({ email: 'admin@aurilog.com', name: 'Gestor Master' });
        } else {
          throw new Error("Credenciais de administrador inválidas.");
        }
      }
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
    // Ao deslogar motorista, sempre volta para o modo Admin por segurança
    setLoginMode('ADMIN');
    setIsDriverAppUnlocked(false);
  };

  const handleUnlockDriverApp = () => {
    setAuthRole(null);
    setCurrentUser(null);
    setLoginForm({ email: '', password: '' });
    setLoginMode('DRIVER');
    setIsDriverAppUnlocked(true);
  };

  // TELA DE LOGIN (Portal Inicial)
  if (!authRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']">
        {/* Efeitos de Fundo */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className={`absolute top-0 left-0 w-full h-full transition-all duration-1000 ${loginMode === 'ADMIN' ? 'bg-primary-900/40' : 'bg-emerald-900/40'}`}></div>
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary-600 rounded-full blur-[180px]"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-600 rounded-full blur-[180px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 space-y-10">
          <div className="text-center animate-fade-in">
             <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                Sistema Logístico Master
             </div>
             <h1 className="text-6xl font-black tracking-tighter text-white leading-none">AURILOG</h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-4">
                {loginMode === 'ADMIN' ? 'Portal Gestão & Controle' : 'Acesso Operacional Driver'}
             </p>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[4rem] border border-white/10 shadow-2xl space-y-8 animate-slide-up">
            
            {/* Status do Terminal */}
            <div className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-center ${loginMode === 'ADMIN' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
               {loginMode === 'ADMIN' ? 'Terminal Bloqueado: Exige Gestor' : 'Terminal Liberado: Portal Condutor'}
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors" size={20} />
                <input 
                  type="email" 
                  placeholder={loginMode === 'ADMIN' ? "E-mail Administrativo" : "E-mail do Motorista"}
                  className="w-full bg-white/5 border border-white/10 p-6 pl-14 rounded-3xl text-white outline-none focus:ring-4 focus:ring-primary-500/30 transition-all font-bold placeholder:text-slate-600"
                  value={loginForm.email}
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Senha secreta" 
                  className="w-full bg-white/5 border border-white/10 p-6 pl-14 rounded-3xl text-white outline-none focus:ring-4 focus:ring-primary-500/30 transition-all font-bold placeholder:text-slate-600"
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              onClick={handleLogin} 
              disabled={isLoggingIn}
              className={`w-full py-6 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${loginMode === 'ADMIN' ? 'bg-primary-600 text-white shadow-primary-600/30' : 'bg-emerald-600 text-white shadow-emerald-600/30'}`}
            >
              {isLoggingIn ? <Loader2 className="animate-spin" /> : loginMode === 'ADMIN' ? <ShieldCheck size={20} /> : <Truck size={20} />}
              {loginMode === 'ADMIN' ? 'Autenticar Gestor' : 'Entrar no Painel Driver'}
            </button>
            
            {loginMode === 'DRIVER' && (
              <div className="text-center pt-2">
                 <button onClick={() => { setLoginMode('ADMIN'); setIsDriverAppUnlocked(false); }} className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto">
                   <Lock size={12} /> Bloquear e voltar ao Admin
                 </button>
              </div>
            )}
          </div>
          
          <div className="text-center space-y-4 animate-fade-in">
             <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Tecnologia AuriLog Solutions v5.0</p>
          </div>
        </div>
      </div>
    );
  }

  // TELA ADMIN (Portal Master)
  if (authRole === 'ADMIN') {
    return <AdminPanel onRefresh={() => {}} onLogout={handleLogout} onUnlockDriverApp={handleUnlockDriverApp} />;
  }

  // TELA MOTORISTA (Visão Operacional)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-['Plus_Jakarta_Sans']">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b px-4 py-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-black tracking-tighter text-primary-600">AURILOG</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifications(true)} className="relative p-2 text-slate-400">
            <Bell size={24} />
            {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation - Exclusiva Motorista */}
      <div className={`${isMenuOpen ? 'fixed inset-0 z-40 bg-white' : 'hidden'} md:flex md:w-80 md:flex-col md:border-r md:bg-white p-6 md:sticky md:top-0 md:h-screen transition-all shadow-sm`}>
        <div className="hidden md:flex flex-col mb-10">
          <h1 className="text-3xl font-black tracking-tighter text-primary-600">AURILOG</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bem-vindo, {currentUser?.name?.split(' ')[0]}</p>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <button onClick={() => { setCurrentView(AppView.DASHBOARD); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.DASHBOARD ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => { setCurrentView(AppView.TRIPS); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.TRIPS ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><MapIcon size={20} /> Viagens</button>
          <button onClick={() => { setCurrentView(AppView.EXPENSES); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.EXPENSES ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><ReceiptText size={20} /> Financeiro</button>
          <button onClick={() => { setCurrentView(AppView.VEHICLES); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.VEHICLES ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Truck size={20} /> Minha Frota</button>
          <button onClick={() => { setCurrentView(AppView.MAINTENANCE); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.MAINTENANCE ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Wrench size={20} /> Manutenção</button>
          <button onClick={() => { setCurrentView(AppView.CALCULATOR); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.CALCULATOR ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Calculator size={20} /> Cálculo ANTT</button>
          <button onClick={() => { setCurrentView(AppView.JORNADA); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.JORNADA ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Timer size={20} /> Jornada</button>
          <button onClick={() => { setCurrentView(AppView.STATIONS); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.STATIONS ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><MapPinned size={20} /> Radar Estrada</button>
        </div>

        <div className="mt-6 pt-6 border-t space-y-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'Conectado' : 'Modo Offline'}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-rose-500 hover:bg-rose-50 transition-all">
            <LogOut size={20} /> Encerrar Sessão
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {currentView === AppView.DASHBOARD && <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setCurrentView} />}
          {currentView === AppView.TRIPS && <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={(t) => handleAction('trips', t, 'insert')} onUpdateTrip={(id, t) => handleAction('trips', { ...t, id }, 'update')} onUpdateStatus={async (id, s, km) => { await handleAction('trips', { id, status: s }, 'update'); if (km) { const trip = trips.find(x => x.id === id); if (trip?.vehicle_id) await handleAction('vehicles', { id: trip.vehicle_id, current_km: km }, 'update'); } }} onDeleteTrip={(id) => handleAction('trips', { id }, 'delete')} isSaving={isSaving} isOnline={isOnline} />}
          {currentView === AppView.EXPENSES && <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={(e) => handleAction('expenses', e, 'insert')} onUpdateExpense={(id, e) => handleAction('expenses', { ...e, id }, 'update')} onDeleteExpense={(id) => handleAction('expenses', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.VEHICLES && <VehicleManager vehicles={vehicles} onAddVehicle={(v) => handleAction('vehicles', v, 'insert')} onUpdateVehicle={(id, v) => handleAction('vehicles', { ...v, id }, 'update')} onDeleteVehicle={(id) => handleAction('vehicles', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.MAINTENANCE && <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={(m) => handleAction('maintenance', m, 'insert')} onDeleteMaintenance={(id) => handleAction('maintenance', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.CALCULATOR && <FreightCalculator />}
          {currentView === AppView.JORNADA && <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaCurrentTime} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setJornadaStartTime} onSaveLog={(l) => handleAction('jornada_logs', l, 'insert')} onDeleteLog={(id) => handleAction('jornada_logs', { id }, 'delete')} onClearHistory={async () => {}} addGlobalNotification={() => {}} isSaving={isSaving} />}
          {currentView === AppView.STATIONS && <StationLocator />}
        </div>
      </main>

      {showNotifications && (
        <NotificationCenter 
          notifications={notifications as any} 
          onClose={() => setShowNotifications(false)} 
          onAction={(cat) => { setCurrentView(cat as AppView); setShowNotifications(false); }} 
          onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
        />
      )}
    </div>
  );
};

export default App;
