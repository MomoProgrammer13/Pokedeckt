// Persistência dos decks no navegador (localStorage).
const Store = (() => {
  const KEY = 'deckforge:decks';

  function all() {
    try {
      const decks = JSON.parse(localStorage.getItem(KEY)) || [];
      return decks.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  function saveAll(decks) {
    localStorage.setItem(KEY, JSON.stringify(decks));
  }

  const get = (id) => all().find((d) => d.id === id) || null;

  function upsert(deck) {
    const decks = all().filter((d) => d.id !== deck.id);
    decks.push({ ...deck, updatedAt: Date.now() });
    saveAll(decks);
  }

  // Copia preços para as cartas de um deck salvo sem mudar a data de atualização.
  function patchPrices(id, cards) {
    const decks = all();
    const deck = decks.find((d) => d.id === id);
    if (!deck) return;
    const byId = new Map(cards.map((c) => [c.id, c]));
    deck.cards.forEach((c) => {
      if (c.price === undefined && byId.get(c.id)?.price !== undefined) c.price = byId.get(c.id).price;
    });
    saveAll(decks);
  }

  function remove(id) {
    saveAll(all().filter((d) => d.id !== id));
  }

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function create(name) {
    const now = Date.now();
    const deck = { id: newId(), name, cards: [], createdAt: now, updatedAt: now };
    saveAll([...all(), deck]);
    return deck;
  }

  function duplicate(id) {
    const source = get(id);
    if (!source) return null;
    const now = Date.now();
    const copy = {
      ...structuredClone(source),
      id: newId(),
      name: `${source.name} (cópia)`.slice(0, 40),
      createdAt: now,
      updatedAt: now,
    };
    saveAll([...all(), copy]);
    return copy;
  }

  // Restaura um deck exatamente como era (usado no "Desfazer").
  function restore(deck) {
    saveAll([...all().filter((d) => d.id !== deck.id), deck]);
  }

  return { all, get, upsert, patchPrices, remove, create, duplicate, restore };
})();
