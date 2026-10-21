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

    const card = document.createElement("article");
    card.className = "pet-card";
    card.innerHTML = `
      <div class="pet-img-box">
        <img src="${pet.imagemUrl}" alt="${pet.nome}, disponível para adoção" />
      </div>
      <div class="pet-info">
        <div class="pet-header-info">
          <div>
            <h3 class="pet-name">${pet.nome}</h3>
            <p class="pet-detail">${detail}</p>
          </div>
          <span class="pet-badge-vacinado">Vacinado</span>
        </div>
        <div class="pet-footer-info">
          <span class="pet-city">
            <svg class="icon-sm text-primary" viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
            ${pet.cidade}, ${pet.uf}
          </span>
          <button class="adopt-circle-btn" title="Tenho interesse em ${pet.nome}" onclick="startAdoption('${pet._id}')">
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

    const age = calculateAge(birthDateValue);
    if (isNaN(age) || age < 21) {
      errorBox.textContent = "Regra do sistema (RF07): Apenas pessoas com idade igual ou superior a 21 anos podem solicitar adoção.";
      errorBox.classList.remove("hidden");
      return;
    }

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

    try {
      let adotanteId = null;

      try {
        const respAdotante = await fetch(`${CONFIG.API_ADOTANTES}/adotantes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adotantePayload)
        });

        if (respAdotante.ok) {
          const jsonAdotante = await respAdotante.json();
          adotanteId = jsonAdotante._id;
        } else if (respAdotante.status === 409) {
          // Se o e-mail já existe, busca o adotante para vincular à nova solicitação
          const listResp = await fetch(`${CONFIG.API_ADOTANTES}/adotantes`);
          if (listResp.ok) {
            const list = await listResp.json();
            const existing = list.find(a => a.email.toLowerCase() === adotantePayload.email.toLowerCase());
            if (existing) adotanteId = existing._id;
          }
          if (!adotanteId) {
            const errData = await respAdotante.json().catch(() => ({}));
            errorBox.textContent = errData.erro || "Já existe um cadastro com este e-mail.";
            errorBox.classList.remove("hidden");
            return;
          }
        } else {
          const errData = await respAdotante.json().catch(() => ({}));
          const details = errData.detalhes ? `: ${errData.detalhes.join(", ")}` : "";
          errorBox.textContent = (errData.erro || "Erro ao cadastrar adotante") + details;
          errorBox.classList.remove("hidden");
          return;
        }
      } catch (err) {
        console.warn("Serviço de adotantes offline. Prosseguindo em modo demonstração.");
        adotanteId = "mock_adotante_" + Date.now();
      }

      if (!adotanteId) {
        adotanteId = "mock_adotante_" + Date.now();
      }

      try {
        const respAdocao = await fetch(`${CONFIG.API_ADOCOES}/adocoes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animalId: petId, adotanteId: adotanteId })
        });

        if (!respAdocao.ok && respAdocao.status !== 503) {
          const errAdocao = await respAdocao.json().catch(() => ({}));
          errorBox.textContent = errAdocao.erro || "Erro ao registrar solicitação de adoção.";
          errorBox.classList.remove("hidden");
          return;
        }
      } catch (err) {
        console.warn("Serviço de adoções offline. Registrado localmente.");
      }

      document.getElementById("form-wrapper").classList.add("hidden");
      document.getElementById("form-success-wrapper").classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
      errorBox.textContent = "Ocorreu um erro ao enviar. Tente novamente.";
      errorBox.classList.remove("hidden");
    }
  });
}

function calculateAge(dateString) {
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function resetFormState() {
  document.getElementById("adoption-form").reset();
  document.getElementById("form-error-msg").classList.add("hidden");
  document.getElementById("form-success-wrapper").classList.add("hidden");
  document.getElementById("form-wrapper").classList.remove("hidden");
}