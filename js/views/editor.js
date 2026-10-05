// Tela de edição de deck: busca de cartas à esquerda, deck à direita.
function EditorView(root, deckId) {
  const { esc } = UI;
  const saved = Store.get(deckId);

  if (!saved) {
    root.innerHTML = `
      <section class="page"><div class="empty empty-hero">
        ${Icons.alert}<h2>Deck não encontrado</h2>
        <p class="muted">Ele pode ter sido excluído ou criado em outro navegador.</p>
        <a class="btn btn-primary" href="#/">${Icons.back} Voltar para Meus decks</a>
      </div></section>`;
    return {};
  }

  let deck = structuredClone(saved);
  let dirty = false;
  let tab = 'search';
  let rates = null;

  root.innerHTML = `
    <section class="editor" data-tab="search">
      <div class="editor-head">
        <a class="btn btn-ghost btn-sm" href="#/">${Icons.back} Meus decks</a>
        <div class="deck-name-wrap">
          <label for="deck-name" class="sr-only">Nome do deck</label>
          <input id="deck-name" class="deck-name" type="text" maxlength="40" value="${esc(deck.name)}" placeholder="Nome do deck">
          <span class="deck-name-icon" aria-hidden="true">${Icons.edit}</span>
          <span class="field-error deck-name-error" aria-live="polite"></span>
        </div>
        <span class="save-state" aria-live="polite"></span>
        <div class="editor-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="export">${Icons.list} <span class="hide-sm">Copiar lista</span></button>
          <button type="button" class="btn btn-primary btn-sm" data-action="save" title="Salvar (Ctrl+S)">${Icons.save} <span class="save-label">Salvar</span></button>
        </div>
      </div>

      <div class="editor-tabs" role="tablist" aria-label="Seções do editor">
        <button type="button" role="tab" data-tab="search" aria-selected="true">${Icons.search} Buscar cartas</button>
        <button type="button" role="tab" data-tab="deck" aria-selected="false">${Icons.layers} Deck <span class="tab-count"></span></button>
      </div>

      <div class="editor-body">
        <section class="pane search-pane" aria-label="Buscar cartas"></section>
        <aside class="pane deck-pane" aria-label="Cartas do deck"></aside>
      </div>
    </section>`;

  const editorEl = root.querySelector('.editor');
  const nameInput = root.querySelector('#deck-name');
  const nameError = root.querySelector('.deck-name-error');
  const saveState = root.querySelector('.save-state');
  const saveBtn = root.querySelector('[data-action="save"]');
  const deckPane = root.querySelector('.deck-pane');
  const tabCount = root.querySelector('.tab-count');

  const search = createCardSearch(root.querySelector('.search-pane'), {
    mode: 'deck',
    getDeck: () => deck,
    onAdd: addFromSearch,
    onOpen: (card) => openDetail(card.id, card.name),
  });

  // ---------- Estado "salvo / não salvo" ----------
  function setDirty(v) {
    dirty = v;
    saveState.className = `save-state ${dirty ? 'is-dirty' : 'is-saved'}`;
    saveState.innerHTML = dirty ? '<span class="dot"></span> Alterações não salvas' : `${Icons.check} Tudo salvo`;
    saveBtn.disabled = !dirty;
  }

  // ---------- Operações no deck ----------
  async function addFromSearch(card) {
    try {
      const detail = await Api.card(card.id);
      addEntry(CardDetail.toEntry(detail));
    } catch (err) {
      UI.toast(`Não foi possível adicionar "${card.name}": ${err.message}`, { type: 'error' });
    }
  }

  function addEntry(entry) {
    const check = Rules.canAdd(deck, entry);
    if (!check.ok) {
      UI.toast(check.reason, { type: 'warn' });
      return false;
    }
    const existing = deck.cards.find((c) => c.id === entry.id);
    existing ? existing.qty++ : deck.cards.push({ ...entry, qty: 1 });
    changed(entry.id);
    if (Rules.total(deck) === Rules.DECK_SIZE) {
      UI.toast(Rules.isReady(deck) ? 'Deck completo com 60 cartas! Não esqueça de salvar.' : 'Deck com 60 cartas. Confira os avisos antes de salvar.', { type: Rules.isReady(deck) ? 'success' : 'warn' });
    }
    return true;
  }

  function removeOne(id) {
    const entry = deck.cards.find((c) => c.id === id);
    if (!entry) return;
    if (entry.qty > 1) {
      entry.qty--;
      changed(id);
    } else {
      removeAll(id);
    }
  }

  function removeAll(id) {
    const index = deck.cards.findIndex((c) => c.id === id);
    if (index < 0) return;
    const [entry] = deck.cards.splice(index, 1);
    changed();
    UI.toast(`${entry.qty}× "${entry.name}" removida do deck.`, {
      action: {
        label: 'Desfazer',
        onClick: () => {
          if (Rules.total(deck) + entry.qty > Rules.DECK_SIZE) {
            UI.toast('Não dá para desfazer: o deck passaria de 60 cartas.', { type: 'warn' });
            return;
          }
          deck.cards.splice(Math.min(index, deck.cards.length), 0, entry);
          changed(entry.id);
        },
      },
      timeout: 6000,
    });
  }

  function changed(highlightId) {
    setDirty(true);
    renderDeck(highlightId);
    search.refresh();
  }

  // ---------- Painel do deck ----------
  function renderDeck(highlightId) {
    const n = Rules.total(deck);
    const byCat = Rules.countByCategory(deck);
    const issues = Rules.validate(deck);
    const pct = Math.min(100, Math.round((n / Rules.DECK_SIZE) * 100));
    const full = n === Rules.DECK_SIZE;
    tabCount.textContent = `${n}/${Rules.DECK_SIZE}`;

    const groups = Rules.CATEGORIES.map((cat) => {
      const cards = deck.cards.filter((c) => c.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
      if (!cards.length) return '';
      return `
        <section class="deck-group">
          <h3>${esc(cat)} <span class="muted">${byCat[cat]}</span></h3>
          <ul>${cards.map((c) => rowHtml(c, c.id === highlightId)).join('')}</ul>
        </section>`;
    }).join('');

    deckPane.innerHTML = `
      <div class="deck-summary">
        <div class="counter ${full ? 'is-full' : ''}" aria-live="polite" aria-atomic="true">
          <span class="counter-num">${n}</span><span class="counter-max">/${Rules.DECK_SIZE}</span>
          <span class="counter-label">cartas</span>
        </div>
        <div class="meter ${full ? 'is-full' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${Rules.DECK_SIZE}" aria-valuenow="${n}" aria-label="Progresso do deck">
          <span style="width:${pct}%"></span>
        </div>
        <div class="cat-split">
          ${Rules.CATEGORIES.map((cat) => `<div><strong>${byCat[cat]}</strong><span>${esc(cat)}</span></div>`).join('')}
        </div>
        ${valueHtml()}
      </div>
      ${issues.length
        ? `<ul class="issues" aria-label="Avisos do deck">${issues.map((i) => `<li class="issue issue-${i.level}">${i.level === 'error' ? Icons.alert : Icons.info}<span>${esc(i.msg)}</span></li>`).join('')}</ul>`
        : `<p class="issue issue-ok">${Icons.check}<span>Deck válido e pronto para jogar!</span></p>`}
      ${groups || `
        <div class="empty empty-sm">
          ${Icons.layers}
          <p><strong>Seu deck está vazio.</strong></p>
          <p class="muted small">Use a busca e clique em <span class="kbd">+</span> para adicionar cartas.</p>
        </div>`}`;

    if (highlightId) {
      deckPane.querySelector(`.deck-row[data-id="${CSS.escape(highlightId)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // Valor estimado do deck somando o preço de mercado de cada cópia.
  function valueHtml() {
    if (!deck.cards.length) return '';
    const v = Prices.deckValue(deck, rates);
    const main = v.total != null ? Prices.money(v.total) : Prices.money(v.eur, 'EUR');
    const notes = [];
    if (v.pending) notes.push(`carregando preço de ${v.pending}`);
    if (v.missing) notes.push(`${v.missing} sem preço`);
    return `
      <div class="deck-value" title="Soma do preço de mercado (Cardmarket/TCGplayer) de cada cópia, convertido para reais.">
        <span class="deck-value-label">Valor estimado</span>
        <strong>${v.pending && !v.total && !v.eur ? '…' : `≈ ${main}`}</strong>
        ${notes.length ? `<span class="muted small">${notes.join(' · ')}</span>` : ''}
      </div>`;
  }

  function rowHtml(c, highlight) {
    const reason = Rules.canAdd(deck, c);
    const unit = Prices.short(c.price, rates);
    const sub = [c.setName, c.stage || c.trainerType || (c.energyType === 'Normal' ? 'Básica' : c.energyType), unit && `${unit} un.`].filter(Boolean).join(' · ');
    return `
      <li class="deck-row ${highlight ? 'flash' : ''}" data-id="${esc(c.id)}">
        <button type="button" class="row-main" data-action="detail" title="Ver detalhes de ${esc(c.name)}">
          <span class="row-thumb"><img src="${esc(Api.image(c.image))}" alt="" loading="lazy"></span>
          <span class="row-text">
            <span class="row-name">${esc(c.name)}</span>
            <span class="row-sub">${esc(sub)}</span>
          </span>
        </button>
        <div class="stepper" role="group" aria-label="Quantidade de ${esc(c.name)}">
          <button type="button" data-action="dec" aria-label="Remover uma cópia">${Icons.minus}</button>
          <output>${c.qty}</output>
          <button type="button" data-action="inc" aria-label="Adicionar uma cópia" aria-disabled="${!reason.ok}" title="${esc(reason.ok ? 'Adicionar uma cópia' : reason.reason)}">${Icons.plus}</button>
        </div>
        <button type="button" class="icon-btn icon-btn-danger" data-action="remove" aria-label="Remover todas as cópias de ${esc(c.name)}" title="Remover do deck">${Icons.trash}</button>
      </li>`;
  }

  deckPane.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('.deck-row')?.dataset.id;
    const entry = deck.cards.find((c) => c.id === id);
    if (!entry) return;
    const action = btn.dataset.action;
    if (action === 'inc') addEntry(entry);
    if (action === 'dec') removeOne(id);
    if (action === 'remove') removeAll(id);
    if (action === 'detail') openDetail(id, entry.name);
    // Devolve o foco ao mesmo controle depois de redesenhar a lista.
    if (action === 'inc' || action === 'dec') {
      deckPane.querySelector(`.deck-row[data-id="${CSS.escape(id)}"] [data-action="${action}"]`)?.focus();
    }
  });

  function openDetail(id, name) {
    CardDetail.open(id, {
      name,
      mode: 'deck',
      getDeck: () => deck,
      onAdd: (entry) => addEntry(entry),
      onRemove: (cardId) => removeOne(cardId),
    });
  }

  // ---------- Nome do deck ----------
  nameInput.addEventListener('input', () => {
    deck.name = nameInput.value;
    nameError.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    setDirty(true);
  });

  // ---------- Salvar ----------
  async function save() {
    const name = nameInput.value.trim();
    if (!name) {
      nameError.textContent = 'O deck precisa de um nome.';
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      UI.toast('Dê um nome ao deck antes de salvar.', { type: 'warn' });
      return false;
    }
    deck.name = name;
    nameInput.value = name;

    const errors = Rules.validate(deck).filter((i) => i.level === 'error');
    if (errors.length) {
      const ok = await UI.confirm({
        title: 'Deck ainda incompleto',
        message: 'Este deck ainda não segue todas as regras. Você pode salvá-lo como rascunho e terminar depois.',
        details: errors.map((e) => e.msg),
        confirmLabel: 'Salvar como rascunho',
        cancelLabel: 'Continuar editando',
      });
      if (!ok) return false;
    }
    Store.upsert(deck);
    setDirty(false);
    UI.toast(errors.length ? 'Rascunho salvo.' : 'Deck salvo e pronto para jogar!', { type: 'success' });
    return true;
  }

  // ---------- Barra superior e abas (mobile) ----------
  root.querySelector('.editor-head').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'save') save();
    if (btn.dataset.action === 'export') exportList();
  });

  root.querySelector('.editor-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    tab = btn.dataset.tab;
    editorEl.dataset.tab = tab;
    root.querySelectorAll('.editor-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  });

  async function exportList() {
    const text = deckListText(deck, rates);
    if (await UI.copyText(text)) UI.toast('Lista copiada para a área de transferência.', { type: 'success' });
    else UI.openModal({ title: 'Lista do deck', body: `<textarea class="export-box" readonly rows="14">${esc(text)}</textarea>` });
  }

  // Ctrl+S salva; aviso do navegador ao fechar com alterações pendentes.
  function onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (dirty) save();
    }
  }
  function onBeforeUnload(e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  }
  document.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', onBeforeUnload);

  setDirty(false);
  renderDeck();

  // Cotação do dia e preços de cartas salvas antes de existir o campo de preço.
  Prices.rates().then((r) => {
    rates = r;
    renderDeck();
  });
  Prices.backfill(deck).then((changed) => {
    if (!changed) return;
    Store.patchPrices(deck.id, deck.cards);
    renderDeck();
  });

  return {
    isDirty: () => dirty,
    save,
    destroy() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    },
  };
}
