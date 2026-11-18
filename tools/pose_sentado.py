"""Arma la pose "sentado" de los NPC sin arte nuevo, a partir de la foto de pie
(como los cuadros de correr): las piernas se doblan. El tronco queda igual;
los muslos (solo el pantalón, entre la cadera y la rodilla) giran hacia
adelante, hacia donde mira el personaje, y quedan en horizontal (un poco
aplanados, porque se ven de lado); las espinillas con las botas cuelgan
desde la rodilla. Las manos y el martillo se quedan donde estaban. Lo mismo
a sus máscaras de color, para que el NPC sentado se tiña igual (fotoNpc).

Uso (con Pillow y numpy):
    python tools/pose_sentado.py

Escribe assets/personaje/PersonajeXSentado.png y
assets/personaje/mascaras/PersonajeXSentado{Casco,Chaleco,Pantalon,Pelo}.png
(X = H chico, M chica), más anchas que la de pie (las rodillas salen hacia
adelante), e imprime sus medidas para juego/dibujo/sprites-personajes.js
(SENTADO_NPC): anclaX, arriba, abajo, regazo (la fila de arriba de los
muslos: ahí se apoya una mesa), asiento (la de abajo: ahí va la banca),
rodilla (la columna de la rodilla) y proporcion (ancho / alto de la foto).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "assets" / "personaje"
MASCARAS = CARPETA / "mascaras"
ZONAS = ["Casco", "Chaleco", "Pantalon", "Pelo"]
# Filas de la foto de pie (1024 x 1536): dónde empiezan los muslos (debajo
# del cinturón) y dónde está la rodilla
PIERNA = {"H": (850, 1175), "M": (845, 1185)}
APLANAR = 0.55  # grueso del muslo de lado, comparado con el ancho de una pierna de frente
EXTRA = 320  # columnas que se agregan a la derecha (ahí quedan las rodillas)


def engrosar(m, r):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0


def main():
    for letra, (cadera, rodilla) in PIERNA.items():
        foto = np.asarray(Image.open(CARPETA / f"Personaje{letra}DePie.png").convert("RGBA"))
        r, g, b = (foto[..., i].astype(int) for i in range(3))
        h, w = foto.shape[:2]
        capas = {"foto": foto}
        for z in ZONAS:
            capas[z] = np.asarray(Image.open(MASCARAS / f"Personaje{letra}{z}.png").convert("RGBA"))
        # El pantalón (lo azul marino de su máscara, con su contorno oscuro)
        pantalon = (capas["Pantalon"][..., 3] > 128) & (b > r + 10)
        pierna = engrosar(pantalon, 4) & (foto[..., 3] > 0) & ((b > r + 10) | (r + g + b < 200))
        muslo = pierna.copy()
        muslo[:cadera] = False
        muslo[rodilla:] = False
        # Espinillas y botas: todo lo que hay de la rodilla para abajo
        abajo = np.zeros_like(muslo)
        abajo[rodilla:] = foto[rodilla:, :, 3] > 0
        cols = np.where(muslo[cadera + 5])[0]
        x0, x1 = cols.min(), cols.max()  # ancho de las dos piernas en la cadera
        xc = (x0 + x1) // 2  # la entrepierna: a la derecha, la pierna de adelante
        largo = rodilla - cadera
        lado = np.zeros_like(muslo)
        lado[:, xc:] = True
        # Lo que se quita de la foto: las piernas y, alrededor, su contorno suelto
        piel = (r > 165) & (r > g + 25) & (g > b)
        quitar = muslo | abajo
        quitar |= engrosar(quitar, 6) & (foto[..., 3] > 0) & ~piel & (np.arange(h)[:, None] >= cadera) & (r + g + b < 420)
        # El muslo de lado: una cápsula desde la cadera hasta la rodilla, con la
        # textura del pantalón; tapa también la cadera (la otra pierna queda detrás)
        mx, my = x0 - 6, cadera - 14
        grueso = int((x1 - xc) * APLANAR * 2)
        rx = xc - 40 + largo  # la punta de la rodilla
        capsula = Image.new("L", (w + EXTRA, h))
        ImageDraw.Draw(capsula).rounded_rectangle([mx, my, rx, my + grueso], radius=grueso // 2, fill=255)
        capsula = np.asarray(capsula) > 0
        borde = engrosar(capsula, 4) & ~engrosar(~capsula, 0) & ~capsula | (capsula & ~(np.asarray(Image.fromarray((capsula * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 0))
        textura = Image.fromarray(foto[cadera:rodilla, xc : x1 + 1]).rotate(90, expand=True).resize((rx - mx + 1, grueso + 1), Image.BICUBIC)
        tex = np.zeros((h, w + EXTRA, 4), np.uint8)
        tex[my : my + grueso + 1, mx : rx + 1] = np.asarray(textura)
        fondo_pant = np.median(foto[pantalon], axis=0).astype(np.uint8)  # donde la textura no alcanza
        manos = piel.copy()
        manos[:cadera] = False
        manos = np.pad(manos, ((0, 0), (0, EXTRA)))
        for nombre, capa in capas.items():
            sale = np.zeros((h, w + EXTRA, 4), np.uint8)
            quieto = capa.copy()
            quieto[quitar] = 0
            quieto[rodilla:] = 0  # de la rodilla para abajo solo había piernas y botas
            sale[:, :w] = quieto
            lienzo = Image.fromarray(sale)
            # Las espinillas con sus botas cuelgan de la rodilla: la de atrás un
            # poco más atrás
            for xa, xb, corre in [(0, xc, -70), (xc, w, -10)]:
                bloque = capa[rodilla:, xa:xb].copy()
                bloque[~abajo[rodilla:, xa:xb]] = 0
                cols_b = np.where(abajo[rodilla:, xa:xb].any(0))[0]
                centro = xa + (cols_b.min() + cols_b.max()) // 2 if len(cols_b) else (xa + xb) // 2
                capa_e = Image.new("RGBA", lienzo.size)
                capa_e.paste(Image.fromarray(bloque), (rx + corre - (centro - xa) - grueso // 3, my + grueso // 2))
                lienzo.alpha_composite(capa_e)
            a = np.asarray(lienzo).copy()
            # El muslo (cápsula) encima, y las manos encima del muslo
            if nombre == "foto":
                relleno = tex.copy()
                vacio = relleno[..., 3] < 200
                relleno[vacio] = fondo_pant
                a[capsula] = relleno[capsula]
                a[capsula & borde] = (16, 18, 28, 255)
                a[manos] = np.pad(foto, ((0, 0), (0, EXTRA), (0, 0)))[manos]
            else:
                a[capsula] = (255, 255, 255, 255) if nombre == "Pantalon" else (0, 0, 0, 0)
                a[manos] = 0
            # Sin puntitos sueltos debajo de las botas (la bota llega hasta la
            # última fila con algo de ancho)
            if nombre == "foto":
                llenas = np.where((a[..., 3] > 128).sum(1) >= 20)[0]
                corte = llenas[-1] + 1
            a[corte:] = 0
            lienzo = Image.fromarray(a)
            if nombre == "foto":
                ruta = CARPETA / f"Personaje{letra}Sentado.png"
                hecho = np.asarray(lienzo)
            else:
                ruta = MASCARAS / f"Personaje{letra}Sentado{nombre}.png"
            lienzo.save(ruta, optimize=True)
        largo = rx - mx
        opaco = hecho[..., 3] > 128
        filas = np.where(opaco.any(1))[0]
        chaleco = np.asarray(Image.open(MASCARAS / f"Personaje{letra}SentadoChaleco.png"))[..., 3] > 128
        cc = np.where(chaleco.any(0))[0]
        ancho = w + EXTRA
        print(
            f"{letra}: anclaX: {(cc[0] + cc[-1]) / 2 / ancho:.4f}, arriba: {filas[0] / h:.4f}, abajo: {filas[-1] / h:.4f}, "
            f"regazo: {my / h:.4f}, asiento: {(my + grueso) / h:.4f}, rodilla: {(mx + largo) / ancho:.4f}, proporcion: {ancho} / {h}"
        )


if __name__ == "__main__":
    main()
