// Modal com os detalhes completos de uma carta.
const CardDetail = (() => {
  const { esc, typeChip, energyDot } = UI;

  // Formato resumido que guardamos dentro do deck.
  function toEntry(card) {
    return {
      id: card.id,
      name: card.name,
      image: card.image,
      category: card.category,
      types: card.types || [],
      stage: card.stage || '',
      hp: card.hp || null,
      energyType: card.energyType || '',
      trainerType: card.trainerType || '',
      setName: card.set?.name || '',
      rarity: card.rarity || '',
      price: Prices.fromCard(card),
    };
  }

  function subtitle(card) {
    const parts = [card.category];
    if (card.stage) parts.push(card.stage);
    if (card.trainerType) parts.push(card.trainerType);
    if (card.energyType) parts.push(`Energia ${card.energyType === 'Normal' ? 'Básica' : card.energyType}`);
    if (card.hp) parts.push(`${card.hp} PS`);
    return parts.map(esc).join(' · ');
  }

  function renderBody(card, rates) {
    const attacks = (card.attacks || []).map((a) => `
      <li class="attack">
        <div class="attack-head">
          <span class="attack-cost">${(a.cost || []).map(energyDot).join('') || '<span class="muted small">sem custo</span>'}</span>
          <strong>${esc(a.name)}</strong>
          ${a.damage ? `<span class="attack-dmg">${esc(a.damage)}</span>` : ''}
        </div>
        ${a.effect ? `<p>${esc(a.effect)}</p>` : ''}
      </li>`).join('');

    const abilities = (card.abilities || []).map((a) => `
      <li class="attack ability">
        <div class="attack-head"><span class="ability-tag">${esc(a.type || 'Habilidade')}</span><strong>${esc(a.name)}</strong></div>
        ${a.effect ? `<p>${esc(a.effect)}</p>` : ''}
      </li>`).join('');

    const wr = (list) => (list || []).map((w) => `${typeChip(w.type)} <span class="small">${esc(w.value || '')}</span>`).join(' ');

    const legal = card.legal
      ? `<div class="legal">
          <span class="legal-badge ${card.legal.standard ? 'ok' : 'no'}">${card.legal.standard ? Icons.check : Icons.x} Padrão</span>
          <span class="legal-badge ${card.legal.expanded ? 'ok' : 'no'}">${card.legal.expanded ? Icons.check : Icons.x} Expandido</span>
        </div>`
      : '';

    return `
      <div class="detail">
        <div class="detail-img">
          <img src="${esc(Api.image(card.image, 'high'))}" alt="Carta ${esc(card.name)}" onerror="this.closest('.detail-img').classList.add('img-missing')">
        </div>
        <div class="detail-info">
          <p class="detail-sub">${subtitle(card)}</p>
          ${card.types?.length ? `<div class="chips">${card.types.map(typeChip).join('')}</div>` : ''}
          ${card.evolveFrom ? `<p class="small muted">Evolui de <strong>${esc(card.evolveFrom)}</strong></p>` : ''}
          ${abilities || attacks ? `<ul class="attacks">${abilities}${attacks}</ul>` : ''}
          ${card.effect ? `<div class="effect"><p>${esc(card.effect)}</p></div>` : ''}
          ${card.weaknesses || card.resistances || card.retreat != null
            ? `<dl class="stats">
                ${card.weaknesses ? `<div><dt>Fraqueza</dt><dd>${wr(card.weaknesses)}</dd></div>` : ''}
                ${card.resistances ? `<div><dt>Resistência</dt><dd>${wr(card.resistances)}</dd></div>` : ''}
                ${card.retreat != null ? `<div><dt>Recuo</dt><dd>${Array.from({ length: card.retreat }, () => energyDot('Incolor')).join('') || '0'}</dd></div>` : ''}
              </dl>`
            : ''}
          <dl class="meta">
            <div><dt>Coleção</dt><dd>${esc(card.set?.name || '—')}</dd></div>
            <div><dt>Número</dt><dd>${esc(card.localId)}${card.set?.cardCount?.official ? `/${esc(card.set.cardCount.official)}` : ''}</dd></div>
            <div><dt>Raridade</dt><dd>${esc(card.rarity || '—')}</dd></div>
            ${card.illustrator ? `<div><dt>Ilustração</dt><dd>${esc(card.illustrator)}</dd></div>` : ''}
          </dl>
          ${renderPrices(card, rates)}
          ${legal}
          ${Rules.isBasicEnergy(card) ? `<p class="hint">${Icons.info} Energia Básica: pode ter quantas cópias quiser.</p>` : ''}
        </div>
      </div>`;
  }

  // Bloco "Preço de mercado": estimativa em reais + tabelas por loja.
  function renderPrices(card, rates) {
    const p = Prices.pricingOf(card);
    const summary = Prices.fromCard(card);
    if (!summary) {
      return `<section class="prices"><h3>Preço de mercado</h3><p class="muted small">Sem preço disponível para esta carta.</p></section>`;
    }
    const { money } = Prices;
    const brl = Prices.unitBRL(summary, rates);
    const cm = p.cardmarket;
    const cmRows = cm
      ? [['Tendência', cm.trend], ['Média', cm.avg], ['Mínimo', cm.low], ['Média 30 dias', cm.avg30]]
          .filter(([, v]) => v > 0)
          .map(([label, v]) => `<tr><th scope="row">${label}</th><td>${money(v, 'EUR')}</td><td class="muted">${rates ? `≈ ${money(v * rates.eurBrl)}` : ''}</td></tr>`).join('')
      : '';
    const tcg = Prices.tcgVariants(p.tcgplayer).filter((v) => v.marketPrice > 0 || v.midPrice > 0);
    const tcgRows = tcg.map((v) => {
      const value = v.marketPrice > 0 ? v.marketPrice : v.midPrice;
      return `<tr><th scope="row">${esc(v.label)}${v.lowPrice > 0 ? `<span class="muted small"> · mín. ${money(v.lowPrice, 'USD')}</span>` : ''}</th><td>${money(value, 'USD')}</td><td class="muted">${rates ? `≈ ${money(value * rates.usdBrl)}` : ''}</td></tr>`;
    }).join('');
    const tcgLink = tcg[0]?.productId ? `<a href="https://www.tcgplayer.com/product/${encodeURIComponent(tcg[0].productId)}" target="_blank" rel="noopener">ver loja</a>` : '';
    const updated = summary.updated ? `Preços de ${UI.formatDate(Date.parse(summary.updated))}` : '';
    const rateNote = rates ? `cotação de ${new Date(rates.date + 'T12:00').toLocaleDateString('pt-BR')} (1 € = ${money(rates.eurBrl)}, 1 US$ = ${money(rates.usdBrl)})` : 'conversão para reais indisponível no momento';

    return `
      <section class="prices">
        <div class="prices-head">
          <h3>Preço de mercado</h3>
          <p class="price-main">${brl != null ? `≈ ${money(brl)}` : Prices.short(summary, null)} <span class="muted small">por cópia</span></p>
        </div>
        ${cmRows ? `<table class="price-table"><caption>Cardmarket (Europa)</caption><tbody>${cmRows}</tbody></table>` : ''}
        ${tcgRows ? `<table class="price-table"><caption>TCGplayer (EUA) ${tcgLink}</caption><tbody>${tcgRows}</tbody></table>` : ''}
        <p class="muted small">${[updated, rateNote].filter(Boolean).join(' · ')}. Valores de referência do mercado internacional.</p>
      </section>`;
  }

  // mode "deck": adiciona/remove do deck em edição. mode "explore": escolhe um deck salvo.
  function open(cardId, { name = 'Carta', mode = 'explore', getDeck, onAdd, onRemove } = {}) {
    const m = UI.openModal({
      title: name,
      size: 'lg',
      body: `<div class="detail-loading"><div class="spinner" aria-hidden="true"></div><p>Carregando carta…</p></div>`,
      footer: ' ',
    });
    m.foot.hidden = true;

    Promise.all([Api.card(cardId), Prices.rates()])
      .then(([card, rates]) => {
        m.el.querySelector('.modal-head h2').textContent = card.name;
        m.body.innerHTML = renderBody(card, rates);
        const entry = toEntry(card);
        m.foot.hidden = false;
        if (mode === 'deck') renderDeckFooter(m, entry, { getDeck, onAdd, onRemove });
        else renderExploreFooter(m, entry);
      })
      .catch((err) => {
        m.body.innerHTML = `
          <div class="empty">
            ${Icons.alert}<p><strong>Não foi possível carregar esta carta.</strong></p><p class="muted">${esc(err.message)}</p>
            <button type="button" class="btn btn-ghost" data-retry>${Icons.refresh} Tentar novamente</button>
          </div>`;
        m.body.querySelector('[data-retry]').addEventListener('click', () => {
          m.close();
          open(cardId, { name, mode, getDeck, onAdd, onRemove });
        });
      });
    return m;
  }

  function renderDeckFooter(m, entry, { getDeck, onAdd, onRemove }) {
    const draw = () => {
      const deck = getDeck();
      const qty = Rules.qtyOf(deck, entry.id);
      const check = Rules.canAdd(deck, entry);
      m.foot.innerHTML = `
        <p class="foot-status">No deck: <strong>${qty}</strong> ${qty === 1 ? 'cópia' : 'cópias'}
          ${!check.ok ? `<span class="foot-reason">${Icons.alert} ${esc(check.reason)}</span>` : ''}</p>
        <button type="button" class="btn btn-ghost" data-remove ${qty ? '' : 'disabled'}>${Icons.minus} Remover 1</button>
        <button type="button" class="btn btn-primary" data-add aria-disabled="${!check.ok}">${Icons.plus} Adicionar ao deck</button>`;
      m.foot.querySelector('[data-add]').addEventListener('click', () => { onAdd(entry); draw(); });
      m.foot.querySelector('[data-remove]').addEventListener('click', () => { onRemove(entry.id); draw(); });
    };
    draw();
  }

  function renderExploreFooter(m, entry) {
    const decks = Store.all();
    if (!decks.length) {
      m.foot.innerHTML = `
        <p class="foot-status muted">Você ainda não tem decks.</p>
        <button type="button" class="btn btn-primary" data-create>${Icons.plus} Criar deck com esta carta</button>`;
      m.foot.querySelector('[data-create]').addEventListener('click', async () => {
        const deckName = await UI.prompt({ title: 'Novo deck', label: 'Nome do deck', placeholder: 'Ex.: Pikachu Elétrico', confirmLabel: 'Criar deck' });
        if (!deckName) return;
        const deck = Store.create(deckName);
        addToSaved(deck.id, entry);
        renderExploreFooter(m, entry);
      });
      return;
    }
    m.foot.innerHTML = `
      <label class="field field-inline"><span>Adicionar ao deck</span>
        <select data-deck>${decks.map((d) => `<option value="${esc(d.id)}">${esc(d.name)} (${Rules.total(d)}/${Rules.DECK_SIZE})</option>`).join('')}</select>
      </label>
      <button type="button" class="btn btn-primary" data-add>${Icons.plus} Adicionar</button>`;
    const select = m.foot.querySelector('[data-deck]');
    m.foot.querySelector('[data-add]').addEventListener('click', () => {
      const id = select.value;
      addToSaved(id, entry);
      renderExploreFooter(m, entry);
      m.foot.querySelector('[data-deck]').value = id;
    });
  }

  // Adiciona direto a um deck salvo (usado fora do editor).
  function addToSaved(deckId, entry) {
    const deck = Store.get(deckId);
    if (!deck) return;
    const check = Rules.canAdd(deck, entry);
    if (!check.ok) {
      UI.toast(check.reason, { type: 'warn' });
      return;
    }
    const existing = deck.cards.find((c) => c.id === entry.id);
    existing ? existing.qty++ : deck.cards.push({ ...entry, qty: 1 });
    Store.upsert(deck);
    UI.toast(`"${entry.name}" adicionada a "${deck.name}" (${Rules.total(deck)}/${Rules.DECK_SIZE}).`, {
      type: 'success',
      action: { label: 'Abrir deck', onClick: () => (location.hash = `#/deck/${deck.id}`) },
    });
  }

  return { open, toEntry };
})();
