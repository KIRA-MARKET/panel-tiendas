// ============================================================
// HORARIOS KIRA & REYPIK — auditor.js
// Escaneo del mes con problemas detectados y sugerencias
// ============================================================

'use strict';

const Auditor = {

  /**
   * Construye los intervalos [entrada, salida] activos de un día/tienda
   * considerando ausencias, sustituciones y modificaciones de horario.
   * Devuelve [{emp, entrada, salida}]
   */
  intervalosDelDia(fecha, tienda) {
    const dow = fecha.getDay();
    if (dow < 1 || dow > 5) return [];
    const fs = Utils.formatFecha(fecha);
    const horarios = Rotaciones.getHorariosLV(fecha, tienda);
    if (!horarios) return [];

    const out = [];

    // 1. Empleados base no ausentes (con posible modificación)
    for (const emp in horarios) {
      if (Store.estaAusente(emp, fs, tienda)) continue;
      const mod = Store.getModificacion(emp, fs, tienda);
      const h = mod ? [mod.entrada, mod.salida] : horarios[emp];
      out.push({ emp, entrada: h[0], salida: h[1] });
    }

    // 2. Sustituciones del día: si el sustituto no estaba ya con ese turno, se añade
    const susts = Store.getSustituciones();
    for (const s of susts) {
      if (s.fecha !== fs || s.tienda !== tienda || s.turnoFds) continue;

      // Si el sustituto ya tiene turno propio y se solapa, se considera que SE MUEVE:
      // quitar su intervalo original y poner el nuevo
      const idx = out.findIndex(x => x.emp === s.sustituto);
      if (idx >= 0) {
        const cur = out[idx];
        const seSolapan = !(s.salida <= cur.entrada || cur.salida <= s.entrada);
        if (seSolapan) {
          out.splice(idx, 1);
        }
      }
      out.push({ emp: s.sustituto, entrada: s.entrada, salida: s.salida });
    }

    return out;
  },

  /**
   * Detecta huecos de cobertura: tramos entre la primera entrada y la última
   * salida del día donde no hay nadie en la tienda.
   * Devuelve [{desde, hasta}] en horas decimales.
   */
  detectarHuecos(fecha, tienda) {
    const intervalos = Auditor.intervalosDelDia(fecha, tienda);
    if (intervalos.length === 0) return [];

    // Eventos: +1 al entrar, -1 al salir
    const eventos = [];
    for (const i of intervalos) {
      eventos.push({ t: i.entrada, d: +1 });
      eventos.push({ t: i.salida, d: -1 });
    }
    // Ordenar: a igual tiempo, primero las entradas (+1) para no marcar gap espurio
    eventos.sort((a, b) => a.t - b.t || b.d - a.d);

    const inicio = eventos[0].t;
    const fin = eventos[eventos.length - 1].t;

    const huecos = [];
    let activos = 0;
    let huecoIni = null;
    for (const ev of eventos) {
      activos += ev.d;
      if (activos === 0 && ev.t < fin) {
        huecoIni = ev.t;
      } else if (activos > 0 && huecoIni !== null) {
        if (ev.t > huecoIni) huecos.push({ desde: huecoIni, hasta: ev.t });
        huecoIni = null;
      }
    }
    return huecos;
  },

  /** Escanea el mes activo en ambas tiendas y devuelve problemas agrupados */
  auditarMes() {
    const año = Store.getAño();
    const mes = Store.getMes();
    const ultimoDia = Utils.ultimoDiaMes(año, mes).getDate();

    const problemas = {
      cobertura: [],   // mínimos rotos sin sustituto
      sinSustituto: [],// ausencias sin cobertura asignada
      continuidad: [], // huecos horarios (sin nadie en tienda)
      vacaciones: [],  // empleados que exceden vacaciones
      festivos: [],    // festivos del mes sin asignaciones suficientes
      solapes: []      // solapes entre tiendas
    };

    for (let d = 1; d <= ultimoDia; d++) {
      const fecha = new Date(año, mes, d);
      const fs = Utils.formatFecha(fecha);
      const dow = fecha.getDay();

      for (const tienda of ['granvia', 'isabel']) {
        // Cobertura mínimos L-V
        if (dow >= 1 && dow <= 5) {
          const alertas = Cobertura.verificarMinimosLV(fecha, tienda);
          for (const a of alertas) {
            problemas.cobertura.push({
              fecha: fs, tienda,
              franja: a.franja, actual: a.actual, minimo: a.minimo, falta: a.falta
            });
          }

          // Continuidad horaria: huecos sin nadie en tienda
          const huecos = Auditor.detectarHuecos(fecha, tienda);
          for (const h of huecos) {
            problemas.continuidad.push({ fecha: fs, tienda, desde: h.desde, hasta: h.hasta });
          }
        }

        // Cobertura mínimos FdS
        if (dow === 0 || dow === 6) {
          const alertasFds = Cobertura.verificarMinimosFds(fecha, tienda);
          for (const a of alertasFds) {
            problemas.cobertura.push({
              fecha: fs, tienda,
              franja: a.franja, actual: a.actual, minimo: a.minimo, falta: a.falta
            });
          }
        }

        // Ausencias activas sin sustituto en franja crítica
        const ausencias = Store.getAusencias(tienda);
        for (const aus of ausencias) {
          if (fs < aus.desde || fs > aus.hasta) continue;
          const sust = Store.getSustituto(fs, aus.empleado, tienda);
          if (!sust && !Store.esDescartado(fs, aus.empleado, tienda)) {
            // Solo lo flagueamos si es un día laborable y el empleado tenía turno
            if (dow >= 1 && dow <= 5) {
              const horarios = Rotaciones.getHorariosLV(fecha, tienda);
              if (horarios && horarios[aus.empleado]) {
                problemas.sinSustituto.push({
                  fecha: fs, tienda, empleado: aus.empleado, tipo: aus.tipo
                });
              }
            }
          }
        }
      }

      // Solapes: empleado aparece en ambas tiendas el mismo día
      if (dow >= 1 && dow <= 5) {
        const hGV = Rotaciones.getHorariosLV(fecha, 'granvia') || {};
        const hIS = Rotaciones.getHorariosLV(fecha, 'isabel') || {};
        for (const emp in hGV) {
          if (hIS[emp]) {
            const a = hGV[emp], b = hIS[emp];
            if (!(a[1] <= b[0] || b[1] <= a[0])) {
              problemas.solapes.push({ fecha: fs, empleado: emp, gv: a, is: b });
            }
          }
        }
      }
    }

    // Vacaciones excedidas (escanea año completo)
    const maxVac = CONFIG.DIAS_VACACIONES_ANUALES;
    for (const tienda of ['granvia', 'isabel']) {
      const resumen = ControlUI.calcularResumen(tienda, año);
      for (const alias in resumen) {
        const r = resumen[alias];
        if (r.vacaciones > maxVac) {
          problemas.vacaciones.push({
            empleado: alias, tienda,
            usados: r.vacaciones, max: maxVac, exceso: r.vacaciones - maxVac
          });
        }
      }
    }

    // Festivos del mes sin asignaciones
    const festivosMes = Festivos.getAño(año).filter(f => {
      const fec = Utils.parseFecha(f.fecha);
      return fec.getMonth() === mes;
    });
    for (const f of festivosMes) {
      const asgGV = (f.asignados.granvia || []).length;
      const asgIS = (f.asignados.isabel || []).length;
      if (asgGV === 0 && asgIS === 0) {
        problemas.festivos.push({
          id: f.id, fecha: f.fecha, nombre: f.nombre, motivo: 'sin asignaciones'
        });
      } else if (asgGV === 0) {
        problemas.festivos.push({
          id: f.id, fecha: f.fecha, nombre: f.nombre, motivo: 'Gran Vía sin asignar'
        });
      } else if (asgIS === 0) {
        problemas.festivos.push({
          id: f.id, fecha: f.fecha, nombre: f.nombre, motivo: 'Isabel sin asignar'
        });
      }
    }

    return problemas;
  },

  /** Renderiza el resultado en un modal */
  mostrar(problemas) {
    const mes = Utils.MESES[Store.getMes()];
    const año = Store.getAño();

    const total = problemas.cobertura.length + problemas.sinSustituto.length +
                  problemas.continuidad.length + problemas.vacaciones.length +
                  problemas.festivos.length + problemas.solapes.length;

    let body = '';
    body += '<p style="margin-bottom:12px;color:var(--text-secondary)">' + mes + ' ' + año + ' — ';
    body += (total === 0 ? '<strong style="color:var(--ok)">Sin problemas detectados</strong>' :
             '<strong>' + total + ' problema' + (total !== 1 ? 's' : '') + '</strong>');
    body += '</p>';

    const seccion = (titulo, items, render, color) => {
      if (items.length === 0) return '';
      let h = '<div class="audit-section">';
      h += '<h4 class="audit-titulo" style="border-color:' + color + ';color:' + color + '">' +
           titulo + ' (' + items.length + ')</h4>';
      h += '<ul class="audit-list">';
      for (const it of items.slice(0, 50)) h += '<li>' + render(it) + '</li>';
      if (items.length > 50) h += '<li style="color:var(--text-muted)">… y ' + (items.length - 50) + ' más</li>';
      h += '</ul></div>';
      return h;
    };

    body += seccion('Cobertura bajo mínimos', problemas.cobertura,
      it => Utils.formatFechaES(it.fecha) + ' · <strong>' + (it.tienda === 'granvia' ? 'GV' : 'IS') + '</strong> · ' +
            Utils.escapeHtml(it.franja) + ' ' + it.actual + '/' + it.minimo +
            ' (faltan ' + it.falta + ')',
      'var(--err)');

    body += seccion('Huecos de continuidad horaria', problemas.continuidad,
      it => Utils.formatFechaES(it.fecha) + ' · <strong>' + (it.tienda === 'granvia' ? 'GV' : 'IS') + '</strong> · sin nadie de ' +
            Utils.formatHora(it.desde) + ' a ' + Utils.formatHora(it.hasta),
      'var(--err)');

    body += seccion('Ausencias sin sustituto', problemas.sinSustituto,
      it => Utils.formatFechaES(it.fecha) + ' · <strong>' + (it.tienda === 'granvia' ? 'GV' : 'IS') + '</strong> · ' +
            Utils.escapeHtml(it.empleado) + ' (' + Utils.escapeHtml(it.tipo || '—') + ')',
      'var(--warn)');

    body += seccion('Solapes entre tiendas', problemas.solapes,
      it => Utils.formatFechaES(it.fecha) + ' · ' + Utils.escapeHtml(it.empleado) +
            ' GV ' + Utils.formatHora(it.gv[0]) + '-' + Utils.formatHora(it.gv[1]) +
            ' / IS ' + Utils.formatHora(it.is[0]) + '-' + Utils.formatHora(it.is[1]),
      'var(--err)');

    body += seccion('Vacaciones excedidas', problemas.vacaciones,
      it => '<strong>' + Utils.escapeHtml(it.empleado) + '</strong> (' + (it.tienda === 'granvia' ? 'GV' : 'IS') + ') · ' +
            it.usados + '/' + it.max + ' días (+' + it.exceso + ')',
      'var(--err)');

    body += seccion('Festivos del mes pendientes', problemas.festivos,
      it => Utils.formatFechaES(it.fecha) + ' · ' + Utils.escapeHtml(it.nombre) + ' — ' + it.motivo,
      'var(--warn)');

    if (total === 0) {
      body += '<div style="text-align:center;padding:24px;color:var(--ok);font-size:14px">' +
              '✓ Todo en orden para ' + mes + ' ' + año + '</div>';
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML =
      '<div class="modal modal-lg">' +
      '<div class="modal-header"><h3>Auditor — ' + mes + ' ' + año + '</h3>' +
      '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">×</button></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cerrar</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
  }
};
