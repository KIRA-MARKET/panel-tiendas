// ============================================================
// HORARIOS KIRA & REYPIK — ausencias.js
// Gestión de ausencias con validación de solapamientos
// ============================================================

'use strict';

const Ausencias = {

  // ── Tipos de ausencia ──────────────────────────────────────
  TIPOS: [
    { value: 'vacaciones', label: 'Vacaciones', icon: '\ud83c\udfd6\ufe0f' },
    { value: 'baja', label: 'Baja', icon: '\ud83c\udfe5' },
    { value: 'permiso', label: 'Permiso', icon: '\ud83d\udcc5' },
    { value: 'asuntos', label: 'Asuntos propios', icon: '\ud83d\udccb' }
  ],

  // ── Crear ausencia ─────────────────────────────────────────

  /**
   * Crea una ausencia validando solapamientos con otras del mismo empleado.
   * Devuelve { ok, error, ausencia? }
   */
  crear(tienda, empleado, tipo, desde, hasta, motivo = '') {
    // Validar fechas
    if (!desde || !hasta) {
      return { ok: false, error: 'Faltan fechas' };
    }
    if (desde > hasta) {
      return { ok: false, error: 'La fecha "desde" debe ser anterior o igual a "hasta"' };
    }

    // Validar empleado existe
    const emp = Store.getEmpleado(empleado, tienda);
    if (!emp) {
      return { ok: false, error: 'Empleado no encontrado en ' + tienda };
    }

    // ── REGLA: Bloquear solapamientos ──
    const solapada = Store.ausenciaSolapada(tienda, empleado, desde, hasta);
    if (solapada) {
      return {
        ok: false,
        error: 'Ya existe una ausencia de ' + empleado + ' del ' +
               Utils.formatFechaES(solapada.desde) + ' al ' +
               Utils.formatFechaES(solapada.hasta) + ' (' + solapada.tipo + ')'
      };
    }

    // Validar días de vacaciones disponibles (solo para tipos que restan días)
    if (CONFIG.TIPOS_RESTAN_DIAS.includes(tipo)) {
      const año = parseInt(desde.substring(0, 4));
      const dias = Utils.contarDiasNaturales(desde, hasta);
      const vac = Ausencias.calcularVacaciones(empleado, tienda, año);
      if (vac.restantes - dias < 0) {
        return {
          ok: false,
          error: empleado + ' solo tiene ' + vac.restantes +
                 ' d\u00edas disponibles en ' + año + ' y est\u00e1s pidiendo ' + dias
        };
      }
    }

    // Crear
    const ausencia = { empleado, tipo, desde, hasta, motivo };
    Store.addAusencia(tienda, ausencia);
    Sync.syncAusencias();

    return { ok: true, ausencia };
  },

  // ── Cancelar ausencia ──────────────────────────────────────

  /**
   * Cancela una ausencia. Solo borra las sustituciones de ESE empleado
   * (corrige bug de v8).
   */
  cancelar(tienda, index) {
    const ausencias = Store.getAusencias(tienda);
    if (index < 0 || index >= ausencias.length) {
      return { ok: false, error: 'Ausencia no encontrada' };
    }
    Store.removeAusencia(tienda, index);
    Sync.syncAusencias();
    Sync.syncSustituciones();
    return { ok: true };
  },

  // ── Cálculo de vacaciones del empleado ─────────────────────

  /**
   * Calcula días totales/usados/restantes para un empleado en un año.
   */
  calcularVacaciones(alias, tienda, año) {
    const ausencias = Store.getAusencias(tienda);
    const total = CONFIG.DIAS_VACACIONES_ANUALES;
    let usados = 0;
    const detalle = [];

    for (const aus of ausencias) {
      if (aus.empleado !== alias) continue;
      if (!CONFIG.TIPOS_RESTAN_DIAS.includes(aus.tipo)) continue;

      const yearDesde = parseInt(aus.desde.substring(0, 4));
      const yearHasta = parseInt(aus.hasta.substring(0, 4));
      if (yearDesde !== año && yearHasta !== año) continue;

      // Ajustar fechas si la ausencia cruza años
      let desde = aus.desde;
      let hasta = aus.hasta;
      if (yearDesde < año) desde = año + '-01-01';
      if (yearHasta > año) hasta = año + '-12-31';

      const dias = Utils.contarDiasNaturales(desde, hasta);
      usados += dias;
      detalle.push({ tipo: aus.tipo, desde: aus.desde, hasta: aus.hasta, dias });
    }

    return {
      total,
      usados,
      restantes: total - usados,
      detalle
    };
  },

  // ── Listar ausencias ordenadas ─────────────────────────────

  /**
   * Devuelve las ausencias de una tienda ordenadas cronológicamente.
   * Incluye índice original para edición/borrado.
   */
  listar(tienda) {
    const ausencias = Store.getAusencias(tienda);
    const indexed = ausencias.map((a, i) => ({ ...a, _index: i }));
    indexed.sort((a, b) => a.desde < b.desde ? -1 : a.desde > b.desde ? 1 : 0);
    return indexed;
  },

  // ── Obtener label de tipo ──────────────────────────────────

  getTipoLabel(tipo) {
    const t = Ausencias.TIPOS.find(x => x.value === tipo);
    return t ? (t.icon + ' ' + t.label) : tipo;
  }
};
