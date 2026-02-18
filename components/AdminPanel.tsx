
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  Wallet, 
  Truck, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Search, 
  Loader2, 
  MapPin, 
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ReceiptText,
  DollarSign,
  ArrowUpRight,
  UserPlus,
  Trash2,
  Edit2,
  RefreshCcw,
  Radar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem, Driver, TripStatus } from '../types';
import { StatsCard } from './StatsCard';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
  onUnlockDriverApp: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout, onUnlockDriverApp }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LOCATIONS' | 'DRIVERS' | 'ALERTS'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  
  // Dados Consolidados
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allMaintenance, setAllMaintenance] = useState<MaintenanceItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLocations, setDriverLocations] = useState<UserLocation[]>([]);

  // Form de Motorista
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, driversRes, locationsRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('maintenance').select('*'),
        supabase.from('drivers').select('*'),
        supabase.from('user_locations').select('*')
      ]);

      if (tripsRes.data) setAllTrips(tripsRes.data);
      if (expensesRes.data) setAllExpenses(expensesRes.data);
      if (vehiclesRes.data) setAllVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setAllMaintenance(maintenanceRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
      if (locationsRes.data) setDriverLocations(locationsRes.data);
    } catch (err) {
      console.error("Erro ao carregar dados admin");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const revenue = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + Number(t.agreed_price), 0);
    const expense = allExpenses.reduce((acc, e) => acc + Number(e.amount), 0) + allMaintenance.reduce((acc, m) => acc + Number(m.cost), 0);
    const commissions = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + Number(t.driver_commission), 0);
    const profit = revenue - expense - commissions;
    
    return {
      revenue,
      expense,
      profit,
      activeTrips: allTrips.filter(t => t.status === TripStatus.IN_PROGRESS).length,
      fleetCount: allVehicles.length
    };
  }, [allTrips, allExpenses, allVehicles, allMaintenance]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('drivers').insert([{
        name: driverForm.name,
        email: driverForm.email.toLowerCase().trim(),
        password: driverForm.password,
        status: 'Ativo'
      }]);
      if (error) throw error;
      setDriverForm({ name: '', email: '', password: '' });
      loadAllAdminData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans']">
      {/* Header Admin */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-xl shadow-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">Painel de Gestão</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Central Administrativa AuriLog</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onUnlockDriverApp} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Ver como Condutor</button>
            <button onClick={onLogout} className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
        {/* Navigation Admin */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 bg-white/5 p-1.5 rounded-[2.5rem] md:max-w-2xl">
          <button onClick={() => setActiveTab('OVERVIEW')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'OVERVIEW' ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Visão Geral</button>
          <button onClick={() => setActiveTab('LOCATIONS')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'LOCATIONS' ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Rastreamento</button>
          <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'DRIVERS' ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Equipe</button>
          <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'ALERTS' ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Comunicados</button>
        </div>

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Acumulada</p>
                <p className="text-3xl font-black text-white mt-2">{formatCurrency(totals.revenue)}</p>
                <div className="flex items-center gap-2 mt-4 text-emerald-400 text-xs font-bold">
                  <TrendingUp size={16}/> 12.5% vs mês anterior
                </div>
              </div>
              <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Despesa Global</p>
                <p className="text-3xl font-black text-rose-400 mt-2">{formatCurrency(totals.expense)}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-4 uppercase">Manutenção inclusa</p>
              </div>
              <div className="bg-slate-900 border border-amber-500/20 p-8 rounded-[3rem] shadow-2xl shadow-amber-500/5">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Lucro Líquido Real</p>
                <p className="text-3xl font-black text-white mt-2">{formatCurrency(totals.profit)}</p>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-amber-500" style={{width: '65%'}}></div>
                </div>
              </div>
              <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frota & Atividade</p>
                <p className="text-3xl font-black text-white mt-2">{totals.fleetCount} Caminhões</p>
                <p className="text-xs font-bold text-emerald-400 mt-4 uppercase tracking-tight">{totals.activeTrips} Viagens em curso</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Últimas Viagens */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 p-10 rounded-[4rem]">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Truck className="text-amber-500" size={24}/> Atividade Recente</h3>
                   <button onClick={loadAllAdminData} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-slate-400"><RefreshCcw size={18}/></button>
                </div>
                <div className="space-y-4">
                  {allTrips.slice(0, 5).map(trip => (
                    <div key={trip.id} className="p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl ${trip.status === TripStatus.COMPLETED ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          <ReceiptText size={24}/>
                        </div>
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-tighter">{trip.origin.split(' - ')[0]} ➔ {trip.destination.split(' - ')[0]}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Status: {trip.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black">{formatCurrency(trip.agreed_price)}</p>
                         <p className="text-[9px] text-slate-500 font-bold uppercase">Km: {trip.distance_km}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas Críticos */}
              <div className="bg-rose-500/10 border border-rose-500/20 p-10 rounded-[4rem]">
                 <h3 className="text-xl font-black text-rose-500 uppercase tracking-tight mb-8 flex items-center gap-3"><AlertTriangle size={24}/> Alertas de Frota</h3>
                 <div className="space-y-6">
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-rose-500/10">
                       <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Manutenção Crítica</p>
                       <p className="text-sm font-bold text-white leading-snug">3 veículos operando com pneus vencidos ou manutenção atrasada.</p>
                       <button className="mt-4 text-[9px] font-black uppercase text-rose-500 underline">Ver Veículos</button>
                    </div>
                    <div className="p-6 bg-slate-900/50 rounded-3xl border border-rose-500/10">
                       <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Contas a Vencer</p>
                       <p className="text-sm font-bold text-white leading-snug">R$ 12.450,00 em despesas fixas vencendo nas próximas 48h.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DRIVERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><UserPlus className="text-amber-500" size={28}/> Novo Motorista</h3>
                <form onSubmit={handleAddDriver} className="space-y-6">
                   <input required placeholder="Nome Completo" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                   <input required type="email" placeholder="E-mail de Acesso" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                   <input required type="password" placeholder="Senha Inicial" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                   <button type="submit" className="w-full py-6 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">Cadastrar no Sistema</button>
                </form>
             </div>
             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Equipe Ativa</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                   {drivers.map(d => (
                     <div key={d.id} className="p-6 bg-slate-900/50 rounded-3xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black">{d.name[0]}</div>
                           <div>
                              <h4 className="font-black text-sm uppercase">{d.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold">{d.email}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-3 text-slate-500 hover:text-white transition-all"><Edit2 size={18}/></button>
                           <button className="p-3 text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={18}/></button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            <div className="lg:col-span-4 bg-white/5 border border-white/10 p-8 rounded-[3rem] h-[600px] flex flex-col">
               <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-3"><Radar className="text-amber-500" size={24}/> Radar GPS</h3>
               <div className="space-y-3 overflow-y-auto no-scrollbar">
                  {drivers.map(d => {
                    const loc = driverLocations.find(l => l.email === d.email);
                    const isOnline = loc && (Date.now() - new Date(loc.updated_at).getTime()) < 600000;
                    return (
                      <div key={d.id} className="p-5 bg-slate-900/50 rounded-[2rem] border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                            <div>
                               <h4 className="font-black text-xs uppercase">{d.name}</h4>
                               <p className="text-[8px] text-slate-500 font-bold">Última conexão: {loc ? new Date(loc.updated_at).toLocaleTimeString() : 'N/A'}</p>
                            </div>
                         </div>
                         {loc && <button className="p-3 bg-white/5 rounded-xl text-amber-500"><MapPin size={16}/></button>}
                      </div>
                    );
                  })}
               </div>
            </div>
            <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-[4rem] h-[600px] overflow-hidden flex flex-col items-center justify-center">
               <MapPin size={64} className="text-slate-800 mb-4" />
               <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Selecione um veículo para visualizar no mapa</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
