// ============================================================
// HORARIOS KIRA & REYPIK — hoy-ui.js
// Pestaña "Hoy": vista accionable de un vistazo con ausencias
// activas, sustituciones del día, alertas de cobertura y próximos
// festivos. Pensada para mañana en el coche o medio minuto al abrir.
// ============================================================

'use strict';

const HoyUI = {

  /** Render principal */
  render() {
    const cont = document.getElementById('tab-hoy');
    if (!cont) return;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fs = Utils.formatFecha(hoy);
    const dow = hoy.getDay();

    let html = '';
    html += '<div class="control-header"><div class="control-nav">';
    html += '<h2>Hoy · ' + Utils.escapeHtml(Utils.DIAS_LARGO[dow]) + ' '
         +  hoy.getDate() + ' ' + Utils.escapeHtml(Utils.MESES[hoy.getMonth()]) + ' ' + hoy.getFullYear()
         +  '</h2>';
    html += '</div></div>';

    html += HoyUI._seccionAusencias(fs);
    html += HoyUI._seccionSustituciones(fs);
    html += HoyUI._seccionAlertas(hoy);
    html += HoyUI._seccionFestivos(hoy);

    cont.innerHTML = html;
  },

  // ── Ausencias activas hoy (ambas tiendas) ──────────────────
  _seccionAusencias(fs) {
    const filas = [];
    for (const tienda of ['granvia', 'isabel']) {
      const ausencias = Store.getAusencias(tienda) || [];
      for (const a of ausencias) {
        if (a.desde > fs || a.hasta < fs) continue;
        const sust = Store.getSustituto(fs, a.empleado, tienda);
        const tieneSust = !!sust;
        filas.push({ tienda, ausencia: a, sustituto: sust, tieneSust });
      }
    }
    if (filas.length === 0) {
      return HoyUI._bloque('Ausencias activas hoy', '<p class="empty" style="color:var(--text-muted);font-size:12px">Sin ausencias activas en ninguna tienda. ✓</p>');
    }
    let body = '<ul class="audit-list">';
    for (const f of filas) {
      const tk = f.tienda === 'granvia' ? 'GV' : 'IS';
      const tipo = Ausencias.getTipoLabel(f.ausencia.tipo);
      const rango = Utils.formatFechaES(f.ausencia.desde) + ' — ' + Utils.formatFechaES(f.ausencia.hasta);
      const subInfo = f.tieneSust
        ? ' · sustituye <strong>' + Utils.escapeHtml(f.sustituto.sustituto) + '</strong> ('
          + Utils.formatHora(f.sustituto.entrada) + '-' + Utils.formatHora(f.sustituto.salida) + ')'
        : ' · <span style="color:var(--err);font-weight:600">sin sustituto</span>';
      body += '<li><strong>' + tk + '</strong> · ' + Utils.escapeHtml(f.ausencia.empleado)
            + ' · ' + Utils.escapeHtml(tipo) + ' · ' + Utils.escapeHtml(rango)
            + subInfo + '</li>';
    }
    body += '</ul>';
    return HoyUI._bloque('Ausencias activas hoy (' + filas.length + ')', body);
  },

  // ── Sustituciones del día ──────────────────────────────────
  _seccionSustituciones(fs) {
    const susts = (Store.getSustituciones() || []).filter(s => s.fecha === fs);
    if (susts.length === 0) {
      return HoyUI._bloque('Sustituciones hoy', '<p class="empty" style="color:var(--text-muted);font-size:12px">No hay sustituciones registradas hoy.</p>');
    }
    let body = '<ul class="audit-list">';
    for (const s of susts) {
      const tk = s.tienda === 'granvia' ? 'GV' : 'IS';
      const tipo = s.tipo === 'extra' ? ' <span style="color:var(--warn)">(extra)</span>' : '';
      const turnoLabel = s.turnoFds || s.franja;
      body += '<li><strong>' + tk + '</strong> · '
            + '<strong>' + Utils.escapeHtml(s.sustituto) + '</strong> sustituye a '
            + Utils.escapeHtml(s.ausente) + ' · '
            + (turnoLabel ? Utils.escapeHtml(turnoLabel) + ' · ' : '')
            + Utils.formatHora(s.entrada) + '-' + Utils.formatHora(s.salida) + tipo + '</li>';
    }
    body += '</ul>';
    return HoyUI._bloque('Sustituciones hoy (' + susts.length + ')', body);
  },

  // ── Alertas de cobertura del día ──────────────────────────
  _seccionAlertas(fecha) {
    const dow = fecha.getDay();
    const items = [];
    for (const tienda of ['granvia', 'isabel']) {
      const alertas = (dow >= 1 && dow <= 5)
        ? Cobertura.verificarMinimosLV(fecha, tienda)
        : Cobertura.verificarMinimosFds(fecha, tienda);
      for (const a of alertas) {
        items.push({ tienda, alerta: a });
      }
    }
    if (items.length === 0) {
      return HoyUI._bloque('Cobertura hoy', '<p class="empty" style="color:var(--text-muted);font-size:12px">Mínimos cubiertos en ambas tiendas. ✓</p>');
    }
    let body = '<ul class="audit-list">';
    for (const it of items) {
      const tk = it.tienda === 'granvia' ? 'GV' : 'IS';
      const a = it.alerta;
      body += '<li style="color:var(--err)"><strong>' + tk + '</strong> · '
            + Utils.escapeHtml(a.franja) + ' ' + a.actual + '/' + a.minimo
            + ' (faltan ' + a.falta + ')'
            + (a.detalle ? ' · ' + Utils.escapeHtml(a.detalle) : '')
            + '</li>';
    }
    body += '</ul>';
    return HoyUI._bloque('Cobertura hoy (' + items.length + ' alertas)', body);
  },

  // ── Próximos festivos (7 días) ────────────────────────────
  _seccionFestivos(hoy) {
    if (typeof Festivos === 'undefined') return '';
    Festivos.asegurarAño(hoy.getFullYear());
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 7);
    const fsHoy = Utils.formatFecha(hoy);
    const fsLim = Utils.formatFecha(limite);
    const proximos = Festivos.getAño(hoy.getFullYear())
      .filter(f => f.fecha >= fsHoy && f.fecha <= fsLim);
    if (proximos.length === 0) {
      return HoyUI._bloque('Próximos festivos (7 días)',
        '<p class="empty" style="color:var(--text-muted);font-size:12px">Ninguno en los próximos 7 días.</p>');
    }
    let body = '<ul class="audit-list">';
    for (const f of proximos) {
      const fec = Utils.parseFecha(f.fecha);
      const insGV = (f.inscritos.granvia || []).length;
      const asgGV = (f.asignados.granvia || []).length;
      const insIS = (f.inscritos.isabel || []).length;
      const asgIS = (f.asignados.isabel || []).length;
      const sinGV = asgGV === 0 ? ' <span style="color:var(--warn)">GV sin asignar</span>' : '';
      const sinIS = asgIS === 0 ? ' <span style="color:var(--warn)">IS sin asignar</span>' : '';
      body += '<li>' + Utils.formatFechaES(f.fecha) + ' · '
            + '<strong>' + Utils.escapeHtml(f.nombre) + '</strong> · '
            + 'GV ' + asgGV + '/' + insGV + ' · IS ' + asgIS + '/' + insIS
            + sinGV + sinIS + '</li>';
    }
    body += '</ul>';
    return HoyUI._bloque('Próximos festivos (' + proximos.length + ')', body);
  },

  // ── Helper: bloque de sección ─────────────────────────────
  _bloque(titulo, html) {
    return '<div class="audit-section" style="margin-bottom:18px">'
         + '<h4 class="audit-titulo" style="border-color:var(--border-strong,var(--border));color:var(--text-secondary)">'
         + Utils.escapeHtml(titulo) + '</h4>'
         + html + '</div>';
  }
};
