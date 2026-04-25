// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-ausencia.js
// Modales de ausencias: alta, edición y diálogo post-creación
// para preguntar si lanza el motor de sustituciones.
// Requiere modales-base.js cargado antes.
// ============================================================

'use strict';

Object.assign(Modales, {

  // ── Modal de nueva ausencia ────────────────────────────────

  nuevaAusencia(empleadoPreseleccionado = null) {
    return new Promise((resolve) => {
      const overlay = Modales._crearOverlay();
      const tienda = Store.getTienda();
      const empleados = Store.getEmpleadosActivos(tienda);

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
            <h3>Nueva ausencia — ${tienda === 'granvia' ? 'Gran Vía' : 'Isabel'}</h3>
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
            <div id="aus-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
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

        // Si el empleado trabaja en ambas tiendas, preguntar si replicar la
        // ausencia a la otra. Si cancela el diálogo, se registra solo en la
        // tienda activa (comportamiento por defecto, menos invasivo).
        const empData = Store.getEmpleado(empleado, tienda);
        const decidir = (empData && empData.tienda === 'ambas')
          ? Modales.confirmar(
              'Este empleado trabaja en ambas tiendas. ¿Aplico la ausencia también en la otra tienda?',
              empleado + ' está en ambas tiendas'
            )
          : Promise.resolve(false);

        decidir.then((aplicarEnAmbas) => {
          const result = Ausencias.crear(
            tienda, empleado, tipo, desde, hasta, motivo,
            { aplicarEnAmbas: !!aplicarEnAmbas }
          );
          if (!result.ok) return showError(result.error);

          Modales._cerrarOverlay(overlay);
          const msg = result.replicada
            ? 'Ausencia registrada para ' + empleado + ' en ambas tiendas'
            : 'Ausencia registrada para ' + empleado;
          CalendarioUI.toast(msg, 'success');

          // Preguntar si quiere asignar sustitutos
          Modales._preguntarAsignarSustitutos(tienda, result.ausencia).then(() => {
            resolve(result.ausencia);
          });
        });
      };
    });
  },

  // ── Modal de editar ausencia ───────────────────────────────

  editarAusencia(tienda, index) {
    return new Promise((resolve) => {
      const ausencias = Store.getAusencias(tienda);
      const aus = ausencias[index];
      if (!aus) return resolve(null);

      const overlay = Modales._crearOverlay();

      let optionsTipo = '';
      for (const t of Ausencias.TIPOS) {
        const sel = t.value === aus.tipo ? ' selected' : '';
        optionsTipo += `<option value="${t.value}"${sel}>${t.icon} ${t.label}</option>`;
      }

      const tiendaLabel = tienda === 'granvia' ? 'Gran Vía' : 'Isabel';
      const restanAntes = CONFIG.TIPOS_RESTAN_DIAS.includes(aus.tipo);

      const html = `
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Editar ausencia — ${tiendaLabel}</h3>
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Empleado</label>
              <input type="text" value="${Utils.escapeHtml(aus.empleado)}" disabled>
            </div>
            <div class="form-group">
              <label>Tipo de ausencia</label>
              <select id="aus-edit-tipo">${optionsTipo}</select>
              <div class="sub" style="margin-top:4px;font-size:11px">
                ${restanAntes ? 'Actualmente <strong>resta</strong> días de vacaciones.' : 'Actualmente <strong>no resta</strong> días de vacaciones.'}
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Desde</label>
                <input type="date" id="aus-edit-desde" value="${aus.desde}">
              </div>
              <div class="form-group">
                <label>Hasta</label>
                <input type="date" id="aus-edit-hasta" value="${aus.hasta}">
              </div>
            </div>
            <div class="form-group">
              <label>Motivo (opcional)</label>
              <input type="text" id="aus-edit-motivo" value="${Utils.escapeHtml(aus.motivo || '')}" placeholder="Motivo o detalle...">
            </div>
            <div id="aus-edit-error" style="display:none;background:var(--err-light);color:var(--err);padding:10px;border-radius:4px;font-size:12px;margin-top:10px"></div>
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

      const errorEl = overlay.querySelector('#aus-edit-error');
      const showError = (msg) => { errorEl.textContent = msg; errorEl.style.display = 'block'; };
      const hideError = () => { errorEl.style.display = 'none'; };

      overlay.querySelectorAll('[data-action="cancel"]').forEach(b => {
        b.onclick = () => { Modales._cerrarOverlay(overlay); resolve(null); };
      });

      overlay.querySelector('[data-action="ok"]').onclick = () => {
        const tipo = overlay.querySelector('#aus-edit-tipo').value;
        const desde = overlay.querySelector('#aus-edit-desde').value;
        const hasta = overlay.querySelector('#aus-edit-hasta').value;
        const motivo = overlay.querySelector('#aus-edit-motivo').value;

        if (!tipo) return showError('Selecciona el tipo');
        if (!desde || !hasta) return showError('Selecciona las fechas');

        hideError();
        const r = Ausencias.editar(tienda, index, { tipo, desde, hasta, motivo });
        if (!r.ok) return showError(r.error);

        Modales._cerrarOverlay(overlay);
        CalendarioUI.toast('Ausencia actualizada', 'success');
        resolve(r.ausencia);
      };
    });
  },

  /** Pregunta si quiere asignar sustitutos manualmente */
  _preguntarAsignarSustitutos(tienda, ausencia) {
    return new Promise((resolve) => {
      Modales.confirmar(
        '¿Quieres asignar sustitutos ahora? El motor te propondrá candidatos solo donde haga falta.',
        'Ausencia creada'
      ).then(quiere => {
        if (quiere) {
          // Lanzar análisis del motor
          App.calcularSustituciones();
        }
        resolve();
      });
    });
  }

});
