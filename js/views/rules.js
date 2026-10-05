// Tela "Regras e ajuda".
function RulesView(root) {
  root.innerHTML = `
    <section class="page page-narrow">
      <div class="page-head"><div>
        <h1>Regras e ajuda</h1>
        <p class="muted">O DeckForge aplica as regras básicas de montagem do Pokémon TCG enquanto você monta seu deck.</p>
      </div></div>

      <div class="rules-grid">
        <article class="rule-card">
          <span class="rule-num">60</span>
          <h2>Exatamente 60 cartas</h2>
          <p>Todo deck tem 60 cartas. O contador no painel do deck mostra quantas faltam, e o botão de adicionar é bloqueado ao chegar no limite.</p>
        </article>
        <article class="rule-card">
          <span class="rule-num">4</span>
          <h2>Até 4 cópias por nome</h2>
          <p>Você pode ter no máximo 4 cartas com o mesmo nome, mesmo que sejam de coleções diferentes. Exemplo: 2 "Pikachu" de uma coleção + 2 de outra.</p>
        </article>
        <article class="rule-card">
          <span class="rule-num">∞</span>
          <h2>Energia Básica é livre</h2>
          <p>Cartas de Energia Básica (como Energia de Fogo) não têm limite de cópias. Energias Especiais seguem o limite de 4.</p>
        </article>
        <article class="rule-card">
          <span class="rule-num">1+</span>
          <h2>Pelo menos 1 Pokémon Básico</h2>
          <p>A partida começa com um Pokémon Básico em jogo, então o deck precisa de pelo menos um.</p>
        </article>
      </div>

      <h2 class="section-title">Como usar</h2>
      <ol class="steps">
        <li><strong>Crie um deck</strong> em "Meus decks" e dê um nome a ele.</li>
        <li><strong>Busque cartas</strong> pelo nome ou use os filtros de categoria, tipo e coleção.</li>
        <li><strong>Clique em +</strong> para adicionar. O número no canto da carta mostra quantas cópias já estão no deck.</li>
        <li><strong>Ajuste as quantidades</strong> no painel do deck com os botões − e +, ou remova a carta pela lixeira (dá para desfazer).</li>
        <li><strong>Salve</strong> com o botão "Salvar" ou <span class="kbd">Ctrl</span> + <span class="kbd">S</span>. Decks incompletos podem ser salvos como rascunho.</li>
      </ol>

      <div class="callout">
        ${Icons.info}
        <p>Os decks ficam salvos <strong>apenas neste navegador</strong> (armazenamento local). Use "Copiar lista" para guardar ou compartilhar um deck em texto.</p>
      </div>

      <a class="btn btn-primary" href="#/">${Icons.layers} Ir para Meus decks</a>
    </section>`;
  return {};
}
