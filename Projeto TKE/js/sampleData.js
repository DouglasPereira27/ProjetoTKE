/**
 * Projeto TKE - Base de Dados Inicial de Confiabilidade e Manutenção
 * Equipe Operacional:
 * - Setor 1: Lucas Rodrigues Baccega
 * - Setor 2: Elton Gomes
 * - Setor 3: Willian Wallace da Silva
 * - Setor 4: Allison Oliveira Carvalho
 * - Setor 5: Douglas Geraldin Bispo
 * - Setor 6: Jose Gomes de Miranda
 * - Setor 7: Alisson Terencio Santos
 * - Setor 8: Gilmario Manoel Alves
 * - Volantes / Corretivos: Anderson Lemos, Tiago Alves, Alexandre Morais
 * - Filiais de Atuação: Todos os colaboradores atuam nas Filiais 5003 e 5070 | Região: Zona 2 - Norte
 */

const CLIENT_CONTRACT_MAP = {
  "Edifício Sky Tower": "Premium",
  "Edifício Infinity Tower": "Premium",
  "Condomínio Solar das Palmeiras": "Plus",
  "Condomínio Corporate Prime": "Plus",
  "Shopping Plaza TKE": "Service",
  "Centro Empresarial Horizon": "Express",
  "Hospital Metropolitano": "Digital"
};

const TECH_MATRICULA_MAP = {
  // Nomes Completos Oficiais (Setores 1 a 8 e Volantes/Corretivos)
  "Lucas Rodrigues Baccega": "10101",
  "Elton Gomes": "10102",
  "Willian Wallace da Silva": "10103",
  "Allison Oliveira Carvalho": "10104",
  "Douglas Geraldin Bispo": "10205",
  "Jose Gomes de Miranda": "10206",
  "Alisson Terencio Santos": "10207",
  "Gilmario Manoel Alves": "10208",
  "Anderson Lemos": "10309",
  "Tiago Alves": "10310",
  "Alexandre Morais": "10311",
  // Aliases para compatibilidade reversa
  "Lucas Rodrigues": "10101",
  "Willian Wallace": "10103",
  "Allison Oliveira": "10104",
  "Douglas Bispo": "10205",
  "Jose Gomes": "10206",
  "Alisson Terencio": "10207",
  "Gilmario Manoel": "10208"
};

/**
 * Normaliza o nome do técnico para evitar repetições (maiúsculas/minúsculas, apelidos ou nomes do meio)
 */
function normalizeTechName(rawName) {
  if (!rawName) return "";
  let name = String(rawName).trim();
  if (!name || name.toUpperCase() === "INDEFINIDO" || name.toUpperCase() === "NULL" || name.toUpperCase() === "UNDEFINED") {
    return "";
  }

  // Remove anotações entre parênteses (ex: "Lucas Rodrigues (10101)")
  if (name.includes("(")) {
    name = name.split("(")[0].trim();
  }

  // Normalizar acentuação para busca uniforme
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  // 1. Lucas Rodrigues Baccega
  if (clean.includes("LUCAS") && (clean.includes("RODRIGUES") || clean.includes("BACCEGA"))) {
    return "Lucas Rodrigues Baccega";
  }

  // 2. Elton Gomes
  if (clean.includes("ELTON") && clean.includes("GOMES")) {
    return "Elton Gomes";
  }

  // 3. Willian Wallace da Silva
  if ((clean.includes("WILLIAN") || clean.includes("WILLIAM")) && (clean.includes("WALLACE") || clean.includes("SILVA"))) {
    return "Willian Wallace da Silva";
  }

  // 4. Allison Oliveira Carvalho
  if ((clean.includes("ALLISON") || clean.includes("ALISON") || clean.includes("ALISSON")) && (clean.includes("OLIVEIRA") || clean.includes("CARVALHO"))) {
    return "Allison Oliveira Carvalho";
  }

  // 5. Douglas Geraldin Bispo
  if (clean.includes("DOUGLAS") && (clean.includes("BISPO") || clean.includes("GERALDIN"))) {
    return "Douglas Geraldin Bispo";
  }

  // 6. Jose Gomes de Miranda
  if (clean.includes("JOSE") && (clean.includes("GOMES") || clean.includes("MIRANDA"))) {
    return "Jose Gomes de Miranda";
  }

  // 7. Alisson Terencio Santos
  if ((clean.includes("ALISSON") || clean.includes("ALISON") || clean.includes("ALLISON")) && (clean.includes("TERENCIO") || clean.includes("SANTOS"))) {
    return "Alisson Terencio Santos";
  }

  // 8. Gilmario Manoel Alves
  if ((clean.includes("GILMARIO") || clean.includes("GILMAR")) && (clean.includes("MANOEL") || clean.includes("ALVES"))) {
    return "Gilmario Manoel Alves";
  }

  // 9. Anderson Lemos (Ex: ANDERSON DE CASTRO LEMOS -> Anderson Lemos)
  if (clean.includes("ANDERSON") && (clean.includes("LEMOS") || clean.includes("CASTRO"))) {
    return "Anderson Lemos";
  }

  // 10. Tiago Alves (Ex: TIAGO ALVES, THIAGO ALVES -> Tiago Alves)
  if ((clean.includes("TIAGO") || clean.includes("THIAGO")) && clean.includes("ALVES")) {
    return "Tiago Alves";
  }

  // 11. Alexandre Morais (Ex: ALEXANDRE SOARES DE MORAIS -> Alexandre Morais)
  if (clean.includes("ALEXANDRE") && (clean.includes("MORAIS") || clean.includes("MORAES") || clean.includes("SOARES"))) {
    return "Alexandre Morais";
  }

  // Formatação Title Case para outros técnicos
  const preps = ["de", "da", "do", "das", "dos", "e"];
  return name.toLowerCase().split(/\s+/).map((word, idx) => {
    if (idx > 0 && preps.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

function getTechMatricula(techName) {
  const norm = normalizeTechName(techName);
  if (!norm) return "10000";
  return TECH_MATRICULA_MAP[norm] || TECH_MATRICULA_MAP[techName] || "10" + Math.abs(norm.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 900 + 100);
}

const SAMPLE_MAINTENANCE_DATA = [
  // ==========================================
  // FILIAL 5003 • ZONA 2 - NORTE (SETORES 1 A 4)
  // ==========================================

  // Setor 1 - Lucas Rodrigues Baccega - Reincidência Crítica no Elevador ELEV-01 (Sky Tower) em Cabina (<30 dias: 12/08 a 28/08 = 16 dias)
  {
    id: "OS-2026-101",
    data: "2026-08-12",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 1",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Lucas Rodrigues Baccega",
    matricula: "10101",
    codigoFalha: "8703",
    descricaoFalha: "Defeito mecânico no operador (A)",
    zona: "Cabina",
    solicitacao: "Porta de cabina travando na reabertura e passageiros retidos temporariamente.",
    descricao: "Ajustado operador de porta de cabina e regulagem de tensão da correia de arraste (Código 8703).",
    status: "Concluído"
  },
  {
    id: "OS-2026-105",
    data: "2026-08-28",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 1",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Lucas Rodrigues Baccega",
    matricula: "10101",
    codigoFalha: "8615",
    descricaoFalha: "Defeito em segurança de porta de cabina (régua segur., fotocélula) (A)",
    zona: "Cabina",
    solicitacao: "Porta revertendo continuamente sem presença de passageiros no vão.",
    descricao: "Barreira eletrônica (infravermelho) da cabina intermitente; alinhados e limpos os sensores óticos (Código 8615).",
    status: "Concluído"
  },
  {
    id: "OS-2026-114",
    data: "2026-09-02",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 1",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Lucas Rodrigues Baccega",
    matricula: "10101",
    codigoFalha: "8612",
    descricaoFalha: "Defeito na iluminação de cabina (A)",
    zona: "Cabina",
    solicitacao: "Display de cabina apagado e ruído metálico ao abrir as portas.",
    descricao: "Substituição do fusível de proteção do display e lubrificação com ajuste do patim de arraste (Código 8612).",
    status: "Pendente"
  },

  // Setor 2 - Elton Gomes - Chamados no Centro Empresarial Horizon
  {
    id: "OS-2026-102",
    data: "2026-08-15",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 2",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre A)",
    contrato: "Express",
    tecnico: "Elton Gomes",
    matricula: "10102",
    codigoFalha: "8503",
    descricaoFalha: "Defeito em fecho eletromecânico de porta (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Elevador não parte do 4º pavimento e acusa porta aberta.",
    descricao: "Trinco e contato elétrico de trinco do 4º pavimento com folga mecânica ajustados e reapertados (Código 8503).",
    status: "Concluído"
  },
  {
    id: "OS-2026-120",
    data: "2026-08-30",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 2",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre A)",
    contrato: "Express",
    tecnico: "Elton Gomes",
    matricula: "10102",
    codigoFalha: "8501",
    descricaoFalha: "Defeito mecânico em porta (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Ruído metálico intenso e lentidão no fechamento das portas.",
    descricao: "Porta de pavimento com ruído nas corrediças regulada e desobstrução com limpeza dos canais de soleira (Código 8501).",
    status: "Concluído"
  },

  // Setor 3 - Willian Wallace da Silva - Reincidência Crítica no Condomínio Solar das Palmeiras (Pavimento) (<30 dias: 05/08 a 22/08 = 17 dias)
  {
    id: "OS-2026-103",
    data: "2026-08-05",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 3",
    cliente: "Condomínio Solar das Palmeiras",
    equipamento: "ELEV-02 (Torre Norte)",
    contrato: "Plus",
    tecnico: "Willian Wallace da Silva",
    matricula: "10103",
    codigoFalha: "8502",
    descricaoFalha: "Defeito em fecho hidráulico (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Porta de pavimento do 8º andar sem fechamento automático.",
    descricao: "Porta de pavimento do 8º andar sem fechamento por perda de pressão da mola de fechamento; regulada carga da mola (Código 8502).",
    status: "Concluído"
  },
  {
    id: "OS-2026-108",
    data: "2026-08-22",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 3",
    cliente: "Condomínio Solar das Palmeiras",
    equipamento: "ELEV-02 (Torre Norte)",
    contrato: "Plus",
    tecnico: "Willian Wallace da Silva",
    matricula: "10103",
    codigoFalha: "8503",
    descricaoFalha: "Defeito em fecho eletromecânico de porta (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Elevador inoperante no 8º pavimento com falha no circuito de segurança.",
    descricao: "Contato elétrico de trinco do 8º pavimento queimado por centelhamento; executado alinhamento micrométrico (Código 8503).",
    status: "Concluído"
  },
  {
    id: "OS-2026-118",
    data: "2026-09-01",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 3",
    cliente: "Condomínio Solar das Palmeiras",
    equipamento: "ELEV-02 (Torre Norte)",
    contrato: "Plus",
    tecnico: "Willian Wallace da Silva",
    matricula: "10103",
    codigoFalha: "8505",
    descricaoFalha: "Botão da botoeira com defeito (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Botoeira de chamada do térreo travada e soleira acumulando sujeira.",
    descricao: "Botoeira de chamada de andar do térreo reparada e soleira de pavimento limpa com desobstrução de guias (Código 8505).",
    status: "Concluído"
  },

  // Setor 4 - Allison Oliveira Carvalho - Chamado em Casa de Máquinas no Shopping Plaza TKE
  {
    id: "OS-2026-106",
    data: "2026-08-18",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 4",
    cliente: "Shopping Plaza TKE",
    equipamento: "ELEV-06 (Serviço)",
    contrato: "Service",
    tecnico: "Allison Oliveira Carvalho",
    matricula: "10104",
    codigoFalha: "8102",
    descricaoFalha: "Defeito no acionamento (TDC, MCINV, etc) (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Elevador com trancos fortes e erro de aceleração no painel.",
    descricao: "Quadro de comando acusando falha de inversor VVF; reajustados parâmetros de rampa de torque e aceleração (Código 8102).",
    status: "Concluído"
  },
  {
    id: "OS-2026-121",
    data: "2026-08-29",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 4",
    cliente: "Shopping Plaza TKE",
    equipamento: "ELEV-06 (Serviço)",
    contrato: "Service",
    tecnico: "Allison Oliveira Carvalho",
    matricula: "10104",
    codigoFalha: "8103",
    descricaoFalha: "Defeito na potência (chaves, contatoras, tiristor, IGBT, etc) (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Ruído de centelhamento elétrico na casa de máquinas.",
    descricao: "Contator de segurança do quadro de comando com desgaste mecânico nos terminais; desmontado e revisado (Código 8103).",
    status: "Concluído"
  },

  // ==========================================
  // FILIAL 5070 • ZONA 2 - NORTE (SETORES 5 A 8)
  // ==========================================

  // Setor 5 - Douglas Geraldin Bispo - Reincidência Crítica no Hospital Metropolitano (Poço) (<30 dias: 10/08 a 29/08 = 19 dias)
  {
    id: "OS-2026-104",
    data: "2026-08-10",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 5",
    cliente: "Hospital Metropolitano",
    equipamento: "ELEV-04 (Leito 1)",
    contrato: "Digital",
    tecnico: "Douglas Geraldin Bispo",
    matricula: "10205",
    codigoFalha: "8806",
    descricaoFalha: "Defeito em limite de redução (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Elevador desceu abaixo do subsolo e parou em emergência.",
    descricao: "Sensor de limite e chave de fim de curso inferior no poço descalibrada; recalibrado e testado corte de segurança (Código 8806).",
    status: "Concluído"
  },
  {
    id: "OS-2026-109",
    data: "2026-08-29",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 5",
    cliente: "Hospital Metropolitano",
    equipamento: "ELEV-04 (Leito 1)",
    contrato: "Digital",
    tecnico: "Douglas Geraldin Bispo",
    matricula: "10205",
    codigoFalha: "8804",
    descricaoFalha: "Defeito mecânico na polia tensora (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Vibração excessiva e ruído no fundo do poço durante a viagem.",
    descricao: "Polia tensora do limitador de velocidade no poço desalinhada com ruído excessivo; alinhamento e lubrificação de mancais (Código 8804).",
    status: "Concluído"
  },
  {
    id: "OS-2026-116",
    data: "2026-09-02",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 5",
    cliente: "Hospital Metropolitano",
    equipamento: "ELEV-04 (Leito 1)",
    contrato: "Digital",
    tecnico: "Douglas Geraldin Bispo",
    matricula: "10205",
    codigoFalha: "8812",
    descricaoFalha: "Defeito na chave no fundo do poço (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Verificação de segurança e inspeção após umidade no subsolo.",
    descricao: "Verificação de acúmulo de umidade no poço e teste da chave de stop de emergência do fundo do poço (Código 8812).",
    status: "Concluído"
  },

  // Setor 6 - Jose Gomes de Miranda - Chamados em Casa de Máquinas no Condomínio Corporate Prime
  {
    id: "OS-2026-112",
    data: "2026-08-25",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 6",
    cliente: "Condomínio Corporate Prime",
    equipamento: "ELEV-05 (Social)",
    contrato: "Plus",
    tecnico: "Jose Gomes de Miranda",
    matricula: "10206",
    codigoFalha: "8103",
    descricaoFalha: "Defeito na potência (chaves, contatoras, tiristor, IGBT, etc) (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Elevador desarmando disjuntor principal ao partir.",
    descricao: "Contator de linha do quadro de comando com centelhamento nas pontas de contato; substituído conjunto de contatos (Código 8103).",
    status: "Concluído"
  },
  {
    id: "OS-2026-122",
    data: "2026-09-01",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 6",
    cliente: "Condomínio Corporate Prime",
    equipamento: "ELEV-05 (Social)",
    contrato: "Plus",
    tecnico: "Jose Gomes de Miranda",
    matricula: "10206",
    codigoFalha: "8101",
    descricaoFalha: "Defeito no comando (relés, MCP, TMS, etc) (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Falhas intermitentes de chamada e comunicação de comando.",
    descricao: "Revisão e limpeza de placas de comando eletrônico e conexões da casa de máquinas com reaperto geral (Código 8101).",
    status: "Concluído"
  },

  // Setor 7 - Alisson Terencio Santos - Chamados no Edifício Infinity Tower
  {
    id: "OS-2026-107",
    data: "2026-08-02",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 7",
    cliente: "Edifício Infinity Tower",
    equipamento: "ELEV-07 (Torre Sul)",
    contrato: "Premium",
    tecnico: "Alisson Terencio Santos",
    matricula: "10207",
    codigoFalha: "8204",
    descricaoFalha: "Defeito no conjunto freio (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Batida mecânica e tranco audível ao frear nas paradas de andar.",
    descricao: "Freio eletromecânico da máquina de tração com folga excessiva; regulado curso e abertura das sapatas (Código 8204).",
    status: "Concluído"
  },
  {
    id: "OS-2026-111",
    data: "2026-08-20",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 7",
    cliente: "Edifício Infinity Tower",
    equipamento: "ELEV-07 (Torre Sul)",
    contrato: "Premium",
    tecnico: "Alisson Terencio Santos",
    matricula: "10207",
    codigoFalha: "8201",
    descricaoFalha: "Defeito no motor (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Superaquecimento na casa de máquinas e vibração na cabina.",
    descricao: "Motor de tração com aquecimento anômalo e vibração nas guias; lubrificadas corrediças e aferida ventilação (Código 8201).",
    status: "Concluído"
  },

  // Setor 8 - Gilmario Manoel Alves - Chamados no Centro Empresarial Horizon
  {
    id: "OS-2026-115",
    data: "2026-08-27",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 8",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre B)",
    contrato: "Express",
    tecnico: "Gilmario Manoel Alves",
    matricula: "10208",
    codigoFalha: "8302",
    descricaoFalha: "Defeito mecânico no regulador (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Inspeção preventiva semestral de limitador e guias de contrapeso.",
    descricao: "Limitador de velocidade na casa de máquinas aferido e lubrificação das guias de contrapeso realizada (Código 8302).",
    status: "Concluído"
  },
  {
    id: "OS-2026-123",
    data: "2026-09-02",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 8",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre B)",
    contrato: "Express",
    tecnico: "Gilmario Manoel Alves",
    matricula: "10208",
    codigoFalha: "8105",
    descricaoFalha: "Defeito de ajuste (parâmetros, módulos, reaperto de fiação, etc) (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Botões de chamada do 2º e 3º pavimentos não acendem.",
    descricao: "Inspeção e reaperto das conexões elétricas do quadro de comando e teste do circuito de botoeiras (Código 8105).",
    status: "Concluído"
  },

  // ==========================================
  // EQUIPE DE VOLANTES / CORRETIVOS • FILIAIS 5003 / 5070 • ZONA 2 - NORTE
  // ==========================================

  // Volantes / Corretivos - Anderson Lemos (Especialista em Máquinas de Tração e Inversores)
  {
    id: "OS-2026-130",
    data: "2026-08-14",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Volante / Corretivo - Anderson Lemos",
    cliente: "Shopping Plaza TKE",
    equipamento: "ELEV-06 (Serviço)",
    contrato: "Service",
    tecnico: "Anderson Lemos",
    matricula: "10309",
    codigoFalha: "8102",
    descricaoFalha: "Defeito no acionamento (TDC, MCINV, etc) (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Corretiva emergencial: Elevador travado com código de falha de inversor.",
    descricao: "Intervenção corretiva pesada no inversor VVF e substituição do conjunto de contatores de alta corrente (Código 8102).",
    status: "Concluído"
  },
  {
    id: "OS-2026-131",
    data: "2026-08-31",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Volante / Corretivo - Anderson Lemos",
    cliente: "Edifício Infinity Tower",
    equipamento: "ELEV-07 (Torre Sul)",
    contrato: "Premium",
    tecnico: "Anderson Lemos",
    matricula: "10309",
    codigoFalha: "8204",
    descricaoFalha: "Defeito no conjunto freio (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Corretiva emergencial: Elevador escorregando na frenagem do térreo.",
    descricao: "Retificação emergencial e ajuste de precisão nas lonas de freio eletromecânico e teste dinâmico de frenagem (Código 8204).",
    status: "Concluído"
  },

  // Volantes / Corretivos - Tiago Alves (Especialista em Poço, Caixa de Corrida e Segurança Mecânica)
  {
    id: "OS-2026-132",
    data: "2026-08-16",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Volante / Corretivo - Tiago Alves",
    cliente: "Hospital Metropolitano",
    equipamento: "ELEV-04 (Leito 1)",
    contrato: "Digital",
    tecnico: "Tiago Alves",
    matricula: "10310",
    codigoFalha: "8804",
    descricaoFalha: "Defeito mecânico na polia tensora (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Corretiva emergencial: Cabo de aço do limitador frouxo e raspando na parede.",
    descricao: "Substituição completa do conjunto de polia tensora de limitador de velocidade e alinhamento a laser no poço (Código 8804).",
    status: "Concluído"
  },
  {
    id: "OS-2026-133",
    data: "2026-09-01",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Volante / Corretivo - Tiago Alves",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre A)",
    contrato: "Express",
    tecnico: "Tiago Alves",
    matricula: "10310",
    codigoFalha: "8815",
    descricaoFalha: "Defeito no cabo de manobra (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Corretiva emergencial: Rompimento de cabo de manobra no fundo do poço.",
    descricao: "Reparo emergencial em fiação de poço e substituição de sensor de limite de curso inferior (Código 8815).",
    status: "Concluído"
  },

  // Volantes / Corretivos - Alexandre Morais (Especialista em Operadores de Portas e Eletrônica de Cabina)
  {
    id: "OS-2026-134",
    data: "2026-08-20",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Volante / Corretivo - Alexandre Morais",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Alexandre Morais",
    matricula: "10311",
    codigoFalha: "8702",
    descricaoFalha: "Defeito elétrico no operador (contatos, COP, inversor, etc) (A)",
    zona: "Cabina",
    solicitacao: "Corretiva emergencial: Operador de cabina travado e barreira rompida.",
    descricao: "Substituição emergencial de placa controladora do operador de porta de cabina e regulagem de barreira eletrônica (Código 8702).",
    status: "Concluído"
  },
  {
    id: "OS-2026-135",
    data: "2026-09-02",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Volante / Corretivo - Alexandre Morais",
    cliente: "Condomínio Solar das Palmeiras",
    equipamento: "ELEV-02 (Torre Norte)",
    contrato: "Plus",
    tecnico: "Alexandre Morais",
    matricula: "10311",
    codigoFalha: "8503",
    descricaoFalha: "Defeito em fecho eletromecânico de porta (A)",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Corretiva emergencial: Trincos de pavimento desregulados em múltiplos andares.",
    descricao: "Alinhamento micrométrico emergencial em trincos elétricos de pavimento nos andares críticos 4, 6 e 8 (Código 8503).",
    status: "Concluído"
  },

  // Atendimentos classificados em Zona Física: Outros
  {
    id: "OS-2026-136",
    data: "2026-08-25",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 2",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre A)",
    contrato: "Express",
    tecnico: "Elton Gomes",
    matricula: "10102",
    codigoFalha: "8401",
    descricaoFalha: "Falta de energia no quadro de distribuição (A)",
    zona: "Casa de Máquinas",
    solicitacao: "Elevador desligado por oscilação na rede elétrica da concessionária.",
    descricao: "Vistoria geral e teste de retorno após restabelecimento de energia pela concessionária; equipamento normalizado (Código 8401).",
    status: "Concluído"
  },
  {
    id: "OS-2026-137",
    data: "2026-09-03",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 1",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Lucas Rodrigues Baccega",
    matricula: "10101",
    codigoFalha: "5716",
    descricaoFalha: "Manutenção Preventiva (A)",
    zona: "Outros",
    solicitacao: "Execução de rotina mensal de manutenção preventiva programada.",
    descricao: "Inspeção e limpeza geral de componentes, testes de segurança e lubrificação preventiva de rotina (Código 5716).",
    status: "Concluído"
  }
];
