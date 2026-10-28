"""Genera las máscaras de color (casco, chaleco, pantalón y pelo) de las fotos
de caminar, para que los NPC también caminen con sus propios colores
(juego/dibujo/sprites-personajes.js → fotoNpc). Las de la foto de pie ya
existen (assets/personaje/mascaras/PersonajeXCasco.png...): de ellas aprende
de qué color es cada zona y con eso marca las demás fotos.

Uso (con Pillow y numpy):
    python tools/mascaras_npc.py

Escribe assets/personaje/mascaras/PersonajeXCaminandoCasco.png (y Chaleco,
Pantalon, Pelo) y lo mismo con Caminando2, para H (chico) y M (chica).
Cómo marca: cada color (agrupado de a 8 niveles por canal) va a la zona
donde más aparece en la foto de pie; un color que no aparece ahí, a la zona
del color conocido más parecido si está cerca, o a ninguna. Después limpia
los puntitos sueltos (apertura y mediana). Un color dudoso (que en la foto
de pie sale en varias zonas, como la piel y el chaleco) no se marca.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "assets" / "personaje"
MASCARAS = CARPETA / "mascaras"
ZONAS = ["Casco", "Chaleco", "Pantalon", "Pelo"]
POSES = ["Caminando", "Caminando2"]
NIVEL = 8  # tamaño de cada grupo de color, por canal
LEJOS = 28  # más lejos que esto (en RGB) de un color conocido: no es de ninguna zona
PUREZA = 0.7  # un color va a una zona solo si ahí aparece al menos esta parte de las veces (la piel no se confunde con el chaleco)


def cubeta(rgb):
    q = rgb // NIVEL
    n = 256 // NIVEL
    return (q[..., 0] * n + q[..., 1]) * n + q[..., 2]


def aprender(letra):
    foto = np.asarray(Image.open(CARPETA / f"Personaje{letra}DePie.png").convert("RGBA")).astype(int)
    opaco = foto[..., 3] > 128
    etiqueta = np.zeros(opaco.shape, int)  # 0 = ninguna zona
    for k, z in enumerate(ZONAS, 1):
        m = np.asarray(Image.open(MASCARAS / f"Personaje{letra}{z}.png").convert("RGBA"))[..., 3] > 128
        etiqueta[m & opaco] = k
    n = (256 // NIVEL) ** 3
    cuentas = np.zeros((n, len(ZONAS) + 1), int)
    np.add.at(cuentas, (cubeta(foto[..., :3])[opaco], etiqueta[opaco]), 1)
    vistas = cuentas.sum(1) > 0
    zona = cuentas.argmax(1)
    zona[cuentas.max(1) < PUREZA * cuentas.sum(1)] = 0
    # Colores vistos con su zona, para los que no aparecen en la foto de pie
    centros = (np.stack(np.unravel_index(np.arange(n), (256 // NIVEL,) * 3), 1) * NIVEL + NIVEL // 2)[vistas]
    return zona, vistas, centros, zona[vistas]


def marcar(letra, pose, modelo):
    zona, vistas, centros, zonas_centros = modelo
    foto = np.asarray(Image.open(CARPETA / f"Personaje{letra}{pose}.png").convert("RGBA")).astype(int)
    opaco = foto[..., 3] > 128
    c = cubeta(foto[..., :3])
    resultado = np.where(vistas[c], zona[c], 0)
    # Colores nuevos: el más parecido de los conocidos, si está cerca
    nuevos = opaco & ~vistas[c]
    if nuevos.any():
        unicos, inverso = np.unique(c[nuevos], return_inverse=True)
        rgb = np.stack(np.unravel_index(unicos, (256 // NIVEL,) * 3), 1) * NIVEL + NIVEL // 2
        asignado = np.zeros(len(unicos), int)
        for i in range(0, len(unicos), 512):
            d = np.linalg.norm(rgb[i : i + 512, None, :] - centros[None, :, :], axis=2)
            cerca = d.argmin(1)
            asignado[i : i + 512] = np.where(d.min(1) < LEJOS, zonas_centros[cerca], 0)
        resultado[nuevos] = asignado[inverso]
    resultado[~opaco] = 0
    for k, z in enumerate(ZONAS, 1):
        m = Image.fromarray(((resultado == k) * 255).astype(np.uint8))
        # Sin puntitos sueltos: abrir (quita lo chico) y suavizar el borde
        m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MedianFilter(5))
        salida = Image.new("RGBA", m.size, (255, 255, 255, 0))
        salida.putalpha(m)
        ruta = MASCARAS / f"Personaje{letra}{pose}{z}.png"
        salida.save(ruta, optimize=True)
        print(ruta.relative_to(RAIZ), int((np.asarray(m) > 128).sum()), "px")


def main():
    for letra in ["H", "M"]:
        modelo = aprender(letra)
        for pose in POSES:
            marcar(letra, pose, modelo)


if __name__ == "__main__":
    main()
