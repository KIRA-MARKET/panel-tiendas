// ============================================================
// YOLANDA HP — sync.js
// Sincronización con Google Sheets (cola de escrituras)
// ============================================================

'use strict';

const Sync = {

  // ── Cola de escrituras para evitar race conditions ─────────
  _writeQueue: [],
  _writing: false,

  // ── Cargar todos los datos desde Sheets ────────────────────

  async cargar() {
    Store.setSyncStatus('loading');
    try {
      const response = await fetch(CONFIG.SHEETS_API + '?action=readAll');
      const data = await response.json();

      if (data.error) {
        Store.setSyncStatus('error');
        console.error('Error Sheets:', data.error);
        return false;
      }

      // Empleados GV
      if (data.empleadosGV && data.empleadosGV.length > 0) {
        const emps = {};
        for (const e of data.empleadosGV) emps[e.alias] = e;
        Store.set('empleadosGV', emps);
      }

      // Empleados IS
      if (data.empleadosIS && data.empleadosIS.length > 0) {
        const emps = {};
        for (const e of data.empleadosIS) emps[e.alias] = e;
        Store.set('empleadosIS', emps);
      }

      // Horarios GV
      if (data.horariosGV && data.horariosGV.length > 0) {
        const horarios = { A: { LJ: {}, V: {} }, B: { LJ: {}, V: {} } };
        for (const h of data.horariosGV) {
          horarios[h.semana][h.dia][h.empleado] = [h.entrada, h.salida];
        }
        Store.set('horariosGV', horarios);
      }

      // Horarios Isabel L-V
      if (data.horariosIS && data.horariosIS.length > 0) {
        Store.set('sheetsHorariosIS', Sync._parseHorariosIS(data.horariosIS));
      }

      // Rotaciones FdS
      if (data.rotaciones && data.rotaciones.length > 0) {
        const rotConfig = Sync._parseRotacionesFdS(data.rotaciones);
        if (rotConfig.granvia) {
          Store.set('sheetsFdsGV', rotConfig.granvia);
          if (rotConfig.granvia.rotacion7.orden.length > 0) {
            CONFIG.ROTACIONES.fds_gv.orden = rotConfig.granvia.rotacion7.orden;
          }
        }
        if (rotConfig.isabel) {
          Store.set('sheetsFdsIS', rotConfig.isabel);
        }
      }

      // Ausencias
      if (data.ausencias) {
        const ausGV = [];
        const ausIS = [];
        for (const a of data.ausencias) {
          const obj = { empleado: a.empleado, tipo: a.tipo, desde: a.desde, hasta: a.hasta, motivo: a.motivo || '' };
          if (a.tienda === 'granvia') ausGV.push(obj);
          else ausIS.push(obj);
        }
        Store.set('ausenciasGV', ausGV);
        Store.set('ausenciasIS', ausIS);
      }

      // Sustituciones
      if (data.sustituciones) {
        const sust = [];
        for (const s of data.sustituciones) {
          const aj = Utils.ajustarHorarioSustituto(s.entrada, s.salida);
          sust.push({
            fecha: s.fecha, ausente: s.ausente, sustituto: s.sustituto,
            entrada: aj.entrada, salida: aj.salida,
            franja: s.franja || '', turnoFds: s.turnoFds || '', tienda: s.tienda,
            tipo: s.tipo || 'movimiento'
          });
        }
        Store.set('sustituciones', sust);
      }

      // Modificaciones
      if (data.modificaciones) {
        const mods = [];
        for (const m of data.modificaciones) {
          mods.push({
            empleado: m.empleado, fecha: m.fecha, tienda: m.tienda,
            turnoFds: m.turnoFds || '',
            entradaOriginal: m.entradaOriginal, salidaOriginal: m.salidaOriginal,
            nuevaEntrada: m.nuevaEntrada, nuevaSalida: m.nuevaSalida,
            motivo: m.motivo || ''
          });
        }
        Store.set('modificacionesHorario', mods);
      }

      // Faltas
      if (data.faltas) {
        const fGV = [];
        const fIS = [];
        for (const f of data.faltas) {
          const obj = { empleado: f.empleado, fecha: f.fecha, tipo: f.tipo, motivo: f.motivo || '', tienda: f.tienda };
          if (f.tienda === 'granvia') fGV.push(obj);
          else fIS.push(obj);
        }
        Store.set('faltasGV', fGV);
        Store.set('faltasIS', fIS);
      }

      // Descartadas
      if (data.descartadas) {
        const desc = [];
        for (const d of data.descartadas) {
          desc.push({
            fecha: d.fecha, ausente: d.ausente, tienda: d.tienda,
            turnoFds: d.turnoFds || '', franja: d.franja || '', motivo: d.motivo || ''
          });
        }
        Store.set('sustitucionesDescartadas', desc);
      }

      Store.setSyncStatus('ok');
      Store._emit('datosCompletos');
      return true;

    } catch (err) {
      Store.setSyncStatus('error');
      console.error('Error cargando Sheets:', err);
      return false;
    }
  },

  // ── Guardar con cola (evita race conditions) ───────────────

  guardar(hoja, headers, rows) {
    Sync._writeQueue.push({ hoja, headers, rows });
    Sync._processQueue();
  },

  async _processQueue() {
    if (Sync._writing || Sync._writeQueue.length === 0) return;
    Sync._writing = true;

    while (Sync._writeQueue.length > 0) {
      const { hoja, headers, rows } = Sync._writeQueue.shift();
      Store.setSyncStatus('loading');
      try {
        const response = await fetch(CONFIG.SHEETS_API + '?action=save', {
          method: 'POST',
          body: JSON.stringify({ sheet: hoja, headers, rows })
        });
        const data = await response.json();
        if (data.error) {
          console.error('Error guardando', hoja, data.error);
          Store.setSyncStatus('error');
        } else {
          Store.setSyncStatus('ok');
        }
      } catch (err) {
        console.error('Error guardando', hoja, err);
        Store.setSyncStatus('error');
      }
    }

    Sync._writing = false;
  },

  // ── Funciones de sync específicas ──────────────────────────

  syncEmpleados() {
    const h = ['alias', 'nombre', 'apellidos', 'dni', 'telefono', 'email', 'fechaAlta', 'contrato', 'tienda', 'franja', 'restriccion', 'color', 'horasLV', 'horasFDS'];
    const empsGV = Store.get('empleadosGV');
    const empsIS = Store.get('empleadosIS');
    Sync.guardar('empleadosGV', h, Object.values(empsGV));
    Sync.guardar('empleadosIS', h, Object.values(empsIS));
  },

  syncAusencias() {
    const h = ['tienda', 'empleado', 'tipo', 'desde', 'hasta', 'motivo'];
    const rows = [];
    for (const a of Store.get('ausenciasGV')) {
      rows.push({ tienda: 'granvia', empleado: a.empleado, tipo: a.tipo, desde: a.desde, hasta: a.hasta, motivo: a.motivo || '' });
    }
    for (const a of Store.get('ausenciasIS')) {
      rows.push({ tienda: 'isabel', empleado: a.empleado, tipo: a.tipo, desde: a.desde, hasta: a.hasta, motivo: a.motivo || '' });
    }
    Sync.guardar('ausencias', h, rows);
  },

  syncSustituciones() {
    const h = ['tienda', 'fecha', 'ausente', 'sustituto', 'entrada', 'salida', 'franja', 'turnoFds', 'tipo'];
    Sync.guardar('sustituciones', h, Store.get('sustituciones'));
  },

  syncModificaciones() {
    const h = ['tienda', 'empleado', 'fecha', 'turnoFds', 'entradaOriginal', 'salidaOriginal', 'nuevaEntrada', 'nuevaSalida', 'motivo'];
    Sync.guardar('modificaciones', h, Store.get('modificacionesHorario'));
  },

  syncFaltas() {
    const h = ['tienda', 'empleado', 'fecha', 'tipo', 'motivo'];
    const rows = [...Store.get('faltasGV'), ...Store.get('faltasIS')];
    Sync.guardar('faltas', h, rows);
  },

  syncDescartadas() {
    const h = ['tienda', 'fecha', 'ausente', 'turnoFds', 'franja', 'motivo'];
    Sync.guardar('descartadas', h, Store.get('sustitucionesDescartadas'));
  },

  // ── Parsers de datos de Sheets ─────────────────────────────

  _parseHorariosIS(rows) {
    const fijos = [];
    const rotacion = {};
    const overrides = CONFIG.OVERRIDES_DIAS_LV.isabel || {};
    for (const r of rows) {
      if (r.tipo === 'fijo' || r.tipo === 'compartido') {
        // Aplicar override si existe para este empleado
        let dia = r.dia;
        if (overrides[r.empleado]) {
          dia = overrides[r.empleado];
        }
        fijos.push({ dia, empleado: r.empleado, entrada: r.entrada, salida: r.salida });
      } else if (r.tipo === 'rotacion') {
        const semKey = r.dia;
        if (!rotacion[semKey]) rotacion[semKey] = {};
        const rol = r.notas || '';
        rotacion[semKey][rol] = { emp: r.empleado, entrada: r.entrada || 0, salida: r.salida || 0 };
      }
    }
    return { fijos, rotacion };
  },

  _parseRotacionesFdS(rows) {
    const gv = { fijos: [], descarga: { orden: [], horarios: {} }, rotacion7: { orden: [], horarios: {} }, fecha_inicio: null };
    const is = { grupoA: { orden: [], semanas: {}, horario_m: null, horario_t: null }, grupoB: { orden: [], semanas: {}, horario_m: null, horario_t: null }, fecha_inicio: null };

    for (const r of rows) {
      const t = r.tienda;
      const tipo = r.tipo;
      const param = r.parametro;
      const val = r.valor;

      if (t === 'granvia') {
        if (tipo === 'fijo') {
          const p = val.split('|');
          gv.fijos.push({ emp: param, turno: p[0], entrada: parseFloat(p[1]), salida: parseFloat(p[2]) });
        } else if (tipo === 'descarga_abc') {
          if (param === 'orden') gv.descarga.orden = val.split(',');
          else {
            const p = val.split('|');
            gv.descarga.horarios[param.replace('_horario', '')] = [parseFloat(p[0]), parseFloat(p[1])];
          }
        } else if (tipo === 'rotacion_7') {
          if (param === 'orden') gv.rotacion7.orden = val.split(',');
          else {
            const p = val.split('|');
            gv.rotacion7.horarios[param.replace('_horario', '')] = [parseFloat(p[0]), parseFloat(p[1])];
          }
        } else if (tipo === 'config' && param === 'fecha_inicio') {
          gv.fecha_inicio = val;
        }
        // Mínimos: NO sobreescribir CONFIG (los valores en Sheets están desactualizados,
        // los valores correctos están en CONFIG.MINIMOS_LV_GV / MINIMOS_FDS_GV)
      } else if (t === 'isabel') {
        if (tipo === 'grupoA' || tipo === 'grupoB') {
          const grupo = tipo === 'grupoA' ? is.grupoA : is.grupoB;
          if (param === 'orden') grupo.orden = val.split(',');
          else if (param === 'horario_m') {
            const p = val.split('|');
            grupo.horario_m = [parseFloat(p[0]), parseFloat(p[1])];
          } else if (param === 'horario_t') {
            const p = val.split('|');
            grupo.horario_t = [parseFloat(p[0]), parseFloat(p[1])];
          } else if (param.startsWith('sem')) {
            const turnos = val.split('|');
            const semData = {};
            for (const turno of turnos) {
              const [k, v] = turno.split(':');
              semData[k] = v.includes(',') ? v.split(',') : v;
            }
            grupo.semanas[param] = semData;
          }
        } else if (tipo === 'config' && param === 'fecha_inicio') {
          is.fecha_inicio = val;
        }
      }
    }
    return { granvia: gv, isabel: is };
  }
};
