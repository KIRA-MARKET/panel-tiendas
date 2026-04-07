# CLAUDE.md — KIRA · REYPIK · YOLANDA HP

Instrucciones de proyecto para Claude Code. Léelas siempre antes de tocar nada.

---

## Contexto general

Nacho es dueño de **dos tiendas** (KIRA MARKET y REYPIK MARKET, dos CIF, dos contratos, dos nóminas). Solo Nacho usa la app (Eva como extensión). **No hay sistema de roles.**

Hay dos sistemas en este directorio:

1. **`app_horarios_v8.html`** — App actual en producción. Monolítica (~4260 líneas). **NO TOCAR** salvo bug crítico explícitamente pedido. Sirve como referencia.
2. **`YOLANDA_HP/`** — Rediseño premium modular. Es donde se trabaja activamente.

---

## YOLANDA HP — Estructura

```
YOLANDA_HP/
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

## Reglas de oro al editar YOLANDA HP

1. **NO romper lo que ya funciona.** Antes de cambiar lógica existente, leerla entera.
2. **Tras cualquier función nueva o cambio importante → escribir un test** en `YOLANDA_HP/tests/tests.js`. Casos: normal, límite, vacío. (Memory: feedback_tests.md)
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
2. **Datos**: `YOLANDA_HP/js/config.js`
   `RESTRICCIONES`, `MINIMOS_LV_*`, `MINIMOS_FDS_*`, `ROTACIONES`, `PRESTAMO_ENTRE_TIENDAS`, `GRUPO_DESCARGA_GV`, `DESCANSO_EXCEPCIONES`, `OVERRIDES_DIAS_LV`.
3. **Lógica**: `YOLANDA_HP/js/reglas.js`
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
2. **Estrategia "reorganizar plantilla":** cuando falta alguien, sugerir alargar el horario base de otro en vez de mover sustituto.
3. **DAVID/LETI exclusión mutua viernes Isabel:** solo uno de los dos puede sustituir el mismo viernes.
4. **Capa 2 del motor:** aprender de las decisiones históricas de Nacho.

---

## Auditoría técnica de `app_horarios_v8.html` (6 abril 2026)

Esta auditoría dio origen a YOLANDA HP. Es la lista canónica de razones para el rediseño y la check-list de qué problemas NO debe arrastrar la nueva app.

### Top 10 prioridades (resumen ejecutivo)

| # | Prio | Hallazgo | Impacto | Estado YOLANDA HP |
|---|------|----------|---------|---|
| 1 | CRÍTICO | Conteo de vacaciones incluye fines de semana | Errores legales | Días naturales correctos por diseño |
| 2 | CRÍTICO | Cancelar ausencia borra sustituciones de otros | Pérdida de datos | ✓ Arreglado en `Store.removeAusencia` |
| 3 | CRÍTICO | Sin gestión de festivos | Alertas falsas | ✓ Módulo Festivos (Fase 3) |
| 4 | CRÍTICO | No hay validación de ausencias solapadas | Corrupción de datos | ✓ `Store.ausenciaSolapada` |
| 5 | CRÍTICO | API de Google Sheets expuesta sin autenticación | Seguridad | ⏳ Pendiente capa de proxy |
| 6 | CRÍTICO | Sin persistencia local (offline) | Pérdida de trabajo | ⏳ Pendiente Service Worker / IndexedDB |
| 7 | CRÍTICO | `prompt()` del navegador para edición | UX inaceptable | ✓ Modales propios |
| 8 | IMPORTANTE | Race conditions en sync con Sheets | Datos inconsistentes | ✓ Cola en `sync.js` |
| 9 | IMPORTANTE | Semana A/B incorrecta en cambio de año | Horarios incorrectos | ✓ Correlativo, no por ISO |
| 10 | IMPORTANTE | Sin resumen mensual de horas por empleado | Bloquea nóminas | ⏳ Pendiente |

### 1 · Arquitecto de software

**Errores y bugs**
- 🔴 Archivo monolítico sin separación de responsabilidades (4260 líneas) → ✓ YOLANDA HP modular.
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

Abrir `YOLANDA_HP/tests/tests.html` en el navegador. Verde = todo pasó. Rojo = falló y muestra cuál.

---

## Memoria persistente

Las preferencias de Nacho y decisiones del proyecto viven en
`/Users/nacho/.claude/projects/-Users-nacho-Desktop-COSAS-PARA-COWORK/memory/`.
Léelas al empezar conversación. Actualízalas cuando aprendas algo nuevo.
