// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-empleado.js
// Menú contextual de acciones por empleado (clic en nombre del
// calendario), edición de ficha y alta de nuevo empleado.
// Requiere modales-base.js cargado antes; cross-llamadas a
// modales-sustitucion / -ausencia / -intercambio.
// ============================================================

'use strict';

Object.assign(Modales, {

  // ── Menú de acciones por empleado (click en nombre) ────────

  accionesEmpleado(alias, fecha, tienda, ctx) {
    // ctx = { entrada, salida, turnoFds }
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const fechaES = Utils.formatFechaES ? Utils.formatFechaES(fecha) : fecha;
      const tiendaTxt = tienda === 'granvia' ? 'Gran Vía' : 'Isabel';
      const horario = (typeof ctx.entrada === 'number' && typeof ctx.salida === 'number')
        ? Utils.formatHora(ctx.entrada) + '–' + Utils.formatHora(ctx.salida) : '';

      // ¿Está ausente ese día? Solo entonces tiene sentido asignar sustituto.
      const ausente = Store.estaAusente(alias, fecha, tienda);
      const sustActual = ausente ? Store.getSustituto(fecha, alias, tienda, ctx.turnoFds || '') : null;
      const btnSustHtml = ausente
        ? `<button class="btn btn-secondary" data-action="sustituto" style="justify-content:flex-start;padding:12px 14px">📋 ${sustActual ? 'Cambiar sustituto (actual: ' + Utils.escapeHtml(sustActual.sustituto) + ')' : 'Asignar sustituto'}</button>`
        : '';

      // Índice de la ausencia activa (para poder editarla directamente)
      let ausenciaIdx = -1;
      let ausenciaActual = null;
      if (ausente) {
        const lista = Store.getAusencias(tienda);
        const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
        for (let i = 0; i < lista.length; i++) {
          const a = lista[i];
          if (a.empleado === alias && a.desde <= fs && a.hasta >= fs) {
            ausenciaIdx = i;
            ausenciaActual = a;
            break;
          }
        }
      }
      const btnEditAusHtml = ausente && ausenciaIdx >= 0
        ? `<button class="btn btn-secondary" data-action="editar-ausencia" style="justify-content:flex-start;padding:12px 14px">✎ Editar ausencia (${Utils.escapeHtml(Ausencias.getTipoLabel(ausenciaActual.tipo))})</button>`
        : '';

      // ¿Ya hay un intercambio activo para este empleado? Solo tiene sentido ofrecer el swap si está presente.
      const turnoAct = ctx.turnoFds ? ctx.turnoFds : 'LV';
      const intActivo = !ausente && typeof Intercambios !== 'undefined'
        ? Intercambios.getActivoPara(alias, fecha, tienda, turnoAct) : null;
      const btnIntercambioHtml = ausente ? '' : (intActivo
        ? `<button class="btn btn-secondary" data-action="quitarIntercambio" style="justify-content:flex-start;padding:12px 14px">🔄 Deshacer intercambio (con ${Utils.escapeHtml(intActivo.intercambio.empleadoA === alias ? intActivo.intercambio.empleadoB : intActivo.intercambio.empleadoA)})</button>`
        : `<button class="btn btn-secondary" data-action="intercambiar" style="justify-content:flex-start;padding:12px 14px">🔄 Intercambiar turno con…</button>`);

      const html = `
        <div class="modal" style="max-width:380px">
          <div class="modal-header">
            <h3>${Utils.escapeHtml(alias)}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <p class="sub" style="margin-bottom:14px;font-size:12px">${Utils.escapeHtml(fechaES)} · ${Utils.escapeHtml(tiendaTxt)}${horario ? ' · ' + horario : ''}${ctx.turnoFds ? ' · ' + ctx.turnoFds : ''}</p>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${btnSustHtml}
              ${btnEditAusHtml}
              <button class="btn btn-secondary" data-action="modificar" style="justify-content:flex-start;padding:12px 14px">✎ Modificar horario hoy</button>
              ${btnIntercambioHtml}
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

      const btnSust = overlay.querySelector('[data-action="sustituto"]');
      if (btnSust) {
        btnSust.onclick = () => {
          close('sustituto');
          Modales.elegirSustitutoManual(alias, fecha, tienda, ctx).then(() => CalendarioUI.render());
        };
      }
      overlay.querySelector('[data-action="modificar"]').onclick = () => {
        close('modificar');
        Modales.modificarHorario(alias, fecha, tienda, ctx).then(() => CalendarioUI.render());
      };
      const btnInt = overlay.querySelector('[data-action="intercambiar"]');
      if (btnInt) {
        btnInt.onclick = () => {
          close('intercambiar');
          Modales.elegirIntercambio(alias, fecha, tienda, ctx).then(() => CalendarioUI.render());
        };
      }
      const btnDesInt = overlay.querySelector('[data-action="quitarIntercambio"]');
      if (btnDesInt) {
        btnDesInt.onclick = () => {
          close('quitarIntercambio');
          Modales.confirmar('¿Deshacer este intercambio? Los dos empleados vuelven a su turno original.', 'Deshacer intercambio').then(ok => {
            if (!ok) return;
            Intercambios.remove(intActivo.idx);
            if (Sync && Sync.syncIntercambios) Sync.syncIntercambios();
            if (CalendarioUI && CalendarioUI.toast) CalendarioUI.toast('Intercambio deshecho', 'success');
            CalendarioUI.render();
          });
        };
      }
      overlay.querySelector('[data-action="ausencia"]').onclick = () => {
        close('ausencia');
        Modales.nuevaAusencia(alias).then(() => CalendarioUI.render());
      };
      const btnEditAus = overlay.querySelector('[data-action="editar-ausencia"]');
      if (btnEditAus) {
        btnEditAus.onclick = () => {
          close('editar-ausencia');
          Modales.editarAusencia(tienda, ausenciaIdx).then(res => {
            if (res) {
              if (Sync && Sync.syncAusencias) Sync.syncAusencias();
              CalendarioUI.render();
            }
          });
        };
      }
      overlay.querySelector('[data-action="ficha"]').onclick = () => {
        close('ficha');
        Modales.editarEmpleado(alias, tienda).then(() => CalendarioUI.render());
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
              <div class="form-row">
                <div class="form-group">
                  <label>Fecha de alta</label><input type="date" id="emp-fechaAlta" value="${e(emp.fechaAlta)}" disabled>
                </div>
                <div class="form-group">
                  <label>Fecha de baja <span class="sub" style="font-weight:400">(deja vacío si sigue activo)</span></label>
                  <input type="date" id="emp-fechaBaja" value="${e(emp.fechaBaja)}" disabled>
                </div>
              </div>
              <p id="emp-unlock-status" class="sub" style="margin-top:6px;font-size:11px">Bloqueado. Pulsa "Desbloquear edición" para modificar estos campos.</p>
            </div>

            <div id="emp-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
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
      const sensitiveIds = ['emp-dni', 'emp-email', 'emp-fechaAlta', 'emp-fechaBaja'];
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
          actualizado.fechaBaja = v('emp-fechaBaja'); // '' si vacío → empleado activo
          if (actualizado.fechaBaja && actualizado.fechaAlta &&
              actualizado.fechaBaja < actualizado.fechaAlta) {
            return showErr('La fecha de baja no puede ser anterior a la de alta');
          }
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

  // ── Nuevo empleado (útil para dar de alta temporales) ──────

  nuevoEmpleado(tiendaPref) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const e = (v) => Utils.escapeHtml(v == null ? '' : String(v));
      const franjas = ['descarga', 'mañanas', 'tardes', 'cierre', 'rotativo'];
      const tiendas = [['granvia', 'Solo Gran Vía'], ['isabel', 'Solo Isabel'], ['ambas', 'Ambas']];
      const pref = tiendaPref === 'isabel' ? 'isabel' : (tiendaPref === 'ambas' ? 'ambas' : 'granvia');

      let optFranjas = '';
      for (const f of franjas) optFranjas += `<option value="${f}">${f}</option>`;
      let optTiendas = '';
      for (const t of tiendas) optTiendas += `<option value="${t[0]}"${t[0] === pref ? ' selected' : ''}>${t[1]}</option>`;

      overlay.innerHTML = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Nuevo empleado</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <p class="sub" style="margin-bottom:10px">Para sustitutos temporales rellena <b>fechaAlta</b> y <b>fechaBaja</b> con el rango del contrato temporal.</p>
            <div class="form-row">
              <div class="form-group"><label>Alias *</label><input type="text" id="nemp-alias" placeholder="Ej: PEDRO_T"></div>
              <div class="form-group"><label>Color</label><input type="color" id="nemp-color" value="#2c5aa0" style="height:36px"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input type="text" id="nemp-nombre"></div>
              <div class="form-group"><label>Apellidos</label><input type="text" id="nemp-apellidos"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Contrato (h/sem)</label><input type="number" step="0.5" id="nemp-contrato" value="30"></div>
              <div class="form-group"><label>Franja</label><select id="nemp-franja">${optFranjas}</select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Tienda(s)</label><select id="nemp-tienda">${optTiendas}</select></div>
              <div class="form-group"><label>Restricción</label><input type="text" id="nemp-restriccion" placeholder="ej: solo-mañanas"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha alta *</label><input type="date" id="nemp-fechaAlta"></div>
              <div class="form-group"><label>Fecha baja <span class="sub">(si es temporal)</span></label><input type="date" id="nemp-fechaBaja"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>DNI</label><input type="text" id="nemp-dni"></div>
              <div class="form-group"><label>Teléfono</label><input type="text" id="nemp-telefono"></div>
            </div>
            <div id="nemp-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Crear</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));

      const errEl = overlay.querySelector('#nemp-error');
      const showErr = (m) => { errEl.textContent = m; errEl.style.display = 'block'; };
      const v = (id) => overlay.querySelector('#' + id).value;

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => { Modales._cerrarOverlay(overlay); resolve(null); };
      });
      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const alias = v('nemp-alias').trim().toUpperCase();
        if (!alias) return showErr('El alias es obligatorio');
        if (!v('nemp-nombre').trim()) return showErr('El nombre es obligatorio');
        if (!v('nemp-fechaAlta')) return showErr('La fecha de alta es obligatoria');
        const fBaja = v('nemp-fechaBaja');
        if (fBaja && fBaja < v('nemp-fechaAlta')) return showErr('La fecha de baja no puede ser anterior a la de alta');

        const tiendaSel = v('nemp-tienda');
        // Cada tienda mantiene su propio registro (contrato distinto por CIF).
        // 'ambas' crea un registro en los dos stores; cada tienda solo en el suyo.
        const destinos = tiendaSel === 'ambas' ? ['empleadosGV', 'empleadosIS']
                        : tiendaSel === 'isabel' ? ['empleadosIS']
                        : ['empleadosGV'];

        for (const k of destinos) {
          if (Store.get(k)[alias]) {
            const nombreTienda = k === 'empleadosGV' ? 'Gran Vía' : 'Isabel';
            return showErr('Ya existe un empleado con alias "' + alias + '" en ' + nombreTienda);
          }
        }

        const nuevo = {
          alias, nombre: v('nemp-nombre').trim(), apellidos: v('nemp-apellidos').trim(),
          dni: v('nemp-dni').trim(), telefono: v('nemp-telefono').trim(), email: '',
          fechaAlta: v('nemp-fechaAlta'), fechaBaja: fBaja || '',
          contrato: parseFloat(v('nemp-contrato')) || 0,
          tienda: tiendaSel, franja: v('nemp-franja'), restriccion: v('nemp-restriccion').trim(),
          color: v('nemp-color')
        };
        for (const k of destinos) {
          const emps = Object.assign({}, Store.get(k));
          emps[alias] = Object.assign({}, nuevo);
          Store.set(k, emps);
        }
        if (Sync && Sync.syncEmpleados) Sync.syncEmpleados();
        Modales._cerrarOverlay(overlay);
        resolve(nuevo);
      };
    });
  }

});
