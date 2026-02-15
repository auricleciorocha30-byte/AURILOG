
import React, { useState, useMemo } from 'react';
import { ANTTParams } from '../types';
import { Calculator, ChevronDown, Info, Calculator as CalcIcon, Percent, TrendingUp } from 'lucide-react';
import { calculateANTT, ANTT_CARGO_TYPES } from '../services/anttService';

export const FreightCalculator: React.FC = () => {
  const [params, setParams] = useState<ANTTParams>({
    distance: 1,
    axles: 2,
    cargoType: 'geral',
    isComposition: false,
    isHighPerformance: false,
    returnEmpty: false,
  });

  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => {
    return calculateANTT(params.distance, params.axles, params.cargoType, {
      returnEmpty: params.returnEmpty,
      isComposition: params.isComposition,
      isHighPerformance: params.isHighPerformance
    });
  }, [params]);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
  };

  const ToggleRow = ({ label, description, value, onChange }: { label: string, description?: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
      <div>
        <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">{label}</span>
        {description && <p className="text-[10px] text-slate-400 mt-0.5 font-medium italic">{description}</p>}
      </div>
      <button 
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-14 h-7 rounded-full transition-colors flex items-center px-1 ${value ? 'bg-emerald-500' : 'bg-rose-500'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all flex items-center justify-center text-[8px] font-black text-slate-400 ${value ? 'translate-x-7' : 'translate-x-0'}`}>
           {value ? 'SIM' : 'NÃO'}
        </div>
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
           <div className="flex items-center gap-3">
             <div className="bg-primary-600 p-3 rounded-2xl"><CalcIcon size={24}/></div>
             <div>
               <h2 className="text-2xl font-black uppercase tracking-tighter">Calculadora ANTT</h2>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Piso Mínimo Obrigatório</p>
             </div>
           </div>
        </div>

        <form onSubmit={handleCalculate} className="p-8 md:p-12 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Carga</label>
            <div className="relative">
              <select 
                className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl font-black text-slate-700 outline-none appearance-none transition-all"
                value={params.cargoType}
                onChange={e => setParams({...params, cargoType: e.target.value})}
              >
                {ANTT_CARGO_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <ChevronDown size={24} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Eixos*</label>
              <select 
                className="w-full p-5 bg-slate-50 rounded-2xl font-black text-slate-700 outline-none border-2 border-transparent focus:border-primary-500 transition-all"
                value={params.axles}
                onChange={e => setParams({...params, axles: Number(e.target.value)})}
              >
                {[2, 3, 4, 5, 6, 7, 9].map(n => <option key={n} value={n}>{n} Eixos</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Distância (KM)</label>
              <input 
                required
                type="number" 
                className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl text-slate-800 outline-none border-2 border-transparent focus:border-primary-500 transition-all"
                value={params.distance || ''}
                onChange={e => setParams({...params, distance: e.target.value === '' ? 0 : Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-1">
            <ToggleRow 
              label="Composição Veicular" 
              description="Contratação do conjunto completo (veículo + implemento)" 
              value={params.isComposition || false} 
              onChange={v => setParams({...params, isComposition: v})} 
            />
            <ToggleRow 
              label="Alto Desempenho" 
              value={params.isHighPerformance || false} 
              onChange={v => setParams({...params, isHighPerformance: v})} 
            />
            <ToggleRow 
              label="Retorno Vazio" 
              description="Aplica 0,92 x Distância x CCD"
              value={params.returnEmpty} 
              onChange={v => setParams({...params, returnEmpty: v})} 
            />
          </div>

          <div className="flex pt-4">
            <button 
              type="submit"
              className="w-full bg-[#48C0C8] text-white py-6 rounded-3xl font-black text-xl uppercase shadow-2xl shadow-[#48C0C8]/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <TrendingUp size={24}/> Calcular Frete Piso
            </button>
          </div>
        </form>

        {showResults && (
          <div className="p-8 md:p-12 bg-slate-50 border-t border-slate-100 animate-fade-in">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
              <Info size={14}/> Detalhamento conforme Resolução ANTT
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-600">
               <div className="space-y-3">
                  <p className="flex justify-between items-center pb-2 border-b border-white">
                    <span>Operação:</span>
                    <span className="font-black text-slate-900 text-right max-w-[200px]">{results.tabela}</span>
                  </p>
                  <p className="flex justify-between items-center pb-2 border-b border-white">
                    <span>Distância Total:</span>
                    <span className="font-black text-slate-900">{params.distance} KM</span>
                  </p>
                  <p className="flex justify-between items-center pb-2 border-b border-white">
                    <span>Custo Deslocamento (CCD):</span>
                    <span className="font-black text-emerald-600">R$ {results.ccd.toFixed(4).replace('.', ',')}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span>Custo Carga/Descarga (CC):</span>
                    <span className="font-black text-emerald-600">R$ {results.cc.toFixed(2).replace('.', ',')}</span>
                  </p>
               </div>
               
               <div className="bg-white p-6 rounded-[2rem] shadow-inner space-y-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Cálculo de Ida (KM x CCD + CC)</p>
                    <p className="text-xl font-black text-slate-800">R$ {results.valorIda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  {params.returnEmpty && (
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Retorno Vazio (0,92 x KM x CCD)</p>
                      <p className="text-xl font-black text-slate-800">R$ {results.valorRetornoVazio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-50">
                     <p className="text-[10px] font-black uppercase text-[#2d50a0] mb-1">Total Piso Mínimo Sugerido</p>
                     <p className="text-4xl font-black text-[#2d50a0]">R$ {results.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
