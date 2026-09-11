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

const TKE_FAILURE_CODES = [
  // ZONA 1: OUTROS
  { code: "5708", zone: ZONES.OUTROS, name: "Atendimento para troca de peça (A)" },
  { code: "5716", zone: ZONES.OUTROS, name: "Manutenção Preventiva (A)" },
  { code: "5717", zone: ZONES.OUTROS, name: "Inspeção Anual (A)" },
  { code: "5723", zone: ZONES.OUTROS, name: "Inspeção Digital Operation Center (A)" },
  { code: "CLIENTE_DND", zone: ZONES.OUTROS, name: "Códigos Especiais do Cliente: Defeito não Detectado" },

  // ZONA 2: CASA DE MÁQUINAS (CM)
  { code: "8101", zone: ZONES.CASA_MAQUINAS, name: "Defeito no comando (relés, MCP, TMS, etc) (A)" },
  { code: "8102", zone: ZONES.CASA_MAQUINAS, name: "Defeito no acionamento (TDC, MCINV, etc) (A)" },
  { code: "8103", zone: ZONES.CASA_MAQUINAS, name: "Defeito na potência (chaves, contatoras, tiristor, IGBT, etc) (A)" },
  { code: "8104", zone: ZONES.CASA_MAQUINAS, name: "Defeito em item de proteção (fusível, relé térmico, termostato, etc) (A)" },
  { code: "8105", zone: ZONES.CASA_MAQUINAS, name: "Defeito de ajuste (parâmetros, módulos, reaperto de fiação, etc) (A)" },
  { code: "8201", zone: ZONES.CASA_MAQUINAS, name: "Defeito no motor (A)" },
  { code: "8202", zone: ZONES.CASA_MAQUINAS, name: "Defeito no acoplamento/redutor (A)" },
  { code: "8203", zone: ZONES.CASA_MAQUINAS, name: "Escova/coletor com defeito (A)" },
  { code: "8204", zone: ZONES.CASA_MAQUINAS, name: "Defeito no conjunto freio (A)" },
  { code: "8205", zone: ZONES.CASA_MAQUINAS, name: "Defeito no contato do freio (BK, CPF, shunt, etc) (A)" },
  { code: "8206", zone: ZONES.CASA_MAQUINAS, name: "Defeito no encoder/taco (A)" },
  { code: "8207", zone: ZONES.CASA_MAQUINAS, name: "Defeito na ventilação forçada (A)" },
  { code: "8208", zone: ZONES.CASA_MAQUINAS, name: "Defeito na polia de tração/desvio (A)" },
  { code: "8209", zone: ZONES.CASA_MAQUINAS, name: "Inspeção do Safety Brake (A)" },
  { code: "8301", zone: ZONES.CASA_MAQUINAS, name: "Contato elétrico do regulador com defeito (A)" },
  { code: "8302", zone: ZONES.CASA_MAQUINAS, name: "Defeito mecânico no regulador (A)" },
  { code: "8401", zone: ZONES.CASA_MAQUINAS, name: "Falta de energia no quadro de distribuição (A)" },
  { code: "8402", zone: ZONES.CASA_MAQUINAS, name: "Falha no quadro de força CM (fusível, disjuntor, fiação, etc) (A)" },
  { code: "8403", zone: ZONES.CASA_MAQUINAS, name: "Aterramento deficiente (A)" },
  { code: "8404", zone: ZONES.CASA_MAQUINAS, name: "Defeito no auto trafo (A)" },
  { code: "8901", zone: ZONES.CASA_MAQUINAS, name: "Defeito no Digivox (A)" },
  { code: "8902", zone: ZONES.CASA_MAQUINAS, name: "Defeito no comando em grupo (A)" },
  { code: "8903", zone: ZONES.CASA_MAQUINAS, name: "Defeito no no-break (A)" },
  { code: "8904", zone: ZONES.CASA_MAQUINAS, name: "Defeito na chamada por código (TK 49, ST 49, Konepass, etc) (A)" },
  { code: "8905", zone: ZONES.CASA_MAQUINAS, name: "Defeito no sistema de acoplamento ao gerador (A)" },
  { code: "8906", zone: ZONES.CASA_MAQUINAS, name: "Defeito no painel de tráfego (ST 16, Survision, TKvision, etc) (A)" },
  { code: "8907", zone: ZONES.CASA_MAQUINAS, name: "Terminal de cadastro do biotraking com defeito (A)" },
  { code: "81001", zone: ZONES.CASA_MAQUINAS, name: "Defeito no bloco de válvulas (A)" },
  { code: "81002", zone: ZONES.CASA_MAQUINAS, name: "Pressostato com defeito (A)" },
  { code: "81003", zone: ZONES.CASA_MAQUINAS, name: "Termostato com defeito (A)" },
  { code: "81004", zone: ZONES.CASA_MAQUINAS, name: "Motor da bomba de óleo com defeito (A)" },
  { code: "81005", zone: ZONES.CASA_MAQUINAS, name: "Ajuste do bloco de válvulas (A)" },
  { code: "81006", zone: ZONES.CASA_MAQUINAS, name: "Defeito no pistão hidráulico (A)" },
  { code: "81007", zone: ZONES.CASA_MAQUINAS, name: "Trocador de calor (A)" },

  // ZONA 3: CABINA
  { code: "8908", zone: ZONES.CABINA, name: "Defeito no ar-condicionado (A)" },
  { code: "8303", zone: ZONES.CABINA, name: "Defeito mecânico no aparelho de segurança (A)" },
  { code: "8304", zone: ZONES.CABINA, name: "Defeito elétrico no aparelho de segurança (A)" },
  { code: "8305", zone: ZONES.CABINA, name: "Aparelho de segurança acionado (A)" },
  { code: "8601", zone: ZONES.CABINA, name: "Botoeira com defeito (A)" },
  { code: "8602", zone: ZONES.CABINA, name: "Indicador de posição da cabina com defeito (A)" },
  { code: "8603", zone: ZONES.CABINA, name: "Alta-voz/intercomunicador de cabina com defeito (A)" },
  { code: "8604", zone: ZONES.CABINA, name: "Comandos da cabina com defeito (botão AP, FP, lotado, etc) (A)" },
  { code: "8605", zone: ZONES.CABINA, name: "Defeito no pesador de carga (A)" },
  { code: "8606", zone: ZONES.CABINA, name: "Contato da porta de emergência falhando ou desoperado (A)" },
  { code: "8607", zone: ZONES.CABINA, name: "Subteto quebrado ou faltando peças (A)" },
  { code: "8608", zone: ZONES.CABINA, name: "Painel de cabina com defeito ou ruído (A)" },
  { code: "8609", zone: ZONES.CABINA, name: "Soleira de cabina danificada (A)" },
  { code: "8610", zone: ZONES.CABINA, name: "Relógio digital com defeito (A)" },
  { code: "8611", zone: ZONES.CABINA, name: "Jornal eletrônico com defeito (A)" },
  { code: "8612", zone: ZONES.CABINA, name: "Defeito na iluminação de cabina (A)" },
  { code: "8613", zone: ZONES.CABINA, name: "Defeito no ventilador (A)" },
  { code: "8614", zone: ZONES.CABINA, name: "Luz de emergência com defeito (A)" },
  { code: "8615", zone: ZONES.CABINA, name: "Defeito em segurança de porta de cabina (régua segur., fotocélula) (A)" },
  { code: "8616", zone: ZONES.CABINA, name: "Defeito em módulos controladores (MCC, IB-1, etc) (A)" },
  { code: "8617", zone: ZONES.CABINA, name: "Terminal de chamadas Biotracking com defeito (A)" },
  { code: "8701", zone: ZONES.CABINA, name: "Defeito na mecânica da porta de cabina (A)" },
  { code: "8702", zone: ZONES.CABINA, name: "Defeito elétrico no operador (contatos, COP, inversor, etc) (A)" },
  { code: "8703", zone: ZONES.CABINA, name: "Defeito mecânico no operador (A)" },
  { code: "8704", zone: ZONES.CABINA, name: "Defeito em fiação na cabina (A)" },
  { code: "8705", zone: ZONES.CABINA, name: "Defeito em corrediça de cabina (A)" },
  { code: "8706", zone: ZONES.CABINA, name: "Defeito em corrediça de contra-peso (A)" },
  { code: "8707", zone: ZONES.CABINA, name: "Sensores de sinalização com defeito (chave indução/eletr., ampola) (A)" },

  // ZONA 4: PAVIMENTO / CAIXA DE CORRIDA
  { code: "8501", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito mecânico em porta (A)" },
  { code: "8502", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em fecho hidráulico (A)" },
  { code: "8503", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em fecho eletromecânico de porta (A)" },
  { code: "8504", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em fiação no pavimento (A)" },
  { code: "8505", zone: ZONES.PAVIMENTO_CAIXA, name: "Botão da botoeira com defeito (A)" },
  { code: "8506", zone: ZONES.PAVIMENTO_CAIXA, name: "Auto-ilumina do pavimento com defeito (A)" },
  { code: "8507", zone: ZONES.PAVIMENTO_CAIXA, name: "Chave de pavimento/cartão magnético da chamada código com defeito (A)" },
  { code: "8508", zone: ZONES.PAVIMENTO_CAIXA, name: "Indicador de posição com defeito (A)" },
  { code: "8509", zone: ZONES.PAVIMENTO_CAIXA, name: "Terminal de chamadas ADC XXI com defeito (A)" },
  { code: "8510", zone: ZONES.PAVIMENTO_CAIXA, name: "Chave BOMB acionada ou com defeito (A)" },
  { code: "8511", zone: ZONES.PAVIMENTO_CAIXA, name: "Uso indevido da chave de emergência por terceiros (A)" },
  { code: "8801", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em fixação ou emenda de guias (A)" },
  { code: "8802", zone: ZONES.PAVIMENTO_CAIXA, name: "Falta de lubrificação/limpeza nas guias (A)" },
  { code: "8803", zone: ZONES.PAVIMENTO_CAIXA, name: "Aparachoque com defeito (mola, amortecedor hidráulico, borracha) (A)" },
  { code: "8804", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito mecânico na polia tensora (A)" },
  { code: "8805", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito no contato elétrico da polia tensora (A)" },
  { code: "8806", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em limite de redução (A)" },
  { code: "8807", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em limite de parada (A)" },
  { code: "8808", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em limite final (A)" },
  { code: "8809", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em receptores e placas (A)" },
  { code: "8810", zone: ZONES.PAVIMENTO_CAIXA, name: "Cabo/fita de aço do seletor com problema (A)" },
  { code: "8811", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito na fiação de poço (A)" },
  { code: "8812", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito na chave no fundo do poço (A)" },
  { code: "8813", zone: ZONES.PAVIMENTO_CAIXA, name: "Componente ou fiação da rede serial com defeito (A)" },
  { code: "8814", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em corrente e/ou cabo de compensação (A)" },
  { code: "8815", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito no cabo de manobra (A)" },
  { code: "8816", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito mecânico na polia de compensação (A)" },
  { code: "8817", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito elétrico na polia de compensação (A)" },
  { code: "8818", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito em cabo de tração (A)" },
  { code: "8819", zone: ZONES.PAVIMENTO_CAIXA, name: "Defeito no contato elétrico da porta de inspeção (A)" },
  { code: "8820", zone: ZONES.PAVIMENTO_CAIXA, name: "Equalização de cabos de tração (A)" }
];

/**
 * Normaliza o nome da zona física informada para uma das 4 zonas oficiais
 */
function normalizeZoneName(zoneStr) {
  if (!zoneStr) return null;
  const s = String(zoneStr).trim().toLowerCase();
  if (s === "outros" || s === "outro") return ZONES.OUTROS;
  if (s.includes("casa") || s.includes("máquina") || s.includes("maquina") || s === "cm") return ZONES.CASA_MAQUINAS;
  if (s.includes("cabina")) return ZONES.CABINA;
  if (s.includes("pavimento") || s.includes("caixa") || s.includes("poço") || s.includes("poco")) return ZONES.PAVIMENTO_CAIXA;
  return null;
}

/**
 * Identifica código de falha oficial TKE no texto
 */
function findFailureCodeByText(text = "") {
  if (!text) return null;
  const clean = String(text).trim();

  // 1. Busca por código numérico exato no texto (ex: 8101, 8501, 8615, 8804, 5716)
  for (const item of TKE_FAILURE_CODES) {
    const regex = new RegExp(`\\b${item.code}\\b`, "i");
    if (regex.test(clean)) {
      return item;
    }
  }

  // 2. Busca por correspondência no nome oficial do defeito
  const lower = clean.toLowerCase();
  for (const item of TKE_FAILURE_CODES) {
    const cleanName = item.name.replace(/\(A\)/g, "").trim().toLowerCase();
    if (cleanName.length > 8 && lower.includes(cleanName)) {
      return item;
    }
  }

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

  // Verificar se há código oficial TKE direto no texto
  const codeMatch = findFailureCodeByText(combined);
  if (codeMatch) return codeMatch.zone;

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
 * Classificador Estruturado Completo (Atende ao Prompt 5 Oficial)
 */
function classifyFailure(description, secondaryText = "") {
  const combined = `${description || ""} ${secondaryText || ""}`.trim();
  const codeInfo = findFailureCodeByText(combined);
  const zone = codeInfo ? codeInfo.zone : classifyZone(description, secondaryText);

  return {
    zonaIdentificada: zone,
    codigo: codeInfo ? codeInfo.code : "N/D",
    classificacaoOficial: codeInfo ? codeInfo.name : `Atendimento em ${zone}`,
    justificativaTecnica: `Sintoma e termos técnicos correlacionados à zona estrutural [${zone}].`
  };
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
      const normTech = typeof normalizeTechName === "function" ? normalizeTechName(r.tecnico) : r.tecnico;
      if (normTech) tecnicosEnvolvidos.add(normTech);
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
    const rawTech = rec.tecnico || "Não Informado";
    const tech = typeof normalizeTechName === "function" ? (normalizeTechName(rawTech) || rawTech) : rawTech;
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
