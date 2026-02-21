import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, Route, Car, DollarSign, Wrench, Plus } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: AppView;
  onSetView: (view: AppView) => void;
}

const navItems = [
  { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Painel' },
  { view: AppView.TRIPS, icon: Route, label: 'Viagens' },
  { view: AppView.FLEET, icon: Car, label: 'Frota' },
  { view: AppView.FINANCES, icon: DollarSign, label: 'Finanças' },
  { view: AppView.MAINTENANCE, icon: Wrench, label: 'Oficina' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, onSetView }) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-20">
      <div className="bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl flex justify-around items-center h-20 text-white">
        {navItems.map(item => (
          <button 
            key={item.view}
            onClick={() => onSetView(item.view)}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${activeView === item.view ? 'text-primary-400' : 'text-slate-500'}`}>
            <item.icon size={22} strokeWidth={activeView === item.view ? 3 : 2} />
            <span className="text-[10px] font-bold mt-1 tracking-tighter">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
