// ============================================================
// HORARIOS KIRA & REYPIK — modales/modales-refuerzo.js
// Modal de alta de refuerzo (horas extra puntuales sin ausencia
// previa). Crea sustitución con tipo:'extra'.
// Requiere modales-base.js cargado antes.
// ============================================================

'use strict';

Object.assign(Modales, {

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
            <button class="modal-close" data-action="cancel">×</button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
              <div>
                <label style="font-size:11px;font-weight:700">Fecha</label>
                <input type="date" id="ref-fecha" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px"
                  value="${año}-${String(mes+1).padStart(2,'0')}-01">
              </div>
              <div>
                <label style="font-size:11px;font-weight:700">Tienda</label>
                <select id="ref-tienda" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px">
                  <option value="granvia" ${tienda==='granvia'?'selected':''}>Gran Vía</option>
                  <option value="isabel" ${tienda==='isabel'?'selected':''}>Isabel</option>
                </select>
              </div>
            </div>
            <div style="margin-bottom:12px">
              <label style="font-size:11px;font-weight:700">Empleado</label>
              <select id="ref-empleado" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px">
                <option value="">— Selecciona —</option>
                ${optsEmp}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
              <div>
                <label style="font-size:11px;font-weight:700">Entrada</label>
                <input type="time" id="ref-entrada" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px" value="07:00">
              </div>
              <div>
                <label style="font-size:11px;font-weight:700">Salida</label>
                <input type="time" id="ref-salida" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px" value="11:00">
              </div>
            </div>
            <div id="ref-turno-fds" style="display:none;margin-bottom:12px">
              <label style="font-size:11px;font-weight:700">Turno FdS</label>
              <select id="ref-turno" style="width:100%;padding:6px;border:1px solid var(--border);border-radius:4px">
                <option value="SAB_M">Sábado Mañana</option>
                <option value="SAB_T">Sábado Tarde</option>
                <option value="DOM_M">Domingo Mañana</option>
                <option value="DOM_T">Domingo Tarde</option>
              </select>
            </div>
            <div id="ref-error" style="color:#c62828;font-size:11px;display:none"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn-success" data-action="ok">Añadir refuerzo</button>
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
        CalendarioUI.toast('Refuerzo añadido: ' + empleado, 'success');
        Modales._cerrarOverlay(overlay);
        resolve({ empleado, fecha, entrada, salida });
      };
    });
  }

});
