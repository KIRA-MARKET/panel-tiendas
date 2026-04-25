// ============================================================
// HORARIOS KIRA & REYPIK — sync.js
// Sincronización con Google Sheets (cola de escrituras)
// ============================================================

'use strict';

const Sync = {

  // ── Cola de escrituras para evitar race conditions ─────────
  _writeQueue: [],
  _writing: false,

  // Flag activo durante cargar(): suprime sync saliente por eventos
  // que se emiten al hidratar el Store desde Sheets. Sin esto, un
  // asegurarAño() durante la carga provocaba que syncFestivos()
  // sobrescribiera el Sheet con los defaults vacíos (bug 2026-04-21).
  _loading: false,

  // ── Versionado optimista (anti race-condition inter-cliente) ─
  // Mapa { sheetKey: number } poblado en cargar() desde data._versions.
  // Cada save envía la version esperada y el server rechaza con 409 si
  // otra pestaña ya escribió por medio.
  /** @type {Record<string, number>} */
  _versions: {},

  // ── Auth: token compartido en localStorage ─────────────────
  // El token se introduce una vez por dispositivo. Vive solo en
  // localStorage (clave 'apiToken'); jamás en el repo. Si el server
  // devuelve 'Unauthorized', _fetch abre modal pidiéndolo y reintenta.
  _TOKEN_KEY: 'apiToken',

  _getToken() {
    try { return localStorage.getItem(Sync._TOKEN_KEY) || ''; }
    catch (_) { return ''; }
  },

  _setToken(t) {
    try { localStorage.setItem(Sync._TOKEN_KEY, t); } catch (_) {}
  },

  /**
   * Pide el token al usuario (modal propio si Modales está disponible,
   * prompt nativo en su defecto — solo fallback de emergencia para auth).
   * Devuelve el token o '' si cancela.
   */
  async _pedirToken(motivo) {
    const titulo = 'Autenticación requerida';
    const msg = (motivo || 'Esta app necesita un token de acceso para conectar con Google Sheets.') +
      '\n\nIntrodúcelo (lo guardamos solo en este dispositivo).';
    if (typeof Modales !== 'undefined' && Modales.input) {
      const t = await Modales.input(msg, '', titulo);
      return t || '';
    }
    // Fallback: la app no debería llegar aquí porque Modales se carga
    // antes que Sync.cargar(), pero por si acaso.
    return window.prompt(msg) || '';
  },

  /**
   * Wrapper de fetch que añade el token y maneja 401 abriendo el
   * modal de auth y reintentando una sola vez. Devuelve el `data`
   * ya parseado (mismo shape que devolvía `await response.json()`).
   * Lanza si fallo de red real (no 401).
   */
  async _fetch(action, opts) {
    opts = opts || {};
    let token = Sync._getToken();
    const _send = async () => {
      const sep = '?';
      const url = CONFIG.SHEETS_API + sep + 'action=' + encodeURIComponent(action) +
        (token ? '&token=' + encodeURIComponent(token) : '');
      const resp = await fetch(url, opts);
      return resp.json();
    };

    let data = await _send();
    if (data && (data.code === 401 || data.error === 'Unauthorized')) {
      const nuevo = await Sync._pedirToken('El token guardado no es válido o falta.');
      if (!nuevo) return data; // usuario canceló: devolvemos el 401 tal cual
      Sync._setToken(nuevo);
      token = nuevo;
      data = await _send();
    }
    return data;
  },

  // ── Cargar todos los datos desde Sheets ────────────────────

  async cargar() {
    Store.setSyncStatus('loading');
    Sync._loading = true;
    try {
      const data = await Sync._fetch('readAll');

      if (data.error) {
        Store.setSyncStatus('error');
        console.error('Error Sheets:', data.error);
        return false;
      }

      // Versiones por hoja para detección de races inter-cliente.
      // Cada save irá con expectedVersion = Sync._versions[hoja]; el
      // server compara y rechaza con 409 si otra pestaña ya escribió.
      Sync._versions = data._versions || {};

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

      // Festivos (inscritos + asignaciones con turno)
      if (data.festivos && data.festivos.length > 0 && typeof Festivos !== 'undefined') {
        Sync._mergeFestivos(data.festivos);
      }

      // Reemplazos de slot
      if (data.reemplazos) {
        const reemp = [];
        for (const r of data.reemplazos) {
          reemp.push({
            tienda: r.tienda,
            aliasOriginal: r.aliasOriginal,
            aliasNuevo: r.aliasNuevo,
            desde: r.desde || '',
            hasta: r.hasta || '',
            motivo: r.motivo || ''
          });
        }
        Store._state.reemplazos = reemp;
      }

      // Intercambios puntuales de turno
      if (data.intercambios) {
        const inter = [];
        for (const x of data.intercambios) {
          inter.push({
            fecha: x.fecha,
            tienda: x.tienda,
            empleadoA: x.empleadoA,
            turnoA: x.turnoA,
            empleadoB: x.empleadoB,
            turnoB: x.turnoB,
            motivo: x.motivo || ''
          });
        }
        Store._state.intercambios = inter;
      }

      // Decisiones (Capa 2: historial de decisiones de Nacho)
      if (data.decisiones && data.decisiones.length > 0) {
        Store._state.decisiones = data.decisiones.map(d => ({
          timestamp: d.timestamp || '',
          fecha: d.fecha || '',
          tienda: d.tienda || '',
          turnoFds: d.turnoFds || '',
          franja: d.franja || '',
          ausente: d.ausente || '',
          motorSugirio: d.motorSugirio || '',
          nachoEligio: d.nachoEligio || '',
          accion: d.accion || 'sustituir'
        }));
      }

      Store.setSyncStatus('ok');
      Store._emit('datosCompletos');
      return true;

    } catch (err) {
      Store.setSyncStatus('error');
      console.error('Error cargando Sheets:', err);
      return false;
    } finally {
      Sync._loading = false;
    }
  },

  // ── Merge de festivos desde Sheets ─────────────────────────
  // Diseñado para ser idempotente y no perder datos:
  //  - Asegura los años presentes en rows (no solo el actual).
  //  - Agrupa rows por (id, fecha) para combinar granvia+isabel.
  //  - Si el festivo ya existe en Store, actualiza inscritos/asignados.
  //  - Si no existe (festivo manual creado en otro dispositivo), lo añade.
  // Se llama con Sync._loading=true, así que los eventos 'festivos'
  // emitidos aquí NO disparan un syncFestivos() que sobreescriba el Sheet.
  _mergeFestivos(rows) {
    // 1. Asegurar años
    const años = new Set();
    for (const r of rows) {
      const m = String(r.fecha || '').match(/^(\d{4})-/);
      if (m) años.add(parseInt(m[1], 10));
    }
    años.add(Store.getAño());
    for (const a of años) Festivos.asegurarAño(a);

    // 2. Agrupar por (id, fecha)
    const agrupados = {};
    for (const row of rows) {
      const key = row.id + '|' + row.fecha;
      if (!agrupados[key]) {
        agrupados[key] = {
          id: row.id, fecha: row.fecha,
          nombre: row.nombre || '', ambito: row.ambito || 'local',
          inscritos: { granvia: [], isabel: [] },
          asignados: { granvia: [], isabel: [] }
        };
      }
      const g = agrupados[key];
      const tienda = row.tienda === 'granvia' || row.tienda === 'isabel' ? row.tienda : null;
      if (!tienda) continue;
      if (row.inscritos) {
        g.inscritos[tienda] = String(row.inscritos).split(',').filter(Boolean);
      }
      if (row.asignados) {
        g.asignados[tienda] = String(row.asignados).split(',').filter(Boolean).map(s => {
          const parts = String(s).split(':');
          if (parts.length >= 4) {
            return { empleado: parts[0], turno: parts[1], entrada: parseFloat(parts[2]), salida: parseFloat(parts[3]) };
          }
          return parts[0]; // formato antiguo: solo nombre
        });
      }
    }

    // 3. Aplicar al Store: actualizar existentes, añadir manuales huérfanos
    const festivos = Store._state.festivos;
    for (const key in agrupados) {
      const g = agrupados[key];
      const idx = festivos.findIndex(x => x.id === g.id && x.fecha === g.fecha);
      if (idx >= 0) {
        festivos[idx].inscritos = g.inscritos;
        festivos[idx].asignados = g.asignados;
      } else {
        festivos.push({
          id: g.id, fecha: g.fecha, nombre: g.nombre, ambito: g.ambito,
          inscritos: g.inscritos, asignados: g.asignados
        });
      }
    }
    festivos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    Festivos._guardarLocal();
    Store._emit('festivos', festivos);
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
        const expectedVersion = Sync._versions[hoja] || 0;
        const data = await Sync._fetch('save', {
          method: 'POST',
          body: JSON.stringify({ sheet: hoja, headers, rows, expectedVersion })
        });
        if (data.code === 409 || data.error === 'Conflict') {
          // Otra pestaña / cliente escribió antes que nosotros.
          // Vaciar la cola para no encadenar más escrituras stale y
          // avisar al usuario para que recargue.
          console.warn('Conflict en', hoja, '— esperaba v' + expectedVersion + ', actual v' + data.currentVersion);
          Sync._writeQueue.length = 0;
          Store.setSyncStatus('error');
          if (typeof Modales !== 'undefined' && Modales.aviso) {
            Modales.aviso(
              'Otra pestaña o dispositivo modificó "' + hoja + '" justo antes que tú. Para evitar pisar esos cambios, recarga la página y vuelve a hacer la modificación.',
              'Datos desactualizados'
            );
          }
          break;
        }
        if (data.error) {
          console.error('Error guardando', hoja, data.error);
          Store.setSyncStatus('error');
        } else {
          if (typeof data.newVersion === 'number') Sync._versions[hoja] = data.newVersion;
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

  syncDecisiones() {
    const h = ['timestamp', 'fecha', 'tienda', 'turnoFds', 'franja', 'ausente', 'motorSugirio', 'nachoEligio', 'accion'];
    Sync.guardar('decisiones', h, Store.getDecisiones());
  },

  syncReemplazos() {
    const h = ['tienda', 'aliasOriginal', 'aliasNuevo', 'desde', 'hasta', 'motivo'];
    Sync.guardar('reemplazos', h, Store.getReemplazos());
  },

  syncIntercambios() {
    const h = ['fecha', 'tienda', 'empleadoA', 'turnoA', 'empleadoB', 'turnoB', 'motivo'];
    Sync.guardar('intercambios', h, Store.getIntercambios());
  },

  syncFestivos() {
    // Aplanar festivos: una fila por asignación
    const rows = [];
    const festivos = Store.getFestivos();
    for (const f of festivos) {
      for (const tienda of ['granvia', 'isabel']) {
        // Inscritos
        const inscritos = (f.inscritos[tienda] || []).join(',');
        // Asignados (nuevo formato con turno)
        const asignados = (f.asignados[tienda] || []).map(a => {
          if (typeof a === 'string') return a;
          return a.empleado + ':' + a.turno + ':' + a.entrada + ':' + a.salida;
        }).join(',');
        if (inscritos || asignados) {
          rows.push({
            id: f.id, fecha: f.fecha, nombre: f.nombre, ambito: f.ambito,
            tienda, inscritos, asignados
          });
        }
      }
    }
    const h = ['id', 'fecha', 'nombre', 'ambito', 'tienda', 'inscritos', 'asignados'];
    Sync.guardar('festivos', h, rows);
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
