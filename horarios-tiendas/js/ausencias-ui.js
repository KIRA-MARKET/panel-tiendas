// ============================================================
// HORARIOS KIRA & REYPIK — ausencias-ui.js
// Tab Ausencias: lista cronológica con alta y cancelación
// ============================================================

'use strict';

const AusenciasUI = {

  _tienda: null,    // null = tienda actual
  _filtroTipo: '',  // '' = todos
  _filtroEmp: '',   // '' = todos

  render() {
    const cont = document.getElementById('tab-ausencias');
    if (!cont) return;

    const tiendaSel = AusenciasUI._tienda || Store.getTienda();
    const todas = Ausencias.listar(tiendaSel);
    const hoy = Utils.formatFecha(new Date());

    // Filtros
    let filas = todas;
    if (AusenciasUI._filtroTipo) filas = filas.filter(a => a.tipo === AusenciasUI._filtroTipo);
    if (AusenciasUI._filtroEmp) filas = filas.filter(a => a.empleado === AusenciasUI._filtroEmp);

    // Aliases para filtro de empleado
    const empleadosTienda = Store.getEmpleadosTienda(tiendaSel) || {};
    const aliases = Object.keys(empleadosTienda).sort();

    let html = '';
    html += '<div class="control-header">';
    html += '  <div class="control-nav"><h2>Ausencias — ' + (tiendaSel === 'granvia' ? 'Gran Vía' : 'Isabel') + '</h2></div>';
    html += '  <div class="control-filtro">';
    for (const t of [['granvia', 'Gran Vía'], ['isabel', 'Isabel']]) {
      const cls = 'btn ' + (tiendaSel === t[0] ? 'btn-primary' : 'btn-secondary');
      html += '<button class="' + cls + '" onclick="AusenciasUI.setTienda(\'' + t[0] + '\')">' + t[1] + '</button>';
    }
    html += '    <button class="btn btn-success" onclick="AusenciasUI.nueva()">+ Nueva ausencia</button>';
    html += '  </div>';
    html += '</div>';

    // Filtros adicionales
    html += '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">';
    html += '<select onchange="AusenciasUI.setFiltroTipo(this.value)" style="padding:6px 10px;border-radius:4px;border:1px solid var(--border)">';
    html += '<option value="">Todos los tipos</option>';
    for (const t of Ausencias.TIPOS) {
      const sel = AusenciasUI._filtroTipo === t.value ? ' selected' : '';
      html += '<option value="' + t.value + '"' + sel + '>' + t.icon + ' ' + t.label + '</option>';
    }
    html += '</select>';
    html += '<select onchange="AusenciasUI.setFiltroEmp(this.value)" style="padding:6px 10px;border-radius:4px;border:1px solid var(--border)">';
    html += '<option value="">Todos los empleados</option>';
    for (const a of aliases) {
      const sel = AusenciasUI._filtroEmp === a ? ' selected' : '';
      html += '<option value="' + Utils.escapeHtml(a) + '"' + sel + '>' + Utils.escapeHtml(a) + '</option>';
    }
    html += '</select>';
    if (AusenciasUI._filtroTipo || AusenciasUI._filtroEmp) {
      html += '<button class="btn btn-secondary" onclick="AusenciasUI.limpiarFiltros()">Limpiar filtros</button>';
    }
    html += '</div>';

    html += '<div class="control-tabla-wrap">';
    html += '<table class="control-tabla">';
    html += '<thead><tr>';
    html += '<th>Empleado</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Estado</th><th>Motivo</th><th></th>';
    html += '</tr></thead><tbody>';

    if (filas.length === 0) {
      html += '<tr><td colspan="8" class="empty" style="text-align:center;padding:24px">Sin ausencias</td></tr>';
    } else {
      for (const a of filas) {
        const dias = Utils.contarDiasNaturales ? Utils.contarDiasNaturales(a.desde, a.hasta) : '—';
        let estado, estadoCls;
        if (a.hasta < hoy) { estado = 'Pasada'; estadoCls = 'sub'; }
        else if (a.desde > hoy) { estado = 'Futura'; estadoCls = 'val-warn'; }
        else { estado = 'En curso'; estadoCls = 'val-err'; }

        html += '<tr>';
        html += '<td><strong>' + Utils.escapeHtml(a.empleado) + '</strong></td>';
        html += '<td>' + Utils.escapeHtml(Ausencias.getTipoLabel(a.tipo)) + '</td>';
        html += '<td>' + Utils.escapeHtml(Utils.formatFechaES ? Utils.formatFechaES(a.desde) : a.desde) + '</td>';
        html += '<td>' + Utils.escapeHtml(Utils.formatFechaES ? Utils.formatFechaES(a.hasta) : a.hasta) + '</td>';
        html += '<td>' + dias + '</td>';
        html += '<td class="' + estadoCls + '">' + estado + '</td>';
        html += '<td><span class="sub">' + Utils.escapeHtml(a.motivo || '—') + '</span></td>';
        html += '<td style="white-space:nowrap">';
        html += '<button class="btn btn-primary" style="padding:4px 10px;font-size:11px;margin-right:4px" onclick="AusenciasUI.editar(' + a._index + ')">Editar</button>';
        html += '<button class="btn btn-secondary" style="padding:4px 10px;font-size:11px" onclick="AusenciasUI.cancelar(' + a._index + ')">Cancelar</button>';
        html += '</td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table>';
    html += '</div>';

    html += '<p class="control-nota">' + filas.length + ' ausencia(s)' + (filas.length !== todas.length ? ' (filtrado de ' + todas.length + ')' : '') + '. Cancelar elimina la ausencia y sus sustituciones asociadas SOLO de ese empleado.</p>';

    cont.innerHTML = html;
  },

  setTienda(t) { AusenciasUI._tienda = t; AusenciasUI._filtroEmp = ''; AusenciasUI.render(); },
  setFiltroTipo(v) { AusenciasUI._filtroTipo = v; AusenciasUI.render(); },
  setFiltroEmp(v) { AusenciasUI._filtroEmp = v; AusenciasUI.render(); },
  limpiarFiltros() { AusenciasUI._filtroTipo = ''; AusenciasUI._filtroEmp = ''; AusenciasUI.render(); },

  nueva() {
    Modales.nuevaAusencia().then(() => AusenciasUI.render());
  },

  editar(index) {
    const tienda = AusenciasUI._tienda || Store.getTienda();
    Modales.editarAusencia(tienda, index).then(res => {
      if (res) AusenciasUI.render();
    });
  },

  cancelar(index) {
    const tienda = AusenciasUI._tienda || Store.getTienda();
    const aus = Store.getAusencias(tienda)[index];
    if (!aus) return;
    Modales.confirmar(
      '¿Seguro que quieres cancelar la ausencia de ' + aus.empleado + ' (' + aus.tipo + ')? Se borrarán también sus sustituciones asociadas.',
      'Cancelar ausencia'
    ).then(ok => {
      if (!ok) return;
      const r = Ausencias.cancelar(tienda, index);
      if (r.ok) {
        CalendarioUI.toast && CalendarioUI.toast('Ausencia cancelada', 'success');
        AusenciasUI.render();
      }
    });
  }
};
