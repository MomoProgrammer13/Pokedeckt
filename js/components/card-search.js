// Busca de cartas com filtros, resultados em grade e paginação "Carregar mais".
// mode "deck": cada carta tem botão de adicionar e mostra a quantidade já no deck.
// mode "explore": só consulta; o clique abre os detalhes.
function createCardSearch(root, { mode = 'explore', getDeck, onAdd, onOpen }) {
  const { esc } = UI;
  const PER_PAGE = 24;
  const state = { name: '', category: '', type: '', set: '', sort: '', page: 1, items: [], loading: false, error: null, done: false };
  let reqId = 0;
  let debounce;
  const pending = new Set(); // ids com "adicionar" em andamento

  root.innerHTML = `
    <form class="search-form" role="search" autocomplete="off">
      <div class="search-input">
        ${Icons.search}
        <input type="search" name="name" placeholder="Buscar pelo nome: Pikachu, Pesquisa de Professores…" aria-label="Buscar carta pelo nome">
        <button type="button" class="icon-btn search-clear" aria-label="Limpar busca" hidden>${Icons.x}</button>
      </div>
      <div class="filters">
        <label class="field"><span>Categoria</span>
          <select name="category">
            <option value="">Todas</option><option>Pokémon</option><option>Treinador</option><option>Energia</option>
          </select>
        </label>
        <label class="field"><span>Tipo</span>
          <select name="type"><option value="">Todos</option></select>
        </label>
        <label class="field"><span>Coleção</span>
          <select name="set"><option value="">Todas</option></select>
        </label>
        <label class="field"><span>Ordenar</span>
          <select name="sort"><option value="">Padrão</option><option value="name">Nome (A–Z)</option></select>
        </label>
      </div>
      <p class="filter-note small muted" hidden></p>
    </form>
    <div class="search-status" aria-live="polite"></div>
    <div class="card-grid" role="list"></div>
    <div class="search-more"></div>`;

  const form = root.querySelector('form');
  const input = form.elements.name;
  const clearBtn = root.querySelector('.search-clear');
  const statusEl = root.querySelector('.search-status');
  const grid = root.querySelector('.card-grid');
  const moreEl = root.querySelector('.search-more');
  const note = root.querySelector('.filter-note');

  // Preenche os filtros com dados da própria API.
  Api.types().then((types) => {
    form.elements.type.insertAdjacentHTML('beforeend', types.map((t) => `<option>${esc(t)}</option>`).join(''));
  }).catch(() => {});
  Api.sets().then((sets) => {
    const opts = [...sets].reverse().map((s) => `<option value="${esc(s.id)}">${esc(s.name.trim())}</option>`).join('');
    form.elements.set.insertAdjacentHTML('beforeend', opts);
  }).catch(() => {});

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounce);
    readForm();
    load(true);
  });

  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => { readForm(); load(true); }, 450);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    input.focus();
    readForm();
    load(true);
  });

  form.addEventListener('change', (e) => {
    if (e.target === input) return;
    // Restrição: Treinadores não têm tipo, então o filtro de tipo é desativado.
    const typeSel = form.elements.type;
    if (form.elements.category.value === 'Treinador') {
      typeSel.value = '';
      typeSel.disabled = true;
      note.hidden = false;
      note.textContent = 'Cartas de Treinador não têm tipo, por isso o filtro "Tipo" foi desativado.';
    } else {
      typeSel.disabled = false;
      note.hidden = true;
    }
    readForm();
    load(true);
  });

  function readForm() {
    state.name = input.value.trim();
    state.category = form.elements.category.value;
    state.type = form.elements.type.value;
    state.set = form.elements.set.value;
    state.sort = form.elements.sort.value;
  }

  function resetFilters() {
    form.reset();
    form.elements.type.disabled = false;
    note.hidden = true;
    clearBtn.hidden = true;
    readForm();
    load(true);
  }

  async function load(reset) {
    const my = ++reqId;
    if (reset) {
      state.page = 1;
      state.items = [];
      state.done = false;
    }
    state.loading = true;
    state.error = null;
    render();
    try {
      const res = await Api.searchCards({ ...state, perPage: PER_PAGE });
      if (my !== reqId) return; // resposta antiga: ignora
      state.items = state.items.concat(res);
      state.done = res.length < PER_PAGE;
    } catch (err) {
      if (my !== reqId) return;
      state.error = err.message;
    }
    state.loading = false;
    render();
  }

  function activeFilters() {
    const f = [];
    if (state.name) f.push(`nome contém "${state.name}"`);
    if (state.category) f.push(state.category);
    if (state.type) f.push(`tipo ${state.type}`);
    if (state.set) f.push(form.elements.set.selectedOptions[0]?.textContent || state.set);
    return f;
  }

  function tileHtml(c) {
    const deck = mode === 'deck' ? getDeck() : null;
    const qty = deck ? Rules.qtyOf(deck, c.id) : 0;
    const reason = deck ? Rules.blockReason(deck, c) : null;
    const busy = pending.has(c.id);
    return `
      <article class="tile ${qty ? 'in-deck' : ''}" role="listitem" data-id="${esc(c.id)}" data-name="${esc(c.name)}">
        <button type="button" class="tile-img" data-action="open" aria-label="Ver detalhes de ${esc(c.name)}">
          <img loading="lazy" src="${esc(Api.image(c.image))}" alt="">
        </button>
        ${qty ? `<span class="qty-badge" aria-label="${qty} no deck">${qty}×</span>` : ''}
        <div class="tile-foot">
          <span class="tile-name" title="${esc(c.name)}">${esc(c.name)}</span>
          ${mode === 'deck'
            ? `<button type="button" class="add-btn ${reason ? 'is-blocked' : ''}" data-action="add"
                 aria-label="Adicionar ${esc(c.name)} ao deck" aria-disabled="${!!reason || busy}" ${busy ? 'aria-busy="true"' : ''}
                 title="${esc(reason || 'Adicionar ao deck')}">${busy ? '<span class="spinner spinner-sm"></span>' : Icons.plus}</button>`
            : ''}
        </div>
      </article>`;
  }

  function render() {
    const filters = activeFilters();
    const filterChips = filters.length
      ? `<span class="status-filters">${filters.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}
           <button type="button" class="link-btn" data-action="reset">Limpar filtros</button></span>`
      : '';

    if (state.error && !state.items.length) {
      statusEl.innerHTML = '';
      grid.innerHTML = '';
      moreEl.innerHTML = `
        <div class="empty">
          ${Icons.alert}
          <p><strong>Não conseguimos buscar as cartas.</strong></p>
          <p class="muted">${esc(state.error)}</p>
          <button type="button" class="btn btn-ghost" data-action="retry">${Icons.refresh} Tentar novamente</button>
        </div>`;
      return;
    }

    if (state.loading && !state.items.length) {
      statusEl.innerHTML = `<span class="muted">Buscando cartas…</span>`;
      grid.innerHTML = Array.from({ length: 12 }, () => '<div class="tile skeleton" aria-hidden="true"><div class="tile-img"></div><div class="tile-foot"><span></span></div></div>').join('');
      moreEl.innerHTML = '';
      return;
    }

    if (!state.items.length) {
      statusEl.innerHTML = filterChips;
      grid.innerHTML = '';
      moreEl.innerHTML = `
        <div class="empty">
          ${Icons.search}
          <p><strong>Nenhuma carta encontrada.</strong></p>
          <p class="muted">Confira a grafia do nome (as cartas estão em português) ou remova alguns filtros.</p>
          ${filters.length ? `<button type="button" class="btn btn-ghost" data-action="reset">${Icons.filterOff} Limpar filtros</button>` : ''}
        </div>`;
      return;
    }

    const count = state.items.length;
    statusEl.innerHTML = `<span><strong>${count}</strong> ${count === 1 ? 'carta' : 'cartas'}${state.done ? '' : ' carregadas'}</span>${filterChips}`;
    grid.innerHTML = state.items.map(tileHtml).join('');

    if (state.error) {
      moreEl.innerHTML = `<p class="muted small">${esc(state.error)}</p><button type="button" class="btn btn-ghost" data-action="retry">${Icons.refresh} Tentar novamente</button>`;
    } else if (state.loading) {
      moreEl.innerHTML = `<button type="button" class="btn btn-ghost" disabled><span class="spinner spinner-sm"></span> Carregando…</button>`;
    } else if (!state.done) {
      moreEl.innerHTML = `<button type="button" class="btn btn-ghost" data-action="more">Carregar mais cartas</button>`;
    } else {
      moreEl.innerHTML = `<p class="muted small">Fim dos resultados.</p>`;
    }
  }

  // Atualiza só os botões/quantidades, sem refazer a busca.
  function refresh() {
    if (!state.items.length) return;
    const active = document.activeElement;
    const focusTile = active?.closest?.('.tile')?.dataset.id;
    const focusAction = active?.dataset?.action;
    const byId = new Map(state.items.map((c) => [c.id, c]));
    grid.querySelectorAll('.tile[data-id]').forEach((tile) => {
      const c = byId.get(tile.dataset.id);
      if (c) tile.outerHTML = tileHtml(c);
    });
    // Mantém o foco do teclado no mesmo botão após redesenhar.
    if (focusTile && focusAction) {
      grid.querySelector(`.tile[data-id="${CSS.escape(focusTile)}"] [data-action="${focusAction}"]`)?.focus();
    }
  }

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'reset') return resetFilters();
    if (action === 'retry') return load(!state.items.length);
    if (action === 'more') { state.page++; return load(false); }

    const tile = btn.closest('.tile');
    const card = state.items.find((c) => c.id === tile?.dataset.id);
    if (!card) return;

    if (action === 'open') return onOpen?.(card);

    if (action === 'add') {
      if (pending.has(card.id)) return;
      const reason = Rules.blockReason(getDeck(), card);
      if (reason) {
        UI.toast(reason, { type: 'warn' });
        return;
      }
      pending.add(card.id);
      refresh();
      try {
        await onAdd(card);
      } finally {
        pending.delete(card.id);
        refresh();
      }
    }
  });

  // Imagem que falhar vira um verso de carta genérico.
  grid.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') e.target.closest('.tile-img')?.classList.add('img-missing');
  }, true);

  load(true);

  return { refresh, focus: () => input.focus() };
}
