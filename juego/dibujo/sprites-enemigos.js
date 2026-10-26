/* Camino a Celaque — imágenes de los enemigos. Ver juego/LEEME.md. */
"use strict";

// ---------- Sprites de enemigos ----------
// Los sprites ya vienen como PNG transparentes en assets/enemigos/ (el
// fondo de ajedrez fue quitado offline con cargarSpriteSinFondo). Se
// cargan directo (sin leer píxeles), así se ven igual de bien en cualquier
// computadora y hasta abriendo el juego con doble clic (file://), donde
// getImageData estaría bloqueado. cargarSpriteSinFondo queda disponible
// por si se agrega otro enemigo con foto de fondo liso.
const RUTA_ENEMIGOS = "assets/enemigos/";

function cargarSpriteSinFondo(ruta) {
	const estado = { elemento: null };
	const img = new Image();
	img.onload = () => {
		try {
			procesar();
		} catch (err) {
			estado.elemento = img;
		}
	};
	img.src = ruta;

	function pareceFondo(r, g, b) {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const brillo = (r + g + b) / 3;
		return max - min <= 20 && brillo >= 120;
	}

	function procesar() {
		const w = img.naturalWidth;
		const h = img.naturalHeight;
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		const cctx = c.getContext("2d");
		cctx.drawImage(img, 0, 0);
		const datos = cctx.getImageData(0, 0, w, h);
		const d = datos.data;

		const UMBRAL2 = 9000; // suficiente para saltar entre los 2 tonos del ajedrez
		const visitado = new Uint8Array(w * h);
		const esFondo = new Uint8Array(w * h);
		const colaX = [];
		const colaY = [];
		for (let x = 0; x < w; x++) {
			colaX.push(x, x);
			colaY.push(0, h - 1);
		}
		for (let y = 0; y < h; y++) {
			colaX.push(0, w - 1);
			colaY.push(y, y);
		}

		let cabeza = 0;
		while (cabeza < colaX.length) {
			const x = colaX[cabeza];
			const y = colaY[cabeza];
			cabeza++;
			if (x < 0 || x >= w || y < 0 || y >= h) continue;
			const idx = y * w + x;
			if (visitado[idx]) continue;
			const i = idx * 4;
			const r = d[i], g = d[i + 1], b = d[i + 2];
			if (!pareceFondo(r, g, b)) continue;
			visitado[idx] = 1;
			esFondo[idx] = 1;

			const vecinos = [
				[x + 1, y],
				[x - 1, y],
				[x, y + 1],
				[x, y - 1],
			];
			for (const [nx, ny] of vecinos) {
				if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
				const nidx = ny * w + nx;
				if (visitado[nidx]) continue;
				const ni = nidx * 4;
				const dr = d[ni] - r;
				const dg = d[ni + 1] - g;
				const db = d[ni + 2] - b;
				if (dr * dr + dg * dg + db * db < UMBRAL2) {
					colaX.push(nx);
					colaY.push(ny);
				}
			}
		}

		for (let idx = 0; idx < w * h; idx++) {
			if (esFondo[idx]) d[idx * 4 + 3] = 0;
		}
		cctx.putImageData(datos, 0, 0);
		estado.elemento = c;
	}

	return estado;
}

// El murciélago: vuela de frente, no hace falta una pose distinta para
// cada lado (el flip da igual en una pose simétrica). anclaY > abajo lo
// levanta del piso: el punto que se pega a la línea de suelo queda POR
// DEBAJO de las garras (en el margen transparente), así que todo el
// murciélago -garras incluidas- flota bien arriba, en vez de tocar la
// carretera. Cada pose mide distinto (la embestida estira el cuerpo), así
// que anclaY se recalculó para la pose de golpe de modo que flote a la
// MISMA altura relativa que en la pose quieta (mismo múltiplo de su alto
// de contenido), no al mismo número crudo.
const SPRITES_MURCIELAGO = {
	quieto: { archivo: "murcielago.png", anclaX: 770 / 1536, arriba: 208 / 1024, abajo: 812 / 1024, anclaY: 1.4 },
	golpe: {
		archivo: "murcielagoGolpe.png",
		anclaX: 749 / 1536,
		arriba: 151 / 1024,
		abajo: 828 / 1024,
		anclaY: 1.49,
	},
};
for (const clave in SPRITES_MURCIELAGO) {
	SPRITES_MURCIELAGO[clave].cargando = cargarImagen(RUTA_ENEMIGOS + SPRITES_MURCIELAGO[clave].archivo);
}

// El Esqueleto: de pie con espada en alto (quieto) y embestida con la
// espada al frente (golpe). Ambas poses se paran con normalidad (garras/
// pies en el suelo), no hace falta anclaY especial.
const SPRITES_ESQUELETO = {
	quieto: { archivo: "Esqueleto.png", anclaX: 513 / 1024, arriba: 163 / 1536, abajo: 1424 / 1536 },
	golpe: { archivo: "EsqueletoGolpe.png", anclaX: 512.5 / 1024, arriba: 327 / 1536, abajo: 1309 / 1536 },
};
for (const clave in SPRITES_ESQUELETO) {
	SPRITES_ESQUELETO[clave].cargando = cargarImagen(RUTA_ENEMIGOS + SPRITES_ESQUELETO[clave].archivo);
}

// El Golem sí trae las 2 fotos (quieto y golpe con el puño de energía).
const SPRITES_GOLEM = {
	quieto: { archivo: "GolemParado.png", anclaX: 697 / 1408, arriba: 41 / 768, abajo: 749 / 768 },
	golpe: { archivo: "GolemGolpe.png", anclaX: 804.5 / 1408, arriba: 21 / 768, abajo: 765 / 768 },
};
for (const clave in SPRITES_GOLEM) {
	SPRITES_GOLEM[clave].cargando = cargarImagen(RUTA_ENEMIGOS + SPRITES_GOLEM[clave].archivo);
}

// El jefe final: dragón-bestia de cristal de la cueva. Trae las 2 fotos
// (quieto y golpe lanzando una ráfaga de energía de cristal). anclaX de la
// pose de golpe se midió SOLO sobre el cuerpo (sin la ráfaga, que sale
// hacia adelante y corre el centro), para que el cuerpo del dragón quede
// clavado en el mismo lugar que en la pose quieta y no "salte" al atacar.
const SPRITES_JEFE = {
	quieto: { archivo: "JefeFinalParado.png", anclaX: 570 / 1408, arriba: 43 / 768, abajo: 746 / 768 },
	golpe: { archivo: "JefeFinalGolpe.png", anclaX: 567 / 1408, arriba: 34 / 768, abajo: 746 / 768 },
};
for (const clave in SPRITES_JEFE) {
	SPRITES_JEFE[clave].cargando = cargarImagen(RUTA_ENEMIGOS + SPRITES_JEFE[clave].archivo);
}

// El Guardián de la Entrada: centinela de piedra tallada con ojos de
// cristal, parado sobre un pedestal con runas (quieto) y lanzando un
// puñetazo en estocada (golpe, sin pedestal -pose dinámica de combate-).
const SPRITES_CENTINELA = {
	quieto: { archivo: "Centinela.png", anclaX: 0.3483, arriba: 0.0456, abajo: 0.9701, mirarIzquierda: true },
	golpe: { archivo: "CentinelaGolpe.png", anclaX: 0.502, arriba: 0.0534, abajo: 0.9635, escalaExtra: 0.92 },
};
for (const clave in SPRITES_CENTINELA) {
	SPRITES_CENTINELA[clave].cargando = cargarImagen(RUTA_ENEMIGOS + SPRITES_CENTINELA[clave].archivo);
}

// Qué foto usar según el nombre del enemigo (los que no aparecen acá se
// dibujan con el personaje vectorial de siempre).
const SPRITES_POR_ENEMIGO = {
	"Guardián de la Entrada": SPRITES_CENTINELA,
	"Murciélago de la Cueva": SPRITES_MURCIELAGO,
	"Guerrero Esqueleto": SPRITES_ESQUELETO,
	"Golem de Piedra": SPRITES_GOLEM,
	"Guardián de Celaque": SPRITES_JEFE,
};
