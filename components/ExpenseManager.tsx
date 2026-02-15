
import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Trip, Vehicle } from '../types';
import { Trash2, ChevronDown, ReceiptText, Banknote, Loader2, Edit2, X, ShieldCheck, Wallet, Check, Calendar, Truck, Tag } from 'lucide-react';

interface ExpenseManagerProps {
  expenses: Expense[];
  trips: Trip[];
  vehicles: Vehicle[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  onUpdateExpense?: (id: string, expense: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  isSaving?: boolean;
}

const getToday = () => new Date().toISOString().split('T')[0];

const addOneMonth = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

const FIXED_CATEGORIES = [
  ExpenseCategory.FINANCING,
  ExpenseCategory.INSURANCE,
  ExpenseCategory.TRACKER,
  ExpenseCategory.SUBSCRIPTION,
  ExpenseCategory.OTHER
];

const TRIP_CATEGORIES = [
  ExpenseCategory.FUEL,
  ExpenseCategory.TOLL,
  ExpenseCategory.MAINTENANCE,
  ExpenseCategory.FOOD,
  ExpenseCategory.LODGING,
  ExpenseCategory.TIRE_REPAIR,
  ExpenseCategory.OTHER
];

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, trips, vehicles, onAddExpense, onUpdateExpense, onDeleteExpense, isSaving }) => {
  const [modalType, setModalType] = useState<'TRIP' | 'FIXED' | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    category: ExpenseCategory.FUEL,
    date: getToday(),
    due_date: getToday(),
    trip_id: '',
    vehicle_id: '',
    description: '',
    amount: '',
    is_paid: true,
    installments_total: 1,
    installment_number: 1
  });

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      if (!a.is_paid && b.is_paid) return -1;
      if (a.is_paid && !b.is_paid) return 1;
      if (!a.is_paid && !b.is_paid) {
        return (a.due_date || a.date).localeCompare(b.due_date || b.date);
      }
      return (b.date).localeCompare(a.date);
    });
  }, [expenses]);

  const resetForm = () => {
    setModalType(null);
    setEditingExpenseId(null);
    setFormData({ 
      category: ExpenseCategory.FUEL, 
      date: getToday(), 
      due_date: getToday(),
      trip_id: '', 
      vehicle_id: '', 
      description: '',
      amount: '',
      is_paid: true,
      installments_total: 1,
      installment_number: 1
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    const isFixed = FIXED_CATEGORIES.includes(expense.category);
    setModalType(isFixed ? 'FIXED' : 'TRIP');
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      due_date: expense.due_date || expense.date,
      trip_id: expense.trip_id || '',
      vehicle_id: expense.vehicle_id || '',
      is_paid: expense.is_paid ?? true,
      installments_total: expense.installments_total || 1,
      installment_number: expense.installment_number || 1
    });
  };

  const handleMarkAsPaid = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense || !onUpdateExpense) return;

    if (confirm(`Confirmar o pagamento de "${expense.description}"?`)) {
      if (expense.installments_total && expense.installment_number && expense.installment_number < expense.installments_total) {
        const nextDueDate = addOneMonth(expense.due_date || expense.date);
        await onUpdateExpense(id, {
          is_paid: false, 
          installment_number: (expense.installment_number || 1) + 1,
          due_date: nextDueDate,
          date: getToday()
        });
      } else {
        await onUpdateExpense(id, { is_paid: true });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(formData.amount);
    if (!formData.description || isNaN(cleanAmount) || cleanAmount <= 0) {
      alert("Preencha descrição e valor corretamente.");
      return;
    }

    const payload: any = {
      description: formData.description.trim(),
      amount: cleanAmount,
      category: formData.category,
      date: formData.date,
      due_date: formData.due_date || formData.date,
      is_paid: Boolean(formData.is_paid),
      trip_id: (modalType === 'TRIP' && formData.trip_id !== '') ? formData.trip_id : null,
      vehicle_id: (formData.vehicle_id !== '') ? formData.vehicle_id : null,
      installments_total: Number(formData.installments_total || 1),
      installment_number: Number(formData.installment_number || 1)
    };

    try {
      if (editingExpenseId && onUpdateExpense) {
        await onUpdateExpense(editingExpenseId, payload);
      } else {
        await onAddExpense(payload);
      }
      resetForm();
    } catch (err: any) {
      console.error("Erro ao salvar despesa:", err);
    }
  };

  const currentCategories = modalType === 'FIXED' ? FIXED_CATEGORIES : TRIP_CATEGORIES;

  return (
    <div className="space-y-8 pb-32 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Financeiro</h2>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2">Vencimentos e Fluxo de Caixa</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={() => { resetForm(); setModalType('TRIP'); setFormData(prev => ({ ...prev, category: ExpenseCategory.FUEL, is_paid: true })); }} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] font-black text-xs uppercase text-slate-600 hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm active:scale-95"
          >
            <ReceiptText size={20} /> Despesa Viagem
          </button>
          <button 
            onClick={() => { resetForm(); setModalType('FIXED'); setFormData(prev => ({ ...prev, category: ExpenseCategory.FINANCING, is_paid: false })); }} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-black active:scale-95 transition-all"
          >
            <Banknote size={20} /> Despesa Fixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {sortedExpenses.map((expense) => {
          const isOverdue = !expense.is_paid && expense.due_date && new Date(expense.due_date + 'T12:00:00') < new Date();
          const isToday = !expense.is_paid && expense.due_date === getToday();
          const trip = trips.find(t => t.id === expense.trip_id);
          const vehicle = vehicles.find(v => v.id === expense.vehicle_id);
          const isFixed = FIXED_CATEGORIES.includes(expense.category);

          return (
            <div key={expense.id} className={`bg-white p-8 rounded-[3rem] border-2 shadow-sm relative group hover:border-primary-500 transition-all ${isOverdue ? 'border-rose-300 ring-4 ring-rose-50' : isToday ? 'border-amber-300 ring-4 ring-amber-50' : 'border-slate-50'}`}>
              {(isOverdue || isToday) && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-20 ${isOverdue ? 'bg-rose-600' : 'bg-amber-600'}`}>
                  {isOverdue ? 'Atrasada' : 'Vence Hoje'}
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className={`p-5 rounded-[1.5rem] ${!isFixed ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                  {!isFixed ? <ReceiptText size={28}/> : <Wallet size={28}/>}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Valor</div>
                  <div className="text-3xl font-black text-slate-900">R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  {expense.installments_total && expense.installments_total > 1 && (
                    <div className="text-[10px] font-black text-primary-500 uppercase mt-1">Parcela {expense.installment_number}/{expense.installments_total}</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-800 leading-tight truncate uppercase tracking-tighter">{expense.description}</h3>
                
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${isFixed ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {expense.category}
                  </span>
                  {vehicle && (
                    <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-3 py-1 rounded-lg flex items-center gap-1">
                      <Truck size={10}/> {vehicle.plate}
                    </span>
                  )}
                  {trip && <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg">Viagem: {trip.destination.split(' - ')[0]}</span>}
                </div>

                <div className="h-px bg-slate-50 my-2"></div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-300" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Vencimento</p>
                      <p className={`text-sm font-black ${isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600' : 'text-slate-700'}`}>{expense.due_date ? new Date(expense.due_date + 'T12:00:00').toLocaleDateString() : '---'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400">Status</p>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${expense.is_paid ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {expense.is_paid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>
                </div>

                {!expense.is_paid && (
                  <button 
                    onClick={() => handleMarkAsPaid(expense.id)} 
                    className="w-full mt-4 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl active:scale-95 transition-all"
                  >
                    <Check size={18}/> {expense.installments_total && expense.installments_total > 1 ? `Pagar Parcela ${expense.installment_number}` : 'Confirmar Pagamento'}
                  </button>
                )}
              </div>

              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(expense)} className="p-3 bg-white shadow-md rounded-full text-slate-400 hover:text-primary-600 transition-all"><Edit2 size={16} /></button>
                <button onClick={() => { if(confirm("Deseja excluir?")) onDeleteExpense(expense.id) }} className="p-3 bg-white shadow-md rounded-full text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 z-[100] animate-fade-in" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="bg-white rounded-t-[4rem] md:rounded-[3rem] w-full max-w-xl p-8 md:p-12 shadow-2xl animate-slide-up h-[90vh] md:h-auto overflow-y-auto mt-[env(safe-area-inset-top)]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <span className="text-xs font-black uppercase text-primary-600 tracking-[0.2em]">{modalType === 'FIXED' ? 'Lançamento Fixo' : 'Lançamento Viagem'}</span>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mt-2">
                  {editingExpenseId ? 'Editar Gasto' : 'Novo Gasto'}
                </h3>
              </div>
              <button onClick={resetForm} className="bg-slate-100 p-5 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-1">O que foi pago?</label>
                <input required type="text" placeholder="Ex: Prestação, Seguro, Diesel..." className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-primary-500 font-bold outline-none text-lg transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Valor (R$)</label>
                  <input required type="number" step="0.01" className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-primary-500 font-black text-3xl text-slate-900 outline-none" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                    <Tag size={12}/> Categoria
                  </label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-primary-500 font-bold appearance-none pr-12 outline-none"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      {currentCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Data Gasto</label>
                  <input required type="date" className="w-full p-5 bg-slate-50 rounded-3xl font-bold outline-none text-base" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-primary-600 ml-1">Vencimento</label>
                  <input required type="date" className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-primary-100 font-bold outline-none text-base" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Veículo Associado</label>
                  <div className="relative">
                    <select className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-primary-500 font-bold appearance-none pr-12 outline-none" value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                      <option value="">Nenhum Veículo</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  </div>
                </div>
                {modalType === 'TRIP' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-1">Vincular Viagem</label>
                    <div className="relative">
                      <select 
                        className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-primary-500 font-bold appearance-none pr-12 outline-none" 
                        value={formData.trip_id} 
                        onChange={e => setFormData({...formData, trip_id: e.target.value})}
                      >
                        <option value="">Sem Viagem Específica</option>
                        {[...trips]
                          .filter(t => t.status !== 'Cancelada')
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map(t => {
                            const dateStr = t.date.split('-').reverse().slice(0, 2).join('/'); // DD/MM
                            return (
                              <option key={t.id} value={t.id}>
                                {`[${dateStr}] ${t.origin.split(' - ')[0]} ➔ ${t.destination.split(' - ')[0]}`}
                              </option>
                            );
                          })
                        }
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                  </div>
                )}
              </div>

              {modalType === 'FIXED' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Total de Parcelas</label>
                    <input type="number" className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-xl outline-none" value={formData.installments_total || ''} onChange={e => setFormData({...formData, installments_total: e.target.value === '' ? 1 : Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parcela Inicial</label>
                    <input type="number" className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-xl outline-none" value={formData.installment_number || ''} onChange={e => setFormData({...formData, installment_number: e.target.value === '' ? 1 : Number(e.target.value)})} />
                  </div>
                </div>
              )}

              <div className={`flex items-center gap-4 p-6 rounded-3xl border transition-all ${formData.is_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <input type="checkbox" className="w-7 h-7 rounded-lg text-emerald-600" checked={formData.is_paid} onChange={e => setFormData({...formData, is_paid: e.target.checked})} />
                <label className={`text-sm font-black uppercase ${formData.is_paid ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formData.is_paid ? 'Gasto já Pago' : 'Lançar como Pendente'}
                </label>
              </div>

              <button disabled={isSaving} type="submit" className="w-full py-7 bg-primary-600 text-white rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all mb-8">
                {isSaving ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24}/>}
                {isSaving ? 'Salvando...' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
