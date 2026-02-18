
import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils, Edit2, Tag, X, History, MessageSquareQuote, LogOut, RotateCcw, MapPinned, Radar, Navigation, Signal, ChevronRight, Search, LayoutDashboard, Truck, Wallet, CheckSquare, Eye, AlertTriangle, Info, ShieldCheck, Globe, Users, KeyRound, UserPlus, UserCheck, Unlock, Smartphone } from 'lucide-react';
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

  const fetchExplorerData = async (userEmail: string) => {
    setExplorerLoading(true);
    setExplorerData(null);
    try {
      const { data: locData } = await supabase.from('user_locations').select('user_id').eq('email', userEmail).maybeSingle();
      
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
    if (!confirm("Excluir definitivamente?")) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) setSentNotifications(sentNotifications.filter(n => n.id !== id));
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
        alert("Serviço atualizado!");
      } else {
        const { error } = await supabase.from('road_services').insert([serviceForm]);
        if (error) throw error;
        alert("Novo parceiro cadastrado!");
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
    if (!confirm("Remover este parceiro da rede?")) return;
    const { error } = await supabase.from('road_services').delete().eq('id', id);
    if (!error) fetchServices();
    else alert("Erro ao excluir: " + error.message);
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
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Master</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestão Central de Frota</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Abre o App do Motorista em uma nova guia para facilitar a auditoria do gestor */}
          <button 
            onClick={onUnlockDriverApp} 
            className="flex items-center gap-3 px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Smartphone size={18} /> Abrir App Motorista (Nova Guia)
          </button>
          <button 
            onClick={onLogout} 
            className="flex items-center gap-3 px-8 py-5 bg-white border-2 border-slate-100 text-rose-500 rounded-2xl font-black text-[11px] uppercase hover:bg-rose-50 transition-all"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      <div className="flex flex-wrap bg-slate-200 p-1 rounded-2xl md:rounded-[2rem] gap-1 w-full md:max-w-5xl mx-auto overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('LOCATIONS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'LOCATIONS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Monitorar</button>
        <button onClick={() => setActiveTab('DRIVERS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DRIVERS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Motoristas</button>
        <button onClick={() => setActiveTab('EXPLORER')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'EXPLORER' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Explorar</button>
        <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Serviços</button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'CATEGORIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Categorias</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">MOTORISTAS ATIVOS</h3>
                  <button onClick={() => { fetchLocations(); fetchDrivers(); }} className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-full transition-all"><RefreshCcw size={16} /></button>
                </div>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input placeholder="Buscar por nome ou e-mail..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none" value={locationSearch} onChange={e => setLocationSearch(e.target.value)} />
                </div>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                   {drivers.filter(d => d.name.toLowerCase().includes(locationSearch.toLowerCase()) || d.email.toLowerCase().includes(locationSearch.toLowerCase())).map(driver => {
                     const online = isDriverOnline(driver.email);
                     const loc = driverLocations.find(l => l.email === driver.email);
                     return (
                       <div key={driver.id} onClick={() => setSelectedDriver({ ...driver, location: loc })} className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedDriver?.id === driver.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-4 overflow-hidden">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{driver.name[0].toUpperCase()}</div>
                             <div className="overflow-hidden">
                                <h4 className="font-black text-slate-800 text-sm truncate">{driver.name}</h4>
                                <p className={`text-[8px] font-black uppercase ${online ? 'text-emerald-500' : 'text-slate-400'}`}>{online ? 'SINAL GPS ATIVO' : 'OFFLINE'}</p>
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
                  <iframe key={`${selectedDriver.id}-${selectedDriver.location.updated_at}`} title="Mapa Motorista" className="w-full h-full border-0" src={`https://www.google.com/maps?q=${selectedDriver.location.latitude},${selectedDriver.location.longitude}&z=15&output=embed`} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
                     <MapPin size={48} className="text-slate-200 mb-4" />
                     <h4 className="text-xl font-black text-slate-400 uppercase">{selectedDriver ? `Sem sinal de ${selectedDriver.name}` : 'Selecione um motorista para localizar'}</h4>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'DRIVERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-5 bg-white p-8 md:p-12 rounded-[3rem] border shadow-sm h-fit">
                <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter mb-8"><UserPlus className="text-primary-600" size={32} /> Novo Motorista</h3>
                <form onSubmit={handleAddDriver} className="space-y-5">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Condutor</label>
                     <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail de Login</label>
                     <input required type="email" placeholder="motorista@aurilog.com" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha de Acesso</label>
                     <input required type="text" placeholder="Defina uma senha" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                   </div>
                   <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
                     {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} />} Cadastrar Motorista
                   </button>
                </form>
             </div>
             <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black uppercase px-2 text-slate-400">Frota Cadastrada</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {drivers.map(d => (
                     <div key={d.id} className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between group transition-all">
                        <div className="flex items-start justify-between">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl">{d.name[0].toUpperCase()}</div>
                           <button onClick={() => handleDeleteDriver(d.id)} className="p-2 text-slate-200 hover:text-rose-500"><Trash2 size={18} /></button>
                        </div>
                        <div className="mt-4">
                           <h4 className="font-black text-slate-900 text-sm mb-1 uppercase truncate">{d.name}</h4>
                           <p className="text-[10px] text-slate-400 font-bold mb-3 truncate">{d.email}</p>
                           <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Senha Atual:</p>
                             <p className="text-[10px] font-black text-slate-600">{d.password || '---'}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'ALERTS' && (
          <div className="max-w-4xl mx-auto w-full space-y-10 animate-fade-in">
             <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Bell className="text-primary-600" size={28} /> Disparar Mensagem</h3>
                <form onSubmit={handleSendAlert} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destino</label>
                         <div className="relative">
                            <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none text-xs appearance-none cursor-pointer focus:ring-2 focus:ring-primary-500" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                                <option value="">TODOS OS MOTORISTAS (Público)</option>
                                {drivers.map(d => <option key={d.id} value={d.email}>{d.name} ({d.email})</option>)}
                            </select>
                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
                         </div>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prioridade</label>
                         <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none text-xs" value={alertForm.type} onChange={e => setAlertForm({...alertForm, type: e.target.value as any})}>
                            <option value="INFO">Informativo</option>
                            <option value="WARNING">Aviso</option>
                            <option value="URGENT">Urgente</option>
                         </select>
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título do Alerta</label>
                      <input required placeholder="Ex: Aviso de Manutenção Preventiva" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none text-xs" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mensagem Detalhada</label>
                      <textarea rows={3} required placeholder="Escreva aqui os detalhes do comunicado..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none text-xs resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                   </div>
                   <button disabled={loading} type="submit" className="w-full py-5 bg-primary-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Enviar Alerta Agora</button>
                </form>
             </div>
             <div className="space-y-4">
                <h3 className="text-lg font-black uppercase px-2 text-slate-400">Histórico de Disparos</h3>
                <div className="space-y-3">
                   {sentNotifications.map(n => (
                     <div key={n.id} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between group">
                        <div>
                           <h4 className="font-black text-slate-900 text-sm uppercase">{n.title}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md uppercase">PARA: {n.target_user_email || 'TODOS'}</span>
                              <span className="text-[8px] font-bold text-slate-300">{new Date(n.created_at).toLocaleDateString()}</span>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteNotification(n.id)} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'SERVICES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-5 bg-white p-8 md:p-12 rounded-[3.5rem] border shadow-sm h-fit">
                <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter mb-8">
                  {editingServiceId ? <Edit2 className="text-amber-500" /> : <Plus className="text-emerald-600" />} 
                  {editingServiceId ? 'Editar Parceiro' : 'Novo Parceiro'}
                </h3>
                <form onSubmit={handleSaveService} className="space-y-5">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Estabelecimento</label>
                     <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria de Serviço</label>
                     <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value})}>
                       {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Endereço Completo</label>
                     <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.address} onChange={e => setServiceForm({...serviceForm, address: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link Google Maps</label>
                     <input required placeholder="https://goo.gl/maps/..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.location_url} onChange={e => setServiceForm({...serviceForm, location_url: e.target.value})} />
                   </div>
                   <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                     {loading ? <Loader2 className="animate-spin" /> : editingServiceId ? 'Atualizar Dados' : 'Cadastrar Parceiro'}
                   </button>
                   {editingServiceId && (
                     <button type="button" onClick={() => { setEditingServiceId(null); setServiceForm({name:'', type: categories[0]||'Posto de Combustível', description:'', address:'', phone:'', location_url:''}); }} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Cancelar Edição</button>
                   )}
                </form>
             </div>
             
             <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black uppercase px-2 text-slate-400 flex items-center gap-2">
                  <Store size={20} /> Parceiros Ativos na Rede
                </h3>
                <div className="grid grid-cols-1 gap-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                   {services.map(s => (
                     <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                        <div className="flex gap-4 items-center overflow-hidden">
                           <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                              {s.type.includes('Posto') ? <Fuel size={24} /> : s.type.includes('Restaurante') ? <Utensils size={24} /> : <Wrench size={24} />}
                           </div>
                           <div className="overflow-hidden">
                              <h4 className="font-black text-slate-900 text-base uppercase truncate leading-tight">{s.name}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.type}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">{s.address}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setEditingServiceId(s.id); setServiceForm({name: s.name, type: s.type, description: s.description||'', address: s.address, phone: s.phone||'', location_url: s.location_url}); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-white shadow-sm border rounded-full text-amber-500 hover:bg-amber-50"><Edit2 size={16}/></button>
                           <button onClick={() => handleDeleteService(s.id)} className="p-3 bg-white shadow-sm border rounded-full text-rose-500 hover:bg-rose-50"><Trash2 size={16}/></button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'EXPLORER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[600px]">
                <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Auditoria de Dados</h3>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                   {drivers.map(d => (
                     <button key={d.id} onClick={() => { setExplorerDriverId(d.id); fetchExplorerData(d.email); }} className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${explorerDriverId === d.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                        <div className="overflow-hidden">
                           <p className="font-black text-xs uppercase truncate">{d.name}</p>
                           <p className={`text-[8px] font-bold uppercase ${explorerDriverId === d.id ? 'text-slate-400' : 'text-slate-400'}`}>{d.email}</p>
                        </div>
                        <ChevronRight size={14} />
                     </button>
                   ))}
                </div>
             </div>
             <div className="lg:col-span-8 space-y-6">
                {explorerLoading ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={48} /></div> : explorerData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                     <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                        <h4 className="font-black text-sm uppercase mb-4 flex items-center gap-2"><Truck size={16} className="text-primary-600" /> Frota Registrada</h4>
                        <div className="space-y-2">{explorerData.vehicles.map(v => <div key={v.id} className="p-3 bg-slate-50 rounded-xl font-bold text-xs flex justify-between"><span>{v.plate}</span><span className="text-slate-400">{v.model}</span></div>)}</div>
                     </div>
                     <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                        <h4 className="font-black text-sm uppercase mb-4 flex items-center gap-2"><Wallet size={16} className="text-emerald-600" /> Últimos Lançamentos</h4>
                        <div className="space-y-2">{explorerData.expenses.slice(0, 5).map(e => <div key={e.id} className="p-3 bg-slate-50 rounded-xl font-bold text-xs flex justify-between"><span>{e.description}</span><span className="text-rose-600">R$ {e.amount}</span></div>)}</div>
                     </div>
                     <div className="bg-slate-900 p-8 rounded-[3rem] md:col-span-2 text-white">
                        <h4 className="font-black text-sm uppercase mb-4">Relatório de Viagens</h4>
                        <div className="space-y-2">{explorerData.trips.map(t => <div key={t.id} className="p-3 bg-white/5 rounded-xl text-[10px] font-black flex justify-between"><span>{t.origin} ➔ {t.destination}</span><span className="text-primary-400">{t.date}</span></div>)}</div>
                     </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
                     <LayoutDashboard size={64} className="text-slate-100 mb-4" />
                     <p className="text-slate-300 font-black uppercase text-xs">Selecione um motorista para ver o dossiê</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* CATEGORIAS */}
        {activeTab === 'CATEGORIES' && (
          <div className="max-w-2xl mx-auto w-full bg-white p-10 rounded-[3rem] border shadow-sm animate-fade-in">
             <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Gestão de Categorias</h3>
             <div className="flex gap-3 mb-8">
                <input placeholder="Nova Categoria..." className="flex-1 p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                <button onClick={handleAddCategory} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Add</button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700 text-xs">{cat}</span>
                    <button onClick={() => setCategories(categories.filter(c => c !== cat))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
