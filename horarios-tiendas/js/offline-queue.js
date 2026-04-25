// ============================================================
// HORARIOS KIRA & REYPIK — offline-queue.js
// Fase C del plan offline: cola persistente de escrituras
// pendientes en IndexedDB. Cuando la app está sin red, los
// saves no se pierden: se guardan aquí y se drenan automáticamente
// al volver online.
//
// DB separada de Snapshot (kira-reypik-queue) para no entrelazar
// migraciones de schema.
// ============================================================

'use strict';

const OfflineQueue = {

  DB_NAME: 'kira-reypik-queue',
  DB_VERSION: 1,
  STORE: 'queue',

  /** Abre la DB; crea el store con autoIncrement como key. */
  _open() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible'));
        return;
      }
      const req = indexedDB.open(OfflineQueue.DB_NAME, OfflineQueue.DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OfflineQueue.STORE)) {
          db.createObjectStore(OfflineQueue.STORE, { autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Encola un save pendiente.
   * @param {{hoja:string, headers:string[], rows:any[]}} item
   * @returns {Promise<boolean>}
   */
  async push(item) {
    try {
      const db = await OfflineQueue._open();
      return await new Promise((resolve) => {
        const tx = db.transaction(OfflineQueue.STORE, 'readwrite');
        tx.objectStore(OfflineQueue.STORE).add({
          hoja: item.hoja,
          headers: item.headers,
          rows: item.rows,
          ts: Date.now()
        });
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
        tx.onabort = () => { db.close(); resolve(false); };
      });
    } catch (e) {
      console.warn('[OfflineQueue] push falló:', e && e.message);
      return false;
    }
  },

  /** Lista todos los items pendientes (en orden de inserción). */
  async list() {
    try {
      const db = await OfflineQueue._open();
      return await new Promise((resolve) => {
        const tx = db.transaction(OfflineQueue.STORE, 'readonly');
        const req = tx.objectStore(OfflineQueue.STORE).getAll();
        req.onsuccess = () => { db.close(); resolve(req.result || []); };
        req.onerror = () => { db.close(); resolve([]); };
      });
    } catch (e) {
      return [];
    }
  },

  /** Cuenta items pendientes (más rápido que list().length). */
  async count() {
    try {
      const db = await OfflineQueue._open();
      return await new Promise((resolve) => {
        const tx = db.transaction(OfflineQueue.STORE, 'readonly');
        const req = tx.objectStore(OfflineQueue.STORE).count();
        req.onsuccess = () => { db.close(); resolve(req.result || 0); };
        req.onerror = () => { db.close(); resolve(0); };
      });
    } catch (e) {
      return 0;
    }
  },

  /** Vacía la cola entera (tras drenaje exitoso o conflicto 409). */
  async clear() {
    try {
      const db = await OfflineQueue._open();
      return await new Promise((resolve) => {
        const tx = db.transaction(OfflineQueue.STORE, 'readwrite');
        tx.objectStore(OfflineQueue.STORE).clear();
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
      });
    } catch (e) {
      return false;
    }
  }
};
