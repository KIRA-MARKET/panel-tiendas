// ============================================================
// HORARIOS KIRA & REYPIK — control.js
// Tab Control: vacaciones consumidas, permisos, asuntos, bajas,
// faltas y festivos trabajados por empleado/año
// ============================================================

'use strict';

const ControlUI = {

  _añoActual: null,
  _tiendaActual: 'todas',

  /** Días naturales que caen dentro del año dado para una ausencia */
  _diasEnAño(aus, año) {
    if (!aus.desde || !aus.hasta) return 0;
    const d = Utils.parseFecha(aus.desde);
    const h = Utils.parseFecha(aus.hasta);
    const inicioAño = new Date(año, 0, 1);
    const finAño = new Date(año, 11, 31);
    const ini = d < inicioAño ? inicioAño : d;
    const fin = h > finAño ? finAño : h;
    if (ini > fin) return 0;
    let count = 0;
    const c = new Date(ini);
    while (c <= fin) { count++; c.setDate(c.getDate() + 1); }
    return count;
  },

  /** Calcular resumen por empleado de una tienda */
  calcularResumen(tienda, año) {
    const empleados = Store.getEmpleadosTienda(tienda);
    const ausencias = Store.getAusencias(tienda);
    const faltas = Store.getFaltas(tienda) || [];
    const recuentoFest = Festivos.recuentoTrabajados(año);

    const resumen = {};
    for (const alias in empleados) {
      resumen[alias] = {
        alias,
        tienda,
        vacaciones: 0,
        permiso: 0,
        asuntos: 0,
        baja: 0,
        otros: 0,
        faltas: 0,
        festivos: (recuentoFest[alias] && recuentoFest[alias].total) || 0
      };
    }

    for (const aus of ausencias) {
      if (!resumen[aus.empleado]) {
        resumen[aus.empleado] = {
          alias: aus.empleado, tienda,
          vacaciones: 0, permiso: 0, asuntos: 0, baja: 0, otros: 0, faltas: 0,
          festivos: (recuentoFest[aus.empleado] && recuentoFest[aus.empleado].total) || 0
        };
      }
      const dias = ControlUI._diasEnAño(aus, año);
      const tipo = (aus.tipo || '').toLowerCase();
      if (tipo === 'vacaciones') resumen[aus.empleado].vacaciones += dias;
      else if (tipo === 'permiso') resumen[aus.empleado].permiso += dias;
      else if (tipo === 'asuntos') resumen[aus.empleado].asuntos += dias;
      else if (tipo === 'baja') resumen[aus.empleado].baja += dias;
      else resumen[aus.empleado].otros += dias;
    }

    for (const f of faltas) {
      if (!f.fecha || !f.fecha.startsWith(año + '-')) continue;
      if (!resumen[f.empleado]) continue;
      resumen[f.empleado].faltas++;
    }

    return resumen;
  },

  render() {
    const cont = document.getElementById('tab-control');
    if (!cont) return;

    const año = ControlUI._añoActual || Store.getAño();
    ControlUI._añoActual = año;
    const tiendaSel = ControlUI._tiendaActual;
    const maxVac = CONFIG.DIAS_VACACIONES_ANUALES;

    const resGV = ControlUI.calcularResumen('granvia', año);
    const resIS = ControlUI.calcularResumen('isabel', año);

    let filas = [];
    if (tiendaSel === 'todas' || tiendaSel === 'granvia') {
      filas = filas.concat(Object.values(resGV));
    }
    if (tiendaSel === 'todas' || tiendaSel === 'isabel') {
      filas = filas.concat(Object.values(resIS));
    }
    filas.sort((a, b) => a.alias.localeCompare(b.alias));

    let html = '';
    html += '<div class="control-header">';
    html += '  <div class="control-nav">';
    html += '    <button class="btn btn-secondary" onclick="ControlUI.cambiarAño(-1)">‹</button>';
    html += '    <h2>Control ' + año + '</h2>';
    html += '    <button class="btn btn-secondary" onclick="ControlUI.cambiarAño(1)">›</button>';
    html += '  </div>';
    html += '  <div class="control-filtro">';
    for (const t of [['todas','Todas'],['granvia','Gran Vía'],['isabel','Isabel']]) {
      const cls = 'btn ' + (tiendaSel === t[0] ? 'btn-primary' : 'btn-secondary');
      html += '<button class="' + cls + '" onclick="ControlUI.setTienda(\'' + t[0] + '\')">' + t[1] + '</button>';
    }
    html += '  </div>';
    html += '</div>';

    html += '<div class="control-tabla-wrap">';
    html += '<table class="control-tabla">';
    html += '<thead><tr>';
    html += '<th>Empleado</th><th>Tienda</th>';
    html += '<th>Vacaciones</th><th>Permiso</th><th>Asuntos</th><th>Baja</th><th>Faltas</th><th>Festivos trab.</th>';
    html += '</tr></thead><tbody>';

    if (filas.length === 0) {
      html += '<tr><td colspan="8" class="empty" style="text-align:center;padding:24px">Sin datos</td></tr>';
    } else {
      for (const r of filas) {
        const restante = maxVac - r.vacaciones;
        const vacCls = r.vacaciones > maxVac ? 'val-err' : (r.vacaciones >= maxVac * 0.8 ? 'val-warn' : '');
        const faltasCls = r.faltas > 0 ? 'val-err' : '';
        html += '<tr>';
        html += '<td><strong>' + Utils.escapeHtml(r.alias) + '</strong></td>';
        html += '<td><span class="badge-tienda badge-' + r.tienda + '">' + (r.tienda === 'granvia' ? 'GV' : 'IS') + '</span></td>';
        html += '<td class="' + vacCls + '">' + r.vacaciones + '/' + maxVac + ' <span class="sub">(' + (restante >= 0 ? restante : 0) + ' rest)</span></td>';
        html += '<td>' + r.permiso + '</td>';
        html += '<td>' + r.asuntos + '</td>';
        html += '<td>' + r.baja + '</td>';
        html += '<td class="' + faltasCls + '">' + r.faltas + '</td>';
        html += '<td>' + r.festivos + '</td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table>';
    html += '</div>';

    html += '<p class="control-nota">Vacaciones contadas en días naturales · ' + maxVac + ' días anuales por empleado.</p>';

    cont.innerHTML = html;
  },

  cambiarAño(delta) {
    ControlUI._añoActual = (ControlUI._añoActual || Store.getAño()) + delta;
    ControlUI.render();
  },

  setTienda(t) {
    ControlUI._tiendaActual = t;
    ControlUI.render();
  }
};
