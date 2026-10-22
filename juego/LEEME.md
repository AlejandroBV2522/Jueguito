# El motor del juego

Antes, todo el código estaba en un solo `main.js`. Ahora está repartido en
estos archivos, en el mismo orden en que estaba. Lo propio de cada mundo no
está aquí: su gente, sus diálogos, sus preguntas y el dibujo de su oficina
(`tema.js`) están en `mundos/`.

## Cómo funciona sin build ni módulos

Son scripts normales que `index.html` carga uno tras otro (`<script defer>`).
El juego se puede abrir con doble clic en `index.html`, y desde ahí los
`import`/`export` no funcionan. Los `const`, `let` y `function` del nivel
superior se comparten entre todos los archivos de la página. Por eso un
archivo puede usar lo que declara otro sin importarlo.

Una regla importante: **al cargar, un archivo solo ve lo que ya se cargó**.
El código que corre en el momento de cargar (un `const x = algo()` de nivel
superior, un `forEach` suelto) solo puede usar archivos anteriores en
`index.html`. Si no, el navegador da `ReferenceError: X is not defined`.
Lo mismo vale para los eventos que se registran al cargar (un clic, una
tecla): entre un archivo y el siguiente el navegador puede atender un
evento. Por eso `interfaz/selector.js` y `controles.js`, que conectan los
eventos, van al final, justo antes de `bucle.js`. Una función que solo se
llama desde el bucle o desde otra función puede usar cualquier archivo.
`node tools/revisar_proyecto.mjs` revisa todo esto.

Otras reglas:

- Cada archivo empieza con `"use strict";`.
- Los nombres de nivel superior no se pueden repetir entre archivos. A
  veces da error al cargar y a veces no: dos `function` iguales se pisan en
  silencio (gana la última). `revisar_proyecto.mjs` lo avisa.
- Un archivo nuevo va en `index.html`. Si no está ahí, no se carga
  (`revisar_proyecto.mjs` también lo avisa).
- `juego/bucle.js` va siempre al final, porque arranca el juego.

## Mapa de archivos (en orden de carga)

| Carpeta | Archivo | Qué tiene |
|---|---|---|
| `base/` | `constantes.js` | medidas del camino, colores y tipografía |
| `camino/` | `fisica.js` | gravedad y salto, huecos y obstáculos de la Cueva, barreras |
| `base/` | `utilidades.js` | `clamp`, `lerp`, `mezclar`, `conAlfa`, `crearAzar`… |
| `base/` | `paleta.js` | de gris a color según el avance |
| `base/` | `canvas.js` | el canvas, `ctx`, `S` y `redimensionar` |
| `base/` | `imagenes.js` | `cargarImagen` y los edificios de llegada (Atlas, Lirios) |
| `camino/` | `npcs-y-andamios.js` | la gente del camino, sus andamios, los antivalores |
| `oficina/` | `modulos.js` | `modulos` (un objeto por mundo), muebles, compañeros, `ESTACIONES` |
| `camino/` | `letreros.js` | dónde van los letreros de obra |
| `dibujo/` | `sprites-enemigos.js`, `sprites-personajes.js` | imágenes de enemigos, héroe y NPC |
| `camino/` | `zona-industrial.js`, `decoracion-cueva.js` | lo que hay en cada zona |
| `base/` | `estado.js` | `estado`, `heroe`, `camara`, `entrada`, `dlg` |
| `interfaz/` | `interfaz.js` | `ui` (elementos HTML), `ponerLogo`, HUD |
| `interfaz/` | `dialogos.js` | diálogos con los NPC |
| `oficina/` | `oficina.js` | entrar y salir de la oficina, la terminal y sus preguntas |
| `mapa/` | `mapa.js` | progreso guardado, `completarModulo`, carta, `entrarMundo`, `volverAlMapa` |
| `camino/` | `cueva.js` | tubos, colisiones, peleas con antivalores, `accion` |
| — | `actualizar.js` | `actualizar(dt)`: física y lógica de cada cuadro |
| `dibujo/` | `formas.js` | `circulo`, `linea`, `rectRedondo` |
| `dibujo/` | `escenario.js` | cielo, nubes, Celaque, tubos |
| `camino/` | `dibujo-zona-industrial.js`, `dibujo-zona-planos.js` | dibujo del camino |
| `dibujo/` | `avisos.js` | avisos flotantes, andamios, barreras y suelo |
| `camino/` | `dibujo-cueva.js` | la Cueva y la calle de Celaque (logos, edificios) |
| `oficina/` | `dibujo-oficina.js` | ventanal, muebles, computadora; llama al tema de cada oficina (`mundos/<mundo>/tema.js`, registrado en `window.TEMAS_OFICINA`) |
| `oficina/` | `estaciones.js` | robot de IA y antivirus que se arman |
| `camino/` | `dibujo-letreros.js` | dibujo de los letreros de obra |
| `dibujo/` | `aves.js`, `guias.js`, `personajes.js` | aves, guías y enemigos, héroe y NPC |
| `mapa/` | `dibujo-mapa.js` | el mapa de mundos, el delfín |
| `dibujo/` | `efectos.js` | mariposas, lluvia, pétalos y `dibujar(dt)` |
| `interfaz/` | `barra-jugador.js` | la barrita con la cara y los corazones |
| `interfaz/` | `selector.js` | personaje, `iniciarTalento`, `iniciarOficina`, `reiniciarHeroe` (conecta eventos: va al final) |
| — | `controles.js` | teclado, rueda y botones táctiles (conecta eventos: va al final) |
| — | `bucle.js` | arranque y bucle principal |

## Antes de entregar un cambio

```bash
node tools/revisar_proyecto.mjs        # scripts, sintaxis, orden de carga, datos, assets
node tools/probar_juego.mjs <escenario> # juega y saca capturas
node tools/comparar_capturas.mjs       # si el cambio NO debe verse distinto
```
