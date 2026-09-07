/**
 * Projeto TKE - Motor de Classificação Técnica e Confiabilidade
 * Implementa as regras de zoneamento físico, cálculo de reincidência (<30 dias) e matriz T&D.
 */

const ZONES = {
  OUTROS: "Outros",
  CASA_MAQUINAS: "Casa de Máquinas",
  CABINA: "Cabina",
  PAVIMENTO_CAIXA: "Pavimento / Caixa de corrida"
};

const ZONE_KEYWORDS = {
  [ZONES.OUTROS]: [
    "outros", "outro", "vistoria", "inspeção", "vandalismo", "falta de energia", "energia externa",
    "rede elétrica", "concessionária", "chuva", "infiltração externa", "limpeza externa",
    "uso indevido", "mau uso", "orientação ao cliente", "resgate de passageiro", "acompanhamento",
    "sem defeito constatado", "sem defeito", "teste de rotina", "consultoria", "auditoria"
  ],
  [ZONES.CASA_MAQUINAS]: [
    "quadro de comando", "contator", "contatores", "inversor", "vvf", "motor de tração",
    "freio eletromecânico", "freio", "cabos de tração", "limitador de velocidade", "guias",
    "corrediças", "máquina de tração", "placa principal", "transformador", "resistor", "disjuntor",
    "casa de máquinas", "casa de maquinas", "polia de tração", "chave geral", "bateria de resgate",
    "no-break", "resgate automático", "comando"
  ],
  [ZONES.CABINA]: [
    "operador de porta", "operador de cabina", "porta de cabina", "barreira eletrônica",
    "infravermelho", "barreira", "régua de segurança", "fita de segurança", "botoeira de cabina",
    "iluminação", "ventilador", "pesador de carga", "display", "indicador", "patim de arraste",
    "patim", "soleira de cabina", "soleira cabina", "espelho", "subteto", "painel de cabina",
    "alarme de cabina", "interfone"
  ],
  [ZONES.PAVIMENTO_CAIXA]: [
    "trinco", "contato elétrico de trinco", "contato de trinco", "porta de pavimento", "portas de pavimento",
    "mola de fechamento", "mola", "botoeira de chamada", "botoeira de andar", "sinalizador",
    "soleira", "soleira de pavimento", "fechador", "sensor de limite", "fim de curso", "fiação de poço",
    "cabo de manobra", "chave de stop", "stop de emergência", "amortecedor", "mola de poço", "polia tensora",
    "fundo do poço", "poço", "umidade no poço", "água no poço", "caixa de corrida", "caixa", "fita de poço",
    "sensor de parada", "sensor indutivo", "trilho", "guias de contrapeso", "contrapeso", "cabo de compensação"
  ]
};

const TRAINING_MODULES = {
  [ZONES.OUTROS]: {
    preventiva: [
      "Protocolos de vistoria técnica preditiva e checklist operacional",
      "Auditoria de instalações prediais, alimentação elétrica e aterramento",
      "Treinamento de atendimento consultivo e orientação ao cliente"
    ],
    corretiva: [
      "Procedimentos de resgate seguro de passageiros retidos e emergências",
      "Análise de causa raiz para falhas de suprimento elétrico e transientes",
      "Mitigação de falhas decorrentes de intempéries e vandalismo"
    ]
  },
  [ZONES.CASA_MAQUINAS]: {
    preventiva: [
      "Testes operacionais de folga e espessura de lonas de freio eletromecânico",
      "Técnicas de lubrificação correta de guias e cabos de tração",
      "Inspeção termográfica e limpeza preditiva de quadros de comando"
    ],
    corretiva: [
      "Diagnóstico e parametrização avançada de inversores de frequência (VVF)",
      "Revisão e substituição de conjuntos de contatores de alta potência",
      "Aferição e desarme de limitador de velocidade e máquina de tração"
    ]
  },
  [ZONES.CABINA]: {
    preventiva: [
      "Calibração preventiva de barreira eletrônica e sensores óticos",
      "Alinhamento de suspensão e tensão periódica de correias de porta",
      "Limpeza preditiva e conservação de patins de arraste"
    ],
    corretiva: [
      "Ajuste cinemático avançado de operador de portas de cabina",
      "Diagnóstico de falhas intermitentes em réguas/fitas de segurança",
      "Substituição e calibração micrométrica de contato de porta de cabina"
    ]
  },
  [ZONES.PAVIMENTO_CAIXA]: {
    preventiva: [
      "Manutenção e ajuste de carga em molas espirais e fechadores mecânicos",
      "Inspeção e desobstrução de canais de soleira e guias na caixa de corrida",
      "Verificação de folga operacional de trincos e amortecedores de poço"
    ],
    corretiva: [
      "Mecânica de precisão e regulagem de trincos de pavimento e chaves de limite",
      "Alinhamento micrométrico de contatos de segurança de trinco e portas de andar",
      "Alinhamento e calibração de polia tensora do limitador e cabos de manobra"
    ]
  }
};

/**
 * Normaliza o nome da zona física informada para uma das 4 zonas oficiais
 */
function normalizeZoneName(zoneStr) {
  if (!zoneStr) return null;
  const s = String(zoneStr).trim().toLowerCase();
  if (s === "outros" || s === "outro") return ZONES.OUTROS;
  if (s.includes("casa") || s.includes("máquina") || s.includes("maquina")) return ZONES.CASA_MAQUINAS;
  if (s.includes("cabina")) return ZONES.CABINA;
  if (s.includes("pavimento") || s.includes("caixa") || s.includes("poço") || s.includes("poco")) return ZONES.PAVIMENTO_CAIXA;
  return null;
}

/**
 * Classifica a descrição da OS e/ou solicitação na Zona Física correspondente
 */
function classifyZone(description, secondaryText = "") {
  const normDirect = normalizeZoneName(description) || normalizeZoneName(secondaryText);
  if (normDirect) return normDirect;

  const combined = `${description || ""} ${secondaryText || ""}`.trim();
  if (!combined) return ZONES.CABINA;
  const lower = combined.toLowerCase();

  for (const [zone, keywords] of Object.entries(ZONE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return zone;
      }
    }
  }

  // Heurística de fallback
  if (lower.includes("porta") || lower.includes("botão") || lower.includes("luz") || lower.includes("display") || lower.includes("cabina")) return ZONES.CABINA;
  if (lower.includes("andar") || lower.includes("pavimento") || lower.includes("trinco") || lower.includes("poço") || lower.includes("poco") || lower.includes("limite") || lower.includes("tensora") || lower.includes("caixa")) return ZONES.PAVIMENTO_CAIXA;
  if (lower.includes("comando") || lower.includes("motor") || lower.includes("inversor") || lower.includes("freio") || lower.includes("casa")) return ZONES.CASA_MAQUINAS;
  if (lower.includes("energia") || lower.includes("vistoria") || lower.includes("vandalismo") || lower.includes("resgate") || lower.includes("chuva")) return ZONES.OUTROS;

  return ZONES.CABINA;
}

/**
 * Calcula a diferença em dias entre duas datas ISO (YYYY-MM-DD)
 */
function getDaysDifference(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Analisa todo o dataset e detecta Reincidências Críticas (<30 dias)
 */
function analyzeEquipmentRecurrence(records) {
  // Agrupar por Cliente + Equipamento
  const groups = {};

  records.forEach(rec => {
    const key = `${rec.cliente}___${rec.equipamento}`;
    if (!groups[key]) {
      groups[key] = {
        cliente: rec.cliente,
        equipamento: rec.equipamento,
        records: []
      };
    }
    groups[key].records.push(rec);
  });

  const recurrenceList = [];

  for (const key in groups) {
    const item = groups[key];
    // Ordenar chamados por data crescente
    item.records.sort((a, b) => new Date(a.data) - new Date(b.data));

    const totalChamados = item.records.length;
    let isCritical = false;
    let minInterval = Infinity;
    let criticalWindowInterval = 0;
    let tecnicosEnvolvidos = new Set();
    let zonasAfetadas = new Set();

    item.records.forEach(r => {
      tecnicosEnvolvidos.add(r.tecnico);
      zonasAfetadas.add(r.zona || classifyZone(r.descricao, r.solicitacao));
    });

    if (totalChamados >= 2) {
      // Verificar janelas consecutivas e janela total
      for (let i = 0; i < totalChamados - 1; i++) {
        for (let j = i + 1; j < totalChamados; j++) {
          const diff = getDaysDifference(item.records[i].data, item.records[j].data);
          if (diff < minInterval) minInterval = diff;
          if (diff < 30) {
            isCritical = true;
          }
        }
      }

      // Intervalo entre o primeiro e o último chamado da janela
      const firstDate = item.records[0].data;
      const lastDate = item.records[totalChamados - 1].data;
      criticalWindowInterval = getDaysDifference(firstDate, lastDate);

      // Critério estrito da regra: 2 ou mais atendimentos em período inferior a 30 dias corridos
      if (criticalWindowInterval < 30 || isCritical) {
        recurrenceList.push({
          cliente: item.cliente,
          equipamento: item.equipamento,
          contrato: item.records[0]?.contrato || "Premium",
          tecnicos: Array.from(tecnicosEnvolvidos),
          tecnicoPrincipal: Array.from(tecnicosEnvolvidos).join(", "),
          totalChamados: totalChamados,
          intervaloDias: criticalWindowInterval,
          menorIntervalo: minInterval,
          primeiroChamado: firstDate,
          ultimoChamado: lastDate,
          zonas: Array.from(zonasAfetadas),
          isCritical: true,
          statusBadge: "CRÍTICO - REINCIDENTE",
          historico: item.records
        });
      }
    }
  }

  // Ordenar pelos mais críticos (maior número de chamados e menor intervalo)
  recurrenceList.sort((a, b) => b.totalChamados - a.totalChamados || a.intervaloDias - b.intervaloDias);

  return recurrenceList;
}

/**
 * Analisa o Desempenho Individual por Técnico
 */
function analyzeTechniciansPerformance(records) {
  const techMap = {};

  records.forEach(rec => {
    const tech = rec.tecnico || "Não Informado";
    const zone = rec.zona || classifyZone(rec.descricao);

    if (!techMap[tech]) {
      techMap[tech] = {
        nome: tech,
        totalChamados: 0,
        clientes: new Set(),
        equipamentos: new Set(),
        zonas: {
          [ZONES.OUTROS]: 0,
          [ZONES.CASA_MAQUINAS]: 0,
          [ZONES.CABINA]: 0,
          [ZONES.PAVIMENTO_CAIXA]: 0
        },
        chamados: []
      };
    }

    techMap[tech].totalChamados++;
    techMap[tech].clientes.add(rec.cliente);
    techMap[tech].equipamentos.add(`${rec.cliente} - ${rec.equipamento}`);
    techMap[tech].zonas[zone] = (techMap[tech].zonas[zone] || 0) + 1;
    techMap[tech].chamados.push(rec);
  });

  const result = [];
  for (const tech in techMap) {
    const data = techMap[tech];
    result.push({
      nome: data.nome,
      totalChamados: data.totalChamados,
      clientes: Array.from(data.clientes),
      totalClientes: data.clientes.size,
      totalEquipamentos: data.equipamentos.size,
      zonas: data.zonas,
      chamados: data.chamados
    });
  }

  result.sort((a, b) => b.totalChamados - a.totalChamados);
  return result;
}

/**
 * Gera a Matriz de Treinamentos e Desenvolvimento (T&D) baseada nas falhas reincidentes (2+ vezes)
 */
function generateTrainingMatrix(techniciansPerformance, recurrenceList) {
  const matrix = [];

  techniciansPerformance.forEach(tech => {
    const zoneReincidencias = [];

    // Avaliar zonas com 2 ou mais ocorrências
    for (const [zone, count] of Object.entries(tech.zonas)) {
      if (count >= 2) {
        zoneReincidencias.push({
          zona: zone,
          ocorrencias: count,
          treinamentos: TRAINING_MODULES[zone] || { preventiva: [], corretiva: [] }
        });
      }
    }

    // Equipamentos reincidentes sob responsabilidade do técnico
    const equipamentosReincidentes = recurrenceList.filter(rec => rec.tecnicos.includes(tech.nome));

    matrix.push({
      tecnico: tech.nome,
      totalChamados: tech.totalChamados,
      temReincidencia: zoneReincidencias.length > 0 || equipamentosReincidentes.length > 0,
      zoneReincidencias: zoneReincidencias,
      equipamentosReincidentes: equipamentosReincidentes
    });
  });

  return matrix;
}
