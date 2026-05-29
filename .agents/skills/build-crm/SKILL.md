name: build-crm-and-auth
description: "Constrói botão de login, página de autenticação e um CRM modular (RBAC) herdando o design da Landing Page atual."
mode: agent
tools: [file_search, terminal, browser-control]
---

# 🎯 META PRINCIPAL (GOAL MODE)
Você é um Engenheiro de Software Full-Stack Sênior e Especialista em UI/UX. Sua missão é expandir a aplicação React atual adicionando um fluxo de autenticação e um sistema de CRM interno baseado em camadas de permissão (Roles).

A execução será concluída quando:
1. O botão de Login estiver perfeitamente integrado à Landing Page atual.
2. A tela de Login estiver funcional (com estado de roteamento simulado ou real).
3. Os painéis do CRM (Dashboards) estiverem renderizando visões diferentes dependendo do cargo do usuário (Admin, Organizador, Editor, Designer).

---

# 🎨 ETAPA 1: EXTRAÇÃO DO DESIGN SYSTEM ATUAL (REVERSE ENGINEERING)
Antes de escrever qualquer linha de código novo, você DEVE analisar a Landing Page existente.
* Faça uma varredura nos arquivos globais de CSS (ex: `globals.css`, `index.css` ou `tailwind.config.js`).
* Analise os componentes de UI já existentes (botões, tipografia, cores primárias e secundárias, espaçamentos).
* **Regra de Estilo:** Todos os novos componentes do CRM e da tela de Login devem utilizar ESTRITAMENTE o mesmo padrão visual, arredondamento de bordas (border-radius) e paleta de cores da Landing Page para garantir uma UX fluida e de transição imperceptível.

---

# 🔐 ETAPA 2: FLUXO DE AUTENTICAÇÃO
1. **Botão na Landing Page:** Adicione um botão "Área do Cliente / Login" no cabeçalho (Header) da landing page atual, respeitando o alinhamento e o design responsivo.
2. **Página de Login (`/login`):** Crie uma página limpa e moderna contendo formulário de E-mail e Senha. 
3. **Contexto de Autenticação (`AuthContext`):** Crie um contexto no React para gerenciar a sessão do usuário e o seu cargo (`role`). Simule a lógica de roteamento privado para as páginas internas.

---

# 🏢 ETAPA 3: ARQUITETURA E CAMADAS DO CRM (RBAC)
O CRM será a central de produção da agência. Cada cargo tem uma visualização estrita (Telas / Dashboards independentes). Implemente a estrutura de roteamento e os componentes visuais para as 4 camadas abaixo:

## 1. Nível 1: Admin (Dono)
* **Acesso:** Total (Pode ver as telas de todos os outros cargos).
* **Funcionalidades:** Visão geral de faturamento, produtividade de todos os funcionários, visão global do status de todas as empresas e gargalos de produção.

## 2. Nível 2: Organizadores (Gestão e Tráfego de Demandas)
* **Acesso:** Gestão Operacional e Distribuição.
* **Funcionalidades:** 
  * Criar e gerenciar "Empresas/Clientes".
  * Definir e visualizar datas de gravação e cronogramas mensais.
  * Inserir a quantidade de conteúdo contratado por cada cliente.
  * **Gatekeeping:** Criar tarefas (demandas) e delegá-las diretamente para os Editores de Vídeo e Designers. Apenas eles aprovam as rotas finais.

## 3. Nível 3: Editor de Vídeo
* **Acesso:** Restrito apenas à visualização de Demanda de Vídeos.
* **Funcionalidades (Kanban/Lista):**
  * Ver cronograma de vídeos a editar (associado a qual cliente/empresa).
  * Alterar status: "A Fazer", "Em Edição", "Aguardando Aprovação", "Vídeos para Correção" (com notas do Organizador).

## 4. Nível 4: Designer
* **Acesso:** Restrito apenas à visualização de Demanda de Artes.
* **Funcionalidades (Kanban/Lista):**
  * Ver demandas de carrosséis, miniaturas (thumbnails) e artes estáticas.
  * Visualizar briefing e referências passadas pelo Organizador.
  * Alterar status: "A Fazer", "Em Criação", "Aprovado", "Reprovado/Para Ajuste".

---

# 🧱 DIRETRIZES DE CÓDIGO E COMPONENTIZAÇÃO
* Utilize componentes modulares. Separe a lógica em hooks (ex: `useAuth`, `useDemands`).
* Utilize ícones adequados (ex: `lucide-react` ou o que já existir no projeto) para diferenciar menus: Vídeos (🎬), Artes (🎨), Organização (📅), Configurações (⚙️).
* Implemente um layout do tipo "Dashboard" (Menu lateral/Sidebar e área de conteúdo central) para a área logada do CRM.

Inicie a execução analisando o design da Landing Page e reportando a paleta de cores identificada. Em seguida, proceda para a criação das rotas e das interfaces.
