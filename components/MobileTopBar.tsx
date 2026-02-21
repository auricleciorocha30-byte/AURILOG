import React from 'react';
import { AppView } from '../types';
import { Bell, MoreVertical } from 'lucide-react';

interface MobileTopBarProps {
  currentView: AppView;
}

const viewTitles: Record<AppView, string> = {
  [AppView.DASHBOARD]: 'Painel de Controle',
  [AppView.TRIPS]: 'Gerenciar Viagens',
  [AppView.FLEET]: 'Frota de Veículos',
  [AppView.FINANCES]: 'Controle Financeiro',
  [AppView.MAINTENANCE]: 'Manutenções',
  [AppView.DRIVERS]: 'Motoristas',
  [AppView.REPORTS]: 'Relatórios',
  [AppView.SETTINGS]: 'Configurações',
  [AppView.ADMIN]: 'Painel do Gestor',
};

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ currentView }) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-primary-600 p-5 z-20 shadow-lg h-20 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="bg-white/10 p-3 rounded-xl">
          <MoreVertical size={20} className="text-white" />
        </button>
        <div>
          <h1 className="text-white font-black text-xl uppercase tracking-tighter">AURILOG</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></div>
            <span className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>
      <button className="bg-white/10 p-3 rounded-xl">
        <Bell size={20} className="text-white" />
      </button>
    </header>
  );
};
