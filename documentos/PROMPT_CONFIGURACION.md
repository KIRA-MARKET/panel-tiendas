# Prompt de configuración — App de Horarios

Copia y pega esto a Claude Code junto con la plantilla rellena del negocio.

---

## PROMPT

```
Soy el dueño de un negocio y quiero configurar esta app de gestión de horarios para mi empresa. Te adjunto una plantilla rellena con todos los datos de mi negocio.

Esta app fue creada originalmente para otro negocio (dos supermercados). Necesito que la adaptes a mi caso concreto, manteniendo toda la lógica del motor de sustituciones, el calendario, el auditor, los modales y la sincronización con Google Sheets. Lo único que cambia son los datos de configuración.

### QUÉ ARCHIVOS DEBES MODIFICAR

1. **`config.js`** — Es el archivo principal de configuración. Aquí debes cambiar:
   - `TIENDAS`: nombres y configuración de mis tiendas
   - `TIENDA_FLEXIBLE`: qué tienda cede cuando hay solape de empleados compartidos
   - `MINIMOS_LV_*`: mínimos de personas por franja en días laborables, para cada tienda
   - `MINIMOS_FDS_*`: mínimos en fines de semana, para cada tienda
   - `RESTRICCIONES`: restricciones específicas de cada empleado (días que trabaja, si puede hacer cierre, si solo trabaja fines de semana, etc.)
   - `ROTACIONES`: configuración de rotaciones A/B entre semanas, rotación de fines de semana, y cualquier otra rotación
   - `PRESTAMO_ENTRE_TIENDAS`: qué empleados se pueden mover entre tiendas
   - `GRUPO_DESCARGA_*`: si hay grupo específico para apertura/descarga
   - `DESCANSO_EXCEPCIONES`: empleados con excepciones en las horas de descanso entre turnos
   - `OVERRIDES_DIAS_LV`: empleados que no trabajan todos los días L-V
   - `FRANJAS_*`: definición de las franjas horarias de cada tienda (descarga, mañanas, tardes, cierre)
   - `TURNOS_FESTIVO`: turnos disponibles en días festivos

2. **`empleados.js`** — Plantilla de empleados por defecto. Cada empleado tiene:
   - `alias`: nombre corto (PEDRO, MARTA...)
   - `nombre`: nombre completo
   - `tienda`: en qué tienda trabaja (o "ambas")
   - `contrato`: horas semanales de contrato
   - `activo`: true/false

3. **`festivos.js`** — Lista de festivos. Cambiar:
   - `DEFAULT_FIJOS`: festivos nacionales + autonómicos + locales de la ciudad del negocio
   - Los festivos variables (Semana Santa) se calculan automáticamente, no hay que tocarlos

4. **`reglas.js`** — Si el negocio tiene reglas de sustitución distintas (ej: exclusiones mutuas entre empleados, restricciones de franja), añadir o modificar las validaciones en `Reglas.validarCandidato()`.

5. **`index.html`** — Cambiar:
   - El título de la página
   - El logo/texto del header
   - Los nombres de los botones de tienda (ej: "Centro" / "Norte" en vez de "Gran Vía" / "Isabel")

6. **`sync.js`** — Cambiar:
   - `CONFIG.SHEETS_API`: la URL del Apps Script del nuevo Google Sheets

### QUÉ NO DEBES TOCAR

- `datos.js` (Store) — funciona igual para cualquier negocio
- `motor-sustituciones.js` — la lógica del motor es genérica
- `cobertura.js` — el cálculo de cobertura es genérico
- `calendario-ui.js` — el render del calendario es genérico
- `modales-ui.js` — los modales son genéricos
- `auditor.js` — el auditor es genérico
- `utilidades.js` — las utilidades son genéricas
- `ausencias.js` — la gestión de ausencias es genérica
- `control.js` — el control de vacaciones/faltas es genérico
- `horas.js` — el cómputo de horas es genérico
- `pdf.js` — la generación de PDF es genérica
- Los archivos CSS — funcionan igual

### GOOGLE SHEETS

Para que la app funcione, el usuario necesita:

1. Crear un Google Sheets nuevo con estas hojas:
   - `empleadosGV` (o el nombre de la tienda 1)
   - `empleadosIS` (o el nombre de la tienda 2)
   - `horariosGV`
   - `horariosIS`
   - `rotaciones`
   - `ausencias`
   - `sustituciones`
   - `modificaciones`
   - `faltas`
   - `descartadas`
   - `decisiones`
   - `festivos`

2. Crear un Apps Script vinculado al Sheets que exponga una API con:
   - `GET ?action=readAll` → devuelve todos los datos de todas las hojas
   - `POST ?action=save` → guarda datos en una hoja específica
   El código base del Apps Script está en `KIRA_setup_sheets.gs` — se puede adaptar cambiando los nombres de las hojas.

3. Desplegar el Apps Script como webapp (Ejecutar como: yo, Acceso: cualquiera)

4. Copiar la URL del despliegue en `CONFIG.SHEETS_API`

### HOSTING

Para acceder desde cualquier sitio:

1. Crear cuenta en GitHub (gratis)
2. Crear repositorio y subir el código
3. Activar GitHub Pages
4. Acceder desde el móvil y añadir a pantalla de inicio

### PASOS RECOMENDADOS

1. Primero lee la plantilla rellena completa
2. Modifica `config.js` con todos los datos del negocio
3. Modifica `empleados.js` con la lista de empleados
4. Modifica `festivos.js` con los festivos de la ciudad
5. Modifica `reglas.js` si hay reglas especiales
6. Actualiza `index.html` con el nombre del negocio
7. Prueba que todo funciona abriendo `index.html` en el navegador
8. Escribe tests en `tests/tests.js` para las reglas específicas del negocio
9. Ayuda al usuario a montar el Google Sheets y el hosting

### IMPORTANTE

- No inventes datos. Solo usa los que el usuario ha proporcionado en la plantilla.
- Si falta información (ej: no ha puesto los mínimos de una franja), PREGUNTA antes de inventar.
- Si el negocio tiene más o menos tiendas que 2, habrá que adaptar el código. La app base soporta exactamente 2 tiendas.
- Si el negocio tiene solo 1 tienda, simplifica: quita el selector de tiendas y todo lo relativo a préstamos entre tiendas.
```
