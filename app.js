(() => {
  const POKEMON_COUNT = 151;
  const POKEAPI = 'https://pokeapi.co/api/v2';
  const TYPE_COLORS = {
    normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030',
    grass: '#78c850', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
    ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
    rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
    steel: '#b8b8d0', fairy: '#ee99ac'
  };

  const state = {
    all: [],
    byId: new Map(),
    byName: new Map(),
    search: '',
    typeFilter: 'all',
    modal: null
  };

  const grid = document.getElementById('pokemonGrid');
  const status = document.getElementById('status');
  const emptyState = document.getElementById('emptyState');
  const filterBar = document.getElementById('filterBar');
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const modalEl = document.getElementById('pokemonModal');
  const modalName = document.getElementById('modalName');
  const modalId = document.getElementById('modalId');
  const modalHeader = document.getElementById('modalHeader');
  const modalBody = document.getElementById('modalBody');

  function spriteUrl(id) {
    const padded = String(id).padStart(3, '0');
    return `https://assets.pokeapi.com/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  function typePill(type) {
    const safe = type.toLowerCase();
    return `<span class="type-pill type-${safe}">${type}</span>`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function loadAllPokemon() {
    const detail = await Promise.all(
      Array.from({ length: POKEMON_COUNT }, (_, i) =>
        fetchJson(`${POKEAPI}/pokemon/${i + 1}`)
          .catch(err => ({ __error: err.message, id: i + 1 }))
      )
    );

    state.all = detail
      .filter(p => !p.__error)
      .map(p => normalize(p));

    state.byId = new Map(state.all.map(p => [p.id, p]));
    state.byName = new Map(state.all.map(p => [p.name, p]));

    buildTypeFilters();
  }

  function normalize(p) {
    return {
      id: p.id,
      name: p.name,
      types: p.types.map(t => t.type.name),
      height: p.height,
      weight: p.weight,
      abilities: p.abilities.map(a => a.ability.name),
      stats: p.stats.map(s => ({ name: s.stat.name, value: s.base_stat }))
    };
  }

  function buildTypeFilters() {
    const types = new Set();
    state.all.forEach(p => p.types.forEach(t => types.add(t)));
    const sorted = [...types].sort();

    const allBtn = filterBar.querySelector('[data-type="all"]');
    filterBar.innerHTML = '';
    filterBar.appendChild(allBtn);

    sorted.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm filter-btn';
      btn.dataset.type = t;
      btn.textContent = t;
      btn.style.background = TYPE_COLORS[t] || '#374151';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      filterBar.appendChild(btn);
    });

    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.typeFilter = btn.dataset.type;
      renderGrid();
    });
  }

  function visible() {
    const q = state.search.trim().toLowerCase();
    return state.all.filter(p => {
      const matchesType = state.typeFilter === 'all' || p.types.includes(state.typeFilter);
      const matchesSearch = !q || p.name.includes(q) || String(p.id) === q;
      return matchesType && matchesSearch;
    });
  }

  function renderGrid() {
    const list = visible();
    grid.innerHTML = '';

    if (list.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();
    list.forEach(p => {
      const col = document.createElement('div');
      col.className = 'col-6 col-sm-4 col-md-3 col-lg-2';
      col.innerHTML = `
        <button class="pokemon-card w-100" data-id="${p.id}" aria-label="Open ${p.name} details">
          <span class="pokemon-id">#${String(p.id).padStart(3, '0')}</span>
          <img class="sprite" src="${spriteUrl(p.id)}" alt="${p.name}" loading="lazy">
          <span class="pokemon-name">${p.name}</span>
          <span>${p.types.map(typePill).join('')}</span>
        </button>
      `;
      frag.appendChild(col);
    });
    grid.appendChild(frag);
  }

  function openDetail(id) {
    const p = state.byId.get(Number(id));
    if (!p) return;

    modalName.textContent = p.name;
    modalId.textContent = `#${String(p.id).padStart(3, '0')}`;
    modalHeader.style.borderTop = `4px solid ${TYPE_COLORS[p.types[0]] || '#dc2626'}`;

    modalBody.innerHTML = `
      <div class="row g-4 align-items-center">
        <div class="col-md-5 text-center">
          <img class="detail-sprite" src="${spriteUrl(p.id)}" alt="${p.name}">
          <div class="mt-2">${p.types.map(typePill).join('')}</div>
        </div>
        <div class="col-md-7">
          <div class="row g-2 mb-3">
            <div class="col-4">
              <div class="measure-label">Height</div>
              <div class="fw-semibold">${(p.height / 10).toFixed(1)} m</div>
            </div>
            <div class="col-4">
              <div class="measure-label">Weight</div>
              <div class="fw-semibold">${(p.weight / 10).toFixed(1)} kg</div>
            </div>
            <div class="col-4">
              <div class="measure-label">Abilities</div>
              <div class="fw-semibold text-capitalize">${p.abilities.join(', ').replace(/-/g, ' ')}</div>
            </div>
          </div>
          <div>
            <div class="measure-label mb-2">Base stats</div>
            ${p.stats.map(s => `
              <div class="stat-row">
                <span class="stat-label">${s.name.replace('-', ' ')}</span>
                <span class="stat-bar">
                  <span class="stat-bar-fill" style="width: ${Math.min(100, (s.value / 180) * 100)}%"></span>
                </span>
                <span class="stat-value">${s.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    if (!state.modal) {
      state.modal = new bootstrap.Modal(modalEl);
    }
    state.modal.show();
  }

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    state.search = searchInput.value;
    renderGrid();
  });

  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderGrid();
  });

  grid.addEventListener('click', e => {
    const card = e.target.closest('.pokemon-card');
    if (!card) return;
    openDetail(card.dataset.id);
  });

  (async function init() {
    try {
      await loadAllPokemon();
      status.hidden = true;
      renderGrid();
    } catch (err) {
      status.innerHTML = `
        <div class="text-danger mb-2"><i class="bi bi-exclamation-triangle"></i> Could not load Pokemon.</div>
        <p class="text-muted small mb-0">${err.message}</p>
      `;
    }
  })();
})();
