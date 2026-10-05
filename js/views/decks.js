// Lista do deck em texto (usada em "Copiar lista" aqui e no editor).
function deckListText(deck, rates) {
  const lines = [`${deck.name} (${Rules.total(deck)}/${Rules.DECK_SIZE})`];
  Rules.CATEGORIES.forEach((cat) => {
    const cards = deck.cards.filter((c) => c.category === cat);
    if (!cards.length) return;
    lines.push('', `${cat}: ${cards.reduce((n, c) => n + c.qty, 0)}`);
    cards.forEach((c) => {
      const unit = Prices.short(c.price, rates);
      lines.push(`${c.qty} ${c.name} (${c.id})${unit ? ` · ${unit} un.` : ''}`);
    });
  });
  const v = Prices.deckValue(deck, rates);
  const total = v.total != null ? Prices.money(v.total) : v.eur ? Prices.money(v.eur, 'EUR') : null;
  if (total) lines.push('', `Valor estimado: ${total}${v.missing ? ` (${v.missing} cartas sem preço)` : ''}`);
  return lines.join('\n');
}

// Tela "Meus decks": lista, cria, duplica, exporta e exclui decks.
function DecksView(root) {
  const { esc } = UI;
  let alive = true;
  let rates = null;

  function deckCover(deck) {
    // Até 3 cartas em leque: prioriza Pokémon, depois o resto.
    const sorted = [...deck.cards].sort((a, b) => (a.category === 'Pokémon' ? -1 : 0) - (b.category === 'Pokémon' ? -1 : 0));
    const picks = sorted.slice(0, 3);
    if (!picks.length) return `<div class="cover cover-empty">${Icons.layers}<span>Deck vazio</span></div>`;
    return `<div class="cover cover-${picks.length}">${picks.map((c) => `<img src="${esc(Api.image(c.image))}" alt="" loading="lazy">`).join('')}</div>`;
  }

  function valueText(deck) {
    if (!deck.cards.length) return '';
    const v = Prices.deckValue(deck, rates);
    const value = v.total != null ? Prices.money(v.total) : v.eur ? Prices.money(v.eur, 'EUR') : null;
    return value ? ` <span class="deck-card-value" title="Valor estimado de mercado">≈ ${value}</span>` : '';
  }

  function deckCard(deck) {
    const n = Rules.total(deck);
    const ready = Rules.isReady(deck);
    const byCat = Rules.countByCategory(deck);
    const pct = Math.min(100, Math.round((n / Rules.DECK_SIZE) * 100));
    return `
      <article class="deck-card" data-id="${esc(deck.id)}">
        <a class="deck-card-link" href="#/deck/${esc(deck.id)}" aria-label="Abrir deck ${esc(deck.name)}">${deckCover(deck)}</a>
        <div class="deck-card-body">
          <div class="deck-card-title">
            <h3><a href="#/deck/${esc(deck.id)}">${esc(deck.name)}</a></h3>
            <span class="badge ${ready ? 'badge-ok' : 'badge-warn'}">${ready ? `${Icons.check} Pronto` : 'Rascunho'}</span>
          </div>
          <div class="meter ${n === Rules.DECK_SIZE ? 'is-full' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${Rules.DECK_SIZE}" aria-valuenow="${n}" aria-label="Cartas no deck">
            <span style="width:${pct}%"></span>
          </div>
          <p class="deck-card-count"><strong>${n}</strong>/${Rules.DECK_SIZE} cartas${valueText(deck)}</p>
          <p class="deck-card-cats small muted">Pokémon ${byCat['Pokémon']} · Treinador ${byCat['Treinador']} · Energia ${byCat['Energia']}</p>
          <p class="small muted">Atualizado em ${UI.formatDate(deck.updatedAt)}</p>
        </div>
        <div class="deck-card-actions">
          <a class="btn btn-primary btn-sm" href="#/deck/${esc(deck.id)}">${Icons.edit} Editar</a>
          <button type="button" class="icon-btn" data-action="duplicate" title="Duplicar" aria-label="Duplicar ${esc(deck.name)}">${Icons.copy}</button>
          <button type="button" class="icon-btn" data-action="export" title="Copiar lista" aria-label="Copiar lista de ${esc(deck.name)}">${Icons.list}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete" title="Excluir" aria-label="Excluir ${esc(deck.name)}">${Icons.trash}</button>
        </div>
      </article>`;
  }

  function render() {
    const decks = Store.all();
    root.innerHTML = `
      <section class="page">
        <div class="page-head">
          <div>
            <h1>Meus decks</h1>
            <p class="muted">${decks.length ? `${decks.length} ${decks.length === 1 ? 'deck salvo' : 'decks salvos'} neste navegador.` : 'Monte decks de 60 cartas com cartas oficiais em português.'}</p>
          </div>
          <button type="button" class="btn btn-primary" data-action="create">${Icons.plus} Novo deck</button>
        </div>
        ${decks.length
          ? `<div class="deck-grid">${decks.map(deckCard).join('')}</div>`
          : `<div class="empty empty-hero">
               <svg viewBox="0 0 32 32" class="empty-ball" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 16h9m10 0h9" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
               <h2>Nenhum deck por aqui ainda</h2>
               <p class="muted">Crie seu primeiro deck, busque cartas pelo nome e acompanhe a contagem até chegar a 60.</p>
               <div class="row-gap">
                 <button type="button" class="btn btn-primary" data-action="create">${Icons.plus} Criar meu primeiro deck</button>
                 <a class="btn btn-ghost" href="#/regras">${Icons.book} Ver regras de montagem</a>
               </div>
             </div>`}
      </section>`;
  }

  async function exportDeck(deck) {
    const text = deckListText(deck, rates);
    if (await UI.copyText(text)) {
      UI.toast('Lista copiada para a área de transferência.', { type: 'success' });
      return;
    }
    UI.openModal({ title: 'Lista do deck', body: `<textarea class="export-box" readonly rows="14">${esc(text)}</textarea>` });
  }

  async function createDeck() {
    const name = await UI.prompt({ title: 'Novo deck', label: 'Nome do deck', placeholder: 'Ex.: Pikachu Elétrico', confirmLabel: 'Criar deck' });
    if (!name) return;
    const deck = Store.create(name);
    location.hash = `#/deck/${deck.id}`;
  }

  root.onclick = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'create') return createDeck();

    const deck = Store.get(btn.closest('.deck-card')?.dataset.id);
    if (!deck) return;

    if (action === 'duplicate') {
      const copy = Store.duplicate(deck.id);
      render();
      UI.toast(`Deck duplicado como "${copy.name}".`, { type: 'success' });
    }
    if (action === 'export') exportDeck(deck);
    if (action === 'delete') {
      const ok = await UI.confirm({
        title: 'Excluir deck?',
        message: `O deck "${deck.name}" e suas ${Rules.total(deck)} cartas serão removidos deste navegador.`,
        confirmLabel: 'Excluir deck',
        danger: true,
      });
      if (!ok) return;
      Store.remove(deck.id);
      render();
      UI.toast(`Deck "${deck.name}" excluído.`, {
        action: { label: 'Desfazer', onClick: () => { Store.restore(deck); if (alive) render(); } },
        timeout: 7000,
      });
    }
  };

  render();

  // Carrega a cotação e completa preços de decks antigos, depois redesenha.
  Prices.rates().then((r) => {
    rates = r;
    if (alive) render();
  });
  Promise.all(Store.all().map(async (deck) => {
    if (await Prices.backfill(deck)) Store.patchPrices(deck.id, deck.cards);
  })).then(() => alive && render());

  return { destroy: () => { alive = false; root.onclick = null; } };
}
