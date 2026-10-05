// Tela "Explorar cartas": consulta livre do catálogo, sem estar editando um deck.
function ExploreView(root) {
  root.innerHTML = `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Explorar cartas</h1>
          <p class="muted">Pesquise no catálogo oficial em português. Clique numa carta para ver detalhes e adicioná-la a um deck.</p>
        </div>
      </div>
      <div class="explore-search"></div>
    </section>`;

  const search = createCardSearch(root.querySelector('.explore-search'), {
    mode: 'explore',
    onOpen: (card) => CardDetail.open(card.id, { name: card.name, mode: 'explore' }),
  });
  search.focus();
  return {};
}
