// ============================================================
// YOLANDA HP — motor-sustituciones.js
// EL CORAZÓN — motor inteligente de sustituciones
//
// Principio fundamental:
//   NO siempre hay que sustituir.
//   Solo cuando los mínimos se rompen.
// ============================================================

'use strict';

const Motor = {

  // ── Estado del motor ───────────────────────────────────────
  _propuestas: [],
  _sinSolucion: [],

  // ── Análisis principal del mes ─────────────────────────────

  /**
   * Escanea el mes visible en ambas tiendas y propone sustituciones
   * solo cuando se rompen los mínimos.
   *
   * Devuelve { propuestas: [...], sinSolucion: [...] }
   */
  analizarMes() {
    Motor._propuestas = [];
    Motor._sinSolucion = [];

    const sinCubrir = Motor._escanearSinCubrir();

    if (sinCubrir.length === 0) {
      return { propuestas: [], sinSolucion: [] };
    }

    // Para cada turno sin cubrir, decidir si hace falta sustituir
    const sustSimuladas = []; // sustituciones ya propuestas en esta ronda

    for (const turno of sinCubrir) {
      // ── REGLA FUNDAMENTAL ──
      // ¿Se cumplen los mínimos sin esta persona?
      // Si SÍ, no sustituir. Si NO, buscar sustituto.
      if (!turno.bajoMinimos) {
        continue; // Mínimos cumplidos, no hace falta
      }

      // Buscar candidatos válidos
      const candidatos = Motor._obtenerCandidatos(turno, sustSimuladas);

      if (candidatos.length > 0) {
        // El mejor candidato (ordenado por prioridad)
        const mejor = candidatos[0];
        const propuesta = {
          tienda: turno.tienda,
          fecha: turno.fecha,
          ausente: turno.emp,
          sustituto: mejor.alias,
          entrada: mejor.entrada,
          salida: mejor.salida,
          franja: turno.turnoFds ? '' : turno.franja,
          turnoFds: turno.turnoFds || '',
          bajoMinimos: turno.bajoMinimos,
          alternativas: candidatos.slice(1)
        };
        Motor._propuestas.push(propuesta);
        sustSimuladas.push(propuesta);
      } else {
        // Sin solución → "necesitas eventual"
        Motor._sinSolucion.push(turno);
      }
    }

    return {
      propuestas: Motor._propuestas,
      sinSolucion: Motor._sinSolucion
    };
  },

  // ── Escanear todos los turnos sin cubrir del mes ───────────

  _escanearSinCubrir() {
    const sinCubrir = [];
    const tiendaOriginal = Store.getTienda();
    const tiendas = ['granvia', 'isabel'];
    const mes = Store.getMes();
    const año = Store.getAño();

    for (const tienda of tiendas) {
      const inicio = new Date(año, mes, 1);
      const fin = new Date(año, mes + 1, 0);

      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        const fecha = new Date(d);
        const items = Cobertura.detectarSinCubrir(fecha, tienda);

        for (const item of items) {
          if (item.descartado) continue; // ignorar descartados manualmente
          sinCubrir.push({
            tienda,
            fecha: new Date(fecha),
            fechaStr: Utils.formatFecha(fecha),
            emp: item.emp,
            franja: item.franja,
            entrada: item.entrada,
            salida: item.salida,
            turnoFds: item.turnoFds,
            bajoMinimos: item.bajoMinimos
          });
        }
      }
    }

    // Ordenar: 1) bajo mínimos primero, 2) por fecha, 3) GV antes que Isabel
    sinCubrir.sort((a, b) => {
      if (a.bajoMinimos !== b.bajoMinimos) return a.bajoMinimos ? -1 : 1;
      if (a.fechaStr !== b.fechaStr) return a.fechaStr < b.fechaStr ? -1 : 1;
      if (a.tienda !== b.tienda) return a.tienda === 'granvia' ? -1 : 1;
      return 0;
    });

    return sinCubrir;
  },

  // ── Obtener candidatos válidos ordenados por prioridad ─────

  _obtenerCandidatos(turno, sustSimuladas) {
    const candidatos = [];
    const tienda = turno.tienda;

    // Empleados de esta tienda + compartidos de la otra (solo L-V)
    const empsTienda = tienda === 'granvia' ? Store.get('empleadosGV') : Store.get('empleadosIS');
    const empsOtra = tienda === 'granvia' ? Store.get('empleadosIS') : Store.get('empleadosGV');

    const candidatosPosibles = {};
    for (const k in empsTienda) candidatosPosibles[k] = empsTienda[k];

    // Compartidos de GV solo para Isabel L-V (NO para FdS Isabel)
    const esFdsIsabel = turno.turnoFds && tienda === 'isabel';
    if (!esFdsIsabel) {
      for (const k in empsOtra) {
        if (empsOtra[k].tienda === 'ambas' && !candidatosPosibles[k]) {
          candidatosPosibles[k] = empsOtra[k];
        }
      }
    }

    for (const alias in candidatosPosibles) {
      if (alias === turno.emp) continue;

      // Calcular horario propuesto
      let horasSust, entradaSust, salidaSust;
      if (turno.turnoFds) {
        entradaSust = turno.entrada;
        salidaSust = entradaSust + CONFIG.HORAS_FDS_SUSTITUTO;
      } else {
        horasSust = Reglas.calcularHorasDiarias(alias, turno.fecha, tienda);
        // Caso comodín: si es compartido y tiene más horas en la otra tienda, usar esas
        const empData = candidatosPosibles[alias];
        if (empData.tienda === 'ambas') {
          const otraTienda = tienda === 'granvia' ? 'isabel' : 'granvia';
          const horasOtra = Reglas.calcularHorasDiarias(alias, turno.fecha, otraTienda);
          if (horasOtra > horasSust) horasSust = horasOtra;
        }
        entradaSust = turno.entrada;
        salidaSust = entradaSust + horasSust;
      }
      const ajuste = Utils.ajustarHorarioSustituto(entradaSust, salidaSust);
      entradaSust = ajuste.entrada;
      salidaSust = ajuste.salida;

      // Construir objeto turno para validación
      const turnoValidacion = {
        tienda,
        fecha: turno.fecha,
        ausente: turno.emp,
        franja: turno.franja,
        turnoFds: turno.turnoFds,
        entrada: entradaSust,
        salida: salidaSust
      };

      // Verificar si ya está asignado en esta misma ronda
      let yaAsignado = false;
      for (const sim of sustSimuladas) {
        if (sim.sustituto === alias) {
          if (sim.fecha === turno.fechaStr || (sim.fecha instanceof Date && Utils.formatFecha(sim.fecha) === turno.fechaStr)) {
            // Mismo día → verificar si solapan
            const simEntrada = sim.entrada;
            const simSalida = sim.salida;
            if (!(salidaSust <= simEntrada || simSalida <= entradaSust)) {
              yaAsignado = true;
              break;
            }
          }
        }
      }
      if (yaAsignado) continue;

      // Validar con todas las reglas
      const validacion = Reglas.validarCandidato(alias, turnoValidacion);

      if (!validacion.valido) continue;

      // Calcular puntuación de prioridad
      const empData = candidatosPosibles[alias];
      const lunes = Utils.getLunesDeSemana(turno.fecha);
      const horasSemana = Motor._calcularHorasSemanales(alias, lunes);
      const contratoTienda = tienda === 'granvia'
        ? (Store.getEmpleado(alias, 'granvia')?.contrato || 0)
        : (Store.getEmpleado(alias, 'isabel')?.contrato || 0);
      const totalSemana = tienda === 'granvia' ? horasSemana.gv : horasSemana.is;
      const margen = contratoTienda - totalSemana; // positivo = le faltan horas

      // Es propio de la tienda?
      const esPropio = (empData.tienda === tienda) ||
                       (empData.tienda !== 'ambas' && tienda === 'isabel');

      // Es del grupo de descarga GV?
      const esGrupoDescarga = Reglas.esGrupoDescargaGV(alias);

      // Tiene avisos (no son errores pero hay que tenerlo en cuenta)
      const tieneAvisos = validacion.avisos.length > 0;

      // ── CALCULAR EXCEDENTE DE FRANJA ORIGEN ────────────
      // Cuanto más excedente tenga su franja origen sobre el mínimo,
      // mejor candidato es (porque al moverse no deja problemas).
      let excedenteOrigen = 0;
      if (!turno.turnoFds) {
        const dowDia = turno.fecha.getDay();
        const horariosDia = Rotaciones.getHorariosLV(turno.fecha, tienda);
        if (horariosDia && horariosDia[alias]) {
          const hOrig = horariosDia[alias];
          const frOrig = Utils.getFranja(hOrig[0], hOrig[1], tienda);
          if (frOrig !== turno.franja) {
            const cobOrig = Cobertura.calcularLV(turno.fecha, tienda);
            const minOrig = CONFIG.getMinimoLV(tienda, frOrig, dowDia);
            const actualOrig = cobOrig ? cobOrig[frOrig].length : 0;
            excedenteOrigen = actualOrig - minOrig;
          } else {
            // Misma franja: no se mueve, excedente teórico alto
            excedenteOrigen = 99;
          }
        } else {
          // No tiene turno base ese día → no resta de ningún sitio
          excedenteOrigen = 99;
        }
      }

      candidatos.push({
        alias,
        entrada: entradaSust,
        salida: salidaSust,
        margen,
        excedenteOrigen,
        esPropio,
        esGrupoDescarga,
        tieneAvisos,
        avisos: validacion.avisos,
        color: empData.color || '#666'
      });
    }

    // Ordenar por prioridad:
    // 1) Sin avisos antes que con avisos
    // 2) Si turno es descarga GV, priorizar grupo descarga (LETI/DAVID/EDU)
    // 3) Empleados propios antes que prestados
    // 4) MAYOR EXCEDENTE en franja origen (mover a quien sobra más)
    // 5) Mayor margen de horas vs contrato
    candidatos.sort((a, b) => {
      // Si turno descarga GV, priorizar LETI/DAVID/EDU entre ellos
      if (turno.tienda === 'granvia' && turno.franja === 'descarga') {
        if (a.esGrupoDescarga !== b.esGrupoDescarga) {
          return a.esGrupoDescarga ? -1 : 1;
        }
      }
      if (a.tieneAvisos !== b.tieneAvisos) return a.tieneAvisos ? 1 : -1;
      if (a.esPropio !== b.esPropio) return a.esPropio ? -1 : 1;
      if (a.excedenteOrigen !== b.excedenteOrigen) return b.excedenteOrigen - a.excedenteOrigen;
      return b.margen - a.margen;
    });

    return candidatos;
  },

  // ── Cálculo simple de horas semanales ──────────────────────

  _calcularHorasSemanales(alias, fechaLunes) {
    let totalGV = 0, totalIS = 0;

    // L-V
    for (let d = 0; d < 5; d++) {
      const dia = new Date(fechaLunes);
      dia.setDate(dia.getDate() + d);
      const fs = Utils.formatFecha(dia);

      const horariosGV = Rotaciones.getHorariosGV(dia);
      if (horariosGV && horariosGV[alias] && !Store.estaAusente(alias, fs, 'granvia')) {
        totalGV += horariosGV[alias][1] - horariosGV[alias][0];
      }

      const horariosIS = Rotaciones.getHorariosIS(dia);
      if (horariosIS && horariosIS[alias] && !Store.estaAusente(alias, fs, 'isabel')) {
        totalIS += horariosIS[alias][1] - horariosIS[alias][0];
      }
    }

    // FdS
    const sab = new Date(fechaLunes); sab.setDate(sab.getDate() + 5);
    const dom = new Date(fechaLunes); dom.setDate(dom.getDate() + 6);
    const fdsGV = Rotaciones.getFdsGV(sab);
    const fdsIS = Rotaciones.getFdsIS(sab);
    const turnosFds = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
    const diasFds = [sab, sab, dom, dom];

    for (let i = 0; i < 4; i++) {
      const tk = turnosFds[i];
      const dia = diasFds[i];
      if (fdsGV[tk] && fdsGV[tk][alias] && !Store.estaAusente(alias, dia, 'granvia')) {
        totalGV += fdsGV[tk][alias][1] - fdsGV[tk][alias][0];
      }
      if (fdsIS[tk] && fdsIS[tk][alias] && !Store.estaAusente(alias, dia, 'isabel')) {
        totalIS += fdsIS[tk][alias][1] - fdsIS[tk][alias][0];
      }
    }

    return { gv: totalGV, is: totalIS };
  },

  // ── Aplicar propuestas ─────────────────────────────────────

  aplicarPropuestas(propuestasAplicar) {
    let count = 0;
    for (const p of propuestasAplicar) {
      const sust = {
        fecha: typeof p.fecha === 'string' ? p.fecha : Utils.formatFecha(p.fecha),
        ausente: p.ausente,
        sustituto: p.sustituto,
        entrada: p.entrada,
        salida: p.salida,
        franja: p.franja || '',
        turnoFds: p.turnoFds || '',
        tienda: p.tienda
      };
      Store.addSustitucion(sust);
      count++;
    }
    if (count > 0) Sync.syncSustituciones();
    return count;
  },

  // ── Buscar sustituto manualmente para un turno concreto ────

  /**
   * Busca y devuelve los candidatos válidos para un ausente en un turno.
   * Usado por el modal de asignación manual.
   */
  buscarCandidatosManual(fecha, ausente, tienda, turnoFds) {
    const dow = fecha.getDay();
    let entrada, salida, franja;

    if (turnoFds) {
      const fdsData = Rotaciones.getFds(fecha, tienda);
      const turno = fdsData[turnoFds] && fdsData[turnoFds][ausente];
      if (!turno) return [];
      entrada = turno[0];
      salida = turno[1];
    } else {
      const horarios = Rotaciones.getHorariosLV(fecha, tienda);
      const turno = horarios && horarios[ausente];
      if (!turno) return [];
      entrada = turno[0];
      salida = turno[1];
      franja = Utils.getFranja(entrada, salida, tienda);
    }

    const turnoObj = {
      tienda,
      fecha,
      fechaStr: Utils.formatFecha(fecha),
      emp: ausente,
      franja,
      turnoFds,
      entrada,
      salida,
      bajoMinimos: true // Siempre proponer si lo está pidiendo el usuario
    };

    return Motor._obtenerCandidatos(turnoObj, []);
  }
};
