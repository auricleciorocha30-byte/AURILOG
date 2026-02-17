import React, { useState, useEffect } from 'react';
// Added missing ChevronRight import from lucide-react
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils, Edit2, Tag, X, History, MessageSquareQuote, LogOut, RotateCcw, MapPinned, Radar, Navigation, Signal, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'SERVICES' | 'CATEGORIES' | 'LOCATIONS'>('ALERTS');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<RoadService[]>([]);
  const [sentNotifications, setSentNotifications] = useState<DbNotification[]>([]);
  const [categories, setCategories] = useState<string[]>(['Posto de Combustível', 'Restaurante', 'Oficina Diesel', 'Borracharia', 'Loja de Peças']);
  const [newCategory, setNewCategory] = useState('');
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Estados de Localização
  const [driverLocations, setDriverLocations] = useState<UserLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<UserLocation | null>(null);

  // Form de Alerta
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'URGENT' | 'WARNING',
    category: 'GENERAL' as any,
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

    // Inscrição Realtime para localizações
    const locationChannel = supabase
      .channel('admin-tracking')
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
          // Se for o selecionado, atualiza
          if (selectedDriver?.user_id === payload.new.user_id) {
            setSelectedDriver(payload.new as UserLocation);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(locationChannel); };
  }, [selectedDriver]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('user_locations').select('*');
    if (data) setDriverLocations(data);
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (data) setSentNotifications(data);
    } catch (e) {
      console.log("Fetch notifications error");
    }
  };

  const fetchServices = async () => {
    try {
      const { data } = await supabase.from('road_services').select('*').order('created_at', { ascending: false });
      if (data) setServices(data);
    } catch (e) {
      console.log("Fetch services error");
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('road_services').select('type');
      if (data) {
        const uniqueTypes = Array.from(new Set(data.map(i => i.type)));
        if (uniqueTypes.length > 0) setCategories(prev => Array.from(new Set([...prev, ...uniqueTypes])));
      }
    } catch (e) {}
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertForm.title || !alertForm.message) return alert("Preencha título e mensagem.");
    
    setLoading(true);
    try {
      const payload = {
        title: alertForm.title,
        message: alertForm.message,
        type: alertForm.type,
        category: alertForm.category,
        target_user_email: alertForm.target_user_email.trim() || null
      };
      
      const { error } = await supabase.from('notifications').insert([payload]);
      if (error) throw error;
      
      alert("Alerta enviado com sucesso!");
      setAlertForm({ title: '', message: '', type: 'INFO', category: 'GENERAL', target_user_email: '' });
      fetchNotifications();
      onRefresh();
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
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm("Excluir esta mensagem definitivamente para todos os usuários?")) return;
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setSentNotifications(sentNotifications.filter(n => n.id !== id));
      onRefresh();
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.location_url || !serviceForm.address) {
      return alert("Nome, Endereço e Link do Mapa são obrigatórios.");
    }
    
    setLoading(true);
    try {
      if (editingServiceId) {
        const { error } = await supabase.from('road_services').update(serviceForm).eq('id', editingServiceId);
        if (error) throw error;
        alert("Serviço atualizado com sucesso!");
      } else {
        const { error } = await supabase.from('road_services').insert([serviceForm]);
        if (error) throw error;
        alert("Novo parceiro cadastrado!");
      }
      
      setServiceForm({ name: '', type: categories[0] || '', description: '', address: '', phone: '', location_url: '' });
      setEditingServiceId(null);
      fetchServices();
      onRefresh();
    } catch (err: any) {
      alert("Erro ao salvar serviço: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (service: RoadService) => {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name,
      type: service.type as any,
      description: service.description,
      address: service.address,
      phone: service.phone,
      location_url: service.location_url
    });
    setActiveTab('SERVICES');
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Remover este parceiro permanentemente?")) return;
    try {
      const { error } = await supabase.from('road_services').delete().eq('id', id);
      if (!error) fetchServices();
    } catch (e) {
      alert("Erro ao deletar.");
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) return alert("Categoria já existe.");
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    if (confirm(`Remover categoria "${cat}"? Isso não afetará serviços já cadastrados.`)) {
      setCategories(categories.filter(c => c !== cat));
    }
  };

  // Função auxiliar para verificar se o motorista está "Online" (atualizado nos últimos 2 min)
  const isDriverOnline = (updatedAt: string) => {
    const diff = Date.now() - new Date(updatedAt).getTime();
    return diff < 120000; // 2 minutos em ms
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-8 animate-fade-in py-6 md:py-12 px-4 pb-32">
      {/* Header Responsivo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl md:rounded-[3rem] border shadow-sm">
        <div className="w-full lg:w-auto">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Administrativo</h2>
          <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary-600" /> AuriLog Control Center
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={() => window.open(window.location.origin + '?mode=user', '_blank')} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-[10px] md:text-xs uppercase hover:border-primary-500 hover:text-primary-600 transition-all active:scale-95">
            <ExternalLink size={18} /> Abrir App
          </button>
          <button onClick={onLogout} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-xl hover:bg-rose-700 transition-all active:scale-95">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      {/* Tabs com escala mobile corrigida e nova aba de Localização */}
      <div className="flex flex-wrap bg-slate-200 p-1 rounded-2xl md:rounded-[2rem] gap-1 w-full md:max-w-3xl mx-auto">
        <button onClick={() => setActiveTab('LOCATIONS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all ${activeTab === 'LOCATIONS' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Localização</button>
        <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Serviços</button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest transition-all ${activeTab === 'CATEGORIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Categorias</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
             {/* Lista de Motoristas */}
             <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
                   <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter mb-6">
                     <Radar className="text-primary-600" size={24} /> Frota Online
                   </h3>
                   <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {driverLocations.length === 0 ? (
                        <div className="text-center py-10 opacity-40">
                          <Signal size={40} className="mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase">Nenhum motorista rastreado</p>
                        </div>
                      ) : driverLocations.map(loc => (
                        <div 
                          key={loc.user_id} 
                          onClick={() => setSelectedDriver(loc)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedDriver?.user_id === loc.user_id ? 'bg-primary-600 border-primary-600 text-white scale-[1.02] shadow-lg' : 'bg-white border-slate-100 hover:border-primary-200'}`}
                        >
                           <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${isDriverOnline(loc.updated_at) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                              <div className="overflow-hidden">
                                 <p className="font-black text-xs uppercase truncate leading-none mb-1">{loc.email}</p>
                                 <p className={`text-[8px] font-bold uppercase ${selectedDriver?.user_id === loc.user_id ? 'text-white/70' : 'text-slate-400'}`}>Última: {new Date(loc.updated_at).toLocaleTimeString()}</p>
                              </div>
                           </div>
                           <ChevronRight size={18} className={selectedDriver?.user_id === loc.user_id ? 'text-white' : 'text-slate-300'} />
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Mapa */}
             <div className="lg:col-span-8 bg-white h-[600px] md:h-[700px] rounded-[3.5rem] border shadow-sm overflow-hidden relative">
                {selectedDriver ? (
                  <>
                    <div className="absolute top-6 left-6 right-6 z-10 pointer-events-none">
                       <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl inline-flex items-center gap-3 shadow-2xl border border-white/10 pointer-events-auto">
                          <div className={`w-3 h-3 rounded-full ${isDriverOnline(selectedDriver.updated_at) ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest">{selectedDriver.email}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">Posição em tempo real</p>
                          </div>
                       </div>
                    </div>
                    <iframe 
                      title="Monitoramento"
                      className="w-full h-full border-0"
                      src={`https://www.google.com/maps?q=${selectedDriver.latitude},${selectedDriver.longitude}&z=15&output=embed`}
                    />
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                       <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedDriver.latitude},${selectedDriver.longitude}`, '_blank')} className="bg-white p-4 rounded-full shadow-2xl text-primary-600 hover:bg-primary-600 hover:text-white transition-all active:scale-90">
                          <Navigation size={24} />
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50">
                     <MapPinned size={80} className="text-slate-200 mb-6" />
                     <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Central de Rastreamento</h4>
                     <p className="text-slate-300 font-bold text-sm max-w-xs mt-2">Selecione um motorista ao lado para visualizar sua localização exata no mapa.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'ALERTS' && (
          <div className="space-y-6 md:space-y-10">
            {/* Formulário de Alerta */}
            <div className="max-w-3xl mx-auto w-full bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border shadow-sm">
               <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                  <Bell className="text-primary-600" size={24} /> Disparar Mensagem
                </h3>
                <form onSubmit={handleSendAlert} className="space-y-4 md:space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Destinatário (Vazio = Todos)</label>
                    <select className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-sm" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})}>
                        <option value="">TODOS OS MOTORISTAS</option>
                        {driverLocations.map(d => <option key={d.user_id} value={d.email}>{d.email}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Título do Comunicado</label>
                    <input required placeholder="Ex: Aviso de Manutenção" className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none text-sm md:text-base" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Mensagem</label>
                    <textarea rows={3} md:rows={4} required placeholder="Descreva o alerta..." className="w-full p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl font-bold outline-none resize-none text-sm md:text-base" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                  </div>
                  <button disabled={loading} type="submit" className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-2xl md:rounded-3xl font-black uppercase text-xs md:text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />} Enviar Alerta
                  </button>
                </form>
            </div>

            {/* Histórico com Scrollbar */}
            <div className="max-w-4xl mx-auto w-full space-y-4 px-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-black uppercase flex items-center gap-2">
                  <History size={20} className="text-primary-600" /> Histórico de Envios
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">{sentNotifications.length} mensagens</span>
              </div>
              
              <div className="space-y-4 max-h-[400px] md:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar border-t pt-4">
                {sentNotifications.length === 0 ? (
                  <div className="bg-white p-10 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-dashed border-slate-200 text-center">
                    <MessageSquareQuote size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] md:text-xs tracking-widest">Nenhuma mensagem enviada.</p>
                  </div>
                ) : (
                  sentNotifications.map(n => (
                    <div key={n.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border shadow-sm flex items-start justify-between gap-3 md:gap-4 group hover:border-primary-200 transition-all animate-fade-in">
                      <div className="flex gap-3 md:gap-4 overflow-hidden">
                         <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0 ${n.type === 'URGENT' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                            <Bell size={20} />
                         </div>
                         <div className="overflow-hidden">
                           <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm md:text-base truncate">{n.title}</h4>
                              {n.target_user_email && <span className="text-[7px] md:text-[8px] font-black bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full uppercase">Privado</span>}
                           </div>
                           <p className="text-[11px] md:text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 md:line-clamp-3">{n.message}</p>
                           <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                              <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString()}</span>
                              {n.target_user_email && <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Para: {n.target_user_email}</span>}
                           </div>
                         </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => handleResend(n)} title="Reenviar/Copiar" className="p-2 md:p-3 bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg md:rounded-xl transition-all">
                          <RotateCcw size={16} />
                        </button>
                        <button onClick={() => handleDeleteNotification(n.id)} title="Excluir" className="p-2 md:p-3 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg md:rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ... Resto das abas (SERVICES, CATEGORIES) permanece igual para brevidade ou melhorado conforme escala ... */}
        {activeTab === 'SERVICES' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-5 bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border shadow-sm h-fit">
              <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                {editingServiceId ? <Edit2 className="text-amber-500" /> : <Plus className="text-emerald-600" />} 
                {editingServiceId ? 'Editar Parceiro' : 'Novo Parceiro'}
              </h3>
              <form onSubmit={handleSaveService} className="space-y-4 md:space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Nome Fantasia</label>
                  <input required placeholder="Ex: Posto do Caminhoneiro" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-bold outline-none text-sm" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-bold outline-none text-sm" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value as any})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Endereço</label>
                  <input required placeholder="Rodovia BR-116, KM 40..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-bold outline-none text-sm" value={serviceForm.address} onChange={e => setServiceForm({...serviceForm, address: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Link Maps</label>
                  <input required placeholder="https://maps.app.goo.gl/..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-bold outline-none text-sm" value={serviceForm.location_url} onChange={e => setServiceForm({...serviceForm, location_url: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Telefone</label>
                  <input placeholder="(11) 99999-9999" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl font-bold outline-none text-sm" value={serviceForm.phone} onChange={e => setServiceForm({...serviceForm, phone: e.target.value})} />
                </div>
                <div className="flex gap-2 pt-2">
                   {editingServiceId && (
                     <button type="button" onClick={() => { setEditingServiceId(null); setServiceForm({name: '', type: categories[0] || '', description: '', address: '', phone: '', location_url: ''}); }} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                   )}
                   <button disabled={loading} type="submit" className={`flex-[2] py-4 ${editingServiceId ? 'bg-amber-500' : 'bg-emerald-600'} text-white rounded-xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all`}>
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : editingServiceId ? 'Salvar' : 'Cadastrar'}
                   </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-lg md:text-xl font-black uppercase px-2 md:px-4 flex items-center gap-2">
                <Store size={20} className="text-primary-600" /> Cadastrados ({services.length})
              </h3>
              <div className="space-y-3 max-h-[500px] md:max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {services.map(s => (
                  <div key={s.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:border-primary-200 transition-all">
                    <div className="flex gap-3 md:gap-4 items-center overflow-hidden">
                       <div className="p-3 md:p-4 bg-slate-50 text-slate-400 rounded-xl md:rounded-2xl shrink-0">
                         {s.type.includes('Posto') ? <Fuel size={18} /> : s.type.includes('Restaurante') ? <Utensils size={18} /> : <Wrench size={18} />}
                       </div>
                       <div className="overflow-hidden">
                         <h4 className="font-black text-slate-900 truncate text-sm md:text-base">{s.name}</h4>
                         <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase truncate">{s.address}</p>
                         <span className="text-[8px] md:text-[9px] font-black text-primary-500 uppercase">{s.type}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                       <button onClick={() => handleEditService(s)} className="p-2 md:p-3 bg-slate-50 text-slate-400 hover:text-amber-500 rounded-lg md:rounded-xl transition-all"><Edit2 size={16}/></button>
                       <button onClick={() => handleDeleteService(s.id)} className="p-2 md:p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg md:rounded-xl transition-all"><Trash2 size={16}/></button>
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
