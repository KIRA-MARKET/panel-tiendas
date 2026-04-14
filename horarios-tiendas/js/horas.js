// ============================================================
// HORARIOS KIRA & REYPIK — horas.js
// Tab Horas: resumen mensual de horas trabajadas por empleado
// (rotación habitual + modificaciones + sustituciones - ausencias)
// ============================================================

'use strict';

const HorasUI = {

  _tienda: null, // null = usar Store.getTienda()
  _mes: null,    // null = usar Store.getMes()
  _año: null,    // null = usar Store.getAño()

  /**
   * Calcula totales del mes para una tienda.
   * Devuelve { alias: { rotacion, sustituciones, total, dias } }
   */
  calcularMes(año, mes, tienda) {
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    const totales = {};

    const ensure = (alias) => {
      if (!totales[alias]) totales[alias] = { alias, lv: 0, fds: 0, sustituciones: 0, festivos: 0, faltasHoras: 0, total: 0, dias: 0, semanasLV: 0 };
      return totales[alias];
    };

    // Horas que un empleado tenía programadas en una fecha concreta
    // (para poder descontar faltas: una falta = pierde las horas del día).
    const horasProgramadasDia = (alias, fecha) => {
      const dow = fecha.getDay();
      const fs = Utils.formatFecha(fecha);
      if (dow >= 1 && dow <= 5) {
        const horarios = Rotaciones.getHorariosLV(fecha, tienda) || {};
        const base = horarios[alias];
        if (!base) return 0;
        const mod = Store.getModificacion(alias, fs, tienda, null);
        const h = mod ? [mod.nuevaEntrada, mod.nuevaSalida] : base;
        if (!h || typeof h[0] !== 'number' || typeof h[1] !== 'number') return 0;
        return Math.max(0, h[1] - h[0]);
      } else {
        const fdsData = Rotaciones.getFds(fecha, tienda) || {};
        const turnos = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
        let total = 0;
        for (const tk of turnos) {
          const turno = fdsData[tk] || {};
          const h = turno[alias];
          if (h && typeof h[0] === 'number' && typeof h[1] === 'number') {
            total += Math.max(0, h[1] - h[0]);
          }
        }
        return total;
      }
    };

    for (let d = 1; d <= ultimoDia; d++) {
      const fecha = new Date(año, mes, d);
      const fs = Utils.formatFecha(fecha);
      const dow = fecha.getDay();

      // ── L-V ──
      if (dow >= 1 && dow <= 5) {
        const horarios = Rotaciones.getHorariosLV(fecha, tienda) || {};
        for (const alias in horarios) {
          const base = horarios[alias];
          const mod = Store.getModificacion(alias, fs, tienda, null);
          const h = mod ? [mod.nuevaEntrada, mod.nuevaSalida] : base;
          if (!h || typeof h[0] !== 'number' || typeof h[1] !== 'number') continue;
          const horas = Math.max(0, h[1] - h[0]);

          // Las ausencias (vacaciones, permiso, baja) cuentan como
          // tiempo trabajado a efectos de cómputo de horas debidas:
          // el empleado tiene derecho a ellas.
          const r = ensure(alias);
          r.lv += horas;
          r.dias++;
        }
      }
      // ── FdS ──
      else {
        const fdsData = Rotaciones.getFds(fecha, tienda) || {};
        const turnos = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
        for (const tk of turnos) {
          const turno = fdsData[tk] || {};
          for (const alias in turno) {
            const h = turno[alias];
            if (!h || typeof h[0] !== 'number' || typeof h[1] !== 'number') continue;
            const horas = Math.max(0, h[1] - h[0]);

            // Ausencias también cuentan en FdS (mismo criterio)
            const r = ensure(alias);
            r.fds += horas;
            r.dias++;
          }
        }
      }
    }

    // Días naturales del mes — base para esperado mensual
    const diasMes = ultimoDia;

    // ── Sustituciones tipo 'extra' (suman a quien sustituye) ──
    // Las de tipo 'movimiento' (default) no suman: el empleado cubre
    // dentro de su turno habitual sin hacer horas adicionales.
    const susts = Store.getSustituciones();
    for (const s of susts) {
      if (s.tienda !== tienda) continue;
      if (s.tipo !== 'extra') continue;
      const f = Utils.parseFecha(s.fecha);
      if (!f || f.getMonth() !== mes || f.getFullYear() !== año) continue;
      const horas = Math.max(0, s.salida - s.entrada);
      const r = ensure(s.sustituto);
      r.sustituciones += horas;
    }

    // ── Horas de festivos trabajados ──
    if (typeof Festivos !== 'undefined') {
      Festivos.asegurarAño(año);
      const festivosMes = Store.getFestivos().filter(f => {
        const fd = Utils.parseFecha(f.fecha);
        return fd && fd.getMonth() === mes && fd.getFullYear() === año;
      });
      for (const f of festivosMes) {
        const asig = f.asignados[tienda] || [];
        for (const a of asig) {
          const emp = typeof a === 'string' ? a : a.empleado;
          const horas = typeof a === 'object' && a.entrada != null ? Math.max(0, a.salida - a.entrada) : 0;
          if (horas > 0) {
            const r = ensure(emp);
            r.festivos += horas;
          }
        }
      }
    }

    // ── Faltas del mes (descuentan horas) ──
    const faltas = Store.getFaltas(tienda) || [];
    for (const f of faltas) {
      if (!f.fecha) continue;
      const fd = Utils.parseFecha(f.fecha);
      if (!fd || fd.getMonth() !== mes || fd.getFullYear() !== año) continue;
      const horas = horasProgramadasDia(f.empleado, fd);
      if (horas > 0) {
        const r = ensure(f.empleado);
        r.faltasHoras += horas;
      }
    }

    // Esperado = rotación pura (L-V + FdS, sin extras, sin faltas).
    // Total real = esperado + extras − faltas.
    // Diff = total − esperado = extras − faltas. Siempre 0 si no hay anomalías.
    for (const alias in totales) {
      const r = totales[alias];
      r.esperado = r.lv + r.fds;
      r.total = r.esperado + r.sustituciones + r.festivos - r.faltasHoras;
      r.diff = r.total - r.esperado;
      const emp = Store.getEmpleado(alias, tienda);
      r.contrato = emp ? (emp.contrato || 0) : 0;
      // Mensualidad informativa: lo que el empleado cobra ese mes
      // (contrato semanal × días del mes / 7). No afecta a la diff.
      r.cobraMes = r.contrato * diasMes / 7;
    }

    return { totales, diasMes };
  },

  // ── Render ────────────────────────────────────────────────

  render() {
    const cont = document.getElementById('tab-horas');
    if (!cont) return;

    const año = HorasUI._año != null ? HorasUI._año : Store.getAño();
    const mes = HorasUI._mes != null ? HorasUI._mes : Store.getMes();
    const tiendaSel = HorasUI._tienda || Store.getTienda();

    const { totales, diasMes } = HorasUI.calcularMes(año, mes, tiendaSel);
    const filas = Object.values(totales).sort((a, b) => a.alias.localeCompare(b.alias));

    let html = '';
    html += '<div class="control-header">';
    html += '  <div class="control-nav">';
    html += '    <button class="btn btn-secondary" onclick="HorasUI.cambiarMes(-1)">\u2039</button>';
    html += '    <h2>Horas — ' + Utils.escapeHtml(Utils.MESES[mes]) + ' ' + año + '</h2>';
    html += '    <button class="btn btn-secondary" onclick="HorasUI.cambiarMes(1)">\u203a</button>';
    html += '  </div>';
    html += '  <div class="control-filtro">';
    for (const t of [['granvia','Gran Vía'],['isabel','Isabel']]) {
      const cls = 'btn ' + (tiendaSel === t[0] ? 'btn-primary' : 'btn-secondary');
      html += '<button class="' + cls + '" onclick="HorasUI.setTienda(\'' + t[0] + '\')">' + t[1] + '</button>';
    }
    html += '  </div>';
    html += '</div>';

    html += '<div class="control-tabla-wrap">';
    html += '<table class="control-tabla">';
    html += '<thead><tr>';
    html += '<th>Empleado</th><th>L-V</th><th>FdS</th><th>Esperado</th>';
    html += '<th>Extra</th><th>Festivos</th><th>Faltas</th><th>Total real</th><th>Diff</th><th>Cobra mes</th>';
    html += '</tr></thead><tbody>';

    if (filas.length === 0) {
      html += '<tr><td colspan="10" class="empty" style="text-align:center;padding:24px">Sin datos</td></tr>';
    } else {
      for (const r of filas) {
        const diffCls = r.diff > 0.01 ? 'val-warn' : (r.diff < -0.01 ? 'val-err' : '');
        const diffTxt = (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2) + ' h';
        html += '<tr>';
        html += '<td><strong>' + Utils.escapeHtml(r.alias) + '</strong></td>';
        html += '<td>' + r.lv.toFixed(1) + ' h</td>';
        html += '<td>' + r.fds.toFixed(1) + ' h</td>';
        html += '<td>' + r.esperado.toFixed(1) + ' h</td>';
        html += '<td>' + (r.sustituciones > 0 ? '+' + r.sustituciones.toFixed(1) + ' h' : '—') + '</td>';
        html += '<td style="color:#b71c1c">' + (r.festivos > 0 ? '+' + r.festivos.toFixed(1) + ' h' : '—') + '</td>';
        html += '<td class="' + (r.faltasHoras > 0 ? 'val-err' : '') + '">' + (r.faltasHoras > 0 ? '−' + r.faltasHoras.toFixed(1) + ' h' : '—') + '</td>';
        html += '<td><strong>' + r.total.toFixed(1) + ' h</strong></td>';
        html += '<td class="' + diffCls + '">' + diffTxt + '</td>';
        html += '<td><span class="sub">' + r.cobraMes.toFixed(1) + ' h (' + r.contrato + ' h/sem)</span></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table>';
    html += '</div>';

    html += '<p class="control-nota"><b>Esperado</b> = horas rotación (L-V + FdS). <b>Extra</b> = sustituciones tipo extra. <b>Festivos</b> = horas trabajadas en festivos (se pagan aparte). <b>Faltas</b> = horas perdidas. <b>Total = Esperado + Extra + Festivos − Faltas</b>. <b>Cobra mes</b> = contrato × ' + diasMes + ' días / 7.</p>';

    cont.innerHTML = html;
  },

  setTienda(t) {
    HorasUI._tienda = t;
    HorasUI.render();
  },

  cambiarMes(delta) {
    let año = HorasUI._año != null ? HorasUI._año : Store.getAño();
    let mes = HorasUI._mes != null ? HorasUI._mes : Store.getMes();
    mes += delta;
    if (mes < 0) { mes = 11; año--; }
    if (mes > 11) { mes = 0; año++; }
    HorasUI._mes = mes;
    HorasUI._año = año;
    HorasUI.render();
  }
};
