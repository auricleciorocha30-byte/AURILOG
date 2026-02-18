
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
  RefreshCcw,
  Radar,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  Send,
  Lock,
  ArrowRight,
  Settings,
  MapPinned,
  Store,
  Fuel,
  Utensils,
  Wrench,
  Download,
  Filter,
  X,
  Plus,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem, Driver, TripStatus, CargoCategory } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DRIVERS' | 'FLEET' | 'PARTNERS' | 'TRACKING' | 'ALERTS' | 'CONFIG'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  
  // Dados Consolidados
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allMaintenance, setAllMaintenance] = useState<MaintenanceItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [roadServices, setRoadServices] = useState<RoadService[]>([]);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [categories, setCategories] = useState<CargoCategory[]>([]);
  
  // Forms
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });
  const [alertForm, setAlertForm] = useState({ title: '', message: '', target_user_email: '', type: 'INFO' as any, category: 'GENERAL' as any });
  const [partnerForm, setPartnerForm] = useState({ name: '', type: 'Posto de Combustível', address: '', location_url: '', phone: '', description: '' });
  const [categoryName, setCategoryName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => { loadAllAdminData(); }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, driversRes, servicesRes, locRes, catRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('maintenance').select('*'),
        supabase.from('drivers').select('*'),
        supabase.from('road_services').select('*'),
        supabase.from('user_locations').select('*'),
        supabase.from('cargo_categories').select('*').order('name', { ascending: true })
      ]);

      if (tripsRes.data) setAllTrips(tripsRes.data);
      if (expensesRes.data) setAllExpenses(expensesRes.data);
      if (vehiclesRes.data) setAllVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setAllMaintenance(maintenanceRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
      if (servicesRes.data) setRoadServices(servicesRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (catRes.data) setCategories(catRes.data);
    } catch (err) { 
      console.error("Erro ao carregar dados admin", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const totals = useMemo(() => {
    const revenue = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.agreed_price) || 0), 0);
    const tripExp = allExpenses.filter(e => e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const fixedExp = allExpenses.filter(e => !e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const commissions = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.driver_commission) || 0), 0);
    
    const profit = revenue - tripExp - fixedExp - commissions;
    return { revenue, expense: tripExp + fixedExp, profit, fleet: allVehicles.length, drivers: drivers.length };
  }, [allTrips, allExpenses, allVehicles, drivers]);

  // Performance por motorista para o Dashboard (Overview)
  const performanceByDriver = useMemo(() => {
    const map = new Map<string, { name: string, email: string, revenue: number, expense: number, trips: number }>();
    
    drivers.forEach(d => {
      map.set(d.id, { name: d.name, email: d.email, revenue: 0, expense: 0, trips: 0 });
    });

    allTrips.forEach(t => {
      if (t.status === TripStatus.COMPLETED && t.user_id) {
        const stats = map.get(t.user_id) || { name: 'Sistema', email: 'admin@aurilog.com', revenue: 0, expense: 0, trips: 0 };
        stats.revenue += (Number(t.agreed_price) || 0);
        stats.trips += 1;
        map.set(t.user_id || 'admin', stats);
      }
    });

    allExpenses.forEach(e => {
      if (e.user_id) {
        const stats = map.get(e.user_id) || { name: 'Sistema', email: 'admin@aurilog.com', revenue: 0, expense: 0, trips: 0 };
        stats.expense += (Number(e.amount) || 0);
        map.set(e.user_id || 'admin', stats);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [drivers, allTrips, allExpenses]);

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('cargo_categories').insert([{ name: categoryName.trim() }]);
      if (error) throw error;
      setCategoryName('');
      setShowCategoryModal(false);
      loadAllAdminData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('cargo_categories').delete().eq('id', id);
      if (error) throw error;
      loadAllAdminData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('road_services').insert([partnerForm]);
      if (error) throw error;
      setPartnerForm({ name: '', type: 'Posto de Combustível', address: '', location_url: '', phone: '', description: '' });
      loadAllAdminData();
      alert("Parceiro adicionado!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const deleteRecord = async (table: string, id: string) => {
    if (!confirm("Confirmar exclusão?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
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
        type: alertForm.type,
        category: alertForm.category,
        target_user_email: alertForm.target_user_email === '' ? null : alertForm.target_user_email,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setAlertForm({ title: '', message: '', target_user_email: '', type: 'INFO', category: 'GENERAL' });
      alert("Comunicado enviado com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Data,Origem,Destino,Valor,Motorista\n"
      + allTrips.map(t => `${t.date},${t.origin},${t.destination},${t.agreed_price},${t.user_id}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_aurilog.csv");
    document.body.appendChild(link);
    link.click();
  };

  // Mapeia motoristas com suas localizações - Garantindo que todos os motoristas cadastrados apareçam
  const driversWithLocations = useMemo(() => {
    return drivers.map(d => {
      const loc = locations.find(l => l.user_id === d.id || l.email === d.email);
      return { ...d, location: loc };
    });
  }, [drivers, locations]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-xl shadow-amber-500/20">
              <ShieldCheck size={28} className="text-slate-950" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase hidden md:block">AURI<span className="text-amber-500">LOG</span> GESTOR</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={() => window.open(window.location.origin + '?mode=driver', '_blank')} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Smartphone size={16}/> Portal Motorista <ExternalLink size={14}/>
             </button>
             <button onClick={onLogout} className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 pb-32">
        {/* Menu de Navegação Horizontal */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 bg-white/5 p-1.5 rounded-[2.5rem]">
          {[
            { id: 'OVERVIEW', label: 'Dashboard', icon: TrendingUp },
            { id: 'TRACKING', label: 'Rastreamento', icon: MapPinned },
            { id: 'DRIVERS', label: 'Equipe', icon: Users },
            { id: 'FLEET', label: 'Frota', icon: Truck },
            { id: 'PARTNERS', label: 'Parceiros', icon: Store },
            { id: 'ALERTS', label: 'Alertas', icon: Bell },
            { id: 'CONFIG', label: 'Configurações', icon: Settings },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-amber-500 text-slate-950 shadow-xl' : 'text-slate-500 hover:text-white'}`}
            >
              <tab.icon size={16}/> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita Bruta</p>
                   <p className="text-3xl font-black mt-2">{formatCurrency(totals.revenue)}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gasto Total</p>
                   <p className="text-3xl font-black mt-2 text-rose-400">{formatCurrency(totals.expense)}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                   <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Lucro Líquido</p>
                   <p className="text-3xl font-black mt-2">{formatCurrency(totals.profit)}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativos</p>
                   <p className="text-3xl font-black mt-2">{totals.drivers} Condutores</p>
                </div>
             </div>

             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                   <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><ReceiptText className="text-amber-500"/> Performance por Condutor</h3>
                   <button onClick={exportData} className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest"><Download size={16}/> Exportar Relatório</button>
                </div>
                <div className="space-y-4">
                   <div className="hidden md:grid grid-cols-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest pb-2">
                      <div className="col-span-2">Motorista / E-mail</div>
                      <div>Viagens</div>
                      <div>Receita</div>
                      <div className="text-right">Lucratividade</div>
                   </div>
                   {performanceByDriver.length === 0 ? (
                      <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-white/5">
                         <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">Nenhum dado de movimentação encontrado.</p>
                      </div>
                   ) : performanceByDriver.map(stats => (
                      <div key={stats.email} className="p-6 bg-slate-900/50 rounded-3xl grid grid-cols-1 md:grid-cols-5 gap-4 items-center border border-white/5 hover:border-amber-500/30 transition-all">
                         <div className="col-span-2 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center font-black text-amber-500">{stats.name[0]}</div>
                            <div>
                               <p className="text-sm font-black uppercase tracking-tighter">{stats.name}</p>
                               <p className="text-[10px] text-slate-500 font-bold">{stats.email}</p>
                            </div>
                         </div>
                         <div className="flex md:block items-center justify-between">
                            <span className="md:hidden text-[9px] font-bold text-slate-500 uppercase">Viagens:</span>
                            <span className="font-black text-sm">{stats.trips}</span>
                         </div>
                         <div className="flex md:block items-center justify-between">
                            <span className="md:hidden text-[9px] font-bold text-slate-500 uppercase">Receita:</span>
                            <span className="font-black text-sm">{formatCurrency(stats.revenue)}</span>
                         </div>
                         <div className="flex md:block items-center justify-between md:text-right">
                            <span className="md:hidden text-[9px] font-bold text-slate-500 uppercase">Líquido:</span>
                            <span className={`font-black text-sm ${stats.revenue - stats.expense > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {formatCurrency(stats.revenue - stats.expense)}
                            </span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'TRACKING' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in h-[700px]">
              <div className="bg-white/5 p-8 rounded-[4rem] border border-white/10 flex flex-col">
                 <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3"><Users className="text-amber-500"/> Equipe Registrada</h3>
                 <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {driversWithLocations.length === 0 ? (
                       <div className="text-center py-20 flex flex-col items-center">
                          <Users size={48} className="text-slate-800 mb-4" />
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhum motorista cadastrado.</p>
                       </div>
                    ) : driversWithLocations.map(driver => (
                       <div key={driver.id} className={`p-5 bg-slate-900 border border-white/5 rounded-3xl flex justify-between items-center transition-all ${driver.location ? 'border-amber-500/20 shadow-lg shadow-amber-500/5' : 'opacity-60'}`}>
                          <div className="flex-1 overflow-hidden">
                             <div className="flex items-center gap-2">
                                <p className="text-sm font-black uppercase truncate tracking-tighter">{driver.name}</p>
                                {driver.location ? <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span> : <span className="w-2 h-2 bg-slate-700 rounded-full"></span>}
                             </div>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                {driver.location ? `Visto: ${new Date(driver.location.updated_at).toLocaleTimeString()}` : 'Sem sinal de GPS'}
                             </p>
                          </div>
                          {driver.location && (
                             <button className="p-3 bg-amber-500 text-slate-950 rounded-xl hover:scale-110 active:scale-90 transition-all shadow-lg shadow-amber-500/20">
                                <MapPin size={16}/>
                             </button>
                          )}
                       </div>
                    ))}
                 </div>
              </div>
              <div className="lg:col-span-2 bg-white/5 rounded-[4rem] border border-white/10 overflow-hidden relative">
                 <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10 pointer-events-none">
                    <div className="text-center p-10 bg-slate-950/80 rounded-3xl border border-white/10 max-w-sm backdrop-blur-xl">
                       <MapPinned size={48} className="text-amber-500 mx-auto mb-4" />
                       <h4 className="text-lg font-black uppercase mb-2 tracking-tighter">Live Monitor</h4>
                       <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Localização em tempo real de {locations.length} condutores ativos.</p>
                    </div>
                 </div>
                 <iframe title="Map" className="w-full h-full border-0 opacity-30 grayscale invert" src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000000!2d-50!3d-15!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbr!4v1" />
              </div>
           </div>
        )}

        {activeTab === 'FLEET' && (
          <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Truck className="text-amber-500"/> Inventário de Frota</h3>
                <span className="bg-white/5 px-6 py-2 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{allVehicles.length} Veículos Registrados</span>
             </div>
             {loading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                   <Loader2 className="animate-spin text-amber-500" size={40} />
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Carregando dados da frota...</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {allVehicles.length === 0 ? (
                     <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900/50 rounded-[3rem] border border-white/5">
                       <Truck size={48} className="mx-auto mb-4 text-slate-800" />
                       <p className="text-xs font-black uppercase tracking-[0.3em]">Nenhum veículo cadastrado na frota.</p>
                     </div>
                   ) : allVehicles.map(v => (
                      <div key={v.id} className="p-8 bg-slate-900 border border-white/5 rounded-[3rem] group hover:border-amber-500/50 transition-all shadow-xl">
                         <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-white/5 text-amber-500 rounded-2xl"><Truck size={28}/></div>
                            <span className="bg-white text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md">{v.plate}</span>
                         </div>
                         <h4 className="text-lg font-black uppercase tracking-tighter">{v.model}</h4>
                         <p className="text-slate-500 font-bold text-[10px] mt-1 uppercase tracking-widest">{v.year}</p>
                         <div className="mt-6 grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-4 rounded-2xl">
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Odômetro</p>
                               <p className="text-base font-black text-white">{v.current_km.toLocaleString()} KM</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl">
                               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Configuração</p>
                               <p className="text-base font-black text-white">{v.axles || 2} Eixos</p>
                            </div>
                         </div>
                         <div className="mt-4 flex gap-2">
                            <button onClick={() => deleteRecord('vehicles', v.id)} className="w-full py-3 bg-rose-500/10 text-rose-500 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Excluir Registro</button>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

        {activeTab === 'ALERTS' && (
           <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><Bell className="text-amber-500" size={28}/> Transmitir Comunicado</h3>
                 <form onSubmit={handleSendAlert} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Tipo de Alerta</label>
                          <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-black uppercase text-[10px] text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.type} onChange={e => setAlertForm({...alertForm, type: e.target.value})}>
                             <option value="INFO">Informação (Azul)</option>
                             <option value="WARNING">Aviso (Amarelo)</option>
                             <option value="URGENT">Urgente (Vermelho)</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Categoria</label>
                          <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-black uppercase text-[10px] text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.category} onChange={e => setAlertForm({...alertForm, category: e.target.value})}>
                             <option value="GENERAL">Geral</option>
                             <option value="MAINTENANCE">Manutenção</option>
                             <option value="FINANCE">Financeiro</option>
                             <option value="TRIP">Viagens</option>
                             <option value="JORNADA">Jornada</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Título do Alerta</label>
                       <input required placeholder="Ex: Mudança na Política de Fretes" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Mensagem Detalhada</label>
                       <textarea required rows={4} placeholder="Digite as instruções para a equipe..." className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Destinatário Específico (Vazio = Todos)</label>
                       <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                          <option value="">Enviar para Todos os Motoristas</option>
                          {drivers.map(d => <option key={d.id} value={d.email}>{d.name} ({d.email})</option>)}
                       </select>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-6 bg-white text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                       {loading ? <Loader2 className="animate-spin" /> : <><Send size={18}/> Transmitir Mensagem</>}
                    </button>
                 </form>
              </div>
           </div>
        )}

        {activeTab === 'CONFIG' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Filter className="text-amber-500" size={28}/> Categorias de Carga</h3>
                    <button onClick={() => setShowCategoryModal(true)} className="p-3 bg-amber-500 text-slate-950 rounded-2xl hover:bg-amber-400 transition-all shadow-lg active:scale-90"><Plus size={20}/></button>
                 </div>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.length === 0 ? (
                       <p className="text-center py-10 text-slate-500 text-xs font-black uppercase tracking-widest">Nenhuma categoria configurada.</p>
                    ) : categories.map(cat => (
                       <div key={cat.id} className="p-5 bg-slate-900 rounded-3xl flex justify-between items-center group border border-white/5 hover:border-amber-500/20 transition-all">
                          <span className="text-sm font-bold uppercase tracking-tight">{cat.name}</span>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                       </div>
                    ))}
                    <button 
                      onClick={() => setShowCategoryModal(true)} 
                      className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-500 mt-4 hover:border-amber-500/30 hover:text-amber-500 transition-all"
                    >
                      + Adicionar Nova Categoria
                    </button>
                 </div>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-6 uppercase flex items-center gap-3 tracking-tighter"><Settings className="text-amber-500" size={28}/> Configurações</h3>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center py-6 border-b border-white/5">
                       <div>
                          <p className="font-bold text-sm uppercase tracking-tighter">Segurança Máxima</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Criptografia de fim a fim ativa</p>
                       </div>
                       <div className="w-12 h-6 bg-emerald-500/20 rounded-full flex items-center px-1 border border-emerald-500/50"><div className="w-4 h-4 bg-emerald-500 rounded-full ml-auto"></div></div>
                    </div>
                    <div className="flex justify-between items-center py-6 border-b border-white/5">
                       <div>
                          <p className="font-bold text-sm uppercase tracking-tighter">Logs de Sistema</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rastreamento de todas as alterações</p>
                       </div>
                       <div className="w-12 h-6 bg-amber-500 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full ml-auto"></div></div>
                    </div>
                 </div>
                 <div className="mt-10 p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl">
                    <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2">Zona de Perigo</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-4">Estas ações não podem ser desfeitas e afetam todos os usuários da rede.</p>
                    <button onClick={() => { if(confirm("CUIDADO: Isso limpará todos os comunicados antigos. Confirmar?")) supabase.from('notifications').delete().not('id', 'is', null).then(loadAllAdminData) }} className="w-full py-4 border-2 border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Limpar Histórico de Alertas</button>
                 </div>
              </div>
           </div>
        )}
      </main>

      {/* Modal de Nova Categoria */}
      {showCategoryModal && (
         <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[120] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-sm p-10 rounded-[4rem] border border-white/10 shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Nova Categoria</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="p-2 text-slate-500 hover:text-white"><X size={24}/></button>
               </div>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Nome da Categoria</label>
                     <input 
                        autoFocus
                        className="w-full p-5 bg-slate-950 border border-white/10 rounded-3xl font-bold outline-none focus:border-amber-500 text-white" 
                        placeholder="Ex: Carga Viva"
                        value={categoryName}
                        onChange={e => setCategoryName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                     />
                  </div>
                  <button 
                     disabled={loading}
                     onClick={handleAddCategory} 
                     className="w-full py-5 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center"
                  >
                     {loading ? <Loader2 className="animate-spin" size={20}/> : 'Adicionar Categoria'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
