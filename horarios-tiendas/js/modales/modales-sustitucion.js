// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-sustitucion.js
// Wizard del motor de sustituciones, asignación manual de
// sustituto y modificación puntual de horario de un día.
// Requiere modales-base.js cargado antes.
// ============================================================

'use strict';

Object.assign(Modales, {

  // ── Modal de propuestas del motor ──────────────────────────

  mostrarPropuestas(propuestas, sinSolucion) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();

      let html = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Propuestas de sustitución</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body" style="max-height:60vh">
      `;

      // Resumen + filtro por tienda
      if (propuestas.length === 0 && sinSolucion.length === 0) {
        html += `<p style="text-align:center;padding:20px;color:#2e7d32"><strong>✓ Todos los mínimos cumplidos.</strong><br>No hace falta ninguna sustitución este mes.</p>`;
      } else {
        const nGV = propuestas.filter(p => p.tienda === 'granvia').length;
        const nIS = propuestas.filter(p => p.tienda === 'isabel').length;
        const nSinGV = sinSolucion.filter(s => s.tienda === 'granvia').length;
        const nSinIS = sinSolucion.filter(s => s.tienda === 'isabel').length;

        html += `<div style="margin-bottom:12px;padding:10px;background:var(--border-light);border-radius:8px;font-size:12px">`;
        if (propuestas.length > 0) {
          html += `<strong>${propuestas.length}</strong> sustituciones propuestas`;
        }
        if (sinSolucion.length > 0) {
          html += (propuestas.length > 0 ? ' · ' : '') +
                  `<span style="color:#c62828"><strong>${sinSolucion.length}</strong> sin solución</span>`;
        }
        html += `<div style="margin-top:8px;display:flex;gap:6px">
          <button class="btn-filtro-tienda active" data-filtro="ambas" style="padding:4px 12px;border-radius:4px;border:1px solid var(--border);background:var(--text);color:var(--surface);cursor:pointer;font-size:11px;font-weight:700">Ambas (${propuestas.length})</button>
          <button class="btn-filtro-tienda" data-filtro="granvia" style="padding:4px 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;font-size:11px;font-weight:700">Gran Vía (${nGV}${nSinGV ? '+' + nSinGV + ' sin sol.' : ''})</button>
          <button class="btn-filtro-tienda" data-filtro="isabel" style="padding:4px 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--badge-is-fg);cursor:pointer;font-size:11px;font-weight:700">Isabel (${nIS}${nSinIS ? '+' + nSinIS + ' sin sol.' : ''})</button>
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
          html += `<div style="margin-bottom:8px"><div style="font-weight:700;font-size:12px;color:var(--text);margin-bottom:4px">${Utils.DIAS[fechaObj.getDay()]} ${Utils.formatFechaES(fecha)}</div>`;

          for (const item of porFecha[fecha]) {
            const p = item.prop;
            const tiendaId = p.tienda;
            const tiendaLabel = p.tienda === 'granvia' ? 'GV' : 'IS';
            const turnoLabel = p.turnoFds || p.franja;
            const tiendaColor = p.tienda === 'granvia' ? 'var(--badge-gv-fg)' : 'var(--badge-is-fg)';

            const esReorg = p.accion === 'reorganizar';
            const tagAccion = esReorg
              ? `<span style="background:#5c6bc0;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">REORGANIZAR</span>`
              : (p.opcional
                ? `<span style="background:#42a5f5;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px" title="Mínimos cumplidos; propuesta para equilibrar el fin de semana">OPCIONAL</span>`
                : `<span style="background:#2e7d32;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">SUSTITUIR</span>`);
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
              ? `<button class="btn-cambiar-sust" data-idx="${item.idx}" style="padding:2px 8px;border-radius:3px;border:1px solid var(--badge-gv-fg);background:var(--badge-gv-bg);color:var(--badge-gv-fg);cursor:pointer;font-size:10px;white-space:nowrap">Cambiar (${nAlts})</button>`
              : '';

            html += `
              <div class="prop-row" data-tienda="${tiendaId}" data-idx="${item.idx}" style="margin-bottom:3px">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:var(--surface);border-radius:6px;border:1px solid var(--border);font-size:11px">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <input type="checkbox" id="prop-check-${item.idx}" checked>
                    <span style="background:${tiendaColor};color:#fff;padding:1px 5px;border-radius:3px;font-size:9px">${tiendaLabel}</span>
                    ${tagAccion}
                    <span style="color:#c62828;text-decoration:line-through">${Utils.escapeHtml(p.ausente)}</span>
                    → <strong id="prop-sust-${item.idx}" style="color:#2e7d32">${Utils.escapeHtml(p.sustituto)}</strong>
                    <span id="prop-hora-${item.idx}" style="color:var(--text-muted)">(${turnoLabel} · ${Utils.formatHora(p.entrada)}-${Utils.formatHora(p.salida)})</span>
                    ${detalleReorg}
                  </div>
                  <div style="display:flex;align-items:center;gap:6px">
                    ${btnCambiar}
                    ${labelExtra}
                  </div>
                </div>
                <div id="prop-alts-${item.idx}" style="display:none;padding:4px 8px 8px 28px;background:var(--border-light);border-radius:0 0 6px 6px;border:1px solid var(--border);border-top:0"></div>
              </div>
            `;
          }
          html += `</div>`;
        }
      }

      // Sin solución
      if (sinSolucion.length > 0) {
        html += `<div style="margin-top:12px;padding:10px;background:var(--err-light);border-radius:8px">`;
        html += `<div style="font-weight:700;font-size:12px;color:#c62828;margin-bottom:6px">⚠ Sin sustituto disponible — necesitas contratar eventual</div>`;
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
          const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff';
          const text = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#222';
          const isabelFg = getComputedStyle(document.documentElement).getPropertyValue('--badge-is-fg').trim() || '#6a1b9a';
          overlay.querySelectorAll('.btn-filtro-tienda').forEach(b => {
            b.style.background = surface;
            b.style.color = b.dataset.filtro === 'isabel' ? isabelFg : text;
            b.classList.remove('active');
          });
          btn.style.background = btn.dataset.filtro === 'isabel' ? isabelFg : text;
          btn.style.color = surface;
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
          let altHtml = '<div style="font-size:10px;color:var(--text-secondary);margin-bottom:4px;font-weight:700">Elige otro candidato:</div>';
          for (let a = 0; a < alts.length; a++) {
            const alt = alts[a];
            const avisosStr = alt.avisos && alt.avisos.length > 0
              ? ' <span style="color:#e65100" title="' + Utils.escapeHtml(alt.avisos.join(', ')) + '">⚠</span>'
              : '';
            altHtml += '<div style="display:flex;align-items:center;gap:6px;padding:3px 4px;cursor:pointer;border-radius:4px;font-size:11px" ' +
              'class="alt-option" data-prop-idx="' + idx + '" data-alt-idx="' + a + '" ' +
              'onmouseover="this.style.background=\'#e3f2fd\'" onmouseout="this.style.background=\'transparent\'">' +
              '<strong>' + Utils.escapeHtml(alt.alias) + '</strong>' +
              ' <span style="color:var(--text-muted)">' + Utils.formatHora(alt.entrada) + '-' + Utils.formatHora(alt.salida) + '</span>' +
              ' <span style="color:var(--text-secondary);font-size:9px">' + (alt.excedenteOrigen >= 99 ? 'disponible' : 'excedente:' + alt.excedenteOrigen) + '</span>' +
              (alt.preferenciaScore ? ' <span style="color:#1565c0;font-size:9px;font-weight:700" title="Preferencia aprendida">★' + alt.preferenciaScore + '</span>' : '') +
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

  // ── Modal: elegir sustituto manual para un ausente ─────────

  /**
   * Muestra candidatos válidos del Motor y permite elegir sustituto
   * para un empleado ausente. Si ya tiene sub, ofrece cambiarlo o quitarlo.
   */
  elegirSustitutoManual(ausente, fecha, tienda, ctx) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const fechaES = Utils.formatFechaES ? Utils.formatFechaES(fecha) : fecha;
      const tiendaTxt = tienda === 'granvia' ? 'Gran Vía' : 'Isabel';
      const turnoLabel = ctx.turnoFds ? ctx.turnoFds : 'L-V';

      // Candidatos vía motor (aplica las 33 reglas). Usamos la variante
      // debug para poder mostrar también los rechazados con el motivo.
      const fechaDate = fecha instanceof Date ? fecha : Utils.parseFecha(fecha);
      const debug = Motor.buscarCandidatosManualDebug(
        fechaDate, ausente, tienda, ctx.turnoFds || ''
      );
      const candidatos = debug.validos;

      // Horario del slot del ausente (lo usamos para asignar a un rechazado
      // como "extra" — cubre exactamente el hueco del ausente).
      let slotEntrada = null, slotSalida = null;
      if (ctx.turnoFds) {
        const fdsData = Rotaciones.getFds(fechaDate, tienda);
        const t = fdsData && fdsData[ctx.turnoFds] && fdsData[ctx.turnoFds][ausente];
        if (t) { slotEntrada = t[0]; slotSalida = t[1]; }
      } else {
        const horarios = Rotaciones.getHorariosLV(fechaDate, tienda);
        const t = horarios && horarios[ausente];
        if (t) { slotEntrada = t[0]; slotSalida = t[1]; }
      }

      // Rechazados: quitar al propio ausente, los que ya son válidos,
      // los baja/reemplazados (no son empleados activos) y los que están
      // ausentes ese día (no se les puede pedir horas extra estando de baja).
      const rechazados = debug.rechazados.filter(r => {
        if (r.alias === ausente) return false;
        if (candidatos.some(c => c.alias === r.alias)) return false;
        const mot = (r.errores && r.errores[0]) || '';
        if (mot.indexOf('dado de baja') >= 0) return false;
        if (mot.indexOf('Reemplazado') >= 0) return false;
        if (mot.indexOf('ausente') >= 0) return false;  // 'También está ausente'
        return true;
      });
      const sustActual = Store.getSustituto(fecha, ausente, tienda, ctx.turnoFds || '');

      let listaHtml = '';
      if (candidatos.length === 0) {
        listaHtml = `<p style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">⚠ No hay candidatos válidos (todos fallan alguna de las 33 reglas).</p>`;
      } else {
        for (let i = 0; i < candidatos.length; i++) {
          const c = candidatos[i];
          const avisosHtml = c.avisos && c.avisos.length > 0
            ? ` <span style="color:#e65100;font-size:10px" title="${Utils.escapeHtml(c.avisos.join(', '))}">⚠</span>`
            : '';
          const excedenteTxt = c.excedenteOrigen >= 99
            ? 'disponible'
            : 'excedente:' + c.excedenteOrigen + (c.turnoOrigenFds ? ' (' + c.turnoOrigenFds + ')' : '');
          const esActual = sustActual && sustActual.sustituto === c.alias;
          const bgNormal = esActual ? 'rgba(46,125,50,0.15)' : 'var(--surface)';
          const bgHover = 'var(--surface-hover, rgba(128,128,128,0.15))';
          const borderCol = esActual ? '#2e7d32' : 'var(--border)';
          listaHtml += `
            <div class="cand-option" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-radius:6px;border:1px solid ${borderCol};background:${bgNormal};color:var(--text);margin-bottom:4px"
              onmouseover="this.style.background='${bgHover}'" onmouseout="this.style.background='${bgNormal}'">
              <strong style="flex:1">${Utils.escapeHtml(c.alias)}${esActual ? ' <span style="color:#2e7d32;font-size:10px">(actual)</span>' : ''}</strong>
              <span style="color:var(--text-muted);font-size:11px">${Utils.formatHora(c.entrada)}–${Utils.formatHora(c.salida)}</span>
              <span style="color:var(--text-muted);font-size:10px;opacity:0.85">${excedenteTxt}</span>${avisosHtml}
            </div>`;
        }
      }

      // ── Rechazados (clicables como EXTRA forzado) ─────────────
      // Click en un rechazado → asigna como sustituto con tipo='extra' y
      // horario del slot del ausente. Útil cuando alguien quiere hacer
      // horas extra aunque no le tocara (ya trabaja otro turno, etc.).
      // No se ofrecen los baja/reemplazados/también-ausentes (filtrados arriba).
      const puedeAsignarExtra = (slotEntrada !== null && slotSalida !== null);
      if (rechazados.length > 0) {
        const cabecera = puedeAsignarExtra
          ? rechazados.length + ' rechazados — click para asignar como EXTRA'
          : rechazados.length + ' rechazados — ver por qué';
        listaHtml += '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:11px;color:var(--text-muted);padding:6px 0">'
          + cabecera + '</summary>';
        for (let i = 0; i < rechazados.length; i++) {
          const r = rechazados[i];
          const motivo = Utils.escapeHtml(r.errores[0] || 'No válido');
          if (puedeAsignarExtra) {
            const bgNormal = 'transparent';
            const bgHover = 'rgba(230,81,0,0.10)';
            listaHtml += `
              <div class="rech-option" data-idx="${i}" title="Asignar como horas EXTRA · ${motivo}"
                   style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;border-radius:6px;border:1px solid var(--border);background:${bgNormal};color:var(--text);margin-bottom:4px;opacity:0.85"
                   onmouseover="this.style.background='${bgHover}';this.style.opacity='1'"
                   onmouseout="this.style.background='${bgNormal}';this.style.opacity='0.85'">
                <strong style="flex:1;font-weight:500">${Utils.escapeHtml(r.alias)}</strong>
                <span style="color:#e65100;font-size:10px;font-weight:600">+ EXTRA</span>
                <span style="color:var(--text-muted);font-size:10px;font-style:italic">${motivo}</span>
              </div>`;
          } else {
            listaHtml += `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;border:1px dashed var(--border);background:transparent;color:var(--text-muted);margin-bottom:4px;opacity:0.75">
                <strong style="flex:1;font-weight:500">${Utils.escapeHtml(r.alias)}</strong>
                <span style="font-size:10px;font-style:italic">${motivo}</span>
              </div>`;
          }
        }
        listaHtml += '</details>';
      }

      // ── Qué ve el motor: rotación efectiva del finde (diagnóstico) ─
      if (ctx.turnoFds) {
        const fechaDate = fecha instanceof Date ? fecha : Utils.parseFecha(fecha);
        const fdsDebug = Rotaciones.getFds(fechaDate, tienda);
        const orden = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
        listaHtml += '<details style="margin-top:8px"><summary style="cursor:pointer;font-size:11px;color:var(--text-muted);padding:6px 0">Qué ve el motor en este finde (diagnóstico)</summary>';
        for (const tk of orden) {
          const mapa = fdsDebug[tk] || {};
          const nombres = Object.keys(mapa).sort().map(n => {
            const fs = Utils.formatFecha(fechaDate);
            const aus = Store.estaAusente(n, fs, tienda) ? ' (ausente)' : '';
            return Utils.escapeHtml(n) + aus;
          });
          const destacar = tk === ctx.turnoFds ? 'font-weight:600;color:var(--text)' : 'color:var(--text-muted)';
          listaHtml += '<div style="padding:4px 10px;font-size:11px;' + destacar + '"><strong>' + tk + ':</strong> ' + (nombres.join(', ') || '—') + '</div>';
        }
        listaHtml += '</details>';
      }

      const html = `
        <div class="modal" style="max-width:460px">
          <div class="modal-header">
            <h3>Asignar sustituto — ${Utils.escapeHtml(ausente)}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body" style="max-height:60vh;overflow-y:auto">
            <p class="sub" style="font-size:12px;margin-bottom:8px">${Utils.escapeHtml(fechaES)} · ${Utils.escapeHtml(tiendaTxt)} · ${Utils.escapeHtml(turnoLabel)}</p>
            <div style="display:flex;gap:12px;font-size:11px;margin-bottom:12px;padding:8px 10px;background:var(--bg-2,#f5f5f5);border-radius:6px">
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
                <input type="radio" name="sust-tipo" value="movimiento" checked> <span><strong>Movimiento</strong> (no suma horas)</span>
              </label>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
                <input type="radio" name="sust-tipo" value="extra"> <span><strong>Extra</strong> (horas adicionales)</span>
              </label>
            </div>
            ${listaHtml}
          </div>
          <div class="modal-footer">
            ${sustActual ? `<button class="btn btn-danger" data-action="quitar" style="margin-right:auto">Quitar sustituto</button>` : ''}
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const close = (val) => { Modales._cerrarOverlay(overlay); resolve(val); };
      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => b.onclick = () => close(null));
      overlay.onclick = (e) => { if (e.target === overlay) close(null); };

      const leerTipo = () => {
        const r = overlay.querySelector('input[name="sust-tipo"]:checked');
        return r && r.value === 'extra' ? 'extra' : 'movimiento';
      };

      // Click en candidato → crear/reemplazar sustitución
      overlay.querySelectorAll('.cand-option').forEach(el => {
        el.onclick = () => {
          const i = parseInt(el.dataset.idx);
          const c = candidatos[i];
          const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
          const tipo = leerTipo();

          // Si ya había sustituto distinto, quitarlo primero
          if (sustActual && sustActual.sustituto !== c.alias) {
            Store.removeSustitucion(s =>
              s.fecha === fs && s.ausente === ausente && s.tienda === tienda &&
              (ctx.turnoFds ? s.turnoFds === ctx.turnoFds : !s.turnoFds)
            );
          }
          // Si ya estaba asignado el mismo, no hacer nada
          if (!(sustActual && sustActual.sustituto === c.alias)) {
            Store.addSustitucion({
              fecha: fs,
              ausente,
              sustituto: c.alias,
              entrada: c.entrada,
              salida: c.salida,
              franja: ctx.turnoFds ? '' : Utils.getFranja(c.entrada, c.salida, tienda),
              turnoFds: ctx.turnoFds || '',
              tienda,
              tipo
            });

            // Capa 2: registrar la decisión también en asignación manual.
            // Los candidatos vienen ya ordenados por prioridad del motor →
            // candidatos[0] es la sugerencia. Si Nacho clicka otro (i>0)
            // queda como discrepancia útil para aprender preferencias.
            if (candidatos.length > 0) {
              const motorSugirio = candidatos[0].alias;
              Store.addDecision({
                timestamp: new Date().toISOString(),
                fecha: fs,
                tienda,
                turnoFds: ctx.turnoFds || '',
                franja: ctx.turnoFds ? '' : Utils.getFranja(c.entrada, c.salida, tienda),
                ausente,
                motorSugirio,
                nachoEligio: c.alias,
                accion: 'sustituir'
              });
              if (Sync && Sync.syncDecisiones) Sync.syncDecisiones();
            }

            if (Sync && Sync.syncSustituciones) Sync.syncSustituciones();
            const msg = 'Sustituto asignado: ' + c.alias + (tipo === 'extra' ? ' (extra)' : '');
            CalendarioUI.toast && CalendarioUI.toast(msg, 'success');
          }
          close('asignado');
        };
      });

      // Click en rechazado → asignar como EXTRA (forzado, ignora radio).
      // Horario = el del slot del ausente (cubre exactamente el hueco).
      overlay.querySelectorAll('.rech-option').forEach(el => {
        el.onclick = () => {
          const i = parseInt(el.dataset.idx);
          const r = rechazados[i];
          if (!r || slotEntrada === null || slotSalida === null) return;
          const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);

          if (sustActual && sustActual.sustituto !== r.alias) {
            Store.removeSustitucion(s =>
              s.fecha === fs && s.ausente === ausente && s.tienda === tienda &&
              (ctx.turnoFds ? s.turnoFds === ctx.turnoFds : !s.turnoFds)
            );
          }
          if (!(sustActual && sustActual.sustituto === r.alias)) {
            Store.addSustitucion({
              fecha: fs,
              ausente,
              sustituto: r.alias,
              entrada: slotEntrada,
              salida: slotSalida,
              franja: ctx.turnoFds ? '' : Utils.getFranja(slotEntrada, slotSalida, tienda),
              turnoFds: ctx.turnoFds || '',
              tienda,
              tipo: 'extra'
            });
            if (Sync && Sync.syncSustituciones) Sync.syncSustituciones();
            CalendarioUI.toast && CalendarioUI.toast(
              'Asignado ' + r.alias + ' como EXTRA (' + (r.errores[0] || 'rechazado por motor') + ')',
              'success'
            );
          }
          close('asignado-extra');
        };
      });

      const btnQuitar = overlay.querySelector('[data-action="quitar"]');
      if (btnQuitar) {
        btnQuitar.onclick = () => {
          const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
          Store.removeSustitucion(s =>
            s.fecha === fs && s.ausente === ausente && s.tienda === tienda &&
            (ctx.turnoFds ? s.turnoFds === ctx.turnoFds : !s.turnoFds)
          );
          if (Sync && Sync.syncSustituciones) Sync.syncSustituciones();
          CalendarioUI.toast && CalendarioUI.toast('Sustituto eliminado', 'success');
          close('quitado');
        };
      }
    });
  },

  // ── Modal: asignar empleado a hueco vacío (horas extra) ────

  /**
   * Modal para cubrir un hueco visual del calendario asignando a un
   * empleado como horas EXTRA. Fecha/franja vienen del data-attr de la
   * cápsula vacía. Pre-rellena entrada/salida con la ventana típica de
   * la franja; el usuario puede editarlas. Al elegir candidato (válido
   * o rechazado) crea Store.addSustitucion con tipo='extra' y ausente=''.
   */
  asignarSlotVacio(fecha, tienda, franja) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const fechaDate = typeof fecha === 'string' ? Utils.parseFecha(fecha) : fecha;
      const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
      const dow = fechaDate.getDay();
      const tiendaTxt = tienda === 'granvia' ? 'Gran Vía' : 'Isabel';

      // Default entrada/salida: la ventana de la franja para esa tienda+día.
      // Si no hay (no debería), caer a 9-15 como placeholder seguro.
      const ventana = CONFIG.getFranjaVentana(tienda, franja, dow) || [9, 15];
      const eDefault = ventana[0], sDefault = ventana[1];

      const renderCandidatos = (entrada, salida) => {
        const debug = Motor.buscarCandidatosSlotVacio(fechaDate, tienda, franja, entrada, salida);
        const validos = debug.validos;
        const rechazados = debug.rechazados.filter(r => {
          if (validos.some(c => c.alias === r.alias)) return false;
          const mot = (r.errores && r.errores[0]) || '';
          if (mot.indexOf('dado de baja') >= 0) return false;
          if (mot.indexOf('Reemplazado') >= 0) return false;
          if (mot.indexOf('ausente') >= 0) return false;
          return true;
        });

        let h = '';
        if (validos.length === 0 && rechazados.length === 0) {
          h += `<p style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">Sin candidatos posibles para este horario.</p>`;
        }
        for (let i = 0; i < validos.length; i++) {
          const c = validos[i];
          h += `
            <div class="cand-option" data-tipo="valido" data-idx="${i}"
                 style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);margin-bottom:4px"
                 onmouseover="this.style.background='var(--surface-hover, rgba(128,128,128,0.15))'"
                 onmouseout="this.style.background='var(--surface)'">
              <strong style="flex:1">${Utils.escapeHtml(c.alias)}</strong>
              <span style="color:var(--text-muted);font-size:11px">${Utils.formatHora(c.entrada)}–${Utils.formatHora(c.salida)}</span>
            </div>`;
        }
        if (rechazados.length > 0) {
          h += '<details open style="margin-top:8px"><summary style="cursor:pointer;font-size:11px;color:var(--text-muted);padding:6px 0">'
            + rechazados.length + ' rechazados — click para asignar como EXTRA</summary>';
          for (let i = 0; i < rechazados.length; i++) {
            const r = rechazados[i];
            const motivo = Utils.escapeHtml(r.errores[0] || 'No válido');
            h += `
              <div class="cand-option" data-tipo="rechazado" data-idx="${i}"
                   title="Asignar como horas EXTRA · ${motivo}"
                   style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);margin-bottom:4px;opacity:0.85"
                   onmouseover="this.style.background='rgba(230,81,0,0.10)';this.style.opacity='1'"
                   onmouseout="this.style.background='transparent';this.style.opacity='0.85'">
                <strong style="flex:1;font-weight:500">${Utils.escapeHtml(r.alias)}</strong>
                <span style="color:#e65100;font-size:10px;font-weight:600">+ EXTRA</span>
                <span style="color:var(--text-muted);font-size:10px;font-style:italic">${motivo}</span>
              </div>`;
          }
          h += '</details>';
        }
        return { html: h, validos, rechazados };
      };

      let cache = renderCandidatos(eDefault, sDefault);

      const html = `
        <div class="modal" style="max-width:460px">
          <div class="modal-header">
            <h3>Asignar a hueco vacío — ${Utils.escapeHtml(franja.toUpperCase())}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body" style="max-height:65vh;overflow-y:auto">
            <p class="sub" style="font-size:12px;margin-bottom:8px">${Utils.escapeHtml(Utils.formatFechaES ? Utils.formatFechaES(fs) : fs)} · ${Utils.escapeHtml(tiendaTxt)} · ${Utils.escapeHtml(franja)}</p>
            <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Se creará como <strong>HORAS EXTRA</strong>. Ajusta el horario si es distinto del estándar de la franja.</p>
            <div class="form-row" style="display:flex;gap:8px;margin-bottom:12px">
              <div class="form-group" style="flex:1">
                <label style="font-size:11px">Entrada</label>
                <input type="number" step="0.25" id="slot-entrada" value="${eDefault}">
              </div>
              <div class="form-group" style="flex:1">
                <label style="font-size:11px">Salida</label>
                <input type="number" step="0.25" id="slot-salida" value="${sDefault}">
              </div>
              <button class="btn btn-secondary" data-action="recalcular" style="align-self:flex-end;font-size:11px;padding:6px 10px">Recalcular</button>
            </div>
            <div id="slot-candidatos">${cache.html}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
          </div>
        </div>
      `;
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const close = (val) => { Modales._cerrarOverlay(overlay); resolve(val); };
      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => b.onclick = () => close(null));
      overlay.onclick = (e) => { if (e.target === overlay) close(null); };

      const wireClicks = () => {
        overlay.querySelectorAll('.cand-option').forEach(el => {
          el.onclick = () => {
            const i = parseInt(el.dataset.idx);
            const tipo = el.dataset.tipo;
            const lista = tipo === 'valido' ? cache.validos : cache.rechazados;
            const elegido = lista[i];
            if (!elegido) return;
            const e = parseFloat(overlay.querySelector('#slot-entrada').value);
            const s = parseFloat(overlay.querySelector('#slot-salida').value);
            if (!(s > e)) {
              CalendarioUI.toast && CalendarioUI.toast('Horario inválido', 'error');
              return;
            }
            Store.addSustitucion({
              fecha: fs,
              ausente: '',
              sustituto: elegido.alias,
              entrada: e,
              salida: s,
              franja: Utils.getFranja(e, s, tienda),
              turnoFds: '',
              tienda,
              tipo: 'extra'
            });
            if (Sync && Sync.syncSustituciones) Sync.syncSustituciones();
            const motivo = (tipo === 'rechazado' && elegido.errores && elegido.errores[0])
              ? ' (' + elegido.errores[0] + ')' : '';
            CalendarioUI.toast && CalendarioUI.toast(
              'Asignado ' + elegido.alias + ' como EXTRA' + motivo, 'success');
            close('asignado');
          };
        });
      };
      wireClicks();

      const btnRecalc = overlay.querySelector('[data-action="recalcular"]');
      btnRecalc.onclick = () => {
        const e = parseFloat(overlay.querySelector('#slot-entrada').value);
        const s = parseFloat(overlay.querySelector('#slot-salida').value);
        if (!(s > e)) {
          CalendarioUI.toast && CalendarioUI.toast('Horario inválido', 'error');
          return;
        }
        cache = renderCandidatos(e, s);
        overlay.querySelector('#slot-candidatos').innerHTML = cache.html;
        wireClicks();
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
            <div id="mod-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px"></div>
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
  }

});
