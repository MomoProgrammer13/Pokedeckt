// Regras de construção de deck do Pokémon TCG (formato padrão).
const Rules = (() => {
  const DECK_SIZE = 60;
  const MAX_COPIES = 4;
  const CATEGORIES = ['Pokémon', 'Treinador', 'Energia'];
  const BASIC_ENERGY_NAME = /^energia (de )?(planta|grama|fogo|água|agua|raios|elétrica|eletrica|psíquica|psiquica|luta|lutador|escuridão|escuridao|sombria|metal|fada|incolor)$/i;

  const norm = (s) => String(s || '').trim().toLowerCase();

  // Energia Básica não tem limite de cópias.
  function isBasicEnergy(card) {
    if (card.category !== 'Energia') return false;
    if (card.energyType) return card.energyType === 'Normal';
    return BASIC_ENERGY_NAME.test(norm(card.name));
  }

  const total = (deck) => deck.cards.reduce((n, c) => n + c.qty, 0);

  const countByCategory = (deck) =>
    CATEGORIES.reduce((acc, cat) => {
      acc[cat] = deck.cards.filter((c) => c.category === cat).reduce((n, c) => n + c.qty, 0);
      return acc;
    }, {});

  // O limite de 4 vale para cartas com o MESMO NOME, mesmo de coleções diferentes.
  const copiesByName = (deck, name) =>
    deck.cards.filter((c) => norm(c.name) === norm(name)).reduce((n, c) => n + c.qty, 0);

  const qtyOf = (deck, id) => deck.cards.find((c) => c.id === id)?.qty || 0;

  // Checagem rápida usando só o nome (antes de carregar os detalhes da carta).
  function blockReason(deck, { name }) {
    if (total(deck) >= DECK_SIZE) return `O deck já tem ${DECK_SIZE} cartas. Remova uma para adicionar outra.`;
    const sameName = deck.cards.filter((c) => norm(c.name) === norm(name));
    if (sameName.some(isBasicEnergy)) return null;
    if (copiesByName(deck, name) >= MAX_COPIES) {
      return `Limite atingido: no máximo ${MAX_COPIES} cópias de "${name}" por deck.`;
    }
    return null;
  }

  // Checagem completa, com os dados da carta já carregados.
  function canAdd(deck, card) {
    if (total(deck) >= DECK_SIZE) {
      return { ok: false, reason: `O deck já tem ${DECK_SIZE} cartas. Remova uma para adicionar outra.` };
    }
    if (!isBasicEnergy(card) && copiesByName(deck, card.name) >= MAX_COPIES) {
      return { ok: false, reason: `Limite atingido: no máximo ${MAX_COPIES} cópias de "${card.name}" por deck.` };
    }
    return { ok: true };
  }

  // Lista de problemas do deck. level "error" impede o deck de ser considerado pronto.
  function validate(deck) {
    const issues = [];
    const n = total(deck);
    if (n < DECK_SIZE) {
      const missing = DECK_SIZE - n;
      issues.push({ level: 'error', msg: `Faltam ${missing} ${missing === 1 ? 'carta' : 'cartas'} para completar ${DECK_SIZE}.` });
    } else if (n > DECK_SIZE) {
      issues.push({ level: 'error', msg: `O deck tem ${n - DECK_SIZE} cartas a mais que o limite de ${DECK_SIZE}.` });
    }

    const hasBasic = deck.cards.some((c) => c.category === 'Pokémon' && norm(c.stage) === 'básico');
    if (!hasBasic) issues.push({ level: 'error', msg: 'O deck precisa de pelo menos 1 Pokémon Básico para iniciar a partida.' });

    const names = new Map();
    deck.cards.filter((c) => !isBasicEnergy(c)).forEach((c) => names.set(norm(c.name), { name: c.name, qty: (names.get(norm(c.name))?.qty || 0) + c.qty }));
    names.forEach(({ name, qty }) => {
      if (qty > MAX_COPIES) issues.push({ level: 'error', msg: `"${name}" tem ${qty} cópias (máximo ${MAX_COPIES}).` });
    });

    const byCat = countByCategory(deck);
    if (n > 0 && byCat['Energia'] === 0) {
      issues.push({ level: 'warn', msg: 'Nenhuma carta de Energia: seus Pokémon podem não conseguir atacar.' });
    }
    if (n > 0 && byCat['Treinador'] === 0) {
      issues.push({ level: 'warn', msg: 'Nenhuma carta de Treinador: decks costumam usá-las para comprar e buscar cartas.' });
    }
    return issues;
  }

  const isReady = (deck) => !validate(deck).some((i) => i.level === 'error');

  return { DECK_SIZE, MAX_COPIES, CATEGORIES, isBasicEnergy, total, countByCategory, copiesByName, qtyOf, blockReason, canAdd, validate, isReady };
})();
