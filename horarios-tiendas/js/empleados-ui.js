// ============================================================
// HORARIOS KIRA & REYPIK — empleados-ui.js
// Tab Empleados: listado por tienda con datos de cada empleado
// ============================================================

'use strict';

const EmpleadosUI = {

  _tienda: null, // null = usar Store.getTienda()

  render() {
    const cont = document.getElementById('tab-empleados');
    if (!cont) return;

    const tiendaSel = EmpleadosUI._tienda || Store.getTienda();
    const empleados = Store.getEmpleadosTienda(tiendaSel) || {};
    const filas = Object.values(empleados).sort((a, b) => a.alias.localeCompare(b.alias));

    let html = '';
    html += '<div class="control-header">';
    html += '  <div class="control-nav"><h2>Empleados — ' + (tiendaSel === 'granvia' ? 'Gran Vía' : 'Isabel') + '</h2></div>';
    html += '  <div class="control-filtro">';
    for (const t of [['granvia', 'Gran Vía'], ['isabel', 'Isabel']]) {
      const cls = 'btn ' + (tiendaSel === t[0] ? 'btn-primary' : 'btn-secondary');
      html += '<button class="' + cls + '" onclick="EmpleadosUI.setTienda(\'' + t[0] + '\')">' + t[1] + '</button>';
    }
    html += '  </div>';
    html += '</div>';

    html += '<div class="control-tabla-wrap">';
    html += '<table class="control-tabla">';
    html += '<thead><tr>';
    html += '<th>Alias</th><th>Nombre</th><th>Contrato</th><th>Franja</th>';
    html += '<th>Restricción</th><th>Tienda(s)</th><th>Teléfono</th><th></th>';
    html += '</tr></thead><tbody>';

    if (filas.length === 0) {
      html += '<tr><td colspan="8" class="empty" style="text-align:center;padding:24px">Sin empleados</td></tr>';
    } else {
      for (const e of filas) {
        const tiendaTxt = e.tienda === 'ambas' ? 'GV + IS' : (e.tienda === 'granvia' ? 'GV' : 'IS');
        const nombre = (e.nombre || '') + (e.apellidos ? ' ' + e.apellidos : '');
        html += '<tr>';
        html += '<td><strong style="color:' + Utils.escapeHtml(e.color || '#333') + '">' + Utils.escapeHtml(e.alias) + '</strong></td>';
        html += '<td>' + Utils.escapeHtml(nombre) + '</td>';
        html += '<td>' + (e.contrato || 0) + ' h/sem</td>';
        html += '<td>' + Utils.escapeHtml(e.franja || '—') + '</td>';
        html += '<td>' + (e.restriccion ? '<span class="sub">' + Utils.escapeHtml(e.restriccion) + '</span>' : '—') + '</td>';
        html += '<td>' + Utils.escapeHtml(tiendaTxt) + '</td>';
        html += '<td><span class="sub">' + Utils.escapeHtml(e.telefono || '—') + '</span></td>';
        html += '<td><button class="btn btn-secondary" style="padding:4px 10px;font-size:11px" onclick="EmpleadosUI.editar(\'' + Utils.escapeHtml(e.alias).replace(/'/g, "\\'") + '\')">Editar</button></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table>';
    html += '</div>';

    html += '<p class="control-nota">' + filas.length + ' empleados en ' + (tiendaSel === 'granvia' ? 'Gran Vía' : 'Isabel') + '. Los datos se cargan desde Sheets; la edición vive de momento en la hoja de cálculo.</p>';

    cont.innerHTML = html;
  },

  setTienda(t) {
    EmpleadosUI._tienda = t;
    EmpleadosUI.render();
  },

  editar(alias) {
    const tienda = EmpleadosUI._tienda || Store.getTienda();
    Modales.editarEmpleado(alias, tienda).then(actualizado => {
      if (actualizado) {
        if (CalendarioUI && CalendarioUI.toast) CalendarioUI.toast('Empleado actualizado: ' + actualizado.alias, 'success');
        EmpleadosUI.render();
      }
    });
  }
};
