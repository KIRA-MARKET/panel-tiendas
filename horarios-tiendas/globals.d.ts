// Declaraciones de globales para tsc --checkJs.
// Solo se declaran las constantes que viven en archivos NO incluidos en
// tsconfig (UI, sync, pdf). Las constantes de los archivos incluidos
// (Store, Utils, CONFIG, Reglas, Motor, etc.) las ve tsc directamente.
declare const Sync: any;
declare const Festivos: any;
declare const FestivosUI: any;
declare const ControlUI: any;
declare const AusenciasUI: any;
declare const EmpleadosUI: any;
declare const CalendarioUI: any;
declare const Modales: any;
declare const PDFExport: any;
declare const App: any;
