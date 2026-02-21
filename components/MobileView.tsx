import React, { useState } from 'react';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, Driver, RoadService, CargoCategory, JornadaLog, TripStatus } from '../types';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { Dashboard } from './Dashboard';
import { TripManager } from './TripManager';
import { VehicleManager } from './VehicleManager';
import { ExpenseManager } from './ExpenseManager';
import { MaintenanceManager } from './MaintenanceManager';
import { StationLocator } from './StationLocator';
import { JornadaManager } from './JornadaManager';
import { FreightCalculator } from './FreightCalculator';
import { LogOut, X, Truck, Wrench, Calculator, Timer, ChevronRight } from 'lucide-react';

interface MobileViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  expenses: Expense[];
  maintenance: MaintenanceItem[];
  roadServices: RoadService[];
  cargoCategories: CargoCategory[];
  jornadaLogs: JornadaLog[];
  jornadaMode: 'IDLE' | 'DRIVING' | 'RESTING';
  jornadaStartTime: number | null;
  jornadaCurrentTime: number;
  setJornadaMode: (mode: 'IDLE' | 'DRIVING' | 'RESTING') => void;
  setJornadaStartTime: (time: number | null) => void;
  onUpdate: () => void;
  onAddTrip: (trip: Omit<Trip, 'id'>) => Promise<void>;
  onUpdateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  onUpdateStatus: (id: string, status: TripStatus, km: number) => Promise<void>;
  onDeleteTrip: (id: string) => Promise<void>;
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  onUpdateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  onUpdateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onAddMaintenance: (item: Omit<MaintenanceItem, 'id'>) => Promise<void>;
  onDeleteMaintenance: (id: string) => Promise<void>;
  onSaveJornadaLog: (log: Omit<JornadaLog, 'id'>) => Promise<void>;
  onDeleteJornadaLog: (id: string) => Promise<void>;
  onClearJornadaHistory: () => Promise<void>;
  isSaving?: boolean;
  onSetView: (view: AppView) => void;
  onLogout: () => void;
  onShowNotifications: () => void;
  notificationsCount: number;
}

export const MobileView: React.FC<MobileViewProps> = ({ 
  drivers, 
  vehicles, 
  trips, 
  expenses, 
  maintenance,
  roadServices,
  cargoCategories,
  jornadaLogs,
  jornadaMode,
  jornadaStartTime,
  jornadaCurrentTime,
  setJornadaMode,
  setJornadaStartTime,
  onUpdate, 
  onSetView, 
  onAddTrip, 
  onUpdateTrip, 
  onUpdateStatus, 
  onDeleteTrip, 
  onAddExpense, 
  onUpdateExpense, 
  onDeleteExpense, 
  onAddVehicle, 
  onUpdateVehicle, 
  onDeleteVehicle, 
  onAddMaintenance, 
  onDeleteMaintenance,
  onSaveJornadaLog,
  onDeleteJornadaLog,
  onClearJornadaHistory,
  isSaving,
  onLogout,
  onShowNotifications,
  notificationsCount
}) => {
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSetView = (view: AppView) => {
    setActiveView(view);
    setIsMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeView) {
      case AppView.DASHBOARD:
        return <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={handleSetView} />;
      case AppView.TRIPS:
        return <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={onAddTrip} onUpdateTrip={onUpdateTrip} onUpdateStatus={onUpdateStatus} onDeleteTrip={onDeleteTrip} isSaving={isSaving} isOnline={true} />;
      case AppView.FLEET:
      case AppView.VEHICLES:
        return <VehicleManager vehicles={vehicles} onAddVehicle={onAddVehicle} onUpdateVehicle={onUpdateVehicle} onDeleteVehicle={onDeleteVehicle} isSaving={isSaving} />;
      case AppView.FINANCES:
      case AppView.EXPENSES:
        return <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={onAddExpense} onUpdateExpense={onUpdateExpense} onDeleteExpense={onDeleteExpense} isSaving={isSaving} />;
      case AppView.MAINTENANCE:
        return <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={onAddMaintenance} onDeleteMaintenance={onDeleteMaintenance} isSaving={isSaving} />;
      case AppView.STATIONS:
        return <StationLocator roadServices={roadServices} savedCategories={cargoCategories} />;
      case AppView.JORNADA:
        return <JornadaManager mode={jornadaMode} startTime={jornadaStartTime} currentTime={jornadaCurrentTime} logs={jornadaLogs} setMode={setJornadaMode} setStartTime={setJornadaStartTime} onSaveLog={onSaveJornadaLog} onDeleteLog={onDeleteJornadaLog} onClearHistory={onClearJornadaHistory} addGlobalNotification={() => {}} isSaving={isSaving} />;
      case AppView.CALCULATOR:
        return <FreightCalculator />;
      default:
        return <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={handleSetView} />;
    }
  };

  const currentDriver = drivers[0];

  const MenuItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button 
      onClick={() => handleSetView(view)} 
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeView === view ? 'bg-primary-50 text-primary-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl ${activeView === view ? 'bg-primary-100 text-primary-600' : 'bg-white text-slate-400'}`}>
          <Icon size={20} />
        </div>
        <span className="font-black text-sm uppercase tracking-wide">{label}</span>
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  );

  return (
    <div className="h-full bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary-50/50 to-transparent pointer-events-none z-0"></div>
      
      <MobileTopBar 
        currentView={activeView} 
        userName={currentDriver?.name || 'Motorista'} 
        userRole={currentDriver ? 'Condutor Profissional' : 'Visitante'}
        onNotificationClick={onShowNotifications}
        notificationCount={notificationsCount}
      />
      
      <main className="flex-1 overflow-y-auto pt-32 pb-40 px-2 z-10 no-scrollbar">
        {renderContent()}
      </main>
      
      <MobileBottomNav activeView={activeView} onSetView={handleSetView} onToggleMenu={() => setIsMenuOpen(true)} />

      {/* Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="bg-white w-full rounded-t-[2.5rem] p-6 pb-10 shadow-2xl animate-slide-up relative z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Menu Principal</h3>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"><X size={24}/></button>
            </div>

            <div className="space-y-3">
              <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Gestão</p>
              <MenuItem view={AppView.FLEET} icon={Truck} label="Minha Frota" />
              <MenuItem view={AppView.MAINTENANCE} icon={Wrench} label="Manutenção" />
              <MenuItem view={AppView.CALCULATOR} icon={Calculator} label="Calculadora de Frete" />
              
              <p className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mt-6 mb-2">Operacional</p>
              <MenuItem view={AppView.JORNADA} icon={Timer} label="Controle de Jornada" />
              
              <div className="h-px bg-slate-100 my-6"></div>
              
              <button onClick={onLogout} className="w-full flex items-center justify-between p-4 bg-rose-50 rounded-2xl text-rose-600">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl text-rose-500">
                    <LogOut size={20} />
                  </div>
                  <span className="font-black text-sm uppercase tracking-wide">Sair do Aplicativo</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
