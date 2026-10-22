# Logos e imágenes oficiales

Fuente: paquete de marca de Celaque (CEL.zip). El manual está en
`assets/marca/Manual de Marca Celaque 2023.pdf`.

## Reglas del manual que sigue el juego

- El logo nunca se deforma (se respeta su proporción), no se le aplican
  transparencias, sombras ni filtros, y no va sobre degradados, fotos ni
  fondos de bajo contraste: siempre sobre un fondo liso.
- Tamaño mínimo en pantalla: 20 px de alto el logo horizontal y 50 px el
  isotipo (solo el símbolo).
- Paleta: verde profundo `#042523`, verde institucional `#488478`, gris claro
  `#CCCCCC`, beige `#A99886`, blanco `#FFFFFF`, negro `#000000` (prioridad a
  los verdes). Están en `config.js` (colores) y `style.css` (`--cel-...`).
- Tipografía: Muli (Bold titulares, Regular subtítulos, Light cuerpo), en
  `assets/fuentes/`.

## Logo de Celaque (ya incluido)

Cada uno en 6 colores: `negro`, `verde-profundo`, `gris`, `beige`,
`verde-institucional`, `blanco`.

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `celaque-horizontal-<color>.png` | Símbolo + "CELAQUE" | verde-profundo: inicio, pantalla final, pared de la oficina, letrero final · blanco: computadora de la oficina |
| `celaque-isotipo-<color>.png` | Solo el símbolo | (disponibles para usos futuros) |

## Pendientes (mientras no estén, se ve un recuadro que dice LOGO)

Basta con copiar el archivo con el nombre exacto: no hay que tocar código.
Formato: **PNG con fondo transparente**, recortado al contenido, de al menos
**600 px** de ancho.

| Archivo | Qué es | Dónde se ve |
|---|---|---|
| `modulo-talento.png` | Logo/ícono del módulo Talento | Letrero del edificio Talento |
| `modulo-proyectos.png` | Logo/ícono del módulo Proyectos | Letrero del edificio Proyectos |
| `modulo-procesos.png` | Logo/ícono del módulo Procesos | Letrero del edificio Procesos |
| `modulo-sharepoint.png` | Logo/ícono del módulo SharePoint | Letrero del edificio SharePoint |
| `modulo-seguridad.png` | Logo/ícono del módulo Seguridad | Letrero del edificio Seguridad |
| `modulo-ia.png` | Logo/ícono del módulo IA | Letrero del edificio IA |
| `proyecto-zorzales.png` | Logo del proyecto Zorzales | Fachada de su torre en la calle |
| `proyecto-astria.png` | Logo del proyecto Astria | Fachada de su torre en la calle |
| `proyecto-cefiro.png` | Logo del proyecto Céfiro | Fachada de su torre en la calle |

Los nombres de módulos y proyectos salen de `config.js` (`MODULOS` y
`PROYECTOS_CELAQUE`), en minúsculas y sin tildes. Si se agrega o renombra uno,
el archivo sigue la misma regla (ej. "Recursos Humanos" → `modulo-recursos-humanos.png`).
