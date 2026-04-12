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
        // Movimiento (default): siempre se saca de origen
        // Extra: solo se saca si los horarios solapan
        const esMovimiento = !sust.tipo || sust.tipo === 'movimiento';
        const seSolapan = !(sust.salida <= hOrig[0] || hOrig[1] <= sust.entrada);
        if (esMovimiento || seSolapan) {
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

      // Movimiento (default): reemplaza el intervalo base del sustituto
      // Extra: solo reemplaza si solapa
      const idxBase = intervalos.findIndex(it => it.alias === sust.sustituto);
      if (idxBase >= 0) {
        const it = intervalos[idxBase];
        const esMovimiento = !sust.tipo || sust.tipo === 'movimiento';
        const seSolapan = !(sust.salida <= it.e || it.s <= sust.entrada);
        if (esMovimiento || seSolapan) intervalos.splice(idxBase, 1);
      }
      intervalos.push({ alias: sust.sustituto, e: sust.entrada, s: sust.salida });
    }

    return intervalos;
  },

  /**
   * Cobertura mínima REAL en una franja (sweep line):
   * recorre todos los puntos de evento (entradas/salidas) dentro de la
   * ventana de la franja y devuelve el menor número de empleados
   * presentes simultáneamente. Conservado para auditoría profunda.
   */
  _minCoberturaEnFranja(intervalos, ventana) {
    const [w0, w1] = ventana;
    const eventos = [];
    for (const it of intervalos) {
      const e = Math.max(it.e, w0);
      const s = Math.min(it.s, w1);
      if (s <= e) continue;
      eventos.push({ t: e, d: +1 });
      eventos.push({ t: s, d: -1 });
    }
    if (eventos.length === 0) return 0;

    eventos.sort((a, b) => a.t - b.t || a.d - b.d);

    let activos = 0;
    let minActivos = Infinity;
    let cursor = w0;

    for (const ev of eventos) {
      if (ev.t > cursor && cursor < w1) {
        if (activos < minActivos) minActivos = activos;
      }
      activos += ev.d;
      cursor = ev.t;
    }
    if (cursor < w1 && activos < minActivos) minActivos = activos;

    return minActivos === Infinity ? 0 : minActivos;
  },

  /**
   * Cuenta empleados con overlap significativo (≥1.5h) con una franja.
   * Descarta a quien apenas toca la ventana (ej: FRANCIS cierre con 1h
   * en tardes, ALEX 15min en cierre) sin penalizar llegadas escalonadas.
   */
  _coberturaSignificativa(intervalos, ventana) {
    const [w0, w1] = ventana;
    const UMBRAL_HORAS = 1.5; // mínimo 1.5h de overlap para contar
    let count = 0;
    for (const it of intervalos) {
      const overlap = Math.min(it.s, w1) - Math.max(it.e, w0);
      if (overlap >= UMBRAL_HORAS) count++;
    }
    return count;
  },

  /**
   * Simula una sustitución y verifica con sweep line que TODAS las
   * franjas mantienen continuidad (mínimo simultáneo ≥ requerido).
   * Devuelve array de alertas (vacío = la sustitución es segura).
   *
   * Para tipo 'movimiento' (default), retira al sustituto de su
   * intervalo original antes de añadir el nuevo.
   */
  verificarContinuidadConSustitucion(fecha, tienda, sustAlias, sustEntrada, sustSalida, tipo) {
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return []; // Solo L-V por ahora

    // Obtener intervalos actuales (ya descuenta ausentes y subs aplicadas)
    const intervalos = Cobertura._intervalosLV(fecha, tienda);

    // Simular: quitar intervalo original del sustituto (movimiento)
    const esMovimiento = !tipo || tipo === 'movimiento';
    if (esMovimiento) {
      const idx = intervalos.findIndex(it => it.alias === sustAlias);
      if (idx >= 0) intervalos.splice(idx, 1);
    }

    // Simular: añadir el intervalo de la sustitución
    intervalos.push({ alias: sustAlias, e: sustEntrada, s: sustSalida });

    // Verificar sweep line en todas las franjas
    const alertas = [];
    for (const fr of ['descarga', 'mañanas', 'tardes', 'cierre']) {
      const min = CONFIG.getMinimoLV(tienda, fr, dow);
      const ventana = CONFIG.getFranjaVentana(tienda, fr, dow);
      if (!ventana || min === 0) continue;
      const actual = Cobertura._minCoberturaEnFranja(intervalos, ventana);
      if (actual < min) {
        alertas.push({ franja: fr, actual, minimo: min });
      }
    }

    return alertas;
  },

  // ── Verificar mínimos L-V ──────────────────────────────────

  /**
   * Devuelve un array de alertas de franjas bajo mínimos.
   * Usa sweep line estricto: cero tolerancia, ni 1 minuto bajo mínimo.
   * Las ventanas de franja deben estar ajustadas a cuando los empleados
   * realmente están (no antes del primer turno de la franja).
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
   * Verifica mínimos de UN turno FdS concreto.
   * Devuelve array de alertas (vacío = todo OK).
   */
  verificarMinimosTurnoFds(fecha, turno, tienda) {
    tienda = tienda || Store.getTienda();
    const alertas = [];
    const subTramos = (CONFIG.SUBTRAMOS_FDS[tienda] || {})[turno];

    if (subTramos && subTramos.length > 0) {
      for (const tramo of subTramos) {
        const presentes = Cobertura.calcularFdsEnTramo(fecha, turno, tienda, tramo.desde, tramo.hasta);
        if (presentes.length < tramo.minimo) {
          alertas.push({
            franja: tramo.etiqueta + ' (' + Utils.formatHora(tramo.desde) + '-' + Utils.formatHora(tramo.hasta) + ')',
            actual: presentes.length, minimo: tramo.minimo, falta: tramo.minimo - presentes.length
          });
        }
      }
    } else {
      const cobertura = Cobertura.calcularFds(fecha, turno, tienda);
      const min = CONFIG.getMinimoFds(tienda, turno);
      if (cobertura.length < min) {
        alertas.push({ franja: turno, actual: cobertura.length, minimo: min, falta: min - cobertura.length });
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
