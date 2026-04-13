// ============================================================
// YOLANDA HP — pdf.js
// Exportación PDF (L-V y FdS) — formato A3, una página
// Portado desde app_horarios_v8.html (v3.28)
// ============================================================

'use strict';

const PDFExport = {

  // ── API pública ───────────────────────────────────────────

  exportar(modo) {
    const tienda = Store.getTienda();
    const mes = Store.getMes();
    const año = Store.getAño();

    const nombreEmpresa = tienda === 'granvia' ? 'KIRA MARKET S.L.' : 'REYPIK MARKET S.L.';
    const nombreTienda  = tienda === 'granvia' ? 'GRAN VÍA' : 'ISABEL LA CATÓLICA';
    const mesNombre = Utils.MESES[mes] + ' ' + año;
    const modoTxt = modo === 'lv' ? 'Lunes a Viernes' : (modo === 'festivos' ? 'Festivos' : 'Fines de Semana');

    let calendario, wrapModo;
    if (modo === 'lv') { calendario = PDFExport._generarLV(año, mes, tienda); wrapModo = 'lv'; }
    else if (modo === 'festivos') { calendario = PDFExport._generarFestivos(año, tienda); wrapModo = 'lv'; }
    else if (modo === 'whatsapp') { calendario = PDFExport._generarWhatsApp(año, mes, tienda); wrapModo = 'whatsapp'; }
    else { calendario = PDFExport._generarFds(año, mes, tienda); wrapModo = 'fds'; }

    const tituloMes = modo === 'festivos' ? año.toString() : mesNombre;
    const html = PDFExport._wrap(wrapModo, nombreEmpresa, nombreTienda, tituloMes, modoTxt, calendario);

    const ventana = window.open('', '_blank');
    if (!ventana) {
      if (typeof Modales !== 'undefined') Modales.aviso('Bloqueado por el navegador. Permite ventanas emergentes.', 'Error');
      else console.error('Bloqueado por el navegador. Permite ventanas emergentes.');
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    setTimeout(() => { try { ventana.print(); } catch (e) {} }, 800);
  },

  // ── Generador L-V ─────────────────────────────────────────

  _generarLV(año, mes, tienda) {
    let html = '';
    let fecha = new Date(año, mes, 1);

    html += '<div class="week-view"><div class="week-header">';
    html += '<div class="col-sem">Sem</div>';
    html += '<div class="col-dia">Lunes</div><div class="col-dia">Martes</div><div class="col-dia">Miércoles</div><div class="col-dia">Jueves</div><div class="col-dia">Viernes</div>';
    html += '</div><div class="week-body">';

    while (fecha.getDay() !== 1) fecha.setDate(fecha.getDate() - 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    while (fecha <= ultimoDia || fecha.getMonth() === mes) {
      const semNum = Utils.getNumSemana(fecha);
      const semAB = Utils.getSemanaAB(fecha);

      html += '<div class="week-row">';
      html += '<div class="col-sem"><span class="num">' + semNum + '</span><span class="letra">' + semAB + '</span></div>';

      for (let d = 0; d < 5; d++) {
        const dia = new Date(fecha);
        dia.setDate(dia.getDate() + d);
        const esDelMes = dia.getMonth() === mes;

        html += '<div class="col-dia" style="' + (esDelMes ? '' : 'opacity:0.4') + '">';
        html += '<div class="dia-num">' + dia.getDate() + ' ' + Utils.MESES[dia.getMonth()].substring(0, 3) + '</div>';

        if (esDelMes) {
          const horarios = Rotaciones.getHorariosLV(dia, tienda);
          html += PDFExport._renderTurnosLV(dia, horarios, tienda);
        }
        html += '</div>';
      }

      html += '</div>';
      fecha.setDate(fecha.getDate() + 7);
      if (fecha > ultimoDia && fecha.getMonth() !== mes) break;
    }

    html += '</div></div>';
    return html;
  },

  // ── Generador FdS ─────────────────────────────────────────

  _generarFds(año, mes, tienda) {
    let html = '';
    let fecha = new Date(año, mes, 1);
    while (fecha.getDay() !== 6) fecha.setDate(fecha.getDate() + 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    let numSemanas = 0;
    let f = new Date(fecha);
    while (f <= ultimoDia || f.getMonth() === mes) {
      const sab = new Date(f);
      const dom = new Date(f); dom.setDate(dom.getDate() + 1);
      if (sab.getMonth() === mes || dom.getMonth() === mes) numSemanas++;
      f.setDate(f.getDate() + 7);
    }

    html += '<div class="fds-grid" style="grid-template-columns: repeat(' + numSemanas + ', 1fr);">';

    while (fecha <= ultimoDia || fecha.getMonth() === mes) {
      const sab = new Date(fecha);
      const dom = new Date(fecha); dom.setDate(dom.getDate() + 1);
      const esDelMes = sab.getMonth() === mes || dom.getMonth() === mes;

      if (!esDelMes) { fecha.setDate(fecha.getDate() + 7); continue; }

      const fdsData = Rotaciones.getFds(sab, tienda) || {};

      html += '<div class="fds-card">';
      html += '<div class="fds-card-header">Semana ' + Utils.getNumSemana(sab) + '</div>';
      html += '<div class="fds-card-body">';

      html += '<div class="fds-turno sab-m"><div class="fds-turno-header">SAB ' + sab.getDate() + ' Mañana</div>';
      html += PDFExport._renderTurnosFds(sab, fdsData.SAB_M || {}, 'SAB_M', tienda);
      html += '</div>';

      html += '<div class="fds-turno dom-m"><div class="fds-turno-header">DOM ' + dom.getDate() + ' Mañana</div>';
      html += PDFExport._renderTurnosFds(dom, fdsData.DOM_M || {}, 'DOM_M', tienda);
      html += '</div>';

      html += '<div class="fds-turno sab-t"><div class="fds-turno-header">SAB ' + sab.getDate() + ' Tarde</div>';
      html += PDFExport._renderTurnosFds(sab, fdsData.SAB_T || {}, 'SAB_T', tienda);
      html += '</div>';

      html += '<div class="fds-turno dom-t"><div class="fds-turno-header">DOM ' + dom.getDate() + ' Tarde</div>';
      html += PDFExport._renderTurnosFds(dom, fdsData.DOM_T || {}, 'DOM_T', tienda);
      html += '</div>';

      html += '</div></div>';
      fecha.setDate(fecha.getDate() + 7);
    }

    html += '</div>';
    return html;
  },

  // ── Render turnos L-V ─────────────────────────────────────

  _renderTurnosLV(dia, horarios, tienda) {
    if (!horarios) return '';
    const fs = Utils.formatFecha(dia);
    const sustituciones = Store.getSustituciones();

    // Aplicar modificaciones de horario
    const horariosAjustados = {};
    for (const n in horarios) {
      const mod = Store.getModificacion(n, fs, tienda, null);
      horariosAjustados[n] = mod ? [mod.nuevaEntrada, mod.nuevaSalida] : horarios[n];
    }

    const franjas = { descarga: [], mañanas: [], tardes: [], cierre: [] };

    for (const n in horariosAjustados) {
      const h = horariosAjustados[n];
      const franja = Utils.getFranja(h[0], h[1], tienda);
      if (!franjas[franja]) continue;

      // Si está actuando como sustituto en otra franja del mismo día → ocultar
      const estaSust = sustituciones.some(s =>
        s.sustituto === n && s.fecha === fs && s.tienda === tienda && !s.turnoFds
      );
      if (estaSust) continue;

      const aus = Store.estaAusente(n, fs, tienda);
      const tipoAus = aus ? Store.getTipoAusencia(n, fs, tienda) : '';
      const sust = Store.getSustituto(dia, n, tienda, null);

      franjas[franja].push({ nombre: n, h, aus, tipoAus, sust });
    }

    let html = '<div class="turnos-wrap">';
    for (const f in franjas) {
      html += '<div class="franja-pdf">';
      for (const t of franjas[f]) {
        const etiquetaAus = PDFExport._etiquetaAusencia(t.tipoAus, t.aus);
        html += '<div class="turno ' + f + (t.aus ? ' ausente' : '') + '">';
        html += '<span class="turno-nombre">' + Utils.escapeHtml(t.nombre) + etiquetaAus + '</span>';
        html += '<span class="turno-hora">' + Utils.formatHora(t.h[0]) + '-' + Utils.formatHora(t.h[1]) + '</span>';
        html += '</div>';
        if (t.sust) {
          html += '<div class="turno sustituto">';
          html += '<span class="turno-nombre">→ ' + Utils.escapeHtml(t.sust.sustituto) + '</span>';
          html += '<span class="turno-hora">' + Utils.formatHora(t.sust.entrada) + '-' + Utils.formatHora(t.sust.salida) + '</span>';
          html += '</div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  // ── Render turnos FdS ─────────────────────────────────────

  _renderTurnosFds(dia, horarios, turnoKey, tienda) {
    if (!horarios) return '';
    const fs = Utils.formatFecha(dia);
    const sustituciones = Store.getSustituciones();
    let html = '';

    for (const n in horarios) {
      const h = horarios[n];

      // Si actúa como sustituto en otro turno FdS → ocultar
      const estaSust = sustituciones.some(s =>
        s.sustituto === n && s.fecha === fs && s.tienda === tienda && s.turnoFds && s.turnoFds !== turnoKey
      );
      if (estaSust) continue;

      const aus = Store.estaAusente(n, fs, tienda);
      const tipoAus = aus ? Store.getTipoAusencia(n, fs, tienda) : '';
      const etiquetaAus = PDFExport._etiquetaAusencia(tipoAus, aus);

      html += '<div class="turno fds' + (aus ? ' ausente' : '') + '">';
      html += '<span class="turno-nombre">' + Utils.escapeHtml(n) + etiquetaAus + '</span>';
      html += '<span class="turno-hora">' + Utils.formatHora(h[0]) + '-' + Utils.formatHora(h[1]) + '</span>';
      html += '</div>';

      const sust = Store.getSustituto(dia, n, tienda, turnoKey);
      if (sust) {
        html += '<div class="turno sustituto">';
        html += '<span class="turno-nombre">→ ' + Utils.escapeHtml(sust.sustituto) + '</span>';
        html += '<span class="turno-hora">' + Utils.formatHora(sust.entrada) + '-' + Utils.formatHora(sust.salida) + '</span>';
        html += '</div>';
      }
    }
    return html;
  },

  // ── Generar PDF Festivos ──────────────────────────────────

  _generarFestivos(año, tienda) {
    if (typeof Festivos !== 'undefined') Festivos.asegurarAño(año);
    const lista = Store.getFestivos().filter(f => f.fecha.startsWith(año + '-'));
    const festivosConAsig = lista.filter(f => {
      const asig = f.asignados[tienda] || [];
      return asig.length > 0;
    });

    if (festivosConAsig.length === 0) {
      return '<div style="text-align:center;padding:40px;color:#888;font-size:14px">No hay festivos con asignaciones para ' + (tienda === 'granvia' ? 'Gran Vía' : 'Isabel') + ' en ' + año + '</div>';
    }

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(350px, 1fr));gap:16px;padding:16px">';

    for (const f of festivosConAsig) {
      const fecha = Utils.parseFecha(f.fecha);
      const dow = Utils.DIAS_LARGO[fecha.getDay()];
      const fechaStr = dow + ' ' + fecha.getDate() + ' ' + Utils.MESES[fecha.getMonth()];
      const asig = f.asignados[tienda] || [];

      const porTurno = { descarga: [], 'mañanas': [], tardes: [] };
      for (const a of asig) {
        const t = typeof a === 'string' ? 'mañanas' : (a.turno || 'mañanas');
        if (porTurno[t]) porTurno[t].push(a);
      }

      html += '<div style="background:#fff;border-radius:10px;border:3px solid #c62828;overflow:hidden">';
      html += '<div style="background:#c62828;color:#fff;padding:12px 16px;text-align:center">';
      html += '<div style="font-size:18px;font-weight:800">' + Utils.escapeHtml(f.nombre) + '</div>';
      html += '<div style="font-size:14px;opacity:0.9;margin-top:2px">' + fechaStr + '</div>';
      html += '</div>';
      html += '<div style="padding:8px">';

      for (const tk in porTurno) {
        if (porTurno[tk].length === 0) continue;
        const tf = CONFIG.TURNOS_FESTIVO[tk];
        html += '<div style="margin-bottom:6px">';
        html += '<div class="turno ' + tk + '" style="font-size:12px;font-weight:700;text-transform:uppercase;padding:3px 8px;margin-bottom:2px">' + tf.nombre + ' ' + Utils.formatHora(tf.entrada) + '-' + Utils.formatHora(tf.salida) + '</div>';
        for (const a of porTurno[tk]) {
          const emp = typeof a === 'string' ? a : a.empleado;
          const entrada = typeof a === 'object' ? a.entrada : tf.entrada;
          const salida = typeof a === 'object' ? a.salida : tf.salida;
          html += '<div class="turno ' + tk + '" style="font-size:14px;padding:4px 8px">';
          html += '<span class="turno-nombre">' + Utils.escapeHtml(emp) + '</span>';
          html += '<span class="turno-hora">' + Utils.formatHora(entrada) + '-' + Utils.formatHora(salida) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div></div>';
    }

    html += '</div>';
    return html;
  },

  // ── Generar formato WhatsApp (semana actual, vertical, compacto) ──

  _generarWhatsApp(año, mes, tienda) {
    const hoy = new Date();
    const lunes = Utils.getLunesDeSemana(hoy);
    const numSem = Utils.getNumSemana(lunes);
    const semAB = Utils.getSemanaAB(lunes);

    let html = '<div style="max-width:400px;margin:0 auto;font-size:13px">';
    html += '<div style="text-align:center;margin-bottom:12px;font-size:11px;color:#666">Semana ' + numSem + ' (' + semAB + ') — ' + Utils.formatFechaES(Utils.formatFecha(lunes)) + '</div>';

    // L-V
    for (let d = 0; d < 5; d++) {
      const dia = new Date(lunes);
      dia.setDate(dia.getDate() + d);
      const fs = Utils.formatFecha(dia);

      const esFestivo = typeof Festivos !== 'undefined' && Festivos.esFestivo(dia);
      const horarios = Rotaciones.getHorariosLV(dia, tienda);
      const horariosAj = Rotaciones.aplicarModificaciones(horarios || {}, dia, tienda);

      html += '<div style="background:#fff;border-radius:8px;margin-bottom:8px;border:1px solid #ddd;overflow:hidden">';
      html += '<div style="background:#1a1a2e;color:#fff;padding:6px 10px;font-weight:700;font-size:12px">' + Utils.DIAS_LARGO[dia.getDay()] + ' ' + dia.getDate() + '/' + (dia.getMonth()+1) + '</div>';

      if (esFestivo) {
        const festivoData = Store.getFestivos().find(f => f.fecha === fs);
        html += '<div style="padding:10px;text-align:center;background:#ffebee;color:#c62828;font-weight:700">FESTIVO' + (festivoData ? ' — ' + Utils.escapeHtml(festivoData.nombre) : '') + '</div>';
      } else {
        const franjas = { descarga: [], mañanas: [], tardes: [], cierre: [] };
        for (const n in horariosAj) {
          const h = horariosAj[n];
          if (Store.estaAusente(n, fs, tienda)) continue;
          const fr = Utils.getFranja(h[0], h[1], tienda);
          if (franjas[fr]) franjas[fr].push({ n, h });
        }
        // Sustituciones
        const susts = Store.getSustituciones();
        for (const s of susts) {
          if (s.fecha !== fs || s.tienda !== tienda || s.turnoFds) continue;
          const fr = Utils.getFranja(s.entrada, s.salida, tienda);
          if (franjas[fr]) franjas[fr].push({ n: '→ ' + s.sustituto, h: [s.entrada, s.salida] });
        }

        html += '<div style="padding:6px">';
        const colores = { descarga: '#2c5aa0', mañanas: '#2e7d32', tardes: '#e65100', cierre: '#6a1b9a' };
        for (const fr in franjas) {
          if (franjas[fr].length === 0) continue;
          html += '<div style="margin-bottom:4px">';
          html += '<div style="font-size:9px;font-weight:700;color:' + colores[fr] + ';text-transform:uppercase;margin-bottom:1px">' + fr + '</div>';
          for (const t of franjas[fr]) {
            html += '<div style="display:flex;justify-content:space-between;padding:2px 6px;background:' + colores[fr] + '15;border-left:3px solid ' + colores[fr] + ';margin-bottom:1px;border-radius:2px;font-size:12px">';
            html += '<span style="font-weight:600">' + Utils.escapeHtml(t.n) + '</span>';
            html += '<span style="color:#666;font-size:11px">' + Utils.formatHora(t.h[0]) + '-' + Utils.formatHora(t.h[1]) + '</span>';
            html += '</div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    // FdS
    const sab = new Date(lunes); sab.setDate(sab.getDate() + 5);
    const dom = new Date(lunes); dom.setDate(dom.getDate() + 6);
    const fdsData = Rotaciones.getFds(sab, tienda);

    for (const [dia, turnos, label] of [[sab, ['SAB_M','SAB_T'], 'Sábado'], [dom, ['DOM_M','DOM_T'], 'Domingo']]) {
      html += '<div style="background:#fff;border-radius:8px;margin-bottom:8px;border:1px solid #ddd;overflow:hidden">';
      html += '<div style="background:#1a1a2e;color:#fff;padding:6px 10px;font-weight:700;font-size:12px">' + label + ' ' + dia.getDate() + '/' + (dia.getMonth()+1) + '</div>';

      const esFestivo = dia.getDay() === 6 && typeof Festivos !== 'undefined' && Festivos.esFestivo(dia);
      if (esFestivo) {
        const festivoData = Store.getFestivos().find(f => f.fecha === Utils.formatFecha(dia));
        html += '<div style="padding:10px;text-align:center;background:#ffebee;color:#c62828;font-weight:700">FESTIVO' + (festivoData ? ' — ' + Utils.escapeHtml(festivoData.nombre) : '') + '</div>';
      } else {
        html += '<div style="padding:6px">';
        const turnoLabels = { SAB_M: 'Mañana', SAB_T: 'Tarde', DOM_M: 'Mañana', DOM_T: 'Tarde' };
        const turnoColors = { SAB_M: '#0277bd', SAB_T: '#00695c', DOM_M: '#558b2f', DOM_T: '#d84315' };
        for (const tk of turnos) {
          const emps = fdsData[tk] || {};
          if (Object.keys(emps).length === 0) continue;
          html += '<div style="margin-bottom:4px">';
          html += '<div style="font-size:9px;font-weight:700;color:' + turnoColors[tk] + ';text-transform:uppercase;margin-bottom:1px">' + turnoLabels[tk] + '</div>';
          for (const emp in emps) {
            const h = emps[emp];
            html += '<div style="display:flex;justify-content:space-between;padding:2px 6px;background:' + turnoColors[tk] + '15;border-left:3px solid ' + turnoColors[tk] + ';margin-bottom:1px;border-radius:2px;font-size:12px">';
            html += '<span style="font-weight:600">' + Utils.escapeHtml(emp) + '</span>';
            html += '<span style="color:#666;font-size:11px">' + Utils.formatHora(h[0]) + '-' + Utils.formatHora(h[1]) + '</span>';
            html += '</div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  },

  _etiquetaAusencia(tipo, aus) {
    if (!aus) return '';
    if (tipo === 'baja') return ' (BAJA)';
    if (tipo === 'vacaciones') return ' (VACAS)';
    if (tipo === 'permiso') return ' (PERM)';
    return ' (AUS)';
  },

  // ── Plantilla HTML + estilos ──────────────────────────────

  _wrap(modo, empresa, tienda, mesNombre, modoTxt, calendario) {
    let css = '';
    css += '* { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }';

    if (modo === 'lv') {
      css += 'html, body { width: 100%; min-height: 100%; }';
      css += 'body { padding: 10px; background: #f5f5f5; }';
    } else {
      css += 'html { height: 100%; }';
      css += 'body { height: 100%; padding: 10px; background: #f5f5f5; display: flex; flex-direction: column; margin: 0; }';
    }

    css += '.header { background: #1a1a2e; color: white; padding: 8px 15px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; width: 100%; }';
    css += '.header h1 { font-size: 16px; font-weight: 700; }';
    css += '.header .tienda { font-size: 18px; font-weight: 700; letter-spacing: 1px; }';
    css += '.header .info { display: flex; gap: 15px; align-items: center; }';
    css += '.header .mes { font-size: 12px; opacity: 0.9; }';
    css += '.header .modo { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 4px; font-size: 10px; }';

    if (modo === 'lv') {
      css += '.week-view { background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 6px; }';
      css += '.week-header { display: flex; background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%); border-bottom: 2px solid #dee2e6; font-weight: 600; font-size: 9px; text-transform: uppercase; }';
      css += '.week-header .col-sem { width: 30px; padding: 6px 2px; text-align: center; border-right: 1px solid #dee2e6; color: #e53935; }';
      css += '.week-header .col-dia { flex: 1; padding: 6px 2px; text-align: center; border-right: 1px solid #dee2e6; color: #495057; }';
      css += '.week-row { display: flex; border-bottom: 1px solid #e9ecef; }';
      css += '.col-sem { width: 30px; padding: 3px 2px; background: linear-gradient(180deg, #f8f9fa 0%, #fff 100%); border-right: 1px solid #dee2e6; display: flex; flex-direction: column; align-items: center; justify-content: center; }';
      css += '.col-sem .num { font-size: 12px; font-weight: 700; color: #e53935; }';
      css += '.col-sem .letra { font-size: 9px; color: #6c757d; font-weight: 600; }';
      css += '.col-dia { flex: 1; border-right: 1px solid #f0f0f0; padding: 2px 3px; display: flex; flex-direction: column; }';
      css += '.dia-num { font-size: 9px; font-weight: 800; color: #1a1a2e; margin-bottom: 2px; }';
      css += '.turnos-wrap { display: flex; flex-direction: column; flex: 1; }';
      css += '.franja-pdf { flex: 1; display: flex; flex-direction: column; justify-content: flex-start; }';
      css += '.turno { padding: 2px 5px; margin-bottom: 1px; font-size: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid transparent; }';
      css += '.turno-nombre { font-weight: 700; white-space: nowrap; }';
      css += '.turno-hora { white-space: nowrap; font-size: 7px; font-weight: 600; }';
    } else {
      css += '.fds-grid { display: grid; gap: 10px; width: 100%; }';
      css += '.fds-card { background: #fff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; }';
      css += '.fds-card-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 10px 12px; font-weight: 600; font-size: 14px; text-align: center; }';
      css += '.fds-card-body { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; padding: 10px; flex: 1; }';
      css += '.fds-turno { border-radius: 6px; padding: 8px; display: flex; flex-direction: column; }';
      css += '.fds-turno.sab-m { background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px solid #1976d2; }';
      css += '.fds-turno.dom-m { background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #388e3c; }';
      css += '.fds-turno.sab-t { background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border: 2px solid #f57c00; }';
      css += '.fds-turno.dom-t { background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); border: 2px solid #7b1fa2; }';
      css += '.fds-turno-header { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px solid rgba(0,0,0,0.1); }';
      css += '.turno { padding: 3px 6px; margin-bottom: 1px; font-size: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid transparent; }';
      css += '.turno-nombre { font-weight: 700; white-space: nowrap; }';
      css += '.turno-hora { white-space: nowrap; font-size: 9px; font-weight: 600; }';
    }

    css += '.turno.descarga { background: #bbcfea; border-left-color: #1a4a8a; color: #0d2b52; }';
    css += '.turno.mañanas { background: #b8ddb2; border-left-color: #1b6e20; color: #0d3d10; }';
    css += '.turno.tardes { background: #fdd0a0; border-left-color: #d84300; color: #7a2800; }';
    css += '.turno.cierre { background: #d7b8e8; border-left-color: #5a0f80; color: #30084a; }';
    css += '.turno.fds { background: #cfd8dc; border-left-color: #263238; color: #1a2226; }';
    css += '.turno.ausente { text-decoration: line-through; background: #e0e0e0; border-left-color: #9e9e9e; color: #9e9e9e; opacity: 0.6; }';
    css += '.turno.sustituto { background: #ffe066; border-left-color: #e65100; color: #212121; font-weight: 700; }';
    css += '.turno.sustituto .turno-nombre { color: #bf360c; font-weight: 800; } .turno.sustituto .turno-hora { color: #333; font-weight: 700; }';

    if (modo === 'whatsapp') {
      css += '@media print { @page { size: A4 portrait; margin: 5mm; } body { width: 200mm; padding: 0 !important; } .btn-print-bar { display: none !important; } }';
    } else if (modo === 'lv') {
      css += '@media print { @page { size: A3 portrait; margin: 3mm; } body { width: 291mm; max-height: 414mm; overflow: hidden; padding: 0 !important; } .btn-print-bar { display: none !important; } }';
    } else {
      css += '@media print { @page { size: A3 landscape; margin: 3mm; } body { width: 414mm; max-height: 291mm; overflow: hidden; padding: 0 !important; } .btn-print-bar { display: none !important; } }';
    }

    css += '.btn-print-bar { position: fixed; top: 0; left: 0; right: 0; background: #1a1a2e; padding: 8px 20px; display: flex; gap: 10px; align-items: center; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }';
    css += '.btn-print-bar button { padding: 6px 16px; border: none; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; background: #4caf50; color: #fff; }';
    css += '@media print { .btn-print-bar { display: none !important; } body { padding-top: 0 !important; } }';

    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Horarios ' + mesNombre + ' - ' + modoTxt + '</title>';
    html += '<style>' + css + '</style></head><body style="padding-top: 45px;">';
    html += '<div class="btn-print-bar"><button onclick="window.print()">🖨 Imprimir / Guardar PDF</button><span style="color:rgba(255,255,255,0.6);font-size:11px">Consejo: en Safari → Archivo → Exportar como PDF para mejor calidad</span></div>';
    html += '<div class="header">';
    html += '<h1>' + Utils.escapeHtml(empresa) + '</h1>';
    html += '<div class="tienda">' + Utils.escapeHtml(tienda) + '</div>';
    html += '<div class="info"><div class="mes">' + Utils.escapeHtml(mesNombre) + '</div>';
    html += '<div class="modo">' + Utils.escapeHtml(modoTxt) + '</div></div>';
    html += '</div>';
    html += calendario;
    html += '</body></html>';
    return html;
  }
};
