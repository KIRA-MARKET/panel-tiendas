// ============================================================
// YOLANDA HP — tests.js
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

    test('Asignar requiere estar inscrito', () => {
      Festivos.toggleAsignado(id, 'granvia', 'SARA'); // no está inscrito
      assert(!Festivos.getById(id).asignados.granvia.includes('SARA'));
    });

    test('Asignar a inscrito funciona', () => {
      Festivos.toggleAsignado(id, 'granvia', 'EVA');
      assert(Festivos.getById(id).asignados.granvia.includes('EVA'));
    });

    test('Desinscribir limpia la asignación', () => {
      Festivos.toggleInscrito(id, 'granvia', 'EVA');
      const fr = Festivos.getById(id);
      assert(!fr.inscritos.granvia.includes('EVA'));
      assert(!fr.asignados.granvia.includes('EVA'));
    });

    test('Recuento cuenta asignaciones de ambas tiendas', () => {
      Festivos.toggleInscrito(id, 'granvia', 'EVA');
      Festivos.toggleAsignado(id, 'granvia', 'EVA');
      const f2 = Festivos.getAño(2030)[1];
      Festivos.toggleInscrito(f2.id, 'isabel', 'EVA');
      Festivos.toggleAsignado(f2.id, 'isabel', 'EVA');
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
    test('9-15 → descarga + mañanas + tardes (cubre porción de cada)', () => {
      assertDeep(f(9, 15), ['descarga', 'mañanas', 'tardes']);
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
