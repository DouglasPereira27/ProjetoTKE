/**
 * Projeto TKE - Motor de Inteligência Artificial para Plano de Desenvolvimento Individual (PDI)
 * Gera diagnósticos preditivos e planos técnicos de capacitação baseados nas reincidências por zona física:
 * - Casa de Máquinas
 * - Cabina
 * - Pavimento / Caixa de corrida
 * - Outros
 */

const AITechPlanEngine = {
  STORAGE_KEY: "TKE_AI_TECH_PDI_V1",

  getAllPlans() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Erro ao carregar planos de IA:", e);
      return {};
    }
  },

  getPlan(techName) {
    if (!techName) return null;
    const plans = this.getAllPlans();
    const norm = typeof normalizeTechName === "function" ? normalizeTechName(techName) : techName;
    return plans[norm] || plans[techName] || null;
  },

  savePlan(techName, plan) {
    if (!techName || !plan) return;
    const plans = this.getAllPlans();
    const norm = typeof normalizeTechName === "function" ? normalizeTechName(techName) : techName;
    plans[norm] = plan;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.error("Erro ao salvar plano de IA:", e);
    }
  },

  /**
   * Analisa os chamados e reincidências de um técnico e gera o PDI com Inteligência Artificial
   */
  generatePlan(techName) {
    const normName = typeof normalizeTechName === "function" ? (normalizeTechName(techName) || techName) : techName;
    const allRecords = AppState.data || [];
    const techRecords = allRecords.filter(r => (typeof normalizeTechName === "function" ? normalizeTechName(r.tecnico) : r.tecnico) === normName);

    // Calcular reincidências (<30 dias) no escopo deste técnico
    const allRecurrences = typeof analyzeEquipmentRecurrence === "function" ? analyzeEquipmentRecurrence(allRecords) : [];
    const techRecurrences = allRecurrences.filter(rec => rec.tecnicos && rec.tecnicos.includes(normName));

    // Mapear métricas por zona física
    const zoneMetrics = {
      [ZONES.CASA_MAQUINAS]: { count: 0, codes: {}, chamados: [], reincidencias: 0 },
      [ZONES.CABINA]: { count: 0, codes: {}, chamados: [], reincidencias: 0 },
      [ZONES.PAVIMENTO_CAIXA]: { count: 0, codes: {}, chamados: [], reincidencias: 0 },
      [ZONES.OUTROS]: { count: 0, codes: {}, chamados: [], reincidencias: 0 }
    };

    techRecords.forEach(rec => {
      const z = (typeof normalizeZoneName === "function" && normalizeZoneName(rec.zona)) ||
                (typeof classifyZone === "function" && classifyZone(rec.descricao, rec.solicitacao)) ||
                ZONES.OUTROS;
      
      const targetZone = zoneMetrics[z] ? z : ZONES.OUTROS;
      zoneMetrics[targetZone].count++;
      zoneMetrics[targetZone].chamados.push(rec);

      const code = rec.codigoFalha || "S/C";
      zoneMetrics[targetZone].codes[code] = (zoneMetrics[targetZone].codes[code] || 0) + 1;
    });

    // Mapear reincidências por zona
    techRecurrences.forEach(rec => {
      rec.chamados.forEach(c => {
        const z = (typeof normalizeZoneName === "function" && normalizeZoneName(c.zona)) ||
                  (typeof classifyZone === "function" && classifyZone(c.descricao, c.solicitacao)) ||
                  ZONES.OUTROS;
        if (zoneMetrics[z]) {
          zoneMetrics[z].reincidencias++;
        }
      });
    });

    // Identificar Zona Mais Crítica (Gargalo Técnico)
    let criticalZone = ZONES.CABINA;
    let maxReincidence = -1;
    let maxCalls = -1;

    for (const [zone, metrics] of Object.entries(zoneMetrics)) {
      if (metrics.reincidencias > maxReincidence || (metrics.reincidencias === maxReincidence && metrics.count > maxCalls)) {
        maxReincidence = metrics.reincidencias;
        maxCalls = metrics.count;
        criticalZone = zone;
      }
    }

    // Calcular Índice de Risco e Confiabilidade
    const totalCalls = techRecords.length;
    const totalReinc = techRecurrences.length;
    let riskLevel = "Baixo";
    let riskColor = "var(--accent-emerald)";
    let reliabilityScore = 95;

    if (totalReinc >= 4 || maxReincidence >= 6) {
      riskLevel = "Crítico";
      riskColor = "var(--accent-rose)";
      reliabilityScore = Math.max(45, 100 - (totalReinc * 12));
    } else if (totalReinc >= 1 || maxReincidence >= 2) {
      riskLevel = "Moderado / Atenção";
      riskColor = "var(--accent-amber)";
      reliabilityScore = Math.max(68, 100 - (totalReinc * 8));
    }

    // Gerar Diagnóstico Detalhado por Zona com Recomendações de IA
    const zonePlans = {};

    // 1. CASA DE MÁQUINAS
    zonePlans[ZONES.CASA_MAQUINAS] = {
      zona: ZONES.CASA_MAQUINAS,
      ocorrencias: zoneMetrics[ZONES.CASA_MAQUINAS].count,
      reincidencias: zoneMetrics[ZONES.CASA_MAQUINAS].reincidencias,
      isCritica: criticalZone === ZONES.CASA_MAQUINAS,
      diagnosticoIA: "Padrão de falhas térmicas e desgastes eletromecânicos em quadros de comando, inversores de frequência (VVF), bobinas de freio e contatores principais.",
      acoesPreventivas: [
        "Executar inspeção termográfica periódica com termômetro infravermelho em barramentos e contatores sob carga total.",
        "Aferição e ajuste da folga de pastilhas/lonas do freio eletromecânico e teste de abertura manual de emergência.",
        "Verificação de ruídos em rolamentos da máquina de tração e limpeza do tacômetro/encoder com spray limpa-contatos específico."
      ],
      acoesCorretivas: [
        "Reparâmetrização completa da rampa de desaceleração e ganho de corrente do inversor para eliminar vibrações e trancos.",
        "Substituição preventiva do conjunto de contatores de potência que apresentem queima de platinados ou centelhamento.",
        "Revisão do circuito de desarme do limitador de velocidade com desarme manual e medição de contato elétrico."
      ],
      checklistCampo: [
        "Medição de tensão trifásica de entrada e aterramento (tolerância máxima ±5%).",
        "Teste de abertura uniforme de ambas as sapatas do freio eletromecânico.",
        "Reaperto com chave dinamométrica de todos os bornes de potência do quadro.",
        "Limpeza de filtros e verificação da ventilação forçada do armário de comando."
      ],
      errosAEliminar: "Trocar fusíveis de comando sem isolar a causa do curto-circuito ou reiniciar inversores sem registrar códigos de falha internos."
    };

    // 2. CABINA
    zonePlans[ZONES.CABINA] = {
      zona: ZONES.CABINA,
      ocorrencias: zoneMetrics[ZONES.CABINA].count,
      reincidencias: zoneMetrics[ZONES.CABINA].reincidencias,
      isCritica: criticalZone === ZONES.CABINA,
      diagnosticoIA: "Concentração de retrabalhos em operadores de porta de cabina, desalinhamento de patins de arraste, barreiras infravermelhas descalibradas e folgas em corrediças.",
      acoesPreventivas: [
        "Calibração preventiva e limpeza óptica dos feixes infravermelhos da barreira eletrônica multidirecional.",
        "Ajuste da tensão da correia dentada do operador de porta e verificação da concentricidade das polias.",
        "Inspeção e lubrificação com grafite seco nas canaletas e troca preventiva de roletes com desgaste excêntrico."
      ],
      acoesCorretivas: [
        "Regulagem cinemática da rampa de aproximação e desaceleração do operador para eliminar impactos nas batentes.",
        "Alinhamento micrométrico do patim de arraste móvel para garantir acoplamento suave nas trincas de pavimento.",
        "Substituição de contatos de segurança de porta de cabina oxidados e ajuste do curso útil do interruptor de segurança."
      ],
      checklistCampo: [
        "Teste de reversão automática com barreira ótica obstruída e com esforço mecânico (<150N).",
        "Aferição do paralelismo entre as folhas de cabina e a soleira metálica.",
        "Verificação da fixação dos braços articulados e amortecedores de fim de curso da porta.",
        "Teste funcional da botoeira de cabina, display e iluminação de emergência."
      ],
      errosAEliminar: "Aplicar óleo lubrificante líquido em canais de soleira (gera acúmulo de poeira e trava corrediças) ou aumentar a força do motor de porta para compensar atrito mecânico."
    };

    // 3. PAVIMENTO / CAIXA DE CORRIDA
    zonePlans[ZONES.PAVIMENTO_CAIXA] = {
      zona: ZONES.PAVIMENTO_CAIXA,
      ocorrencias: zoneMetrics[ZONES.PAVIMENTO_CAIXA].count,
      reincidencias: zoneMetrics[ZONES.PAVIMENTO_CAIXA].reincidencias,
      isCritica: criticalZone === ZONES.PAVIMENTO_CAIXA,
      diagnosticoIA: "Incidência reincidente em trincos de pavimento, contatos elétricos centelhados, perda de pressão de molas fechadoras e chaves de limite de curso.",
      acoesPreventivas: [
        "Revisão sistemática de torque em suportes de trincos de andar e ajuste da folga de engate da alavanca.",
        "Calibração da tensão de molas espirais e fechadores mecânicos para garantir fechamento autônomo suave e completo.",
        "Desobstrução e aspiração preditiva de soleiras de pavimento em todos os andares de tráfego intenso."
      ],
      acoesCorretivas: [
        "Alinhamento micrométrico e substituição de blocos de contato elétrico de trinco queimados por arco elétrico.",
        "Aferição e reajuste da posição das chaves de corte de alta/baixa velocidade e fins de curso no topo e fundo do poço.",
        "Alinhamento a laser da polia tensora do limitador e regulagem do interruptor elétrico de afrouxamento de cabo."
      ],
      checklistCampo: [
        "Verificação do travamento mecânico efetivo antes do fechamento do contato elétrico de trinco.",
        "Teste de abertura de emergência por chave de destravamento em todos os pavimentos.",
        "Inspeção de folga das corrediças nas guias da caixa de corrida e lubrificação por mecha.",
        "Verificação visual de umidade, estanqueidade e chaves de STOP no fundo do poço."
      ],
      errosAEliminar: "Lixar contatos elétricos de trinco já desgastados (retira camada nobre de prata, provocando reincidência em menos de 15 dias) em vez de substituir o bloco completo."
    };

    // 4. OUTROS
    zonePlans[ZONES.OUTROS] = {
      zona: ZONES.OUTROS,
      ocorrencias: zoneMetrics[ZONES.OUTROS].count,
      reincidencias: zoneMetrics[ZONES.OUTROS].reincidencias,
      isCritica: criticalZone === ZONES.OUTROS,
      diagnosticoIA: "Ocorrências relacionadas a fatores externos (oscilação da concessionária de energia, vandalismo, vistorias prediais e instruções a usuários).",
      acoesPreventivas: [
        "Elaboração de checklist preditivo com auditoria de aterramento, no-break e relé falta de fase.",
        "Realização de diálogo técnico consultivo com síndicos e administradores sobre o uso consciente e conservação.",
        "Alinhamento com equipes prediais sobre protocolos em períodos de chuva e obras civis no condomínio."
      ],
      acoesCorretivas: [
        "Procedimentos padronizados de resgate com nivelamento seguro e sinalização de isolamento de área.",
        "Instalação de protetores de surto (DPS) e filtros de linha contra transientes da rede elétrica.",
        "Investigação rigorosa de causa raiz para chamados sem defeito aparente (DND) para identificar falhas intermitentes."
      ],
      checklistCampo: [
        "Conferência do quadro geral de distribuição de energia do edifício e disjuntores de entrada.",
        "Teste de autonomia da bateria de resgate automático e comunicação bidirecional do interfone.",
        "Verificação de trancas de segurança na casa de máquinas e portas de acesso à caixa de corrida."
      ],
      errosAEliminar: "Encerrar chamados com 'sem defeito constatado' sem realizar testes de estresse e verificação de histórico prévio de ocorrências no equipamento."
    };

    // Estruturação do Plano Completo PDI com IA
    const plan = {
      tecnico: normName,
      matricula: (typeof getTechMatricula === "function" && getTechMatricula(normName)) || "10101",
      geradoEm: new Date().toISOString(),
      totalChamados: totalCalls,
      totalReincidencias: totalReinc,
      zonaCritica: criticalZone,
      scoreConfiabilidade: reliabilityScore,
      nivelRisco: riskLevel,
      riskColor: riskColor,
      metricasZonas: zoneMetrics,
      detalhesZonas: zonePlans,
      cronogramaEvolucao: {
        fase30: {
          periodo: "0 a 30 dias (Fase I: Estabilização Imediata)",
          foco: `Eliminação imediata dos pontos de retrabalho na Zona: ${criticalZone}.`,
          acoes: [
            `Auditoria completa nos equipamentos reincidentes com foco em ${criticalZone}.`,
            "Substituição de peças com desgaste intermitente (contatos, roletes, molas).",
            "Acompanhamento presencial conjunto com o Supervisor Técnico no próximo atendimento crítico."
          ],
          meta: "Zero reincidências nos equipamentos atendidos nos últimos 30 dias."
        },
        fase60: {
          periodo: "31 a 60 dias (Fase II: Capacitação Técnica Avançada)",
          foco: "Aprimoramento de técnicas de diagnóstico micrométrico e parametrização de sistemas.",
          acoes: [
            "Conclusão do módulo técnico avançado TKE de operadores e trincos.",
            "Treinamento prático de calibração com osciloscópio / software de monitoramento de inversores.",
            "Implementação de rotina padrão de manutenção preventiva preditiva de 45 minutos por elevador."
          ],
          meta: "Elevação do índice de conformidade técnica em auditorias para >92%."
        },
        fase90: {
          periodo: "61 a 90 dias (Fase III: Excelência Operacional e Certificação)",
          foco: "Consolidação de alta confiabilidade operacional e autonomia diagnóstica.",
          acoes: [
            "Avaliação prática de proficiência técnica de campo pelo Especialista Regional.",
            "Benchmarking e compartilhamento de melhores práticas com a equipe de técnicos volantes.",
            "Revisão formal de resultados e atualização dos indicadores de confiabilidade no dashboard."
          ],
          meta: "Redução comprovada de no mínimo 75% nos chamados corretivos por zona."
        }
      },
      metasGlobais: {
        reducaoRechamados: "-75%",
        mtbfAlvo: "> 180 dias sem falhas",
        aderenciaPreventiva: "100%",
        avaliacaoSupervisor: "Aprovado com recomendação de acompanhamento quinzenal"
      }
    };

    // Salvar no repositório local
    this.savePlan(normName, plan);
    return plan;
  },

  /**
   * Abre o Modal do Plano de IA (PDI)
   */
  openModal(techName) {
    if (!techName) return;
    const norm = typeof normalizeTechName === "function" ? (normalizeTechName(techName) || techName) : techName;
    let plan = this.getPlan(norm);

    // Gerar plano se ainda não existir
    if (!plan) {
      plan = this.generatePlan(norm);
    }

    const modalEl = document.getElementById("modal-ai-tech-pdi");
    const contentEl = document.getElementById("ai-tech-pdi-modal-content");
    if (!modalEl || !contentEl) return;

    contentEl.innerHTML = this.renderPlanHTML(plan);
    modalEl.style.display = "flex";
  },

  closeModal() {
    const modalEl = document.getElementById("modal-ai-tech-pdi");
    if (modalEl) modalEl.style.display = "none";
  },

  /**
   * Gera o HTML rico do Plano de IA
   */
  renderPlanHTML(plan) {
    const dateFormatted = new Date(plan.geradoEm).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const zoneIcons = {
      [ZONES.CASA_MAQUINAS]: "⚡",
      [ZONES.CABINA]: "🚪",
      [ZONES.PAVIMENTO_CAIXA]: "🧱",
      [ZONES.OUTROS]: "🌐"
    };

    return `
      <div class="ai-pdi-container">
        <!-- Header do PDI -->
        <div class="ai-pdi-header">
          <div class="ai-pdi-header-left">
            <div class="ai-pdi-badge">
              <span class="ai-sparkle">✨</span>
              <span>PLANO DE IA • DESENVOLVIMENTO INDIVIDUAL (PDI)</span>
            </div>
            <h2 class="ai-pdi-title">🔧 ${plan.tecnico}</h2>
            <div class="ai-pdi-subtitle">
              <span>Matrícula: <strong>${plan.matricula}</strong></span>
              <span>•</span>
              <span>Gerado por IA em: <strong>${dateFormatted}</strong></span>
            </div>
          </div>
          <div class="ai-pdi-header-right">
            <div class="ai-score-card">
              <span class="ai-score-label">Índice de Confiabilidade</span>
              <span class="ai-score-value" style="color: ${plan.riskColor};">${plan.scoreConfiabilidade}%</span>
              <span class="ai-risk-tag" style="background: rgba(255,255,255,0.08); color: ${plan.riskColor}; border: 1px solid ${plan.riskColor};">
                Status: ${plan.nivelRisco}
              </span>
            </div>
          </div>
        </div>

        <!-- Alerta de Diagnóstico Crítico da IA -->
        <div class="ai-pdi-summary-alert">
          <div class="ai-summary-icon">🧠</div>
          <div class="ai-summary-text">
            <strong>Diagnóstico de IA:</strong> O histórico de atendimentos revela que o principal gargalo técnico está concentrado na <span class="badge badge-danger" style="font-size: 12px;">Zona: ${plan.zonaCritica}</span>. As ações abaixo foram calculadas pela IA para sanar as causas-raiz recorrentes e elevar a assertividade em campo.
          </div>
        </div>

        <!-- Seção 1: Diagnóstico e Ações por Zonas Físicas -->
        <div class="ai-pdi-section">
          <h3 class="ai-section-heading">📍 1. Plano de Aprimoramento Técnico por Zonas Físicas</h3>
          
          <div class="ai-zones-grid">
            ${Object.values(plan.detalhesZonas).map(zoneDetail => {
              const icon = zoneIcons[zoneDetail.zona] || "🔧";
              const isCrit = zoneDetail.isCritica;
              
              return `
                <div class="ai-zone-card ${isCrit ? 'ai-zone-card-critical' : ''}">
                  <div class="ai-zone-card-header">
                    <div class="d-flex align-items-center gap-2">
                      <span style="font-size: 20px;">${icon}</span>
                      <strong style="font-size: 14px;">${zoneDetail.zona}</strong>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      ${isCrit ? '<span class="badge badge-danger" style="font-size: 10px; animation: pulse 2s infinite;">🔥 Foco Prioritário IA</span>' : ''}
                      <span class="badge badge-outline" style="font-size: 11px;">${zoneDetail.ocorrencias} chamados</span>
                    </div>
                  </div>

                  <div class="ai-zone-card-body">
                    <!-- Diagnóstico de Causa Raiz IA -->
                    <div class="ai-box-diagnostic">
                      <strong class="text-xs" style="color: var(--accent-cyan); text-transform: uppercase;">🔍 Causa-Raiz Diagnosticada pela IA:</strong>
                      <p class="text-sm mt-1 mb-0">${zoneDetail.diagnosticoIA}</p>
                    </div>

                    <!-- Ações Corretivas para Eliminar Retrabalho -->
                    <div class="ai-box-actions mt-3">
                      <h5 class="text-danger-accent" style="font-size: 12px; margin-bottom: 6px;">⚙️ Ações Práticas para Eliminar Retrabalho:</h5>
                      <ul class="ai-action-list">
                        ${zoneDetail.acoesCorretivas.map(a => `<li>${a}</li>`).join("")}
                      </ul>
                    </div>

                    <!-- Ações Preventivas para Aumentar MTBF -->
                    <div class="ai-box-actions mt-3">
                      <h5 class="text-primary-accent" style="font-size: 12px; margin-bottom: 6px;">🛡️ Procedimentos Preventivos Padronizados:</h5>
                      <ul class="ai-action-list">
                        ${zoneDetail.acoesPreventivas.map(a => `<li>${a}</li>`).join("")}
                      </ul>
                    </div>

                    <!-- Checklist Prático de Campo -->
                    <div class="ai-box-checklist mt-3">
                      <strong class="text-xs" style="color: var(--accent-emerald); text-transform: uppercase;">📋 Checklist Obrigatório de Campo (Próxima OS):</strong>
                      <div class="ai-checklist-items mt-2">
                        ${zoneDetail.checklistCampo.map((item, idx) => `
                          <label class="ai-check-label">
                            <input type="checkbox" checked onclick="return false;">
                            <span>${item}</span>
                          </label>
                        `).join("")}
                      </div>
                    </div>

                    <!-- Erro Crítico a Eliminar -->
                    <div class="ai-box-warning mt-3">
                      <span style="color: #f87171;">⚠️ <strong>Erro a Eliminar em Campo:</strong> ${zoneDetail.errosAEliminar}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Seção 2: Cronograma de Evolução Técnica (30-60-90 dias) -->
        <div class="ai-pdi-section mt-4">
          <h3 class="ai-section-heading">📅 2. Cronograma de Evolução Técnica (30, 60 e 90 Dias)</h3>
          
          <div class="ai-timeline-grid">
            <div class="ai-timeline-card phase-1">
              <div class="ai-timeline-badge">Fase 1 • 30 Dias</div>
              <h4>🛡️ Estabilização Imediata</h4>
              <p class="text-xs text-muted mb-2">${plan.cronogramaEvolucao.fase30.foco}</p>
              <ul class="ai-action-list">
                ${plan.cronogramaEvolucao.fase30.acoes.map(a => `<li>${a}</li>`).join("")}
              </ul>
              <div class="ai-timeline-meta">🎯 Meta: <strong>${plan.cronogramaEvolucao.fase30.meta}</strong></div>
            </div>

            <div class="ai-timeline-card phase-2">
              <div class="ai-timeline-badge">Fase 2 • 60 Dias</div>
              <h4>🚀 Capacitação Avançada</h4>
              <p class="text-xs text-muted mb-2">${plan.cronogramaEvolucao.fase60.foco}</p>
              <ul class="ai-action-list">
                ${plan.cronogramaEvolucao.fase60.acoes.map(a => `<li>${a}</li>`).join("")}
              </ul>
              <div class="ai-timeline-meta">🎯 Meta: <strong>${plan.cronogramaEvolucao.fase60.meta}</strong></div>
            </div>

            <div class="ai-timeline-card phase-3">
              <div class="ai-timeline-badge">Fase 3 • 90 Dias</div>
              <h4>🏆 Excelência e Certificação</h4>
              <p class="text-xs text-muted mb-2">${plan.cronogramaEvolucao.fase90.foco}</p>
              <ul class="ai-action-list">
                ${plan.cronogramaEvolucao.fase90.acoes.map(a => `<li>${a}</li>`).join("")}
              </ul>
              <div class="ai-timeline-meta">🎯 Meta: <strong>${plan.cronogramaEvolucao.fase90.meta}</strong></div>
            </div>
          </div>
        </div>

        <!-- Seção 3: Metas e Indicadores de Impacto -->
        <div class="ai-pdi-section mt-4">
          <div class="ai-kpi-banner">
            <div class="ai-kpi-item">
              <span class="ai-kpi-label">Redução Projetada de Rechamados</span>
              <span class="ai-kpi-val" style="color: var(--accent-emerald);">${plan.metasGlobais.reducaoRechamados}</span>
            </div>
            <div class="ai-kpi-item">
              <span class="ai-kpi-label">MTBF Alvo por Elevador</span>
              <span class="ai-kpi-val" style="color: var(--accent-cyan);">${plan.metasGlobais.mtbfAlvo}</span>
            </div>
            <div class="ai-kpi-item">
              <span class="ai-kpi-label">Aderência aos Procedimentos</span>
              <span class="ai-kpi-val" style="color: var(--tke-orange-bright);">${plan.metasGlobais.aderenciaPreventiva}</span>
            </div>
          </div>
        </div>

        <!-- Rodapé de Ações do Modal -->
        <div class="ai-pdi-footer mt-4">
          <div class="text-xs text-muted">
            Auditoria Técnica TKE • Plano PDI gerado dinamicamente com base no histórico operacional oficial.
          </div>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn btn-outline" onclick="AITechPlanEngine.closeModal()">Fechar</button>
            <button type="button" class="btn btn-secondary" onclick="AITechPlanEngine.regeneratePlan('${plan.tecnico}')">🔄 Regerar com IA</button>
            <button type="button" class="btn btn-primary" onclick="AITechPlanEngine.printPlan('${plan.tecnico}')">🖨️ Imprimir PDI Formal</button>
          </div>
        </div>
      </div>
    `;
  },

  regeneratePlan(techName) {
    const plan = this.generatePlan(techName);
    const contentEl = document.getElementById("ai-tech-pdi-modal-content");
    if (contentEl) {
      contentEl.innerHTML = this.renderPlanHTML(plan);
    }
    if (typeof showToast === "function") {
      showToast(`Plano de IA atualizado com sucesso para ${techName}!`);
    }
  },

  /**
   * Emissão de Impressão Formal do PDI Técnico
   */
  printPlan(techName) {
    const plan = this.getPlan(techName) || this.generatePlan(techName);
    if (!plan) return;

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      alert("Por favor, habilite popups para imprimir o Plano de IA.");
      return;
    }

    const dateFormatted = new Date(plan.geradoEm).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Plano de IA - PDI Individual: ${plan.tecnico}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 25px; line-height: 1.5; font-size: 13px; }
          .header { border-bottom: 3px solid #ff5500; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .brand { font-size: 20px; font-weight: 900; color: #ff5500; letter-spacing: 1px; }
          .title { font-size: 16px; font-weight: bold; margin: 4px 0 0; }
          .meta-box { background: #f4f4f5; padding: 10px 14px; border-radius: 6px; margin-bottom: 18px; display: flex; justify-content: space-between; font-size: 12px; }
          .section { margin-bottom: 18px; }
          .section-title { font-size: 14px; font-weight: bold; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 10px; }
          .zone-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
          .zone-title { font-weight: bold; font-size: 13px; color: #ff5500; margin-bottom: 6px; }
          ul { margin: 6px 0; padding-left: 20px; }
          li { margin-bottom: 4px; }
          .timeline { display: flex; gap: 12px; margin-top: 10px; }
          .timeline-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 11px; background: #fafafa; }
          .timeline-badge { font-weight: bold; color: #ff5500; font-size: 12px; margin-bottom: 4px; }
          .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sign-block { width: 42%; text-align: center; border-top: 1px solid #333; padding-top: 6px; font-size: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">TK ELEVATOR • AUDITORIA TÉCNICA E CONFIABILIDADE</div>
            <div class="title">PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI) COM INTELIGÊNCIA ARTIFICIAL</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            Data de Emissão: ${dateFormatted}
          </div>
        </div>

        <div class="meta-box">
          <div><strong>Colaborador:</strong> ${plan.tecnico} (Matrícula: ${plan.matricula})</div>
          <div><strong>Zona de Maior Risco:</strong> ${plan.zonaCritica}</div>
          <div><strong>Score Confiabilidade:</strong> ${plan.scoreConfiabilidade}% (${plan.nivelRisco})</div>
        </div>

        <div class="section">
          <div class="section-title">1. Diagnóstico e Ações Técnicas por Zona Física</div>
          ${Object.values(plan.detalhesZonas).map(z => `
            <div class="zone-box">
              <div class="zone-title">📍 Zona: ${z.zona} (${z.ocorrencias} ocorrências analisadas) ${z.isCritica ? '• [ZONA CRÍTICA PRINCIPAL]' : ''}</div>
              <p style="margin: 4px 0 8px; font-style: italic; color: #475569;"><strong>Diagnóstico IA:</strong> ${z.diagnosticoIA}</p>
              
              <div style="font-weight: bold; margin-top: 6px; color: #dc2626;">⚙️ Ações Corretivas para Eliminação de Retrabalho:</div>
              <ul>
                ${z.acoesCorretivas.map(a => `<li>${a}</li>`).join("")}
              </ul>

              <div style="font-weight: bold; margin-top: 6px; color: #ea580c;">🛡️ Procedimentos Preventivos Padronizados:</div>
              <ul>
                ${z.acoesPreventivas.map(a => `<li>${a}</li>`).join("")}
              </ul>

              <div style="font-weight: bold; margin-top: 6px; color: #16a34a;">📋 Checklist de Campo Obrigatório:</div>
              <ul>
                ${z.checklistCampo.map(c => `<li>[  ] ${c}</li>`).join("")}
              </ul>

              <div style="margin-top: 6px; font-size: 11px; color: #991b1b;">
                <strong>Atenção:</strong> ${z.errosAEliminar}
              </div>
            </div>
          `).join("")}
        </div>

        <div class="section">
          <div class="section-title">2. Cronograma de Evolução Técnica (30, 60 e 90 Dias)</div>
          <div class="timeline">
            <div class="timeline-card">
              <div class="timeline-badge">${plan.cronogramaEvolucao.fase30.periodo}</div>
              <p><strong>Foco:</strong> ${plan.cronogramaEvolucao.fase30.foco}</p>
              <ul>${plan.cronogramaEvolucao.fase30.acoes.map(a => `<li>${a}</li>`).join("")}</ul>
              <p><strong>Meta:</strong> ${plan.cronogramaEvolucao.fase30.meta}</p>
            </div>
            <div class="timeline-card">
              <div class="timeline-badge">${plan.cronogramaEvolucao.fase60.periodo}</div>
              <p><strong>Foco:</strong> ${plan.cronogramaEvolucao.fase60.foco}</p>
              <ul>${plan.cronogramaEvolucao.fase60.acoes.map(a => `<li>${a}</li>`).join("")}</ul>
              <p><strong>Meta:</strong> ${plan.cronogramaEvolucao.fase60.meta}</p>
            </div>
            <div class="timeline-card">
              <div class="timeline-badge">${plan.cronogramaEvolucao.fase90.periodo}</div>
              <p><strong>Foco:</strong> ${plan.cronogramaEvolucao.fase90.foco}</p>
              <ul>${plan.cronogramaEvolucao.fase90.acoes.map(a => `<li>${a}</li>`).join("")}</ul>
              <p><strong>Meta:</strong> ${plan.cronogramaEvolucao.fase90.meta}</p>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sign-block">
            <strong>${plan.tecnico}</strong><br>
            Técnico Especialista de Manutenção
          </div>
          <div class="sign-block">
            <strong>Gestão de Operações & Qualidade</strong><br>
            Supervisor Técnico / Filial TKE
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
};
