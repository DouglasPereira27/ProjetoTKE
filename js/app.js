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
  masterRecurrenceViewMode: "dashboard", // "dashboard", "table" ou "pie"
  theme: "dark" // "dark" ou "light"
};

// Mapeamento Oficial de Setores e Técnicos TKE
const TKE_SECTOR_TECH_MAP = {
  "Setor 1": { tecnico: "Lucas Rodrigues", filial: "5003", zona: "Zona 2 - Norte" },
  "Setor 2": { tecnico: "Elton Gomes", filial: "5003", zona: "Zona 2 - Norte" },
  "Setor 3": { tecnico: "Willian Wallace", filial: "5003", zona: "Zona 2 - Norte" },
  "Setor 4": { tecnico: "Allison Oliveira", filial: "5003", zona: "Zona 2 - Norte" },
  "Setor 5": { tecnico: "Douglas Bispo", filial: "5070", zona: "Zona 2 - Norte" },
  "Setor 6": { tecnico: "Jose Gomes", filial: "5070", zona: "Zona 2 - Norte" },
  "Setor 7": { tecnico: "Alisson Terencio", filial: "5070", zona: "Zona 2 - Norte" },
  "Setor 8": { tecnico: "Gilmario Manoel", filial: "5070", zona: "Zona 2 - Norte" },
  "Corretivo - Anderson Lemos": { tecnico: "Anderson Lemos", filial: "5003", zona: "Zona 2 - Norte" },
  "Corretivo - Tiago Alves": { tecnico: "Tiago Alves", filial: "5070", zona: "Zona 2 - Norte" },
  "Corretivo - Alexandre Morais": { tecnico: "Alexandre Morais", filial: "5003", zona: "Zona 2 - Norte" }
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
  const savedData = localStorage.getItem("TKE_MAINTENANCE_DATA_V6");
  if (savedData) {
    try {
      AppState.data = JSON.parse(savedData);
    } catch (e) {
      AppState.data = [...SAMPLE_MAINTENANCE_DATA];
    }
  } else {
    AppState.data = [...SAMPLE_MAINTENANCE_DATA];
  }

  // Auto-classificar zona, contrato e matrícula de cada registro se não possuir
  AppState.data.forEach((item, idx) => {
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
    if (!item.matricula) {
      item.matricula = getTechMatricula(item.tecnico);
    }
    if (!item.solicitacao) {
      item.solicitacao = item.descricao && item.descricao.includes(".") ? item.descricao.split(".")[0] + "." : (item.descricao || "Chamado de manutenção");
    }
    if (!item.zona) {
      item.zona = normalizeZoneName(item.zona) || classifyZone(item.descricao, item.solicitacao);
    } else {
      item.zona = normalizeZoneName(item.zona) || item.zona;
    }
  });

  // Identificar primeiro técnico disponível para a visão técnica
  const techs = getUniqueTechnicians();
  if (techs.length > 0 && (!AppState.selectedTech || !techs.includes(AppState.selectedTech))) {
    AppState.selectedTech = techs[0];
  }
}

function saveDataToStorage() {
  localStorage.setItem("TKE_MAINTENANCE_DATA_V6", JSON.stringify(AppState.data));
}

function getUniqueTechnicians() {
  const set = new Set();
  AppState.data.forEach(d => {
    if (d.tecnico) set.add(d.tecnico);
  });
  return Array.from(set).sort();
}

/**
 * Listeners para o Portal de Autenticação Segura
 */
function setupAuthEventListeners() {
  const tabMaster = document.getElementById("tab-auth-master");
  const tabTecnico = document.getElementById("tab-auth-tecnico");
  const selectQuick = document.getElementById("select-quick-user");
  const formAuth = document.getElementById("form-auth-login");
  const btnTogglePass = document.getElementById("btn-toggle-password");
  const passInput = document.getElementById("input-auth-password");
  const btnLogout = document.getElementById("btn-logout");

  tabMaster?.addEventListener("click", () => selectAuthTab("MASTER"));
  tabTecnico?.addEventListener("click", () => selectAuthTab("TECNICO"));

  selectQuick?.addEventListener("change", (e) => {
    const selectedUsername = e.target.value;
    if (selectedUsername) {
      const usernameInput = document.getElementById("input-auth-username");
      const passwordInput = document.getElementById("input-auth-password");
      if (usernameInput) usernameInput.value = selectedUsername;
      if (passwordInput) passwordInput.value = "123";
      const errorAlert = document.getElementById("auth-error-alert");
      if (errorAlert) errorAlert.style.display = "none";
    }
  });

  btnTogglePass?.addEventListener("click", () => {
    if (passInput) {
      const isPass = passInput.getAttribute("type") === "password";
      passInput.setAttribute("type", isPass ? "text" : "password");
      btnTogglePass.textContent = isPass ? "🙈" : "👁️";
    }
  });

  formAuth?.addEventListener("submit", handleLoginSubmit);
  btnLogout?.addEventListener("click", handleLogout);
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
    populateAuthQuickSelect("MASTER");
  } else {
    tabMaster?.classList.remove("active");
    tabTecnico?.classList.add("active");
    if (roleDesc) {
      roleDesc.innerHTML = `<strong>🔧 Acesso Técnico (Operacional/Campo):</strong> Privacidade estrita (apenas seus próprios atendimentos e planos de ação obrigatórios).`;
    }
    populateAuthQuickSelect("TECNICO");
  }
}

function populateAuthQuickSelect(role) {
  const select = document.getElementById("select-quick-user");
  if (!select) return;

  const users = AuthManager.getAllUsers().filter(u => u.role === role);
  select.innerHTML = `<option value="">-- Selecione para preenchimento rápido (${role}) --</option>` +
    users.map(u => {
      const info = u.role === "MASTER" ? u.cargo : `${u.setor} • Filial ${u.filial}`;
      return `<option value="${u.username}">${u.avatar || "👤"} ${u.nome} (${info})</option>`;
    }).join("");

  if (users.length > 0) {
    select.value = users[0].username;
    const userInput = document.getElementById("input-auth-username");
    const passInput = document.getElementById("input-auth-password");
    if (userInput) userInput.value = users[0].username;
    if (passInput) passInput.value = "123";
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById("input-auth-username")?.value;
  const password = document.getElementById("input-auth-password")?.value;
  const errorAlert = document.getElementById("auth-error-alert");

  const result = AuthManager.login(username, password);

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
  const userSessionInfo = document.getElementById("user-session-info");
  const btnLogout = document.getElementById("btn-logout");
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
    if (userSessionInfo) userSessionInfo.style.display = "none";
    if (btnLogout) btnLogout.style.display = "none";
    if (profileToggleContainer) profileToggleContainer.style.display = "none";
    if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
    if (masterView) masterView.style.display = "none";
    if (techView) techView.style.display = "none";
    selectAuthTab(currentAuthTab);
    return;
  }

  // Usuário Autenticado
  if (authOverlay) authOverlay.style.display = "none";
  if (userSessionInfo) userSessionInfo.style.display = "flex";
  if (btnLogout) btnLogout.style.display = "inline-flex";

  // Preencher dados da sessão na navbar
  const avatarEl = document.getElementById("user-session-avatar");
  const nameEl = document.getElementById("user-session-name");
  const roleEl = document.getElementById("user-session-role");

  if (avatarEl) avatarEl.textContent = user.avatar || (user.role === "MASTER" ? "🛡️" : "🔧");
  if (nameEl) nameEl.textContent = user.nome;
  if (roleEl) roleEl.textContent = user.role === "MASTER" ? "🛡️ Master (PCM & Engenharia)" : `🔧 ${user.setor} • Filial ${user.filial}`;

  if (user.role === "MASTER") {
    // Perfil MASTER: Acesso irrestrito a todas as visões e dados
    AppState.profile = "MASTER";
    if (profileToggleContainer) profileToggleContainer.style.display = "inline-flex";
    if (btnResetData) btnResetData.style.display = "inline-flex";
    if (btnImportData) btnImportData.style.display = "inline-flex";
    switchProfile("MASTER");
  } else {
    // Perfil TÉCNICO: Trava estrita de segurança e privacidade (apenas seus próprios atendimentos)
    AppState.profile = "TECNICO";
    AppState.selectedTech = user.techName;
    if (profileToggleContainer) profileToggleContainer.style.display = "none";
    if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
    if (btnResetData) btnResetData.style.display = "none"; // Técnico não pode resetar base global
    if (btnImportData) btnImportData.style.display = "none"; // Técnico não tem acesso a importar base de dados
    switchProfile("TECNICO");
  }
}

/**
 * Configuração de Listeners de Eventos Gerais
 */
function setupEventListeners() {
  // Comutador de Perfil (Apenas Master pode alternar livremente)
  document.getElementById("btn-mode-master")?.addEventListener("click", () => {
    if (AppState.currentUser?.role === "MASTER") switchProfile("MASTER");
  });
  document.getElementById("btn-mode-tecnico")?.addEventListener("click", () => {
    if (AppState.currentUser?.role === "MASTER") switchProfile("TECNICO");
  });

  // Seletor de Técnico no Modo Técnico (para simulação de Gestão Master)
  const techSelect = document.getElementById("select-technician");
  techSelect?.addEventListener("change", (e) => {
    if (AppState.currentUser?.role === "MASTER") {
      AppState.selectedTech = e.target.value;
      renderTechnicianView();
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

  // Botões de Ação Global
  document.getElementById("btn-add-os")?.addEventListener("click", openAddOSModal);
  document.getElementById("btn-import-data")?.addEventListener("click", openImportModal);
  document.getElementById("btn-export-csv")?.addEventListener("click", exportDataCSV);
  document.getElementById("btn-reset-data")?.addEventListener("click", resetSampleData);

  // Alternador de Visualização do Painel de Reincidências (Tabela vs Dashboard vs Gráfico Pizza)
  document.getElementById("btn-view-table")?.addEventListener("click", () => setRecurrenceViewMode("table"));
  document.getElementById("btn-view-dashboard")?.addEventListener("click", () => setRecurrenceViewMode("dashboard"));
  document.getElementById("btn-view-pie")?.addEventListener("click", () => setRecurrenceViewMode("pie"));

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

  // Live Zone Classifier no modal de Nova OS (verificar solicitacao e descricao)
  const descInput = document.getElementById("os-descricao");
  const solInput = document.getElementById("os-solicitacao");
  const zonePreview = document.getElementById("os-zona-preview");
  const updateLiveZone = () => {
    if (zonePreview) {
      const text = `${solInput?.value || ""} ${descInput?.value || ""}`.trim();
      const detected = classifyZone(text);
      zonePreview.textContent = `Zona Detectada: ${detected}`;
    }
  };
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

  const btnMaster = document.getElementById("btn-mode-master");
  const btnTecnico = document.getElementById("btn-mode-tecnico");
  const btnImportData = document.getElementById("btn-import-data");

  if (profile === "MASTER") {
    btnMaster?.classList.add("active");
    btnTecnico?.classList.remove("active");
    if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
    if (btnImportData) btnImportData.style.display = "inline-flex";
    if (profileBanner) {
      profileBanner.innerHTML = `<span class="badge badge-master">🛡️ MODO MASTER: Gestão de Confiabilidade & PCM (Visão Consolidada)</span>`;
    }
  } else {
    btnMaster?.classList.remove("active");
    btnTecnico?.classList.add("active");
    if (btnImportData) btnImportData.style.display = "none"; // Ocultar botão de importar para o perfil técnico

    // Master pode inspecionar qualquer técnico pelo dropdown; Técnico só vê a si mesmo
    if (AppState.currentUser?.role === "MASTER") {
      if (techSelectorWrapper) techSelectorWrapper.style.display = "flex";
      populateTechnicianDropdown();
    } else {
      if (techSelectorWrapper) techSelectorWrapper.style.display = "none";
    }

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
  select.innerHTML = techs.map(t => {
    // Buscar filiais/setores associados a este técnico para exibir no dropdown
    const techOS = AppState.data.filter(r => r.tecnico === t);
    const filial = techOS[0]?.filial ? `Filial ${techOS[0].filial}` : "";
    const setores = Array.from(new Set(techOS.map(r => r.setor).filter(Boolean))).join(", ");
    const info = [filial, setores].filter(Boolean).join(" • ");

    return `<option value="${t}" ${t === AppState.selectedTech ? "selected" : ""}>🔧 ${t} ${info ? `(${info})` : ""}</option>`;
  }).join("");
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

  // 1. Atualizar Cards de KPIs Globais
  const totalOS = records.length;
  const criticalEquipments = recurrenceList.length;
  const totalTechs = techPerformance.length;
  const criticalPercentage = totalOS > 0 ? ((recurrenceList.reduce((acc, r) => acc + r.totalChamados, 0) / totalOS) * 100).toFixed(1) : 0;

  document.getElementById("kpi-total-os").textContent = totalOS;
  document.getElementById("kpi-critical-equipments").textContent = criticalEquipments;
  document.getElementById("kpi-total-techs").textContent = totalTechs;
  document.getElementById("kpi-reincidence-rate").textContent = `${criticalPercentage}%`;

  // Alerta Crítico para o Login Gestor: Planos de Ação Expirados
  renderMasterExpiredPlansAlert(recurrenceList);

  // 2. Renderizar Tabela de Reincidências Críticas (<30 dias)
  renderMasterRecurrenceTable(recurrenceList);

  // 3. Renderizar Desempenho Individual por Técnico
  renderMasterTechPerformance(techPerformance);

  // 4. Renderizar Matriz de Treinamentos e Desenvolvimento (T&D)
  renderMasterTrainingMatrix(trainingMatrix);

  // 5. Renderizar Gráficos Globais
  const zoneCounts = { [ZONES.OUTROS]: 0, [ZONES.CASA_MAQUINAS]: 0, [ZONES.CABINA]: 0, [ZONES.PAVIMENTO_CAIXA]: 0 };
  records.forEach(r => {
    const z = normalizeZoneName(r.zona) || classifyZone(r.descricao, r.solicitacao);
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  });

  ChartManager.renderZoneDoughnut("chart-master-zones", zoneCounts);
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

    statsBar.innerHTML = `
      <div class="recurrence-stat-chip">
        <span class="chip-icon">🚨</span>
        <span>Equipamentos Críticos: <strong class="chip-count">${recurrenceList.length}</strong></span>
      </div>
      <div class="recurrence-stat-chip">
        <span class="chip-icon">📋</span>
        <span>Atendimentos Acumulados: <strong class="chip-count">${totalOSReincidentes}</strong></span>
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
          <p class="text-muted text-sm">Operação da frota operando com estabilidade e sem retrabalhos na janela.</p>
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
            <span class="badge badge-success">Sem Reincidências Graves</span>
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
          <span class="badge badge-danger">Reincidência Detectada (2+ falhas)</span>
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

  const allTechs = Array.from(new Set(AppState.data.map(r => r.tecnico).filter(Boolean))).sort();
  const allBuildings = Array.from(new Set(AppState.data.map(r => r.cliente).filter(Boolean))).sort();

  [techSelect, techTechSelect].forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value || AppState.historyTechFilter || "ALL";
    sel.innerHTML = `<option value="ALL">🔧 Todos os Técnicos</option>` +
      allTechs.map(t => `<option value="${t}">${t}</option>`).join("");
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
    filtered = filtered.filter(r => r.tecnico === AppState.historyTechFilter);
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
        <td><span class="zone-badge zone-${getZoneSlug(zone)}">${zone}</span></td>
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
  const loggedTechName = AppState.currentUser?.role === "TECNICO" ? AppState.currentUser.techName : (AppState.selectedTech || "Lucas Rodrigues");
  if (!loggedTechName) return;

  // Atendimentos próprios do técnico logado (para KPIs individuais e trilha de aprimoramento)
  const myRecords = AppState.data.filter(r => r.tecnico === loggedTechName);
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

  // 1. Atualizar Header do Perfil do Técnico
  document.getElementById("tech-view-name").textContent = loggedTechName;
  document.getElementById("tech-view-total-os").textContent = myRecords.length;
  document.getElementById("tech-view-critical-count").textContent = myRecurrenceList.length;

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

  // 3. Renderizar Gráfico / Separação das Minhas Falhas por Zona
  ChartManager.renderZoneDoughnut("chart-tech-zones", myPerf.zonas);

  // 4. Renderizar Alertas de Reincidência & Modelos de Plano de Ação
  renderTechActionPlansSection(displayRecurrenceList, loggedTechName);

  // 5. Renderizar Módulo de Auto-Aprimoramento
  renderTechSelfImprovement(myPerf, myRecurrenceList);
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
    filtered = filtered.filter(r => 
      (r.cliente && r.cliente.toLowerCase().includes(AppState.searchFilter)) ||
      (r.equipamento && r.equipamento.toLowerCase().includes(AppState.searchFilter)) ||
      (r.tecnico && r.tecnico.toLowerCase().includes(AppState.searchFilter)) ||
      (r.matricula && r.matricula.toLowerCase().includes(AppState.searchFilter)) ||
      (r.contrato && r.contrato.toLowerCase().includes(AppState.searchFilter)) ||
      (r.filial && r.filial.toLowerCase().includes(AppState.searchFilter)) ||
      (r.setor && r.setor.toLowerCase().includes(AppState.searchFilter)) ||
      (r.solicitacao && r.solicitacao.toLowerCase().includes(AppState.searchFilter)) ||
      (r.descricao && r.descricao.toLowerCase().includes(AppState.searchFilter)) ||
      (r.id && r.id.toLowerCase().includes(AppState.searchFilter))
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
        <td><span class="zone-badge zone-${getZoneSlug(zone)}">${zone}</span></td>
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
        <p class="text-muted">Você não possui reincidências críticas acumuladas. Continue revisando os procedimentos padrão de manutenção preventiva e lubrificação técnica.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header-styled">
        <div>
          <h4>🎯 Matriz Pessoal de Auto-Aprimoramento Técnico</h4>
          <span class="text-muted text-sm">Baseado exclusivamente nos seus atendimentos reincidentes para elevar sua assertividade em campo:</span>
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
  const readonlyNotice = document.getElementById("plan-readonly-notice");

  if (causaInput) causaInput.disabled = false;
  if (acaoInput) acaoInput.disabled = false;
  if (pecasInput) pecasInput.disabled = false;
  if (prazoInput) prazoInput.disabled = false;
  if (statusInput) statusInput.disabled = false;
  if (btnSave) btnSave.style.display = "inline-flex";
  if (readonlyNotice) readonlyNotice.style.display = "none";

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
  document.getElementById("os-zona-preview").textContent = "Zona Detectada: Cabina";
  const contratoSelect = document.getElementById("os-contrato");
  if (contratoSelect) contratoSelect.value = "Premium";
  
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
  const newOS = {
    id: `OS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    data: document.getElementById("os-data").value,
    filial: filialVal,
    zonaOperacional: document.getElementById("os-zona-op")?.value || "Zona 2 - Norte",
    setor: setorVal,
    cliente: document.getElementById("os-cliente").value,
    equipamento: document.getElementById("os-equipamento").value,
    contrato: contratoVal,
    tecnico: tecnicoVal,
    solicitacao: solicitacao,
    descricao: descricao,
    zona: classifyZone(descricao, solicitacao),
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

          const finalTech = techName || (TKE_SECTOR_TECH_MAP[setor]?.tecnico || "Lucas Rodrigues");
          const finalZone = normalizeZoneName(zonCol) || classifyZone(descricao, solicitacao);

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
  if (confirm("Deseja restaurar a base de dados para os dados padrão da TKE com a equipe dos 8 Setores?")) {
    AppState.data = [...SAMPLE_MAINTENANCE_DATA];
    AppState.data.forEach(item => {
      item.zona = classifyZone(item.descricao, item.solicitacao);
    });
    saveDataToStorage();
    populateTechnicianDropdown();
    renderActiveView();
    showToast("Base de dados restaurada com os técnicos dos Setores 1 a 8!");
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
    list = list.filter(r => r.tecnico === AppState.currentUser.techName);
  } else if (onlySelectedTech && AppState.selectedTech) {
    list = list.filter(r => r.tecnico === AppState.selectedTech);
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
    list = list.filter(r => 
      (r.cliente && r.cliente.toLowerCase().includes(AppState.searchFilter)) ||
      (r.equipamento && r.equipamento.toLowerCase().includes(AppState.searchFilter)) ||
      (r.solicitacao && r.solicitacao.toLowerCase().includes(AppState.searchFilter)) ||
      (r.descricao && r.descricao.toLowerCase().includes(AppState.searchFilter)) ||
      (r.tecnico && r.tecnico.toLowerCase().includes(AppState.searchFilter)) ||
      (r.contrato && r.contrato.toLowerCase().includes(AppState.searchFilter)) ||
      (r.filial && r.filial.toLowerCase().includes(AppState.searchFilter)) ||
      (r.setor && r.setor.toLowerCase().includes(AppState.searchFilter)) ||
      (r.id && r.id.toLowerCase().includes(AppState.searchFilter))
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
