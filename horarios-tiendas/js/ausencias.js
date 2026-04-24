// ============================================================
// HORARIOS KIRA & REYPIK — ausencias.js
// Gestión de ausencias con validación de solapamientos
// ============================================================

'use strict';

const Ausencias = {

  // ── Tipos de ausencia ──────────────────────────────────────
  TIPOS: [
    { value: 'vacaciones', label: 'Vacaciones', icon: '🏖️' },
    { value: 'baja', label: 'Baja', icon: '🏥' },
    { value: 'permiso', label: 'Permiso', icon: '📅' },
    { value: 'asuntos', label: 'Asuntos propios', icon: '📋' }
  ],

  // ── Crear ausencia ─────────────────────────────────────────

  /**
   * Crea una ausencia validando solapamientos con otras del mismo empleado.
   * Devuelve { ok, error, ausencia?, replicada? }
   *
   * opciones.aplicarEnAmbas — si el empleado tiene tienda:'ambas', registra
   * la ausencia también en la otra tienda. Si alguna validación falla
   * en cualquiera de las dos, no se crea ninguna (operación atómica).
   */
  crear(tienda, empleado, tipo, desde, hasta, motivo = '', opciones = {}) {
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

    // ── Determinar si la ausencia se replica a la otra tienda ──
    // Solo si el empleado es genuinamente compartido (tienda:'ambas') Y
    // existe ficha en la otra tienda (Sheets podría tener una sola).
    let otraTienda = null;
    if (opciones.aplicarEnAmbas) {
      if (emp.tienda !== 'ambas') {
        return { ok: false, error: 'El empleado no trabaja en ambas tiendas' };
      }
      otraTienda = tienda === 'granvia' ? 'isabel' : 'granvia';
      const empOtra = Store.getEmpleado(empleado, otraTienda);
      if (!empOtra) {
        return {
          ok: false,
          error: 'Empleado no encontrado en ' + (otraTienda === 'granvia' ? 'Gran Vía' : 'Isabel')
        };
      }
    }

    // ── REGLA: Bloquear solapamientos (en ambas tiendas si aplica) ──
    const solapada = Store.ausenciaSolapada(tienda, empleado, desde, hasta);
    if (solapada) {
      return {
        ok: false,
        error: 'Ya existe una ausencia de ' + empleado + ' del ' +
               Utils.formatFechaES(solapada.desde) + ' al ' +
               Utils.formatFechaES(solapada.hasta) + ' (' + solapada.tipo + ')'
      };
    }
    if (otraTienda) {
      const solapadaOtra = Store.ausenciaSolapada(otraTienda, empleado, desde, hasta);
      if (solapadaOtra) {
        return {
          ok: false,
          error: 'Ya existe una ausencia de ' + empleado + ' en ' +
                 (otraTienda === 'granvia' ? 'Gran Vía' : 'Isabel') +
                 ' del ' + Utils.formatFechaES(solapadaOtra.desde) +
                 ' al ' + Utils.formatFechaES(solapadaOtra.hasta) +
                 ' (' + solapadaOtra.tipo + ')'
        };
      }
    }

    // Validar días de vacaciones disponibles (solo para tipos que restan días).
    // Validamos UNA vez en la tienda activa: el cupo es del empleado, no de la
    // tienda. Si aplicarEnAmbas crea dos registros con las mismas fechas, en
    // Control aparecerán contados en ambas filas — limitación pre-existente
    // del modelo de datos por tienda, no introducida aquí.
    if (CONFIG.TIPOS_RESTAN_DIAS.includes(tipo)) {
      const año = parseInt(desde.substring(0, 4));
      const dias = Utils.contarDiasNaturales(desde, hasta);
      const vac = Ausencias.calcularVacaciones(empleado, tienda, año);
      if (vac.restantes - dias < 0) {
        return {
          ok: false,
          error: empleado + ' solo tiene ' + vac.restantes +
                 ' días disponibles en ' + año + ' y estás pidiendo ' + dias
        };
      }
    }

    // Crear (en una o dos tiendas según opciones)
    const ausencia = { empleado, tipo, desde, hasta, motivo };
    Store.addAusencia(tienda, ausencia);
    if (otraTienda) {
      Store.addAusencia(otraTienda, { empleado, tipo, desde, hasta, motivo });
    }
    Sync.syncAusencias();

    return { ok: true, ausencia, replicada: !!otraTienda };
  },

  // ── Editar ausencia ────────────────────────────────────────

  /**
   * Edita una ausencia existente (tipo, fechas, motivo).
   * Revalida solapamientos (excluyendo la propia) y días de vacaciones
   * si el tipo nuevo resta del cupo.
   * Devuelve { ok, error, ausencia? }
   */
  editar(tienda, index, cambios) {
    const ausencias = Store.getAusencias(tienda);
    if (index < 0 || index >= ausencias.length) {
      return { ok: false, error: 'Ausencia no encontrada' };
    }
    const actual = ausencias[index];

    const tipo = cambios.tipo != null ? cambios.tipo : actual.tipo;
    const desde = cambios.desde != null ? cambios.desde : actual.desde;
    const hasta = cambios.hasta != null ? cambios.hasta : actual.hasta;
    const motivo = cambios.motivo != null ? cambios.motivo : (actual.motivo || '');

    if (!desde || !hasta) {
      return { ok: false, error: 'Faltan fechas' };
    }
    if (desde > hasta) {
      return { ok: false, error: 'La fecha "desde" debe ser anterior o igual a "hasta"' };
    }
    if (!Ausencias.TIPOS.some(t => t.value === tipo)) {
      return { ok: false, error: 'Tipo de ausencia inválido' };
    }

    // Solapamiento (excluyendo la propia)
    const solapada = Store.ausenciaSolapada(tienda, actual.empleado, desde, hasta, index);
    if (solapada) {
      return {
        ok: false,
        error: 'Ya existe una ausencia de ' + actual.empleado + ' del ' +
               Utils.formatFechaES(solapada.desde) + ' al ' +
               Utils.formatFechaES(solapada.hasta) + ' (' + solapada.tipo + ')'
      };
    }

    // Si el tipo nuevo resta vacaciones, revalidar cupo descontando los días
    // que ya contaba esta ausencia en su estado previo.
    if (CONFIG.TIPOS_RESTAN_DIAS.includes(tipo)) {
      const año = parseInt(desde.substring(0, 4));
      const diasNuevos = Utils.contarDiasNaturales(desde, hasta);
      const vac = Ausencias.calcularVacaciones(actual.empleado, tienda, año);
      // Días que esta ausencia ya imputaba al año (0 si antes no restaba)
      let diasPrevios = 0;
      if (CONFIG.TIPOS_RESTAN_DIAS.includes(actual.tipo)) {
        const yDesde = parseInt(actual.desde.substring(0, 4));
        const yHasta = parseInt(actual.hasta.substring(0, 4));
        if (yDesde === año || yHasta === año) {
          let d = actual.desde, h = actual.hasta;
          if (yDesde < año) d = año + '-01-01';
          if (yHasta > año) h = año + '-12-31';
          diasPrevios = Utils.contarDiasNaturales(d, h);
        }
      }
      const disponibles = vac.restantes + diasPrevios;
      if (disponibles - diasNuevos < 0) {
        return {
          ok: false,
          error: actual.empleado + ' solo tiene ' + disponibles +
                 ' días disponibles en ' + año + ' y estás pidiendo ' + diasNuevos
        };
      }
    }

    const actualizada = Store.updateAusencia(tienda, index, { tipo, desde, hasta, motivo });
    Sync.syncAusencias();
    return { ok: true, ausencia: actualizada };
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
