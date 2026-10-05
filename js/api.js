// Cliente da API pública TCGdex (https://tcgdex.dev), em português.
const Api = (() => {
  const BASE = 'https://api.tcgdex.net/v2/pt';
  const cache = new Map();

  function get(path) {
    if (cache.has(path)) return cache.get(path);
    const request = fetch(BASE + path)
      .then((res) => {
        if (!res.ok) throw new Error(`A API respondeu com erro ${res.status}.`);
        return res.json();
      })
      .catch((err) => {
        cache.delete(path);
        if (err instanceof TypeError) {
          throw new Error('Não foi possível conectar à API TCGdex. Verifique sua internet.');
        }
        throw err;
      });
    cache.set(path, request);
    return request;
  }

  // Monta a query manualmente: a TCGdex usa ":" nas chaves (pagination:page, sort:field).
  function query(params) {
    return Object.entries(params)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
  }

  function searchCards({ name, category, type, set, sort, page = 1, perPage = 24 }) {
    const q = query({
      name: name?.trim(),
      category,
      types: type,
      set,
      image: 'notnull:', // ignora cartas sem imagem em português
      'sort:field': sort || '',
      'pagination:page': page,
      'pagination:itemsPerPage': perPage,
    });
    return get(`/cards?${q}`);
  }

  const card = (id) => get(`/cards/${encodeURIComponent(id)}`);
  const types = () => get('/types');
  const sets = () => get('/sets');

  // URL da imagem: a TCGdex devolve a base e o cliente escolhe qualidade e formato.
  const image = (base, quality = 'low') => (base ? `${base}/${quality}.webp` : '');

  return { searchCards, card, types, sets, image };
})();
