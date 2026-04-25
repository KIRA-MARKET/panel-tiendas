// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-intercambio.js
// Intercambio puntual de turno entre dos empleados (ambos
// presentes, no hay ausente). Incluye simulación de mínimos
// para avisar de violaciones nuevas.
// Requiere modales-base.js cargado antes.
// ============================================================

'use strict';

Object.assign(Modales, {

  // ── Intercambio puntual de turno entre dos empleados ──────

  /**
   * Simula el intercambio y devuelve las alertas de mínimos que
   * aparecerían DESPUÉS pero NO existían ANTES. Formato: string legible.
   * No persiste nada: añade y quita el intercambio en memoria.
   */
  _alertasNuevasPorIntercambio(inter, esFds) {
    const key = (a) => a.franja + ':' + a.actual + '/' + a.minimo;

    // Fechas a comprobar
    const fechas = [];
    if (esFds) {
      const sab = Utils.parseFecha(inter.fecha);
      const dom = new Date(sab.getTime() + 86400000);
      fechas.push({ fecha: sab, fds: true });
      fechas.push({ fecha: dom, fds: true });
    } else {
      fechas.push({ fecha: Utils.parseFecha(inter.fecha), fds: false });
    }

    // Snapshot ANTES
    const antes = new Set();
    for (const { fecha, fds } of fechas) {
      const alertas = fds
        ? Cobertura.verificarMinimosFds(fecha, inter.tienda)
        : Cobertura.verificarMinimosLV(fecha, inter.tienda);
      for (const a of alertas) antes.add(key(a));
    }

    // Aplicar temporalmente
    Store._state.intercambios.push(inter);

    // Snapshot DESPUÉS
    const despues = [];
    for (const { fecha, fds } of fechas) {
      const alertas = fds
        ? Cobertura.verificarMinimosFds(fecha, inter.tienda)
        : Cobertura.verificarMinimosLV(fecha, inter.tienda);
      for (const a of alertas) despues.push(a);
    }

    // Revertir
    Store._state.intercambios.pop();

    // Nuevas = las que aparecen en DESPUÉS con key no presente en ANTES
    const nuevasStr = [];
    const vistas = new Set();
    for (const a of despues) {
      const k = key(a);
      if (antes.has(k)) continue;
      if (vistas.has(k)) continue;
      vistas.add(k);
      nuevasStr.push(a.franja + ' (' + a.actual + '/' + a.minimo + ')');
    }
    return nuevasStr;
  },

  /**
   * Modal para intercambiar turno de un empleado con otro que trabaje
   * el mismo día (L-V) o el mismo FdS (FdS). Sin ausente de por medio:
   * los dos empleados están presentes, solo cambian de hueco.
   */
  elegirIntercambio(alias, fecha, tienda, ctx) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const fechaES = Utils.formatFechaES ? Utils.formatFechaES(fecha) : fecha;
      const esFds = !!ctx.turnoFds;
      const turnoTxt = esFds ? ctx.turnoFds : 'L-V';
      const e = Utils.escapeHtml;

      // Candidatos + fecha ancla para el intercambio
      /** @type {Array<{alias: string, entrada: number, salida: number, turno?: string}>} */
      let candidatos = [];
      let fechaAncla;
      if (esFds) {
        const d = typeof fecha === 'string' ? Utils.parseFecha(fecha) : fecha;
        const sab = d.getDay() === 0 ? new Date(d.getTime() - 86400000) : d;
        fechaAncla = Utils.formatFecha(sab);
        candidatos = Intercambios.candidatosFds(alias, sab, tienda);
      } else {
        fechaAncla = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
        candidatos = Intercambios.candidatosLV(alias, fecha, tienda);
      }

      // Filtrar candidatos que ya estén metidos en otro intercambio ese día
      candidatos = candidatos.filter(c => {
        const t = esFds ? c.turno : 'LV';
        const act = Intercambios.getActivoPara(c.alias, fechaAncla, tienda, t);
        return !act;
      });

      let listaHtml = '';
      if (candidatos.length === 0) {
        listaHtml = `<p style="text-align:center;padding:20px;color:var(--err);font-size:12px">No hay compañeros disponibles para intercambiar este turno.</p>`;
      } else {
        for (let i = 0; i < candidatos.length; i++) {
          const c = candidatos[i];
          const sub = esFds ? c.turno + ' · ' : '';
          listaHtml += `
            <div class="cand-option" data-idx="${i}" style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);margin-bottom:4px"
              onmouseover="if(!this.classList.contains('selected'))this.style.background='var(--primary-light)'" onmouseout="if(!this.classList.contains('selected'))this.style.background='var(--surface)'">
              <strong style="flex:1">${e(c.alias)}</strong>
              <span style="font-size:11px;color:var(--text-secondary)">${e(sub)}${Utils.formatHora(c.entrada)}–${Utils.formatHora(c.salida)}</span>
            </div>
          `;
        }
      }

      overlay.innerHTML = `
        <div class="modal" style="max-width:460px">
          <div class="modal-header">
            <h3>Intercambiar turno — ${e(alias)}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <p class="sub" style="margin-bottom:10px;font-size:12px">${e(fechaES)} · ${e(turnoTxt)}${ctx.entrada != null ? ' · ' + Utils.formatHora(ctx.entrada) + '–' + Utils.formatHora(ctx.salida) : ''}</p>
            <p class="sub" style="margin-bottom:6px;font-size:12px">Elige con quién intercambia:</p>
            <div id="int-lista">${listaHtml}</div>
            <div class="form-group" style="margin-top:10px">
              <label>Motivo <span class="sub">(opcional)</span></label>
              <input type="text" id="int-motivo" placeholder="Ej: cita médica, asunto personal…">
            </div>
            <div id="int-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok" disabled style="opacity:0.5">Intercambiar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const errEl = overlay.querySelector('#int-error');
      const showErr = (m) => { errEl.textContent = m; errEl.style.display = 'block'; };
      const btnOk = overlay.querySelector('[data-action="ok"]');
      let elegido = -1;

      overlay.querySelectorAll('.cand-option').forEach(el => {
        el.onclick = () => {
          elegido = parseInt(el.dataset.idx, 10);
          overlay.querySelectorAll('.cand-option').forEach(o => {
            o.classList.remove('selected');
            o.style.background = 'var(--surface)';
            o.style.borderColor = 'var(--border)';
          });
          el.classList.add('selected');
          el.style.background = 'var(--ok-light)';
          el.style.borderColor = 'var(--ok)';
          btnOk.disabled = false;
          btnOk.style.opacity = '1';
        };
      });

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => { Modales._cerrarOverlay(overlay); resolve(null); };
      });
      btnOk.onclick = () => {
        if (elegido < 0) return showErr('Elige un compañero');
        const c = candidatos[elegido];
        const turnoA = esFds ? ctx.turnoFds : 'LV';
        const turnoB = esFds ? c.turno : 'LV';
        const motivo = overlay.querySelector('#int-motivo').value.trim();
        const inter = {
          fecha: fechaAncla, tienda,
          empleadoA: alias, turnoA,
          empleadoB: c.alias, turnoB,
          motivo
        };

        // Validar mínimos: snapshot antes y después para detectar nuevas violaciones.
        const alertasNuevas = Modales._alertasNuevasPorIntercambio(inter, esFds);

        const confirmarYGuardar = () => {
          Intercambios.add(inter);
          if (Sync && Sync.syncIntercambios) Sync.syncIntercambios();
          if (CalendarioUI && CalendarioUI.toast) CalendarioUI.toast('Intercambio creado: ' + alias + ' ↔ ' + c.alias, 'success');
          Modales._cerrarOverlay(overlay);
          resolve(inter);
        };

        if (alertasNuevas.length > 0) {
          Modales.confirmar(
            'Con este intercambio quedan por debajo del mínimo: ' + alertasNuevas.join(', ') + '. ¿Continuar igualmente?',
            'Aviso de mínimos'
          ).then(ok => { if (ok) confirmarYGuardar(); });
        } else {
          confirmarYGuardar();
        }
      };
    });
  }

});
