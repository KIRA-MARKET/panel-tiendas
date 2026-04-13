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

      // Resumen + filtro por tienda
      if (propuestas.length === 0 && sinSolucion.length === 0) {
        html += `<p style="text-align:center;padding:20px;color:#2e7d32"><strong>\u2713 Todos los m\u00ednimos cumplidos.</strong><br>No hace falta ninguna sustituci\u00f3n este mes.</p>`;
      } else {
        const nGV = propuestas.filter(p => p.tienda === 'granvia').length;
        const nIS = propuestas.filter(p => p.tienda === 'isabel').length;
        const nSinGV = sinSolucion.filter(s => s.tienda === 'granvia').length;
        const nSinIS = sinSolucion.filter(s => s.tienda === 'isabel').length;

        html += `<div style="margin-bottom:12px;padding:10px;background:#f5f5f5;border-radius:8px;font-size:12px">`;
        if (propuestas.length > 0) {
          html += `<strong>${propuestas.length}</strong> sustituciones propuestas`;
        }
        if (sinSolucion.length > 0) {
          html += (propuestas.length > 0 ? ' · ' : '') +
                  `<span style="color:#c62828"><strong>${sinSolucion.length}</strong> sin soluci\u00f3n</span>`;
        }
        html += `<div style="margin-top:8px;display:flex;gap:6px">
          <button class="btn-filtro-tienda active" data-filtro="ambas" style="padding:4px 12px;border-radius:4px;border:1px solid #ccc;background:#1a1a2e;color:#fff;cursor:pointer;font-size:11px;font-weight:700">Ambas (${propuestas.length})</button>
          <button class="btn-filtro-tienda" data-filtro="granvia" style="padding:4px 12px;border-radius:4px;border:1px solid #ccc;background:#fff;color:#1a1a2e;cursor:pointer;font-size:11px;font-weight:700">Gran V\u00eda (${nGV}${nSinGV ? '+' + nSinGV + ' sin sol.' : ''})</button>
          <button class="btn-filtro-tienda" data-filtro="isabel" style="padding:4px 12px;border-radius:4px;border:1px solid #ccc;background:#fff;color:#4a90d9;cursor:pointer;font-size:11px;font-weight:700">Isabel (${nIS}${nSinIS ? '+' + nSinIS + ' sin sol.' : ''})</button>
        </div>`;
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
            const tiendaId = p.tienda;
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

            const nAlts = (p.alternativas || []).length;
            const btnCambiar = nAlts > 0
              ? `<button class="btn-cambiar-sust" data-idx="${item.idx}" style="padding:2px 8px;border-radius:3px;border:1px solid #1565c0;background:#fff;color:#1565c0;cursor:pointer;font-size:10px;white-space:nowrap">Cambiar (${nAlts})</button>`
              : '';

            html += `
              <div class="prop-row" data-tienda="${tiendaId}" data-idx="${item.idx}" style="margin-bottom:3px">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#fff;border-radius:6px;border:1px solid #e0e0e0;font-size:11px">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <input type="checkbox" id="prop-check-${item.idx}" checked>
                    <span style="background:${tiendaColor};color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">${tiendaLabel}</span>
                    ${tagAccion}
                    <span style="color:#c62828;text-decoration:line-through">${Utils.escapeHtml(p.ausente)}</span>
                    → <strong id="prop-sust-${item.idx}" style="color:#2e7d32">${Utils.escapeHtml(p.sustituto)}</strong>
                    <span id="prop-hora-${item.idx}" style="color:#888">(${turnoLabel} · ${Utils.formatHora(p.entrada)}-${Utils.formatHora(p.salida)})</span>
                    ${detalleReorg}
                  </div>
                  <div style="display:flex;align-items:center;gap:6px">
                    ${btnCambiar}
                    ${labelExtra}
                  </div>
                </div>
                <div id="prop-alts-${item.idx}" style="display:none;padding:4px 8px 8px 28px;background:#f8f9fa;border-radius:0 0 6px 6px;border:1px solid #e0e0e0;border-top:0"></div>
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
          html += `<div class="prop-row" data-tienda="${s.tienda}" style="font-size:11px;padding:2px 0">· ${tiendaLabel} — ${Utils.DIAS[fechaObj.getDay()]} ${Utils.formatFechaES(fechaStr)}: <strong>${Utils.escapeHtml(s.emp)}</strong> (${turnoLabel})</div>`;
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

      // Filtro por tienda
      overlay.querySelectorAll('.btn-filtro-tienda').forEach(btn => {
        btn.onclick = () => {
          const filtro = btn.dataset.filtro;
          overlay.querySelectorAll('.btn-filtro-tienda').forEach(b => {
            b.style.background = '#fff';
            b.style.color = b.dataset.filtro === 'isabel' ? '#4a90d9' : '#1a1a2e';
            b.classList.remove('active');
          });
          btn.style.background = btn.dataset.filtro === 'isabel' ? '#4a90d9' : '#1a1a2e';
          btn.style.color = '#fff';
          btn.classList.add('active');

          overlay.querySelectorAll('.prop-row').forEach(row => {
            if (filtro === 'ambas') {
              row.style.display = '';
            } else {
              row.style.display = row.dataset.tienda === filtro ? '' : 'none';
            }
          });
        };
      });

      // Botones "Cambiar" — mostrar alternativas
      overlay.querySelectorAll('.btn-cambiar-sust').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx);
          const p = propuestas[idx];
          const altsDiv = overlay.querySelector('#prop-alts-' + idx);
          if (!altsDiv) return;

          // Toggle
          if (altsDiv.style.display !== 'none') {
            altsDiv.style.display = 'none';
            return;
          }

          // Construir lista de alternativas
          const alts = p.alternativas || [];
          let altHtml = '<div style="font-size:10px;color:#666;margin-bottom:4px;font-weight:700">Elige otro candidato:</div>';
          for (let a = 0; a < alts.length; a++) {
            const alt = alts[a];
            const avisosStr = alt.avisos && alt.avisos.length > 0
              ? ' <span style="color:#e65100" title="' + Utils.escapeHtml(alt.avisos.join(', ')) + '">\u26a0</span>'
              : '';
            altHtml += '<div style="display:flex;align-items:center;gap:6px;padding:3px 4px;cursor:pointer;border-radius:4px;font-size:11px" ' +
              'class="alt-option" data-prop-idx="' + idx + '" data-alt-idx="' + a + '" ' +
              'onmouseover="this.style.background=\'#e3f2fd\'" onmouseout="this.style.background=\'transparent\'">' +
              '<strong>' + Utils.escapeHtml(alt.alias) + '</strong>' +
              ' <span style="color:#888">' + Utils.formatHora(alt.entrada) + '-' + Utils.formatHora(alt.salida) + '</span>' +
              ' <span style="color:#666;font-size:9px">' + (alt.excedenteOrigen >= 99 ? 'disponible' : 'excedente:' + alt.excedenteOrigen) + '</span>' +
              (alt.preferenciaScore ? ' <span style="color:#1565c0;font-size:9px;font-weight:700" title="Preferencia aprendida">\u2605' + alt.preferenciaScore + '</span>' : '') +
              avisosStr +
              '</div>';
          }
          altsDiv.innerHTML = altHtml;
          altsDiv.style.display = 'block';

          // Click en alternativa → reemplazar
          altsDiv.querySelectorAll('.alt-option').forEach(opt => {
            opt.onclick = () => {
              const pi = parseInt(opt.dataset.propIdx);
              const ai = parseInt(opt.dataset.altIdx);
              const elegido = propuestas[pi].alternativas[ai];

              // Guardar el original como alternativa si no está ya
              const origAlias = propuestas[pi].sustituto;
              const origEntrada = propuestas[pi].entrada;
              const origSalida = propuestas[pi].salida;
              const yaEnAlts = propuestas[pi].alternativas.some(x => x.alias === origAlias);
              if (!yaEnAlts) {
                propuestas[pi].alternativas.push({
                  alias: origAlias, entrada: origEntrada, salida: origSalida,
                  excedenteOrigen: 0, avisos: [], esPropio: true
                });
              }

              // Capa 2: registrar decisión (motor sugirió X, Nacho eligió Y)
              const fechaProp = typeof propuestas[pi].fecha === 'string'
                ? propuestas[pi].fecha : Utils.formatFecha(propuestas[pi].fecha);
              Store.addDecision({
                timestamp: new Date().toISOString(),
                fecha: fechaProp,
                tienda: propuestas[pi].tienda,
                turnoFds: propuestas[pi].turnoFds || '',
                franja: propuestas[pi].franja || '',
                ausente: propuestas[pi].ausente,
                motorSugirio: origAlias,
                nachoEligio: elegido.alias,
                accion: propuestas[pi].accion || 'sustituir'
              });

              // Reemplazar propuesta
              propuestas[pi].sustituto = elegido.alias;
              propuestas[pi].entrada = elegido.entrada;
              propuestas[pi].salida = elegido.salida;
              propuestas[pi].alternativas = propuestas[pi].alternativas.filter(x => x.alias !== elegido.alias);
              propuestas[pi]._elegidoManual = true;

              // Actualizar visual
              const sustEl = overlay.querySelector('#prop-sust-' + pi);
              const horaEl = overlay.querySelector('#prop-hora-' + pi);
              const turnoLabel = propuestas[pi].turnoFds || propuestas[pi].franja;
              if (sustEl) sustEl.textContent = elegido.alias;
              if (horaEl) horaEl.textContent = '(' + turnoLabel + ' · ' + Utils.formatHora(elegido.entrada) + '-' + Utils.formatHora(elegido.salida) + ')';
              altsDiv.style.display = 'none';

              // Marcar visualmente que fue elección manual
              if (sustEl) sustEl.style.color = '#1565c0';
            };
          });
        };
      });

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => {
          Modales._cerrarOverlay(overlay);
          resolve({ aplicadas: 0 });
        };
      });

      const btnAplicar = overlay.querySelector('[data-action="aplicar"]');
      if (btnAplicar) {
        btnAplicar.onclick = () => {
          // Detectar filtro activo
          const filtroActivo = overlay.querySelector('.btn-filtro-tienda.active');
          const filtroTienda = filtroActivo ? filtroActivo.dataset.filtro : 'ambas';

          const seleccionadas = [];
          for (let i = 0; i < propuestas.length; i++) {
            // Solo aplicar propuestas de la tienda filtrada
            if (filtroTienda !== 'ambas' && propuestas[i].tienda !== filtroTienda) continue;
            const cb = overlay.querySelector('#prop-check-' + i);
            if (cb && cb.checked) {
              const cbExtra = overlay.querySelector('#prop-extra-' + i);
              const tipo = cbExtra && cbExtra.checked ? 'extra' : 'movimiento';
              seleccionadas.push(Object.assign({}, propuestas[i], { tipo }));
            }
          }
          // Capa 2: registrar aceptaciones del motor (propuestas no cambiadas)
          for (const s of seleccionadas) {
            if (!s._elegidoManual) {
              const fechaS = typeof s.fecha === 'string' ? s.fecha : Utils.formatFecha(s.fecha);
              Store.addDecision({
                timestamp: new Date().toISOString(),
                fecha: fechaS,
                tienda: s.tienda,
                turnoFds: s.turnoFds || '',
                franja: s.franja || '',
                ausente: s.ausente,
                motorSugirio: s.sustituto,
                nachoEligio: s.sustituto, // mismo = aceptó la sugerencia
                accion: s.accion || 'sustituir'
              });
            }
          }

          const count = Motor.aplicarPropuestas(seleccionadas);
          if (Sync && Sync.syncDecisiones) Sync.syncDecisiones();
          Modales._cerrarOverlay(overlay);
          CalendarioUI.toast(count + ' sustituciones aplicadas', 'success');
          resolve({ aplicadas: count });
        };
      }
    });
  },

  // ── Modal de refuerzo (horas extra) ────────────────────────

  nuevoRefuerzo() {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const tienda = Store.getTienda();
      const mes = Store.getMes();
      const año = Store.getAño();

      // Lista de empleados de ambas tiendas
      const todos = Store.getTodosEmpleados();
      let optsEmp = '';
      for (const alias in todos) {
        optsEmp += '<option value="' + Utils.escapeHtml(alias) + '">' + Utils.escapeHtml(alias) + '</option>';
      }

      // Tipo de turno
      const esFds = (d) => { const dt = new Date(d); return dt.getDay() === 0 || dt.getDay() === 6; };

      const html = `
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <h3>+ Refuerzo (horas extra)</h3>
            <button class="modal-close" data-action="cancel">\u00d7</button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
              <div>
                <label style="font-size:11px;font-weight:700">Fecha</label>
                <input type="date" id="ref-fecha" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px"
                  value="${año}-${String(mes+1).padStart(2,'0')}-01">
              </div>
              <div>
                <label style="font-size:11px;font-weight:700">Tienda</label>
                <select id="ref-tienda" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px">
                  <option value="granvia" ${tienda==='granvia'?'selected':''}>Gran V\u00eda</option>
                  <option value="isabel" ${tienda==='isabel'?'selected':''}>Isabel</option>
                </select>
              </div>
            </div>
            <div style="margin-bottom:12px">
              <label style="font-size:11px;font-weight:700">Empleado</label>
              <select id="ref-empleado" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px">
                <option value="">— Selecciona —</option>
                ${optsEmp}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
              <div>
                <label style="font-size:11px;font-weight:700">Entrada</label>
                <input type="time" id="ref-entrada" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px" value="07:00">
              </div>
              <div>
                <label style="font-size:11px;font-weight:700">Salida</label>
                <input type="time" id="ref-salida" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px" value="11:00">
              </div>
            </div>
            <div id="ref-turno-fds" style="display:none;margin-bottom:12px">
              <label style="font-size:11px;font-weight:700">Turno FdS</label>
              <select id="ref-turno" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px">
                <option value="SAB_M">S\u00e1bado Ma\u00f1ana</option>
                <option value="SAB_T">S\u00e1bado Tarde</option>
                <option value="DOM_M">Domingo Ma\u00f1ana</option>
                <option value="DOM_T">Domingo Tarde</option>
              </select>
            </div>
            <div id="ref-error" style="color:#c62828;font-size:11px;display:none"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">A\u00f1adir refuerzo</button>
          </div>
        </div>
      `;

      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      // Mostrar/ocultar turno FdS según la fecha
      const fechaInput = overlay.querySelector('#ref-fecha');
      const turnoFdsDiv = overlay.querySelector('#ref-turno-fds');
      fechaInput.addEventListener('change', () => {
        const dt = new Date(fechaInput.value + 'T12:00:00');
        const dow = dt.getDay();
        turnoFdsDiv.style.display = (dow === 0 || dow === 6) ? 'block' : 'none';
      });

      const showErr = (msg) => {
        const el = overlay.querySelector('#ref-error');
        el.textContent = msg;
        el.style.display = 'block';
      };

      overlay.querySelector('[data-action="cancel"]').onclick = () => {
        Modales._cerrarOverlay(overlay);
        resolve(null);
      };

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const fecha = fechaInput.value;
        const tiendaSel = overlay.querySelector('#ref-tienda').value;
        const empleado = overlay.querySelector('#ref-empleado').value;
        const entradaStr = overlay.querySelector('#ref-entrada').value;
        const salidaStr = overlay.querySelector('#ref-salida').value;

        if (!fecha) return showErr('Selecciona una fecha');
        if (!empleado) return showErr('Selecciona un empleado');
        if (!entradaStr || !salidaStr) return showErr('Entrada y salida obligatorias');

        const entrada = Utils.horaADecimal(entradaStr);
        const salida = Utils.horaADecimal(salidaStr);
        if (salida <= entrada) return showErr('La salida debe ser posterior a la entrada');

        const dt = new Date(fecha + 'T12:00:00');
        const dow = dt.getDay();
        const esFdsDia = (dow === 0 || dow === 6);
        const turnoFds = esFdsDia ? overlay.querySelector('#ref-turno').value : '';
        const franja = esFdsDia ? '' : Utils.getFranja(entrada, salida, tiendaSel);

        Store.addSustitucion({
          fecha,
          ausente: '',
          sustituto: empleado,
          entrada,
          salida,
          franja,
          turnoFds,
          tienda: tiendaSel,
          tipo: 'extra'
        });

        if (Sync && Sync.syncSustituciones) Sync.syncSustituciones();
        CalendarioUI.render();
        CalendarioUI.toast('Refuerzo a\u00f1adido: ' + empleado, 'success');
        Modales._cerrarOverlay(overlay);
        resolve({ empleado, fecha, entrada, salida });
      };
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
