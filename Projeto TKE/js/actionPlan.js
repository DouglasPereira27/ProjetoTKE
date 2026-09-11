/**
 * Projeto TKE - Gerenciador de Planos de Ação Técnica
 * Responsável pela criação, persistência em localStorage e emissão de relatórios de Causa-Raiz.
 */

const ActionPlanManager = {
  STORAGE_KEY: "TKE_ACTION_PLANS_V2",

  getAllPlans() {
    try {
      this.initDefaultSamplePlans();
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Erro ao carregar planos de ação:", e);
      return {};
    }
  },

  initDefaultSamplePlans() {
    try {
      const existing = localStorage.getItem(this.STORAGE_KEY);
      if (!existing) {
        // Tentar migrar de V1 se existir
        const oldData = localStorage.getItem("TKE_ACTION_PLANS_V1");
        let initialPlans = {};
        if (oldData) {
          try { initialPlans = JSON.parse(oldData); } catch (err) {}
        }
        
        if (Object.keys(initialPlans).length === 0) {
          initialPlans = {
            "Hospital Metropolitano___ELEV-04 (Leito 1)": {
              cliente: "Hospital Metropolitano",
              equipamento: "ELEV-04 (Leito 1)",
              tecnico: "Douglas Geraldin Bispo",
              zonasAfetadas: "Pavimento / Caixa de corrida",
              causaRaiz: "Desalinhamento do suporte da polia tensora do limitador de velocidade e descalibração na chave de limite/fim de curso.",
              acaoImediata: "Realizar reaperto com torquímetro, alinhamento a laser da polia tensora e reteste de chaves de fim de curso e stop.",
              pecasNecessarias: "Rolamento blindado da polia tensora, chave de fim de curso IP65.",
              prazoExecucao: "2026-09-05",
              status: "Em Elaboração",
              geradoAutomaticamente: true,
              geradoEm: "2026-08-29T10:00:00.000Z",
              atualizadoEm: "2026-09-04T18:30:00.000Z"
            }
          };
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialPlans));
      }
    } catch (e) {
      console.error("Erro ao inicializar planos padrão:", e);
    }
  },

  /**
   * Garante a geração automática de Planos de Ação para todo equipamento
   * que atingir o 2º chamado em período inferior a 30 dias (<30 dias).
   */
  autoGeneratePlansForRecurrence(recurrenceList = []) {
    const allPlans = this.getAllPlans();
    let hasNewGenerated = false;
    const newlyGenerated = [];

    recurrenceList.forEach(rec => {
      // Regra oficial: 2 ou mais atendimentos em menos de 30 dias corridos
      if (rec.totalChamados >= 2 && (rec.intervaloDias < 30 || rec.isCritical)) {
        const key = `${rec.cliente}___${rec.equipamento}`;
        const existingPlan = allPlans[key];

        if (!existingPlan) {
          const techResp = rec.tecnicoPrincipal || (rec.tecnicos && rec.tecnicos[0]) || "Técnico Responsável";
          const zonasStr = rec.zonas ? (Array.isArray(rec.zonas) ? rec.zonas.join(", ") : rec.zonas) : "Geral";
          
          // Prazo de 7 dias a partir do último atendimento registrado
          const lastDate = rec.ultimoChamado ? new Date(rec.ultimoChamado) : new Date();
          const deadlineDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          const formattedDeadline = deadlineDate.toISOString().split("T")[0];

          allPlans[key] = {
            cliente: rec.cliente,
            equipamento: rec.equipamento,
            contrato: rec.contrato || "Premium",
            tecnico: techResp,
            zonasAfetadas: zonasStr,
            totalChamados: rec.totalChamados,
            intervaloDias: rec.intervaloDias,
            primeiroChamado: rec.primeiroChamado,
            ultimoChamado: rec.ultimoChamado,
            causaRaiz: "",
            acaoImediata: "",
            pecasNecessarias: "",
            prazoExecucao: formattedDeadline,
            status: "Pendente de Preenchimento",
            geradoAutomaticamente: true,
            geradoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
          };

          hasNewGenerated = true;
          newlyGenerated.push({ key, ...allPlans[key] });
        }
      }
    });

    if (hasNewGenerated) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPlans));
      } catch (e) {
        console.error("Erro ao persistir planos gerados automaticamente:", e);
      }
    }

    return newlyGenerated;
  },

  isPlanExpired(plan) {
    if (!plan || !plan.prazoExecucao) return false;
    if (plan.status === "Concluído") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = String(plan.prazoExecucao).split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return false;
    const deadline = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
    return deadline < today;
  },

  getDaysOverdue(prazoExecucao) {
    if (!prazoExecucao) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = String(prazoExecucao).split("-").map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return 0;
    const deadline = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
    const diffTime = today.getTime() - deadline.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  },

  getExpiredPlansList(recurrenceList = []) {
    const allPlans = this.getAllPlans();
    const expiredList = [];

    // 1. Planos salvos
    Object.keys(allPlans).forEach(key => {
      const plan = allPlans[key];
      if (this.isPlanExpired(plan)) {
        expiredList.push({
          key: key,
          ...plan,
          daysOverdue: this.getDaysOverdue(plan.prazoExecucao)
        });
      }
    });

    // 2. Equipamentos reincidentes com planos associados
    recurrenceList.forEach(rec => {
      const key = `${rec.cliente}___${rec.equipamento}`;
      const plan = allPlans[key];
      if (plan && this.isPlanExpired(plan)) {
        if (!expiredList.some(e => e.key === key)) {
          expiredList.push({
            key: key,
            ...plan,
            daysOverdue: this.getDaysOverdue(plan.prazoExecucao)
          });
        }
      }
    });

    return expiredList;
  },

  isPlanPending(plan) {
    if (!plan) return true;
    if (!plan.causaRaiz || plan.causaRaiz.trim().length === 0) return true;
    if (!plan.acaoImediata || plan.acaoImediata.trim().length === 0) return true;
    return false;
  },

  getTechPendingAndExpiredPlans(loggedTechName, recurrenceList = []) {
    const allPlans = this.getAllPlans();
    const pendingList = [];
    const expiredList = [];

    const normLogged = typeof normalizeTechName === "function" ? (normalizeTechName(loggedTechName) || loggedTechName) : loggedTechName;

    // Filtrar equipamentos reincidentes sob responsabilidade do técnico
    const myRecurrence = recurrenceList.filter(item => {
      const recTechs = (item.tecnicos || []).map(t => typeof normalizeTechName === "function" ? (normalizeTechName(t) || t) : t);
      const mainTech = typeof normalizeTechName === "function" ? (normalizeTechName(item.tecnicoPrincipal) || item.tecnicoPrincipal) : item.tecnicoPrincipal;
      return recTechs.includes(normLogged) || (mainTech && mainTech === normLogged) || (item.tecnicos && item.tecnicos.includes(loggedTechName));
    });

    myRecurrence.forEach(item => {
      const key = `${item.cliente}___${item.equipamento}`;
      const plan = allPlans[key];

      const isPending = this.isPlanPending(plan);
      const isExpired = this.isPlanExpired(plan);

      const planInfo = {
        key: key,
        cliente: item.cliente,
        equipamento: item.equipamento,
        tecnico: loggedTechName,
        zonasAfetadas: item.zonas ? item.zonas.join(", ") : "",
        totalChamados: item.totalChamados,
        intervaloDias: item.intervaloDias,
        prazoExecucao: plan ? plan.prazoExecucao : null,
        status: plan ? plan.status : "Pendente de Preenchimento",
        isPending: isPending,
        isExpired: isExpired,
        daysOverdue: isExpired && plan ? this.getDaysOverdue(plan.prazoExecucao) : 0,
        causaRaiz: plan ? plan.causaRaiz : "",
        acaoImediata: plan ? plan.acaoImediata : ""
      };

      if (isPending) {
        pendingList.push(planInfo);
      }
      if (isExpired) {
        expiredList.push(planInfo);
      }
    });

    return { pendingList, expiredList, myRecurrence };
  },

  getPlan(equipamentoKey) {
    const plans = this.getAllPlans();
    return plans[equipamentoKey] || null;
  },

  savePlan(equipamentoKey, planData) {
    const plans = this.getAllPlans();
    plans[equipamentoKey] = {
      ...planData,
      atualizadoEm: new Date().toISOString()
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plans));
      return true;
    } catch (e) {
      console.error("Erro ao salvar plano de ação:", e);
      return false;
    }
  },

  getSuggestedDiagnosis(zonasStr = "") {
    const s = String(zonasStr).toLowerCase();
    if (s.includes("cabina")) {
      return {
        causaRaiz: "Desgaste e perda de sensibilidade no conjunto da barreira eletrônica (infravermelho) e desajuste no operador de portas de cabina.",
        acaoImediata: "Realizar calibração óptica da barreira infravermelha, limpeza preditiva de sensores e ajuste de tensão da correia de arraste.",
        pecasNecessarias: "Sensor de barreira eletrônica 220V, correia dentada do operador de porta."
      };
    } else if (s.includes("pavimento") || s.includes("caixa") || s.includes("poço") || s.includes("poco")) {
      return {
        causaRaiz: "Folga mecânica e centelhamento nos contatos elétricos de trinco da porta de pavimento / desalinhamento de guias e chave de limite na caixa de corrida.",
        acaoImediata: "Executar alinhamento micrométrico dos contatos de segurança de trinco, reaperto de suportes e ajuste de pré-tensão na mola espiral de fechamento.",
        pecasNecessarias: "Conjunto de contato elétrico de trinco, mola espiral de retorno, sensor de limite IP65."
      };
    } else if (s.includes("casa") || s.includes("máquina") || s.includes("maquina") || s.includes("comando") || s.includes("motor")) {
      return {
        causaRaiz: "Aquecimento anômalo e vibração por desgaste de contatores de potência e desajuste de folga nas lonas de freio eletromecânico.",
        acaoImediata: "Aferição de folga de lona de freio com cálibre de lâminas (0.15 a 0.25mm), reaperto de bornes e substituição preventiva do bloco de contatos.",
        pecasNecessarias: "Jogo de contatos para contator de potência, conjunto de lonas de freio."
      };
    } else {
      return {
        causaRaiz: "Instabilidade transitória de suprimento elétrico predial / oscilação de fase externa da concessionária.",
        acaoImediata: "Executar vistoria técnica completa nas conexões de entrada de energia, teste de rearme automático e checklist de aterramento.",
        pecasNecessarias: "Fusíveis de proteção ultrarrápidos, relé supervisor de fase."
      };
    }
  },

  createDefaultTemplate(cliente, equipamento, tecnico, zonas = []) {
    const zonasStr = Array.isArray(zonas) ? zonas.join(", ") : (zonas || "");

    return {
      cliente: cliente,
      equipamento: equipamento,
      tecnico: tecnico,
      zonasAfetadas: zonasStr,
      causaRaiz: "",
      acaoImediata: "",
      pecasNecessarias: "",
      prazoExecucao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "Pendente de Preenchimento",
      geradoAutomaticamente: true,
      geradoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
  },

  /**
   * Executa a Auditoria Técnica de Confiabilidade (Prompt 4)
   */
  auditPlan(plan) {
    const causa = (plan.causaRaiz || "").toLowerCase();
    const acao = (plan.acaoImediata || "").toLowerCase();
    const pecas = (plan.pecasNecessarias || "").toLowerCase();
    const zonas = (plan.zonasAfetadas || "");

    // 1. Compatibilidade Técnica
    let compatibilidade = "Compatível";
    let compatibilidadeDesc = "A causa-raiz diagnosticada possui correlação direta com os sintomas mecânicos/elétricos do equipamento.";

    if (causa.length < 15) {
      compatibilidade = "Inconclusivo / Genérico";
      compatibilidadeDesc = "A descrição da causa-raiz é muito resumida. Recomenda-se aplicar a técnica dos 5 Porquês para detalhar a falha do componente.";
    }

    // 2. Classificação: Definitiva vs Paliativa
    let isDefinitiva = false;
    let acaoClassificacao = "Paliativa / Ajuste Superficial";
    let classificacaoDesc = "Atenção: A ação proposta envolve apenas limpeza ou ajustes pontuais. Sem troca de componentes desgastados, há alto risco de retorno do chamado em menos de 30 dias.";

    if (pecas.length > 5 || acao.includes("substitui") || acao.includes("troca") || acao.includes("calibra") || acao.includes("reaperto") || acao.includes("alinhamento")) {
      isDefinitiva = true;
      acaoClassificacao = "Ação Técnica Definitiva";
      classificacaoDesc = "A intervenção contempla correção mecânica/elétrica de precisão e troca de peças críticas para eliminação definitiva do retrabalho.";
    }

    // 3. Pontos de Checagem Complementares (Garantia 60 dias)
    let checkPoints = [];
    if (zonas.includes("Cabina")) {
      checkPoints = [
        "Testar reversão da barreira infravermelha em 3 alturas distintas (fundo, meio e topo).",
        "Aferir folga lateral do patim de arraste contra as rampas de pavimento.",
        "Verificar fixação e tensão da correia dentada do operador de porta com dinamômetro."
      ];
    } else if (zonas.includes("Pavimento")) {
      checkPoints = [
        "Medir pressão residual da mola espiral de fechamento da porta de pavimento.",
        "Verificar ausência de oxidação e centelhamento nos terminais do contato elétrico de segurança.",
        "Inspecionar nivelamento da soleira de pavimento e canaletas de rolamento."
      ];
    } else if (zonas.includes("Poço")) {
      checkPoints = [
        "Checar nível de óleo e estanqueidade dos retentores dos amortecedores hidráulicos.",
        "Aferir alinhamento da polia tensora do limitador e folga do contato elétrico de rompimento.",
        "Testar desarme imediato da chave de stop de emergência e aterramento do poço."
      ];
    } else {
      checkPoints = [
        "Aferir espessura e folga das lonas de freio com cálibre de lâminas (0.15mm a 0.25mm).",
        "Inspecionar desgaste nas pastilhas e pontas de contato dos contatores principais.",
        "Realizar reaperto com torquímetro em todos os bornes de potência do quadro de comando."
      ];
    }

    return {
      isDefinitiva: isDefinitiva,
      compatibilidade: compatibilidade,
      compatibilidadeDesc: compatibilidadeDesc,
      classificacao: acaoClassificacao,
      classificacaoDesc: classificacaoDesc,
      checkPoints: checkPoints
    };
  },

  printPlan(plan) {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Plano de Ação Corretiva e Preventiva - TKE</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #111827;
            padding: 30px;
            margin: 0;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 4px solid #ff5722;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .logo-badge {
            display: inline-block;
            background: linear-gradient(135deg, #7b1fa2 0%, #d81b60 45%, #ff5722 85%);
            color: white;
            font-size: 20px;
            font-weight: 900;
            padding: 4px 12px;
            border-radius: 4px;
            letter-spacing: -0.5px;
          }
          .logo-title {
            font-size: 20px;
            font-weight: 900;
            color: #111827;
            margin-top: 4px;
          }
          .field-group {
            margin-bottom: 18px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
          }
          .field-label {
            font-size: 12px;
            text-transform: uppercase;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 5px;
          }
          .field-value {
            font-size: 15px;
            color: #0f172a;
            font-weight: 500;
            white-space: pre-wrap;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #64748b;
          }
          .signatures {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            text-align: center;
          }
          .sign-line {
            border-top: 1px solid #334155;
            padding-top: 8px;
            font-size: 13px;
            color: #334155;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="logo-badge">TKE</span>
              <span class="logo-title">MOVE BEYOND</span>
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">PLANO 365 — Programa de Levantamento de Ações e Nivelamento Operacional • Confiabilidade & PCM</div>
          </div>
          <div style="background: #ef4444; color: white; padding: 6px 14px; border-radius: 4px; font-weight: bold; font-size: 12px;">CRÍTICO - REINCIDENTE</div>
        </div>

        <div class="grid">
          <div class="field-group">
            <div class="field-label">Cliente / Condomínio</div>
            <div class="field-value">${plan.cliente}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Equipamento Identificado</div>
            <div class="field-value">${plan.equipamento}</div>
          </div>
        </div>

        <div class="grid">
          <div class="field-group">
            <div class="field-label">Técnico Responsável</div>
            <div class="field-value">${plan.tecnico}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Zonas Físicas Afetadas</div>
            <div class="field-value">${plan.zonasAfetadas || "N/A"}</div>
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">1. Causa-Raiz Técnica Diagnosticada (5 Porquês / Análise de Falha)</div>
          <div class="field-value">${plan.causaRaiz || "Não informado"}</div>
        </div>

        <div class="field-group">
          <div class="field-label">2. Ação Corretiva Imediata</div>
          <div class="field-value">${plan.acaoImediata || "Não informado"}</div>
        </div>

        <div class="field-group">
          <div class="field-label">3. Peças / Componentes Necessários para Troca Preventiva</div>
          <div class="field-value">${plan.pecasNecessarias || "Nenhuma peça informada"}</div>
        </div>

        <div class="grid">
          <div class="field-group">
            <div class="field-label">4. Prazo Previsto de Execução</div>
            <div class="field-value">${plan.prazoExecucao || "A definir"}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Status do Plano</div>
            <div class="field-value">${plan.status || "Em Andamento"}</div>
          </div>
        </div>

        <div class="signatures">
          <div>
            <div class="sign-line">${plan.tecnico}<br><small>Técnico Operacional de Campo</small></div>
          </div>
          <div>
            <div class="sign-line">Engenharia de Confiabilidade / Coordenador PCM<br><small>Aprovação de Gestão TKE</small></div>
          </div>
        </div>

        <div class="footer">
          <div>Documento gerado pelo Assistente Especialista de Confiabilidade TKE</div>
          <div>Data de Emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};
