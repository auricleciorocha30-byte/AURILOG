
import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils, Edit2, Tag, X, History, MessageSquareQuote, LogOut, RotateCcw, MapPinned, Radar, Navigation, Signal, ChevronRight, Search, LayoutDashboard, Truck, Wallet, CheckSquare, Eye, AlertTriangle, Info, ShieldCheck, Globe, Users, KeyRound, UserPlus, UserCheck, Unlock, Smartphone, Package, ReceiptText, Banknote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem, Driver } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
  onUnlockDriverApp: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout, onUnlockDriverApp }) => {
  const [activeTab, setActiveTab] = useState<'LOCATIONS' | 'DRIVERS' | 'EXPLORER' | 'ALERTS' | 'SERVICES' | 'CATEGORIES'>('LOCATIONS');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<RoadService[]>([]);
  const [sentNotifications, setSentNotifications] = useState<DbNotification[]>([]);
  const [categories, setCategories] = useState<string[]>(['Posto de Combustível', 'Restaurante', 'Oficina Diesel', 'Borracharia', 'Loja de Peças']);
  const [newCategory, setNewCategory] = useState('');
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Estados de Motoristas e Localização
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverLocations, setDriverLocations] = useState<UserLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<(Driver & { location?: UserLocation }) | null>(null);
  const [locationSearch, setLocationSearch] = useState('');

  // Form de Novo Motorista
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });

  // Estados do Explorador de Dados
  const [explorerDriver, setExplorerDriver] = useState<Driver | null>(null);
  const [explorerData, setExplorerData] = useState<{
    trips: Trip[],
    expenses: Expense[],
    vehicles: Vehicle[],
    maintenance: MaintenanceItem[]
  } | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Form de Alerta
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'URGENT' | 'WARNING',
    category: 'GENERAL' as 'JORNADA' | 'MAINTENANCE' | 'FINANCE' | 'TRIP' | 'GENERAL',
    target_user_email: '' 
  });

  // Form de Serviço
  const [serviceForm, setServiceForm] = useState({
    name: '',
    type: 'Posto de Combustível',
    description: '',
    address: '',
    phone: '',
    location_url: ''
  });

  useEffect(() => {
    fetchDrivers();
    fetchServices();
    fetchCategories();
    fetchNotifications();
    fetchLocations();

    const locationChannel = supabase
      .channel('admin-tracking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setDriverLocations(prev => {
            const index = prev.findIndex(l => l.email === payload.new.email);
            if (index >= 0) {
              const next = [...prev];
              next[index] = payload.new as UserLocation;
              return next;
            }
            return [...prev, payload.new as UserLocation];
          });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(locationChannel); 
    };
  }, []);

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name', { ascending: true });
    if (data) setDrivers(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('user_locations').select('*').order('updated_at', { ascending: false });
    if (data) setDriverLocations(data);
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.email || !driverForm.password) return alert("Preencha todos os campos.");
    setLoading(true);
    try {
      const { error } = await supabase.from('drivers').insert([{
        name: driverForm.name,
        email: driverForm.email.toLowerCase().trim(),
        password: driverForm.password,
        status: 'Ativo'
      }]);

      if (error) {
        if (error.code === '23505') throw new Error("Este e-mail já está cadastrado.");
        throw error;
      }

      alert(`Motorista ${driverForm.name} cadastrado com sucesso!`);
      setDriverForm({ name: '', email: '', password: '' });
      fetchDrivers();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("Remover este motorista do sistema?")) return;
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (!error) {
      setDrivers(prev => prev.filter(d => d.id !== id));
      if (selectedDriver?.id === id) setSelectedDriver(null);
    }
  };

  const fetchExplorerData = async (driver: Driver) => {
    setExplorerLoading(true);
    setExplorerDriver(driver);
    setExplorerData(null);
    try {
      // Puxamos os dados cruzando pelo e-mail do motorista que é a chave do rastreamento
      const { data: locData } = await supabase.from('user_locations').select('user_id').eq('email', driver.email).maybeSingle();
      
      const userId = locData?.user_id || driver.id; // Fallback se não tiver logado ainda

      const [tripsRes, expRes, vehRes, maintRes] = await Promise.all([
        supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', userId).order('plate', { ascending: true }),
        supabase.from('maintenance').select('*').eq('user_id', userId).order('purchase_date', { ascending: false })
      ]);

      setExplorerData({
        trips: tripsRes.data || [],
        expenses: expRes.data || [],
        vehicles: vehRes.data || [],
        maintenance: maintRes.data || []
      });
    } catch (e) {
      alert("Erro ao carregar dados.");
    } finally {
      setExplorerLoading(false);
    }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (data) setSentNotifications(data);
  };

  const fetchServices = async () => {
    const { data } = await supabase.from('road_services').select('*').order('created_at', { ascending: false });
    if (data) setServices(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('road_services').select('type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map((i: any) => i.type as string)));
      if (uniqueTypes.length > 0) setCategories(prev => Array.from(new Set([...prev, ...uniqueTypes])) as string[]);
    }
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.title || !alertForm.message) return alert("Preencha título e mensagem.");
    setLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert([{
        title: alertForm.title,
        message: alertForm.message,
        type: alertForm.type,
        category: alertForm.category,
        target_user_email: alertForm.target_user_email || null 
      }]);
      if (error) throw error;
      alert("Alerta enviado!");
      setAlertForm({ title: '', message: '', type: 'INFO', category: 'GENERAL', target_user_email: '' });
      fetchNotifications();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) fetchNotifications();
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      setNewCategory('');
      return;
    }
    setCategories(prev => [...prev, newCategory.trim()]);
    setNewCategory('');
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.address || !serviceForm.location_url) return alert("Preencha nome, endereço e link do mapa.");
    setLoading(true);
    try {
      if (editingServiceId) {
        const { error } = await supabase.from('road_services').update(serviceForm).eq('id', editingServiceId);
        if (error) throw error;
        alert("Atualizado!");
      } else {
        const { error } = await supabase.from('road_services').insert([serviceForm]);
        if (error) throw error;
        alert("Cadastrado!");
      }
      setServiceForm({ name: '', type: categories[0] || 'Posto de Combustível', description: '', address: '', phone: '', location_url: '' });
      setEditingServiceId(null);
      fetchServices();
    } catch (err: any) {
      alert("Erro ao salvar serviço: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Remover serviço?")) return;
    const { error } = await supabase.from('road_services').delete().eq('id', id);
    if (!error) fetchServices();
  };

  const isDriverOnline = (email: string) => {
    const loc = driverLocations.find(l => l.email === email);
    if (!loc) return false;
    return (Date.now() - new Date(loc.updated_at).getTime()) < 600000; 
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-fade-in py-6 md:py-12 px-4 pb-32">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary-600 text-white rounded-3xl shadow-xl shadow-primary-600/20">
             <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Administrativo</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestão Central de Frota e Auditoria</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onUnlockDriverApp} className="flex items-center gap-3 px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-xl transition-all active:scale-95"><Smartphone size={18} /> Abrir Portal Condutor</button>
          <button onClick={onLogout} className="flex items-center gap-3 px-8 py-5 bg-white border-2 border-slate-100 text-rose-500 rounded-2xl font-black text-[11px] uppercase hover:bg-rose-50 transition-all"><LogOut size={18} /> Sair</button>
        </div>
      </div>

      <div className="flex flex-wrap bg-slate-200 p-1 rounded-2xl md:rounded-[2rem] gap-1 w-full md:max-w-5xl mx-auto overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('LOCATIONS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'LOCATIONS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Localizar</button>
        <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DRIVERS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Motoristas</button>
        <button onClick={() => setActiveTab('EXPLORER')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'EXPLORER' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Explorar</button>
        <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Radar</button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'CATEGORIES' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Filtros</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
             <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">RADAR GPS DA FROTA</h3>
                  <button onClick={() => { fetchLocations(); fetchDrivers(); }} className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-full transition-all"><RefreshCcw size={16} /></button>
                </div>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input placeholder="Filtrar por nome..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" value={locationSearch} onChange={e => setLocationSearch(e.target.value)} />
                </div>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                   {drivers.filter(d => d.name.toLowerCase().includes(locationSearch.toLowerCase())).map(driver => {
                     const online = isDriverOnline(driver.email);
                     const loc = driverLocations.find(l => l.email === driver.email);
                     return (
                       <div key={driver.id} onClick={() => setSelectedDriver({ ...driver, location: loc })} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedDriver?.id === driver.id ? 'bg-primary-50 border-primary-200 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-4 overflow-hidden">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{driver.name[0].toUpperCase()}</div>
                             <div className="overflow-hidden">
                                <h4 className="font-black text-slate-800 text-sm truncate">{driver.name}</h4>
                                <p className={`text-[8px] font-black uppercase ${online ? 'text-emerald-500' : 'text-slate-400'}`}>{online ? 'SINAL ATIVO' : 'FORA DE SINAL'}</p>
                             </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                       </div>
                     );
                   })}
                </div>
             </div>
             <div className="lg:col-span-8 bg-white h-[700px] rounded-[3.5rem] border shadow-sm overflow-hidden relative">
                {selectedDriver?.location ? (
                  <iframe key={`${selectedDriver.id}-${selectedDriver.location.updated_at}`} title="Mapa Admin" className="w-full h-full border-0" src={`https://www.google.com/maps?q=${selectedDriver.location.latitude},${selectedDriver.location.longitude}&z=15&output=embed`} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
                     <MapPin size={48} className="text-slate-200 mb-4" />
                     <h4 className="text-xl font-black text-slate-400 uppercase">Selecione um motorista com sinal ativo</h4>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'DRIVERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
             <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><UserPlus size={28} className="text-primary-600"/> Novo Motorista</h3>
                <form onSubmit={handleAddDriver} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                      <input required placeholder="Nome do condutor" className="w-full p-5 bg-slate-50 rounded-3xl font-bold outline-none border-none" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail de Acesso</label>
                      <input required type="email" placeholder="email@aurilog.com" className="w-full p-5 bg-slate-50 rounded-3xl font-bold outline-none border-none" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha Inicial</label>
                      <input required type="password" placeholder="Senha segura" className="w-full p-5 bg-slate-50 rounded-3xl font-bold outline-none border-none" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                   </div>
                   <button disabled={loading} type="submit" className="w-full py-6 bg-primary-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                      {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Cadastrar Motorista'}
                   </button>
                </form>
             </div>
             
             <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm">
                <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Equipe Cadastrada</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                   {drivers.map(d => (
                     <div key={d.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-primary-600 border border-slate-100 shadow-sm">{d.name[0]}</div>
                           <div>
                              <h4 className="font-black text-slate-900 text-sm">{d.name}</h4>
                              <p className="text-[10px] text-slate-400 font-bold">{d.email}</p>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteDriver(d.id)} className="p-3 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'EXPLORER' && (
          <div className="space-y-8 animate-fade-in">
             <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                <h3 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-3"><Search size={24} className="text-primary-600"/> Auditoria de Dados por Condutor</h3>
                <div className="flex flex-wrap gap-3">
                   {drivers.map(d => (
                     <button key={d.id} onClick={() => fetchExplorerData(d)} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 ${explorerDriver?.id === d.id ? 'bg-primary-600 text-white shadow-xl' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                        {explorerDriver?.id === d.id ? <CheckCircle2 size={16}/> : <User size={16}/>} {d.name}
                     </button>
                   ))}
                </div>
             </div>

             {explorerLoading && (
               <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary-600" size={48} /></div>
             )}

             {explorerData && (
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                     <p className="text-[10px] font-black uppercase opacity-60">Viagens Realizadas</p>
                     <p className="text-5xl font-black mt-2">{explorerData.trips.length}</p>
                     <div className="mt-6 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs font-bold"><MapPin size={14}/> {explorerData.trips.reduce((acc, t) => acc + Number(t.distance_km), 0).toLocaleString()} KM Totais</div>
                  </div>
                  <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                     <p className="text-[10px] font-black uppercase opacity-60">Faturamento Bruto</p>
                     <p className="text-4xl font-black mt-2">R$ {explorerData.trips.reduce((acc, t) => acc + Number(t.agreed_price), 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                     <p className="text-[10px] font-black uppercase opacity-60">Despesas Totais</p>
                     <p className="text-4xl font-black mt-2">R$ {explorerData.expenses.reduce((acc, e) => acc + Number(e.amount), 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                     <p className="text-[10px] font-black uppercase opacity-60">Frota Associada</p>
                     <div className="mt-4 space-y-2">
                        {explorerData.vehicles.map(v => <div key={v.id} className="bg-white/10 p-2 rounded-lg flex items-center gap-2 text-xs font-black uppercase tracking-widest"><Truck size={12}/> {v.plate}</div>)}
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'ALERTS' && (
          <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
             <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Bell className="text-primary-600" size={28} /> Disparar Comunicado</h3>
                <form onSubmit={handleSendAlert} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Para quem?</label>
                         <select className="w-full p-5 bg-slate-50 border-none rounded-3xl font-bold outline-none text-xs" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                            <option value="">TODOS OS MOTORISTAS</option>
                            {drivers.map(d => <option key={d.id} value={d.email}>{d.name}</option>)}
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nível de Alerta</label>
                         <select className="w-full p-5 bg-slate-50 border-none rounded-3xl font-bold outline-none text-xs" value={alertForm.type} onChange={e => setAlertForm({...alertForm, type: e.target.value as any})}>
                            <option value="INFO">Informativo</option>
                            <option value="WARNING">Importante</option>
                            <option value="URGENT">Urgente / Crítico</option>
                         </select>
                      </div>
                   </div>
                   <input required placeholder="Título da Mensagem" className="w-full p-5 bg-slate-50 border-none rounded-3xl font-bold outline-none text-xs" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                   <textarea rows={3} required placeholder="Mensagem completa..." className="w-full p-5 bg-slate-50 border-none rounded-3xl font-bold outline-none text-xs resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                   <button disabled={loading} type="submit" className="w-full py-5 bg-primary-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Enviar Alerta</button>
                </form>
             </div>
             
             <div className="space-y-4">
                <h3 className="text-lg font-black uppercase px-2 text-slate-400">Histórico de Alertas</h3>
                <div className="space-y-3">
                   {sentNotifications.map(n => (
                     <div key={n.id} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between group">
                        <div>
                           <h4 className="font-black text-slate-900 text-sm uppercase">{n.title}</h4>
                           <p className="text-[10px] text-slate-500 line-clamp-1">{n.message}</p>
                           <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase ${n.type === 'URGENT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>{n.type}</span>
                              <span className="text-[7px] font-black bg-primary-50 text-primary-400 px-2 py-0.5 rounded-md uppercase">PARA: {n.target_user_email || 'GERAL'}</span>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteNotification(n.id)} className="p-3 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'SERVICES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-5 bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm h-fit">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Store className="text-primary-600" size={28}/> {editingServiceId ? 'Editar Parceiro' : 'Novo Parceiro'}</h3>
                <form onSubmit={handleSaveService} className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Local</label>
                      <input required placeholder="Ex: Posto Graal" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none text-sm" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Serviço</label>
                      <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none text-sm" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value})}>
                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <input placeholder="Endereço Completo" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none text-sm" value={serviceForm.address} onChange={e => setServiceForm({...serviceForm, address: e.target.value})} />
                   <input placeholder="Link Google Maps" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-none text-sm" value={serviceForm.location_url} onChange={e => setServiceForm({...serviceForm, location_url: e.target.value})} />
                   <div className="flex gap-2">
                     {editingServiceId && <button type="button" onClick={() => { setEditingServiceId(null); setServiceForm({name:'', type:'Posto de Combustível', description:'', address:'', phone:'', location_url:''}); }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>}
                     <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Salvar Parceiro</button>
                   </div>
                </form>
             </div>
             
             <div className="lg:col-span-7 bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm">
                <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Rede de Parceiros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {services.map(s => (
                     <div key={s.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between">
                        <div>
                           <div className="flex justify-between items-start">
                              <span className="text-[8px] font-black px-2 py-1 bg-white rounded-lg text-primary-600 uppercase border border-slate-100">{s.type}</span>
                              <div className="flex gap-1">
                                 <button onClick={() => { setEditingServiceId(s.id); setServiceForm({...s}); }} className="p-2 text-slate-400 hover:text-primary-600"><Edit2 size={16}/></button>
                                 <button onClick={() => handleDeleteService(s.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                              </div>
                           </div>
                           <h4 className="font-black text-slate-900 mt-3">{s.name}</h4>
                           <p className="text-[10px] text-slate-400 font-bold mt-1 line-clamp-1">{s.address}</p>
                        </div>
                        <button onClick={() => window.open(s.location_url, '_blank')} className="mt-4 w-full py-2 bg-white rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2 border border-slate-100"><ExternalLink size={12}/> Ver no Mapa</button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'CATEGORIES' && (
           <div className="max-w-2xl mx-auto w-full bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm animate-fade-in">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Tag className="text-primary-600" size={28}/> Categorias do Radar</h3>
              <div className="flex gap-4 mb-8">
                 <input placeholder="Nova categoria..." className="flex-1 p-5 bg-slate-50 rounded-3xl font-bold outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                 <button onClick={handleAddCategory} className="bg-primary-600 text-white px-8 rounded-3xl font-black uppercase text-xs"><Plus/></button>
              </div>
              <div className="flex flex-wrap gap-2">
                 {categories.map(c => (
                   <div key={c} className="px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 flex items-center gap-3">
                      {c}
                      <button onClick={() => setCategories(prev => prev.filter(cat => cat !== c))} className="text-slate-300 hover:text-rose-500"><X size={14}/></button>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
