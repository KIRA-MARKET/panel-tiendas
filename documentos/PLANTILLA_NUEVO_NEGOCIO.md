# Configuración de App de Horarios — Plantilla para nuevo negocio

Rellena este documento con los datos de tu negocio. Después, abre Claude Code con el código de la app y pégale este documento. Él se encarga de configurarlo todo.

---

## 1. DATOS DEL NEGOCIO

**Nombre del negocio:**
(ej: SUPERMERCADOS LÓPEZ)

**¿Cuántas tiendas tienes?**
(ej: 2)

**Nombre y ubicación de cada tienda:**
- Tienda 1: (ej: Tienda Centro — Calle Mayor 5, Málaga)
- Tienda 2: (ej: Tienda Norte — Av. Europa 12, Málaga)

**¿Hay empleados compartidos entre tiendas?**
(ej: Sí, PEDRO y MARTA trabajan en ambas)

**Si hay solape entre tiendas, ¿cuál tiene prioridad?**
(ej: Tienda Centro siempre tiene prioridad, Tienda Norte cede)

---

## 2. EMPLEADOS

Rellena una línea por empleado. Indica en qué tienda(s) trabaja.

| Nombre/Alias | Tienda(s) | Puesto | Contrato horas/semana | Observaciones |
|---|---|---|---|---|
| (ej: PEDRO) | (ej: ambas) | (ej: encargado) | (ej: 40h) | (ej: no trabaja domingos) |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

---

## 3. HORARIOS Y TURNOS

### Horario de apertura de cada tienda

| Tienda | Lunes-Viernes | Sábado | Domingo |
|---|---|---|---|
| (ej: Centro) | (ej: 9:00 - 22:00) | (ej: 9:00 - 22:00) | (ej: 10:00 - 15:00) |
| | | | |

### Franjas horarias

¿Cómo divides el día? (ej: mañanas, tardes, cierre... o turnos fijos)

- Franja 1: (ej: Apertura/Descarga — 5:00 a 9:00)
- Franja 2: (ej: Mañanas — 9:00 a 15:00)
- Franja 3: (ej: Tardes — 15:00 a 22:00)
- Franja 4: (ej: Cierre — 20:00 a 22:00)

### ¿Usas rotación de semanas (tipo A/B)?

(ej: Sí, semana A horario de mañanas, semana B horario de tardes)

Si la respuesta es sí, detalla los horarios de cada empleado en semana A y semana B:

**Semana A:**
| Empleado | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| (ej: PEDRO) | (ej: 5:00-13:00) | (ej: 5:00-13:00) | (ej: 5:00-13:00) | (ej: 5:00-13:00) | (ej: 5:00-13:00) |
| | | | | | |

**Semana B:**
| Empleado | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| (ej: PEDRO) | (ej: 14:00-22:00) | (ej: 14:00-22:00) | (ej: 14:00-22:00) | (ej: 14:00-22:00) | (ej: 14:00-22:00) |
| | | | | | |

### Fines de semana

¿Cómo funcionan los fines de semana?

- ¿Hay rotación de fines de semana? (ej: cada 3 semanas le toca a cada uno)
- ¿Orden de rotación? (ej: PEDRO → MARTA → LUIS → ...)
- ¿Turnos de fin de semana? (ej: Sábado mañana 7:00-15:00, Sábado tarde 14:00-22:00, Domingo 7:00-15:00)

---

## 4. MÍNIMOS POR FRANJA

¿Cuántas personas necesitas como mínimo en cada franja?

### Lunes a Viernes

| Franja | Tienda 1 | Tienda 2 |
|---|---|---|
| (ej: Descarga) | (ej: 1) | (ej: 1) |
| (ej: Mañanas) | (ej: 2) | (ej: 2) |
| (ej: Tardes) | (ej: 2) | (ej: 1) |
| (ej: Cierre) | (ej: 1) | (ej: 1) |

### Fines de semana

| Turno | Tienda 1 | Tienda 2 |
|---|---|---|
| (ej: Sábado mañana) | (ej: 2) | (ej: 1) |
| (ej: Sábado tarde) | (ej: 2) | (ej: 1) |
| (ej: Domingo) | (ej: 1) | (ej: 1) |

---

## 5. RESTRICCIONES Y REGLAS ESPECIALES

Aquí va lo más importante: las reglas "no escritas" de tu negocio. Todo lo que tú sabes de memoria pero no está en ningún sitio.

### Restricciones por empleado

(ej: LUIS no puede hacer cierre porque tiene que recoger a su hijo)
(ej: MARTA solo trabaja lunes, miércoles y viernes)
(ej: ANA y CARLOS no pueden coincidir el mismo turno)

-
-
-
-
-

### Reglas de sustitución

Cuando falta alguien, ¿cómo decides quién lo sustituye?

- ¿Hay empleados que son preferentes para sustituir? (ej: siempre mover primero a PEDRO)
- ¿Hay empleados que NUNCA sustituyen? (ej: ANA no se mueve de su tienda)
- ¿Se pueden prestar empleados entre tiendas? (ej: sí, pero solo de Centro a Norte, nunca al revés)
- ¿Cuántas horas mínimas de descanso entre turnos? (ej: 12 horas)
- ¿Algún empleado tiene excepciones de descanso? (ej: PEDRO puede hacer cierre y abrir al día siguiente)

### Vacaciones

- ¿Cuántos días de vacaciones por empleado al año? (ej: 30 días naturales)
- ¿Se cuentan en días naturales o laborables?

---

## 6. FESTIVOS

**Ciudad para los festivos locales:** (ej: Málaga)

**¿Se trabajan los festivos?** (ej: sí, todos)

**¿Son voluntarios?** (ej: sí, los empleados se apuntan y yo asigno)

**¿Se pagan aparte?** (ej: sí)

**¿Qué turnos hay en festivo?** (ej: mañana 7:00-15:00, tarde 15:00-22:00)

---

## 7. OTRAS COSAS QUE QUIERAS CONTAR

Cualquier cosa que no encaje en las secciones anteriores pero que sea importante para gestionar los horarios de tu negocio:

(escribe aquí)

---

## INSTRUCCIONES PARA CLAUDE CODE

Cuando tengas este documento relleno:

1. Pide a Nacho (o a quien te pase la app) una copia del código
2. Instala Claude Code si no lo tienes: https://claude.ai/claude-code
3. Abre el terminal en la carpeta del código
4. Escribe: `claude`
5. Pégale este documento y dile: "Configura la app con estos datos"
6. Claude modificará `config.js`, `empleados.js` y `festivos.js` con tus datos
7. Para el hosting (acceder desde móvil), dile: "Monta el hosting en GitHub Pages"
