// ============================================================
// HORARIOS KIRA & REYPIK — calendario-ui.js
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

    // Asegurar que los festivos del año están cargados
    if (typeof Festivos !== 'undefined') Festivos.asegurarAño(año);

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

        // Festivo: propio del día O trasladado del domingo anterior (si es lunes)
        let esFestivo = typeof Festivos !== 'undefined' && Festivos.esFestivo(dia);
        let festivoData = esFestivo ? Store.getFestivos().find(f => f.fecha === Utils.formatFecha(dia)) : null;
        if (!esFestivo && dia.getDay() === 1 && typeof Festivos !== 'undefined') {
          // Lunes: comprobar si el domingo anterior era festivo (se traslada)
          const domAnterior = new Date(dia); domAnterior.setDate(domAnterior.getDate() - 1);
          if (Festivos.esFestivo(domAnterior)) {
            esFestivo = true;
            festivoData = Store.getFestivos().find(f => f.fecha === Utils.formatFecha(domAnterior));
          }
        }
        const clsDia = 'col-dia' + (esFestivo ? ' festivo' : '');
        html += '<div class="' + clsDia + '" style="' + (esDelMes ? '' : 'opacity:0.4') + '">';
        html += '<div class="dia-num"><span class="dia-nombre">' + Utils.DIAS[dia.getDay()] + '</span>' + dia.getDate() + '</div>';
        if (esFestivo) {
          const festivoNombre = festivoData ? Utils.escapeHtml(festivoData.nombre) : 'Festivo';
          html += '<div class="dia-festivo-label">' + festivoNombre + '</div>';
          if (festivoData) {
            const asig = festivoData.asignados[tienda] || [];
            if (asig.length > 0) {
              const porTurno = { descarga: [], 'mañanas': [], tardes: [] };
              for (const a of asig) {
                const t = typeof a === 'string' ? 'mañanas' : (a.turno || 'mañanas');
                if (porTurno[t]) porTurno[t].push(a);
              }
              const esIsabel = tienda === 'isabel';
              const gridClass = esIsabel ? 'franjas-grid-is' : 'franjas-grid-gv';
              html += '<div class="' + gridClass + '" style="flex:1;justify-content:space-between">';
              for (const tk in porTurno) {
                if (porTurno[tk].length === 0 && !esIsabel) continue;
                const tf = CONFIG.TURNOS_FESTIVO[tk];
                html += '<div class="franja"><div class="franja-label ' + tk + '">' + tk + '</div>';
                for (const a of porTurno[tk]) {
                  const emp = typeof a === 'string' ? a : a.empleado;
                  const entrada = typeof a === 'string' ? tf.entrada : a.entrada;
                  const salida = typeof a === 'string' ? tf.salida : a.salida;
                  html += '<div class="turno ' + tk + '">';
                  html += '<span class="turno-nombre">' + Utils.escapeHtml(emp) + '</span>';
                  html += '<span class="turno-hora">' + Utils.formatHora(entrada) + '-' + Utils.formatHora(salida) + '</span>';
                  html += '</div>';
                }
                html += '</div>';
              }
              html += '</div>';
            } else {
              html += '<div style="text-align:center;font-size:9px;color:var(--text-muted);flex:1;display:flex;align-items:center;justify-content:center">Sin asignaciones</div>';
            }
          }
        } else {
          const horarios = Rotaciones.getHorariosLV(dia, tienda);
          html += CalendarioUI._renderTurnosLV(dia, horarios, tienda);
          html += CalendarioUI._renderAvisosLV(dia, tienda);
        }
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
        const intActivoLV = typeof Intercambios !== 'undefined'
          ? Intercambios.getActivoPara(turno.nombre, fs, tienda, 'LV') : null;
        const intIconLV = intActivoLV ? ' \u{1F504}' : '';
        const intTitleLV = intActivoLV
          ? ' title="Intercambio con ' + Utils.escapeHtml(intActivoLV.intercambio.empleadoA === turno.nombre ? intActivoLV.intercambio.empleadoB : intActivoLV.intercambio.empleadoA) + '"'
          : '';

        html += '<div class="' + cls + '" data-emp="' + nombreSafe + '" data-fecha="' + fs + '" data-entrada="' + turno.e + '" data-salida="' + turno.s + '" data-franja="' + fr + '"' + intTitleLV + '>';
        html += '<span class="turno-nombre">' + nombreSafe + modIcon + intIconLV + '</span>';
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
      // Refuerzos (tipo extra, sin ausente) en esta franja
      const susts = Store.getSustituciones();
      for (const s of susts) {
        if (s.fecha !== fs || s.tienda !== tienda || s.turnoFds || !s.tipo || s.tipo !== 'extra' || s.ausente) continue;
        const sFr = Utils.getFranja(s.entrada, s.salida, tienda);
        if (sFr !== fr) continue;
        const refSafe = Utils.escapeHtml(s.sustituto);
        html += '<div class="turno sustituto" style="border-left:3px solid #2e7d32">';
        html += '<span class="turno-nombre">+ ' + refSafe + '</span>';
        html += '<span class="turno-hora">' + Utils.formatHora(s.entrada) + '-' + Utils.formatHora(s.salida) + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  // ── Helper: ¿este empleado sustituye solapando con su turno base? ──

  /**
   * Devuelve true si el empleado está sustituyendo a otro y debe
   * desaparecer de su franja base en ESTA tienda.
   *
   * tipo='movimiento' (default) → desaparece de su posición en la tienda del sub
   * tipo='extra' → solo desaparece si los horarios se solapan
   */
  _sustituyeSolapado(empleado, fechaStr, tienda, horarioBase) {
    const susts = Store.getSustituciones();
    for (const s of susts) {
      if (s.sustituto !== empleado || s.fecha !== fechaStr || s.turnoFds) continue;
      // Solo afecta a la tienda donde sustituye (ABDEL sub en GV no desaparece de Isabel)
      if (s.tienda !== tienda) continue;
      // Movimiento: se mueve, desaparece de su posición original
      if (!s.tipo || s.tipo === 'movimiento') return true;
      // Extra: solo desaparece si los horarios se solapan
      const seSolapan = !(s.salida <= horarioBase[0] || horarioBase[1] <= s.entrada);
      if (seSolapan) return true;
    }
    return false;
  },

  /**
   * Versión FdS: ¿el empleado sustituye en otro turno FdS y debe
   * desaparecer de su turno actual?
   *
   * tipo='movimiento' → desaparece del turno base (se mueve a otro turno)
   * tipo='extra' → se queda en ambos (trabaja doble)
   */
  _sustituyeFdsSolapado(empleado, fechaStr, tienda, turnoActual) {
    const susts = Store.getSustituciones();

    // Calcular el otro día del fin de semana (SAB↔DOM)
    const fecha = Utils.parseFecha(fechaStr);
    const dow = fecha.getDay();
    let otroDiaStr = null;
    if (dow === 6) { // Sábado → Domingo
      const dom = new Date(fecha); dom.setDate(dom.getDate() + 1);
      otroDiaStr = Utils.formatFecha(dom);
    } else if (dow === 0) { // Domingo → Sábado
      const sab = new Date(fecha); sab.setDate(sab.getDate() - 1);
      otroDiaStr = Utils.formatFecha(sab);
    }

    for (const s of susts) {
      if (s.sustituto !== empleado || s.tienda !== tienda) continue;

      // ── Mismo día: turno diferente → ocultar (movimiento) ──
      if (s.fecha === fechaStr) {
        if (s.turnoFds === turnoActual) continue; // mismo turno → se queda
        if (!s.tipo || s.tipo === 'movimiento') return true;
        continue;
      }

      // ── Otro día del FdS: solo ocultar si el empleado NO tiene turno
      //    base ese día (= es rotación, solo trabaja 1 turno/FdS) ──
      if (otroDiaStr && s.fecha === otroDiaStr) {
        if (!s.tipo || s.tipo === 'movimiento') {
          // ¿Tiene turno base el día de la sustitución?
          const subFecha = Utils.parseFecha(s.fecha);
          const subDow = subFecha.getDay();
          const fdsData = Rotaciones.getFds(subDow === 0 ? new Date(subFecha.getTime() - 86400000) : subFecha, tienda);
          const turnosMismoDia = subDow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
          let tieneBaseMismoDia = false;
          for (const tk of turnosMismoDia) {
            if (fdsData[tk] && fdsData[tk][empleado]) { tieneBaseMismoDia = true; break; }
          }
          // Sin turno base ese día → la sub reemplaza su turno del FdS → ocultar
          if (!tieneBaseMismoDia) return true;
        }
      }
    }
    return false;
  },

  // ── FdS box ────────────────────────────────────────────────

  _renderFdsBox(dia, horarios, turnoKey, cssClass, titulo, tienda) {
    // Festivo en sábado: marcar en rojo sin empleados (domingo se traslada a lunes)
    const esSab = dia.getDay() === 6;
    const esFestivoFds = esSab && typeof Festivos !== 'undefined' && Festivos.esFestivo(dia);

    if (esFestivoFds) {
      const festivoData = Store.getFestivos().find(f => f.fecha === Utils.formatFecha(dia));
      let html = '<div class="fds-box ' + cssClass + ' festivo-fds">';
      html += '<div class="fds-header festivo-fds-header">' + titulo + '</div>';
      html += '<div class="dia-festivo-label" style="margin:12px 4px">FESTIVO</div>';
      if (festivoData) html += '<div style="text-align:center;font-size:11px;font-weight:600" class="festivo-nombre-fds">' + Utils.escapeHtml(festivoData.nombre) + '</div>';
      html += '</div>';
      return html;
    }

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
      const intActivoFds = typeof Intercambios !== 'undefined'
        ? Intercambios.getActivoPara(n, fs, tienda, turnoKey) : null;
      const intIconFds = intActivoFds ? ' \u{1F504}' : '';
      const intTitleFds = intActivoFds
        ? ' title="Intercambio con ' + Utils.escapeHtml(intActivoFds.intercambio.empleadoA === n ? intActivoFds.intercambio.empleadoB : intActivoFds.intercambio.empleadoA) + '"'
        : '';

      html += '<div class="' + cls + '" data-emp="' + nombreSafe + '" data-fecha="' + fs + '" data-entrada="' + h[0] + '" data-salida="' + h[1] + '" data-turno-fds="' + turnoKey + '"' + intTitleFds + '>';
      html += '<span class="turno-nombre">' + nombreSafe + modIcon + intIconFds + '</span>';
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

    // Refuerzos FdS (tipo extra, sin ausente)
    const sustsFds = Store.getSustituciones();
    for (const s of sustsFds) {
      if (s.fecha !== fs || s.tienda !== tienda || s.turnoFds !== turnoKey || s.tipo !== 'extra' || s.ausente) continue;
      const refSafe = Utils.escapeHtml(s.sustituto);
      html += '<div class="turno sustituto" style="border-left:3px solid #2e7d32">';
      html += '<span class="turno-nombre">+ ' + refSafe + '</span>';
      html += '<span class="turno-hora">' + Utils.formatHora(s.entrada) + '-' + Utils.formatHora(s.salida) + '</span>';
      html += '</div>';
    }

    // Avisos de mínimos FdS
    const alertasFds = Cobertura.verificarMinimosTurnoFds(dia, turnoKey, tienda);
    if (alertasFds.length > 0) {
      const detalles = alertasFds.map(a =>
        a.franja.toUpperCase() + ': ' + a.actual + '/' + a.minimo
      ).join(' · ');
      html += '<div class="aviso-minimos" title="' + Utils.escapeHtml(detalles) + '">\u26a0 ' + Utils.escapeHtml(detalles) + '</div>';
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
      const detalles = alertasMin.map(a => {
        let txt = a.franja.toUpperCase() + ': ' + a.actual + '/' + a.minimo;
        if (a.detalle) txt += ' [' + a.detalle + ']';
        return txt;
      }).join(' · ');
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
