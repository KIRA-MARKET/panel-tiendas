// ============================================================
// HORARIOS KIRA & REYPIK — rotaciones.js
// Motor de rotaciones inmutables con fecha de referencia configurable
// ============================================================

'use strict';

const Rotaciones = {

  // ── Horarios L-V ───────────────────────────────────────────

  /** Obtener horarios L-V de Gran Vía para una fecha */
  getHorariosGV(fecha) {
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return {};
    const semAB = Utils.getSemanaAB(fecha);
    const horariosBase = Store.get('horariosGV');
    return horariosBase[semAB][dow === 5 ? 'V' : 'LJ'] || {};
  },

  /** Obtener horarios L-V de Isabel para una fecha */
  getHorariosIS(fecha) {
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return {};

    // Desde Sheets
    const sheetsIS = Store.get('sheetsHorariosIS');
    if (sheetsIS) {
      const horarios = {};
      for (const fijo of sheetsIS.fijos) {
        if (Utils.matchDia(fijo.dia, dow)) {
          horarios[fijo.empleado] = [fijo.entrada, fijo.salida];
        }
      }
      // Rotación L-V
      const rot = Rotaciones._getRotacionIsabelLV(fecha);
      horarios[rot.mañana] = [10, 14.5];
      horarios[rot.tarde] = [15, 19.5];
      horarios[rot.cierre] = [17.75, 22.25];
      return horarios;
    }

    // Fallback hardcoded
    const rot = Rotaciones._getRotacionIsabelLV(fecha);
    const horarios = {};

    // Compartidos con días específicos
    if (dow === 1 || dow === 3 || dow === 5) horarios['DAVID'] = [11, 15];
    if (dow === 2 || dow === 4 || dow === 5) horarios['LETI'] = [11, 15];
    if (dow === 1 || dow === 3 || dow === 5) horarios['EDU'] = [6, 10];

    horarios['VANESA'] = (dow === 1 || dow === 3 || dow === 5) ? [6, 10] : [7, 10];
    horarios['SILVIA'] = [7, 10];
    horarios['ANTONIO'] = [10, 13];
    horarios['ABDEL'] = [14.5, 17.5];
    horarios['ALEX'] = [14.75, 17.75];
    horarios['MORILLA'] = (dow === 5) ? [18.25, 22.25] : [18.75, 22.25];

    // ABEL lunes, ANDREA el resto (acuerdo, no restricción)
    if (dow === 1) {
      horarios['ABEL'] = [18.25, 22.25];
    } else {
      horarios['ANDREA'] = [18.25, 22.25];
    }

    // Rotación Carolina/Alvaro/Ceci
    horarios[rot.mañana] = [10, 14.5];
    horarios[rot.tarde] = [15, 19.5];
    horarios[rot.cierre] = [17.75, 22.25];

    return horarios;
  },

  /** Obtener horarios L-V según tienda (aplica reemplazos de slot e intercambios). */
  getHorariosLV(fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const crudo = tienda === 'granvia'
      ? Rotaciones.getHorariosGV(fecha)
      : Rotaciones.getHorariosIS(fecha);
    let res = (typeof Reemplazos !== 'undefined')
      ? Reemplazos.aplicarA(crudo, fecha, tienda)
      : crudo;
    if (typeof Intercambios !== 'undefined') {
      res = Intercambios.aplicarA(res, fecha, tienda);
    }
    return res;
  },

  // ── Rotación Isabel L-V (ciclo 4) ─────────────────────────

  _getRotacionIsabelLV(fecha) {
    const cfg = CONFIG.ROTACIONES.lv_isabel;
    const numSem = Utils.getNumSemana(fecha);
    const semIdx = ((numSem - cfg.semana_referencia + cfg.indice_referencia) % cfg.ciclo + cfg.ciclo) % cfg.ciclo;
    return cfg.rotacion[semIdx];
  },

  // ── FdS Gran Vía ───────────────────────────────────────────

  getFdsGV(fecha) {
    const cfgDesc = CONFIG.ROTACIONES.descarga_gv;
    const cfgRot7 = CONFIG.ROTACIONES.fds_gv;
    const sheetsFds = Store.get('sheetsFdsGV');

    // Índice de semana para rotación 7 — usar diferencia en días UTC para que
    // el cambio DST (marzo/octubre) no desalinee sábado y domingo de la misma
    // semana (hacía que sábado=fi-1 y domingo=fi tras el salto de hora).
    const inicioFecha = sheetsFds && sheetsFds.fecha_inicio
      ? Utils.parseFecha(sheetsFds.fecha_inicio)
      : Utils.parseFecha(cfgRot7.fecha_inicio);
    const fi = Rotaciones._semanasEntre(inicioFecha, fecha);
    const fiNorm = ((fi % 21) + 21) % 21;

    // Índice para descarga ABC (referencia 18 abril 2026)
    const inicioABC = Utils.parseFecha(cfgDesc.fecha_inicio);
    let fiABC = Rotaciones._semanasEntre(inicioABC, fecha);
    if (fiABC < 0) fiABC = ((fiABC % 3) + 3) % 3;

    const result = { SAB_M: {}, SAB_T: {}, DOM_M: {}, DOM_T: {} };

    if (sheetsFds) {
      // Fijos desde Sheets
      for (const f of sheetsFds.fijos) {
        result[f.turno][f.emp] = [f.entrada, f.salida];
      }
      // Descarga ABC
      const dOrden = cfgDesc.orden;
      const dH = sheetsFds.descarga.horarios;
      for (let i = 0; i < dOrden.length; i++) {
        const turno = Rotaciones._getTurnoABC(i, fiABC);
        const h = dH[turno] || CONFIG.HORARIO_FDS_TARDE;
        result[turno][dOrden[i]] = h;
      }
      // Rotación 7
      const rOrden = sheetsFds.rotacion7.orden.length > 0 ? sheetsFds.rotacion7.orden : cfgRot7.orden;
      const rH = sheetsFds.rotacion7.horarios;
      for (let i = 0; i < rOrden.length; i++) {
        const turno = Rotaciones._getTurnoRotacion7(i, fiNorm);
        const h = rH[turno] || CONFIG.HORARIO_FDS_TARDE;
        result[turno][rOrden[i]] = h;
      }
    } else {
      // Fallback hardcoded — Fijos
      const fijos = CONFIG.FIJOS_FDS_GV;
      for (const emp in fijos) {
        const f = fijos[emp];
        if (f.turnos) {
          for (const t of f.turnos) result[t][emp] = [f.entrada, f.salida];
        } else {
          result[f.turno][emp] = [f.entrada, f.salida];
        }
      }

      // Descarga ABC
      for (let i = 0; i < cfgDesc.orden.length; i++) {
        const emp = cfgDesc.orden[i];
        const turno = Rotaciones._getTurnoABC(i, fiABC);
        if (turno === 'SAB_M') result.SAB_M[emp] = [5, 12.5];
        else if (turno === 'DOM_T') result.DOM_T[emp] = CONFIG.HORARIO_FDS_TARDE;
        else result.SAB_T[emp] = CONFIG.HORARIO_FDS_TARDE;
      }

      // Rotación 7
      for (let i = 0; i < cfgRot7.orden.length; i++) {
        const emp = cfgRot7.orden[i];
        const turno = Rotaciones._getTurnoRotacion7(i, fiNorm);
        if (turno === 'SAB_M') result.SAB_M[emp] = CONFIG.HORARIO_FDS_MAÑANA;
        else if (turno === 'DOM_M') result.DOM_M[emp] = CONFIG.HORARIO_FDS_MAÑANA;
        else if (turno === 'DOM_T') result.DOM_T[emp] = CONFIG.HORARIO_FDS_TARDE;
        else result.SAB_T[emp] = CONFIG.HORARIO_FDS_TARDE;
      }
    }

    return result;
  },

  // ── FdS Isabel ─────────────────────────────────────────────

  getFdsIS(fecha) {
    const cfgIS = CONFIG.ROTACIONES.fds_isabel;
    const sheetsFds = Store.get('sheetsFdsIS');
    const inicioFecha = sheetsFds && sheetsFds.fecha_inicio
      ? Utils.parseFecha(sheetsFds.fecha_inicio)
      : Utils.parseFecha(cfgIS.fecha_inicio);

    const fechaNorm = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const diffDias = Math.round((fechaNorm - inicioFecha) / (24 * 60 * 60 * 1000));

    if (sheetsFds) {
      const gA = sheetsFds.grupoA;
      const gB = sheetsFds.grupoB;
      const cicloA = Object.keys(gA.semanas).length || 8;
      const cicloB = Object.keys(gB.semanas).length || 8;
      let semIdxA = Math.floor(diffDias / 7) % cicloA;
      if (semIdxA < 0) semIdxA = ((semIdxA % cicloA) + cicloA) % cicloA;
      let semIdxB = Math.floor(diffDias / 7) % cicloB;
      if (semIdxB < 0) semIdxB = ((semIdxB % cicloB) + cicloB) % cicloB;

      const result = { SAB_M: {}, SAB_T: {}, DOM_M: {}, DOM_T: {} };
      const hM_A = gA.horario_m || CONFIG.HORARIO_FDS_MAÑANA;
      const hT_A = gA.horario_t || CONFIG.HORARIO_FDS_TARDE;
      const hM_B = gB.horario_m || CONFIG.HORARIO_FDS_MAÑANA;
      const hT_B = gB.horario_t || CONFIG.HORARIO_FDS_TARDE;

      // Grupo A
      const semA = gA.semanas['sem' + (semIdxA + 1)];
      if (semA) {
        const turnos = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
        for (const t of turnos) {
          const emp = semA[t];
          if (emp) {
            const h = t.includes('_M') ? hM_A : hT_A;
            if (typeof emp === 'string') result[t][emp] = h;
          }
        }
      }

      // Grupo B
      const semB = gB.semanas['sem' + (semIdxB + 1)];
      if (semB) {
        const turnos = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
        for (const t of turnos) {
          const emps = semB[t];
          if (emps) {
            const h = t.includes('_M') ? hM_B : hT_B;
            if (typeof emps === 'string') result[t][emps] = h;
            else if (Array.isArray(emps)) {
              for (const e of emps) result[t][e] = h;
            }
          }
        }
      }
      return result;
    }

    // Fallback hardcoded
    let semIdx = Math.floor(diffDias / 7) % 8;
    if (semIdx < 0) semIdx = ((semIdx % 8) + 8) % 8;

    const rotA = cfgIS.grupoA.semanas[semIdx];
    const rotB = cfgIS.grupoB.semanas[semIdx];
    const result = { SAB_M: {}, SAB_T: {}, DOM_M: {}, DOM_T: {} };

    // Grupo A
    result.SAB_M[rotA.SAB_M] = CONFIG.HORARIO_FDS_MAÑANA;
    result.SAB_T[rotA.SAB_T] = CONFIG.HORARIO_FDS_TARDE;
    result.DOM_M[rotA.DOM_M] = CONFIG.HORARIO_FDS_MAÑANA;
    result.DOM_T[rotA.DOM_T] = CONFIG.HORARIO_FDS_TARDE;

    // Grupo B
    const turnos = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
    for (const t of turnos) {
      const emps = rotB[t];
      const h = t.includes('_M') ? CONFIG.HORARIO_FDS_MAÑANA : CONFIG.HORARIO_FDS_TARDE;
      if (Array.isArray(emps)) {
        for (const e of emps) result[t][e] = h;
      }
    }

    return result;
  },

  /** Obtener FdS según tienda (aplica reemplazos de slot e intercambios). */
  getFds(fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const crudo = tienda === 'granvia'
      ? Rotaciones.getFdsGV(fecha)
      : Rotaciones.getFdsIS(fecha);
    let res = (typeof Reemplazos !== 'undefined')
      ? Reemplazos.aplicarAFds(crudo, fecha, tienda)
      : crudo;
    if (typeof Intercambios !== 'undefined') {
      // El intercambio FdS se ancla al sábado del FdS.
      const d = typeof fecha === 'string' ? Utils.parseFecha(fecha) : fecha;
      const dow = d.getDay(); // 0=dom, 6=sab
      const sab = dow === 0 ? new Date(d.getTime() - 86400000) : d;
      res = Intercambios.aplicarAFds(res, sab, tienda);
    }
    return res;
  },

  // ── Helpers de rotación ────────────────────────────────────

  /** Diferencia en semanas entre dos fechas, DST-safe.
   *  Usa días UTC para que el salto de horario no desalinee sábado y domingo
   *  de la misma semana (bug que hacía que sábado devolviera fi-1 y domingo fi
   *  después del cambio de hora de primavera/otoño).
   */
  _semanasEntre(inicio, fin) {
    const toDayNum = (d) => Math.floor(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000
    );
    return Math.floor((toDayNum(fin) - toDayNum(inicio)) / 7);
  },

  /** Turno en rotación de 7 (FdS GV) */
  _getTurnoRotacion7(empIndex, fi) {
    // pos 0,1=SAB_M | 2,3=DOM_M | 4,5=DOM_T | 6=SAB_T
    const pos = (fi + empIndex * 6) % 7;
    if (pos <= 1) return 'SAB_M';
    if (pos <= 3) return 'DOM_M';
    if (pos <= 5) return 'DOM_T';
    return 'SAB_T';
  },

  /** Turno en rotación ABC (descarga GV) */
  _getTurnoABC(empIndex, fi) {
    // Ciclo 3: SAB_M(descarga) -> DOM_T -> SAB_T
    const pos = (fi + empIndex * 2) % 3;
    if (pos === 0) return 'SAB_M';
    if (pos === 1) return 'DOM_T';
    return 'SAB_T';
  },

  // ── Aplicar modificaciones de horario ──────────────────────

  /** Aplicar modificaciones puntuales a horarios L-V */
  aplicarModificaciones(horarios, fecha, tienda) {
    const fs = Utils.formatFecha(fecha);
    tienda = tienda || Store.getTienda();
    const resultado = {};
    for (const emp in horarios) {
      resultado[emp] = [...horarios[emp]];
      const mod = Store.getModificacion(emp, fs, tienda, '');
      if (mod) {
        resultado[emp] = [mod.nuevaEntrada, mod.nuevaSalida];
      }
    }
    return resultado;
  },

  /** Aplicar modificaciones puntuales a horarios FdS */
  aplicarModificacionesFds(horarios, fecha, turnoKey, tienda) {
    const fs = Utils.formatFecha(fecha);
    tienda = tienda || Store.getTienda();
    const resultado = {};
    for (const emp in horarios) {
      resultado[emp] = [...horarios[emp]];
      const mod = Store.getModificacion(emp, fs, tienda, turnoKey);
      if (mod) {
        resultado[emp] = [mod.nuevaEntrada, mod.nuevaSalida];
      }
    }
    return resultado;
  }
};
