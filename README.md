# Camino a Celaque

Juego de navegador: el protagonista camina desde un mundo gris y lluvioso hasta
**Celaque**, conociendo personas (NPC) en el camino. A medida que avanza, el
paisaje se vuelve verde, luminoso y lleno de flores.

Todo el código es propio: no usa librerías, imágenes, fuentes ni enlaces de
terceros. Todo se dibuja con `<canvas>`, y la página bloquea cualquier carga
externa (Content-Security-Policy en `index.html`).

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
| Hablar / avanzar diálogo | E, Enter o Espacio        | Botón "Hablar" o tocar la caja |

Los NPC te hablan solos la primera vez que te acercas. Después puedes volver a
hablarles con E.

## Personalizar

Todo lo editable está en **`config.js`**:

- `velocidadPersonaje` / `velocidadCorriendo`: qué tan rápido camina y corre.
- `personajes`: el chico y la chica que se eligen al inicio (colores, pelo
  largo, falda, lazo).
- `largoDelCamino`: distancia hasta Celaque.
- `textos`: títulos y mensajes de las pantallas.
- `NPCS`: la lista de personajes. Cada uno tiene `nombre`, `posicion`
  (0 = inicio, 1 = Celaque), `apariencia` (colores) y `dialogo` (lista de
  frases). Para agregar un NPC nuevo, copia un bloque `{ ... }` y cambia los
  datos. No hay límite de NPCs.

## Archivos

- `index.html`: estructura de la página (pantallas, caja de diálogo, controles).
- `style.css`: estilos de la interfaz.
- `config.js`: configuración, textos y NPCs.
- `main.js`: lógica y dibujo del juego.
