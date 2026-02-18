
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, JornadaLog, DbNotification, TripStatus, Driver, RoadService } from './types';
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
  AlertCircle
} from 'lucide-react';

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isDriverContext = queryParams.get('mode') === 'driver';

  const [authRole, setAuthRole] = useState<'DRIVER' | 'ADMIN' | null>(() => {
    const savedRole = localStorage.getItem('aurilog_role') as 'DRIVER' | 'ADMIN' | null;
    if (!savedRole) return null;
    if (isDriverContext && savedRole === 'DRIVER') return 'DRIVER';
    if (!isDriverContext && savedRole === 'ADMIN') return 'ADMIN';
    return null;
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('aurilog_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([]);
  const [jornadaLogs, setJornadaLogs] = useState<JornadaLog[]>([]);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [roadServices, setRoadServices] = useState<RoadService[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Rastreamento GPS para Motoristas
  useEffect(() => {
    if (authRole === 'DRIVER' && currentUser && isOnline) {
      const updateLocation = () => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await supabase.from('user_locations').upsert({
            user_id: currentUser.id,
            email: currentUser.email,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
        });
      };

      updateLocation();
      const interval = setInterval(updateLocation, 30000);
      return () => clearInterval(interval);
    }
  }, [authRole, currentUser, isOnline]);

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
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, jornadaRes, notificationsRes, servicesRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', userId).order('plate', { ascending: true }),
        supabase.from('maintenance').select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
        supabase.from('jornada_logs').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
        supabase.from('notifications').select('*').or(`target_user_email.is.null,target_user_email.eq.${currentUser.email}`).order('created_at', { ascending: false }),
        supabase.from('road_services').select('*').order('name', { ascending: true })
      ]);
      
      if (tripsRes.data) setTrips(tripsRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setMaintenance(maintenanceRes.data);
      if (jornadaRes.data) setJornadaLogs(jornadaRes.data);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
      if (servicesRes.data) setRoadServices(servicesRes.data);
    } catch (error) {
      console.warn("Modo Offline");
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
      console.error(error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    const inputEmail = loginForm.email.toLowerCase().trim();
    const inputPassword = loginForm.password.trim();
    if (!inputEmail || !inputPassword) return alert("Digite e-mail e senha.");
    setIsLoggingIn(true);
    try {
      const table = isDriverContext ? 'drivers' : 'admins';
      const role = isDriverContext ? 'DRIVER' : 'ADMIN';

      if (!isDriverContext && inputEmail === 'admin@aurilog.com' && inputPassword === 'admin123') {
        const masterUser = { id: '00000000-0000-0000-0000-000000000000', name: 'Gestor Master', email: 'admin@aurilog.com' };
        setCurrentUser(masterUser);
        setAuthRole('ADMIN');
        localStorage.setItem('aurilog_role', 'ADMIN');
        localStorage.setItem('aurilog_user', JSON.stringify(masterUser));
        return;
      }

      const { data: dbUser, error } = await supabase.from(table).select('*').eq('email', inputEmail).eq('password', inputPassword).maybeSingle();
      if (error) throw error;
      if (!dbUser) throw new Error("Credenciais inválidas.");

      setCurrentUser(dbUser);
      setAuthRole(role);
      localStorage.setItem('aurilog_role', role);
      localStorage.setItem('aurilog_user', JSON.stringify(dbUser));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthRole(null);
    setCurrentUser(null);
    localStorage.removeItem('aurilog_role');
    localStorage.removeItem('aurilog_user');
  };

  if (!authRole) {
    return (
      <div className={`min-h-screen ${isDriverContext ? 'bg-slate-50' : 'bg-slate-950'} flex flex-col items-center justify-center p-6 font-['Plus_Jakarta_Sans']`}>
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center">
             <div className={`inline-block p-4 ${isDriverContext ? 'bg-primary-600' : 'bg-amber-500'} text-white rounded-[2rem] shadow-2xl mb-8`}>
                {isDriverContext ? <Truck size={40} /> : <ShieldCheck size={40} />}
             </div>
             <h1 className={`text-5xl font-black tracking-tighter ${isDriverContext ? 'text-slate-900' : 'text-white'}`}>
               AURI<span className={isDriverContext ? 'text-primary-600' : 'text-amber-500'}>LOG</span>
             </h1>
             <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mt-4">
               {isDriverContext ? 'Portal do Motorista' : 'Painel de Gestão'}
             </p>
          </div>
          <div className={`${isDriverContext ? 'bg-white' : 'bg-white/5 border border-white/10'} p-10 rounded-[3rem] shadow-2xl space-y-6`}>
            <div className="space-y-4">
              <input type="email" placeholder="E-mail" className={`w-full p-6 rounded-3xl font-bold outline-none ${isDriverContext ? 'bg-slate-50 text-slate-900' : 'bg-white/5 text-white'}`} value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              <input type="password" placeholder="Senha" className={`w-full p-6 rounded-3xl font-bold outline-none ${isDriverContext ? 'bg-slate-50 text-slate-900' : 'bg-white/5 text-white'}`} value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            <button onClick={handleLogin} disabled={isLoggingIn} className={`w-full py-6 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all text-white ${isDriverContext ? 'bg-primary-600' : 'bg-amber-600'}`}>
              {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authRole === 'ADMIN') {
    return <AdminPanel onRefresh={fetchData} onLogout={handleLogout} onUnlockDriverApp={() => window.open(window.location.origin + '?mode=driver', '_blank')} />;
  }

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
          <button onClick={() => { setCurrentView(AppView.CALCULATOR); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.CALCULATOR ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Calculator size={20} /> Calculadora</button>
          <button onClick={() => { setCurrentView(AppView.JORNADA); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.JORNADA ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><Timer size={20} /> Jornada</button>
          <button onClick={() => { setCurrentView(AppView.STATIONS); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === AppView.STATIONS ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}><MapPinned size={20} /> Radar</button>
        </div>

        <div className="mt-6 pt-6 border-t space-y-4">
          <button onClick={() => setShowNotifications(true)} className="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-100 transition-all relative">
            <div className="flex items-center gap-4">
              <Bell size={20} /> Alertas
            </div>
            {notifications.length > 0 && (
              <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-rose-500 hover:bg-rose-50 transition-all">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto h-screen relative">
        <div className="md:hidden bg-white p-4 flex justify-between items-center border-b sticky top-0 z-30">
          <h1 className="text-xl font-black text-primary-600">AURILOG</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(true)} className="p-3 bg-slate-50 rounded-xl text-slate-500 relative">
              <Bell size={24}/>
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">{notifications.length}</span>}
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-50 rounded-xl text-slate-500"><Menu size={24}/></button>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto p-4 md:p-10">
          {currentView === AppView.DASHBOARD && <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setCurrentView} />}
          {currentView === AppView.TRIPS && <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={(t) => handleAction('trips', t, 'insert')} onUpdateTrip={(id, t) => handleAction('trips', { ...t, id }, 'update')} onUpdateStatus={async (id, s, km) => { await handleAction('trips', { id, status: s }, 'update'); if (km) { const trip = trips.find(x => x.id === id); if (trip?.vehicle_id) await handleAction('vehicles', { id: trip.vehicle_id, current_km: km }, 'update'); } }} onDeleteTrip={(id) => handleAction('trips', { id }, 'delete')} isSaving={isSaving} isOnline={isOnline} />}
          {currentView === AppView.EXPENSES && <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={(e) => handleAction('expenses', e, 'insert')} onUpdateExpense={(id, e) => handleAction('expenses', { ...e, id }, 'update')} onDeleteExpense={(id) => handleAction('expenses', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.VEHICLES && <VehicleManager vehicles={vehicles} onAddVehicle={(v) => handleAction('vehicles', v, 'insert')} onUpdateVehicle={(id, v) => handleAction('vehicles', { ...v, id }, 'update')} onDeleteVehicle={(id) => handleAction('vehicles', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.MAINTENANCE && <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={(m) => handleAction('maintenance', m, 'insert')} onDeleteMaintenance={(id) => handleAction('maintenance', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.CALCULATOR && <FreightCalculator />}
          {currentView === AppView.JORNADA && <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaCurrentTime} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setJornadaStartTime} onSaveLog={(l) => handleAction('jornada_logs', l, 'insert')} onDeleteLog={(id) => handleAction('jornada_logs', { id }, 'delete')} onClearHistory={async () => {}} addGlobalNotification={() => {}} isSaving={isSaving} />}
          {currentView === AppView.STATIONS && <StationLocator roadServices={roadServices} />}
        </div>
      </main>

      {showNotifications && (
        <NotificationCenter notifications={notifications as any} onClose={() => setShowNotifications(false)} onAction={(cat) => { setCurrentView(cat as AppView); setShowNotifications(false); }} onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      )}
    </div>
  );
};

export default App;
