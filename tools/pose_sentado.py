"""Arma la pose "sentado" de los NPC sin arte nuevo, a partir de la foto de pie
(como los cuadros de correr): la foto está casi de frente, y alguien sentado
visto de frente es el tronco, el regazo corto y luego rodillas y espinillas.
Así que se quita el tramo del muslo (de abajo de las manos a la rodilla) y se
cose el resto con un fundido suave. Lo mismo a sus máscaras de color, para
que el NPC sentado se tiña igual (fotoNpc).

Uso (con Pillow y numpy):
    python tools/pose_sentado.py

Escribe assets/personaje/PersonajeXSentado.png y
assets/personaje/mascaras/PersonajeXSentado{Casco,Chaleco,Pantalon,Pelo}.png
(X = H chico, M chica) e imprime arriba/abajo/anclaX para
juego/dibujo/sprites-personajes.js (POSES_NPC).
"""
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "assets" / "personaje"
MASCARAS = CARPETA / "mascaras"
ZONAS = ["Casco", "Chaleco", "Pantalon", "Pelo"]
# Filas de la foto de pie (1024 x 1536) que se quitan: de abajo de las
# manos hasta la rodilla
MUSLO = {"H": (990, 1175), "M": (995, 1185)}
FUNDIDO = 6  # filas de la costura (en el juego la tapa la mesita de Eber)


def sentar(a, desde, hasta):
    """Quita las filas [desde, hasta) y funde la costura; el lienzo queda del
    mismo tamaño, con la figura apoyada abajo (las filas libres, arriba)."""
    a = a.astype(float)
    arriba, abajo = a[:desde], a[hasta:]
    # La costura: las últimas filas de arriba se funden con las primeras de abajo
    k = np.linspace(0, 1, FUNDIDO)[:, None, None]
    costura = arriba[-FUNDIDO:] * (1 - k) + abajo[:FUNDIDO] * k
    unido = np.concatenate([arriba[:-FUNDIDO], costura, abajo[FUNDIDO:]])
    vacio = np.zeros((a.shape[0] - unido.shape[0],) + a.shape[1:])
    return np.concatenate([vacio, unido]).round().clip(0, 255).astype(np.uint8)


def main():
    for letra, (desde, hasta) in MUSLO.items():
        foto = np.asarray(Image.open(CARPETA / f"Personaje{letra}DePie.png").convert("RGBA"))
        sentado = sentar(foto, desde, hasta)
        Image.fromarray(sentado).save(CARPETA / f"Personaje{letra}Sentado.png", optimize=True)
        for z in ZONAS:
            m = np.asarray(Image.open(MASCARAS / f"Personaje{letra}{z}.png").convert("RGBA"))
            Image.fromarray(sentar(m, desde, hasta)).save(MASCARAS / f"Personaje{letra}Sentado{z}.png", optimize=True)
        # Medidas, igual que las de las demás fotos
        opaco = sentado[..., 3] > 128
        filas = np.where(opaco.any(1))[0]
        h, w = opaco.shape
        chaleco = np.asarray(Image.open(MASCARAS / f"Personaje{letra}SentadoChaleco.png"))[..., 3] > 128
        cols = np.where(chaleco.any(0))[0]
        print(f"{letra}: arriba: {filas[0] / h:.4f}, abajo: {filas[-1] / h:.4f}, anclaX: {(cols[0] + cols[-1]) / 2 / w:.4f}")


if __name__ == "__main__":
    main()
