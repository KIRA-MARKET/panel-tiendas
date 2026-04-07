// ============================================================
// YOLANDA HP — calendario-ui.js
// Renderizado del calendario (HTML seguro, sin innerHTML crudo)
// ============================================================

'use strict';

const CalendarioUI = {

  // ── Renderizar calendario completo ─────────────────────────

  render() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const mes = Store.getMes();
    const año = Store.getAño();
    const tienda = Store.getTienda();

    document.getElementById('mes-actual').textContent = Utils.MESES[mes] + ' ' + año;

    const ultimoDia = Utils.ultimoDiaMes(año, mes);
    const inicio = new Date(año, mes, 1);
    while (inicio.getDay() !== 1) inicio.setDate(inicio.getDate() - 1);

    let html = '<div class="week-view">';
    html += '<div class="week-header">';
    html += '<div class="col-sem">Sem</div>';
    html += '<div class="col-dia">Lun</div><div class="col-dia">Mar</div>';
    html += '<div class="col-dia">Mi\u00e9</div><div class="col-dia">Jue</div>';
    html += '<div class="col-dia">Vie</div><div class="col-fds">Fin de Semana</div>';
    html += '</div>';

    const fecha = new Date(inicio);
    while (fecha <= ultimoDia || fecha.getDay() !== 1) {
      const numSem = Utils.getNumSemana(fecha);

      html += '<div class="week-row">';
      html += '<div class="col-sem"><div class="num">' + numSem + '</div></div>';

      // L-V (5 días)
      for (let d = 0; d < 5; d++) {
        const dia = new Date(fecha);
        dia.setDate(dia.getDate() + d);
        const esDelMes = dia.getMonth() === mes;

        const horarios = Rotaciones.getHorariosLV(dia, tienda);
        html += '<div class="col-dia" style="' + (esDelMes ? '' : 'opacity:0.4') + '">';
        html += '<div class="dia-num">' + dia.getDate() + '</div>';
        html += CalendarioUI._renderTurnosLV(dia, horarios, tienda);
        html += CalendarioUI._renderAvisosLV(dia, tienda);
        html += '</div>';
      }

      // FdS
      const sab = new Date(fecha); sab.setDate(sab.getDate() + 5);
      const dom = new Date(fecha); dom.setDate(dom.getDate() + 6);
      const esDelMesFds = sab.getMonth() === mes || dom.getMonth() === mes;
      const fdsData = Rotaciones.getFds(sab, tienda);

      html += '<div class="col-fds" style="' + (esDelMesFds ? '' : 'opacity:0.4') + '">';
      html += CalendarioUI._renderFdsBox(sab, fdsData.SAB_M || {}, 'SAB_M', 'sab-m', 'S\u00e1b ' + sab.getDate() + ' Ma\u00f1ana', tienda);
      html += CalendarioUI._renderFdsBox(dom, fdsData.DOM_M || {}, 'DOM_M', 'dom-m', 'Dom ' + dom.getDate() + ' Ma\u00f1ana', tienda);
      html += CalendarioUI._renderFdsBox(sab, fdsData.SAB_T || {}, 'SAB_T', 'sab-t', 'S\u00e1b ' + sab.getDate() + ' Tarde', tienda);
      html += CalendarioUI._renderFdsBox(dom, fdsData.DOM_T || {}, 'DOM_T', 'dom-t', 'Dom ' + dom.getDate() + ' Tarde', tienda);
      html += '</div>'; // col-fds

      html += '</div>'; // week-row

      fecha.setDate(fecha.getDate() + 7);
      if (fecha > ultimoDia && fecha.getMonth() !== mes) break;
    }

    html += '</div>'; // week-view
    container.innerHTML = html;
  },

  // ── Turnos L-V ─────────────────────────────────────────────

  _renderTurnosLV(dia, horarios, tienda) {
    if (!horarios) return '';

    const horariosAj = Rotaciones.aplicarModificaciones(horarios, dia, tienda);
    const fs = Utils.formatFecha(dia);

    const franjas = { descarga: [], mañanas: [], tardes: [], cierre: [] };

    for (const n in horariosAj) {
      const h = horariosAj[n];
      const fr = Utils.getFranja(h[0], h[1], tienda);
      const aus = Store.estaAusente(n, fs, tienda);
      const sust = Store.getSustituto(fs, n, tienda);
      const tieneModificacion = Store.getModificacion(n, fs, tienda, '') !== null;

      // Si este empleado está sustituyendo a otro y los turnos se SOLAPAN,
      // no aparece en su franja base (cambio de turno, ej: CAROLINA).
      // Si NO se solapan (consecutivos, ej: EDU comodín), sí aparece en ambas.
      if (CalendarioUI._sustituyeSolapado(n, fs, tienda, h)) {
        continue;
      }

      franjas[fr].push({
        nombre: n, e: h[0], s: h[1],
        ausente: aus, sustData: sust, modificado: tieneModificacion
      });
    }

    const esIsabel = tienda === 'isabel';
    const gridClass = esIsabel ? 'franjas-grid-is' : 'franjas-grid-gv';
    let html = '<div class="' + gridClass + '">';

    const orden = ['descarga', 'mañanas', 'tardes', 'cierre'];
    for (const fr of orden) {
      const t = franjas[fr];
      if (!esIsabel && t.length === 0) continue;

      html += '<div class="franja"><div class="franja-label ' + fr + '">' + fr + '</div>';
      for (const turno of t) {
        const cls = 'turno ' + fr +
          (turno.ausente ? ' ausente' : '') +
          (turno.modificado ? ' modificado' : '');

        const nombreSafe = Utils.escapeHtml(turno.nombre);
        const modIcon = turno.modificado ? ' \u270e' : '';

        html += '<div class="' + cls + '" data-emp="' + nombreSafe + '" data-fecha="' + fs + '" data-entrada="' + turno.e + '" data-salida="' + turno.s + '" data-franja="' + fr + '">';
        html += '<span class="turno-nombre">' + nombreSafe + modIcon + '</span>';
        html += '<span class="turno-hora">' + Utils.formatHora(turno.e) + '-' + Utils.formatHora(turno.s) + '</span>';
        html += '</div>';

        if (turno.sustData) {
          const sustSafe = Utils.escapeHtml(turno.sustData.sustituto);
          html += '<div class="turno sustituto">';
          html += '<span class="turno-nombre">\u2192 ' + sustSafe + '</span>';
          html += '<span class="turno-hora">' + Utils.formatHora(turno.sustData.entrada) + '-' + Utils.formatHora(turno.sustData.salida) + '</span>';
          html += '</div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  // ── Helper: ¿este empleado sustituye solapando con su turno base? ──

  /**
   * Devuelve true si el empleado está sustituyendo a otro en esta tienda
   * y el horario de la sustitución SOLAPA con su turno base [horarioBase].
   *
   * Si solapan → es un cambio de turno (CAROLINA) → no debe aparecer en franja base
   * Si NO solapan → es comodín (EDU) → puede aparecer en ambas franjas
   */
  _sustituyeSolapado(empleado, fechaStr, tienda, horarioBase) {
    const susts = Store.getSustituciones();
    for (const s of susts) {
      if (s.sustituto !== empleado || s.fecha !== fechaStr || s.turnoFds) continue;
      // Verificar solapamiento (cualquier tienda — si solapa con su turno base, no puede estar)
      const seSolapan = !(s.salida <= horarioBase[0] || horarioBase[1] <= s.entrada);
      if (seSolapan) return true;
    }
    return false;
  },

  /**
   * Versión FdS: ¿el empleado sustituye en otro turno FdS distinto al actual?
   */
  _sustituyeFdsSolapado(empleado, fechaStr, tienda, turnoActual) {
    const susts = Store.getSustituciones();
    for (const s of susts) {
      if (s.sustituto !== empleado || s.fecha !== fechaStr || s.tienda !== tienda) continue;
      if (!s.turnoFds || s.turnoFds === turnoActual) continue;
      return true;
    }
    return false;
  },

  // ── FdS box ────────────────────────────────────────────────

  _renderFdsBox(dia, horarios, turnoKey, cssClass, titulo, tienda) {
    let html = '<div class="fds-box ' + cssClass + '">';
    html += '<div class="fds-header">' + titulo + '</div>';

    const horariosAj = Rotaciones.aplicarModificacionesFds(horarios, dia, turnoKey, tienda);
    const fs = Utils.formatFecha(dia);

    for (const n in horariosAj) {
      const h = horariosAj[n];
      const aus = Store.estaAusente(n, fs, tienda);
      const sust = Store.getSustituto(fs, n, tienda, turnoKey);
      const tieneModificacion = Store.getModificacion(n, fs, tienda, turnoKey) !== null;

      // Si está sustituyendo en otro turno FdS, no aparecer en este
      if (CalendarioUI._sustituyeFdsSolapado(n, fs, tienda, turnoKey)) {
        continue;
      }

      const nombreSafe = Utils.escapeHtml(n);
      const cls = 'turno fds' + (aus ? ' ausente' : '') + (tieneModificacion ? ' modificado' : '');
      const modIcon = tieneModificacion ? ' \u270e' : '';

      html += '<div class="' + cls + '" data-emp="' + nombreSafe + '" data-fecha="' + fs + '" data-entrada="' + h[0] + '" data-salida="' + h[1] + '" data-turno-fds="' + turnoKey + '">';
      html += '<span class="turno-nombre">' + nombreSafe + modIcon + '</span>';
      html += '<span class="turno-hora">' + Utils.formatHora(h[0]) + '-' + Utils.formatHora(h[1]) + '</span>';
      html += '</div>';

      if (sust) {
        const sustSafe = Utils.escapeHtml(sust.sustituto);
        html += '<div class="turno sustituto">';
        html += '<span class="turno-nombre">\u2192 ' + sustSafe + '</span>';
        html += '<span class="turno-hora">' + Utils.formatHora(sust.entrada) + '-' + Utils.formatHora(sust.salida) + '</span>';
        html += '</div>';
      }
    }

    html += '</div>';
    return html;
  },

  // ── Avisos L-V ─────────────────────────────────────────────

  _renderAvisosLV(dia, tienda) {
    let html = '';

    // Alertas de mínimos
    const alertasMin = Cobertura.verificarMinimosLV(dia, tienda);
    if (alertasMin.length > 0) {
      const detalles = alertasMin.map(a =>
        a.franja.toUpperCase() + ': ' + a.actual + '/' + a.minimo
      ).join(' · ');
      html += '<div class="aviso-minimos" title="' + Utils.escapeHtml(detalles) + '">\u26a0 Bajo m\u00edn: ' + Utils.escapeHtml(detalles) + '</div>';
    }

    // Turnos sin cubrir
    const sinCubrir = Cobertura.detectarSinCubrir(dia, tienda);
    for (const tc of sinCubrir) {
      if (tc.turnoFds) continue; // Solo L-V aquí
      const cls = tc.descartado
        ? 'aviso-sin-cubrir descartado'
        : (tc.bajoMinimos ? 'aviso-sin-cubrir' : 'aviso-sin-cubrir ok-minimos');
      const icon = tc.descartado ? '\u25a1' : (tc.bajoMinimos ? '\ud83d\udd34' : '\ud83d\udfe0');
      const label = tc.descartado
        ? Utils.escapeHtml(tc.emp) + ' (no cubierto)'
        : Utils.escapeHtml(tc.emp) + ' sin cubrir';
      html += '<div class="' + cls + '">' + icon + ' ' + label + '</div>';
    }

    return html;
  },

  // ── Toast de confirmación ──────────────────────────────────

  toast(mensaje, tipo) {
    tipo = tipo || 'info';
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast ' + tipo;
    toast.textContent = mensaje;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};
