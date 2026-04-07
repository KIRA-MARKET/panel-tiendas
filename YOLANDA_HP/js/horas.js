// ============================================================
// YOLANDA HP — horas.js
// Tab Horas: resumen mensual de horas trabajadas por empleado
// (rotación habitual + modificaciones + sustituciones - ausencias)
// ============================================================

'use strict';

const HorasUI = {

  _tienda: null, // null = usar Store.getTienda()

  /**
   * Calcula totales del mes para una tienda.
   * Devuelve { alias: { rotacion, sustituciones, total, dias } }
   */
  calcularMes(año, mes, tienda) {
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    const totales = {};

    const ensure = (alias) => {
      if (!totales[alias]) totales[alias] = { alias, lv: 0, fds: 0, sustituciones: 0, total: 0, dias: 0, semanasLV: 0 };
      return totales[alias];
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

    // Esperado = rotación pura (L-V + FdS, sin extras, sin faltas).
    // Total real = esperado + extras − faltas (de momento faltas = 0).
    // Diff = total − esperado = extras − faltas. Siempre 0 si no hay anomalías.
    for (const alias in totales) {
      const r = totales[alias];
      r.esperado = r.lv + r.fds;
      r.total = r.esperado + r.sustituciones; // pendiente: − r.faltasHoras
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

    const año = Store.getAño();
    const mes = Store.getMes();
    const tiendaSel = HorasUI._tienda || Store.getTienda();

    const { totales, diasMes } = HorasUI.calcularMes(año, mes, tiendaSel);
    const filas = Object.values(totales).sort((a, b) => a.alias.localeCompare(b.alias));

    let html = '';
    html += '<div class="control-header">';
    html += '  <div class="control-nav">';
    html += '    <h2>Horas — ' + Utils.escapeHtml(Utils.MESES[mes]) + ' ' + año + '</h2>';
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
    html += '<th>Extra</th><th>Total real</th><th>Diff</th><th>Cobra mes</th>';
    html += '</tr></thead><tbody>';

    if (filas.length === 0) {
      html += '<tr><td colspan="8" class="empty" style="text-align:center;padding:24px">Sin datos</td></tr>';
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
        html += '<td><strong>' + r.total.toFixed(1) + ' h</strong></td>';
        html += '<td class="' + diffCls + '">' + diffTxt + '</td>';
        html += '<td><span class="sub">' + r.cobraMes.toFixed(1) + ' h (' + r.contrato + ' h/sem)</span></td>';
        html += '</tr>';
      }
    }
    html += '</tbody></table>';
    html += '</div>';

    html += '<p class="control-nota"><b>Esperado</b> = horas que la rotación da en el mes (suma de L-V + FdS). <b>Extra</b> = solo sustituciones marcadas como tipo extra. <b>Diff = Total − Esperado</b>: vale 0,00 cuando no hay extras ni faltas. <b>Cobra mes</b> es informativo: contrato × ' + diasMes + ' días / 7 (mensualidad fija). Vacaciones, permisos y bajas cuentan como tiempo trabajado.</p>';

    cont.innerHTML = html;
  },

  setTienda(t) {
    HorasUI._tienda = t;
    HorasUI.render();
  }
};
