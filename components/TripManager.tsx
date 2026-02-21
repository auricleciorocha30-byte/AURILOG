
import React, { useState, useMemo } from 'react';
import { Trip, TripStatus, Vehicle, TripStop, Expense } from '../types';
import { Plus, MapPin, Calendar, Truck, Navigation, X, Trash2, Map as MapIcon, Edit2, DollarSign, Loader2, CheckCircle2, Calculator, Wifi, WifiOff, Smartphone, MapPinCheck, Percent, Wallet, ReceiptText, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateANTT } from '../services/anttService';

interface TripManagerProps {
  trips: Trip[];
  vehicles: Vehicle[];
  expenses: Expense[];
  onAddTrip: (trip: Omit<Trip, 'id'>) => Promise<void>;
  onUpdateTrip: (id: string, trip: Partial<Trip>) => Promise<void>;
  onUpdateStatus: (id: string, status: TripStatus, newVehicleKm?: number) => Promise<void>;
  onDeleteTrip: (id: string) => Promise<void>;
  isSaving?: boolean;
  isOnline?: boolean;
}

const BRAZILIAN_STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const getTodayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const TripManager: React.FC<TripManagerProps> = ({ trips, vehicles, expenses, onAddTrip, onUpdateTrip, onUpdateStatus, onDeleteTrip, isSaving, isOnline = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKmModalOpen, setIsKmModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: TripStatus, vehicleId?: string} | null>(null);
  const [newVehicleKm, setNewVehicleKm] = useState<number>(0);
  
  const [routeMenuId, setRouteMenuId] = useState<string | null>(null);
  const [isPreviewRouteOpen, setIsPreviewRouteOpen] = useState(false);
  
  const [origin, setOrigin] = useState({ city: '', state: 'SP' });
  const [destination, setDestination] = useState({ city: '', state: 'SP' });
  const [stops, setStops] = useState<TripStop[]>([]);

  const [formData, setFormData] = useState<any>({
    description: '',
    distance_km: 0,
    agreed_price: 0,
    driver_commission_percentage: 10,
    cargo_type: 'geral',
    date: getTodayLocal(),
    vehicle_id: '',
    status: TripStatus.SCHEDULED,
    notes: ''
  });

  // Cálculo de Custos Fixos Totais
  const totalFixedExpenses = useMemo(() => {
    return expenses.filter(e => !e.trip_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const statusPriority: Record<TripStatus, number> = {
        [TripStatus.SCHEDULED]: 1,
        [TripStatus.IN_PROGRESS]: 2,
        [TripStatus.COMPLETED]: 3,
        [TripStatus.CANCELLED]: 4
      };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      return b.date.localeCompare(a.date);
    });
  }, [trips]);

  const calculatedCommission = (formData.agreed_price || 0) * ((formData.driver_commission_percentage || 0) / 100);

  const handleStatusChange = (trip: Trip, newStatus: TripStatus) => {
    if (newStatus === TripStatus.COMPLETED && trip.vehicle_id) {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      setNewVehicleKm(vehicle?.current_km || 0);
      setPendingStatusUpdate({ id: trip.id, status: newStatus, vehicleId: trip.vehicle_id });
      setIsKmModalOpen(true);
    } else {
      onUpdateStatus(trip.id, newStatus);
    }
  };

  const confirmKmUpdate = async () => {
    if (!pendingStatusUpdate) return;
    await onUpdateStatus(pendingStatusUpdate.id, pendingStatusUpdate.status, newVehicleKm);
    setIsKmModalOpen(false);
    setPendingStatusUpdate(null);
  };

  const openGoogleMaps = (tripOrigin: string, tripDest: string, tripStops: TripStop[]) => {
    const originStr = `${tripOrigin}, Brasil`.replace(' - ', ', ');
    const destStr = `${tripDest}, Brasil`.replace(' - ', ', ');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
    if (tripStops && tripStops.length > 0) {
      const waypointsStr = tripStops.map(s => `${s.city}, ${s.state}, Brasil`).join('|');
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }
    window.open(url, '_blank');
    setRouteMenuId(null);
  };

  const openWaze = (tripDest: string) => {
    const destStr = `${tripDest}, Brasil`.replace(' - ', ', ');
    const url = `https://www.waze.com/ul?q=${encodeURIComponent(destStr)}&navigate=yes`;
    window.open(url, '_blank');
    setRouteMenuId(null);
  };

  const suggestANTTPrice = () => {
    if (!formData.vehicle_id || !formData.distance_km) {
      alert("Selecione um veículo e informe a distância primeiro.");
      return;
    }
    const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
    if (!vehicle) return;
    const result = calculateANTT(formData.distance_km, vehicle.axles || 5, vehicle.cargo_type || 'geral', {
      returnEmpty: false
    });
    setFormData({ ...formData, agreed_price: Math.ceil(result.total) });
  };

  const resetForm = () => {
    setEditingTripId(null);
    setStops([]);
    setOrigin({ city: '', state: 'SP' });
    setDestination({ city: '', state: 'SP' });
    setFormData({
      description: '',
      distance_km: 0,
      agreed_price: 0,
      driver_commission_percentage: 10,
      cargo_type: 'geral',
      date: getTodayLocal(),
      vehicle_id: '',
      status: TripStatus.SCHEDULED,
      notes: ''
    });
  };

  const handleEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    const originParts = (trip.origin || "").split(' - ');
    const destParts = (trip.destination || "").split(' - ');
    setOrigin({ city: originParts[0] || '', state: originParts[1] || 'SP' });
    setDestination({ city: destParts[0] || '', state: destParts[1] || 'SP' });
    setStops(trip.stops || []);
    setFormData({
      description: trip.description || '',
      distance_km: trip.distance_km,
      agreed_price: trip.agreed_price,
      driver_commission_percentage: trip.driver_commission_percentage,
      cargo_type: trip.cargo_type,
      date: trip.date,
      vehicle_id: trip.vehicle_id || '',
      status: trip.status,
      notes: trip.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!origin.city || !destination.city || !formData.distance_km || !formData.agreed_price) {
      alert("Preencha campos obrigatórios: Origem, Destino, Distância e Frete.");
      return;
    }
    const payload = {
      description: formData.description?.trim() || "",
      origin: `${origin.city} - ${origin.state}`,
      destination: `${destination.city} - ${destination.state}`,
      distance_km: Number(formData.distance_km),
      agreed_price: Number(formData.agreed_price),
      driver_commission_percentage: Number(formData.driver_commission_percentage),
      driver_commission: Number(calculatedCommission),
      cargo_type: formData.cargo_type,
      date: formData.date,
      vehicle_id: formData.vehicle_id || null,
      status: formData.status,
      notes: formData.notes?.trim() || "",
      stops: stops
    };
    try {
      if (editingTripId) await onUpdateTrip(editingTripId, payload);
      else await onAddTrip(payload);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-fade-in">
      {/* Resumo de Custos Fixos no Topo */}
      <div className="px-4">
        <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary-600/20 text-primary-400 rounded-2xl border border-primary-500/20">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Despesas Fixas Acumuladas</p>
              <p className="text-2xl font-black text-white">R$ {totalFixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-white/10"></div>
          <div className="text-center md:text-right">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Status da Frota</p>
             <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-tight">{vehicles.length} veículos cadastrados</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Minhas Viagens</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Controle de Fretes</p>
             <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isOnline ? 'Sincronizado' : 'Offline'}
             </div>
          </div>
        </div>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-primary-600 text-white px-8 py-5 rounded-[2rem] flex items-center justify-center gap-2 font-black uppercase text-xs shadow-xl transition-all active:scale-95">
          <Plus size={20} /> Nova Viagem
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {sortedTrips.map(trip => {
          // Cálculo de Despesas Vinculadas a ESTA viagem
          const tripExpenses = expenses.filter(e => e.trip_id === trip.id);
          const totalTripExpenses = tripExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
          const netProfit = trip.agreed_price - totalTripExpenses - trip.driver_commission;
          const isProfitable = netProfit > 0;

          return (
            <div key={trip.id} className="bg-white p-6 md:p-8 rounded-[3rem] border-2 shadow-sm relative group animate-fade-in transition-all border-slate-50 hover:border-primary-100">
              <div className="flex flex-col gap-6">
                 <div className="flex-1">
                    <div className="flex flex-col items-start gap-2 mb-4 pr-20">
                      <select value={trip.status} onChange={(e) => handleStatusChange(trip, e.target.value as TripStatus)} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border-none cursor-pointer ${trip.status === TripStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : trip.status === TripStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : trip.status === TripStatus.CANCELLED ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                        {Object.values(TripStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="text-[10px] md:text-xs font-black text-slate-400 flex items-center gap-1 uppercase">
                        <Calendar size={12} /> {formatDateDisplay(trip.date)}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-tight line-clamp-2">
                      {trip.description || `${trip.origin.split(' - ')[0]} ➔ ${trip.destination.split(' - ')[0]}`}
                    </h3>
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary-500"></div><h4 className="text-sm font-black text-slate-700 truncate uppercase">{trip.origin}</h4></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div><h4 className="text-sm font-black text-slate-700 truncate uppercase">{trip.destination}</h4></div>
                    </div>
                    
                    {/* RESUMO FINANCEIRO NO CARD */}
                    <div className="mt-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Frete Bruto</p>
                          <p className="text-sm font-black text-slate-900">R$ {trip.agreed_price.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase text-rose-400 mb-1">Gastos Viagem</p>
                          <p className="text-sm font-black text-rose-600">R$ {totalTripExpenses.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase text-primary-400 mb-1">Comissão</p>
                          <p className="text-sm font-black text-primary-600">R$ {trip.driver_commission.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Lucro Líquido</p>
                          <div className={`flex items-center justify-end gap-1 text-sm font-black ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isProfitable ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                            R$ {netProfit.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
              <div className="mt-6 relative">
                <button onClick={() => setRouteMenuId(trip.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-black shadow-lg transition-all active:scale-95"><Navigation size={14}/> Iniciar Rota GPS</button>
                {routeMenuId === trip.id && (
                  <div className="absolute inset-x-0 bottom-full mb-2 bg-slate-900 rounded-2xl p-2 flex flex-col gap-1 z-50 shadow-2xl border border-white/10">
                    <button onClick={() => openGoogleMaps(trip.origin, trip.destination, trip.stops || [])} className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-black text-[10px] uppercase">Google Maps <MapIcon size={16} /></button>
                    <button onClick={() => openWaze(trip.destination)} className="flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl text-white font-black text-[10px] uppercase">Waze <Smartphone size={16} /></button>
                    <button onClick={() => setRouteMenuId(null)} className="w-full py-2 text-slate-500 font-black text-[8px] uppercase">Cancelar</button>
                  </div>
                )}
              </div>
              <div className="absolute top-6 right-6 flex items-center gap-1">
                <button onClick={() => handleEdit(trip)} className="p-3 bg-white shadow-md rounded-full text-slate-400 hover:text-primary-600 transition-all"><Edit2 size={16}/></button>
                <button onClick={() => { if(confirm('Excluir?')) onDeleteTrip(trip.id) }} className="p-3 bg-white shadow-md rounded-full text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 z-[100] animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[4rem] md:rounded-[3rem] shadow-2xl animate-slide-up relative h-[85vh] md:h-auto overflow-y-auto pb-10">
            <div className="flex justify-between items-center p-6 md:p-10 pb-4">
              <div>
                <span className="text-xs font-black uppercase text-primary-600 tracking-widest">Gestão Operacional</span>
                <h3 className="text-3xl font-black uppercase tracking-tighter mt-1">{editingTripId ? 'Editar Viagem' : 'Novo Frete'}</h3>
              </div>
              <button onClick={() => { resetForm(); setIsModalOpen(false); }} className="bg-slate-100 p-4 rounded-full text-slate-400"><X size={28} /></button>
            </div>

            <div className="p-5 md:p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Viagem / Carga</label>
                <input placeholder="Ex: Carga de soja..." className="w-full p-5 bg-slate-50 rounded-2xl font-black text-lg outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary-600 ml-1 flex items-center gap-2"><Calendar size={14}/> Data da Viagem</label>
                  <input type="date" className="w-full p-5 bg-slate-50 border-2 border-primary-100 focus:border-primary-500 rounded-2xl font-black outline-none text-base" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Veículo</label>
                  <select className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold outline-none" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                    <option value="">Selecione...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-[3rem] border border-slate-100">
                <div className="flex justify-between items-center mb-2 px-1">
                   <h4 className="text-[10px] font-black uppercase text-slate-400">Trajeto Principal</h4>
                   {origin.city && destination.city && (
                     <button onClick={() => setIsPreviewRouteOpen(!isPreviewRouteOpen)} className="flex items-center gap-2 text-[10px] font-black uppercase text-primary-600 bg-primary-50 px-4 py-2 rounded-xl">
                       <MapPinCheck size={14}/> {isPreviewRouteOpen ? 'Fechar Mapa' : 'Ver no Mapa'}
                     </button>
                   )}
                </div>
                {isPreviewRouteOpen && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border-2 border-primary-200 mb-4 animate-fade-in">
                    <iframe title="Preview Rota" className="w-full h-full border-0" src={`https://www.google.com/maps?q=${encodeURIComponent(origin.city)}+para+${encodeURIComponent(destination.city)}&output=embed`} />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Origem</label>
                    <div className="flex gap-2">
                      <input placeholder="Cidade" className="flex-1 p-4 bg-white rounded-2xl font-bold outline-none" value={origin.city} onChange={e => setOrigin({...origin, city: e.target.value})} />
                      <select className="w-20 p-4 bg-white rounded-2xl font-bold" value={origin.state} onChange={e => setOrigin({...origin, state: e.target.value})}>{BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destino</label>
                    <div className="flex gap-2">
                      <input placeholder="Cidade" className="flex-1 p-4 bg-white rounded-2xl font-bold outline-none" value={destination.city} onChange={e => setDestination({...destination, city: e.target.value})} />
                      <select className="w-20 p-4 bg-white rounded-2xl font-bold" value={destination.state} onChange={e => setDestination({...destination, state: e.target.value})}>{BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Distância (KM)</label>
                  <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl outline-none" value={formData.distance_km || ''} onChange={e => setFormData({...formData, distance_km: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Frete Bruto (R$)</label>
                    <button type="button" onClick={suggestANTTPrice} className="text-[8px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-amber-200"><Calculator size={10}/> Sugerir ANTT</button>
                  </div>
                  <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl text-primary-600 outline-none" value={formData.agreed_price || ''} onChange={e => setFormData({...formData, agreed_price: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-primary-50 p-6 rounded-[2.5rem] border border-primary-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 space-y-2 w-full">
                  <label className="text-[10px] font-black uppercase text-primary-600 ml-1 flex items-center gap-2">
                    <Percent size={14}/> Comissão do Motorista (%)
                  </label>
                  <input type="number" className="w-full p-4 bg-white rounded-2xl font-black text-xl outline-none border-none" value={formData.driver_commission_percentage} onChange={e => setFormData({...formData, driver_commission_percentage: Number(e.target.value)})} />
                </div>
                <div className="text-center md:text-right shrink-0">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total a Pagar</p>
                  <p className="text-3xl font-black text-primary-600">R$ {calculatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <button disabled={isSaving} onClick={handleSave} className="w-full py-8 bg-primary-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 mb-8">
                {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={32}/>}
                {isSaving ? 'Salvando...' : 'Salvar Viagem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atualização de KM */}
      {isKmModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 z-[110] animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-up">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Finalizar Viagem</h3>
            <p className="text-slate-500 text-xs font-medium mb-6">Atualize a quilometragem do veículo para manter o histórico preciso.</p>
            
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1">KM Final do Veículo</label>
                 <input 
                    type="number" 
                    autoFocus
                    className="w-full p-4 bg-slate-50 border-2 border-primary-100 rounded-2xl font-black text-2xl text-slate-900 outline-none focus:border-primary-500 transition-all" 
                    value={newVehicleKm} 
                    onChange={e => setNewVehicleKm(Number(e.target.value))} 
                 />
               </div>
               
               <div className="flex gap-3 pt-2">
                 <button onClick={() => setIsKmModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                 <button onClick={confirmKmUpdate} className="flex-1 py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-600 transition-all">Confirmar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
