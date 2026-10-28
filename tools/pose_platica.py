"""Arma las poses "platica" de los NPC (doblar el brazo al hablar) sin arte
nuevo, a partir de la foto de pie: el antebrazo derecho (el del lado de quien
mira) se gira en el codo para que la mano suba hacia afuera, como cuando
alguien explica algo. Se guardan dos ángulos; el juego los alterna con la
foto de pie mientras alguien platica (cafeteria.js).

Cómo encuentra el antebrazo: la piel (y su contorno oscuro) conectada al
codo, de ahí para abajo y sin tocar el pantalón (su máscara, un poco
engrosada) ni la bolsa de herramientas. El antebrazo es solo piel: las
máscaras de color son las mismas de la foto de pie, así que estas fotos no
llevan máscaras propias.

Uso (con Pillow y numpy):
    python tools/pose_platica.py

Escribe assets/personaje/PersonajeXPlatica1.png y PersonajeXPlatica2.png
(X = H chico, M chica), del mismo tamaño y en el mismo lugar que la de pie.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "assets" / "personaje"
MASCARAS = CARPETA / "mascaras"
# Medido sobre PersonajeXDePie.png (1024 x 1536): el codo (donde gira), un
# punto de piel del antebrazo (de ahí crece la selección) y la fila donde
# termina la mano
BRAZO = {
    "H": {"codo": (693, 702), "semilla": (700, 780), "hasta_y": 960},
    "M": {"codo": (676, 742), "semilla": (690, 800), "hasta_y": 950},
}
ANGULOS = [55, 105]  # grados que sube la mano (hacia afuera)


def engrosar(m, r):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0


def conectado(posible, semilla):
    """La parte de `posible` unida a `semilla` (relleno por vecinos)."""
    hecho = np.zeros_like(posible)
    hecho[semilla[1], semilla[0]] = True
    while True:
        crece = hecho.copy()
        crece[1:] |= hecho[:-1]
        crece[:-1] |= hecho[1:]
        crece[:, 1:] |= hecho[:, :-1]
        crece[:, :-1] |= hecho[:, 1:]
        crece &= posible
        if (crece == hecho).all():
            return hecho
        hecho = crece


def main():
    for letra, b in BRAZO.items():
        a = np.asarray(Image.open(CARPETA / f"Personaje{letra}DePie.png").convert("RGBA")).copy()
        r, g, bl, al = (a[..., i].astype(int) for i in range(4))
        pantalon = np.asarray(Image.open(MASCARAS / f"Personaje{letra}Pantalon.png").convert("RGBA"))[..., 3] > 128
        pantalon &= bl > r + 10  # solo lo azul marino: la máscara tiene puntitos en el contorno de la mano
        cx, cy = b["codo"]
        piel = (al > 128) & (r > 165) & (r > g + 25) & (g > bl) & (r - bl > 50)
        contorno = (al > 40) & (r + g + bl < 210) & engrosar(piel, 5)
        posible = (piel | contorno) & ~engrosar(pantalon, 4)
        posible[: cy - 4] = False
        posible[b["hasta_y"] :] = False
        # La semilla: el pixel de piel más cercano al punto medido
        ys, xs = np.nonzero(piel & posible)
        sx, sy = b["semilla"]
        j = np.argmin((xs - sx) ** 2 + (ys - sy) ** 2)
        antebrazo_px = conectado(posible, (xs[j], ys[j]))
        antebrazo_px = engrosar(antebrazo_px, 1) & (al > 0) & ~pantalon  # el borde suave
        # Lo que queda donde estaba: piel suelta del lado del brazo (del codo a
        # la mano) y el contorno oscuro pegado a ella; se borra, no se gira
        tramo = np.zeros_like(piel)
        tramo[cy - 4 : b["hasta_y"], cx - 50 :] = True
        resto = (piel & tramo) & ~antebrazo_px
        cafe = (r > 80) & (r < 200) & (g < 120) & (bl < 80) & ~piel  # la bolsa de herramientas
        resto |= (al > 0) & engrosar(antebrazo_px | resto, 10) & tramo & ~engrosar(pantalon, 2) & ~cafe & ~antebrazo_px
        print(letra, "antebrazo:", int(antebrazo_px.sum()), "px")
        # Lo que se gira, cortado en V hacia el codo: así, al girar, ninguna
        # esquina del antebrazo se sale por detrás del codo
        yy, xx = np.mgrid[: a.shape[0], : a.shape[1]]
        en_v = (yy - cy) > np.abs(xx - cx) * 0.7
        antebrazo = np.zeros_like(a)
        antebrazo[antebrazo_px & en_v] = a[antebrazo_px & en_v]
        sin_brazo = a.copy()
        sin_brazo[antebrazo_px | resto] = 0
        # El color de la piel junto al codo, para el parche de la articulación
        muestra = a[cy - 18 : cy - 6, cx - 14 : cx + 6].reshape(-1, 4)
        tono = tuple(int(v) for v in np.median(muestra[muestra[:, 3] > 200][:, :3], axis=0)) + (255,)
        for k, angulo in enumerate(ANGULOS, 1):
            lienzo = Image.fromarray(sin_brazo)
            codo = ImageDraw.Draw(lienzo)
            codo.ellipse([cx - 30, cy - 30, cx + 30, cy + 30], fill=(20, 16, 14, 255))  # contorno
            codo.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=tono)
            girado = Image.fromarray(antebrazo).rotate(angulo, center=(cx, cy), resample=Image.BICUBIC)
            lienzo.alpha_composite(girado)
            lienzo.save(CARPETA / f"Personaje{letra}Platica{k}.png", optimize=True)
            print(f"assets/personaje/Personaje{letra}Platica{k}.png")


if __name__ == "__main__":
    main()
