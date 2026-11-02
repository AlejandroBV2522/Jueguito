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

## Logos de los proyectos (ya incluidos)

Fuente: Logos_Proyectos_Celaque.zip. Cada mundo lleva el logo del proyecto de
su edificio (`logo:` en su `mundos/<mundo>/mundo.js`): se ve en la carta del
mapa antes de entrar y en el letrero del edificio.

| Archivo | Proyecto | Dónde se ve |
|---|---|---|
| `proyecto-agalta.png` | Agalta | Mundo Talento |
| `proyecto-distrito-artemisa.png` | Distrito Artemisa | Mundo Proyectos |
| `proyecto-lirios.png` | Lirios de Miraflores | Mundo Procesos |
| `proyecto-atlas.png` | Atlas | Mundo SharePoint |
| `proyecto-acacias.png` | Acacias San Ignacio | Mundo Seguridad |
| `proyecto-zorzales.png` | Zorzales del Merendón | Mundo IA y su torre en la calle |
| `proyecto-astria.png` | Astria | Fachada de su torre en la calle |
| `proyecto-cefiro.png` | Céfiro Azul | Fachada de su torre en la calle |

Las torres de la calle salen de `config.js` (`PROYECTOS_CELAQUE`): el archivo
es `proyecto-<nombre>.png`, en minúsculas y sin tildes (ej. "Céfiro" →
`proyecto-cefiro.png`). Si un mundo no trae `logo:`, se busca
`modulo-<nombre>.png`, y si tampoco está se ve un recuadro que dice LOGO.
Formato: **PNG con fondo transparente**, recortado al contenido.
