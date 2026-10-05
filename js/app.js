// Roteador por hash (#/, #/explorar, #/regras, #/deck/:id) com proteção de alterações não salvas.
(() => {
  const root = document.getElementById('app');
  let current = null;
  let currentHash = location.hash || '#/';

  const routes = [
    { pattern: /^#\/deck\/([\w-]+)$/, nav: 'decks', view: (m) => EditorView(root, m[1]) },
    { pattern: /^#\/explorar$/, nav: 'explore', view: () => ExploreView(root) },
    { pattern: /^#\/regras$/, nav: 'rules', view: () => RulesView(root) },
    { pattern: /^#\/?$/, nav: 'decks', view: () => DecksView(root) },
  ];

  function render() {
    const hash = location.hash || '#/';
    const route = routes.find((r) => r.pattern.test(hash));
    if (!route) {
      location.replace('#/');
      return;
    }
    current?.destroy?.();
    document.getElementById('modal-root').innerHTML = '';
    document.body.classList.remove('no-scroll');
    currentHash = hash;
    current = route.view(hash.match(route.pattern));

    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.toggleAttribute('aria-current', a.dataset.nav === route.nav);
      if (a.dataset.nav === route.nav) a.setAttribute('aria-current', 'page');
    });
    window.scrollTo(0, 0);
  }

  // Pergunta antes de sair do editor com alterações pendentes.
  function askLeave() {
    return new Promise((resolve) => {
      let choice = 'stay';
      const m = UI.openModal({
        title: 'Sair sem salvar?',
        size: 'sm',
        body: '<p>Você tem alterações neste deck que ainda não foram salvas.</p>',
        footer: `
          <button type="button" class="btn btn-ghost" data-close>Continuar editando</button>
          <button type="button" class="btn btn-ghost btn-danger-text" data-choice="discard">Descartar</button>
          <button type="button" class="btn btn-primary" data-choice="save">Salvar e sair</button>`,
        onClose: () => resolve(choice),
      });
      m.foot.addEventListener('click', (e) => {
        const b = e.target.closest('[data-choice]');
        if (!b) return;
        choice = b.dataset.choice;
        m.close();
      });
    });
  }

  window.addEventListener('hashchange', async () => {
    const target = location.hash || '#/';
    if (target === currentHash) return;
    if (current?.isDirty?.()) {
      // Volta o endereço sem disparar outro hashchange e pergunta ao usuário.
      history.replaceState(null, '', currentHash);
      const choice = await askLeave();
      if (choice === 'stay') return;
      if (choice === 'save' && !(await current.save())) return;
      if (choice === 'discard') current.destroy?.(), (current = null);
      location.hash = target;
      return;
    }
    render();
  });

  render();
})();
