// ============================================================
// HORARIOS KIRA & REYPIK — snapshot.js
// Fase B del plan offline: persiste un snapshot del Store en
// IndexedDB para arranque instantáneo (sin esperar a Sheets) y
// para que la app funcione completa sin red.
//
// Snapshot.cargar() — restaura el Store al arrancar.
// Snapshot.guardar() — vuelca el estado actual a IndexedDB.
// Se llama desde App.init (cargar) y desde Sync (guardar tras
// cada cargar() exitoso y tras cada flush de la cola de saves).
//
// IndexedDB > localStorage: cuota mucho mayor (cientos de MB
// vs ~5 MB), sin bloqueo del hilo principal en escrituras
// grandes, soporta objetos sin pasar por JSON.stringify (vía
// el structured clone del propio IDB).
// ============================================================

'use strict';

const Snapshot = {

  DB_NAME: 'kira-reypik',
  DB_VERSION: 1,
  STORE: 'snapshot',
  KEY: 'store-state',

  // Claves del Store que persisten. UI state (tienda/mes/año
  // actuales, syncStatus) NO entra: lo decide la sesión actual.
  KEYS: [
    'empleadosGV', 'empleadosIS',
    'horariosGV', 'sheetsHorariosIS', 'sheetsFdsGV', 'sheetsFdsIS',
    'ausenciasGV', 'ausenciasIS',
    'sustituciones', 'modificacionesHorario',
    'faltasGV', 'faltasIS',
    'sustitucionesDescartadas', 'festivos',
    'decisiones', 'reemplazos', 'intercambios'
  ],

  /** Abre la DB; crea el object store si no existe. */
  _open() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible'));
        return;
      }
      const req = indexedDB.open(Snapshot.DB_NAME, Snapshot.DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(Snapshot.STORE)) {
          db.createObjectStore(Snapshot.STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
    });
  },

  /**
   * Vuelca las claves del Store a IndexedDB. No-op silencioso
   * si IDB no disponible o falla (la app sigue funcionando).
   * @returns {Promise<boolean>}
   */
  async guardar() {
    if (typeof Store === 'undefined') return false;
    try {
      const db = await Snapshot._open();
      const data = { _timestamp: Date.now() };
      for (const k of Snapshot.KEYS) {
        data[k] = Store._state[k];
      }
      return await new Promise((resolve) => {
        const tx = db.transaction(Snapshot.STORE, 'readwrite');
        tx.objectStore(Snapshot.STORE).put(data, Snapshot.KEY);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
        tx.onabort = () => { db.close(); resolve(false); };
      });
    } catch (e) {
      console.warn('[Snapshot] guardar falló:', e && e.message);
      return false;
    }
  },

  /**
   * Carga el snapshot a Store._state. Devuelve el timestamp
   * del snapshot si lo había, o false si no había nada.
   * @returns {Promise<number|false>}
   */
  async cargar() {
    if (typeof Store === 'undefined') return false;
    try {
      const db = await Snapshot._open();
      return await new Promise((resolve) => {
        const tx = db.transaction(Snapshot.STORE, 'readonly');
        const req = tx.objectStore(Snapshot.STORE).get(Snapshot.KEY);
        req.onsuccess = () => {
          const data = req.result;
          db.close();
          if (!data) { resolve(false); return; }
          for (const k of Snapshot.KEYS) {
            if (data[k] !== undefined) Store._state[k] = data[k];
          }
          resolve(data._timestamp || true);
        };
        req.onerror = () => { db.close(); resolve(false); };
      });
    } catch (e) {
      console.warn('[Snapshot] cargar falló:', e && e.message);
      return false;
    }
  },

  /** Borrar el snapshot (útil para tests y debugging). */
  async borrar() {
    try {
      const db = await Snapshot._open();
      return await new Promise((resolve) => {
        const tx = db.transaction(Snapshot.STORE, 'readwrite');
        tx.objectStore(Snapshot.STORE).delete(Snapshot.KEY);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
      });
    } catch (e) {
      return false;
    }
  }
};
