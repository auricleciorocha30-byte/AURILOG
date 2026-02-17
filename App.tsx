
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, JornadaLog, DbNotification, TripStatus } from './types';
import { supabase } from './lib/supabase';
import { offlineStorage } from './lib/offlineStorage';
import { Dashboard } from './components/Dashboard';
import { TripManager } from './components/TripManager';
import { ExpenseManager } from './components/ExpenseManager';
import { VehicleManager } from './components/VehicleManager';
import { MaintenanceManager } from './components/MaintenanceManager';
import { FreightCalculator } from './components/FreightCalculator';
import { AiAssistant } from './components/AiAssistant';
import { JornadaManager } from './components/JornadaManager';
import { StationLocator } from './components/StationLocator';
import { AdminPanel } from './components/AdminPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  ReceiptText, 
  Calculator, 
  Bot, 
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
  X
} from 'lucide-react';

/**
 * Main Application Component
 * Manages global state, data synchronization, and view routing.
 */
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
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

  // Monitor network status
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

  // Update Jornada timer every second if active
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

  /**
   * Fetches all necessary data from Supabase or IndexedDB (offline).
   */
  const fetchData = useCallback(async () => {
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
      // For demo purposes, if no user, we still show local data or empty state
      if (!user) return;

      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, jornadaRes, notificationsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', user.id).order('plate', { ascending: true }),
        supabase.from('maintenance').select('*').eq('user_id', user.id).order('purchase_date', { ascending: false }),
        supabase.from('jornada_logs').select('*').eq('user_id', user.id).order('start_time', { ascending: false }),
        supabase.from('notifications').select('*').or(`target_user_email.is.null,target_user_email.eq.${user.email}`).order('created_at', { ascending: false })
      ]);

      if (tripsRes.data) {
        setTrips(tripsRes.data);
        await offlineStorage.bulkSave('trips', tripsRes.data);
      }
      if (expensesRes.data) {
        setExpenses(expensesRes.data);
        await offlineStorage.bulkSave('expenses', expensesRes.data);
      }
      if (vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
        await offlineStorage.bulkSave('vehicles', vehiclesRes.data);
      }
      if (maintenanceRes.data) {
        setMaintenance(maintenanceRes.data);
        await offlineStorage.bulkSave('maintenance', maintenanceRes.data);
      }
      if (jornadaRes.data) {
        setJornadaLogs(jornadaRes.data);
        await offlineStorage.bulkSave('jornada_logs', jornadaRes.data);
      }
      if (notificationsRes.data) setNotifications(notificationsRes.data);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Generic handler for data actions (Create, Update, Delete).
   * Supports offline queueing when connection is lost.
   */
  const handleAction = async (table: string, data: any, action: 'insert' | 'update' | 'delete') => {
    setIsSaving(true);
    try {
      if (!isOnline) {
        await offlineStorage.save(table, data, action);
        await fetchData();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = { ...data, user_id: user.id };
      let response;

      if (action === 'insert') {
        response = await supabase.from(table).insert([payload]).select().single();
      } else if (action === 'update') {
        const { id, user_id, ...updateData } = payload;
        response = await supabase.from(table).update(updateData).eq('id', id).select().single();
      } else if (action === 'delete') {
        response = await supabase.from(table).delete().eq('id', data.id);
      }

      if (response?.error) throw response.error;
      await fetchData();
    } catch (error) {
      console.error(`Error in ${action} on ${table}:`, error);
      alert("Erro ao salvar dados. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Synchronizes pending offline items when connection is restored.
   */
  const syncOfflineData = useCallback(async () => {
    if (!isOnline) return;
    const pending = await offlineStorage.getPendingSync();
    if (pending.length === 0) return;

    for (const item of pending) {
      try {
        await handleAction(item.table, item.data, item.action);
        await offlineStorage.markAsSynced(item.id);
      } catch (e) {
        console.error("Sync error:", e);
      }
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) syncOfflineData();
  }, [isOnline, syncOfflineData]);

  const SidebarItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setIsMenuOpen(false); }}
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
        currentView === view ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  const handleLogout = () => {
    supabase.auth.signOut().then(() => {
      window.location.reload();
    });
  };

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

      {/* Sidebar Navigation */}
      <div className={`${isMenuOpen ? 'fixed inset-0 z-40 bg-white' : 'hidden'} md:flex md:w-80 md:flex-col md:border-r md:bg-white p-6 md:sticky md:top-0 md:h-screen transition-all shadow-sm`}>
        <div className="hidden md:flex flex-col mb-10">
          <h1 className="text-3xl font-black tracking-tighter text-primary-600">AURILOG</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão Logística Inteligente</p>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <SidebarItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem view={AppView.TRIPS} icon={MapIcon} label="Viagens" />
          <SidebarItem view={AppView.EXPENSES} icon={ReceiptText} label="Financeiro" />
          <SidebarItem view={AppView.VEHICLES} icon={Truck} label="Frota" />
          <SidebarItem view={AppView.MAINTENANCE} icon={Wrench} label="Manutenção" />
          <SidebarItem view={AppView.CALCULATOR} icon={Calculator} label="Calculadora ANTT" />
          <SidebarItem view={AppView.JORNADA} icon={Timer} label="Minha Jornada" />
          <SidebarItem view={AppView.STATIONS} icon={MapPinned} label="Radar Estrada" />
          <SidebarItem view={AppView.ADMIN} icon={ShieldAlert} label="Administração" />
          <button 
            onClick={() => setCurrentView(AppView.TRIPS)} // Redirecting for demo
            className="flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-100"
          >
            <Bot size={20} className="text-primary-500" />
            <span>IA Auri Insights</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t space-y-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'Online' : 'Modo Offline'}
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase text-rose-500 hover:bg-rose-50 transition-all">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </div>

      {/* Main View Router */}
      <main className="flex-1 p-4 md:p-10">
        <div className="max-w-7xl mx-auto">
          {currentView === AppView.DASHBOARD && <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setCurrentView} />}
          
          {currentView === AppView.TRIPS && <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={(t) => handleAction('trips', t, 'insert')} onUpdateTrip={(id, t) => handleAction('trips', { ...t, id }, 'update')} onUpdateStatus={async (id, s, km) => { await handleAction('trips', { id, status: s }, 'update'); if (km) { const trip = trips.find(x => x.id === id); if (trip?.vehicle_id) await handleAction('vehicles', { id: trip.vehicle_id, current_km: km }, 'update'); } }} onDeleteTrip={(id) => handleAction('trips', { id }, 'delete')} isSaving={isSaving} isOnline={isOnline} />}
          
          {currentView === AppView.EXPENSES && <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={(e) => handleAction('expenses', e, 'insert')} onUpdateExpense={(id, e) => handleAction('expenses', { ...e, id }, 'update')} onDeleteExpense={(id) => handleAction('expenses', { id }, 'delete')} isSaving={isSaving} />}
          
          {currentView === AppView.VEHICLES && <VehicleManager vehicles={vehicles} onAddVehicle={(v) => handleAction('vehicles', v, 'insert')} onUpdateVehicle={(id, v) => handleAction('vehicles', { ...v, id }, 'update')} onDeleteVehicle={(id) => handleAction('vehicles', { id }, 'delete')} isSaving={isSaving} />}
          
          {currentView === AppView.MAINTENANCE && <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={(m) => handleAction('maintenance', m, 'insert')} onDeleteMaintenance={(id) => handleAction('maintenance', { id }, 'delete')} isSaving={isSaving} />}
          
          {currentView === AppView.CALCULATOR && <FreightCalculator />}
          
          {currentView === AppView.JORNADA && <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaCurrentTime} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setStartTime => setJornadaStartTime(setStartTime)} onSaveLog={(l) => handleAction('jornada_logs', l, 'insert')} onDeleteLog={(id) => handleAction('jornada_logs', { id }, 'delete')} onClearHistory={async () => {}} addGlobalNotification={() => {}} isSaving={isSaving} />}
          
          {currentView === AppView.STATIONS && <StationLocator />}
          
          {currentView === AppView.ADMIN && <AdminPanel onRefresh={fetchData} onLogout={handleLogout} />}
        </div>
      </main>

      {/* Global Notifications Panel */}
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
