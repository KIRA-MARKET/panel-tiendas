// ============================================================
// HORARIOS KIRA & REYPIK — datos.js
// Store centralizado: estado de la app con eventos de cambio
// ============================================================

'use strict';

const Store = {

  // ── Estado interno ─────────────────────────────────────────
  _state: {
    tiendaActual: 'granvia',
    mesActual: new Date().getMonth(),
    añoActual: new Date().getFullYear(),

    // Datos de empleados (se sobreescriben al cargar de Sheets)
    empleadosGV: {},
    empleadosIS: {},

    // Horarios L-V Gran Vía (semana A y B)
    horariosGV: { A: { LJ: {}, V: {} }, B: { LJ: {}, V: {} } },

    // Horarios Isabel desde Sheets (null = usar fallback)
    sheetsHorariosIS: null,

    // Rotaciones FdS desde Sheets (null = usar fallback)
    sheetsFdsGV: null,
    sheetsFdsIS: null,

    // Datos operativos
    ausenciasGV: [],
    ausenciasIS: [],
    sustituciones: [],
    modificacionesHorario: [],
    faltasGV: [],
    faltasIS: [],
    sustitucionesDescartadas: [],
    festivos: [],
    decisiones: [], // Capa 2: historial de decisiones de Nacho

    // Reemplazos de slot: un alias es ocupado por otro en un rango de fechas.
    // Estructura: { tienda, aliasOriginal, aliasNuevo, desde, hasta, motivo }
    // hasta === null/'' → indefinido (baja definitiva). Ver reemplazos.js.
    reemplazos: [],

    // Intercambios puntuales de turno entre dos empleados presentes.
    // Estructura: { fecha, tienda, empleadoA, turnoA, empleadoB, turnoB, motivo }
    // turnoA/B = 'LV' (L-V) o 'SAB_M'/'SAB_T'/'DOM_M'/'DOM_T' (FdS, fecha=sábado). Ver intercambios.js.
    intercambios: [],

    // Estado de sync
    syncStatus: 'loading' // 'loading' | 'ok' | 'error'
  },

  // ── Listeners ──────────────────────────────────────────────
  _listeners: {},

  // ── Getters ────────────────────────────────────────────────

  get(key) {
    return Store._state[key];
  },

  getTienda() {
    return Store._state.tiendaActual;
  },

  getMes() {
    return Store._state.mesActual;
  },

  getAño() {
    return Store._state.añoActual;
  },

  getEmpleadosTienda(tienda) {
    tienda = tienda || Store._state.tiendaActual;
    return tienda === 'granvia' ? Store._state.empleadosGV : Store._state.empleadosIS;
  },

  getEmpleado(alias, tienda) {
    const gv = Store._state.empleadosGV[alias];
    const is = Store._state.empleadosIS[alias];
    if (tienda === 'granvia') return gv;
    if (tienda === 'isabel') return is;
    return gv || is;
  },

  getTodosEmpleados() {
    const all = {};
    const gv = Store._state.empleadosGV;
    const is = Store._state.empleadosIS;
    for (const k in gv) all[k] = gv[k];
    for (const k in is) if (!all[k]) all[k] = is[k];
    return all;
  },

  getAusencias(tienda) {
    tienda = tienda || Store._state.tiendaActual;
    return tienda === 'granvia' ? Store._state.ausenciasGV : Store._state.ausenciasIS;
  },

  getSustituciones() {
    return Store._state.sustituciones;
  },

  getModificaciones() {
    return Store._state.modificacionesHorario;
  },

  getFaltas(tienda) {
    tienda = tienda || Store._state.tiendaActual;
    return tienda === 'granvia' ? Store._state.faltasGV : Store._state.faltasIS;
  },

  getDescartadas() {
    return Store._state.sustitucionesDescartadas;
  },

  getFestivos() {
    return Store._state.festivos;
  },

  getReemplazos() {
    return Store._state.reemplazos;
  },

  getIntercambios() {
    return Store._state.intercambios;
  },

  // ── Setters (emiten eventos) ───────────────────────────────

  set(key, value) {
    Store._state[key] = value;
    Store._emit(key, value);
  },

  setTienda(tienda) {
    Store._state.tiendaActual = tienda;
    Store._emit('tiendaActual', tienda);
    Store._emit('cambioVista');
  },

  setMes(mes) {
    Store._state.mesActual = mes;
    Store._emit('mesActual', mes);
    Store._emit('cambioVista');
  },

  setAño(año) {
    Store._state.añoActual = año;
    Store._emit('añoActual', año);
    Store._emit('cambioVista');
  },

  setEmpleados(tienda, empleados) {
    if (tienda === 'granvia') Store._state.empleadosGV = empleados;
    else Store._state.empleadosIS = empleados;
    Store._emit('empleados', { tienda, empleados });
  },

  setAusencias(tienda, ausencias) {
    if (tienda === 'granvia') Store._state.ausenciasGV = ausencias;
    else Store._state.ausenciasIS = ausencias;
    Store._emit('ausencias', { tienda, ausencias });
    Store._emit('cambioVista');
  },

  addAusencia(tienda, ausencia) {
    const aus = tienda === 'granvia' ? Store._state.ausenciasGV : Store._state.ausenciasIS;
    aus.push(ausencia);
    Store._emit('ausencias', { tienda, ausencias: aus });
    Store._emit('cambioVista');
  },

  removeAusencia(tienda, index) {
    const aus = tienda === 'granvia' ? Store._state.ausenciasGV : Store._state.ausenciasIS;
    const removed = aus.splice(index, 1)[0];
    // Solo borrar sustituciones de ESTE empleado (bug fix de v8)
    if (removed) {
      Store._state.sustituciones = Store._state.sustituciones.filter(s => {
        return !(s.ausente === removed.empleado &&
                 s.fecha >= removed.desde &&
                 s.fecha <= removed.hasta &&
                 s.tienda === tienda);
      });
    }
    Store._emit('ausencias', { tienda, ausencias: aus });
    Store._emit('sustituciones', Store._state.sustituciones);
    Store._emit('cambioVista');
  },

  updateAusencia(tienda, index, cambios) {
    const aus = tienda === 'granvia' ? Store._state.ausenciasGV : Store._state.ausenciasIS;
    if (index < 0 || index >= aus.length) return null;
    aus[index] = Object.assign({}, aus[index], cambios);
    Store._emit('ausencias', { tienda, ausencias: aus });
    Store._emit('cambioVista');
    return aus[index];
  },

  /** Capa 2: registrar decisión de Nacho (motor sugirió X, Nacho eligió Y) */
  addDecision(decision) {
    Store._state.decisiones.push(decision);
    Store._emit('decisiones', Store._state.decisiones);
  },

  getDecisiones() {
    return Store._state.decisiones;
  },

  addSustitucion(sust) {
    Store._state.sustituciones.push(sust);
    Store._emit('sustituciones', Store._state.sustituciones);
    Store._emit('cambioVista');
  },

  removeSustitucion(filtro) {
    Store._state.sustituciones = Store._state.sustituciones.filter(s => !filtro(s));
    Store._emit('sustituciones', Store._state.sustituciones);
    Store._emit('cambioVista');
  },

  addModificacion(mod) {
    // Quitar anterior si existe
    Store._state.modificacionesHorario = Store._state.modificacionesHorario.filter(m => {
      return !(m.empleado === mod.empleado && m.fecha === mod.fecha &&
               m.tienda === mod.tienda && m.turnoFds === mod.turnoFds);
    });
    Store._state.modificacionesHorario.push(mod);
    Store._emit('modificaciones', Store._state.modificacionesHorario);
    Store._emit('cambioVista');
  },

  removeModificacion(empleado, fecha, tienda, turnoFds) {
    Store._state.modificacionesHorario = Store._state.modificacionesHorario.filter(m => {
      return !(m.empleado === empleado && m.fecha === fecha &&
               m.tienda === tienda && (turnoFds ? m.turnoFds === turnoFds : !m.turnoFds));
    });
    Store._emit('modificaciones', Store._state.modificacionesHorario);
    Store._emit('cambioVista');
  },

  setSyncStatus(status) {
    Store._state.syncStatus = status;
    Store._emit('syncStatus', status);
  },

  // ── Validaciones ───────────────────────────────────────────

  /** Verificar si ya existe una ausencia solapada para el mismo empleado */
  ausenciaSolapada(tienda, empleado, desde, hasta, excludeIndex) {
    const ausencias = Store.getAusencias(tienda);
    for (let i = 0; i < ausencias.length; i++) {
      if (i === excludeIndex) continue;
      const aus = ausencias[i];
      if (aus.empleado === empleado) {
        // Hay solapamiento si no están completamente separados
        if (!(hasta < aus.desde || desde > aus.hasta)) {
          return aus;
        }
      }
    }
    return null;
  },

  // ── Sistema de eventos ─────────────────────────────────────

  on(evento, callback) {
    if (!Store._listeners[evento]) Store._listeners[evento] = [];
    Store._listeners[evento].push(callback);
    return () => Store.off(evento, callback);
  },

  off(evento, callback) {
    if (!Store._listeners[evento]) return;
    Store._listeners[evento] = Store._listeners[evento].filter(cb => cb !== callback);
  },

  _emit(evento, data) {
    const listeners = Store._listeners[evento];
    if (listeners) {
      for (const cb of listeners) {
        try { cb(data); } catch (e) { console.error('Store event error:', evento, e); }
      }
    }
  },

  // ── Consultas de estado ────────────────────────────────────

  /** Es un empleado ausente en una fecha? */
  estaAusente(alias, fecha, tienda) {
    tienda = tienda || Store._state.tiendaActual;
    const ausencias = Store.getAusencias(tienda);
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    return ausencias.some(a => a.empleado === alias && a.desde <= fs && a.hasta >= fs);
  },

  /** Tipo de ausencia de un empleado en una fecha */
  getTipoAusencia(alias, fecha, tienda) {
    tienda = tienda || Store._state.tiendaActual;
    const ausencias = Store.getAusencias(tienda);
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    const aus = ausencias.find(a => a.empleado === alias && a.desde <= fs && a.hasta >= fs);
    return aus ? aus.tipo : '';
  },

  /** Obtener sustituto para un ausente en una fecha */
  getSustituto(fecha, ausente, tienda, turnoFds) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    tienda = tienda || Store._state.tiendaActual;
    return Store._state.sustituciones.find(s =>
      s.fecha === fs && s.ausente === ausente && s.tienda === tienda &&
      (turnoFds ? s.turnoFds === turnoFds : !s.turnoFds)
    ) || null;
  },

  /** Obtener modificación de horario */
  getModificacion(empleado, fecha, tienda, turnoFds) {
    tienda = tienda || Store._state.tiendaActual;
    return Store._state.modificacionesHorario.find(m =>
      m.empleado === empleado && m.fecha === fecha && m.tienda === tienda &&
      (turnoFds ? m.turnoFds === turnoFds : !m.turnoFds)
    ) || null;
  },

  /** Verificar si un turno fue descartado (no sustituir) */
  esDescartado(fecha, ausente, tienda, turnoFds) {
    return Store._state.sustitucionesDescartadas.find(d =>
      d.fecha === fecha && d.ausente === ausente && d.tienda === tienda &&
      (turnoFds ? d.turnoFds === turnoFds : !d.turnoFds)
    ) || null;
  }
};
