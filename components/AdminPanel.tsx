
import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils, Edit2, Tag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'SERVICES' | 'CATEGORIES'>('ALERTS');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<RoadService[]>([]);
  const [categories, setCategories] = useState<string[]>(['Posto de Combustível', 'Restaurante', 'Oficina Diesel', 'Borracharia', 'Loja de Peças']);
  const [newCategory, setNewCategory] = useState('');
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

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
  }, []);

  const fetchServices = async () => {
    try {
      const { data } = await supabase.from('road_services').select('*').order('created_at', { ascending: false });
      if (data) setServices(data);
    } catch (e) {
      console.log("Fetch services error");
    }
  };

  const fetchCategories = async () => {
    // Tenta buscar categorias únicas já cadastradas para popular a lista inicial
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
      onRefresh();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in py-12 px-4 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[3rem] border shadow-sm">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Administrativo</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary-600" /> AuriLog Control Center
          </p>
        </div>
        <button onClick={() => window.open(window.location.origin + '?mode=user', '_blank')} className="flex items-center gap-2 px-8 py-5 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-primary-700 transition-all active:scale-95">
          <ExternalLink size={20} /> Abrir Sistema Principal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200 p-1.5 rounded-[2rem] gap-1 max-w-2xl mx-auto">
        <button onClick={() => setActiveTab('ALERTS')} className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
        <button onClick={() => setActiveTab('SERVICES')} className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Serviços</button>
        <button onClick={() => setActiveTab('CATEGORIES')} className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'CATEGORIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Categorias</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeTab === 'ALERTS' && (
          <div className="lg:col-span-12 max-w-3xl mx-auto w-full bg-white p-10 rounded-[3.5rem] border shadow-sm">
             <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight">
                <Bell className="text-primary-600" size={28} /> Disparar Mensagem na Central
              </h3>
              <form onSubmit={handleSendAlert} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail do Destinatário (Vazio = Geral)</label>
                  <input type="email" placeholder="motorista@email.com" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título do Comunicado</label>
                  <input required placeholder="Ex: Aviso de Manutenção de Servidor" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mensagem</label>
                  <textarea rows={4} required placeholder="Descreva o alerta..." className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                </div>
                <button disabled={loading} type="submit" className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : <Send size={24} />} Enviar Alerta
                </button>
              </form>
          </div>
        )}

        {activeTab === 'SERVICES' && (
          <>
            <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border shadow-sm h-fit">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight">
                {editingServiceId ? <Edit2 className="text-amber-500" /> : <Plus className="text-emerald-600" />} 
                {editingServiceId ? 'Editar Parceiro' : 'Novo Parceiro'}
              </h3>
              <form onSubmit={handleSaveService} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Fantasia</label>
                  <input required placeholder="Ex: Posto do Caminhoneiro" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria do Serviço</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value as any})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Endereço Completo</label>
                  <input required placeholder="Rodovia BR-116, KM 40, São Paulo - SP" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.address} onChange={e => setServiceForm({...serviceForm, address: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link Google Maps</label>
                  <input required placeholder="https://maps.app.goo.gl/..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.location_url} onChange={e => setServiceForm({...serviceForm, location_url: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefone / WhatsApp</label>
                  <input placeholder="(11) 99999-9999" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.phone} onChange={e => setServiceForm({...serviceForm, phone: e.target.value})} />
                </div>
                <div className="flex gap-2">
                   {editingServiceId && (
                     <button type="button" onClick={() => { setEditingServiceId(null); setServiceForm({name: '', type: categories[0] || '', description: '', address: '', phone: '', location_url: ''}); }} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                   )}
                   <button disabled={loading} type="submit" className={`flex-[2] py-5 ${editingServiceId ? 'bg-amber-500' : 'bg-emerald-600'} text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all`}>
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : editingServiceId ? 'Salvar Alterações' : 'Cadastrar Parceiro'}
                   </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xl font-black uppercase px-4 flex items-center gap-2">
                <Store size={20} className="text-primary-600" /> Parceiros Cadastrados ({services.length})
              </h3>
              <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                {services.map(s => (
                  <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:border-primary-200 transition-all">
                    <div className="flex gap-4 items-center overflow-hidden">
                       <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl shrink-0">
                         {s.type.includes('Posto') ? <Fuel /> : s.type.includes('Restaurante') ? <Utensils /> : <Wrench />}
                       </div>
                       <div className="overflow-hidden">
                         <h4 className="font-black text-slate-900 truncate">{s.name}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{s.address}</p>
                         <span className="text-[9px] font-black text-primary-500 uppercase">{s.type}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                       <button onClick={() => handleEditService(s)} className="p-3 bg-slate-50 text-slate-400 hover:text-amber-500 rounded-xl transition-all"><Edit2 size={18}/></button>
                       <button onClick={() => handleDeleteService(s.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'CATEGORIES' && (
          <div className="lg:col-span-12 max-w-2xl mx-auto w-full space-y-8">
            <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3 uppercase tracking-tight">
                <Tag className="text-primary-600" size={28} /> Gerenciar Categorias
              </h3>
              <div className="flex gap-3 mb-10">
                <input placeholder="Nova Categoria..." className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                <button onClick={handleAddCategory} className="px-8 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Adicionar</button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-slate-700">{cat}</span>
                    <button onClick={() => removeCategory(cat)} className="text-slate-300 hover:text-rose-500 transition-all">
                      <X size={20} />
                    </button>
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
