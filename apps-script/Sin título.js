// Funciones ejecutables directamente desde el editor
function actualizarHorariosIS() { crearHorariosIS(SpreadsheetApp.getActiveSpreadsheet()); }
function actualizarRotacionesFdS() { crearRotacionesFdS(SpreadsheetApp.getActiveSpreadsheet()); }

/**
 * Migración 2026-04-28: alta de FRAN en Isabel + traslado V de EDU/VANESA.
 * Parche idempotente sobre HorariosIS sin tocar el resto de filas.
 * Cambios:
 *   - VANESA LXV [6,10] → LX [6,10] + V [5,9].
 *   - EDU    LXV [6,10] → LX [6,10] + V [5,9].
 *   - +FRAN  LXV [7.5,11.5] y MJ [7.5,10.5] (contrato 18h).
 */
function migrarHorariosIS_FRAN_2026_04_28() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('HorariosIS');
  if (!sheet) throw new Error('HorariosIS no existe');
  var rng = sheet.getDataRange();
  var data = rng.getValues();
  if (data.length < 2) throw new Error('HorariosIS vacío');
  var headers = data[0];
  var rows = data.slice(1);

  var iTipo = headers.indexOf('tipo');
  var iDia = headers.indexOf('dia');
  var iEmp = headers.indexOf('empleado');
  var iEnt = headers.indexOf('entrada');
  var iSal = headers.indexOf('salida');
  var iNot = headers.indexOf('notas');
  if (iTipo<0||iDia<0||iEmp<0||iEnt<0||iSal<0||iNot<0) throw new Error('Cabecera HorariosIS inesperada');

  // Paso 1: renombrar filas LXV→LX para EDU y VANESA si todavía existen.
  var cambiados = 0;
  for (var i=0; i<rows.length; i++) {
    var row = rows[i];
    if (row[iTipo] === 'fijo' && row[iDia] === 'LXV' &&
        (row[iEmp] === 'EDU' || row[iEmp] === 'VANESA')) {
      row[iDia] = 'LX';
      cambiados++;
    }
  }

  // Paso 2: añadir filas nuevas si no existen ya (idempotente).
  function existe(tipo, dia, emp) {
    for (var k=0; k<rows.length; k++) {
      if (rows[k][iTipo] === tipo && rows[k][iDia] === dia && rows[k][iEmp] === emp) return true;
    }
    return false;
  }
  function vacia() { var a = []; for (var c=0; c<headers.length; c++) a.push(''); return a; }
  function meter(tipo, dia, emp, ent, sal, notas) {
    if (existe(tipo, dia, emp)) return false;
    var a = vacia();
    a[iTipo] = tipo; a[iDia] = dia; a[iEmp] = emp;
    a[iEnt] = ent; a[iSal] = sal; a[iNot] = notas || '';
    rows.push(a);
    return true;
  }
  var añadidos = 0;
  if (meter('fijo','V','EDU',5,9,'Viernes entrada 5h por descarga')) añadidos++;
  if (meter('fijo','V','VANESA',5,9,'Viernes entrada 5h por descarga')) añadidos++;
  if (meter('fijo','LXV','FRAN',7.5,11.5,'Contrato 18h — descarga Isabel')) añadidos++;
  if (meter('fijo','MJ','FRAN',7.5,10.5,'Contrato 18h — descarga Isabel')) añadidos++;

  // Reescribir
  sheet.getRange(2, 1, sheet.getLastRow()-1 || 1, headers.length).clearContent();
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  SpreadsheetApp.flush();
  Logger.log('Migración FRAN 2026-04-28: ' + cambiados + ' filas LXV→LX, ' + añadidos + ' filas nuevas');
  return { cambiados: cambiados, añadidos: añadidos };
}

function inicializarTodo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  crearEmpleadosGV(ss);
  crearEmpleadosIS(ss);
  crearHorariosGV(ss);
  crearHorariosIS(ss);
  crearRotacionesFdS(ss);
  crearAusencias(ss);
  crearSustituciones(ss);
  crearModificaciones(ss);
  crearFaltas(ss);
  crearIntercambios(ss);
  var hoja1 = ss.getSheetByName('Hoja 1');
  if (hoja1 && ss.getSheets().length > 1) {
    ss.deleteSheet(hoja1);
  }
  SpreadsheetApp.flush();
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  } else {
    sheet.clearContents();
  }
  return sheet;
}

function writeData(ss, sheetName, headers, rows) {
  var sheet = getOrCreateSheet(ss, sheetName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

// Bootstrap de hojas: solo crea encabezados. Los datos de empleados los
// gestiona Nacho desde la app (UI → Sheets vía syncEmpleados). Antes había
// aquí filas hardcoded con DNIs/telefonos/emails reales; se eliminaron tras
// la auditoría 2026-04-25 por LOPD. Si necesitas re-sembrar la hoja desde
// cero, ejecuta inicializarTodo() y luego mete los empleados desde la UI.
function crearEmpleadosGV(ss) {
  var h = ['alias','nombre','apellidos','dni','telefono','email','fechaAlta','contrato','tienda','franja','restriccion','color','horasLV','horasFDS'];
  writeData(ss, 'EmpleadosGV', h, []);
}

function crearEmpleadosIS(ss) {
  var h = ['alias','nombre','apellidos','dni','telefono','email','fechaAlta','contrato','tienda','franja','restriccion','color','horasLV','horasFDS'];
  writeData(ss, 'EmpleadosIS', h, []);
}

function crearHorariosGV(ss) {
  var h = ['semana','dia','empleado','entrada','salida'];
  var r = [
    ['A','LJ','LETI',6,10.5],
    ['A','LJ','ANTONIO',6,9.5],
    ['A','LJ','EVA',7,15],
    ['A','LJ','SARA',9,14.5],
    ['A','LJ','ELI',9.5,15],
    ['A','LJ','EDU',10.5,15],
    ['A','LJ','VANESA',10.5,14],
    ['A','LJ','SILVIA',14,18.5],
    ['A','LJ','MORILLA',15,18.5],
    ['A','LJ','FRANCIS',16.75,22.25],
    ['A','LJ','ALEX',17.75,22.25],
    ['A','LJ','ABDEL',17.75,22.25],
    ['A','LJ','DAVID',17.75,22.25],
    ['A','V','LETI',5,9.5],
    ['A','V','ANTONIO',5,9.5],
    ['A','V','EVA',7,15],
    ['A','V','SARA',9,14.5],
    ['A','V','ELI',9.5,15],
    ['A','V','EDU',10.5,15],
    ['A','V','VANESA',10.5,14],
    ['A','V','SILVIA',14,18.5],
    ['A','V','MORILLA',15,18.5],
    ['A','V','FRANCIS',16.75,22.25],
    ['A','V','ALEX',17.75,22.25],
    ['A','V','ABDEL',17.75,22.25],
    ['A','V','DAVID',17.75,22.25],
    ['B','LJ','DAVID',6,10.5],
    ['B','LJ','ANTONIO',6,9.5],
    ['B','LJ','EVA',7,15],
    ['B','LJ','SARA',9,14.5],
    ['B','LJ','ELI',9.5,15],
    ['B','LJ','EDU',10.5,15],
    ['B','LJ','VANESA',10.5,14],
    ['B','LJ','SILVIA',14,18.5],
    ['B','LJ','MORILLA',15,18.5],
    ['B','LJ','FRANCIS',16.75,22.25],
    ['B','LJ','ALEX',17.75,22.25],
    ['B','LJ','ABDEL',17.75,22.25],
    ['B','LJ','LETI',17.75,22.25],
    ['B','V','DAVID',5,9.5],
    ['B','V','ANTONIO',5,9.5],
    ['B','V','EVA',7,15],
    ['B','V','SARA',9,14.5],
    ['B','V','ELI',9.5,15],
    ['B','V','EDU',10.5,15],
    ['B','V','VANESA',10.5,14],
    ['B','V','SILVIA',14,18.5],
    ['B','V','MORILLA',15,18.5],
    ['B','V','FRANCIS',16.75,22.25],
    ['B','V','ALEX',17.75,22.25],
    ['B','V','ABDEL',17.75,22.25],
    ['B','V','LETI',17.75,22.25]
  ];
  writeData(ss, 'HorariosGV', h, r);
}

function crearHorariosIS(ss) {
  var h = ['tipo','dia','empleado','entrada','salida','notas'];
  var r = [
    ['fijo','LV','SILVIA',7,10,''],
    ['fijo','LV','ANTONIO',10,13,''],
    ['fijo','LV','ABDEL',14.5,17.5,''],
    ['fijo','LV','ALEX',14.75,17.75,''],
    // VANESA: L-X 6-10, M-J 7-10, V 5-9 (entrada adelantada por descarga V).
    ['fijo','LX','VANESA',6,10,''],
    ['fijo','MJ','VANESA',7,10,''],
    ['fijo','V','VANESA',5,9,'Viernes entrada 5h por descarga'],
    // EDU: L-X 6-10, V 5-9 (entrada adelantada por descarga V).
    ['fijo','LX','EDU',6,10,''],
    ['fijo','V','EDU',5,9,'Viernes entrada 5h por descarga'],
    // Rotación quincenal A/B descarga⇄cierre (FRAN/ANDRÉS, 18h cada uno):
    //   sem A → FRAN descarga + ANDRÉS cierre.
    //   sem B → ANDRÉS descarga + FRAN cierre.
    // Cierre = horario antiguo de MORILLA (de baja). Sustituye al fijo previo
    // de FRAN y al reemplazo MORILLA→ANDRÉS (cerrado el 03-05-2026).
    ['rotacion_dc','A_LXV','FRAN',  7.5, 11.5,'descarga'],
    ['rotacion_dc','A_MJ', 'FRAN',  7.5, 10.5,'descarga'],
    ['rotacion_dc','A_LJ', 'ANDRÉS',18.75,22.25,'cierre'],
    ['rotacion_dc','A_V',  'ANDRÉS',18.25,22.25,'cierre'],
    ['rotacion_dc','B_LXV','ANDRÉS',7.5, 11.5,'descarga'],
    ['rotacion_dc','B_MJ', 'ANDRÉS',7.5, 10.5,'descarga'],
    ['rotacion_dc','B_LJ', 'FRAN',  18.75,22.25,'cierre'],
    ['rotacion_dc','B_V',  'FRAN',  18.25,22.25,'cierre'],
    ['compartido','LXV','DAVID',11,15,'compartido con GranVia'],
    ['compartido','MJV','LETI',11,15,'compartido con GranVia'],
    ['fijo','L','ABEL',18.25,22.25,'solo Lunes'],
    ['fijo','MXJV','ANDREA',18.25,22.25,'M X J V'],
    ['rotacion','sem1','CAROLINA',10,14.5,'manana'],
    ['rotacion','sem1','ALVARO',15,19.5,'tarde'],
    ['rotacion','sem1','CECI',17.75,22.25,'cierre'],
    ['rotacion','sem2','ALVARO',10,14.5,'manana'],
    ['rotacion','sem2','CAROLINA',15,19.5,'tarde'],
    ['rotacion','sem2','CECI',17.75,22.25,'cierre'],
    ['rotacion','sem3','CAROLINA',10,14.5,'manana'],
    ['rotacion','sem3','CECI',15,19.5,'tarde'],
    ['rotacion','sem3','ALVARO',17.75,22.25,'cierre'],
    ['rotacion','sem4','CECI',10,14.5,'manana'],
    ['rotacion','sem4','CAROLINA',15,19.5,'tarde'],
    ['rotacion','sem4','ALVARO',17.75,22.25,'cierre']
  ];
  writeData(ss, 'HorariosIS', h, r);
}

function crearRotacionesFdS(ss) {
  var h = ['tienda','tipo','parametro','valor','notas'];
  var r = [
    ['granvia','fijo','ANTONIO','SAB_M|5|12.5','Sabado manana fijo'],
    ['granvia','fijo','ELI','DOM_M|7.25|14.75','Domingo manana fijo'],
    ['granvia','fijo','ALFREDO','SAB_T|14.75|22.25','Sabado tarde fijo'],
    ['granvia','fijo','ALEX VERA','SAB_T|14.75|22.25','Sabado tarde fijo'],
    ['granvia','fijo','ALFREDO','DOM_T|14.75|22.25','Domingo tarde fijo'],
    ['granvia','fijo','ALEX VERA','DOM_T|14.75|22.25','Domingo tarde fijo'],
    ['granvia','descarga_abc','orden','DAVID,LETI,EDU','Ciclo 3: SAB_M descarga DOM_T SAB_T'],
    ['granvia','descarga_abc','SAB_M_horario','5|12.5','Horario descarga sabado'],
    ['granvia','descarga_abc','DOM_T_horario','14.75|22.25',''],
    ['granvia','descarga_abc','SAB_T_horario','14.75|22.25',''],
    ['granvia','rotacion_7','orden','FRANCIS,ALEX,SILVIA,SARA,MORILLA,VANESA,ABDEL','Ciclo 7'],
    ['granvia','rotacion_7','SAB_M_horario','7.25|14.75',''],
    ['granvia','rotacion_7','DOM_M_horario','7.25|14.75',''],
    ['granvia','rotacion_7','DOM_T_horario','14.75|22.25',''],
    ['granvia','rotacion_7','SAB_T_horario','14.75|22.25',''],
    ['granvia','config','fecha_inicio','2026-02-28','Fecha base ciclos'],
    ['isabel','grupoA','orden','CAROLINA,ALVARO,CECI,ANDREA','Cada uno 1 turno por FdS'],
    ['isabel','grupoA','sem1','SAB_M:CAROLINA|SAB_T:ALVARO|DOM_M:CECI|DOM_T:ANDREA',''],
    ['isabel','grupoA','sem2','SAB_M:ALVARO|SAB_T:CECI|DOM_M:ANDREA|DOM_T:CAROLINA',''],
    ['isabel','grupoA','sem3','SAB_M:CECI|SAB_T:ANDREA|DOM_M:CAROLINA|DOM_T:ALVARO',''],
    ['isabel','grupoA','sem4','SAB_M:ANDREA|SAB_T:CAROLINA|DOM_M:ALVARO|DOM_T:CECI',''],
    ['isabel','grupoA','sem5','SAB_M:CAROLINA|SAB_T:ALVARO|DOM_M:CECI|DOM_T:ANDREA',''],
    ['isabel','grupoA','sem6','SAB_M:ALVARO|SAB_T:CECI|DOM_M:ANDREA|DOM_T:CAROLINA',''],
    ['isabel','grupoA','sem7','SAB_M:CECI|SAB_T:ANDREA|DOM_M:CAROLINA|DOM_T:ALVARO',''],
    ['isabel','grupoA','sem8','SAB_M:ANDREA|SAB_T:CAROLINA|DOM_M:ALVARO|DOM_T:CECI',''],
    ['isabel','grupoA','horario_m','7.25|14.75','Manana'],
    ['isabel','grupoA','horario_t','14.75|22.25','Tarde'],
    ['isabel','grupoB','orden','M. CARMEN,ABEL,GONZALO,RUBEN','Cada uno S+D'],
    ['isabel','grupoB','sem1','SAB_M:M. CARMEN|SAB_T:ABEL,GONZALO,RUBEN|DOM_M:GONZALO|DOM_T:M. CARMEN,ABEL,RUBEN',''],
    ['isabel','grupoB','sem2','SAB_M:ABEL|SAB_T:M. CARMEN,GONZALO,RUBEN|DOM_M:RUBEN|DOM_T:M. CARMEN,ABEL,GONZALO',''],
    ['isabel','grupoB','sem3','SAB_M:GONZALO|SAB_T:M. CARMEN,ABEL,RUBEN|DOM_M:M. CARMEN|DOM_T:ABEL,GONZALO,RUBEN',''],
    ['isabel','grupoB','sem4','SAB_M:RUBEN|SAB_T:M. CARMEN,ABEL,GONZALO|DOM_M:ABEL|DOM_T:M. CARMEN,GONZALO,RUBEN',''],
    ['isabel','grupoB','sem5','SAB_M:M. CARMEN|SAB_T:ABEL,GONZALO,RUBEN|DOM_M:RUBEN|DOM_T:M. CARMEN,ABEL,GONZALO',''],
    ['isabel','grupoB','sem6','SAB_M:ABEL|SAB_T:M. CARMEN,GONZALO,RUBEN|DOM_M:GONZALO|DOM_T:M. CARMEN,ABEL,RUBEN',''],
    ['isabel','grupoB','sem7','SAB_M:GONZALO|SAB_T:M. CARMEN,ABEL,RUBEN|DOM_M:ABEL|DOM_T:M. CARMEN,GONZALO,RUBEN',''],
    ['isabel','grupoB','sem8','SAB_M:RUBEN|SAB_T:M. CARMEN,ABEL,GONZALO|DOM_M:M. CARMEN|DOM_T:ABEL,GONZALO,RUBEN',''],
    ['isabel','grupoB','horario_m','7.25|14.75','Manana'],
    ['isabel','grupoB','horario_t','14.75|22.25','Tarde'],
    ['isabel','config','fecha_inicio','2026-02-28','Fecha base ciclos'],
    ['granvia','minimos_lv','valores','descarga:2|mananas:3|tardes:2|cierre:3',''],
    ['granvia','minimos_fds','valores','SAB_M:4|SAB_T:3|DOM_M:2|DOM_T:4',''],
    ['isabel','minimos_lv','valores','descarga:2|mananas:3|tardes:2|cierre:2',''],
    ['isabel','minimos_fds','valores','SAB_M:2|SAB_T:3|DOM_M:2|DOM_T:3','']
  ];
  writeData(ss, 'RotacionesFdS', h, r);
}

function crearAusencias(ss) {
  var h = ['tienda','empleado','tipo','desde','hasta','motivo'];
  writeData(ss, 'Ausencias', h, []);
}

function crearSustituciones(ss) {
  var h = ['tienda','fecha','ausente','sustituto','entrada','salida','franja','turnoFds'];
  writeData(ss, 'Sustituciones', h, []);
}

function crearModificaciones(ss) {
  var h = ['tienda','empleado','fecha','turnoFds','entradaOriginal','salidaOriginal','nuevaEntrada','nuevaSalida','motivo'];
  writeData(ss, 'Modificaciones', h, []);
}

function crearFaltas(ss) {
  var h = ['tienda','empleado','fecha','tipo','motivo'];
  writeData(ss, 'Faltas', h, []);
}

function crearIntercambios(ss) {
  var h = ['fecha','tienda','empleadoA','turnoA','empleadoB','turnoB','motivo'];
  writeData(ss, 'Intercambios', h, []);
}

var HOJAS = {
  empleadosGV: 'EmpleadosGV',
  empleadosIS: 'EmpleadosIS',
  horariosGV: 'HorariosGV',
  horariosIS: 'HorariosIS',
  rotaciones: 'RotacionesFdS',
  ausencias: 'Ausencias',
  sustituciones: 'Sustituciones',
  modificaciones: 'Modificaciones',
  faltas: 'Faltas',
  historialPropuestas: 'HistorialPropuestas',
  descartadas: 'Descartadas',
  festivos: 'Festivos',
  decisiones: 'Decisiones',
  reemplazos: 'Reemplazos',
  intercambios: 'Intercambios'
};

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

// Verifica que la request lleve el token compartido. El token vive en
// PropertiesService.getScriptProperties (clave 'API_TOKEN'); se mete a
// mano en el editor web (Project Settings → Script properties) y NUNCA
// se commitea a este archivo. Si la propiedad no está, deja pasar todo
// (modo "auth desactivada") para no romper despliegues anteriores en
// transición; en cuanto se mete la propiedad, queda activa.
function _verificarToken(e) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) return { ok: true, motivo: 'no-token-configured' };
  var got = (e && e.parameter) ? e.parameter.token : '';
  if (got && got === expected) return { ok: true };
  return { ok: false };
}

function handleRequest(e) {
  try {
    var auth = _verificarToken(e);
    if (!auth.ok) {
      // Devolvemos error en el JSON (Apps Script no permite status HTTP custom).
      // El cliente reconoce 'Unauthorized' y abre modal pidiendo el token.
      return jsonResp({ error: 'Unauthorized', code: 401 });
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;
    if (action === 'readAll') {
      var contenido = readAll(ss);
      contenido._versions = _getAllVersions();
      return jsonResp(contenido);
    }
    if (action === 'save') {
      var data = JSON.parse(e.postData.contents);
      // Optimistic concurrency: el cliente nos dice qué versión esperaba
      // (la que tenía cuando hizo el cambio). Si la actual ya es mayor,
      // alguien guardó por medio → conflicto, no escribimos.
      // expectedVersion === undefined/null = cliente legacy (anterior
      // al deploy de versionado): aceptamos por compatibilidad. En
      // cuanto recargue verá _versions y empezará a validar.
      if (data.expectedVersion != null) {
        var current = _getVersion(data.sheet);
        if (current !== data.expectedVersion) {
          return jsonResp({
            error: 'Conflict', code: 409, sheet: data.sheet,
            expectedVersion: data.expectedVersion, currentVersion: current
          });
        }
      }
      writeSheet(ss, HOJAS[data.sheet], data.headers, data.rows);
      var newVersion = _bumpVersion(data.sheet);
      return jsonResp({ok: true, sheet: data.sheet, rows: data.rows.length, newVersion: newVersion});
    }
    if (action === 'saveAll') {
      var data = JSON.parse(e.postData.contents);
      var newVersions = {};
      for (var key in data) {
        if (HOJAS[key] && data[key].headers && data[key].rows) {
          writeSheet(ss, HOJAS[key], data[key].headers, data[key].rows);
          newVersions[key] = _bumpVersion(key);
        }
      }
      return jsonResp({ok: true, newVersions: newVersions});
    }
    return jsonResp({error: 'Accion no reconocida: ' + action});
  } catch(err) {
    return jsonResp({error: err.toString()});
  }
}

function readAll(ss) {
  var result = {};
  for (var key in HOJAS) {
    result[key] = readSheet(ss, HOJAS[key]);
  }
  return result;
}

function readSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        var yy = val.getFullYear(), mm = val.getMonth()+1, dd = val.getDate();
        val = yy + '-' + (mm<10?'0':'') + mm + '-' + (dd<10?'0':'') + dd;
      } else if (typeof val === 'string' && val !== '' && !isNaN(val)) {
        val = Number(val);
      }
      obj[headers[j]] = val;
    }
    rows.push(obj);
  }
  return rows;
}

// Escritura "casi-atómica": construye el nuevo bloque entero en memoria y
// lo escribe con UN solo setValues. Sólo después limpia las filas sobrantes
// si la nueva escritura es más corta que la previa.
//
// Si el cliente pierde la conexión a mitad del save, lo peor que puede
// pasar es que queden filas viejas residuales por debajo de las nuevas
// (datos válidos), no la hoja vacía como hacía clearContents+setValues.
function writeSheet(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Construir todo el bloque (cabecera + filas) en memoria.
  var allRows = [headers];
  if (rows && rows.length > 0) {
    for (var i = 0; i < rows.length; i++) {
      var obj = rows[i];
      var fila = [];
      for (var j = 0; j < headers.length; j++) {
        var v = obj[headers[j]];
        fila.push((v === undefined || v === null) ? '' : v);
      }
      allRows.push(fila);
    }
  }

  // Sobreescritura en una sola operación. Si falla aquí, los datos previos
  // siguen intactos: no se ha hecho clearContents.
  sheet.getRange(1, 1, allRows.length, headers.length).setValues(allRows);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  // Limpiar el "tail": filas que sobraban de la escritura anterior.
  // Si nos interrumpen entre el setValues y este clear, lo peor es tener
  // filas viejas tras las nuevas — datos válidos, no hoja vacía.
  var prevLastRow = sheet.getLastRow();
  if (prevLastRow > allRows.length) {
    var sobrante = prevLastRow - allRows.length;
    var ancho = Math.max(headers.length, sheet.getLastColumn());
    sheet.getRange(allRows.length + 1, 1, sobrante, ancho).clearContent();
  }
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Versionado optimista por hoja para detectar race conditions
// inter-cliente (dos pestañas guardando en paralelo). La versión se
// guarda en DocumentProperties como entero monotónico por sheet key.
function _getVersion(sheetKey) {
  var v = PropertiesService.getDocumentProperties().getProperty('v_' + sheetKey);
  return v ? parseInt(v, 10) : 0;
}

function _bumpVersion(sheetKey) {
  var nv = _getVersion(sheetKey) + 1;
  PropertiesService.getDocumentProperties().setProperty('v_' + sheetKey, String(nv));
  return nv;
}

function _getAllVersions() {
  var props = PropertiesService.getDocumentProperties().getProperties();
  var out = {};
  for (var k in props) {
    if (k.indexOf('v_') === 0) out[k.substring(2)] = parseInt(props[k], 10);
  }
  return out;
}
