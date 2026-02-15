
import React, { useState } from 'react';
import { MaintenanceItem, Vehicle } from '../types';
import { Plus, CheckSquare, Calendar, ShieldCheck, Trash2, Loader2, Gauge, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface MaintenanceManagerProps {
  maintenance: MaintenanceItem[];
  vehicles: Vehicle[];
  onAddMaintenance: (m: Omit<MaintenanceItem, 'id'>) => Promise<void>;
  onDeleteMaintenance: (id: string) => void;
  isSaving?: boolean;
}

export const MaintenanceManager: React.FC<MaintenanceManagerProps> = ({ maintenance, vehicles, onAddMaintenance, onDeleteMaintenance, isSaving }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    vehicle_id: '',
    part_name: '',
    km_at_purchase: 0,
    warranty_months: 12,
    warranty_km: 10000,
    purchase_date: new Date().toISOString().split('T')[0],
    cost: 0
  });

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      part_name: '',
      km_at_purchase: 0,
      warranty_months: 12,
      warranty_km: 10000,
      purchase_date: new Date().toISOString().split('T')[0],
      cost: 0
    });
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleVehicleChange = (vId: string) => {
    const selectedVehicle = vehicles.find(v => v.id === vId);
    setFormData({
      ...formData,
      vehicle_id: vId,
      km_at_purchase: selectedVehicle ? selectedVehicle.current_km : 0
    });
  };

  const getStatus = (m: MaintenanceItem) => {
    const vehicle = vehicles.find(v => v.id === m.vehicle_id);
    if (!vehicle) return { label: 'Erro', color: 'text-slate-400', bg: 'bg-slate-100', icon: Info };

    const today = new Date();
    const pDate = new Date(m.purchase_date + 'T12:00:00');
    const expiryDate = new Date(pDate);
    expiryDate.setMonth(pDate.getMonth() + (m.warranty_months || 0));

    const kmLimit = (m.km_at_purchase || 0) + (m.warranty_km || 0);
    const kmLeft = kmLimit - vehicle.current_km;
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if ((m.warranty_months > 0 && expiryDate < today) || (m.warranty_km > 0 && vehicle.current_km >= kmLimit)) {
      return { label: 'Vencido', color: 'text-rose-600', bg: 'bg-rose-100', icon: AlertTriangle };
    }

    if ((m.warranty_months > 0 && daysLeft <= 30) || (m.warranty_km > 0 && kmLeft <= 1000)) {
      return { label: 'Atenção', color: 'text-amber-600', bg: 'bg-amber-100', icon: Info };
    }

    return { label: 'Em Dia', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-slate-900">Manutenção & Garantias</h2>
        <button onClick={handleOpenModal} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg active:scale-95 transition-all">
          <Plus size={20} /> Novo Registro
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden mx-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Peça / Serviço</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Veículo</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-right">Custo</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.map(m => {
                const status = getStatus(m);
                const vehicle = vehicles.find(v => v.id === m.vehicle_id);
                const StatusIcon = status.icon;
                
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{m.part_name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Troca em {(m.km_at_purchase || 0).toLocaleString()} KM</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{vehicle?.plate || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${status.bg} ${status.color}`}>
                        <StatusIcon size={12}/> {status.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-rose-600">R$ {(m.cost || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onDeleteMaintenance(m.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-fade-in my-0 md:my-8 h-[90vh] md:h-auto overflow-y-auto mt-[env(safe-area-inset-top)]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-slate-900">Lançar Manutenção</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={28}/></button>
            </div>
            
            <div className="space-y-4 pb-10">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Veículo</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" 
                  value={formData.vehicle_id} 
                  onChange={e => handleVehicleChange(e.target.value)}
                >
                  <option value="">Selecionar Veículo</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Peça ou Serviço</label>
                <input 
                  placeholder="Ex: Troca de Pneus Dianteiros" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" 
                  value={formData.part_name}
                  onChange={e => setFormData({...formData, part_name: e.target.value})} 
                />
              </div>
              
              {/* Ajuste para mobile: Empilhar em telas pequenas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">KM na Troca</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" 
                    value={formData.km_at_purchase || ''}
                    onChange={e => setFormData({...formData, km_at_purchase: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data da Compra</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base outline-none" 
                    value={formData.purchase_date} 
                    onChange={e => setFormData({...formData, purchase_date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="bg-primary-50 p-6 rounded-[2rem] border border-primary-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-primary-600 flex items-center gap-2">
                   <ShieldCheck size={14}/> Garantia
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Meses</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white border border-primary-200 rounded-xl font-black outline-none" 
                      value={formData.warranty_months || ''} 
                      onChange={e => setFormData({...formData, warranty_months: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">KM Máximo</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white border border-primary-200 rounded-xl font-black outline-none" 
                      value={formData.warranty_km || ''} 
                      onChange={e => setFormData({...formData, warranty_km: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Custo Total (R$)</label>
                 <input 
                  type="number" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-rose-600 outline-none" 
                  value={formData.cost || ''}
                  onChange={e => setFormData({...formData, cost: e.target.value === '' ? 0 : Number(e.target.value)})} 
                 />
              </div>

              <div className="flex gap-3 pt-6 mb-8">
                <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold border rounded-2xl active:scale-95 transition-all">Cancelar</button>
                <button disabled={isSaving} onClick={async () => { 
                   if(!formData.vehicle_id || !formData.part_name) return alert("Preencha veículo e peça.");
                   await onAddMaintenance(formData); 
                   setIsModalOpen(false); 
                }} className="flex-1 py-4 font-black bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
