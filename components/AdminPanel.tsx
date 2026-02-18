
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
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RoadService, DbNotification, UserLocation, Trip, Expense, Vehicle, MaintenanceItem, Driver, TripStatus } from '../types';

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
  
  // Forms
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });
  const [alertForm, setAlertForm] = useState({ title: '', message: '', target_user_email: '' });
  const [partnerForm, setPartnerForm] = useState({ name: '', type: 'Posto de Combustível', address: '', location_url: '', phone: '', description: '' });

  useEffect(() => { loadAllAdminData(); }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [tripsRes, expensesRes, vehiclesRes, maintenanceRes, driversRes, servicesRes, locRes] = await Promise.all([
        supabase.from('trips').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('maintenance').select('*'),
        supabase.from('drivers').select('*'),
        supabase.from('road_services').select('*'),
        supabase.from('user_locations').select('*')
      ]);

      if (tripsRes.data) setAllTrips(tripsRes.data);
      if (expensesRes.data) setAllExpenses(expensesRes.data);
      if (vehiclesRes.data) setAllVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setAllMaintenance(maintenanceRes.data);
      if (driversRes.data) setDrivers(driversRes.data);
      if (servicesRes.data) setRoadServices(servicesRes.data);
      if (locRes.data) setLocations(locRes.data);
    } catch (err) { console.error("Erro ao carregar dados admin"); } finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const revenue = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.agreed_price) || 0), 0);
    const tripExp = allExpenses.filter(e => e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const fixedExp = allExpenses.filter(e => !e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const commissions = allTrips.filter(t => t.status === TripStatus.COMPLETED).reduce((acc, t) => acc + (Number(t.driver_commission) || 0), 0);
    
    const profit = revenue - tripExp - fixedExp - commissions;
    return { revenue, expense: tripExp + fixedExp, profit, fleet: allVehicles.length, drivers: drivers.length };
  }, [allTrips, allExpenses, allVehicles, drivers]);

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
    await supabase.from(table).delete().eq('id', id);
    loadAllAdminData();
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
                   <p className="text-[10px] font-black text-slate-500 uppercase">Receita Bruta</p>
                   <p className="text-3xl font-black mt-2">R$ {totals.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase">Gasto Total</p>
                   <p className="text-3xl font-black mt-2 text-rose-400">R$ {totals.expense.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                   <p className="text-[10px] font-black text-amber-500 uppercase">Lucro Líquido</p>
                   <p className="text-3xl font-black mt-2">R$ {totals.profit.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase">Ativos</p>
                   <p className="text-3xl font-black mt-2">{totals.drivers} Condutores</p>
                </div>
             </div>

             <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><ReceiptText className="text-amber-500"/> Histórico Consolidado</h3>
                   <button onClick={exportData} className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase"><Download size={16}/> Exportar CSV</button>
                </div>
                <div className="space-y-4">
                   {allTrips.slice(0, 10).map(t => (
                      <div key={t.id} className="p-6 bg-slate-900/50 rounded-3xl flex justify-between items-center border border-white/5">
                         <div>
                            <p className="text-sm font-black uppercase">{t.origin.split(' - ')[0]} ➔ {t.destination.split(' - ')[0]}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{t.date}</p>
                         </div>
                         <div className="text-right">
                            <p className="font-black">R$ {t.agreed_price.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-amber-500">{t.status}</p>
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
                 <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3"><Users className="text-amber-500"/> Motoristas Ativos</h3>
                 <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {locations.length === 0 ? (
                       <p className="text-center text-slate-500 text-xs py-20">Nenhuma localização recebida.</p>
                    ) : locations.map(loc => (
                       <div key={loc.user_id} className="p-5 bg-slate-900 border border-white/5 rounded-3xl flex justify-between items-center">
                          <div>
                             <p className="text-sm font-black uppercase">{loc.email.split('@')[0]}</p>
                             <p className="text-[9px] text-slate-500 font-bold">Visto em: {new Date(loc.updated_at).toLocaleTimeString()}</p>
                          </div>
                          <button className="p-3 bg-amber-500 text-slate-950 rounded-xl"><MapPin size={16}/></button>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="lg:col-span-2 bg-white/5 rounded-[4rem] border border-white/10 overflow-hidden relative">
                 <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
                    <div className="text-center p-10 bg-slate-950 rounded-3xl border border-white/10 max-w-sm">
                       <MapPinned size={48} className="text-amber-500 mx-auto mb-4" />
                       <h4 className="text-lg font-black uppercase mb-2">Monitoramento de GPS</h4>
                       <p className="text-slate-500 text-xs leading-relaxed">Clique em um motorista para visualizar a última posição precisa no satélite.</p>
                    </div>
                 </div>
                 <iframe title="Map" className="w-full h-full border-0 opacity-20" src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000000!2d-50!3d-15!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbr!4v1" />
              </div>
           </div>
        )}

        {activeTab === 'PARTNERS' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase tracking-tight flex items-center gap-3"><Store className="text-amber-500"/> Cadastrar Novo Ponto</h3>
                 <form onSubmit={handleAddPartner} className="space-y-6">
                    <input required placeholder="Nome do Estabelecimento" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none focus:ring-2 focus:ring-amber-500/50" value={partnerForm.name} onChange={e => setPartnerForm({...partnerForm, name: e.target.value})} />
                    <select className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none focus:ring-2 focus:ring-amber-500/50" value={partnerForm.type} onChange={e => setPartnerForm({...partnerForm, type: e.target.value})}>
                       <option>Posto de Combustível</option>
                       <option>Oficina Diesel</option>
                       <option>Borracharia</option>
                       <option>Restaurante / Parada</option>
                       <option>Pátio / Descanso</option>
                    </select>
                    <input required placeholder="Endereço Completo" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none" value={partnerForm.address} onChange={e => setPartnerForm({...partnerForm, address: e.target.value})} />
                    <input placeholder="Link do Google Maps" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none" value={partnerForm.location_url} onChange={e => setPartnerForm({...partnerForm, location_url: e.target.value})} />
                    <button type="submit" disabled={loading} className="w-full py-6 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs shadow-2xl">Adicionar Parceiro</button>
                 </form>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Rede Credenciada</h3>
                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                    {roadServices.map(s => (
                       <div key={s.id} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl flex justify-between items-center group">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-white/5 text-amber-500 rounded-2xl">
                                {s.type.includes('Posto') ? <Fuel size={20}/> : s.type.includes('Oficina') ? <Wrench size={20}/> : <Utensils size={20}/>}
                             </div>
                             <div>
                                <p className="text-sm font-black uppercase">{s.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{s.type}</p>
                             </div>
                          </div>
                          <button onClick={() => deleteRecord('road_services', s.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'DRIVERS' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase flex items-center gap-3"><UserPlus className="text-amber-500"/> Adicionar Condutor</h3>
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    await supabase.from('drivers').insert([driverForm]);
                    setDriverForm({name:'', email:'', password:''});
                    loadAllAdminData();
                 }} className="space-y-6">
                    <input required placeholder="Nome Completo" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                    <input required type="email" placeholder="E-mail de Login" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} />
                    <input required type="password" placeholder="Chave de Acesso" className="w-full p-6 bg-slate-900 rounded-3xl border-none outline-none" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} />
                    <button type="submit" className="w-full py-6 bg-amber-500 text-slate-950 rounded-3xl font-black uppercase text-xs">Liberar Acesso</button>
                 </form>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-8 uppercase">Equipe Cadastrada</h3>
                 <div className="space-y-4">
                    {drivers.map(d => (
                       <div key={d.id} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl flex justify-between items-center">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-amber-500 uppercase">{d.name[0]}</div>
                             <div>
                                <p className="text-sm font-black uppercase">{d.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{d.email}</p>
                             </div>
                          </div>
                          <button onClick={() => deleteRecord('drivers', d.id)} className="p-3 text-slate-500 hover:text-rose-500"><Trash2 size={20}/></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'CONFIG' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-6 uppercase flex items-center gap-3"><Filter className="text-amber-500"/> Categorias de Carga</h3>
                 <div className="space-y-3">
                    {['Geral', 'Granel Sólido', 'Granel Líquido', 'Frigorificada', 'Conteinerizada', 'Perigosa'].map(cat => (
                       <div key={cat} className="p-4 bg-slate-900 rounded-2xl flex justify-between items-center">
                          <span className="text-sm font-bold uppercase">{cat}</span>
                          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">ATIVO</span>
                       </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-slate-500 mt-4">+ Adicionar Nova Categoria</button>
                 </div>
              </div>
              <div className="bg-white/5 p-10 rounded-[4rem] border border-white/10">
                 <h3 className="text-2xl font-black mb-6 uppercase flex items-center gap-3"><Settings className="text-amber-500"/> Configurações de Sistema</h3>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                       <div><p className="font-bold text-sm">Backup Automático</p><p className="text-[10px] text-slate-500 font-bold uppercase">Diário às 03:00</p></div>
                       <div className="w-12 h-6 bg-amber-500 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full ml-auto"></div></div>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                       <div><p className="font-bold text-sm">Notificações Push</p><p className="text-[10px] text-slate-500 font-bold uppercase">Alertas de Excesso de Jornada</p></div>
                       <div className="w-12 h-6 bg-amber-500 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full ml-auto"></div></div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};
