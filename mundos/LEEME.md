# Mundos

Cada mundo del mapa (un módulo de capacitación) tiene su carpeta. Para
cambiar lo que dice o pregunta un mundo, basta con editar los archivos de su
carpeta. El motor del juego (`juego/`) no se toca.

| Carpeta | Mundo | Archivos |
|---|---|---|
| `talento/` | 1 · Talento: el camino y la Cueva | `mundo.js` (anfitriona y carta), `npcs.js` (gente del camino), `cueva.js` (antivalores y sus preguntas) |
| `proyectos/` | 2 · Proyectos (Wrike) | `mundo.js` |
| `procesos/` | 3 · Procesos (Edificio Lirios) | `mundo.js` |
| `sharepoint/` | 4 · SharePoint, Outlook y Teams (Torre Atlas) | `mundo.js` |
| `seguridad/` | 5 · Seguridad (estación del antivirus) | `mundo.js` |
| `ia/` | 6 · IA (estación del robot) | `mundo.js` |

Un `mundo.js` tiene la carta del mapa, el anfitrión (★), los compañeros de la
oficina con sus diálogos y las preguntas de la computadora. Qué significa
cada campo está explicado en `config.js`, en la sección "Módulos de
capacitación".

Lo marcado con `✏️ Borrador` todavía debe revisarlo el área responsable.

## Agregar un mundo nuevo

1. Copia la carpeta de un mundo parecido (por ejemplo `proyectos/`) con el
   nombre nuevo, en minúsculas y sin tildes.
2. Cambia los datos en su `mundo.js`. El `nombre` no se puede repetir: el
   progreso guardado de cada jugador usa ese nombre.
3. En `index.html`, agrega su `<script defer src="mundos/<carpeta>/mundo.js">`
   junto a los demás. El orden de esas líneas es el orden de los mundos en el mapa.
4. Revisa con `node tools/revisar_proyecto.mjs`: avisa si falta el script,
   si un nombre se repite o si una respuesta correcta no existe.
