# Mundos

Cada mundo del mapa (un módulo de capacitación) tiene su carpeta. Para
cambiar lo que dice o pregunta un mundo, basta con editar los archivos de su
carpeta. El motor del juego (`juego/`) no se toca.

| Carpeta | Mundo | Archivos |
|---|---|---|
| `talento/` | 1 · Talento: el camino y la Cueva (Agalta) | `mundo.js` (anfitriona y carta), `npcs.js` (gente del camino), `cueva.js` (antivalores y sus preguntas) |
| `proyectos/` | 2 · Proyectos (gestión de proyectos, Distrito Artemisa) | `mundo.js`, `tema.js` (planos, tablero de tareas, maqueta) |
| `procesos/` | 3 · Procesos (Wrike, Edificio Lirios) | `mundo.js`, `tema.js` (engranes, diagrama de flujo, banda transportadora) |
| `sharepoint/` | 4 · SharePoint, Outlook y Teams (Torre Atlas, llevar los permisos de A a B) | `mundo.js`, `tema.js` (documentos a la nube, carpetas, servidor) |
| `seguridad/` | 5 · Seguridad (Acacias San Ignacio, esquivar virus y reparar el antivirus) | `mundo.js`, `tema.js` (escudos, lista de chequeo, cámaras) |
| `ia/` | 6 · IA (Zorzales del Merendón, taller con 3 robots) | `mundo.js`, `tema.js` (red de nodos, red neuronal, hologramas) |

Un `mundo.js` tiene la carta del mapa, la foto de su edificio (`foto`, en
`assets/edificios/`, ya sin cielo), el anfitrión (★), los compañeros de la
oficina con sus diálogos y las preguntas de la computadora. Qué significa
cada campo está explicado en `config.js`, en la sección "Módulos de
capacitación".

Un `tema.js` es cómo se ve la oficina por dentro: lo que flota en el aire,
lo que hay dibujado en la pizarra y el objeto propio junto a la computadora.
Es código de dibujo (usa `ctx`, `S`, `tiempo`...), no contenido. Lo que se ve
por el ventanal (`oficina.vista`) y las estaciones del robot y el antivirus
(`oficina.estacion`) son parte del motor porque las pueden usar varios mundos.

Lo marcado con `✏️ Borrador` todavía debe revisarlo el área responsable.

## Agregar un mundo nuevo

1. Copia la carpeta de un mundo parecido (por ejemplo `proyectos/`) con el
   nombre nuevo, en minúsculas y sin tildes.
2. Cambia los datos en su `mundo.js`. El `nombre` no se puede repetir: el
   progreso guardado de cada jugador usa ese nombre.
3. Para que la oficina se vea distinta, cambia en su `tema.js` el nombre del
   tema (`window.TEMAS_OFICINA.<tema>`) y pon ese mismo nombre en
   `oficina.tema` de su `mundo.js`. Si prefieres reusar el tema de otro
   mundo, borra el `tema.js` (y su línea en `index.html`) y usa el nombre de ese tema.
4. En `index.html`, agrega sus `<script defer src="mundos/<carpeta>/...">`
   junto a los demás. El orden de esas líneas es el orden de los mundos en el mapa.
5. Revisa con `node tools/revisar_proyecto.mjs`: avisa si falta un script,
   si un nombre se repite, si un tema no existe o si una respuesta correcta no existe.
