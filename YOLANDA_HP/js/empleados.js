// ============================================================
// YOLANDA HP — empleados.js
// Datos de plantilla por defecto (se sobreescriben desde Sheets)
// ============================================================

'use strict';

const EmpleadosDefault = {

  // ── Gran Vía ───────────────────────────────────────────────
  GV: {
    EVA:     { alias: 'EVA', nombre: 'Eva', apellidos: 'Martínez', dni: '12345678A', telefono: '612001001', email: 'eva@kira.com', fechaAlta: '2018-03-15', contrato: 40, tienda: 'granvia', franja: 'mañanas', restriccion: 'max-15', color: '#2e7d32' },
    SARA:    { alias: 'SARA', nombre: 'Sara', apellidos: 'López', dni: '23456789B', telefono: '612002002', email: 'sara@kira.com', fechaAlta: '2019-06-01', contrato: 35, tienda: 'granvia', franja: 'mañanas', restriccion: 'solo-mañanas', color: '#2e7d32' },
    ELI:     { alias: 'ELI', nombre: 'Elisabeth', apellidos: 'Fernández', dni: '34567890C', telefono: '612003003', email: 'eli@kira.com', fechaAlta: '2019-09-15', contrato: 35, tienda: 'granvia', franja: 'mañanas', restriccion: 'solo-mañanas', color: '#2e7d32' },
    FRANCIS: { alias: 'FRANCIS', nombre: 'Francisco', apellidos: 'Pérez', dni: '45678901D', telefono: '612004004', email: 'francis@kira.com', fechaAlta: '2020-01-10', contrato: 35, tienda: 'granvia', franja: 'cierre', restriccion: 'solo-cierre', color: '#6a1b9a' },
    EDU:     { alias: 'EDU', nombre: 'Eduardo', apellidos: 'González', dni: '56789012E', telefono: '612005005', email: 'edu@kira.com', fechaAlta: '2020-04-20', contrato: 30, tienda: 'ambas', franja: 'mañanas', restriccion: 'max-15', color: '#2e7d32' },
    DAVID:   { alias: 'DAVID', nombre: 'David', apellidos: 'Rodríguez', dni: '67890123F', telefono: '612006006', email: 'david@kira.com', fechaAlta: '2020-07-01', contrato: 30, tienda: 'ambas', franja: 'rotativo', restriccion: '', color: '#2c5aa0' },
    LETI:    { alias: 'LETI', nombre: 'Leticia', apellidos: 'Jiménez', dni: '78901234G', telefono: '612007007', email: 'leti@kira.com', fechaAlta: '2020-07-01', contrato: 30, tienda: 'ambas', franja: 'rotativo', restriccion: '', color: '#2c5aa0' },
    SILVIA:  { alias: 'SILVIA', nombre: 'Silvia', apellidos: 'Hernández', dni: '89012345H', telefono: '612008008', email: 'silvia@kira.com', fechaAlta: '2021-02-15', contrato: 30, tienda: 'ambas', franja: 'tardes', restriccion: '', color: '#e65100' },
    ALEX:    { alias: 'ALEX', nombre: 'Alejandro', apellidos: 'Muñoz', dni: '90123456I', telefono: '612009009', email: 'alex@kira.com', fechaAlta: '2021-05-01', contrato: 30, tienda: 'ambas', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    ABDEL:   { alias: 'ABDEL', nombre: 'Abdel', apellidos: 'Benali', dni: '01234567J', telefono: '612010010', email: 'abdel@kira.com', fechaAlta: '2021-09-01', contrato: 30, tienda: 'ambas', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    ANTONIO: { alias: 'ANTONIO', nombre: 'Antonio', apellidos: 'Serrano', dni: '11223344K', telefono: '612011011', email: 'antonio@kira.com', fechaAlta: '2019-01-15', contrato: 25, tienda: 'ambas', franja: 'descarga', restriccion: 'solo-descarga', color: '#2c5aa0' },
    VANESA:  { alias: 'VANESA', nombre: 'Vanesa', apellidos: 'Ortega', dni: '22334455L', telefono: '612012012', email: 'vanesa@kira.com', fechaAlta: '2022-03-01', contrato: 25, tienda: 'ambas', franja: 'mañanas', restriccion: '', color: '#2e7d32' },
    MORILLA: { alias: 'MORILLA', nombre: 'José', apellidos: 'Morilla', dni: '33445566M', telefono: '612013013', email: 'morilla@kira.com', fechaAlta: '2022-06-15', contrato: 25, tienda: 'ambas', franja: 'tardes', restriccion: '', color: '#e65100' },
    ALFREDO: { alias: 'ALFREDO', nombre: 'Alfredo', apellidos: 'García', dni: '44556677N', telefono: '612014014', email: 'alfredo@kira.com', fechaAlta: '2023-01-10', contrato: 15, tienda: 'granvia', franja: 'tardes', restriccion: '', color: '#e65100' },
    'ALEX VERA': { alias: 'ALEX VERA', nombre: 'Alejandro', apellidos: 'Vera', dni: '55667788O', telefono: '612015015', email: 'alexvera@kira.com', fechaAlta: '2023-03-01', contrato: 15, tienda: 'granvia', franja: 'tardes', restriccion: '', color: '#e65100' }
  },

  // ── Horarios L-V Gran Vía ──────────────────────────────────
  HORARIOS_GV: {
    A: {
      LJ: { LETI: [6, 10.5], ANTONIO: [6, 9.25], EVA: [7, 15], SARA: [9, 14.5], ELI: [9.5, 15], EDU: [10.5, 15], VANESA: [10.5, 14], SILVIA: [14, 18.5], MORILLA: [15, 18.5], FRANCIS: [16.75, 22.25], ALEX: [17.75, 22.25], ABDEL: [17.75, 22.25], DAVID: [17.75, 22.25] },
      V:  { LETI: [5, 9.5], ANTONIO: [5, 9.5], EVA: [7, 15], SARA: [9, 14.5], ELI: [9.5, 15], EDU: [10.5, 15], VANESA: [10.5, 14], SILVIA: [14, 18.5], MORILLA: [15, 18.5], FRANCIS: [16.75, 22.25], ALEX: [17.75, 22.25], ABDEL: [17.75, 22.25], DAVID: [17.75, 22.25] }
    },
    B: {
      LJ: { DAVID: [6, 10.5], ANTONIO: [6, 9.25], EVA: [7, 15], SARA: [9, 14.5], ELI: [9.5, 15], EDU: [10.5, 15], VANESA: [10.5, 14], SILVIA: [14, 18.5], MORILLA: [15, 18.5], FRANCIS: [16.75, 22.25], ALEX: [17.75, 22.25], ABDEL: [17.75, 22.25], LETI: [17.75, 22.25] },
      V:  { DAVID: [5, 9.5], ANTONIO: [5, 9.5], EVA: [7, 15], SARA: [9, 14.5], ELI: [9.5, 15], EDU: [10.5, 15], VANESA: [10.5, 14], SILVIA: [14, 18.5], MORILLA: [15, 18.5], FRANCIS: [16.75, 22.25], ALEX: [17.75, 22.25], ABDEL: [17.75, 22.25], LETI: [17.75, 22.25] }
    }
  },

  // ── Isabel ─────────────────────────────────────────────────
  IS: {
    EDU:         { alias: 'EDU', nombre: 'Eduardo', apellidos: 'González', dni: '56789012E', telefono: '612005005', email: 'edu@kira.com', fechaAlta: '', contrato: 12, tienda: 'ambas', franja: 'mañanas', restriccion: '', color: '#2e7d32' },
    DAVID:       { alias: 'DAVID', nombre: 'David', apellidos: 'Rodríguez', dni: '67890123F', telefono: '612006006', email: 'david@kira.com', fechaAlta: '', contrato: 12, tienda: 'ambas', franja: 'rotativo', restriccion: '', color: '#2c5aa0' },
    LETI:        { alias: 'LETI', nombre: 'Leticia', apellidos: 'Jiménez', dni: '78901234G', telefono: '612007007', email: 'leti@kira.com', fechaAlta: '', contrato: 12, tienda: 'ambas', franja: 'rotativo', restriccion: '', color: '#2c5aa0' },
    SILVIA:      { alias: 'SILVIA', nombre: 'Silvia', apellidos: 'Hernández', dni: '89012345H', telefono: '612008008', email: 'silvia@kira.com', fechaAlta: '', contrato: 15, tienda: 'ambas', franja: 'tardes', restriccion: '', color: '#e65100' },
    ALEX:        { alias: 'ALEX', nombre: 'Alejandro', apellidos: 'Muñoz', dni: '90123456I', telefono: '612009009', email: 'alex@kira.com', fechaAlta: '', contrato: 15, tienda: 'ambas', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    ABDEL:       { alias: 'ABDEL', nombre: 'Abdel', apellidos: 'Benali', dni: '01234567J', telefono: '612010010', email: 'abdel@kira.com', fechaAlta: '', contrato: 15, tienda: 'ambas', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    ANTONIO:     { alias: 'ANTONIO', nombre: 'Antonio', apellidos: 'Serrano', dni: '11223344K', telefono: '612011011', email: 'antonio@kira.com', fechaAlta: '', contrato: 15, tienda: 'ambas', franja: 'descarga', restriccion: 'solo-descarga', color: '#2c5aa0' },
    VANESA:      { alias: 'VANESA', nombre: 'Vanesa', apellidos: 'Ortega', dni: '22334455L', telefono: '612012012', email: 'vanesa@kira.com', fechaAlta: '', contrato: 18, tienda: 'ambas', franja: 'mañanas', restriccion: '', color: '#2e7d32' },
    MORILLA:     { alias: 'MORILLA', nombre: 'José', apellidos: 'Morilla', dni: '33445566M', telefono: '612013013', email: 'morilla@kira.com', fechaAlta: '', contrato: 18, tienda: 'ambas', franja: 'tardes', restriccion: '', color: '#e65100' },
    CAROLINA:    { alias: 'CAROLINA', nombre: 'Carolina', apellidos: 'Ruiz', dni: '66778899P', telefono: '612020001', email: 'carolina@reypik.com', fechaAlta: '2021-01-15', contrato: 30, tienda: 'isabel', franja: 'mañanas', restriccion: '', color: '#2e7d32' },
    ALVARO:      { alias: 'ALVARO', nombre: 'Álvaro', apellidos: 'Sánchez', dni: '77889900Q', telefono: '612020002', email: 'alvaro@reypik.com', fechaAlta: '2021-03-01', contrato: 30, tienda: 'isabel', franja: 'tardes', restriccion: '', color: '#e65100' },
    CECI:        { alias: 'CECI', nombre: 'Cecilia', apellidos: 'Martín', dni: '88990011R', telefono: '612020003', email: 'ceci@reypik.com', fechaAlta: '2021-06-01', contrato: 30, tienda: 'isabel', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    ANDREA:      { alias: 'ANDREA', nombre: 'Andrea', apellidos: 'López', dni: '99001122S', telefono: '612020004', email: 'andrea@reypik.com', fechaAlta: '2022-02-15', contrato: 23.5, tienda: 'isabel', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    ABEL:        { alias: 'ABEL', nombre: 'Abel', apellidos: 'Vera', dni: '00112233T', telefono: '612020005', email: 'abel@reypik.com', fechaAlta: '2022-05-01', contrato: 19, tienda: 'isabel', franja: 'cierre', restriccion: '', color: '#6a1b9a' },
    'M. CARMEN': { alias: 'M. CARMEN', nombre: 'María Carmen', apellidos: 'Ortiz', dni: '11223344U', telefono: '612020006', email: 'maricarmen@reypik.com', fechaAlta: '2022-09-01', contrato: 15, tienda: 'isabel', franja: 'mañanas', restriccion: '', color: '#2e7d32' },
    RUBEN:       { alias: 'RUBEN', nombre: 'Rubén', apellidos: 'García', dni: '22334455V', telefono: '612020007', email: 'ruben@reypik.com', fechaAlta: '2023-01-15', contrato: 15, tienda: 'isabel', franja: 'tardes', restriccion: '', color: '#e65100' },
    GONZALO:     { alias: 'GONZALO', nombre: 'Gonzalo', apellidos: 'Fernández', dni: '33445566W', telefono: '612020008', email: 'gonzalo@reypik.com', fechaAlta: '2023-04-01', contrato: 15, tienda: 'isabel', franja: 'tardes', restriccion: '', color: '#e65100' }
  },

  /** Inicializar Store con datos por defecto */
  init() {
    Store.set('empleadosGV', Utils.clonar(EmpleadosDefault.GV));
    Store.set('empleadosIS', Utils.clonar(EmpleadosDefault.IS));
    Store.set('horariosGV', Utils.clonar(EmpleadosDefault.HORARIOS_GV));
  }
};
