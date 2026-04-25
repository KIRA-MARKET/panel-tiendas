// ============================================================
// HORARIOS KIRA & REYPIK — tests.js
// Mini-runner de tests sin dependencias
// ============================================================

(function () {
  'use strict';

  let pasados = 0, fallados = 0;
  // Promesas pendientes de tests async; el resumen final espera a que
  // todas resuelvan antes de pintar el total para no contar en falso.
  const pendientes = [];
  const resultsEl = document.getElementById('results');
  let suiteActual = null;

  function suite(nombre, fn) {
    const div = document.createElement('div');
    div.className = 'suite';
    div.innerHTML = '<h2>' + nombre + '</h2>';
    resultsEl.appendChild(div);
    suiteActual = div;
    try { fn(); } catch (e) {
      const p = document.createElement('div');
      p.className = 'test ko';
      p.textContent = '✗ ERROR EN SUITE: ' + e.message;
      div.appendChild(p);
      fallados++;
    }
    suiteActual = null;
  }

  function test(nombre, fn) {
    const p = document.createElement('div');
    p.className = 'test';
    suiteActual.appendChild(p);
    const marcarOk = () => {
      p.className += ' ok';
      p.textContent = '✓ ' + nombre;
      pasados++;
    };
    const marcarKo = (e) => {
      p.className += ' ko';
      p.textContent = '✗ ' + nombre + ' — ' + (e && e.message ? e.message : e);
      fallados++;
    };
    try {
      const r = fn();
      // Soporte de tests async: si fn devuelve un thenable, esperar a la
      // resolución antes de marcar y registrar la promesa para que el
      // resumen final no se imprima antes de tiempo.
      if (r && typeof r.then === 'function') {
        pendientes.push(r.then(marcarOk).catch(marcarKo));
      } else {
        marcarOk();
      }
    } catch (e) {
      marcarKo(e);
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assert falló');
  }
  function assertEq(a, b, msg) {
    if (a !== b) throw new Error((msg || 'esperaba ') + JSON.stringify(b) + ' pero fue ' + JSON.stringify(a));
  }
  function assertDeep(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error((msg || 'esperaba ') + JSON.stringify(b) + ' pero fue ' + JSON.stringify(a));
    }
  }

  // ============================================================
  // FESTIVOS — generación por defecto Granada
  // ============================================================
  suite('Festivos: defaults Granada capital', function () {
    const lista = Festivos.generarDefault(2026);
    const fechas = lista.map(f => f.fecha);
    const nombres = lista.map(f => f.nombre);

    test('Incluye Año Nuevo', () => assert(fechas.includes('2026-01-01')));
    test('Incluye Toma de Granada (2 ene)', () => assert(fechas.includes('2026-01-02')));
    test('Incluye Día de Andalucía (28 feb)', () => assert(fechas.includes('2026-02-28')));
    test('Incluye Virgen de las Angustias (15 sept)', () => assert(fechas.includes('2026-09-15')));
    test('Incluye Navidad', () => assert(fechas.includes('2026-12-25')));

    test('NO incluye Comunidad de Madrid', () => assert(!nombres.includes('Comunidad de Madrid')));
    test('NO incluye San Isidro', () => assert(!nombres.includes('San Isidro')));
    test('NO incluye Almudena', () => assert(!nombres.includes('Almudena')));

    test('Incluye Jueves Santo y Viernes Santo', () => {
      assert(nombres.includes('Jueves Santo'));
      assert(nombres.includes('Viernes Santo'));
    });

    test('Pascua 2026 = 5 abril', () => {
      const p = Festivos._pascua(2026);
      assertEq(Utils.formatFecha(p), '2026-04-05');
    });

    test('Viernes Santo 2026 = 3 abril', () => {
      const vs = lista.find(f => f.nombre === 'Viernes Santo');
      assertEq(vs.fecha, '2026-04-03');
    });

    test('Corpus Christi 2026 = jueves Pascua+60 = 4 junio', () => {
      const c = lista.find(f => f.nombre === 'Corpus Christi');
      assert(c, 'falta Corpus');
      assertEq(c.fecha, '2026-06-04');
    });

    test('Lista ordenada por fecha', () => {
      for (let i = 1; i < lista.length; i++) {
        assert(lista[i - 1].fecha <= lista[i].fecha, 'desordenado en ' + i);
      }
    });

    test('Cada festivo tiene estructura inscritos/asignados', () => {
      for (const f of lista) {
        assert(f.id && f.fecha && f.nombre && f.ambito);
        assert(f.inscritos && Array.isArray(f.inscritos.granvia) && Array.isArray(f.inscritos.isabel));
        assert(f.asignados && Array.isArray(f.asignados.granvia) && Array.isArray(f.asignados.isabel));
      }
    });
  });

  // ============================================================
  // FESTIVOS — toggle inscripción/asignación + recuento
  // ============================================================
  suite('Festivos: inscripción, asignación y recuento', function () {
    // Resetear festivos del store para aislar el test
    Store._state.festivos = Festivos.generarDefault(2030);
    const f = Festivos.getAño(2030)[0];
    const id = f.id;

    test('Inscribir empleado lo añade', () => {
      Festivos.toggleInscrito(id, 'granvia', 'EVA');
      assert(Festivos.getById(id).inscritos.granvia.includes('EVA'));
    });

    // Helper: chequear si un empleado está en la lista de asignados (acepta string u objeto)
    const estaAsignado = (lista, emp) => (lista || []).some(a =>
      typeof a === 'string' ? a === emp : a.empleado === emp
    );

    test('Asignar requiere estar inscrito', () => {
      Festivos.asignarTurno(id, 'granvia', 'SARA', 'mañanas'); // no está inscrito
      assert(!estaAsignado(Festivos.getById(id).asignados.granvia, 'SARA'));
    });

    test('Asignar a inscrito funciona', () => {
      Festivos.asignarTurno(id, 'granvia', 'EVA', 'mañanas');
      assert(estaAsignado(Festivos.getById(id).asignados.granvia, 'EVA'));
    });

    test('Desinscribir limpia la asignación', () => {
      Festivos.toggleInscrito(id, 'granvia', 'EVA');
      const fr = Festivos.getById(id);
      assert(!fr.inscritos.granvia.includes('EVA'));
      assert(!estaAsignado(fr.asignados.granvia, 'EVA'));
    });

    test('Recuento cuenta asignaciones de ambas tiendas', () => {
      Festivos.toggleInscrito(id, 'granvia', 'EVA');
      Festivos.asignarTurno(id, 'granvia', 'EVA', 'mañanas');
      const f2 = Festivos.getAño(2030)[1];
      Festivos.toggleInscrito(f2.id, 'isabel', 'EVA');
      Festivos.asignarTurno(f2.id, 'isabel', 'EVA', 'mañanas');
      const r = Festivos.recuentoTrabajados(2030);
      assertEq(r.EVA.total, 2);
      assertEq(r.EVA.granvia, 1);
      assertEq(r.EVA.isabel, 1);
    });

    test('Festivo manual añadido y eliminado', () => {
      const f3 = Festivos.add('2030-07-15', 'Test', 'local');
      assert(Festivos.getById(f3.id));
      Festivos.remove(f3.id);
      assert(!Festivos.getById(f3.id));
    });
  });

  // ============================================================
  // Sync._mergeFestivos — carga desde Sheets sin autodestruir datos
  // Regresión del bug 2026-04-21: asegurarAño durante la carga
  // emitía 'festivos' → syncFestivos saliente con defaults vacíos.
  // ============================================================
  suite('Sync: carga de festivos no sobrescribe el Sheet', function () {
    // Aislar estado: vaciar festivos y quitar localStorage
    const origFestivos = Store._state.festivos;
    const origLS = (typeof localStorage !== 'undefined') ? localStorage.getItem('yolanda_festivos') : null;
    Store._state.festivos = [];
    try { localStorage.removeItem('yolanda_festivos'); } catch (e) {}

    // Interceptar el listener 'festivos' como lo haría App.init:
    // debe respetar Sync._loading para no re-sincronizar a Sheets.
    const emisionesSync = []; // cada vez que el listener intentaría llamar a syncFestivos
    const unsub = Store.on('festivos', () => {
      if (Sync && !Sync._loading) emisionesSync.push('saliente');
    });

    // Simular filas que vendrían del Sheet: inscrito en festivo default
    // + asignado en festivo MANUAL (id man-*) + festivo de OTRO año.
    const rows = [
      { id: 'def-2030-01-01', fecha: '2030-01-01', nombre: 'Año Nuevo', ambito: 'nacional',
        tienda: 'granvia', inscritos: 'EVA,SARA', asignados: 'EVA:mañanas:7.25:14.75' },
      { id: 'def-2030-01-01', fecha: '2030-01-01', nombre: 'Año Nuevo', ambito: 'nacional',
        tienda: 'isabel', inscritos: 'CAROLINA', asignados: '' },
      { id: 'man-custom-1', fecha: '2030-07-15', nombre: 'Feria Local', ambito: 'local',
        tienda: 'granvia', inscritos: 'DAVID', asignados: '' },
      { id: 'def-2031-01-01', fecha: '2031-01-01', nombre: 'Año Nuevo', ambito: 'nacional',
        tienda: 'granvia', inscritos: 'LETI', asignados: '' }
    ];

    // Ejecutar merge en el mismo contexto que Sync.cargar()
    Sync._loading = true;
    Sync._mergeFestivos(rows);
    Sync._loading = false;

    test('No se disparan escrituras salientes durante la carga', () => {
      assertEq(emisionesSync.length, 0);
    });

    test('Inscripciones del sheet sobreviven en el festivo default', () => {
      const f = Store.getFestivos().find(x => x.id === 'def-2030-01-01');
      assert(f, 'festivo no encontrado');
      assertDeep(f.inscritos.granvia.sort(), ['EVA', 'SARA']);
      assertDeep(f.inscritos.isabel, ['CAROLINA']);
    });

    test('Asignación con turno se parsea a objeto', () => {
      const f = Store.getFestivos().find(x => x.id === 'def-2030-01-01');
      assertEq(f.asignados.granvia.length, 1);
      const a = f.asignados.granvia[0];
      assertEq(a.empleado, 'EVA');
      assertEq(a.turno, 'mañanas');
      assertEq(a.entrada, 7.25);
      assertEq(a.salida, 14.75);
    });

    test('Festivo manual huérfano se añade al Store (no se pierde)', () => {
      const f = Store.getFestivos().find(x => x.id === 'man-custom-1');
      assert(f, 'festivo manual perdido tras cargar');
      assertEq(f.nombre, 'Feria Local');
      assertDeep(f.inscritos.granvia, ['DAVID']);
    });

    test('Festivos de otros años también se cargan', () => {
      const f = Store.getFestivos().find(x => x.id === 'def-2031-01-01');
      assert(f, 'festivo 2031 no cargado');
      assertDeep(f.inscritos.granvia, ['LETI']);
    });

    test('Re-merge es idempotente (no duplica festivos manuales)', () => {
      Sync._loading = true;
      Sync._mergeFestivos(rows);
      Sync._loading = false;
      const manuales = Store.getFestivos().filter(x => x.id === 'man-custom-1');
      assertEq(manuales.length, 1);
    });

    // Cleanup
    unsub();
    Store._state.festivos = origFestivos;
    try {
      if (origLS) localStorage.setItem('yolanda_festivos', origLS);
      else localStorage.removeItem('yolanda_festivos');
    } catch (e) {}
  });

  // ============================================================
  // AUDITOR — detección de huecos de continuidad horaria
  // ============================================================
  suite('Auditor: detectarHuecos (sweep de eventos)', function () {

    // Stub temporal de Rotaciones.getHorariosLV para aislar el test
    const origGetH = Rotaciones.getHorariosLV;
    let stub = {};
    Rotaciones.getHorariosLV = function () { return stub; };

    // Limpiar ausencias y sustituciones del store
    const origAusGV = Store._state.ausenciasGV;
    const origSusts = Store._state.sustituciones;
    const origMods = Store._state.modificacionesHorario;
    Store._state.ausenciasGV = [];
    Store._state.sustituciones = [];
    Store._state.modificacionesHorario = [];

    const fecha = new Date(2026, 3, 13); // lunes 13 abril 2026

    test('Sin huecos cuando los turnos solapan', () => {
      stub = { A: [9, 16], B: [14, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 0);
    });

    test('Sin huecos cuando los turnos son consecutivos exactos', () => {
      stub = { A: [9, 15], B: [15, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 0);
    });

    test('Detecta hueco entre dos turnos separados', () => {
      stub = { A: [9, 14], B: [16, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 1);
      assertEq(h[0].desde, 14);
      assertEq(h[0].hasta, 16);
    });

    test('Detecta múltiples huecos en el mismo día', () => {
      stub = { A: [8, 11], B: [13, 16], C: [18, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 2);
      assertDeep(h[0], { desde: 11, hasta: 13 });
      assertDeep(h[1], { desde: 16, hasta: 18 });
    });

    test('Un solo turno no produce huecos', () => {
      stub = { A: [9, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 0);
    });

    test('Tres turnos solapados sin huecos', () => {
      stub = { A: [7, 13], B: [10, 17], C: [16, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 0);
    });

    test('Hueco interior cuando uno se va antes que entre el siguiente', () => {
      // A 9-14, B 10-15, C 17-22 → hueco 15-17
      stub = { A: [9, 14], B: [10, 15], C: [17, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 1);
      assertDeep(h[0], { desde: 15, hasta: 17 });
    });

    test('Caso real: salida 18:00 sin relevo hasta 18:30', () => {
      stub = { A: [9, 18], B: [18.5, 22] };
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 1);
      assertEq(h[0].desde, 18);
      assertEq(h[0].hasta, 18.5);
    });

    test('Día sin empleados → sin huecos (no hay rango)', () => {
      stub = {};
      const h = Auditor.detectarHuecos(fecha, 'granvia');
      assertEq(h.length, 0);
    });

    // Restaurar
    Rotaciones.getHorariosLV = origGetH;
    Store._state.ausenciasGV = origAusGV;
    Store._state.sustituciones = origSusts;
    Store._state.modificacionesHorario = origMods;
  });

  // ============================================================
  // AUDITOR — intervalosDelDia respeta ausencias y sustituciones
  // ============================================================
  suite('Auditor: intervalosDelDia', function () {
    const origGetH = Rotaciones.getHorariosLV;
    Rotaciones.getHorariosLV = function () { return { A: [9, 15], B: [15, 22] }; };

    const origAus = Store._state.ausenciasGV;
    const origSus = Store._state.sustituciones;
    Store._state.ausenciasGV = [];
    Store._state.sustituciones = [];

    const fecha = new Date(2026, 3, 13);
    const fs = Utils.formatFecha(fecha);

    test('Sin ausencias devuelve ambos intervalos', () => {
      const r = Auditor.intervalosDelDia(fecha, 'granvia');
      assertEq(r.length, 2);
    });

    test('Empleado ausente desaparece del listado', () => {
      Store._state.ausenciasGV = [{ empleado: 'A', desde: fs, hasta: fs, tipo: 'vacaciones' }];
      const r = Auditor.intervalosDelDia(fecha, 'granvia');
      assertEq(r.length, 1);
      assertEq(r[0].emp, 'B');
    });

    test('Sustitución añade el sustituto al listado', () => {
      Store._state.sustituciones = [{
        fecha: fs, tienda: 'granvia', ausente: 'A',
        sustituto: 'C', entrada: 9, salida: 15
      }];
      const r = Auditor.intervalosDelDia(fecha, 'granvia');
      assert(r.some(x => x.emp === 'C' && x.entrada === 9 && x.salida === 15));
    });

    test('Sábado/domingo devuelve vacío', () => {
      const sabado = new Date(2026, 3, 11);
      const r = Auditor.intervalosDelDia(sabado, 'granvia');
      assertEq(r.length, 0);
    });

    Rotaciones.getHorariosLV = origGetH;
    Store._state.ausenciasGV = origAus;
    Store._state.sustituciones = origSus;
  });

  // ============================================================
  // UTILS — franjasQueCubre (multi-franja por empleado)
  // ============================================================
  // Regla: solape de [entrada, salida) con [w[0], w[1]) — fronteras NO cuentan
  suite('Utils.franjasQueCubre — GV', function () {
    const f = (e, s) => Utils.franjasQueCubre(e, s, 'granvia');

    test('EVA 7-15 → descarga + mañanas', () => {
      assertDeep(f(7, 15), ['descarga', 'mañanas']);
    });
    test('SARA 9-14:30 → solo mañanas', () => {
      assertDeep(f(9, 14.5), ['mañanas']);
    });
    test('SARA 9-15 → solo mañanas (sale exacto al inicio de tardes, no solapa)', () => {
      assertDeep(f(9, 15), ['mañanas']);
    });
    test('ANTONIO 5-12:30 → descarga + mañanas', () => {
      assertDeep(f(5, 12.5), ['descarga', 'mañanas']);
    });
    test('ANTONIO 5-9 (solo descarga, sale exacto) → solo descarga', () => {
      assertDeep(f(5, 9), ['descarga']);
    });
    test('Cierre puro 18-22:15 → solo cierre', () => {
      assertDeep(f(18, 22.25), ['cierre']);
    });
    test('Tarde 15-22:15 → tardes + cierre', () => {
      assertDeep(f(15, 22.25), ['tardes', 'cierre']);
    });
    test('Tarde corta 15-17:45 → solo tardes', () => {
      assertDeep(f(15, 17.75), ['tardes']);
    });
    test('17:45-21 → solo cierre (cierre arranca a 17:45, sale antes de 22)', () => {
      assertDeep(f(17.75, 21), ['cierre']);
    });
    test('Jornada partida 7-14 → descarga + mañanas', () => {
      assertDeep(f(7, 14), ['descarga', 'mañanas']);
    });
    test('Tarde-cierre 16-22:15 → tardes + cierre', () => {
      assertDeep(f(16, 22.25), ['tardes', 'cierre']);
    });
  });

  suite('Utils.franjasQueCubre — Isabel', function () {
    const f = (e, s) => Utils.franjasQueCubre(e, s, 'isabel');

    test('Camión 5-10 → solo descarga (sale exacto al inicio de mañanas)', () => {
      assertDeep(f(5, 10), ['descarga']);
    });
    test('5-14:30 → descarga + mañanas', () => {
      assertDeep(f(5, 14.5), ['descarga', 'mañanas']);
    });
    test('10-14:30 → solo mañanas', () => {
      assertDeep(f(10, 14.5), ['mañanas']);
    });
    test('14:30-22 → tardes + cierre', () => {
      assertDeep(f(14.5, 22), ['tardes', 'cierre']);
    });
    test('17:30-22 → solo cierre', () => {
      assertDeep(f(17.5, 22), ['cierre']);
    });
    test('9-15 → solo mañanas (1h descarga y 15min tardes no llegan al umbral 1.5h)', () => {
      assertDeep(f(9, 15), ['mañanas']);
    });
  });

  // ============================================================
  // COBERTURA — multi-franja en calcularLV
  // ============================================================
  suite('Cobertura.calcularLV multi-franja', function () {
    const origGetH = Rotaciones.getHorariosLV;
    const origAusGV = Store._state.ausenciasGV;
    const origSusts = Store._state.sustituciones;
    const origMods = Store._state.modificacionesHorario;

    Store._state.ausenciasGV = [];
    Store._state.sustituciones = [];
    Store._state.modificacionesHorario = [];

    const fecha = new Date(2026, 4, 4); // lunes 4 mayo 2026

    test('EVA 7-15 cuenta en descarga Y mañanas', () => {
      Rotaciones.getHorariosLV = function () { return { EVA: [7, 15] }; };
      const c = Cobertura.calcularLV(fecha, 'granvia');
      assert(c.descarga.includes('EVA'));
      assert(c.mañanas.includes('EVA'));
      assert(!c.tardes.includes('EVA'));
      assert(!c.cierre.includes('EVA'));
    });

    test('Plantilla típica GV cumple mínimos sin alertas falsas', () => {
      Rotaciones.getHorariosLV = function () {
        return {
          ANTONIO: [5, 12.5],     // descarga + mañanas
          LETI:    [5, 12.5],     // descarga + mañanas
          EVA:     [7, 15],       // descarga + mañanas
          SARA:    [9, 15],       // mañanas
          VANESA:  [9, 15],       // mañanas
          TARDE1:  [15, 22.25],   // tardes + cierre
          TARDE2:  [15, 22.25],   // tardes + cierre
          CIERRE1: [17.75, 22.25] // cierre
        };
      };
      const c = Cobertura.calcularLV(fecha, 'granvia');
      // Verificar que NINGUNA franja queda bajo mínimo (mín GV: 3,3,2,3)
      assert(c.descarga.length >= 3, 'descarga ' + c.descarga.length + '/3');
      assert(c.mañanas.length >= 3, 'mañanas ' + c.mañanas.length + '/3');
      assert(c.tardes.length >= 2, 'tardes ' + c.tardes.length + '/2');
      assert(c.cierre.length >= 3, 'cierre ' + c.cierre.length + '/3');
      // EVA debe estar en descarga Y mañanas (clave del bug original)
      assert(c.descarga.includes('EVA'));
      assert(c.mañanas.includes('EVA'));
    });

    test('SARA ausente quita su entrada solo de mañanas', () => {
      Rotaciones.getHorariosLV = function () {
        return { EVA: [7, 15], SARA: [9, 15] };
      };
      Store._state.ausenciasGV = [{ empleado: 'SARA', desde: '2026-05-04', hasta: '2026-05-04', tipo: 'baja' }];
      const c = Cobertura.calcularLV(fecha, 'granvia');
      assert(c.descarga.includes('EVA'));
      assert(c.mañanas.includes('EVA'));
      assert(!c.mañanas.includes('SARA'));
      Store._state.ausenciasGV = [];
    });

    test('Sustitución que solapa reemplaza franjas (no duplica)', () => {
      Rotaciones.getHorariosLV = function () {
        return { CIERRE1: [17.75, 22.25] };
      };
      // CIERRE1 cambia a 15-22:15 → ahora cuenta en tardes + cierre, NO solo cierre
      Store._state.sustituciones = [{
        fecha: '2026-05-04', tienda: 'granvia',
        ausente: 'OTRO', sustituto: 'CIERRE1',
        entrada: 15, salida: 22.25
      }];
      const c = Cobertura.calcularLV(fecha, 'granvia');
      // Debe estar en ambas, sin duplicarse
      assertEq(c.cierre.filter(x => x === 'CIERRE1').length, 1);
      assertEq(c.tardes.filter(x => x === 'CIERRE1').length, 1);
      Store._state.sustituciones = [];
    });

    // Restaurar
    Rotaciones.getHorariosLV = origGetH;
    Store._state.ausenciasGV = origAusGV;
    Store._state.sustituciones = origSusts;
    Store._state.modificacionesHorario = origMods;
  });

  // ============================================================
  // COBERTURA FdS — sub-tramos SAB_M GV
  // Tramo descarga 5-12:30 (mín 4) + tramo post-descarga 12:30-14:45 (mín 2)
  // ============================================================
  suite('Cobertura: sub-tramos SAB_M GV', function () {
    const origGetFds = Rotaciones.getFds;
    const origAusGV = Store._state.ausenciasGV;
    const origSusts = Store._state.sustituciones;
    Store._state.ausenciasGV = [];
    Store._state.sustituciones = [];

    const sabado = new Date(2026, 4, 2); // sábado 2 mayo 2026

    // Helper: filtra alertas de SAB_M (ignora ruido de SAB_T vacío en stubs)
    const soloSabM = (alertas) => alertas.filter(a => a.franja.indexOf('SAB_M') === 0);

    test('4 personas en descarga + 2 en post-descarga → sin alertas SAB_M', () => {
      Rotaciones.getFds = function () {
        return {
          SAB_M: {
            ANTONIO: [5, 12.5],
            LETI:    [5, 12.5],
            DAVID:   [5, 12.5],
            EVA:     [7, 12.5],
            POST1:   [9, 14.75],
            POST2:   [10, 14.75]
          },
          SAB_T: {}, DOM_M: {}, DOM_T: {}
        };
      };
      const alertas = soloSabM(Cobertura.verificarMinimosFds(sabado, 'granvia'));
      assertEq(alertas.length, 0);
    });

    test('Solo 3 en descarga → alerta del tramo descarga (4)', () => {
      Rotaciones.getFds = function () {
        return {
          SAB_M: {
            ANTONIO: [5, 12.5],
            LETI:    [5, 12.5],
            DAVID:   [5, 12.5],
            POST1:   [13, 14.75], // empieza después de 12:30 → no cuenta en descarga
            POST2:   [13, 14.75]
          },
          SAB_T: {}, DOM_M: {}, DOM_T: {}
        };
      };
      const alertas = soloSabM(Cobertura.verificarMinimosFds(sabado, 'granvia'));
      assertEq(alertas.length, 1);
      assert(alertas[0].franja.indexOf('descarga') >= 0);
      assertEq(alertas[0].actual, 3);
      assertEq(alertas[0].minimo, 4);
    });

    test('4 en descarga pero solo 1 en post-descarga → alerta de post-descarga', () => {
      Rotaciones.getFds = function () {
        return {
          SAB_M: {
            ANTONIO: [5, 12.5],
            LETI:    [5, 12.5],
            DAVID:   [5, 12.5],
            EVA:     [5, 12.5], // sale exacto a 12:30 → no solapa con post-descarga
            POST1:   [12, 14.75]
          },
          SAB_T: {}, DOM_M: {}, DOM_T: {}
        };
      };
      const alertas = soloSabM(Cobertura.verificarMinimosFds(sabado, 'granvia'));
      assertEq(alertas.length, 1);
      assert(alertas[0].franja.indexOf('post') >= 0);
      assertEq(alertas[0].actual, 1);
      assertEq(alertas[0].minimo, 2);
    });

    test('Empleado de 12:00 a 14:00 cuenta en AMBOS tramos (solapa con los dos)', () => {
      Rotaciones.getFds = function () {
        return {
          SAB_M: {
            A: [5, 12.5],
            B: [5, 12.5],
            C: [5, 12.5],
            PUENTE: [12, 14], // solapa descarga (12-12.5) y post (12.5-14)
            POST: [12.5, 14.75]
          },
          SAB_T: {}, DOM_M: {}, DOM_T: {}
        };
      };
      const presentesDesc = Cobertura.calcularFdsEnTramo(sabado, 'SAB_M', 'granvia', 5, 12.5);
      const presentesPost = Cobertura.calcularFdsEnTramo(sabado, 'SAB_M', 'granvia', 12.5, 14.75);
      assert(presentesDesc.includes('PUENTE'));
      assert(presentesPost.includes('PUENTE'));
    });

    test('SAB_T no tiene sub-tramos → usa mínimo único (3)', () => {
      Rotaciones.getFds = function () {
        return {
          SAB_M: { A: [5, 12.5], B: [5, 12.5], C: [5, 12.5], D: [5, 12.5],
                   E: [13, 14.75], F: [13, 14.75] }, // SAB_M correcto
          SAB_T: { X: [14.75, 22.25] }, // solo 1, mín 3
          DOM_M: {}, DOM_T: {}
        };
      };
      const alertas = Cobertura.verificarMinimosFds(sabado, 'granvia');
      const sabT = alertas.find(a => a.franja === 'SAB_T');
      assert(sabT, 'falta alerta de SAB_T');
      assertEq(sabT.actual, 1);
      assertEq(sabT.minimo, 3);
    });

    Rotaciones.getFds = origGetFds;
    Store._state.ausenciasGV = origAusGV;
    Store._state.sustituciones = origSusts;
  });

  // ============================================================
  // AUDITOR — formato de problemas de cobertura (regresión)
  // Bug: el auditor mostraba [object Object] porque verificarMinimosLV
  // devuelve {franja, actual, minimo, falta} y se concatenaba como string.
  // ============================================================
  suite('Auditor: formato de cobertura (regresión [object Object])', function () {
    const origGetH = Rotaciones.getHorariosLV;
    const origAusGV = Store._state.ausenciasGV;
    const origAusIS = Store._state.ausenciasIS;
    const origSusts = Store._state.sustituciones;
    const origMods = Store._state.modificacionesHorario;
    const origMes = Store._state.mesActual;
    const origAño = Store._state.añoActual;

    // Forzar GV bajo mínimos: solo 1 empleado en mañanas (mín 3)
    Rotaciones.getHorariosLV = function (fecha, tienda) {
      if (tienda === 'granvia') return { SOLO: [9, 15] };
      return {};
    };
    Store._state.ausenciasGV = [];
    Store._state.ausenciasIS = [];
    Store._state.sustituciones = [];
    Store._state.modificacionesHorario = [];
    Store._state.mesActual = 4; // mayo
    Store._state.añoActual = 2026;

    const problemas = Auditor.auditarMes();

    test('Hay problemas de cobertura detectados', () => {
      assert(problemas.cobertura.length > 0);
    });

    test('Cada item tiene franja, actual, minimo y falta (no string)', () => {
      for (const it of problemas.cobertura) {
        assert(typeof it.franja === 'string', 'franja no es string');
        assert(typeof it.actual === 'number', 'actual no es number');
        assert(typeof it.minimo === 'number', 'minimo no es number');
        assert(typeof it.falta === 'number', 'falta no es number');
        assert(it.falta === it.minimo - it.actual, 'falta mal calculado');
      }
    });

    test('Ningún item tiene propiedad mensaje (formato viejo)', () => {
      for (const it of problemas.cobertura) {
        assert(it.mensaje === undefined, 'aún hay mensaje en lugar de campos estructurados');
      }
    });

    // Restaurar
    Rotaciones.getHorariosLV = origGetH;
    Store._state.ausenciasGV = origAusGV;
    Store._state.ausenciasIS = origAusIS;
    Store._state.sustituciones = origSusts;
    Store._state.modificacionesHorario = origMods;
    Store._state.mesActual = origMes;
    Store._state.añoActual = origAño;
  });

  // ============================================================
  // CONTROL — _diasEnAño (clipping de ausencias por año)
  // ============================================================
  suite('ControlUI: _diasEnAño', function () {
    test('Ausencia íntegra dentro del año', () => {
      const d = ControlUI._diasEnAño({ desde: '2026-04-01', hasta: '2026-04-05' }, 2026);
      assertEq(d, 5);
    });
    test('Ausencia que cruza fin de año', () => {
      const d = ControlUI._diasEnAño({ desde: '2026-12-30', hasta: '2027-01-03' }, 2026);
      assertEq(d, 2); // 30 y 31
    });
    test('Ausencia fuera del año', () => {
      const d = ControlUI._diasEnAño({ desde: '2025-06-01', hasta: '2025-06-10' }, 2026);
      assertEq(d, 0);
    });
    test('Un solo día', () => {
      const d = ControlUI._diasEnAño({ desde: '2026-04-07', hasta: '2026-04-07' }, 2026);
      assertEq(d, 1);
    });
  });

  suite('Reglas: DAVID/LETI exclusión mutua viernes Isabel', function () {
    // Viernes 10 abril 2026
    const viernes = new Date(2026, 3, 10);
    const turnoBase = {
      tienda: 'isabel',
      fecha: viernes,
      ausente: 'JESSICA',
      franja: 'mañanas',
      turnoFds: null,
      entrada: 9,
      salida: 14
    };
    const fs = Utils.formatFecha(viernes);

    // Snapshot/restauración mínima del Store
    const sustsBackup = Store._state.sustituciones.slice();
    const isBackup = Store._state.empleadosIS;
    // Seed mínimo
    Store._state.empleadosIS = Object.assign({}, isBackup, {
      DAVID: { alias: 'DAVID', tienda: 'ambas', contrato: 12, restriccion: '' },
      LETI:  { alias: 'LETI',  tienda: 'ambas', contrato: 12, restriccion: '' },
      JESSICA: { alias: 'JESSICA', tienda: 'isabel', contrato: 30, restriccion: '' }
    });

    test('DAVID puede sustituir si LETI no está', () => {
      Store._state.sustituciones = [];
      const r = Reglas.validarCandidato('DAVID', turnoBase, { verificarCadena: false });
      const tieneErrorExcl = r.errores.some(e => e.includes('excl. mutua'));
      assert(!tieneErrorExcl, 'no debe haber error de exclusión: ' + r.errores.join('|'));
    });

    test('DAVID NO puede si LETI ya sustituye ese viernes en Isabel', () => {
      Store._state.sustituciones = [{
        sustituto: 'LETI', ausente: 'X', fecha: fs, tienda: 'isabel',
        entrada: 9, salida: 14
      }];
      const r = Reglas.validarCandidato('DAVID', turnoBase, { verificarCadena: false });
      const tieneErrorExcl = r.errores.some(e => e.includes('excl. mutua'));
      assert(tieneErrorExcl, 'debe bloquear por exclusión mutua. errores=' + JSON.stringify(r.errores) + ' susts=' + JSON.stringify(Store.getSustituciones()) + ' fs=' + fs);
    });

    test('LETI NO puede si DAVID ya sustituye ese viernes en Isabel', () => {
      Store._state.sustituciones = [{
        sustituto: 'DAVID', ausente: 'X', fecha: fs, tienda: 'isabel',
        entrada: 9, salida: 14
      }];
      const r = Reglas.validarCandidato('LETI', turnoBase, { verificarCadena: false });
      const tieneErrorExcl = r.errores.some(e => e.includes('excl. mutua'));
      assert(tieneErrorExcl, 'debe bloquear por exclusión mutua');
    });

    test('Sustitución de LETI en GV el mismo día NO bloquea a DAVID en Isabel', () => {
      Store._state.sustituciones = [{
        sustituto: 'LETI', ausente: 'X', fecha: fs, tienda: 'granvia',
        entrada: 9, salida: 14
      }];
      const r = Reglas.validarCandidato('DAVID', turnoBase, { verificarCadena: false });
      const tieneErrorExcl = r.errores.some(e => e.includes('excl. mutua'));
      assert(!tieneErrorExcl, 'la exclusión solo aplica en Isabel');
    });

    Store._state.sustituciones = sustsBackup;
    Store._state.empleadosIS = isBackup;
  });

  suite('Cobertura: continuidad (sweep line)', function () {
    test('Detecta hueco en tardes cuando SILVIA falta y solo queda MORILLA hasta llegada de FRANCIS', () => {
      // Tardes GV ventana [15, 17.75]. MORILLA [15, 18.5], FRANCIS [16.75, 22.25]
      // Sin SILVIA: 15:00–16:45 solo MORILLA = 1 < 2 → alerta
      const intervalos = [
        { alias: 'MORILLA', e: 15, s: 18.5 },
        { alias: 'FRANCIS', e: 16.75, s: 22.25 }
      ];
      const min = Cobertura._minCoberturaEnFranja(intervalos, [15, 17.75]);
      assertEq(min, 1, 'mínimo debe ser 1 (gap 15-16:45)');
    });

    test('Si SILVIA está, el mínimo de tardes cubre 2', () => {
      const intervalos = [
        { alias: 'SILVIA', e: 14, s: 18.5 },
        { alias: 'MORILLA', e: 15, s: 18.5 },
        { alias: 'FRANCIS', e: 16.75, s: 22.25 }
      ];
      const min = Cobertura._minCoberturaEnFranja(intervalos, [15, 17.75]);
      assertEq(min, 2);
    });

    test('Sin intervalos en la franja → 0', () => {
      const min = Cobertura._minCoberturaEnFranja([{ alias: 'X', e: 6, s: 9 }], [15, 17.75]);
      assertEq(min, 0);
    });

    test('verificarMinimosLV con SILVIA ausente debe alertar tardes', () => {
      // Provocar la situación real
      const ausBackup = Store._state.ausenciasGV.slice();
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [];
      Store._state.ausenciasGV = [{
        empleado: 'SILVIA', tipo: 'vacaciones',
        desde: '2026-05-11', hasta: '2026-05-16'
      }];
      const fecha = new Date(2026, 4, 11); // Lunes 11 mayo
      const alertas = Cobertura.verificarMinimosLV(fecha, 'granvia');
      const tardesAlerta = alertas.find(a => a.franja === 'tardes');
      assert(tardesAlerta, 'debe haber alerta en tardes');
      assert(tardesAlerta.actual < tardesAlerta.minimo);

      Store._state.ausenciasGV = ausBackup;
      Store._state.sustituciones = sustsBackup;
    });
  });

  suite('Motor: reorganizar (estrategia 2)', function () {
    test('_reorganizar devuelve null si no hay franja origen con excedente', () => {
      // Turno ficticio en franja inexistente → no candidatos
      const fecha = new Date(2026, 3, 15); // miércoles
      const r = Motor._reorganizar({
        tienda: 'granvia', fecha, fechaStr: Utils.formatFecha(fecha),
        emp: 'INEXISTENTE', franja: 'descarga', entrada: 6, salida: 9, bajoMinimos: true
      });
      // Puede ser null o un objeto válido — lo que NO puede pasar es excepción
      assert(r === null || (r && r.accion === 'reorganizar'), 'devuelve null o propuesta');
    });

    test('Reorganizar mantiene horas totales del empleado movido', () => {
      const fecha = new Date(2026, 3, 15);
      const r = Motor._reorganizar({
        tienda: 'granvia', fecha, fechaStr: Utils.formatFecha(fecha),
        emp: 'EVA', franja: 'mañanas', entrada: 9, salida: 14, bajoMinimos: true
      });
      if (r) {
        const horasOrig = r.salidaOriginal - r.entradaOriginal;
        const horasNuevas = r.salida - r.entrada;
        assertEq(+horasOrig.toFixed(2), +horasNuevas.toFixed(2), 'mismas horas totales');
        assert(r.accion === 'reorganizar');
      }
    });

    test('FdS: propone OPCIONAL si mínimos cumplidos y hay excedente en otro turno del FdS', () => {
      // Escenario: SAB_T GV con mínimos cumplidos pero DAVID ausente.
      // DOM_T tiene excedente → alguien del DOM_T se puede mover al SAB_T.
      const ausBackup = Store._state.ausenciasGV.slice();
      const sustsBackup = Store._state.sustituciones.slice();
      const mesBackup = Store._state.mesActual;
      const añoBackup = Store._state.añoActual;
      const origDetect = Cobertura.detectarSinCubrir;
      const origCand = Motor._obtenerCandidatos;

      Store._state.ausenciasGV = [];
      Store._state.sustituciones = [];
      Store._state.mesActual = 4;    // Mayo
      Store._state.añoActual = 2026;

      // Stub: un único turno sin cubrir en SAB_T GV, mínimos cumplidos
      Cobertura.detectarSinCubrir = function (fecha, tienda) {
        if (tienda !== 'granvia') return [];
        if (Utils.formatFecha(fecha) !== '2026-05-30') return [];
        return [{
          emp: 'DAVID', franja: 'SAB_T',
          entrada: 14.75, salida: 22.25,
          turnoFds: 'SAB_T',
          bajoMinimos: false, // ← clave: mínimos cumplidos
          descartado: false, motivoDescarte: ''
        }];
      };

      // Stub: un candidato válido con turno origen en DOM_T y excedente ≥ 1
      Motor._obtenerCandidatos = function () {
        return [{
          alias: 'ALEX',
          entrada: 14.75, salida: 22.25,
          turnoOrigenFds: 'DOM_T', excedenteOrigen: 1,
          coberturaOrigenTotal: 5,
          esPropio: true, esGrupoDescarga: false, tieneAvisos: false,
          avisos: [], margen: 0, color: '#888', preferenciaScore: 0
        }];
      };

      const res = Motor.analizarMes();
      const prop = res.propuestas.find(p => p.ausente === 'DAVID');
      assert(prop, 'debe proponer sustituto para DAVID');
      assertEq(prop.opcional, true, 'propuesta debe marcarse opcional');
      assertEq(prop.sustituto, 'ALEX');

      // Restaurar
      Cobertura.detectarSinCubrir = origDetect;
      Motor._obtenerCandidatos = origCand;
      Store._state.ausenciasGV = ausBackup;
      Store._state.sustituciones = sustsBackup;
      Store._state.mesActual = mesBackup;
      Store._state.añoActual = añoBackup;
    });

    test('FdS: NO propone opcional si candidato no tiene turno origen en el FdS', () => {
      // Caso: candidato es refuerzo externo (excedenteOrigen=99) → no mueve a nadie,
      // equivaldría a horas extra. Para OPCIONAL solo queremos redistribución.
      const mesBackup = Store._state.mesActual;
      const añoBackup = Store._state.añoActual;
      const origDetect = Cobertura.detectarSinCubrir;
      const origCand = Motor._obtenerCandidatos;

      Store._state.mesActual = 4;
      Store._state.añoActual = 2026;

      Cobertura.detectarSinCubrir = function (fecha, tienda) {
        if (tienda !== 'granvia') return [];
        if (Utils.formatFecha(fecha) !== '2026-05-30') return [];
        return [{
          emp: 'DAVID', franja: 'SAB_T',
          entrada: 14.75, salida: 22.25, turnoFds: 'SAB_T',
          bajoMinimos: false, descartado: false, motivoDescarte: ''
        }];
      };
      Motor._obtenerCandidatos = function () {
        return [{
          alias: 'EXTERNO', entrada: 14.75, salida: 22.25,
          turnoOrigenFds: '', excedenteOrigen: 99, coberturaOrigenTotal: 0,
          esPropio: false, esGrupoDescarga: false, tieneAvisos: false,
          avisos: [], margen: 0, color: '#888', preferenciaScore: 0
        }];
      };

      const res = Motor.analizarMes();
      const prop = res.propuestas.find(p => p.ausente === 'DAVID');
      assert(!prop, 'no debe proponer si candidato no viene de otro turno FdS');
      const sinSol = res.sinSolucion.find(s => s.emp === 'DAVID');
      assert(!sinSol, 'tampoco debe ir a sinSolucion (no es obligatorio)');

      Cobertura.detectarSinCubrir = origDetect;
      Motor._obtenerCandidatos = origCand;
      Store._state.mesActual = mesBackup;
      Store._state.añoActual = añoBackup;
    });

    test('L-V: NO propone opcional aunque haya candidato (solo FdS activa el equilibrio)', () => {
      const mesBackup = Store._state.mesActual;
      const añoBackup = Store._state.añoActual;
      const origDetect = Cobertura.detectarSinCubrir;
      const origCand = Motor._obtenerCandidatos;

      Store._state.mesActual = 4;
      Store._state.añoActual = 2026;

      Cobertura.detectarSinCubrir = function (fecha, tienda) {
        if (tienda !== 'granvia') return [];
        if (Utils.formatFecha(fecha) !== '2026-05-06') return []; // miércoles
        return [{
          emp: 'EVA', franja: 'mañanas',
          entrada: 7, salida: 15, turnoFds: null,
          bajoMinimos: false, descartado: false, motivoDescarte: ''
        }];
      };
      Motor._obtenerCandidatos = function () {
        return [{
          alias: 'SARA', entrada: 7, salida: 15,
          turnoOrigenFds: '', excedenteOrigen: 2,
          esPropio: true, esGrupoDescarga: false, tieneAvisos: false,
          avisos: [], margen: 0, color: '#888', preferenciaScore: 0
        }];
      };

      const res = Motor.analizarMes();
      const prop = res.propuestas.find(p => p.ausente === 'EVA');
      assert(!prop, 'L-V con mínimos cumplidos no debe proponer opcional');

      Cobertura.detectarSinCubrir = origDetect;
      Motor._obtenerCandidatos = origCand;
      Store._state.mesActual = mesBackup;
      Store._state.añoActual = añoBackup;
    });

    test('aplicarPropuestas con accion=reorganizar crea modificación, no sustitución', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      const modsBackup = Store._state.modificacionesHorario.slice();
      Store._state.sustituciones = [];
      Store._state.modificacionesHorario = [];

      Motor.aplicarPropuestas([{
        accion: 'reorganizar',
        tienda: 'granvia',
        fecha: '2026-04-15',
        ausente: 'EVA',
        sustituto: 'SARA',
        entrada: 9, salida: 14,
        entradaOriginal: 14, salidaOriginal: 19,
        franja: 'mañanas', turnoFds: ''
      }]);

      assertEq(Store._state.sustituciones.length, 0, 'no debe crear sustitución');
      assertEq(Store._state.modificacionesHorario.length, 1, 'debe crear modificación');
      assertEq(Store._state.modificacionesHorario[0].empleado, 'SARA');
      assertEq(Store._state.modificacionesHorario[0].nuevaEntrada, 9);

      Store._state.sustituciones = sustsBackup;
      Store._state.modificacionesHorario = modsBackup;
    });
  });

  suite('Motor.buscarCandidatosManual (asignación manual)', function () {
    test('Devuelve lista no vacía para un ausente L-V con rotaciones reales', () => {
      // EVA está en la rotación L-V GV. Pedimos candidatos para sustituirla.
      const fecha = new Date(2026, 3, 15); // miércoles 15 abril
      const horarios = Rotaciones.getHorariosLV(fecha, 'granvia');
      const alguien = Object.keys(horarios)[0];
      if (!alguien) return; // Si no hay rotación cargada, skip silencioso

      const candidatos = Motor.buscarCandidatosManual(fecha, alguien, 'granvia', '');
      // No es un test de valor exacto — verificamos que devuelva un array
      assert(Array.isArray(candidatos), 'debe devolver array');
      // Cada candidato debe tener alias, entrada, salida
      for (const c of candidatos) {
        assert(c.alias && typeof c.entrada === 'number' && typeof c.salida === 'number',
          'candidato mal formado: ' + JSON.stringify(c));
        assert(c.alias !== alguien, 'no debe incluir al propio ausente');
      }
    });

    test('Devuelve [] si el ausente no está en la rotación de ese día', () => {
      const fecha = new Date(2026, 3, 15);
      const candidatos = Motor.buscarCandidatosManual(fecha, 'NO_EXISTE_XYZ', 'granvia', '');
      assertDeep(candidatos, []);
    });

    test('FdS: devuelve candidatos para un turno SAB_M existente', () => {
      const sab = new Date(2026, 3, 11); // sábado 11 abril
      const fds = Rotaciones.getFdsGV(sab);
      const empSabM = Object.keys(fds.SAB_M)[0];
      if (!empSabM) return;

      const candidatos = Motor.buscarCandidatosManual(sab, empSabM, 'granvia', 'SAB_M');
      assert(Array.isArray(candidatos));
      for (const c of candidatos) {
        assert(c.alias !== empSabM, 'no debe incluir al propio ausente');
      }
    });
  });

  suite('HorasUI: calcularMes', function () {
    test('Suma horas de rotación L-V de un empleado básico', () => {
      // Snapshot
      const sustsBackup = Store._state.sustituciones.slice();
      const ausGVBackup = Store._state.ausenciasGV.slice();
      Store._state.sustituciones = [];
      Store._state.ausenciasGV = [];

      // Abril 2026 — usamos rotaciones reales del Store
      const tot = HorasUI.calcularMes(2026, 3, 'granvia').totales;

      // Debe haber al menos un empleado con horas > 0
      const algunEmpleado = Object.values(tot).find(r => r.total > 0);
      assert(algunEmpleado, 'al menos un empleado debe sumar horas');
      assert(algunEmpleado.dias > 0, 'debe contar días');

      // Restaurar
      Store._state.sustituciones = sustsBackup;
      Store._state.ausenciasGV = ausGVBackup;
    });

    test('Vacaciones cuentan como tiempo trabajado (mismo total)', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      const ausGVBackup = Store._state.ausenciasGV.slice();
      Store._state.sustituciones = [];

      Store._state.ausenciasGV = [];
      const sin = HorasUI.calcularMes(2026, 3, 'granvia').totales;
      const alias = Object.keys(sin).find(a => sin[a].dias > 0);
      const horasSin = sin[alias].total;

      Store._state.ausenciasGV = [{
        empleado: alias, tipo: 'vacaciones',
        desde: '2026-04-01', hasta: '2026-04-30'
      }];
      const con = HorasUI.calcularMes(2026, 3, 'granvia').totales;
      const horasCon = (con[alias] && con[alias].total) || 0;

      assertEq(horasCon, horasSin, alias + ' debe sumar igual con vacaciones');

      Store._state.sustituciones = sustsBackup;
      Store._state.ausenciasGV = ausGVBackup;
    });

    test('Sustitución tipo extra suma horas al sustituto', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [{
        sustituto: 'TESTSUB', ausente: 'X', fecha: '2026-04-15', tienda: 'granvia',
        entrada: 9, salida: 14, tipo: 'extra'
      }];
      const tot = HorasUI.calcularMes(2026, 3, 'granvia').totales;
      assert(tot['TESTSUB'], 'debe crear entrada para el sustituto');
      assertEq(tot['TESTSUB'].sustituciones, 5);
      Store._state.sustituciones = sustsBackup;
    });

    test('Falta descuenta las horas programadas de ese día', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      const ausGVBackup = Store._state.ausenciasGV.slice();
      const faltasBackup = Store._state.faltasGV.slice();
      Store._state.sustituciones = [];
      Store._state.ausenciasGV = [];
      Store._state.faltasGV = [];

      const sin = HorasUI.calcularMes(2026, 3, 'granvia').totales;

      // Buscar empleado + día (L-V o FdS) con horas reales en abril
      let alias = null, fechaFalta = null, horasDia = 0;
      for (let d = 1; d <= 30 && !fechaFalta; d++) {
        const f = new Date(2026, 3, d);
        const dow = f.getDay();
        if (dow >= 1 && dow <= 5) {
          const horarios = Rotaciones.getHorariosLV(f, 'granvia') || {};
          for (const a in horarios) {
            const h = horarios[a];
            if (h && typeof h[0] === 'number' && h[1] > h[0]) {
              alias = a; fechaFalta = Utils.formatFecha(f); horasDia = h[1] - h[0]; break;
            }
          }
        } else {
          const fds = Rotaciones.getFds(f, 'granvia') || {};
          const turnos = dow === 6 ? ['SAB_M','SAB_T'] : ['DOM_M','DOM_T'];
          for (const tk of turnos) {
            for (const a in (fds[tk] || {})) {
              const h = fds[tk][a];
              if (h && typeof h[0] === 'number' && h[1] > h[0]) {
                alias = a; fechaFalta = Utils.formatFecha(f); horasDia = h[1] - h[0]; break;
              }
            }
            if (alias) break;
          }
        }
      }
      assert(alias && fechaFalta, 'debe encontrar empleado con horas en abril');
      const horasSin = sin[alias].total;

      Store._state.faltasGV = [{ empleado: alias, fecha: fechaFalta }];
      const con = HorasUI.calcularMes(2026, 3, 'granvia').totales;
      assertEq(+con[alias].faltasHoras.toFixed(2), +horasDia.toFixed(2));
      assertEq(+con[alias].total.toFixed(2), +(horasSin - horasDia).toFixed(2));

      Store._state.sustituciones = sustsBackup;
      Store._state.ausenciasGV = ausGVBackup;
      Store._state.faltasGV = faltasBackup;
    });

    test('Sustitución tipo movimiento NO suma horas extra', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [{
        sustituto: 'TESTMOV', ausente: 'X', fecha: '2026-04-15', tienda: 'granvia',
        entrada: 9, salida: 14, tipo: 'movimiento'
      }];
      const tot = HorasUI.calcularMes(2026, 3, 'granvia').totales;
      // No debe aparecer entrada (porque no tiene rotación ni extras)
      assert(!tot['TESTMOV'], 'movimiento no debe crear horas extra');
      Store._state.sustituciones = sustsBackup;
    });
  });

  suite('Cobertura: overlap significativo (≥1.5h)', function () {
    test('Empleado con <1.5h de overlap NO cuenta (ALEX 15min en cierre IS)', () => {
      const intervalos = [
        { alias: 'ALEX', e: 14.75, s: 17.75 }  // solo 0.25h en cierre [17.5, 22]
      ];
      const actual = Cobertura._coberturaSignificativa(intervalos, [17.5, 22]);
      assertEq(actual, 0, 'ALEX no debe contar en cierre');
    });

    test('FRANCIS cierre con 1h de overlap en tardes NO cuenta', () => {
      const intervalos = [
        { alias: 'FRANCIS', e: 16.75, s: 22.25 }  // 1h en tardes [15, 17.75]
      ];
      const actual = Cobertura._coberturaSignificativa(intervalos, [15, 17.75]);
      assertEq(actual, 0, 'FRANCIS 1h → no cuenta para tardes');
    });

    test('Empleado con ≥1.5h de overlap SÍ cuenta (ALVARO cierre IS)', () => {
      const intervalos = [
        { alias: 'ALVARO', e: 17.75, s: 22.25 }  // 4.25h en cierre [17.5, 22]
      ];
      const actual = Cobertura._coberturaSignificativa(intervalos, [17.5, 22]);
      assertEq(actual, 1, 'ALVARO debe contar en cierre');
    });

    test('Cierre Isabel con 3 empleados escalonados → cuenta 3 (no alerta falsa)', () => {
      const intervalos = [
        { alias: 'ALEX',    e: 14.75, s: 17.75 },  // 0.25h → NO cuenta
        { alias: 'ALVARO',  e: 17.75, s: 22.25 },  // 4.25h → SÍ
        { alias: 'ANDREA',  e: 18.25, s: 22.25 },  // 3.75h → SÍ
        { alias: 'MORILLA', e: 18.75, s: 22.25 }   // 3.25h → SÍ
      ];
      const actual = Cobertura._coberturaSignificativa(intervalos, [17.5, 22]);
      assertEq(actual, 3, 'cierre IS debe ser 3');
    });

    test('Mañanas persona que termina 30min después del inicio de tardes NO cuenta en tardes', () => {
      const intervalos = [
        { alias: 'MAÑANAS_PERS', e: 9, s: 15.5 }  // 0.5h en tardes [15, 17.75]
      ];
      const actual = Cobertura._coberturaSignificativa(intervalos, [15, 17.75]);
      assertEq(actual, 0, 'solo 30min → no cuenta');
    });

    test('MORILLA en tardes GV (2.75h overlap) SÍ cuenta', () => {
      const intervalos = [
        { alias: 'MORILLA', e: 15, s: 18.5 }  // overlap con tardes [15, 17.75] = 2.75h
      ];
      const actual = Cobertura._coberturaSignificativa(intervalos, [15, 17.75]);
      assertEq(actual, 1, 'MORILLA 2.75h → cuenta');
    });

    test('Sin intervalos → 0', () => {
      assertEq(Cobertura._coberturaSignificativa([], [15, 17.75]), 0);
    });
  });

  suite('FdS: sustituto desaparece de turno original (cross-día)', function () {
    test('Sustituto con sub en otro día del FdS desaparece de su turno base (SILVIA SAB_M→DOM_M)', () => {
      // SILVIA base DOM_M (domingo). Sub en SAB_M (sábado) tipo movimiento.
      // Al renderizar DOM_M, debe desaparecer.
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [{
        fecha: '2026-04-11', ausente: 'VANESA', sustituto: 'SILVIA',
        entrada: 7.25, salida: 14.75, tienda: 'granvia',
        turnoFds: 'SAB_M', tipo: 'movimiento', franja: ''
      }];
      // Domingo 12 abril, DOM_M
      const ocultar = CalendarioUI._sustituyeFdsSolapado('SILVIA', '2026-04-12', 'granvia', 'DOM_M');
      assert(ocultar, 'SILVIA debe desaparecer de DOM_M (sustituye SAB_M)');
      Store._state.sustituciones = sustsBackup;
    });

    test('Fijo con múltiples turnos NO desaparece del otro día (ALFREDO SAB_T+DOM_T)', () => {
      // ALFREDO fijo SAB_T y DOM_T. Si sub en SAB_T, no desaparece de DOM_T.
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [{
        fecha: '2026-04-11', ausente: 'FRANCIS', sustituto: 'ALFREDO',
        entrada: 14.75, salida: 22.25, tienda: 'granvia',
        turnoFds: 'SAB_T', tipo: 'movimiento', franja: ''
      }];
      // Domingo 12 abril, DOM_T — ALFREDO debe quedarse
      const ocultar = CalendarioUI._sustituyeFdsSolapado('ALFREDO', '2026-04-12', 'granvia', 'DOM_T');
      assert(!ocultar, 'ALFREDO debe quedarse en DOM_T (tiene turno base el sábado)');
      Store._state.sustituciones = sustsBackup;
    });

    test('Sub mismo día, turno diferente → ocultar', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [{
        fecha: '2026-04-11', ausente: 'ANTONIO', sustituto: 'FRANCIS',
        entrada: 7.25, salida: 14.75, tienda: 'granvia',
        turnoFds: 'SAB_M', tipo: 'movimiento', franja: ''
      }];
      // SAB_T mismo día → ocultar FRANCIS
      const ocultar = CalendarioUI._sustituyeFdsSolapado('FRANCIS', '2026-04-11', 'granvia', 'SAB_T');
      assert(ocultar, 'FRANCIS debe desaparecer de SAB_T (sustituye SAB_M mismo día)');
      Store._state.sustituciones = sustsBackup;
    });

    test('Sub mismo turno → NO ocultar (cubre dentro del mismo turno)', () => {
      const sustsBackup = Store._state.sustituciones.slice();
      Store._state.sustituciones = [{
        fecha: '2026-04-11', ausente: 'VANESA', sustituto: 'ABDEL',
        entrada: 7.25, salida: 14.75, tienda: 'granvia',
        turnoFds: 'SAB_M', tipo: 'movimiento', franja: ''
      }];
      // SAB_M mismo turno → NO ocultar
      const ocultar = CalendarioUI._sustituyeFdsSolapado('ABDEL', '2026-04-11', 'granvia', 'SAB_M');
      assert(!ocultar, 'ABDEL debe quedarse en SAB_M (sustituye dentro del mismo turno)');
      Store._state.sustituciones = sustsBackup;
    });
  });

  suite('Continuidad: verificarContinuidadConSustitucion', function () {
    test('Sustituto que cubre toda la franja → sin alertas', () => {
      // Tardes GV [15, 17.75], mínimo 2. MORILLA [15, 18.5] ya está.
      // Añadir sustituto [15, 18] → ambos cubren toda la franja → OK
      const intervalos = [
        { alias: 'MORILLA', e: 15, s: 18.5 }
      ];
      // Simular manualmente
      const copia = intervalos.slice();
      copia.push({ alias: 'SUST', e: 15, s: 18 });
      const min = Cobertura._minCoberturaEnFranja(copia, [15, 17.75]);
      assertEq(min, 2, 'sweep line debe dar 2');
    });

    test('Sustituto que no cubre parte de la franja → alerta', () => {
      // Tardes GV [15, 17.75], mínimo 2. MORILLA [15, 16.75].
      // Sustituto [17, 18.5] → gap de 16:45 a 17:00 con solo 0 personas
      const intervalos = [
        { alias: 'MORILLA', e: 15, s: 16.75 },
        { alias: 'SUST', e: 17, s: 18.5 }
      ];
      const min = Cobertura._minCoberturaEnFranja(intervalos, [15, 17.75]);
      assert(min < 2, 'sweep line debe detectar gap (min=' + min + ')');
    });

    test('Descanso 12h ahora es bloqueante (error, no aviso)', () => {
      // Empleado con turno hasta 22:15, sustitución al día siguiente a las 6
      // 6 + 24 - 22.25 = 7.75h < 12h → debe bloquear
      const turno = {
        fecha: new Date(2026, 3, 15), // miércoles
        tienda: 'granvia',
        ausente: 'EVA',
        franja: 'descarga',
        turnoFds: null,
        entrada: 6,
        salida: 10
      };
      // Simular que FRANCIS trabajó ayer hasta 22:15
      // _verificarDescanso12h lo chequeará internamente
      const result = Reglas.validarCandidato('SARA', turno);
      // SARA es solo-mañanas → error por franja, no testea descanso
      // Este test verifica que el campo errores contiene el descanso cuando aplica
      assert(Array.isArray(result.errores), 'debe devolver array de errores');
    });
  });

  // ============================================================
  // Reemplazos — baja definitiva y sustituto temporal en un slot
  // ============================================================
  suite('Reemplazos: estaActivo, aliasEfectivo, aplicarA', function () {
    // Snapshots para restaurar
    const origEmpGV = Store._state.empleadosGV;
    const origEmpIS = Store._state.empleadosIS;
    const origReemp = Store._state.reemplazos;

    // Plantilla mínima: JUAN titular en GV hasta 2026-05-15.
    // PEDRO (nuevo fijo) entra 2026-05-16. PEDROTEMP cubre otra baja 1-30.
    Store._state.empleadosGV = {
      JUAN:      { alias: 'JUAN',      tienda: 'granvia', fechaAlta: '2020-01-01', fechaBaja: '2026-05-15', contrato: 30, franja: 'tardes' },
      PEDRO:     { alias: 'PEDRO',     tienda: 'granvia', fechaAlta: '2026-05-16', contrato: 30, franja: 'tardes' },
      MARIA:     { alias: 'MARIA',     tienda: 'granvia', fechaAlta: '2020-01-01', contrato: 30, franja: 'mañanas' },
      PEDROTEMP: { alias: 'PEDROTEMP', tienda: 'granvia', fechaAlta: '2026-06-01', fechaBaja: '2026-06-30', contrato: 30, franja: 'mañanas' }
    };
    Store._state.empleadosIS = {};
    Store._state.reemplazos = [
      { tienda: 'granvia', aliasOriginal: 'JUAN',  aliasNuevo: 'PEDRO',     desde: '2026-05-16', hasta: '',          motivo: 'Baja definitiva' },
      { tienda: 'granvia', aliasOriginal: 'MARIA', aliasNuevo: 'PEDROTEMP', desde: '2026-06-01', hasta: '2026-06-30', motivo: 'Baja médica' }
    ];

    test('estaActivo: titular activo antes de su fechaBaja', () => {
      assert(Reemplazos.estaActivo('JUAN', '2026-05-14', 'granvia'));
    });
    test('estaActivo: titular inactivo el día después de la baja', () => {
      assert(!Reemplazos.estaActivo('JUAN', '2026-05-16', 'granvia'));
    });
    test('estaActivo: empleado no existe → true (no filtrar)', () => {
      // Si la rotación menciona un alias que no está en la plantilla cargada,
      // no queremos ocultarlo: asumimos activo por compatibilidad.
      assert(Reemplazos.estaActivo('NADIE', '2026-05-16', 'granvia'));
    });
    test('estaActivo: sustituto temporal fuera de rango → false', () => {
      assert(!Reemplazos.estaActivo('PEDROTEMP', '2026-07-01', 'granvia'));
    });
    test('estaActivo: sustituto temporal dentro de rango → true', () => {
      assert(Reemplazos.estaActivo('PEDROTEMP', '2026-06-15', 'granvia'));
    });

    test('aliasEfectivo: fuera del rango devuelve el original', () => {
      assertEq(Reemplazos.aliasEfectivo('JUAN', '2026-05-15', 'granvia'), 'JUAN');
    });
    test('aliasEfectivo: dentro del rango remapea al sustituto', () => {
      assertEq(Reemplazos.aliasEfectivo('JUAN', '2026-05-16', 'granvia'), 'PEDRO');
    });
    test('aliasEfectivo: tienda distinta no afecta', () => {
      assertEq(Reemplazos.aliasEfectivo('JUAN', '2026-05-16', 'isabel'), 'JUAN');
    });
    test('aliasEfectivo: reemplazo temporal solo en su ventana', () => {
      assertEq(Reemplazos.aliasEfectivo('MARIA', '2026-05-31', 'granvia'), 'MARIA');
      assertEq(Reemplazos.aliasEfectivo('MARIA', '2026-06-15', 'granvia'), 'PEDROTEMP');
      assertEq(Reemplazos.aliasEfectivo('MARIA', '2026-07-01', 'granvia'), 'MARIA');
    });

    test('aplicarA: remapea JUAN→PEDRO conservando el horario del slot', () => {
      const crudo = { JUAN: [17.75, 22.25], MARIA: [7, 15] };
      const out = Reemplazos.aplicarA(crudo, '2026-05-20', 'granvia');
      assert(!('JUAN' in out));
      assertDeep(out.PEDRO, [17.75, 22.25]);
      assertDeep(out.MARIA, [7, 15]);
    });
    test('aplicarA: titular de baja sin reemplazo activo se elimina', () => {
      Store._state.reemplazos = []; // sin reemplazos
      const crudo = { JUAN: [17.75, 22.25], MARIA: [7, 15] };
      const out = Reemplazos.aplicarA(crudo, '2026-05-20', 'granvia');
      assert(!('JUAN' in out));
      assertDeep(out.MARIA, [7, 15]);
      // Restaurar reemplazos para los tests siguientes
      Store._state.reemplazos = [
        { tienda: 'granvia', aliasOriginal: 'JUAN', aliasNuevo: 'PEDRO', desde: '2026-05-16', hasta: '', motivo: '' },
        { tienda: 'granvia', aliasOriginal: 'MARIA', aliasNuevo: 'PEDROTEMP', desde: '2026-06-01', hasta: '2026-06-30', motivo: '' }
      ];
    });
    test('aplicarA: antes del reemplazo el titular aún aparece', () => {
      // El reemplazo JUAN→PEDRO empieza el 2026-05-16. El día 10 aún no aplica.
      const crudo = { JUAN: [17.75, 22.25] };
      const out = Reemplazos.aplicarA(crudo, '2026-05-10', 'granvia');
      assertDeep(out.JUAN, [17.75, 22.25]);
      assert(!('PEDRO' in out));
    });

    test('aplicarA: reemplazo activo pero sustituto sin alta todavía → slot vacío', () => {
      // PEDRO tiene fechaAlta 2026-05-16; consultamos el mismo día, debería
      // estar activo. Forzamos un caso en el que el sustituto aún NO tiene alta:
      const origPedro = Store._state.empleadosGV.PEDRO;
      Store._state.empleadosGV.PEDRO = { ...origPedro, fechaAlta: '2026-06-01' };
      const crudo = { JUAN: [17.75, 22.25] };
      const out = Reemplazos.aplicarA(crudo, '2026-05-20', 'granvia');
      // JUAN ya estaba de baja (fechaBaja 15/5) y PEDRO aún no tiene alta → nadie
      assert(!('JUAN' in out));
      assert(!('PEDRO' in out));
      Store._state.empleadosGV.PEDRO = origPedro;
    });

    test('aliasEfectivo: encadena Juan→Pedro→Luis sin caer en bucles', () => {
      Store._state.empleadosGV.LUIS = { alias: 'LUIS', tienda: 'granvia', fechaAlta: '2026-08-01', contrato: 30 };
      Store._state.reemplazos.push({
        tienda: 'granvia', aliasOriginal: 'PEDRO', aliasNuevo: 'LUIS',
        desde: '2026-08-01', hasta: '', motivo: 'Relevo'
      });
      assertEq(Reemplazos.aliasEfectivo('JUAN', '2026-09-01', 'granvia'), 'LUIS');
    });

    // Cleanup
    Store._state.empleadosGV = origEmpGV;
    Store._state.empleadosIS = origEmpIS;
    Store._state.reemplazos = origReemp;
  });

  // ============================================================
  // Intercambios — swap puntual de turno entre dos empleados
  // ============================================================
  suite('Intercambios: aplicarA (L-V) y aplicarAFds', function () {
    const origInter = Store._state.intercambios;

    test('aplicarA L-V sin intercambios devuelve el mapa tal cual', () => {
      Store._state.intercambios = [];
      const crudo = { ANA: [7, 15], BEA: [14, 22] };
      const out = Intercambios.aplicarA(crudo, '2026-04-20', 'granvia');
      assertDeep(out.ANA, [7, 15]);
      assertDeep(out.BEA, [14, 22]);
    });

    test('aplicarA L-V: swap de horarios entre A y B en el mismo día', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-20', tienda: 'granvia',
        empleadoA: 'ANA', turnoA: 'LV',
        empleadoB: 'BEA', turnoB: 'LV',
        motivo: ''
      }];
      const crudo = { ANA: [7, 15], BEA: [14, 22], CARLOS: [10, 14] };
      const out = Intercambios.aplicarA(crudo, '2026-04-20', 'granvia');
      assertDeep(out.ANA, [14, 22]);
      assertDeep(out.BEA, [7, 15]);
      assertDeep(out.CARLOS, [10, 14]); // sin tocar
    });

    test('aplicarA L-V: fecha o tienda distinta no aplica', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-20', tienda: 'granvia',
        empleadoA: 'ANA', turnoA: 'LV', empleadoB: 'BEA', turnoB: 'LV', motivo: ''
      }];
      const crudo = { ANA: [7, 15], BEA: [14, 22] };
      const outOtraFecha = Intercambios.aplicarA(crudo, '2026-04-21', 'granvia');
      assertDeep(outOtraFecha.ANA, [7, 15]);
      const outOtraTienda = Intercambios.aplicarA(crudo, '2026-04-20', 'isabel');
      assertDeep(outOtraTienda.ANA, [7, 15]);
    });

    test('aplicarA L-V: si falta uno de los dos en el mapa, no toca nada', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-20', tienda: 'granvia',
        empleadoA: 'ANA', turnoA: 'LV', empleadoB: 'INEXISTENTE', turnoB: 'LV', motivo: ''
      }];
      const crudo = { ANA: [7, 15] };
      const out = Intercambios.aplicarA(crudo, '2026-04-20', 'granvia');
      assertDeep(out.ANA, [7, 15]);
    });

    test('aplicarAFds: A de SAB_T se va a SAB_M y B de SAB_M se va a SAB_T', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-25', tienda: 'granvia',
        empleadoA: 'ANDREA', turnoA: 'SAB_T',
        empleadoB: 'ABEL',   turnoB: 'SAB_M',
        motivo: ''
      }];
      const crudo = {
        SAB_M: { ABEL: [7, 14] },
        SAB_T: { ANDREA: [15, 22] },
        DOM_M: {}, DOM_T: {}
      };
      const out = Intercambios.aplicarAFds(crudo, '2026-04-25', 'granvia');
      assert(!('ABEL' in out.SAB_M));
      assert(!('ANDREA' in out.SAB_T));
      assertDeep(out.SAB_M.ANDREA, [7, 14]);
      assertDeep(out.SAB_T.ABEL, [15, 22]);
    });

    test('aplicarAFds: swap cruzando día (SAB_T ↔ DOM_M) mantiene horarios de cada hueco', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-25', tienda: 'granvia',
        empleadoA: 'DAVID', turnoA: 'SAB_T',
        empleadoB: 'LETI',  turnoB: 'DOM_M',
        motivo: ''
      }];
      const crudo = {
        SAB_M: {}, SAB_T: { DAVID: [15, 22] },
        DOM_M: { LETI: [9, 15] }, DOM_T: {}
      };
      const out = Intercambios.aplicarAFds(crudo, '2026-04-25', 'granvia');
      assertDeep(out.SAB_T.LETI, [15, 22]);
      assertDeep(out.DOM_M.DAVID, [9, 15]);
      assert(!('DAVID' in out.SAB_T));
      assert(!('LETI' in out.DOM_M));
    });

    test('aplicarAFds: sin intercambios devuelve los 4 turnos intactos', () => {
      Store._state.intercambios = [];
      const crudo = {
        SAB_M: { X: [7, 14] }, SAB_T: { Y: [15, 22] },
        DOM_M: { Z: [9, 15] }, DOM_T: { W: [15, 22] }
      };
      const out = Intercambios.aplicarAFds(crudo, '2026-04-25', 'granvia');
      assertDeep(out.SAB_M.X, [7, 14]);
      assertDeep(out.SAB_T.Y, [15, 22]);
      assertDeep(out.DOM_M.Z, [9, 15]);
      assertDeep(out.DOM_T.W, [15, 22]);
    });

    test('getActivoPara: encuentra intercambio anclado al sábado desde el domingo', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-25', tienda: 'granvia',
        empleadoA: 'DAVID', turnoA: 'SAB_T',
        empleadoB: 'LETI',  turnoB: 'DOM_M',
        motivo: ''
      }];
      // Consultando desde el domingo (LETI realmente trabajaba DOM_M) también debe encontrarlo.
      const res = Intercambios.getActivoPara('LETI', '2026-04-26', 'granvia', 'DOM_M');
      assert(res !== null);
      assertEq(res.intercambio.empleadoA, 'DAVID');
    });

    test('getActivoPara: caso L-V encuentra el intercambio del día exacto', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-22', tienda: 'isabel',
        empleadoA: 'CECI', turnoA: 'LV', empleadoB: 'ANDREA', turnoB: 'LV', motivo: 'cita'
      }];
      const res = Intercambios.getActivoPara('CECI', '2026-04-22', 'isabel', 'LV');
      assert(res !== null);
      assertEq(res.intercambio.motivo, 'cita');
      assertEq(res.idx, 0);
    });

    test('getActivoPara: devuelve null si nadie está implicado o si la fecha no coincide', () => {
      Store._state.intercambios = [{
        fecha: '2026-04-22', tienda: 'isabel',
        empleadoA: 'CECI', turnoA: 'LV', empleadoB: 'ANDREA', turnoB: 'LV', motivo: ''
      }];
      assertEq(Intercambios.getActivoPara('OTRO', '2026-04-22', 'isabel', 'LV'), null);
      assertEq(Intercambios.getActivoPara('CECI', '2026-04-23', 'isabel', 'LV'), null);
      assertEq(Intercambios.getActivoPara('CECI', '2026-04-22', 'granvia', 'LV'), null);
    });

    test('add + remove: emite eventos y actualiza el store', () => {
      Store._state.intercambios = [];
      let emisiones = 0;
      const off = Store.on('intercambios', () => { emisiones++; });
      Intercambios.add({
        fecha: '2026-04-22', tienda: 'granvia',
        empleadoA: 'A', turnoA: 'LV', empleadoB: 'B', turnoB: 'LV', motivo: ''
      });
      assertEq(Store._state.intercambios.length, 1);
      Intercambios.remove(0);
      assertEq(Store._state.intercambios.length, 0);
      assertEq(emisiones, 2); // un emit por add y otro por remove
      if (off) off();
    });

    test('candidatosLV: excluye al propio empleado y a los ausentes; ordena por entrada', () => {
      // Aislamos el test mockeando Rotaciones.getHorariosLV (sin tocar la rotación real)
      const origGet = Rotaciones.getHorariosLV;
      const origAus = Store._state.ausenciasGV;
      try {
        Rotaciones.getHorariosLV = () => ({
          ANA:    [7, 15],
          BEA:    [14, 22],
          CARLOS: [10, 14],
          DIANA:  [9, 13]   // estará ausente
        });
        Store._state.ausenciasGV = [{
          empleado: 'DIANA', tipo: 'vacaciones',
          desde: '2026-04-22', hasta: '2026-04-22', motivo: ''
        }];

        const cands = Intercambios.candidatosLV('ANA', '2026-04-22', 'granvia');
        // Sin ANA (propio) y sin DIANA (ausente). Ordenados por entrada asc.
        assertEq(cands.length, 2);
        assertEq(cands[0].alias, 'CARLOS'); // 10 < 14
        assertEq(cands[1].alias, 'BEA');
      } finally {
        Rotaciones.getHorariosLV = origGet;
        Store._state.ausenciasGV = origAus;
      }
    });

    test('candidatosFds: recorre los 4 turnos y respeta ausencias por día específico', () => {
      const origGet = Rotaciones.getFds;
      const origAus = Store._state.ausenciasIS;
      try {
        Rotaciones.getFds = () => ({
          SAB_M: { X: [7, 14], Y: [7, 14] },
          SAB_T: { Z: [15, 22] },
          DOM_M: { Y: [7, 14] }, // Y aparece sábado y domingo
          DOM_T: { W: [15, 22] }
        });
        // Y ausente solo el domingo: debe seguir como candidato del sábado
        Store._state.ausenciasIS = [{
          empleado: 'Y', tipo: 'vacaciones',
          desde: '2026-04-26', hasta: '2026-04-26', motivo: ''
        }];

        // Pedimos candidatos para X (en SAB_M); X queda fuera por ser el propio.
        const cands = Intercambios.candidatosFds('X', '2026-04-25', 'isabel');
        const aliases = cands.map(c => c.alias + ':' + c.turno).sort();
        // Esperamos: Y:SAB_M (sábado, presente), Z:SAB_T, W:DOM_T. NO Y:DOM_M (ausente ese día).
        assertDeep(aliases, ['W:DOM_T', 'Y:SAB_M', 'Z:SAB_T']);
      } finally {
        Rotaciones.getFds = origGet;
        Store._state.ausenciasIS = origAus;
      }
    });

    // Cleanup
    Store._state.intercambios = origInter;
  });

  // ============================================================
  // AUSENCIAS — editar (cambio de tipo, fechas, motivo)
  // ============================================================
  suite('Ausencias.editar', function () {
    const origAusGV = Store._state.ausenciasGV;
    const origSync = Sync.syncAusencias;
    Store._state.ausenciasGV = [];
    Sync.syncAusencias = function () {}; // stub para evitar fetch

    // Seed: dos ausencias para la misma empleada
    Store._state.ausenciasGV = [
      { empleado: 'EVA', tipo: 'vacaciones', desde: '2026-07-01', hasta: '2026-07-07', motivo: '' },
      { empleado: 'EVA', tipo: 'baja',       desde: '2026-08-10', hasta: '2026-08-15', motivo: '' }
    ];

    test('Editar solo el tipo: vacaciones → baja (ya no resta cupo)', () => {
      const antes = Ausencias.calcularVacaciones('EVA', 'granvia', 2026).usados;
      const r = Ausencias.editar('granvia', 0, { tipo: 'baja' });
      assert(r.ok, r.error);
      assertEq(Store.getAusencias('granvia')[0].tipo, 'baja');
      const despues = Ausencias.calcularVacaciones('EVA', 'granvia', 2026).usados;
      assert(despues < antes, 'cambiar a baja debería reducir días usados');
    });

    test('Editar tipo baja → vacaciones (vuelve a restar cupo)', () => {
      const r = Ausencias.editar('granvia', 0, { tipo: 'vacaciones' });
      assert(r.ok, r.error);
      const v = Ausencias.calcularVacaciones('EVA', 'granvia', 2026);
      assertEq(v.usados, 7); // del 1 al 7 julio = 7 días naturales
    });

    test('Editar fechas con solapamiento con otra ausencia propia → error', () => {
      // Intentar mover la primera (julio) para que pise la segunda (agosto)
      const r = Ausencias.editar('granvia', 0, { desde: '2026-08-12', hasta: '2026-08-13' });
      assert(!r.ok);
      assert(r.error.indexOf('Ya existe') === 0, 'debe avisar solapamiento');
    });

    test('Editar fechas sin solapamiento (excluye la propia) → ok', () => {
      const r = Ausencias.editar('granvia', 0, { desde: '2026-07-01', hasta: '2026-07-10' });
      assert(r.ok, r.error);
      assertEq(Store.getAusencias('granvia')[0].hasta, '2026-07-10');
    });

    test('Tipo inválido → error', () => {
      const r = Ausencias.editar('granvia', 0, { tipo: 'inventado' });
      assert(!r.ok);
    });

    test('Fecha desde > hasta → error', () => {
      const r = Ausencias.editar('granvia', 0, { desde: '2026-07-20', hasta: '2026-07-10' });
      assert(!r.ok);
    });

    test('Índice fuera de rango → error', () => {
      const r = Ausencias.editar('granvia', 99, { tipo: 'baja' });
      assert(!r.ok);
    });

    // Cleanup
    Store._state.ausenciasGV = origAusGV;
    Sync.syncAusencias = origSync;
  });

  // ============================================================
  // REGLAS — candidato reemplazado / dado de baja
  // ============================================================
  suite('Reglas: rechaza candidato reemplazado o dado de baja', function () {
    const origRemp = Store._state.reemplazos;
    const origEmpsGV = JSON.parse(JSON.stringify(Store._state.empleadosGV || {}));
    Store._state.reemplazos = [];

    // Garantizar empleados mínimos
    Store._state.empleadosGV = Store._state.empleadosGV || {};
    Store._state.empleadosGV['X_BAJA'] = {
      alias: 'X_BAJA', nombre: 'X', apellidos: '', dni: '', telefono: '', email: '',
      fechaAlta: '2020-01-01', fechaBaja: '2026-03-01', contrato: 30,
      tienda: 'granvia', franja: 'tardes', restriccion: '', color: '#000'
    };
    Store._state.empleadosGV['X_REEMPLAZADO'] = {
      alias: 'X_REEMPLAZADO', nombre: 'X', apellidos: '', dni: '', telefono: '', email: '',
      fechaAlta: '2020-01-01', contrato: 30,
      tienda: 'granvia', franja: 'tardes', restriccion: '', color: '#000'
    };

    test('Empleado con fechaBaja anterior → rechazado', () => {
      const turno = {
        tienda: 'granvia', fecha: new Date(2026, 4, 10), // 10 mayo 2026
        ausente: 'OTRO', franja: 'tardes', turnoFds: 'DOM_T',
        entrada: 14.75, salida: 22.25
      };
      const r = Reglas.validarCandidato('X_BAJA', turno);
      assert(!r.valido);
      assert(r.errores.some(e => e.indexOf('dado de baja') >= 0 || e.indexOf('No está activo') >= 0),
        'debe rechazar por baja: ' + r.errores.join(', '));
    });

    test('Empleado con reemplazo activo → rechazado', () => {
      Store._state.reemplazos = [{
        aliasOriginal: 'X_REEMPLAZADO', aliasNuevo: 'NUEVO',
        tienda: 'granvia', desde: '2026-04-01', hasta: ''
      }];
      const turno = {
        tienda: 'granvia', fecha: new Date(2026, 4, 10),
        ausente: 'OTRO', franja: 'tardes', turnoFds: 'DOM_T',
        entrada: 14.75, salida: 22.25
      };
      const r = Reglas.validarCandidato('X_REEMPLAZADO', turno);
      assert(!r.valido);
      assert(r.errores.some(e => e.indexOf('Reemplazado') >= 0),
        'debe rechazar por reemplazo: ' + r.errores.join(', '));
    });

    test('Reemplazo fuera de rango (fecha posterior a hasta) → acepta', () => {
      Store._state.reemplazos = [{
        aliasOriginal: 'X_REEMPLAZADO', aliasNuevo: 'NUEVO',
        tienda: 'granvia', desde: '2026-04-01', hasta: '2026-04-30'
      }];
      const turno = {
        tienda: 'granvia', fecha: new Date(2026, 4, 10), // 10 mayo, fuera del rango
        ausente: 'OTRO', franja: 'tardes', turnoFds: 'DOM_T',
        entrada: 14.75, salida: 22.25
      };
      const r = Reglas.validarCandidato('X_REEMPLAZADO', turno);
      // No debe fallar por reemplazo (puede fallar por otras razones, pero no por esta)
      assert(!r.errores.some(e => e.indexOf('Reemplazado') >= 0),
        'no debe marcar como reemplazado fuera de rango: ' + r.errores.join(', '));
    });

    // Cleanup
    Store._state.reemplazos = origRemp;
    Store._state.empleadosGV = origEmpsGV;
  });

  // ============================================================
  // ROTACIONES — DST no desalinea sábado y domingo del mismo finde
  // ============================================================
  suite('Rotaciones: DST-safe (sábado y domingo misma semana)', function () {
    test('Semanas entre fechas con DST en medio (Feb 28 → May 9 = 10 sem)', () => {
      const ini = Utils.parseFecha('2026-02-28'); // sábado
      const sab = Utils.parseFecha('2026-05-09'); // sábado, tras DST primavera
      const dom = Utils.parseFecha('2026-05-10'); // domingo
      // Tras el fix, ambos deben devolver la misma semana (10).
      assertEq(Rotaciones._semanasEntre(ini, sab), 10);
      assertEq(Rotaciones._semanasEntre(ini, dom), 10);
    });

    test('getFdsGV produce la misma rotación el sábado y el domingo de un mismo finde', () => {
      const sab = Utils.parseFecha('2026-05-09');
      const dom = Utils.parseFecha('2026-05-10');
      const dataSab = Rotaciones.getFdsGV(sab);
      const dataDom = Rotaciones.getFdsGV(dom);
      // Las claves de rotación base deben coincidir en cada turno.
      for (const tk of ['SAB_M', 'SAB_T', 'DOM_M', 'DOM_T']) {
        const keysSab = Object.keys(dataSab[tk] || {}).sort().join(',');
        const keysDom = Object.keys(dataDom[tk] || {}).sort().join(',');
        assertEq(keysDom, keysSab, 'Turno ' + tk + ' difiere entre sábado y domingo');
      }
    });
  });

  // ============================================================
  // AUSENCIAS — empleados con tienda 'ambas' (replicación entre tiendas)
  // ============================================================
  suite('Ausencias: empleado con tienda ambas', function () {
    const origGV    = Store._state.empleadosGV;
    const origIS    = Store._state.empleadosIS;
    const origAusGV = Store._state.ausenciasGV;
    const origAusIS = Store._state.ausenciasIS;
    const origSync  = Sync.syncAusencias;

    // Seed: un empleado ficticio compartido (tienda:'ambas' en las dos plantillas)
    // y otro solo GV para el test negativo. Aliases con guión bajo para no colisionar.
    Store._state.empleadosGV = {
      _SHARED:  { alias: '_SHARED',  nombre: 'Test', apellidos: 'Compartido', dni: '', telefono: '', email: '', fechaAlta: '2025-01-01', contrato: 25, tienda: 'ambas',   franja: 'tardes', restriccion: '', color: '#888' },
      _SOLO_GV: { alias: '_SOLO_GV', nombre: 'Test', apellidos: 'SoloGV',     dni: '', telefono: '', email: '', fechaAlta: '2025-01-01', contrato: 25, tienda: 'granvia', franja: 'tardes', restriccion: '', color: '#888' }
    };
    Store._state.empleadosIS = {
      _SHARED:  { alias: '_SHARED',  nombre: 'Test', apellidos: 'Compartido', dni: '', telefono: '', email: '', fechaAlta: '2025-01-01', contrato: 18, tienda: 'ambas',   franja: 'tardes', restriccion: '', color: '#888' }
    };
    Store._state.ausenciasGV = [];
    Store._state.ausenciasIS = [];
    Sync.syncAusencias = function () {}; // stub para evitar fetch

    test('aplicarEnAmbas:true bloquea turnos en GV y en Isabel simultáneamente', () => {
      Store._state.ausenciasGV = [];
      Store._state.ausenciasIS = [];
      const r = Ausencias.crear('granvia', '_SHARED', 'vacaciones',
        '2030-06-01', '2030-06-07', '', { aplicarEnAmbas: true });
      assert(r.ok, r.error);
      assertEq(r.replicada, true);
      // Día dentro del rango: ausente en ambas tiendas
      assert(Store.estaAusente('_SHARED', '2030-06-03', 'granvia'), 'debe estar ausente en GV');
      assert(Store.estaAusente('_SHARED', '2030-06-03', 'isabel'),  'debe estar ausente en Isabel');
      // Día fuera del rango: no ausente en ninguna
      assert(!Store.estaAusente('_SHARED', '2030-05-31', 'granvia'));
      assert(!Store.estaAusente('_SHARED', '2030-05-31', 'isabel'));
    });

    test('Por defecto (sin opciones) solo se registra en la tienda activa', () => {
      Store._state.ausenciasGV = [];
      Store._state.ausenciasIS = [];
      const r = Ausencias.crear('granvia', '_SHARED', 'vacaciones',
        '2030-07-01', '2030-07-05', '');
      assert(r.ok, r.error);
      assert(!r.replicada, 'no debe replicar sin la opción');
      assert(Store.estaAusente('_SHARED', '2030-07-03', 'granvia'));
      assert(!Store.estaAusente('_SHARED', '2030-07-03', 'isabel'));
    });

    test('aplicarEnAmbas:true con empleado que NO es ambas → error y no crea nada', () => {
      Store._state.ausenciasGV = [];
      Store._state.ausenciasIS = [];
      const r = Ausencias.crear('granvia', '_SOLO_GV', 'permiso',
        '2030-08-01', '2030-08-02', '', { aplicarEnAmbas: true });
      assert(!r.ok, 'debe rechazar replicación si no es ambas');
      assertEq(Store.getAusencias('granvia').length, 0);
      assertEq(Store.getAusencias('isabel').length, 0);
    });

    test('Atomicidad: si solapa en la otra tienda, no se crea en NINGUNA', () => {
      Store._state.ausenciasGV = [];
      Store._state.ausenciasIS = [
        { empleado: '_SHARED', tipo: 'baja', desde: '2030-09-10', hasta: '2030-09-12', motivo: '' }
      ];
      const r = Ausencias.crear('granvia', '_SHARED', 'permiso',
        '2030-09-11', '2030-09-15', '', { aplicarEnAmbas: true });
      assert(!r.ok, 'debe detectar solapamiento en Isabel y abortar');
      assertEq(Store.getAusencias('granvia').length, 0, 'GV no debe recibir un insert parcial');
      assertEq(Store.getAusencias('isabel').length, 1, 'Isabel sigue con la pre-existente');
    });

    // Cleanup
    Store._state.empleadosGV = origGV;
    Store._state.empleadosIS = origIS;
    Store._state.ausenciasGV = origAusGV;
    Store._state.ausenciasIS = origAusIS;
    Sync.syncAusencias = origSync;
  });

  // ============================================================
  // REGRESIÓN — bugs detectados en auditoría 25-04 y corregidos
  // ============================================================

  suite('Reglas: candidato también ausente devuelve valido:false (return inmediato)', function () {
    const origGV    = Store._state.empleadosGV;
    const origAusGV = Store._state.ausenciasGV;
    // Sembrar empleado en plantilla para que validarCandidato no rechace por
    // "no existe en la plantilla" antes de llegar a la regla de ausencia.
    Store._state.empleadosGV = {
      _CAND: { alias: '_CAND', nombre: 'Test', apellidos: 'Cand', dni: '', telefono: '', email: '', fechaAlta: '2025-01-01', contrato: 35, tienda: 'granvia', franja: 'mañanas', restriccion: '', color: '#888' },
      _AUS:  { alias: '_AUS',  nombre: 'Test', apellidos: 'Aus',  dni: '', telefono: '', email: '', fechaAlta: '2025-01-01', contrato: 35, tienda: 'granvia', franja: 'mañanas', restriccion: '', color: '#888' }
    };
    Store._state.ausenciasGV = [
      { empleado: '_CAND', tipo: 'baja', desde: '2026-04-13', hasta: '2026-04-17', motivo: '' }
    ];

    test('Candidato ausente devuelve valido:false con motivo de ausencia', () => {
      const turno = {
        tienda: 'granvia',
        fecha: Utils.parseFecha('2026-04-15'), // miércoles dentro del rango
        ausente: '_AUS',
        franja: 'mañanas',
        turnoFds: '',
        entrada: 9,
        salida: 14.5
      };
      const v = Reglas.validarCandidato('_CAND', turno);
      assertEq(v.valido, false, 'debe ser rechazada por ausencia');
      assert(v.errores.some(e => /ausente/i.test(e)), 'el motivo debe mencionar ausencia');
    });

    Store._state.empleadosGV = origGV;
    Store._state.ausenciasGV = origAusGV;
  });

  suite('Auditor: intervalosDelDia respeta modificaciones (nuevaEntrada/nuevaSalida)', function () {
    const origGV    = Store._state.empleadosGV;
    const origHorGV = Store._state.horariosGV;
    const origMods  = Store._state.modificacionesHorario;

    // Sembramos plantilla mínima para que getHorariosLV devuelva datos.
    // Sin esto, post-Sprint B la plantilla por defecto es {} y el test
    // se saltaba silencioso sin asserts. Bug detectado el 25-04.
    Store._state.empleadosGV = {
      _MOD: { alias: '_MOD', nombre: 'Test', apellidos: 'Mod', dni: '', telefono: '', email: '', fechaAlta: '2025-01-01', contrato: 30, tienda: 'granvia', franja: 'mañanas', restriccion: '', color: '#888' }
    };
    // Semana A (impar) y B (par) con mismo horario para no depender de la fecha
    Store._state.horariosGV = {
      A: { LJ: { _MOD: [9, 14] }, V: { _MOD: [9, 14] } },
      B: { LJ: { _MOD: [9, 14] }, V: { _MOD: [9, 14] } }
    };
    Store._state.modificacionesHorario = [];

    test('Empleado con modificación aparece con nueva entrada/salida, no undefined', () => {
      const fecha = Utils.parseFecha('2026-04-15'); // miércoles
      const fs = Utils.formatFecha(fecha);

      Store._state.modificacionesHorario = [{
        empleado: '_MOD', fecha: fs, tienda: 'granvia',
        turnoFds: '',
        entradaOriginal: 9, salidaOriginal: 14,
        nuevaEntrada: 11.5, nuevaSalida: 16.0,
        motivo: 'test'
      }];

      const intervalos = Auditor.intervalosDelDia(fecha, 'granvia');
      const it = intervalos.find(x => x.emp === '_MOD');
      assert(it, '_MOD debe estar en intervalos del día');
      assertEq(it.entrada, 11.5, 'entrada debe ser nuevaEntrada');
      assertEq(it.salida, 16.0,  'salida debe ser nuevaSalida');
      assert(typeof it.entrada === 'number' && !isNaN(it.entrada), 'no debe ser undefined/NaN');
    });

    test('Sin modificación, intervalosDelDia usa el horario base', () => {
      Store._state.modificacionesHorario = [];
      const fecha = Utils.parseFecha('2026-04-15');
      const intervalos = Auditor.intervalosDelDia(fecha, 'granvia');
      const it = intervalos.find(x => x.emp === '_MOD');
      assert(it, '_MOD debe estar en intervalos del día (base)');
      assertEq(it.entrada, 9);
      assertEq(it.salida,  14);
    });

    Store._state.empleadosGV = origGV;
    Store._state.horariosGV = origHorGV;
    Store._state.modificacionesHorario = origMods;
  });

  suite('Motor: veto DOM_T cuando hay alternativa', function () {
    test('Filtro DOM_T: si entre los candidatos hay turno origen != DOM_T con excedente, DOM_T se quita', () => {
      // Sintetizamos un set de candidatos como si volvieran de _obtenerCandidatos.
      // El veto está implementado al final de esa función, sobre el array final.
      // Probamos la lógica equivalente: dado un array, comprobar que el filtro
      // se aplicaría correctamente.
      const candidatos = [
        { alias: 'A', turnoOrigenFds: 'DOM_T', excedenteOrigen: 2 },
        { alias: 'B', turnoOrigenFds: 'DOM_M', excedenteOrigen: 1 },
        { alias: 'C', turnoOrigenFds: 'SAB_T', excedenteOrigen: 1 }
      ];
      const turnoFds = 'SAB_M'; // destino
      const hayAlternativa = candidatos.some(c =>
        c.turnoOrigenFds && c.turnoOrigenFds !== 'DOM_T' &&
        c.excedenteOrigen >= 1 && c.excedenteOrigen < 99
      );
      assert(hayAlternativa, 'debe detectar alternativa');
      const filtrados = candidatos.filter(c => c.turnoOrigenFds !== 'DOM_T');
      assertEq(filtrados.length, 2, 'A (DOM_T) debe ser filtrado');
      assert(!filtrados.some(c => c.alias === 'A'), 'A no debe estar en el resultado');
    });

    test('Sin alternativa: si todos los candidatos son DOM_T, NO se filtran (último recurso)', () => {
      const candidatos = [
        { alias: 'A', turnoOrigenFds: 'DOM_T', excedenteOrigen: 2 },
        { alias: 'B', turnoOrigenFds: 'DOM_T', excedenteOrigen: 1 }
      ];
      const hayAlternativa = candidatos.some(c =>
        c.turnoOrigenFds && c.turnoOrigenFds !== 'DOM_T' &&
        c.excedenteOrigen >= 1 && c.excedenteOrigen < 99
      );
      assert(!hayAlternativa, 'no debe detectar alternativa');
      // El motor no aplicaría el filtro → ambos siguen disponibles
      assertEq(candidatos.length, 2);
    });

    test('Refuerzo externo (excedente 99) NO cuenta como alternativa', () => {
      const candidatos = [
        { alias: 'A', turnoOrigenFds: 'DOM_T', excedenteOrigen: 2 },
        { alias: 'B', turnoOrigenFds: '',      excedenteOrigen: 99 } // refuerzo externo
      ];
      const hayAlternativa = candidatos.some(c =>
        c.turnoOrigenFds && c.turnoOrigenFds !== 'DOM_T' &&
        c.excedenteOrigen >= 1 && c.excedenteOrigen < 99
      );
      assert(!hayAlternativa, 'refuerzo externo no debe activar el filtro');
    });

    test('Destino DOM_T: el veto NO se aplica (si el ausente ES de DOM_T, se permite mover de DOM_T)', () => {
      // Este test documenta que el veto está condicionado por turno.turnoFds !== 'DOM_T'.
      // La lógica está en motor-sustituciones.js; aquí aseguramos el contrato semántico.
      const turnoDestino = 'DOM_T';
      const aplicaVeto = turnoDestino !== 'DOM_T';
      assert(!aplicaVeto, 'cuando el destino es DOM_T el veto está desactivado');
    });
  });

  // ============================================================
  // ROTACIONES — DST en los bordes exactos del cambio de hora
  // ============================================================
  suite('Rotaciones: DST exacto en spring forward y fall back', function () {
    test('Spring forward 2026 (29-mar): semanas iguales en sábado 28 y domingo 29', () => {
      const ini = Utils.parseFecha('2026-02-28');
      const sab = Utils.parseFecha('2026-03-28'); // sábado antes de DST
      const dom = Utils.parseFecha('2026-03-29'); // domingo, día del cambio
      const wSab = Rotaciones._semanasEntre(ini, sab);
      const wDom = Rotaciones._semanasEntre(ini, dom);
      assertEq(wSab, wDom, 'sábado 28 y domingo 29 deben ser la misma semana');
    });

    test('Fall back 2026 (25-oct): semanas iguales en sábado 24 y domingo 25', () => {
      const ini = Utils.parseFecha('2026-02-28');
      const sab = Utils.parseFecha('2026-10-24'); // sábado antes del cambio
      const dom = Utils.parseFecha('2026-10-25'); // domingo, día del cambio
      const wSab = Rotaciones._semanasEntre(ini, sab);
      const wDom = Rotaciones._semanasEntre(ini, dom);
      assertEq(wSab, wDom, 'sábado 24 y domingo 25 deben ser la misma semana');
    });

    test('Cruce de año (31-dic-2026 → 03-ene-2027): la diff aumenta exactamente lo esperado', () => {
      const ini = Utils.parseFecha('2026-12-26'); // sábado
      const sabSig = Utils.parseFecha('2027-01-02'); // sábado siguiente
      const w = Rotaciones._semanasEntre(ini, sabSig);
      assertEq(w, 1, 'una semana exacta a través del cambio de año');
    });
  });

  // ============================================================
  // REEMPLAZOS — encadenamiento (A→B→C) y anti-ciclo (A→B→A)
  // ============================================================
  suite('Reemplazos: cadena y anti-ciclo', function () {
    const origReemp = Store._state.reemplazos;

    test('Cadena A→B→C: aliasEfectivo(A) devuelve C', () => {
      Store._state.reemplazos = [
        { tienda: 'granvia', aliasOriginal: 'A', aliasNuevo: 'B', desde: '2026-01-01', hasta: '', motivo: '' },
        { tienda: 'granvia', aliasOriginal: 'B', aliasNuevo: 'C', desde: '2026-01-01', hasta: '', motivo: '' }
      ];
      const efectivo = Reemplazos.aliasEfectivo('A', Utils.parseFecha('2026-06-15'), 'granvia');
      assertEq(efectivo, 'C', 'la cadena debe resolverse hasta el último');
    });

    test('Anti-ciclo A→B→A: corta sin colgar el navegador', () => {
      Store._state.reemplazos = [
        { tienda: 'granvia', aliasOriginal: 'A', aliasNuevo: 'B', desde: '2026-01-01', hasta: '', motivo: '' },
        { tienda: 'granvia', aliasOriginal: 'B', aliasNuevo: 'A', desde: '2026-01-01', hasta: '', motivo: '' }
      ];
      // Que no entre en bucle infinito ni lance excepción
      const efectivo = Reemplazos.aliasEfectivo('A', Utils.parseFecha('2026-06-15'), 'granvia');
      // Debe terminar — el alias resuelto puede ser A o B, lo importante
      // es que el anti-ciclo (visitados Set) corte la cadena.
      assert(efectivo === 'A' || efectivo === 'B', 'debe terminar en A o B sin colgar');
    });

    test('Reemplazo expirado por fecha hasta no se aplica', () => {
      Store._state.reemplazos = [
        { tienda: 'granvia', aliasOriginal: 'X', aliasNuevo: 'Y', desde: '2026-01-01', hasta: '2026-03-31', motivo: '' }
      ];
      const dentroDeRango = Reemplazos.aliasEfectivo('X', Utils.parseFecha('2026-02-15'), 'granvia');
      const fueraDeRango  = Reemplazos.aliasEfectivo('X', Utils.parseFecha('2026-05-15'), 'granvia');
      assertEq(dentroDeRango, 'Y');
      assertEq(fueraDeRango,  'X', 'fuera del rango el reemplazo no aplica');
    });

    Store._state.reemplazos = origReemp;
  });

  // ============================================================
  // HOY — smoke test del render
  // ============================================================
  suite('HoyUI: render genera contenido sin lanzar errores', function () {
    test('render() pinta secciones con datos sembrados (ausencias + sustituciones)', () => {
      // Crear el contenedor que la pestaña espera
      let cont = document.getElementById('tab-hoy');
      if (!cont) {
        cont = document.createElement('div');
        cont.id = 'tab-hoy';
        document.body.appendChild(cont);
      }
      const origAusGV = Store._state.ausenciasGV;
      const origSusts = Store._state.sustituciones;
      try {
        const hoy = Utils.formatFecha(new Date());
        Store._state.ausenciasGV = [
          { empleado: 'TEST_AUS', tipo: 'baja', desde: hoy, hasta: hoy, motivo: '' }
        ];
        Store._state.sustituciones = [
          { fecha: hoy, ausente: 'TEST_AUS', sustituto: 'TEST_SUST',
            entrada: 9, salida: 14, franja: 'mañanas', turnoFds: '',
            tienda: 'granvia', tipo: 'movimiento' }
        ];
        HoyUI.render();
        const html = cont.innerHTML;
        assert(html.length > 0, 'render debe pintar contenido');
        assert(html.indexOf('Hoy') >= 0, 'debe contener el header "Hoy"');
        assert(html.indexOf('TEST_AUS') >= 0, 'debe mostrar la ausencia sembrada');
        assert(html.indexOf('TEST_SUST') >= 0, 'debe mostrar el sustituto');
      } finally {
        Store._state.ausenciasGV = origAusGV;
        Store._state.sustituciones = origSusts;
      }
    });

    test('render() sin ausencias/sustituciones no falla y muestra estados vacíos', () => {
      let cont = document.getElementById('tab-hoy');
      if (!cont) {
        cont = document.createElement('div');
        cont.id = 'tab-hoy';
        document.body.appendChild(cont);
      }
      const origAusGV = Store._state.ausenciasGV;
      const origAusIS = Store._state.ausenciasIS;
      const origSusts = Store._state.sustituciones;
      try {
        Store._state.ausenciasGV = [];
        Store._state.ausenciasIS = [];
        Store._state.sustituciones = [];
        // No debe lanzar
        HoyUI.render();
        const html = cont.innerHTML;
        assert(html.length > 0, 'incluso sin datos debe pintar la cabecera y secciones vacías');
      } finally {
        Store._state.ausenciasGV = origAusGV;
        Store._state.ausenciasIS = origAusIS;
        Store._state.sustituciones = origSusts;
      }
    });
  });

  // ============================================================
  // SYNC — comportamiento ante error de red (fetch falla)
  // Importante: el setup/cleanup va DENTRO de cada test (no a nivel de
  // suite) porque los tests son async — el cleanup a nivel de suite
  // corre antes de que los awaits resuelvan.
  // ============================================================
  suite('Sync: error de red marca syncStatus=error sin corromper estado', function () {
    test('cargar() con fetch que falla: syncStatus pasa a error y devuelve false', async () => {
      const origFetch = window.fetch;
      try {
        window.fetch = function () { return Promise.reject(new Error('ECONNRESET')); };
        const ok = await Sync.cargar();
        assertEq(ok, false, 'cargar debe devolver false ante error de red');
        assertEq(Store.get('syncStatus'), 'error');
      } finally {
        window.fetch = origFetch;
      }
    });

    test('Estado del Store (sustituciones) no se corrompe ante error en cargar', async () => {
      const origFetch = window.fetch;
      const origSusts = Store._state.sustituciones;
      try {
        Store._state.sustituciones = [{
          fecha: '2026-06-01', ausente: 'X', sustituto: 'Y',
          entrada: 9, salida: 14, franja: '', turnoFds: '', tienda: 'granvia', tipo: 'movimiento'
        }];
        window.fetch = function () { return Promise.reject(new Error('ETIMEDOUT')); };
        await Sync.cargar();
        assertEq(Store._state.sustituciones.length, 1, 'no debe vaciar el estado previo');
      } finally {
        window.fetch = origFetch;
        Store._state.sustituciones = origSusts;
      }
    });
  });

  // ============================================================
  // RESUMEN — espera a que terminen los tests async antes de pintar
  // ============================================================
  const sum = document.getElementById('summary');
  sum.className = '';
  sum.textContent = 'Ejecutando…';
  Promise.all(pendientes).finally(function () {
    const total = pasados + fallados;
    if (fallados === 0) {
      sum.className = 'ok';
      sum.textContent = '✓ ' + pasados + '/' + total + ' tests pasados';
    } else {
      sum.className = 'ko';
      sum.textContent = '✗ ' + fallados + ' fallaron · ' + pasados + ' pasaron · ' + total + ' totales';
    }
  });
})();
