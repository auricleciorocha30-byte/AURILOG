
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
  User,
  History,
  UserCheck
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
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
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
  const [alertForm, setAlertForm] = useState({ 
    title: '', 
    message: '', 
    sender: 'Gestão Master',
    target_user_email: '', 
    type: 'INFO' as any, 
    category: 'GENERAL' as any 
  });
  const [partnerForm, setPartnerForm] = useState({ name: '', type: 'Posto de Combustível', address: '', location_url: '', phone: '', description: '' });
  const [categoryName, setCategoryName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => { 
    loadAllAdminData();
    const interval = setInterval(() => {
      if (activeTab === 'TRACKING') refreshLocations();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      // Carregamento resiliente: se categorias falhar, o resto carrega
      // Ordenamos user_locations por updated_at desc para pegar sempre o mais recente no .find()
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, driversRes, servicesRes, locRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('maintenance').select('*'),
        supabase.from('drivers').select('*'),
        supabase.from('road_services').select('*'),
        supabase.from('user_locations').select('*').order('updated_at', { ascending: false })
      ]);

      if (tripsRes.data) setAllTrips(tripsRes.data);
      if (expensesRes.data) setAllExpenses(expensesRes.data);
      if (vehiclesRes.data) setAllVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setAllMaintenance(maintenanceRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
      if (servicesRes.data) setRoadServices(servicesRes.data);
      if (locRes.data) setLocations(locRes.data);

      // Tenta carregar categorias separadamente
      const { data: catData } = await supabase.from('cargo_categories').select('*').order('name', { ascending: true });
      if (catData) setCategories(catData);

    } catch (err) { 
      console.error("Erro ao carregar dados admin", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const refreshLocations = async () => {
    // Garante que pegamos as localizações mais recentes primeiro
    const { data } = await supabase.from('user_locations').select('*').order('updated_at', { ascending: false });
    if (data) setLocations(data);
  };

  const totals = useMemo(() => {
    const revenue = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.agreed_price) || 0), 0);
    const tripExp = allExpenses.filter(e => e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const fixedExp = allExpenses.filter(e => !e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const maintenanceCosts = allMaintenance.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
    const commissions = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.driver_commission) || 0), 0);
    
    const totalExp = tripExp + fixedExp + maintenanceCosts;
    const profit = revenue - totalExp - commissions;
    return { revenue, expense: totalExp, profit, fleet: allVehicles.length, drivers: drivers.length };
  }, [allTrips, allExpenses, allVehicles, allMaintenance, drivers]);

  // Performance por motorista (Dashboard) organizada por nome/email
  const performanceByDriver = useMemo(() => {
    const map = new Map<string, { id: string, name: string, email: string, revenue: number, expense: number, trips: number, profit: number }>();
    
    drivers.forEach(d => {
      map.set(d.id, { id: d.id, name: d.name, email: d.email, revenue: 0, expense: 0, trips: 0, profit: 0 });
    });

    allTrips.forEach(t => {
      if (t.status === TripStatus.COMPLETED && t.user_id) {
        const stats = map.get(t.user_id);
        if (stats) {
          stats.revenue += (Number(t.agreed_price) || 0);
          stats.trips += 1;
          stats.profit -= (Number(t.driver_commission) || 0);
        }
      }
    });

    allExpenses.forEach(e => {
      if (e.user_id) {
        const stats = map.get(e.user_id);
        if (stats) stats.expense += (Number(e.amount) || 0);
      }
    });

    return Array.from(map.values()).map(s => ({
      ...s,
      profit: s.revenue - s.expense
    })).sort((a, b) => a.name.localeCompare(b.name));
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

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('drivers').insert([driverForm]);
      if (error) throw error;
      setDriverForm({ name: '', email: '', password: '' });
      loadAllAdminData();
      alert("Motorista cadastrado com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.sender.trim()) return alert("Informe o remetente do comunicado.");
    setLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        title: alertForm.title,
        message: alertForm.message,
        sender: alertForm.sender,
        type: alertForm.type,
        category: alertForm.category,
        target_user_email: alertForm.target_user_email === '' ? null : alertForm.target_user_email,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setAlertForm({ title: '', message: '', sender: 'Gestão Master', target_user_email: '', type: 'INFO', category: 'GENERAL' });
      alert("Comunicado enviado com sucesso para a equipe!");
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

  const driversWithLocations = useMemo(() => {
    return drivers.map(d => {
      // Como locations está ordenado por updated_at desc, o .find() pega o mais recente
      const loc = locations.find(l => l.user_id === d.id || l.email === d.email);
      return { ...d, location: loc };
    });
  }, [drivers, locations]);

  const selectedDriverData = useMemo(() => {
    if (!selectedDriverId) return null;
    return driversWithLocations.find(d => d.id === selectedDriverId);
  }, [selectedDriverId, driversWithLocations]);

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
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gasto Global</p>
                   <p className="text-3xl font-black mt-2 text-rose-400">{formatCurrency(totals.expense)}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                   <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Lucro Real</p>
                   <p className="text-3xl font-black mt-2">{formatCurrency(totals.profit)}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rede Ativa</p>
                   <p className="text-3xl font-black mt-2">{totals.drivers} Motoristas</p>
                </div>
             </div>

             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                   <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><ReceiptText className="text-amber-500"/> Performance Financeira por Motorista</h3>
                   <button onClick={exportData} className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest"><Download size={16}/> Exportar Dados</button>
                </div>
                <div className="space-y-4">
                   <div className="hidden md:grid grid-cols-5 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest pb-2">
                      <div className="col-span-2">Condutor / Identificação</div>
                      <div>Viagens Realizadas</div>
                      <div>Faturamento</div>
                      <div className="text-right">Lucro Gerado</div>
                   </div>
                   {performanceByDriver.length === 0 ? (
                      <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-white/5">
                         <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">Sem movimentação registrada.</p>
                      </div>
                   ) : performanceByDriver.map(stats => (
                      <div key={stats.id} className="p-6 bg-slate-900/50 rounded-3xl grid grid-cols-1 md:grid-cols-5 gap-4 items-center border border-white/5 hover:border-amber-500/30 transition-all">
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
                            <span className="md:hidden text-[9px] font-bold text-slate-500 uppercase">Lucro:</span>
                            <span className={`font-black text-sm ${stats.profit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {formatCurrency(stats.profit)}
                            </span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'TRACKING' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in h-[750px]">
              <div className="bg-white/5 p-8 rounded-[4rem] border border-white/10 flex flex-col h-full">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black uppercase flex items-center gap-3"><Users className="text-amber-500"/> Equipe Logada</h3>
                    <button onClick={refreshLocations} className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white"><RefreshCcw size={16}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {driversWithLocations.length === 0 ? (
                       <div className="text-center py-20 flex flex-col items-center">
                          <Users size={48} className="text-slate-800 mb-4" />
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Nenhum condutor encontrado.</p>
                       </div>
                    ) : driversWithLocations.map(driver => (
                       <div 
                         key={driver.id} 
                         onClick={() => setSelectedDriverId(driver.id)}
                         className={`p-5 bg-slate-900 border cursor-pointer rounded-3xl flex justify-between items-center transition-all ${selectedDriverId === driver.id ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xl shadow-amber-500/10' : 'border-white/5 hover:border-white/20'}`}
                       >
                          <div className="flex-1 overflow-hidden">
                             <div className="flex items-center gap-2">
                                <p className="text-sm font-black uppercase truncate tracking-tighter">{driver.name}</p>
                                {driver.location ? <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span> : <span className="w-2 h-2 bg-slate-700 rounded-full"></span>}
                             </div>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                {driver.location ? `Última conexão: ${new Date(driver.location.updated_at).toLocaleTimeString()}` : 'Sem rastreio ativo'}
                             </p>
                          </div>
                          {driver.location && <MapPin size={16} className={selectedDriverId === driver.id ? 'text-amber-500' : 'text-slate-600'}/>}
                       </div>
                    ))}
                 </div>
              </div>
              <div className="lg:col-span-2 bg-white/5 rounded-[4rem] border border-white/10 overflow-hidden relative group">
                 <div className={`absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm z-10 transition-all pointer-events-none ${selectedDriverId ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="text-center p-10 bg-slate-950/80 rounded-3xl border border-white/10 max-w-sm backdrop-blur-xl">
                       <Radar size={48} className="text-amber-500 mx-auto mb-4 animate-pulse" />
                       <h4 className="text-lg font-black uppercase mb-2 tracking-tighter">Radar de Frota</h4>
                       <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Selecione um motorista ao lado para visualizar o ponto exato no mapa satélite.</p>
                    </div>
                 </div>
                 
                 {selectedDriverData?.location ? (
                    <iframe 
                      title="Live Tracking" 
                      className="w-full h-full border-0 grayscale invert opacity-60 transition-all" 
                      src={`https://www.google.com/maps?q=${selectedDriverData.location.latitude},${selectedDriverData.location.longitude}&z=14&output=embed`} 
                    />
                 ) : (
                    <iframe title="Map Background" className="w-full h-full border-0 grayscale invert opacity-10" src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000000!2d-50!3d-15!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbr!4v1" />
                 )}

                 {selectedDriverData && (
                    <div className="absolute bottom-8 left-8 right-8 bg-slate-950/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between z-20 animate-slide-up">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center font-black text-slate-950">{selectedDriverData.name[0]}</div>
                          <div>
                             <h4 className="font-black text-sm uppercase">{selectedDriverData.name}</h4>
                             <p className="text-[10px] text-amber-500 font-bold uppercase">{selectedDriverData.location ? `Lat: ${selectedDriverData.location.latitude.toFixed(4)} | Long: ${selectedDriverData.location.longitude.toFixed(4)}` : 'Localização indisponível'}</p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => window.open(`https://www.google.com/maps?q=${selectedDriverData.location?.latitude},${selectedDriverData.location?.longitude}`, '_blank')} className="p-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all"><ExternalLink size={20}/></button>
                          <button onClick={() => setSelectedDriverId(null)} className="p-3 bg-white/5 rounded-xl text-slate-500 hover:text-white"><X size={20}/></button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'DRIVERS' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase flex items-center gap-3 tracking-tighter"><UserPlus className="text-amber-500" size={28}/> Novo Cadastro de Equipe</h3>
                 <form onSubmit={handleAddDriver} className="space-y-6">
                    <input required placeholder="Nome Completo do Condutor" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-bold text-white focus:ring-2 focus:ring-amber-500/50" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                    <input required type="email" placeholder="E-mail Corporativo" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-bold text-white focus:ring-2 focus:ring-amber-500/50" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                    <input required type="password" placeholder="Definir Chave de Acesso" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-bold text-white focus:ring-2 focus:ring-amber-500/50" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                    <button type="submit" disabled={loading} className="w-full py-6 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">
                       {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Cadastrar e Liberar Portal'}
                    </button>
                 </form>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Condutores Cadastrados</h3>
                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                    {drivers.map(d => (
                       <div key={d.id} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl flex justify-between items-center group hover:border-white/10 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-amber-500 uppercase">{d.name[0]}</div>
                             <div>
                                <p className="text-sm font-black uppercase tracking-tighter">{d.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{d.email}</p>
                             </div>
                          </div>
                          <button onClick={() => deleteRecord('drivers', d.id)} className="p-3 text-slate-500 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'FLEET' && (
          <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Truck className="text-amber-500"/> Inventário de Frota Ativa</h3>
                <span className="bg-white/5 px-6 py-2 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{allVehicles.length} Unidades Registradas</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allVehicles.map(v => (
                   <div key={v.id} className="p-8 bg-slate-900 border border-white/5 rounded-[3rem] group hover:border-amber-500/50 transition-all shadow-xl">
                      <div className="flex justify-between items-start mb-6">
                         <div className="p-4 bg-white/5 text-amber-500 rounded-2xl"><Truck size={28}/></div>
                         <span className="bg-white text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md">{v.plate}</span>
                      </div>
                      <h4 className="text-lg font-black uppercase tracking-tighter">{v.model}</h4>
                      <p className="text-slate-500 font-bold text-[10px] mt-1 uppercase tracking-widest">{v.year}</p>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                         <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Km Rodados</p>
                            <p className="text-base font-black text-white">{v.current_km.toLocaleString()} KM</p>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Eixos</p>
                            <p className="text-base font-black text-white">{v.axles || 2}</p>
                         </div>
                      </div>
                      <button onClick={() => deleteRecord('vehicles', v.id)} className="w-full mt-6 py-3 bg-rose-500/10 text-rose-500 rounded-2xl text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Excluir Veículo</button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'PARTNERS' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase tracking-tight flex items-center gap-3"><Store className="text-amber-500"/> Nova Parceria no Radar</h3>
                 <form onSubmit={handleAddPartner} className="space-y-6">
                    <input required placeholder="Nome do Estabelecimento" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-bold text-white focus:ring-2 focus:ring-amber-500/50" value={partnerForm.name} onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} />
                    <select className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-black uppercase text-[10px] text-white focus:ring-2 focus:ring-amber-500/50" value={partnerForm.type} onChange={e => setPartnerForm({...partnerForm, type: e.target.value})}>
                       <option>Posto de Combustível</option>
                       <option>Oficina Diesel</option>
                       <option>Borracharia</option>
                       <option>Restaurante / Parada</option>
                       <option>Pátio / Descanso</option>
                       {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                    <input required placeholder="Endereço ou Rodovia KM" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-bold text-white" value={partnerForm.address} onChange={e => setPartnerForm({...partnerForm, address: e.target.value})} />
                    <input placeholder="URL do Google Maps (Opcional)" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none font-bold text-white" value={partnerForm.location_url} onChange={e => setPartnerForm({...partnerForm, location_url: e.target.value})} />
                    <button type="submit" disabled={loading} className="w-full py-6 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">Salvar no Radar</button>
                 </form>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Rede de Serviços Ativa</h3>
                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                    {roadServices.map(s => (
                       <div key={s.id} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl flex justify-between items-center group hover:border-white/10 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-white/5 text-amber-500 rounded-2xl">
                                {s.type.includes('Posto') ? <Fuel size={20}/> : s.type.includes('Oficina') ? <Wrench size={20}/> : <Utensils size={20}/>}
                             </div>
                             <div>
                                <p className="text-sm font-black uppercase tracking-tighter">{s.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.type}</p>
                             </div>
                          </div>
                          <button onClick={() => deleteRecord('road_services', s.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'ALERTS' && (
           <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><Bell className="text-amber-500" size={28}/> Transmissão de Comunicado</h3>
                 <form onSubmit={handleSendAlert} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Remetente</label>
                          <input required placeholder="Ex: Logística" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={alertForm.sender} onChange={e => setAlertForm({...alertForm, sender: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Prioridade</label>
                          <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-black uppercase text-[10px] text-white outline-none focus:ring-2 focus:ring-amber-500/50" value={alertForm.type} onChange={e => setAlertForm({...alertForm, type: e.target.value})}>
                             <option value="INFO">Informação</option>
                             <option value="WARNING">Aviso</option>
                             <option value="URGENT">Urgente</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Assunto</label>
                          <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-black uppercase text-[10px] text-white outline-none focus:ring-2 focus:ring-amber-500/50" value={alertForm.category} onChange={e => setAlertForm({...alertForm, category: e.target.value})}>
                             <option value="GENERAL">Geral</option>
                             <option value="MAINTENANCE">Manutenção</option>
                             <option value="FINANCE">Financeiro</option>
                             <option value="TRIP">Viagens</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Título do Comunicado</label>
                       <input required placeholder="Título curto e direto" className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Conteúdo da Mensagem</label>
                       <textarea required rows={4} placeholder="Descreva os detalhes do comunicado para a equipe..." className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Destinatário (Vazio = Toda Equipe)</label>
                       <select className="w-full p-6 bg-slate-900 border-none rounded-3xl font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                          <option value="">Enviar para Todos os Motoristas</option>
                          {drivers.map(d => <option key={d.id} value={d.email}>{d.name} ({d.email})</option>)}
                       </select>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-6 bg-white text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                       {loading ? <Loader2 className="animate-spin" /> : <Send size={18}/>} Transmitir para Equipe
                    </button>
                 </form>
              </div>
           </div>
        )}

        {activeTab === 'CONFIG' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Filter className="text-amber-500" size={28}/> Categorias</h3>
                    <button onClick={() => setShowCategoryModal(true)} className="p-3 bg-amber-500 text-slate-950 rounded-2xl hover:bg-amber-400 transition-all shadow-lg active:scale-90"><Plus size={20}/></button>
                 </div>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map(cat => (
                       <div key={cat.id} className="p-5 bg-slate-900 rounded-3xl flex justify-between items-center group border border-white/5 hover:border-amber-500/20 transition-all">
                          <span className="text-sm font-bold uppercase tracking-tight">{cat.name}</span>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                       </div>
                    ))}
                    <button onClick={() => setShowCategoryModal(true)} className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-500 mt-4">+ Nova Categoria de Carga</button>
                 </div>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-6 uppercase flex items-center gap-3 tracking-tighter"><Settings className="text-amber-500" size={28}/> Sistema Geral</h3>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center py-6 border-b border-white/5">
                       <div>
                          <p className="font-bold text-sm uppercase tracking-tighter">Backup Centralizado</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sincronização redundante ativa</p>
                       </div>
                       <div className="w-12 h-6 bg-emerald-500 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full ml-auto"></div></div>
                    </div>
                    <div className="flex justify-between items-center py-6 border-b border-white/5">
                       <div>
                          <p className="font-bold text-sm uppercase tracking-tighter">Monitor de Auditoria</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Registro de logs administrativos</p>
                       </div>
                       <div className="w-12 h-6 bg-amber-500 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full ml-auto"></div></div>
                    </div>
                 </div>
                 <button onClick={() => { if(confirm("Deseja mesmo limpar todos os comunicados antigos?")) supabase.from('notifications').delete().not('id', 'is', null).then(loadAllAdminData) }} className="w-full mt-10 py-4 border-2 border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Limpar Histórico de Alertas</button>
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
                     <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Descrição da Carga</label>
                     <input 
                        autoFocus
                        className="w-full p-5 bg-slate-950 border border-white/10 rounded-3xl font-bold outline-none focus:border-amber-500 text-white" 
                        placeholder="Ex: Grãos"
                        value={categoryName}
                        onChange={e => setCategoryName(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                     />
                  </div>
                  <button disabled={loading} onClick={handleAddCategory} className="w-full py-5 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center">
                     {loading ? <Loader2 className="animate-spin" size={20}/> : 'Adicionar'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
