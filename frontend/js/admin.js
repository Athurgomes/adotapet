/**
 * ADOTAPET / AUMIGO — LÓGICA DO PAINEL ADMINISTRATIVO (VANILLA JS)
 * Implementação Fiel dos Componentes React e Integração com Microsserviços
 */

const CHAVE_SESSAO_ADMIN = "autenticado";

// Estado Global do Admin
let adminAnimals = [];
let adminRequests = [];
let currentSearchQuery = "";
let currentFilterStatus = "Todos";
let expandedRequestId = null;
let currentEditingAnimalId = null;
// Textos de características/vacinas como o modal os abriu, para saber se foram alterados
let editOriginalTexts = { caracteristicas: "", vacinas: "" };

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", () => {
  initAdmin();
});

function initAdmin() {
  setupAuthFlow();
  setupSidebarNavigation();
  setupAnimalManagement();
  setupHistoryManagement();
  setupEditModal();

  // Verifica estado de autenticação inicial
  checkAuthAndRender();
}

// ==================== 1. AUTENTICAÇÃO ====================
function checkAuthAndRender() {
  const isAuth = sessionStorage.getItem(CHAVE_SESSAO_ADMIN) === "autenticado";
  const loginView = document.getElementById("view-admin-login");
  const shellView = document.getElementById("view-admin-shell");

  if (!isAuth) {
    loginView.classList.remove("hidden");
    shellView.classList.add("hidden");
  } else {
    loginView.classList.add("hidden");
    shellView.classList.remove("hidden");
    loadAdminData();
    handleAdminHash();
  }
}

function setupAuthFlow() {
  const loginForm = document.getElementById("form-admin-login");
  const loginError = document.getElementById("login-error-msg");
  const togglePassBtn = document.getElementById("btn-toggle-password");
  const passwordInput = document.getElementById("admin-password");

  if (togglePassBtn && passwordInput) {
    togglePassBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePassBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loginError.classList.add("hidden");
      loginError.textContent = "";

      const email = document.getElementById("admin-email").value.trim();
      const password = passwordInput.value;

      // Credenciais exclusivas para demonstração local
      if (email === "admin@aumigo.com" && password === "AumigoDemo2026!") {
        sessionStorage.setItem(CHAVE_SESSAO_ADMIN, "autenticado");
        checkAuthAndRender();
      } else {
        loginError.textContent = "E-mail ou senha incorretos. Confira os dados e tente novamente.";
        loginError.classList.remove("hidden");
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById("btn-logout-admin");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(CHAVE_SESSAO_ADMIN);
      checkAuthAndRender();
    });
  }
}

// ==================== 2. NAVEGAÇÃO ====================
function setupSidebarNavigation() {
  const navAnimais = document.getElementById("nav-item-animais");
  const navHistorico = document.getElementById("nav-item-historico");
  const viewAnimais = document.getElementById("tab-animais-content");
  const viewHistorico = document.getElementById("tab-historico-content");

  function switchTab(tab) {
    if (tab === "historico") {
      navAnimais.classList.remove("active");
      navHistorico.classList.add("active");
      viewAnimais.classList.add("hidden");
      viewHistorico.classList.remove("hidden");
      window.location.hash = "historico";
    } else {
      navHistorico.classList.remove("active");
      navAnimais.classList.add("active");
      viewHistorico.classList.add("hidden");
      viewAnimais.classList.remove("hidden");
      window.location.hash = "animais";
    }
    toggleMobileSidebar(false);
  }

  if (navAnimais) navAnimais.addEventListener("click", () => switchTab("animais"));
  if (navHistorico) navHistorico.addEventListener("click", () => switchTab("historico"));

  window.addEventListener("hashchange", handleAdminHash);

  // Menu Mobile Drawer
  const btnOpenMenu = document.getElementById("btn-open-mobile-menu");
  const btnCloseMenu = document.getElementById("btn-close-mobile-menu");
  const backdrop = document.getElementById("mobile-backdrop");

  if (btnOpenMenu) btnOpenMenu.addEventListener("click", () => toggleMobileSidebar(true));
  if (btnCloseMenu) btnCloseMenu.addEventListener("click", () => toggleMobileSidebar(false));
  if (backdrop) backdrop.addEventListener("click", () => toggleMobileSidebar(false));
}

function handleAdminHash() {
  const hash = window.location.hash;
  const navAnimais = document.getElementById("nav-item-animais");
  const navHistorico = document.getElementById("nav-item-historico");
  const viewAnimais = document.getElementById("tab-animais-content");
  const viewHistorico = document.getElementById("tab-historico-content");

  if (hash === "#historico") {
    if (navAnimais) navAnimais.classList.remove("active");
    if (navHistorico) navHistorico.classList.add("active");
    if (viewAnimais) viewAnimais.classList.add("hidden");
    if (viewHistorico) viewHistorico.classList.remove("hidden");
  } else {
    if (navHistorico) navHistorico.classList.remove("active");
    if (navAnimais) navAnimais.classList.add("active");
    if (viewHistorico) viewHistorico.classList.add("hidden");
    if (viewAnimais) viewAnimais.classList.remove("hidden");
  }
}

function toggleMobileSidebar(open) {
  const sidebar = document.getElementById("admin-sidebar");
  const backdrop = document.getElementById("mobile-backdrop");
  if (!sidebar || !backdrop) return;

  if (open) {
    sidebar.classList.add("open");
    backdrop.classList.remove("hidden");
  } else {
    sidebar.classList.remove("open");
    backdrop.classList.add("hidden");
  }
}

function showNotice(message, isError = false) {
  const noticeBox = document.getElementById("admin-notice-banner");
  const noticeMsg = document.getElementById("admin-notice-text");
  if (!noticeBox || !noticeMsg) return;

  noticeMsg.textContent = message;
  noticeBox.classList.toggle("notice-error", isError);
  noticeBox.classList.remove("hidden");
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    noticeBox.classList.add("hidden");
  }, isError ? 7000 : 4000);
}

function showError(message) {
  showNotice(message, true);
}

// Mensagem da API no formato do contrato: { erro, detalhes? }
async function apiErrorMessage(res, fallback) {
  const data = await res.json().catch(() => ({}));
  const details = Array.isArray(data.detalhes) ? `: ${data.detalhes.join(", ")}` : "";
  return (details ? (data.erro || fallback).replace(/\.$/, "") : data.erro || fallback) + details;
}

// ==================== 3. GESTÃO DE ANIMAIS ====================
async function loadAdminData() {
  await Promise.all([loadAdminAnimals(), loadAdminRequests()]);
}

async function loadAdminAnimals() {
  try {
    const res = await fetch(`${CONFIG.API_ANIMAIS}/animais`);
    if (res.ok) {
      const data = await res.json();
      adminAnimals = Array.isArray(data) ? data : [];
    } else {
      adminAnimals = [];
      showError(await apiErrorMessage(res, "Não foi possível carregar os animais."));
    }
  } catch (err) {
    adminAnimals = [];
    showError("Serviço de Animais indisponível. Não foi possível carregar os animais.");
  }
  updateAnimalStats();
  renderAnimalsTable();
}

function updateAnimalStats() {
  const totalEl = document.getElementById("stats-total-animals");
  const availableEl = document.getElementById("stats-available-animals");

  if (totalEl) totalEl.textContent = adminAnimals.length;
  if (availableEl) {
    const availableCount = adminAnimals.filter(a => a.disponivel === true).length;
    availableEl.textContent = availableCount;
  }
}

function renderAnimalsTable() {
  const tbody = document.getElementById("table-animals-body");
  const emptyState = document.getElementById("empty-animals-state");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (adminAnimals.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  adminAnimals.forEach((animal) => {
    const tr = document.createElement("tr");

    const id = animal._id || animal.id;
    const nome = animal.nome || "Pet sem nome";
    const foto = animal.imagemUrl || animal.image || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?crop=faces&fit=crop&fm=jpg&q=80&w=240&h=240";
    const especie = animal.especie ? animal.especie.charAt(0).toUpperCase() + animal.especie.slice(1) : "Outro";
    const sexo = animal.sexo ? (animal.sexo.toLowerCase() === "macho" ? "Macho" : "Fêmea") : "Indefinido";
    const idade = animal.idade !== undefined ? `${animal.idade} ano(s)` : (animal.age || "Não informada");
    const porte = animal.porte ? animal.porte.charAt(0).toUpperCase() + animal.porte.slice(1) : (animal.size || "Médio");
    const local = `${animal.cidade || "São Paulo"}, ${animal.uf || animal.state || "SP"}`;
    const disponivel = animal.disponivel === true;

    tr.innerHTML = `
      <td>
        <div class="cell-animal-info">
          <img src="${foto}" alt="${nome}" class="animal-thumb" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?crop=faces&fit=crop&fm=jpg&q=80&w=240&h=240'" />
          <span class="animal-name-title">${nome}</span>
        </div>
      </td>
      <td style="font-weight: 700; color: #5f576f;">${especie}</td>
      <td style="color: #746c80;">${sexo} • ${idade} • ${porte}</td>
      <td style="color: #746c80;">${local}</td>
      <td>
        <span class="status-badge ${disponivel ? "status-available" : "status-unavailable"}">
          ${disponivel ? "Disponível" : "Indisponível"}
        </span>
      </td>
      <td style="text-align: right;">
        <button type="button" class="action-btn-icon" title="Editar ${nome}" onclick="openEditAnimalModal('${id}')">
          <svg class="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function setupAnimalManagement() {
  const form = document.getElementById("form-new-animal");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("animal-nome").value.trim();
    const especie = document.getElementById("animal-especie").value;
    const sexo = document.getElementById("animal-sexo").value;
    const idade = parseInt(document.getElementById("animal-idade").value, 10) || 0;
    const porte = document.getElementById("animal-porte").value;
    const caracteristicasRaw = document.getElementById("animal-caracteristicas").value.trim();
    const vacinasRaw = document.getElementById("animal-vacinas").value.trim();
    const cidade = document.getElementById("animal-cidade").value.trim();
    const uf = document.getElementById("animal-uf").value.trim().toUpperCase();
    const disponivel = document.getElementById("animal-disponivel").value === "true";
    let imagemUrl = document.getElementById("animal-imagem").value.trim();

    if (!imagemUrl) {
      imagemUrl = especie === "gato" 
        ? "https://images.unsplash.com/photo-1594387992816-65f5d74c1de0?crop=faces&fit=crop&fm=jpg&q=80&w=240&h=240"
        : "https://images.unsplash.com/photo-1543466835-00a7907e9de1?crop=faces&fit=crop&fm=jpg&q=80&w=240&h=240";
    }

    const payload = {
      nome,
      especie,
      sexo,
      idade,
      porte,
      caracteristicas: caracteristicasRaw ? { temperamento: caracteristicasRaw } : {},
      vacinas: mergeVaccines([], vacinasRaw),
      cidade,
      uf,
      disponivel,
      imagemUrl
    };

    try {
      const res = await fetch(`${CONFIG.API_ANIMAIS}/animais`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status !== 201) {
        showError(await apiErrorMessage(res, "Não foi possível cadastrar o animal."));
        return;
      }
      adminAnimals.unshift(await res.json());
    } catch (err) {
      showError("Serviço de Animais indisponível. O animal não foi cadastrado.");
      return;
    }

    form.reset();
    updateAnimalStats();
    renderAnimalsTable();
    showNotice(`${nome} foi adicionado à listagem.`);
  });
}

// ==================== 4. MODAL DE EDIÇÃO DE ANIMAL ====================
function setupEditModal() {
  const modal = document.getElementById("modal-edit-animal");
  const btnClose = document.getElementById("btn-close-edit-modal");
  const btnCancel = document.getElementById("btn-cancel-edit-modal");
  const formEdit = document.getElementById("form-edit-animal");

  if (btnClose) btnClose.addEventListener("click", () => modal.classList.add("hidden"));
  if (btnCancel) btnCancel.addEventListener("click", () => modal.classList.add("hidden"));

  if (formEdit) {
    formEdit.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentEditingAnimalId) return;

      const nome = document.getElementById("edit-animal-nome").value.trim();
      const especie = document.getElementById("edit-animal-especie").value;
      const sexo = document.getElementById("edit-animal-sexo").value;
      const idade = parseInt(document.getElementById("edit-animal-idade").value, 10) || 0;
      const porte = document.getElementById("edit-animal-porte").value;
      const caracteristicasRaw = document.getElementById("edit-animal-caracteristicas").value.trim();
      const vacinasRaw = document.getElementById("edit-animal-vacinas").value.trim();
      const cidade = document.getElementById("edit-animal-cidade").value.trim();
      const uf = document.getElementById("edit-animal-uf").value.trim().toUpperCase();
      const disponivel = document.getElementById("edit-animal-disponivel").value === "true";
      const imagemUrl = document.getElementById("edit-animal-imagem").value.trim();

      const original = adminAnimals.find(a => String(a._id) === String(currentEditingAnimalId)) || {};

      // Campos não alterados no modal são reenviados como vieram da API, para não
      // perder as características livres nem as datas das vacinas.
      const caracteristicas = caracteristicasRaw === editOriginalTexts.caracteristicas
        ? original.caracteristicas || {}
        : { ...(original.caracteristicas || {}), temperamento: caracteristicasRaw };
      const vacinas = vacinasRaw === editOriginalTexts.vacinas
        ? original.vacinas || []
        : mergeVaccines(original.vacinas, vacinasRaw);

      const updatePayload = {
        nome,
        especie,
        sexo,
        idade,
        porte,
        caracteristicas,
        vacinas,
        cidade,
        uf,
        disponivel,
        imagemUrl
      };

      try {
        const res = await fetch(`${CONFIG.API_ANIMAIS}/animais/${currentEditingAnimalId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload)
        });

        if (!res.ok) {
          showError(await apiErrorMessage(res, "Não foi possível salvar as alterações."));
          return;
        }
        const updated = await res.json();
        const idx = adminAnimals.findIndex(a => String(a._id) === String(currentEditingAnimalId));
        if (idx !== -1) adminAnimals[idx] = updated;
      } catch (err) {
        showError("Serviço de Animais indisponível. As alterações não foram salvas.");
        return;
      }

      modal.classList.add("hidden");
      updateAnimalStats();
      renderAnimalsTable();
      showNotice(`Informações de ${nome} foram atualizadas com sucesso.`);
    });
  }
}

function openEditAnimalModal(id) {
  const animal = adminAnimals.find(a => String(a._id || a.id) === String(id));
  if (!animal) return;

  currentEditingAnimalId = id;
  const modal = document.getElementById("modal-edit-animal");

  document.getElementById("edit-animal-nome").value = animal.nome || animal.name || "";
  document.getElementById("edit-animal-especie").value = (animal.especie || "cachorro").toLowerCase();
  document.getElementById("edit-animal-sexo").value = (animal.sexo || "macho").toLowerCase() === "macho" ? "macho" : "femea";
  document.getElementById("edit-animal-idade").value = animal.idade !== undefined ? animal.idade : parseInt(animal.age) || 1;
  document.getElementById("edit-animal-porte").value = (animal.porte || "medio").toLowerCase();
  
  const charText = typeof animal.caracteristicas === "object" && animal.caracteristicas
    ? (animal.caracteristicas.temperamento || Object.values(animal.caracteristicas).join(", "))
    : (animal.traits || "");
  document.getElementById("edit-animal-caracteristicas").value = charText;

  const vacText = Array.isArray(animal.vacinas) && animal.vacinas.length
    ? animal.vacinas.map(v => v.nome).join(", ")
    : (animal.vaccines || "");
  document.getElementById("edit-animal-vacinas").value = vacText;

  document.getElementById("edit-animal-cidade").value = animal.cidade || animal.city || "";
  document.getElementById("edit-animal-uf").value = animal.uf || animal.state || "SP";
  document.getElementById("edit-animal-disponivel").value = animal.disponivel === false ? "false" : "true";
  document.getElementById("edit-animal-imagem").value = animal.imagemUrl || animal.image || "";
  editOriginalTexts = {
    caracteristicas: document.getElementById("edit-animal-caracteristicas").value.trim(),
    vacinas: document.getElementById("edit-animal-vacinas").value.trim()
  };

  modal.classList.remove("hidden");
}

// Lista de vacinas digitada ("V10, Antirrábica") mantendo a data das que já existiam
function mergeVaccines(originalVaccines, text) {
  const existing = Array.isArray(originalVaccines) ? originalVaccines : [];
  return text
    .split(",")
    .map(nome => nome.trim())
    .filter(Boolean)
    .map(nome => existing.find(v => v.nome === nome) || { nome });
}

// ==================== 5. HISTÓRICO DE ADOTANTES E SOLICITAÇÕES ====================
async function loadAdminRequests() {
  try {
    const [resAdocoes, resAdotantes] = await Promise.all([
      fetch(`${CONFIG.API_ADOCOES}/adocoes`),
      fetch(`${CONFIG.API_ADOTANTES}/adotantes`).catch(() => null)
    ]);

    const adotantesMap = new Map();
    if (resAdotantes && resAdotantes.ok) {
      const adotantesList = await resAdotantes.json().catch(() => []);
      if (Array.isArray(adotantesList)) {
        adotantesList.forEach(a => {
          if (a._id) adotantesMap.set(String(a._id), a);
          if (a.email) adotantesMap.set(a.email.toLowerCase(), a);
        });
      }
    }

    if (resAdocoes.ok) {
      const data = await resAdocoes.json();
      if (Array.isArray(data) && data.length > 0) {
        // Mapeia solicitações da API para o formato visual com dados reais do banco
        adminRequests = data.map((item, idx) => {
          const adotante = adotantesMap.get(String(item.adotanteId)) ||
                           adotantesMap.get(item.resumoAdotante?.email?.toLowerCase()) ||
                           {};

          const resumo = item.resumoAdotante || {};
          const questionario = resumo.questionario || item.questionario || adotante.questionario || {};
          const telefone = resumo.telefone || adotante.telefone || "";

          const formatMoradia = (tipo) => {
            if (!tipo) return "Não informado";
            const map = { casa: "Casa", apartamento: "Apartamento", sitio: "Chácara / Sítio" };
            return map[tipo.toLowerCase()] || (tipo.charAt(0).toUpperCase() + tipo.slice(1));
          };

          const formatBool = (val) => {
            if (val === true || val === "true") return "Sim";
            if (val === false || val === "false") return "Não";
            return "Não informado";
          };

          return {
            id: item._id || idx + 1,
            name: resumo.nomeCompleto || adotante.nomeCompleto || "Adotante",
            email: resumo.email || adotante.email || "Não informado",
            phone: telefone || "(Não informado)",
            city: [resumo.cidade || adotante.cidade, resumo.uf || adotante.uf].filter(Boolean).join(", ") || "Não informado",
            interest: item.resumoAnimal?.nome || "Pet",
            date: item.criadoEm ? new Date(item.criadoEm).toLocaleDateString("pt-BR") : "Hoje",
            status: item.status || "Pendente",
            message: questionario.motivoAdocao || "Não informado",
            details: {
              tipoMoradia: formatMoradia(questionario.tipoMoradia),
              quintal: formatBool(questionario.possuiQuintal),
              moradiaPropria: formatBool(questionario.moradiaPropria),
              jaTeveAnimais: formatBool(questionario.jaTeveAnimais),
              outrosAnimais: questionario.outrosAnimaisEmCasa !== undefined ? String(questionario.outrosAnimaisEmCasa) : "0",
              horasLivres: questionario.horasDisponiveisPorDia !== undefined ? `${questionario.horasDisponiveisPorDia}h/dia` : "Não informado"
            }
          };
        });
      } else {
        adminRequests = [];
      }
    } else {
      adminRequests = [];
      showError(await apiErrorMessage(resAdocoes, "Não foi possível carregar as solicitações."));
    }
  } catch (err) {
    adminRequests = [];
    showError("Serviço de Adoções indisponível. Não foi possível carregar as solicitações.");
  }

  updateHistoryStats();
  renderRequestsTable();
}

function updateHistoryStats() {
  const totalEl = document.getElementById("stats-total-requests");
  const newEl = document.getElementById("stats-new-requests");
  const doneEl = document.getElementById("stats-done-requests");

  if (totalEl) totalEl.textContent = adminRequests.length;
  if (newEl) {
    const newCount = adminRequests.filter(r => r.status === "Novo" || r.status === "Pendente").length;
    newEl.textContent = String(newCount).padStart(2, "0");
  }
  if (doneEl) {
    const doneCount = adminRequests.filter(r => r.status === "Concluído").length;
    doneEl.textContent = String(doneCount).padStart(2, "0");
  }
}

function setupHistoryManagement() {
  const searchInput = document.getElementById("input-search-requests");
  const filterPillsContainer = document.getElementById("filter-pills-requests");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      renderRequestsTable();
    });
  }

  if (filterPillsContainer) {
    filterPillsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-pill-btn");
      if (!btn) return;

      filterPillsContainer.querySelectorAll(".filter-pill-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterStatus = btn.dataset.status || "Todos";
      renderRequestsTable();
    });
  }
}

function renderRequestsTable() {
  const tbody = document.getElementById("table-requests-body");
  const emptyState = document.getElementById("empty-requests-state");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtered = adminRequests.filter((req) => {
    const matchesFilter =
      currentFilterStatus === "Todos" ||
      req.status === currentFilterStatus ||
      (currentFilterStatus === "Novo" && req.status === "Pendente");

    const matchesSearch =
      !currentSearchQuery ||
      req.name.toLowerCase().includes(currentSearchQuery) ||
      req.email.toLowerCase().includes(currentSearchQuery) ||
      req.interest.toLowerCase().includes(currentSearchQuery);

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  filtered.forEach((req) => {
    const isExpanded = expandedRequestId === req.id;
    const initials = req.name
      .split(" ")
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();

    let statusClass = "status-new";
    if (req.status === "Concluído") statusClass = "status-done";
    else if (req.status === "Em contato") statusClass = "status-contact";

    // Linha Principal
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="cell-animal-info">
          <span class="candidate-avatar">${initials}</span>
          <button type="button" class="candidate-name-btn" onclick="toggleExpandRequest('${req.id}')">
            ${req.name}
            <span class="toggle-indicator">${isExpanded ? "−" : "+"}</span>
          </button>
        </div>
      </td>
      <td>
        <p style="font-weight: 700; color: #5f576f; font-size: 13px;">${req.email}</p>
        <p style="font-size: 12px; color: #8a8396; margin-top: 2px;">${req.phone}</p>
      </td>
      <td style="color: #746c80;">${req.city}</td>
      <td style="font-weight: 700; color: #6854c6;">${req.interest}</td>
      <td style="color: #746c80;">${req.date}</td>
      <td>
        <button
          type="button"
          class="status-badge-btn ${statusClass}"
          onclick="cycleRequestStatus('${req.id}')"
          title="Clique para avançar: Pendente → Em contato → Concluído"
        >
          <span>${req.status}</span>
          <svg class="icon-xs status-arrow-icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    // Linha de Detalhes Expansível
    if (isExpanded) {
      const trDetails = document.createElement("tr");
      trDetails.innerHTML = `
        <td colspan="6" style="padding: 0 20px 24px 20px;">
          <div class="expanded-row-box">
            <div class="expanded-header">
              <h3 class="expanded-title">Ficha do adotante</h3>
              <button type="button" class="btn-secondary" style="font-size: 12px; padding: 6px 14px;" onclick="toggleExpandRequest(null)">
                Fechar
              </button>
            </div>
            <div class="expanded-grid">
              <div>
                <p class="info-field-label">Nome completo</p>
                <p class="info-field-val">${req.name}</p>
              </div>
              <div>
                <p class="info-field-label">E-mail</p>
                <p class="info-field-val">${req.email}</p>
              </div>
              <div>
                <p class="info-field-label">WhatsApp</p>
                <p class="info-field-val">${req.phone}</p>
              </div>
              <div>
                <p class="info-field-label">Cidade</p>
                <p class="info-field-val">${req.city}</p>
              </div>
              <div>
                <p class="info-field-label">Interesse</p>
                <p class="info-field-val" style="color: #6854c6;">${req.interest}</p>
              </div>
              <div>
                <p class="info-field-label">Data da solicitação</p>
                <p class="info-field-val">${req.date}</p>
              </div>
              ${req.details?.tipoMoradia ? `
              <div>
                <p class="info-field-label">Tipo de moradia</p>
                <p class="info-field-val">${req.details.tipoMoradia}</p>
              </div>` : ''}
              ${req.details?.quintal ? `
              <div>
                <p class="info-field-label">Possui quintal?</p>
                <p class="info-field-val">${req.details.quintal}</p>
              </div>` : ''}
              ${req.details?.moradiaPropria ? `
              <div>
                <p class="info-field-label">Moradia própria?</p>
                <p class="info-field-val">${req.details.moradiaPropria}</p>
              </div>` : ''}
              ${req.details?.jaTeveAnimais ? `
              <div>
                <p class="info-field-label">Já teve animais?</p>
                <p class="info-field-val">${req.details.jaTeveAnimais}</p>
              </div>` : ''}
              ${req.details?.outrosAnimais !== undefined ? `
              <div>
                <p class="info-field-label">Outros animais</p>
                <p class="info-field-val">${req.details.outrosAnimais}</p>
              </div>` : ''}
              ${req.details?.horasLivres ? `
              <div>
                <p class="info-field-label">Tempo disponível</p>
                <p class="info-field-val">${req.details.horasLivres}</p>
              </div>` : ''}
            </div>
            <div class="expanded-motivation-box">
              <p class="motivation-label">Por que você quer adotar?</p>
              <p class="motivation-text">${req.message}</p>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(trDetails);
    }
  });
}

function toggleExpandRequest(id) {
  if (expandedRequestId === id) {
    expandedRequestId = null;
  } else {
    expandedRequestId = id;
  }
  renderRequestsTable();
}

async function cycleRequestStatus(id) {
  const req = adminRequests.find(r => String(r.id) === String(id));
  if (!req) return;

  // Ciclo: Pendente (ou Novo) -> Em contato -> Concluído -> Pendente
  let novoStatus = "Pendente";
  if (req.status === "Pendente" || req.status === "Novo") {
    novoStatus = "Em contato";
  } else if (req.status === "Em contato") {
    novoStatus = "Concluído";
  } else if (req.status === "Concluído") {
    novoStatus = "Pendente";
  }

  const statusAnterior = req.status;
  req.status = novoStatus;

  // Atualiza imediatamente contadores e tabela na tela
  updateHistoryStats();
  renderRequestsTable();

  // Persiste a alteração no banco de dados via API de Adoções; se falhar, desfaz na tela
  try {
    const res = await fetch(`${CONFIG.API_ADOCOES}/adocoes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus })
    });
    if (!res.ok) throw new Error(await apiErrorMessage(res, "Não foi possível alterar o status."));
  } catch (err) {
    req.status = statusAnterior;
    updateHistoryStats();
    renderRequestsTable();
    showError(err.message && !err.message.includes("fetch")
      ? err.message
      : "Serviço de Adoções indisponível. O status não foi alterado.");
  }
}

// Exporta funções necessárias para escopo global do navegador
window.openEditAnimalModal = openEditAnimalModal;
window.toggleExpandRequest = toggleExpandRequest;
window.cycleRequestStatus = cycleRequestStatus;
