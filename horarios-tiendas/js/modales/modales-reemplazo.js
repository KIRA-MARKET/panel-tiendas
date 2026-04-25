// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-reemplazo.js
// Gestión de reemplazos: baja definitiva o sustituto temporal
// (un alias ocupa el slot de otro durante un rango de fechas).
// Requiere modales-base.js cargado antes.
// ============================================================

'use strict';

Object.assign(Modales, {

  // ── Gestión de reemplazos (baja definitiva / sustituto temporal) ──

  gestionarReemplazos(tienda) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const render = () => {
        const e = Utils.escapeHtml;
        const lista = Store.getReemplazos().filter(r => r.tienda === tienda);
        const hoy = Utils.formatFecha(new Date());

        let filas = '';
        if (lista.length === 0) {
          filas = '<tr><td colspan="6" class="empty" style="text-align:center;padding:18px">Sin reemplazos en ' + (tienda === 'granvia' ? 'Gran Vía' : 'Isabel') + '</td></tr>';
        } else {
          lista.forEach((r, idx) => {
            const enCurso = (!r.desde || r.desde <= hoy) && (!r.hasta || r.hasta >= hoy);
            const hasta = r.hasta ? e(r.hasta) : '<span class="sub">indefinido</span>';
            const idxReal = Store.getReemplazos().indexOf(r);
            filas += '<tr' + (enCurso ? '' : ' style="opacity:0.6"') + '>';
            filas += '<td><strong>' + e(r.aliasOriginal) + '</strong></td>';
            filas += '<td>→</td>';
            filas += '<td><strong>' + e(r.aliasNuevo) + '</strong></td>';
            filas += '<td>' + e(r.desde || '—') + ' – ' + hasta + '</td>';
            filas += '<td><span class="sub">' + e(r.motivo || '') + '</span></td>';
            filas += '<td><button class="btn btn-danger" style="padding:3px 8px;font-size:11px" onclick="Modales._eliminarReemplazo(' + idxReal + ')">Eliminar</button></td>';
            filas += '</tr>';
          });
        }

        overlay.innerHTML = `
          <div class="modal modal-lg">
            <div class="modal-header">
              <h3>Reemplazos — ${tienda === 'granvia' ? 'Gran Vía' : 'Isabel'}</h3>
              <button class="modal-close" data-action="cancel">×</button>
            </div>
            <div class="modal-body">
              <p class="sub" style="margin-bottom:10px">Un reemplazo hace que un alias sea ocupado por otro en un rango de fechas. Sin fecha de fin = baja definitiva.</p>
              <table class="control-tabla" style="width:100%">
                <thead><tr><th>Titular</th><th></th><th>Sustituto</th><th>Rango</th><th>Motivo</th><th></th></tr></thead>
                <tbody>${filas}</tbody>
              </table>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-action="cancel">Cerrar</button>
              <button class="btn btn-success" data-action="nuevo">+ Reemplazo</button>
            </div>
          </div>
        `;
        overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
          b.onclick = () => { Modales._cerrarOverlay(overlay); resolve(); };
        });
        overlay.querySelector('[data-action="nuevo"]').onclick = () => {
          Modales.nuevoReemplazo(tienda).then(creado => {
            if (creado) {
              if (CalendarioUI && CalendarioUI.toast) CalendarioUI.toast('Reemplazo creado', 'success');
              CalendarioUI.render();
              render();
            }
          });
        };
      };

      Modales._rerenderReemplazos = render; // para _eliminarReemplazo
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));
      render();
    });
  },

  _eliminarReemplazo(idx) {
    Modales.confirmar('¿Eliminar este reemplazo? El titular volverá a ocupar sus slots.', 'Eliminar reemplazo').then(ok => {
      if (!ok) return;
      Reemplazos.remove(idx);
      if (Sync && Sync.syncReemplazos) Sync.syncReemplazos();
      if (CalendarioUI && CalendarioUI.toast) CalendarioUI.toast('Reemplazo eliminado', 'success');
      CalendarioUI.render();
      if (Modales._rerenderReemplazos) Modales._rerenderReemplazos();
    });
  },

  nuevoReemplazo(tienda) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const empleados = Object.values(Store.getEmpleadosActivos(tienda) || {})
        .sort((a, b) => a.alias.localeCompare(b.alias));
      const hoy = Utils.formatFecha(new Date());

      const opts = empleados.map(emp =>
        '<option value="' + Utils.escapeHtml(emp.alias) + '">' + Utils.escapeHtml(emp.alias) + ' — ' + Utils.escapeHtml(emp.nombre || '') + '</option>'
      ).join('');

      overlay.innerHTML = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Nuevo reemplazo — ${tienda === 'granvia' ? 'Gran Vía' : 'Isabel'}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Titular (quien deja el slot)</label>
                <select id="rmp-original"><option value="">—</option>${opts}</select>
              </div>
              <div class="form-group">
                <label>Sustituto (quien ocupa el slot)</label>
                <select id="rmp-nuevo"><option value="">—</option>${opts}</select>
              </div>
            </div>
            <div class="form-group">
              <label>Tipo de baja</label>
              <div style="display:flex;gap:14px;font-size:13px;margin-top:4px">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                  <input type="radio" name="rmp-tipo" value="temporal" id="rmp-tipo-temp" checked> Baja temporal (médica, excedencia…) — <em>volverá</em>
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                  <input type="radio" name="rmp-tipo" value="definitiva" id="rmp-tipo-def"> Baja definitiva — <em>se archiva</em>
                </label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Desde</label><input type="date" id="rmp-desde" value="${hoy}"></div>
              <div class="form-group" id="rmp-hasta-wrap">
                <label>Hasta (fecha de regreso prevista)</label>
                <input type="date" id="rmp-hasta">
                <span class="sub" style="font-size:11px">Si no la sabes, déjalo vacío; podrás cerrar el reemplazo cuando vuelva.</span>
              </div>
            </div>
            <div class="form-group">
              <label>Motivo</label>
              <input type="text" id="rmp-motivo" placeholder="Ej: Baja médica, fin de contrato, excedencia...">
            </div>
            <p class="sub" style="margin-top:8px">Si el sustituto todavía no existe, cierra este modal, crea el empleado con <b>+ Empleado</b> y vuelve aquí.</p>
            <div id="rmp-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Crear reemplazo</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const errEl = overlay.querySelector('#rmp-error');
      const showErr = (m) => { errEl.textContent = m; errEl.style.display = 'block'; };
      const v = (id) => overlay.querySelector('#' + id).value;

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => { Modales._cerrarOverlay(overlay); resolve(null); };
      });
      // Toggle del campo "hasta" según el tipo de baja
      const tipoRadios = overlay.querySelectorAll('input[name="rmp-tipo"]');
      const hastaWrap = overlay.querySelector('#rmp-hasta-wrap');
      const sincronizarTipo = () => {
        const tipo = overlay.querySelector('input[name="rmp-tipo"]:checked').value;
        if (tipo === 'definitiva') {
          hastaWrap.style.display = 'none';
          overlay.querySelector('#rmp-hasta').value = '';
        } else {
          hastaWrap.style.display = '';
        }
      };
      tipoRadios.forEach(r => r.addEventListener('change', sincronizarTipo));

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const orig = v('rmp-original');
        const nuevo = v('rmp-nuevo');
        const desde = v('rmp-desde');
        const hasta = v('rmp-hasta');
        const tipo = overlay.querySelector('input[name="rmp-tipo"]:checked').value;
        if (!orig || !nuevo) return showErr('Selecciona titular y sustituto');
        if (orig === nuevo) return showErr('El titular y el sustituto no pueden ser la misma persona');
        if (!desde) return showErr('Fecha "desde" obligatoria');
        if (tipo === 'temporal' && hasta && hasta < desde) {
          return showErr('La fecha "hasta" no puede ser anterior a "desde"');
        }

        const reemp = {
          tienda, aliasOriginal: orig, aliasNuevo: nuevo,
          desde,
          hasta: tipo === 'definitiva' ? '' : (hasta || ''),
          motivo: v('rmp-motivo').trim()
        };
        Reemplazos.add(reemp);

        // Baja definitiva: archivar al titular fijando su fechaBaja
        if (tipo === 'definitiva') {
          const emp = Store.getEmpleado(orig, tienda);
          if (emp && (!emp.fechaBaja || emp.fechaBaja > desde)) {
            const empsMap = tienda === 'granvia' ? 'empleadosGV' : 'empleadosIS';
            const empsActualizados = Object.assign({}, Store._state[empsMap]);
            empsActualizados[orig] = Object.assign({}, emp, { fechaBaja: desde });
            Store.set(empsMap, empsActualizados);
            if (Sync && Sync.syncEmpleados) Sync.syncEmpleados();
          }
        }

        if (Sync && Sync.syncReemplazos) Sync.syncReemplazos();
        Modales._cerrarOverlay(overlay);
        resolve(reemp);
      };
    });
  }

});
