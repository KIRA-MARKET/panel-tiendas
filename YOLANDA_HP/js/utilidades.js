// ============================================================
// YOLANDA HP — utilidades.js
// Funciones helper puras (sin side effects, sin estado)
// ============================================================

'use strict';

const Utils = {

  // ── Formateo de horas ──────────────────────────────────────

  /** 10.5 → "10:30" */
  formatHora(decimal) {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return h + ':' + String(m).padStart(2, '0');
  },

  /** "10:30" → 10.5 */
  horaADecimal(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h + m / 60;
  },

  /** 10.5 → "10:30" (formato HH:MM para inputs type=time) */
  decimalAHHMM(decimal) {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  },

  // ── Formateo de fechas ─────────────────────────────────────

  /** Date → "2026-04-07" */
  formatFecha(fecha) {
    const y = fecha.getFullYear();
    const m = fecha.getMonth() + 1;
    const d = fecha.getDate();
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  },

  /** "2026-04-07" → "07/04/2026" */
  formatFechaES(str) {
    if (!str || str.indexOf('-') === -1) return str || '';
    const [y, m, d] = str.split('-');
    return d + '/' + m + '/' + y;
  },

  /** "2026-04-07" → Date (local, sin zona horaria) */
  parseFecha(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  // ── Semanas ────────────────────────────────────────────────

  /** Número de semana ISO 8601 */
  getNumSemana(fecha) {
    const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dn = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dn);
    const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - ys) / 86400000 + 1) / 7);
  },

  /** Semana A o B — siempre correlativo (impar=A, par=B) */
  getSemanaAB(fecha) {
    return Utils.getNumSemana(fecha) % 2 === 1 ? 'A' : 'B';
  },

  /** Obtener el lunes de la semana de una fecha */
  getLunesDeSemana(fecha) {
    const d = new Date(fecha);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  // ── Franjas horarias ───────────────────────────────────────

  /** Determinar franja para Gran Vía */
  getFranjaGV(entrada, salida) {
    if (entrada < 7 && salida <= 13) return 'descarga';
    if (salida <= 15) return 'mañanas';
    if (entrada >= 16) return 'cierre';
    return 'tardes';
  },

  /** Determinar franja para Isabel */
  getFranjaIS(entrada, salida) {
    if (entrada < 8) return 'descarga';
    if (salida <= 14.5) return 'mañanas';
    if (entrada >= 17.5) return 'cierre';
    if (entrada >= 14) return 'tardes';
    return 'mañanas';
  },

  /** Determinar franja según tienda (legacy: una sola franja "principal") */
  getFranja(entrada, salida, tienda) {
    return tienda === 'granvia'
      ? Utils.getFranjaGV(entrada, salida)
      : Utils.getFranjaIS(entrada, salida);
  },

  /**
   * Devuelve TODAS las franjas que un horario [entrada, salida] cubre.
   * Un empleado cuenta en una franja si su jornada SOLAPA con la ventana
   * (intervalos abiertos por la derecha — tocarse en frontera no cuenta).
   * Ejemplo: EVA 7-15 en GV → ['descarga','mañanas'] porque 7-9 y 9-15 solapan.
   */
  franjasQueCubre(entrada, salida, tienda) {
    const def = tienda === 'granvia' ? CONFIG.FRANJAS_GV : CONFIG.FRANJAS_IS;
    const out = [];
    for (const fr of ['descarga', 'mañanas', 'tardes', 'cierre']) {
      const w = def[fr];
      if (!w) continue;
      // Solape de [entrada, salida) con [w[0], w[1])
      if (entrada < w[1] && salida > w[0]) out.push(fr);
    }
    return out;
  },

  // ── Días y calendario ──────────────────────────────────────

  MESES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],

  DIAS: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],

  DIAS_LARGO: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],

  /** Es día laborable (L-V)? */
  esLaborable(fecha) {
    const dow = fecha.getDay();
    return dow >= 1 && dow <= 5;
  },

  /** Es fin de semana? */
  esFds(fecha) {
    const dow = fecha.getDay();
    return dow === 0 || dow === 6;
  },

  /** Contar días naturales entre dos fechas (inclusive) */
  contarDiasNaturales(desde, hasta) {
    let count = 0;
    const f = Utils.parseFecha(desde);
    const fin = Utils.parseFecha(hasta);
    while (f <= fin) {
      count++;
      f.setDate(f.getDate() + 1);
    }
    return count;
  },

  /** Último día del mes */
  ultimoDiaMes(año, mes) {
    return new Date(año, mes + 1, 0);
  },

  // ── Seguridad HTML ─────────────────────────────────────────

  /** Escapar HTML para evitar XSS */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ── Helpers genéricos ──────────────────────────────────────

  /** Clonar objeto simple (sin funciones ni Dates) */
  clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /** Generar ID único simple */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /** Mapeo de códigos de día a números de día de semana */
  matchDia(codigo, dow) {
    const map = {
      'LV': [1, 2, 3, 4, 5],          // Lunes a Viernes (todos)
      'L': [1], 'M': [2], 'X': [3], 'J': [4], 'V': [5],
      'LJ': [1, 2, 3, 4],
      'LX': [1, 3],
      'LXV': [1, 3, 5],
      'MJ': [2, 4],
      'MJV': [2, 4, 5],
      'MXJ': [2, 3, 4],
      'MXJV': [2, 3, 4, 5],
      // Códigos especiales del Sheets:
      'LV_ABEL': [1, 5],              // ABEL: solo lunes y viernes
      'LyV': [1, 5]                   // alias estándar
    };
    const dias = map[codigo];
    return dias ? dias.includes(dow) : false;
  },

  /** Ajustar horario de sustituto (salida máx 22:15 = 22.25) */
  ajustarHorarioSustituto(entrada, salida) {
    const MAX_SALIDA = 22.25;
    if (salida > MAX_SALIDA) {
      const horas = salida - entrada;
      salida = MAX_SALIDA;
      entrada = MAX_SALIDA - horas;
    }
    return { entrada, salida };
  }
};
