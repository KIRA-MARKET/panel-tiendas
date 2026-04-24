// ============================================================
// HORARIOS KIRA & REYPIK — empleados.js
// Plantilla por defecto: VACÍA.
//
// La fuente de verdad de empleados y horarios L-V Gran Vía es
// Google Sheets, cargada por Sync.cargar() al arrancar la app.
// Aquí solo se inicializan estructuras vacías para que la UI
// no tenga errores de undefined antes de que Sheets responda.
//
// Si Sheets falla, la pantalla queda sin datos y el indicador
// arriba a la derecha muestra "Sin conexión". Antes en este
// archivo había una copia hardcodeada con DNIs, teléfonos y
// emails reales; se eliminó tras la auditoría 2026-04-25 por
// LOPD y para que Sheets fuera fuente única de verdad.
// ============================================================

'use strict';

const EmpleadosDefault = {

  GV: {},
  IS: {},
  HORARIOS_GV: { A: { LJ: {}, V: {} }, B: { LJ: {}, V: {} } },

  /** Inicializar Store con plantillas vacías. Sheets rellena al cargar. */
  init() {
    Store.set('empleadosGV', Utils.clonar(EmpleadosDefault.GV));
    Store.set('empleadosIS', Utils.clonar(EmpleadosDefault.IS));
    Store.set('horariosGV', Utils.clonar(EmpleadosDefault.HORARIOS_GV));
  }
};
