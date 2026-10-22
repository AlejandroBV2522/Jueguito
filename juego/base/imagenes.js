/* Camino a Celaque — carga de imágenes y los edificios de llegada (Atlas, Lirios). Ver juego/LEEME.md. */
"use strict";

// Edificios de la ciudad: se ven DESPUÉS del letrero de meta (LARGO_META),
// como el skyline al que llegaste. "Atlas" y "Lirios" son los 2 edificios
// que se deben poder identificar; los demás son copias más chicas/tenues
// de esos mismos dos, solo para dar sensación de más ciudad de fondo.
const RUTA_EDIFICIOS = "assets/edificios/";

// Las fotos traen fondo de cielo liso (son .jpg, sin transparencia real).
// Esta función lo recorta a mano: por cada fila de píxeles, toma el color
// del borde izquierdo como "cielo" y vuelve transparente lo que se le
// parezca, para que la foto se integre con el cielo dibujado del juego.
function cargarEdificioSinCielo(ruta) {
	const estado = { elemento: null };
	const img = new Image();
	img.onload = () => {
		// Si el juego se abre con doble clic (file://) en vez de con un
		// servidor local, el navegador bloquea leer los píxeles de la
		// imagen por seguridad (getImageData lanza SecurityError). En ese
		// caso no se puede quitar el cielo, pero igual hay que mostrar el
		// edificio (con su recuadro de cielo) en vez de no mostrar nada.
		try {
			procesar();
		} catch (err) {
			estado.elemento = img;
		}
	};
	img.src = ruta;

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

		// "Relleno por inundación" desde el borde: el cielo no es un color
		// parejo (es un degradado con ruido de jpg), así que en vez de
		// comparar cada píxel contra un solo color de referencia, se
		// compara cada píxel contra su VECINO ya marcado como cielo. Así
		// el recorte sigue el degradado completo y se detiene justo en el
		// contorno del edificio (donde el color salta de golpe).
		// Umbral bajo: la inundación solo sigue por saltos de color pequeños.
		// Si es muy alto, "camina" por los bordes suavizados y cruza los
		// remates finos del techo (se comía la punta de una torre). El cielo
		// es un degradado suave, así que un umbral chico igual lo recorre
		// entero, pero se detiene en el contorno del edificio.
		const UMBRAL2 = 400;
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
			visitado[idx] = 1;
			esFondo[idx] = 1;
			const i = idx * 4;
			const r = d[i];
			const g = d[i + 1];
			const b = d[i + 2];

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

		// Limpia el "fleco": en el borde entre cielo y edificio quedan
		// píxeles de color intermedio (medio celestes) que la inundación no
		// borra y se ven como una línea punteada sobre el techo. Se hace UNA
		// sola pasada (2 erosionaban demasiado y se comían los remates finos
		// del techo) y solo sobre píxeles CLARAMENTE azulados (b-r grande),
		// para no tocar el gris casi neutro del remate ni la estructura.
		{
			const nuevos = [];
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const idx = y * w + x;
					if (esFondo[idx]) continue;
					const i = idx * 4;
					const r = d[i], b = d[i + 2];
					if (b <= r + 30) continue; // solo fleco muy azulado
					const vecinoFondo =
						(x > 0 && esFondo[idx - 1]) ||
						(x < w - 1 && esFondo[idx + 1]) ||
						(y > 0 && esFondo[idx - w]) ||
						(y < h - 1 && esFondo[idx + w]);
					if (vecinoFondo) nuevos.push(idx);
				}
			}
			for (const idx of nuevos) esFondo[idx] = 1;
		}

		for (let idx = 0; idx < w * h; idx++) {
			if (esFondo[idx]) d[idx * 4 + 3] = 0;
		}
		cctx.putImageData(datos, 0, 0);

		// Recorta el lienzo al contenido opaco: las fotos traen márgenes de
		// cielo arriba y una franja blanca abajo (ya vueltos transparentes)
		// que, al dibujar el borde de la imagen en el suelo, dejan el
		// edificio FLOTANDO. Recortando al edificio real, su base queda
		// pegada al suelo.
		let minX = w, minY = h, maxX = -1, maxY = -1;
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				if (d[(y * w + x) * 4 + 3] !== 0) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		if (maxX < minX) {
			estado.elemento = c; // por si acaso todo salió transparente
			return;
		}
		const cw = maxX - minX + 1;
		const ch = maxY - minY + 1;
		const recorte = document.createElement("canvas");
		recorte.width = cw;
		recorte.height = ch;
		recorte.getContext("2d").drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
		estado.elemento = recorte;
	}

	return estado;
}

// Carga directa de un PNG ya recortado (con transparencia real). No hace
// falta leer los píxeles, así que funciona hasta abriendo el juego con
// doble clic (file://), donde getImageData estaría bloqueado.
function cargarImagen(ruta) {
	const estado = { elemento: null };
	const img = new Image();
	img.onload = () => { estado.elemento = img; };
	img.src = ruta;
	return estado;
}

// Atlas.png fue pre-procesado (horneado) con cargarEdificioSinCielo y
// guardado como PNG transparente y recortado, para que se vea igual de
// bien en cualquier computadora y forma de abrir el juego. La función de
// recorte queda disponible por si se agregan más edificios en .jpg.
// Lirios.png = Lirios.jpg sin el cielo (horneado igual que Atlas): es el
// edificio de un módulo en el mapa (config.js → oficina.edificio).
const imagenLirios = cargarImagen(RUTA_EDIFICIOS + "Lirios.png");
const EDIFICIOS_SALIDA_DATOS = [{ nombre: "Atlas.png", x: LARGO_META + 220, altoBase: 450, alfa: 1 }];
const edificiosSalida = EDIFICIOS_SALIDA_DATOS.map((d) => ({
	cargando: cargarImagen(RUTA_EDIFICIOS + d.nombre),
	x: d.x,
	altoBase: d.altoBase,
	alfa: d.alfa,
}));
