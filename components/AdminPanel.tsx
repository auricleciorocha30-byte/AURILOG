import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils, Edit2, Tag, X, History, MessageSquareQuote, LogOut, RotateCcw, MapPinned, Radar, Navigation, Signal, ChevronRight, Search, LayoutDashboard, Truck, Wallet, CheckSquare, Eye, AlertTriangle, Info, ShieldCheck, Globe, Users, KeyRound, UserPlus, UserCheck, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem, Driver } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout }) => {
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
  const [explorerDriverId, setExplorerDriverId] = useState<string | null>(null);
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

    const driverChannel = supabase
      .channel('admin-driver-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchDrivers())
      .subscribe();

    return () => { 
      supabase.removeChannel(locationChannel); 
      supabase.removeChannel(driverChannel);
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
      // 1. No Supabase real, criaríamos o usuário no Auth via Edge Function.
      // Aqui, adicionamos à tabela de registro oficial de motoristas.
      const { error } = await supabase.from('drivers').insert([{
        name: driverForm.name,
        email: driverForm.email.toLowerCase().trim(),
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
    if (!error) fetchDrivers();
  };

  const fetchExplorerData = async (userEmail: string) => {
    setExplorerLoading(true);
    try {
      // Como as viagens/despesas são vinculadas ao user_id (UUID do Auth),
      // precisamos primeiro descobrir o ID do usuário através do e-mail nas localizações
      // ou assumindo que o e-mail no cadastro é o mesmo do login.
      const { data: locData } = await supabase.from('user_locations').select('user_id').eq('email', userEmail).single();
      
      if (!locData) {
         alert("Este motorista ainda não realizou o primeiro acesso ao aplicativo.");
         setExplorerLoading(false);
         return;
      }

      const userId = locData.user_id;

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
      alert("Erro ao carregar dados do condutor.");
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
      const uniqueTypes = Array.from(new Set(data.map(i => i.type)));
      if (uniqueTypes.length > 0) setCategories(prev => Array.from(new Set([...prev, ...uniqueTypes])));
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
        target_user_email: alertForm.target_user_email.trim() || null
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

  const handleResend = (n: DbNotification) => {
    setAlertForm({ 
      title: n.title, 
      message: n.message, 
      type: n.type as any, 
      category: n.category as any, 
      target_user_email: n.target_user_email || '' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab('ALERTS');
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm("Excluir definitivamente?")) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) setSentNotifications(sentNotifications.filter(n => n.id !== id));
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingServiceId) {
        await supabase.from('road_services').update(serviceForm).eq('id', editingServiceId);
      } else {
        await supabase.from('road_services').insert([serviceForm]);
      }
      setServiceForm({ name: '', type: categories[0] || '', description: '', address: '', phone: '', location_url: '' });
      setEditingServiceId(null);
      fetchServices();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  // Fix: Implemented handleDeleteService to remove a road service
  const handleDeleteService = async (id: string) => {
    if (!confirm("Excluir este parceiro?")) return;
    const { error } = await supabase.from('road_services').delete().eq('id', id);
    if (!error) fetchServices();
    else alert("Erro ao excluir serviço: " + error.message);
  };

  // Fix: Implemented handleAddCategory to add new service categories
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      alert("Categoria já existe.");
      return;
    }
    setCategories(prev => [...prev, newCategory.trim()]);
    setNewCategory('');
  };

  const isDriverOnline = (email: string) => {
    const loc = driverLocations.find(l => l.email === email);
    if (!loc) return false;
    return (Date.now() - new Date(loc.updated_at).getTime()) < 600000; // 10 minutos
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(locationSearch.toLowerCase()) || 
    d.email.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const openCollectiveTracking = () => {
    const onlineLocs = driverLocations.filter(loc => (Date.now() - new Date(loc.updated_at).getTime()) < 600000);
    if (onlineLocs.length === 0) return alert("Nenhum motorista online no momento.");
    const first = onlineLocs[0];
    window.open(`https://www.google.com/maps/search/?api=1&query=${first.latitude},${first.longitude}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-fade-in py-6 md:py-12 px-4 pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] border shadow-sm">
        <div className="w-full lg:w-auto">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Administrativo</h2>
          <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary-600" /> AuriLog Fleet Management
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={() => window.open(window.location.origin + '?mode=user', '_blank')} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase hover:border-primary-500 transition-all">
            <ExternalLink size={16} /> Abrir App
          </button>
          <button onClick={onLogout} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-rose-700 transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* Tabs - Adicionado DRIVERS */}
      <div className="flex flex-wrap bg-slate-200 p-1 rounded-2xl md:rounded-[2rem] gap-1 w-full md:max-w-5xl mx-auto overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('LOCATIONS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'LOCATIONS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Equipe</button>
        <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DRIVERS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Motoristas</button>
        <button onClick={() => setActiveTab('EXPLORER')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'EXPLORER' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Explorar</button>
        <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Serviços</button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'CATEGORIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Categorias</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* FROTA / MONITORAMENTO - Atualizado para mostrar todos os motoristas cadastrados */}
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">LISTA DE CONDUTORES</h3>
                  <button onClick={() => { fetchLocations(); fetchDrivers(); }} className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-full transition-all">
                    <RefreshCcw size={16} />
                  </button>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    placeholder="Filtrar por nome ou e-mail..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20" 
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                  />
                </div>

                <button onClick={() => setSelectedDriver(null)} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 mb-6 shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all">
                  <Globe size={18} /> VER FROTA NO MAPA
                </button>

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                   {filteredDrivers.map(driver => {
                     const online = isDriverOnline(driver.email);
                     const loc = driverLocations.find(l => l.email === driver.email);
                     return (
                       <div 
                         key={driver.id} 
                         onClick={() => setSelectedDriver({ ...driver, location: loc })} 
                         className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedDriver?.id === driver.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                       >
                          <div className="flex items-center gap-4 overflow-hidden">
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                {driver.name[0].toUpperCase()}
                             </div>
                             <div className="overflow-hidden">
                                <h4 className="font-black text-slate-800 text-sm leading-none mb-1 truncate">{driver.name}</h4>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${online ? 'text-emerald-500' : 'text-slate-400'}`}>
                                   {online ? 'ON-LINE' : 'OFF-LINE'}
                                </p>
                             </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                       </div>
                     );
                   })}
                </div>
             </div>

             <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Status da Frota</h3>
                      <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">
                         Exibindo {drivers.length} motoristas registrados.
                      </p>
                   </div>
                   <button onClick={openCollectiveTracking} className="bg-slate-950 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                      <ExternalLink size={18} /> RASTREIO DINÂMICO
                   </button>
                </div>

                <div className="bg-white h-[530px] rounded-[4rem] border shadow-sm overflow-hidden relative">
                   {selectedDriver?.location ? (
                     <iframe 
                       key={`${selectedDriver.id}-${selectedDriver.location.updated_at}`}
                       title="Driver Location Map" 
                       className="w-full h-full border-0" 
                       src={`https://www.google.com/maps?q=${selectedDriver.location.latitude},${selectedDriver.location.longitude}&z=15&output=embed`} 
                     />
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
                        <MapPin size={48} className={`mb-4 ${selectedDriver ? 'text-rose-300' : 'text-slate-200'}`} />
                        <h4 className="text-xl font-black text-slate-400 uppercase">
                          {selectedDriver ? `Sem sinal de GPS de ${selectedDriver.name}` : 'Selecione um motorista para localizar'}
                        </h4>
                        <p className="text-slate-300 font-bold text-sm mt-2 max-w-xs">
                          {selectedDriver ? 'O motorista pode estar offline ou não autorizou o rastreamento.' : 'Clique em um dos nomes à esquerda para focar no GPS dele.'}
                        </p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* NOVO: GESTÃO DE MOTORISTAS */}
        {activeTab === 'DRIVERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-5">
                <div className="bg-white p-8 md:p-12 rounded-[3rem] border shadow-sm h-fit">
                   <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter mb-8"><UserPlus className="text-primary-600" size={32} /> Novo Motorista</h3>
                   <form onSubmit={handleAddDriver} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                        <div className="relative">
                           <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                           <input required placeholder="Nome do Condutor" className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail de Login</label>
                        <div className="relative">
                           <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                           <input required type="email" placeholder="motorista@aurilog.com" className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha de Acesso</label>
                        <div className="relative">
                           <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                           <input required type="password" placeholder="••••••••" className="w-full p-5 pl-14 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                        </div>
                      </div>
                      <button disabled={loading} type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} />} Cadastrar na Base
                      </button>
                   </form>
                </div>
             </div>

             <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black uppercase px-2 flex items-center gap-2 text-slate-400"><Users size={20} /> Motoristas Cadastrados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                   {drivers.map(d => (
                     <div key={d.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col justify-between group transition-all hover:border-primary-100">
                        <div className="flex items-start justify-between mb-4">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl">
                              {d.name[0].toUpperCase()}
                           </div>
                           <button onClick={() => handleDeleteDriver(d.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div>
                           <h4 className="font-black text-slate-900 text-sm mb-1 uppercase truncate">{d.name}</h4>
                           <p className="text-[10px] text-slate-400 font-bold mb-3 lowercase truncate">{d.email}</p>
                           <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">{d.status}</span>
                              <span className="text-[8px] font-black text-slate-300 uppercase">Desde {new Date(d.created_at).toLocaleDateString()}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* EXPLORADOR DE DADOS - Atualizado para usar a lista oficial */}
        {activeTab === 'EXPLORER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-4">
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-fit">
                   <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter mb-6"><Eye className="text-primary-600" size={24} /> Explorador</h3>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-4">Selecione o Motorista para Auditoria</p>
                      {drivers.map(d => (
                        <button key={d.id} onClick={() => { setExplorerDriverId(d.id); fetchExplorerData(d.email); }} className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${explorerDriverId === d.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                           <div className="overflow-hidden">
                              <p className="font-black text-xs uppercase truncate leading-none mb-1">{d.name}</p>
                              <p className={`text-[8px] font-bold uppercase ${explorerDriverId === d.id ? 'text-slate-500' : 'text-slate-400'}`}>{d.email}</p>
                           </div>
                           <ChevronRight size={14} />
                        </button>
                      ))}
                   </div>
                </div>
             </div>
             <div className="lg:col-span-8">
                {explorerLoading ? <Loader2 className="animate-spin mx-auto mt-20 text-primary-600" size={64} /> : explorerData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="bg-white p-6 rounded-3xl border shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Veículos</p>
                          <p className="text-2xl font-black text-slate-900">{explorerData.vehicles.length}</p>
                       </div>
                       <div className="bg-white p-6 rounded-3xl border shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Viagens</p>
                          <p className="text-2xl font-black text-slate-900">{explorerData.trips.length}</p>
                       </div>
                       <div className="bg-white p-6 rounded-3xl border shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Gastos</p>
                          <p className="text-2xl font-black text-slate-900">{explorerData.expenses.length}</p>
                       </div>
                       <div className="bg-white p-6 rounded-3xl border shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Manutenções</p>
                          <p className="text-2xl font-black text-slate-900">{explorerData.maintenance.length}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                          <h4 className="font-black text-sm uppercase mb-4 flex items-center gap-2"><Truck size={16} className="text-primary-600" /> Frota do Usuário</h4>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                             {explorerData.vehicles.map(v => (
                               <div key={v.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                  <div><p className="font-black text-xs leading-none">{v.plate}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{v.model}</p></div>
                                  <span className="text-[9px] font-black bg-white px-2 py-1 rounded-lg border">{v.current_km.toLocaleString()} KM</span>
                               </div>
                             ))}
                          </div>
                       </div>
                       <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                          <h4 className="font-black text-sm uppercase mb-4 flex items-center gap-2"><Wallet size={16} className="text-emerald-600" /> Últimos Lançamentos</h4>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                             {explorerData.expenses.slice(0, 10).map(e => (
                               <div key={e.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                  <div className="overflow-hidden"><p className="font-black text-xs leading-none truncate">{e.description}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(e.date).toLocaleDateString()}</p></div>
                                  <span className="text-[10px] font-black text-rose-600 whitespace-nowrap">R$ {e.amount.toLocaleString()}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
                {!explorerData && !explorerLoading && (
                  <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                     <LayoutDashboard size={64} className="text-slate-100 mb-4" />
                     <p className="text-slate-300 font-black uppercase text-xs">Selecione um motorista para iniciar a auditoria</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* ALERTAS - Atualizado para usar os e-mails dos motoristas registrados */}
        {activeTab === 'ALERTS' && (
          <div className="space-y-6 md:space-y-10">
            <div className="max-w-4xl mx-auto w-full bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border shadow-sm">
               <h3 className="text-xl md:text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Bell className="text-primary-600" size={24} /> Disparar Mensagem</h3>
                <form onSubmit={handleSendAlert} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destino (Vazio = TODOS)</label>
                      <div className="relative">
                        <select className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-xs appearance-none" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                            <option value="">TODOS OS MOTORISTAS (Público)</option>
                            {drivers.map(d => <option key={d.id} value={d.email}>{d.name} ({d.email})</option>)}
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={16} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prioridade Visual</label>
                      <select className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-xs" value={alertForm.type} onChange={e => setAlertForm({...alertForm, type: e.target.value as any})}>
                          <option value="INFO">Informação (Azul)</option>
                          <option value="WARNING">Aviso (Amarelo)</option>
                          <option value="URGENT">Urgente (Vermelho)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Assunto / Categoria</label>
                      <select className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-xs" value={alertForm.category} onChange={e => setAlertForm({...alertForm, category: e.target.value as any})}>
                          <option value="GENERAL">Geral</option>
                          <option value="JORNADA">Jornada de Trabalho</option>
                          <option value="MAINTENANCE">Manutenção</option>
                          <option value="FINANCE">Financeiro</option>
                          <option value="TRIP">Viagem / Rota</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título</label>
                      <input required placeholder="Ex: Manutenção Programada" className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-xs" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Conteúdo da Mensagem</label>
                    <textarea rows={4} required placeholder="Digite os detalhes do comunicado aqui..." className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none resize-none text-xs" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                  </div>

                  <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />} Disparar Alerta Agora
                  </button>
                </form>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              <h3 className="text-lg font-black uppercase px-2 flex items-center gap-2"><History size={20} className="text-primary-600" /> Histórico de Disparos</h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar border-t pt-4">
                {sentNotifications.map(n => (
                  <div key={n.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-start justify-between gap-4">
                    <div className="flex gap-4 overflow-hidden">
                       <div className="p-4 rounded-2xl shrink-0 h-fit bg-slate-50 text-slate-400">
                         <Info size={24}/>
                       </div>
                       <div className="overflow-hidden">
                         <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-black text-slate-900 uppercase text-sm tracking-tighter">{n.title}</h4>
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase tracking-widest">{n.category}</span>
                            {n.target_user_email && <span className="text-[7px] font-black bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full uppercase tracking-widest">PRIVADO</span>}
                         </div>
                         <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3">{n.message}</p>
                         <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span>{new Date(n.created_at).toLocaleString()}</span>
                           <span className="text-slate-200">•</span>
                           {n.target_user_email ? (
                             <span className="text-primary-600 font-black">PARA: {n.target_user_email.toUpperCase()}</span>
                           ) : (
                             <span className="text-slate-400 font-black">PARA: TODOS OS MOTORISTAS</span>
                           )}
                         </div>
                       </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleResend(n)} title="Reenviar" className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-lg"><RotateCcw size={14} /></button>
                      <button onClick={() => handleDeleteNotification(n.id)} title="Excluir" className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIAS E SERVIÇOS - Mantidos mas agora integrados visualmente */}
        {activeTab === 'CATEGORIES' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 md:space-y-8 animate-fade-in">
            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border shadow-sm">
              <h3 className="text-xl md:text-2xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight"><Tag className="text-primary-600" size={24} /> Gestão de Categorias</h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <input placeholder="Ex: Mecânica Geral" className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                <button onClick={handleAddCategory} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px]">Adicionar</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:border-slate-200">
                    <span className="font-bold text-slate-700 text-xs">{cat}</span>
                    <button onClick={() => { if(confirm(`Remover "${cat}"?`)) setCategories(categories.filter(c => c !== cat)) }} className="text-slate-300 hover:text-rose-500 p-2 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SERVICES' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 animate-fade-in">
            <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border shadow-sm h-fit">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight">{editingServiceId ? <Edit2 className="text-amber-500" /> : <Plus className="text-emerald-600" />} {editingServiceId ? 'Editar' : 'Novo Parceiro'}</h3>
              <form onSubmit={handleSaveService} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Nome</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-xs" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Categoria</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-xs" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value as any})}>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Endereço</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-xs" value={serviceForm.address} onChange={e => setServiceForm({...serviceForm, address: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Link Maps</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-xs" value={serviceForm.location_url} onChange={e => setServiceForm({...serviceForm, location_url: e.target.value})} />
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] mt-4 shadow-lg active:scale-95 transition-all">{editingServiceId ? 'Salvar Alterações' : 'Cadastrar Parceiro'}</button>
              </form>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-lg font-black uppercase flex items-center gap-2"><Store size={18} className="text-primary-600" /> Parceiros Cadastrados</h3>
              <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {services.map(s => (
                  <div key={s.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between group hover:border-primary-200">
                    <div className="flex gap-4 items-center overflow-hidden">
                       <div className="p-3 bg-slate-50 text-slate-400 rounded-xl shrink-0">{s.type.includes('Posto') ? <Fuel size={16} /> : s.type.includes('Restaurante') ? <Utensils size={16} /> : <Wrench size={16} />}</div>
                       <div className="overflow-hidden"><h4 className="font-black text-slate-900 truncate text-xs">{s.name}</h4><p className="text-[9px] font-bold text-slate-400 uppercase truncate">{s.address}</p></div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                       <button onClick={() => { setEditingServiceId(s.id); setServiceForm({name: s.name, type: s.type as any, description: s.description, address: s.address, phone: s.phone, location_url: s.location_url}); }} className="p-2 text-slate-400 hover:text-amber-500 rounded-lg"><Edit2 size={14}/></button>
                       <button onClick={() => handleDeleteService(s.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};