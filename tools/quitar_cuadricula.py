"""Quita un fondo de cuadritos "falso" (dibujado dentro de la imagen, no
transparencia real, como lo entregan muchos generadores de imágenes) y separa
cada personaje en su propio PNG transparente. Sirve también con fondo blanco
liso. Si la imagen trae varios personajes (una hoja), salen numerados de
izquierda a derecha y de arriba abajo.

Uso (con Pillow instalado):
    python tools/quitar_cuadricula.py imagen.png carpeta_salida prefijo
"""
import sys
from collections import deque
from PIL import Image, ImageFilter

entrada, salida, prefijo = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(entrada).convert("RGBA")
w, h = im.size
px = im.load()

# Colores del cuadriculado: los 2 tonos más comunes del borde de la imagen
from collections import Counter
borde = Counter()
for x in range(w):
    for y in (0, 1, h - 2, h - 1):
        borde[px[x, y][:3]] += 1
for y in range(h):
    for x in (0, 1, w - 2, w - 1):
        borde[px[x, y][:3]] += 1
tonos = [c for c, _ in borde.most_common(6)]
print("tonos de fondo:", tonos[:4])

def parecido(p, tol=16):
    return any(abs(p[0] - c[0]) <= tol and abs(p[1] - c[1]) <= tol and abs(p[2] - c[2]) <= tol for c in tonos[:4])

# Relleno desde los bordes: solo lo conectado al borde es fondo
visto = bytearray(w * h)
cola = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
while cola:
    x, y = cola.popleft()
    i = y * w + x
    if visto[i] or not parecido(px[x, y]):
        continue
    visto[i] = 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not visto[ny * w + nx]:
            cola.append((nx, ny))

# Zonas encerradas (entre brazo y cuerpo, entre piernas): una mancha del color
# del fondo es cuadriculado si mezcla los 2 tonos (la camiseta blanca o las
# franjas grises son de un solo tono).
def tono_de(p, tol=16):
    for k, c in enumerate(tonos[:4]):
        if abs(p[0] - c[0]) <= tol and abs(p[1] - c[1]) <= tol and abs(p[2] - c[2]) <= tol:
            return k
    return -1

claro = sum(tonos[0]) / 3
grupo = lambda k: 0 if abs(sum(tonos[k]) / 3 - claro) < 25 else 1  # tono claro u oscuro del cuadro

# Tamaño y fase del tablero, medidos en la primera fila y columna
def corridas(valores):
    res, ini = [], 0
    for i in range(1, len(valores) + 1):
        if i == len(valores) or valores[i] != valores[ini]:
            res.append((ini, i - ini, valores[ini]))
            ini = i
    return res

fila0 = [grupo(max(0, tono_de(px[x, 1]))) for x in range(w)]
col0 = [grupo(max(0, tono_de(px[1, y]))) for y in range(h)]
largos = sorted(l for _, l, _ in corridas(fila0)[1:-1])
celda = largos[len(largos) // 2] if largos else 16
cx_ini = next((i for i, l, _ in corridas(fila0) if l >= celda - 2), 0) % celda
cy_ini = next((i for i, l, _ in corridas(col0) if l >= celda - 2), 0) % celda
base = fila0[cx_ini] ^ (((cx_ini - cx_ini) // celda + (1 - cy_ini) // celda) % 2)
print("celda", celda, "fase", cx_ini, cy_ini)

def esperado(x, y):
    return base ^ (((x - cx_ini) // celda + (y - cy_ini) // celda) % 2)

for y0 in range(h):
    for x0 in range(w):
        i0 = y0 * w + x0
        if visto[i0] or tono_de(px[x0, y0]) < 0:
            continue
        mancha, aciertos, comparados, cola = [], 0, 0, deque([(x0, y0)])
        visto[i0] = 2
        while cola:
            x, y = cola.popleft()
            mancha.append((x, y))
            # A un cuadro de distancia, el cuadriculado alterna de tono
            g = grupo(tono_de(px[x, y]))
            for qx, qy in ((x + celda, y), (x, y + celda)):
                if qx < w and qy < h:
                    t = tono_de(px[qx, qy])
                    if t >= 0:
                        comparados += 1
                        aciertos += grupo(t) != g
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not visto[ny * w + nx] and tono_de(px[nx, ny]) >= 0:
                    visto[ny * w + nx] = 2
                    cola.append((nx, ny))
        # Cuadriculado: la mayoría de las comparaciones alternan de tono
        es_cuadricula = comparados >= 20 and aciertos >= 0.6 * comparados
        for x, y in mancha:
            visto[y * w + x] = 1 if es_cuadricula else 3

alfa = Image.new("L", (w, h), 255)
pa = alfa.load()
for y in range(h):
    for x in range(w):
        if visto[y * w + x] == 1:
            pa[x, y] = 0
alfa = alfa.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
im.putalpha(alfa)

# Borra puntitos sueltos (restos de cuadritos de menos de 300 píxeles)
a = im.getchannel("A")
pa = a.load()
marca = bytearray(w * h)
for y0 in range(h):
    for x0 in range(w):
        if pa[x0, y0] < 128 or marca[y0 * w + x0]:
            continue
        grupo_px, cola = [], deque([(x0, y0)])
        marca[y0 * w + x0] = 1
        while cola:
            x, y = cola.popleft()
            grupo_px.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not marca[ny * w + nx] and pa[nx, ny] >= 128:
                    marca[ny * w + nx] = 1
                    cola.append((nx, ny))
        if len(grupo_px) < 300:
            for x, y in grupo_px:
                pa[x, y] = 0
im.putalpha(a)

# Separar personajes: grupos de columnas/filas con contenido
def tramos(perfil, minimo=25):
    res, ini = [], None
    for i, v in enumerate(perfil + [0]):
        if v and ini is None:
            ini = i
        elif not v and ini is not None:
            if i - ini >= minimo:
                res.append((ini, i))
            ini = None
    return res

a = im.getchannel("A").point(lambda v: 255 if v > 128 else 0)
pa = a.load()
filas = tramos([1 if any(pa[x, y] for x in range(0, w, 2)) else 0 for y in range(h)])
n = 0
for (y0, y1) in filas:
    banda = a.crop((0, y0, w, y1))
    pb = banda.load()
    cols = tramos([1 if any(pb[x, y] for y in range(0, y1 - y0, 2)) else 0 for x in range(w)])
    for (x0, x1) in cols:
        pieza = im.crop((x0, y0, x1, y1))
        caja = pieza.getbbox()
        pieza = pieza.crop(caja)
        n += 1
        destino = f"{salida}/{prefijo}_{n}.png"
        pieza.save(destino)
        print(destino, pieza.size)
