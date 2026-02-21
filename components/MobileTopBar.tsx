import React from 'react';
import { AppView } from '../types';
import { Bell, UserCircle2 } from 'lucide-react';

interface MobileTopBarProps {
  currentView: AppView;
  userName?: string;
  userRole?: string;
  onNotificationClick: () => void;
  notificationCount: number;
}

const viewTitles: Record<AppView, string> = {
  [AppView.DASHBOARD]: 'Visão Geral',
  [AppView.TRIPS]: 'Minhas Viagens',
  [AppView.FLEET]: 'Minha Frota',
  [AppView.EXPENSES]: 'Fluxo de Caixa',
  [AppView.MAINTENANCE]: 'Oficina',
  [AppView.DRIVERS]: 'Motoristas',
  [AppView.REPORTS]: 'Relatórios',
  [AppView.SETTINGS]: 'Ajustes',
  [AppView.ADMIN]: 'Gestão',
  [AppView.VEHICLES]: 'Veículos',
  [AppView.CALCULATOR]: 'Calculadora',
  [AppView.JORNADA]: 'Jornada',
  [AppView.STATIONS]: 'Postos & Radar'
};

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ currentView, userName = 'Motorista', userRole = 'Condutor', onNotificationClick, notificationCount }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 pt-12 pb-4 bg-slate-50/80 backdrop-blur-xl border-b border-white/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full shadow-sm border border-slate-100">
             <UserCircle2 size={28} className="text-slate-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Olá, {userName.split(' ')[0]}</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">
              {viewTitles[currentView] || 'Aurilog'}
            </h1>
          </div>
        </div>
        
        <button onClick={onNotificationClick} className="relative p-3 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-all">
          <Bell size={20} className="text-slate-600" />
          {notificationCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </button>
      </div>
    </header>
  );
};
