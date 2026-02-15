
import React, { useState } from 'react';
import { Vehicle } from '../types';
import { Plus, Settings, Truck, Trash2, Loader2, Edit2, X, ChevronDown } from 'lucide-react';
import { ANTT_CARGO_TYPES } from '../services/anttService';

interface VehicleManagerProps {
  vehicles: Vehicle[];
  onAddVehicle: (veh: Omit<Vehicle, 'id'>) => Promise<void>;
  onUpdateVehicle: (id: string, veh: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  isSaving?: boolean;
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({ vehicles, onAddVehicle, onUpdateVehicle, onDeleteVehicle, isSaving }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({ 
    plate: '', 
    model: '', 
    year: new Date().getFullYear(), 
    current_km: 0,
    axles: 2,
    cargo_type: 'geral'
  });

  const resetForm = () => {
    setFormData({ plate: '', model: '', year: new Date().getFullYear(), current_km: 0, axles: 2, cargo_type: 'geral' });
    setEditingId(null);
  };

  const handleEdit = (v: Vehicle) => {
    setFormData({ 
      plate: v.plate, 
      model: v.model, 
      year: v.year, 
      current_km: v.current_km,
      axles: v.axles || 2,
      cargo_type: v.cargo_type || 'geral'
    });
    setEditingId(v.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.plate || !formData.model) return alert("Preencha os campos obrigatórios.");
    
    if (editingId) {
      await onUpdateVehicle(editingId, formData);
    } else {
      await onAddVehicle(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-slate-900">Frota de Veículos</h2>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-primary-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg active:scale-95 transition-all">
          <Plus size={20} /> Novo Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
        {vehicles.map(v => (
          <div key={v.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm relative group hover:border-primary-200 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-primary-50 text-primary-600 rounded-[1.5rem]"><Truck size={28}/></div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">{v.plate}</span>
                <div className="flex flex-col gap-1">
                   <button onClick={() => handleEdit(v)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors"><Edit2 size={18}/></button>
                   <button onClick={() => onDeleteVehicle(v.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-800">{v.model}</h3>
            <p className="text-sm font-bold text-slate-400 mb-6">{v.year}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Eixos</p>
                <p className="text-lg font-black text-slate-800">{v.axles || 2}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Km Atual</p>
                <p className="text-lg font-black text-slate-800">{v.current_km.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-3 bg-slate-50 p-3 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Carga Padrão</p>
              <p className="text-xs font-bold text-slate-600 truncate">
                {ANTT_CARGO_TYPES.find(t => t.id === v.cargo_type)?.label || 'Carga Geral'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-fade-in relative mt-10 mb-10 overflow-hidden">
            <div className="flex justify-between items-center p-8 pb-4 border-b border-slate-50">
              <h3 className="text-2xl font-black">{editingId ? 'Editar Veículo' : 'Cadastrar Veículo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={28} /></button>
            </div>
            
            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Placa</label>
                  <input placeholder="ABC-1234" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase outline-none focus:bg-white transition-all" value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Ano</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value === '' ? 0 : Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Modelo / Fabricante</label>
                <input placeholder="Ex: Volvo FH 540" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:bg-white transition-all" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Número de Eixos</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" value={formData.axles} onChange={e => setFormData({...formData, axles: Number(e.target.value)})}>
                    {[2, 3, 4, 5, 6, 7, 9].map(n => <option key={n} value={n}>{n} Eixos</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">KM Atual</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black outline-none" value={formData.current_km || ''} onChange={e => setFormData({...formData, current_km: e.target.value === '' ? 0 : Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Tipo de Carga Padrão</label>
                <div className="relative">
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold appearance-none outline-none" value={formData.cargo_type} onChange={e => setFormData({...formData, cargo_type: e.target.value})}>
                    {ANTT_CARGO_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold border rounded-2xl active:scale-95 transition-all">Cancelar</button>
                <button disabled={isSaving} onClick={handleSubmit} className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : editingId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
