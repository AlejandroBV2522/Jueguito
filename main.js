/* Camino a Celaque — lógica del juego.
   100% código propio: sin librerías ni fuentes externas. Casi todo se dibuja
   con <canvas>; la llegada a Celaque (al salir de la Cueva) usa unas pocas
   imágenes PNG locales propias (assets/edificios/). Para editar textos y
   NPCs usa config.js. */
(function () {
	"use strict";

	const CFG = window.CONFIG_JUEGO;
	const LARGO = CFG.largoDelCamino;
	const INICIO_X = 80;
	const LARGO_CUEVA = 2400; // tramo de la Cueva, después del camino (más largo = enemigos más separados)
	const LARGO_TOTAL = LARGO + LARGO_CUEVA;
	const LARGO_META = LARGO_TOTAL + 500; // tramo urbano: se camina un poco más hasta el letrero

	// ---------- Física del salto (real: gravedad + colisión contra los tubos) ----------
	// Unidades de mundo (iguales a heroe.x), independientes de S — se multiplican
	// por S solo al dibujar. ALTO_TUBO_MUNDO se calculó para que los pies del
	// héroe queden justo en el borde superior dibujado por dibujarTubo():
	// pie = SUELO + 38*S (parado normal) y el borde del tubo queda en
	// SUELO - 88*S (con base=SUELO+44*S, alto=110*S, borde=22*S) →
	// 38 - ALTO_TUBO_MUNDO = -88 → ALTO_TUBO_MUNDO = 126.
	const ALTO_TUBO_MUNDO = 126;
	const ANCHO_TUBO_MUNDO = 70;
	const GRAVEDAD = 3300;
	const IMPULSO_SALTO = 1000;
	let vidas = 3;

	// ---------- Huecos en la Cueva (hay que saltarlos, si no te caes) ----------
	// Con IMPULSO_SALTO/GRAVEDAD de arriba, un salto completo dura ~0.6s: a
	// velocidadCorriendo (240 px/s) cubre ~145px, caminando (120 px/s) solo
	// ~73px. ANCHO_HUECO=90 exige correr para pasarlo cómodo (caminando se
	// queda corto y cae).
	const ANCHO_HUECO = 70;
	const HUECOS_CUEVA = [0.4, 0.8].map((frac) => ({ x: LARGO + frac * LARGO_CUEVA }));

	// ---------- Utilidades ----------
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const suave = (e0, e1, x) => {
		const t = clamp((x - e0) / (e1 - e0), 0, 1);
		return t * t * (3 - 2 * t);
	};
	const modulo = (a, n) => ((a % n) + n) % n;

	const cacheRgb = {};
	function hexARgb(hex) {
		if (!cacheRgb[hex]) {
			const n = parseInt(hex.slice(1), 16);
			cacheRgb[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
		}
		return cacheRgb[hex];
	}

	function mezclar(a, b, t, alfa) {
		const A = hexARgb(a);
		const B = hexARgb(b);
		const r = Math.round(lerp(A[0], B[0], t));
		const g = Math.round(lerp(A[1], B[1], t));
		const bl = Math.round(lerp(A[2], B[2], t));
		return alfa === undefined ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alfa})`;
	}

	function conAlfa(hex, a) {
		const [r, g, b] = hexARgb(hex);
		return `rgba(${r},${g},${b},${a})`;
	}

	// Generador aleatorio con semilla: el paisaje sale igual en cada partida
	function crearAzar(semilla) {
		return function () {
			semilla = (semilla + 0x6d2b79f5) | 0;
			let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	// ---------- Paleta: [gris al inicio, color al llegar a Celaque] ----------
	const PALETA = {
		cieloArriba: ["#5b5f66", "#3db4f2"],
		cieloAbajo: ["#8a8e94", "#dff9d0"],
		montanaLejana: ["#6c7076", "#7cc6a4"],
		celaque: ["#63676d", "#2f9e62"],
		colinas: ["#5e6267", "#58c86e"],
		tierra: ["#56585b", "#8a6a42"],
		pasto: ["#6a6d70", "#5fdc4c"],
		tronco: ["#4f5053", "#7b5231"],
		hojas: ["#6c6f73", "#2fb64e"],
		hojasLuz: ["#7c7f83", "#8ff06b"],
		nube: ["#9a9ca0", "#ffffff"],
		heroeMochila: ["#66686b", "#2e9e5b"],
	};
	const color = (clave, t, alfa) => mezclar(PALETA[clave][0], PALETA[clave][1], t, alfa);
	// Qué tan "coloreado" está un punto del camino (0 = gris, 1 = colorido)
	const tono = (p) => suave(0.02, 0.92, p);

	const COLORES_FLOR = ["#ff6f91", "#ffd23f", "#ffffff", "#c77dff", "#ff9f1c"];
	const COLORES_MARIPOSA = ["#ffd54f", "#ff8a80", "#b388ff", "#80d8ff"];

	// ---------- Canvas ----------
	const canvas = document.getElementById("juego");
	const ctxJuego = canvas.getContext("2d");
	let ctx = ctxJuego; // se cambia temporalmente al dibujar las vistas previas del selector
	let W = 0, H = 0, S = 1, SUELO = 0;

	function redimensionar() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = window.innerWidth;
		H = window.innerHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		S = clamp(H / 720, 0.7, 1.4);
		SUELO = Math.round(H * 0.72);
	}
	window.addEventListener("resize", redimensionar);
	redimensionar();

	// ---------- Mundo ----------
	const npcs = window.NPCS
		.map((d) => ({ ...d, x: d.posicion * LARGO, hablado: false }))
		.sort((a, b) => a.x - b.x);

	const enemigos = window.PREGUNTAS_CUEVA
		.map((d) => ({
			...d,
			x: LARGO + d.posicion * LARGO_CUEVA,
			// La mayoría trae 1 sola pregunta (pregunta/opciones/correcta en el
			// nivel de arriba); si trae "preguntas" (varias, ej. el jefe final),
			// hay que responderlas todas en orden para vencerlo.
			preguntas: d.preguntas || [{ pregunta: d.pregunta, opciones: d.opciones, correcta: d.correcta }],
			preguntaActual: 0,
			derrotado: false,
			atacando: false,
			atacandoT: 0,
			cayendo: 0,
		}))
		.sort((a, b) => a.x - b.x);

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
	const EDIFICIOS_SALIDA_DATOS = [{ nombre: "Atlas.png", x: LARGO_META + 220, altoBase: 450, alfa: 1 }];
	const edificiosSalida = EDIFICIOS_SALIDA_DATOS.map((d) => ({
		cargando: cargarImagen(RUTA_EDIFICIOS + d.nombre),
		x: d.x,
		altoBase: d.altoBase,
		alfa: d.alfa,
	}));

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

	// Qué foto usar según el nombre del enemigo (los que no aparecen acá
	// -como el Guardián de la Entrada y el jefe final- se dibujan con el
	// personaje vectorial de siempre).
	const SPRITES_POR_ENEMIGO = {
		"Murciélago de la Cueva": SPRITES_MURCIELAGO,
		"Guerrero Esqueleto": SPRITES_ESQUELETO,
		"Golem de Piedra": SPRITES_GOLEM,
	};

	const azar = crearAzar(20260925);

	const arboles = [];
	for (let x = 220; x < LARGO - 250; x += 170 + azar() * 200) {
		if (npcs.some((n) => Math.abs(n.x - x) < 90)) continue;
		arboles.push({ x, tam: 0.75 + azar() * 0.5 });
	}

	const arbolesLejanos = [];
	for (let x = 100; x < LARGO * 0.75; x += 120 + azar() * 160) {
		arbolesLejanos.push({ x, tam: 0.45 + azar() * 0.2 });
	}

	const matas = [];
	for (let x = 0; x < LARGO + 1500; x += 18 + azar() * 14) {
		matas.push({
			x,
			alto: azar(),
			flor: azar(),
			colorFlor: COLORES_FLOR[Math.floor(azar() * COLORES_FLOR.length)],
			delante: azar() < 0.35,
		});
	}

	const nubes = [];
	for (let i = 0; i < 8; i++) {
		nubes.push({ x: azar() * 3000, y: 0.06 + azar() * 0.22, tam: 0.7 + azar() * 0.7, vel: 6 + azar() * 10 });
	}

	const mariposas = [];
	for (let i = 0; i < 14; i++) {
		mariposas.push({
			x: LARGO * (0.55 + azar() * 0.45),
			fase: azar() * 10,
			color: COLORES_MARIPOSA[i % COLORES_MARIPOSA.length],
		});
	}

	const gotas = [];
	for (let i = 0; i < 140; i++) {
		gotas.push({ x: azar(), y: azar(), vel: 0.9 + azar() * 0.5 });
	}

	// Edificios de relleno: formas geométricas simples (nada de fotos), solo
	// para dar sensación de más ciudad alrededor de Atlas y Lirios sin
	// competir con ellos. Posiciones/colores al azar pero deterministas.
	const PALETA_EDIFICIOS_SIMPLES = ["#9aa5ad", "#b7c4cc", "#8b98a3", "#c9a97a", "#a9b4bd"];
	const edificiosSimples = [];
	for (let i = 0; i < 6; i++) {
		edificiosSimples.push({
			x: LARGO_META + 20 + i * 150 + (azar() - 0.5) * 60,
			// Más bajos que Atlas (altoBase 560) para que el Atlas destaque
			// como el edificio principal, pero bien por encima del horizonte.
			alto: 210 + azar() * 150,
			ancho: 70 + azar() * 50,
			color: PALETA_EDIFICIOS_SIMPLES[Math.floor(azar() * PALETA_EDIFICIOS_SIMPLES.length)],
		});
	}

	// ---------- Decoración de la Cueva ----------
	// Todo esto vive entre LARGO (boca) y LARGO_TOTAL (salida). Se genera con
	// el mismo azar() determinista, DESPUÉS de todo lo de afuera para no
	// correrle la secuencia a los árboles/nubes/etc.
	const murcielagosFondo = [];
	for (let i = 0; i < 15; i++) {
		murcielagosFondo.push({
			x: LARGO + 120 + azar() * (LARGO_CUEVA - 240),
			y: 0.12 + azar() * 0.4, // fracción de la altura hasta SUELO
			tam: 0.5 + azar() * 0.6,
			fase: azar() * Math.PI * 2,
			vel: 18 + azar() * 26, // deriva horizontal lenta
			aleteo: 7 + azar() * 5,
		});
	}

	const cristales = [];
	for (let i = 0; i < 21; i++) {
		cristales.push({
			x: LARGO + 80 + azar() * (LARGO_CUEVA - 160),
			tam: 0.6 + azar() * 0.8,
			tono: azar() < 0.5 ? "#5fd6e0" : "#9a7fe0", // turquesa o violeta
			fase: azar() * Math.PI * 2,
		});
	}

	const estalagmitas = [];
	for (let i = 0; i < 24; i++) {
		estalagmitas.push({
			x: LARGO + 60 + azar() * (LARGO_CUEVA - 120),
			alto: 20 + azar() * 40,
			ancho: 14 + azar() * 16,
		});
	}

	// Polvo/esporas flotando: puntitos tenues que suben apenas, en coords de
	// pantalla (como la lluvia), solo se dibujan dentro de la cueva.
	const polvoCueva = [];
	for (let i = 0; i < 60; i++) {
		polvoCueva.push({ x: azar(), y: azar(), vel: 0.02 + azar() * 0.05, fase: azar() * Math.PI * 2 });
	}

	let petalos = [];

	// ---------- Estado ----------
	let estado = "inicio"; // inicio | jugando | dialogo | cueva | pregunta | transicion | victoria
	// Controla el fondo (afuera vs. cueva oscura): solo se activa al cruzar el
	// tubo de entrada, no con solo llegar caminando a x = LARGO (el clamp deja
	// al héroe justo ahí antes de agacharse, y aún debe verse el mundo de afuera).
	let dentroCueva = false;
	// Se activa al salir de la Cueva por el tubo de salida: el paisaje vuelve,
	// pero ahora urbano (con los edificios), no el camino rural de antes.
	let vistaUrbana = false;
	// Pantalla negra al cruzar un tubo (ver entrarPorTubo/actualizar).
	let transicion = null;
	const heroe = {
		x: INICIO_X,
		dir: 1,
		fase: 0,
		moviendo: false,
		corriendo: false,
		y: 0, // altura sobre el suelo (0 = piso), física real de salto
		velY: 0,
		agachado: false,
		atacando: false,
		atacandoT: 0,
	};
	const CLAVES_PERSONAJE = Object.keys(CFG.personajes);
	let personaje = CLAVES_PERSONAJE[0];
	let camara = 0;
	let tiempo = 0;
	const entrada = { izq: false, der: false, correr: false, abajo: false, rueda: 0, ruedaHasta: 0 };
	const dlg = { npc: null, linea: 0, visibles: 0, mostradas: -1, enemigo: null, sistema: false };

	// ---------- Interfaz (HTML) ----------
	const $ = (id) => document.getElementById(id);
	const ui = {
		hud: $("hud"),
		hudRelleno: $("hud-relleno"),
		hudTexto: $("hud-texto"),
		dialogo: $("dialogo"),
		retrato: $("dialogo-retrato"),
		nombre: $("dialogo-nombre"),
		texto: $("dialogo-texto"),
		pista: $("dialogo-pista"),
		opciones: $("dialogo-opciones"),
		inicio: $("pantalla-inicio"),
		victoria: $("pantalla-victoria"),
		tactiles: $("controles-tactiles"),
	};

	$("titulo").textContent = CFG.textos.titulo;
	$("subtitulo").textContent = CFG.textos.subtitulo;
	$("victoria-titulo").textContent = CFG.textos.victoriaTitulo;
	$("victoria-texto").textContent = CFG.textos.victoriaTexto;
	document.title = CFG.textos.titulo;

	const esTactil = window.matchMedia("(pointer: coarse)").matches;

	function actualizarHud() {
		const progreso = clamp((heroe.x - INICIO_X) / (LARGO - INICIO_X), 0, 1);
		ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
		const conocidos = npcs.filter((n) => n.hablado).length;
		ui.hudTexto.textContent = `${CFG.textos.contadorNpcs}: ${conocidos} / ${npcs.length}`;
	}

	function actualizarHudCueva() {
		const derrotados = enemigos.filter((e) => e.derrotado).length;
		ui.hudRelleno.style.width = ((derrotados / enemigos.length) * 100).toFixed(1) + "%";
		ui.hudTexto.textContent = `Vidas: ${"♥".repeat(vidas)}${"♡".repeat(3 - vidas)}  ·  Enemigos vencidos: ${derrotados} / ${enemigos.length}`;
	}

	// ---------- Selector de personaje ----------
	const opciones = [...document.querySelectorAll(".opcion")];

	function elegirPersonaje(clave) {
		personaje = clave;
		opciones.forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.personaje === clave)));
	}

	opciones.forEach((btn) => {
		btn.querySelector("span").textContent = CFG.personajes[btn.dataset.personaje].nombre;
		btn.addEventListener("click", () => elegirPersonaje(btn.dataset.personaje));
	});
	elegirPersonaje(personaje);

	// Dibuja a cada personaje en su tarjeta; el elegido camina en su lugar
	function dibujarVistasPrevias() {
		const sAnterior = S;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		for (const btn of opciones) {
			const lienzo = btn.querySelector("canvas");
			const ancho = 110, alto = 130;
			if (lienzo.width !== ancho * dpr) {
				lienzo.width = ancho * dpr;
				lienzo.height = alto * dpr;
			}
			ctx = lienzo.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, ancho, alto);
			S = 1.2;
			const elegido = btn.dataset.personaje === personaje;
			dibujarPersona(ancho / 2, alto - 10, aparienciaHeroe(btn.dataset.personaje, 1, {
				dir: 1,
				fase: tiempo * 9,
				moviendo: elegido,
			}));
		}
		ctx = ctxJuego;
		S = sAnterior;
	}

	function comenzar() {
		estado = "jugando";
		ui.inicio.hidden = true;
		ui.hud.hidden = false;
		ui.tactiles.hidden = !esTactil;
		actualizarHud();
	}

	function reiniciarMundo() {
		heroe.x = INICIO_X;
		heroe.dir = 1;
		camara = 0;
		npcs.forEach((n) => (n.hablado = false));
		enemigos.forEach((e) => {
			e.derrotado = false;
			e.atacando = false;
			e.atacandoT = 0;
			e.cayendo = 0;
			e.preguntaActual = 0;
		});
		vidas = 3;
		dentroCueva = false;
		vistaUrbana = false;
		transicion = null;
		heroe.y = 0;
		heroe.velY = 0;
		heroe.agachado = false;
		heroe.atacando = false;
		heroe.atacandoT = 0;
		petalos = [];
		ui.victoria.hidden = true;
	}

	function reiniciar() {
		reiniciarMundo();
		comenzar();
	}

	function volverAlInicio() {
		reiniciarMundo();
		estado = "inicio";
		ui.hud.hidden = true;
		ui.tactiles.hidden = true;
		ui.inicio.hidden = false;
	}

	function ganar() {
		estado = "victoria";
		vistaUrbana = true; // el paisaje vuelve, ahora urbano (con los edificios)
		heroe.moviendo = heroe.corriendo = false;
		ui.tactiles.hidden = true;
		for (let i = 0; i < 90; i++) {
			petalos.push({
				x: Math.random(),
				y: -Math.random() * 0.8,
				vel: 0.08 + Math.random() * 0.12,
				giro: Math.random() * 6,
				color: COLORES_FLOR[i % COLORES_FLOR.length],
			});
		}
		setTimeout(() => (ui.victoria.hidden = false), 700);
	}

	// ---------- Diálogos ----------
	function abrirDialogo(npc) {
		estado = "dialogo";
		heroe.moviendo = heroe.corriendo = false;
		heroe.dir = npc.x >= heroe.x ? 1 : -1;
		dlg.npc = npc;
		dlg.linea = 0;
		dlg.visibles = 0;
		dlg.mostradas = -1;
		ui.nombre.textContent = npc.nombre;
		ui.retrato.textContent = npc.nombre.charAt(0).toUpperCase();
		ui.retrato.style.background = npc.apariencia.ropa;
		ui.dialogo.hidden = false;
		ui.dialogo.classList.remove("arriba"); // el diálogo normal de NPC va abajo
		document.body.classList.add("con-dialogo");
		actualizarPista();
	}

	function lineaActual() {
		return dlg.npc.dialogo[dlg.linea] || "";
	}

	function actualizarPista() {
		const ultima = dlg.linea >= dlg.npc.dialogo.length - 1;
		ui.pista.textContent = ultima ? "Cerrar ✕" : "Continuar ▸";
	}

	function avanzarDialogo() {
		if (dlg.sistema) {
			reiniciarCueva();
			return;
		}
		if (dlg.visibles < lineaActual().length) {
			dlg.visibles = lineaActual().length; // completar la frase de golpe
			return;
		}
		dlg.linea++;
		dlg.visibles = 0;
		dlg.mostradas = -1;
		if (dlg.linea >= dlg.npc.dialogo.length) {
			cerrarDialogo();
		} else {
			actualizarPista();
		}
	}

	function cerrarDialogo() {
		dlg.npc.hablado = true;
		dlg.npc = null;
		ui.dialogo.hidden = true;
		document.body.classList.remove("con-dialogo");
		estado = "jugando";
		actualizarHud();
	}

	function npcCercano() {
		return npcs.find((n) => Math.abs(n.x - heroe.x) < CFG.distanciaParaHablar * 1.3);
	}

	// ---------- La Cueva ----------
	function entrarCueva() {
		estado = "cueva";
		dentroCueva = true;
		actualizarHudCueva();
	}

	// ---------- Tubos (entrada/salida de la Cueva) ----------
	function puedeUsarTuboEntrada() {
		return (
			estado === "jugando" &&
			!enemigos.find((en) => !en.derrotado && en.x <= LARGO) &&
			Math.abs(heroe.x - LARGO) < CFG.distanciaParaHablar
		);
	}

	function puedeUsarTuboSalida() {
		return (
			estado === "cueva" &&
			!enemigos.find((en) => !en.derrotado) &&
			Math.abs(heroe.x - LARGO_TOTAL) < CFG.distanciaParaHablar
		);
	}

	// Los tubos son los únicos "objetos sólidos": si x cae dentro de su ancho,
	// el suelo efectivo ahí es la altura del tubo en vez de 0.
	function alturaTuboEn(x) {
		// Cada tubo solo es "sólido" mientras sigue siendo relevante: el de
		// entrada antes de cruzar, el de salida ya adentro de la Cueva. Así,
		// al entrar/salir el héroe cae naturalmente del borde del tubo al
		// suelo normal, en vez de quedar flotando parado sobre uno viejo.
		if (!dentroCueva && Math.abs(x - LARGO) < ANCHO_TUBO_MUNDO / 2) return ALTO_TUBO_MUNDO;
		if (dentroCueva && !vistaUrbana && Math.abs(x - LARGO_TOTAL) < ANCHO_TUBO_MUNDO / 2) return ALTO_TUBO_MUNDO;
		return 0;
	}

	// Huecos: al revés de los tubos, acá NO hay piso. Si caminas/aterrizas
	// dentro de uno sin saltarlo, no hay suelo=0 que te detenga y te sigues
	// cayendo hasta perder.
	function hayHuecoEn(x) {
		if (!dentroCueva || vistaUrbana) return false;
		return HUECOS_CUEVA.some((h) => Math.abs(x - h.x) < ANCHO_HUECO / 2);
	}

	// "Parado" en general: sirve para saltar, sea desde el piso normal o
	// desde encima de un tubo (no exige estar en el tubo específicamente).
	function heroeEnSuelo() {
		if (heroe.velY !== 0) return false;
		return heroe.y === 0 || heroe.y === alturaTuboEn(heroe.x);
	}

	// Estricto: solo es verdad si de verdad estás parado ARRIBA de un tubo
	// (llegaste ahí saltando), no con solo estar parado en el piso normal
	// junto a él.
	function estaSobreTubo() {
		const alturaTubo = alturaTuboEn(heroe.x);
		return alturaTubo > 0 && heroe.velY === 0 && heroe.y === alturaTubo;
	}

	// El tubo es un objeto sólido y uniforme: caminando por el suelo, el héroe
	// frena con el CUERPO pegado a la cara del tubo (no se mete adentro). El
	// tope es la mitad del ancho visual del tubo + el medio ancho del héroe,
	// escalado por S para que se vea igual en cualquier resolución. Ya arriba
	// (saltó y aterrizó encima), sí puede llegar al centro.
	function limiteFrenteATubo(cx, heroeY) {
		return heroeY >= ALTO_TUBO_MUNDO ? cx : cx - 47 * S;
	}

	function saltarAccion() {
		if ((estado !== "jugando" && estado !== "cueva" && estado !== "urbano") || !heroeEnSuelo()) return;
		heroe.velY = IMPULSO_SALTO;
	}

	function agacharAccion() {
		if (heroe.agachado || !estaSobreTubo()) return;
		if (puedeUsarTuboEntrada()) entrarPorTubo(entrarCueva);
		else if (puedeUsarTuboSalida()) entrarPorTubo(salirACiudad);
	}

	// Al cruzar el tubo de salida no se gana de inmediato: hay que caminar un
	// poco más por la ciudad hasta el letrero (LARGO_META).
	function salirACiudad() {
		estado = "urbano";
		vistaUrbana = true;
	}

	// Pantalla negra de 3s al cruzar un tubo (ver el bloque "transicion" en
	// actualizar(dt) y dibujar(dt)).
	function entrarPorTubo(luego) {
		heroe.agachado = true;
		heroe.moviendo = heroe.corriendo = false;
		estado = "transicion";
		transicion = { t: 0, luego };
	}

	function abrirPregunta(enemigo) {
		estado = "pregunta";
		heroe.moviendo = heroe.corriendo = false;
		dlg.enemigo = enemigo;
		const p = enemigo.preguntas[enemigo.preguntaActual];
		ui.nombre.textContent = enemigo.nombre;
		ui.retrato.textContent = enemigo.nombre.charAt(0).toUpperCase();
		ui.retrato.style.background = enemigo.apariencia.ropa;
		ui.texto.textContent = p.pregunta;
		const vidasTexto = `Vidas: ${"♥".repeat(vidas)}${"♡".repeat(3 - vidas)}`;
		ui.pista.textContent =
			enemigo.preguntas.length > 1
				? `Pregunta ${enemigo.preguntaActual + 1}/${enemigo.preguntas.length} · ${vidasTexto}`
				: vidasTexto;
		ui.opciones.innerHTML = "";
		ui.opciones.hidden = false;
		p.opciones.forEach((texto, i) => {
			const btn = document.createElement("button");
			btn.className = "boton opcion-respuesta";
			btn.textContent = texto;
			btn.addEventListener("click", (e) => {
				e.stopPropagation(); // no debe disparar el click-to-advance de #dialogo
				responder(i, enemigo);
			});
			ui.opciones.appendChild(btn);
		});
		ui.dialogo.hidden = false;
		ui.dialogo.classList.add("arriba"); // para que se vea la pelea abajo, en el canvas
		document.body.classList.add("con-dialogo");
	}

	function responder(indice, enemigo) {
		const p = enemigo.preguntas[enemigo.preguntaActual];
		if (indice === p.correcta) {
			// Cierra la caja ya, para que se vea la pelea en el canvas
			ui.opciones.hidden = true;
			ui.opciones.innerHTML = "";
			ui.dialogo.hidden = true;
			document.body.classList.remove("con-dialogo");

			heroe.atacando = true;
			heroe.atacandoT = 0;

			const quedanPreguntas = enemigo.preguntaActual + 1 < enemigo.preguntas.length;
			if (quedanPreguntas) {
				// Todavía no cae: hay que responderle otra pregunta más.
				setTimeout(() => {
					enemigo.preguntaActual++;
					abrirPregunta(enemigo);
				}, 550);
			} else {
				enemigo.cayendo = 0.001; // arranca la animación de caída (ver actualizar)
				setTimeout(() => {
					enemigo.derrotado = true;
					cerrarPregunta(enemigo);
				}, 550);
			}
		} else {
			enemigo.atacando = true;
			enemigo.atacandoT = 0;
			vidas--;
			if (vidas <= 0) setTimeout(perderCueva, 350);
			else ui.pista.textContent = `Incorrecto, intenta de nuevo. Vidas: ${"♥".repeat(vidas)}${"♡".repeat(3 - vidas)}`;
		}
	}

	function cerrarPregunta(enemigo) {
		dlg.enemigo = null;
		ui.opciones.hidden = true;
		ui.opciones.innerHTML = "";
		ui.dialogo.hidden = true;
		ui.dialogo.classList.remove("arriba");
		document.body.classList.remove("con-dialogo");
		if (enemigo.x <= LARGO) {
			// Era el Guardián, afuera: sigues caminando el camino normal
			estado = "jugando";
			actualizarHud();
		} else {
			estado = "cueva";
			actualizarHudCueva();
		}
	}

	// Caerte en un hueco (a diferencia de perder por preguntas) no pasa con
	// el diálogo ya abierto, así que hay que abrirlo desde cero acá.
	function perderPorHueco() {
		estado = "pregunta";
		heroe.moviendo = heroe.corriendo = false;
		dlg.enemigo = null;
		ui.nombre.textContent = "Cuidado";
		ui.retrato.textContent = "!";
		ui.retrato.style.background = "#3a3a4a";
		ui.dialogo.hidden = false;
		document.body.classList.add("con-dialogo");
		ui.opciones.hidden = true;
		ui.opciones.innerHTML = "";
		ui.texto.textContent = "Te caíste en un hueco. Vuelves a la entrada de la cueva.";
		ui.pista.textContent = "Reintentar ▸";
		dlg.sistema = true; // avanzarDialogo() lo revisa primero
	}

	function perderCueva() {
		ui.opciones.hidden = true;
		ui.opciones.innerHTML = "";
		const esGuardian = dlg.enemigo && dlg.enemigo.x <= LARGO;
		ui.texto.textContent = esGuardian
			? "Te quedaste sin vidas. Vuelves a intentarlo con el Guardián."
			: "Te quedaste sin vidas. Vuelves a la entrada de la cueva.";
		ui.pista.textContent = "Reintentar ▸";
		dlg.sistema = true; // avanzarDialogo() lo revisa primero
	}

	function reiniciarCueva() {
		const enemigo = dlg.enemigo;
		vidas = 3;
		heroe.y = 0;
		heroe.velY = 0;
		heroe.atacando = false;
		heroe.atacandoT = 0;
		enemigos.forEach((e) => {
			e.atacando = false;
			e.atacandoT = 0;
			e.preguntaActual = 0;
		});
		if (enemigo && enemigo.x <= LARGO) {
			// Perdiste con el Guardián: sigues afuera, antes de la entrada
			heroe.x = Math.max(40, enemigo.x - 90);
			estado = "jugando";
			dentroCueva = false;
		} else {
			// Perdiste con un enemigo de adentro: reinicia solo la Cueva
			enemigos.forEach((e) => {
				if (e.x > LARGO) {
					e.derrotado = false;
					e.cayendo = 0;
				}
			});
			heroe.x = LARGO + 10;
			estado = "cueva";
		}
		dlg.enemigo = null;
		dlg.sistema = false;
		ui.dialogo.hidden = true;
		document.body.classList.remove("con-dialogo");
		if (estado === "jugando") actualizarHud();
		else actualizarHudCueva();
	}

	function accion() {
		if (estado === "inicio") comenzar();
		else if (estado === "dialogo") avanzarDialogo();
		else if (estado === "jugando") {
			const npc = npcCercano();
			if (npc) abrirDialogo(npc);
		}
	}

	// ---------- Controles ----------
	const TECLAS_IZQ = ["ArrowLeft", "a", "A"];
	const TECLAS_DER = ["ArrowRight", "d", "D"];
	const TECLAS_ACCION = [" ", "Enter", "e", "E"];
	const TECLAS_CORRER = ["q", "Q"];
	const TECLAS_SALTAR = ["ArrowUp", "w", "W"];
	const TECLAS_AGACHAR = ["ArrowDown", "s", "S"];

	window.addEventListener("keydown", (e) => {
		if (TECLAS_IZQ.includes(e.key) || TECLAS_DER.includes(e.key)) {
			e.preventDefault();
			if (estado === "inicio") {
				// En el inicio, las flechas cambian de personaje
				const i = CLAVES_PERSONAJE.indexOf(personaje) + (TECLAS_DER.includes(e.key) ? 1 : -1);
				elegirPersonaje(CLAVES_PERSONAJE[modulo(i, CLAVES_PERSONAJE.length)]);
				return;
			}
			if (TECLAS_IZQ.includes(e.key)) entrada.izq = true;
			else entrada.der = true;
		} else if (TECLAS_CORRER.includes(e.key)) {
			entrada.correr = true;
		} else if (TECLAS_ACCION.includes(e.key)) {
			if (e.target.tagName === "BUTTON") return; // el botón ya maneja su clic
			e.preventDefault();
			if (!e.repeat) accion();
		} else if (TECLAS_SALTAR.includes(e.key)) {
			e.preventDefault();
			if (!e.repeat) saltarAccion();
		} else if (TECLAS_AGACHAR.includes(e.key)) {
			e.preventDefault();
			entrada.abajo = true; // mostrar la pose de agachado mientras se mantiene
			if (!e.repeat) agacharAccion();
		}
	});

	window.addEventListener("keyup", (e) => {
		if (TECLAS_IZQ.includes(e.key)) entrada.izq = false;
		if (TECLAS_DER.includes(e.key)) entrada.der = false;
		if (TECLAS_CORRER.includes(e.key)) entrada.correr = false;
		if (TECLAS_AGACHAR.includes(e.key)) entrada.abajo = false;
	});

	window.addEventListener("blur", () => {
		entrada.izq = entrada.der = entrada.correr = entrada.abajo = false;
	});

	window.addEventListener(
		"wheel",
		(e) => {
			if (estado !== "jugando" && estado !== "cueva" && estado !== "urbano") return;
			const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
			if (delta === 0) return;
			entrada.rueda = delta > 0 ? 1 : -1;
			entrada.ruedaHasta = performance.now() + 220;
		},
		{ passive: true }
	);

	$("btn-comenzar").addEventListener("click", comenzar);
	$("btn-reiniciar").addEventListener("click", reiniciar);
	$("btn-cambiar").addEventListener("click", volverAlInicio);
	ui.dialogo.addEventListener("click", avanzarDialogo);

	function botonTactil(id, alPresionar, alSoltar) {
		const btn = $(id);
		btn.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			alPresionar();
		});
		["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, alSoltar));
	}
	botonTactil("btn-izq", () => (entrada.izq = true), () => (entrada.izq = false));
	botonTactil("btn-der", () => (entrada.der = true), () => (entrada.der = false));
	botonTactil("btn-correr", () => (entrada.correr = true), () => (entrada.correr = false));
	botonTactil("btn-hablar", accion, () => {});
	botonTactil("btn-saltar", saltarAccion, () => {});
	botonTactil(
		"btn-agachar",
		() => {
			entrada.abajo = true;
			agacharAccion();
		},
		() => (entrada.abajo = false)
	);

	// ---------- Actualización ----------
	function actualizar(dt) {
		// Física real del salto: gravedad + colisión contra los tubos (el
		// único "objeto sólido" del juego). Corre siempre, sin importar el
		// estado, para que nunca se quede flotando a medio salto.
		const alturaAntes = heroe.y;
		heroe.velY -= GRAVEDAD * dt;
		heroe.y += heroe.velY * dt;
		const alturaTubo = alturaTuboEn(heroe.x);
		// El tubo solo te sostiene arriba si ya venías cayendo desde encima de
		// él (saltando). Si vas caminando por el piso normal, no te empuja
		// hacia arriba solo por acercarte — el suelo real (0) sigue mandando.
		const suelo = alturaAntes >= alturaTubo ? alturaTubo : 0;
		if (hayHuecoEn(heroe.x) && heroe.y <= suelo) {
			// No hay piso: si no lo saltaste, sigues cayendo hasta perder.
			if (estado === "cueva" && heroe.y < -70) perderPorHueco();
		} else if (heroe.y <= suelo) {
			heroe.y = suelo;
			heroe.velY = 0;
		}

		// Animaciones de pelea: puñetazo del héroe, y de cada enemigo (lanzar
		// golpe si respondiste mal, o caer si respondiste bien).
		if (heroe.atacando) {
			heroe.atacandoT += dt;
			if (heroe.atacandoT >= 0.35) {
				heroe.atacando = false;
				heroe.atacandoT = 0;
			}
		}
		for (const en of enemigos) {
			if (en.atacando) {
				en.atacandoT += dt;
				if (en.atacandoT >= 0.35) {
					en.atacando = false;
					en.atacandoT = 0;
				}
			}
			if (en.cayendo > 0 && en.cayendo < 1) {
				en.cayendo = Math.min(1, en.cayendo + dt / 0.5);
			}
		}

		// Agacharse: mostrar la pose de cuclillas mientras se mantiene la flecha
		// abajo, parado en el piso. (En transición la maneja entrarPorTubo.)
		if (estado === "jugando" || estado === "cueva" || estado === "urbano") {
			heroe.agachado = entrada.abajo && heroe.y === 0;
		}

		if (estado === "transicion") {
			transicion.t += dt;
			if (transicion.t >= 3) {
				heroe.agachado = false;
				const luego = transicion.luego;
				transicion = null;
				luego();
			}
		}

		if (estado === "jugando") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;

			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;

			// El Guardián de la Entrada vive afuera (x <= LARGO) y bloquea el
			// paso antes de que puedas cruzar hacia la Cueva.
			const guardian = enemigos.find((en) => !en.derrotado && en.x <= LARGO);
			const limite = guardian ? guardian.x : limiteFrenteATubo(LARGO, heroe.y);

			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				heroe.x = clamp(heroe.x + dir * velocidad * dt, 40, limite);
				heroe.fase += dt * (heroe.corriendo ? 15 : 9);
				actualizarHud();
			}

			// Los NPCs saludan solos la primera vez que te acercas
			const nuevo = npcs.find((n) => !n.hablado && Math.abs(n.x - heroe.x) < CFG.distanciaParaHablar);
			if (nuevo) abrirDialogo(nuevo);
			else if (guardian && Math.abs(guardian.x - heroe.x) < CFG.distanciaParaHablar) abrirPregunta(guardian);
			// Cruzar el tubo de entrada ahora requiere agacharse (agacharAccion)
		}

		if (estado === "cueva") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;

			const bloqueante = enemigos.find((en) => !en.derrotado);
			const limite = bloqueante ? bloqueante.x : limiteFrenteATubo(LARGO_TOTAL, heroe.y);

			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				heroe.x = clamp(heroe.x + dir * velocidad * dt, LARGO, limite);
				heroe.fase += dt * (heroe.corriendo ? 15 : 9);
			}

			if (bloqueante && Math.abs(bloqueante.x - heroe.x) < CFG.distanciaParaHablar) abrirPregunta(bloqueante);
			// Cruzar el tubo de salida ahora requiere agacharse (agacharAccion)
			actualizarHudCueva();
		}

		if (estado === "urbano") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;

			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				heroe.x = clamp(heroe.x + dir * velocidad * dt, LARGO_TOTAL, LARGO_META);
				heroe.fase += dt * (heroe.corriendo ? 15 : 9);
			}

			if (heroe.x >= LARGO_META) ganar();
		}

		if (estado === "dialogo") {
			const linea = lineaActual();
			dlg.visibles = Math.min(linea.length, dlg.visibles + CFG.velocidadTexto * dt);
			const n = Math.floor(dlg.visibles);
			if (n !== dlg.mostradas) {
				dlg.mostradas = n;
				ui.texto.textContent = linea.slice(0, n);
			}
		}

		const objetivo = Math.max(0, heroe.x - W * 0.35);
		camara += (objetivo - camara) * Math.min(1, dt * 5);
	}

	// ---------- Dibujo: formas básicas ----------
	function circulo(x, y, r) {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}

	function linea(x1, y1, x2, y2) {
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	function rectRedondo(x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	// Agrega una elipse al trazo actual (para rellenar varias como una sola figura)
	function agregarElipse(cx, cy, rx, ry) {
		ctx.moveTo(cx + rx, cy);
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
	}

	// ---------- Dibujo: escenario ----------
	function dibujarCielo(t) {
		const g = ctx.createLinearGradient(0, 0, 0, SUELO);
		g.addColorStop(0, color("cieloArriba", t));
		g.addColorStop(1, color("cieloAbajo", t));
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, SUELO + 2);

		// El sol sale a medida que avanzas
		const a = suave(0.3, 0.85, t);
		if (a > 0) {
			const sx = W * 0.8;
			const sy = H * 0.14 + (1 - a) * H * 0.2;
			const r = 44 * S;
			const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
			halo.addColorStop(0, `rgba(255,244,180,${0.6 * a})`);
			halo.addColorStop(1, "rgba(255,244,180,0)");
			ctx.fillStyle = halo;
			ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
			ctx.fillStyle = `rgba(255,232,130,${a})`;
			circulo(sx, sy, r);
		}
	}

	function dibujarNubes(t) {
		const ancho = W + 600;
		ctx.fillStyle = color("nube", t, 0.85);
		for (const n of nubes) {
			const x = modulo(n.x - camara * 0.12 - tiempo * n.vel, ancho) - 300;
			const y = n.y * H;
			const s = n.tam * S;
			ctx.beginPath();
			agregarElipse(x, y, 60 * s, 22 * s);
			agregarElipse(x - 40 * s, y + 6 * s, 40 * s, 16 * s);
			agregarElipse(x + 45 * s, y + 5 * s, 45 * s, 17 * s);
			agregarElipse(x + 5 * s, y - 14 * s, 35 * s, 20 * s);
			ctx.fill();
		}
	}

	// La montaña Celaque: se asoma en el horizonte y queda al frente al final
	function dibujarCelaque(t) {
		const base = (LARGO - W * 0.35) * 0.2 + W * 0.7;
		const cx = base - camara * 0.2;
		const ancho = H * 0.75;
		const alto = H * 0.5;
		if (cx + ancho < 0 || cx - ancho > W) return;

		const cima = SUELO - alto;
		const g = ctx.createLinearGradient(0, cima, 0, SUELO);
		g.addColorStop(0, mezclar("#7d8187", "#1f7a4a", t));
		g.addColorStop(1, color("celaque", t));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(cx - ancho, SUELO);
		ctx.quadraticCurveTo(cx - ancho * 0.45, SUELO - alto * 0.55, cx - ancho * 0.18, cima + alto * 0.04);
		ctx.lineTo(cx + ancho * 0.12, cima);
		ctx.quadraticCurveTo(cx + ancho * 0.5, SUELO - alto * 0.6, cx + ancho, SUELO);
		ctx.closePath();
		ctx.fill();

		// Bosque nublado alrededor de la cima
		ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * t})`;
		ctx.beginPath();
		ctx.ellipse(cx - ancho * 0.05, cima + alto * 0.1, ancho * 0.28, alto * 0.05, 0, 0, Math.PI * 2);
		ctx.ellipse(cx + ancho * 0.22, cima + alto * 0.16, ancho * 0.2, alto * 0.04, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	// Tubo estilo Mario Bros: se para justo sobre el sendero. Agacharse cerca
	// de él (agacharAccion) dispara la transición correspondiente.
	// Boca de acceso metálica (tipo túnel/mina), con volumen cilíndrico,
	// remaches y un resplandor cálido saliendo de adentro (igual que las
	// lámparas de la cueva). MISMA silueta/dimensiones que antes para no tocar
	// la física: el héroe se sigue parando en el borde superior (base - alto -
	// borde) y agachándose para entrar.
	function dibujarTubo(sx, base) {
		const ancho = 70 * S;
		const alto = 110 * S;
		const borde = 22 * S;
		const izq = sx - ancho / 2;
		const topCuerpo = base - alto;
		const topCollar = base - alto - borde; // altura donde se para el héroe

		// Cuerpo cilíndrico: degradado horizontal (luz al centro, oscuro a los
		// lados) para que se lea como un cilindro de metal, no una caja plana.
		const cuerpo = ctx.createLinearGradient(izq, 0, izq + ancho, 0);
		cuerpo.addColorStop(0, "#232a31");
		cuerpo.addColorStop(0.34, "#5a6672");
		cuerpo.addColorStop(0.5, "#6d7a87");
		cuerpo.addColorStop(0.66, "#48525d");
		cuerpo.addColorStop(1, "#1e242a");
		ctx.fillStyle = cuerpo;
		ctx.fillRect(izq, topCuerpo, ancho, alto);

		// Remaches en dos columnas (con reflejito).
		for (let ry = topCuerpo + 16 * S; ry < base - 6 * S; ry += 26 * S) {
			ctx.fillStyle = "rgba(18,22,26,0.6)";
			circulo(izq + 9 * S, ry, 2.4 * S);
			circulo(izq + ancho - 9 * S, ry, 2.4 * S);
			ctx.fillStyle = "rgba(255,255,255,0.18)";
			circulo(izq + 9 * S - 0.7 * S, ry - 0.7 * S, 1 * S);
			circulo(izq + ancho - 9 * S - 0.7 * S, ry - 0.7 * S, 1 * S);
		}

		// Boca cilíndrica: un labio ELÍPTICO (no una tapa plana), para que se
		// vea la abertura del cilindro en perspectiva.
		const rimRx = ancho * 0.62;
		const rimRy = borde * 0.62;
		const rimCy = topCollar + rimRy; // el tope de la elipse queda en topCollar

		const rim = ctx.createLinearGradient(0, rimCy - rimRy, 0, rimCy + rimRy);
		rim.addColorStop(0, "#8b98a5");
		rim.addColorStop(1, "#39424b");
		ctx.fillStyle = rim;
		ctx.beginPath();
		ctx.ellipse(sx, rimCy, rimRx, rimRy, 0, 0, Math.PI * 2);
		ctx.fill();

		// Filo de luz en la mitad superior del labio.
		ctx.strokeStyle = "rgba(255,255,255,0.3)";
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		ctx.ellipse(sx, rimCy, rimRx - 1.5 * S, rimRy - 1.5 * S, 0, Math.PI * 1.05, Math.PI * 1.95);
		ctx.stroke();

		// Hueco oscuro (elipse más chica, corrida un poco hacia abajo para que
		// se vea el grosor del labio en el borde de atrás).
		const holeRx = rimRx * 0.68;
		const holeRy = rimRy * 0.66;
		const holeCy = rimCy + rimRy * 0.24;
		ctx.fillStyle = "#07060a";
		ctx.beginPath();
		ctx.ellipse(sx, holeCy, holeRx, holeRy, 0, 0, Math.PI * 2);
		ctx.fill();

		// Resplandor cálido saliendo de adentro (como las lámparas).
		const glow = ctx.createRadialGradient(sx, holeCy, 1, sx, holeCy, holeRx * 1.7);
		glow.addColorStop(0, "rgba(255,186,96,0.5)");
		glow.addColorStop(1, "rgba(255,186,96,0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.ellipse(sx, holeCy, holeRx * 1.7, holeRy * 1.9, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	// Muestra "Saltar" o "Agachar" según en qué paso de la secuencia vas
	// (primero saltar encima del tubo, luego agacharte para entrar).
	function dibujarPistaTubo(sx, disponible) {
		if (!disponible) return;
		const texto = estaSobreTubo()
			? esTactil
				? "Toca Agachar"
				: "↓ · Agachar"
			: esTactil
			? "Toca Saltar"
			: "↑ · Saltar";
		dibujarGlobo(sx, SUELO - (90 + heroe.y) * S, texto, "#c9f7d1");
	}

	function dibujarTuboEntrada() {
		const sx = LARGO - camara;
		if (sx < -300 || sx > W + 300) return;
		dibujarTubo(sx, SUELO + 44 * S);
		dibujarPistaTubo(sx, puedeUsarTuboEntrada());
	}

	function dibujarTuboSalida() {
		const sx = LARGO_TOTAL - camara;
		if (sx < -300 || sx > W + 300) return;
		dibujarTubo(sx, SUELO + 44 * S);
		dibujarPistaTubo(sx, puedeUsarTuboSalida());
	}

	function dibujarMontanas(t) {
		ctx.fillStyle = color("montanaLejana", t);
		ctx.beginPath();
		ctx.moveTo(0, SUELO);
		for (let sx = 0; sx <= W + 10; sx += 10) {
			const x = sx + camara * 0.2;
			const h = (110 + 55 * Math.sin(x * 0.0023) + 35 * Math.sin(x * 0.0061 + 1.3) + 15 * Math.sin(x * 0.017)) * S;
			ctx.lineTo(sx, SUELO - h * 0.8);
		}
		ctx.lineTo(W, SUELO);
		ctx.closePath();
		ctx.fill();
	}

	function dibujarColinas(t) {
		ctx.fillStyle = color("colinas", t);
		ctx.beginPath();
		ctx.moveTo(0, SUELO + 2);
		for (let sx = 0; sx <= W + 10; sx += 10) {
			const x = sx + camara * 0.45;
			const h = (50 + 25 * Math.sin(x * 0.004) + 15 * Math.sin(x * 0.009 + 2)) * S;
			ctx.lineTo(sx, SUELO - h);
		}
		ctx.lineTo(W, SUELO + 2);
		ctx.closePath();
		ctx.fill();
	}

	function dibujarArbol(sx, base, tam, p) {
		const t = tono(p);
		const s = S * tam;
		const follaje = suave(0.1, 0.5, p); // al inicio los árboles están secos
		const alto = 120 * s;

		ctx.strokeStyle = color("tronco", t);
		ctx.lineCap = "round";
		ctx.lineWidth = 12 * s;
		linea(sx, base, sx, base - alto);
		ctx.lineWidth = 5 * s;
		linea(sx, base - alto * 0.65, sx - 30 * s, base - alto * 0.95);
		linea(sx, base - alto * 0.75, sx + 28 * s, base - alto * 1.05);
		linea(sx, base - alto * 0.9, sx + 6 * s, base - alto * 1.2);

		if (follaje <= 0) return;
		const r = 48 * s * follaje;
		ctx.fillStyle = color("hojas", t);
		ctx.beginPath();
		ctx.arc(sx, base - alto - 10 * s, r, 0, Math.PI * 2);
		ctx.moveTo(sx - 32 * s + r * 0.8, base - alto + 12 * s);
		ctx.arc(sx - 32 * s, base - alto + 12 * s, r * 0.8, 0, Math.PI * 2);
		ctx.moveTo(sx + 34 * s + r * 0.8, base - alto + 8 * s);
		ctx.arc(sx + 34 * s, base - alto + 8 * s, r * 0.8, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = color("hojasLuz", t, 0.85);
		circulo(sx - 12 * s, base - alto - 26 * s, r * 0.42);

		// Frutos y flores en los árboles cerca de Celaque
		if (p > 0.72) {
			const cantidad = Math.floor(suave(0.72, 0.95, p) * 6);
			ctx.fillStyle = sx % 2 > 1 ? "#ff5d73" : "#ffd23f";
			for (let i = 0; i < cantidad; i++) {
				const ang = i * 2.1 + tam * 5;
				circulo(sx + Math.cos(ang) * r * 0.9, base - alto + Math.sin(ang) * r * 0.6, 4 * s);
			}
		}
	}

	function dibujarArbolesLejanos() {
		ctx.save();
		ctx.globalAlpha = 0.55;
		for (const a of arbolesLejanos) {
			const sx = a.x - camara * 0.7;
			if (sx < -80 || sx > W + 80) continue;
			dibujarArbol(sx, SUELO + 2 * S, a.tam, (a.x / 0.7) / LARGO);
		}
		ctx.restore();
	}

	function dibujarArboles() {
		for (const a of arboles) {
			const sx = a.x - camara;
			if (sx < -120 || sx > W + 120) continue;
			dibujarArbol(sx, SUELO + 10 * S, a.tam, a.x / LARGO);
		}
	}

	function dibujarSuelo() {
		const t0 = tono(camara / LARGO);
		const t1 = tono((camara + W) / LARGO);

		const tierra = ctx.createLinearGradient(0, 0, W, 0);
		tierra.addColorStop(0, color("tierra", t0));
		tierra.addColorStop(1, color("tierra", t1));
		ctx.fillStyle = tierra;
		ctx.fillRect(0, SUELO, W, H - SUELO);

		const pasto = ctx.createLinearGradient(0, 0, W, 0);
		pasto.addColorStop(0, color("pasto", t0));
		pasto.addColorStop(1, color("pasto", t1));
		ctx.fillStyle = pasto;
		ctx.fillRect(0, SUELO - 2 * S, W, 18 * S);
		ctx.fillRect(0, SUELO + 62 * S, W, H - SUELO);

		// Sendero por donde camina el protagonista
		ctx.fillStyle = "rgba(255,255,255,0.1)";
		ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);
	}

	// ---------- Dibujo: la Cueva (versión simple, foco en la lógica) ----------
	function dibujarFondoCueva() {
		// Ambiente algo más claro que antes (era casi negro) para que se vea
		// mejor el diseño, como una cueva de ferrocarril iluminada.
		const cielo = ctx.createLinearGradient(0, 0, 0, SUELO);
		cielo.addColorStop(0, "#17151d");
		cielo.addColorStop(1, "#38333f");
		ctx.fillStyle = cielo;
		ctx.fillRect(0, 0, W, SUELO);

		// Estalactitas (con leve parallax)
		ctx.fillStyle = "#221e2a";
		const paso = 140 * S;
		const desfase = (camara * 0.3) % paso;
		for (let sx = -paso + desfase; sx < W + paso; sx += paso) {
			const alto = (60 + 40 * Math.sin(sx * 0.01)) * S;
			ctx.beginPath();
			ctx.moveTo(sx - paso * 0.22, 0);
			ctx.lineTo(sx + paso * 0.22, 0);
			ctx.lineTo(sx, alto);
			ctx.closePath();
			ctx.fill();
		}

		// Lámparas de ferrocarril: colgadas del techo a intervalos regulares
		// (en coords de mundo, estables). Dan luz cálida pareja a toda la cueva,
		// en vez de iluminar a cada enemigo (eso se quitó).
		const pasoL = 340 * S;
		const offL = ((camara % pasoL) + pasoL) % pasoL;
		for (let sx = -offL; sx < W + pasoL; sx += pasoL) {
			const yLampara = 74 * S;
			const wx = sx + camara;
			const parpadeo = 0.92 + 0.08 * Math.sin(tiempo * 6 + wx * 0.05);

			// Cable desde el techo
			ctx.strokeStyle = "#100e15";
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.moveTo(sx, 0);
			ctx.lineTo(sx, yLampara - 9 * S);
			ctx.stroke();

			// Carcasa industrial (trapecio)
			ctx.fillStyle = "#2b2733";
			ctx.beginPath();
			ctx.moveTo(sx - 13 * S, yLampara - 9 * S);
			ctx.lineTo(sx + 13 * S, yLampara - 9 * S);
			ctx.lineTo(sx + 9 * S, yLampara + 7 * S);
			ctx.lineTo(sx - 9 * S, yLampara + 7 * S);
			ctx.closePath();
			ctx.fill();

			// Halo alrededor de la bombilla
			const halo = ctx.createRadialGradient(sx, yLampara + 2 * S, 2, sx, yLampara + 2 * S, 70 * S);
			halo.addColorStop(0, `rgba(255,206,128,${0.42 * parpadeo})`);
			halo.addColorStop(1, "rgba(255,206,128,0)");
			ctx.fillStyle = halo;
			ctx.fillRect(sx - 70 * S, yLampara - 68 * S, 140 * S, 140 * S);

			// Bombilla brillante
			ctx.fillStyle = `rgba(255,236,180,${parpadeo})`;
			circulo(sx, yLampara + 3 * S, 5 * S);

			// Pileta de luz cálida que baja hasta el suelo
			const pool = ctx.createRadialGradient(sx, SUELO - 20 * S, 10, sx, SUELO - 20 * S, 210 * S);
			pool.addColorStop(0, `rgba(255,198,120,${0.16 * parpadeo})`);
			pool.addColorStop(1, "rgba(255,198,120,0)");
			ctx.fillStyle = pool;
			ctx.fillRect(sx - 210 * S, SUELO - 230 * S, 420 * S, 300 * S);
		}

		// Claridad de la salida: se ve luz al acercarse al final de la cueva
		const cercaSalida = suave(LARGO_TOTAL - 500, LARGO_TOTAL, heroe.x);
		if (cercaSalida > 0) {
			const sx = LARGO_TOTAL - camara;
			const luz = ctx.createRadialGradient(sx, SUELO - 80 * S, 10, sx, SUELO - 80 * S, 480 * S);
			luz.addColorStop(0, `rgba(255,250,220,${0.85 * cercaSalida})`);
			luz.addColorStop(1, "rgba(255,250,220,0)");
			ctx.fillStyle = luz;
			ctx.fillRect(0, 0, W, H);
		}
	}

	// Suelo de la Cueva: una costra de roca arriba (donde se camina) sobre una
	// base de tierra que se va oscureciendo hacia abajo, igual que el subsuelo
	// de afuera pero sin luz. Así los enemigos, tubos y huecos se ven apoyados
	// sobre una "carretera" con fondo de tierra, no sobre un plano liso.
	function dibujarSueloCueva() {
		// Base de tierra: todo el subsuelo de la cueva.
		const tierra = ctx.createLinearGradient(0, SUELO, 0, H);
		tierra.addColorStop(0, "#40342a");
		tierra.addColorStop(1, "#1f150e");
		ctx.fillStyle = tierra;
		ctx.fillRect(0, SUELO, W, H - SUELO);

		// Piedritas incrustadas en la tierra (world-coords, se desplazan con
		// la cámara) para que no se vea plana.
		ctx.fillStyle = "rgba(0,0,0,0.22)";
		const pasoP = 95 * S;
		const off = ((camara % pasoP) + pasoP) % pasoP;
		for (let sx = -off; sx < W + pasoP; sx += pasoP) {
			const wx = sx + camara;
			const base = SUELO + (46 + 22 * Math.sin(wx * 0.045)) * S;
			circulo(sx + 18 * S * Math.sin(wx * 0.03), base, 3 * S);
			circulo(sx + 58 * S, base + 16 * S, 2.2 * S);
		}

		// Costra de roca de la superficie (la banda por donde se camina).
		ctx.fillStyle = "#2c2833";
		ctx.fillRect(0, SUELO - 2 * S, W, 22 * S);
		ctx.fillStyle = "#3d3747"; // canto superior algo más claro
		ctx.fillRect(0, SUELO - 2 * S, W, 6 * S);
		ctx.fillStyle = "rgba(0,0,0,0.35)"; // sombra bajo la costra, sobre la tierra
		ctx.fillRect(0, SUELO + 20 * S, W, 4 * S);

		// Camino/carretera de la Cueva: franja más clara por donde se camina
		ctx.fillStyle = "rgba(210,195,175,0.14)";
		ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);
	}

	// Huecos en el piso de la Cueva: un boquete de silueta irregular (roca
	// rota) que corta la carretera, con un degradado a negro (se ve sin
	// fondo) y un filo claro solo en el borde roto de arriba.
	function dibujarHuecos() {
		const ancho = ANCHO_HUECO * S;
		for (const h of HUECOS_CUEVA) {
			const sx = h.x - camara;
			if (sx + ancho / 2 < -20 || sx - ancho / 2 > W + 20) continue;
			const izq = sx - ancho / 2;
			const derecha = izq + ancho;
			const arriba = SUELO + 20 * S; // rompe justo la franja de la carretera
			const abajo = SUELO + 90 * S;

			const dientes = 7;
			const puntos = [];
			for (let i = 0; i <= dientes; i++) {
				const px = izq + (ancho * i) / dientes;
				const variacion = Math.sin(i * 2.4 + h.x * 0.01) * 7 * S;
				puntos.push([px, arriba + variacion]);
			}

			ctx.beginPath();
			ctx.moveTo(izq, abajo);
			for (const [px, py] of puntos) ctx.lineTo(px, py);
			ctx.lineTo(derecha, abajo);
			ctx.closePath();
			const g = ctx.createRadialGradient(sx, arriba + 20 * S, 4 * S, sx, arriba + 20 * S, ancho * 0.8);
			g.addColorStop(0, "#020103");
			g.addColorStop(0.7, "#231810");
			g.addColorStop(1, "#3a2a1a"); // borde tibio: agarra la luz de las antorchas cercanas
			ctx.fillStyle = g;
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(puntos[0][0], puntos[0][1]);
			for (const [px, py] of puntos.slice(1)) ctx.lineTo(px, py);
			ctx.strokeStyle = "rgba(255,225,180,0.55)";
			ctx.lineWidth = 3 * S;
			ctx.stroke();

			// Escombros sueltos al borde, como pedazos de la carretera rota
			ctx.fillStyle = "#2a2632";
			for (const [dx, dy, r] of [
				[-ancho * 0.55, 4, 5],
				[-ancho * 0.3, -6, 4],
				[ancho * 0.35, 2, 4.5],
				[ancho * 0.58, -5, 5],
			]) {
				circulo(sx + dx, arriba + dy * S, r * S);
			}
		}
	}

	// Murciélagos de fondo: siluetas que aletean y derivan en el aire oscuro
	// de la cueva. Son decorativos (no el enemigo Murciélago), van detrás de
	// todo, en la zona media del "cielo" de roca.
	function dibujarMurcielagosFondo() {
		ctx.fillStyle = "rgba(8,6,16,0.9)";
		for (const b of murcielagosFondo) {
			const sx = b.x - camara + Math.sin(tiempo * 0.25 + b.fase) * b.vel * S;
			if (sx < -40 || sx > W + 40) continue;
			const sy = SUELO * b.y + Math.sin(tiempo * 0.9 + b.fase) * 16 * S;
			const s = b.tam * S;
			const flap = Math.sin(tiempo * 9 + b.fase) * 0.5 + 0.5; // 0..1
			const ala = (9 + flap * 7) * s;
			const subeAla = (2 + flap * 5) * s;

			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.quadraticCurveTo(sx - ala * 0.5, sy - subeAla, sx - ala, sy - subeAla * 0.4);
			ctx.quadraticCurveTo(sx - ala * 0.55, sy + 2 * s, sx, sy + 1.5 * s);
			ctx.moveTo(sx, sy);
			ctx.quadraticCurveTo(sx + ala * 0.5, sy - subeAla, sx + ala, sy - subeAla * 0.4);
			ctx.quadraticCurveTo(sx + ala * 0.55, sy + 2 * s, sx, sy + 1.5 * s);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(sx, sy, 2.6 * s, 3.6 * s, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// Estalagmitas: picos de roca que suben del piso, detrás de los personajes.
	function dibujarEstalagmitas() {
		for (const e of estalagmitas) {
			const sx = e.x - camara;
			if (sx < -40 || sx > W + 40) continue;
			const base = SUELO + 16 * S;
			const alto = e.alto * S;
			const medio = e.ancho * 0.5 * S;
			const grad = ctx.createLinearGradient(0, base - alto, 0, base);
			grad.addColorStop(0, "#3a3448");
			grad.addColorStop(1, "#1b1824");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.moveTo(sx - medio, base);
			ctx.lineTo(sx, base - alto);
			ctx.lineTo(sx + medio, base);
			ctx.closePath();
			ctx.fill();
		}
	}

	// Cristales brillantes: racimos de gemas que emiten un halo de color y
	// pulsan suave, apoyados sobre la carretera de la cueva.
	function dibujarCristales() {
		for (const c of cristales) {
			const sx = c.x - camara;
			if (sx < -70 || sx > W + 70) continue;
			const s = c.tam * S;
			const base = SUELO + 34 * S; // sobre la franja del camino
			const pulso = 0.55 + 0.45 * Math.sin(tiempo * 2 + c.fase);

			const glow = ctx.createRadialGradient(sx, base - 14 * s, 2, sx, base - 14 * s, 50 * s);
			glow.addColorStop(0, conAlfa(c.tono, 0.45 * pulso));
			glow.addColorStop(1, conAlfa(c.tono, 0));
			ctx.fillStyle = glow;
			ctx.fillRect(sx - 52 * s, base - 64 * s, 104 * s, 84 * s);

			for (const [dx, an, al] of [
				[0, 7, 26],
				[-7, 4.5, 15],
				[7, 5, 19],
			]) {
				const cx = sx + dx * s;
				ctx.fillStyle = c.tono;
				ctx.beginPath();
				ctx.moveTo(cx - an * s, base);
				ctx.lineTo(cx, base - al * s);
				ctx.lineTo(cx + an * s, base);
				ctx.closePath();
				ctx.fill();
				// arista clara para que brille la cara
				ctx.fillStyle = conAlfa("#ffffff", 0.35 * pulso);
				ctx.beginPath();
				ctx.moveTo(cx, base - al * s);
				ctx.lineTo(cx + an * 0.35 * s, base - al * 0.45 * s);
				ctx.lineTo(cx, base);
				ctx.closePath();
				ctx.fill();
			}
		}
	}

	// Polvo/esporas flotando: puntitos tenues que suben apenas y titilan.
	function dibujarPolvoCueva(dt) {
		for (const p of polvoCueva) {
			p.y -= p.vel * dt;
			if (p.y < -0.02) {
				p.y = 1.02;
				p.x = Math.random();
			}
			const x = p.x * W;
			const y = p.y * H;
			const brillo = 0.15 + 0.2 * (Math.sin(tiempo * 2 + p.fase) * 0.5 + 0.5);
			ctx.fillStyle = `rgba(200,210,230,${brillo})`;
			ctx.fillRect(x, y, 2 * S, 2 * S);
		}
	}

	// Cielo urbano al salir de la Cueva: mismo cielo diurno, sin la montaña ni
	// el paisaje rural (los edificios ya dan el fondo).
	function dibujarFondoUrbano(t) {
		dibujarCielo(t);
		dibujarNubes(t);
		dibujarSkylineLejano();
	}

	// Silueta de ciudad lejana, tenue y con parallax (se mueve lento), detrás
	// de los edificios de relleno para dar profundidad. Alturas pseudo-azar
	// pero estables por índice (sin tocar la secuencia de azar()).
	function dibujarSkylineLejano() {
		const baseY = SUELO + 6 * S;
		const paso = 82 * S;
		const par = camara * 0.45;
		const off = ((par % paso) + paso) % paso;
		let i = Math.floor(par / paso);
		for (let sx = -off; sx < W + paso; sx += paso, i++) {
			const semilla = Math.sin(i * 12.9898) * 43758.5453;
			const frac = semilla - Math.floor(semilla);
			const alto = (130 + frac * 190) * S;
			const ancho = (52 + ((i * 37) % 34)) * S;
			ctx.fillStyle = `rgba(155,166,178,${0.28 + frac * 0.14})`;
			ctx.fillRect(sx - ancho / 2, baseY - alto, ancho, alto);
			// unas ventanitas apenas visibles
			ctx.fillStyle = "rgba(255,255,255,0.12)";
			for (let vy = baseY - alto + 14 * S; vy < baseY - 10 * S; vy += 22 * S) {
				for (let vx = sx - ancho / 2 + 8 * S; vx < sx + ancho / 2 - 6 * S; vx += 16 * S) {
					ctx.fillRect(vx, vy, 5 * S, 9 * S);
				}
			}
		}
	}

	// Piso urbano: misma estructura que el suelo de afuera y de la cueva (base
	// + franja de superficie arriba + franja de camino más clara en medio),
	// pero en gris de ciudad (pavimento/acera), para que se sienta coherente
	// con el resto del juego.
	function dibujarSueloUrbano() {
		// Base de pavimento (equivale a la tierra de afuera/cueva).
		const base = ctx.createLinearGradient(0, SUELO, 0, H);
		base.addColorStop(0, "#8f959c");
		base.addColorStop(1, "#6b7178");
		ctx.fillStyle = base;
		ctx.fillRect(0, SUELO, W, H - SUELO);

		// Acera: franja clara de la superficie (equivale al pasto/roca).
		ctx.fillStyle = "#c2c7cc";
		ctx.fillRect(0, SUELO - 2 * S, W, 18 * S);
		ctx.fillStyle = "#d5dade"; // canto claro arriba
		ctx.fillRect(0, SUELO - 2 * S, W, 5 * S);
		ctx.fillStyle = "rgba(0,0,0,0.2)"; // sombra bajo la acera
		ctx.fillRect(0, SUELO + 16 * S, W, 3 * S);

		// Camino/carretera: franja más clara por donde se camina (misma
		// posición que afuera y en la cueva).
		ctx.fillStyle = "rgba(255,255,255,0.22)";
		ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);

		// Juntas de baldosas del pavimento (parte de abajo), sutiles.
		ctx.strokeStyle = "rgba(255,255,255,0.12)";
		ctx.lineWidth = 1.5 * S;
		ctx.beginPath();
		const paso = 82 * S;
		const off = ((camara % paso) + paso) % paso;
		for (let sx = -off; sx < W; sx += paso) {
			linea(sx, SUELO + 48 * S, sx, H);
		}
		ctx.stroke();
	}

	// Edificios de Celaque, visibles al salir de la cueva (junto a la meta)
	function dibujarEdificiosSalida() {
		const baseY = SUELO + 10 * S; // en la orilla del fondo, como los árboles del paisaje
		for (const e of edificiosSalida) {
			const el = e.cargando.elemento;
			if (!el) continue; // todavía procesando (quitando el fondo de cielo)

			const sx = e.x - camara;
			const altoPx = e.altoBase * S;
			const anchoPx = altoPx * (el.width / el.height);
			if (sx + anchoPx / 2 < -60 || sx - anchoPx / 2 > W + 60) continue;

			ctx.globalAlpha = e.alfa;
			ctx.drawImage(el, sx - anchoPx / 2, baseY - altoPx, anchoPx, altoPx);
			ctx.globalAlpha = 1;
		}
	}

	// Relleno de ciudad: bloques planos con ventanitas, dibujados a mano
	// (nada de fotos) para no competir con Atlas/Lirios.
	function dibujarEdificiosSimples() {
		const baseY = SUELO + 10 * S; // en la orilla del fondo, como los árboles del paisaje
		for (const e of edificiosSimples) {
			const sx = e.x - camara;
			const altoPx = e.alto * S;
			const anchoPx = e.ancho * S;
			if (sx + anchoPx / 2 < -60 || sx - anchoPx / 2 > W + 60) continue;

			ctx.fillStyle = e.color;
			ctx.fillRect(sx - anchoPx / 2, baseY - altoPx, anchoPx, altoPx);

			ctx.fillStyle = "rgba(255,255,255,0.55)";
			const filas = Math.max(2, Math.floor(altoPx / (16 * S)));
			const columnas = Math.max(2, Math.floor(anchoPx / (14 * S)));
			for (let f = 0; f < filas; f++) {
				for (let c = 0; c < columnas; c++) {
					const vx = sx - anchoPx / 2 + (c + 0.5) * (anchoPx / columnas);
					const vy = baseY - altoPx + (f + 0.5) * (altoPx / filas);
					ctx.fillRect(vx - 2.5 * S, vy - 4 * S, 5 * S, 8 * S);
				}
			}
		}
	}

	// Dibuja un enemigo con foto (sprite) en vez de vector, con la misma
	// sombra/rebote/flip/caída que dibujarPersona, para que se sienta
	// parte del mismo mundo. Si la foto todavía no cargó, devuelve false y
	// quien llama debe usar dibujarPersona como respaldo.
	function dibujarEnemigoSprite(x, pie, o, sprites) {
		const meta = o.atacando ? sprites.golpe : sprites.quieto;
		const el = meta.cargando.elemento;
		if (!el) return false;

		// Algunos enemigos (el murciélago) no tienen foto propia de golpe: en
		// vez de pedir una segunda imagen, se embiste un poco más grande con
		// la misma foto.
		const sinPoseDeGolpe = sprites.golpe === sprites.quieto;
		const embestida = o.atacando && sinPoseDeGolpe ? 1.18 : 1;

		const s = S * 1.15 * (o.escala || 1);
		// Flotar en reposo: la fase se toma de la posición de MUNDO (x + camara),
		// no de la de pantalla. Si se usa la de pantalla, al mover la cámara la
		// fase salta cada cuadro y el enemigo tiembla mientras el héroe camina.
		const rebote = o.moviendo ? Math.abs(Math.cos(o.fase)) * 2 * s : Math.sin(tiempo * 2 + x + camara) * 0.8 * s;
		const altoDeseado = 100 * s * embestida;

		ctx.save();
		ctx.translate(x, pie);
		ctx.fillStyle = "rgba(40,40,40,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.translate(0, -rebote);
		// Algunas fotos ya vienen mirando hacia la izquierda por cómo quedó
		// la pose (ej. la espada del Esqueleto al frente, del lado
		// izquierdo). Para esas, hay que invertir el flip: dir=1 (mirando a
		// la derecha) debe voltearlas, no dejarlas tal cual.
		ctx.scale(meta.mirarIzquierda ? -o.dir : o.dir, 1);
		if (o.cayendo) {
			ctx.rotate(-Math.PI * 0.42 * o.cayendo);
			ctx.globalAlpha = Math.max(0, 1 - o.cayendo);
		}

		const w = el.naturalWidth || el.width;
		const h = el.naturalHeight || el.height;
		const altoContenido = (meta.abajo - meta.arriba) * h;
		const k = altoDeseado / altoContenido;
		const dw = w * k;
		const dh = h * k;
		const anclaY = meta.anclaY ?? meta.abajo;
		ctx.drawImage(el, -meta.anclaX * dw, -anclaY * dh, dw, dh);

		ctx.restore();
		return true;
	}

	function dibujarEnemigos() {
		const pie = SUELO + 36 * S;
		for (const e of enemigos) {
			if (e.x > LARGO && !dentroCueva) continue; // los de adentro no se ven desde afuera
			if (e.cayendo >= 1) continue; // ya cayó del todo, no se dibuja más
			const sx = e.x - camara;
			if (sx < -60 || sx > W + 60) continue;
			const a = e.apariencia;
			const o = {
				piel: a.piel,
				ropa: a.ropa,
				pantalon: a.pantalon,
				pelo: a.pelo,
				sombrero: a.sombrero,
				dir: heroe.x >= e.x ? 1 : -1,
				fase: 0,
				moviendo: false,
				atacando: e.atacando,
				cayendo: e.cayendo,
				escala: e.escala || 1,
			};
			const sprites = SPRITES_POR_ENEMIGO[e.nombre];
			const yaDibujado = sprites && dibujarEnemigoSprite(sx, pie, o, sprites);
			if (!yaDibujado) dibujarPersona(sx, pie, o);

			const arriba = pie - 110 * S * (e.escala || 1) + Math.sin(tiempo * 3 + e.x) * 3 * S;
			if (!e.derrotado && e.cayendo === 0) {
				dibujarGlobo(sx, arriba, esTactil ? "Toca para pelear" : "E · Pelear", "#ffb3b3");
			}
		}
	}

	function dibujarMatas(delante) {
		ctx.lineCap = "round";
		for (const m of matas) {
			if (m.delante !== delante) continue;
			// No dibujar pasto/flores encima del tubo de entrada (en LARGO).
			if (Math.abs(m.x - LARGO) < 55) continue;
			const sx = m.x - camara;
			if (sx < -20 || sx > W + 20) continue;
			const p = m.x / LARGO;
			const t = tono(p);
			const y = delante ? SUELO + 66 * S : SUELO + 4 * S;
			const alto = (6 + 10 * m.alto) * S * (0.6 + 0.6 * t);

			ctx.strokeStyle = color("pasto", t);
			ctx.lineWidth = 2 * S;
			ctx.beginPath();
			ctx.moveTo(sx, y);
			ctx.lineTo(sx - 4 * S, y - alto * 0.8);
			ctx.moveTo(sx, y);
			ctx.lineTo(sx, y - alto);
			ctx.moveTo(sx, y);
			ctx.lineTo(sx + 4 * S, y - alto * 0.8);
			ctx.stroke();

			// Las flores aparecen a partir de la mitad del camino
			if (m.flor < suave(0.3, 0.9, p) * 0.85) {
				ctx.fillStyle = m.colorFlor;
				circulo(sx, y - alto - 2 * S, 3.5 * S);
				ctx.fillStyle = "#ffe066";
				circulo(sx, y - alto - 2 * S, 1.4 * S);
			}
		}
	}

	function dibujarMeta() {
		// El destino real: se camina un poco desde el tubo de salida hasta aquí
		const sx = LARGO_META - camara;
		if (sx < -300 || sx > W + 300) return;
		const pie = SUELO + 22 * S;

		const brillo = ctx.createRadialGradient(sx, pie - 80 * S, 10, sx, pie - 80 * S, 200 * S);
		brillo.addColorStop(0, "rgba(255,255,210,0.55)");
		brillo.addColorStop(1, "rgba(255,255,210,0)");
		ctx.fillStyle = brillo;
		ctx.fillRect(sx - 200 * S, pie - 280 * S, 400 * S, 400 * S);

		ctx.font = `bold ${26 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		const anchoTablero = Math.max(160 * S, ctx.measureText(CFG.nombreMeta).width + 44 * S);

		ctx.fillStyle = "#6b4424";
		ctx.fillRect(sx - anchoTablero * 0.35, pie - 115 * S, 10 * S, 115 * S);
		ctx.fillRect(sx + anchoTablero * 0.35 - 10 * S, pie - 115 * S, 10 * S, 115 * S);

		rectRedondo(sx - anchoTablero / 2, pie - 155 * S, anchoTablero, 52 * S, 8 * S);
		ctx.fillStyle = "#b07a42";
		ctx.fill();
		ctx.lineWidth = 3 * S;
		ctx.strokeStyle = "#6b4424";
		ctx.stroke();

		ctx.fillStyle = "#fff8e1";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(CFG.nombreMeta, sx, pie - 128 * S);

		// Bandera ondeando
		const mastil = sx + anchoTablero / 2 + 30 * S;
		ctx.strokeStyle = "#5a3a1f";
		ctx.lineWidth = 4 * S;
		linea(mastil, pie, mastil, pie - 190 * S);
		const ola = Math.sin(tiempo * 4) * 6 * S;
		ctx.fillStyle = "#2fbf5a";
		ctx.beginPath();
		ctx.moveTo(mastil, pie - 188 * S);
		ctx.quadraticCurveTo(mastil + 30 * S, pie - 188 * S + ola, mastil + 60 * S, pie - 175 * S);
		ctx.quadraticCurveTo(mastil + 30 * S, pie - 160 * S - ola, mastil, pie - 160 * S);
		ctx.closePath();
		ctx.fill();
	}

	// ---------- Dibujo: personajes ----------
	function dibujarPersona(x, pie, o) {
		const s = S * 1.15 * (o.escala || 1);
		const paso = o.moviendo ? Math.sin(o.fase) : 0;
		// Flotar en reposo con fase de posición de MUNDO (x + camara), no de
		// pantalla, para que no tiemble cuando la cámara se mueve (ver nota en
		// dibujarEnemigoSprite).
		const rebote = o.moviendo ? Math.abs(Math.cos(o.fase)) * 2 * s : Math.sin(tiempo * 2 + x + camara) * 0.8 * s;

		ctx.save();
		ctx.translate(x, pie);

		ctx.fillStyle = "rgba(40,40,40,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.translate(0, -rebote);
		ctx.scale(o.dir, 1);
		if (o.agachado) ctx.scale(1, 0.55); // se agacha para entrar al tubo
		if (o.cayendo) {
			// El enemigo derrotado se desploma hacia atrás y se desvanece
			ctx.rotate(-Math.PI * 0.42 * o.cayendo);
			ctx.globalAlpha = Math.max(0, 1 - o.cayendo);
		}
		if (o.corriendo || o.atacando) ctx.rotate(0.12); // se inclina hacia adelante
		ctx.lineCap = "round";
		const amplitud = o.corriendo ? 0.9 : 0.55;

		// Piernas
		ctx.strokeStyle = o.pantalon;
		ctx.lineWidth = 6 * s;
		const cadera = -26 * s;
		for (const lado of [1, -1]) {
			const ang = paso * amplitud * lado;
			linea(0, cadera, Math.sin(ang) * 26 * s, cadera + Math.cos(ang) * 26 * s);
		}

		// Pelo largo (cae por la espalda y se mece al caminar)
		if (o.peloLargo) {
			const vaiven = o.moviendo ? Math.sin(o.fase) * (o.corriendo ? 0.3 : 0.15) : 0;
			ctx.save();
			ctx.translate(-4 * s, -66 * s);
			ctx.rotate(0.15 + vaiven);
			rectRedondo(-9 * s, 0, 13 * s, 28 * s, 6 * s);
			ctx.fillStyle = o.pelo;
			ctx.fill();
			ctx.restore();
		}

		// Mochila
		if (o.mochila) {
			rectRedondo(-15 * s, -50 * s, 10 * s, 20 * s, 3 * s);
			ctx.fillStyle = o.mochila;
			ctx.fill();
		}

		// Torso
		rectRedondo(-9 * s, -52 * s, 18 * s, 30 * s, 6 * s);
		ctx.fillStyle = o.ropa;
		ctx.fill();

		// Falda
		if (o.falda) {
			ctx.fillStyle = o.falda;
			ctx.beginPath();
			ctx.moveTo(-9 * s, -31 * s);
			ctx.lineTo(9 * s, -31 * s);
			ctx.lineTo(14 * s, -17 * s);
			ctx.lineTo(-14 * s, -17 * s);
			ctx.closePath();
			ctx.fill();
		}

		// Brazo (puñetazo si está atacando)
		ctx.strokeStyle = o.ropa;
		ctx.lineWidth = 5 * s;
		const brazo = o.atacando ? -1.35 : -paso * (o.corriendo ? 1.1 : 0.6);
		const largoBrazo = o.atacando ? 26 * s : 18 * s;
		linea(0, -46 * s, Math.sin(brazo) * largoBrazo, -46 * s + Math.cos(brazo) * largoBrazo);
		ctx.fillStyle = o.piel;
		circulo(Math.sin(brazo) * (largoBrazo + s), -46 * s + Math.cos(brazo) * (largoBrazo + s), 3 * s);

		// Cabeza
		ctx.fillStyle = o.piel;
		circulo(0, -63 * s, 11 * s);
		ctx.fillStyle = o.pelo;
		ctx.beginPath();
		ctx.arc(0, -64 * s, 11.5 * s, Math.PI * 0.95, Math.PI * 2.1);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = "#2b2b2b";
		circulo(5 * s, -63 * s, 1.5 * s);
		ctx.strokeStyle = "rgba(90,40,30,0.6)";
		ctx.lineWidth = 1.2 * s;
		ctx.beginPath();
		ctx.arc(5 * s, -58 * s, 2.5 * s, 0.2, Math.PI - 0.6);
		ctx.stroke();

		// Lazo en el pelo
		if (o.lazo) {
			ctx.fillStyle = o.lazo;
			ctx.beginPath();
			ctx.moveTo(-5 * s, -73 * s);
			ctx.lineTo(-12 * s, -79 * s);
			ctx.lineTo(-12 * s, -67 * s);
			ctx.closePath();
			ctx.moveTo(-5 * s, -73 * s);
			ctx.lineTo(2 * s, -79 * s);
			ctx.lineTo(2 * s, -67 * s);
			ctx.closePath();
			ctx.fill();
			circulo(-5 * s, -73 * s, 2.5 * s);
		}

		if (o.sombrero) {
			ctx.fillStyle = o.sombrero;
			ctx.beginPath();
			ctx.ellipse(0, -72 * s, 17 * s, 3.5 * s, 0, 0, Math.PI * 2);
			ctx.fill();
			rectRedondo(-8 * s, -84 * s, 16 * s, 12 * s, 4 * s);
			ctx.fill();
		}

		ctx.restore();
	}

	function dibujarGlobo(x, y, texto, fondo) {
		ctx.font = `bold ${14 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		const ancho = ctx.measureText(texto).width + 18 * S;
		const alto = 24 * S;
		rectRedondo(x - ancho / 2, y - alto, ancho, alto, 10 * S);
		ctx.fillStyle = fondo;
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x - 5 * S, y);
		ctx.lineTo(x + 5 * S, y);
		ctx.lineTo(x, y + 6 * S);
		ctx.fill();
		ctx.fillStyle = "#3a3a2e";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, x, y - alto / 2);
	}

	function dibujarNpcs() {
		const pie = SUELO + 36 * S;
		for (const n of npcs) {
			const sx = n.x - camara;
			if (sx < -60 || sx > W + 60) continue;
			const a = n.apariencia;
			dibujarPersona(sx, pie, {
				piel: a.piel,
				ropa: a.ropa,
				pantalon: a.pantalon,
				pelo: a.pelo,
				sombrero: a.sombrero,
				dir: heroe.x >= n.x ? 1 : -1,
				fase: 0,
				moviendo: false,
			});

			const arriba = pie - 110 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
			if (!n.hablado) {
				dibujarGlobo(sx, arriba, "!", "#ffe066");
			} else if (estado === "jugando" && Math.abs(n.x - heroe.x) < CFG.distanciaParaHablar * 1.3) {
				dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
			}
		}
	}

	function dibujarHeroe(t) {
		dibujarPersona(heroe.x - camara, SUELO + 38 * S - heroe.y * S, {
			...aparienciaHeroe(personaje, t, heroe),
			agachado: heroe.agachado,
			atacando: heroe.atacando,
		});
	}

	// Colores del personaje elegido: grises al inicio (t = 0), vivos al final (t = 1)
	function aparienciaHeroe(clave, t, pose) {
		const p = CFG.personajes[clave];
		return {
			piel: p.piel,
			ropa: mezclar("#77797c", p.ropa, t),
			pantalon: mezclar("#595b5f", p.pantalon, t),
			pelo: mezclar("#4a4a4a", p.pelo, t),
			falda: p.falda && mezclar("#6e7073", p.falda, t),
			lazo: p.lazo && mezclar("#8a8c8f", p.lazo, t),
			peloLargo: p.peloLargo,
			mochila: color("heroeMochila", t),
			sombrero: null,
			dir: pose.dir,
			fase: pose.fase,
			moviendo: pose.moviendo,
			corriendo: pose.corriendo,
		};
	}

	// ---------- Dibujo: efectos ----------
	function dibujarMariposas() {
		for (const m of mariposas) {
			const alfa = suave(0.55, 0.75, m.x / LARGO);
			const sx = m.x - camara + Math.sin(tiempo * 0.8 + m.fase) * 40 * S;
			if (alfa <= 0 || sx < -20 || sx > W + 20) continue;
			const sy = SUELO - 40 * S - Math.sin(tiempo * 1.3 + m.fase) * 30 * S;
			const aleteo = 0.3 + Math.abs(Math.sin(tiempo * 12 + m.fase)) * 0.7;
			ctx.save();
			ctx.globalAlpha = alfa;
			ctx.fillStyle = m.color;
			ctx.beginPath();
			ctx.ellipse(sx - 4 * S * aleteo, sy, 5 * S * aleteo, 4 * S, 0, 0, Math.PI * 2);
			ctx.ellipse(sx + 4 * S * aleteo, sy, 5 * S * aleteo, 4 * S, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	function dibujarLluvia(dt, t) {
		const intensidad = 1 - suave(0.08, 0.35, t);
		if (intensidad <= 0.01) return;
		ctx.strokeStyle = `rgba(215,220,228,${0.45 * intensidad})`;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		for (const g of gotas) {
			g.y += g.vel * dt;
			g.x -= g.vel * 0.12 * dt;
			if (g.y > 1) {
				g.y = -0.05;
				g.x = Math.random() * 1.1;
			}
			const x = g.x * W;
			const y = g.y * H;
			ctx.moveTo(x, y);
			ctx.lineTo(x + 3, y - 14);
		}
		ctx.stroke();
	}

	function dibujarPetalos(dt) {
		for (const p of petalos) {
			p.y += p.vel * dt;
			p.giro += dt * 3;
			if (p.y > 1.05) {
				p.y = -0.05;
				p.x = Math.random();
			}
			ctx.save();
			ctx.translate(p.x * W + Math.sin(p.giro) * 20, p.y * H);
			ctx.rotate(p.giro);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.ellipse(0, 0, 6 * S, 3 * S, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	function dibujar(dt) {
		if (estado === "transicion") {
			// Pantalla negra mientras cruzas un tubo (ver actualizar(dt))
			ctx.fillStyle = "#000";
			ctx.fillRect(0, 0, W, H);
			return;
		}

		const t = tono(heroe.x / LARGO);
		// afuera (camino rural) | cueva (oscura) | urbano (al salir, con edificios)
		const modo = vistaUrbana ? "urbano" : dentroCueva ? "cueva" : "afuera";

		if (modo === "cueva") {
			dibujarFondoCueva();
			dibujarMurcielagosFondo(); // siluetas aleteando en el aire oscuro
		} else if (modo === "urbano") {
			dibujarFondoUrbano(t);
		} else {
			dibujarCielo(t);
			dibujarNubes(t);
			dibujarCelaque(t);
			dibujarMontanas(t);
			dibujarColinas(t);
			dibujarArbolesLejanos();
		}

		if (modo === "cueva") dibujarSueloCueva();
		else if (modo === "urbano") dibujarSueloUrbano();
		else dibujarSuelo();

		if (modo === "afuera") {
			dibujarTuboEntrada(); // se pinta sobre el sendero, no antes
			dibujarMatas(false);
			dibujarArboles();
		} else if (modo === "cueva") {
			dibujarEstalagmitas(); // picos de roca detrás de todo
			dibujarCristales(); // gemas que brillan sobre el camino
			dibujarHuecos();
			dibujarTuboSalida();
		} else if (modo === "urbano") {
			dibujarEdificiosSimples(); // relleno gris detrás
			dibujarEdificiosSalida(); // Atlas al frente
		}

		if (modo === "urbano") dibujarMeta(); // el letrero solo se ve ya afuera
		dibujarNpcs();
		if (modo !== "urbano") dibujarEnemigos(); // el Guardián vive afuera, antes de LARGO
		dibujarHeroe(t);

		if (modo === "afuera") {
			dibujarMatas(true);
			dibujarMariposas();
			dibujarLluvia(dt, t);

			// Neblina gris al inicio y luz cálida al final
			ctx.fillStyle = `rgba(125,129,135,${0.35 * (1 - t)})`;
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = `rgba(255,250,215,${0.08 * t})`;
			ctx.fillRect(0, 0, W, H);
		} else if (modo === "cueva") {
			dibujarPolvoCueva(dt); // esporas flotando por delante
			// Viñeta oscura: la cueva se cierra en los bordes de la pantalla
			const vin = ctx.createRadialGradient(W / 2, SUELO * 0.7, SUELO * 0.5, W / 2, SUELO * 0.7, W * 0.75);
			vin.addColorStop(0, "rgba(0,0,0,0)");
			vin.addColorStop(1, "rgba(0,0,0,0.5)");
			ctx.fillStyle = vin;
			ctx.fillRect(0, 0, W, H);
		}

		dibujarPetalos(dt);
	}

	// ---------- Bucle principal ----------
	let ultimo = performance.now();
	function bucle(ahora) {
		const dt = Math.min(0.05, (ahora - ultimo) / 1000);
		ultimo = ahora;
		tiempo += dt;
		actualizar(dt);
		dibujar(dt);
		if (estado === "inicio") dibujarVistasPrevias();
		requestAnimationFrame(bucle);
	}
	requestAnimationFrame(bucle);
})();
