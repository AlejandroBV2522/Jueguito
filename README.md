# Camino a Celaque

Juego de navegador: el protagonista camina desde un mundo gris y lluvioso hasta
**Celaque**, cruzando una zona industrial y conociendo a ingenieros y
constructores (NPC) en el camino. Al inicio todo es gris (smog y lluvia); a
medida que avanza, las fábricas, bodegas y grúas recuperan sus colores.

Todo el código es propio: no usa librerías, fuentes ni enlaces de terceros.
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
| Elegir personaje (inicio) | ← → o clic en la tarjeta | Tocar la tarjeta |
| Caminar                 | ← → o A / D (o la rueda del mouse) | Botones ◀ ▶ |
| Correr                  | Mantener Q mientras caminas | Mantener "Correr" |
| Saltar                  | ↑ o W                     | Botón "Saltar"     |
| Hablar / avanzar diálogo | E, Enter o Espacio        | Botón "Hablar" o tocar la caja |

Es un plataformero: cada NPC espera arriba de un andamio y hay que subir
saltando por los escalones para hablarle (desde el piso no te escucha).
Los escalones se atraviesan saltando desde abajo. En la calle hay barreras
de concreto que hay que saltar.

Los NPC te hablan solos la primera vez que llegas a su andamio. Después
puedes volver a hablarles con E.

## Personalizar

Todo lo editable está en **`config.js`**:

- `velocidadPersonaje` / `velocidadCorriendo`: qué tan rápido camina y corre.
- `personajes`: el chico y la chica que se eligen al inicio (colores, pelo
  largo, falda, lazo).
- `largoDelCamino`: distancia hasta Celaque.
- `textos`: títulos y mensajes de las pantallas.
- `NPCS`: la lista de personajes. Cada uno tiene `nombre`, `posicion`
  (0 = inicio, 1 = Celaque), `apariencia` (colores, casco, chaleco y
  herramienta) y `dialogo` (lista de
  frases). Para agregar un NPC nuevo, copia un bloque `{ ... }` y cambia los
  datos. No hay límite de NPCs.

## Archivos

- `index.html`: estructura de la página (pantallas, caja de diálogo, controles).
- `style.css`: estilos de la interfaz.
- `config.js`: configuración, textos y NPCs.
- `main.js`: lógica y dibujo del juego.
- `assets/personaje/mascaras/`: zonas (casco, chaleco, pantalón, pelo) de
  las fotos del protagonista, para teñir a cada NPC con sus colores.
- `assets/edificios/`: imágenes PNG que se ven al salir de la Cueva, junto
  al letrero de llegada a Celaque.
