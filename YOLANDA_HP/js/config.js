// ============================================================
// YOLANDA HP — config.js
// Configuración centralizada: mínimos, restricciones, API
// ============================================================

'use strict';

const CONFIG = {

  // ── API Google Sheets ──────────────────────────────────────
  SHEETS_API: 'https://script.google.com/macros/s/AKfycbyRV1GwDbPwzyK7JH6_5gcsJ_2U1JDIh3KlvEuCaK0xicndXxuuEBBze-mDdt9z1T0/exec',

  // ── Vacaciones ─────────────────────────────────────────────
  DIAS_VACACIONES_ANUALES: 30, // Días naturales
  TIPOS_RESTAN_DIAS: ['vacaciones', 'permiso', 'asuntos'],

  // ── Ventanas horarias de cada franja ───────────────────────
  // Un empleado cuenta en una franja si su [entrada, salida]
  // cubre TODA la ventana de la franja (entrada ≤ inicio && salida ≥ fin).
  // Un mismo empleado puede contar en varias franjas (ej: EVA 7-15 → descarga + mañanas).
  FRANJAS_GV: {
    // Descarga: min=3 se cumple desde las 7 (cuando EVA llega). Antes hay 2 personas en ramp-up.
    descarga: [7, 9],
    mañanas:  [9,    15],
    tardes:   [15,   17.75],
    cierre:   [17.75, 22]
  },
  FRANJAS_IS: {
    descarga: [7,    10],  // Min se cumple desde las 7 (SILVIA/VANESA). Antes hay ramp-up.
    mañanas:  [10,   14.5],
    tardes:   [14.75, 17.5],  // ABDEL 14:30 + ALEX 14:45 → min 2 desde 14:45
    cierre:   { default: [18.75, 22], 5: [18.25, 22] }  // L-J: 3 desde 18:45. V: 3 desde 18:15
  },

  // ── Mínimos L-V Gran Vía (iguales todos los días) ─────────
  MINIMOS_LV_GV: {
    descarga: 3, // EVA cuenta (entra a las 7)
    mañanas: 3,
    tardes: 2,
    cierre: 3
  },

  // ── Mínimos L-V Isabel (varían por día) ────────────────────
  // L=1, M=2, X=3, J=4, V=5
  MINIMOS_LV_IS: {
    descarga: { 1: 3, 2: 2, 3: 3, 4: 2, 5: 3 }, // L-X-V=3 (camión), M-J=2
    mañanas:  { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
    tardes:   { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2 },
    cierre:   { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }
  },

  // ── Mínimos FdS ────────────────────────────────────────────
  MINIMOS_FDS_GV: {
    SAB_M: 4,
    SAB_T: 3,
    DOM_M: 2,
    DOM_T: 4  // PRIORIDAD MÁXIMA — más ventas
  },

  // ── Sub-tramos horarios dentro de un turno FdS ─────────────
  // Solo SAB_M GV tiene sub-tramos: descarga (4) hasta 12:30 y post-descarga (2) hasta 14:45.
  // El resto de turnos usa MINIMOS_FDS_* como mínimo único.
  SUBTRAMOS_FDS: {
    granvia: {
      SAB_M: [
        { desde: 5,    hasta: 12.5,  minimo: 4, etiqueta: 'descarga' },
        { desde: 12.5, hasta: 14.75, minimo: 2, etiqueta: 'post-descarga' }
      ]
    },
    isabel: {}
  },

  MINIMOS_FDS_IS: {
    SAB_M: 2,
    SAB_T: 3,
    DOM_M: 2,
    DOM_T: 3  // Prioridad — más ventas
  },

  // ── Restricciones por empleado ─────────────────────────────
  // Tipos: 'solo-mañanas', 'max-15', 'solo-descarga', 'solo-cierre',
  //        'no-fds', 'no-cierre-lv', 'solo-fds', 'solo-fds-y-lunes'
  RESTRICCIONES: {
    // Gran Vía
    EVA:         { tipo: ['max-15', 'no-fds'], nota: 'Solo descarga/mañanas hasta 15:00. Nunca FdS.' },
    SARA:        { tipo: ['solo-mañanas'], nota: 'Conciliación familiar' },
    ELI:         { tipo: ['solo-mañanas', 'no-fds'], nota: 'Solo mañanas L-V. FdS solo turno fijo DOM mañana, no sustituye en FdS' },
    FRANCIS:     { tipo: ['solo-cierre'], excepciones: ['tardes'], nota: 'Solo cierres. Tardes como ÚLTIMO recurso' },
    EDU:         { tipo: ['max-15'], nota: 'Solo descarga/mañanas hasta 15:00. Comodín Isabel L-V' },
    ANTONIO:     { tipo: ['solo-descarga'], nota: 'Solo descarga. Inamovible, ni en caso extremo' },
    ALFREDO:     { tipo: ['solo-fds', 'fds-solo-tardes'], excepciones: ['lv-emergencia'], nota: 'Solo FdS tardes. L-V como último recurso' },
    'ALEX VERA': { tipo: ['solo-fds', 'fds-solo-tardes'], excepciones: ['lv-emergencia'], nota: 'Solo FdS tardes. L-V como último recurso' },
    SILVIA:      { tipo: ['no-cierre-lv'], nota: 'No cierres L-V (medicación). FdS sí puede todo' },

    // Isabel
    CAROLINA:    { tipo: ['no-cierre'], nota: 'Nunca cierres (conciliación). La rotación ya lo evita' },
    ANDREA:      { tipo: [], preferencias: { descanso: 'lunes' }, nota: 'Descansa lunes por acuerdo (no es bloqueo, puede trabajar lunes librando otro día)' },
    ABEL:        { tipo: ['solo-fds-y-lunes'], nota: 'FdS + lunes siempre. Resto disponible para extras' },
    'M. CARMEN': { tipo: ['solo-fds'], excepciones: ['lv-extras'], nota: 'Solo FdS. Disponible para extras L-V' },
    RUBEN:       { tipo: ['solo-fds'], excepciones: ['lv-extras'], nota: 'Solo FdS. Disponible para extras L-V' },
    GONZALO:     { tipo: ['solo-fds'], excepciones: ['lv-extras'], nota: 'Solo FdS. Disponible para extras L-V' }
  },

  // ── Overrides de días de trabajo (parches a datos Sheets) ──
  // Mientras Sheets esté desactualizado, estos overrides corrigen
  // los días de trabajo de empleados específicos en L-V.
  // Cuando se actualice Sheets, simplemente borrar la entrada.
  OVERRIDES_DIAS_LV: {
    isabel: {
      ABEL: 'L',      // Sheets dice "L y V", correcto: solo lunes
      ANDREA: 'MXJV'  // Sheets dice "M, X, J", correcto: M, X, J, V
    },
    granvia: {}
  },

  // ── Préstamo entre tiendas ─────────────────────────────────
  PRESTAMO_ENTRE_TIENDAS: {
    // Solo estos empleados pueden prestarse de una tienda a otra
    permitidos: ['EDU'],
    // Dirección: de GV a Isabel, solo L-V
    direccion: 'gv-a-isabel',
    soloLV: true
  },

  // ── Compartidos GV en FdS Isabel ───────────────────────────
  // NINGÚN compartido de GV puede sustituir en FdS de Isabel
  COMPARTIDOS_FDS_ISABEL: false,

  // ── Descarga GV: grupo que se cubre entre ellos ────────────
  GRUPO_DESCARGA_GV: ['LETI', 'DAVID', 'EDU'],

  // ── Rotaciones — Fechas de referencia ──────────────────────
  ROTACIONES: {
    // Semana A/B: correlativo siempre (impar=A, par=B). No necesita referencia.

    // Descarga GV — ciclo 3: LETI, DAVID, EDU
    descarga_gv: {
      orden: ['LETI', 'DAVID', 'EDU'],
      ciclo: 3,
      fecha_inicio: '2026-04-18', // Semana donde LETI=SAB_M(descarga)
      patron: ['SAB_M', 'DOM_T', 'SAB_T'] // posiciones en el ciclo
    },

    // Rotación 7 FdS GV — ciclo 7
    fds_gv: {
      orden: ['FRANCIS', 'ALEX', 'SILVIA', 'SARA', 'MORILLA', 'VANESA', 'ABDEL'],
      ciclo: 7,
      fecha_inicio: '2026-02-28',
      // pos 0,1=SAB_M | 2,3=DOM_M | 4,5=DOM_T | 6=SAB_T
    },

    // Rotación Isabel L-V — ciclo 4: CAROLINA/ALVARO/CECI
    lv_isabel: {
      ciclo: 4,
      semana_referencia: 15, // Semana ISO 15 (6 abril 2026) = índice 2 (sem 3)
      indice_referencia: 2,
      rotacion: [
        { mañana: 'CAROLINA', tarde: 'CECI',     cierre: 'ALVARO' },
        { mañana: 'CECI',     tarde: 'CAROLINA', cierre: 'ALVARO' },
        { mañana: 'CAROLINA', tarde: 'ALVARO',   cierre: 'CECI' },
        { mañana: 'ALVARO',   tarde: 'CAROLINA', cierre: 'CECI' }
      ]
    },

    // Rotación FdS Isabel — Grupo A ciclo 4 (×2=8), Grupo B ciclo 8
    fds_isabel: {
      fecha_inicio: '2026-02-28',
      grupoA: {
        orden: ['CAROLINA', 'ALVARO', 'CECI', 'ANDREA'],
        ciclo: 8,
        semanas: [
          { SAB_M: 'CAROLINA', SAB_T: 'ALVARO',  DOM_M: 'CECI',     DOM_T: 'ANDREA' },
          { SAB_M: 'ALVARO',   SAB_T: 'CECI',    DOM_M: 'ANDREA',   DOM_T: 'CAROLINA' },
          { SAB_M: 'CECI',     SAB_T: 'ANDREA',  DOM_M: 'CAROLINA', DOM_T: 'ALVARO' },
          { SAB_M: 'ANDREA',   SAB_T: 'CAROLINA', DOM_M: 'ALVARO',  DOM_T: 'CECI' },
          { SAB_M: 'CAROLINA', SAB_T: 'ALVARO',  DOM_M: 'CECI',     DOM_T: 'ANDREA' },
          { SAB_M: 'ALVARO',   SAB_T: 'CECI',    DOM_M: 'ANDREA',   DOM_T: 'CAROLINA' },
          { SAB_M: 'CECI',     SAB_T: 'ANDREA',  DOM_M: 'CAROLINA', DOM_T: 'ALVARO' },
          { SAB_M: 'ANDREA',   SAB_T: 'CAROLINA', DOM_M: 'ALVARO',  DOM_T: 'CECI' }
        ]
      },
      grupoB: {
        orden: ['M. CARMEN', 'ABEL', 'GONZALO', 'RUBEN'],
        ciclo: 8,
        semanas: [
          { SAB_M: ['M. CARMEN'], SAB_T: ['ABEL', 'GONZALO', 'RUBEN'],     DOM_M: ['GONZALO'],   DOM_T: ['M. CARMEN', 'ABEL', 'RUBEN'] },
          { SAB_M: ['ABEL'],      SAB_T: ['M. CARMEN', 'GONZALO', 'RUBEN'], DOM_M: ['RUBEN'],     DOM_T: ['M. CARMEN', 'ABEL', 'GONZALO'] },
          { SAB_M: ['GONZALO'],   SAB_T: ['M. CARMEN', 'ABEL', 'RUBEN'],   DOM_M: ['M. CARMEN'], DOM_T: ['ABEL', 'GONZALO', 'RUBEN'] },
          { SAB_M: ['RUBEN'],     SAB_T: ['M. CARMEN', 'ABEL', 'GONZALO'], DOM_M: ['ABEL'],      DOM_T: ['M. CARMEN', 'GONZALO', 'RUBEN'] },
          { SAB_M: ['M. CARMEN'], SAB_T: ['ABEL', 'GONZALO', 'RUBEN'],     DOM_M: ['RUBEN'],     DOM_T: ['M. CARMEN', 'ABEL', 'GONZALO'] },
          { SAB_M: ['ABEL'],      SAB_T: ['M. CARMEN', 'GONZALO', 'RUBEN'], DOM_M: ['GONZALO'],   DOM_T: ['M. CARMEN', 'ABEL', 'RUBEN'] },
          { SAB_M: ['GONZALO'],   SAB_T: ['M. CARMEN', 'ABEL', 'RUBEN'],   DOM_M: ['ABEL'],      DOM_T: ['M. CARMEN', 'GONZALO', 'RUBEN'] },
          { SAB_M: ['RUBEN'],     SAB_T: ['M. CARMEN', 'ABEL', 'GONZALO'], DOM_M: ['M. CARMEN'], DOM_T: ['ABEL', 'GONZALO', 'RUBEN'] }
        ]
      }
    }
  },

  // ── Fijos FdS GV ──────────────────────────────────────────
  FIJOS_FDS_GV: {
    ANTONIO:     { turno: 'SAB_M', entrada: 5, salida: 12.5 },
    ELI:         { turno: 'DOM_M', entrada: 7.25, salida: 14.75 },
    ALFREDO:     { turnos: ['SAB_T', 'DOM_T'], entrada: 14.75, salida: 22.25 },
    'ALEX VERA': { turnos: ['SAB_T', 'DOM_T'], entrada: 14.75, salida: 22.25 }
  },

  // ── Descanso entre jornadas ────────────────────────────────
  DESCANSO_MINIMO_HORAS: 12,
  DESCANSO_EXCEPCIONES: [
    { empleados: ['DAVID', 'LETI'], motivo: 'Viernes tarde GV + Sábado descarga GV aceptado por ellos' }
  ],

  // ── Solapes entre tiendas ──────────────────────────────────
  TIENDA_FLEXIBLE: 'granvia', // GV siempre cede en caso de solape

  // ── Salida máxima ──────────────────────────────────────────
  SALIDA_MAXIMA: 22.25, // 22:15

  // ── Horarios FdS por defecto ───────────────────────────────
  HORARIO_FDS_MAÑANA: [7.25, 14.75],
  HORARIO_FDS_TARDE: [14.75, 22.25],
  HORAS_FDS_SUSTITUTO: 7.5,

  // ── Helpers de config ──────────────────────────────────────

  /** Obtener mínimo L-V para una tienda, franja y día de la semana */
  /**
   * Devuelve la ventana [entrada, salida] de una franja, opcionalmente
   * variable por día de la semana. Acepta tanto formato simple [a,b]
   * como objeto {default: [a,b], 5: [c,d]}.
   */
  getFranjaVentana(tienda, franja, dow) {
    const def = tienda === 'granvia' ? CONFIG.FRANJAS_GV : CONFIG.FRANJAS_IS;
    const v = def[franja];
    if (!v) return null;
    if (Array.isArray(v)) return v;
    return v[dow] || v.default;
  },

  getMinimoLV(tienda, franja, dow) {
    if (tienda === 'granvia') {
      return CONFIG.MINIMOS_LV_GV[franja] || 0;
    }
    const minIS = CONFIG.MINIMOS_LV_IS[franja];
    if (!minIS) return 0;
    return minIS[dow] || 0;
  },

  /** Obtener mínimo FdS para una tienda y turno */
  getMinimoFds(tienda, turno) {
    const minimos = tienda === 'granvia' ? CONFIG.MINIMOS_FDS_GV : CONFIG.MINIMOS_FDS_IS;
    return minimos[turno] || 0;
  },

  /** Obtener restricciones de un empleado */
  getRestricciones(alias) {
    return CONFIG.RESTRICCIONES[alias] || { tipo: [], nota: '' };
  },

  /** Verificar si un empleado tiene una restricción concreta */
  tieneRestriccion(alias, tipo) {
    const r = CONFIG.getRestricciones(alias);
    return r.tipo.includes(tipo);
  },

  /** Verificar si una restricción tiene excepción */
  tieneExcepcion(alias, excepcion) {
    const r = CONFIG.getRestricciones(alias);
    return r.excepciones && r.excepciones.includes(excepcion);
  }
};
