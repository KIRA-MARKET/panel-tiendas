// ============================================================
// YOLANDA HP — modales-ui.js
// Modales propios (sin prompt/alert nativos)
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

  // ── Modal de nueva ausencia ────────────────────────────────

  nuevaAusencia(empleadoPreseleccionado = null) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const tienda = Store.getTienda();
      const empleados = Store.getEmpleadosTienda(tienda);

      let optionsEmp = '<option value="">-- Selecciona --</option>';
      for (const alias in empleados) {
        const sel = alias === empleadoPreseleccionado ? ' selected' : '';
        optionsEmp += `<option value="${Utils.escapeHtml(alias)}"${sel}>${Utils.escapeHtml(alias)} - ${Utils.escapeHtml(empleados[alias].nombre)}</option>`;
      }

      let optionsTipo = '<option value="">-- Selecciona --</option>';
      for (const t of Ausencias.TIPOS) {
        optionsTipo += `<option value="${t.value}">${t.icon} ${t.label}</option>`;
      }

      const html = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Nueva ausencia — ${tienda === 'granvia' ? 'Gran V\u00eda' : 'Isabel'}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Empleado</label>
              <select id="aus-empleado">${optionsEmp}</select>
            </div>
            <div class="form-group">
              <label>Tipo de ausencia</label>
              <select id="aus-tipo">${optionsTipo}</select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Desde</label>
                <input type="date" id="aus-desde">
              </div>
              <div class="form-group">
                <label>Hasta</label>
                <input type="date" id="aus-hasta">
              </div>
            </div>
            <div class="form-group">
              <label>Motivo (opcional)</label>
              <input type="text" id="aus-motivo" placeholder="Motivo o detalle...">
            </div>
            <div id="aus-error" style="display:none;background:#ffebee;color:#c62828;padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Crear ausencia</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const errorEl = overlay.querySelector('#aus-error');
      const showError = (msg) => {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      };
      const hideError = () => {
        errorEl.style.display = 'none';
      };

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => {
          Modales._cerrarOverlay(overlay);
          resolve(null);
        };
      });

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const empleado = overlay.querySelector('#aus-empleado').value;
        const tipo = overlay.querySelector('#aus-tipo').value;
        const desde = overlay.querySelector('#aus-desde').value;
        const hasta = overlay.querySelector('#aus-hasta').value;
        const motivo = overlay.querySelector('#aus-motivo').value;

        if (!empleado) return showError('Selecciona un empleado');
        if (!tipo) return showError('Selecciona el tipo de ausencia');
        if (!desde || !hasta) return showError('Selecciona las fechas');

        hideError();
        const result = Ausencias.crear(tienda, empleado, tipo, desde, hasta, motivo);
        if (!result.ok) return showError(result.error);

        Modales._cerrarOverlay(overlay);
        CalendarioUI.toast('Ausencia registrada para ' + empleado, 'success');

        // Preguntar si quiere asignar sustitutos
        Modales._preguntarAsignarSustitutos(tienda, result.ausencia).then(() => {
          resolve(result.ausencia);
        });
      };
    });
  },

  /** Pregunta si quiere asignar sustitutos manualmente */
  _preguntarAsignarSustitutos(tienda, ausencia) {
    return new Promise((resolve) => {
      Modales.confirmar(
        '¿Quieres asignar sustitutos ahora? El motor te propondr\u00e1 candidatos solo donde haga falta.',
        'Ausencia creada'
      ).then(quiere => {
        if (quiere) {
          // Lanzar análisis del motor
          App.calcularSustituciones();
        }
        resolve();
      });
    });
  },

  // ── Modal de propuestas del motor ──────────────────────────

  mostrarPropuestas(propuestas, sinSolucion) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();

      let html = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Propuestas de sustituci\u00f3n</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body" style="max-height:60vh">
      `;

      // Resumen
      if (propuestas.length === 0 && sinSolucion.length === 0) {
        html += `<p style="text-align:center;padding:20px;color:#2e7d32"><strong>\u2713 Todos los m\u00ednimos cumplidos.</strong><br>No hace falta ninguna sustituci\u00f3n este mes.</p>`;
      } else {
        html += `<div style="margin-bottom:12px;padding:10px;background:#f5f5f5;border-radius:8px;font-size:12px">`;
        if (propuestas.length > 0) {
          html += `<strong>${propuestas.length}</strong> sustituciones propuestas`;
        }
        if (sinSolucion.length > 0) {
          html += (propuestas.length > 0 ? ' · ' : '') +
                  `<span style="color:#c62828"><strong>${sinSolucion.length}</strong> sin soluci\u00f3n (necesitas eventual)</span>`;
        }
        html += `</div>`;
      }

      // Propuestas agrupadas por fecha
      if (propuestas.length > 0) {
        const porFecha = {};
        propuestas.forEach((p, i) => {
          const key = typeof p.fecha === 'string' ? p.fecha : Utils.formatFecha(p.fecha);
          if (!porFecha[key]) porFecha[key] = [];
          porFecha[key].push({ idx: i, prop: p });
        });

        for (const fecha in porFecha) {
          const fechaObj = Utils.parseFecha(fecha);
          html += `<div style="margin-bottom:8px"><div style="font-weight:700;font-size:12px;color:#1a1a2e;margin-bottom:4px">${Utils.DIAS[fechaObj.getDay()]} ${Utils.formatFechaES(fecha)}</div>`;

          for (const item of porFecha[fecha]) {
            const p = item.prop;
            const tiendaLabel = p.tienda === 'granvia' ? 'GV' : 'IS';
            const turnoLabel = p.turnoFds || p.franja;
            const tiendaColor = p.tienda === 'granvia' ? '#1a1a2e' : '#4a90d9';

            html += `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;margin-bottom:3px;background:#fff;border-radius:6px;border:1px solid #e0e0e0;font-size:11px">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <input type="checkbox" id="prop-check-${item.idx}" checked>
                  <span style="background:${tiendaColor};color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">${tiendaLabel}</span>
                  <span style="color:#c62828;text-decoration:line-through">${Utils.escapeHtml(p.ausente)}</span>
                  → <strong style="color:#2e7d32">${Utils.escapeHtml(p.sustituto)}</strong>
                  <span style="color:#888">(${turnoLabel} · ${Utils.formatHora(p.entrada)}-${Utils.formatHora(p.salida)})</span>
                </div>
                <label style="display:flex;align-items:center;gap:4px;font-size:10px;color:#e65100;cursor:pointer;white-space:nowrap" title="Marcar si el sustituto hace estas horas como extra (no las tenía en su turno habitual)">
                  <input type="checkbox" id="prop-extra-${item.idx}">
                  Hora extra
                </label>
              </div>
            `;
          }
          html += `</div>`;
        }
      }

      // Sin solución
      if (sinSolucion.length > 0) {
        html += `<div style="margin-top:12px;padding:10px;background:#ffebee;border-radius:8px">`;
        html += `<div style="font-weight:700;font-size:12px;color:#c62828;margin-bottom:6px">\u26a0 Sin sustituto disponible — necesitas contratar eventual</div>`;
        for (const s of sinSolucion) {
          const fechaStr = typeof s.fecha === 'string' ? s.fecha : Utils.formatFecha(s.fecha);
          const fechaObj = Utils.parseFecha(fechaStr);
          const tiendaLabel = s.tienda === 'granvia' ? 'GV' : 'IS';
          const turnoLabel = s.turnoFds || s.franja;
          html += `<div style="font-size:11px;padding:2px 0">· ${tiendaLabel} — ${Utils.DIAS[fechaObj.getDay()]} ${Utils.formatFechaES(fechaStr)}: <strong>${Utils.escapeHtml(s.emp)}</strong> (${turnoLabel})</div>`;
        }
        html += `</div>`;
      }

      html += `
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cerrar</button>
      `;
      if (propuestas.length > 0) {
        html += `<button class="btn btn-success" data-action="aplicar">Aplicar seleccionadas</button>`;
      }
      html += `
          </div>
        </div>
      `;

      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => {
          Modales._cerrarOverlay(overlay);
          resolve({ aplicadas: 0 });
        };
      });

      const btnAplicar = overlay.querySelector('[data-action="aplicar"]');
      if (btnAplicar) {
        btnAplicar.onclick = () => {
          const seleccionadas = [];
          for (let i = 0; i < propuestas.length; i++) {
            const cb = overlay.querySelector('#prop-check-' + i);
            if (cb && cb.checked) {
              const cbExtra = overlay.querySelector('#prop-extra-' + i);
              const tipo = cbExtra && cbExtra.checked ? 'extra' : 'movimiento';
              seleccionadas.push(Object.assign({}, propuestas[i], { tipo }));
            }
          }
          const count = Motor.aplicarPropuestas(seleccionadas);
          Modales._cerrarOverlay(overlay);
          CalendarioUI.toast(count + ' sustituciones aplicadas', 'success');
          resolve({ aplicadas: count });
        };
      }
    });
  },

  // ── Helpers internos ───────────────────────────────────────

  _crearOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    return overlay;
  },

  _cerrarOverlay(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 200);
  }
};
