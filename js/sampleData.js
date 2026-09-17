/**
 * Projeto TKE - Mapeamento e Normalização Operacional
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
 * - Filiais de Atuação: Filiais 5003 e 5070 | Região: Zona 2 - Norte
 */

const CLIENT_CONTRACT_MAP = {};

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

/**
 * Normaliza o nome da zona física
 */
function normalizeZoneName(zoneStr = "") {
  if (!zoneStr) return "";
  const z = String(zoneStr).trim().toLowerCase();
  if (z.includes("cabina")) return "Cabina";
  if (z.includes("pavimento") || z.includes("caixa") || z.includes("poco") || z.includes("poço")) return "Pavimento / Caixa de corrida";
  if (z.includes("maquina") || z.includes("máquina") || z.includes("casa")) return "Casa de Máquinas";
  if (z.includes("outros") || z.includes("outro")) return "Outros";
  return "";
}

/**
 * Classifica a zona física com base no texto descritivo
 */
function classifyZone(descricao = "", solicitacao = "") {
  const text = `${descricao} ${solicitacao}`.toLowerCase();
  if (text.includes("operador") || text.includes("barreira") || text.includes("botoeira") || text.includes("ventilador") || text.includes("soleira de cabina") || text.includes("cabina")) {
    return "Cabina";
  }
  if (text.includes("trinco") || text.includes("pavimento") || text.includes("mola") || text.includes("caixa de corrida") || text.includes("poço") || text.includes("fim de curso") || text.includes("porta de pavimento") || text.includes("limite")) {
    return "Pavimento / Caixa de corrida";
  }
  if (text.includes("inversor") || text.includes("quadro") || text.includes("máquina") || text.includes("freio") || text.includes("resgate") || text.includes("energia") || text.includes("motor")) {
    return "Casa de Máquinas";
  }
  return "Outros";
}

function getTechMatricula(techName) {
  const norm = normalizeTechName(techName);
  if (!norm) return "10000";
  return TECH_MATRICULA_MAP[norm] || TECH_MATRICULA_MAP[techName] || "10" + Math.abs(norm.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 900 + 100);
}

const SAMPLE_MAINTENANCE_DATA = [];
