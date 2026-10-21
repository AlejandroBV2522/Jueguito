"""Corta la foto "de pie" de cada personaje en piezas para animar las piernas
por código (muslo y pantorrilla de cada pierna + torso), y escribe sus puntos
de giro (cadera y rodilla) en assets/personaje/partes/partes.js.

El juego (main.js → dibujarHeroeRig) gira cada muslo desde la cadera y cada
pantorrilla desde la rodilla, así caminar y correr es un ciclo continuo con el
MISMO dibujo que el personaje quieto (sin saltos de ángulo ni de tamaño).

Uso (desde la carpeta del juego, con Pillow instalado):
    python tools/partes_personaje.py            # genera las piezas
    python tools/partes_personaje.py --revisar  # además, una imagen de control

Si se cambia PersonajeHDePie.png / PersonajeMDePie.png, hay que revisar las
medidas de CORTES (en píxeles de la foto original, 1024x1536) y volver a
correrlo.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUTA_PERSONAJE = os.path.join(RAIZ, "assets", "personaje")
RUTA_PARTES = os.path.join(RUTA_PERSONAJE, "partes")

# Medidas de cada foto (en píxeles de la imagen original):
#   cadera:     banda [arriba, abajo] que queda FIJA con el torso (tapa la
#               unión con los muslos al girar); el giro de la cadera es "giro".
#   separacion: línea entre las dos piernas (de la entrepierna al piso).
#   rodilla:    altura de la rodilla de cada pierna (A = izquierda en la foto,
#               la más cercana a la cámara; B = derecha).
#   pie:        altura de la suela (para que el pie apoyado toque el piso).
#   fijos:      polígonos que van con el torso aunque caigan sobre la pierna
#               (martillo, cartucheras, manos).
CORTES = {
    "H": {
        "archivo": "PersonajeHDePie.png",
        "cadera": (835, 905),
        "giro": 868,
        "separacion": [(507, 905), (507, 935), (490, 1200), (467, 1345), (460, 1536)],
        "rodilla": {"A": 1135, "B": 1150},
        "pie": 1495,
        "fijos": [
            # martillo (mango hasta ~1048) y su funda
            [(305, 1052), (358, 1052), (368, 905), (425, 860), (452, 845), (452, 730), (322, 730), (322, 860), (305, 960)],
            # cartuchera derecha
            [(598, 760), (660, 760), (660, 882), (598, 882)],
            # manos
            [(225, 780), (340, 780), (340, 975), (225, 975)],
            [(655, 780), (745, 780), (745, 950), (655, 950)],
        ],
        # Brazos (opcional): se balancean al caminar y se doblan al correr.
        # La parte de arriba de la manga (hasta "manga") queda fija con el
        # torso para tapar la unión del hombro. A = izquierda en la foto.
        "brazos": {
            "manga": 478,
            "borde_chaleco": (328, 652),  # x desde donde puede asomar el chaleco (A, B)
            "A": {
                "hombro": 470,
                "codo": 700,
                "poligono": [(222, 455), (350, 455), (352, 560), (346, 620), (348, 700), (334, 745), (330, 800), (340, 880), (332, 940), (326, 985), (215, 985), (218, 600)],
            },
            "B": {
                "hombro": 472,
                "codo": 693,
                "poligono": [(634, 455), (700, 455), (750, 560), (765, 700), (770, 965), (656, 965), (656, 745), (636, 700), (634, 600)],
            },
        },
    },
    "M": {
        "archivo": "PersonajeMDePie.png",
        "cadera": (822, 895),
        "giro": 860,
        "separacion": [(515, 895), (515, 1100), (525, 1320), (520, 1536)],
        "rodilla": {"A": 1115, "B": 1115},
        "pie": 1495,
        "fijos": [
            # martillo y su funda
            [(275, 980), (330, 980), (365, 900), (420, 830), (420, 715), (300, 715), (290, 900)],
            # cartucheras
            [(392, 715), (485, 715), (485, 822), (392, 822)],
            [(600, 715), (665, 715), (665, 825), (600, 825)],
            # mano derecha (la que cuelga)
            [(676, 800), (760, 800), (760, 945), (676, 945)],
        ],
    },
}

SOLAPE_RODILLA_ARRIBA = 14  # la pantorrilla empieza un poco antes de la rodilla
SOLAPE_RODILLA_ABAJO = 26  # y el muslo termina un poco después (tapa la unión)


def x_separacion(linea, y):
    """x de la línea entre piernas a la altura y (interpolada)."""
    if y <= linea[0][1]:
        return linea[0][0]
    for (x0, y0), (x1, y1) in zip(linea, linea[1:]):
        if y0 <= y <= y1:
            t = 0 if y1 == y0 else (y - y0) / (y1 - y0)
            return x0 + (x1 - x0) * t
    return linea[-1][0]


def mascara_poligonos(tam, poligonos):
    m = Image.new("L", tam, 0)
    d = ImageDraw.Draw(m)
    for p in poligonos:
        d.polygon(p, fill=255)
    return m


def recortar(img):
    """Recorta al contenido; devuelve (imagen, x, y) o None si está vacía."""
    caja = img.getbbox()
    if not caja:
        return None
    return img.crop(caja), caja[0], caja[1]


def centro_fila(mascara, y):
    """x promedio de los píxeles de la máscara en la fila y."""
    w = mascara.width
    xs = [x for x in range(w) if mascara.getpixel((x, y))]
    return sum(xs) / len(xs) if xs else None


def procesar(letra, c):
    base = Image.open(os.path.join(RUTA_PERSONAJE, c["archivo"])).convert("RGBA")
    w, h = base.size
    alfa = base.getchannel("A")
    fijos = mascara_poligonos(base.size, c["fijos"])
    cad_arriba, cad_abajo = c["cadera"]

    # Máscara de cada pierna: lo opaco debajo del inicio de la cadera, de su
    # lado de la línea de separación, sin lo que va fijo con el torso.
    piernas = {"A": Image.new("L", base.size, 0), "B": Image.new("L", base.size, 0)}
    pa, pb = piernas["A"].load(), piernas["B"].load()
    pal, pf = alfa.load(), fijos.load()
    for y in range(cad_arriba, h):
        corte = x_separacion(c["separacion"], y)
        for x in range(w):
            if pal[x, y] < 8 or pf[x, y]:
                continue
            if x < corte:
                pa[x, y] = 255
            else:
                pb[x, y] = 255

    # Brazos: lo opaco dentro de su polígono, sin el chaleco (naranja y franja
    # gris reflectiva) que asoma en el borde.
    brazos = {}
    if "brazos" in c:
        for lado in ("A", "B"):
            poli = mascara_poligonos(base.size, [c["brazos"][lado]["poligono"]]).load()
            m = Image.new("L", base.size, 0)
            pm = m.load()
            for y in range(h):
                for x in range(w):
                    if not poli[x, y] or pal[x, y] < 8:
                        continue
                    # El filtro de color solo junto al chaleco (la piel en
                    # sombra se parece al naranja)
                    junto_al_chaleco = x > c["brazos"]["borde_chaleco"][0] if lado == "A" else x < c["brazos"]["borde_chaleco"][1]
                    r, g, b, _ = base.getpixel((x, y))
                    chaleco = junto_al_chaleco and (
                        (r > 200 and b < 70 and g < 175) or (abs(r - g) < 14 and abs(g - b) < 14 and 140 < r < 215)
                    )
                    if not chaleco:
                        pm[x, y] = 255
            brazos[lado] = m

    # Torso: todo menos lo que es pierna por debajo de la banda de cadera, y
    # menos los brazos por debajo de la manga fija
    torso_m = alfa.copy()
    pt = torso_m.load()
    for y in range(cad_abajo, h):
        for x in range(w):
            if pa[x, y] or pb[x, y]:
                pt[x, y] = 0
    for m in brazos.values():
        pm = m.load()
        for y in range(c["brazos"]["manga"], h):
            for x in range(w):
                if pm[x, y]:
                    pt[x, y] = 0

    def pieza(mascara, y0, y1):
        m = Image.new("L", base.size, 0)
        m.paste(mascara.crop((0, y0, w, y1)), (0, y0))
        img = Image.new("RGBA", base.size, (0, 0, 0, 0))
        img.paste(base, (0, 0), m)
        return img

    os.makedirs(RUTA_PARTES, exist_ok=True)
    meta = {"ancho": w, "alto": h, "pie": c["pie"], "piezas": {}, "piernas": {}}

    def guardar(nombre, img):
        r = recortar(img)
        archivo = f"{letra}_{nombre}.png"
        r[0].save(os.path.join(RUTA_PARTES, archivo), optimize=True)
        meta["piezas"][nombre] = {"archivo": archivo, "x": r[1], "y": r[2]}

    torso = Image.new("RGBA", base.size, (0, 0, 0, 0))
    torso.paste(base, (0, 0), torso_m)
    guardar("torso", torso)

    for lado in ("A", "B"):
        rod = c["rodilla"][lado]
        guardar(f"muslo{lado}", pieza(piernas[lado], cad_arriba, rod + SOLAPE_RODILLA_ABAJO))
        guardar(f"pantorrilla{lado}", pieza(piernas[lado], rod - SOLAPE_RODILLA_ARRIBA, h))
        meta["piernas"][lado] = {
            "cadera": [round(centro_fila(piernas[lado], c["giro"]), 1), c["giro"]],
            "rodilla": [round(centro_fila(piernas[lado], rod), 1), rod],
        }

    if brazos:
        meta["brazos"] = {}
        for lado, m in brazos.items():
            b = c["brazos"][lado]
            # El brazo arranca un poco antes de la manga fija (se solapan)
            guardar(f"brazo{lado}", pieza(m, c["brazos"]["manga"] - 30, b["codo"] + 22))
            guardar(f"antebrazo{lado}", pieza(m, b["codo"] - 12, h))
            meta["brazos"][lado] = {
                "hombro": [round(centro_fila(m, b["hombro"]), 1), b["hombro"]],
                "codo": [round(centro_fila(m, b["codo"]), 1), b["codo"]],
            }
            piernas["brazo" + lado] = m
    return meta, base, piernas, fijos


def imagen_control(letra, base, piernas, fijos, meta):
    """Pinta cada pierna de un color y marca los puntos de giro."""
    vista = Image.new("RGBA", base.size, (70, 90, 95, 255))
    vista.alpha_composite(base)
    capa = Image.new("RGBA", base.size, (0, 0, 0, 0))
    capa.paste((255, 60, 60, 110), (0, 0), piernas["A"])
    capa.paste((60, 120, 255, 110), (0, 0), piernas["B"])
    capa.paste((255, 230, 0, 90), (0, 0), fijos)
    for lado in ("A", "B"):
        if "brazo" + lado in piernas:
            capa.paste((200, 60, 255, 120), (0, 0), piernas["brazo" + lado])
    vista.alpha_composite(capa)
    d = ImageDraw.Draw(vista)
    puntos = [p for lado in ("A", "B") for p in meta["piernas"][lado].values()]
    puntos += [p for b in meta.get("brazos", {}).values() for p in b.values()]
    for x, y in puntos:
        d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(0, 255, 0, 255))
    d.line((0, meta["pie"], base.width, meta["pie"]), fill=(0, 255, 0, 255), width=2)
    return vista


def main():
    revisar = "--revisar" in sys.argv
    todo = {}
    controles = []
    for letra, c in CORTES.items():
        meta, base, piernas, fijos = procesar(letra, c)
        todo[{"H": "chico", "M": "chica"}[letra]] = meta
        if revisar:
            controles.append(imagen_control(letra, base, piernas, fijos, meta))
        print(letra, json.dumps(meta["piernas"]))

    with open(os.path.join(RUTA_PARTES, "partes.js"), "w", encoding="utf-8") as f:
        f.write("/* Generado por tools/partes_personaje.py: piezas y puntos de giro para\n")
        f.write("   animar las piernas del héroe por código. No editar a mano. */\n")
        f.write("window.PARTES_PERSONAJE = " + json.dumps(todo, ensure_ascii=False, indent=1) + ";\n")

    if revisar:
        ancho = sum(v.width for v in controles)
        hoja = Image.new("RGBA", (ancho, controles[0].height))
        x = 0
        for v in controles:
            hoja.paste(v, (x, 0))
            x += v.width
        destino = os.path.join(RUTA_PARTES, "_control.png")
        hoja.resize((hoja.width // 2, hoja.height // 2)).save(destino)
        print("control:", destino)


if __name__ == "__main__":
    main()
