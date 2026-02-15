import React, { useState } from 'react';
import { Trip, Expense } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { Sparkles, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiAssistantProps {
  trips: Trip[];
  expenses: Expense[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ trips, expenses }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleGenerateInsight = async () => {
    if (trips.length === 0 && expenses.length === 0) {
      setInsight("Por favor, adicione algumas viagens ou despesas primeiro para que eu possa analisar seus dados.");
      return;
    }
    setLoading(true);
    try {
      const result = await getFinancialInsights(trips, expenses);
      setInsight(result);
    } catch (error) {
      setInsight("Erro ao gerar análise. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-4 py-8">
        <div className="inline-block p-4 bg-primary-100 rounded-full mb-2">
          <Bot size={48} className="text-primary-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">IA Auri: Seu Consultor</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Análise inteligente para encontrar padrões nos seus dados e aumentar seu lucro.
        </p>
        
        <button 
          onClick={handleGenerateInsight}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto disabled:opacity-70 active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Analisando dados...
            </>
          ) : (
            <>
              <Sparkles /> Gerar Relatório de Inteligência
            </>
          )}
        </button>
      </div>

      {insight && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500"/> Análise de Performance
            </h3>
          </div>
          <div className="p-6 md:p-8 text-gray-700 leading-relaxed overflow-x-auto">
            <div className="prose prose-slate prose-blue max-w-none">
              <ReactMarkdown>{insight}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
      
      {!insight && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-80">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-2">💰 Lucratividade</h4>
                <p className="text-sm text-gray-500">Avalie se o frete cobrado cobre os custos reais.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-2">⛽ Combustível</h4>
                <p className="text-sm text-gray-500">Insights sobre o consumo e gastos por quilômetro.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-2">📊 Otimização</h4>
                <p className="text-sm text-gray-500">Sugestões baseadas na tabela ANTT e mercado.</p>
            </div>
        </div>
      )}
    </div>
  );
};