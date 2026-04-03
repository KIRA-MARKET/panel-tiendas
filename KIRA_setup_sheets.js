// =====================================================================
// KIRA - Script de inicialización de Google Sheets
// =====================================================================
// INSTRUCCIONES:
// 1. Ve a https://sheets.google.com y crea una hoja nueva llamada "KIRA Base de Datos"
// 2. Ve a Extensiones > Apps Script
// 3. Borra el código por defecto y pega TODO este archivo
// 4. Guarda (Ctrl+S)
// 5. Ejecuta la función "inicializarTodo" (selecciónala en el desplegable y dale al ▶️)
// 6. La primera vez te pedirá permisos - acepta todo
// 7. Espera ~10 segundos. Verás las 9 pestañas creadas con todos los datos.
//
// Después de ejecutar inicializarTodo, implementa como Web App:
// - Implementar > Nueva implementación > Aplicación web
// - Ejecutar como: Tu cuenta
// - Quién tiene acceso: Cualquier persona
// - Copia la URL resultante
// =====================================================================

// ===================== INICIALIZACIÓN =====================

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

  // Eliminar la hoja por defecto "Hoja 1" si existe
  var hoja1 = ss.getSheetByName('Hoja 1');
  if (hoja1 && ss.getSheets().length > 1) {
    ss.deleteSheet(hoja1);
  }

  SpreadsheetApp.flush();
  Logger.log('✅ Inicialización completa: 9 pestañas creadas con todos los datos.');
}

// ===================== UTILIDADES =====================

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

// ===================== EMPLEADOS GRAN VÍA =====================

function crearEmpleadosGV(ss) {
  var headers = ['alias','nombre','apellidos','dni','telefono','email','fechaAlta','contrato','tienda','franja','restriccion','color','horasGV','horasIS','horasLV','horasFDS','fdsGV','fdsIS','fechaAltaGV','fechaAltaIS'];
  var rows = [
    ['EVA','Eva','Martínez','12345678A','612001001','eva@kira.com','2018-03-15',40,'granvia','mañanas','max-15','#2e7d32','','','','','','','',''],
    ['SARA','Sara','López','23456789B','612002002','sara@kira.com','2019-06-01',35,'granvia','mañanas','solo-mañanas','#2e7d32','','','','','','','',''],
    ['ELI','Elisabeth','Fernández','34567890C','612003003','eli@kira.com','2019-09-15',35,'granvia','mañanas','solo-mañanas','#2e7d32','','','','','','','',''],
    ['FRANCIS','Francisco','Pérez','45678901D','612004004','francis@kira.com','2020-01-10',35,'granvia','cierre','solo-cierre','#6a1b9a','','','','','','','',''],
    ['EDU','Eduardo','González','56789012E','612005005','edu@kira.com','2020-04-20',30,'ambas','mañanas','max-15','#2e7d32',30,12,'','','','','2020-04-20','2020-06-01'],
    ['DAVID','David','Rodríguez','67890123F','612006006','david@kira.com','2020-07-01',30,'ambas','rotativo','','#2c5aa0',30,12,'','','','','2020-07-01','2020-09-01'],
    ['LETI','Leticia','Jiménez','78901234G','612007007','leti@kira.com','2020-07-01',30,'ambas','rotativo','','#2c5aa0',30,12,'','','','','2020-07-01','2020-09-01'],
    ['SILVIA','Silvia','Hernández','89012345H','612008008','silvia@kira.com','2021-02-15',30,'ambas','tardes','','#e65100',30,15,'','','','','2021-02-15','2021-04-01'],
    ['ALEX','Alejandro','Muñoz','90123456I','612009009','alex@kira.com','2021-05-01',30,'ambas','cierre','','#6a1b9a',30,15,'','','','','2021-05-01','2021-07-01'],
    ['ABDEL','Abdel','Benali','01234567J','612010010','abdel@kira.com','2021-09-01',30,'ambas','cierre','','#6a1b9a',30,15,'','','','','2021-09-01','2021-11-01'],
    ['ANTONIO','Antonio','Serrano','11223344K','612011011','antonio@kira.com','2019-01-15',25,'ambas','descarga','solo-descarga','#2c5aa0',25,15,'','','','','2019-01-15','2019-03-01'],
    ['VANESA','Vanesa','Ortega','22334455L','612012012','vanesa@kira.com','2022-03-01',25,'ambas','mañanas','','#2e7d32',25,18,'','','','','2022-03-01','2022-05-01'],
    ['MORILLA','José','Morilla','33445566M','612013013','morilla@kira.com','2022-06-15',25,'ambas','tardes','','#e65100',25,18,'','','','','2022-06-15','2022-08-01'],
    ['ALFREDO','Alfredo','García','44556677N','612014014','alfredo@kira.com','2023-01-10',15,'granvia','tardes','','#e65100','','','','','','','',''],
    ['ALEXVERA','Alejandro','Vera','55667788O','612015015','alexvera@kira.com','2023-03-01',15,'granvia','tardes','','#e65100','','','','','','','','']
  ];
  writeData(ss, 'EmpleadosGV', headers, rows);
}

// ===================== EMPLEADOS ISABEL =====================

function crearEmpleadosIS(ss) {
  var headers = ['alias','nombre','apellidos','dni','telefono','email','fechaAlta','contrato','tienda','franja','restriccion','color','horasLV','horasFDS'];
  var rows = [
    ['CAROLINA','Carolina','Ruiz','66778899P','612020001','carolina@reypik.com','2021-01-15',30,'isabel','mañanas','','#2e7d32','',''],
    ['ALVARO','Álvaro','Sánchez','77889900Q','612020002','alvaro@reypik.com','2021-03-01',30,'isabel','tardes','','#e65100','',''],
    ['CECI','Cecilia','Martín','88990011R','612020003','ceci@reypik.com','2021-06-01',30,'isabel','cierre','','#6a1b9a','',''],
    ['ANDREA','Andrea','López','99001122S','612020004','andrea@reypik.com','2022-02-15',23.5,'isabel','cierre','','#6a1b9a','',''],
    ['ABEL','Abel','Vera','00112233T','612020005','abel@reypik.com','2022-05-01',19,'isabel','cierre','','#6a1b9a','',''],
    ['MARICARMEN','María Carmen','Ortiz','11223344U','612020006','maricarmen@reypik.com','2022-09-01',15,'isabel','mañanas','','#2e7d32','',''],
    ['RUBEN','Rubén','García','22334455V','612020007','ruben@reypik.com','2023-01-15',15,'isabel','tardes','','#e65100','',''],
    ['GONZALO','Gonzalo','Fernández','33445566W','612020008','gonzalo@reypik.com','2023-04-01',15,'isabel','tardes','','#e65100','','']
  ];
  writeData(ss, 'EmpleadosIS', headers, rows);
}

// ===================== HORARIOS GRAN VÍA (Semana A/B × LJ/V) =====================

function crearHorariosGV(ss) {
  var headers = ['semana','dia','empleado','entrada','salida'];
  var rows = [
    // Semana A - Lunes a Jueves
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
    // Semana A - Viernes
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
    // Semana B - Lunes a Jueves
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
    // Semana B - Viernes
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
  writeData(ss, 'HorariosGV', headers, rows);
}

// ===================== HORARIOS ISABEL (L-V con lógica de rotación) =====================

function crearHorariosIS(ss) {
  var headers = ['tipo','dia','empleado','entrada','salida','notas'];
  var rows = [
    // Fijos todos los días L-V
    ['fijo','LV','SILVIA',7,10,''],
    ['fijo','LV','ANTONIO',10,13,''],
    ['fijo','LV','ABDEL',14.5,17.5,''],
    ['fijo','LV','ALEX',14.75,17.75,''],
    ['fijo','LV','MORILLA',18.75,22.25,''],
    // VANESA: L,X,V distinto de M,J
    ['fijo','LXV','VANESA',6,10,''],
    ['fijo','MJ','VANESA',7,10,''],
    // EDU solo L,X,V
    ['fijo','LXV','EDU',6,10,''],
    // DAVID: L,X,V
    ['compartido','LXV','DAVID',11,15,'compartido con GranVía'],
    // LETI: M,J,V
    ['compartido','MJV','LETI',11,15,'compartido con GranVía'],
    // ABEL: L,V
    ['fijo','LV_ABEL','ABEL',18.25,22.25,'solo L y V'],
    // ANDREA: M,X,J
    ['fijo','MXJ','ANDREA',18.25,22.25,'solo M, X y J'],
    // Rotación Carolina/Alvaro/Ceci (ciclo 4 semanas)
    ['rotacion','sem1','CAROLINA',10,14.5,'mañana'],
    ['rotacion','sem1','ALVARO',15,19.5,'tarde'],
    ['rotacion','sem1','CECI',17.75,22.25,'cierre'],
    ['rotacion','sem2','ALVARO',10,14.5,'mañana'],
    ['rotacion','sem2','CAROLINA',15,19.5,'tarde'],
    ['rotacion','sem2','CECI',17.75,22.25,'cierre'],
    ['rotacion','sem3','CAROLINA',10,14.5,'mañana'],
    ['rotacion','sem3','CECI',15,19.5,'tarde'],
    ['rotacion','sem3','ALVARO',17.75,22.25,'cierre'],
    ['rotacion','sem4','CECI',10,14.5,'mañana'],
    ['rotacion','sem4','CAROLINA',15,19.5,'tarde'],
    ['rotacion','sem4','ALVARO',17.75,22.25,'cierre']
  ];
  writeData(ss, 'HorariosIS', headers, rows);
}

// ===================== ROTACIONES FDS =====================

function crearRotacionesFdS(ss) {
  var headers = ['tienda','tipo','parametro','valor','notas'];
  var rows = [
    // --- GRAN VÍA ---
    // Fijos FdS
    ['granvia','fijo','ANTONIO','SAB_M|5|13','Sábado mañana fijo'],
    ['granvia','fijo','ELI','DOM_M|7.25|14.75','Domingo mañana fijo'],
    ['granvia','fijo','ALFREDO','SAB_T|14.75|22.25','Sábado tarde fijo'],
    ['granvia','fijo','ALEXVERA','SAB_T|14.75|22.25','Sábado tarde fijo'],
    ['granvia','fijo','ALFREDO','DOM_T|14.75|22.25','Domingo tarde fijo'],
    ['granvia','fijo','ALEXVERA','DOM_T|14.75|22.25','Domingo tarde fijo'],

    // Rotación ABC (descarga) - ciclo 3
    ['granvia','descarga_abc','orden','DAVID,LETI,EDU','Ciclo 3: SAB_M(descarga)->DOM_T->SAB_T'],
    ['granvia','descarga_abc','SAB_M_horario','5|12.5','Horario descarga sábado'],
    ['granvia','descarga_abc','DOM_T_horario','14.75|22.25',''],
    ['granvia','descarga_abc','SAB_T_horario','14.75|22.25',''],

    // Rotación 1-7 - ciclo 7
    ['granvia','rotacion_7','orden','FRANCIS,ALEX,SILVIA,SARA,MORILLA,VANESA,ABDEL','Ciclo 7: SAB_M(2)->DOM_M(2)->DOM_T(2)->SAB_T(1)'],
    ['granvia','rotacion_7','SAB_M_horario','7.25|14.75',''],
    ['granvia','rotacion_7','DOM_M_horario','7.25|14.75',''],
    ['granvia','rotacion_7','DOM_T_horario','14.75|22.25',''],
    ['granvia','rotacion_7','SAB_T_horario','14.75|22.25',''],

    // Fecha inicio rotaciones GV
    ['granvia','config','fecha_inicio','2026-02-28','Fecha base para calcular ciclos'],

    // --- ISABEL ---
    // Grupo A (1 turno por FdS) - ciclo 8 semanas
    ['isabel','grupoA','orden','CAROLINA,ALVARO,CECI,ANDREA','Cada uno 1 turno por FdS'],
    ['isabel','grupoA','sem1','SAB_M:CAROLINA|SAB_T:ALVARO|DOM_M:CECI|DOM_T:ANDREA',''],
    ['isabel','grupoA','sem2','SAB_M:ALVARO|SAB_T:CECI|DOM_M:ANDREA|DOM_T:CAROLINA',''],
    ['isabel','grupoA','sem3','SAB_M:CECI|SAB_T:ANDREA|DOM_M:CAROLINA|DOM_T:ALVARO',''],
    ['isabel','grupoA','sem4','SAB_M:ANDREA|SAB_T:CAROLINA|DOM_M:ALVARO|DOM_T:CECI',''],
    ['isabel','grupoA','sem5','SAB_M:CAROLINA|SAB_T:ALVARO|DOM_M:CECI|DOM_T:ANDREA',''],
    ['isabel','grupoA','sem6','SAB_M:ALVARO|SAB_T:CECI|DOM_M:ANDREA|DOM_T:CAROLINA',''],
    ['isabel','grupoA','sem7','SAB_M:CECI|SAB_T:ANDREA|DOM_M:CAROLINA|DOM_T:ALVARO',''],
    ['isabel','grupoA','sem8','SAB_M:ANDREA|SAB_T:CAROLINA|DOM_M:ALVARO|DOM_T:CECI',''],
    ['isabel','grupoA','horario_m','7.25|14.75','Mañana'],
    ['isabel','grupoA','horario_t','14.75|22.25','Tarde'],

    // Grupo B (trabajan S y D) - ciclo 8 semanas
    ['isabel','grupoB','orden','MARICARMEN,ABEL,GONZALO,RUBEN','Cada uno S+D'],
    ['isabel','grupoB','sem1','SAB_M:MARICARMEN|SAB_T:ABEL,GONZALO,RUBEN|DOM_M:GONZALO|DOM_T:MARICARMEN,ABEL,RUBEN',''],
    ['isabel','grupoB','sem2','SAB_M:ABEL|SAB_T:MARICARMEN,GONZALO,RUBEN|DOM_M:RUBEN|DOM_T:MARICARMEN,ABEL,GONZALO',''],
    ['isabel','grupoB','sem3','SAB_M:GONZALO|SAB_T:MARICARMEN,ABEL,RUBEN|DOM_M:MARICARMEN|DOM_T:ABEL,GONZALO,RUBEN',''],
    ['isabel','grupoB','sem4','SAB_M:RUBEN|SAB_T:MARICARMEN,ABEL,GONZALO|DOM_M:ABEL|DOM_T:MARICARMEN,GONZALO,RUBEN',''],
    ['isabel','grupoB','sem5','SAB_M:MARICARMEN|SAB_T:ABEL,GONZALO,RUBEN|DOM_M:RUBEN|DOM_T:MARICARMEN,ABEL,GONZALO',''],
    ['isabel','grupoB','sem6','SAB_M:ABEL|SAB_T:MARICARMEN,GONZALO,RUBEN|DOM_M:GONZALO|DOM_T:MARICARMEN,ABEL,RUBEN',''],
    ['isabel','grupoB','sem7','SAB_M:GONZALO|SAB_T:MARICARMEN,ABEL,RUBEN|DOM_M:ABEL|DOM_T:MARICARMEN,GONZALO,RUBEN',''],
    ['isabel','grupoB','sem8','SAB_M:RUBEN|SAB_T:MARICARMEN,ABEL,GONZALO|DOM_M:MARICARMEN|DOM_T:ABEL,GONZALO,RUBEN',''],
    ['isabel','grupoB','horario_m','7.25|14.75','Mañana'],
    ['isabel','grupoB','horario_t','14.75|22.25','Tarde'],

    // Fecha inicio rotaciones IS
    ['isabel','config','fecha_inicio','2026-02-28','Fecha base para calcular ciclos'],

    // --- MÍNIMOS ---
    ['granvia','minimos_lv','valores','descarga:2|mañanas:3|tardes:2|cierre:3',''],
    ['granvia','minimos_fds','valores','SAB_M:4|SAB_T:3|DOM_M:2|DOM_T:4',''],
    ['isabel','minimos_lv','valores','descarga:2|mañanas:3|tardes:2|cierre:2',''],
    ['isabel','minimos_fds','valores','SAB_M:2|SAB_T:3|DOM_M:2|DOM_T:3','']
  ];
  writeData(ss, 'RotacionesFdS', headers, rows);
}

// ===================== AUSENCIAS (vacía, lista para uso) =====================

function crearAusencias(ss) {
  var headers = ['tienda','empleado','tipo','desde','hasta','motivo'];
  writeData(ss, 'Ausencias', headers, []);
}

// ===================== SUSTITUCIONES (vacía) =====================

function crearSustituciones(ss) {
  var headers = ['tienda','fecha','ausente','sustituto','entrada','salida','franja','turnoFds'];
  writeData(ss, 'Sustituciones', headers, []);
}

// ===================== MODIFICACIONES (vacía) =====================

function crearModificaciones(ss) {
  var headers = ['tienda','empleado','fecha','turnoFds','entradaOriginal','salidaOriginal','nuevaEntrada','nuevaSalida','motivo'];
  writeData(ss, 'Modificaciones', headers, []);
}

// ===================== FALTAS (vacía) =====================

function crearFaltas(ss) {
  var headers = ['tienda','empleado','fecha','tipo','motivo'];
  writeData(ss, 'Faltas', headers, []);
}


// =====================================================================
// API WEB - doGet / doPost (para la app HTML)
// =====================================================================
// Esta parte se usa DESPUÉS de implementar como Web App.
// La app HTML llamará a esta API para leer y guardar datos.
// =====================================================================

var HOJAS = {
  empleadosGV:    'EmpleadosGV',
  empleadosIS:    'EmpleadosIS',
  horariosGV:     'HorariosGV',
  horariosIS:     'HorariosIS',
  rotaciones:     'RotacionesFdS',
  ausencias:      'Ausencias',
  sustituciones:  'Sustituciones',
  modificaciones: 'Modificaciones',
  faltas:         'Faltas'
};

function doGet(e)  { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;

    if (action === 'readAll') {
      return jsonResp(readAll(ss));
    }
    if (action === 'save') {
      var data = JSON.parse(e.postData.contents);
      var hoja = data.sheet;
      var rows = data.rows;
      var headers = data.headers;
      writeSheet(ss, HOJAS[hoja], headers, rows);
      return jsonResp({ok: true, sheet: hoja, rows: rows.length});
    }
    if (action === 'saveAll') {
      var data = JSON.parse(e.postData.contents);
      for (var key in data) {
        if (HOJAS[key] && data[key].headers && data[key].rows) {
          writeSheet(ss, HOJAS[key], data[key].headers, data[key].rows);
        }
      }
      return jsonResp({ok: true});
    }
    return jsonResp({error: 'Acción no reconocida: ' + action});
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

function writeSheet(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (rows && rows.length > 0) {
    var data = rows.map(function(obj) {
      return headers.map(function(h) {
        var v = obj[h];
        return (v === undefined || v === null) ? '' : v;
      });
    });
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
