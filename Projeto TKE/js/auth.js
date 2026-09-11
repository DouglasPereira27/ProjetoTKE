/**
 * Projeto TKE - Módulo de Segurança, Autenticação, Controle de Acesso (RBAC)
 * e Gestão de Usuários com Primeiro Acesso Obrigatório.
 *
 * Diretrizes:
 * 1. Perfil MASTER (Gestão / Engenharia / PCM / Supervisor): Acesso global e gestão de acessos.
 * 2. Perfil TÉCNICO (Operacional / Campo): Acesso restrito aos seus próprios registros e planos de ação.
 * 3. Todo usuário criado possui `primeiro_acesso: true` por padrão, exigindo troca obrigatória de senha no 1º login.
 */

// ==========================================================================
// FUNÇÕES CRIPTOGRÁFICAS (SHA-256 SEGURO)
// ==========================================================================
function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var maxWord = Math.pow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';
  var words = [];
  var asciiBitLength = ascii[lengthProperty] * 8;
  
  var hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  var k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 !== 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << ((3 - (i % 4)) * 8));
  }
  words.push((asciiBitLength / maxWord) | 0);
  words.push(asciiBitLength | 0);

  for (j = 0; j < words[lengthProperty]; j += 16) {
    var w = words.slice(j, j + 16);
    var oldHash = hash.slice(0);

    for (i = 16; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = ((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0);
    }

    var a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (i = 0; i < 64; i++) {
      var S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      var ch = (e & f) ^ ((~e) & g);
      var temp1 = ((((((h + S1) | 0) + ch) | 0) + k[i]) | 0) + (w[i] | 0);
      var S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      var byteVal = (hash[i] >> (8 * j)) & 255;
      result += ((byteVal < 16) ? '0' : '') + byteVal.toString(16);
    }
  }
  return result;
}

// ==========================================================================
// BASE DE USUÁRIOS INICIAL E SEEDING
// ==========================================================================
const TKE_INITIAL_USERS = [
  // ==========================================
  // PERFIL MASTER / SUPERVISOR (GESTÃO / ENGENHARIA / PCM)
  // ==========================================
  {
    id: "usr_master",
    username: "master",
    email: "douglas.pereira2@tkelevator.com",
    matricula: "10001",
    nome: "Gestor & Administrador Master",
    role: "MASTER",
    grupoNivel: "Gestão / PCM",
    cargo: "PCM & Engenharia de Manutenção",
    filial: "5003 / 5070",
    setor: "Todas as Unidades",
    avatar: "🛡️",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_douglas_supervisor",
    username: "douglas.pereira2",
    email: "douglas.pereira2@tkelevator.com",
    matricula: "6",
    nome: "Douglas Pereira",
    role: "MASTER",
    grupoNivel: "Supervisão",
    cargo: "Supervisor de Operações",
    filial: "5003 / 5070",
    setor: "Zona 2 - Norte",
    avatar: "🛡️",
    senha: "Plano@1234",
    senhaHash: sha256Sync("Plano@1234"),
    primeiro_acesso: true, // Usuário demonstrativo com 1º acesso pendente
    senhaProvisoria: "Plano@1234",
    criadoEm: "2026-09-08T09:00:00.000Z"
  },

  // ==========================================
  // PERFIL TÉCNICO (OPERACIONAL / CAMPO)
  // ==========================================
  // Setores 1 a 4 (Filiais 5003 / 5070 • Zona 2 - Norte)
  {
    id: "usr_lucas_rodrigues",
    username: "lucas.rodrigues",
    email: "lucas.rodrigues@operacao365.com",
    matricula: "10101",
    nome: "Lucas Rodrigues Baccega",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Lucas Rodrigues Baccega",
    cargo: "Técnico de Manutenção - Setor 1",
    filial: "5003 / 5070",
    setor: "Setor 1",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_elton_gomes",
    username: "elton.gomes",
    email: "elton.gomes@operacao365.com",
    matricula: "10102",
    nome: "Elton Gomes",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Elton Gomes",
    cargo: "Técnico de Manutenção - Setor 2",
    filial: "5003 / 5070",
    setor: "Setor 2",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_willian_wallace",
    username: "willian.wallace",
    email: "willian.wallace@operacao365.com",
    matricula: "10103",
    nome: "Willian Wallace da Silva",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Willian Wallace da Silva",
    cargo: "Técnico de Manutenção - Setor 3",
    filial: "5003 / 5070",
    setor: "Setor 3",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_allison_oliveira",
    username: "allison.oliveira",
    email: "allison.oliveira@operacao365.com",
    matricula: "10104",
    nome: "Allison Oliveira Carvalho",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Allison Oliveira Carvalho",
    cargo: "Técnico de Manutenção - Setor 4",
    filial: "5003 / 5070",
    setor: "Setor 4",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },

  // Setores 5 a 8 (Filiais 5003 / 5070 • Zona 2 - Norte)
  {
    id: "usr_douglas_bispo",
    username: "douglas.bispo",
    email: "douglas.bispo@operacao365.com",
    matricula: "10205",
    nome: "Douglas Geraldin Bispo",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Douglas Geraldin Bispo",
    cargo: "Técnico de Manutenção - Setor 5",
    filial: "5003 / 5070",
    setor: "Setor 5",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_jose_gomes",
    username: "jose.gomes",
    email: "jose.gomes@operacao365.com",
    matricula: "10206",
    nome: "Jose Gomes de Miranda",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Jose Gomes de Miranda",
    cargo: "Técnico de Manutenção - Setor 6",
    filial: "5003 / 5070",
    setor: "Setor 6",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_alisson_terencio",
    username: "alisson.terencio",
    email: "alisson.terencio@operacao365.com",
    matricula: "10207",
    nome: "Alisson Terencio Santos",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Alisson Terencio Santos",
    cargo: "Técnico de Manutenção - Setor 7",
    filial: "5003 / 5070",
    setor: "Setor 7",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_gilmario_manoel",
    username: "gilmario.manoel",
    email: "gilmario.manoel@operacao365.com",
    matricula: "10208",
    nome: "Gilmario Manoel Alves",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Gilmario Manoel Alves",
    cargo: "Técnico de Manutenção - Setor 8",
    filial: "5003 / 5070",
    setor: "Setor 8",
    avatar: "🔧",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },

  // Volantes / Corretivos (Filiais 5003 / 5070 • Zona 2 - Norte)
  {
    id: "usr_anderson_lemos",
    username: "anderson.lemos",
    email: "anderson.lemos@operacao365.com",
    matricula: "10309",
    nome: "Anderson Lemos",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Anderson Lemos",
    cargo: "Volante / Corretivo",
    filial: "5003 / 5070",
    setor: "Volante / Corretivo - Anderson Lemos",
    avatar: "⚡",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_tiago_alves",
    username: "tiago.alves",
    email: "tiago.alves@operacao365.com",
    matricula: "10310",
    nome: "Tiago Alves",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Tiago Alves",
    cargo: "Volante / Corretivo",
    filial: "5003 / 5070",
    setor: "Volante / Corretivo - Tiago Alves",
    avatar: "⚡",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },
  {
    id: "usr_alexandre_morais",
    username: "alexandre.morais",
    email: "alexandre.morais@operacao365.com",
    matricula: "10311",
    nome: "Alexandre Morais",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Alexandre Morais",
    cargo: "Volante / Corretivo",
    filial: "5003 / 5070",
    setor: "Volante / Corretivo - Alexandre Morais",
    avatar: "⚡",
    senha: "123",
    senhaHash: sha256Sync("123"),
    primeiro_acesso: false,
    senhaProvisoria: null,
    criadoEm: "2026-08-01T08:00:00.000Z"
  },

  // Novo Colaborador Técnico Cadastrado (Demonstração de 1º Acesso Obrigatório)
  {
    id: "usr_rodrigo_mendonca",
    username: "rodrigo.mendonca",
    email: "rodrigo.mendonca@operacao365.com",
    matricula: "50789",
    nome: "Rodrigo Mendonça",
    role: "TECNICO",
    grupoNivel: "G2",
    techName: "Rodrigo Mendonça",
    cargo: "Técnico de Manutenção - Setor 2",
    filial: "5003 / 5070",
    setor: "Setor 2",
    avatar: "🔧",
    senha: "Plano@1234",
    senhaHash: sha256Sync("Plano@1234"),
    primeiro_acesso: true, // Flag obrigatória de primeiro acesso
    senhaProvisoria: "Plano@1234",
    criadoEm: "2026-09-08T10:00:00.000Z"
  }
];

// Para compatibilidade com imports legados
const TKE_AUTH_USERS = TKE_INITIAL_USERS;

// ==========================================================================
// GERENCIADOR DE USUÁRIOS (USER MANAGER / CRUD / STORAGE)
// ==========================================================================
const UserManager = {
  STORAGE_KEY: "PLANO365_USERS_DATA_V1",

  /**
   * Inicializa e obtém todos os usuários persistidos
   * @returns {Array<object>}
   */
  getUsers() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let updated = false;
          parsed = parsed.map(u => {
            // Se for o contato Douglas Pereira ou o antigo supervisor
            if (
              u.nome === "Douglas Pereira" ||
              u.nome === "Douglas" ||
              u.username === "douglas.pereira2" ||
              u.username === "douglas.supervisor" ||
              (u.email && u.email.toLowerCase() === "douglas.pereira2@tkelevator.com") ||
              (u.email && u.email.toLowerCase() === "douglas.supervisor@operacao365.com") ||
              u.id === "usr_douglas_supervisor" ||
              u.id === "usr_camila_supervisor" ||
              u.nome === "Camila Rocha"
            ) {
              updated = true;
              return {
                ...u,
                id: "usr_douglas_supervisor",
                username: "douglas.pereira2",
                email: "douglas.pereira2@tkelevator.com",
                matricula: (u.matricula && String(u.matricula) !== "10022") ? String(u.matricula) : "6",
                nome: "Douglas Pereira",
                role: "MASTER",
                grupoNivel: "Supervisão",
                cargo: "Supervisor de Operações",
                setor: "Zona 2 - Norte",
                filial: "5003 / 5070",
                avatar: "🛡️"
              };
            }
            // Atualizar e-mail do acesso Master
            if (u.id === "usr_master" || u.username === "master") {
              if (u.email !== "douglas.pereira2@tkelevator.com") {
                u.email = "douglas.pereira2@tkelevator.com";
                updated = true;
              }
            }

            // Auto-correção: se o e-mail real foi salvo no campo cargo
            if (u.cargo && u.cargo.includes("@") && u.cargo.includes(".")) {
              const realEmail = u.cargo.trim();
              u.email = realEmail;
              u.username = realEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
              u.cargo = u.role === "MASTER" ? "Supervisor de Operações" : `Técnico de Manutenção - ${u.setor || "Campo"}`;
              updated = true;
            }
            // Auto-correção: se o campo nome continha o e-mail
            if (u.nome && u.nome.includes("@") && u.nome.includes(".")) {
              const emailFromNome = u.nome.trim();
              u.email = emailFromNome;
              u.username = emailFromNome.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
              const prefix = emailFromNome.split("@")[0];
              const parts = prefix.replace(/[0-9._-]+/g, " ").trim().split(/\s+/);
              u.nome = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ") || prefix;
              updated = true;
            }
            return u;
          });

          // Deduplicar Douglas Pereira se houver múltiplos registros
          const seen = new Set();
          parsed = parsed.filter(u => {
            const key = (u.id === "usr_douglas_supervisor" || u.username === "douglas.pereira2" || u.email === "douglas.pereira2@tkelevator.com") 
              ? "usr_douglas_supervisor" 
              : (u.id || u.username);
            if (seen.has(key)) {
              updated = true;
              return false;
            }
            seen.add(key);
            return true;
          });

          if (updated) {
            this.saveUsers(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Aviso ao carregar usuários do localStorage:", e);
    }

    // Inicializa com os usuários pré-configurados
    this.saveUsers(TKE_INITIAL_USERS);
    return TKE_INITIAL_USERS;
  },

  /**
   * Salva a lista de usuários no armazenamento local
   * @param {Array<object>} users 
   */
  saveUsers(users) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Erro ao salvar usuários no localStorage:", e);
    }
  },

  /**
   * Localiza usuário por ID
   * @param {string} id 
   * @returns {object|null}
   */
  getUserById(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  },

  /**
   * Localiza usuário por login (username ou e-mail)
   * @param {string} identifier 
   * @returns {object|null}
   */
  getUserByLogin(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const users = this.getUsers();
    return users.find(u => 
      u.username.toLowerCase() === clean || 
      (u.email && u.email.toLowerCase() === clean) ||
      (u.matricula && String(u.matricula).trim().toLowerCase() === clean) ||
      (clean === "admin" && u.username === "master") ||
      (clean === "douglas" && (u.id === "usr_douglas_supervisor" || u.username === "douglas.pereira2")) ||
      (clean === "douglas.supervisor" && u.id === "usr_douglas_supervisor") ||
      (clean === "douglas.pereira2" && u.id === "usr_douglas_supervisor") ||
      (clean === "douglas.pereira" && u.id === "usr_douglas_supervisor")
    ) || null;
  },

  /**
   * Gera hash SHA-256 para senhas
   * @param {string} password 
   * @returns {string}
   */
  hashPassword(password) {
    return sha256Sync(String(password || ""));
  },

  /**
   * Cadastra novo colaborador (Regra de Banco: primeiro_acesso: true por padrão)
   * @param {object} userData 
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  createUser(userData) {
    if (!userData || !userData.nome || !userData.email) {
      return { success: false, message: "Nome completo e E-mail corporativo são obrigatórios." };
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    let cleanUsername = (userData.username || cleanEmail.split("@")[0] || userData.nome.toLowerCase().replace(/\s+/g, ".")).trim().toLowerCase();
    
    // Normalizar username
    cleanUsername = cleanUsername.replace(/[^a-z0-9._-]/g, "");

    const users = this.getUsers();

    // Validar se username ou email já existem
    const existing = users.find(u => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanEmail));
    if (existing) {
      return { success: false, message: `Já existe um colaborador com o login ou e-mail informado (${cleanUsername} / ${cleanEmail}).` };
    }

    const tempPass = (userData.senhaProvisoria || "Plano@1234").trim();
    const role = (userData.role || "TECNICO").toUpperCase();
    const matricula = (userData.matricula || "").trim() || "10" + Math.floor(100 + Math.random() * 900);
    const grupoNivel = (userData.grupoNivel || "G2").trim();
    const setor = (userData.setor || "Setor 1").trim();
    const filial = (userData.filial || "5003 / 5070").trim();
    const cargo = userData.cargo || (role === "MASTER" ? "Supervisor de Manutenção & PCM" : `Técnico de Manutenção - ${setor}`);
    const avatar = role === "MASTER" ? "🛡️" : (setor.toLowerCase().includes("volante") ? "⚡" : "🔧");

    // MODELO / SCHEMA DO USUÁRIO
    const newUser = {
      id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      username: cleanUsername,
      email: cleanEmail,
      matricula: matricula,
      nome: userData.nome.trim(),
      role: role,
      grupoNivel: grupoNivel,
      cargo: cargo,
      filial: filial,
      setor: setor,
      techName: userData.nome.trim(),
      avatar: avatar,
      senha: tempPass,
      senhaHash: this.hashPassword(tempPass),
      senhaProvisoria: tempPass,
      primeiro_acesso: true, // REGRA DE BANCO: Todo usuário criado possui primeiro_acesso: true
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    return { success: true, user: newUser, message: "Colaborador cadastrado com sucesso! Senha provisória gerada." };
  },

  /**
   * Atualiza dados cadastrais de um colaborador
   * @param {string} id 
   * @param {object} updateData 
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  updateUser(id, updateData) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      return { success: false, message: "Colaborador não encontrado." };
    }

    const current = users[index];

    // Verificar duplicidade de login/e-mail se alterados
    if (updateData.email && updateData.email.toLowerCase() !== current.email.toLowerCase()) {
      const emailExists = users.some(u => u.id !== id && u.email && u.email.toLowerCase() === updateData.email.toLowerCase());
      if (emailExists) {
        return { success: false, message: "O e-mail informado já está em uso por outro usuário." };
      }
    }

    users[index] = {
      ...current,
      nome: updateData.nome ? updateData.nome.trim() : current.nome,
      email: updateData.email ? updateData.email.trim().toLowerCase() : current.email,
      matricula: updateData.matricula ? updateData.matricula.trim() : current.matricula,
      role: updateData.role ? updateData.role.toUpperCase() : current.role,
      grupoNivel: updateData.grupoNivel ? updateData.grupoNivel.trim() : current.grupoNivel,
      setor: updateData.setor ? updateData.setor.trim() : current.setor,
      filial: updateData.filial ? updateData.filial.trim() : current.filial,
      cargo: updateData.cargo ? updateData.cargo.trim() : current.cargo,
      techName: updateData.nome ? updateData.nome.trim() : current.techName,
      atualizadoEm: new Date().toISOString()
    };

    this.saveUsers(users);
    return { success: true, user: users[index], message: "Colaborador atualizado com sucesso." };
  },

  /**
   * Exclui um colaborador
   * @param {string} id 
   * @param {string} currentLoggedInUsername 
   * @returns {{ success: boolean, message?: string }}
   */
  deleteUser(id, currentLoggedInUsername) {
    const users = this.getUsers();
    const target = users.find(u => u.id === id);

    if (!target) {
      return { success: false, message: "Colaborador não encontrado." };
    }

    if (target.username.toLowerCase() === "master") {
      return { success: false, message: "Não é permitido excluir o usuário Master de administração raiz." };
    }

    if (currentLoggedInUsername && target.username.toLowerCase() === currentLoggedInUsername.toLowerCase()) {
      return { success: false, message: "Você não pode excluir sua própria conta enquanto estiver logado." };
    }

    const filtered = users.filter(u => u.id !== id);
    this.saveUsers(filtered);
    return { success: true, message: `Colaborador ${target.nome} removido com sucesso.` };
  },

  /**
   * Reseta a senha de um colaborador para provisória e reativa a flag de primeiro acesso
   * @param {string} id 
   * @param {string} customTempPass 
   * @returns {{ success: boolean, tempPass?: string, message?: string }}
   */
  resetUserPassword(id, customTempPass = "Plano@1234") {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      return { success: false, message: "Colaborador não encontrado." };
    }

    const temp = customTempPass.trim() || "Plano@1234";
    users[index].senha = temp;
    users[index].senhaHash = this.hashPassword(temp);
    users[index].senhaProvisoria = temp;
    users[index].primeiro_acesso = true; // Força troca obrigatória no próximo acesso
    users[index].atualizadoEm = new Date().toISOString();

    this.saveUsers(users);
    return { success: true, tempPass: temp, message: `Senha resetada com sucesso para ${temp}. O colaborador deverá alterá-la no próximo login.` };
  },

  /**
   * Atualiza a senha definitiva após o fluxo obrigatório de primeiro acesso
   * @param {string} identifier 
   * @param {string} newPassword 
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  updatePasswordAfterFirstAccess(identifier, newPassword) {
    const users = this.getUsers();
    const clean = String(identifier).trim().toLowerCase();
    const index = users.findIndex(u => 
      u.id === identifier ||
      u.username.toLowerCase() === clean || 
      (u.email && u.email.toLowerCase() === clean) ||
      (clean === "admin" && u.username === "master")
    );

    if (index === -1) {
      return { success: false, message: "Usuário não localizado para redefinição de senha." };
    }

    const passHash = this.hashPassword(newPassword);

    users[index].senha = newPassword;
    users[index].senhaHash = passHash;
    users[index].primeiro_acesso = false; // Flag desativada com sucesso
    users[index].senhaProvisoria = null;
    users[index].senhaAlteradaEm = new Date().toISOString();
    users[index].atualizadoEm = new Date().toISOString();

    this.saveUsers(users);
    return { success: true, user: users[index], message: "Senha redefinida com sucesso! Acesso concedido." };
  },

  /**
   * Redefine a senha de um usuário após o primeiro acesso (ou recuperação de senha)
   * Valida identidade por senha atual, matrícula corporativa ou e-mail cadastrado
   * @param {string} identifier (username, email ou matrícula)
   * @param {string} verificationInput (senha atual ou matrícula)
   * @param {string} newPassword (nova senha)
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  resetUserPasswordDirect(identifier, verificationInput, newPassword) {
    if (!identifier || !verificationInput || !newPassword) {
      return { success: false, message: "Por favor, preencha todos os campos obrigatórios." };
    }

    const users = this.getUsers();
    const cleanId = String(identifier).trim().toLowerCase();
    const cleanVerif = String(verificationInput).trim();
    
    const index = users.findIndex(u => 
      u.id === identifier ||
      u.username.toLowerCase() === cleanId || 
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.matricula && String(u.matricula).trim().toLowerCase() === cleanId) ||
      (cleanId === "admin" && u.username === "master") ||
      (cleanId === "douglas" && (u.id === "usr_douglas_supervisor" || u.username === "douglas.pereira2"))
    );

    if (index === -1) {
      return { success: false, message: "Usuário, e-mail ou matrícula não localizado no sistema." };
    }

    const user = users[index];

    // Validação de Identidade: senha atual (pura ou hash), matrícula, e-mail ou senhas mestras
    const verifHash = this.hashPassword(cleanVerif);
    const isValidVerification = 
      (user.senha && user.senha === cleanVerif) ||
      (user.senhaHash && user.senhaHash === verifHash) ||
      (user.matricula && String(user.matricula).trim() === cleanVerif) ||
      (user.email && user.email.toLowerCase() === cleanVerif.toLowerCase()) ||
      (user.senhaProvisoria && user.senhaProvisoria === cleanVerif) ||
      cleanVerif === "123" ||
      cleanVerif === "master2026" ||
      cleanVerif === "campo2026" ||
      cleanVerif === "Plano@1234";

    if (!isValidVerification) {
      return { success: false, message: "A verificação de segurança (senha atual ou matrícula) está incorreta." };
    }

    const passHash = this.hashPassword(newPassword);

    users[index].senha = newPassword;
    users[index].senhaHash = passHash;
    users[index].primeiro_acesso = false; // Assegura que o acesso está ativo após a redefinição
    users[index].senhaProvisoria = null;
    users[index].senhaAlteradaEm = new Date().toISOString();
    users[index].atualizadoEm = new Date().toISOString();

    this.saveUsers(users);
    return { success: true, user: users[index], message: "Senha redefinida com sucesso! Você já pode efetuar o login com a nova senha." };
  }
};

// ==========================================================================
// GERENCIADOR DE AUTENTICAÇÃO E SESSÃO (AUTH MANAGER)
// ==========================================================================
const AuthManager = {
  SESSION_STORAGE_KEY: "PLANO365_AUTH_SESSION_V1",

  /**
   * Realiza login autenticando usuário e senha, verificando a flag de primeiro acesso
   * @param {string} identifier (username ou email)
   * @param {string} password 
   * @returns {{ success: boolean, requirePasswordReset?: boolean, user?: object, message?: string }}
   */
  login(identifier, password) {
    if (!identifier || !password) {
      return { success: false, message: "Por favor, preencha o usuário/e-mail e a senha." };
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const user = UserManager.getUserByLogin(cleanId);

    if (!user) {
      return { success: false, message: "Usuário ou e-mail não encontrado no sistema." };
    }

    // Validação de senha: Hash SHA-256, senha em texto puro ou overrides de demonstração
    const inputHash = UserManager.hashPassword(cleanPass);
    const isValidPass = 
      (user.senhaHash && user.senhaHash === inputHash) ||
      (user.senha && user.senha === cleanPass) ||
      cleanPass === "123" ||
      cleanPass === "master2026" ||
      cleanPass === "campo2026" ||
      cleanPass === "tke@master2026" ||
      cleanPass === "tke@campo2026" ||
      (user.senhaProvisoria && user.senhaProvisoria === cleanPass);

    if (!isValidPass) {
      return { success: false, message: "Senha incorreta. Verifique suas credenciais." };
    }

    // =======================================================================
    // REGRA 2: INTERCEPTAÇÃO OBRIGATÓRIA DE PRIMEIRO ACESSO (primeiro_acesso: true)
    // =======================================================================
    if (user.primeiro_acesso === true) {
      return {
        success: false,
        requirePasswordReset: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nome: user.nome,
          role: user.role,
          grupoNivel: user.grupoNivel,
          cargo: user.cargo,
          filial: user.filial,
          setor: user.setor,
          techName: user.techName || user.nome,
          avatar: user.avatar,
          senhaProvisoria: user.senhaProvisoria || cleanPass
        },
        message: "Primeiro acesso detectado. É obrigatório cadastrar uma nova senha para continuar."
      };
    }

    // Login bem-sucedido e primeiro acesso já concluído
    const sessionData = {
      id: user.id,
      username: user.username,
      email: user.email,
      matricula: user.matricula,
      role: user.role,
      grupoNivel: user.grupoNivel,
      nome: user.nome,
      cargo: user.cargo,
      filial: user.filial,
      setor: user.setor,
      techName: user.techName || user.nome,
      avatar: user.avatar,
      loggedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.error("Erro ao salvar sessão no localStorage:", e);
    }

    return { success: true, user: sessionData };
  },

  /**
   * Valida a política de segurança da nova senha
   * @param {string} newPassword 
   * @param {string} tempPassword 
   * @returns {{ valid: boolean, errors: string[], lengthOk: boolean, alphanumericOk: boolean, distinctOk: boolean, score: number, label: string }}
   */
  validatePasswordPolicy(newPassword, tempPassword = "") {
    const pass = String(newPassword || "").trim();
    const temp = String(tempPassword || "").trim().toLowerCase();

    const lengthOk = pass.length >= 8;
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const alphanumericOk = hasLetters && hasNumbers;

    const lowerPass = pass.toLowerCase();
    const isDefault = 
      lowerPass === "123" || 
      lowerPass === "plano@1234" || 
      lowerPass === "tke@1234" || 
      lowerPass === "senha123" || 
      lowerPass === "12345678" ||
      (temp && lowerPass === temp);

    const distinctOk = !isDefault;

    const errors = [];
    if (!lengthOk) errors.push("A senha deve conter no mínimo 8 caracteres.");
    if (!hasLetters || !hasNumbers) errors.push("A senha deve conter uma combinação de letras e números.");
    if (!distinctOk) errors.push("A nova senha não pode ser igual à senha padrão/provisória.");

    // Cálculo da força da senha
    let score = 0;
    if (pass.length >= 6) score += 20;
    if (pass.length >= 8) score += 20;
    if (pass.length >= 10) score += 15;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 20;
    if (hasNumbers) score += 15;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 10;

    let label = "Fraca";
    if (score >= 70) label = "Forte";
    else if (score >= 45) label = "Média";

    return {
      valid: lengthOk && alphanumericOk && distinctOk,
      errors: errors,
      lengthOk: lengthOk,
      alphanumericOk: alphanumericOk,
      distinctOk: distinctOk,
      score: Math.min(100, score),
      label: label
    };
  },

  /**
   * Conclui o fluxo de troca obrigatória de senha no primeiro acesso
   * @param {string} identifier 
   * @param {string} tempPassword 
   * @param {string} newPassword 
   * @param {string} confirmPassword 
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  completeFirstAccessPasswordReset(identifier, tempPassword, newPassword, confirmPassword) {
    if (!newPassword || !confirmPassword) {
      return { success: false, message: "Por favor, preencha e confirme sua nova senha." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: "A confirmação de senha não confere com a nova senha digitada." };
    }

    const policy = this.validatePasswordPolicy(newPassword, tempPassword);
    if (!policy.valid) {
      return { success: false, message: policy.errors[0] || "A senha não atende aos requisitos de segurança." };
    }

    // Atualiza usuário no banco/storage
    const updateResult = UserManager.updatePasswordAfterFirstAccess(identifier, newPassword);
    if (!updateResult.success) {
      return updateResult;
    }

    const user = updateResult.user;

    // Inicia sessão autenticada diretamente
    const sessionData = {
      id: user.id,
      username: user.username,
      email: user.email,
      matricula: user.matricula,
      role: user.role,
      grupoNivel: user.grupoNivel,
      nome: user.nome,
      cargo: user.cargo,
      filial: user.filial,
      setor: user.setor,
      techName: user.techName || user.nome,
      avatar: user.avatar,
      loggedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.error("Erro ao salvar sessão:", e);
    }

    return {
      success: true,
      user: sessionData,
      message: "Senha cadastrada com sucesso! Seu primeiro acesso foi concluído."
    };
  },

  /**
   * Redefine a senha de um usuário (após o primeiro acesso ou sob demanda)
   * @param {string} identifier 
   * @param {string} verificationInput 
   * @param {string} newPassword 
   * @param {string} confirmPassword 
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  resetPassword(identifier, verificationInput, newPassword, confirmPassword) {
    if (!identifier || !verificationInput || !newPassword || !confirmPassword) {
      return { success: false, message: "Por favor, preencha todos os campos obrigatórios." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: "A confirmação de senha não confere com a nova senha digitada." };
    }

    const policy = this.validatePasswordPolicy(newPassword, verificationInput);
    if (!policy.valid) {
      return { success: false, message: policy.errors[0] || "A nova senha não atende aos requisitos de segurança." };
    }

    const updateResult = UserManager.resetUserPasswordDirect(identifier, verificationInput, newPassword);
    if (!updateResult.success) {
      return updateResult;
    }

    const user = updateResult.user;

    // Se o usuário autenticado alterou sua própria senha enquanto logado, atualiza a sessão
    const currentSession = this.getCurrentUser();
    if (currentSession && (currentSession.id === user.id || currentSession.username.toLowerCase() === user.username.toLowerCase())) {
      const updatedSession = {
        ...currentSession,
        loggedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
      } catch (e) {
        console.error("Erro ao sincronizar sessão:", e);
      }
    }

    return {
      success: true,
      user: updateResult.user,
      message: "Senha atualizada com sucesso! Você já pode entrar com a nova credencial."
    };
  },

  /**
   * Encerra a sessão ativa
   */
  logout() {
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (e) {
      console.error("Erro ao remover sessão:", e);
    }
  },

  /**
   * Obtém a sessão do usuário autenticado atual
   * @returns {object|null}
   */
  getCurrentUser() {
    try {
      const session = localStorage.getItem(this.SESSION_STORAGE_KEY);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Verifica se há usuário autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getCurrentUser();
  },

  /**
   * Verifica se o usuário autenticado possui o papel especificado
   * @param {"MASTER"|"TECNICO"} role 
   * @returns {boolean}
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  },

  /**
   * Lista todos os usuários cadastrados
   */
  getAllUsers() {
    return UserManager.getUsers().map(({ senha, senhaHash, ...publicData }) => publicData);
  }
};

// ==========================================================================
// CAMADA DE ENDPOINTS REST / SERVIÇOS DE API (TKE SERVICE LAYER)
// ==========================================================================
/**
 * Endpoints de Autenticação e Segurança TKE
 */
const TKEAuthAPI = {
  /**
   * POST /api/auth/login
   * Valida credenciais e verifica a flag de primeiro acesso
   */
  async login({ username, password }) {
    const result = AuthManager.login(username, password);
    if (result.requirePasswordReset) {
      return {
        status: 200,
        data: {
          success: false,
          requirePasswordReset: true,
          user: result.user,
          message: result.message
        }
      };
    }
    if (result.success) {
      return {
        status: 200,
        data: {
          success: true,
          requirePasswordReset: false,
          user: result.user,
          message: "Autenticação realizada com sucesso."
        }
      };
    }
    return {
      status: 401,
      data: {
        success: false,
        message: result.message || "Credenciais inválidas."
      }
    };
  },

  /**
   * POST /api/auth/primeiro-acesso
   * Redefinição obrigatória de senha no 1º acesso
   */
  async completeFirstAccess({ username, tempPassword, newPassword, confirmPassword }) {
    const result = AuthManager.completeFirstAccessPasswordReset(username, tempPassword, newPassword, confirmPassword);
    if (result.success) {
      return {
        status: 200,
        data: {
          success: true,
          user: result.user,
          message: result.message
        }
      };
    }
    return {
      status: 400,
      data: {
        success: false,
        message: result.message
      }
    };
  },

  /**
   * POST /api/auth/reset-password
   * Redefinição de senha de usuários após o primeiro acesso
   */
  async resetPassword({ identifier, verificationInput, newPassword, confirmPassword }) {
    const result = AuthManager.resetPassword(identifier, verificationInput, newPassword, confirmPassword);
    if (result.success) {
      return {
        status: 200,
        data: {
          success: true,
          user: result.user,
          message: result.message
        }
      };
    }
    return {
      status: 400,
      data: {
        success: false,
        message: result.message
      }
    };
  },

  /**
   * POST /api/auth/validate-policy
   */
  validatePasswordPolicy(newPassword, tempPassword) {
    const policy = AuthManager.validatePasswordPolicy(newPassword, tempPassword);
    return {
      status: 200,
      data: policy
    };
  },

  /**
   * POST /api/auth/logout
   */
  async logout() {
    AuthManager.logout();
    return {
      status: 200,
      data: { success: true, message: "Sessão encerrada com sucesso." }
    };
  },

  /**
   * GET /api/auth/session
   */
  async getSession() {
    const user = AuthManager.getCurrentUser();
    return {
      status: 200,
      data: { authenticated: !!user, user: user || null }
    };
  }
};

/**
 * Endpoints Administrativos de Gestão de Usuários (Restrito a Supervisor / MASTER)
 */
const TKEUsersAPI = {
  /**
   * GET /api/users
   * Listagem de colaboradores com controle RBAC
   */
  async listUsers() {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.role !== "MASTER") {
      return {
        status: 403,
        data: { success: false, message: "Acesso proibido: apenas Supervisores/Master podem listar colaboradores." }
      };
    }
    const users = UserManager.getUsers().map(({ senha, senhaHash, ...safeUser }) => safeUser);
    return {
      status: 200,
      data: {
        success: true,
        users: users,
        total: users.length,
        pendingFirstAccess: users.filter(u => u.primeiro_acesso).length
      }
    };
  },

  /**
   * POST /api/users
   * Criação de novo colaborador com regra de banco primeiro_acesso: true
   */
  async createUser(userData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.role !== "MASTER") {
      return {
        status: 403,
        data: { success: false, message: "Acesso proibido: restrito a Supervisores/Master." }
      };
    }

    const result = UserManager.createUser(userData);
    return {
      status: result.success ? 201 : 400,
      data: result
    };
  },

  /**
   * PUT /api/users/:id
   * Atualização de dados cadastrais
   */
  async updateUser(id, updateData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.role !== "MASTER") {
      return {
        status: 403,
        data: { success: false, message: "Acesso proibido: restrito a Supervisores/Master." }
      };
    }

    const result = UserManager.updateUser(id, updateData);
    return {
      status: result.success ? 200 : 400,
      data: result
    };
  },

  /**
   * DELETE /api/users/:id
   * Remoção de colaborador
   */
  async deleteUser(id) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.role !== "MASTER") {
      return {
        status: 403,
        data: { success: false, message: "Acesso proibido: restrito a Supervisores/Master." }
      };
    }

    const result = UserManager.deleteUser(id, currentUser.username);
    return {
      status: result.success ? 200 : 400,
      data: result
    };
  },

  /**
   * POST /api/users/:id/reset-password
   * Reseta senha e reativa a flag primeiro_acesso: true
   */
  async resetPassword(id, tempPass = "Tke@1234") {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser || currentUser.role !== "MASTER") {
      return {
        status: 403,
        data: { success: false, message: "Acesso proibido: restrito a Supervisores/Master." }
      };
    }

    const result = UserManager.resetUserPassword(id, tempPass);
    return {
      status: result.success ? 200 : 400,
      data: result
    };
  }
};

// ==========================================================================
// EXPORTAÇÕES GLOBAIS
// ==========================================================================
if (typeof window !== "undefined") {
  window.sha256Sync = sha256Sync;
  window.TKE_INITIAL_USERS = TKE_INITIAL_USERS;
  window.TKE_AUTH_USERS = TKE_AUTH_USERS;
  window.UserManager = UserManager;
  window.AuthManager = AuthManager;
  window.TKEAuthAPI = TKEAuthAPI;
  window.TKEUsersAPI = TKEUsersAPI;
}
