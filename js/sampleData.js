/**
 * Projeto TKE - Base de Dados Inicial de Confiabilidade e Manutenção
 * Equipe Operacional:
 * - Setor 1: Lucas Rodrigues (Filial 5003)
 * - Setor 2: Elton Gomes (Filial 5003)
 * - Setor 3: Willian Wallace (Filial 5003)
 * - Setor 4: Allison Oliveira (Filial 5003)
 * - Setor 5: Douglas Bispo (Filial 5070)
 * - Setor 6: Jose Gomes (Filial 5070)
 * - Setor 7: Alisson Terencio (Filial 5070)
 * - Setor 8: Gilmario Manoel (Filial 5070)
 * - Corretivos: Anderson Lemos, Tiago Alves, Alexandre Morais (Filiais 5003 / 5070 • Zona 2 - Norte)
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
  "Lucas Rodrigues": "10101",
  "Elton Gomes": "10102",
  "Willian Wallace": "10103",
  "Allison Oliveira": "10104",
  "Douglas Bispo": "10205",
  "Jose Gomes": "10206",
  "Alisson Terencio": "10207",
  "Gilmario Manoel": "10208",
  "Anderson Lemos": "10309",
  "Tiago Alves": "10310",
  "Alexandre Morais": "10311"
};

function getTechMatricula(techName) {
  if (!techName) return "10000";
  return TECH_MATRICULA_MAP[techName] || "10" + Math.abs(techName.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 900 + 100);
}

const SAMPLE_MAINTENANCE_DATA = [
  // ==========================================
  // FILIAL 5003 • ZONA 2 - NORTE (SETORES 1 A 4)
  // ==========================================

  // Setor 1 - Lucas Rodrigues - Reincidência Crítica no Elevador ELEV-01 (Sky Tower) em Cabina (<30 dias: 12/08 a 28/08 = 16 dias)
  {
    id: "OS-2026-101",
    data: "2026-08-12",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 1",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Lucas Rodrigues",
    solicitacao: "Porta de cabina travando na reabertura e passageiros retidos temporariamente.",
    descricao: "Ajustado operador de porta de cabina e regulagem de tensão da correia de arraste.",
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
    tecnico: "Lucas Rodrigues",
    solicitacao: "Porta revertendo continuamente sem presença de passageiros no vão.",
    descricao: "Barreira eletrônica (infravermelho) da cabina intermitente; alinhados e limpos os sensores óticos.",
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
    tecnico: "Lucas Rodrigues",
    solicitacao: "Display de cabina apagado e ruído metálico ao abrir as portas.",
    descricao: "Substituição do fusível de proteção do display e lubrificação com ajuste do patim de arraste.",
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
    solicitacao: "Elevador não parte do 4º pavimento e acusa porta aberta.",
    descricao: "Trinco e contato elétrico de trinco do 4º pavimento com folga mecânica ajustados e reapertados.",
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
    solicitacao: "Ruído metálico intenso e lentidão no fechamento das portas.",
    descricao: "Porta de pavimento com ruído nas corrediças regulada e desobstrução com limpeza dos canais de soleira.",
    status: "Concluído"
  },

  // Setor 3 - Willian Wallace - Reincidência Crítica no Condomínio Solar das Palmeiras (Pavimento) (<30 dias: 05/08 a 22/08 = 17 dias)
  {
    id: "OS-2026-103",
    data: "2026-08-05",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 3",
    cliente: "Condomínio Solar das Palmeiras",
    equipamento: "ELEV-02 (Torre Norte)",
    contrato: "Plus",
    tecnico: "Willian Wallace",
    solicitacao: "Porta de pavimento do 8º andar sem fechamento automático.",
    descricao: "Porta de pavimento do 8º andar sem fechamento por perda de pressão da mola de fechamento; regulada carga da mola.",
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
    tecnico: "Willian Wallace",
    solicitacao: "Elevador inoperante no 8º pavimento com falha no circuito de segurança.",
    descricao: "Contato elétrico de trinco do 8º pavimento queimado por centelhamento; executado alinhamento micrométrico.",
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
    tecnico: "Willian Wallace",
    solicitacao: "Botoeira de chamada do térreo travada e soleira acumulando sujeira.",
    descricao: "Botoeira de chamada de andar do térreo reparada e soleira de pavimento limpa com desobstrução de guias.",
    status: "Concluído"
  },

  // Setor 4 - Allison Oliveira - Chamado em Casa de Máquinas no Shopping Plaza TKE
  {
    id: "OS-2026-106",
    data: "2026-08-18",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 4",
    cliente: "Shopping Plaza TKE",
    equipamento: "ELEV-06 (Serviço)",
    contrato: "Service",
    tecnico: "Allison Oliveira",
    solicitacao: "Elevador com trancos fortes e erro de aceleração no painel.",
    descricao: "Quadro de comando acusando falha de inversor VVF; reajustados parâmetros de rampa de torque e aceleração.",
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
    tecnico: "Allison Oliveira",
    solicitacao: "Ruído de centelhamento elétrico na casa de máquinas.",
    descricao: "Contator de segurança do quadro de comando com desgaste mecânico nos terminais; desmontado e revisado.",
    status: "Concluído"
  },

  // ==========================================
  // FILIAL 5070 • ZONA 2 - NORTE (SETORES 5 A 8)
  // ==========================================

  // Setor 5 - Douglas Bispo - Reincidência Crítica no Hospital Metropolitano (Poço) (<30 dias: 10/08 a 29/08 = 19 dias)
  {
    id: "OS-2026-104",
    data: "2026-08-10",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 5",
    cliente: "Hospital Metropolitano",
    equipamento: "ELEV-04 (Leito 1)",
    contrato: "Digital",
    tecnico: "Douglas Bispo",
    solicitacao: "Elevador desceu abaixo do subsolo e parou em emergência.",
    descricao: "Sensor de limite e chave de fim de curso inferior no poço descalibrada; recalibrado e testado corte de segurança.",
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
    tecnico: "Douglas Bispo",
    solicitacao: "Vibração excessiva e ruído no fundo do poço durante a viagem.",
    descricao: "Polia tensora do limitador de velocidade no poço desalinhada com ruído excessivo; alinhamento e lubrificação de mancais.",
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
    tecnico: "Douglas Bispo",
    solicitacao: "Verificação de segurança e inspeção após umidade no subsolo.",
    descricao: "Verificação de acúmulo de umidade no poço e teste da chave de stop de emergência do fundo do poço.",
    status: "Concluído"
  },

  // Setor 6 - Jose Gomes - Chamados em Casa de Máquinas no Condomínio Corporate Prime
  {
    id: "OS-2026-112",
    data: "2026-08-25",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 6",
    cliente: "Condomínio Corporate Prime",
    equipamento: "ELEV-05 (Social)",
    contrato: "Plus",
    tecnico: "Jose Gomes",
    solicitacao: "Elevador desarmando disjuntor principal ao partir.",
    descricao: "Contator de linha do quadro de comando com centelhamento nas pontas de contato; substituído conjunto de contatos.",
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
    tecnico: "Jose Gomes",
    solicitacao: "Falhas intermitentes de chamada e comunicação de comando.",
    descricao: "Revisão e limpeza de placas de comando eletrônico e conexões da casa de máquinas com reaperto geral.",
    status: "Concluído"
  },

  // Setor 7 - Alisson Terencio - Chamados no Edifício Infinity Tower
  {
    id: "OS-2026-107",
    data: "2026-08-02",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 7",
    cliente: "Edifício Infinity Tower",
    equipamento: "ELEV-07 (Torre Sul)",
    contrato: "Premium",
    tecnico: "Alisson Terencio",
    solicitacao: "Batida mecânica e tranco audível ao frear nas paradas de andar.",
    descricao: "Freio eletromecânico da máquina de tração com folga excessiva; regulado curso e abertura das sapatas.",
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
    tecnico: "Alisson Terencio",
    solicitacao: "Superaquecimento na casa de máquinas e vibração na cabina.",
    descricao: "Motor de tração com aquecimento anômalo e vibração nas guias; lubrificadas corrediças e aferida ventilação.",
    status: "Concluído"
  },

  // Setor 8 - Gilmario Manoel - Chamados no Centro Empresarial Horizon
  {
    id: "OS-2026-115",
    data: "2026-08-27",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Setor 8",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre B)",
    contrato: "Express",
    tecnico: "Gilmario Manoel",
    solicitacao: "Inspeção preventiva semestral de limitador e guias de contrapeso.",
    descricao: "Limitador de velocidade na casa de máquinas aferido e lubrificação das guias de contrapeso realizada.",
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
    tecnico: "Gilmario Manoel",
    solicitacao: "Botões de chamada do 2º e 3º pavimentos não acendem.",
    descricao: "Inspeção e reaperto das conexões elétricas do quadro de comando e teste do circuito de botoeiras.",
    status: "Concluído"
  },

  // ==========================================
  // EQUIPE DE CORRETIVOS • FILIAL 5003 / 5070 • ZONA 2 - NORTE
  // ==========================================

  // Corretivos - Anderson Lemos (Especialista em Máquinas de Tração e Inversores)
  {
    id: "OS-2026-130",
    data: "2026-08-14",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Corretivo - Anderson Lemos",
    cliente: "Shopping Plaza TKE",
    equipamento: "ELEV-06 (Serviço)",
    contrato: "Service",
    tecnico: "Anderson Lemos",
    matricula: "10309",
    zona: "Casa de Máquinas",
    solicitacao: "Corretiva emergencial: Elevador travado com código de falha de inversor.",
    descricao: "Intervenção corretiva pesada no inversor VVF e substituição do conjunto de contatores de alta corrente.",
    status: "Concluído"
  },
  {
    id: "OS-2026-131",
    data: "2026-08-31",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Corretivo - Anderson Lemos",
    cliente: "Edifício Infinity Tower",
    equipamento: "ELEV-07 (Torre Sul)",
    contrato: "Premium",
    tecnico: "Anderson Lemos",
    matricula: "10309",
    zona: "Casa de Máquinas",
    solicitacao: "Corretiva emergencial: Elevador escorregando na frenagem do térreo.",
    descricao: "Retificação emergencial e ajuste de precisão nas lonas de freio eletromecânico e teste dinâmico de frenagem.",
    status: "Concluído"
  },

  // Corretivos - Tiago Alves (Especialista em Poço, Caixa de Corrida e Segurança Mecânica)
  {
    id: "OS-2026-132",
    data: "2026-08-16",
    filial: "5070",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Corretivo - Tiago Alves",
    cliente: "Hospital Metropolitano",
    equipamento: "ELEV-04 (Leito 1)",
    contrato: "Digital",
    tecnico: "Tiago Alves",
    matricula: "10310",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Corretiva emergencial: Cabo de aço do limitador frouxo e raspando na parede.",
    descricao: "Substituição completa do conjunto de polia tensora de limitador de velocidade e alinhamento a laser no poço.",
    status: "Concluído"
  },
  {
    id: "OS-2026-133",
    data: "2026-09-01",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Corretivo - Tiago Alves",
    cliente: "Centro Empresarial Horizon",
    equipamento: "ELEV-03 (Torre A)",
    contrato: "Express",
    tecnico: "Tiago Alves",
    matricula: "10310",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Corretiva emergencial: Rompimento de cabo de manobra no fundo do poço.",
    descricao: "Reparo emergencial em fiação de poço e substituição de sensor de limite de curso inferior.",
    status: "Concluído"
  },

  // Corretivos - Alexandre Morais (Especialista em Operadores de Portas e Eletrônica de Cabina)
  {
    id: "OS-2026-134",
    data: "2026-08-20",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Corretivo - Alexandre Morais",
    cliente: "Edifício Sky Tower",
    equipamento: "ELEV-01 (Social)",
    contrato: "Premium",
    tecnico: "Alexandre Morais",
    matricula: "10311",
    zona: "Cabina",
    solicitacao: "Corretiva emergencial: Operador de cabina travado e barreira rompida.",
    descricao: "Substituição emergencial de placa controladora do operador de porta de cabina e regulagem de barreira eletrônica.",
    status: "Concluído"
  },
  {
    id: "OS-2026-135",
    data: "2026-09-02",
    filial: "5003",
    zonaOperacional: "Zona 2 - Norte",
    setor: "Corretivo - Alexandre Morais",
    cliente: "Condomínio Solar das Palmeiras",
    equipamento: "ELEV-02 (Torre Norte)",
    contrato: "Plus",
    tecnico: "Alexandre Morais",
    matricula: "10311",
    zona: "Pavimento / Caixa de corrida",
    solicitacao: "Corretiva emergencial: Trincos de pavimento desregulados em múltiplos andares.",
    descricao: "Alinhamento micrométrico emergencial em trincos elétricos de pavimento nos andares críticos 4, 6 e 8.",
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
    zona: "Outros",
    solicitacao: "Elevador desligado por oscilação na rede elétrica da concessionária.",
    descricao: "Vistoria geral e teste de retorno após restabelecimento de energia pela concessionária; equipamento normalizado.",
    status: "Concluído"
  }
];
