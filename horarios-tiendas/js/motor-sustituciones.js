// ============================================================
// HORARIOS KIRA & REYPIK — motor-sustituciones.js
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
      // L-V: solo proponer si los mínimos se rompen.
      // FdS: además, proponer OPCIONAL si hay ausente sin cubrir y algún
      // candidato viene de otro turno del mismo FdS con excedente real ≥ 1
      // (equilibrio del fin de semana, sin bajar ningún turno origen).
      const esOpcional = !turno.bajoMinimos;
      if (esOpcional && !turno.turnoFds) continue; // L-V sigue igual

      // Buscar candidatos válidos
      let candidatos = Motor._obtenerCandidatos(turno, sustSimuladas);

      // Propuesta opcional: solo candidatos con turno origen en el FdS y
      // excedente real ≥ 1. Descarta refuerzos externos (excedente 99).
      if (esOpcional) {
        candidatos = candidatos.filter(c =>
          c.turnoOrigenFds && c.excedenteOrigen >= 1 && c.excedenteOrigen < 99
        );
        if (candidatos.length === 0) continue; // no forzar, no ir a sinSolucion
      }

      // Verificar continuidad de mínimos (sweep line) — AVISO, no bloqueante
      if (!turno.turnoFds && candidatos.length > 0) {
        for (const c of candidatos) {
          const alertas = Cobertura.verificarContinuidadConSustitucion(
            turno.fecha, turno.tienda, c.alias, c.entrada, c.salida, 'movimiento'
          );
          if (alertas.length > 0) {
            const detalle = alertas.map(a => a.franja + ' ' + a.actual + '/' + a.minimo).join(', ');
            c.avisos = c.avisos || [];
            c.avisos.push('\u26a0 Gap: ' + detalle);
            c.tieneAvisos = true;
          }
        }
      }

      if (candidatos.length > 0) {
        // El mejor candidato (ordenado por prioridad)
        const mejor = candidatos[0];
        const propuesta = {
          accion: 'sustituir',
          opcional: esOpcional,
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
        // Estrategia 2: REORGANIZAR — mover a alguien que ya trabaja ese
        // día desde otra franja, manteniendo sus horas totales.
        const reorg = Motor._reorganizar(turno);
        if (reorg) {
          Motor._propuestas.push(reorg);
        } else {
          // Sin solución → "necesitas eventual"
          Motor._sinSolucion.push(turno);
        }
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

    // FdS: incluir TODOS los empleados de la rotación FdS de esta tienda,
    // aunque su ficha diga otra tienda (ej: ALEX trabaja Isabel L-V pero GV FdS)
    if (turno.turnoFds) {
      const fdsRotacion = Rotaciones.getFds(turno.fecha, tienda);
      for (const tk of ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T']) {
        if (fdsRotacion[tk]) {
          for (const emp in fdsRotacion[tk]) {
            if (!candidatosPosibles[emp]) {
              const empData = Store.getEmpleado(emp, tienda) ||
                              Store.getEmpleado(emp, tienda === 'granvia' ? 'isabel' : 'granvia');
              if (empData) candidatosPosibles[emp] = empData;
            }
          }
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

      // ── CALCULAR EXCEDENTE DE FRANJA/TURNO ORIGEN ──────
      // Cuanto más excedente tenga su origen sobre el mínimo,
      // mejor candidato es (porque al moverse no deja problemas).
      let excedenteOrigen = 0;
      let turnoOrigen = null;
      let coberturaOrigenTotal = 0;
      if (turno.turnoFds) {
        // ── FdS: excedente del turno de origen del candidato ──
        const fdsData = Rotaciones.getFds(turno.fecha, tienda);
        const dow = turno.fecha.getDay();
        const turnosFds = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
        // También buscar en el otro día del FdS
        // IMPORTANTE: usar fdsData (del sábado) para rotación, igual que el display.
        // Solo usar otroDia para comprobar ausencias del otro día.
        const otroDia = new Date(turno.fecha);
        if (dow === 6) otroDia.setDate(otroDia.getDate() + 1);
        else otroDia.setDate(otroDia.getDate() - 1);
        const otroDow = otroDia.getDay();
        const turnosOtroDia = otroDow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
        const otroDiaFs = Utils.formatFecha(otroDia);

        // Buscar en qué turno FdS está este candidato (mismo día y otro día)
        for (const tk of turnosFds) {
          if (tk === turno.turnoFds) continue;
          if (fdsData[tk] && fdsData[tk][alias]) {
            const cob = Cobertura.calcularFds(turno.fecha, tk, tienda);
            const min = CONFIG.getMinimoFds(tienda, tk);
            const exc = cob.length - min;
            if (exc > excedenteOrigen) {
              excedenteOrigen = exc;
              turnoOrigen = tk;
              coberturaOrigenTotal = cob.length;
            }
          }
        }
        for (const tk of turnosOtroDia) {
          if (fdsData[tk] && fdsData[tk][alias]) {
            // Contar cobertura usando rotación de fdsData + ausencias del otro día
            let cobCount = 0;
            for (const emp in fdsData[tk]) {
              if (!Store.estaAusente(emp, otroDiaFs, tienda)) cobCount++;
            }
            const min = CONFIG.getMinimoFds(tienda, tk);
            const exc = cobCount - min;
            if (exc > excedenteOrigen) {
              excedenteOrigen = exc;
              turnoOrigen = tk;
              coberturaOrigenTotal = cobCount;
            }
          }
        }

        // Si no tiene turno base en ningún FdS → no resta de ningún sitio
        if (!turnoOrigen) excedenteOrigen = 99;
        // Nunca sacar de un turno en su mínimo exacto (excedente 0)
        if (turnoOrigen && excedenteOrigen <= 0) continue;
      } else {
        // ── L-V: excedente de franja origen ──
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
            excedenteOrigen = 99;
          }
        } else {
          excedenteOrigen = 99;
        }
      }

      candidatos.push({
        alias,
        entrada: entradaSust,
        salida: salidaSust,
        margen,
        excedenteOrigen,
        turnoOrigenFds: turno.turnoFds ? (turnoOrigen || '') : '',
        coberturaOrigenTotal: turno.turnoFds ? (coberturaOrigenTotal || 0) : 0,
        esPropio,
        esGrupoDescarga,
        tieneAvisos,
        avisos: validacion.avisos,
        color: empData.color || '#666',
        preferenciaScore: 0
      });
    }

    // ── Capa 2: puntuación de preferencia basada en decisiones anteriores ──
    const decisiones = Store.getDecisiones();
    if (decisiones.length > 0) {
      const franjaOTurno = turno.turnoFds || turno.franja;
      for (const c of candidatos) {
        let score = 0;
        for (const d of decisiones) {
          const dFranjaOTurno = d.turnoFds || d.franja;
          // Match: mismo ausente + misma franja/turno + misma tienda
          if (d.ausente === turno.emp && dFranjaOTurno === franjaOTurno && d.tienda === turno.tienda) {
            if (d.nachoEligio === c.alias) score++; // Nacho lo eligió
            if (d.motorSugirio === c.alias && d.nachoEligio !== c.alias) score--; // Nacho lo rechazó
          }
        }
        c.preferenciaScore = score;
      }
    } else {
      for (const c of candidatos) c.preferenciaScore = 0;
    }

    // Ordenar por prioridad:
    // ── Capa 2 (preferencia Nacho) tiene peso alto ──
    // ── FdS: DOM_M primero, luego turno con más personas ──
    // ── L-V: sin avisos, grupo descarga, propios, excedente, margen ──
    candidatos.sort((a, b) => {
      // Capa 2: preferencia de Nacho primero (si hay datos)
      if (a.preferenciaScore !== b.preferenciaScore) return b.preferenciaScore - a.preferenciaScore;
      if (turno.turnoFds) {
        // FdS: 1) DOM_M primero (si tiene excedente)
        const aEsDomM = a.turnoOrigenFds === 'DOM_M';
        const bEsDomM = b.turnoOrigenFds === 'DOM_M';
        if (aEsDomM !== bEsDomM) return aEsDomM ? -1 : 1;
        // 2) Más personas totales en turno origen
        if (a.coberturaOrigenTotal !== b.coberturaOrigenTotal) return b.coberturaOrigenTotal - a.coberturaOrigenTotal;
        // 3) Sin avisos antes que con avisos
        if (a.tieneAvisos !== b.tieneAvisos) return a.tieneAvisos ? 1 : -1;
        return 0;
      }

      // L-V
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

  // ── Estrategia 2: REORGANIZAR ──────────────────────────────

  /**
   * Intenta cubrir un turno bajo mínimos moviendo la franja horaria
   * de un empleado que ya trabaja ese día en otra franja, manteniendo
   * sus horas totales. Solo L-V por ahora.
   *
   * Devuelve una propuesta {accion: 'reorganizar', ...} o null.
   */
  _reorganizar(turno) {
    if (turno.turnoFds) return null; // FdS rígido — no por ahora

    const tienda = turno.tienda;
    const fecha = turno.fecha;
    const dow = fecha.getDay();
    const fs = turno.fechaStr;
    const franjaBuscada = turno.franja;

    const horariosDia = Rotaciones.getHorariosLV(fecha, tienda);
    if (!horariosDia) return null;

    // Cobertura actual (con sustituciones ya aplicadas en Store)
    const cob = Cobertura.calcularLV(fecha, tienda);
    if (!cob) return null;

    const candidatos = [];

    for (const alias in horariosDia) {
      if (alias === turno.emp) continue;
      if (Store.estaAusente(alias, fs, tienda)) continue;

      // Horario actual aplicando modificaciones
      const mod = Store.getModificacion(alias, fs, tienda, '');
      const hOrig = mod ? [mod.nuevaEntrada, mod.nuevaSalida] : horariosDia[alias];
      if (!hOrig || typeof hOrig[0] !== 'number') continue;

      const horasOrig = hOrig[1] - hOrig[0];
      if (horasOrig <= 0) continue;

      const frOrig = Utils.getFranja(hOrig[0], hOrig[1], tienda);
      if (frOrig === franjaBuscada) continue;

      // ¿Su franja origen aguanta perderlo?
      const minOrig = CONFIG.getMinimoLV(tienda, frOrig, dow);
      const actualOrig = (cob[frOrig] || []).length;
      const excedente = actualOrig - 1 - minOrig;
      if (excedente < 0) continue;

      // Calcular nuevo horario: misma duración, empezando en turno.entrada
      const nuevaEntrada = turno.entrada;
      const nuevaSalida = nuevaEntrada + horasOrig;
      if (nuevaSalida > 22.5 || nuevaEntrada < 5) continue;

      // El nuevo intervalo debe caer en la franja buscada
      const nuevaFr = Utils.getFranja(nuevaEntrada, nuevaSalida, tienda);
      if (nuevaFr !== franjaBuscada) continue;

      // Validar con Reglas (descanso, restricciones del empleado)
      const turnoVal = {
        tienda, fecha, ausente: turno.emp,
        franja: franjaBuscada, turnoFds: '',
        entrada: nuevaEntrada, salida: nuevaSalida
      };
      const v = Reglas.validarCandidato(alias, turnoVal);
      if (!v.valido) continue;

      candidatos.push({
        alias,
        hOrig,
        nuevaEntrada, nuevaSalida,
        excedente,
        avisos: v.avisos.length
      });
    }

    if (candidatos.length === 0) return null;

    // Mejor: sin avisos primero, luego mayor excedente
    candidatos.sort((a, b) => {
      if (a.avisos !== b.avisos) return a.avisos - b.avisos;
      return b.excedente - a.excedente;
    });

    const c = candidatos[0];
    const alternativas = candidatos.slice(1).map(a => ({
      alias: a.alias,
      entrada: a.nuevaEntrada,
      salida: a.nuevaSalida,
      entradaOriginal: a.hOrig[0],
      salidaOriginal: a.hOrig[1],
      excedenteOrigen: a.excedente,
      avisos: a.avisos > 0 ? ['Tiene avisos'] : []
    }));
    return {
      accion: 'reorganizar',
      tienda,
      fecha: turno.fecha,
      ausente: turno.emp,
      sustituto: c.alias,
      entrada: c.nuevaEntrada,
      salida: c.nuevaSalida,
      entradaOriginal: c.hOrig[0],
      salidaOriginal: c.hOrig[1],
      franja: franjaBuscada,
      turnoFds: '',
      bajoMinimos: turno.bajoMinimos,
      alternativas
    };
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
    let huboReorg = false;
    let huboSust = false;
    for (const p of propuestasAplicar) {
      const fechaStr = typeof p.fecha === 'string' ? p.fecha : Utils.formatFecha(p.fecha);

      if (p.accion === 'reorganizar') {
        Store.addModificacion({
          tienda: p.tienda,
          empleado: p.sustituto, // el movido
          fecha: fechaStr,
          turnoFds: '',
          entradaOriginal: p.entradaOriginal,
          salidaOriginal: p.salidaOriginal,
          nuevaEntrada: p.entrada,
          nuevaSalida: p.salida,
          motivo: 'Reorganización: cubrir mínimos por ausencia de ' + p.ausente
        });
        huboReorg = true;
        count++;
        continue;
      }

      Store.addSustitucion({
        fecha: fechaStr,
        ausente: p.ausente,
        sustituto: p.sustituto,
        entrada: p.entrada,
        salida: p.salida,
        franja: p.franja || '',
        turnoFds: p.turnoFds || '',
        tienda: p.tienda,
        tipo: p.tipo || 'movimiento'
      });
      huboSust = true;
      count++;
    }
    if (huboSust && typeof Sync !== 'undefined' && Sync.syncSustituciones) Sync.syncSustituciones();
    if (huboReorg && typeof Sync !== 'undefined' && Sync.syncModificaciones) Sync.syncModificaciones();
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
