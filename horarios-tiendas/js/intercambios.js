// ============================================================
// HORARIOS KIRA & REYPIK — intercambios.js
// Intercambio puntual de turno entre dos empleados presentes
// (ninguno está ausente). No es una sustitución: es un swap
// mutuo en una fecha concreta.
//
// Entrada: { fecha, tienda, empleadoA, turnoA, empleadoB, turnoB, motivo }
//   - Para FdS: fecha = sábado del FdS. turnoA/turnoB ∈ {SAB_M, SAB_T, DOM_M, DOM_T}
//   - Para L-V: fecha = día concreto. turnoA = turnoB = 'LV'
//
// Efecto en el render: en el map crudo de rotación A queda en el
// hueco de B (con el horario original de B) y viceversa.
// ============================================================

'use strict';

const Intercambios = {

  // ── Consultas ──────────────────────────────────────────────

  /** Lista intercambios que afectan a una fecha+tienda (L-V: fecha exacta; FdS: sábado ancla). */
  _listarEn(fecha, tienda, esFds) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    const lista = Store.getIntercambios();
    const out = [];
    for (const i of lista) {
      if (i.tienda !== tienda) continue;
      if (i.fecha !== fs) continue;
      const deFds = i.turnoA !== 'LV';
      if (esFds !== deFds) continue;
      out.push(i);
    }
    return out;
  },

  // ── Aplicación sobre mapas de horarios ─────────────────────

  /** Swap L-V: horariosMap es { alias: [ent, sal] } de un día concreto.
   *  Intercambia los horarios de A y B preservando los de cada uno.
   */
  aplicarA(horariosMap, fecha, tienda) {
    const activos = Intercambios._listarEn(fecha, tienda, false);
    if (activos.length === 0) return horariosMap;
    const out = Object.assign({}, horariosMap);
    for (const i of activos) {
      const hA = out[i.empleadoA];
      const hB = out[i.empleadoB];
      if (!hA || !hB) continue; // uno de los dos no estaba en la rotación ese día
      out[i.empleadoA] = [...hB];
      out[i.empleadoB] = [...hA];
    }
    return out;
  },

  /** Swap FdS: resultFds es { SAB_M, SAB_T, DOM_M, DOM_T } con maps { alias: [ent, sal] }.
   *  Un intercambio mueve A del turnoA al turnoB (con el horario de turnoB original)
   *  y B del turnoB al turnoA (con el horario de turnoA original).
   */
  aplicarAFds(resultFds, fecha, tienda) {
    const activos = Intercambios._listarEn(fecha, tienda, true);
    if (activos.length === 0) return resultFds;
    const out = {
      SAB_M: Object.assign({}, resultFds.SAB_M || {}),
      SAB_T: Object.assign({}, resultFds.SAB_T || {}),
      DOM_M: Object.assign({}, resultFds.DOM_M || {}),
      DOM_T: Object.assign({}, resultFds.DOM_T || {})
    };
    for (const i of activos) {
      const mapA = out[i.turnoA]; const mapB = out[i.turnoB];
      if (!mapA || !mapB) continue;
      const hA = mapA[i.empleadoA]; const hB = mapB[i.empleadoB];
      if (!hA || !hB) continue;
      // A se va a turnoB con el horario del hueco de B
      delete mapA[i.empleadoA];
      mapB[i.empleadoA] = [...hB];
      // B se va a turnoA con el horario del hueco de A
      delete mapB[i.empleadoB];
      mapA[i.empleadoB] = [...hA];
    }
    return out;
  },

  // ── Búsqueda de candidatos para un intercambio ─────────────

  /** Candidatos L-V: otros empleados que trabajan ese día en esa tienda,
   *  distintos del propio empleado y que no estén ausentes.
   *  Devuelve [{ alias, entrada, salida }]
   */
  candidatosLV(empleado, fecha, tienda) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    const horarios = Rotaciones.getHorariosLV(
      typeof fecha === 'string' ? Utils.parseFecha(fecha) : fecha,
      tienda
    ) || {};
    const out = [];
    for (const alias in horarios) {
      if (alias === empleado) continue;
      if (Store.estaAusente(alias, fs, tienda)) continue;
      out.push({ alias, entrada: horarios[alias][0], salida: horarios[alias][1] });
    }
    out.sort((a, b) => a.entrada - b.entrada || a.alias.localeCompare(b.alias));
    return out;
  },

  /** Candidatos FdS: otros empleados del mismo FdS en cualquier turno,
   *  distintos del empleado y no ausentes.
   *  Devuelve [{ alias, turno, entrada, salida }]
   */
  candidatosFds(empleado, sabado, tienda) {
    const sab = typeof sabado === 'string' ? Utils.parseFecha(sabado) : sabado;
    const dom = new Date(sab.getTime() + 86400000);
    const fdsData = Rotaciones.getFds(sab, tienda) || {};
    const out = [];
    const turnos = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
    for (const t of turnos) {
      const fechaDia = t.startsWith('SAB_') ? sab : dom;
      const fsDia = Utils.formatFecha(fechaDia);
      const mapa = fdsData[t] || {};
      for (const alias in mapa) {
        if (alias === empleado) continue;
        if (Store.estaAusente(alias, fsDia, tienda)) continue;
        out.push({ alias, turno: t, entrada: mapa[alias][0], salida: mapa[alias][1] });
      }
    }
    out.sort((a, b) => a.turno.localeCompare(b.turno) || a.alias.localeCompare(b.alias));
    return out;
  },

  // ── CRUD ───────────────────────────────────────────────────

  /** Añadir un intercambio. No valida: la UI debe evitar duplicados. */
  add(i) {
    Store._state.intercambios.push(i);
    Store._emit('intercambios', Store._state.intercambios);
    Store._emit('cambioVista');
  },

  remove(idx) {
    Store._state.intercambios.splice(idx, 1);
    Store._emit('intercambios', Store._state.intercambios);
    Store._emit('cambioVista');
  },

  /** Busca un intercambio que afecte a `empleado` en esa fecha/tienda/turno.
   *  Para L-V pasa turno='LV'; para FdS pasa el turno del hueco actual.
   *  Devuelve { idx, intercambio } o null.
   */
  getActivoPara(empleado, fecha, tienda, turno) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    const lista = Store.getIntercambios();
    // Para FdS, un intercambio SAB_T↔DOM_M se ancla a la fecha del sábado.
    // La búsqueda debe admitir que fecha sea cualquiera de los dos días del FdS.
    for (let k = 0; k < lista.length; k++) {
      const i = lista[k];
      if (i.tienda !== tienda) continue;
      const esFds = i.turnoA !== 'LV';
      if (esFds) {
        const sab = Utils.parseFecha(i.fecha);
        const dom = new Date(sab.getTime() + 86400000);
        const fsSab = i.fecha;
        const fsDom = Utils.formatFecha(dom);
        if (fs !== fsSab && fs !== fsDom) continue;
      } else {
        if (i.fecha !== fs) continue;
      }
      if (i.empleadoA === empleado || i.empleadoB === empleado) {
        return { idx: k, intercambio: i };
      }
    }
    return null;
  }
};
