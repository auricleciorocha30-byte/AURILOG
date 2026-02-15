import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-rose-50 text-rose-600',
  yellow: 'bg-amber-50 text-amber-600',
};

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95 md:active:scale-100">
      <div className="flex flex-col md:flex-row justify-between items-start gap-2">
        <div className="order-2 md:order-1 flex-1">
          <p className="text-[10px] md:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{value}</h3>
          {trend && (
            <p className="text-[10px] md:text-xs mt-1.5 font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 inline-block">
              {trend}
            </p>
          )}
        </div>
        <div className={`p-2.5 md:p-3 rounded-xl ${colorClasses[color]} order-1 md:order-2 shrink-0`}>
          <Icon size={20} className="md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
};