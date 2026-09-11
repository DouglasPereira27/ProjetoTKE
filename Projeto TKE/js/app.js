/**
 * Projeto TKE - Controlador Principal da Aplicação
 * Gerenciamento de Estado, Eventos, Autenticação Segura (RBAC Master vs. Técnico), Filtros Hierárquicos
 */

const AppState = {
  data: [],
  currentUser: null, // Sessão de usuário autenticado
  profile: "MASTER", // "MASTER" ou "TECNICO"
  selectedTech: "",
  searchFilter: "",
  filialFilter: "ALL",
  zonaOpFilter: "ALL",
  setorFilter: "ALL",
  zoneFilter: "ALL",
  contratoFilter: "ALL",
  qtdChamadosFilter: "ALL",
  historyTechFilter: "ALL",
  historyBuildingFilter: "ALL",
  masterZoneTechFilter: "ALL",
  techZoneTechFilter: null,
  masterRecurrenceViewMode: "dashboard", // "dashboard", "table" ou "pie"
  techRecurrenceViewMode: "cards", // "cards" ou "pie"
  theme: "dark" // "dark" ou "light"
};

// Mapeamento Oficial de Setores e Técnicos TKE
const TKE_SECTOR_TECH_MAP = {
  "Setor 1": { tecnico: "Lucas Rodrigues Baccega", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 2": { tecnico: "Elton Gomes", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 3": { tecnico: "Willian Wallace da Silva", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 4": { tecnico: "Allison Oliveira Carvalho", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 5": { tecnico: "Douglas Geraldin Bispo", filial: "5070", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 6": { tecnico: "Jose Gomes de Miranda", filial: "5070", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 7": { tecnico: "Alisson Terencio Santos", filial: "5070", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Setor 8": { tecnico: "Gilmario Manoel Alves", filial: "5070", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Volante / Corretivo - Anderson Lemos": { tecnico: "Anderson Lemos", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Volante / Corretivo - Tiago Alves": { tecnico: "Tiago Alves", filial: "5070", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Volante / Corretivo - Alexandre Morais": { tecnico: "Alexandre Morais", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  // Aliases para retrocompatibilidade
  "Corretivo - Anderson Lemos": { tecnico: "Anderson Lemos", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Corretivo - Tiago Alves": { tecnico: "Tiago Alves", filial: "5070", filiais: "5003 / 5070", zona: "Zona 2 - Norte" },
  "Corretivo - Alexandre Morais": { tecnico: "Alexandre Morais", filial: "5003", filiais: "5003 / 5070", zona: "Zona 2 - Norte" }
};



let currentAuthTab = "MASTER";

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initData();
  setupEventListeners();
  setupAuthEventListeners();
  checkAuthAndRender();
});

/**
 * Inicializa a base de dados (localStorage ou SampleData)
 */
function initData() {
  const savedData = localStorage.getItem("TKE_MAINTENANCE_DATA_V9") || 
                    localStorage.getItem("TKE_MAINTENANCE_DATA_V8") || 
                    localStorage.getItem("TKE_MAINTENANCE_DATA_V7");
  if (savedData) {
    try {
      AppState.data = JSON.parse(savedData);
    } catch (e) {
      AppState.data = [...SAMPLE_MAINTENANCE_DATA];
    }
  } else {
    AppState.data = [...SAMPLE_MAINTENANCE_DATA];
  }

  // Normalização profunda de todos os registros: técnico único, matrícula, filial, setor, contrato, zona e código de falha
  AppState.data.forEach((item, idx) => {
    item.tecnico = normalizeTechName(item.tecnico) || "Lucas Rodrigues Baccega";

    // Migração de setores legados
    if (item.setor === "Corretivo - Anderson Lemos") item.setor = "Volante / Corretivo - Anderson Lemos";
    if (item.setor === "Corretivo - Tiago Alves") item.setor = "Volante / Corretivo - Tiago Alves";
    if (item.setor === "Corretivo - Alexandre Morais") item.setor = "Volante / Corretivo - Alexandre Morais";

    if (!item.filial) {
      item.filial = idx % 2 === 0 ? "5003" : "5070";
    }
    if (!item.zonaOperacional) {
      item.zonaOperacional = "Zona 2 - Norte";
    }
    if (!item.setor) {
      item.setor = `Setor ${(idx % 8) + 1}`;
    }
    if (!item.contrato) {
      item.contrato = (typeof CLIENT_CONTRACT_MAP !== "undefined" && CLIENT_CONTRACT_MAP[item.cliente]) || "Premium";
    }
    item.matricula = getTechMatricula(item.tecnico);
    if (!item.solicitacao) {
      item.solicitacao = item.descricao && item.descricao.includes(".") ? item.descricao.split(".")[0] + "." : (item.descricao || "Chamado de manutenção");
    }
    if (!item.codigoFalha) {
      const detected = findFailureCodeByText(`${item.descricao || ""} ${item.solicitacao || ""}`);
      if (detected) {
        item.codigoFalha = detected.code;
        item.descricaoFalha = detected.name;
        item.zona = detected.zone;
      }
    }
    if (!item.zona) {
      item.zona = normalizeZoneName(item.zona) || classifyZone(item.descricao, item.solicitacao);
    } else {
      item.zona = normalizeZoneName(item.zona) || item.zona;
    }
  });

  saveDataToStorage();

  // Identificar primeiro técnico disponível para a visão técnica
  const techs = getUniqueTechnicians();
  if (techs.length > 0 && (!AppState.selectedTech || !techs.includes(AppState.selectedTech))) {
    AppState.selectedTech = techs[0];
  }
}

function saveDataToStorage() {
  localStorage.setItem("TKE_MAINTENANCE_DATA_V9", JSON.stringify(AppState.data));
}

/**
 * Retorna a lista desduplicada e normalizada de todos os técnicos (sem repetição de maiúsculas/minúsculas ou variações de nome)
 */
function getUniqueTechnicians() {
  const map = new Map(); // chave minúscula -> nome canônico

  AppState.data.forEach(d => {
    const norm = normalizeTechName(d.tecnico);
    if (norm && !map.has(norm.toLowerCase())) {
      map.set(norm.toLowerCase(), norm);
    }
  });

  // Garantir a presença dos 11 técnicos oficiais da TKE
  const officialTechs = [
    "Lucas Rodrigues Baccega",
    "Elton Gomes",
    "Willian Wallace da Silva",
    "Allison Oliveira Carvalho",
    "Douglas Geraldin Bispo",
    "Jose Gomes de Miranda",
    "Alisson Terencio Santos",
    "Gilmario Manoel Alves",
    "Anderson Lemos",
    "Tiago Alves",
    "Alexandre Morais"
  ];

  officialTechs.forEach(t => {
    if (!map.has(t.toLowerCase())) {
      map.set(t.toLowerCase(), t);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Listeners para o Portal de Autenticação Segura e Gestão de Usuários
 */
function setupAuthEventListeners() {
  const tabMaster = document.getElementById("tab-auth-master");
  const tabTecnico = document.getElementById("tab-auth-tecnico");
  const formAuth = document.getElementById("form-auth-login");
  const btnLogout = document.getElementById("btn-logout");
  const btnUserMgmt = document.getElementById("btn-user-management");

  tabMaster?.addEventListener("click", () => selectAuthTab("MASTER"));
  tabTecnico?.addEventListener("click", () => selectAuthTab("TECNICO"));

  // Alternância de visibilidade de senhas
  document.querySelectorAll(".btn-toggle-pass").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target") || "input-auth-password";
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        const isPass = targetInput.getAttribute("type") === "password";
        targetInput.setAttribute("type", isPass ? "text" : "password");
        btn.textContent = isPass ? "🙈" : "👁️";
      }
    });
  });

  formAuth?.addEventListener("submit", handleLoginSubmit);
  btnLogout?.addEventListener("click", handleLogout);

  // Listeners do Modal de Primeiro Acesso (Troca Obrigatória)
  const formFirstAccess = document.getElementById("form-first-access-reset");
  const firstAccessNewPass = document.getElementById("first-access-new-pass");
  const firstAccessConfirmPass = document.getElementById("first-access-confirm-pass");
  const firstAccessTempPass = document.getElementById("first-access-temp-pass");
  const btnCancelFirstAccess = document.getElementById("btn-cancel-first-access");

  formFirstAccess?.addEventListener("submit", handleFirstAccessResetSubmit);
  firstAccessNewPass?.addEventListener("input", updateFirstAccessStrengthUI);
  firstAccessConfirmPass?.addEventListener("input", updateFirstAccessStrengthUI);
  firstAccessTempPass?.addEventListener("input", updateFirstAccessStrengthUI);
  btnCancelFirstAccess?.addEventListener("click", closeFirstAccessModal);

  // Listeners do Modal de Redefinição de Senha (Após 1º acesso / Esqueci a senha)
  const formResetPassword = document.getElementById("form-reset-password");
  const inputResetNewPass = document.getElementById("input-reset-new-pass");
  const inputResetConfirmPass = document.getElementById("input-reset-confirm-pass");
  const inputResetCurrentPass = document.getElementById("input-reset-current-pass");

  formResetPassword?.addEventListener("submit", handleResetPasswordSubmit);
  inputResetNewPass?.addEventListener("input", updateResetPasswordStrengthUI);
  inputResetConfirmPass?.addEventListener("input", updateResetPasswordStrengthUI);
  inputResetCurrentPass?.addEventListener("input", updateResetPasswordStrengthUI);

  // Listeners do Módulo Administrativo de Gestão de Usuários (Supervisor)
  btnUserMgmt?.addEventListener("click", openUserManagementModal);
  document.getElementById("btn-open-new-user-form")?.addEventListener("click", () => openUserFormModal("create"));
  document.getElementById("btn-export-users-csv")?.addEventListener("click", exportUsersContactsCSV);
  document.getElementById("btn-open-upload-users")?.addEventListener("click", openUploadUsersModal);
  document.getElementById("form-upload-users")?.addEventListener("submit", handleUploadUsersSubmit);
  document.getElementById("input-search-users")?.addEventListener("input", renderUserManagementTable);
  document.getElementById("select-filter-user-role")?.addEventListener("change", renderUserManagementTable);
  document.getElementById("select-filter-user-status")?.addEventListener("change", renderUserManagementTable);
  document.getElementById("form-collaborator")?.addEventListener("submit", handleCollaboratorFormSubmit);

  // Drag and Drop para Zona de Upload de Contatos
  const dropZoneUsers = document.getElementById("drop-zone-users");
  if (dropZoneUsers) {
    ["dragenter", "dragover"].forEach(evt => {
      dropZoneUsers.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZoneUsers.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(evt => {
      dropZoneUsers.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZoneUsers.classList.remove("dragover");
      });
    });
    dropZoneUsers.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const file = dt?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const textarea = document.getElementById("textarea-upload-users-content");
          if (textarea) textarea.value = ev.target.result;
          showToast(`📁 Arquivo "${file.name}" carregado! Clique em 'Processar e Cadastrar'.`);
        };
        reader.readAsText(file, "UTF-8");
      }
    });
  }
  
  // Gerador automático de senha provisória forte
  document.getElementById("btn-generate-random-pass")?.addEventListener("click", () => {
    const inputTemp = document.getElementById("input-user-temp-pass");
    if (inputTemp) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      inputTemp.value = `Plano@${randomSuffix}${randomLetter}`;
      showToast(`Senha gerada: ${inputTemp.value}`);
    }
  });
}

function selectAuthTab(tab) {
  currentAuthTab = tab;
  const tabMaster = document.getElementById("tab-auth-master");
  const tabTecnico = document.getElementById("tab-auth-tecnico");
  const roleDesc = document.getElementById("auth-role-description");
  const errorAlert = document.getElementById("auth-error-alert");

  if (errorAlert) errorAlert.style.display = "none";

  if (tab === "MASTER") {
    tabMaster?.classList.add("active");
    tabTecnico?.classList.remove("active");
    if (roleDesc) {
      roleDesc.innerHTML = `<strong>🛡️ Acesso Master (Gestão/PCM):</strong> Visão irrestrita de todos os clientes, elevadores, 11 técnicos, métricas globais e matriz T&D.`;
    }
  } else {
    tabMaster?.classList.remove("active");
    tabTecnico?.classList.add("active");
    if (roleDesc) {
      roleDesc.innerHTML = `<strong>🔧 Acesso Técnico (Operacional/Campo):</strong> Privacidade estrita (apenas seus próprios atendimentos e planos de ação obrigatórios).`;
    }
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("input-auth-username")?.value;
  const password = document.getElementById("input-auth-password")?.value;
  const errorAlert = document.getElementById("auth-error-alert");

  const result = AuthManager.login(username, password);

  // Interceptação Obrigatória: Se primeiro_acesso == true, direciona para redefinição
  if (result.requirePasswordReset) {
    if (errorAlert) errorAlert.style.display = "none";
    openFirstAccessModal(result.user, password);
    return;
  }

  if (result.success) {
    if (errorAlert) errorAlert.style.display = "none";
    showToast(`Bem-vindo, ${result.user.nome}!`);
    checkAuthAndRender();

    // Notificações proativas conforme perfil
    if (result.user.role === "MASTER") {
      const expired = ActionPlanManager.getExpiredPlansList();
      if (expired.length > 0) {
        setTimeout(() => {
          showToast(`🚨 Alerta Gestor: ${expired.length} plano(s) de ação com prazo de execução expirado!`);
        }, 600);
      }
    } else if (result.user.role === "TECNICO") {
      const myRecords = AppState.data.filter(r => r.tecnico === result.user.techName);
      const myRecurrence = analyzeEquipmentRecurrence(myRecords);
      const { pendingList, expiredList } = ActionPlanManager.getTechPendingAndExpiredPlans(result.user.techName, myRecurrence);
      if (pendingList.length > 0 || expiredList.length > 0) {
        setTimeout(() => {
          const parts = [];
          if (pendingList.length > 0) parts.push(`${pendingList.length} plano(s) pendente(s)`);
          if (expiredList.length > 0) parts.push(`${expiredList.length} vencido(s)`);
          showToast(`⚠️ Alerta Técnico: Você possui ${parts.join(" e ")}. Preenchimento imediato requerido!`);
        }, 600);
      }
    }
  } else {
    if (errorAlert) {
      errorAlert.textContent = `⚠️ ${result.message || "Credenciais inválidas."}`;
      errorAlert.style.display = "block";
    }
  }
}

function handleLogout() {
  if (confirm("Deseja realmente encerrar a sessão segura?")) {
    AuthManager.logout();
    AppState.currentUser = null;
    showToast("Sessão encerrada com segurança.");
    checkAuthAndRender();
  }
}

/**
 * Valida o estado de autenticação e renderiza a visão autorizada
 */
function checkAuthAndRender() {
  const authOverlay = document.getElementById("auth-portal-overlay");
  const firstAccessOverlay = document.getElementById("modal-first-access-password");
  const userSessionInfo = document.getElementById("user-session-info");
  const btnLogout = document.getElementById("btn-logout");
  const btnUserMgmt = document.getElementById("btn-user-management");
  const profileToggleContainer = document.getElementById("profile-pill-toggle-container");
  const techSelectorWrapper = document.getElementById("tech-selector-wrapper");
  const btnResetData = document.getElementById("btn-reset-data");
  const btnImportData = document.getElementById("btn-import-data");
  const masterView = document.getElementById("master-view");
  const techView = document.getElementById("technician-view");

  const user = AuthManager.getCurrentUser();
  AppState.currentUser = user;

  if (!user) {
    // Exibir tela de login e ocultar dashboard
    if (authOverlay) authOverlay.style.display = "flex";
    if (firstAccessOverlay) firstAccessOverlay.style.display = "none";
    if (userSessionInfo) userSessionInfo.style.display = "none";
    if (btnLogout) btnLogout.style.display = "none";
    if (btnUserMgmt) btnUserMgmt.style.display = "none";
    if (profileToggleContainer) profileToggleContainer.style.display = "none";
    if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
    if (masterView) masterView.style.display = "none";
    if (techView) techView.style.display = "none";
    selectAuthTab(currentAuthTab);
    return;
  }

  // Usuário Autenticado
  if (authOverlay) authOverlay.style.display = "none";
  if (firstAccessOverlay) firstAccessOverlay.style.display = "none";
  if (userSessionInfo) userSessionInfo.style.display = "flex";
  if (btnLogout) btnLogout.style.display = "inline-flex";

  // Preencher dados da sessão na navbar
  const avatarEl = document.getElementById("user-session-avatar");
  const nameEl = document.getElementById("user-session-name");
  const roleEl = document.getElementById("user-session-role");

  if (avatarEl) avatarEl.textContent = user.avatar || (user.role === "MASTER" ? "🛡️" : "🔧");
  if (nameEl) nameEl.textContent = user.nome;
  if (roleEl) {
    if (user.role === "MASTER") {
      roleEl.innerHTML = `🛡️ <strong>Matrícula: ${user.matricula || "10001"}</strong> • ${user.cargo || "PCM & Engenharia"} • Filiais ${user.filial || "5003 / 5070"}`;
    } else {
      const techMat = user.matricula || getTechMatricula(user.techName || user.nome);
      roleEl.innerHTML = `🔧 <strong>Matrícula: ${techMat}</strong> • ${user.setor} • Filiais ${user.filial || "5003 / 5070"}`;
    }
  }

  if (user.role === "MASTER") {
    // Perfil MASTER / SUPERVISOR: Acesso irrestrito e Gestão de Usuários
    AppState.profile = "MASTER";
    if (btnUserMgmt) btnUserMgmt.style.display = "inline-flex";
    if (profileToggleContainer) profileToggleContainer.style.display = "inline-flex";
    if (techSelectorWrapper) techSelectorWrapper.style.display = "flex";
    if (btnResetData) btnResetData.style.display = "inline-flex";
    if (btnImportData) btnImportData.style.display = "inline-flex";
    populateTechnicianDropdown();
    switchProfile("MASTER");
  } else {
    // Perfil TÉCNICO: Trava estrita de segurança e privacidade (apenas seus próprios atendimentos)
    AppState.profile = "TECNICO";
    AppState.selectedTech = user.techName;
    if (btnUserMgmt) btnUserMgmt.style.display = "none";
    if (profileToggleContainer) profileToggleContainer.style.display = "none";
    if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
    if (btnResetData) btnResetData.style.display = "none";
    if (btnImportData) btnImportData.style.display = "none";
    switchProfile("TECNICO");
  }
}

/**
 * Configuração de Listeners de Eventos Gerais
 */
function setupEventListeners() {
  // Comutador de Perfil (Apenas Master pode alternar livremente)
  document.getElementById("btn-mode-master")?.addEventListener("click", () => {
    if (AppState.currentUser?.role === "MASTER") {
      AppState.selectedTech = null;
      switchProfile("MASTER");
    }
  });
  document.getElementById("btn-mode-tecnico")?.addEventListener("click", () => {
    if (AppState.currentUser?.role === "MASTER") {
      if (!AppState.selectedTech) {
        const allTechs = getUniqueTechnicians();
        AppState.selectedTech = allTechs[0] || "Lucas Rodrigues Baccega";
      }
      switchProfile("TECNICO");
    }
  });

  // Seletor de Técnico no Header (Acesso rápido ao modo de filtro de perfil de todos os técnicos)
  const techSelect = document.getElementById("select-technician");
  techSelect?.addEventListener("change", (e) => {
    if (AppState.currentUser?.role === "MASTER") {
      const selectedVal = e.target.value;
      if (selectedVal === "ALL") {
        AppState.selectedTech = null;
        switchProfile("MASTER");
      } else {
        AppState.selectedTech = selectedVal;
        switchProfile("TECNICO");
      }
    }
  });

  // Filtro de Busca Geral
  document.getElementById("input-search")?.addEventListener("input", (e) => {
    AppState.searchFilter = e.target.value.toLowerCase();
    renderActiveView();
  });

  // Filtros Hierárquicos Operacionais TKE
  document.getElementById("select-filial-filter")?.addEventListener("change", (e) => {
    AppState.filialFilter = e.target.value;
    renderActiveView();
  });

  document.getElementById("select-zona-op-filter")?.addEventListener("change", (e) => {
    AppState.zonaOpFilter = e.target.value;
    renderActiveView();
  });

  document.getElementById("select-setor-filter")?.addEventListener("change", (e) => {
    AppState.setorFilter = e.target.value;
    renderActiveView();
  });

  // Filtro de Zona Física da Falha
  document.getElementById("select-zone-filter")?.addEventListener("change", (e) => {
    AppState.zoneFilter = e.target.value;
    renderActiveView();
  });

  // Filtro de Tipo de Contrato
  document.getElementById("select-contrato-filter")?.addEventListener("change", (e) => {
    AppState.contratoFilter = e.target.value;
    renderActiveView();
  });

  // Filtro por Quantidade de Chamados Corretivos
  document.getElementById("select-qtd-filter")?.addEventListener("change", (e) => {
    AppState.qtdChamadosFilter = e.target.value;
    renderActiveView();
  });

  // Filtros Locais do Histórico de Atendimentos (Técnico e Edifício)
  const onHistoryFilterChange = (techVal, buildingVal) => {
    if (techVal !== undefined) AppState.historyTechFilter = techVal;
    if (buildingVal !== undefined) AppState.historyBuildingFilter = buildingVal;

    const masterTech = document.getElementById("select-history-tech-filter");
    const masterBuilding = document.getElementById("select-history-building-filter");
    const techTech = document.getElementById("select-tech-history-tech-filter");
    const techBuilding = document.getElementById("select-tech-history-building-filter");

    if (masterTech && masterTech.value !== AppState.historyTechFilter) masterTech.value = AppState.historyTechFilter;
    if (techTech && techTech.value !== AppState.historyTechFilter) techTech.value = AppState.historyTechFilter;
    if (masterBuilding && masterBuilding.value !== AppState.historyBuildingFilter) masterBuilding.value = AppState.historyBuildingFilter;
    if (techBuilding && techBuilding.value !== AppState.historyBuildingFilter) techBuilding.value = AppState.historyBuildingFilter;

    if (AppState.currentUser?.role === "MASTER" || AppState.profile === "MASTER") {
      const masterRecords = getFilteredData(false);
      renderMasterHistoryTable(masterRecords);
    } else {
      renderTechHistoryTable(AppState.data, AppState.selectedTech || AppState.currentUser?.techName);
    }
  };

  document.getElementById("select-history-tech-filter")?.addEventListener("change", (e) => onHistoryFilterChange(e.target.value, undefined));
  document.getElementById("select-history-building-filter")?.addEventListener("change", (e) => onHistoryFilterChange(undefined, e.target.value));
  document.getElementById("select-tech-history-tech-filter")?.addEventListener("change", (e) => onHistoryFilterChange(e.target.value, undefined));
  document.getElementById("select-tech-history-building-filter")?.addEventListener("change", (e) => onHistoryFilterChange(undefined, e.target.value));

  // Filtros por Técnico para Falhas por Zona Física (Master e Técnico)
  document.getElementById("select-master-zone-tech-filter")?.addEventListener("change", (e) => {
    AppState.masterZoneTechFilter = e.target.value;
    renderMasterZoneChart();
  });

  document.getElementById("select-tech-zone-tech-filter")?.addEventListener("change", (e) => {
    AppState.techZoneTechFilter = e.target.value;
    renderTechZoneAndDiagnostic();
  });

  // Botões de Ação Global
  document.getElementById("btn-add-os")?.addEventListener("click", openAddOSModal);
  document.getElementById("btn-import-data")?.addEventListener("click", openImportModal);
  document.getElementById("btn-export-csv")?.addEventListener("click", exportDataCSV);
  document.getElementById("btn-reset-data")?.addEventListener("click", resetSampleData);

  // Alternador de Visualização do Painel de Reincidências Master (Tabela vs Dashboard vs Gráfico Pizza)
  document.getElementById("btn-view-table")?.addEventListener("click", () => setRecurrenceViewMode("table"));
  document.getElementById("btn-view-dashboard")?.addEventListener("click", () => setRecurrenceViewMode("dashboard"));
  document.getElementById("btn-view-pie")?.addEventListener("click", () => setRecurrenceViewMode("pie"));

  // Alternador de Visualização do Painel do Técnico (Cards vs Gráfico Pizza)
  document.getElementById("btn-tech-view-cards")?.addEventListener("click", () => setTechRecurrenceViewMode("cards"));
  document.getElementById("btn-tech-view-pie")?.addEventListener("click", () => setTechRecurrenceViewMode("pie"));

  // Submissão do Formulário de Nova OS
  document.getElementById("form-add-os")?.addEventListener("submit", handleAddOSSubmit);

  // Submissão do Formulário de Importação
  document.getElementById("form-import-data")?.addEventListener("submit", handleImportSubmit);

  // Alternância de Tema (Modo Escuro / Modo Claro)
  document.getElementById("btn-theme-toggle")?.addEventListener("click", toggleTheme);

  // Submissão e Auditoria do Plano de Ação (Prompt 4)
  document.getElementById("form-action-plan")?.addEventListener("submit", handleActionPlanSubmit);
  document.getElementById("btn-suggest-plan")?.addEventListener("click", handleSuggestPlan);
  document.getElementById("btn-print-plan")?.addEventListener("click", handlePrintCurrentPlan);
  document.getElementById("btn-audit-plan")?.addEventListener("click", handleAuditPlan);

  // Inicializar dropdown de códigos de falhas oficiais TKE (4 Zonas)
  initFailureCodeDropdown();

  // Live Zone Classifier e Código Oficial no modal de Nova OS
  const descInput = document.getElementById("os-descricao");
  const solInput = document.getElementById("os-solicitacao");
  const failureSelect = document.getElementById("os-codigo-falha");
  const zonePreview = document.getElementById("os-zona-preview");

  const updateLiveZone = () => {
    if (zonePreview) {
      const text = `${solInput?.value || ""} ${descInput?.value || ""}`.trim();
      const detected = classifyFailure(text);
      if (failureSelect && detected.codigo !== "N/D" && (!failureSelect.value || failureSelect.value !== detected.codigo)) {
        failureSelect.value = detected.codigo;
      }
      const codeBadge = detected.codigo !== "N/D" ? `<span class="badge-failure-code">Cód. ${detected.codigo}</span>` : "";
      zonePreview.innerHTML = `<span>Zona Detectada: <strong>${detected.zonaIdentificada}</strong></span> ${codeBadge}`;
    }
  };

  failureSelect?.addEventListener("change", (e) => {
    const code = e.target.value;
    if (code) {
      const found = (typeof TKE_FAILURE_CODES !== "undefined") ? TKE_FAILURE_CODES.find(f => f.code === code) : null;
      if (found) {
        if (zonePreview) {
          zonePreview.innerHTML = `<span>Zona Detectada: <strong>${found.zone}</strong></span> <span class="badge-failure-code">Cód. ${found.code}</span>`;
        }
        if (solInput && !solInput.value) {
          solInput.value = found.name;
        }
      }
    } else {
      updateLiveZone();
    }
  });

  descInput?.addEventListener("input", updateLiveZone);
  solInput?.addEventListener("input", updateLiveZone);

  // Auto-preenchimento do contrato e técnico ao digitar o cliente ou trocar setor no modal de Nova OS
  const modalClienteInput = document.getElementById("os-cliente");
  modalClienteInput?.addEventListener("input", (e) => {
    const typed = e.target.value.trim();
    if (typeof CLIENT_CONTRACT_MAP !== "undefined" && CLIENT_CONTRACT_MAP[typed]) {
      const modalContratoSelect = document.getElementById("os-contrato");
      if (modalContratoSelect) modalContratoSelect.value = CLIENT_CONTRACT_MAP[typed];
    }
  });

  // Auto-preenchimento do técnico e filial ao trocar o setor no modal de Nova OS
  const modalSetorSelect = document.getElementById("os-setor");
  modalSetorSelect?.addEventListener("change", (e) => {
    const selectedSetor = e.target.value;
    const mapping = TKE_SECTOR_TECH_MAP[selectedSetor];
    if (mapping) {
      const modalTechSelect = document.getElementById("os-tecnico");
      if (modalTechSelect && !modalTechSelect.disabled) modalTechSelect.value = mapping.tecnico;
      const modalFilialSelect = document.getElementById("os-filial");
      if (modalFilialSelect && !modalFilialSelect.disabled) modalFilialSelect.value = mapping.filial;
    }
  });
}

/**
 * Alterna perfil entre MASTER e TECNICO
 */
function switchProfile(profile) {
  // Se for usuário Técnico, sempre manter travado no perfil Técnico
  if (AppState.currentUser && AppState.currentUser.role === "TECNICO") {
    profile = "TECNICO";
    AppState.selectedTech = AppState.currentUser.techName;
  }

  AppState.profile = profile;
  AppState.masterZoneTechFilter = "ALL";
  AppState.techZoneTechFilter = null;

  const btnMaster = document.getElementById("btn-mode-master");
  const btnTecnico = document.getElementById("btn-mode-tecnico");
  const btnImportData = document.getElementById("btn-import-data");
  const techSelectorWrapper = document.getElementById("tech-selector-wrapper");
  const profileBanner = document.getElementById("profile-banner");

  // No perfil Master, manter SEMPRE disponível o seletor de perfil de todos os técnicos no topo
  if (AppState.currentUser?.role === "MASTER") {
    if (techSelectorWrapper) techSelectorWrapper.style.display = "flex";
    populateTechnicianDropdown();
  } else {
    if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
  }

  if (profile === "MASTER") {
    btnMaster?.classList.add("active");
    btnTecnico?.classList.remove("active");
    if (btnImportData) btnImportData.style.display = "inline-flex";
    if (profileBanner) {
      profileBanner.innerHTML = `<span class="badge badge-master">🛡️ MODO MASTER: Gestão de Confiabilidade & PCM (Visão Consolidada)</span>`;
    }
  } else {
    btnMaster?.classList.remove("active");
    btnTecnico?.classList.add("active");
    if (btnImportData) btnImportData.style.display = "none"; // Ocultar botão de importar para o perfil técnico

    if (profileBanner) {
      const techDisplay = AppState.currentUser?.role === "TECNICO" ? AppState.currentUser.nome : AppState.selectedTech;
      profileBanner.innerHTML = `<span class="badge badge-tech">🔧 MODO TÉCNICO: Visão Restrita de Campo • ${techDisplay}</span>`;
    }
  }

  renderActiveView();
}

function populateTechnicianDropdown() {
  const select = document.getElementById("select-technician");
  if (!select) return;

  const techs = getUniqueTechnicians();
  let optionsHtml = "";

  // Se o usuário logado for Master, disponibilizar opção de Visão Geral e os perfis individuais
  if (AppState.currentUser?.role === "MASTER") {
    const isMaster = AppState.profile === "MASTER";
    optionsHtml += `<option value="ALL" ${isMaster ? "selected" : ""}>🌐 Todos os Técnicos (Visão Geral Master)</option>`;
  }

  techs.forEach(t => {
    // Buscar filiais/setores associados a este técnico para exibir no dropdown
    const techOS = AppState.data.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === t);
    const filial = techOS[0]?.filial ? `Filial ${techOS[0].filial}` : "";
    const setores = Array.from(new Set(techOS.map(r => r.setor).filter(Boolean))).join(", ");
    const info = [filial, setores].filter(Boolean).join(" • ");
    const isSelected = AppState.profile === "TECNICO" && t === AppState.selectedTech;

    optionsHtml += `<option value="${t}" ${isSelected ? "selected" : ""}>🔧 Perfil: ${t} ${info ? `(${info})` : ""}</option>`;
  });

  select.innerHTML = optionsHtml;
}

/**
 * Permite ao perfil Master abrir diretamente o perfil individual de qualquer técnico com 1 clique
 */
window.openTechProfileFromMaster = function(techName) {
  if (AppState.currentUser?.role === "MASTER") {
    AppState.selectedTech = normalizeTechName(techName) || techName;
    switchProfile("TECNICO");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

/**
 * Preenche o seletor de códigos de falha oficial TKE categorizado pelas 4 zonas
 */
function initFailureCodeDropdown() {
  const select = document.getElementById("os-codigo-falha");
  if (!select) return;

  const grouped = {
    [ZONES.OUTROS]: [],
    [ZONES.CASA_MAQUINAS]: [],
    [ZONES.CABINA]: [],
    [ZONES.PAVIMENTO_CAIXA]: []
  };

  if (typeof TKE_FAILURE_CODES !== "undefined") {
    TKE_FAILURE_CODES.forEach(item => {
      if (grouped[item.zone]) {
        grouped[item.zone].push(item);
      }
    });
  }

  let optionsHtml = `<option value="">⚡ Detecção Automática por Sintoma / Descrição</option>`;

  const zoneLabels = {
    [ZONES.OUTROS]: "ZONA 1: OUTROS (Atendimentos Gerais, Rotinas e Inspeções)",
    [ZONES.CASA_MAQUINAS]: "ZONA 2: CASA DE MÁQUINAS (CM)",
    [ZONES.CABINA]: "ZONA 3: CABINA",
    [ZONES.PAVIMENTO_CAIXA]: "ZONA 4: PAVIMENTO / CAIXA DE CORRIDA"
  };

  for (const [zone, list] of Object.entries(grouped)) {
    if (list.length > 0) {
      optionsHtml += `<optgroup label="${zoneLabels[zone] || zone}">`;
      list.forEach(item => {
        optionsHtml += `<option value="${item.code}">${item.code} - ${item.name}</option>`;
      });
      optionsHtml += `</optgroup>`;
    }
  }

  select.innerHTML = optionsHtml;
}

/**
 * Popula os dropdowns de filtro por técnico nas seções de Distribuição de Falhas por Zona
 * (Tanto para a Visão Master quanto para a Visão Técnico)
 */
function populateZoneTechFilters() {
  const allTechs = getUniqueTechnicians();

  // 1. Dropdown na Visão Master
  const masterSelect = document.getElementById("select-master-zone-tech-filter");
  if (masterSelect) {
    const currentVal = masterSelect.value || AppState.masterZoneTechFilter || "ALL";
    masterSelect.innerHTML = `<option value="ALL">🔧 Todos os Técnicos (Visão Geral)</option>` +
      allTechs.map(t => `<option value="${t}">🔧 ${t}</option>`).join("");
    if (allTechs.includes(currentVal) || currentVal === "ALL") {
      masterSelect.value = currentVal;
    } else {
      masterSelect.value = "ALL";
    }
  }

  // 2. Dropdown na Visão Técnico
  const techSelect = document.getElementById("select-tech-zone-tech-filter");
  if (techSelect) {
    const loggedTechName = AppState.currentUser?.role === "TECNICO" 
      ? (normalizeTechName(AppState.currentUser.techName) || AppState.currentUser.techName)
      : (normalizeTechName(AppState.selectedTech) || "Lucas Rodrigues Baccega");
    const currentVal = techSelect.value || AppState.techZoneTechFilter || loggedTechName;

    let techOptions = "";
    if (loggedTechName) {
      techOptions += `<option value="${loggedTechName}">👤 ${loggedTechName} (Você)</option>`;
    }
    
    // Filtrar rigorosamente para NUNCA REPETIR o mesmo técnico (comparação case-insensitive e normalizada)
    allTechs.filter(t => t.toLowerCase() !== (loggedTechName || "").toLowerCase()).forEach(t => {
      techOptions += `<option value="${t}">🔧 ${t}</option>`;
    });
    techOptions += `<option value="ALL">🌐 Todos os Técnicos (Visão Geral)</option>`;

    techSelect.innerHTML = techOptions;
    if (allTechs.includes(currentVal) || currentVal === "ALL") {
      techSelect.value = currentVal;
    } else if (loggedTechName) {
      techSelect.value = loggedTechName;
    }
  }
}

/**
 * Renderiza o gráfico Doughnut de Falhas por Zona na Visão Master considerando o filtro de técnico
 */
function renderMasterZoneChart() {
  const records = getFilteredData(false);
  let masterZoneRecords = records;
  if (AppState.masterZoneTechFilter && AppState.masterZoneTechFilter !== "ALL") {
    const filterTech = normalizeTechName(AppState.masterZoneTechFilter);
    masterZoneRecords = masterZoneRecords.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === filterTech);
  }
  const zoneCounts = { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 };
  masterZoneRecords.forEach(r => {
    const z = normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao);
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  });

  ChartManager.renderZoneDoughnut("chart-master-zones", zoneCounts);
}

/**
 * Renderiza o gráfico Doughnut e a Matriz de Auto-Aprimoramento na Visão Técnico considerando o filtro de técnico
 */
function renderTechZoneAndDiagnostic() {
  const loggedTechName = AppState.currentUser?.role === "TECNICO" 
    ? (normalizeTechName(AppState.currentUser.techName) || AppState.currentUser.techName)
    : (normalizeTechName(AppState.selectedTech) || "Lucas Rodrigues Baccega");
  if (!loggedTechName) return;

  const selectedZoneTech = AppState.techZoneTechFilter || loggedTechName;

  // Atualizar títulos dinamicamente para clareza
  const titleChart = document.getElementById("title-tech-zone-chart");
  const titleDiag = document.getElementById("title-tech-diagnostic");
  const descDiag = document.getElementById("desc-tech-diagnostic");

  if (titleChart) {
    if (selectedZoneTech === loggedTechName) {
      titleChart.textContent = "📍 2. Minhas Falhas por Zona Física";
    } else if (selectedZoneTech === "ALL") {
      titleChart.textContent = "📍 2. Falhas por Zona Física (Geral da Equipe)";
    } else {
      titleChart.textContent = `📍 2. Falhas por Zona Física (${selectedZoneTech})`;
    }
  }

  if (titleDiag) {
    if (selectedZoneTech === loggedTechName) {
      titleDiag.textContent = "📋 Diagnóstico dos Meus Atendimentos";
    } else if (selectedZoneTech === "ALL") {
      titleDiag.textContent = "📋 Diagnóstico Geral por Zona Física";
    } else {
      titleDiag.textContent = `📋 Diagnóstico de Atendimentos (${selectedZoneTech})`;
    }
  }

  if (descDiag) {
    if (selectedZoneTech === loggedTechName) {
      descDiag.textContent = "Acompanhe a proporção de intervenções em Outros, Casa de Máquinas, Cabina e Pavimento / Caixa de corrida para calibrar sua rotina preventiva.";
    } else {
      descDiag.textContent = `Análise e proporção de intervenções por zona física para ${selectedZoneTech === 'ALL' ? 'toda a equipe' : selectedZoneTech}.`;
    }
  }

  // Filtrar registros para a análise de zona
  let zoneRecords = AppState.data;
  if (selectedZoneTech !== "ALL") {
    const filterTech = normalizeTechName(selectedZoneTech);
    zoneRecords = zoneRecords.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === filterTech);
  }

  const zoneRecurrenceList = analyzeEquipmentRecurrence(zoneRecords);
  const zonePerformanceList = analyzeTechniciansPerformance(zoneRecords);

  const zonePerf = selectedZoneTech === "ALL"
    ? {
        nome: "Todos os Técnicos",
        totalChamados: zoneRecords.length,
        clientes: Array.from(new Set(zoneRecords.map(r => r.cliente))),
        zonas: {
          [ZONES.OUTROS]: zoneRecords.filter(r => (normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao)) === ZONES.OUTROS).length,
          [ZONES.CASA_MAQUINAS]: zoneRecords.filter(r => (normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao)) === ZONES.CASA_MAQUINAS).length,
          [ZONES.CABINA]: zoneRecords.filter(r => (normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao)) === ZONES.CABINA).length,
          [ZONES.PAVIMENTO_CAIXA]: zoneRecords.filter(r => (normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao)) === ZONES.PAVIMENTO_CAIXA).length
        },
        chamados: zoneRecords
      }
    : (zonePerformanceList.find(p => p.nome === selectedZoneTech) || {
        nome: selectedZoneTech,
        totalChamados: zoneRecords.length,
        clientes: [],
        zonas: { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 },
        chamados: []
      });

  // Renderizar Gráfico Doughnut
  ChartManager.renderZoneDoughnut("chart-tech-zones", zonePerf.zonas);

  // Renderizar Diagnóstico / Auto-Aprimoramento
  renderTechSelfImprovement(zonePerf, zoneRecurrenceList);
}

function renderApp() {
  checkAuthAndRender();
}

function renderActiveView() {
  if (!AppState.currentUser) return;

  if (AppState.profile === "MASTER") {
    document.getElementById("master-view").style.display = "block";
    document.getElementById("technician-view").style.display = "none";
    renderMasterView();
  } else {
    document.getElementById("master-view").style.display = "none";
    document.getElementById("technician-view").style.display = "block";
    renderTechnicianView();
  }
}

/**
 * ========================================================================
 * MODO MASTER: RENDERIZAÇÃO CONSOLIDADA (GESTÃO / PCM)
 * ========================================================================
 */
function renderMasterView() {
  const records = getFilteredData(false);
  const recurrenceList = analyzeEquipmentRecurrence(records);
  ActionPlanManager.autoGeneratePlansForRecurrence(recurrenceList);
  const techPerformance = analyzeTechniciansPerformance(records);
  const trainingMatrix = generateTrainingMatrix(techPerformance, recurrenceList);

  // 1. Atualizar Cards de KPIs Globais e Master Hero KPIs
  const totalOS = records.length;
  const criticalEquipments = recurrenceList.length;
  const totalTechs = techPerformance.length;
  const totalElevators = Array.from(new Set(records.map(r => `${r.cliente} - ${r.equipamento}`))).length;
  const criticalPercentage = totalElevators > 0 ? ((criticalEquipments / totalElevators) * 100).toFixed(1) : "0.0";

  const kpiTotalOS = document.getElementById("kpi-total-os");
  const kpiCritical = document.getElementById("kpi-critical-equipments");
  const kpiTotalTechs = document.getElementById("kpi-total-techs");
  const kpiRate = document.getElementById("kpi-reincidence-rate");

  if (kpiTotalOS) kpiTotalOS.textContent = totalOS;
  if (kpiCritical) kpiCritical.textContent = criticalEquipments;
  if (kpiTotalTechs) kpiTotalTechs.textContent = totalTechs;
  if (kpiRate) kpiRate.textContent = `${criticalPercentage}%`;

  // Atualizar Cards do Hero Master
  const masterHeroTotal = document.getElementById("master-hero-total-os");
  const masterHeroCritical = document.getElementById("master-hero-critical-count");
  const masterHeroRate = document.getElementById("master-hero-reincidence-rate");
  const masterHeroPending = document.getElementById("master-hero-pending-count");
  const masterHeroExpired = document.getElementById("master-hero-expired-count");

  const expiredPlans = ActionPlanManager.getExpiredPlansList(recurrenceList);
  const pendingPlans = recurrenceList.filter(item => {
    const plan = ActionPlanManager.getPlan(`${item.cliente}___${item.equipamento}`);
    return !plan || !plan.causaRaiz;
  });

  if (masterHeroTotal) masterHeroTotal.textContent = totalOS;
  if (masterHeroCritical) masterHeroCritical.textContent = criticalEquipments;
  if (masterHeroRate) masterHeroRate.textContent = `${criticalPercentage}%`;
  if (masterHeroPending) masterHeroPending.textContent = pendingPlans.length;
  if (masterHeroExpired) masterHeroExpired.textContent = expiredPlans.length;

  // Atualizar Dados Técnicos de Gestão no Header Master
  const masterDataContainer = document.getElementById("master-technical-data");
  if (masterDataContainer) {
    const totalClients = Array.from(new Set(records.map(r => r.cliente))).length;
    const totalElevators = Array.from(new Set(records.map(r => `${r.cliente} - ${r.equipamento}`))).length;
    masterDataContainer.innerHTML = `
      <span class="tech-meta-badge">🏢 Filiais de Atuação: <strong>5003 & 5070</strong></span>
      <span class="tech-meta-badge">🗺️ Região: <strong>Zona 2 - Norte</strong></span>
      <span class="tech-meta-badge">📍 Cobertura: <strong>Setores 1 a 8 + Volantes / Corretivos</strong></span>
      <span class="tech-meta-badge">👷 Equipe: <strong>${totalTechs} Técnicos Ativos</strong></span>
      <span class="tech-meta-badge">🛗 Elevadores Monitorados: <strong>${totalElevators} Equipamentos</strong> (${totalClients} Edifícios)</span>
      <span class="tech-meta-badge">🛡️ Nível de Acesso: <strong>Acesso Irrestrito (RBAC Master)</strong></span>
    `;
  }

  // Alerta Crítico para o Login Gestor: Planos de Ação Expirados
  renderMasterExpiredPlansAlert(recurrenceList);

  // 2. Renderizar Tabela de Reincidências Críticas (<30 dias)
  renderMasterRecurrenceTable(recurrenceList);

  // 3. Renderizar Desempenho Individual por Técnico
  renderMasterTechPerformance(techPerformance);

  // 4. Renderizar Matriz de Treinamentos e Desenvolvimento (T&D)
  renderMasterTrainingMatrix(trainingMatrix);

  // 5. Renderizar Gráficos Globais e Falhas por Zona
  populateZoneTechFilters();
  renderMasterZoneChart();
  ChartManager.renderTechZonesStacked("chart-master-tech-zones", techPerformance);

  // 6. Renderizar Histórico Geral de Atendimentos (Visão Master)
  renderMasterHistoryTable(records);
}

/**
 * Renderiza o Banner de Alerta Crítico para o Login Gestor quando houver Planos Expirados
 */
function renderMasterExpiredPlansAlert(recurrenceList) {
  const alertBanner = document.getElementById("master-expired-plans-alert");
  const countBadge = document.getElementById("master-expired-count-badge");
  const listContainer = document.getElementById("master-expired-plans-list");
  const subtitleEl = document.getElementById("master-expired-plans-subtitle");
  if (!alertBanner || !listContainer) return;

  const expiredPlans = ActionPlanManager.getExpiredPlansList(recurrenceList);

  if (expiredPlans.length === 0) {
    alertBanner.style.display = "none";
    return;
  }

  alertBanner.style.display = "block";
  if (countBadge) {
    countBadge.textContent = `${expiredPlans.length} Plano(s) Expirado(s)`;
  }
  if (subtitleEl) {
    subtitleEl.innerHTML = `Identificado(s) <strong>${expiredPlans.length} plano(s) de ação crítico(s)</strong> que ultrapassaram a data de execução prevista sem status de conclusão. Ação imediata de cobrança e auditoria requerida pelo Gestor:`;
  }

  listContainer.innerHTML = expiredPlans.map(item => {
    const formattedDate = formatDate(item.prazoExecucao);
    const daysOverdue = item.daysOverdue || ActionPlanManager.getDaysOverdue(item.prazoExecucao);

    return `
      <div class="alert-expired-card">
        <div class="alert-expired-card-header">
          <div>
            <span class="equipment-tag" style="font-size: 13px; font-weight: 800;">🛗 ${item.equipamento}</span>
          </div>
          <span class="alert-overdue-tag">⏰ Vencido há ${daysOverdue} dia(s)</span>
        </div>
        <div class="alert-expired-card-body">
          <div><strong>🏢 ${item.cliente}</strong></div>
          <div>👤 Técnico: <strong>${item.tecnico || "Não atribuído"}</strong></div>
          <div class="d-flex justify-content-between align-items-center mt-1">
            <span>Prazo: <strong style="color: #fca5a5;">${formattedDate}</strong></span>
            <span class="badge badge-warning" style="font-size: 10px;">${item.status || "Em Elaboração"}</span>
          </div>
        </div>
        <div class="alert-expired-card-footer">
          <small class="text-muted text-xs">Zona: ${item.zonasAfetadas || "Não especificada"}</small>
          <button class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${item.tecnico}', '${item.zonasAfetadas}')">
            ⚠️ Tratar Plano Expirado
          </button>
        </div>
      </div>
    `;
  }).join("");
}

let lastMasterRecurrenceList = [];

function setRecurrenceViewMode(mode) {
  AppState.masterRecurrenceViewMode = mode;
  const btnTable = document.getElementById("btn-view-table");
  const btnDash = document.getElementById("btn-view-dashboard");
  const btnPie = document.getElementById("btn-view-pie");
  const tableCont = document.getElementById("container-recurrence-table");
  const dashCont = document.getElementById("container-recurrence-dashboard");
  const pieCont = document.getElementById("container-recurrence-pie");

  btnTable?.classList.remove("active");
  btnDash?.classList.remove("active");
  btnPie?.classList.remove("active");
  if (tableCont) tableCont.style.display = "none";
  if (dashCont) dashCont.style.display = "none";
  if (pieCont) pieCont.style.display = "none";

  if (mode === "dashboard") {
    btnDash?.classList.add("active");
    if (dashCont) dashCont.style.display = "grid";
  } else if (mode === "pie") {
    btnPie?.classList.add("active");
    if (pieCont) pieCont.style.display = "grid";
    renderRecurrencePieCharts(lastMasterRecurrenceList);
  } else {
    btnTable?.classList.add("active");
    if (tableCont) tableCont.style.display = "block";
  }
}

function renderRecurrencePieCharts(recurrenceList) {
  if (!recurrenceList || recurrenceList.length === 0) return;

  // 1. Contagem de Zonas Físicas das Reincidências
  const zoneCounts = { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 };
  let totalFilial5003 = 0;
  let totalFilial5070 = 0;
  let planosConcluidos = 0;
  let planosExpirados = 0;
  let planosEmAndamento = 0;
  let planosPendentes = 0;

  recurrenceList.forEach(item => {
    item.zonas.forEach(z => {
      const normZ = normalizeZoneName(z) || z;
      if (zoneCounts[normZ] !== undefined) zoneCounts[normZ]++;
    });

    const filial = item.historico[0]?.filial;
    if (filial === "5070") {
      totalFilial5070++;
    } else {
      totalFilial5003++;
    }

    const planKey = `${item.cliente}___${item.equipamento}`;
    const plan = ActionPlanManager.getPlan(planKey);
    if (plan && plan.status === "Concluído") {
      planosConcluidos++;
    } else if (plan && ActionPlanManager.isPlanExpired(plan)) {
      planosExpirados++;
    } else if (plan && (plan.status === "Em Execução" || plan.status === "Reparo" || plan.status === "Aguardando Peças" || plan.status === "Em Elaboração" || plan.causaRaiz)) {
      planosEmAndamento++;
    } else {
      planosPendentes++;
    }
  });

  // Renderizar Gráfico 1: Zonas Físicas (Formato Pizza)
  ChartManager.renderPieChart(
    "chart-recurrence-pie-zones",
    [ZONES.OUTROS, ZONES.CASA_MAQUINAS, ZONES.CABINA, ZONES.PAVIMENTO_CAIXA],
    [
      zoneCounts[ZONES.OUTROS] || 0,
      zoneCounts[ZONES.CASA_MAQUINAS] || 0,
      zoneCounts[ZONES.CABINA] || 0,
      zoneCounts[ZONES.PAVIMENTO_CAIXA] || 0
    ],
    [
      "rgba(148, 163, 184, 0.85)",   // Outros
      "rgba(232, 121, 249, 0.85)",   // Casa de Máquinas
      "rgba(56, 189, 248, 0.85)",    // Cabina
      "rgba(251, 191, 36, 0.85)"     // Pavimento / Caixa de corrida
    ]
  );

  // Renderizar Gráfico 2: Status dos Planos de Ação (Formato Pizza)
  const statusLabels = [];
  const statusData = [];
  const statusColors = [];

  if (planosConcluidos > 0 || (planosExpirados === 0 && planosEmAndamento === 0 && planosPendentes === 0)) {
    statusLabels.push("Plano Concluído");
    statusData.push(planosConcluidos);
    statusColors.push("rgba(16, 185, 129, 0.85)");
  }
  if (planosEmAndamento > 0) {
    statusLabels.push("Em Andamento");
    statusData.push(planosEmAndamento);
    statusColors.push("rgba(56, 189, 248, 0.85)");
  }
  if (planosExpirados > 0) {
    statusLabels.push("⏰ Plano Expirado");
    statusData.push(planosExpirados);
    statusColors.push("rgba(239, 68, 68, 0.85)");
  }
  if (planosPendentes > 0) {
    statusLabels.push("Pendente de Plano");
    statusData.push(planosPendentes);
    statusColors.push("rgba(245, 158, 11, 0.85)");
  }

  // Fallback caso vazio
  if (statusLabels.length === 0) {
    statusLabels.push("Plano Concluído", "Em Andamento", "⏰ Plano Expirado", "Pendente de Plano");
    statusData.push(0, 0, 0, 0);
    statusColors.push("rgba(16, 185, 129, 0.85)", "rgba(56, 189, 248, 0.85)", "rgba(239, 68, 68, 0.85)", "rgba(245, 158, 11, 0.85)");
  }

  ChartManager.renderPieChart(
    "chart-recurrence-pie-status",
    statusLabels,
    statusData,
    statusColors
  );

  // Renderizar Gráfico 3: Filiais (Formato Pizza)
  ChartManager.renderPieChart(
    "chart-recurrence-pie-filial",
    ["Filial 5003", "Filial 5070"],
    [totalFilial5003, totalFilial5070],
    [
      "rgba(255, 87, 34, 0.85)",    // Filial 5003 (Laranja TKE)
      "rgba(123, 31, 162, 0.85)"    // Filial 5070 (Roxo TKE)
    ]
  );
}

let lastTechPieParams = null;

/**
 * Alterna entre Modo Cards e Modo Gráfico Pizza na Visão do Técnico
 */
function setTechRecurrenceViewMode(mode) {
  AppState.techRecurrenceViewMode = mode;
  const btnCards = document.getElementById("btn-tech-view-cards");
  const btnPie = document.getElementById("btn-tech-view-pie");
  const cardsCont = document.getElementById("container-tech-action-plans");
  const pieCont = document.getElementById("container-tech-recurrence-pie");

  btnCards?.classList.remove("active");
  btnPie?.classList.remove("active");
  if (cardsCont) cardsCont.style.display = "none";
  if (pieCont) pieCont.style.display = "none";

  if (mode === "pie") {
    btnPie?.classList.add("active");
    if (pieCont) pieCont.style.display = "grid";
    if (lastTechPieParams) {
      renderTechPieCharts(lastTechPieParams.tech, lastTechPieParams.records, lastTechPieParams.recurrenceList);
    }
  } else {
    btnCards?.classList.add("active");
    if (cardsCont) cardsCont.style.display = "block";
  }
}

/**
 * Renderiza os 3 Gráficos de Pizza do Perfil Técnico:
 * 1. Todos os chamados atendidos nos últimos 30 dias (por zona)
 * 2. Rechamados de 2 ou mais chamados (<30d) vs chamados únicos
 * 3. Status dos Planos de Ação sob sua responsabilidade
 */
function renderTechPieCharts(loggedTechName, myRecords, myRecurrenceList) {
  lastTechPieParams = { tech: loggedTechName, records: myRecords, recurrenceList: myRecurrenceList };

  // 1. Gráfico Pizza 1: Chamados Atendidos nos Últimos 30 Dias por Zona Física
  const zoneCounts = { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 };
  myRecords.forEach(r => {
    const z = normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao);
    if (zoneCounts[z] !== undefined) zoneCounts[z]++;
  });

  ChartManager.renderPieChart(
    "chart-tech-pie-calls",
    [ZONES.OUTROS, ZONES.CASA_MAQUINAS, ZONES.CABINA, ZONES.PAVIMENTO_CAIXA],
    [
      zoneCounts[ZONES.OUTROS] || 0,
      zoneCounts[ZONES.CASA_MAQUINAS] || 0,
      zoneCounts[ZONES.CABINA] || 0,
      zoneCounts[ZONES.PAVIMENTO_CAIXA] || 0
    ],
    [
      "rgba(148, 163, 184, 0.85)",   // Outros - Cinza
      "rgba(232, 121, 249, 0.85)",   // Casa de Máquinas - Magenta
      "rgba(56, 189, 248, 0.85)",    // Cabina - Ciano
      "rgba(251, 191, 36, 0.85)"     // Pavimento / Caixa - Âmbar
    ]
  );

  // 2. Gráfico Pizza 2: Rechamados Críticos (≥ 2 Chamados) vs Chamados Únicos Estabilizados
  const equipChamadosMap = {};
  myRecords.forEach(r => {
    const key = `${r.cliente} - ${r.equipamento}`;
    equipChamadosMap[key] = (equipChamadosMap[key] || 0) + 1;
  });

  const totalEquipments = Object.keys(equipChamadosMap).length;
  let reincidentEquipCount = 0;
  let stableEquipCount = 0;

  Object.values(equipChamadosMap).forEach(count => {
    if (count >= 2) {
      reincidentEquipCount++;
      chamadosReincidentesCount += count;
    } else {
      stableEquipCount++;
      chamadosEstaveisCount += count;
    }
  });

  const recPct = totalEquipments > 0 ? ((reincidentEquipCount / totalEquipments) * 100).toFixed(1) : "0.0";
  const estPct = totalEquipments > 0 ? ((stableEquipCount / totalEquipments) * 100).toFixed(1) : "0.0";

  const recLabels = [];
  const recData = [];
  const recColors = [];

  if (chamadosReincidentesCount > 0) {
    recLabels.push(`🚨 Rechamados (≥2 OS) [${reincidentEquipCount} Equip. (${chamadosReincidentesCount} OS) - ${recPct}%]`);
    recData.push(chamadosReincidentesCount);
    recColors.push("rgba(239, 68, 68, 0.85)"); // Vermelho
  }
  if (chamadosEstaveisCount > 0) {
    recLabels.push(`✅ Equip. Estáveis [${stableEquipCount} Equip. (${chamadosEstaveisCount} OS) - ${estPct}%]`);
    recData.push(chamadosEstaveisCount);
    recColors.push("rgba(16, 185, 129, 0.85)"); // Verde
  }

  if (recData.length === 0) {
    recLabels.push("Nenhum Chamado Registrado");
    recData.push(1);
    recColors.push("rgba(148, 163, 184, 0.4)");
  }

  ChartManager.renderPieChart("chart-tech-pie-recurrence", recLabels, recData, recColors);

  // 3. Gráfico Pizza 3: Status dos Planos de Ação sob sua Responsabilidade
  let pendentes = 0;
  let vencidos = 0;
  let emAndamento = 0;
  let concluidos = 0;

  myRecurrenceList.forEach(item => {
    const planKey = `${item.cliente}___${item.equipamento}`;
    const plan = ActionPlanManager.getPlan(planKey);
    if (plan && plan.status === "Concluído") {
      concluidos++;
    } else if (plan && ActionPlanManager.isPlanExpired(plan)) {
      vencidos++;
    } else if (plan && ActionPlanManager.isPlanPending(plan)) {
      pendentes++;
    } else {
      emAndamento++;
    }
  });

  const planLabels = [];
  const planData = [];
  const planColors = [];

  if (pendentes > 0) {
    planLabels.push(`⚠️ Planos Pendentes (${pendentes})`);
    planData.push(pendentes);
    planColors.push("rgba(245, 158, 11, 0.85)"); // Amarelo/Âmbar
  }
  if (vencidos > 0) {
    planLabels.push(`⏰ Planos Vencidos (${vencidos})`);
    planData.push(vencidos);
    planColors.push("rgba(239, 68, 68, 0.85)"); // Vermelho
  }
  if (emAndamento > 0) {
    planLabels.push(`🔄 Em Elaboração (${emAndamento})`);
    planData.push(emAndamento);
    planColors.push("rgba(56, 189, 248, 0.85)"); // Azul
  }
  if (concluidos > 0) {
    planLabels.push(`🛡️ Concluídos (${concluidos})`);
    planData.push(concluidos);
    planColors.push("rgba(16, 185, 129, 0.85)"); // Verde
  }

  if (planData.length === 0) {
    planLabels.push("🛡️ 100% Regularizado (0 Pendências)");
    planData.push(1);
    planColors.push("rgba(16, 185, 129, 0.85)");
  }

  ChartManager.renderPieChart("chart-tech-pie-plans", planLabels, planData, planColors);
}

/**
 * Helper para renderizar badges dos 5 tipos de contrato TKE
 */
function getContractBadgeHtml(contrato) {
  const type = contrato || "Premium";
  let icon = "⭐";
  let cssClass = "contract-premium";
  
  if (type === "Premium") {
    icon = "⭐";
    cssClass = "contract-premium";
  } else if (type === "Plus") {
    icon = "✨";
    cssClass = "contract-plus";
  } else if (type === "Service") {
    icon = "🔧";
    cssClass = "contract-service";
  } else if (type === "Express") {
    icon = "⚡";
    cssClass = "contract-express";
  } else if (type === "Digital") {
    icon = "🌐";
    cssClass = "contract-digital";
  }
  
  return `<span class="badge badge-contract ${cssClass}">${icon} ${type}</span>`;
}

function renderMasterRecurrenceTable(recurrenceList) {
  lastMasterRecurrenceList = recurrenceList;
  const tbody = document.getElementById("tbody-master-recurrence");
  const dashContainer = document.getElementById("container-recurrence-dashboard");
  const statsBar = document.getElementById("recurrence-stats-bar");

  // 1. Estatísticas Rápidas com Ícones (Mini Dashboard de Reincidência)
  if (statsBar) {
    let totalOSReincidentes = 0;
    let totalPlanosRegistrados = 0;
    let totalPlanosPendentes = 0;
    let totalPlanosExpirados = 0;
    const zoneCounts = { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 };

    recurrenceList.forEach(item => {
      totalOSReincidentes += item.totalChamados;
      const planKey = `${item.cliente}___${item.equipamento}`;
      const plan = ActionPlanManager.getPlan(planKey);
      if (plan && plan.causaRaiz) {
        totalPlanosRegistrados++;
        if (ActionPlanManager.isPlanExpired(plan)) {
          totalPlanosExpirados++;
        }
      } else {
        totalPlanosPendentes++;
      }

      item.zonas.forEach(z => {
        const normZ = normalizeZoneName(z) || z;
        if (zoneCounts[normZ] !== undefined) zoneCounts[normZ]++;
      });
    });

    const activeRecords = getFilteredData(false);
    const totalElevators = Array.from(new Set(activeRecords.map(r => `${r.cliente} - ${r.equipamento}`))).length;
    const criticalPercentage = totalElevators > 0 ? ((recurrenceList.length / totalElevators) * 100).toFixed(1) : "0.0";

    statsBar.innerHTML = `
      <div class="recurrence-stat-chip">
        <span class="chip-icon">🚨</span>
        <span>Equipamentos Críticos: <strong class="chip-count">${recurrenceList.length}</strong></span>
      </div>
      <div class="recurrence-stat-chip">
        <span class="chip-icon">📋</span>
        <span>Atendimentos Acumulados: <strong class="chip-count">${totalOSReincidentes}</strong></span>
      </div>
      <div class="recurrence-stat-chip" style="border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1);">
        <span class="chip-icon">📊</span>
        <span>Índice de Rechamados: <strong class="chip-count" style="color: var(--accent-cyan);">${criticalPercentage}%</strong></span>
      </div>
      ${totalPlanosExpirados > 0 ? `
        <div class="recurrence-stat-chip" style="border-color: rgba(239, 68, 68, 0.6); background: rgba(239, 68, 68, 0.15);">
          <span class="chip-icon">⏰</span>
          <span>Planos Expirados: <strong class="chip-count" style="color: var(--accent-rose);">${totalPlanosExpirados}</strong></span>
        </div>
      ` : ""}
      <div class="recurrence-stat-chip" style="border-color: rgba(245, 158, 11, 0.4);">
        <span class="chip-icon">⚠️</span>
        <span>Planos Pendentes: <strong class="chip-count" style="color: var(--accent-amber);">${totalPlanosPendentes}</strong></span>
      </div>
      <div class="recurrence-stat-chip" style="border-color: rgba(16, 185, 129, 0.4);">
        <span class="chip-icon">✅</span>
        <span>Planos Registrados: <strong class="chip-count" style="color: var(--accent-emerald);">${totalPlanosRegistrados}</strong></span>
      </div>
      <div class="recurrence-stat-chip">
        <span class="chip-icon">📋</span>
        <span>Outros: <strong>${zoneCounts[ZONES.OUTROS] || 0}</strong></span>
      </div>
      <div class="recurrence-stat-chip">
        <span class="chip-icon">⚡</span>
        <span>Casa de Máquinas: <strong>${zoneCounts[ZONES.CASA_MAQUINAS] || 0}</strong></span>
      </div>
      <div class="recurrence-stat-chip">
        <span class="chip-icon">🚪</span>
        <span>Cabina: <strong>${zoneCounts[ZONES.CABINA] || 0}</strong></span>
      </div>
      <div class="recurrence-stat-chip">
        <span class="chip-icon">🔲</span>
        <span>Pavimento / Caixa: <strong>${zoneCounts[ZONES.PAVIMENTO_CAIXA] || 0}</strong></span>
      </div>
    `;
  }

  // 2. Renderização em Formato Tabela
  if (tbody) {
    if (recurrenceList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Nenhum equipamento em estado crítico de reincidência (&lt;30 dias) nos filtros selecionados.</td></tr>`;
    } else {
      tbody.innerHTML = recurrenceList.map(item => {
        const planKey = `${item.cliente}___${item.equipamento}`;
        const plan = ActionPlanManager.getPlan(planKey);
        const isExpired = ActionPlanManager.isPlanExpired(plan);
        const daysOverdue = isExpired ? ActionPlanManager.getDaysOverdue(plan.prazoExecucao) : 0;

        let planBadge = "";
        if (plan && isExpired) {
          planBadge = `<span class="badge badge-danger badge-pulse" title="Prazo expirou em ${formatDate(plan.prazoExecucao)} (vencido há ${daysOverdue} dias)">⏰ Plano Expirado (${formatDate(plan.prazoExecucao)})</span>`;
        } else if (plan && plan.status === "Concluído") {
          planBadge = `<span class="badge badge-success">✅ Concluído</span>`;
        } else if (plan) {
          planBadge = `<span class="badge badge-success">✓ Plano Registrado</span>`;
        } else {
          planBadge = `<span class="badge badge-warning">⚠️ Pendente de Plano</span>`;
        }

        const setorInfo = item.historico[0]?.setor ? `<small class="badge badge-neutral" style="margin-left: 4px;">${item.historico[0].setor} • Filial ${item.historico[0].filial || "5003"}</small>` : "";

        return `
          <tr class="row-critical" style="${isExpired ? 'background: rgba(239, 68, 68, 0.08);' : ''}">
            <td><strong>${item.cliente}</strong><br>${setorInfo}</td>
            <td><span class="equipment-tag">${item.equipamento}</span></td>
            <td>${getContractBadgeHtml(item.contrato)}</td>
            <td><strong>${item.tecnicoPrincipal}</strong></td>
            <td><span class="badge-count">${item.totalChamados} chamados</span></td>
            <td><span class="badge badge-danger">${item.intervaloDias} dias</span> <small class="text-muted">(${formatDate(item.primeiroChamado)} a ${formatDate(item.ultimoChamado)})</small></td>
            <td>${item.zonas.map(z => `<span class="zone-badge zone-${getZoneSlug(z)}">${z}</span>`).join(" ")}</td>
            <td>
              <div class="action-buttons-cell">
                ${planBadge}
                <button class="btn btn-sm ${isExpired ? 'btn-primary' : 'btn-outline'}" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${item.tecnicos[0]}', '${item.zonas.join(", ")}')">
                  ${isExpired ? "⚠️ Tratar Plano Expirado" : "Ver / Editar Plano"}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  // 3. Renderização em Formato Dashboard (Cards com Ícones)
  if (dashContainer) {
    if (recurrenceList.length === 0) {
      dashContainer.innerHTML = `
        <div class="card p-4 text-center" style="grid-column: 1 / -1;">
          <div class="text-success" style="font-size: 32px; margin-bottom: 8px;">✓</div>
          <h4 class="text-success">Nenhum equipamento em estado crítico de reincidência (&lt;30 dias).</h4>
          <p class="text-muted text-sm">Operação da equipe operando com estabilidade e sem retrabalhos na janela.</p>
        </div>
      `;
    } else {
      const zoneIcons = {
        [ZONES.OUTROS]: "📋",
        [ZONES.CASA_MAQUINAS]: "⚡",
        [ZONES.CABINA]: "🚪",
        [ZONES.PAVIMENTO_CAIXA]: "🔲"
      };

      dashContainer.innerHTML = recurrenceList.map(item => {
        const planKey = `${item.cliente}___${item.equipamento}`;
        const plan = ActionPlanManager.getPlan(planKey);
        const isExpired = ActionPlanManager.isPlanExpired(plan);
        const daysOverdue = isExpired ? ActionPlanManager.getDaysOverdue(plan.prazoExecucao) : 0;

        let planBadge = "";
        if (plan && isExpired) {
          planBadge = `<span class="badge badge-danger badge-pulse" title="Vencido há ${daysOverdue} dias">⏰ Plano Expirado (${formatDate(plan.prazoExecucao)})</span>`;
        } else if (plan && plan.status === "Concluído") {
          planBadge = `<span class="badge badge-success">✅ Concluído</span>`;
        } else if (plan) {
          planBadge = `<span class="badge badge-success">✅ Plano Registrado</span>`;
        } else {
          planBadge = `<span class="badge badge-warning">⚠️ Pendente de Plano</span>`;
        }

        const setorInfo = item.historico[0]?.setor ? `${item.historico[0].setor} • Filial ${item.historico[0].filial || "5003"}` : "Filial 5003 / 5070";
        const cardHighlightStyle = isExpired ? "border: 1px solid rgba(239, 68, 68, 0.6); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);" : "";

        return `
          <div class="recurrence-dash-card" style="${cardHighlightStyle}">
            <div class="dash-card-header">
              <div class="dash-equip-title">
                <span style="font-size: 22px;">🛗</span>
                <div>
                  <h3 class="equipment-tag" style="display: inline-block; font-size: 13px;">${item.equipamento}</h3>
                </div>
              </div>
              <div class="d-flex align-items-center gap-1">
                ${isExpired ? `<span class="badge badge-danger badge-pulse">⏰ EXPIRADO</span>` : ""}
                <span class="badge badge-danger">🚨 ${item.intervaloDias} dias (<30d)</span>
              </div>
            </div>

            <div class="dash-card-body">
              <div class="dash-meta-row">
                <span style="font-size: 16px;">🏢</span>
                <div><strong>${item.cliente}</strong><br><small class="text-muted">📍 ${setorInfo}</small></div>
              </div>

              <div class="dash-meta-row">
                <span style="font-size: 16px;">📑</span>
                <div>Contrato:<br>${getContractBadgeHtml(item.contrato)}</div>
              </div>

              <div class="dash-meta-row">
                <span style="font-size: 16px;">👷</span>
                <div>Técnico Responsável:<br><strong>${item.tecnicoPrincipal}</strong></div>
              </div>

              <div class="dash-meta-row">
                <span style="font-size: 16px;">📈</span>
                <div>Volume:<br><strong>${item.totalChamados} chamados</strong> <small class="text-muted">(${formatDate(item.primeiroChamado)} a ${formatDate(item.ultimoChamado)})</small></div>
              </div>

              ${isExpired ? `
                <div class="dash-meta-row" style="background: rgba(239, 68, 68, 0.12); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
                  <span style="font-size: 16px;">⏰</span>
                  <div style="font-size: 11px; color: #fca5a5;">
                    Prazo Previsto: <strong>${formatDate(plan.prazoExecucao)}</strong> (Vencido há ${daysOverdue} dias)
                  </div>
                </div>
              ` : ""}

              <div>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">ZONAS AFETADAS:</div>
                <div class="dash-zones-list">
                  ${item.zonas.map(z => `<span class="zone-badge zone-${getZoneSlug(z)}">${zoneIcons[z] || "⚙️"} ${z}</span>`).join(" ")}
                </div>
              </div>
            </div>

            <div class="dash-card-footer">
              ${planBadge}
              <button class="btn btn-sm ${isExpired ? 'btn-primary' : 'btn-primary'}" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${item.tecnicos[0]}', '${item.zonas.join(", ")}')">
                ${isExpired ? "⚠️ Tratar Plano Expirado" : "📝 Ver / Editar Plano"}
              </button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // 4. Se o modo ativo for Pizza, renderizar os gráficos de pizza
  if (AppState.masterRecurrenceViewMode === "pie") {
    renderRecurrencePieCharts(recurrenceList);
  }

  // Sincronizar visibilidade com o modo ativo (padrão: dashboard ou o que foi selecionado)
  setRecurrenceViewMode(AppState.masterRecurrenceViewMode || "dashboard");
}

function renderMasterTechPerformance(techPerformance) {
  const container = document.getElementById("container-master-tech-performance");
  if (!container) return;

  if (techPerformance.length === 0) {
    container.innerHTML = `<div class="text-muted text-center p-4">Nenhum técnico encontrado para os filtros de Filial / Setor selecionados.</div>`;
    return;
  }

  container.innerHTML = techPerformance.map(tech => {
    // Buscar filiais e setores atendidos pelo técnico
    const filiais = Array.from(new Set(tech.chamados.map(c => c.filial ? `Filial ${c.filial}` : "").filter(Boolean))).join(", ");
    const setores = Array.from(new Set(tech.chamados.map(c => c.setor).filter(Boolean))).join(", ");

    return `
      <div class="card tech-card">
        <div class="tech-card-header">
          <div>
            <h4 class="tech-name">🔧 ${tech.nome}</h4>
            <span class="text-muted text-sm">${tech.totalClientes} Clientes • ${tech.totalEquipamentos} Equipamentos</span>
            ${filiais || setores ? `<div style="font-size: 11px; color: var(--tke-orange-bright); margin-top: 2px; font-weight: 600;">📍 ${[filiais, setores].filter(Boolean).join(" • ")}</div>` : ""}
          </div>
          <div class="tech-total-badge">${tech.totalChamados} OS</div>
        </div>
        <div class="tech-card-body">
          <div class="tech-zones-breakdown">
            <div class="zone-mini-item">
              <span class="zone-mini-label text-outros">Outros</span>
              <span class="zone-mini-val">${tech.zonas[ZONES.OUTROS] || 0}</span>
            </div>
            <div class="zone-mini-item">
              <span class="zone-mini-label text-casa">Casa Máq.</span>
              <span class="zone-mini-val">${tech.zonas[ZONES.CASA_MAQUINAS] || 0}</span>
            </div>
            <div class="zone-mini-item">
              <span class="zone-mini-label text-cabina">Cabina</span>
              <span class="zone-mini-val">${tech.zonas[ZONES.CABINA] || 0}</span>
            </div>
            <div class="zone-mini-item">
              <span class="zone-mini-label text-pavimento">Pav. / Caixa</span>
              <span class="zone-mini-val">${tech.zonas[ZONES.PAVIMENTO_CAIXA] || 0}</span>
            </div>
          </div>
          <div class="tech-clients-list">
            <strong>Clientes:</strong> ${tech.clientes.join(", ")}
          </div>
          <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-sm btn-outline" onclick="openTechProfileFromMaster('${tech.nome}')" title="Acessar modo de filtro e perfil de ${tech.nome}">
              🔍 Ver Perfil Técnico &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderMasterTrainingMatrix(trainingMatrix) {
  const container = document.getElementById("container-master-training-matrix");
  if (!container) return;

  if (trainingMatrix.length === 0) {
    container.innerHTML = `<div class="text-muted text-center p-4">Nenhum registro de treinamento no escopo selecionado.</div>`;
    return;
  }

  container.innerHTML = trainingMatrix.map(item => {
    if (!item.temReincidencia) {
      return `
        <div class="card matrix-card matrix-ok">
          <div class="matrix-card-header">
            <h4>🔧 ${item.tecnico}</h4>
            <div class="d-flex align-items-center gap-2">
              <span class="badge badge-success">Sem Reincidências Graves</span>
              <button type="button" class="btn btn-xs btn-outline" onclick="openTechProfileFromMaster('${item.tecnico}')" title="Acessar Perfil Técnico">
                🔍 Perfil
              </button>
            </div>
          </div>
          <p class="text-muted text-sm">Operação estável com chamados isolados. Recomendado treinamento contínuo de reciclagem preventiva geral.</p>
        </div>
      `;
    }

    return `
      <div class="card matrix-card matrix-alert">
        <div class="matrix-card-header">
          <div>
            <h4>🔧 ${item.tecnico}</h4>
            <span class="text-muted text-sm">${item.totalChamados} chamados analisados</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge badge-danger">Reincidência Detectada (2+ falhas)</span>
            <button type="button" class="btn btn-xs btn-outline" onclick="openTechProfileFromMaster('${item.tecnico}')" title="Acessar Perfil Técnico">
              🔍 Perfil
            </button>
          </div>
        </div>

        <div class="matrix-trainings-grid">
          ${item.zoneReincidencias.map(zr => `
            <div class="training-zone-box">
              <div class="training-zone-title zone-${getZoneSlug(zr.zona)}">
                Zona: ${zr.zona} (${zr.ocorrencias} ocorrências)
              </div>
              
              <div class="training-col">
                <h5 class="text-primary-accent">🛡️ Ações Preventivas Recomendadas:</h5>
                <ul>
                  ${zr.treinamentos.preventiva.map(t => `<li>${t}</li>`).join("")}
                </ul>
              </div>

              <div class="training-col">
                <h5 class="text-danger-accent">⚙️ Ações Corretivas para Eliminação de Retrabalho:</h5>
                <ul>
                  ${zr.treinamentos.corretiva.map(t => `<li>${t}</li>`).join("")}
                </ul>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Popula dinamicamente os seletores de Técnico e Edifício do Histórico de Atendimentos
 */
function populateHistoryFilters() {
  const techSelect = document.getElementById("select-history-tech-filter");
  const buildingSelect = document.getElementById("select-history-building-filter");
  const techTechSelect = document.getElementById("select-tech-history-tech-filter");
  const techBuildingSelect = document.getElementById("select-tech-history-building-filter");

  const allTechs = getUniqueTechnicians();
  const allBuildings = Array.from(new Set(AppState.data.map(r => r.cliente).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  [techSelect, techTechSelect].forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value || AppState.historyTechFilter || "ALL";
    sel.innerHTML = `<option value="ALL">🔧 Todos os Técnicos</option>` +
      allTechs.map(t => `<option value="${t}">🔧 ${t}</option>`).join("");
    if (allTechs.includes(currentVal) || currentVal === "ALL") {
      sel.value = currentVal;
    } else {
      sel.value = "ALL";
    }
  });

  [buildingSelect, techBuildingSelect].forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value || AppState.historyBuildingFilter || "ALL";
    sel.innerHTML = `<option value="ALL">🏢 Todos os Edifícios</option>` +
      allBuildings.map(b => `<option value="${b}">${b}</option>`).join("");
    if (allBuildings.includes(currentVal) || currentVal === "ALL") {
      sel.value = currentVal;
    } else {
      sel.value = "ALL";
    }
  });
}

/**
 * Renderiza a Tabela de Histórico de Atendimentos no Perfil Master (11 Colunas)
 */
function renderMasterHistoryTable(records) {
  const tbody = document.getElementById("tbody-master-history");
  if (!tbody) return;

  populateHistoryFilters();

  let filtered = [...records];
  if (AppState.historyTechFilter && AppState.historyTechFilter !== "ALL") {
    const filterTech = normalizeTechName(AppState.historyTechFilter);
    filtered = filtered.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === filterTech);
  }
  if (AppState.historyBuildingFilter && AppState.historyBuildingFilter !== "ALL") {
    filtered = filtered.filter(r => r.cliente === AppState.historyBuildingFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Nenhum atendimento registrado com os filtros selecionados de Técnico / Edifício.</td></tr>`;
    return;
  }

  // Ordenar por data mais recente
  const sorted = filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

  // Sequência oficial TKE: OS, Solicitação, Edificio, Elev, Dta Cham., Fnr atendeu, Fil, Zon, Set, Descrição, Tipo Contrato
  tbody.innerHTML = sorted.map(r => {
    const zone = r.zona || classifyZone(r.descricao, r.solicitacao);
    const codeInfo = r.codigoFalha ? { code: r.codigoFalha, name: r.descricaoFalha } : findFailureCodeByText(`${r.descricao || ""} ${r.solicitacao || ""}`);
    const codeHtml = codeInfo ? `<br><span class="badge-failure-code" title="${codeInfo.name || 'Código Oficial TKE'}">🏷️ Cód. ${codeInfo.code}</span>` : "";

    return `
      <tr>
        <td><code>${r.id}</code></td>
        <td class="text-solicitacao">${r.solicitacao || r.descricao}</td>
        <td><strong>${r.cliente}</strong></td>
        <td><span class="equipment-tag">${r.equipamento}</span></td>
        <td style="white-space: nowrap;">${formatDate(r.data)}</td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span class="badge badge-neutral" style="font-size: 11px; white-space: nowrap;">🔧 ${r.tecnico || "Técnico"}</span>
            <small style="color: var(--accent-cyan); font-family: monospace; font-size: 10px; font-weight: 600;">Matrícula: ${r.matricula || getTechMatricula(r.tecnico)}</small>
          </div>
        </td>
        <td><span class="badge badge-neutral" style="font-weight: 700;">${r.filial || "5003"}</span></td>
        <td>
          <span class="zone-badge zone-${getZoneSlug(zone)}">${zone}</span>
          ${codeHtml}
        </td>
        <td><span class="badge badge-neutral" style="font-size: 10px; white-space: nowrap;">${r.setor || "Setor 1"}</span></td>
        <td class="text-desc">${r.descricao}</td>
        <td>${getContractBadgeHtml(r.contrato)}</td>
      </tr>
    `;
  }).join("");
}

/**
 * ========================================================================
 * MODO TÉCNICO: RENDERIZAÇÃO OPERACIONAL COM VISUALIZAÇÃO AMPLA & EDIÇÃO RESTRITA
 * ========================================================================
 */
function renderTechnicianView() {
  const loggedTechName = AppState.currentUser?.role === "TECNICO" 
    ? (normalizeTechName(AppState.currentUser.techName) || AppState.currentUser.techName)
    : (normalizeTechName(AppState.selectedTech) || "Lucas Rodrigues Baccega");
  if (!loggedTechName) return;

  // Atendimentos próprios do técnico logado (para KPIs individuais e trilha de aprimoramento)
  const myRecords = AppState.data.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === loggedTechName);
  const myRecurrenceList = analyzeEquipmentRecurrence(myRecords);
  ActionPlanManager.autoGeneratePlansForRecurrence(myRecurrenceList);
  const myPerformanceList = analyzeTechniciansPerformance(myRecords);
  const myPerf = myPerformanceList.find(p => p.nome === loggedTechName) || {
    nome: loggedTechName,
    totalChamados: myRecords.length,
    clientes: [],
    zonas: { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 },
    chamados: []
  };

  // Obter pendências e planos vencidos do técnico
  const { pendingList, expiredList } = ActionPlanManager.getTechPendingAndExpiredPlans(loggedTechName, myRecurrenceList);

  // 1. Atualizar Header e Dados Técnicos do Perfil do Técnico
  document.getElementById("tech-view-name").textContent = loggedTechName;
  document.getElementById("tech-view-total-os").textContent = myRecords.length;
  document.getElementById("tech-view-critical-count").textContent = myRecurrenceList.length;

  const techMatricula = getTechMatricula(loggedTechName);
  const matriculaBadgeEl = document.getElementById("tech-view-matricula-badge");
  if (matriculaBadgeEl) matriculaBadgeEl.textContent = `🆔 Matrícula: ${techMatricula}`;

  // Buscar filiais, setores e clientes atendidos pelo técnico
  const techFiliais = Array.from(new Set(myRecords.map(r => r.filial ? `Filial ${r.filial}` : "").filter(Boolean)));
  const techSetores = Array.from(new Set(myRecords.map(r => r.setor).filter(Boolean)));
  const techClientes = Array.from(new Set(myRecords.map(r => r.cliente).filter(Boolean)));
  const techEquipamentos = Array.from(new Set(myRecords.map(r => `${r.cliente} - ${r.equipamento}`)));

  // Calcular Índice de Rechamados (%) do Técnico: Equipamentos com >= 2 chamados em <30d sobre o total de equipamentos sob sua responsabilidade
  const techTotalEquipments = techEquipamentos.length;
  const techCriticalEquipments = myRecurrenceList.length;
  const techReincidenceRate = techTotalEquipments > 0 ? ((techCriticalEquipments / techTotalEquipments) * 100).toFixed(1) : "0.0";
  const techRateEl = document.getElementById("tech-view-reincidence-rate");
  if (techRateEl) techRateEl.textContent = `${techReincidenceRate}%`;

  const filialDisplay = "Filiais 5003 / 5070";
  const setorDisplay = techSetores.length > 0 ? techSetores.join(" • ") : (Object.keys(TKE_SECTOR_TECH_MAP).find(s => TKE_SECTOR_TECH_MAP[s].tecnico === loggedTechName) || "Setor Operacional");
  const isCorretivo = loggedTechName.includes("Anderson") || loggedTechName.includes("Tiago") || loggedTechName.includes("Alexandre");

  const techDataContainer = document.getElementById("tech-view-technical-data");
  if (techDataContainer) {
    techDataContainer.innerHTML = `
      <span class="tech-meta-badge">🏢 Filiais de Atuação: <strong>${filialDisplay}</strong></span>
      <span class="tech-meta-badge">🗺️ Região: <strong>Zona 2 - Norte</strong></span>
      <span class="tech-meta-badge">📍 Setor/Rota: <strong>${setorDisplay}</strong></span>
      <span class="tech-meta-badge">🛗 Elevadores sob Responsabilidade: <strong>${techEquipamentos.length} Equipamento(s)</strong> (${techClientes.length} Edifícios)</span>
      <span class="tech-meta-badge">💼 Cargo: <strong>${isCorretivo ? "Volante / Corretivo" : "Técnico de Manutenção Preventiva"}</strong></span>
    `;
  }

  const pendingCountEl = document.getElementById("tech-view-pending-count");
  const expiredCountEl = document.getElementById("tech-view-expired-count");
  if (pendingCountEl) pendingCountEl.textContent = pendingList.length;
  if (expiredCountEl) expiredCountEl.textContent = expiredList.length;

  // Banner de Alerta de Ações Obrigatórias Pendentes e Vencidas para o Técnico
  let recurrenceBase = AppState.data;
  if (AppState.filialFilter !== "ALL") {
    recurrenceBase = recurrenceBase.filter(r => (r.filial || "5003") === AppState.filialFilter);
  }
  if (AppState.setorFilter !== "ALL") {
    recurrenceBase = recurrenceBase.filter(r => (r.setor && (r.setor === AppState.setorFilter || AppState.setorFilter.includes(r.setor))));
  }
  const displayRecurrenceList = analyzeEquipmentRecurrence(recurrenceBase);
  ActionPlanManager.autoGeneratePlansForRecurrence(displayRecurrenceList);

  renderTechPendingExpiredAlert(loggedTechName, displayRecurrenceList);

  // 2. Renderizar Histórico de Atendimentos (Permite visualizar atendimentos de outros técnicos conforme filtros)
  renderTechHistoryTable(AppState.data, loggedTechName);

  // 3. Renderizar Gráfico / Separação das Falhas por Zona & Diagnóstico com Filtro de Técnico
  populateZoneTechFilters();
  renderTechZoneAndDiagnostic();

  // 4. Renderizar Alertas de Reincidência & Modelos de Plano de Ação
  renderTechActionPlansSection(displayRecurrenceList, loggedTechName);

  // 5. Renderizar Gráficos em Formato Pizza (30 Dias, Rechamados & Planos de Ação)
  lastTechPieParams = { tech: loggedTechName, records: myRecords, recurrenceList: myRecurrenceList };
  if (AppState.techRecurrenceViewMode === "pie") {
    renderTechPieCharts(loggedTechName, myRecords, myRecurrenceList);
  }
  setTechRecurrenceViewMode(AppState.techRecurrenceViewMode || "cards");
}

/**
 * Renderiza o Banner de Alerta Crítico para o Perfil Técnico (Planos Pendentes e Vencidos)
 */
function renderTechPendingExpiredAlert(loggedTechName, recurrenceList) {
  const alertBanner = document.getElementById("tech-pending-expired-alert");
  const pendingBadge = document.getElementById("tech-pending-badge");
  const expiredBadge = document.getElementById("tech-expired-badge");
  const listContainer = document.getElementById("tech-pending-expired-list");
  const subtitleEl = document.getElementById("tech-pending-expired-subtitle");
  if (!alertBanner || !listContainer) return;

  const { pendingList, expiredList } = ActionPlanManager.getTechPendingAndExpiredPlans(loggedTechName, recurrenceList);

  if (pendingList.length === 0 && expiredList.length === 0) {
    alertBanner.style.display = "none";
    return;
  }

  alertBanner.style.display = "block";
  if (pendingBadge) pendingBadge.textContent = `${pendingList.length} Pendente(s)`;
  if (expiredBadge) expiredBadge.textContent = `${expiredList.length} Vencido(s)`;

  if (subtitleEl) {
    subtitleEl.innerHTML = `Atenção <strong>${loggedTechName}</strong>: Você possui <strong>${pendingList.length} plano(s) pendente(s)</strong> de preenchimento e <strong>${expiredList.length} plano(s) vencido(s)</strong> nos seus atendimentos reincidentes (<30 dias). Ação imediata requerida:`;
  }

  // Combinar itens únicos para exibir cartões de ação rápida
  const combinedKeys = new Set([...pendingList.map(p => p.key), ...expiredList.map(p => p.key)]);
  const combinedItems = Array.from(combinedKeys).map(key => {
    return pendingList.find(p => p.key === key) || expiredList.find(p => p.key === key);
  }).filter(Boolean);

  listContainer.innerHTML = combinedItems.map(item => {
    const isPending = item.isPending;
    const isExpired = item.isExpired;
    const formattedDate = item.prazoExecucao ? formatDate(item.prazoExecucao) : "Não definido";

    let alertTagHtml = "";
    if (isPending && isExpired) {
      alertTagHtml = `<span class="alert-pending-tag" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4);">⚠️ Pendente & ⏰ Vencido (${item.daysOverdue}d)</span>`;
    } else if (isExpired) {
      alertTagHtml = `<span class="alert-overdue-tag">⏰ Vencido há ${item.daysOverdue} dia(s)</span>`;
    } else {
      alertTagHtml = `<span class="alert-pending-tag">⚠️ Preenchimento Pendente</span>`;
    }

    const btnText = isExpired ? "⚠️ Regularizar Plano Vencido" : "➕ Preencher Plano Obrigatório";

    return `
      <div class="alert-tech-card ${isExpired ? 'card-expired' : ''}">
        <div class="d-flex justify-content-between align-items-center gap-2">
          <span class="equipment-tag" style="font-weight: 800; font-size: 13px;">🛗 ${item.equipamento}</span>
          ${alertTagHtml}
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
          <div>🏢 <strong>${item.cliente}</strong></div>
          <div>🚨 Volume: <strong>${item.totalChamados} chamados</strong> (${item.intervaloDias} dias entre falhas)</div>
          <div class="mt-1">
            Prazo: <strong>${formattedDate}</strong> | Status: <span class="badge ${isExpired ? 'badge-danger' : 'badge-warning'}" style="font-size: 10px;">${item.status}</span>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center pt-2" style="border-top: 1px solid rgba(255,255,255,0.06);">
          <small class="text-muted text-xs">Zona: ${item.zonasAfetadas || "Geral"}</small>
          <button class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${loggedTechName}', '${item.zonasAfetadas}', false)">
            ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function renderTechHistoryTable(allRecords, loggedTechName) {
  const tbody = document.getElementById("tbody-tech-history");
  if (!tbody) return;

  // Aplicar busca e filtros da barra de controle
  let filtered = allRecords;
  if (AppState.filialFilter !== "ALL") {
    filtered = filtered.filter(r => (r.filial || "5003") === AppState.filialFilter);
  }
  if (AppState.zonaOpFilter !== "ALL") {
    filtered = filtered.filter(r => (r.zonaOperacional || "Zona 2 - Norte") === AppState.zonaOpFilter);
  }
  if (AppState.setorFilter !== "ALL") {
    filtered = filtered.filter(r => (r.setor && (r.setor === AppState.setorFilter || AppState.setorFilter.includes(r.setor))));
  }
  if (AppState.zoneFilter !== "ALL") {
    filtered = filtered.filter(r => (r.zona || classifyZone(r.descricao)) === AppState.zoneFilter);
  }
  if (AppState.contratoFilter && AppState.contratoFilter !== "ALL") {
    filtered = filtered.filter(r => (r.contrato || "Premium") === AppState.contratoFilter);
  }
  if (AppState.qtdChamadosFilter && AppState.qtdChamadosFilter !== "ALL") {
    const equipCallCounts = getEquipmentCallCounts(AppState.data);
    filtered = filtered.filter(r => {
      const key = `${r.cliente}___${r.equipamento}`;
      const count = equipCallCounts[key] || 0;
      if (AppState.qtdChamadosFilter === "1") return count === 1;
      if (AppState.qtdChamadosFilter === "2") return count === 2;
      if (AppState.qtdChamadosFilter === "3") return count === 3;
      if (AppState.qtdChamadosFilter === "4+") return count >= 4;
      if (AppState.qtdChamadosFilter === "reincidentes") return count >= 2;
      if (AppState.qtdChamadosFilter === "criticos") return count >= 3;
      return true;
    });
  }
  if (AppState.searchFilter) {
    const sf = AppState.searchFilter.toLowerCase();
    filtered = filtered.filter(r => 
      (r.cliente && r.cliente.toLowerCase().includes(sf)) ||
      (r.equipamento && r.equipamento.toLowerCase().includes(sf)) ||
      (r.tecnico && r.tecnico.toLowerCase().includes(sf)) ||
      (r.matricula && r.matricula.toLowerCase().includes(sf)) ||
      (r.contrato && r.contrato.toLowerCase().includes(sf)) ||
      (r.filial && r.filial.toLowerCase().includes(sf)) ||
      (r.setor && r.setor.toLowerCase().includes(sf)) ||
      (r.solicitacao && r.solicitacao.toLowerCase().includes(sf)) ||
      (r.descricao && r.descricao.toLowerCase().includes(sf)) ||
      (r.codigoFalha && r.codigoFalha.toLowerCase().includes(sf)) ||
      (r.descricaoFalha && r.descricaoFalha.toLowerCase().includes(sf)) ||
      (r.id && r.id.toLowerCase().includes(sf))
    );
  }

  populateHistoryFilters();

  if (AppState.historyTechFilter && AppState.historyTechFilter !== "ALL") {
    filtered = filtered.filter(r => r.tecnico === AppState.historyTechFilter);
  }
  if (AppState.historyBuildingFilter && AppState.historyBuildingFilter !== "ALL") {
    filtered = filtered.filter(r => r.cliente === AppState.historyBuildingFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">Nenhum atendimento registrado com os filtros atuais.</td></tr>`;
    return;
  }

  // Ordenar por data mais recente
  filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

  // Sequência oficial TKE: OS, Solicitação, Edificio, Elev, Dta Cham., Fnr atendeu, Fil, Zon, Set, Descrição, Tipo Contrato
  tbody.innerHTML = filtered.map(r => {
    const zone = r.zona || classifyZone(r.descricao, r.solicitacao);
    const codeInfo = r.codigoFalha ? { code: r.codigoFalha, name: r.descricaoFalha } : findFailureCodeByText(`${r.descricao || ""} ${r.solicitacao || ""}`);
    const codeHtml = codeInfo ? `<br><span class="badge-failure-code" title="${codeInfo.name || 'Código Oficial TKE'}">🏷️ Cód. ${codeInfo.code}</span>` : "";
    const isMine = r.tecnico === loggedTechName;
    const techBadge = isMine
      ? `<span class="badge badge-success" style="font-size: 11px; white-space: nowrap;">👤 ${r.tecnico} (Você)</span>`
      : `<span class="badge badge-neutral" style="font-size: 11px; white-space: nowrap;">🔧 ${r.tecnico || "Técnico"}</span>`;

    return `
      <tr style="${isMine ? 'background: rgba(16, 185, 129, 0.05);' : ''}">
        <td><code>${r.id}</code></td>
        <td class="text-solicitacao">${r.solicitacao || r.descricao}</td>
        <td><strong>${r.cliente}</strong></td>
        <td><span class="equipment-tag">${r.equipamento}</span></td>
        <td style="white-space: nowrap;">${formatDate(r.data)}</td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            ${techBadge}
            <small style="color: var(--accent-cyan); font-family: monospace; font-size: 10px; font-weight: 600;">Matrícula: ${r.matricula || getTechMatricula(r.tecnico)}</small>
          </div>
        </td>
        <td><span class="badge badge-neutral" style="font-weight: 700;">${r.filial || "5003"}</span></td>
        <td>
          <span class="zone-badge zone-${getZoneSlug(zone)}">${zone}</span>
          ${codeHtml}
        </td>
        <td><span class="badge badge-neutral" style="font-size: 10px; white-space: nowrap;">${r.setor || "Setor 1"}</span></td>
        <td class="text-desc">${r.descricao}</td>
        <td>${getContractBadgeHtml(r.contrato)}</td>
      </tr>
    `;
  }).join("");
}

function renderTechActionPlansSection(recurrenceList, loggedTechName) {
  const container = document.getElementById("container-tech-action-plans");
  if (!container) return;

  if (recurrenceList.length === 0) {
    container.innerHTML = `
      <div class="card p-4 text-center">
        <div class="text-success" style="font-size: 32px; margin-bottom: 10px;">✓</div>
        <h4 class="text-success">Nenhum equipamento reincidente (&lt;30 dias) com os filtros atuais.</h4>
        <p class="text-muted text-sm">Operação estabilizada.</p>
      </div>
    `;
    return;
  }

  // Ordenar priorizando os equipamentos sob responsabilidade do próprio técnico logado
  const sortedRecurrence = [...recurrenceList].sort((a, b) => {
    const aIsMine = (a.tecnicos && a.tecnicos.includes(loggedTechName)) || (a.tecnicoPrincipal && a.tecnicoPrincipal.includes(loggedTechName));
    const bIsMine = (b.tecnicos && b.tecnicos.includes(loggedTechName)) || (b.tecnicoPrincipal && b.tecnicoPrincipal.includes(loggedTechName));
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;
    return b.totalChamados - a.totalChamados;
  });

  container.innerHTML = sortedRecurrence.map(item => {
    const planKey = `${item.cliente}___${item.equipamento}`;
    const plan = ActionPlanManager.getPlan(planKey);
    const isPending = ActionPlanManager.isPlanPending(plan);
    const isExpired = ActionPlanManager.isPlanExpired(plan);
    const daysOverdue = isExpired ? ActionPlanManager.getDaysOverdue(plan.prazoExecucao) : 0;

    const respTech = item.tecnicoPrincipal || (item.tecnicos ? item.tecnicos.join(", ") : (loggedTechName || "Técnico Responsável"));

    let statusBadge = "";
    let buttonHtml = "";
    let borderStyle = "";

    if (isExpired) {
      borderStyle = "border-left: 5px solid var(--accent-rose); border-color: rgba(239, 68, 68, 0.5);";
      statusBadge = `<span class="badge badge-danger badge-pulse">⏰ VENCIDO (${formatDate(plan.prazoExecucao)}) - Atraso: ${daysOverdue}d</span>`;
      buttonHtml = `<button class="btn btn-primary" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${respTech}', '${item.zonas.join(", ")}', false)">
                      ⚠️ Regularizar Plano Vencido
                    </button>`;
    } else if (isPending) {
      borderStyle = "border-left: 5px solid var(--accent-amber); border-color: rgba(245, 158, 11, 0.5);";
      statusBadge = `<span class="badge badge-warning badge-pulse">⚠️ PENDENTE DE PREENCHIMENTO</span>`;
      buttonHtml = `<button class="btn btn-primary" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${respTech}', '${item.zonas.join(", ")}', false)">
                      ➕ Preencher Obrigatório: Plano de Ação
                    </button>`;
    } else {
      borderStyle = "border-left: 4px solid var(--accent-emerald);";
      statusBadge = `<span class="badge badge-success">🛡️ Plano de Ação Ativo</span>`;
      buttonHtml = `<button class="btn btn-primary" onclick="openActionPlanModal('${item.cliente}', '${item.equipamento}', '${respTech}', '${item.zonas.join(", ")}', false)">
                      📝 Editar Plano de Ação
                    </button>`;
    }

    return `
      <div class="card action-plan-card" style="${borderStyle}">
        <div class="action-plan-header">
          <div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="badge badge-danger">CRÍTICO - REINCIDENTE</span>
              ${getContractBadgeHtml(item.contrato)}
              <span class="badge badge-neutral">${item.intervaloDias} dias entre chamados</span>
              ${statusBadge}
            </div>
            <h3 class="mt-2">${item.cliente} • ${item.equipamento}</h3>
            <span class="text-muted text-sm">Total de ${item.totalChamados} chamados registrados entre ${formatDate(item.primeiroChamado)} e ${formatDate(item.ultimoChamado)} • Técnico: <strong>${respTech}</strong></span>
          </div>
          <div>
            ${buttonHtml}
          </div>
        </div>

        <div class="action-plan-summary">
          <div class="summary-col">
            <strong>Causa-Raiz Diagnosticada:</strong>
            <p>${plan && plan.causaRaiz ? plan.causaRaiz : "<em style='color: var(--accent-amber); font-weight: 600;'>⚠️ Pendente de preenchimento pelo técnico</em>"}</p>
          </div>
          <div class="summary-col">
            <strong>Ação Corretiva Imediata:</strong>
            <p>${plan && plan.acaoImediata ? plan.acaoImediata : "<em style='color: var(--accent-amber); font-weight: 600;'>⚠️ Pendente de preenchimento pelo técnico</em>"}</p>
          </div>
          <div class="summary-col">
            <strong>Peças para Substituição:</strong>
            <p>${plan && plan.pecasNecessarias ? plan.pecasNecessarias : "<em class='text-muted'>Não especificadas</em>"}</p>
          </div>
        </div>

        ${plan ? `
          <div class="action-plan-footer">
            <span class="text-muted text-xs">Atualizado em: ${new Date(plan.atualizadoEm || Date.now()).toLocaleString("pt-BR")} | Prazo: <strong>${formatDate(plan.prazoExecucao)}</strong></span>
            <button class="btn btn-sm btn-outline" onclick="printActionPlanByKey('${planKey}')">🖨️ Imprimir Relatório Formal</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

function renderTechSelfImprovement(myPerf, myRecurrenceList) {
  const container = document.getElementById("container-tech-self-improvement");
  if (!container) return;

  const isSelf = myPerf.nome === (AppState.currentUser?.techName || AppState.selectedTech);

  const zonesWithReincidence = [];
  for (const [zone, count] of Object.entries(myPerf.zonas)) {
    if (count >= 2) {
      zonesWithReincidence.push({
        zona: zone,
        count: count,
        modules: TRAINING_MODULES[zone] || { preventiva: [], corretiva: [] }
      });
    }
  }

  if (zonesWithReincidence.length === 0) {
    container.innerHTML = `
      <div class="card p-4">
        <h4>Trilha de Desenvolvimento Contínuo</h4>
        <p class="text-muted">${isSelf ? "Você não possui reincidências críticas acumuladas. Continue revisando os procedimentos padrão de manutenção preventiva e lubrificação técnica." : `Nenhuma reincidência crítica acumulada para ${myPerf.nome}. Continue revisando os procedimentos padrão de manutenção preventiva.`}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header-styled">
        <div>
          <h4>🎯 Matriz Pessoal de Auto-Aprimoramento Técnico</h4>
          <span class="text-muted text-sm">${isSelf ? "Baseado exclusivamente nos seus atendimentos reincidentes para elevar sua assertividade em campo:" : `Baseado nos atendimentos de ${myPerf.nome} para elevar a assertividade em campo:`}</span>
        </div>
      </div>
      
      <div class="self-improvement-grid">
        ${zonesWithReincidence.map(item => `
          <div class="improvement-box">
            <div class="improvement-zone-header zone-${getZoneSlug(item.zona)}">
              Subsistema: ${item.zona} (${item.count} chamados registrados)
            </div>
            
            <div class="mt-2">
              <h5 class="text-danger-accent">Módulos Corretivos Recomendados:</h5>
              <ul>
                ${item.modules.corretiva.map(m => `<li>${m}</li>`).join("")}
              </ul>
            </div>

            <div class="mt-2">
              <h5 class="text-primary-accent">Módulos Preventivos para Evitar Retorno:</h5>
              <ul>
                ${item.modules.preventiva.map(m => `<li>${m}</li>`).join("")}
              </ul>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * ========================================================================
 * MODAIS E GERENCIAMENTO DE PLANOS DE AÇÃO
 * ========================================================================
 */
let currentEditingPlanKey = "";

function openActionPlanModal(cliente, equipamento, tecnico, zonas, readOnly = false) {
  currentEditingPlanKey = `${cliente}___${equipamento}`;
  let plan = ActionPlanManager.getPlan(currentEditingPlanKey);

  if (!plan) {
    plan = ActionPlanManager.createDefaultTemplate(cliente, equipamento, tecnico, zonas);
  }

  document.getElementById("plan-cliente").value = plan.cliente;
  document.getElementById("plan-equipamento").value = plan.equipamento;
  document.getElementById("plan-tecnico").value = plan.tecnico;
  document.getElementById("plan-zonas").value = plan.zonasAfetadas;
  document.getElementById("plan-causa-raiz").value = plan.causaRaiz;
  document.getElementById("plan-acao-imediata").value = plan.acaoImediata;
  document.getElementById("plan-pecas").value = plan.pecasNecessarias;
  document.getElementById("plan-prazo").value = plan.prazoExecucao || "";
  document.getElementById("plan-status").value = plan.status || "Em Elaboração";

  // Garantir que os técnicos possam preencher e salvar o plano de ação
  const isTechUser = AppState.currentUser && AppState.currentUser.role === "TECNICO";
  const loggedTechName = isTechUser ? AppState.currentUser.techName : null;
  const isReadOnly = false;

  // Se o técnico for indefinido ou genérico, preencher com o técnico logado ou responsável
  if (loggedTechName && (!plan.tecnico || plan.tecnico === "INDEFINIDO" || plan.tecnico.includes("INDEFINIDO"))) {
    plan.tecnico = loggedTechName;
    document.getElementById("plan-tecnico").value = loggedTechName;
  }

  const causaInput = document.getElementById("plan-causa-raiz");
  const acaoInput = document.getElementById("plan-acao-imediata");
  const pecasInput = document.getElementById("plan-pecas");
  const prazoInput = document.getElementById("plan-prazo");
  const statusInput = document.getElementById("plan-status");
  const btnSave = document.getElementById("btn-save-plan");
  const btnSuggest = document.getElementById("btn-suggest-plan");
  const readonlyNotice = document.getElementById("plan-readonly-notice");

  if (causaInput) causaInput.disabled = false;
  if (acaoInput) acaoInput.disabled = false;
  if (pecasInput) pecasInput.disabled = false;
  if (prazoInput) prazoInput.disabled = false;
  if (statusInput) statusInput.disabled = false;
  if (btnSave) btnSave.style.display = "inline-flex";
  if (readonlyNotice) readonlyNotice.style.display = "none";

  // Ocultar a opção de sugestão dos 5 porquês na versão/login técnico, mantendo os demais itens
  const isTechMode = isTechUser || AppState.profile === "TECNICO";
  if (btnSuggest) {
    btnSuggest.style.display = isTechMode ? "none" : "inline-flex";
  }

  // Verificar se o plano está com informações pendentes ou prazo expirado
  const isPending = ActionPlanManager.isPlanPending(plan);
  const isExpired = ActionPlanManager.isPlanExpired(plan);
  const pendingNotice = document.getElementById("plan-pending-notice");
  const expiredNotice = document.getElementById("plan-expired-notice");

  if (pendingNotice) {
    if (isPending) {
      pendingNotice.style.display = "block";
      pendingNotice.innerHTML = `⚠️ <strong>PREENCHIMENTO OBRIGATÓRIO:</strong> Este equipamento está classificado como <strong>Crítico Reincidente (&lt;30 dias)</strong>. Preencha detalhadamente a <em>Causa-Raiz Técnica (5 Porquês)</em> e a <em>Ação Corretiva Imediata</em> para liberar a baixa da OS e validar a intervenção via IA.`;
    } else {
      pendingNotice.style.display = "none";
    }
  }

  if (expiredNotice) {
    if (isExpired) {
      const days = ActionPlanManager.getDaysOverdue(plan.prazoExecucao);
      expiredNotice.style.display = "block";
      expiredNotice.innerHTML = `⏰ <strong>ALERTA DE PRAZO EXPIRADO:</strong> O prazo previsto de execução deste plano (<strong>${formatDate(plan.prazoExecucao)}</strong>) está <strong>EXPIRADO</strong> há <strong>${days} dia(s)</strong> sem conclusão técnica (Status atual: <em>${plan.status}</em>). Recomenda-se concluir o atendimento ou atualizar o cronograma.`;
    } else {
      expiredNotice.style.display = "none";
    }
  }

  // Resetar parecer de auditoria anterior
  const auditBox = document.getElementById("plan-audit-box");
  if (auditBox) auditBox.style.display = "none";

  document.getElementById("modal-action-plan").classList.add("open");
}

function closeActionPlanModal() {
  document.getElementById("modal-action-plan").classList.remove("open");
}

function handleAuditPlan() {
  const planData = {
    cliente: document.getElementById("plan-cliente").value,
    equipamento: document.getElementById("plan-equipamento").value,
    tecnico: document.getElementById("plan-tecnico").value,
    zonasAfetadas: document.getElementById("plan-zonas").value,
    causaRaiz: document.getElementById("plan-causa-raiz").value,
    acaoImediata: document.getElementById("plan-acao-imediata").value,
    pecasNecessarias: document.getElementById("plan-pecas").value,
    prazoExecucao: document.getElementById("plan-prazo").value,
    status: document.getElementById("plan-status").value
  };

  const audit = ActionPlanManager.auditPlan(planData);
  const auditBox = document.getElementById("plan-audit-box");
  const verdictBadge = document.getElementById("audit-verdict-badge");
  const content = document.getElementById("audit-feedback-content");

  if (!auditBox || !verdictBadge || !content) return;

  auditBox.style.display = "block";
  verdictBadge.className = `badge ${audit.isDefinitiva ? "badge-success" : "badge-warning"}`;
  verdictBadge.textContent = audit.classificacao;

  content.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong>1. Compatibilidade Técnica:</strong> <span style="color: ${audit.compatibilidade === 'Compatível' ? '#34d399' : '#f59e0b'}; font-weight: 600;">${audit.compatibilidade}</span><br>
      <small class="text-muted">${audit.compatibilidadeDesc}</small>
    </div>
    <div style="margin-bottom: 8px;">
      <strong>2. Parecer da Intervenção:</strong><br>
      <small class="text-muted">${audit.classificacaoDesc}</small>
    </div>
    <div>
      <strong style="color: var(--tke-orange-bright);">3. Pontos de Checagem Preventiva Complementar (Garantia 60 dias):</strong>
      <ul style="padding-left: 18px; margin-top: 4px; font-size: 11px;">
        ${audit.checkPoints.map(cp => `<li>${cp}</li>`).join("")}
      </ul>
    </div>
  `;
}

function handleSuggestPlan() {
  const zonasVal = document.getElementById("plan-zonas")?.value || "";
  const suggestion = ActionPlanManager.getSuggestedDiagnosis(zonasVal);

  const causaInput = document.getElementById("plan-causa-raiz");
  const acaoInput = document.getElementById("plan-acao-imediata");
  const pecasInput = document.getElementById("plan-pecas");
  const statusInput = document.getElementById("plan-status");

  if (causaInput) causaInput.value = suggestion.causaRaiz;
  if (acaoInput) acaoInput.value = suggestion.acaoImediata;
  if (pecasInput) pecasInput.value = suggestion.pecasNecessarias;
  if (statusInput && statusInput.value === "Pendente de Preenchimento") {
    statusInput.value = "Em Elaboração";
  }

  showToast("💡 Diagnóstico sugerido (5 Porquês) aplicado! Revise e ajuste conforme necessário.");
}

function handleActionPlanSubmit(e) {
  e.preventDefault();

  let planTecnico = document.getElementById("plan-tecnico").value;
  if (!planTecnico && AppState.currentUser && AppState.currentUser.role === "TECNICO") {
    planTecnico = AppState.currentUser.techName;
  }

  const planData = {
    cliente: document.getElementById("plan-cliente").value,
    equipamento: document.getElementById("plan-equipamento").value,
    tecnico: planTecnico,
    zonasAfetadas: document.getElementById("plan-zonas").value,
    causaRaiz: document.getElementById("plan-causa-raiz").value,
    acaoImediata: document.getElementById("plan-acao-imediata").value,
    pecasNecessarias: document.getElementById("plan-pecas").value,
    prazoExecucao: document.getElementById("plan-prazo").value,
    status: document.getElementById("plan-status").value
  };

  ActionPlanManager.savePlan(currentEditingPlanKey, planData);
  closeActionPlanModal();
  renderActiveView();
  showToast("Plano de Ação salvo com sucesso!");
}

function handlePrintCurrentPlan() {
  const planData = {
    cliente: document.getElementById("plan-cliente").value,
    equipamento: document.getElementById("plan-equipamento").value,
    tecnico: document.getElementById("plan-tecnico").value,
    zonasAfetadas: document.getElementById("plan-zonas").value,
    causaRaiz: document.getElementById("plan-causa-raiz").value,
    acaoImediata: document.getElementById("plan-acao-imediata").value,
    pecasNecessarias: document.getElementById("plan-pecas").value,
    prazoExecucao: document.getElementById("plan-prazo").value,
    status: document.getElementById("plan-status").value
  };
  ActionPlanManager.printPlan(planData);
}

function printActionPlanByKey(key) {
  const plan = ActionPlanManager.getPlan(key);
  if (plan) {
    ActionPlanManager.printPlan(plan);
  }
}

/**
 * Modal Adicionar OS Manualmente
 */
function openAddOSModal() {
  document.getElementById("form-add-os").reset();
  document.getElementById("os-data").value = new Date().toISOString().split("T")[0];
  document.getElementById("os-zona-preview").innerHTML = `<span>Zona Detectada: <strong>Cabina</strong></span>`;
  const contratoSelect = document.getElementById("os-contrato");
  if (contratoSelect) contratoSelect.value = "Premium";
  
  const failureSelect = document.getElementById("os-codigo-falha");
  if (failureSelect) failureSelect.value = "";

  const techSelect = document.getElementById("os-tecnico");
  const filialSelect = document.getElementById("os-filial");
  const setorSelect = document.getElementById("os-setor");

  if (AppState.currentUser && AppState.currentUser.role === "TECNICO") {
    // Para Técnico: travar identificação, filial e setor nos seus próprios dados
    techSelect.innerHTML = `<option value="${AppState.currentUser.techName}">${AppState.currentUser.techName}</option>`;
    techSelect.value = AppState.currentUser.techName;
    techSelect.disabled = true;

    if (filialSelect) {
      filialSelect.value = AppState.currentUser.filial || "5003";
      filialSelect.disabled = true;
    }
    if (setorSelect) {
      setorSelect.value = AppState.currentUser.setor || "Setor 1";
      setorSelect.disabled = true;
    }
  } else {
    // Para Master: permissão total de seleção
    techSelect.disabled = false;
    if (filialSelect) filialSelect.disabled = false;
    if (setorSelect) setorSelect.disabled = false;

    const techs = getUniqueTechnicians();
    techSelect.innerHTML = techs.map(t => `<option value="${t}">${t}</option>`).join("") + `<option value="Novo Técnico">+ Cadastrar Novo Técnico</option>`;

    const defaultSetor = setorSelect?.value;
    if (defaultSetor && TKE_SECTOR_TECH_MAP[defaultSetor]) {
      techSelect.value = TKE_SECTOR_TECH_MAP[defaultSetor].tecnico;
      if (filialSelect) filialSelect.value = TKE_SECTOR_TECH_MAP[defaultSetor].filial;
    }
  }

  document.getElementById("modal-add-os").classList.add("open");
}

function closeAddOSModal() {
  document.getElementById("modal-add-os").classList.remove("open");
}

function handleAddOSSubmit(e) {
  e.preventDefault();

  let tecnicoVal = document.getElementById("os-tecnico").value;
  let filialVal = document.getElementById("os-filial")?.value || "5003";
  let setorVal = document.getElementById("os-setor")?.value || "Setor 1";
  let contratoVal = document.getElementById("os-contrato")?.value || "Premium";

  if (AppState.currentUser && AppState.currentUser.role === "TECNICO") {
    tecnicoVal = AppState.currentUser.techName;
    filialVal = AppState.currentUser.filial || "5003";
    setorVal = AppState.currentUser.setor || "Setor 1";
  } else if (tecnicoVal === "Novo Técnico") {
    tecnicoVal = prompt("Digite o nome completo do novo técnico:");
    if (!tecnicoVal) return;
  }

  const solicitacao = document.getElementById("os-solicitacao")?.value || document.getElementById("os-descricao").value;
  const descricao = document.getElementById("os-descricao").value;
  
  const selectedCodeVal = document.getElementById("os-codigo-falha")?.value;
  let codeObj = selectedCodeVal && (typeof TKE_FAILURE_CODES !== "undefined")
    ? TKE_FAILURE_CODES.find(f => f.code === selectedCodeVal)
    : null;

  if (!codeObj) {
    codeObj = findFailureCodeByText(`${descricao} ${solicitacao}`);
  }

  const finalNormTech = normalizeTechName(tecnicoVal) || tecnicoVal;

  const newOS = {
    id: `OS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    data: document.getElementById("os-data").value,
    filial: filialVal,
    zonaOperacional: document.getElementById("os-zona-op")?.value || "Zona 2 - Norte",
    setor: setorVal,
    cliente: document.getElementById("os-cliente").value,
    equipamento: document.getElementById("os-equipamento").value,
    contrato: contratoVal,
    tecnico: finalNormTech,
    matricula: getTechMatricula(finalNormTech),
    codigoFalha: codeObj ? codeObj.code : null,
    descricaoFalha: codeObj ? codeObj.name : null,
    solicitacao: solicitacao,
    descricao: descricao,
    zona: zonaFinal,
    status: "Concluído"
  };

  AppState.data.unshift(newOS);
  saveDataToStorage();

  // Verificar e auto-gerar plano de ação se atingiu reincidência (<30 dias)
  const allRecurrences = analyzeEquipmentRecurrence(AppState.data);
  const newlyGenerated = ActionPlanManager.autoGeneratePlansForRecurrence(allRecurrences);
  const thisEquipRecurrence = allRecurrences.find(r => r.cliente === newOS.cliente && r.equipamento === newOS.equipamento);

  closeAddOSModal();
  populateTechnicianDropdown();
  renderActiveView();

  if (newlyGenerated.length > 0 && thisEquipRecurrence) {
    showToast(`🚨 Reincidência detectada (2º chamado em <30 dias)! Plano de Ação gerado para o técnico preencher.`);
  } else {
    showToast("Nova Ordem de Serviço cadastrada com sucesso!");
  }
}

/**
 * Modal Importar CSV / JSON
 */
function openImportModal() {
  if (AppState.currentUser && AppState.currentUser.role === "TECNICO") {
    showToast("Acesso restrito: Importação de base disponível apenas para Perfil Master.");
    return;
  }
  document.getElementById("form-import-data").reset();
  document.getElementById("modal-import-data").classList.add("open");
}

function closeImportModal() {
  document.getElementById("modal-import-data").classList.remove("open");
}

function parseDateBRtoISO(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  dateStr = dateStr.trim();
  const brMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, "0");
    const month = brMatch[2].padStart(2, "0");
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }
  const isoMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function handleImportSubmit(e) {
  e.preventDefault();
  const rawText = document.getElementById("import-text-content").value.trim();
  if (!rawText) return;

  let parsed = [];
  try {
    if (rawText.startsWith("[") || (rawText.startsWith("{") && !rawText.includes(";"))) {
      parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) parsed = [parsed];
    } else {
      // Parse CSV / Excel tabulado
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      const firstLineLower = lines[0].toLowerCase();
      const hasHeader = firstLineLower.includes("os") || 
                        firstLineLower.includes("solicita") || 
                        firstLineLower.includes("edificio") || 
                        firstLineLower.includes("elev") || 
                        firstLineLower.includes("dta");

      const startIndex = hasHeader ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        let delimiter = ";";
        if (line.includes("\t")) {
          delimiter = "\t";
        } else if (!line.includes(";") && line.includes(",")) {
          delimiter = ",";
        }

        const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length >= 3) {
          // Sequência Oficial da Planilha TKE (11 Colunas):
          // 0: OS
          // 1: Solicitação
          // 2: Edificio
          // 3: Elev
          // 4: Dta Cham.
          // 5: Fnr atendeu
          // 6: Fil
          // 7: Zon
          // 8: Set
          // 9: Descrição
          // 10: Tipo Contrato

          const osId = cols[0] || `OS-${Date.now()}-${i}`;
          const solicitacao = cols[1] || "";
          const cliente = cols[2] || "Cliente Geral";
          const equipamento = cols[3] || "Elevador 01";
          const dataCham = parseDateBRtoISO(cols[4]);
          const fnrAtendeu = cols[5] || "";
          const filial = cols[6] ? (cols[6].includes("5070") ? "5070" : "5003") : "5003";
          const zonCol = cols[7] || "";
          const setCol = cols[8] || "";
          const descricao = cols[9] || solicitacao || "Atendimento técnico realizado";
          const tipoContrato = cols[10] || (typeof CLIENT_CONTRACT_MAP !== "undefined" && CLIENT_CONTRACT_MAP[cliente]) || "Premium";

          let techName = fnrAtendeu;
          if (techName.includes("(")) {
            techName = techName.split("(")[0].trim();
          }

          let setor = setCol;
          if (!setor) {
            const matchedSector = Object.keys(TKE_SECTOR_TECH_MAP).find(s => TKE_SECTOR_TECH_MAP[s].tecnico === techName);
            setor = matchedSector || `Setor ${(i % 8) + 1}`;
          }

          const normImportedTech = normalizeTechName(techName);
          const finalTech = normImportedTech || (TKE_SECTOR_TECH_MAP[setor]?.tecnico || "Lucas Rodrigues Baccega");
          const codeObj = findFailureCodeByText(`${descricao} ${solicitacao}`);
          const finalZone = normalizeZoneName(zonCol) || (codeObj ? codeObj.zone : classifyZone(descricao, solicitacao));

          parsed.push({
            id: osId,
            data: dataCham,
            filial: filial,
            zonaOperacional: "Zona 2 - Norte",
            setor: setor,
            cliente: cliente,
            equipamento: equipamento,
            contrato: tipoContrato,
            tecnico: finalTech,
            matricula: getTechMatricula(finalTech),
            codigoFalha: codeObj ? codeObj.code : null,
            descricaoFalha: codeObj ? codeObj.name : null,
            solicitacao: solicitacao || (descricao.includes(".") ? descricao.split(".")[0] + "." : descricao),
            descricao: descricao,
            zona: finalZone,
            status: "Concluído"
          });
        }
      }
    }

    if (parsed.length > 0) {
      AppState.data = [...parsed, ...AppState.data];
      saveDataToStorage();

      const allRecurrences = analyzeEquipmentRecurrence(AppState.data);
      const newlyGenerated = ActionPlanManager.autoGeneratePlansForRecurrence(allRecurrences);

      closeImportModal();
      populateTechnicianDropdown();
      renderActiveView();

      if (newlyGenerated.length > 0) {
        showToast(`🎉 ${parsed.length} OS importadas! ${newlyGenerated.length} novo(s) Plano(s) de Ação gerado(s) para preenchimento dos técnicos.`);
      } else {
        showToast(`🎉 ${parsed.length} ordens de serviço importadas com sucesso!`);
      }
    } else {
      alert("Nenhum registro válido pôde ser extraído do texto informado. Verifique se a planilha segue a sequência das 11 colunas.");
    }
  } catch (err) {
    alert("Erro ao processar dados da planilha: " + err.message);
  }
}

function exportDataCSV() {
  const isTech = AppState.currentUser && AppState.currentUser.role === "TECNICO";
  const recordsToExport = isTech 
    ? AppState.data.filter(d => d.tecnico === AppState.currentUser.techName) 
    : AppState.data;

  // Sequência oficial TKE: OS, Solicitação, Edificio, Elev, Dta Cham., Fnr atendeu, Fil, Zon, Set, Descrição, Tipo Contrato, Status
  const headers = ["OS", "Solicitação", "Edificio", "Elev", "Dta Cham.", "Fnr atendeu", "Fil", "Zon", "Set", "Descrição", "Tipo Contrato", "Status"];
  const rows = recordsToExport.map(d => [
    `"${d.id}"`,
    `"${(d.solicitacao || d.descricao || '').replace(/"/g, '""')}"`,
    `"${d.cliente}"`,
    `"${d.equipamento}"`,
    `"${d.data}"`,
    `"${d.tecnico}"`,
    `"${d.filial || '5003'}"`,
    `"${d.zona || classifyZone(d.descricao, d.solicitacao)}"`,
    `"${d.setor || 'Setor 1'}"`,
    `"${(d.descricao || '').replace(/"/g, '""')}"`,
    `"${d.contrato || 'Premium'}"`,
    `"${d.status || 'Concluído'}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const suffix = isTech ? `_${AppState.currentUser.techName.replace(/\s+/g, "_")}` : "_Geral_Master";
  link.setAttribute("download", `TKE_Historico_OS${suffix}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function resetSampleData() {
  if (confirm("Deseja restaurar a base de dados para os dados padrão da TKE com a equipe dos 8 Setores e Códigos Oficiais?")) {
    AppState.data = [...SAMPLE_MAINTENANCE_DATA];
    AppState.data.forEach(item => {
      if (!item.codigoFalha) {
        const detected = findFailureCodeByText(`${item.descricao || ""} ${item.solicitacao || ""}`);
        if (detected) {
          item.codigoFalha = detected.code;
          item.descricaoFalha = detected.name;
          item.zona = detected.zone;
        }
      }
      item.zona = normalizeZoneName(item.zona) || classifyZone(item.descricao, item.solicitacao);
    });
    saveDataToStorage();
    populateTechnicianDropdown();
    renderActiveView();
    showToast("Base de dados restaurada com os técnicos dos Setores 1 a 8 e códigos oficiais!");
  }
}

/**
 * Mapeia o total de chamados corretivos por equipamento (Cliente + Equipamento)
 */
function getEquipmentCallCounts(data) {
  const map = {};
  data.forEach(r => {
    const key = `${r.cliente}___${r.equipamento}`;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

/**
 * Utilitários de Filtragem com Hierarquia Operacional
 */
function getFilteredData(onlySelectedTech = false) {
  let list = AppState.data;

  // Se o usuário logado for Técnico, forçar restrição aos seus dados
  if (AppState.currentUser && AppState.currentUser.role === "TECNICO") {
    const myName = normalizeTechName(AppState.currentUser.techName) || AppState.currentUser.techName;
    list = list.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === myName);
  } else if (onlySelectedTech && AppState.selectedTech) {
    const selName = normalizeTechName(AppState.selectedTech) || AppState.selectedTech;
    list = list.filter(r => (normalizeTechName(r.tecnico) || r.tecnico) === selName);
  }

  if (AppState.filialFilter !== "ALL") {
    list = list.filter(r => (r.filial || "5003") === AppState.filialFilter);
  }
  if (AppState.zonaOpFilter !== "ALL") {
    list = list.filter(r => (r.zonaOperacional || "Zona 2 - Norte") === AppState.zonaOpFilter);
  }
  if (AppState.setorFilter !== "ALL") {
    list = list.filter(r => (r.setor && (r.setor === AppState.setorFilter || AppState.setorFilter.includes(r.setor))));
  }
  if (AppState.zoneFilter !== "ALL") {
    list = list.filter(r => (r.zona || classifyZone(r.descricao, r.solicitacao)) === AppState.zoneFilter);
  }
  if (AppState.contratoFilter && AppState.contratoFilter !== "ALL") {
    list = list.filter(r => (r.contrato || "Premium") === AppState.contratoFilter);
  }
  if (AppState.qtdChamadosFilter && AppState.qtdChamadosFilter !== "ALL") {
    const equipCallCounts = getEquipmentCallCounts(AppState.data);
    list = list.filter(r => {
      const key = `${r.cliente}___${r.equipamento}`;
      const count = equipCallCounts[key] || 0;
      if (AppState.qtdChamadosFilter === "1") return count === 1;
      if (AppState.qtdChamadosFilter === "2") return count === 2;
      if (AppState.qtdChamadosFilter === "3") return count === 3;
      if (AppState.qtdChamadosFilter === "4+") return count >= 4;
      if (AppState.qtdChamadosFilter === "reincidentes") return count >= 2;
      if (AppState.qtdChamadosFilter === "criticos") return count >= 3;
      return true;
    });
  }
  if (AppState.searchFilter) {
    const sf = AppState.searchFilter.toLowerCase();
    list = list.filter(r => 
      (r.cliente && r.cliente.toLowerCase().includes(sf)) ||
      (r.equipamento && r.equipamento.toLowerCase().includes(sf)) ||
      (r.solicitacao && r.solicitacao.toLowerCase().includes(sf)) ||
      (r.descricao && r.descricao.toLowerCase().includes(sf)) ||
      (r.tecnico && r.tecnico.toLowerCase().includes(sf)) ||
      (r.contrato && r.contrato.toLowerCase().includes(sf)) ||
      (r.filial && r.filial.toLowerCase().includes(sf)) ||
      (r.setor && r.setor.toLowerCase().includes(sf)) ||
      (r.codigoFalha && r.codigoFalha.toLowerCase().includes(sf)) ||
      (r.descricaoFalha && r.descricaoFalha.toLowerCase().includes(sf)) ||
      (r.id && r.id.toLowerCase().includes(sf))
    );
  }
  return list;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function getZoneSlug(zone) {
  if (!zone) return "outros";
  const z = String(zone).toLowerCase();
  if (z.includes("cabina")) return "cabina";
  if (z.includes("pavimento") || z.includes("caixa") || z.includes("poço") || z.includes("poco")) return "pavimento-caixa";
  if (z.includes("casa") || z.includes("máquina") || z.includes("maquina")) return "casa-maquinas";
  return "outros";
}

// ==========================================================================
// FLUXO DE REDEFINIÇÃO OBRIGATÓRIA DE SENHA (PRIMEIRO ACESSO)
// ==========================================================================
function openFirstAccessModal(user, enteredPassword = "") {
  const overlay = document.getElementById("modal-first-access-password");
  const authOverlay = document.getElementById("auth-portal-overlay");
  if (!overlay) return;

  if (authOverlay) authOverlay.style.display = "none";

  const usernameInput = document.getElementById("first-access-username");
  const avatarEl = document.getElementById("first-access-avatar");
  const nameEl = document.getElementById("first-access-user-name");
  const metaEl = document.getElementById("first-access-user-meta");
  const tempPassInput = document.getElementById("first-access-temp-pass");
  const newPassInput = document.getElementById("first-access-new-pass");
  const confirmPassInput = document.getElementById("first-access-confirm-pass");
  const errorAlert = document.getElementById("first-access-error");

  if (usernameInput) usernameInput.value = user.username;
  if (avatarEl) avatarEl.textContent = user.avatar || (user.role === "MASTER" ? "🛡️" : "🔧");
  if (nameEl) nameEl.textContent = user.nome;
  if (metaEl) {
    const roleText = user.role === "MASTER" ? "Supervisor / PCM" : "Técnico de Campo";
    metaEl.textContent = `Login: ${user.username} • ${roleText} • Matrícula: ${user.matricula || "10000"} • Filial ${user.filial || "5003 / 5070"}`;
  }

  if (tempPassInput) tempPassInput.value = enteredPassword || user.senhaProvisoria || "Plano@1234";
  if (newPassInput) newPassInput.value = "";
  if (confirmPassInput) confirmPassInput.value = "";
  if (errorAlert) errorAlert.style.display = "none";

  updateFirstAccessStrengthUI();
  overlay.style.display = "flex";
}

function closeFirstAccessModal() {
  const overlay = document.getElementById("modal-first-access-password");
  const authOverlay = document.getElementById("auth-portal-overlay");
  if (overlay) overlay.style.display = "none";
  if (authOverlay) authOverlay.style.display = "flex";
  selectAuthTab(currentAuthTab);
}

function updateFirstAccessStrengthUI() {
  const tempPass = document.getElementById("first-access-temp-pass")?.value || "";
  const newPass = document.getElementById("first-access-new-pass")?.value || "";
  const confirmPass = document.getElementById("first-access-confirm-pass")?.value || "";

  const policy = AuthManager.validatePasswordPolicy(newPass, tempPass);

  const ruleLength = document.getElementById("rule-length");
  const ruleAlphanumeric = document.getElementById("rule-alphanumeric");
  const ruleDifferent = document.getElementById("rule-different");
  const ruleMatch = document.getElementById("rule-match");

  if (ruleLength) {
    ruleLength.className = `rule-item ${policy.lengthOk ? "valid" : "invalid"}`;
    ruleLength.innerHTML = `<span class="rule-icon">${policy.lengthOk ? "✅" : "⚪"}</span> Mínimo de 8 caracteres`;
  }

  if (ruleAlphanumeric) {
    ruleAlphanumeric.className = `rule-item ${policy.alphanumericOk ? "valid" : "invalid"}`;
    ruleAlphanumeric.innerHTML = `<span class="rule-icon">${policy.alphanumericOk ? "✅" : "⚪"}</span> Conter letras e números`;
  }

  const isDistinct = policy.distinctOk && newPass.length > 0;
  if (ruleDifferent) {
    ruleDifferent.className = `rule-item ${isDistinct ? "valid" : "invalid"}`;
    ruleDifferent.innerHTML = `<span class="rule-icon">${isDistinct ? "✅" : "⚪"}</span> Diferente da senha provisória padrão`;
  }

  const isMatch = newPass.length > 0 && newPass === confirmPass;
  if (ruleMatch) {
    ruleMatch.className = `rule-item ${isMatch ? "valid" : "invalid"}`;
    ruleMatch.innerHTML = `<span class="rule-icon">${isMatch ? "✅" : "⚪"}</span> Confirmação de senha idêntica`;
  }

  // Barra de Força
  const bar = document.getElementById("password-strength-bar");
  const text = document.getElementById("password-strength-text");

  if (bar && text) {
    const score = newPass ? policy.score : 0;
    bar.style.width = `${score}%`;
    if (score >= 70) {
      bar.style.backgroundColor = "var(--accent-emerald, #10b981)";
    } else if (score >= 45) {
      bar.style.backgroundColor = "var(--accent-amber, #f59e0b)";
    } else {
      bar.style.backgroundColor = "var(--accent-rose, #ef4444)";
    }
    text.textContent = `Força: ${newPass ? policy.label : "-"} (${score}%)`;
  }
}

function handleFirstAccessResetSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("first-access-username")?.value;
  const tempPass = document.getElementById("first-access-temp-pass")?.value;
  const newPass = document.getElementById("first-access-new-pass")?.value;
  const confirmPass = document.getElementById("first-access-confirm-pass")?.value;
  const errorAlert = document.getElementById("first-access-error");

  const result = AuthManager.completeFirstAccessPasswordReset(username, tempPass, newPass, confirmPass);

  if (result.success) {
    if (errorAlert) errorAlert.style.display = "none";
    const overlay = document.getElementById("modal-first-access-password");
    if (overlay) overlay.style.display = "none";
    showToast(`🎉 Senha definida com sucesso! Bem-vindo ao PLANO 365, ${result.user.nome}!`);
    checkAuthAndRender();
  } else {
    if (errorAlert) {
      errorAlert.textContent = `⚠️ ${result.message || "Erro ao redefinir a senha."}`;
      errorAlert.style.display = "block";
    }
  }
}

// ==========================================================================
// FLUXO DE REDEFINIÇÃO DE SENHA (APÓS PRIMEIRO ACESSO / SOB DEMANDA)
// ==========================================================================
let isResetPasswordLoggedInMode = false;

function openResetPasswordModal(isLoggedIn = false) {
  isResetPasswordLoggedInMode = isLoggedIn;
  const overlay = document.getElementById("modal-reset-password");
  const authOverlay = document.getElementById("auth-portal-overlay");
  const firstAccessOverlay = document.getElementById("modal-first-access-password");

  if (!overlay) return;

  if (firstAccessOverlay) firstAccessOverlay.style.display = "none";
  if (!isLoggedIn && authOverlay) authOverlay.style.display = "none";

  const identifierInput = document.getElementById("input-reset-identifier");
  const currentPassInput = document.getElementById("input-reset-current-pass");
  const newPassInput = document.getElementById("input-reset-new-pass");
  const confirmPassInput = document.getElementById("input-reset-confirm-pass");
  const errorAlert = document.getElementById("reset-password-error");

  if (isLoggedIn && AppState.currentUser) {
    if (identifierInput) {
      identifierInput.value = AppState.currentUser.username || AppState.currentUser.email || "";
      identifierInput.readOnly = true;
      identifierInput.style.opacity = "0.85";
    }
  } else {
    if (identifierInput) {
      const loginUserInput = document.getElementById("input-auth-username")?.value || "";
      identifierInput.value = loginUserInput;
      identifierInput.readOnly = false;
      identifierInput.style.opacity = "1";
    }
  }

  if (currentPassInput) currentPassInput.value = "";
  if (newPassInput) newPassInput.value = "";
  if (confirmPassInput) confirmPassInput.value = "";
  if (errorAlert) errorAlert.style.display = "none";

  updateResetPasswordStrengthUI();
  overlay.style.display = "flex";
}

function closeResetPasswordModal() {
  const overlay = document.getElementById("modal-reset-password");
  const authOverlay = document.getElementById("auth-portal-overlay");
  if (overlay) overlay.style.display = "none";

  if (!isResetPasswordLoggedInMode && (!AppState.currentUser || !AuthManager.getCurrentUser())) {
    if (authOverlay) authOverlay.style.display = "flex";
    selectAuthTab(currentAuthTab);
  }
}

function updateResetPasswordStrengthUI() {
  const currentPass = document.getElementById("input-reset-current-pass")?.value || "";
  const newPass = document.getElementById("input-reset-new-pass")?.value || "";
  const confirmPass = document.getElementById("input-reset-confirm-pass")?.value || "";

  const policy = AuthManager.validatePasswordPolicy(newPass, currentPass);

  const ruleLength = document.getElementById("reset-rule-length");
  const ruleAlphanumeric = document.getElementById("reset-rule-alphanumeric");
  const ruleDifferent = document.getElementById("reset-rule-different");
  const ruleMatch = document.getElementById("reset-rule-match");

  if (ruleLength) {
    ruleLength.className = `rule-item ${policy.lengthOk ? "valid" : "invalid"}`;
    ruleLength.innerHTML = `<span class="rule-icon">${policy.lengthOk ? "✅" : "⚪"}</span> Mínimo de 8 caracteres`;
  }

  if (ruleAlphanumeric) {
    ruleAlphanumeric.className = `rule-item ${policy.alphanumericOk ? "valid" : "invalid"}`;
    ruleAlphanumeric.innerHTML = `<span class="rule-icon">${policy.alphanumericOk ? "✅" : "⚪"}</span> Conter letras e números`;
  }

  const isDistinct = policy.distinctOk && newPass.length > 0;
  if (ruleDifferent) {
    ruleDifferent.className = `rule-item ${isDistinct ? "valid" : "invalid"}`;
    ruleDifferent.innerHTML = `<span class="rule-icon">${isDistinct ? "✅" : "⚪"}</span> Diferente de senhas genéricas`;
  }

  const isMatch = newPass.length > 0 && newPass === confirmPass;
  if (ruleMatch) {
    ruleMatch.className = `rule-item ${isMatch ? "valid" : "invalid"}`;
    ruleMatch.innerHTML = `<span class="rule-icon">${isMatch ? "✅" : "⚪"}</span> Confirmação de senha idêntica`;
  }

  // Barra de Força
  const bar = document.getElementById("reset-password-strength-bar");
  const text = document.getElementById("reset-password-strength-text");

  if (bar && text) {
    const score = newPass ? policy.score : 0;
    bar.style.width = `${score}%`;
    if (score >= 70) {
      bar.style.backgroundColor = "var(--accent-emerald, #10b981)";
    } else if (score >= 45) {
      bar.style.backgroundColor = "var(--accent-amber, #f59e0b)";
    } else {
      bar.style.backgroundColor = "var(--accent-rose, #ef4444)";
    }
    text.textContent = `Força: ${newPass ? policy.label : "-"} (${score}%)`;
  }
}

function handleResetPasswordSubmit(e) {
  e.preventDefault();
  const identifier = document.getElementById("input-reset-identifier")?.value;
  const currentPass = document.getElementById("input-reset-current-pass")?.value;
  const newPass = document.getElementById("input-reset-new-pass")?.value;
  const confirmPass = document.getElementById("input-reset-confirm-pass")?.value;
  const errorAlert = document.getElementById("reset-password-error");

  const result = AuthManager.resetPassword(identifier, currentPass, newPass, confirmPass);

  if (result.success) {
    if (errorAlert) errorAlert.style.display = "none";
    closeResetPasswordModal();
    showToast(`🎉 ${result.message || "Senha redefinida com sucesso!"}`);

    if (!isResetPasswordLoggedInMode) {
      // Preenche os campos do formulário de login prontos para autenticação
      const loginUser = document.getElementById("input-auth-username");
      const loginPass = document.getElementById("input-auth-password");
      if (loginUser && result.user?.username) loginUser.value = result.user.username;
      if (loginPass) loginPass.value = newPass;
    }
  } else {
    if (errorAlert) {
      errorAlert.textContent = `⚠️ ${result.message || "Erro ao redefinir a senha."}`;
      errorAlert.style.display = "block";
    }
  }
}

// ==========================================================================
// MÓDULO ADMINISTRATIVO: GESTÃO DE USUÁRIOS E ACESSOS (PERFIL SUPERVISOR)
// ==========================================================================
function openUserManagementModal() {
  if (AppState.currentUser?.role !== "MASTER") {
    showToast("Acesso restrito: Gestão de Acessos é permitida apenas para Supervisores/Master.");
    return;
  }
  const modal = document.getElementById("modal-user-management");
  if (modal) {
    modal.classList.add("open");
    renderUserManagementTable();
  }
}

function closeUserManagementModal() {
  document.getElementById("modal-user-management")?.classList.remove("open");
}

function renderUserManagementTable() {
  const tbody = document.getElementById("users-table-body");
  if (!tbody) return;

  const users = UserManager.getUsers();
  const search = (document.getElementById("input-search-users")?.value || "").trim().toLowerCase();
  const roleFilter = document.getElementById("select-filter-user-role")?.value || "ALL";
  const statusFilter = document.getElementById("select-filter-user-status")?.value || "ALL";

  // Atualizar contadores no topo do modal
  const statTotal = document.getElementById("stat-total-users");
  const statTech = document.getElementById("stat-tech-users");
  const statSupervisor = document.getElementById("stat-supervisor-users");
  const statPending = document.getElementById("stat-pending-first-access");

  if (statTotal) statTotal.textContent = users.length;
  if (statTech) statTech.textContent = users.filter(u => u.role === "TECNICO").length;
  if (statSupervisor) statSupervisor.textContent = users.filter(u => u.role === "MASTER").length;
  if (statPending) statPending.textContent = users.filter(u => u.primeiro_acesso).length;

  const filtered = users.filter(u => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter === "PENDING" && !u.primeiro_acesso) return false;
    if (statusFilter === "ACTIVE" && u.primeiro_acesso) return false;

    if (search) {
      const matchName = u.nome && u.nome.toLowerCase().includes(search);
      const matchUser = u.username && u.username.toLowerCase().includes(search);
      const matchEmail = u.email && u.email.toLowerCase().includes(search);
      const matchMat = u.matricula && String(u.matricula).includes(search);
      const matchSetor = u.setor && u.setor.toLowerCase().includes(search);
      return matchName || matchUser || matchEmail || matchMat || matchSetor;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">
          Nenhum colaborador encontrado com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isMaster = u.role === "MASTER";
    const statusBadge = u.primeiro_acesso
      ? `<span class="badge-status-pending" title="Aguardando redefinição de senha no primeiro login">⚠️ 1º Acesso Pendente</span>`
      : `<span class="badge-status-active" title="Senha definitiva configurada">✅ Ativo</span>`;

    const roleBadge = isMaster
      ? `<span class="badge-role role-master">🛡️ Supervisor / PCM</span>`
      : `<span class="badge-role role-tech">🔧 Técnico</span>`;

    const isCurrentRootMaster = u.username.toLowerCase() === "master";

    return `
      <tr>
        <td>
          <div class="user-cell-info">
            <span class="user-cell-avatar">${u.avatar || (isMaster ? "🛡️" : "🔧")}</span>
            <div>
              <strong class="user-cell-name">${u.nome}</strong>
              <div class="user-cell-sub">${u.cargo || (isMaster ? "Supervisor PCM" : u.setor)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="user-cell-login">${u.username}</div>
          <small class="user-cell-email">${u.email || "-"}</small>
        </td>
        <td>
          <span class="badge-matricula">${u.matricula || "10000"}</span>
        </td>
        <td>${roleBadge}</td>
        <td>
          <span class="badge-grupo">${u.grupoNivel || "G2"}</span>
        </td>
        <td>
          <div class="user-cell-setor">${u.setor}</div>
          <small style="color: var(--text-muted);">Filial ${u.filial}</small>
        </td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <div class="table-actions-group">
            <button type="button" class="btn-action-icon btn-reset-pass" title="Resetar Senha para 'Plano@1234' (Reativa 1º Acesso)" onclick="handleResetUserPassword('${u.id}')">
              🔄
            </button>
            <button type="button" class="btn-action-icon btn-edit-user" title="Editar Dados do Colaborador" onclick="openUserFormModal('edit', '${u.id}')">
              ✏️
            </button>
            ${!isCurrentRootMaster ? `
              <button type="button" class="btn-action-icon btn-del-user" title="Excluir Colaborador" onclick="handleDeleteUser('${u.id}')">
                🗑️
              </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openUserFormModal(mode = "create", userId = null) {
  const modal = document.getElementById("modal-user-form");
  const title = document.getElementById("user-form-title");
  const form = document.getElementById("form-collaborator");
  const idInput = document.getElementById("user-form-id");
  const tempPassGroup = document.getElementById("user-temp-pass-group");
  const errorAlert = document.getElementById("user-form-error");

  if (!modal || !form) return;
  if (errorAlert) errorAlert.style.display = "none";

  if (mode === "create") {
    if (title) title.innerHTML = "➕ Cadastrar Novo Colaborador";
    form.reset();
    if (idInput) idInput.value = "";
    if (tempPassGroup) tempPassGroup.style.display = "block";
    const tempInput = document.getElementById("input-user-temp-pass");
    if (tempInput) tempInput.value = "Plano@1234";
  } else if (mode === "edit" && userId) {
    if (title) title.innerHTML = "✏️ Editar Colaborador";
    const user = UserManager.getUserById(userId);
    if (!user) return;

    if (idInput) idInput.value = user.id;
    const nameInput = document.getElementById("input-user-fullname");
    const emailInput = document.getElementById("input-user-email");
    const matInput = document.getElementById("input-user-matricula");
    const roleSelect = document.getElementById("select-user-role");
    const grupoSelect = document.getElementById("select-user-grupo");
    const setorSelect = document.getElementById("select-user-setor");
    const filialSelect = document.getElementById("select-user-filial");

    if (nameInput) nameInput.value = user.nome;
    if (emailInput) emailInput.value = user.email;
    if (matInput) matInput.value = user.matricula || "";
    if (roleSelect) roleSelect.value = user.role || "TECNICO";
    if (grupoSelect) grupoSelect.value = user.grupoNivel || "G2";
    if (setorSelect) setorSelect.value = user.setor || "Setor 1";
    if (filialSelect) filialSelect.value = user.filial || "5003 / 5070";

    if (tempPassGroup) tempPassGroup.style.display = "none";
  }

  modal.classList.add("open");
}

function closeUserFormModal() {
  document.getElementById("modal-user-form")?.classList.remove("open");
}

function handleCollaboratorFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("user-form-id")?.value;
  const nome = document.getElementById("input-user-fullname")?.value;
  const email = document.getElementById("input-user-email")?.value;
  const matricula = document.getElementById("input-user-matricula")?.value;
  const role = document.getElementById("select-user-role")?.value;
  const grupoNivel = document.getElementById("select-user-grupo")?.value;
  const setor = document.getElementById("select-user-setor")?.value;
  const filial = document.getElementById("select-user-filial")?.value;
  const senhaProvisoria = document.getElementById("input-user-temp-pass")?.value || "Plano@1234";
  const errorAlert = document.getElementById("user-form-error");

  let result;
  if (!id) {
    // Cadastro de Novo Colaborador (Regra: primeiro_acesso: true por padrão)
    result = UserManager.createUser({
      nome,
      email,
      matricula,
      role,
      grupoNivel,
      setor,
      filial,
      senhaProvisoria
    });
  } else {
    // Atualização de Colaborador Existente
    result = UserManager.updateUser(id, {
      nome,
      email,
      matricula,
      role,
      grupoNivel,
      setor,
      filial
    });
  }

  if (result.success) {
    if (errorAlert) errorAlert.style.display = "none";
    closeUserFormModal();
    renderUserManagementTable();
    populateTechnicianDropdown();
    showToast(result.message || "Colaborador salvo com sucesso!");
  } else {
    if (errorAlert) {
      errorAlert.textContent = `⚠️ ${result.message || "Erro ao salvar colaborador."}`;
      errorAlert.style.display = "block";
    }
  }
}

function handleResetUserPassword(userId) {
  const user = UserManager.getUserById(userId);
  if (!user) return;

  if (confirm(`Deseja resetar a senha de ${user.nome} para a senha padrão provisória "Plano@1234"?\n\nIsso exigirá a troca obrigatória de senha no próximo login.`)) {
    const result = UserManager.resetUserPassword(userId, "Plano@1234");
    if (result.success) {
      renderUserManagementTable();
      showToast(`🔄 Senha de ${user.nome} resetada para Plano@1234! Primeiro acesso reativado.`);
    }
  }
}

function handleDeleteUser(userId) {
  const user = UserManager.getUserById(userId);
  if (!user) return;

  if (confirm(`Tem certeza que deseja excluir o cadastro do colaborador "${user.nome}" (${user.username})?`)) {
    const result = UserManager.deleteUser(userId, AppState.currentUser?.username);
    if (result.success) {
      renderUserManagementTable();
      populateTechnicianDropdown();
      showToast(result.message || "Colaborador removido.");
    } else {
      alert(`⚠️ ${result.message}`);
    }
  }
}

/**
 * Exporta a lista de contatos dos colaboradores em formato CSV / Excel
 */
function exportUsersContactsCSV() {
  const users = UserManager.getUsers();
  if (!users || users.length === 0) {
    showToast("Nenhum colaborador encontrado para exportar.");
    return;
  }

  const search = (document.getElementById("input-search-users")?.value || "").trim().toLowerCase();
  const roleFilter = document.getElementById("select-filter-user-role")?.value || "ALL";
  const statusFilter = document.getElementById("select-filter-user-status")?.value || "ALL";

  // Aplica os filtros ativos na tela
  const recordsToExport = users.filter(u => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter === "PENDING" && !u.primeiro_acesso) return false;
    if (statusFilter === "ACTIVE" && u.primeiro_acesso) return false;

    if (search) {
      const matchName = u.nome && u.nome.toLowerCase().includes(search);
      const matchUser = u.username && u.username.toLowerCase().includes(search);
      const matchEmail = u.email && u.email.toLowerCase().includes(search);
      const matchMat = u.matricula && String(u.matricula).includes(search);
      const matchSetor = u.setor && u.setor.toLowerCase().includes(search);
      return matchName || matchUser || matchEmail || matchMat || matchSetor;
    }
    return true;
  });

  if (recordsToExport.length === 0) {
    showToast("Nenhum colaborador encontrado com os filtros atuais.");
    return;
  }

  const headers = [
    "Matrícula",
    "Nome Completo",
    "Cargo / Função",
    "E-mail de Contato",
    "Login de Acesso",
    "Perfil de Acesso",
    "Nível / Grupo",
    "Setor Operacional",
    "Filial",
    "Status de Acesso",
    "Data de Cadastro"
  ];

  const rows = recordsToExport.map(u => [
    `"${u.matricula || ''}"`,
    `"${(u.nome || '').replace(/"/g, '""')}"`,
    `"${(u.cargo || (u.role === 'MASTER' ? 'Supervisor / PCM' : 'Técnico de Manutenção')).replace(/"/g, '""')}"`,
    `"${(u.email || '').replace(/"/g, '""')}"`,
    `"${(u.username || '').replace(/"/g, '""')}"`,
    `"${u.role === 'MASTER' ? 'Supervisor (MASTER)' : 'Técnico de Campo (TECNICO)'}"`,
    `"${u.grupoNivel || 'G2'}"`,
    `"${(u.setor || '').replace(/"/g, '""')}"`,
    `"${u.filial || '5003 / 5070'}"`,
    `"${u.primeiro_acesso ? '1º Acesso Pendente' : 'Ativo (Senha Definida)'}"`,
    `"${u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : ''}"`
  ]);

  // \uFEFF garante compatibilidade com acentuação no Microsoft Excel
  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `TKE_Contatos_Colaboradores_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`📥 ${recordsToExport.length} contato(s) exportado(s) com sucesso!`);
}

/**
 * Funções de Upload e Importação em Lote de Novos Contatos
 */
function openUploadUsersModal() {
  if (AppState.currentUser?.role !== "MASTER") {
    showToast("Acesso restrito: Importação de colaboradores permitida apenas para Supervisores/Master.");
    return;
  }
  const modal = document.getElementById("modal-upload-users");
  if (modal) {
    document.getElementById("form-upload-users")?.reset();
    modal.classList.add("open");
  }
}

function closeUploadUsersModal() {
  document.getElementById("modal-upload-users")?.classList.remove("open");
}

function downloadSampleUsersTemplateCSV() {
  const headers = ["Matrícula", "Nome Completo", "Cargo", "E-mail", "Perfil", "Nível", "Setor", "Filial"];
  const sampleRows = [
    ["10210", "Carlos Silva", "Técnico de Manutenção - Setor 2", "carlos.silva@operacao365.com", "TECNICO", "G2", "Setor 2", "5003 / 5070"],
    ["10211", "Mariana Santos", "Supervisora de Operações", "mariana.santos@operacao365.com", "MASTER", "Supervisão", "Zona 2 - Norte", "5003 / 5070"],
    ["10212", "Felipe Andrade", "Técnico Especialista - Volante", "felipe.andrade@operacao365.com", "TECNICO", "G3", "Volante / Corretivo", "5003 / 5070"]
  ];

  const csvContent = "\uFEFF" + [headers.join(";"), ...sampleRows.map(r => r.join(";"))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "TKE_Modelo_Importacao_Contatos.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("📋 Modelo de importação baixado!");
}

function handleUsersFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const textarea = document.getElementById("textarea-upload-users-content");
    if (textarea) {
      textarea.value = content;
      showToast(`📁 Arquivo "${file.name}" carregado! Clique em 'Processar e Cadastrar'.`);
    }
  };
  reader.readAsText(file, "UTF-8");
}

function parseAndImportUsersCSV(rawText) {
  if (!rawText || !rawText.trim()) {
    return { success: false, message: "O conteúdo para importação está vazio." };
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    return { success: false, message: "Nenhuma linha com dados encontrada." };
  }

  // Detecta delimitador principal (; \t , |)
  let delimiter = ";";
  if (lines[0].includes(";")) {
    delimiter = ";";
  } else if (lines[0].includes("\t")) {
    delimiter = "\t";
  } else if (lines[0].includes(",")) {
    delimiter = ",";
  } else if (lines[0].includes("|")) {
    delimiter = "|";
  }

  // Verificar se a 1ª linha contém cabeçalhos
  let startIndex = 0;
  let headerMap = null;
  const firstLineCols = lines[0].split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
    .map(c => c.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const hasHeader = firstLineCols.some(h => 
    h.includes("nome") || h.includes("email") || h.includes("e-mail") || 
    h.includes("matr") || h.includes("cargo") || h.includes("setor") || 
    h.includes("perfil") || h.includes("colaborador") || h.includes("função")
  );

  if (hasHeader) {
    startIndex = 1;
    headerMap = {};
    firstLineCols.forEach((h, idx) => {
      if (h.includes("matr") || h === "id" || h === "re" || h === "código") headerMap.matricula = idx;
      else if (h.includes("nome") || h.includes("colaborador") || h.includes("funcionário") || h.includes("técnico") || h.includes("tecnico")) headerMap.nome = idx;
      else if (h.includes("email") || h.includes("e-mail") || h.includes("mail") || h.includes("contato")) headerMap.email = idx;
      else if (h.includes("cargo") || h.includes("função") || h.includes("funcao")) headerMap.cargo = idx;
      else if (h.includes("setor") || h.includes("posto") || h.includes("área") || h.includes("area")) headerMap.setor = idx;
      else if (h.includes("filial") || h.includes("fil")) headerMap.filial = idx;
      else if (h.includes("perfil") || h.includes("role")) headerMap.role = idx;
      else if (h.includes("nível") || h.includes("nivel") || h.includes("grupo")) headerMap.grupoNivel = idx;
    });
  }

  const existingUsers = UserManager.getUsers();
  let createdCount = 0;
  let updatedCount = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
      .map(c => c.trim().replace(/^["']|["']$/g, '').trim());

    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

    let matricula = "";
    let nome = "";
    let email = "";
    let cargo = "";
    let role = "TECNICO";
    let grupoNivel = "G2";
    let setor = "Setor 1";
    let filial = "5003 / 5070";

    if (headerMap) {
      if (headerMap.matricula !== undefined && cols[headerMap.matricula]) matricula = cols[headerMap.matricula];
      if (headerMap.nome !== undefined && cols[headerMap.nome]) nome = cols[headerMap.nome];
      if (headerMap.email !== undefined && cols[headerMap.email]) email = cols[headerMap.email];
      if (headerMap.cargo !== undefined && cols[headerMap.cargo]) cargo = cols[headerMap.cargo];
      if (headerMap.setor !== undefined && cols[headerMap.setor]) setor = cols[headerMap.setor];
      if (headerMap.filial !== undefined && cols[headerMap.filial]) filial = cols[headerMap.filial];
      if (headerMap.role !== undefined && cols[headerMap.role]) role = cols[headerMap.role];
      if (headerMap.grupoNivel !== undefined && cols[headerMap.grupoNivel]) grupoNivel = cols[headerMap.grupoNivel];
    }

    // Se o email não foi mapeado pelo cabeçalho, extrai das colunas por presença de @
    if (!email) {
      const emailCol = cols.find(c => c.includes("@") && c.includes("."));
      if (emailCol) email = emailCol;
    }

    // Se matrícula não foi encontrada
    if (!matricula) {
      const matCol = cols.find(c => /^\d{1,7}$/.test(c) && c !== email);
      if (matCol) matricula = matCol;
    }

    // Se setor não foi encontrado
    if (!setor || setor === "Setor 1") {
      const setCol = cols.find(c => 
        /setor\s*\d/i.test(c) || 
        /volante/i.test(c) || 
        /corretivo/i.test(c) || 
        /pcm/i.test(c) || 
        /zona/i.test(c)
      );
      if (setCol) setor = setCol;
    }

    // Se filial não foi encontrada
    if (!filial || filial === "5003 / 5070") {
      const filCol = cols.find(c => c === "5003" || c === "5070" || c.includes("5003") || c.includes("5070"));
      if (filCol) filial = filCol;
    }

    // Se perfil foi especificado
    if (rawLine.toUpperCase().includes("MASTER") || rawLine.toUpperCase().includes("SUPERVISOR") || rawLine.toUpperCase().includes("SUPERVISORA")) {
      role = "MASTER";
      grupoNivel = "Supervisão";
    }

    // Se nome não foi mapeado
    if (!nome) {
      const candidateNames = cols.filter(c => 
        c !== email && 
        !/^\d{1,7}$/.test(c) && 
        !/^(5003|5070)$/.test(c) && 
        !/^(g1|g2|g3|g4|tecnico|master|supervisor)$/i.test(c) &&
        !/^setor\s*\d$/i.test(c)
      );
      if (candidateNames.length > 0) {
        nome = candidateNames[0];
        if (candidateNames.length > 1 && !cargo) {
          cargo = candidateNames[1];
        }
      }
    }

    // Se o nome contém um e-mail (caso onde só o e-mail foi inserido na linha)
    if (nome && nome.includes("@") && nome.includes(".")) {
      if (!email) email = nome;
      const emailPrefix = email.split("@")[0].toLowerCase();
      const knownSector = Object.keys(TKE_SECTOR_TECH_MAP).find(s => s === setor || emailPrefix.includes(s.toLowerCase().replace(/\s+/g, "")));
      if (knownSector && TKE_SECTOR_TECH_MAP[knownSector]?.tecnico) {
        nome = TKE_SECTOR_TECH_MAP[knownSector].tecnico;
      } else {
        const matchingExisting = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === emailPrefix);
        if (matchingExisting && matchingExisting.nome && !matchingExisting.nome.includes("@")) {
          nome = matchingExisting.nome;
        } else {
          const parts = emailPrefix.replace(/[0-9._-]+/g, " ").trim().split(/\s+/);
          nome = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ") || emailPrefix;
        }
      }
    }

    // Se ainda não tem nome, mas tem email
    if (!nome && email) {
      const emailPrefix = email.split("@")[0];
      const parts = emailPrefix.replace(/[0-9._-]+/g, " ").trim().split(/\s+/);
      nome = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ") || emailPrefix;
    }

    if (!nome && !email) continue;

    // Preserva integralmente os e-mails e nomes encaminhados pelo usuário
    const exactEmail = email.trim();
    const exactNome = nome.trim();

    if (!cargo || cargo.includes("@")) {
      cargo = role === "MASTER" ? "Supervisor de Manutenção & PCM" : `Técnico de Manutenção - ${setor}`;
    }

    const cleanUsername = exactEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");

    // Localizar se já existe na base
    const existingIndex = existingUsers.findIndex(u => 
      (u.email && u.email.toLowerCase() === exactEmail.toLowerCase()) ||
      (exactEmail && u.username && u.username.toLowerCase() === cleanUsername) ||
      (matricula && u.matricula && String(u.matricula) === String(matricula)) ||
      (exactNome && u.nome && u.nome.toLowerCase() === exactNome.toLowerCase())
    );

    if (existingIndex >= 0) {
      // Atualiza os dados preservando rigorosamente o e-mail e nome encaminhados
      existingUsers[existingIndex].nome = exactNome;
      existingUsers[existingIndex].email = exactEmail;
      existingUsers[existingIndex].username = cleanUsername;
      if (cargo) existingUsers[existingIndex].cargo = cargo;
      if (setor) existingUsers[existingIndex].setor = setor;
      if (filial) existingUsers[existingIndex].filial = filial;
      if (grupoNivel) existingUsers[existingIndex].grupoNivel = grupoNivel;
      if (role) existingUsers[existingIndex].role = role;
      existingUsers[existingIndex].techName = exactNome;
      existingUsers[existingIndex].atualizadoEm = new Date().toISOString();
      updatedCount++;
    } else {
      // Novo Colaborador
      const tempPass = "Plano@1234";
      const newUser = {
        id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + "_" + i,
        username: cleanUsername,
        email: exactEmail, // E-mail original intacto
        matricula: matricula || ("10" + Math.floor(100 + Math.random() * 900)),
        nome: exactNome,   // Nome original intacto
        role: role,
        grupoNivel: grupoNivel,
        cargo: cargo,
        filial: filial,
        setor: setor,
        techName: exactNome,
        avatar: role === "MASTER" ? "🛡️" : (setor.toLowerCase().includes("volante") ? "⚡" : "🔧"),
        senha: tempPass,
        senhaHash: UserManager.hashPassword(tempPass),
        senhaProvisoria: tempPass,
        primeiro_acesso: true,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };
      existingUsers.push(newUser);
      createdCount++;
    }
  }

  UserManager.saveUsers(existingUsers);
  return { success: true, createdCount, updatedCount, totalProcessed: createdCount + updatedCount };
}

function handleUploadUsersSubmit(e) {
  e.preventDefault();
  const rawText = document.getElementById("textarea-upload-users-content")?.value;
  if (!rawText || !rawText.trim()) {
    showToast("⚠️ Por favor, selecione um arquivo ou cole os dados dos colaboradores.");
    return;
  }

  const res = parseAndImportUsersCSV(rawText);
  if (res.success) {
    closeUploadUsersModal();
    renderUserManagementTable();
    populateTechnicianDropdown();
    showToast(`🎉 Importação concluída! ${res.createdCount} novo(s) colaborador(es) cadastrado(s) e ${res.updatedCount} atualizado(s).`);
  } else {
    showToast(`⚠️ ${res.message || "Erro ao processar importação de contatos."}`);
  }
}

// Vinculação Global de Handlers para Eventos inline
if (typeof window !== "undefined") {
  window.openFirstAccessModal = openFirstAccessModal;
  window.closeFirstAccessModal = closeFirstAccessModal;
  window.openUserManagementModal = openUserManagementModal;
  window.closeUserManagementModal = closeUserManagementModal;
  window.renderUserManagementTable = renderUserManagementTable;
  window.openUserFormModal = openUserFormModal;
  window.closeUserFormModal = closeUserFormModal;
  window.handleCollaboratorFormSubmit = handleCollaboratorFormSubmit;
  window.handleResetUserPassword = handleResetUserPassword;
  window.handleDeleteUser = handleDeleteUser;
  window.exportUsersContactsCSV = exportUsersContactsCSV;
  window.openUploadUsersModal = openUploadUsersModal;
  window.closeUploadUsersModal = closeUploadUsersModal;
  window.downloadSampleUsersTemplateCSV = downloadSampleUsersTemplateCSV;
  window.handleUsersFileUpload = handleUsersFileUpload;
  window.handleUploadUsersSubmit = handleUploadUsersSubmit;
}

function showToast(message) {
  let toast = document.getElementById("tke-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "tke-toast";
    toast.className = "tke-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => {
    toast.classList.remove("visible");
  }, 3000);
}

/**
 * Funções de Controle de Tema (Modo Escuro / Claro)
 */
function initTheme() {
  const savedTheme = localStorage.getItem("TKE_THEME") || "dark";
  applyTheme(savedTheme, false);
}

function applyTheme(theme, showNotice = false) {
  AppState.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("TKE_THEME", theme);

  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");
  if (icon && text) {
    if (theme === "light") {
      icon.textContent = "🌙";
      text.textContent = "Modo Escuro";
    } else {
      icon.textContent = "☀️";
      text.textContent = "Modo Claro";
    }
  }

  if (showNotice) {
    showToast(theme === "light" ? "☀️ Modo Claro ativado!" : "🌙 Modo Escuro ativado!");
  }
}

function toggleTheme() {
  const newTheme = AppState.theme === "dark" ? "light" : "dark";
  applyTheme(newTheme, true);
  renderActiveView();
}
