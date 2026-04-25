// ============================================================
// HORARIOS KIRA & REYPIK — Service Worker
// Fase A del plan offline: cachea HTML/CSS/JS para arranque
// instantáneo y funcionamiento sin red.
//
// NO intercepta llamadas a Apps Script (script.google.com):
// la sincronización con Sheets pasa derecha a red. El offline
// de datos lo maneja IndexedDB en Fase B y la cola de escrituras
// en Fase C.
//
// Bumpear CACHE_VERSION para forzar invalidación dura cuando
// cambia un archivo del shell que no sea el HTML (raro: el
// stale-while-revalidate ya recachea solo en background).
// ============================================================

'use strict';

const CACHE_VERSION = 'v3-2026-04-25';
const CACHE_NAME = 'kira-reypik-' + CACHE_VERSION;

// Shell de la app: se precachea al instalar el SW.
const SHELL = [
  './',
  './index.html',
  './css/base.css',
  './css/calendario.css',
  './js/utilidades.js',
  './js/config.js',
  './js/datos.js',
  './js/snapshot.js',
  './js/offline-queue.js',
  './js/empleados.js',
  './js/reemplazos.js',
  './js/intercambios.js',
  './js/rotaciones.js',
  './js/sync.js',
  './js/cobertura.js',
  './js/reglas.js',
  './js/ausencias.js',
  './js/motor-sustituciones.js',
  './js/festivos.js',
  './js/control.js',
  './js/horas.js',
  './js/empleados-ui.js',
  './js/ausencias-ui.js',
  './js/auditor.js',
  './js/hoy-ui.js',
  './js/calendario-ui.js',
  './js/modales/modales-base.js',
  './js/modales/modales-ausencia.js',
  './js/modales/modales-sustitucion.js',
  './js/modales/modales-refuerzo.js',
  './js/modales/modales-empleado.js',
  './js/modales/modales-intercambio.js',
  './js/modales/modales-reemplazo.js',
  './js/pdf.js'
];

// ── INSTALL ──────────────────────────────────────────────────
// Precarga el shell. skipWaiting hace que el SW nuevo tome el
// control sin esperar a que cierres todas las pestañas.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
// Limpia caches de versiones anteriores. clients.claim hace que
// las pestañas abiertas pasen a usar este SW sin tener que
// recargarlas (importante para que el siguiente fetch ya pase
// por aquí).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('kira-reypik-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
// Estrategia:
//   - Apps Script (script.google.com) → directo a red, sin tocar.
//     Si falla, deja que Sync gestione el error (modal/cola).
//   - Mismo origen → stale-while-revalidate. Devuelve cache
//     instantáneo y en background recachea la versión nueva
//     para la siguiente visita.
//   - Otros (CDN, fuentes) → network-first con fallback cache.
//
// El lookup en cache usa ignoreSearch:true para que el
// cache-busting `?v=Date.now()` del HTML no rompa el match.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo interceptamos GET. POST a Apps Script (saves) los deja pasar.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Apps Script: directo a red, no se cachea.
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    return;
  }

  // Mismo origen: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const fetchPromise = fetch(req).then((resp) => {
          // Solo cacheamos respuestas OK. opaque (cross-origin) no
          // entra aquí porque ya filtramos por origin.
          if (resp && resp.status === 200) {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        }).catch(() => cached); // Sin red: si hay cache lo devolvemos abajo
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cross-origin (CDN, fuentes…): network-first con fallback cache.
  event.respondWith(
    fetch(req).catch(() =>
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req, { ignoreSearch: true })
      )
    )
  );
});
