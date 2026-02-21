import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, Map, Truck, Wallet, Wrench } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: AppView;
  onSetView: (view: AppView) => void;
}

const navItems = [
  { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Painel' },
  { view: AppView.TRIPS, icon: Map, label: 'Viagens' },
  { view: AppView.FLEET, icon: Truck, label: 'Frota' },
  { view: AppView.FINANCES, icon: Wallet, label: 'Caixa' },
  { view: AppView.MAINTENANCE, icon: Wrench, label: 'Oficina' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeView, onSetView }) => {
  return (
    <div className="fixed bottom-6 left-6 right-6 z-50">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl flex justify-between items-center px-2 py-2">
        {navItems.map(item => {
          const isActive = activeView === item.view;
          return (
            <button 
              key={item.view}
              onClick={() => onSetView(item.view)}
              className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-[2rem] transition-all duration-300 ${isActive ? 'bg-primary-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-white/5'}`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-white rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
