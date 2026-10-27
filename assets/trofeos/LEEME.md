# Trofeos (mayitas ocultas)

En cada mundo hay mayitas escondidas en lo alto: la guacamaya de Celaque.
Cada una lleva el nombre de un valor o de algo de la cultura de Celaque.
Todas usan `mayita.png`; si alguna tiene imagen propia, va en esta carpeta.
Sin imagen (`imagen: ""`), el juego dibuja una guacamaya roja o azul y
amarilla, como las que cruzan el cielo del camino.

## Cómo asignar una imagen

1. Pon el archivo en esta carpeta, en minúsculas, sin tildes ni espacios. Por
   ejemplo: `ia-creativa.png`.
2. En el `mundo.js` de su mundo, en `coleccionables`, escribe la ruta en
   `imagen`:

   ```js
   { nombre: "Mayita Creativa", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/ia-creativa.png" },
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

## Mayitas que hay

| Mundo | Mayita ✏️ | Qué representa | Dónde está |
|---|---|---|---|
| Talento | Mayita Buena Vibra | valor Buenas Vibras | andamio 5 del camino |
| Talento | Mayita Logradora | valor Logrador | andamio 10 del camino |
| Talento | Mayita Soñadora | el sueño: ser la fuente que desarrolla Honduras | roca 4 de la Cueva |
| Proyectos | Mayita Cumplida | cumplir lo que se planifica | mueble 4 |
| Proyectos | Mayita Constructora | construimos el desarrollo de Honduras | mueble 2 |
| Procesos | Mayita Ordenada | cada cosa en su proceso | mueble 4 |
| Procesos | Mayita Mejora Continua | mejorar cada proceso | mueble 7 |
| SharePoint | Mayita Directa | valor Comunicación Directa | nube 2 |
| SharePoint | Mayita En Equipo | compartir y trabajar juntos | mueble 6 |
| Seguridad | Mayita Guardiana | cuidamos la información | mueble 4 |
| Seguridad | Mayita Confiable | la información está segura | mueble 1 |
| IA | Mayita Creativa | valor Creatividad | mueble 4 |
| IA | Mayita Curiosa | aprender cosas nuevas | mueble 5 |

Los nombres son borrador. Se pueden cambiar sin que nadie pierda las que ya
encontró: el progreso se guarda por el lugar (`sobre` y `n`), no por el
nombre. Si mueves una guacamaya a otro lugar, cuenta como una nueva.
