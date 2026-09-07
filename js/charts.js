/**
 * Projeto TKE - Visualizações Gráficas e Analytics
 * Renderização dinâmica de gráficos usando Chart.js adaptados para Modo Escuro e Claro
 */

const ChartManager = {
  instances: {},

  destroyChart(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  getThemeColors() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    return {
      textColor: isLight ? "#475569" : "#94a3b8",
      headingColor: isLight ? "#0f172a" : "#f1f5f9",
      gridColor: isLight ? "rgba(0, 0, 0, 0.07)" : "rgba(51, 65, 85, 0.4)",
      borderColor: isLight ? "#ffffff" : "#0f172a",
      tooltipBg: isLight ? "rgba(255, 255, 255, 0.95)" : "#1e293b",
      tooltipTitle: isLight ? "#0f172a" : "#f8fafc",
      tooltipBody: isLight ? "#334155" : "#cbd5e1",
      tooltipBorder: isLight ? "#cbd5e1" : "#334155"
    };
  },

  renderZoneDoughnut(canvasId, zoneCounts) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext("2d");
    const labels = [ZONES.OUTROS, ZONES.CASA_MAQUINAS, ZONES.CABINA, ZONES.PAVIMENTO_CAIXA];
    const data = [
      zoneCounts[ZONES.OUTROS] || 0,
      zoneCounts[ZONES.CASA_MAQUINAS] || 0,
      zoneCounts[ZONES.CABINA] || 0,
      zoneCounts[ZONES.PAVIMENTO_CAIXA] || 0
    ];

    this.instances[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            "rgba(148, 163, 184, 0.85)", // Outros - Slate
            "rgba(232, 121, 249, 0.85)", // Casa de Máquinas - Purple/Pink
            "rgba(56, 189, 248, 0.85)",  // Cabina - Sky Blue
            "rgba(251, 191, 36, 0.85)"   // Pavimento / Caixa de corrida - Amber
          ],
          borderColor: theme.borderColor,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: theme.textColor,
              font: { family: "Inter", size: 12 },
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 10
          }
        },
        cutout: "68%"
      }
    });
  },

  renderPieChart(canvasId, labels, data, colors) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext("2d");

    this.instances[canvasId] = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: theme.borderColor,
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: theme.textColor,
              font: { family: "Inter", size: 11, weight: "600" },
              padding: 12,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return ` ${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  },

  renderTechBarChart(canvasId, techPerformance) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext("2d");
    const labels = techPerformance.map(t => t.nome);
    const totalCalls = techPerformance.map(t => t.totalChamados);

    this.instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Total de Chamados",
          data: totalCalls,
          backgroundColor: "rgba(255, 87, 34, 0.8)",
          borderColor: "#ff5722",
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: theme.gridColor },
            ticks: { color: theme.textColor, stepSize: 1, font: { family: "Inter" } }
          },
          y: {
            grid: { display: false },
            ticks: { color: theme.headingColor, font: { family: "Inter", weight: "600" } }
          }
        }
      }
    });
  },

  renderTechZonesStacked(canvasId, techPerformance) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const theme = this.getThemeColors();
    const ctx = canvas.getContext("2d");
    const labels = techPerformance.map(t => t.nome);

    const outrosData = techPerformance.map(t => t.zonas[ZONES.OUTROS] || 0);
    const casaMaqData = techPerformance.map(t => t.zonas[ZONES.CASA_MAQUINAS] || 0);
    const cabinaData = techPerformance.map(t => t.zonas[ZONES.CABINA] || 0);
    const pavimentoCaixaData = techPerformance.map(t => t.zonas[ZONES.PAVIMENTO_CAIXA] || 0);

    this.instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Outros",
            data: outrosData,
            backgroundColor: "rgba(148, 163, 184, 0.8)"
          },
          {
            label: "Casa de Máquinas",
            data: casaMaqData,
            backgroundColor: "rgba(232, 121, 249, 0.8)"
          },
          {
            label: "Cabina",
            data: cabinaData,
            backgroundColor: "rgba(56, 189, 248, 0.8)"
          },
          {
            label: "Pavimento / Caixa de corrida",
            data: pavimentoCaixaData,
            backgroundColor: "rgba(251, 191, 36, 0.8)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: theme.textColor, usePointStyle: true, font: { family: "Inter", size: 11 } }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: theme.headingColor, font: { family: "Inter", weight: "500" } }
          },
          y: {
            stacked: true,
            grid: { color: theme.gridColor },
            ticks: { color: theme.textColor, stepSize: 1, font: { family: "Inter" } }
          }
        }
      }
    });
  }
};
