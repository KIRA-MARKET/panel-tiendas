// ============================================================
// HORARIOS KIRA & REYPIK — reemplazos.js
// Un alias es ocupado por otro en un rango de fechas, con los
// mismos horarios del slot original. Cubre dos casos:
//  - Baja definitiva con relevo (hasta = null/'').
//  - Baja médica con sustituto temporal (hasta acotado).
// ============================================================

'use strict';

const Reemplazos = {

  // ── Activación de empleados por fecha ──────────────────────

  /** ¿El empleado está operativo en esta fecha? Considera fechaAlta/fechaBaja.
   *  Si no tenemos registro del empleado en el Store, asumimos activo
   *  (no filtrar): la rotación puede referenciar un alias aunque la
   *  plantilla no esté cargada, y no queremos que desaparezca por eso.
   */
  estaActivo(alias, fecha, tienda) {
    const emp = Store.getEmpleado(alias, tienda);
    if (!emp) return true;
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    if (emp.fechaAlta && fs < emp.fechaAlta) return false;
    if (emp.fechaBaja && fs > emp.fechaBaja) return false;
    return true;
  },

  // ── Consulta de reemplazos ─────────────────────────────────

  /** Reemplazo aplicable a un alias en una fecha y tienda. Null si ninguno. */
  getActivoEn(alias, fecha, tienda) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    const lista = Store.getReemplazos();
    // Último que entra en rango gana (permite encadenar: Juan→Pedro→Luis).
    let match = null;
    for (const r of lista) {
      if (r.tienda !== tienda) continue;
      if (r.aliasOriginal !== alias) continue;
      if (r.desde && fs < r.desde) continue;
      if (r.hasta && r.hasta !== '' && fs > r.hasta) continue;
      if (!match || r.desde > match.desde) match = r;
    }
    return match;
  },

  /** Alias efectivo que ocupa el slot de `alias` en la fecha. Resuelve cadena. */
  aliasEfectivo(alias, fecha, tienda) {
    let actual = alias;
    const visitados = new Set();
    for (let i = 0; i < 10; i++) {
      if (visitados.has(actual)) break; // anti-ciclo
      visitados.add(actual);
      const r = Reemplazos.getActivoEn(actual, fecha, tienda);
      if (!r) return actual;
      actual = r.aliasNuevo;
    }
    return actual;
  },

  // ── Aplicación sobre mapas de horarios ─────────────────────

  /** Devuelve una copia del map { alias: [ent, sal] } con:
   *   - Empleados inactivos (fuera de fechaAlta/fechaBaja) eliminados.
   *   - Alias remapeados al efectivo según la tabla de reemplazos.
   *   - Si el alias efectivo tampoco está activo esa fecha, se elimina.
   */
  aplicarA(horariosMap, fecha, tienda) {
    const resultado = {};
    for (const alias in horariosMap) {
      const efectivo = Reemplazos.aliasEfectivo(alias, fecha, tienda);
      // El alias original puede estar de baja; solo importa el efectivo.
      if (!Reemplazos.estaActivo(efectivo, fecha, tienda)) continue;
      resultado[efectivo] = [...horariosMap[alias]];
    }
    return resultado;
  },

  /** Igual que aplicarA pero sobre la estructura de FdS: { SAB_M, SAB_T, DOM_M, DOM_T } */
  aplicarAFds(resultFds, fecha, tienda) {
    const out = { SAB_M: {}, SAB_T: {}, DOM_M: {}, DOM_T: {} };
    for (const turno in out) {
      out[turno] = Reemplazos.aplicarA(resultFds[turno] || {}, fecha, tienda);
    }
    return out;
  },

  // ── CRUD (las llamadas a sync se añadirán con la UI) ───────

  add(reemplazo) {
    Store._state.reemplazos.push(reemplazo);
    Store._emit('reemplazos', Store._state.reemplazos);
    Store._emit('cambioVista');
  },

  remove(indice) {
    Store._state.reemplazos.splice(indice, 1);
    Store._emit('reemplazos', Store._state.reemplazos);
    Store._emit('cambioVista');
  },

  /** Reemplazos activos en una fecha (útil para UI). */
  listarActivos(fecha, tienda) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    return Store.getReemplazos().filter(r => {
      if (tienda && r.tienda !== tienda) return false;
      if (r.desde && fs < r.desde) return false;
      if (r.hasta && r.hasta !== '' && fs > r.hasta) return false;
      return true;
    });
  }
};
