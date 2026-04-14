// ============================================================
// HORARIOS KIRA & REYPIK — festivos.js
// Módulo de festivos: calendario anual, inscripción voluntaria,
// asignación de turnos y recuento de festivos trabajados
// ============================================================

'use strict';

const Festivos = {

  // ── Festivos por defecto (Granada capital) ─────────────────
  // Estructura: { mmdd: nombre, ambito }
  // Las fechas variables (Semana Santa, Corpus) se calculan por año.
  DEFAULT_FIJOS: [
    { mmdd: '01-01', nombre: 'Año Nuevo',                ambito: 'nacional'   },
    { mmdd: '01-02', nombre: 'Toma de Granada',          ambito: 'local'      },
    { mmdd: '01-06', nombre: 'Reyes',                    ambito: 'nacional'   },
    { mmdd: '02-28', nombre: 'Día de Andalucía',         ambito: 'autonomico' },
    { mmdd: '05-01', nombre: 'Día del Trabajo',          ambito: 'nacional'   },
    { mmdd: '08-15', nombre: 'Asunción',                 ambito: 'nacional'   },
    { mmdd: '09-15', nombre: 'Virgen de las Angustias',  ambito: 'local'      },
    { mmdd: '10-12', nombre: 'Hispanidad',               ambito: 'nacional'   },
    { mmdd: '11-01', nombre: 'Todos los Santos',         ambito: 'nacional'   },
    { mmdd: '12-06', nombre: 'Constitución',             ambito: 'nacional'   },
    { mmdd: '12-08', nombre: 'Inmaculada',               ambito: 'nacional'   },
    { mmdd: '12-25', nombre: 'Navidad',                  ambito: 'nacional'   }
  ],

  /** Calcular Domingo de Pascua (algoritmo de Gauss/Butcher) */
  _pascua(año) {
    const a = año % 19;
    const b = Math.floor(año / 100);
    const c = año % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(año, mes - 1, dia);
  },

  /** Generar festivos default para un año */
  generarDefault(año) {
    const lista = Festivos.DEFAULT_FIJOS.map(f => ({
      id: 'def-' + año + '-' + f.mmdd,
      fecha: año + '-' + f.mmdd,
      nombre: f.nombre,
      ambito: f.ambito,
      inscritos: { granvia: [], isabel: [] },
      asignados: { granvia: [], isabel: [] }
    }));

    // Semana Santa: Jueves y Viernes Santo
    const pascua = Festivos._pascua(año);
    const viernes = new Date(pascua);
    viernes.setDate(pascua.getDate() - 2);
    const jueves = new Date(pascua);
    jueves.setDate(pascua.getDate() - 3);
    // Corpus Christi (Granada): jueves 60 días después de Pascua
    const corpus = new Date(pascua);
    corpus.setDate(pascua.getDate() + 60);
    lista.push({
      id: 'def-' + año + '-jueves-santo',
      fecha: Utils.formatFecha(jueves),
      nombre: 'Jueves Santo',
      ambito: 'autonomico',
      inscritos: { granvia: [], isabel: [] },
      asignados: { granvia: [], isabel: [] }
    });
    lista.push({
      id: 'def-' + año + '-viernes-santo',
      fecha: Utils.formatFecha(viernes),
      nombre: 'Viernes Santo',
      ambito: 'nacional',
      inscritos: { granvia: [], isabel: [] },
      asignados: { granvia: [], isabel: [] }
    });
    lista.push({
      id: 'def-' + año + '-corpus',
      fecha: Utils.formatFecha(corpus),
      nombre: 'Corpus Christi',
      ambito: 'local',
      inscritos: { granvia: [], isabel: [] },
      asignados: { granvia: [], isabel: [] }
    });

    lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return lista;
  },

  /** Asegurar que los festivos del año están en el Store */
  asegurarAño(año) {
    // Primero intentar cargar desde localStorage
    Festivos._cargarLocal();
    const todos = Store.getFestivos();
    const tieneAño = todos.some(f => f.fecha.startsWith(año + '-'));
    if (tieneAño) return;
    const nuevos = Festivos.generarDefault(año);
    Store._state.festivos = todos.concat(nuevos);
    Festivos._guardarLocal();
    Store._emit('festivos', Store._state.festivos);
  },

  /** Guardar festivos en localStorage */
  _guardarLocal() {
    try {
      localStorage.setItem('yolanda_festivos', JSON.stringify(Store.getFestivos()));
    } catch (e) { /* silenciar */ }
  },

  /** Cargar festivos desde localStorage (si no hay datos en Store) */
  _cargarLocal() {
    if (Store.getFestivos().length > 0) return; // ya hay datos
    try {
      const raw = localStorage.getItem('yolanda_festivos');
      if (raw) {
        const datos = JSON.parse(raw);
        if (Array.isArray(datos) && datos.length > 0) {
          Store._state.festivos = datos;
        }
      }
    } catch (e) { /* silenciar */ }
  },

  /** Obtener festivos de un año */
  getAño(año) {
    return Store.getFestivos()
      .filter(f => f.fecha.startsWith(año + '-'))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  },

  /** ¿Una fecha es festivo? */
  esFestivo(fecha) {
    const fs = typeof fecha === 'string' ? fecha : Utils.formatFecha(fecha);
    return Store.getFestivos().some(f => f.fecha === fs);
  },

  /** Buscar festivo por id */
  getById(id) {
    return Store.getFestivos().find(f => f.id === id) || null;
  },

  /** Añadir festivo manual */
  add(fecha, nombre, ambito) {
    const f = {
      id: 'man-' + Utils.uid(),
      fecha, nombre,
      ambito: ambito || 'local',
      inscritos: { granvia: [], isabel: [] },
      asignados: { granvia: [], isabel: [] }
    };
    Store._state.festivos.push(f);
    Store._state.festivos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    Store._emit('festivos', Store._state.festivos);
    return f;
  },

  /** Eliminar festivo */
  remove(id) {
    Store._state.festivos = Store._state.festivos.filter(f => f.id !== id);
    Store._emit('festivos', Store._state.festivos);
  },

  /** Toggle inscripción de un empleado */
  toggleInscrito(id, tienda, empleado) {
    const f = Festivos.getById(id);
    if (!f) return;
    if (!f.inscritos[tienda]) f.inscritos[tienda] = [];
    if (!f.asignados[tienda]) f.asignados[tienda] = [];
    const idx = f.inscritos[tienda].indexOf(empleado);
    if (idx >= 0) {
      f.inscritos[tienda].splice(idx, 1);
      // Si estaba asignado, desasignarlo también
      const ai = f.asignados[tienda].indexOf(empleado);
      if (ai >= 0) f.asignados[tienda].splice(ai, 1);
    } else {
      f.inscritos[tienda].push(empleado);
    }
    Store._emit('festivos', Store._state.festivos);
  },

  /** Asignar empleado a un turno de festivo (o desasignar si ya tiene ese turno) */
  asignarTurno(id, tienda, empleado, turno) {
    const f = Festivos.getById(id);
    if (!f) return;
    if (!f.asignados[tienda]) f.asignados[tienda] = [];
    if (!(f.inscritos[tienda] || []).includes(empleado)) return;

    // Quitar asignación previa si existe
    f.asignados[tienda] = f.asignados[tienda].filter(a =>
      typeof a === 'string' ? a !== empleado : a.empleado !== empleado
    );

    // Si turno es null/vacío → desasignar. Si no, asignar con turno.
    if (turno) {
      const tf = CONFIG.TURNOS_FESTIVO[turno];
      f.asignados[tienda].push({
        empleado, turno,
        entrada: tf ? tf.entrada : 7.25,
        salida: tf ? tf.salida : 14.75
      });
    }
    Store._emit('festivos', Store._state.festivos);
  },

  /** Obtener turno asignado de un empleado en un festivo */
  getTurnoAsignado(id, tienda, empleado) {
    const f = Festivos.getById(id);
    if (!f || !f.asignados[tienda]) return null;
    const a = f.asignados[tienda].find(x =>
      typeof x === 'string' ? x === empleado : x.empleado === empleado
    );
    if (!a) return null;
    return typeof a === 'string' ? { empleado: a, turno: '', entrada: 0, salida: 0 } : a;
  },

  /** ¿Está asignado? */
  estaAsignado(id, tienda, empleado) {
    return Festivos.getTurnoAsignado(id, tienda, empleado) !== null;
  },

  /** Recuento de festivos trabajados por empleado en un año */
  recuentoTrabajados(año) {
    const recuento = {};
    const lista = Festivos.getAño(año);
    for (const f of lista) {
      for (const tienda of ['granvia', 'isabel']) {
        const asign = f.asignados[tienda] || [];
        for (const a of asign) {
          const emp = typeof a === 'string' ? a : a.empleado;
          if (!recuento[emp]) recuento[emp] = { total: 0, granvia: 0, isabel: 0, fechas: [] };
          recuento[emp].total++;
          recuento[emp][tienda]++;
          recuento[emp].fechas.push({ fecha: f.fecha, nombre: f.nombre, tienda });
        }
      }
    }
    return recuento;
  }
};

// ============================================================
// FestivosUI — render del tab Festivos
// ============================================================

const FestivosUI = {

  _añoActual: null,

  render() {
    const cont = document.getElementById('tab-festivos');
    if (!cont) return;

    const año = FestivosUI._añoActual || Store.getAño();
    FestivosUI._añoActual = año;
    Festivos.asegurarAño(año);

    const lista = Festivos.getAño(año);
    const recuento = Festivos.recuentoTrabajados(año);

    let html = '';
    html += '<div class="festivos-header">';
    html += '  <div class="festivos-nav">';
    html += '    <button class="btn btn-secondary" onclick="FestivosUI.cambiarAño(-1)">‹</button>';
    html += '    <h2>Festivos ' + año + '</h2>';
    html += '    <button class="btn btn-secondary" onclick="FestivosUI.cambiarAño(1)">›</button>';
    html += '  </div>';
    html += '  <button class="btn btn-primary" onclick="FestivosUI.nuevoFestivo()">+ Festivo</button>';
    html += '</div>';

    // ── Tabla de festivos ──
    html += '<div class="festivos-grid">';
    for (const f of lista) {
      const fecha = Utils.parseFecha(f.fecha);
      const dow = Utils.DIAS[fecha.getDay()];
      const ambitoLabel = { nacional: 'Nacional', autonomico: 'Autonómico', local: 'Local' }[f.ambito] || '';
      const insGV = (f.inscritos.granvia || []).length;
      const asgGV = (f.asignados.granvia || []).length;
      const insIS = (f.inscritos.isabel || []).length;
      const asgIS = (f.asignados.isabel || []).length;

      html += '<div class="festivo-card" onclick="FestivosUI.abrirFestivo(\'' + f.id + '\')">';
      html += '  <div class="festivo-fecha">';
      html += '    <div class="festivo-dia">' + fecha.getDate() + '</div>';
      html += '    <div class="festivo-mes">' + Utils.MESES[fecha.getMonth()].slice(0,3) + '</div>';
      html += '    <div class="festivo-dow">' + dow + '</div>';
      html += '  </div>';
      html += '  <div class="festivo-info">';
      html += '    <div class="festivo-nombre">' + Utils.escapeHtml(f.nombre) + '</div>';
      html += '    <div class="festivo-ambito ambito-' + f.ambito + '">' + ambitoLabel + '</div>';
      html += '    <div class="festivo-stats">';
      html += '      <span title="Gran Vía">GV: ' + asgGV + '/' + insGV + '</span>';
      html += '      <span title="Isabel">IS: ' + asgIS + '/' + insIS + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';
    }
    html += '</div>';

    // ── Recuento ──
    html += '<div class="festivos-recuento">';
    html += '<h3>Recuento ' + año + ' — festivos trabajados</h3>';
    const empleadosRec = Object.keys(recuento).sort((a, b) => recuento[b].total - recuento[a].total);
    if (empleadosRec.length === 0) {
      html += '<p class="empty">Aún no hay asignaciones.</p>';
    } else {
      html += '<table class="recuento-table"><thead><tr><th>Empleado</th><th>GV</th><th>IS</th><th>Total</th></tr></thead><tbody>';
      for (const emp of empleadosRec) {
        const r = recuento[emp];
        html += '<tr><td>' + Utils.escapeHtml(emp) + '</td><td>' + r.granvia + '</td><td>' + r.isabel + '</td><td><strong>' + r.total + '</strong></td></tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';

    cont.innerHTML = html;
  },

  cambiarAño(delta) {
    FestivosUI._añoActual = (FestivosUI._añoActual || Store.getAño()) + delta;
    FestivosUI.render();
  },

  abrirFestivo(id) {
    const f = Festivos.getById(id);
    if (!f) return;

    const empGV = Object.keys(Store.getEmpleadosTienda('granvia')).sort();
    const empIS = Object.keys(Store.getEmpleadosTienda('isabel')).sort();

    const renderLista = (tienda, empleados) => {
      const esc = (s) => s.replace(/'/g, "\\'");
      let h = '<div class="festivo-tienda"><h4>' + (tienda === 'granvia' ? 'Gran Vía' : 'Isabel') + '</h4>';
      if (empleados.length === 0) {
        h += '<p class="empty">Sin empleados cargados</p>';
      } else {
        h += '<div class="festivo-emps">';
        for (const emp of empleados) {
          const inscrito = (f.inscritos[tienda] || []).includes(emp);
          const asignacion = Festivos.getTurnoAsignado(f.id, tienda, emp);
          const turnoActual = asignacion ? asignacion.turno : '';
          const cls = 'femp' + (inscrito ? ' inscrito' : '') + (turnoActual ? ' asignado' : '');
          h += '<div class="' + cls + '">';
          h += '  <label><input type="checkbox" ' + (inscrito ? 'checked' : '') + ' onchange="Festivos.toggleInscrito(\'' + f.id + '\',\'' + tienda + '\',\'' + esc(emp) + '\');FestivosUI.refrescarModal(\'' + f.id + '\')"> ' + Utils.escapeHtml(emp) + '</label>';
          if (inscrito) {
            const turnos = CONFIG.TURNOS_FESTIVO;
            h += '<div style="display:flex;gap:3px;margin-left:8px">';
            for (const tk in turnos) {
              const activo = turnoActual === tk;
              const btnCls = activo ? 'btn-success' : 'btn-secondary';
              const label = turnos[tk].nombre.charAt(0); // D, M, T
              h += '<button class="btn btn-sm ' + btnCls + '" style="min-width:28px;padding:2px 5px;font-size:10px" ';
              h += 'onclick="Festivos.asignarTurno(\'' + f.id + '\',\'' + tienda + '\',\'' + esc(emp) + '\',\'' + (activo ? '' : tk) + '\');FestivosUI.refrescarModal(\'' + f.id + '\')" ';
              h += 'title="' + turnos[tk].nombre + ' (' + Utils.formatHora(turnos[tk].entrada) + '-' + Utils.formatHora(turnos[tk].salida) + ')">';
              h += label + '</button>';
            }
            h += '</div>';
            if (turnoActual) {
              const tf = turnos[turnoActual];
              h += '<span style="font-size:9px;color:#2e7d32;margin-left:4px">' + tf.nombre + ' ' + Utils.formatHora(tf.entrada) + '-' + Utils.formatHora(tf.salida) + '</span>';
            }
          }
          h += '</div>';
        }
        h += '</div>';
      }
      h += '</div>';
      return h;
    };

    const fecha = Utils.parseFecha(f.fecha);
    const fechaStr = Utils.DIAS_LARGO[fecha.getDay()] + ' ' + fecha.getDate() + ' ' + Utils.MESES[fecha.getMonth()] + ' ' + fecha.getFullYear();

    let body = '<div class="modal-body">';
    body += '<p style="margin-bottom:12px;color:var(--text-secondary)">' + fechaStr + ' · ' + f.ambito + '</p>';
    body += '<div class="festivo-tiendas">';
    body += renderLista('granvia', empGV);
    body += renderLista('isabel', empIS);
    body += '</div>';
    body += '</div>';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'modal-festivo';
    overlay.innerHTML =
      '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>' + Utils.escapeHtml(f.nombre) + '</h3>' +
      '<button class="modal-close" onclick="document.getElementById(\'modal-festivo\').remove();FestivosUI.render()">×</button></div>' +
      body +
      '<div class="modal-footer">' +
      (f.id.startsWith('man-') ? '<button class="btn btn-danger" onclick="Modales.confirmar(\'¿Eliminar este festivo?\',\'Eliminar festivo\').then(function(ok){if(ok){Festivos.remove(\'' + f.id + '\');document.getElementById(\'modal-festivo\').remove();FestivosUI.render()}})">Eliminar</button>' : '') +
      '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-festivo\').remove();FestivosUI.render()">Cerrar</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
  },

  refrescarModal(id) {
    const m = document.getElementById('modal-festivo');
    if (m) m.remove();
    FestivosUI.abrirFestivo(id);
  },

  nuevoFestivo() {
    const año = FestivosUI._añoActual || Store.getAño();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'modal-nuevo-festivo';
    overlay.innerHTML =
      '<div class="modal" style="max-width:380px">' +
      '<div class="modal-header"><h3>Nuevo festivo</h3>' +
      '<button class="modal-close" onclick="document.getElementById(\'modal-nuevo-festivo\').remove()">\u00d7</button></div>' +
      '<div class="modal-body">' +
      '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700">Fecha</label>' +
      '<input type="date" id="nf-fecha" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px" value="' + año + '-01-01"></div>' +
      '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700">Nombre</label>' +
      '<input type="text" id="nf-nombre" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px" placeholder="Ej: San Juan"></div>' +
      '<div style="margin-bottom:12px"><label style="font-size:11px;font-weight:700">\u00c1mbito</label>' +
      '<select id="nf-ambito" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px">' +
      '<option value="local">Local</option><option value="autonomico">Auton\u00f3mico</option><option value="nacional">Nacional</option></select></div>' +
      '<div id="nf-error" style="color:#c62828;font-size:11px;display:none"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-nuevo-festivo\').remove()">Cancelar</button>' +
      '<button class="btn btn-success" id="nf-ok">A\u00f1adir</button>' +
      '</div></div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#nf-ok').onclick = () => {
      const fecha = overlay.querySelector('#nf-fecha').value;
      const nombre = overlay.querySelector('#nf-nombre').value.trim();
      const ambito = overlay.querySelector('#nf-ambito').value;
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        overlay.querySelector('#nf-error').textContent = 'Fecha no v\u00e1lida';
        overlay.querySelector('#nf-error').style.display = 'block';
        return;
      }
      if (!nombre) {
        overlay.querySelector('#nf-error').textContent = 'Nombre obligatorio';
        overlay.querySelector('#nf-error').style.display = 'block';
        return;
      }
      Festivos.add(fecha, nombre, ambito);
      overlay.remove();
      FestivosUI.render();
    };
  }
};
