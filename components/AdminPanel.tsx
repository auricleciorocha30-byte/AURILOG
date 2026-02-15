
import React, { useState, useEffect } from 'react';
import { Send, Bell, MapPin, Loader2, ShieldAlert, Trash2, CheckCircle2, Store, Fuel, Wrench, Hammer, User, Mail, Plus, ExternalLink, RefreshCcw, MapPinHouse, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService } from '../types';

interface AdminPanelProps {
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'SERVICES'>('ALERTS');
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<RoadService[]>([]);
  
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
    type: 'stations' as any,
    description: '',
    address: '',
    phone: '',
    location_url: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data } = await supabase.from('road_services').select('*').order('created_at', { ascending: false });
      if (data) setServices(data);
    } catch (e) {
      console.log("Fetch services error");
    }
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
      
      alert("Alerta enviado com sucesso para a central!");
      setAlertForm({ title: '', message: '', type: 'INFO', category: 'GENERAL', target_user_email: '' });
      onRefresh();
    } catch (err: any) {
      alert("Erro ao enviar alerta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.location_url) return alert("Nome e Link do Mapa são obrigatórios.");
    
    setLoading(true);
    try {
      const { error } = await supabase.from('road_services').insert([serviceForm]);
      if (error) throw error;
      
      alert("Parceiro cadastrado no sistema!");
      setServiceForm({ name: '', type: 'stations', description: '', address: '', phone: '', location_url: '' });
      fetchServices();
      onRefresh();
    } catch (err: any) {
      alert("Erro ao cadastrar serviço: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Remover este parceiro da lista oficial?")) return;
    try {
      const { error } = await supabase.from('road_services').delete().eq('id', id);
      if (!error) fetchServices();
    } catch (e) {
      alert("Erro ao deletar serviço.");
    }
  };

  const openMainSystem = () => {
    // Abre em nova guia forçando o modo usuário que mostra a tela de login
    window.open(window.location.origin + '?mode=user', '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in py-12 px-4">
      {/* Header do Admin */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel de Controle</h2>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary-600" /> Administração Master AuriLog
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={openMainSystem} className="flex items-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-primary-700 transition-all active:scale-95">
            <ExternalLink size={18} /> Abrir Sistema Principal
          </button>
          <div className="flex bg-slate-200 p-1.5 rounded-2xl gap-1">
            <button onClick={() => setActiveTab('ALERTS')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Alertas</button>
            <button onClick={() => setActiveTab('SERVICES')} className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Serviços Estrada</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {activeTab === 'ALERTS' ? (
          <>
            <div className="lg:col-span-5 bg-white p-8 rounded-[3rem] border shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2 uppercase tracking-tight">
                <Bell className="text-primary-600" size={24} /> Enviar Alerta na Central
              </h3>
              <form onSubmit={handleSendAlert} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Para (E-mail ou Vazio para Todos)</label>
                  <div className="relative">
                    <input type="email" placeholder="Ex: motorista@email.com" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none pl-12" value={alertForm.target_user_email} onChange={e => setAlertForm({...alertForm, target_user_email: e.target.value})} />
                    <Mail className="absolute left-4 top-4 text-slate-300" size={20} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título do Alerta</label>
                  <input required placeholder="Ex: Manutenção de Sistema" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={alertForm.title} onChange={e => setAlertForm({...alertForm, title: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mensagem Detalhada</label>
                  <textarea rows={4} required placeholder="Descreva o alerta..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none resize-none" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Alerta</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={alertForm.type} onChange={e => setAlertForm({...alertForm, type: e.target.value as any})}>
                      <option value="INFO">Informativo</option>
                      <option value="WARNING">Aviso</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={alertForm.category} onChange={e => setAlertForm({...alertForm, category: e.target.value as any})}>
                      <option value="GENERAL">Geral</option>
                      <option value="TRIP">Viagem</option>
                      <option value="FINANCE">Financeiro</option>
                    </select>
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />} Enviar para a Central
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
                <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-400" /> Gestão de Mensagens
                </h4>
                <div className="space-y-4 text-slate-400 text-sm font-bold">
                  <p>• Notificações globais aparecem para todos os motoristas.</p>
                  <p>• Notificações urgentes disparam alertas visuais no dashboard.</p>
                  <p>• Utilize o e-mail exato do usuário para mensagens privadas.</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="lg:col-span-5 bg-white p-8 rounded-[3rem] border shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2 uppercase tracking-tight">
                <Plus className="text-emerald-600" size={24} /> Novo Serviço na Estrada
              </h3>
              <form onSubmit={handleAddService} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Estabelecimento</label>
                  <input required placeholder="Ex: Posto Graal KM 60" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value as any})}>
                      <option value="stations">Posto de Combustível</option>
                      <option value="restaurants">Restaurante</option>
                      <option value="mechanic">Oficina Diesel</option>
                      <option value="tire_repair">Borracharia</option>
                      <option value="store">Loja de Peças/Acessórios</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefone/WhatsApp</label>
                    <input placeholder="(00) 00000-0000" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.phone} onChange={e => setServiceForm({...serviceForm, phone: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link Google Maps</label>
                  <input required placeholder="https://maps.app.goo.gl/..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={serviceForm.location_url} onChange={e => setServiceForm({...serviceForm, location_url: e.target.value})} />
                </div>

                <button disabled={loading} type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />} Cadastrar Parceiro
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white p-8 rounded-[3rem] border shadow-sm overflow-hidden flex flex-col">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2 uppercase tracking-tight">
                <Store className="text-primary-600" size={24} /> Parceiros Ativos
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-2 custom-scrollbar">
                {services.map(s => (
                  <div key={s.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400">
                        {s.type === 'stations' ? <Fuel size={20}/> : s.type === 'restaurants' ? <Utensils size={20}/> : <Wrench size={20}/>}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{s.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{s.address}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteService(s.id)} className="p-3 text-slate-300 hover:text-rose-500 transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
