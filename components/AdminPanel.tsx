
import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils, Edit2, Tag, X, History, MessageSquareQuote, LogOut, RotateCcw, MapPinned, Radar, Navigation, Signal, ChevronRight, Search, LayoutDashboard, Truck, Wallet, CheckSquare, Eye, AlertTriangle, Info, ShieldCheck, Globe, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'SERVICES' | 'CATEGORIES' | 'LOCATIONS' | 'EXPLORER'>('LOCATIONS');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<RoadService[]>([]);
  const [sentNotifications, setSentNotifications] = useState<DbNotification[]>([]);
  const [categories, setCategories] = useState<string[]>(['Posto de Combustível', 'Restaurante', 'Oficina Diesel', 'Borracharia', 'Loja de Peças']);
  const [newCategory, setNewCategory] = useState('');
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Estados de Localização
  const [driverLocations, setDriverLocations] = useState<UserLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<UserLocation | null>(null);
  const [locationSearch, setLocationSearch] = useState('');

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
    fetchServices();
    fetchCategories();
    fetchNotifications();
    fetchLocations();

    const locationChannel = supabase
      .channel('admin-tracking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setDriverLocations(prev => {
            const index = prev.findIndex(l => l.user_id === payload.new.user_id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = payload.new as UserLocation;
              return next;
            }
            return [...prev, payload.new as UserLocation];
          });
          if (selectedDriver?.user_id === payload.new.user_id) {
            setSelectedDriver(payload.new as UserLocation);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(locationChannel); };
  }, [selectedDriver]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('user_locations').select('*').order('updated_at', { ascending: false });
    if (data) setDriverLocations(data);
  };

  const fetchExplorerData = async (userId: string) => {
    setExplorerLoading(true);
    try {
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
      alert("Erro ao carregar dados do motorista.");
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

  const handleDeleteService = async (id: string) => {
    if (confirm("Remover parceiro?")) {
      const { error } = await supabase.from('road_services').delete().eq('id', id);
      if (!error) fetchServices();
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) return alert("Já existe.");
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
  };

  const isDriverOnline = (updatedAt: string) => {
    return (Date.now() - new Date(updatedAt).getTime()) < 300000; // 5 minutos para considerar online no painel
  };

  const filteredLocations = driverLocations.filter(loc => 
    loc.email.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-fade-in py-6 md:py-12 px-4 pb-32">
      {/* Header Responsivo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] border shadow-sm">
        <div className="w-full lg:w-auto">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Administrativo</h2>
          <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary-600" /> AuriLog Master Control
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

      {/* Tabs Responsivas */}
      <div className="flex flex-wrap bg-slate-200 p-1 rounded-2xl md:rounded-[2rem] gap-1 w-full md:max-w-4xl mx-auto">
        <button onClick={() => setActiveTab('LOCATIONS')} className={`flex-1 min-w-[90px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'LOCATIONS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Frota</button>
        <button onClick={() => setActiveTab('EXPLORER')} className={`flex-1 min-w-[90px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'EXPLORER' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Explorar</button>
        <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 min-w-[90px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 min-w-[90px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Serviços</button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 min-w-[90px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'CATEGORIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Categorias</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* FROTA / MONITORAMENTO (Design da Imagem Sugerida) */}
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             {/* Coluna Esquerda: Equipe em Campo */}
             <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">EQUIPE EM CAMPO</h3>
                  <button onClick={fetchLocations} className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-full transition-all">
                    <RefreshCcw size={16} />
                  </button>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    placeholder="Filtrar motorista..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20" 
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                  />
                </div>

                <button onClick={() => setSelectedDriver(null)} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 mb-6 shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all">
                  <Globe size={18} /> VER TODOS NO MAPA
                </button>

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                   {filteredLocations.length === 0 ? (
                     <div className="text-center py-10 opacity-30">
                        <Users size={32} className="mx-auto" />
                        <p className="text-[10px] font-black uppercase mt-2">Nenhum motorista encontrado</p>
                     </div>
                   ) : filteredLocations.map(loc => {
                     const online = isDriverOnline(loc.updated_at);
                     return (
                       <div 
                         key={loc.user_id} 
                         onClick={() => setSelectedDriver(loc)} 
                         className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedDriver?.user_id === loc.user_id ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                       >
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-black text-lg shadow-sm">
                                {loc.email[0].toUpperCase()}
                             </div>
                             <div>
                                <h4 className="font-black text-slate-800 text-sm leading-none mb-1">{loc.email.split('@')[0]}</h4>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${online ? 'text-emerald-500' : 'text-slate-400'}`}>
                                   {online ? 'LOCALIZADO' : 'OFFLINE'}
                                </p>
                             </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                       </div>
                     );
                   })}
                </div>
             </div>

             {/* Coluna Direita: Mapa e Resumo (Card da Imagem) */}
             <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Monitoramento da Frota</h3>
                      <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">
                         Visualizando todos os {filteredLocations.filter(l => isDriverOnline(l.updated_at)).length} motoristas ativos agora.
                      </p>
                   </div>
                   <button className="bg-slate-950 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                      <ExternalLink size={18} /> LINK DO RASTREIO COLETIVO
                   </button>
                </div>

                <div className="bg-white h-[530px] rounded-[4rem] border shadow-sm overflow-hidden relative">
                   {selectedDriver ? (
                     <iframe 
                       title="Driver Location" 
                       className="w-full h-full border-0" 
                       src={`https://www.google.com/maps?q=${selectedDriver.latitude},${selectedDriver.longitude}&z=15&output=embed`} 
                     />
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
                        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-8">
                           <MapPin size={48} className="text-primary-400" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Mapa de Atividade em Tempo Real</h4>
                        <p className="text-slate-400 font-bold text-sm max-w-sm mt-2">Selecione um motorista à esquerda para focar na localização exata ou veja o histórico global da equipe.</p>
                        
                        <div className="mt-10 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">C</div>
                           <div className="text-left">
                              <p className="font-black text-xs text-slate-800">CELIO</p>
                              <p className="text-[9px] font-bold text-slate-400">Há 24 min</p>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* EXPLORADOR DE DADOS */}
        {activeTab === 'EXPLORER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             <div className="lg:col-span-4">
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-fit">
                   <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter mb-6"><Eye className="text-primary-600" size={24} /> Explorador</h3>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 ml-1">Selecione o Motorista</p>
                      {driverLocations.map(d => (
                        <button key={d.user_id} onClick={() => { setExplorerDriverId(d.user_id); fetchExplorerData(d.user_id); }} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${explorerDriverId === d.user_id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                           <div className="overflow-hidden">
                              <p className="font-black text-xs uppercase truncate leading-none mb-1">{d.email}</p>
                              <p className={`text-[8px] font-bold uppercase ${explorerDriverId === d.user_id ? 'text-slate-500' : 'text-slate-400'}`}>ID: {d.user_id.slice(0, 8)}...</p>
                           </div>
                           <ChevronRight size={14} />
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="lg:col-span-8">
                {explorerLoading ? (
                  <div className="h-[400px] flex items-center justify-center bg-white rounded-[3rem] border"><Loader2 className="animate-spin text-primary-600" size={48} /></div>
                ) : explorerData && explorerDriverId ? (
                  <div className="space-y-6">
                    {/* Resumo Explorador */}
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
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed text-slate-300">
                     <LayoutDashboard size={64} className="mb-4 opacity-20" />
                     <p className="font-black text-xs uppercase">Selecione um motorista para ver o raio-x completo</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* ALERTAS */}
        {activeTab === 'ALERTS' && (
          <div className="space-y-6 md:space-y-10">
            <div className="max-w-4xl mx-auto w-full bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border shadow-sm">
               <h3 className="text-xl md:text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight"><Bell className="text-primary-600" size={24} /> Disparar Mensagem</h3>
                <form onSubmit={handleSendAlert} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destino (Público ou Privado)</label>
                      <div className="relative">
                        <select className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-xs appearance-none" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                            <option value="">TODOS OS MOTORISTAS (Público)</option>
                            {driverLocations.map(d => <option key={d.user_id} value={d.email}>{d.email} (Privado)</option>)}
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
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar border-t pt-4">
                {sentNotifications.map(n => (
                  <div key={n.id} className={`bg-white p-5 rounded-3xl border-2 shadow-sm flex items-start justify-between gap-4 group transition-all ${n.type === 'URGENT' ? 'border-rose-100' : n.type === 'WARNING' ? 'border-amber-100' : 'border-slate-50'}`}>
                    <div className="flex gap-4 overflow-hidden">
                       <div className={`p-4 rounded-2xl shrink-0 ${n.type === 'URGENT' ? 'bg-rose-50 text-rose-500' : n.type === 'WARNING' ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
                         {n.type === 'URGENT' ? <ShieldAlert size={20}/> : n.type === 'WARNING' ? <AlertTriangle size={20}/> : <Info size={20}/>}
                       </div>
                       <div className="overflow-hidden">
                         <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-slate-900 uppercase text-xs truncate">{n.title}</h4>
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{n.category}</span>
                            {n.target_user_email && <span className="text-[7px] font-black bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full uppercase">Privado</span>}
                         </div>
                         <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{n.message}</p>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">
                           {new Date(n.created_at).toLocaleString()} {n.target_user_email && `• Para: ${n.target_user_email}`}
                         </p>
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

        {/* CATEGORIAS */}
        {activeTab === 'CATEGORIES' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 md:space-y-8 animate-fade-in">
            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border shadow-sm">
              <h3 className="text-xl md:text-2xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight"><Tag className="text-primary-600" size={24} /> Gestão de Categorias</h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <input placeholder="Ex: Mecânica Geral" className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
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

        {/* SERVIÇOS */}
        {activeTab === 'SERVICES' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
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
