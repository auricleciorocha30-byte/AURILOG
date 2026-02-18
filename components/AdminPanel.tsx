
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
  Loader2, 
  MapPin, 
  AlertTriangle,
  ReceiptText,
  UserPlus,
  Trash2,
  Edit2,
  RefreshCcw,
  Radar,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  Send,
  Lock,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem, Driver, TripStatus } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DRIVERS' | 'FLEET' | 'ALERTS'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  
  // Dados Consolidados
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allMaintenance, setAllMaintenance] = useState<MaintenanceItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Forms
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });
  const [alertForm, setAlertForm] = useState({ title: '', message: '', target_user_email: '' });

  useEffect(() => { loadAllAdminData(); }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, driversRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('maintenance').select('*'),
        supabase.from('drivers').select('*')
      ]);

      if (tripsRes.data) setAllTrips(tripsRes.data);
      if (expensesRes.data) setAllExpenses(expensesRes.data);
      if (vehiclesRes.data) setAllVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setAllMaintenance(maintenanceRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
    } catch (err) { console.error("Erro ao carregar dados admin"); } finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const revenue = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.agreed_price) || 0), 0);
    const tripExpenses = allExpenses.filter(e => e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const fixedExpenses = allExpenses.filter(e => !e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const maintCost = allMaintenance.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
    const commissions = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.driver_commission) || 0), 0);
    
    const expenseTotal = tripExpenses + fixedExpenses + maintCost;
    const profit = revenue - expenseTotal - commissions;
    
    return { revenue, expense: expenseTotal, profit, activeTrips: allTrips.filter(t => t.status === TripStatus.IN_PROGRESS).length, fleetCount: allVehicles.length };
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
      alert("Motorista cadastrado com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("Excluir este motorista permanentemente?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      loadAllAdminData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        title: alertForm.title,
        message: alertForm.message,
        type: 'INFO',
        category: 'GENERAL',
        target_user_email: alertForm.target_user_email === '' ? null : alertForm.target_user_email,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setAlertForm({ title: '', message: '', target_user_email: '' });
      alert("Comunicado enviado!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const openDriverPortal = () => {
    const driverUrl = window.location.origin + '?mode=driver';
    window.open(driverUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans']">
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-xl shadow-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">Painel de Gestão Master</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controle Consolidado AuriLog</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openDriverPortal} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <Smartphone size={16}/> Abrir Portal Motorista <ExternalLink size={14}/>
            </button>
            <button onClick={onLogout} className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
        <div className="flex overflow-x-auto no-scrollbar gap-2 bg-white/5 p-1.5 rounded-[2.5rem] md:max-w-2xl">
          <button onClick={() => setActiveTab('OVERVIEW')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'OVERVIEW' ? 'bg-amber-500 text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white'}`}>Visão Geral</button>
          <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'DRIVERS' ? 'bg-amber-500 text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white'}`}>Equipe</button>
          <button onClick={() => setActiveTab('FLEET')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'FLEET' ? 'bg-amber-500 text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white'}`}>Frota</button>
          <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'ALERTS' ? 'bg-amber-500 text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white'}`}>Comunicados</button>
        </div>

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Bruta (Conc.)</p>
                <p className="text-3xl font-black text-white mt-2">{formatCurrency(totals.revenue)}</p>
                <div className="flex items-center gap-2 mt-4 text-emerald-400 text-[10px] font-black uppercase"><TrendingUp size={14}/> Viagens Concluídas</div>
              </div>
              <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gasto Operacional Global</p>
                <p className="text-3xl font-black text-rose-400 mt-2">{formatCurrency(totals.expense)}</p>
                <div className="mt-4 flex gap-2"><div className="w-1 h-1 bg-rose-500 rounded-full"></div><div className="w-1 h-1 bg-rose-500 rounded-full opacity-50"></div><div className="w-1 h-1 bg-rose-500 rounded-full opacity-20"></div></div>
              </div>
              <div className="bg-slate-900 border border-amber-500/20 p-8 rounded-[3rem] shadow-2xl shadow-amber-500/5">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Lucro Real Líquido</p>
                <p className="text-3xl font-black text-white mt-2">{formatCurrency(totals.profit)}</p>
                <div className="mt-4 text-[10px] font-black text-amber-500/50 uppercase">Após comissões e despesas</div>
              </div>
              <div className="bg-slate-900 border border-white/5 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atividade da Rede</p>
                <p className="text-3xl font-black text-white mt-2">{totals.activeTrips} Viagens</p>
                <p className="text-[10px] font-black text-emerald-400 mt-4 uppercase">Em andamento agora</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white/5 border border-white/10 p-10 rounded-[4rem]">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Truck className="text-amber-500" size={24}/> Últimas Operações</h3>
                   <button onClick={loadAllAdminData} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-slate-400"><RefreshCcw size={18}/></button>
                </div>
                <div className="space-y-4">
                  {allTrips.slice(0, 5).map(trip => (
                    <div key={trip.id} className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 flex items-center justify-between group">
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
                         <p className="text-[9px] text-slate-500 font-bold uppercase">{trip.distance_km} KM</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900/50 border border-white/10 p-10 rounded-[4rem] flex flex-col items-center justify-center text-center">
                 <ShieldCheck size={64} className="text-amber-500 mb-6" />
                 <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Monitoramento</h3>
                 <p className="text-slate-500 text-sm font-bold uppercase max-w-[200px] leading-relaxed">Operação rodando com {totals.fleetCount} veículos ativos na rede AuriLog.</p>
                 <button onClick={() => setActiveTab('FLEET')} className="mt-8 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Ver Frota Completa</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DRIVERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><UserPlus className="text-amber-500" size={28}/> Adicionar Motorista</h3>
                <form onSubmit={handleAddDriver} className="space-y-6">
                   <input required placeholder="Nome do Condutor" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                   <input required type="email" placeholder="E-mail de Login" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                   <input required type="password" placeholder="Senha Provisória" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                   <button type="submit" disabled={loading} className="w-full py-6 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                     {loading ? <Loader2 className="animate-spin" /> : 'Cadastrar na Equipe'}
                   </button>
                </form>
             </div>
             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Equipe Cadastrada</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                   {drivers.map(d => (
                     <div key={d.id} className="p-6 bg-slate-900/50 rounded-3xl flex items-center justify-between group border border-white/5">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/5 text-amber-500 rounded-2xl flex items-center justify-center font-black uppercase">{d.name[0]}</div>
                           <div>
                              <h4 className="font-black text-sm uppercase">{d.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold">{d.email}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleDeleteDriver(d.id)} className="p-3 bg-white/5 text-slate-500 hover:text-rose-500 transition-all rounded-xl"><Trash2 size={18}/></button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'FLEET' && (
          <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10 animate-fade-in">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black uppercase tracking-tight">Inventário de Frota</h3>
                <span className="bg-white/5 px-6 py-2 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{allVehicles.length} Veículos Total</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allVehicles.map(v => (
                   <div key={v.id} className="p-8 bg-slate-900 border border-white/5 rounded-[3rem] group hover:border-amber-500/50 transition-all">
                      <div className="flex justify-between items-start mb-6">
                         <div className="p-4 bg-white/5 text-amber-500 rounded-2xl"><Truck size={28}/></div>
                         <span className="bg-white text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black uppercase">{v.plate}</span>
                      </div>
                      <h4 className="text-lg font-black uppercase">{v.model}</h4>
                      <p className="text-slate-500 font-bold text-xs mt-1">{v.year}</p>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                         <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[8px] font-black text-slate-500 uppercase">KM Registrado</p>
                            <p className="text-base font-black text-white">{v.current_km.toLocaleString()}</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[8px] font-black text-slate-500 uppercase">Eixos</p>
                            <p className="text-base font-black text-white">{v.axles || 2}</p>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'ALERTS' && (
           <div className="max-w-3xl mx-auto animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Bell className="text-amber-500" size={28}/> Enviar Comunicado</h3>
                 <form onSubmit={handleSendAlert} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Título do Alerta</label>
                       <input required placeholder="Ex: Manutenção Programada" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Mensagem Detalhada</label>
                       <textarea required rows={4} placeholder="Escreva aqui..." className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Destinatário (Opcional)</label>
                       <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                          <option value="">Enviar para Todos</option>
                          {drivers.map(d => <option key={d.id} value={d.email}>{d.name} ({d.email})</option>)}
                       </select>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-6 bg-white text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                       {loading ? <Loader2 className="animate-spin" /> : <><Send size={18}/> Transmitir Comunicado</>}
                    </button>
                 </form>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};
