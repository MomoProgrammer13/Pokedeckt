// Preços das cartas (Cardmarket em EUR e TCGplayer em USD, vindos da TCGdex)
// e conversão para reais com a cotação do dia.
const Prices = (() => {
  const RATES_KEY = 'deckforge:rates';
  const RATES_TTL = 12 * 60 * 60 * 1000; // 12 horas
  const TCG_VARIANTS = {
    normal: 'Normal',
    holofoil: 'Holo',
    'reverse-holofoil': 'Reverse Holo',
    '1st-edition': '1ª Edição',
    '1st-edition-normal': '1ª Edição',
    '1st-edition-holofoil': '1ª Edição Holo',
    'unlimited-holofoil': 'Holo (Ilimitada)',
  };

  const positive = (...values) => values.find((v) => typeof v === 'number' && v > 0) ?? null;

  function pricingOf(card) {
    if (card.pricing) return card.pricing;
    return (card.variants_detailed || []).find((v) => v.pricing)?.pricing || null;
  }

  // Lista de variantes do TCGplayer com preço.
  function tcgVariants(tcg) {
    if (!tcg) return [];
    return Object.entries(tcg)
      .filter(([, v]) => v && typeof v === 'object')
      .map(([key, v]) => ({ key, label: TCG_VARIANTS[key] || key, ...v }));
  }

  // Preço resumido guardado no deck: um valor em EUR e um em USD por cópia.
  function fromCard(card) {
    const p = pricingOf(card);
    if (!p) return null;
    const cm = p.cardmarket;
    const eur = cm ? positive(cm.trend, cm.avg, cm.avg30, cm['trend-holo'], cm['avg-holo'], cm['avg30-holo']) : null;
    const usd = positive(...tcgVariants(p.tcgplayer).flatMap((v) => [v.marketPrice, v.midPrice]));
    if (eur == null && usd == null) return null;
    return { eur, usd, updated: cm?.updated || p.tcgplayer?.updated || null };
  }

  // ---------- Cotação ----------
  let ratesPromise = null;

  async function fetchRates() {
    try {
      const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=BRL,USD').then((res) => res.json());
      return { eurBrl: r.rates.BRL, usdBrl: r.rates.BRL / r.rates.USD, date: r.date };
    } catch {
      const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json').then((res) => res.json());
      return { eurBrl: r.eur.brl, usdBrl: r.eur.brl / r.eur.usd, date: r.date };
    }
  }

  // Resolve com a cotação ou null (aí os preços aparecem só na moeda original).
  function rates() {
    if (ratesPromise) return ratesPromise;
    try {
      const cached = JSON.parse(localStorage.getItem(RATES_KEY));
      if (cached && Date.now() - cached.fetchedAt < RATES_TTL) return (ratesPromise = Promise.resolve(cached));
    } catch { /* sem cache */ }
    ratesPromise = fetchRates()
      .then((r) => {
        const data = { ...r, fetchedAt: Date.now() };
        try { localStorage.setItem(RATES_KEY, JSON.stringify(data)); } catch { /* ignora */ }
        return data;
      })
      .catch(() => {
        ratesPromise = null;
        return null;
      });
    return ratesPromise;
  }

  // Valor unitário em reais: prioriza Cardmarket (EUR) e usa TCGplayer (USD) como alternativa.
  function unitBRL(price, r) {
    if (!price || !r) return null;
    if (price.eur != null) return price.eur * r.eurBrl;
    if (price.usd != null) return price.usd * r.usdBrl;
    return null;
  }

  function deckValue(deck, r) {
    let total = 0, eur = 0, missing = 0, pending = 0;
    deck.cards.forEach((c) => {
      if (c.price === undefined) { pending += c.qty; return; }
      const brl = unitBRL(c.price, r);
      if (brl == null && c.price?.eur == null) { missing += c.qty; return; }
      if (brl != null) total += brl * c.qty;
      if (c.price?.eur != null) eur += c.price.eur * c.qty;
    });
    return { total: r ? total : null, eur, missing, pending };
  }

  // Preenche o preço de cartas salvas antes desta funcionalidade existir.
  async function backfill(deck) {
    const missing = deck.cards.filter((c) => c.price === undefined);
    if (!missing.length) return false;
    await Promise.all(missing.map(async (c) => {
      try { c.price = fromCard(await Api.card(c.id)); } catch { /* tenta de novo depois */ }
    }));
    return true;
  }

  const fmts = {};
  function money(value, currency = 'BRL') {
    if (value == null) return '—';
    fmts[currency] ||= new Intl.NumberFormat('pt-BR', { style: 'currency', currency });
    return fmts[currency].format(value);
  }

  // Texto curto do preço unitário para listas.
  function short(price, r) {
    const brl = unitBRL(price, r);
    if (brl != null) return money(brl);
    if (price?.eur != null) return money(price.eur, 'EUR');
    if (price?.usd != null) return money(price.usd, 'USD');
    return null;
  }

  return { pricingOf, tcgVariants, fromCard, rates, unitBRL, deckValue, backfill, money, short };
})();
