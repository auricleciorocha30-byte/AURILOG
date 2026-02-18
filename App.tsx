
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  LogOut,
  ShieldCheck,
  Loader2,
  X,
  MoreHorizontal,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';

const App: React.FC = () => {
  const [appContext] = useState<'DRIVER' | 'ADMIN'>(() => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('mode') === 'driver' ? 'DRIVER' : 'ADMIN';
  });

  const [authRole, setAuthRole] = useState<'DRIVER' | 'ADMIN' | null>(() => {
    const savedRole = localStorage.getItem('aurilog_role') as 'DRIVER' | 'ADMIN' | null;
    const savedUser = localStorage.getItem('aurilog_user');
    if (savedRole === appContext && savedUser) return savedRole;
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
  const [dbNotifications, setDbNotifications] = useState<DbNotification[]>([]);
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

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    const userId = currentUser.id;
    if (!isOnline) return;

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
      if (notificationsRes.data) setDbNotifications(notificationsRes.data);
      if (servicesRes.data) setRoadServices(servicesRes.data);
    } catch (error) { console.warn("Erro ao buscar dados."); }
  }, [isOnline, currentUser]);

  const handleAction = useCallback(async (table: string, data: any, action: 'insert' | 'update' | 'delete') => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      if (isOnline) {
        let result;
        if (action === 'insert') {
          result = await supabase.from(table).insert([{ ...data, user_id: currentUser.id }]);
        } else if (action === 'update') {
          const { id, ...updateData } = data;
          result = await supabase.from(table).update(updateData).eq('id', id);
        } else if (action === 'delete') {
          result = await supabase.from(table).delete().eq('id', data.id);
        }
        if (result?.error) throw result.error;
      } else {
        await offlineStorage.save(table, { ...data, user_id: currentUser.id }, action);
      }
      await fetchData();
    } catch (err: any) { alert("Erro: " + err.message); } finally { setIsSaving(false); }
  }, [currentUser, isOnline, fetchData]);

  useEffect(() => { if (currentUser) fetchData(); }, [fetchData, currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEmail = loginForm.email.toLowerCase().trim();
    const inputPassword = loginForm.password.trim();
    if (!inputEmail || !inputPassword) return;
    setIsLoggingIn(true);
    try {
      if (appContext === 'ADMIN' && inputEmail === 'admin@aurilog.com' && inputPassword === 'admin123') {
        const masterUser = { id: '00000000-0000-0000-0000-000000000000', name: 'Gestor Master', email: 'admin@aurilog.com' };
        setCurrentUser(masterUser);
        setAuthRole('ADMIN');
        localStorage.setItem('aurilog_role', 'ADMIN');
        localStorage.setItem('aurilog_user', JSON.stringify(masterUser));
        return;
      }
      const table = appContext === 'DRIVER' ? 'drivers' : 'admins';
      const { data: dbUser, error } = await supabase.from(table).select('*').eq('email', inputEmail).eq('password', inputPassword).maybeSingle();
      if (error || !dbUser) throw new Error("Credenciais inválidas para este acesso.");
      setCurrentUser(dbUser);
      setAuthRole(appContext);
      localStorage.setItem('aurilog_role', appContext);
      localStorage.setItem('aurilog_user', JSON.stringify(dbUser));
    } catch (err: any) { alert(err.message); } finally { setIsLoggingIn(false); }
  };

  const handleLogout = () => {
    setAuthRole(null);
    setCurrentUser(null);
    localStorage.removeItem('aurilog_role');
    localStorage.removeItem('aurilog_user');
  };

  if (!authRole) {
    const isAdmin = appContext === 'ADMIN';
    return (
      <div className={`min-h-screen ${isAdmin ? 'bg-slate-950' : 'bg-slate-50'} flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Plus_Jakarta_Sans']`}>
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${isAdmin ? 'bg-amber-500/10' : 'bg-primary-600/5'} blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2`}></div>
        <div className="w-full max-w-md space-y-10 animate-fade-in z-10">
          <div className="text-center">
             <div className={`inline-block p-6 ${isAdmin ? 'bg-amber-500 text-slate-950 shadow-amber-500/20' : 'bg-primary-600 text-white shadow-primary-600/20'} rounded-[2.5rem] shadow-2xl mb-8`}>
                {isAdmin ? <ShieldCheck size={48} /> : <Truck size={48} />}
             </div>
             <h1 className={`text-5xl font-black tracking-tighter ${isAdmin ? 'text-white' : 'text-slate-900'}`}>
               AURI<span className={isAdmin ? 'text-amber-500' : 'text-primary-600'}>LOG</span>
               <span className={`text-[10px] ml-2 px-3 py-1 rounded-full uppercase tracking-widest ${isAdmin ? 'bg-white/10 text-slate-400' : 'bg-primary-100 text-primary-600'}`}>
                 {isAdmin ? 'GESTOR' : 'OPERACIONAL'}
               </span>
             </h1>
             <p className={`font-bold uppercase tracking-[0.3em] text-[10px] mt-4 ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>
               {isAdmin ? 'Controle Mestre de Logística' : 'Portal do Condutor Profissional'}
             </p>
          </div>
          <div className={`${isAdmin ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'} border backdrop-blur-2xl p-10 rounded-[4rem] shadow-2xl space-y-8`}>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-1 tracking-widest ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>E-mail de Acesso</label>
                <input required type="email" placeholder={isAdmin ? "gestor@aurilog.com" : "motorista@aurilog.com"} className={`w-full p-6 rounded-3xl font-bold outline-none border-2 border-transparent ${isAdmin ? 'bg-white/5 text-white focus:border-amber-500' : 'bg-slate-50 text-slate-900 focus:border-primary-500'} transition-all`} value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-1 tracking-widest ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>Sua Senha</label>
                <input required type="password" placeholder="••••••••" className={`w-full p-6 rounded-3xl font-bold outline-none border-2 border-transparent ${isAdmin ? 'bg-white/5 text-white focus:border-amber-500' : 'bg-slate-50 text-slate-900 focus:border-primary-500'} transition-all`} value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
              </div>
              <button type="submit" disabled={isLoggingIn} className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-primary-600 text-white'}`}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : <>Entrar no Sistema <ChevronRight size={18} /></>}
              </button>
            </form>
          </div>
          <p className={`text-center text-[9px] font-bold uppercase tracking-widest ${isAdmin ? 'text-slate-700' : 'text-slate-300'}`}>© 2024 AuriLog Solutions</p>
        </div>
      </div>
    );
  }

  if (authRole === 'ADMIN') return <AdminPanel onRefresh={fetchData} onLogout={handleLogout} />;

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button onClick={() => { setCurrentView(view); setIsMenuOpen(false); }} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentView === view ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>
      <Icon size={20} /> {label}
    </button>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row font-['Plus_Jakarta_Sans'] overflow-hidden">
      <div className={`fixed md:relative inset-0 md:inset-auto z-[60] md:z-40 bg-white md:bg-transparent ${isMenuOpen ? 'flex' : 'hidden'} md:flex md:w-80 md:flex-col md:border-r p-6 md:sticky md:top-0 md:h-screen transition-all shadow-2xl md:shadow-none`}>
        <div className="flex md:flex-col justify-between items-center md:items-start mb-10 w-full safe-top">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-primary-600">AURILOG</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Olá, {currentUser?.name?.split(' ')[0]}</p>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="md:hidden p-3 bg-slate-100 rounded-full"><X size={24}/></button>
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={AppView.TRIPS} icon={MapIcon} label="Viagens" />
          <NavItem view={AppView.EXPENSES} icon={ReceiptText} label="Financeiro" />
          <NavItem view={AppView.VEHICLES} icon={Truck} label="Frota" />
          <NavItem view={AppView.MAINTENANCE} icon={Wrench} label="Manutenção" />
          <NavItem view={AppView.CALCULATOR} icon={Calculator} label="Calculadora" />
          <NavItem view={AppView.JORNADA} icon={Timer} label="Jornada" />
          <NavItem view={AppView.STATIONS} icon={MapPinned} label="Radar" />
        </div>
        <div className="mt-6 pt-6 border-t space-y-4 safe-bottom">
          <button onClick={() => setShowNotifications(true)} className="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-100 transition-all relative">
            <div className="flex items-center gap-4"><Bell size={20} /> Alertas</div>
            {dbNotifications.length > 0 && <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">{dbNotifications.length}</span>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-rose-500 hover:bg-rose-50 transition-all"><LogOut size={20} /> Sair</button>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto h-full relative">
        <div className="md:hidden bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b sticky top-0 z-50 safe-top">
          <h1 className="text-xl font-black text-primary-600 tracking-tighter">AURILOG</h1>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isOnline ? <Wifi size={10}/> : <WifiOff size={10}/>} {isOnline ? 'Online' : 'Offline'}
            </div>
            <button onClick={() => setShowNotifications(true)} className="p-3 bg-slate-50 rounded-xl text-slate-500 relative"><Bell size={24}/></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-4 md:p-10 pb-32">
          {currentView === AppView.DASHBOARD && <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setCurrentView} />}
          {currentView === AppView.TRIPS && <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={(t) => handleAction('trips', t, 'insert')} onUpdateTrip={(id, t) => handleAction('trips', { ...t, id }, 'update')} onUpdateStatus={async (id, s, km) => { await handleAction('trips', { id, status: s }, 'update'); if (km && trips.find(x => x.id === id)?.vehicle_id) await handleAction('vehicles', { id: trips.find(x => x.id === id)!.vehicle_id, current_km: km }, 'update'); }} onDeleteTrip={(id) => handleAction('trips', { id }, 'delete')} isSaving={isSaving} isOnline={isOnline} />}
          {currentView === AppView.EXPENSES && <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={(e) => handleAction('expenses', e, 'insert')} onUpdateExpense={(id, e) => handleAction('expenses', { ...e, id }, 'update')} onDeleteExpense={(id) => handleAction('expenses', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.VEHICLES && <VehicleManager vehicles={vehicles} onAddVehicle={(v) => handleAction('vehicles', v, 'insert')} onUpdateVehicle={(id, v) => handleAction('vehicles', { ...v, id }, 'update')} onDeleteVehicle={(id) => handleAction('vehicles', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.MAINTENANCE && <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={(m) => handleAction('maintenance', m, 'insert')} onDeleteMaintenance={(id) => handleAction('maintenance', { id }, 'delete')} isSaving={isSaving} />}
          {currentView === AppView.CALCULATOR && <FreightCalculator />}
          {currentView === AppView.JORNADA && <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaCurrentTime} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setJornadaStartTime} onSaveLog={(l) => handleAction('jornada_logs', l, 'insert')} onDeleteLog={(id) => handleAction('jornada_logs', { id }, 'delete')} onClearHistory={async () => { if (!currentUser) return; setIsSaving(true); try { await supabase.from('jornada_logs').delete().eq('user_id', currentUser.id); setJornadaLogs([]); await fetchData(); } catch (err: any) { alert("Erro: " + err.message); } finally { setIsSaving(false); } }} addGlobalNotification={() => {}} isSaving={isSaving} />}
          {currentView === AppView.STATIONS && <StationLocator roadServices={roadServices} />}
        </div>
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center px-4 py-3 safe-bottom z-50 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          <button onClick={() => setCurrentView(AppView.DASHBOARD)} className={`flex flex-col items-center gap-1 transition-all ${currentView === AppView.DASHBOARD ? 'text-primary-600' : 'text-slate-400'}`}>
            <LayoutDashboard size={22} className={currentView === AppView.DASHBOARD ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Início</span>
          </button>
          <button onClick={() => setCurrentView(AppView.TRIPS)} className={`flex flex-col items-center gap-1 transition-all ${currentView === AppView.TRIPS ? 'text-primary-600' : 'text-slate-400'}`}>
            <MapIcon size={22} className={currentView === AppView.TRIPS ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Viagens</span>
          </button>
          <button onClick={() => setCurrentView(AppView.EXPENSES)} className={`flex flex-col items-center gap-1 transition-all ${currentView === AppView.EXPENSES ? 'text-primary-600' : 'text-slate-400'}`}>
            <ReceiptText size={22} className={currentView === AppView.EXPENSES ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Finanças</span>
          </button>
          <button onClick={() => setCurrentView(AppView.JORNADA)} className={`flex flex-col items-center gap-1 transition-all ${currentView === AppView.JORNADA ? 'text-primary-600' : 'text-slate-400'}`}>
            <Timer size={22} className={currentView === AppView.JORNADA ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">Jornada</span>
          </button>
          <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
            <MoreHorizontal size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Mais</span>
          </button>
        </div>
      </main>
      {showNotifications && (
        <NotificationCenter notifications={dbNotifications as any} onClose={() => setShowNotifications(false)} onAction={(cat) => { 
          const viewMap: Record<string, AppView> = { 'TRIP': AppView.TRIPS, 'FINANCE': AppView.EXPENSES, 'MAINTENANCE': AppView.MAINTENANCE, 'JORNADA': AppView.JORNADA, 'GENERAL': AppView.DASHBOARD };
          setCurrentView(viewMap[cat] || AppView.DASHBOARD); setShowNotifications(false); 
        }} onDismiss={(id) => {}} />
      )}
    </div>
  );
};

export default App;
