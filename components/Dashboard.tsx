
import React, { useMemo } from 'react';
import { Trip, Expense, FinancialSummary, Vehicle, AppView, TripStatus, MaintenanceItem } from '../types';
import { StatsCard } from './StatsCard';
import { DollarSign, Wallet, Calculator, ArrowUpRight, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  trips: Trip[];
  expenses: Expense[];
  maintenance: MaintenanceItem[];
  vehicles: Vehicle[];
  onSetView?: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ trips, expenses, maintenance, vehicles, onSetView }) => {
  
  const summary: FinancialSummary = useMemo(() => {
    // Apenas viagens concluídas ou em andamento entram no financeiro
    const activeTrips = trips.filter(t => t.status === TripStatus.COMPLETED || t.status === TripStatus.IN_PROGRESS);
    
    const totalRevenue = activeTrips.reduce((acc, t) => acc + (Number(t.agreed_price) || 0), 0);
    const totalCommissions = activeTrips.reduce((acc, t) => acc + (Number(t.driver_commission) || 0), 0);
    const totalDistance = activeTrips.reduce((acc, t) => acc + (Number(t.distance_km) || 0), 0);
    
    // Gastos vinculados a viagens + gastos fixos + manutenções
    const tripExpenses = expenses.filter(e => e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const fixedExpenses = expenses.filter(e => !e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalMaintenanceCosts = maintenance.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
    
    const totalExpenses = tripExpenses + fixedExpenses + totalMaintenanceCosts;
    const netProfit = totalRevenue - totalExpenses - totalCommissions;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const pendingToPay = expenses.filter(e => !e.is_paid).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    return { 
      totalRevenue, 
      totalTripExpenses: tripExpenses + totalMaintenanceCosts,
      totalFixedExpenses: fixedExpenses, 
      totalCommissions, 
      netProfit, 
      tripCount: activeTrips.length, 
      profitMargin,
      pendingToPay,
      totalDistance
    };
  }, [trips, expenses, maintenance]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const chartData = [
    { name: 'Ganhos', valor: summary.totalRevenue, color: '#6366f1' },
    { name: 'Gastos', valor: summary.totalTripExpenses + summary.totalFixedExpenses, color: '#f43f5e' },
    { name: 'Comissões', valor: summary.totalCommissions, color: '#f59e0b' },
    { name: 'Lucro Real', valor: summary.netProfit, color: '#10b981' }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div className="px-4 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Resumo Financeiro</h2>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2">Controle de Lucro e Despesas</p>
        </div>
        <div className="hidden md:flex bg-white px-6 py-3 rounded-2xl border shadow-sm items-center gap-4">
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase">Km Rodados</p>
             <p className="text-sm font-black text-slate-800">{summary.totalDistance.toLocaleString()} KM</p>
           </div>
           <div className="w-px h-8 bg-slate-100"></div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase">Viagens</p>
             <p className="text-sm font-black text-slate-800">{summary.tripCount}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        <StatsCard title="Receita Bruta" value={formatCurrency(summary.totalRevenue)} icon={ArrowUpRight} color="blue" />
        <StatsCard title="Total Despesas" value={formatCurrency(summary.totalTripExpenses + summary.totalFixedExpenses)} icon={Wallet} color="red" />
        <StatsCard title="Lucro Líquido" value={formatCurrency(summary.netProfit)} icon={DollarSign} color="green" trend={`${summary.profitMargin.toFixed(1)}% margem`} />
        <StatsCard title="A Pagar" value={formatCurrency(summary.pendingToPay)} icon={PieChartIcon} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
        {/* Gráfico de Desempenho */}
        <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            <BarChart3 size={18}/> Balanço da Operação
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="valor" radius={[12, 12, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card de Eficiência */}
        <div className="bg-slate-950 p-12 rounded-[4rem] text-white flex flex-col justify-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 leading-none">Eficiência Real</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Análise de rentabilidade por quilômetro</p>
            
            <div className="space-y-8">
              <div className="flex justify-between items-end border-b border-white/10 pb-8">
                 <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lucro por KM</p>
                   <p className="text-5xl font-black text-emerald-400 mt-2">
                     R$ {(summary.totalDistance > 0 ? summary.netProfit / summary.totalDistance : 0).toFixed(2)}
                   </p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gasto/KM</p>
                    <p className="text-xl font-black text-rose-400 mt-2">
                      R$ {(summary.totalDistance > 0 ? (summary.totalTripExpenses + summary.totalFixedExpenses) / summary.totalDistance : 0).toFixed(2)}
                    </p>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Ticket Médio</p>
                    <p className="text-xl font-black">{formatCurrency(summary.tripCount > 0 ? summary.totalRevenue / summary.tripCount : 0)}</p>
                 </div>
                 <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Comissões Pagas</p>
                    <p className="text-xl font-black">{formatCurrency(summary.totalCommissions)}</p>
                 </div>
              </div>
            </div>

            <button onClick={() => onSetView?.(AppView.TRIPS)} className="mt-12 w-full py-6 bg-white text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-primary-500 hover:text-white transition-all">
              Ver Detalhes das Viagens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
