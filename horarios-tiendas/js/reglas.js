// ============================================================
// HORARIOS KIRA & REYPIK — reglas.js
// Codificación de las 33 reglas de sustitución validadas
// ============================================================

'use strict';

const Reglas = {

  // ── Validar candidato a sustituto ──────────────────────────

  /**
   * Valida si un empleado puede sustituir a otro en un turno.
   * Devuelve { valido, errores: [...], avisos: [...] }
   *
   * Estructura del turno:
   * { tienda, fecha (Date), ausente, franja, turnoFds (null o 'SAB_M'...),
   *   entrada, salida }
   */
  validarCandidato(candidato, turno, opciones = {}) {
    const errores = [];
    const avisos = [];
    const fs = Utils.formatFecha(turno.fecha);
    const dow = turno.fecha.getDay();
    const esFds = (dow === 0 || dow === 6);
    const esLV = !esFds;

    // Buscar en la tienda del turno, si no en la otra (empleados FdS cross-tienda)
    let empData = Store.getEmpleado(candidato, turno.tienda);
    if (!empData) empData = Store.getEmpleado(candidato, turno.tienda === 'granvia' ? 'isabel' : 'granvia');
    if (!empData) {
      errores.push('No existe en la plantilla');
      return { valido: false, errores, avisos };
    }

    // No puede sustituirse a sí mismo
    if (candidato === turno.ausente) {
      errores.push('Es el mismo empleado');
      return { valido: false, errores, avisos };
    }

    // ── REGLA: candidato no activo (fecha de baja) o reemplazado ──
    // Si el empleado tiene fechaBaja pasada o figura como aliasOriginal en
    // un reemplazo activo, ya no está en la empresa — no puede sustituir.
    if (typeof Reemplazos !== 'undefined') {
      if (!Reemplazos.estaActivo(candidato, turno.fecha, turno.tienda)) {
        errores.push('No está activo en esa fecha (dado de baja)');
        return { valido: false, errores, avisos };
      }
      const remp = Reemplazos.getActivoEn(candidato, turno.fecha, turno.tienda);
      if (remp) {
        errores.push('Reemplazado por ' + remp.aliasNuevo + ' desde ' + remp.desde);
        return { valido: false, errores, avisos };
      }
    }

    // ── REGLA: ausente en este día ─────────────────────────
    // Return inmediato: si el candidato tambi\u00e9n est\u00e1 ausente, no tiene
    // sentido evaluar el resto. Antes solo se hac\u00eda push sin return, lo
    // que era inconsistente con otros checks tempranos y propenso a bug.
    if (Store.estaAusente(candidato, fs, turno.tienda)) {
      errores.push('Tambi\u00e9n est\u00e1 ausente');
      return { valido: false, errores, avisos };
    }

    // ── REGLA 16: EVA no FdS ───────────────────────────────
    if (candidato === 'EVA' && esFds) {
      errores.push('EVA no trabaja fines de semana');
    }

    // ── REGLA 28: Compartidos GV no en FdS Isabel ──────────
    if (esFds && turno.tienda === 'isabel' && empData.tienda === 'ambas') {
      errores.push('Compartido GV no puede sustituir en FdS Isabel');
    }

    // ── REGLAS de restricciones por empleado ───────────────
    const restr = CONFIG.getRestricciones(candidato);

    // solo-mañanas
    if (restr.tipo.includes('solo-mañanas') && esLV && turno.franja !== 'mañanas' && !turno.turnoFds) {
      errores.push('Solo puede ma\u00f1anas');
    }

    // solo-cierre (FRANCIS)
    if (restr.tipo.includes('solo-cierre') && esLV && turno.franja !== 'cierre' && !turno.turnoFds) {
      // Excepción: tardes como último recurso
      if (turno.franja === 'tardes' && CONFIG.tieneExcepcion(candidato, 'tardes')) {
        avisos.push('\u26a0 Solo cierre — tardes en caso extremo');
      } else {
        errores.push('Solo puede cierre');
      }
    }

    // solo-descarga (ANTONIO)
    if (restr.tipo.includes('solo-descarga') && turno.franja !== 'descarga') {
      errores.push('Solo puede descarga (inamovible)');
    }

    // max-15 (EVA, EDU) \u2014 solo L-V; los FdS son voluntarios y s\u00ed cierran por tarde
    if (restr.tipo.includes('max-15') && esLV && turno.salida > 15) {
      errores.push('No puede salir despu\u00e9s de 15:00 en L-V');
    }

    // no-fds (EVA, ELI) — no sustituye otros turnos FdS aparte del fijo propio
    if (restr.tipo.includes('no-fds') && esFds) {
      const fijosGV = CONFIG.FIJOS_FDS_GV || {};
      const fijo = fijosGV[candidato];
      if (fijo) {
        errores.push('Ya está fija en ' + (fijo.turno || (fijo.turnos || []).join('/')) + ', no sustituye otros FdS');
      } else {
        errores.push('No trabaja fines de semana');
      }
    }

    // no-cierre-lv (SILVIA)
    if (restr.tipo.includes('no-cierre-lv') && esLV && turno.franja === 'cierre') {
      errores.push('No puede cierres L-V (medicaci\u00f3n)');
    }

    // no-cierre (CAROLINA)
    if (restr.tipo.includes('no-cierre') && (turno.franja === 'cierre' || turno.turnoFds === 'CIERRE')) {
      avisos.push('\u26a0 No suele hacer cierres (conciliaci\u00f3n)');
    }

    // solo-fds (ALFREDO, ALEX VERA, M.CARMEN, RUBEN, GONZALO)
    if (restr.tipo.includes('solo-fds') && esLV) {
      // Excepción: extras L-V (Isabel) o emergencia (GV)
      if (CONFIG.tieneExcepcion(candidato, 'lv-extras') || CONFIG.tieneExcepcion(candidato, 'lv-emergencia')) {
        avisos.push('\u26a0 Solo FdS — L-V como extras voluntarios');
      } else {
        errores.push('Solo trabaja fines de semana');
      }
    }

    // fds-solo-tardes (ALFREDO, ALEX VERA): solo turnos de tarde en FdS
    if (restr.tipo.includes('fds-solo-tardes') && esFds && turno.turnoFds) {
      if (turno.turnoFds !== 'SAB_T' && turno.turnoFds !== 'DOM_T') {
        errores.push('Solo trabaja tardes en fines de semana');
      }
    }

    // solo-fds-y-lunes (ABEL)
    if (restr.tipo.includes('solo-fds-y-lunes') && esLV && dow !== 1) {
      avisos.push('\u26a0 Trabaja FdS y lunes — disponible para extras');
    }

    // ── REGLA 29: Préstamo entre tiendas ───────────────────
    if (empData.tienda === 'ambas' && turno.tienda === 'isabel') {
      // Solo EDU puede prestarse de GV a Isabel L-V
      if (!CONFIG.PRESTAMO_ENTRE_TIENDAS.permitidos.includes(candidato)) {
        // Pero puede sustituir si es propio de Isabel también (compartido)
        // Esta regla se valida más adelante con verificación de horario en GV
      }
      if (esFds) {
        errores.push('Compartido no puede prestarse a FdS Isabel');
      }
    }

    // ── REGLA: Ya trabaja en esa franja ────────────────────
    if (esLV && !turno.turnoFds) {
      const horarios = Rotaciones.getHorariosLV(turno.fecha, turno.tienda);
      if (horarios && horarios[candidato]) {
        const suFranja = Utils.getFranja(horarios[candidato][0], horarios[candidato][1], turno.tienda);
        if (suFranja === turno.franja) {
          errores.push('Ya trabaja en ' + turno.franja);
        }
      }
    } else if (turno.turnoFds) {
      // 1) Rotación base (con reemplazos ya aplicados)
      const fdsData = Rotaciones.getFds(turno.fecha, turno.tienda);
      const enRotacion = fdsData[turno.turnoFds] && fdsData[turno.turnoFds][candidato];

      // 2) Defensivo: si la reemplazo de slot está desfasada por fechas,
      //    mirar el crudo y remapear al efectivo para este día concreto.
      let enRotacionViaReemplazo = false;
      if (!enRotacion) {
        const crudo = turno.tienda === 'granvia'
          ? Rotaciones.getFdsGV(turno.fecha)
          : Rotaciones.getFdsIS(turno.fecha);
        if (crudo && crudo[turno.turnoFds]) {
          for (const aliasBase in crudo[turno.turnoFds]) {
            const ef = (typeof Reemplazos !== 'undefined')
              ? Reemplazos.aliasEfectivo(aliasBase, turno.fecha, turno.tienda)
              : aliasBase;
            if (ef === candidato) { enRotacionViaReemplazo = true; break; }
          }
        }
      }

      // 3) Sustitución ya registrada en este turno (para otro ausente)
      const fsTurno = Utils.formatFecha(turno.fecha);
      const susts = Store.getSustituciones();
      const suSust = susts.find(s =>
        s.sustituto === candidato &&
        s.fecha === fsTurno &&
        s.tienda === turno.tienda &&
        s.turnoFds === turno.turnoFds &&
        s.ausente !== turno.ausente
      );

      if (enRotacion || enRotacionViaReemplazo) {
        errores.push('Ya trabaja en este turno FdS (rotación)');
      } else if (suSust) {
        errores.push('Ya sustituye en este turno a ' + (suSust.ausente || 'alguien'));
      }
    }

    // ── ANDREA: no sustituye los lunes (descansa) ──────────
    if (candidato === 'ANDREA' && esLV && dow === 1) {
      errores.push('ANDREA descansa los lunes');
    }

    // ── DAVID/LETI: solo sustituyen en Isabel los viernes ──
    if ((candidato === 'DAVID' || candidato === 'LETI') &&
        turno.tienda === 'isabel' && esLV && dow !== 5) {
      errores.push(candidato + ' solo sustituye en Isabel los viernes');
    }

    // ── DAVID/LETI: exclusión mutua mismo viernes Isabel ───
    // Solo uno de los dos puede sustituir en Isabel el mismo viernes.
    if ((candidato === 'DAVID' || candidato === 'LETI') &&
        turno.tienda === 'isabel' && esLV && dow === 5) {
      const otro = candidato === 'DAVID' ? 'LETI' : 'DAVID';
      const susts = Store.getSustituciones();
      const yaEstaOtro = susts.some(s =>
        s.sustituto === otro && s.fecha === fs && s.tienda === 'isabel'
      );
      if (yaEstaOtro) {
        errores.push(otro + ' ya sustituye este viernes en Isabel (excl. mutua)');
      }
    }

    // ── REGLA 16: Solapamiento entre tiendas (BLOQUEO) ─────
    // Si físicamente está en la otra tienda, no puede sustituir aquí
    if (empData.tienda === 'ambas') {
      const solape = Reglas._verificarSolapeOtraTienda(
        candidato, turno.fecha, turno.tienda, turno.entrada, turno.salida
      );
      if (solape) {
        const tiendaLabel = solape.tienda === 'granvia' ? 'GV' : 'IS';
        errores.push('Imposible: ya est\u00e1 en ' + tiendaLabel +
                     ' (' + Utils.formatHora(solape.inicio) + '-' + Utils.formatHora(solape.fin) + ')');
      }
    }

    // ── REGLA 17: Sustituciones en cadena (BLOQUEO) ────────
    // Si se mueve de su franja, ¿deja la origen bajo mínimos?
    if (opciones.verificarCadena !== false) {
      if (esLV && !turno.turnoFds) {
        const efecto = Cobertura.verificarEfectoSustituto(
          candidato, turno.fecha, turno.tienda, turno.franja
        );
        if (efecto) {
          errores.push('Deja ' + efecto.franja.toUpperCase() +
                       ' bajo m\u00edn (' + efecto.sinSustituto + '/' + efecto.minimo + ')');
        }
      } else if (turno.turnoFds) {
        // FdS: verificar todos los turnos del fin de semana
        const efecto = Reglas._verificarEfectoSustitutoFds(
          candidato, turno.fecha, turno.tienda, turno.turnoFds
        );
        if (efecto) {
          errores.push('Deja ' + efecto.turno + ' bajo m\u00edn (' +
                       efecto.sinSustituto + '/' + efecto.minimo + ')');
        }
      }
    }

    // ── REGLA 32: Descanso entre jornadas (AVISO) ──────────
    const descanso = Reglas._verificarDescanso12h(candidato, turno);
    if (descanso) {
      const esExcepcion = CONFIG.DESCANSO_EXCEPCIONES.some(e =>
        e.empleados.includes(candidato)
      );
      if (esExcepcion) {
        avisos.push('\u26a0 Menos de 12h descanso (excepci\u00f3n aceptada)');
      } else {
        avisos.push('\u26a0 Menos de 12h descanso entre jornadas');
      }
    }

    return {
      valido: errores.length === 0,
      errores,
      avisos
    };
  },

  // ── Verificar solape con otra tienda ───────────────────────

  _verificarSolapeOtraTienda(empleado, fecha, tiendaActual, entrada, salida) {
    const otraTienda = tiendaActual === 'granvia' ? 'isabel' : 'granvia';
    const dow = fecha.getDay();
    const fs = Utils.formatFecha(fecha);

    // Buscar turnos del empleado en la otra tienda ese día
    const turnos = [];

    if (dow >= 1 && dow <= 5) {
      const horarios = Rotaciones.getHorariosLV(fecha, otraTienda);
      if (horarios && horarios[empleado]) {
        turnos.push({ inicio: horarios[empleado][0], fin: horarios[empleado][1] });
      }
    } else if (dow === 0 || dow === 6) {
      const fdsData = Rotaciones.getFds(fecha, otraTienda);
      const turnosKey = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
      for (const tk of turnosKey) {
        if (fdsData[tk] && fdsData[tk][empleado]) {
          turnos.push({ inicio: fdsData[tk][empleado][0], fin: fdsData[tk][empleado][1] });
        }
      }
    }

    // También considerar sustituciones en la otra tienda
    const susts = Store.getSustituciones();
    for (const s of susts) {
      if (s.sustituto === empleado && s.fecha === fs && s.tienda === otraTienda) {
        turnos.push({ inicio: s.entrada, fin: s.salida });
      }
    }

    // Verificar si alguno solapa con el horario propuesto
    for (const t of turnos) {
      if (!(salida <= t.inicio || t.fin <= entrada)) {
        return { tienda: otraTienda, inicio: t.inicio, fin: t.fin };
      }
    }

    return null;
  },

  // ── Verificar descanso 12h entre jornadas ──────────────────

  _verificarDescanso12h(empleado, turnoNuevo) {
    const fechaActual = turnoNuevo.fecha;
    const tienda = turnoNuevo.tienda;

    // Verificar día anterior y día siguiente (misma tienda)
    const ayer = new Date(fechaActual); ayer.setDate(ayer.getDate() - 1);
    const mañana = new Date(fechaActual); mañana.setDate(mañana.getDate() + 1);

    // Horario del día anterior
    const horariosAyer = Reglas._getHorarioEmpleado(empleado, ayer, tienda);
    if (horariosAyer) {
      const horasDescanso = (turnoNuevo.entrada + 24) - horariosAyer.fin;
      if (horasDescanso < CONFIG.DESCANSO_MINIMO_HORAS) return true;
    }

    // Horario del día siguiente
    const horariosMañana = Reglas._getHorarioEmpleado(empleado, mañana, tienda);
    if (horariosMañana) {
      const horasDescanso = (horariosMañana.inicio + 24) - turnoNuevo.salida;
      if (horasDescanso < CONFIG.DESCANSO_MINIMO_HORAS) return true;
    }

    return false;
  },

  /** Helper: obtener horario de un empleado en un día concreto en una tienda */
  _getHorarioEmpleado(empleado, fecha, tienda) {
    const dow = fecha.getDay();
    if (dow >= 1 && dow <= 5) {
      const horarios = Rotaciones.getHorariosLV(fecha, tienda);
      if (horarios && horarios[empleado]) {
        return { inicio: horarios[empleado][0], fin: horarios[empleado][1] };
      }
    } else {
      const fdsData = Rotaciones.getFds(fecha, tienda);
      const turnosKey = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
      for (const tk of turnosKey) {
        if (fdsData[tk] && fdsData[tk][empleado]) {
          return { inicio: fdsData[tk][empleado][0], fin: fdsData[tk][empleado][1] };
        }
      }
    }
    return null;
  },

  // ── Verificar efecto de mover sustituto en FdS ─────────────

  /**
   * Si movemos a un empleado de su turno FdS habitual para sustituir
   * en otro turno, ¿deja el turno origen bajo mínimos?
   * Considera todos los turnos del fin de semana (sábado y domingo).
   */
  _verificarEfectoSustitutoFds(sustituto, fecha, tienda, turnoDestino) {
    const dow = fecha.getDay();
    if (dow !== 0 && dow !== 6) return null;

    // Obtener sábado y domingo del fin de semana
    let sab, dom;
    if (dow === 6) {
      sab = fecha;
      dom = new Date(fecha); dom.setDate(dom.getDate() + 1);
    } else {
      dom = fecha;
      sab = new Date(fecha); sab.setDate(sab.getDate() - 1);
    }

    const fdsSab = Rotaciones.getFds(sab, tienda);
    const turnos = ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T'];
    const fechasTurnos = { SAB_M: sab, SAB_T: sab, DOM_M: dom, DOM_T: dom };

    for (const tk of turnos) {
      if (tk === turnoDestino) continue;
      // ¿Tiene el sustituto turno habitual en este otro turno FdS?
      if (fdsSab[tk] && fdsSab[tk][sustituto]) {
        // Contar cobertura usando fdsSab (rotación correcta) + ausencias del día real
        const fechaTk = fechasTurnos[tk];
        const fsTk = Utils.formatFecha(fechaTk);
        let cobCount = 0;
        for (const emp in fdsSab[tk]) {
          if (!Store.estaAusente(emp, fsTk, tienda)) cobCount++;
        }
        const min = CONFIG.getMinimoFds(tienda, tk);
        if (cobCount - 1 < min) {
          return {
            turno: tk,
            actual: cobCount,
            sinSustituto: cobCount - 1,
            minimo: min
          };
        }
      }
    }

    return null;
  },

  // ── Calcular horas diarias del empleado ────────────────────

  /**
   * Devuelve las horas que normalmente trabaja un empleado en un día.
   */
  calcularHorasDiarias(alias, fecha, tienda) {
    tienda = tienda || Store.getTienda();
    const dow = fecha.getDay();

    if (dow >= 1 && dow <= 5) {
      const horarios = Rotaciones.getHorariosLV(fecha, tienda);
      if (horarios && horarios[alias]) {
        return horarios[alias][1] - horarios[alias][0];
      }
    } else if (dow === 0 || dow === 6) {
      const fdsData = Rotaciones.getFds(fecha, tienda);
      const turnosKey = dow === 6 ? ['SAB_M', 'SAB_T'] : ['DOM_M', 'DOM_T'];
      for (const tk of turnosKey) {
        if (fdsData[tk] && fdsData[tk][alias]) {
          return fdsData[tk][alias][1] - fdsData[tk][alias][0];
        }
      }
    }

    // Fallback: contrato/5, redondeado al cuarto de hora
    const emp = Store.getEmpleado(alias, tienda) || Store.getEmpleado(alias);
    const raw = emp ? (emp.contrato || 30) / 5 : 4;
    return Math.round(raw * 4) / 4; // redondear a 0.25h (15 min)
  },

  // ── Pertenece al grupo de descarga GV ──────────────────────

  esGrupoDescargaGV(alias) {
    return CONFIG.GRUPO_DESCARGA_GV.includes(alias);
  }
};
