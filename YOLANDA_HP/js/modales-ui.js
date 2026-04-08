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

            const esReorg = p.accion === 'reorganizar';
            const tagAccion = esReorg
              ? `<span style="background:#5c6bc0;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">REORGANIZAR</span>`
              : `<span style="background:#2e7d32;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">SUSTITUIR</span>`;
            const detalleReorg = esReorg
              ? ` <span style="color:#5c6bc0">(antes ${Utils.formatHora(p.entradaOriginal)}-${Utils.formatHora(p.salidaOriginal)})</span>`
              : '';
            const labelExtra = esReorg
              ? ''  // reorganizar nunca añade horas extra (mantiene total)
              : `<label style="display:flex;align-items:center;gap:4px;font-size:10px;color:#e65100;cursor:pointer;white-space:nowrap" title="Marcar si el sustituto hace estas horas como extra (no las tenía en su turno habitual)">
                   <input type="checkbox" id="prop-extra-${item.idx}">
                   Hora extra
                 </label>`;

            html += `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;margin-bottom:3px;background:#fff;border-radius:6px;border:1px solid #e0e0e0;font-size:11px">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <input type="checkbox" id="prop-check-${item.idx}" checked>
                  <span style="background:${tiendaColor};color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">${tiendaLabel}</span>
                  ${tagAccion}
                  <span style="color:#c62828;text-decoration:line-through">${Utils.escapeHtml(p.ausente)}</span>
                  → <strong style="color:#2e7d32">${Utils.escapeHtml(p.sustituto)}</strong>
                  <span style="color:#888">(${turnoLabel} · ${Utils.formatHora(p.entrada)}-${Utils.formatHora(p.salida)})</span>
                  ${detalleReorg}
                </div>
                ${labelExtra}
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

  // ── Menú de acciones por empleado (click en nombre) ────────

  accionesEmpleado(alias, fecha, tienda, ctx) {
    // ctx = { entrada, salida, turnoFds }
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const fechaES = Utils.formatFechaES ? Utils.formatFechaES(fecha) : fecha;
      const tiendaTxt = tienda === 'granvia' ? 'Gran Vía' : 'Isabel';
      const horario = (typeof ctx.entrada === 'number' && typeof ctx.salida === 'number')
        ? Utils.formatHora(ctx.entrada) + '–' + Utils.formatHora(ctx.salida) : '';

      const html = `
        <div class="modal" style="max-width:380px">
          <div class="modal-header">
            <h3>${Utils.escapeHtml(alias)}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <p class="sub" style="margin-bottom:14px;font-size:12px">${Utils.escapeHtml(fechaES)} · ${Utils.escapeHtml(tiendaTxt)}${horario ? ' · ' + horario : ''}${ctx.turnoFds ? ' · ' + ctx.turnoFds : ''}</p>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-secondary" data-action="modificar" style="justify-content:flex-start;padding:12px 14px">✎ Modificar horario hoy</button>
              <button class="btn btn-secondary" data-action="ausencia" style="justify-content:flex-start;padding:12px 14px">📅 Registrar ausencia</button>
              <button class="btn btn-secondary" data-action="ficha" style="justify-content:flex-start;padding:12px 14px">👤 Ficha del empleado</button>
            </div>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const close = (val) => { Modales._cerrarOverlay(overlay); resolve(val); };
      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => b.onclick = () => close(null));
      overlay.onclick = (e) => { if (e.target === overlay) close(null); };

      overlay.querySelector('[data-action="modificar"]').onclick = () => {
        close('modificar');
        Modales.modificarHorario(alias, fecha, tienda, ctx).then(() => CalendarioUI.render());
      };
      overlay.querySelector('[data-action="ausencia"]').onclick = () => {
        close('ausencia');
        Modales.nuevaAusencia(alias).then(() => CalendarioUI.render());
      };
      overlay.querySelector('[data-action="ficha"]').onclick = () => {
        close('ficha');
        Modales.editarEmpleado(alias, tienda).then(() => CalendarioUI.render());
      };
    });
  },

  // ── Modal: modificar horario puntual de un día ─────────────

  modificarHorario(alias, fecha, tienda, ctx) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const eIni = (typeof ctx.entrada === 'number') ? ctx.entrada : '';
      const sIni = (typeof ctx.salida === 'number') ? ctx.salida : '';
      const horasBase = (typeof ctx.entrada === 'number' && typeof ctx.salida === 'number')
        ? (ctx.salida - ctx.entrada).toFixed(2) : '?';

      const html = `
        <div class="modal" style="max-width:460px">
          <div class="modal-header">
            <h3>Modificar horario — ${Utils.escapeHtml(alias)}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <p class="sub" style="font-size:12px;margin-bottom:12px">${Utils.escapeHtml(Utils.formatFechaES ? Utils.formatFechaES(fecha) : fecha)} · ${tienda === 'granvia' ? 'Gran Vía' : 'Isabel'}${ctx.turnoFds ? ' · ' + ctx.turnoFds : ''}</p>
            <p style="font-size:12px;margin-bottom:12px">Horario base: <strong>${horasBase} h</strong> (${eIni !== '' ? Utils.formatHora(eIni) : '—'}–${sIni !== '' ? Utils.formatHora(sIni) : '—'})</p>
            <div class="form-row">
              <div class="form-group">
                <label>Nueva entrada (h)</label>
                <input type="number" step="0.25" id="mod-entrada" value="${eIni}">
              </div>
              <div class="form-group">
                <label>Nueva salida (h)</label>
                <input type="number" step="0.25" id="mod-salida" value="${sIni}">
              </div>
            </div>
            <p id="mod-resumen" class="sub" style="font-size:11px;margin-bottom:10px"></p>
            <div class="form-group">
              <label>Motivo (opcional)</label>
              <input type="text" id="mod-motivo" placeholder="Motivo del cambio...">
            </div>
            <div id="mod-error" style="display:none;background:#ffebee;color:#c62828;padding:10px;border-radius:4px;font-size:12px"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger" data-action="quitar" style="margin-right:auto">Quitar modificación</button>
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Guardar</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const errEl = overlay.querySelector('#mod-error');
      const showErr = (m) => { errEl.textContent = m; errEl.style.display = 'block'; };
      const resumenEl = overlay.querySelector('#mod-resumen');
      const refrescar = () => {
        const e = parseFloat(overlay.querySelector('#mod-entrada').value);
        const s = parseFloat(overlay.querySelector('#mod-salida').value);
        if (isNaN(e) || isNaN(s) || s <= e) { resumenEl.textContent = ''; return; }
        const nuevas = (s - e).toFixed(2);
        const base = parseFloat(horasBase);
        let extra = '';
        if (!isNaN(base)) {
          const diff = (s - e) - base;
          if (Math.abs(diff) < 0.01) extra = ' · sin horas extra';
          else if (diff > 0) extra = ' · +' + diff.toFixed(2) + 'h EXTRA';
          else extra = ' · ' + diff.toFixed(2) + 'h menos';
        }
        resumenEl.textContent = 'Nuevo total: ' + nuevas + ' h' + extra;
      };
      overlay.querySelector('#mod-entrada').oninput = refrescar;
      overlay.querySelector('#mod-salida').oninput = refrescar;
      refrescar();

      const close = (val) => { Modales._cerrarOverlay(overlay); resolve(val); };
      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => b.onclick = () => close(null));

      overlay.querySelector('[data-action="quitar"]').onclick = () => {
        Store.removeModificacion(alias, Utils.formatFecha(typeof fecha === 'string' ? Utils.parseFecha(fecha) : fecha), tienda, ctx.turnoFds || '');
        if (Sync && Sync.syncModificaciones) Sync.syncModificaciones();
        CalendarioUI.toast && CalendarioUI.toast('Modificación eliminada', 'success');
        close('quitada');
      };

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const e = parseFloat(overlay.querySelector('#mod-entrada').value);
        const s = parseFloat(overlay.querySelector('#mod-salida').value);
        const motivo = overlay.querySelector('#mod-motivo').value.trim();
        if (isNaN(e) || isNaN(s)) return showErr('Entrada y salida son obligatorias');
        if (s <= e) return showErr('La salida debe ser posterior a la entrada');
        if (e < 0 || s > 24) return showErr('Horas fuera de rango (0–24)');

        const fechaStr = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
        Store.addModificacion({
          tienda,
          empleado: alias,
          fecha: fechaStr,
          turnoFds: ctx.turnoFds || '',
          entradaOriginal: ctx.entrada,
          salidaOriginal: ctx.salida,
          nuevaEntrada: e,
          nuevaSalida: s,
          motivo
        });
        if (Sync && Sync.syncModificaciones) Sync.syncModificaciones();
        CalendarioUI.toast && CalendarioUI.toast('Horario modificado para ' + alias, 'success');
        close('guardada');
      };
    });
  },

  // ── Modal de edición de empleado ───────────────────────────

  editarEmpleado(alias, tienda) {
    return new Promise((resolve) => {
      const emp = Store.getEmpleado(alias, tienda);
      if (!emp) { resolve(null); return; }

      const overlay = Modales._crearOverlay();
      const e = (v) => Utils.escapeHtml(v == null ? '' : String(v));

      const franjas = ['descarga', 'mañanas', 'tardes', 'cierre', 'rotativo'];
      const tiendas = [['granvia', 'Solo Gran Vía'], ['isabel', 'Solo Isabel'], ['ambas', 'Ambas']];

      let optFranjas = '';
      for (const f of franjas) optFranjas += `<option value="${f}"${emp.franja === f ? ' selected' : ''}>${f}</option>`;
      let optTiendas = '';
      for (const t of tiendas) optTiendas += `<option value="${t[0]}"${emp.tienda === t[0] ? ' selected' : ''}>${t[1]}</option>`;

      const html = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Editar empleado — ${e(alias)}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group"><label>Alias</label><input type="text" id="emp-alias" value="${e(emp.alias)}"></div>
              <div class="form-group"><label>Color</label><input type="color" id="emp-color" value="${e(emp.color || '#333333')}" style="height:36px"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Nombre</label><input type="text" id="emp-nombre" value="${e(emp.nombre)}"></div>
              <div class="form-group"><label>Apellidos</label><input type="text" id="emp-apellidos" value="${e(emp.apellidos)}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Contrato (h/sem)</label><input type="number" step="0.5" id="emp-contrato" value="${e(emp.contrato || 0)}"></div>
              <div class="form-group"><label>Franja</label><select id="emp-franja">${optFranjas}</select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Tienda(s)</label><select id="emp-tienda">${optTiendas}</select></div>
              <div class="form-group"><label>Restricción</label><input type="text" id="emp-restriccion" value="${e(emp.restriccion)}" placeholder="ej: solo-mañanas"></div>
            </div>
            <div class="form-group">
              <label>Teléfono</label><input type="text" id="emp-telefono" value="${e(emp.telefono)}">
            </div>

            <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:12px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <strong style="font-size:13px">🔒 Datos sensibles</strong>
                <button type="button" class="btn btn-secondary" id="emp-unlock-btn" style="padding:4px 12px;font-size:11px">Desbloquear edición</button>
              </div>
              <div class="form-row">
                <div class="form-group"><label>DNI</label><input type="text" id="emp-dni" value="${e(emp.dni)}" disabled></div>
                <div class="form-group"><label>Email</label><input type="email" id="emp-email" value="${e(emp.email)}" disabled></div>
              </div>
              <div class="form-group">
                <label>Fecha de alta</label><input type="date" id="emp-fechaAlta" value="${e(emp.fechaAlta)}" disabled>
              </div>
              <p id="emp-unlock-status" class="sub" style="margin-top:6px;font-size:11px">Bloqueado. Pulsa "Desbloquear edición" para modificar estos campos.</p>
            </div>

            <div id="emp-error" style="display:none;background:#ffebee;color:#c62828;padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Guardar cambios</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const errEl = overlay.querySelector('#emp-error');
      const showErr = (m) => { errEl.textContent = m; errEl.style.display = 'block'; };

      // Desbloqueo de campos sensibles (segunda confirmación)
      const sensitiveIds = ['emp-dni', 'emp-email', 'emp-fechaAlta'];
      let desbloqueado = false;
      overlay.querySelector('#emp-unlock-btn').onclick = () => {
        if (desbloqueado) return;
        Modales.confirmar(
          'Vas a habilitar la edición de DNI, email y fecha de alta. Estos campos son sensibles (LOPD). ¿Continuar?',
          'Desbloquear datos sensibles'
        ).then(ok => {
          if (!ok) return;
          desbloqueado = true;
          for (const id of sensitiveIds) overlay.querySelector('#' + id).disabled = false;
          overlay.querySelector('#emp-unlock-btn').textContent = '✓ Desbloqueado';
          overlay.querySelector('#emp-unlock-btn').classList.remove('btn-secondary');
          overlay.querySelector('#emp-unlock-btn').classList.add('btn-success');
          overlay.querySelector('#emp-unlock-status').textContent = 'Edición habilitada. Ten cuidado al modificar.';
        });
      };

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => { Modales._cerrarOverlay(overlay); resolve(null); };
      });

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const v = (id) => overlay.querySelector('#' + id).value;
        const nuevoAlias = v('emp-alias').trim();
        if (!nuevoAlias) return showErr('El alias no puede estar vacío');
        const contrato = parseFloat(v('emp-contrato')) || 0;
        if (contrato < 0 || contrato > 60) return showErr('Contrato fuera de rango (0–60 h/sem)');

        const actualizado = Object.assign({}, emp, {
          alias: nuevoAlias,
          nombre: v('emp-nombre').trim(),
          apellidos: v('emp-apellidos').trim(),
          contrato,
          franja: v('emp-franja'),
          tienda: v('emp-tienda'),
          restriccion: v('emp-restriccion').trim(),
          telefono: v('emp-telefono').trim(),
          color: v('emp-color')
        });
        if (desbloqueado) {
          actualizado.dni = v('emp-dni').trim();
          actualizado.email = v('emp-email').trim();
          actualizado.fechaAlta = v('emp-fechaAlta');
        }

        // Aplicar al store (puede haber cambio de alias)
        const empsKey = tienda === 'granvia' ? 'empleadosGV' : 'empleadosIS';
        const emps = Object.assign({}, Store.get(empsKey));
        if (nuevoAlias !== alias) delete emps[alias];
        emps[nuevoAlias] = actualizado;
        Store.set(empsKey, emps);
        if (Sync && Sync.syncEmpleados) Sync.syncEmpleados();

        Modales._cerrarOverlay(overlay);
        resolve(actualizado);
      };
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
