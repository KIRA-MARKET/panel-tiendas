// ============================================================
// YOLANDA HP — cobertura.js
// Cálculo de cobertura real por franja y detección de mínimos
// ============================================================

'use strict';

const Cobertura = {

  // ── Cobertura L-V por franja ───────────────────────────────

  /**
   * Calcula la cobertura real de una franja en un día,
   * considerando ausencias, sustituciones y modificaciones.
   * Devuelve { descarga: [...nombres], mañanas: [...], tardes: [...], cierre: [...] }
   */
  calcularLV(fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return null;

    const fs = Utils.formatFecha(fecha);
    const horarios = Rotaciones.getHorariosLV(fecha, tienda);
    if (!horarios) return null;

    const cobertura = { descarga: [], mañanas: [], tardes: [], cierre: [] };

    // Helpers locales: meter/sacar a un empleado en TODAS las franjas que cubre
    const meter = (emp, entrada, salida) => {
      const frs = Utils.franjasQueCubre(entrada, salida, tienda, dow);
      for (const fr of frs) {
        if (!cobertura[fr].includes(emp)) cobertura[fr].push(emp);
      }
    };
    const sacar = (emp) => {
      for (const fr of ['descarga', 'mañanas', 'tardes', 'cierre']) {
        const i = cobertura[fr].indexOf(emp);
        if (i > -1) cobertura[fr].splice(i, 1);
      }
    };

    // 1. Empleados base no ausentes
    for (const emp in horarios) {
      if (Store.estaAusente(emp, fs, tienda)) continue;
      const h = horarios[emp];
      meter(emp, h[0], h[1]);
    }

    // 2. Aplicar sustituciones del día
    const susts = Store.getSustituciones();
    for (const sust of susts) {
      if (sust.fecha !== fs || sust.tienda !== tienda || sust.turnoFds) continue;

      // ¿El sustituto tiene turno propio ese día en esta tienda?
      if (horarios[sust.sustituto]) {
        const hOrig = horarios[sust.sustituto];
        // Si los horarios se SOLAPAN → se mueve: reemplazar todas sus franjas.
        // Si NO (consecutivos o separados) → comodín: mantiene las del original y suma las nuevas.
        const seSolapan = !(sust.salida <= hOrig[0] || hOrig[1] <= sust.entrada);
        if (seSolapan) {
          sacar(sust.sustituto);
        }
      }

      meter(sust.sustituto, sust.entrada, sust.salida);
    }

    return cobertura;
  },

  // ── Intervalos efectivos del día (interno) ─────────────────

  /**
   * Devuelve la lista de intervalos [entrada, salida, alias] efectivos
   * de un día L-V tras aplicar ausencias, modificaciones puntuales y
   * sustituciones. Es la fuente cruda para sweep-line de mínimos.
   */
  _intervalosLV(fecha, tienda) {
    const fs = Utils.formatFecha(fecha);
    const horarios = Rotaciones.getHorariosLV(fecha, tienda);
    if (!horarios) return [];

    const intervalos = []; // {alias, e, s}

    // 1. Base: rotación con modificaciones, sin ausentes
    for (const emp in horarios) {
      if (Store.estaAusente(emp, fs, tienda)) continue;
      const mod = Store.getModificacion(emp, fs, tienda, '');
      const h = mod ? [mod.nuevaEntrada, mod.nuevaSalida] : horarios[emp];
      if (!h || typeof h[0] !== 'number' || h[1] <= h[0]) continue;
      intervalos.push({ alias: emp, e: h[0], s: h[1] });
    }

    // 2. Sustituciones del día (L-V, no FdS)
    const susts = Store.getSustituciones();
    for (const sust of susts) {
      if (sust.fecha !== fs || sust.tienda !== tienda || sust.turnoFds) continue;

      // Si el sustituto ya tenía un turno base que SOLAPA con la sustitución → se mueve (sustituye su intervalo)
      // Si no solapa → comodín, suma turno extra
      const idxBase = intervalos.findIndex(it => it.alias === sust.sustituto);
      if (idxBase >= 0) {
        const it = intervalos[idxBase];
        const seSolapan = !(sust.salida <= it.e || it.s <= sust.entrada);
        if (seSolapan) intervalos.splice(idxBase, 1);
      }
      intervalos.push({ alias: sust.sustituto, e: sust.entrada, s: sust.salida });
    }

    return intervalos;
  },

  /**
   * Cobertura mínima REAL en una franja (sweep line):
   * recorre todos los puntos de evento (entradas/salidas) dentro de la
   * ventana de la franja y devuelve el menor número de empleados
   * presentes simultáneamente. Detecta huecos como el de MORILLA solo
   * 15-16:45 cuando SILVIA falta.
   */
  _minCoberturaEnFranja(intervalos, ventana) {
    const [w0, w1] = ventana;
    // Eventos dentro de la ventana
    const eventos = [];
    for (const it of intervalos) {
      const e = Math.max(it.e, w0);
      const s = Math.min(it.s, w1);
      if (s <= e) continue; // no toca la ventana
      eventos.push({ t: e, d: +1 });
      eventos.push({ t: s, d: -1 });
    }
    if (eventos.length === 0) return 0;

    // Ordenar; en empate, primero las salidas (-1) que las entradas (+1)
    // para detectar huecos puntuales correctamente
    eventos.sort((a, b) => a.t - b.t || a.d - b.d);

    let activos = 0;
    let minActivos = Infinity;
    let cursor = w0;

    for (const ev of eventos) {
      // Si avanzamos en el tiempo, evaluamos el tramo [cursor, ev.t)
      if (ev.t > cursor && cursor < w1) {
        // Hay un tramo dentro de la ventana donde había `activos` personas
        if (activos < minActivos) minActivos = activos;
      }
      activos += ev.d;
      cursor = ev.t;
    }
    // Tramo final hasta w1
    if (cursor < w1 && activos < minActivos) minActivos = activos;

    return minActivos === Infinity ? 0 : minActivos;
  },

  // ── Verificar mínimos L-V ──────────────────────────────────

  /**
   * Devuelve un array de alertas de franjas bajo mínimos.
   * Usa sweep-line dentro de la ventana de cada franja, NO solapamiento
   * simple, para detectar discontinuidades (ej: MORILLA solo 15-16:45).
   * [{franja, actual, minimo, falta}]
   */
  verificarMinimosLV(fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return [];

    const intervalos = Cobertura._intervalosLV(fecha, tienda);

    const alertas = [];
    const franjas = ['descarga', 'mañanas', 'tardes', 'cierre'];

    for (const fr of franjas) {
      const min = CONFIG.getMinimoLV(tienda, fr, dow);
      const ventana = CONFIG.getFranjaVentana(tienda, fr, dow);
      if (!ventana) continue;
      const actual = Cobertura._minCoberturaEnFranja(intervalos, ventana);
      if (actual < min) {
        alertas.push({ franja: fr, actual, minimo: min, falta: min - actual });
      }
    }

    return alertas;
  },

  // ── Cobertura FdS ──────────────────────────────────────────

  /**
   * Calcula cobertura FdS para un turno concreto (SAB_M, SAB_T, DOM_M, DOM_T)
   */
  calcularFds(fecha, turno, tienda) {
    tienda = tienda || Store.getTienda();
    const fs = Utils.formatFecha(fecha);
    const fdsData = Rotaciones.getFds(fecha, tienda);
    if (!fdsData[turno]) return [];

    const cobertura = [];

    // Empleados base no ausentes
    for (const emp in fdsData[turno]) {
      if (!Store.estaAusente(emp, fs, tienda)) {
        cobertura.push(emp);
      }
    }

    // Aplicar sustituciones FdS
    const susts = Store.getSustituciones();
    for (const sust of susts) {
      if (sust.fecha !== fs || sust.tienda !== tienda || sust.turnoFds !== turno) continue;
      // El sustituto entra (si no estaba ya)
      if (!cobertura.includes(sust.sustituto)) {
        cobertura.push(sust.sustituto);
      }
    }

    return cobertura;
  },

  /**
   * Verifica mínimos FdS para todos los turnos del día.
   * Si el turno tiene sub-tramos definidos en CONFIG.SUBTRAMOS_FDS,
   * los verifica uno por uno; si no, usa el mínimo único.
   */
  verificarMinimosFds(fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const dow = fecha.getDay();
    if (dow !== 0 && dow !== 6) return [];

    const turnos = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
    const alertas = [];

    for (const turno of turnos) {
      const subTramos = (CONFIG.SUBTRAMOS_FDS[tienda] || {})[turno];
      if (subTramos && subTramos.length > 0) {
        // Verificación por sub-tramos horarios
        for (const tramo of subTramos) {
          const presentes = Cobertura.calcularFdsEnTramo(fecha, turno, tienda, tramo.desde, tramo.hasta);
          const actual = presentes.length;
          if (actual < tramo.minimo) {
            alertas.push({
              franja: turno + ' ' + tramo.etiqueta + ' (' +
                      Utils.formatHora(tramo.desde) + '-' + Utils.formatHora(tramo.hasta) + ')',
              actual, minimo: tramo.minimo, falta: tramo.minimo - actual
            });
          }
        }
      } else {
        const cobertura = Cobertura.calcularFds(fecha, turno, tienda);
        const actual = cobertura.length;
        const min = CONFIG.getMinimoFds(tienda, turno);
        if (actual < min) {
          alertas.push({ franja: turno, actual, minimo: min, falta: min - actual });
        }
      }
    }

    return alertas;
  },

  /**
   * Empleados presentes en un tramo horario [desde, hasta) de un turno FdS,
   * considerando ausencias y sustituciones. Solapamiento con intervalo abierto por la derecha.
   */
  calcularFdsEnTramo(fecha, turno, tienda, desde, hasta) {
    tienda = tienda || Store.getTienda();
    const fs = Utils.formatFecha(fecha);
    const fdsData = Rotaciones.getFds(fecha, tienda);
    if (!fdsData[turno]) return [];

    const presentes = [];
    const solapa = (e, s) => e < hasta && s > desde;

    // Base
    for (const emp in fdsData[turno]) {
      if (Store.estaAusente(emp, fs, tienda)) continue;
      const h = fdsData[turno][emp];
      if (Array.isArray(h) && solapa(h[0], h[1]) && !presentes.includes(emp)) {
        presentes.push(emp);
      }
    }

    // Sustituciones FdS
    const susts = Store.getSustituciones();
    for (const sust of susts) {
      if (sust.fecha !== fs || sust.tienda !== tienda || sust.turnoFds !== turno) continue;
      if (solapa(sust.entrada, sust.salida) && !presentes.includes(sust.sustituto)) {
        presentes.push(sust.sustituto);
      }
    }

    return presentes;
  },

  // ── Detectar turnos sin cubrir ─────────────────────────────

  /**
   * Detecta empleados ausentes que no tienen sustituto.
   * Devuelve [{emp, franja, entrada, salida, turnoFds, bajoMinimos, descartado, motivoDescarte}]
   */
  detectarSinCubrir(fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const fs = Utils.formatFecha(fecha);
    const dow = fecha.getDay();
    const sinCubrir = [];
    const ausencias = Store.getAusencias(tienda);

    for (const a of ausencias) {
      if (a.desde > fs || a.hasta < fs) continue;
      const emp = a.empleado;

      if (dow >= 1 && dow <= 5) {
        // L-V
        const horarios = Rotaciones.getHorariosLV(fecha, tienda);
        if (horarios && horarios[emp]) {
          const tieneSust = Store.getSustituto(fs, emp, tienda);
          if (!tieneSust) {
            const franja = Utils.getFranja(horarios[emp][0], horarios[emp][1], tienda);
            const alertasMin = Cobertura.verificarMinimosLV(fecha, tienda);
            const bajoMin = alertasMin.some(al => al.franja === franja);
            const desc = Store.esDescartado(fs, emp, tienda, null);
            sinCubrir.push({
              emp, franja,
              entrada: horarios[emp][0],
              salida: horarios[emp][1],
              turnoFds: null,
              bajoMinimos: bajoMin,
              descartado: !!desc,
              motivoDescarte: desc ? desc.motivo : ''
            });
          }
        }
      } else if (dow === 0 || dow === 6) {
        // FdS
        const fdsData = Rotaciones.getFds(fecha, tienda);
        const turnos = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
        for (const tk of turnos) {
          if (fdsData[tk] && fdsData[tk][emp]) {
            const tieneSust = Store.getSustituto(fs, emp, tienda, tk);
            if (!tieneSust) {
              const cob = Cobertura.calcularFds(fecha, tk, tienda);
              const min = CONFIG.getMinimoFds(tienda, tk);
              const bajoMin = cob.length < min;
              const desc = Store.esDescartado(fs, emp, tienda, tk);
              sinCubrir.push({
                emp, franja: tk,
                entrada: fdsData[tk][emp][0],
                salida: fdsData[tk][emp][1],
                turnoFds: tk,
                bajoMinimos: bajoMin,
                descartado: !!desc,
                motivoDescarte: desc ? desc.motivo : ''
              });
            }
          }
        }
      }
    }

    return sinCubrir;
  },

  // ── Verificar efecto de mover un sustituto ─────────────────

  /**
   * Si movemos a un empleado de su franja origen para sustituir,
   * ¿queda su franja origen bajo mínimos?
   */
  verificarEfectoSustituto(sustituto, fecha, tienda, franjaDestino) {
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return null;

    const horarios = Rotaciones.getHorariosLV(fecha, tienda);
    if (!horarios || !horarios[sustituto]) return null;

    const hSust = horarios[sustituto];
    const frOrigen = Utils.getFranja(hSust[0], hSust[1], tienda);

    // Si no cambia de franja, no hay efecto
    if (frOrigen === franjaDestino) return null;

    const cobertura = Cobertura.calcularLV(fecha, tienda);
    if (!cobertura) return null;

    const actualOrigen = cobertura[frOrigen].length;
    const minOrigen = CONFIG.getMinimoLV(tienda, frOrigen, dow);

    if (actualOrigen - 1 < minOrigen) {
      return {
        franja: frOrigen,
        actual: actualOrigen,
        sinSustituto: actualOrigen - 1,
        minimo: minOrigen
      };
    }

    return null;
  }
};
