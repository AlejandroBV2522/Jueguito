# Trofeos (medallas ocultas)

En cada mundo hay medallas doradas escondidas en lo alto. Mientras no tengan
imagen, el juego dibuja una medalla con el ícono de su mundo. Esta carpeta es
para las imágenes propias de cada una.

## Cómo asignar una imagen

1. Pon el archivo en esta carpeta, en minúsculas, sin tildes ni espacios. Por
   ejemplo: `ia-chip.png`.
2. En el `mundo.js` de su mundo, en `coleccionables`, escribe la ruta en
   `imagen`:

   ```js
   { nombre: "Chip dorado", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/ia-chip.png" },
   ```

3. Revisa con `node tools/revisar_proyecto.mjs`: avisa si el archivo no
   existe.

La misma imagen se ve en el juego, flotando, y en el apartado "★ Colección"
del mapa.

## Cómo debe ser la imagen

- PNG con fondo transparente (también sirve SVG o WebP).
- Cuadrada o casi cuadrada: se dibuja dentro de un círculo y nunca se
  deforma. Si no es cuadrada, se ajusta por su lado más largo.
- 256 × 256 px o más, para que se vea nítida en celulares.
- Con contorno o color fuerte: flota sobre fondos claros (oficinas) y oscuros
  (la Cueva).

## Medallas que hay (y nombre de archivo sugerido)

| Mundo | Medalla ✏️ | Dónde está | Archivo sugerido |
|---|---|---|---|
| Talento | Casco dorado | andamio 5 del camino | `talento-casco.png` |
| Talento | Plano maestro | andamio 10 del camino | `talento-plano.png` |
| Talento | Cristal escondido | roca 4 de la Cueva | `talento-cristal.png` |
| Proyectos | Cronograma dorado | mueble 4 | `proyectos-cronograma.png` |
| Proyectos | Maqueta secreta | mueble 2 | `proyectos-maqueta.png` |
| Procesos | Engrane dorado | mueble 4 | `procesos-engrane.png` |
| Procesos | Flujo perfecto | mueble 7 | `procesos-flujo.png` |
| SharePoint | Nube secreta | nube 2 | `sharepoint-nube.png` |
| SharePoint | Carpeta dorada | mueble 6 | `sharepoint-carpeta.png` |
| Seguridad | Llave maestra | mueble 4 | `seguridad-llave.png` |
| Seguridad | Escudo dorado | mueble 1 | `seguridad-escudo.png` |
| IA | Chip dorado | mueble 4 | `ia-chip.png` |
| IA | Neurona brillante | mueble 5 | `ia-neurona.png` |

Los nombres de las medallas son borrador. Se pueden cambiar sin que nadie
pierda las que ya encontró: el progreso se guarda por el lugar (`sobre` y
`n`), no por el nombre. Si mueves una medalla a otro lugar, cuenta como una
medalla nueva.
