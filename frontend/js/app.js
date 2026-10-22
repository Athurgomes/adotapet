/**
 * Estado da Aplicação (Vanilla JS)
 */
let allPets = [];

// Filtros do RF03
let activeEspecie = "Todos";
let activeSexo = "todos";
let activePorte = "todos";
let activeRegionQuery = "";

// Paginação: 4 por vez
const PETS_PAGE_SIZE = 4;
let visibleCount = PETS_PAGE_SIZE;

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  setupNavigation();
  setupRF03Filters();
  setupAdoptionForm();
  setupPaginationButton();
  await loadAnimals();
}

/**
 * 1. ROTEAMENTO E ROLAGEM SUAVE DAS ÂNCORAS
 */
function navigateTo(viewName, selectedAnimalId = null) {
  const homeView = document.getElementById("view-home");
  const adoptView = document.getElementById("view-adotar");

  if (viewName === "adotar") {
    homeView.classList.add("hidden");
    adoptView.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (selectedAnimalId) {
      const select = document.getElementById("selectedPetId");
      if (select) select.value = selectedAnimalId;
    }
  } else {
    adoptView.classList.add("hidden");
    homeView.classList.remove("hidden");

    const hash = window.location.hash;
    if (!hash || hash === "#home" || hash === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

function setupNavigation() {
  function handleHash() {
    const hash = window.location.hash;

    if (hash === "#adotar") {
      navigateTo("adotar");
    } else {
      navigateTo("home");

      if (hash && hash !== "#home" && hash !== "#") {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          setTimeout(() => {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      }
    }
  }

  window.addEventListener("hashchange", handleHash);

  if (window.location.hash) {
    handleHash();
  }

  const btnMenu = document.getElementById("btn-menu-toggle");
  if (btnMenu) {
    btnMenu.addEventListener("click", () => {
      const menu = document.getElementById("mobile-menu");
      menu.classList.toggle("hidden");
    });
  }
}

function toggleMenu(show) {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.add("hidden");
}

/**
 * 2. CARREGAMENTO DOS ANIMAIS (API BACKEND / FALLBACK)
 */

/**
 * 2. CARREGAMENTO DOS ANIMAIS (Conexão direta com a API)
 */
async function loadAnimals() {
  const emptyMsg = document.getElementById("no-pets-message");

  try {
    const res = await fetch(`${CONFIG.API_ANIMAIS}/animais?disponivel=true`);
    
    if (res.ok) {
      allPets = await res.json();
    } else {
      console.error(`Erro ao consultar API de Animais (Status: ${res.status})`);
      allPets = [];
    }
  } catch (err) {
    console.warn("API de Animais (porta 3001) inacessível ou ainda não iniciada.");
    allPets = [];
    
    if (emptyMsg) {
      emptyMsg.textContent = "Não foi possível carregar os animais no momento. Verifique se o serviço de Animais está ativo.";
    }
  }

  populateSelectAnimals(allPets);
  renderPets();
}

/**
 * 3. IMPLEMENTAÇÃO DO FILTRO RF03 (Espécie, Sexo, Porte e Região)
 */
function setupRF03Filters() {
  // 3.1 Pílulas de Espécie (Todos / Cachorros / Gatos)
  const filterPills = document.getElementById("filter-container");
  filterPills.addEventListener("click", (e) => {
    if (e.target.classList.contains("pill-btn")) {
      filterPills.querySelectorAll(".pill-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      activeEspecie = e.target.dataset.filter;
      visibleCount = PETS_PAGE_SIZE;
      renderPets();
    }
  });

  // 3.2 Filtro por Região (Cidade ou UF) e Nome
  const regionInput = document.getElementById("filter-region");
  regionInput.addEventListener("input", (e) => {
    activeRegionQuery = e.target.value.trim().toLowerCase();
    visibleCount = PETS_PAGE_SIZE;
    renderPets();
  });

  // 3.3 Filtro por Sexo (macho / femea)
  const sexoSelect = document.getElementById("filter-sexo");
  sexoSelect.addEventListener("change", (e) => {
    activeSexo = e.target.value;
    visibleCount = PETS_PAGE_SIZE;
    renderPets();
  });

  // 3.4 Filtro por Porte (pequeno / medio / grande)
  const porteSelect = document.getElementById("filter-porte");
  porteSelect.addEventListener("change", (e) => {
    activePorte = e.target.value;
    visibleCount = PETS_PAGE_SIZE;
    renderPets();
  });

  // 3.5 Limpar todos os filtros
  const btnClear = document.getElementById("btn-clear-filters");
  btnClear.addEventListener("click", () => {
    activeEspecie = "Todos";
    activeSexo = "todos";
    activePorte = "todos";
    activeRegionQuery = "";

    regionInput.value = "";
    sexoSelect.value = "todos";
    porteSelect.value = "todos";

    filterPills.querySelectorAll(".pill-btn").forEach(btn => btn.classList.remove("active"));
    filterPills.querySelector('[data-filter="Todos"]').classList.add("active");

    visibleCount = PETS_PAGE_SIZE;
    renderPets();
  });
}

function getFilteredPets() {
  return allPets.filter(pet => {
    // Filtro por Espécie
    const matchesEspecie =
      activeEspecie === "Todos" ||
      (activeEspecie === "Cachorros" && pet.especie === "cachorro") ||
      (activeEspecie === "Gatos" && pet.especie === "gato");

    // Filtro por Sexo (RF03)
    const matchesSexo =
      activeSexo === "todos" || pet.sexo.toLowerCase() === activeSexo.toLowerCase();

    // Filtro por Porte (RF03)
    const matchesPorte =
      activePorte === "todos" || pet.porte.toLowerCase() === activePorte.toLowerCase();

    // Filtro por Região (Cidade, UF ou Nome) (RF03)
    const matchesRegion =
      !activeRegionQuery ||
      pet.cidade.toLowerCase().includes(activeRegionQuery) ||
      pet.uf.toLowerCase().includes(activeRegionQuery) ||
      pet.nome.toLowerCase().includes(activeRegionQuery);

    return matchesEspecie && matchesSexo && matchesPorte && matchesRegion;
  });
}

/**
 * 4. BOTÃO VER MAIS / VER MENOS
 */
function setupPaginationButton() {
  const btnToggle = document.getElementById("btn-toggle-pets");
  if (!btnToggle) return;

  btnToggle.addEventListener("click", () => {
    const filtered = getFilteredPets();

    if (visibleCount < filtered.length) {
      visibleCount += PETS_PAGE_SIZE;
      renderPets();
    } else {
      visibleCount = PETS_PAGE_SIZE;
      renderPets();
      document.querySelector("#pets")?.scrollIntoView({ behavior: "smooth" });
    }
  });
}

/**
 * 5. RENDERIZAÇÃO DOS CARDS
 */
function renderPets() {
  const grid = document.getElementById("pets-grid");
  const emptyMsg = document.getElementById("no-pets-message");
  const loadMoreContainer = document.getElementById("load-more-container");
  const btnToggle = document.getElementById("btn-toggle-pets");

  grid.innerHTML = "";

  const filtered = getFilteredPets();

  if (filtered.length === 0) {
    emptyMsg.classList.remove("hidden");
    if (loadMoreContainer) loadMoreContainer.classList.add("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");

  const petsToDisplay = filtered.slice(0, visibleCount);

  petsToDisplay.forEach(pet => {
    const detail = `${pet.sexo === "femea" ? "Fêmea" : "Macho"} • ${pet.idade} ${pet.idade === 1 ? "ano" : "anos"} • Porte ${pet.porte ? pet.porte.toUpperCase() : "M"}`;
    const vacinado = Array.isArray(pet.vacinas) && pet.vacinas.length > 0;

    const card = document.createElement("article");
    card.className = "pet-card";
    card.innerHTML = `
      <div class="pet-img-box">
        <img src="${escapeHtml(pet.imagemUrl)}" alt="${escapeHtml(pet.nome)}, disponível para adoção" />
      </div>
      <div class="pet-info">
        <div class="pet-header-info">
          <div>
            <h3 class="pet-name">${escapeHtml(pet.nome)}</h3>
            <p class="pet-detail">${escapeHtml(detail)}</p>
          </div>
          ${vacinado ? '<span class="pet-badge-vacinado">Vacinado</span>' : ""}
        </div>
        <div class="pet-footer-info">
          <span class="pet-city">
            <svg class="icon-sm text-primary" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
            ${escapeHtml(pet.cidade)}, ${escapeHtml(pet.uf)}
          </span>
          <button class="adopt-circle-btn" title="Tenho interesse em ${escapeHtml(pet.nome)}" onclick="startAdoption('${escapeHtml(pet._id)}')">
            <svg class="icon-sm" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  if (loadMoreContainer && btnToggle) {
    if (filtered.length <= PETS_PAGE_SIZE) {
      loadMoreContainer.classList.add("hidden");
    } else {
      loadMoreContainer.classList.remove("hidden");
      if (visibleCount < filtered.length) {
        btnToggle.textContent = "Ver mais";
      } else {
        btnToggle.textContent = "Ver menos";
      }
    }
  }
}

// Evita que textos vindos da API sejam interpretados como HTML
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function startAdoption(petId) {
  window.location.hash = "#adotar";
  navigateTo("adotar", petId);
}

function populateSelectAnimals(pets) {
  const select = document.getElementById("selectedPetId");
  if (!select) return;
  select.innerHTML = '<option value="">Selecione um animal</option>';
  pets.forEach(pet => {
    const opt = document.createElement("option");
    opt.value = pet._id;
    opt.textContent = `${pet.nome} (${pet.especie} - ${pet.cidade}/${pet.uf})`;
    select.appendChild(opt);
  });
}

/**
 * 6. FORMULÁRIO DE ADOÇÃO E REGRAS DE NEGÓCIO
 */
function setupAdoptionForm() {
  const form = document.getElementById("adoption-form");
  const errorBox = document.getElementById("form-error-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    errorBox.textContent = "";

    const birthDateValue = document.getElementById("dataNascimento").value;
    const petId = document.getElementById("selectedPetId").value;

    // A idade mínima (RF07) é validada pelo microsserviço de Adoções (RF10),
    // que responde 422; a mensagem dele é exibida abaixo.

    if (!petId) {
      errorBox.textContent = "Por favor, selecione qual animal você deseja adotar.";
      errorBox.classList.remove("hidden");
      return;
    }

    const adotantePayload = {
      nomeCompleto: document.getElementById("nomeCompleto").value.trim(),
      dataNascimento: birthDateValue,
      profissao: document.getElementById("profissao").value.trim(),
      endereco: document.getElementById("endereco").value.trim(),
      cidade: document.getElementById("cidade").value.trim(),
      uf: document.getElementById("uf").value.trim().toUpperCase(),
      telefone: document.getElementById("telefone").value.trim(),
      email: document.getElementById("email").value.trim(),
      questionario: {
        tipoMoradia: document.getElementById("tipoMoradia").value,
        possuiQuintal: document.getElementById("possuiQuintal").value === "true",
        moradiaPropria: document.getElementById("moradiaPropria").value === "true",
        jaTeveAnimais: document.getElementById("jaTeveAnimais").value === "true",
        outrosAnimaisEmCasa: parseInt(document.getElementById("outrosAnimaisEmCasa").value, 10) || 0,
        horasDisponiveisPorDia: parseFloat(document.getElementById("horasDisponiveisPorDia").value) || 0,
        motivoAdocao: document.getElementById("motivoAdocao").value.trim()
      }
    };

    const showError = (message) => {
      errorBox.textContent = message;
      errorBox.classList.remove("hidden");
    };

    // Mensagem da API no formato do contrato: { erro, detalhes? }
    const apiErrorMessage = async (resp, fallback) => {
      const data = await resp.json().catch(() => ({}));
      const details = Array.isArray(data.detalhes) ? `: ${data.detalhes.join(", ")}` : "";
      return (details ? (data.erro || fallback).replace(/\.$/, "") : data.erro || fallback) + details;
    };

    const UNAVAILABLE_MSG =
      "Não foi possível registrar a solicitação agora porque um dos nossos serviços está indisponível. Tente novamente em alguns minutos.";

    // 1. Questionário do interessado (microsserviço de Adotantes)
    let adotanteId = null;
    try {
      const respAdotante = await fetch(`${CONFIG.API_ADOTANTES}/adotantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adotantePayload)
      });

      if (respAdotante.status === 201) {
        adotanteId = (await respAdotante.json())._id;
      } else if (respAdotante.status === 409) {
        // E-mail já cadastrado: busca só esse cadastro para vincular à nova solicitação
        const email = encodeURIComponent(adotantePayload.email.toLowerCase());
        const respBusca = await fetch(`${CONFIG.API_ADOTANTES}/adotantes?email=${email}`);
        const encontrados = respBusca.ok ? await respBusca.json() : [];
        if (!encontrados.length) {
          return showError(await apiErrorMessage(respAdotante, "Já existe um cadastro com este e-mail."));
        }
        adotanteId = encontrados[0]._id;
      } else if (respAdotante.status >= 500) {
        return showError(UNAVAILABLE_MSG);
      } else {
        return showError(await apiErrorMessage(respAdotante, "Não foi possível enviar o questionário."));
      }
    } catch (err) {
      return showError(UNAVAILABLE_MSG);
    }

    // 2. Solicitação de adoção (microsserviço de Adoções valida animal, idade e duplicidade)
    try {
      const respAdocao = await fetch(`${CONFIG.API_ADOCOES}/adocoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId: petId, adotanteId: adotanteId })
      });

      if (respAdocao.status === 503) {
        return showError(UNAVAILABLE_MSG);
      }
      if (respAdocao.status !== 201) {
        return showError(await apiErrorMessage(respAdocao, "Não foi possível registrar a solicitação de adoção."));
      }
    } catch (err) {
      return showError(UNAVAILABLE_MSG);
    }

    // Só chega aqui com a solicitação gravada (201)
    document.getElementById("form-wrapper").classList.add("hidden");
    document.getElementById("form-success-wrapper").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function resetFormState() {
  document.getElementById("adoption-form").reset();
  document.getElementById("form-error-msg").classList.add("hidden");
  document.getElementById("form-success-wrapper").classList.add("hidden");
  document.getElementById("form-wrapper").classList.remove("hidden");
}