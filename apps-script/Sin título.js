// Funciones ejecutables directamente desde el editor
function actualizarHorariosIS() { crearHorariosIS(SpreadsheetApp.getActiveSpreadsheet()); }
function actualizarRotacionesFdS() { crearRotacionesFdS(SpreadsheetApp.getActiveSpreadsheet()); }

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

function crearEmpleadosGV(ss) {
  var h = ['alias','nombre','apellidos','dni','telefono','email','fechaAlta','contrato','tienda','franja','restriccion','color','horasLV','horasFDS'];
  var r = [
    ['EVA','Eva','Martinez','12345678A','612001001','eva@kira.com','2018-03-15',40,'granvia','mananas','max-15','#2e7d32','',''],
    ['SARA','Sara','Lopez','23456789B','612002002','sara@kira.com','2019-06-01',35,'granvia','mananas','solo-mananas','#2e7d32','',''],
    ['ELI','Elisabeth','Fernandez','34567890C','612003003','eli@kira.com','2019-09-15',35,'granvia','mananas','solo-mananas','#2e7d32','',''],
    ['FRANCIS','Francisco','Perez','45678901D','612004004','francis@kira.com','2020-01-10',35,'granvia','cierre','solo-cierre','#6a1b9a','',''],
    ['EDU','Eduardo','Gonzalez','56789012E','612005005','edu@kira.com','2020-04-20',30,'ambas','mananas','max-15','#2e7d32','',''],
    ['DAVID','David','Rodriguez','67890123F','612006006','david@kira.com','2020-07-01',30,'ambas','rotativo','','#2c5aa0','',''],
    ['LETI','Leticia','Jimenez','78901234G','612007007','leti@kira.com','2020-07-01',30,'ambas','rotativo','','#2c5aa0','',''],
    ['SILVIA','Silvia','Hernandez','89012345H','612008008','silvia@kira.com','2021-02-15',30,'ambas','tardes','','#e65100','',''],
    ['ALEX','Alejandro','Munoz','90123456I','612009009','alex@kira.com','2021-05-01',30,'ambas','cierre','','#6a1b9a','',''],
    ['ABDEL','Abdel','Benali','01234567J','612010010','abdel@kira.com','2021-09-01',30,'ambas','cierre','','#6a1b9a','',''],
    ['ANTONIO','Antonio','Serrano','11223344K','612011011','antonio@kira.com','2019-01-15',25,'ambas','descarga','solo-descarga','#2c5aa0','',''],
    ['VANESA','Vanesa','Ortega','22334455L','612012012','vanesa@kira.com','2022-03-01',25,'ambas','mananas','','#2e7d32','',''],
    ['MORILLA','Jose','Morilla','33445566M','612013013','morilla@kira.com','2022-06-15',25,'ambas','tardes','','#e65100','',''],
    ['ALFREDO','Alfredo','Garcia','44556677N','612014014','alfredo@kira.com','2023-01-10',15,'granvia','tardes','','#e65100','',''],
    ['ALEX VERA','Alejandro','Vera','55667788O','612015015','alexvera@kira.com','2023-03-01',15,'granvia','tardes','','#e65100','','']
  ];
  writeData(ss, 'EmpleadosGV', h, r);
}

function crearEmpleadosIS(ss) {
  var h = ['alias','nombre','apellidos','dni','telefono','email','fechaAlta','contrato','tienda','franja','restriccion','color','horasLV','horasFDS'];
  var r = [
    ['EDU','Eduardo','Gonzalez','56789012E','612005005','edu@kira.com','',12,'ambas','mananas','','#2e7d32','',''],
    ['DAVID','David','Rodriguez','67890123F','612006006','david@kira.com','',12,'ambas','rotativo','','#2c5aa0','',''],
    ['LETI','Leticia','Jimenez','78901234G','612007007','leti@kira.com','',12,'ambas','rotativo','','#2c5aa0','',''],
    ['SILVIA','Silvia','Hernandez','89012345H','612008008','silvia@kira.com','',15,'ambas','tardes','','#e65100','',''],
    ['ALEX','Alejandro','Munoz','90123456I','612009009','alex@kira.com','',15,'ambas','cierre','','#6a1b9a','',''],
    ['ABDEL','Abdel','Benali','01234567J','612010010','abdel@kira.com','',15,'ambas','cierre','','#6a1b9a','',''],
    ['ANTONIO','Antonio','Serrano','11223344K','612011011','antonio@kira.com','',15,'ambas','descarga','solo-descarga','#2c5aa0','',''],
    ['VANESA','Vanesa','Ortega','22334455L','612012012','vanesa@kira.com','',18,'ambas','mananas','','#2e7d32','',''],
    ['MORILLA','Jose','Morilla','33445566M','612013013','morilla@kira.com','',18,'ambas','tardes','','#e65100','',''],
    ['CAROLINA','Carolina','Ruiz','66778899P','612020001','carolina@reypik.com','2021-01-15',30,'isabel','mananas','','#2e7d32','',''],
    ['ALVARO','Alvaro','Sanchez','77889900Q','612020002','alvaro@reypik.com','2021-03-01',30,'isabel','tardes','','#e65100','',''],
    ['CECI','Cecilia','Martin','88990011R','612020003','ceci@reypik.com','2021-06-01',30,'isabel','cierre','','#6a1b9a','',''],
    ['ANDREA','Andrea','Lopez','99001122S','612020004','andrea@reypik.com','2022-02-15',23.5,'isabel','cierre','','#6a1b9a','',''],
    ['ABEL','Abel','Vera','00112233T','612020005','abel@reypik.com','2022-05-01',19,'isabel','cierre','','#6a1b9a','',''],
    ['M. CARMEN','Maria Carmen','Ortiz','11223344U','612020006','maricarmen@reypik.com','2022-09-01',15,'isabel','mananas','','#2e7d32','',''],
    ['RUBEN','Ruben','Garcia','22334455V','612020007','ruben@reypik.com','2023-01-15',15,'isabel','tardes','','#e65100','',''],
    ['GONZALO','Gonzalo','Fernandez','33445566W','612020008','gonzalo@reypik.com','2023-04-01',15,'isabel','tardes','','#e65100','','']
  ];
  writeData(ss, 'EmpleadosIS', h, r);
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
    ['fijo','LJ','MORILLA',18.75,22.25,'L a J'],
    ['fijo','V','MORILLA',18.25,22.25,'Viernes'],
    ['fijo','LXV','VANESA',6,10,''],
    ['fijo','MJ','VANESA',7,10,''],
    ['fijo','LXV','EDU',6,10,''],
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

function handleRequest(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;
    if (action === 'readAll') {
      return jsonResp(readAll(ss));
    }
    if (action === 'save') {
      var data = JSON.parse(e.postData.contents);
      writeSheet(ss, HOJAS[data.sheet], data.headers, data.rows);
      return jsonResp({ok: true, sheet: data.sheet, rows: data.rows.length});
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
