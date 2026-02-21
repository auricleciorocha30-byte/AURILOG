import React, { useState } from 'react';
import { AppView, Trip, Expense, Vehicle, MaintenanceItem, Driver } from '../types';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { Dashboard } from './Dashboard';
import { TripManager } from './TripManager';
import { VehicleManager } from './VehicleManager';
import { ExpenseManager } from './ExpenseManager';
import { MaintenanceManager } from './MaintenanceManager';

interface MobileViewProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  expenses: Expense[];
  maintenance: MaintenanceItem[];
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
  isSaving?: boolean;
  onSetView: (view: AppView) => void;
}

export const MobileView: React.FC<MobileViewProps> = ({ 
  drivers, 
  vehicles, 
  trips, 
  expenses, 
  maintenance, 
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
  isSaving 
}) => {
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);

  const renderContent = () => {
    switch (activeView) {
      case AppView.DASHBOARD:
        return <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setActiveView} />;
      case AppView.TRIPS:
        return <TripManager trips={trips} vehicles={vehicles} expenses={expenses} onAddTrip={onAddTrip} onUpdateTrip={onUpdateTrip} onUpdateStatus={onUpdateStatus} onDeleteTrip={onDeleteTrip} isSaving={isSaving} isOnline={true} />;
      case AppView.FLEET:
        return <VehicleManager vehicles={vehicles} onAddVehicle={onAddVehicle} onUpdateVehicle={onUpdateVehicle} onDeleteVehicle={onDeleteVehicle} isSaving={isSaving} />;
      case AppView.FINANCES:
        return <ExpenseManager expenses={expenses} trips={trips} vehicles={vehicles} onAddExpense={onAddExpense} onUpdateExpense={onUpdateExpense} onDeleteExpense={onDeleteExpense} isSaving={isSaving} />;
      case AppView.MAINTENANCE:
        return <MaintenanceManager maintenance={maintenance} vehicles={vehicles} onAddMaintenance={onAddMaintenance} onDeleteMaintenance={onDeleteMaintenance} isSaving={isSaving} />;
      default:
        return <Dashboard trips={trips} expenses={expenses} maintenance={maintenance} vehicles={vehicles} onSetView={setActiveView} />;
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      <MobileTopBar currentView={activeView} />
      <main className="flex-1 overflow-y-auto pt-24 pb-28">
        {renderContent()}
      </main>
      <MobileBottomNav activeView={activeView} onSetView={setActiveView} />
    </div>
  );
};
