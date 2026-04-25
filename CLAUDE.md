# CLAUDE.md — HORARIOS KIRA & REYPIK

Instrucciones de proyecto para Claude Code. Léelas siempre antes de tocar nada.

---

## Contexto general

Nacho es dueño de **dos tiendas** (KIRA MARKET y REYPIK MARKET, dos CIF, dos contratos, dos nóminas). Solo Nacho usa la app (Eva como extensión). **No hay sistema de roles.**

### Estructura del directorio raíz

```
COSAS PARA COWORK/
├── horarios-tiendas/        App de horarios (producción) — proyecto principal
├── dashboard-supermercado/  Dashboard de tareas (en desarrollo) — repo git propio
├── scripts/                 Scripts Python (nóminas, facturas, contratos)
├── apps-script/             Google Apps Script (sync con Sheets)
├── documentos/              PDFs, plantillas, datos xlsx
├── credenciales/            Tokens y credentials de Google (en .gitignore)
├── assets/                  Imágenes, iconos, logos, sellos, .app
├── legacy/                  App antigua (app_horarios_v8.html) — solo referencia
├── index.html               Panel PWA (GitHub Pages)
└── manifest.json            PWA manifest
```

Proyectos activos:

1. **`horarios-tiendas/`** — Rediseño premium modular. Es donde se trabaja activamente.
2. **`dashboard-supermercado/`** — Dashboard de tareas para las tiendas. Repo git independiente.
3. **`legacy/app_horarios_v8.html`** — App antigua monolítica (~4260 líneas). **NO TOCAR.** Solo referencia.

---

## HORARIOS KIRA & REYPIK — Estructura

```
horarios-tiendas/
├── index.html                  Entrada + controlador App
├── css/
│   ├── base.css                Variables, layout, componentes, festivos, control, auditor
│   └── calendario.css          Estilos del calendario
├── js/
│   ├── utilidades.js           Utils: fechas, horas, franjas, escapeHtml
│   ├── config.js               CONFIG: mínimos, restricciones, rotaciones, overrides
│   ├── datos.js                Store centralizado con eventos
│   ├── empleados.js            Plantilla por defecto
│   ├── rotaciones.js           Motor de rotaciones (A/B, descarga, FdS, Isabel)
│   ├── sync.js                 Carga/guarda Sheets con cola
│   ├── cobertura.js            Cálculo de mínimos por franja
│   ├── reglas.js               33 reglas de validación de candidatos
│   ├── ausencias.js            CRUD ausencias + bloqueo solapamientos
│   ├── motor-sustituciones.js  Motor automático
│   ├── festivos.js             Festivos Granada + recuento
│   ├── control.js              Tab vacaciones/faltas/festivos por empleado
│   ├── auditor.js              Escaneo del mes (cobertura, continuidad, etc.)
│   ├── calendario-ui.js        Render del calendario
│   └── modales-ui.js           Modales propios (sin prompt())
└── tests/
    ├── tests.html              Runner de tests sin frameworks
    └── tests.js                Suites de tests
```

**El orden de los `<script>` en `index.html` importa.** Festivos debe ir antes que Control y Auditor.

---

## Reglas de oro al editar HORARIOS KIRA & REYPIK

1. **NO romper lo que ya funciona.** Antes de cambiar lógica existente, leerla entera.
2. **Tras cualquier función nueva o cambio importante → escribir un test** en `horarios-tiendas/tests/tests.js`. Casos: normal, límite, vacío. (Memory: feedback_tests.md)
3. **Respuestas concisas.** Nada de explicar lo obvio. (Memory: feedback_tokens.md)
4. **Nunca usar `prompt()`/`alert()`** para flujos críticos. Usar `Modales` propios.
5. **Nunca concatenar HTML con datos sin escapar.** Usar `Utils.escapeHtml()`.
6. **El motor de sustituciones es la prioridad máxima** del proyecto. Cualquier feature que lo afecte va antes que mejoras estéticas.
7. **Priorizar siempre coste cero de hosting.** GitHub Pages / Cloudflare Pages + Sheets/Apps Script.
8. **Datos clave del negocio — no olvidar:**
   - Vacaciones se cuentan en **días NATURALES** (lo correcto en este negocio).
   - Semana A/B siempre correlativo (impar=A, par=B), sin importar cambio de año.
   - Festivos son **voluntarios**, se trabajan todos, se pagan aparte. Los empleados se inscriben, Nacho asigna.
   - Festivos = **Granada capital** (NO Madrid).
   - **GV siempre cede** en caso de solape entre tiendas (TIENDA_FLEXIBLE = granvia).
   - Mínimos correctos están en `CONFIG`, NO en Sheets (Sheets desactualizado).

---

## Reglas del motor de sustituciones (Capa 1)

Las **33 reglas validadas con Nacho** viven en tres sitios — mantenerlos sincronizados:

1. **Spec canónica** (memoria): `memory/project_reglas_sustitucion_v2.md`
   Vaciado completo del 6-7 abril 2026: restricciones por empleado GV/Isabel, mínimos por franja/día, rotaciones, préstamos, solapes, cadena, descanso, prioridad DOM_T, etc.
2. **Datos**: `horarios-tiendas/js/config.js`
   `RESTRICCIONES`, `MINIMOS_LV_*`, `MINIMOS_FDS_*`, `ROTACIONES`, `PRESTAMO_ENTRE_TIENDAS`, `GRUPO_DESCARGA_GV`, `DESCANSO_EXCEPCIONES`, `OVERRIDES_DIAS_LV`.
3. **Lógica**: `horarios-tiendas/js/reglas.js`
   `Reglas.validarCandidato(candidato, turno)` → `{valido, errores, avisos}`. Es el guardián que aplica las 33 reglas.

**Principios fundamentales:**
- Las rotaciones son **inmutables**. Se calculan una vez y son fijas. Las ausencias se gestionan "encima".
- **NO siempre hay que sustituir** — solo cuando los mínimos se rompen.
- Si una regla cambia, actualizar los **tres** sitios (memoria + config + reglas) y añadir test.
- **Capa 2** (aprendizaje de patrones de decisiones de Nacho) → Fase 5.

## Fases del rediseño

- **Fase 1** ✓ Cimientos (store, rotaciones, calendario, sync)
- **Fase 2** ✓ Motor sustituciones, ausencias, modales propios, cadena de mínimos
- **Fase 3** ✓ Auditor, festivos, control vacaciones/faltas/festivos trabajados
- **Fase 4** ⏳ Sistema de temas (incl. modo oscuro), PDF para WhatsApp, responsive
- **Fase 5** ⏳ Capa 2 motor (aprendizaje), simulador verano, vista Gantt, drag & drop

---

## Bugs pendientes conocidos (próximas sesiones)

1. ~~**EVA debe contar en descarga + mañanas.**~~ ✓ Resuelto. Cobertura ahora es multi-franja: un empleado cuenta en cada franja cuya ventana cubre íntegramente. Ventanas en `CONFIG.FRANJAS_GV/IS`.
2. **Estrategia "reorganizar plantilla":** cuando falta alguien, sugerir alargar el horario base de otro en vez de mover sustituto. Aplazado (8 abril 2026): requiere alinear con Nacho cuándo prefiere reorganizar vs sustituir, límite de horas de extensión, qué empleados pueden ser "alargados" y cómo se visualiza en calendario. Cuando se retome, las preguntas concretas están en el chat de esa fecha.
3. ~~**DAVID/LETI exclusión mutua viernes Isabel.**~~ ✓ Resuelto en `reglas.js` + tests (commit `ef2a845`).
4. **Capa 2 del motor:** aprender de las decisiones históricas de Nacho. Backend cableado en `motor-sustituciones.js` (`preferenciaScore`) y `Store.getDecisiones`; falta UI para que Nacho registre la elección final cuando difiere de la sugerencia.
5. **Tema oscuro:** intento inicial revertido (7 abril 2026). El calendario tiene muchos colores hardcodeados (cabeceras, celdas vacías, líneas de ausencia rojas que sobre fondo oscuro casi no se ven). Requiere repaso completo de `calendario.css` antes de reintentarlo. Pendiente de Fase 4 cuando haya tiempo.
6. ~~**Sustituciones tipo movimiento vs extra:** falta el toggle en el modal.~~ ✓ Resuelto (commit `bd6a0d1`). Toggle añadido en el modal de asignación de sustituto. Default `movimiento`, opcional `extra`.

### Bugs nuevos detectados en la auditoría 25-04-2026 (todos cerrados)

7. ~~**Auditor leía modificaciones con claves equivocadas** (`mod.entrada` en vez de `mod.nuevaEntrada`)~~ ✓ Resuelto en `auditor.js:28` + test (commit `7ae325b`).
8. ~~**Veto duro DOM_T:** spec dice "nunca quitar de DOM_T si hay alternativa" pero el motor solo lo prefería.~~ ✓ Resuelto en `motor-sustituciones.js`: tras el sort, si hay candidatos válidos con turno origen ≠ DOM_T y excedente real ≥1, los DOM_T se filtran.
9. ~~**Regla "también ausente" sin return inmediato.**~~ ✓ Resuelto en `reglas.js`.
10. ~~**Ausencia de empleado compartido no se propagaba entre tiendas.**~~ ✓ Resuelto: `Ausencias.crear` acepta `opciones.aplicarEnAmbas`; el modal pregunta cuando `empData.tienda === 'ambas'` (commit `7a5e65b`).
11. ~~**Datos LOPD (DNI/tel/email) hardcodeados en `js/empleados.js` y `apps-script/Sin título.js`.**~~ ✓ Eliminados (commit `b54cd84`). Sheets es ahora fuente única de verdad; el código solo inicializa estructuras vacías.
12. ~~**Apps Script `writeSheet` no transaccional**: clearContents+setValues podía dejar la hoja vacía si fallaba a mitad.~~ ✓ Resuelto en `apps-script/Sin título.js` (commit `a758e3d`): un solo setValues + cleanup posterior.

### Pendientes de la auditoría 25-04-2026

13. ~~**API Sheets pública anónima** (`access: ANYONE_ANONYMOUS`).~~ ✓ Resuelto (commit `57f7080`, deploy @9, 25-04). Auth por token compartido: `_verificarToken` en Apps Script lee `API_TOKEN` de PropertiesService; cliente envía `&token=...` desde `Sync._fetch` leyendo `localStorage.apiToken`. Si el server devuelve 401, abre `Modales.input` para reintroducir. El token NUNCA se commitea: vive solo en Properties (server) y localStorage (cliente).
14. **Race condition inter-cliente.** La cola en `sync.js` solo serializa intra-cliente; dos pestañas pueden seguir pisándose. Pendiente.
15. **Service Worker + IndexedDB para offline.** Pendiente (Fase 4).
16. ~~**Partir `modales-ui.js`** (~1.900 líneas).~~ ✓ Resuelto (commit `05454c5`): partido en 7 archivos en `js/modales/` por dominio (base, ausencia, sustitucion, refuerzo, empleado, intercambio, reemplazo). API pública intacta vía `Object.assign(Modales, {...})`.
17. ~~**JSDoc estricto + `tsc --checkJs`** sobre todos los `.js`.~~ ✓ Resuelto (commit en curso). 21 archivos `.js` cubiertos por tsc (antes: 14). `noImplicitThis: true` activado. `noImplicitAny` deja 934 errores → pendiente sesión dedicada (la base estricta de `checkJs` y `noImplicitThis` ya cubre el riesgo principal de regresión por renombrados/typos).

---

## Auditoría técnica de `app_horarios_v8.html` (6 abril 2026)

Esta auditoría dio origen a HORARIOS KIRA & REYPIK. Es la lista canónica de razones para el rediseño y la check-list de qué problemas NO debe arrastrar la nueva app.

### Top 10 prioridades (resumen ejecutivo)

| # | Prio | Hallazgo | Impacto | Estado HORARIOS KIRA & REYPIK |
|---|------|----------|---------|---|
| 1 | CRÍTICO | Conteo de vacaciones incluye fines de semana | Errores legales | Días naturales correctos por diseño |
| 2 | CRÍTICO | Cancelar ausencia borra sustituciones de otros | Pérdida de datos | ✓ Arreglado en `Store.removeAusencia` |
| 3 | CRÍTICO | Sin gestión de festivos | Alertas falsas | ✓ Módulo Festivos (Fase 3) |
| 4 | CRÍTICO | No hay validación de ausencias solapadas | Corrupción de datos | ✓ `Store.ausenciaSolapada` |
| 5 | CRÍTICO | API de Google Sheets expuesta sin autenticación | Seguridad | ✓ Auth por token compartido (Sprint 1.1, 25-04) |
| 6 | CRÍTICO | Sin persistencia local (offline) | Pérdida de trabajo | ⏳ Pendiente Service Worker / IndexedDB |
| 7 | CRÍTICO | `prompt()` del navegador para edición | UX inaceptable | ✓ Modales propios |
| 8 | IMPORTANTE | Race conditions en sync con Sheets | Datos inconsistentes | ✓ Cola en `sync.js` |
| 9 | IMPORTANTE | Semana A/B incorrecta en cambio de año | Horarios incorrectos | ✓ Correlativo, no por ISO |
| 10 | IMPORTANTE | Sin resumen mensual de horas por empleado | Bloquea nóminas | ⏳ Pendiente |

### 1 · Arquitecto de software

**Errores y bugs**
- 🔴 Archivo monolítico sin separación de responsabilidades (4260 líneas) → ✓ HORARIOS KIRA & REYPIK modular.
- 🔴 Estado global compartido sin protección → ✓ Store con eventos.
- 🔴 Sin capa de persistencia local → ⏳ pendiente.
- 🟡 Race conditions en sincronización → ✓ cola en `sync.js`.
- 🟡 No hay versionado de datos → ⏳.
- 🟡 API endpoint hardcodeado en cliente → ⏳ pendiente proxy.

**Mejoras técnicas**
- 🔴 Separar en módulos → ✓ hecho.
- 🟡 Patrón de estado centralizado con eventos → ✓ Store.
- 🟡 Capa de abstracción para backend (DataSource) → ⏳.
- 🟢 Migrar a ES6+ con transpilación → ⏳.

**Mejoras funcionales**
- 🟡 Multi-usuario con roles → **descartado** por decisión: solo Nacho usa la app.
- 🟡 Modo offline (Service Worker) → ⏳.
- 🟢 Histórico de cambios (audit trail) → ⏳.

**Innovaciones**
- 🟡 Arquitectura PWA con push notifications → ⏳.
- 🟢 Microservicios ligeros (Cloudflare Workers / Vercel Functions) → ⏳.
- 🟢 Componentes web reutilizables → ⏳.

### 2 · Ingeniero de software senior

**Errores y bugs**
- 🔴 `contarDiasAusencia()` cuenta laborables, no naturales → ✓ corregido (negocio quiere naturales).
- 🔴 `cancelarAusencia()` elimina sustituciones de otros empleados → ✓ filtro por empleado en `removeAusencia`.
- 🔴 Cambio de año rompe semana ISO → A/B → ✓ correlativo en `Utils.getSemanaAB`.
- 🟡 `editarHorarioSustituto()` usa `prompt()` con formato decimal → ✓ Modales.
- 🟡 `eliminarFalta()` tiene índice frágil → ⏳.
- 🟡 Rotación Isabel L-V referencia ISO 15 hardcodeada → ✓ configurable en `CONFIG.ROTACIONES.lv_isabel`.
- 🟡 Detección de solapamientos incompleta en FdS → ⏳ (parte de bug pendiente #1).
- 🟡 Lógica ABEL/ANDREA condicional enterrada en fallback → ✓ subida a `CONFIG.OVERRIDES_DIAS_LV`.
- 🟢 Caché de horas semanales obsoleto → ⏳.

**Mejoras técnicas**
- 🔴 Código duplicado masivo (~15 funciones repiten "obtener horarios para fecha") → ✓ una sola `Rotaciones.getHorariosLV`.
- 🔴 Generación de HTML con concatenación sin escapar (XSS) → ✓ `Utils.escapeHtml`.
- 🟡 Funciones comprimidas ilegiblemente → ✓ código nuevo legible.
- 🟡 Búsquedas lineales O(n) por todos los arrays → ⏳ aceptable para volumen actual.
- 🟡 Motor de sustituciones complejidad N² → ⏳ aceptable; mejorar en Fase 5.
- 🟢 Dos funciones duplicadas de número de semana → ✓ solo `Utils.getNumSemana`.

**Mejoras funcionales**
- 🟡 Validar datos cargados de Sheets → ⏳.
- 🟡 No hay deshacer (Ctrl+Z) → ⏳.
- 🟢 Tests unitarios para motor de rotaciones → ✓ infraestructura creada en `tests/`.

**Innovaciones**
- 🟡 Motor de sustituciones en Web Worker → ⏳ Fase 5.
- 🟢 Linting / Prettier → ⏳.
- 🟢 TypeScript o JSDoc → ⏳.

### 3 · Product owner / analista funcional

**Errores y bugs**
- 🔴 Conteo vacaciones incluye FdS → ✓ días naturales correcto.
- 🔴 Cancelar ausencia borra sustituciones ajenas → ✓.
- 🟡 Sin distinción de contrato GV/IS para compartidos → ⏳.
- 🟡 CAROLINA: restricción de cierre solo aviso → ⏳.
- 🟡 30 días de vacaciones fijos para todos (no contempla parcial) → ⏳.

**Mejoras técnicas**
- 🟡 Tipo "asuntos propios" inyectado en DOM → ✓ tipo en config.
- 🟡 No hay log de actividad visible → ⏳.

**Mejoras funcionales**
- 🔴 Falta gestión de festivos → ✓ Festivos.
- 🔴 No hay validación de ausencias solapadas → ✓.
- 🟡 Sin resumen mensual de horas por empleado → ⏳.
- 🟡 No se puede planificar a futuro (operativo vs provisional) → ⏳.
- 🟡 No hay flujo de intercambio de turnos → ⏳.
- 🟡 Falta exportación de datos para nóminas → **descartado** por decisión: Nacho no necesita exportar a nóminas, sí necesita recuento de festivos trabajados → ✓ hecho.
- 🟡 Sin alerta proactiva de exceso de horas → ⏳.
- 🟢 Sin gestión de turnos partidos / motivo detallado / horas extras → ⏳.

**Innovaciones**
- 🔴 Notificaciones automáticas a empleado (WhatsApp/email) → ⏳.
- 🟡 Predicción de necesidades de cobertura → ⏳ Fase 5 (capa 2).
- 🟡 Portal de empleado self-service → **descartado** por ahora (solo Nacho usa la app).
- 🟡 Integración con sistema de fichaje → ⏳.
- 🟢 Dashboard de KPIs / exportación A3Nom Sage → ⏳.

### 4 · Especialista UX/UI

**Errores y bugs**
- 🔴 `prompt()`/`alert()` para interacciones críticas → ✓ Modales propios.
- 🟡 Tooltip de horas solo en hover → ⏳.
- 🟡 Calendario no responsive → ⏳ Fase 4.
- 🟡 Animación de alertas agresiva → ⏳ Fase 4.

**Mejoras técnicas**
- 🟡 No hay estados de carga en acciones → ⏳.
- 🟡 Modales sin accesibilidad (focus trap, Escape, role=dialog) → ✓ Escape implementado, resto ⏳.
- 🟢 No hay skeleton loading → ⏳.

**Mejoras funcionales**
- 🔴 Flujo de sustitución de 5 pasos excesivo → ✓ wizard simplificado.
- 🟡 No hay búsqueda de empleados → ⏳.
- 🟡 Colores no accesibles para daltonismo → ⏳ Fase 4.
- 🟡 Menú contextual con click izquierdo → ⏳.
- 🟡 Sin confirmación visual al completar acciones → ✓ toasts.
- 🟢 Botones del header saturados → ⏳ Fase 4.
- 🟢 Formulario de empleado plano → ⏳.

**Innovaciones**
- 🟡 Drag & drop para reasignar turnos → ⏳ Fase 5.
- 🟡 Vista timeline (Gantt) por día → ⏳ Fase 5.
- 🟡 Tema oscuro → ⏳ Fase 4.
- 🟢 Atajos de teclado → ⏳.
- 🟢 Onboarding / ayuda contextual → **descartado** (solo Nacho).

---

## Cómo ejecutar tests

Abrir `horarios-tiendas/tests/tests.html` en el navegador. Verde = todo pasó. Rojo = falló y muestra cuál.

---

## Modo de ejecución y flujo de git

Nacho lanza Claude Code con `claude --dangerously-skip-permissions`, así que ejecuto herramientas (edit, bash, write) sin pedir aprobación cada vez. **Esto exige disciplina con git**:

1. **Antes de empezar trabajo importante** → comprobar `git status`. Si no está limpio, avisar a Nacho y proponer commit/stash antes de tocar nada.
2. **Después de cada bloque validado** ("OK", "todo verde", "perfecto") → proponer commit con mensaje descriptivo. No commitear sin que Nacho lo apruebe.
3. **Acciones destructivas** (`rm`, `git reset --hard`, `git checkout .`, borrar archivos sin trackear, `git push --force`) → SEGUIR pidiendo confirmación explícita aunque el flag esté activo. El flag salta permisos del harness, no mi criterio.
4. **Nunca mezclar** mis cambios con cambios previos sin commitear de Nacho — avisar primero.
5. **`.gitignore`** ya excluye: `*.app/`, `*.xlsx` (datos LOPD), `SELLO*.png`, `Icono*.png`, `icono_*.png`, `Gemini_Generated_*.png`. Si Nacho añade un archivo nuevo con datos personales, recordarle ignorarlo.

**Estado del repo al iniciar:** rama `main`, último commit relevante = `4e82336` (snapshot inicial Fases 1-3 + auditoría + CLAUDE.md, 7 abril 2026).

---

## Memoria persistente

Las preferencias de Nacho y decisiones del proyecto viven en
`/Users/nacho/.claude/projects/-Users-nacho-Desktop-COSAS-PARA-COWORK/memory/`.
Léelas al empezar conversación. Actualízalas cuando aprendas algo nuevo.
