// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-base.js
// Núcleo del namespace Modales. Debe cargarse ANTES de los
// demás modales-*.js, que añaden sus métodos vía Object.assign.
// Contiene: abrir/cerrar, confirmar, input, aviso + helpers de
// overlay y drag.
// ============================================================

'use strict';

const Modales = {

  // ── Abrir/cerrar modal ─────────────────────────────────────

  abrir(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  },

  cerrar(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  },

  cerrarTodos() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  },

  // ── Modal de confirmación (reemplaza confirm()) ────────────

  confirmar(mensaje, titulo = 'Confirmar') {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const html = `
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <h3>${Utils.escapeHtml(titulo)}</h3>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;line-height:1.5">${Utils.escapeHtml(mensaje)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Aceptar</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      overlay.querySelector('[data-action="cancel"]').onclick = () => {
        Modales._cerrarOverlay(overlay);
        resolve(false);
      };
      overlay.querySelector('[data-action="ok"]').onclick = () => {
        Modales._cerrarOverlay(overlay);
        resolve(true);
      };
    });
  },

  // ── Modal de input (reemplaza prompt()) ────────────────────

  input(mensaje, valorInicial = '', titulo = 'Introduce un valor') {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const html = `
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <h3>${Utils.escapeHtml(titulo)}</h3>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;margin-bottom:10px">${Utils.escapeHtml(mensaje)}</p>
            <input type="text" id="modal-input-field" value="${Utils.escapeHtml(valorInicial)}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:4px;font-size:13px">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Aceptar</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const input = overlay.querySelector('#modal-input-field');
      setTimeout(() => input.focus(), 100);

      const aceptar = () => {
        const v = input.value;
        Modales._cerrarOverlay(overlay);
        resolve(v);
      };

      input.onkeydown = (e) => {
        if (e.key === 'Enter') aceptar();
      };

      overlay.querySelector('[data-action="cancel"]').onclick = () => {
        Modales._cerrarOverlay(overlay);
        resolve(null);
      };
      overlay.querySelector('[data-action="ok"]').onclick = aceptar;
    });
  },

  // ── Modal de aviso (reemplaza alert()) ─────────────────────

  aviso(mensaje, titulo = 'Aviso') {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const html = `
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <h3>${Utils.escapeHtml(titulo)}</h3>
          </div>
          <div class="modal-body">
            <p style="font-size:13px;line-height:1.5">${Utils.escapeHtml(mensaje)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-success" data-action="ok">Aceptar</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        Modales._cerrarOverlay(overlay);
        resolve();
      };
    });
  },

  // ── Helpers internos ───────────────────────────────────────

  _crearOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // Activar drag después de que el modal se inserte en el DOM
    const origAppend = overlay.appendChild.bind(overlay);
    // Cuando se haga overlay.innerHTML = ... necesitamos un observer
    const observer = new MutationObserver(() => {
      if (overlay.querySelector('.modal-header')) {
        Modales._hacerDraggable(overlay);
        observer.disconnect();
      }
    });
    observer.observe(overlay, { childList: true, subtree: true });
    return overlay;
  },

  _cerrarOverlay(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 200);
  },

  /** Hace que un modal sea arrastrable por su header */
  _hacerDraggable(overlay) {
    const modal = overlay.querySelector('.modal');
    const header = overlay.querySelector('.modal-header');
    if (!modal || !header) return;

    header.style.cursor = 'grab';
    let dragging = false, startX, startY, origX, origY;

    // Posicionar el modal en absolute para poder moverlo
    const initDrag = () => {
      if (modal.style.position === 'absolute') return;
      const rect = modal.getBoundingClientRect();
      modal.style.position = 'absolute';
      modal.style.left = rect.left + 'px';
      modal.style.top = rect.top + 'px';
      modal.style.margin = '0';
      modal.style.transform = 'none';
    };

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return; // no drag desde botón X
      initDrag();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = parseInt(modal.style.left) || 0;
      origY = parseInt(modal.style.top) || 0;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      modal.style.left = (origX + e.clientX - startX) + 'px';
      modal.style.top = (origY + e.clientY - startY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        header.style.cursor = 'grab';
      }
    });
  }
};
