# TKE • PLANO 365 — Programa de Levantamento de Ações e Nivelamento Operacional

> **Sistema Especialista em Engenharia de Manutenção, Confiabilidade de Transporte Vertical e Controle de Reincidências (<30 dias).**

![TKE MOVE BEYOND](assets/tke_test_tower.jpg)

---

## 🚀 Sobre o Projeto

O **PLANO 365** é uma solução para monitoramento analítico de Ordens de Serviço (OS), detecção preditiva de reincidências críticas em menos de 30 dias corridos, zoneamento estrutural de falhas e matriz de capacitação técnica da frota das **Filiais 5003** e **5070** da TKE.

---

## ⚙️ Principais Funcionalidades

1. **Gestão RBAC & Controle de Acesso Seguro**:
   - **🛡️ Modo Master (Gestão/PCM)**: Visão irrestrita de todos os clientes, elevadores, 11 técnicos dos 8 setores operacionais + equipe de corretivos, KPIs consolidados, matriz T&D e auditoria de planos de ação expirados.
   - **🔧 Modo Técnico (Operacional/Campo)**: Privacidade estrita dos atendimentos do técnico, emissão automática de planos de ação para equipamentos críticos e matriz pessoal de auto-aprimoramento.

2. **Detecção Automática de Reincidências (<30 Dias)**:
   - Todo equipamento com **$\ge 2$ atendimentos em período inferior a 30 dias** é classificado como `CRÍTICO - REINCIDENTE`.
   - Gera automaticamente fichas de **Plano de Ação** (`Pendente de Preenchimento`) com prazo de 7 dias atribuído ao técnico responsável.

3. **Zoneamento Físico Inteligente**:
   - **Outros**: Vistorias, alimentação elétrica predial, intempéries, vandalismo e resgates.
   - **Casa de Máquinas**: Quadros de comando, contatores, inversores VVF, máquinas de tração e freios.
   - **Cabina**: Operadores de porta de cabina, barreiras eletrônicas infravermelhas e patins de arraste.
   - **Pavimento / Caixa de corrida**: Trincos, contatos elétricos de segurança, molas espirais e chaves de limite/poço.

4. **Auditoria Técnica IA & Análise de Causa-Raiz (5 Porquês)**:
   - Sugestão automática de diagnósticos por zona física.
   - Validação de eficácia técnica da intervenção (Ação Definitiva vs. Paliativa).
   - Impressão formal de formulários de Causa-Raiz com checklist de garantia preventiva de 60 dias.

5. **Importação e Exportação Dinâmica**:
   - Compatibilidade com a estrutura oficial da planilha TKE (11 colunas).
   - Exportação completa em formato CSV.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & Vanilla JavaScript Moderno (ES6+)**
- **Vanilla CSS3** (Tokens de Design TKE, Dark/Light Mode, Glassmorphism, Micro-animações)
- **Chart.js** (Visualização de Doughnut, Barras Empilhadas e Gráficos de Pizza)
- **LocalStorage API** (Persistência local de dados e planos de ação)

---

## 📦 Como Executar Localmente

1. Clone o repositório ou faça o download dos arquivos:
   ```bash
   git clone https://github.com/DouglasPereira27/PLANO-365-TKE.git
   ```
2. Abra o arquivo `index.html` diretamente em seu navegador, ou utilize um servidor local:
   ```bash
   npx serve -l 3000 .
   ```
3. Acesse em: `http://localhost:3000`

---

## 👥 Equipe Operacional Mapeada (Zona 2 - Norte)
- **Setor 1**: Lucas Rodrigues (Filial 5003)
- **Setor 2**: Elton Gomes (Filial 5003)
- **Setor 3**: Willian Wallace (Filial 5003)
- **Setor 4**: Allison Oliveira (Filial 5003)
- **Setor 5**: Douglas Bispo (Filial 5070)
- **Setor 6**: Jose Gomes (Filial 5070)
- **Setor 7**: Alisson Terencio (Filial 5070)
- **Setor 8**: Gilmario Manoel (Filial 5070)
- **Corretivos**: Anderson Lemos, Tiago Alves e Alexandre Morais

---

© 2026 TKE — Move Beyond. Engenharia de Manutenção & Confiabilidade.
