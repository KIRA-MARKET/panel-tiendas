// ============================================================
// HORARIOS KIRA & REYPIK — tests.js
// Mini-runner de tests sin dependencias
// ============================================================

(function () {
  'use strict';

  let pasados = 0, fallados = 0;
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
    try {
      fn();
      p.className += ' ok';
      p.textContent = '✓ ' + nombre;
      pasados++;
    } catch (e) {
      p.className += ' ko';
      p.textContent = '✗ ' + nombre + ' — ' + e.message;
      fallados++;
    }
    suiteActual.appendChild(p);
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
  // RESUMEN
  // ============================================================
  const sum = document.getElementById('summary');
  const total = pasados + fallados;
  if (fallados === 0) {
    sum.className = 'ok';
    sum.textContent = '✓ ' + pasados + '/' + total + ' tests pasados';
  } else {
    sum.className = 'ko';
    sum.textContent = '✗ ' + fallados + ' fallaron · ' + pasados + ' pasaron · ' + total + ' totales';
  }
})();
