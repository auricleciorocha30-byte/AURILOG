
import { GoogleGenAI, Type } from "@google/genai";
import { ANTTParams, Trip, Expense } from '../types';

// Using gemini-3-pro-preview for estimation as it involves logical calculation and reasoning.
export const getSmartFreightEstimation = async (params: ANTTParams): Promise<{ minPrice: number, marketPrice: number, reasoning: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Você é uma calculadora inteligente de fretes baseada na tabela da ANTT do Brasil.
      
      Parâmetros da viagem:
      - Distância: ${params.distance} km
      - Eixos: ${params.axles}
      - Tipo de Carga: ${params.cargoType}
      - Retorno Vazio: ${params.returnEmpty ? 'Sim' : 'Não'}
      - Custos de Pedágio: R$ ${params.tollCost || 0}

      Retorne APENAS um objeto JSON com: minPrice, marketPrice e reasoning.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            minPrice: { type: Type.NUMBER },
            marketPrice: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
          },
          propertyOrdering: ["minPrice", "marketPrice", "reasoning"],
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta da IA");
    return JSON.parse(text);
  } catch (error) {
    const baseRate = 1.2 * params.axles;
    const cost = (params.distance * baseRate) + (params.tollCost || 0) + (params.otherCosts || 0);
    return {
      minPrice: cost,
      marketPrice: cost * 1.3,
      reasoning: "Cálculo offline estimado."
    };
  }
};

/**
 * Generates financial insights using Gemini AI.
 * Fixed missing export error. Uses gemini-3-pro-preview for complex text analysis.
 */
export const getFinancialInsights = async (trips: Trip[], expenses: Expense[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Analise os seguintes dados financeiros de transporte de carga e forneça insights estratégicos detalhados em Markdown.
    
Viagens: ${JSON.stringify(trips)}
Despesas: ${JSON.stringify(expenses)}

Por favor, forneça uma análise detalhada contendo:
1. Lucratividade Geral: Cálculo do lucro líquido total e margem média.
2. Análise de Rotas: Quais destinos ou tipos de carga estão sendo mais lucrativos.
3. Alertas de Custos: Identificação de categorias de despesas que podem estar acima do esperado (ex: combustível, manutenção).
4. Recomendações: 3 a 5 passos práticos para melhorar a operação e aumentar a margem de lucro.

Responda em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é o 'Auri', um consultor financeiro especialista em logística rodoviária e transporte de cargas no Brasil. Sua análise deve ser baseada em dados, profissional, direta e útil para um transportador.",
      }
    });

    return response.text || "Não foi possível gerar insights financeiros no momento.";
  } catch (error) {
    console.error("Erro ao gerar insights com Gemini:", error);
    return "Ocorreu um erro ao processar seus dados financeiros. Por favor, verifique sua conexão e tente novamente.";
  }
};
