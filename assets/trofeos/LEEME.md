# Trofeos (guacamayas ocultas)

En cada mundo hay guacamayas escondidas en lo alto. Mientras no tengan
imagen, el juego dibuja una guacamaya (roja o azul y amarilla, como las que
cruzan el cielo del camino). Esta carpeta es para las imágenes propias de
cada una.

## Cómo asignar una imagen

1. Pon el archivo en esta carpeta, en minúsculas, sin tildes ni espacios. Por
   ejemplo: `ia-chip.png`.
2. En el `mundo.js` de su mundo, en `coleccionables`, escribe la ruta en
   `imagen`:

   ```js
   { nombre: "Guacamaya del chip", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/ia-chip.png" },
   ```

3. Revisa con `node tools/revisar_proyecto.mjs`: avisa si el archivo no
   existe.

La misma imagen se ve en el juego, flotando, y en el apartado "★ Colección"
del mapa.

## Cómo debe ser la imagen

- PNG con fondo transparente (también sirve SVG o WebP).
- Cuadrada o casi cuadrada: nunca se deforma. Si no es cuadrada, se ajusta
  por su lado más largo.
- 256 × 256 px o más, para que se vea nítida en celulares.
- Con contorno o color fuerte: flota sobre fondos claros (oficinas) y oscuros
  (la Cueva).

## Guacamayas que hay (y nombre de archivo sugerido)

| Mundo | Guacamaya ✏️ | Dónde está | Archivo sugerido |
|---|---|---|---|
| Talento | Guacamaya del camino | andamio 5 del camino | `talento-camino.png` |
| Talento | Guacamaya de la grúa | andamio 10 del camino | `talento-grua.png` |
| Talento | Guacamaya de la Cueva | roca 4 de la Cueva | `talento-cueva.png` |
| Proyectos | Guacamaya del cronograma | mueble 4 | `proyectos-cronograma.png` |
| Proyectos | Guacamaya de la maqueta | mueble 2 | `proyectos-maqueta.png` |
| Procesos | Guacamaya del engrane | mueble 4 | `procesos-engrane.png` |
| Procesos | Guacamaya del flujo | mueble 7 | `procesos-flujo.png` |
| SharePoint | Guacamaya de las nubes | nube 2 | `sharepoint-nubes.png` |
| SharePoint | Guacamaya de la carpeta | mueble 6 | `sharepoint-carpeta.png` |
| Seguridad | Guacamaya de la llave | mueble 4 | `seguridad-llave.png` |
| Seguridad | Guacamaya del escudo | mueble 1 | `seguridad-escudo.png` |
| IA | Guacamaya del chip | mueble 4 | `ia-chip.png` |
| IA | Guacamaya de la neurona | mueble 5 | `ia-neurona.png` |

Los nombres son borrador. Se pueden cambiar sin que nadie pierda las que ya
encontró: el progreso se guarda por el lugar (`sobre` y `n`), no por el
nombre. Si mueves una guacamaya a otro lugar, cuenta como una nueva.
