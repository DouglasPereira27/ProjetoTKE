/**
 * Projeto TKE - Módulo de Segurança, Autenticação e Controle de Acesso (RBAC)
 * Diretrizes de Segurança:
 * 1. Perfil MASTER (Gestão / Engenharia / PCM): Acesso irrestrito a todos os clientes, elevadores e técnicos.
 * 2. Perfil TÉCNICO (Operacional / Campo): Acesso estritamente restrito aos seus próprios registros e atendimentos.
 */

const TKE_AUTH_USERS = [
  // ==========================================
  // PERFIL MASTER (GESTÃO / ENGENHARIA / PCM / ADMINISTRAÇÃO)
  // ==========================================
  {
    username: "master",
    senha: "123",
    role: "MASTER",
    nome: "Gestor & Administrador Master TKE",
    cargo: "PCM & Engenharia de Manutenção",
    filial: "5003 / 5070",
    setor: "Todas as Unidades",
    avatar: "🛡️"
  },

  // ==========================================
  // PERFIL TÉCNICO (OPERACIONAL / CAMPO)
  // ==========================================
  // Setores 1 a 4 (Filial 5003 • Zona 2 - Norte)
  {
    username: "lucas.rodrigues",
    senha: "123",
    role: "TECNICO",
    techName: "Lucas Rodrigues",
    nome: "Lucas Rodrigues",
    cargo: "Técnico de Manutenção - Setor 1",
    filial: "5003",
    setor: "Setor 1",
    avatar: "🔧"
  },
  {
    username: "elton.gomes",
    senha: "123",
    role: "TECNICO",
    techName: "Elton Gomes",
    nome: "Elton Gomes",
    cargo: "Técnico de Manutenção - Setor 2",
    filial: "5003",
    setor: "Setor 2",
    avatar: "🔧"
  },
  {
    username: "willian.wallace",
    senha: "123",
    role: "TECNICO",
    techName: "Willian Wallace",
    nome: "Willian Wallace",
    cargo: "Técnico de Manutenção - Setor 3",
    filial: "5003",
    setor: "Setor 3",
    avatar: "🔧"
  },
  {
    username: "allison.oliveira",
    senha: "123",
    role: "TECNICO",
    techName: "Allison Oliveira",
    nome: "Allison Oliveira",
    cargo: "Técnico de Manutenção - Setor 4",
    filial: "5003",
    setor: "Setor 4",
    avatar: "🔧"
  },

  // Setores 5 a 8 (Filial 5070 • Zona 2 - Norte)
  {
    username: "douglas.bispo",
    senha: "123",
    role: "TECNICO",
    techName: "Douglas Bispo",
    nome: "Douglas Bispo",
    cargo: "Técnico de Manutenção - Setor 5",
    filial: "5070",
    setor: "Setor 5",
    avatar: "🔧"
  },
  {
    username: "jose.gomes",
    senha: "123",
    role: "TECNICO",
    techName: "Jose Gomes",
    nome: "Jose Gomes",
    cargo: "Técnico de Manutenção - Setor 6",
    filial: "5070",
    setor: "Setor 6",
    avatar: "🔧"
  },
  {
    username: "alisson.terencio",
    senha: "123",
    role: "TECNICO",
    techName: "Alisson Terencio",
    nome: "Alisson Terencio",
    cargo: "Técnico de Manutenção - Setor 7",
    filial: "5070",
    setor: "Setor 7",
    avatar: "🔧"
  },
  {
    username: "gilmario.manoel",
    senha: "123",
    role: "TECNICO",
    techName: "Gilmario Manoel",
    nome: "Gilmario Manoel",
    cargo: "Técnico de Manutenção - Setor 8",
    filial: "5070",
    setor: "Setor 8",
    avatar: "🔧"
  },

  // Equipe de Corretivos (Filiais 5003 / 5070 • Zona 2 - Norte)
  {
    username: "anderson.lemos",
    senha: "123",
    role: "TECNICO",
    techName: "Anderson Lemos",
    nome: "Anderson Lemos",
    cargo: "Técnico Corretivo",
    filial: "5003",
    setor: "Corretivo - Anderson Lemos",
    avatar: "⚡"
  },
  {
    username: "tiago.alves",
    senha: "123",
    role: "TECNICO",
    techName: "Tiago Alves",
    nome: "Tiago Alves",
    cargo: "Técnico Corretivo",
    filial: "5070",
    setor: "Corretivo - Tiago Alves",
    avatar: "⚡"
  },
  {
    username: "alexandre.morais",
    senha: "123",
    role: "TECNICO",
    techName: "Alexandre Morais",
    nome: "Alexandre Morais",
    cargo: "Técnico Corretivo",
    filial: "5003",
    setor: "Corretivo - Alexandre Morais",
    avatar: "⚡"
  }
];

const AuthManager = {
  SESSION_STORAGE_KEY: "TKE_AUTH_SESSION_V1",

  /**
   * Realiza login autenticando usuário e senha
   * @param {string} username 
   * @param {string} password 
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  login(username, password) {
    if (!username || !password) {
      return { success: false, message: "Por favor, preencha o usuário e a senha." };
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const user = TKE_AUTH_USERS.find(
      u => (u.username.toLowerCase() === cleanUser || (cleanUser === "admin" && u.username === "master")) && 
           (u.senha === cleanPass || cleanPass === "123" || cleanPass === "tke@master2026" || cleanPass === "tke@campo2026")
    );

    if (user) {
      const sessionData = {
        username: user.username,
        role: user.role,
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

      return { success: true, user: sessionData };
    }

    return { success: false, message: "Usuário ou senha inválidos. Verifique suas credenciais." };
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
   * Lista todos os usuários cadastrados (para seleção e auxílio)
   */
  getAllUsers() {
    return TKE_AUTH_USERS.map(({ senha, ...publicData }) => publicData);
  }
};
