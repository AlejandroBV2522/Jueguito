"""Pone en el juego los cuadros de una hoja de correr: los copia como
assets/personaje/PersonajeXCorre1..N.png, mide cada uno y escribe la lista en
juego/dibujo/sprites-personajes.js (entre las marcas <cuadros-correr>).

Los cuadros van en orden de una vuelta completa: zancada, pierna pasando
doblada, en el aire, y lo mismo con la otra pierna. Sirven tal cual salen de
tools/quitar_cuadricula.py (un PNG transparente por cuadro, de la misma hoja
y sin reescalar).

Uso (con Pillow instalado):
    python tools/quitar_cuadricula.py hoja.png carpeta corre
    python tools/cuadros_correr.py chico carpeta/corre_1.png carpeta/corre_2.png ...
    python tools/cuadros_correr.py chico --quitar      (vuelve a corre/correSalto)

Cómo mide (igual que las medidas a mano de las demás fotos):
- anclaX: el centro del chaleco naranja, así el torso no salta de lado entre
  cuadros aunque brazos y piernas se abran distinto.
- arriba/abajo: dónde empieza y termina el dibujo (casco y la bota más baja).
- escalaExtra: el ancho del casco comparado con el de PersonajeXCorre.png,
  que ya tiene su escalaExtra ajustada a mano y está dibujada de lado igual.
"""
import re
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "assets" / "personaje"
JS = RAIZ / "juego" / "dibujo" / "sprites-personajes.js"
LETRA = {"chico": "H", "chica": "M"}


def medir(ruta):
    a = np.asarray(Image.open(ruta).convert("RGBA")).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    h, w = al.shape
    opaco = al > 128
    ys = np.where(opaco.any(1))[0]
    # naranja del chaleco (la piel es parecida, pero menos saturada)
    naranja = opaco & (r > 220) & (g > 90) & (g < 160) & (b < 45) & (r - g > 80)
    verde = opaco & (g > r + 25) & (g > b + 10)
    if naranja.sum() < 50 or verde.sum() < 50:
        sys.exit(f"{ruta}: no encontré el chaleco o el casco (¿es una foto del personaje con fondo transparente?)")
    vx = np.where(verde)[1]
    return {
        "anclaX": round(float(np.median(np.where(naranja)[1])) / w, 4),
        "arriba": round(ys[0] / h, 4),
        "abajo": round((ys[-1] + 1) / h, 4),
        "casco": float(np.percentile(vx, 98) - np.percentile(vx, 2)),
    }


def escala_de_referencia(letra):
    # escalaExtra de PersonajeXCorre.png, tal como está en el juego
    m = re.search(rf'archivo: "Personaje{letra}Corre\.png".*?escalaExtra: ([\d.]+)', JS.read_text(encoding="utf-8"))
    return float(m.group(1))


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in LETRA:
        sys.exit(__doc__)
    clave = sys.argv[1]
    letra = LETRA[clave]
    for viejo in CARPETA.glob(f"Personaje{letra}Corre[0-9]*.png"):
        viejo.unlink()

    lineas = []
    if sys.argv[2] != "--quitar":
        ref = medir(CARPETA / f"Personaje{letra}Corre.png")
        escala_ref = escala_de_referencia(letra)
        cuadros = [Path(p) for p in sys.argv[2:]]
        medidas = [medir(p) for p in cuadros]
        # Toda la hoja comparte escala: se usa el casco promedio de los cuadros
        casco = float(np.median([m["casco"] for m in medidas]))
        escala = round(escala_ref * ref["casco"] / casco, 3)
        for i, (origen, m) in enumerate(zip(cuadros, medidas), 1):
            nombre = f"Personaje{letra}Corre{i}.png"
            shutil.copyfile(origen, CARPETA / nombre)
            lineas.append(
                f'\t\t{{ archivo: "{nombre}", anclaX: {m["anclaX"]}, arriba: {m["arriba"]}, abajo: {m["abajo"]}, escalaExtra: {escala} }},'
            )
            print(nombre, m["anclaX"], m["arriba"], m["abajo"], escala)

    texto = JS.read_text(encoding="utf-8")
    patron = re.compile(rf"(\t{clave}: \[)(.*?)(],)", re.S)
    if not patron.search(texto.split("// <cuadros-correr>")[1].split("// </cuadros-correr>")[0]):
        sys.exit("No encontré la lista de " + clave + " entre las marcas <cuadros-correr> de " + str(JS))
    antes, resto = texto.split("// <cuadros-correr>")
    bloque, despues = resto.split("// </cuadros-correr>")
    cuerpo = ("\n" + "\n".join(lineas) + "\n\t") if lineas else ""
    bloque = patron.sub(lambda m: m.group(1) + cuerpo + m.group(3), bloque, count=1)
    JS.write_text(antes + "// <cuadros-correr>" + bloque + "// </cuadros-correr>" + despues, encoding="utf-8")
    print(f"{clave}: {len(lineas)} cuadros de correr en {JS.relative_to(RAIZ)}")


main()
