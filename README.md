# Camino a Celaque

Juego de navegador: el protagonista camina desde un mundo gris y lluvioso hasta
**Celaque**, cruzando una zona industrial y conociendo a ingenieros y
constructores (NPC) en el camino. Al inicio todo es gris (smog y lluvia); a
medida que avanza, las fábricas, bodegas y grúas recuperan sus colores.

Todo el código es propio: no usa librerías ni enlaces de terceros. La
tipografía (Muli) y los logos son los oficiales de Celaque y van incluidos en
el proyecto (`assets/fuentes/`, `assets/logos/`).
Casi todo se dibuja con `<canvas>`; la llegada a Celaque (al salir de la
Cueva) usa unas pocas imágenes PNG propias (`assets/edificios/`). La página
bloquea cualquier carga externa (Content-Security-Policy en `index.html`),
así que solo se cargan archivos del propio proyecto.

## Cómo ejecutarlo

**Opción 1: la más fácil.** Haz doble clic en `index.html`. Se abre en tu
navegador (Chrome, Edge o Firefox) y listo.

**Opción 2: con un servidor local** (útil para probar desde el celular en la
misma red WiFi). En una terminal, dentro de esta carpeta:

```bash
# Si tienes Python
python -m http.server 5500

# Si tienes Node.js
npx serve . -l 5500
```

Luego abre `http://localhost:5500` en el navegador. (Si el puerto está
ocupado, usa otro número, por ejemplo 5501.)

## Controles

| Acción                  | Teclado                   | Celular            |
|-------------------------|---------------------------|--------------------|
| Elegir personaje (centro del mapa) | Clic en la tarjeta | Tocar la tarjeta |
| Elegir mundo en el mapa | ← → o clic en la meseta | Tocar la meseta |
| Ver la carta / entrar   | Enter (o clic en el edificio) | Tocar el edificio |
| Volver en el mapa       | Esc                       | Botón "◀ Mapa"     |
| Caminar                 | ← → o A / D (o la rueda del mouse) | Botones ◀ ▶ |
| Correr                  | Mantener Q mientras caminas | Mantener "Correr" |
| Saltar                  | Espacio, ↑ o W            | Botón "Saltar"     |
| Hablar / entrar / avanzar diálogo | E o Enter (Espacio también, si hay alguien o una puerta enfrente) | Botón "Hablar" o tocar la caja |
| Responder en la computadora y en el repaso final | Clic o teclas 1, 2, 3 | Tocar la opción |
| Sonido sí / no          | Botón "♪ Sonido" (arriba a la derecha) | Igual |
| Modo fácil              | Interruptor en el centro del mapa | Igual |

Es un plataformero: cada NPC espera arriba de un andamio y hay que subir
saltando por los escalones para hablarle (desde el piso no te escucha).
Los escalones se atraviesan saltando desde abajo. En la calle hay barreras
de concreto que hay que saltar.

Los NPC te hablan solos la primera vez que llegas a su andamio. Después
puedes volver a hablarles con E.

Para quien no juega seguido: se puede saltar un instante después de salir
de un borde, y si presionas saltar justo antes de aterrizar el salto sale
solo. Caer en un hueco de la cueva te regresa justo antes del hueco, sin
perder vidas. Unas flechas luminosas a los pies del personaje y una columna
de luz marcan siempre a dónde ir.

### El mapa de mundos

El juego empieza en un **mapa** (al estilo del de Super Mario Land 2): una
meseta por módulo alrededor de la meseta central, donde está el rectángulo
para elegir personaje. Son 6 mundos, uno por módulo: Talento, Proyectos,
Procesos, SharePoint, Seguridad e IA. Solo el primero está abierto; los demás
tienen **candado** hasta completar el anterior.

Al elegir un mundo el mapa se **acerca** a su meseta. Al tocar su edificio
aparece su **carta**: qué sistema es (Wrike, SharePoint...) y qué hay que
hacer. Desde la carta se entra al nivel:

- **Talento** es el camino por la zona industrial y la Cueva (igual que
  antes). Al salir de la Cueva por el tubo vuelves al mapa.
- **Los demás** son una **oficina en lo alto de un edificio**: ventanal con
  la ciudad abajo, nubes, guacamayas y loros, y una oficina enorme al fondo.
  Te reciben varios compañeros con comentarios, hay muebles que saltar y al
  fondo la Terminal Celaque con las preguntas del módulo.

Antes de entrar hay que escribir tu **nombre** (en el rectángulo del
centro). Durante el nivel, arriba a la izquierda, se ve una barrita con tu
nombre, la cara de tu personaje y tus corazones: la cara se queja cuando te
golpean y sonríe cuando ganas corazones.

Cada mundo tiene un **personaje fijo** (con ★ y su nombre siempre a la
vista): Nancy Larios en Talento (al inicio del camino), Nazareth Gallardo en
Proyectos, Luis Morán en SharePoint, Sergio en Seguridad, Astrid en Procesos y Gracia en IA.
Se ven en el mapa, en la carta y son quienes te reciben.

Cada oficina es distinta: lo que se ve por el ventanal (obra con grúas,
zona industrial desde el Edificio Lirios, solo nubes desde la Torre Atlas,
montaña o puntas de edificios al atardecer), lo que flota en el aire
(planos, engranes, documentos, escudos, una red de IA), la pizarra y un
objeto propio. Al fondo, las preguntas se contestan en la computadora, salvo
en IA (se arman tres robots: de tierra, aéreo y humanoide, con dos aciertos cada uno) y en
Seguridad (primero esquivas los virus agachándote o saltando y luego cada
acierto repara una parte del antivirus). En SharePoint, antes de la
computadora, llevas los permisos de un miembro nuevo del punto A al B.
Con el nombre de pruebas (Kojima) todos los mundos están abiertos y ninguno
queda completado, para poder jugarlos una y otra vez.

En la Cueva cada enemigo es un **antivalor**, lo opuesto a lo que promueve
Celaque (La Mediocridad, El Individualismo, La Imprudencia, La
Improvisación y, de jefe final, La Indiferencia).

La primera vez se abre **"¿Cómo se juega?"**; después está en el botón de
arriba a la izquierda del mapa. Y hay sorpresas escondidas: un delfín que
salta del mar en el mapa (tócalo) y una avioneta por la ventana de la Torre
Atlas.

Al completar un módulo subes de nivel, vuelves al mapa y se abre el
siguiente mundo. Con los 6 completos viene el **repaso final** ("¿Estás
listo?"): una pregunta al azar de cada módulo, sin castigo, que cuenta las
que salieron bien a la primera. Después aparece la tarjeta de bienvenida a
Celaque con tu nombre y el botón **"Descargar constancia"**: abre la ventana
de imprimir del navegador, donde se elige "Guardar como PDF" (también se
saca después desde el mapa).

El progreso (y tu nombre) se guarda en el navegador; el botón "↻ Empezar de
cero", arriba a la derecha del mapa, lo borra todo (pide tocarlo dos veces).
El sonido y el **modo fácil** (saltos más altos, y ni las respuestas
equivocadas ni los virus quitan corazones) se guardan aparte y no se borran.

**Para probar:** con el nombre **Kojima** se abren todos los mundos de una
vez (se cambia o apaga en `config.js` → `nombrePruebas`). Con ese nombre
aparece también el botón **"Estadísticas"**: qué preguntas se fallan más,
con lo que se jugó en ese navegador (lo de Kojima no se cuenta).

## Personalizar

Lo general está en **`config.js`**:

- `velocidadPersonaje` / `velocidadCorriendo`: qué tan rápido camina y corre.
- `personajes`: el chico y la chica que se eligen al inicio (colores, pelo
  largo, falda, lazo).
- `largoDelCamino`: distancia hasta Celaque.
- `textos`: títulos y mensajes de las pantallas.
- `colores`: paleta oficial de Celaque (también en `style.css` como
  `--cel-...`).
- `nombrePruebas`: el nombre que abre todos los mundos (por defecto Kojima).
  `preguntasPorModulo` dice cuántas hace la computadora.
- `PROYECTOS_CELAQUE`: torres de fondo (Zorzales, Astria, Céfiro).
- La explicación de cada campo de un mundo (sección "Módulos de capacitación").

Lo de cada mundo está en **su carpeta, `mundos/<mundo>/`** (ver
`mundos/LEEME.md`):

- `mundo.js`: nombre, sistema y descripción de su carta, ícono, color, logo
  opcional, el personaje fijo `anfitrion`, cómo es su `oficina` por dentro,
  la intro y los comentarios de los compañeros, y las preguntas.
- En Talento, además, `npcs.js`: la gente del camino. Cada NPC tiene `nombre`,
  `posicion` (0 = inicio, 1 = Celaque), `apariencia` (colores, casco, chaleco
  y herramienta) y `dialogo` (lista de frases). Para agregar uno, copia un
  bloque `{ ... }` y cambia los datos. No hay límite de NPCs.
- Y `cueva.js`: los antivalores de la Cueva con sus preguntas.

Para agregar un mundo nuevo se copia una carpeta y se agrega su línea en
`index.html`. No hace falta tocar el motor (`juego/`).

**Marca:** el juego sigue el manual de marca de Celaque
(`assets/marca/`): paleta oficial, tipografía Muli y el logo siempre sin
deformar, sin transparencias y sobre fondos lisos. Los logos están en
`assets/logos/`; ahí mismo, `LEEME.md` lista los que faltan (módulos y
proyectos). Mientras no estén, se ve un recuadro que dice "LOGO".

## Archivos

- `index.html`: estructura de la página (pantallas, caja de diálogo, controles).
- `style.css`: estilos de la interfaz.
- `config.js`: configuración general y textos.
- `mundos/`: un mundo por carpeta, con su gente, diálogos y preguntas.
- `juego/`: el motor (lógica y dibujo), en varios archivos; su mapa está en
  `juego/LEEME.md`.
- `assets/personaje/mascaras/`: zonas (casco, chaleco, pantalón, pelo) de
  las fotos del protagonista, para teñir a cada NPC con sus colores.
- `assets/edificios/`: imágenes PNG que se ven al salir de la Cueva, junto
  al letrero de llegada a Celaque.
- `tools/probar_juego.mjs`: prueba el juego en Chrome sin ventana (teclas reales,
  capturas y errores de JavaScript). Ej.: `node tools/probar_juego.mjs oficinas`.
- `tools/comparar_capturas.mjs`: corre todos los escenarios y compara cada
  captura con una base guardada, para cambios que no deben verse distinto.
- `tools/revisar_proyecto.mjs`: revisa los scripts de `index.html`, la
  sintaxis, el orden de carga, los datos de cada mundo y las rutas de assets.
