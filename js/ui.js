// Utilitários de interface: escape, chips de tipo, toasts, modais e confirmações.
const UI = (() => {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TYPE_COLORS = {
    Planta: '#4f9a3a', Fogo: '#e0592a', 'Água': '#2f8fd8', 'Elétrico': '#e8b416',
    'Psíquico': '#9152c4', Lutador: '#b0582f', Sombrio: '#3a4150', Metal: '#7f909c',
    Fada: '#df7fbb', 'Dragão': '#a88a1e', Incolor: '#a9a396',
  };
  const typeColor = (t) => TYPE_COLORS[t] || '#8a8a8a';

  const typeChip = (t) => `<span class="type-chip" style="--tc:${typeColor(t)}">${esc(t)}</span>`;
  const energyDot = (t) => `<span class="energy-dot" style="--tc:${typeColor(t)}" title="${esc(t)}" role="img" aria-label="${esc(t)}"></span>`;

  const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const formatDate = (ms) => dateFmt.format(new Date(ms));

  // ---------- Toasts (feedback rápido, não bloqueante) ----------
  const TOAST_ICONS = { info: Icons.info, success: Icons.check, warn: Icons.alert, error: Icons.alert };

  function toast(message, { type = 'info', action, timeout = 4000 } = {}) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', type === 'error' || type === 'warn' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type]}</span><span class="toast-msg">${esc(message)}</span>`;

    let timer;
    const close = () => {
      clearTimeout(timer);
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    };

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => { action.onClick(); close(); });
      el.append(btn);
    }
    const x = document.createElement('button');
    x.className = 'toast-close';
    x.type = 'button';
    x.setAttribute('aria-label', 'Fechar aviso');
    x.innerHTML = Icons.x;
    x.addEventListener('click', close);
    el.append(x);

    root.append(el);
    // Mantém no máximo 4 avisos visíveis.
    while (root.children.length > 4) root.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('show'));
    timer = setTimeout(close, timeout);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => { timer = setTimeout(close, 2000); });
    return close;
  }

  // ---------- Modais ----------
  let modalSeq = 0;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openModal({ title, body = '', footer = '', size = '', onClose } = {}) {
    const id = `modal-${++modalSeq}`;
    const prevFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${size ? `modal-${size}` : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <header class="modal-head">
          <h2 id="${id}-title">${esc(title)}</h2>
          <button type="button" class="icon-btn" data-close aria-label="Fechar">${Icons.x}</button>
        </header>
        <div class="modal-body"></div>
        <footer class="modal-foot"></footer>
      </div>`;
    const modal = overlay.querySelector('.modal');
    const bodyEl = overlay.querySelector('.modal-body');
    const footEl = overlay.querySelector('.modal-foot');
    typeof body === 'string' ? (bodyEl.innerHTML = body) : bodyEl.append(body);
    typeof footer === 'string' ? (footEl.innerHTML = footer) : footEl.append(footer);
    if (!footer) footEl.hidden = true;

    let closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 180);
      if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('no-scroll');
      prevFocus?.focus?.();
      onClose?.(result);
    }

    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const items = [...modal.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    document.getElementById('modal-root').append(overlay);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => overlay.classList.add('show'));
    const autofocus = modal.querySelector('[autofocus]') || modal.querySelector('.modal-foot .btn-primary, .modal-foot .btn-danger') || modal.querySelector('[data-close]');
    setTimeout(() => autofocus?.focus(), 30);

    return { el: modal, body: bodyEl, foot: footEl, close };
  }

  // Confirmação explícita para ações destrutivas ou com consequências.
  function confirm({ title, message, details = [], confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
    return new Promise((resolve) => {
      const list = details.length ? `<ul class="confirm-list">${details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '';
      const m = openModal({
        title,
        size: 'sm',
        body: `<p>${esc(message)}</p>${list}`,
        footer: `
          <button type="button" class="btn btn-ghost" data-close>${esc(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button>`,
        onClose: (result) => resolve(result === true),
      });
      m.foot.querySelector('[data-ok]').addEventListener('click', () => m.close(true));
    });
  }

  // Pede um texto (ex.: nome do deck) com validação inline.
  function prompt({ title, label, value = '', placeholder = '', confirmLabel = 'Salvar', maxLength = 40, hint = '' }) {
    return new Promise((resolve) => {
      const form = document.createElement('form');
      form.className = 'form';
      form.noValidate = true;
      form.innerHTML = `
        <label class="field field-block">
          <span>${esc(label)}</span>
          <input name="value" type="text" maxlength="${maxLength}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" autofocus aria-describedby="prompt-help">
        </label>
        <div class="field-help" id="prompt-help"><span class="field-error" aria-live="polite"></span><span class="char-count"></span></div>
        ${hint ? `<p class="muted small">${esc(hint)}</p>` : ''}`;
      const input = form.querySelector('input');
      const counter = form.querySelector('.char-count');
      const error = form.querySelector('.field-error');
      const updateCount = () => (counter.textContent = `${input.value.length}/${maxLength}`);
      updateCount();
      input.addEventListener('input', () => { updateCount(); error.textContent = ''; input.removeAttribute('aria-invalid'); });

      let result = null;
      const m = openModal({
        title,
        size: 'sm',
        body: form,
        footer: `
          <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
          <button type="button" class="btn btn-primary" data-ok>${esc(confirmLabel)}</button>`,
        onClose: () => resolve(result),
      });
      function submit(e) {
        e?.preventDefault();
        const v = input.value.trim();
        if (!v) {
          error.textContent = 'Dê um nome ao deck para continuar.';
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        result = v;
        m.close();
      }
      form.addEventListener('submit', submit);
      m.foot.querySelector('[data-ok]').addEventListener('click', submit);
      setTimeout(() => input.select(), 40);
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return { esc, typeColor, typeChip, energyDot, formatDate, toast, openModal, confirm, prompt, copyText };
})();
