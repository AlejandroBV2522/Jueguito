# Trofeos (mayitas ocultas)

En cada mundo hay mayitas escondidas en lo alto: la guacamaya de Celaque.
Cada una lleva el nombre de un valor de Celaque o de una emoción alegre.
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
| Talento | Mayita Soñadora | emoción alegre (y el sueño: ser la fuente que desarrolla Honduras) | roca 4 de la Cueva |
| Proyectos | Mayita Alegre | emoción alegre | mueble 4 |
| Proyectos | Mayita Entusiasta | emoción alegre | mueble 2 |
| Procesos | Mayita Feliz | emoción alegre | mueble 4 |
| Procesos | Mayita Orgullosa | emoción alegre | mueble 7 |
| SharePoint | Mayita Directa | valor Comunicación Directa | nube 2 |
| SharePoint | Mayita Contenta | emoción alegre | mueble 6 |
| Seguridad | Mayita Agradecida | emoción alegre | mueble 4 |
| Seguridad | Mayita Confiable | la información está segura | mueble 1 |
| IA | Mayita Creativa | valor Creatividad | mueble 4 |
| IA | Mayita Inspirada | emoción alegre | mueble 5 |

Los nombres son borrador. Se pueden cambiar sin que nadie pierda las que ya
encontró: el progreso se guarda por el lugar (`sobre` y `n`), no por el
nombre. Si mueves una guacamaya a otro lugar, cuenta como una nueva.
