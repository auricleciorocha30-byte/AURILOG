
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, JornadaLog, DbNotification, RoadService, CargoCategory, TripStatus } from './types';
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
  WifiOff,
  Navigation,
  Download
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
  
  // Notificações do Banco (Comunicados)
  const [dbNotifications, setDbNotifications] = useState<DbNotification[]>([]);
  // IDs de notificações dispensadas permanentemente pelo usuário local
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('aurilog_dismissed_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [roadServices, setRoadServices] = useState<RoadService[]>([]);
  const [cargoCategories, setCargoCategories] = useState<CargoCategory[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Estado para PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const [jornadaMode, setJornadaMode] = useState<'IDLE' | 'DRIVING' | 'RESTING'>('IDLE');
  const [jornadaStartTime, setJornadaStartTime] = useState<number | null>(null);
  const [jornadaCurrentTime, setJornadaCurrentTime] = useState(0);

  // Captura evento de instalação PWA
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Rastreamento de Localização (Apenas para Motoristas)
  useEffect(() => {
    if (authRole === 'DRIVER' && currentUser && isOnline) {
      const updateLocation = () => {
        if (!navigator.geolocation) {
          setIsGpsActive(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            setIsGpsActive(true);
            try {
              await supabase.from('user_locations').upsert({
                user_id: currentUser.id,
                email: currentUser.email,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                updated_at: new Date().toISOString()
              });
            } catch (err) {
              console.error("Erro ao enviar localização:", err);
            }
          }, 
          (error) => {
            console.warn("Erro de GPS:", error.message);
            setIsGpsActive(false);
          }, 
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      };
      
      const interval = setInterval(updateLocation, 30000); // Atualiza a cada 30 segundos para maior precisão no admin
      updateLocation();
      return () => clearInterval(interval);
    }
  }, [authRole, currentUser, isOnline]);

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
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, jornadaRes, notificationsRes, servicesRes, categoriesRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', userId).order('plate', { ascending: true }),
        supabase.from('maintenance').select('*').eq('user_id', userId).order('purchase_date', { ascending: false }),
        supabase.from('jornada_logs').select('*').eq('user_id', userId).order('start_time', { ascending: false }),
        supabase.from('notifications').select('*').or(`target_user_email.is.null,target_user_email.eq.${currentUser.email}`).order('created_at', { ascending: false }),
        supabase.from('road_services').select('*').order('name', { ascending: true }),
        supabase.from('cargo_categories').select('*').order('name', { ascending: true })
      ]);
      if (tripsRes.data) setTrips(tripsRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setMaintenance(maintenanceRes.data);
      if (jornadaRes.data) setJornadaLogs(jornadaRes.data);
      if (notificationsRes.data) setDbNotifications(notificationsRes.data);
      if (servicesRes.data) setRoadServices(servicesRes.data);
      if (categoriesRes.data) setCargoCategories(categoriesRes.data);
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

  // --- GERAÇÃO DE NOTIFICAÇÕES AUTOMÁTICAS DO SISTEMA (SININHO INTELIGENTE) ---
  const systemNotifications = useMemo(() => {
    const alerts: DbNotification[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Define janela de 3 dias para frente
    const daysAheadLimit = 3;
    const futureLimitDate = new Date(today);
    futureLimitDate.setDate(today.getDate() + daysAheadLimit);

    // 1. Alertas de Viagem (Próximos 3 dias)
    trips.forEach(t => {
      if (t.status === TripStatus.SCHEDULED) {
        const tripDate = new Date(t.date + 'T00:00:00');
        if (tripDate >= today && tripDate <= futureLimitDate) {
          const diffTime = tripDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let title = '';
          if (diffDays === 0) title = 'Viagem Hoje';
          else if (diffDays === 1) title = 'Viagem Amanhã';
          else title = `Viagem em ${diffDays} dias`;

          alerts.push({
            id: `sys-trip-${t.id}`,
            title: title,
            message: `Preparar: ${t.origin.split('-')[0]} ➔ ${t.destination.split('-')[0]}`,
            type: diffDays <= 1 ? 'WARNING' : 'INFO',
            category: 'TRIP',
            created_at: new Date().toISOString(),
            sender: 'Assistente de Viagem'
          });
        }
      }
    });

    // 2. Alertas Financeiros (Vencidos ou Vencendo em até 3 dias)
    expenses.forEach(e => {
      if (!e.is_paid && e.due_date) {
        const dueDateObj = new Date(e.due_date + 'T12:00:00');
        dueDateObj.setHours(0,0,0,0);
        
        if (dueDateObj < today) {
          // Atrasado
          alerts.push({
            id: `sys-exp-late-${e.id}`,
            title: 'Conta em Atraso',
            message: `${e.description} venceu em ${new Date(e.due_date).toLocaleDateString()}. R$ ${e.amount}`,
            type: 'URGENT',
            category: 'FINANCE',
            created_at: new Date().toISOString(),
            sender: 'Financeiro'
          });
        } else if (dueDateObj <= futureLimitDate) {
           // Vence hoje ou em breve (até 3 dias)
           const diffTime = dueDateObj.getTime() - today.getTime();
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           
           let title = '';
           let type: 'URGENT' | 'WARNING' | 'INFO' = 'INFO';

           if (diffDays === 0) {
              title = 'Vence Hoje';
              type = 'URGENT';
           } else if (diffDays === 1) {
              title = 'Vence Amanhã';
              type = 'WARNING';
           } else {
              title = `Vence em ${diffDays} dias`;
              type = 'WARNING';
           }

           alerts.push({
            id: `sys-exp-soon-${e.id}`,
            title: title,
            message: `Pagamento pendente: ${e.description}. R$ ${e.amount}`,
            type: type,
            category: 'FINANCE',
            created_at: new Date().toISOString(),
            sender: 'Financeiro'
          });
        }
      }
    });

    // 3. Alertas de Manutenção (Preventiva)
    maintenance.forEach(m => {
       const vehicle = vehicles.find(v => v.id === m.vehicle_id);
       if (vehicle) {
          const limitKm = (m.km_at_purchase || 0) + (m.warranty_km || 0);
          const kmLeft = limitKm - vehicle.current_km;
          
          if (m.warranty_km > 0 && kmLeft <= 1000 && kmLeft > 0) {
             alerts.push({
                id: `sys-maint-${m.id}`,
                title: 'Manutenção Próxima',
                message: `${m.part_name} (${vehicle.plate}) vence em ${kmLeft} KM.`,
                type: 'WARNING',
                category: 'MAINTENANCE',
                created_at: new Date().toISOString(),
                sender: 'Oficina'
             });
          } else if (m.warranty_km > 0 && kmLeft <= 0) {
             alerts.push({
                id: `sys-maint-over-${m.id}`,
                title: 'Manutenção Vencida',
                message: `${m.part_name} (${vehicle.plate}) excedeu o limite.`,
                type: 'URGENT',
                category: 'MAINTENANCE',
                created_at: new Date().toISOString(),
                sender: 'Oficina'
             });
          }
       }
    });

    return alerts;
  }, [trips, expenses, maintenance, vehicles]);

  // Combina notificações do banco (filtrando as excluídas) com as do sistema
  const activeNotifications = useMemo(() => {
    // Filtra comunicados do banco que o usuário já "apagou"
    const visibleDbNotifications = dbNotifications.filter(n => !dismissedNotificationIds.includes(n.id));
    
    // Junta com os alertas automáticos do sistema (esses não são salvos no banco, são gerados na hora)
    // Ordena: Urgentes primeiro, depois por data
    return [...systemNotifications, ...visibleDbNotifications].sort((a, b) => {
       if (a.type === 'URGENT' && b.type !== 'URGENT') return -1;
       if (b.type === 'URGENT' && a.type !== 'URGENT') return 1;
       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dbNotifications, systemNotifications, dismissedNotificationIds]);

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
      if (error || !dbUser) throw new Error("Credenciais inválidas.");
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

  const handleDismissNotification = async (id: string) => {
    // Se for notificação de sistema (começa com 'sys-'), apenas removemos visualmente da lista ativa
    // (na prática, ela só sumirá definitivamente se o usuário resolver a pendência, ex: pagar a conta)
    // Mas para comunicados do banco (Admin), salvamos no localStorage para nunca mais mostrar
    
    if (!id.startsWith('sys-')) {
        const newDismissed = [...dismissedNotificationIds, id];
        setDismissedNotificationIds(newDismissed);
        localStorage.setItem('aurilog_dismissed_notifications', JSON.stringify(newDismissed));
    }
    
    // Força atualização removendo da lista atual (para UX imediata)
    // Para alertas de sistema, se a condição persistir, ele volta na próxima renderização ou login
    // Para comunicados, o filtro 'activeNotifications' garantirá que não volte.
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
             </h1>
             <p className={`font-bold uppercase tracking-[0.3em] text-[10px] mt-4 ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>
               {isAdmin ? 'Módulo de Gestão Administrativa' : 'Portal Operacional do Condutor'}
             </p>
          </div>
          <div className={`${isAdmin ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'} border backdrop-blur-2xl p-10 rounded-[4rem] shadow-2xl space-y-8`}>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-1 tracking-widest ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>Acesso</label>
                <input required type="email" placeholder="E-mail" className={`w-full p-6 rounded-3xl font-bold outline-none border-2 border-transparent ${isAdmin ? 'bg-white/5 text-white focus:border-amber-500' : 'bg-slate-50 text-slate-900 focus:border-primary-500'} transition-all`} value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-1 tracking-widest ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`}>Chave</label>
                <input required type="password" placeholder="••••••••" className={`w-full p-6 rounded-3xl font-bold outline-none border-2 border-transparent ${isAdmin ? 'bg-white/5 text-white focus:border-amber-500' : 'bg-slate-50 text-slate-900 focus:border-primary-500'} transition-all`} value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
              </div>
              <button type="submit" disabled={isLoggingIn} className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-primary-600 text-white'}`}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : <>Entrar no Sistema <ChevronRight size={18} /></>}
              </button>
            </form>
          </div>
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
      {/* Sidebar Desktop */}
      <div className={`fixed md:relative inset-0 md:inset-auto z-[60] md:z-40 bg-white md:bg-transparent ${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:w-80 md:border-r p-6 md:sticky md:top-0 md:h-screen transition-all shadow-2xl md:shadow-none`}>
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
          {installPrompt && (
            <button 
              onClick={handleInstallClick} 
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase bg-slate-900 text-white hover:bg-black transition-all shadow-lg animate-pulse"
            >
              <Download size={20} /> Instalar Aplicativo
            </button>
          )}

          <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Navigation size={14} className={isGpsActive ? 'text-emerald-500' : 'text-slate-300'} />
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">GPS Status</span>
             </div>
             <div className={`w-2 h-2 rounded-full ${isGpsActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-slate-300'}`}></div>
          </div>
          <button onClick={() => setShowNotifications(true)} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-slate-500 hover:bg-slate-100 transition-all relative">
            <Bell size={20} /> Notificações
            {activeNotifications.length > 0 && <span className="absolute top-4 left-10 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-rose-500 hover:bg-rose-50 transition-all"><LogOut size={20} /> Sair</button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto h-full relative">
        {/* Header Mobile */}
        <div className="md:hidden bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b sticky top-0 z-50 safe-top">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-50 rounded-xl text-slate-500"><MoreHorizontal size={24}/></button>
             <h1 className="text-xl font-black text-primary-600 tracking-tighter">AURILOG</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${isGpsActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
               <Navigation size={12} className={isGpsActive ? 'animate-pulse' : ''} />
               <span className="text-[9px] font-black uppercase tracking-widest">{isGpsActive ? 'GPS ON' : 'GPS OFF'}</span>
            </div>
            <button onClick={() => setShowNotifications(true)} className="p-3 bg-slate-50 rounded-xl text-slate-500 relative">
              <Bell size={24}/>
              {activeNotifications.length > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
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
          {currentView === AppView.STATIONS && <StationLocator roadServices={roadServices} savedCategories={cargoCategories} />}
        </div>
      </main>

      {showNotifications && (
        <NotificationCenter 
          notifications={activeNotifications} 
          onClose={() => setShowNotifications(false)} 
          onAction={(category) => {
            const viewMap: Record<string, AppView> = {
              'JORNADA': AppView.JORNADA,
              'MAINTENANCE': AppView.MAINTENANCE,
              'FINANCE': AppView.EXPENSES,
              'TRIP': AppView.TRIPS,
              'GENERAL': AppView.DASHBOARD
            };
            if (viewMap[category]) setCurrentView(viewMap[category]);
            setShowNotifications(false);
          }} 
          onDismiss={handleDismissNotification}
        />
      )}
    </div>
  );
};

export default App;
