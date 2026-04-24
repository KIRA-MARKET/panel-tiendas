// ============================================================
// HORARIOS KIRA & REYPIK — empleados-ui.js
// Tab Empleados: listado por tienda con datos de cada empleado
// ============================================================

'use strict';

const EmpleadosUI = {

  _tienda: null, // null = usar Store.getTienda()
  _mostrarArchivados: false,

  render() {
    const cont = document.getElementById('tab-empleados');
    if (!cont) return;

    const tiendaSel = EmpleadosUI._tienda || Store.getTienda();
    const empleados = Store.getEmpleadosTienda(tiendaSel) || {};
    const hoyStr = Utils.formatFecha(new Date());
    const todos = Object.values(empleados).sort((a, b) => a.alias.localeCompare(b.alias));
    const archivados = todos.filter(e => e.fechaBaja && e.fechaBaja < hoyStr);
    const filas = EmpleadosUI._mostrarArchivados
      ? todos
      : todos.filter(e => !(e.fechaBaja && e.fechaBaja < hoyStr));

    let html = '';
    html += '<div class="control-header">';
    html += '  <div class="control-nav"><h2>Empleados — ' + (tiendaSel === 'granvia' ? 'Gran Vía' : 'Isabel') + '</h2></div>';
    html += '  <div class="control-filtro">';
    for (const t of [['granvia', 'Gran Vía'], ['isabel', 'Isabel']]) {
      const cls = 'btn ' + (tiendaSel === t[0] ? 'btn-primary' : 'btn-secondary');
      html += '<button class="' + cls + '" onclick="EmpleadosUI.setTienda(\'' + t[0] + '\')">' + t[1] + '</button>';
    }
    html += '    <button class="btn btn-orange" onclick="EmpleadosUI.gestionarReemplazos()" style="margin-left:8px">Reemplazos</button>';
    html += '    <button class="btn btn-success" onclick="EmpleadosUI.nuevoEmpleado()" style="margin-left:4px">+ Empleado</button>';
    if (archivados.length > 0) {
      const lbl = EmpleadosUI._mostrarArchivados
        ? 'Ocultar archivados (' + archivados.length + ')'
        : 'Ver archivados (' + archivados.length + ')';
      html += '    <button class="btn btn-secondary" onclick="EmpleadosUI.toggleArchivados()" style="margin-left:4px">' + lbl + '</button>';
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
      const hoy = hoyStr;
      for (const e of filas) {
        const tiendaTxt = e.tienda === 'ambas' ? 'GV + IS' : (e.tienda === 'granvia' ? 'GV' : 'IS');
        const nombre = (e.nombre || '') + (e.apellidos ? ' ' + e.apellidos : '');
        const deBaja = e.fechaBaja && e.fechaBaja < hoy;
        const pendiente = e.fechaAlta && e.fechaAlta > hoy;
        const remp = !deBaja && typeof Reemplazos !== 'undefined'
          ? Reemplazos.getActivoEn(e.alias, hoy, tiendaSel) : null;
        let estadoTag = '';
        if (deBaja) {
          estadoTag = ' <span class="sub" style="color:#c62828">· baja definitiva ' + Utils.escapeHtml(e.fechaBaja) + '</span>';
        } else if (remp) {
          estadoTag = ' <span class="sub" style="color:#e65100">· baja temporal — cubre ' + Utils.escapeHtml(remp.aliasNuevo) + (remp.hasta ? ' hasta ' + Utils.escapeHtml(remp.hasta) : '') + '</span>';
        } else if (pendiente) {
          estadoTag = ' <span class="sub" style="color:#1565c0">· entra ' + Utils.escapeHtml(e.fechaAlta) + '</span>';
        }
        const rowOpacity = deBaja ? 0.55 : (remp ? 0.75 : 1);
        html += '<tr' + (rowOpacity < 1 ? ' style="opacity:' + rowOpacity + '"' : '') + '>';
        html += '<td><strong style="color:' + Utils.escapeHtml(e.color || '#333') + '">' + Utils.escapeHtml(e.alias) + '</strong>' + estadoTag + '</td>';
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

    const notaArch = archivados.length > 0 && !EmpleadosUI._mostrarArchivados
      ? ' · ' + archivados.length + ' archivado(s) ocultos (dados de baja)'
      : '';
    html += '<p class="control-nota">' + filas.length + ' empleados activos en ' + (tiendaSel === 'granvia' ? 'Gran Vía' : 'Isabel') + notaArch + '.</p>';

    cont.innerHTML = html;
  },

  setTienda(t) {
    EmpleadosUI._tienda = t;
    EmpleadosUI.render();
  },

  toggleArchivados() {
    EmpleadosUI._mostrarArchivados = !EmpleadosUI._mostrarArchivados;
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
  },

  gestionarReemplazos() {
    const tienda = EmpleadosUI._tienda || Store.getTienda();
    Modales.gestionarReemplazos(tienda).then(() => EmpleadosUI.render());
  },

  nuevoEmpleado() {
    const tienda = EmpleadosUI._tienda || Store.getTienda();
    Modales.nuevoEmpleado(tienda).then(creado => {
      if (creado) {
        if (CalendarioUI && CalendarioUI.toast) CalendarioUI.toast('Empleado creado: ' + creado.alias, 'success');
        EmpleadosUI.render();
      }
    });
  }
};
