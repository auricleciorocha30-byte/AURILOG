
// Coeficientes atualizados baseados na Resolução ANTT vigente (2024/2025)
// CCD = Custo de Deslocamento (R$/km) | CC = Custo de Carga e Descarga (R$/viagem)
// Valores ajustados conforme imagem de referência do usuário para 2 eixos Carga Geral.

const COEF_TABLE: Record<number, Record<string, { ccd: number; cc: number }>> = {
  2: { 
    geral: { ccd: 4.7937, cc: 515.17 }, // Valores exatos da imagem
    default: { ccd: 4.7937, cc: 515.17 }
  },
  3: { 
    geral: { ccd: 5.0934, cc: 580.45 },
    default: { ccd: 5.0934, cc: 580.45 }
  },
  4: { 
    geral: { ccd: 5.8021, cc: 650.45 },
    default: { ccd: 5.8021, cc: 650.45 }
  },
  5: { 
    geral: { ccd: 6.3512, cc: 720.10 },
    default: { ccd: 6.3512, cc: 720.10 }
  },
  6: { 
    geral: { ccd: 7.1512, cc: 810.45 },
    default: { ccd: 7.1512, cc: 810.45 }
  },
  7: { 
    geral: { ccd: 7.8512, cc: 890.12 },
    default: { ccd: 7.8512, cc: 890.12 }
  },
  9: { 
    geral: { ccd: 9.0512, cc: 980.45 },
    default: { ccd: 9.0512, cc: 980.45 }
  }
};

export const calculateANTT = (
  distance: number, 
  axles: number, 
  cargoType: string = 'geral',
  extras: { 
    toll?: number; 
    daily?: number; 
    other?: number; 
    returnEmpty?: boolean;
    isComposition?: boolean;
    isHighPerformance?: boolean;
  } = {}
) => {
  // Busca o eixo disponível mais próximo
  const availableAxles = Object.keys(COEF_TABLE).map(Number).sort((a, b) => b - a);
  const selectedAxles = availableAxles.find(a => a <= axles) || 2;
  
  const baseCoef = COEF_TABLE[selectedAxles][cargoType] || COEF_TABLE[selectedAxles]['default'];
  
  let currentCCD = baseCoef.ccd;
  let currentCC = baseCoef.cc;

  // Ajuste Tabela A vs B
  // Se for composição veicular (Tabela A), os custos são maiores
  if (extras.isComposition) {
    currentCCD *= 1.15; // Estimativa de ajuste para Tabela A (Implemento próprio)
    currentCC *= 1.10;
  }

  // Ajuste de Alto Desempenho (conforme normas ANTT)
  if (extras.isHighPerformance) {
    currentCCD *= 1.05; 
  }

  // Cálculo de ida: (Distância x CCD) + CC
  const valorIda = (distance * currentCCD) + currentCC;
  
  // Cálculo de retorno vazio: 0,92 x Distância x CCD (conforme imagem)
  const valorRetornoVazio = extras.returnEmpty ? (0.92 * distance * currentCCD) : 0;
  
  const total = valorIda + valorRetornoVazio + (extras.toll || 0) + (extras.other || 0);

  return {
    total,
    valorIda,
    valorRetornoVazio,
    ccd: currentCCD,
    cc: currentCC,
    tabela: extras.isComposition ? 'Tabela A - Contratação do Conjunto Completo' : 'Tabela B - Contratação Apenas do Veículo Automotor'
  };
};

export const ANTT_CARGO_TYPES = [
  { id: 'geral', label: 'Carga Geral' },
  { id: 'granel_solido', label: 'Granel Sólido' },
  { id: 'granel_liquido', label: 'Granel Líquido' },
  { id: 'frigorificada', label: 'Frigorificada ou Aquecida' },
  { id: 'conteinerizada', label: 'Conteinerizada' },
  { id: 'granel_pressurizada', label: 'Granel Pressurizada' },
  { id: 'neogranel', label: 'Neogranel' }
];
