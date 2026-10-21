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
	const LARGO_CUEVA = 5200; // tramo de la Cueva, después del camino (más largo = enemigos más separados)
	const LARGO_TOTAL = LARGO + LARGO_CUEVA;
	// Calle de Celaque (al salir de la Cueva): un edificio por cada módulo de
	// capacitación (config.js → MODULOS) y, al final, el letrero de llegada.
	const MODULOS_DATOS = window.MODULOS || [];
	const PRIMER_MODULO = LARGO_TOTAL + 420;
	const ESPACIO_MODULO = 640;
	const LARGO_META = PRIMER_MODULO + MODULOS_DATOS.length * ESPACIO_MODULO + 80;
	const COLORES = CFG.colores || { oscuro: "#032420", verde: "#0b5c58", teal: "#00767a", claro: "#3fb3ad", crema: "#f3efe6" };

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
	// Niveles: cada NPC con el que hablas por PRIMERA vez te sube un nivel
	// (máximo NIVEL_MAX) y cada nivel te da un corazón más para la Cueva.
	const NIVEL_MAX = 5;
	const VIDAS_BASE = 3;
	let nivel = 0;
	let vidas = VIDAS_BASE;
	const vidasMax = () => VIDAS_BASE + nivel;
	const corazones = () => "♥".repeat(vidas) + "♡".repeat(Math.max(0, vidasMax() - vidas));
	let avisos = []; // textos flotantes sobre el héroe ("¡Nivel 2! +1 ♥")

	// Zona de planos del inicio: termina en la puerta de luz (en x)
	const FIN_PLANOS = 2200; // largo a propósito: las ideas toman tiempo
	let cruzoPlanos = false;
	let destello = 0; // fogonazo blanco al cruzar la puerta (1 → 0)

	// ---------- Huecos en la Cueva (hay que saltarlos, si no te caes) ----------
	// Con IMPULSO_SALTO/GRAVEDAD de arriba, un salto completo dura ~0.6s: a
	// velocidadCorriendo (320 px/s) cubre ~195px, caminando (120 px/s) solo
	// ~73px. ANCHO_HUECO=90 exige correr para pasarlo cómodo (caminando se
	// queda corto y cae).
	const ANCHO_HUECO = 70;
	// Posiciones ABSOLUTAS (no fracciones): así se pueden acomodar a mano,
	// lejos de enemigos y obstáculos, sin que un cambio de LARGO_CUEVA las
	// recorra todas por igual (ver nota de márgenes más abajo).
	const HUECOS_CUEVA = [1550, 3820].map((off) => ({ x: LARGO + off }));

	// ---------- Obstáculos sólidos de la Cueva (rocas y cajas de madera) ----------
	// Bloques duros que hay que SALTAR: caminando de frente el héroe se frena
	// contra la cara (no los atraviesa); saltando cae ENCIMA y los recorre por
	// arriba, o -corriendo- los pasa de un brinco.
	//   - alto: altura de la cara superior EN LAS MISMAS UNIDADES que heroe.y
	//     (el borde del tubo es 126; un salto normal llega a ~150, así que con
	//     alto <= 80 hasta un salto caminando cae encima).
	//   - medioAncho: medio ancho en unidades de mundo (se escala por S al medir
	//     la colisión y al dibujar, así calzan exacto).
	//
	// MÁRGENES: un enemigo con foto no es un punto — su "zona de frenado"
	// (ver anchoFrenteEnemigo) puede medir varios cientos de px en el jefe
	// (escala 2.2). Si un obstáculo o un hueco queda demasiado cerca de un
	// enemigo, se solapan visualmente (el enemigo aparece encima de la roca)
	// o, peor, la zona de frenado cae DENTRO de un hueco y el héroe queda
	// atrapado. Estas posiciones se calcularon con margen de sobra incluso
	// en el caso más ancho (pantallas muy altas, S hasta 1.4):
	//   caja1(750) · Murciélago(1150) · hueco1(1550) · Esqueleto(2050) ·
	//   caja2(2500) · roca2(2820) · Golem(3354) · hueco2(3820) ·
	//   Jefe(4498) · tubo de salida(5200)
	const OBSTACULOS_CUEVA = [
		{ x: LARGO + 400, tipo: "roca", medioAncho: 40, alto: 78 },
		{ x: LARGO + 750, tipo: "caja", medioAncho: 33, alto: 62 },
		{ x: LARGO + 2500, tipo: "caja", medioAncho: 33, alto: 62 },
		{ x: LARGO + 2820, tipo: "roca", medioAncho: 42, alto: 82 },
	];

	// ---------- Barreras de concreto en la calle (afuera) ----------
	// Igual que los obstáculos de la Cueva: sólidas, hay que saltarlas. Lejos
	// de los andamios de los NPC y del Guardián de la Entrada (LARGO - 260).
	const OBSTACULOS_AFUERA = [
		{ x: 3050, tipo: "barrera", medioAncho: 38, alto: 60 },
		{ x: 3950, tipo: "barrera", medioAncho: 38, alto: 60 },
		{ x: 4850, tipo: "barrera", medioAncho: 38, alto: 70 },
		{ x: 6450, tipo: "barrera", medioAncho: 38, alto: 70 },
	];

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
		celaque: ["#63676d", "#2f9e62"],
		asfalto: ["#4a4c50", "#50545c"],
		acera: ["#6d7074", "#d4d7dc"],
		bordillo: ["#7d7f83", "#ffcc1f"],
		marca: ["#76787c", "#fff3b0"],
		pasto: ["#6a6d70", "#5fdc4c"],
		humo: ["#3f4246", "#f4f6f8"],
		ventana: ["#4b5058", "#fff2b3"],
		vidrio: ["#555b63", "#9fdcff"],
		nube: ["#9a9ca0", "#ffffff"],
		heroeMochila: ["#66686b", "#2e9e5b"],
	};
	const color = (clave, t, alfa) => mezclar(PALETA[clave][0], PALETA[clave][1], t, alfa);
	// Qué tan "coloreado" está un punto del camino (0 = gris, 1 = colorido)
	// En la zona de planos todo es gris (0); al cruzar la puerta de luz el
	// mundo arranca ya con algo de color y sigue subiendo hasta Celaque.
	const P_PUERTA = FIN_PLANOS / LARGO;
	const tono = (p) => 0.45 * suave(P_PUERTA, P_PUERTA + 0.02, p) + 0.55 * suave(P_PUERTA, 0.92, p);

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

	// ---------- Andamios: cada NPC espera arriba de uno ----------
	// Plataformas de un solo sentido (como en Mario): se atraviesan saltando
	// desde abajo y se aterriza encima. Un salto sube ~150 de altura, así que
	// cada escalón sube 100 y se solapa un poco con el siguiente en x para
	// poder subir saltando casi en vertical. La escalera alterna de lado: a
	// veces sube por la izquierda y otras por la derecha (hay que pasar por
	// debajo del NPC y regresar). El alto se escala por S como en los
	// obstáculos; el medioAncho NO, para que los saltos entre escalones midan
	// lo mismo en cualquier pantalla (el mundo es 1:1 en horizontal).
	// Escalones de cada NPC (en orden): d = distancia al NPC, alto = altura.
	// Algunos son DINÁMICOS: "eje" x (viga colgada de una grúa que va y viene)
	// o y (elevador que sube y baja), con amplitud "amp" y velocidad "vel".
	// Si hay más NPCs que diseños, se repite el último.
	const DISENO_ANDAMIOS = [
		[{ d: 150, alto: 100 }],
		[{ d: 230, alto: 100 }, { d: 150, alto: 200 }],
		[{ d: 135, alto: 180, eje: "y", amp: 80, vel: 1.1 }],
		[{ d: 300, alto: 100 }, { d: 200, alto: 200, eje: "x", amp: 80, vel: 0.9 }],
		[{ d: 290, alto: 100, eje: "x", amp: 60, vel: 1 }, { d: 150, alto: 200, eje: "y", amp: 50, vel: 1.3 }],
	];
	const PLATAFORMAS = [];
	npcs.forEach((n, i) => {
		const escalones = DISENO_ANDAMIOS[Math.min(i, DISENO_ANDAMIOS.length - 1)];
		const lado = i % 2 === 0 ? -1 : 1; // lado por donde se sube
		n.alto = i === 0 ? 200 : 300; // el primero más fácil
		PLATAFORMAS.push({ x: n.x, x0: n.x, alto: n.alto, alto0: n.alto, medioAncho: 85, principal: true, dx: 0 });
		escalones.forEach((e, k) => {
			const x = n.x + lado * e.d;
			PLATAFORMAS.push({ x, x0: x, alto: e.alto, alto0: e.alto, medioAncho: 62, eje: e.eje, amp: e.amp, vel: e.vel, fase: i * 1.7 + k, dx: 0 });
		});
	});

	// Mueve las plataformas dinámicas según el tiempo (dx = cuánto se movió
	// en x este cuadro, para arrastrar al héroe que va parado encima).
	function moverPlataformas() {
		for (const pl of PLATAFORMAS) {
			if (!pl.eje) continue;
			// 0.75: un poco más lentas que el diseño original, para que subir
		// sea fácil también para quien no juega seguido.
		const onda = Math.sin(tiempo * pl.vel * 0.75 + pl.fase) * pl.amp;
			const x = pl.eje === "x" ? pl.x0 + onda : pl.x0;
			pl.dx = x - pl.x;
			pl.x = x;
			if (pl.eje === "y") pl.alto = pl.alto0 + onda;
		}
	}

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

	// Módulos: cada uno es un edificio en la calle de Celaque. Su puerta
	// queda en x; mientras no lo completes, una reja justo después de la
	// puerta no te deja seguir (ver limiteUrbano).
	const RUTA_LOGOS = "assets/logos/";
	// "Céfiro" → "cefiro": nombre de archivo sin tildes, espacios ni mayúsculas
	function nombreArchivo(texto) {
		return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
	}

	// Logos oficiales (los pone el equipo en assets/logos/; ver README). Si
	// todavía no están, en su lugar se dibuja un recuadro que dice "LOGO".
	const logoCelaque = cargarImagen(RUTA_LOGOS + "celaque.png");
	const logoCelaqueBlanco = cargarImagen(RUTA_LOGOS + "celaque-blanco.png");
	// Interior de cada módulo: una oficina propia en una franja del mundo
	// aparte (muy lejos de la calle, para que no se mezclen), recorrida de
	// izquierda a derecha: entrada → compañero → muebles → computadora.
	const OFICINA_BASE = LARGO_META + 4000;
	const SEPARACION_OFICINAS = 4000;
	const LARGO_OFICINA = 2000;
	// Muebles = obstáculos sólidos (como las rocas de la cueva): se saltan o
	// se camina por encima. Todos de 80 o menos de alto, así un salto normal
	// caminando alcanza para subirse (ver nota de OBSTACULOS_CUEVA).
	const MUEBLES = {
		escritorio: { medioAncho: 58, alto: 64 },
		silla: { medioAncho: 20, alto: 40 },
		archivero: { medioAncho: 28, alto: 78 },
		cajas: { medioAncho: 32, alto: 54 },
		impresora: { medioAncho: 30, alto: 60 },
		planta: { medioAncho: 18, alto: 50 },
		dispensador: { medioAncho: 18, alto: 74 },
	};
	const ORDEN_MUEBLES = ["planta", "escritorio", "silla", "archivero", "cajas", "escritorio", "impresora", "dispensador"];
	// Distancias desde la entrada; el compañero espera en 760 (entre muebles)
	const POSICIONES_MUEBLES = [340, 520, 1000, 1180, 1360, 1540, 1720];
	const modulos = MODULOS_DATOS.map((d, i) => {
		const x0 = OFICINA_BASE + i * SEPARACION_OFICINAS;
		return {
			...d,
			x: PRIMER_MODULO + i * ESPACIO_MODULO,
			completo: false,
			preguntaActual: 0,
			visitado: false, // ya se entró solo una vez al llegar a la puerta
			terminalVisitada: false,
			brillo: 0, // destello al completarlo (1 → 0)
			// Sin "logo" en config.js se busca assets/logos/modulo-<nombre>.png
			logoImg: cargarImagen(d.logo || RUTA_LOGOS + "modulo-" + nombreArchivo(d.nombre) + ".png"),
			oficina: {
				x0,
				terminalX: x0 + LARGO_OFICINA,
				obstaculos: POSICIONES_MUEBLES.map((dist, k) => {
					const tipo = ORDEN_MUEBLES[(k + i * 3) % ORDEN_MUEBLES.length];
					return { x: x0 + dist, tipo, ...MUEBLES[tipo] };
				}),
				// Compañero que recibe al jugador: dice la intro del módulo
				companero: {
					nombre: (d.companero && d.companero.nombre) || `Equipo de ${d.nombre}`,
					x: x0 + 760,
					alto: 0,
					enOficina: true,
					hablado: false,
					dialogo: d.intro && d.intro.length ? d.intro : [`Bienvenido al módulo ${d.nombre}.`],
					apariencia: {
						cuerpo: (d.companero && d.companero.cuerpo) || (i % 2 ? "chica" : "chico"),
						casco: "#ffffff",
						chaleco: d.color || "#00767a",
						pelo: i % 2 ? "#3b2414" : "#1f1a17",
						pantalon: "#2d3a4a",
					},
				},
			},
		};
	});
	// Oficina en la que está el héroe (null = afuera)
	let oficinaActual = null;

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

	// ---------- Sprite del héroe (constructor) ----------
	// A diferencia de los enemigos (quietos en un lugar), el héroe camina por
	// toda la pantalla, así que una sola foto fija "patinaría". Se cubre con
	// 6 poses -quieto/caminando/caminando2/saltando/golpe/agachado- elegidas
	// según el estado del héroe en cada cuadro (ver dibujarHeroeSprite).
	// anclaX de cada una se midió sobre el TORSO/cadera (no la silueta
	// completa), para que el cuerpo no "salte" de lado al cambiar de pose (el
	// martillo/los brazos se abren distinto en cada una, pero el torso queda
	// clavado en el mismo lugar). "caminando"/"caminando2" son las 2 zancadas
	// (pierna izq. y der. adelante) que se alternan con la fase de pasos —
	// mismo ciclo que ya usa el rebote— para caminar Y correr.
	const RUTA_PERSONAJE = "assets/personaje/";
	const SPRITES_HEROE_CHICO = {
		quieto: { archivo: "PersonajeHDePie.png", anclaX: 0.4585, arriba: 0.0163, abajo: 0.9831 },
		caminando: { archivo: "PersonajeHCaminando.png", anclaX: 0.4576, arriba: 0.0365, abajo: 0.9674 },
		caminando2: { archivo: "PersonajeHCaminando2.png", anclaX: 0.4679, arriba: 0.1185, abajo: 0.8919, escalaExtra: 1.25 },
		saltando: { archivo: "PersonajeHSalta.png", anclaX: 0.5139, arriba: 0.0215, abajo: 0.875 },
		golpe: { archivo: "PersonajeHGolpe.png", anclaX: 0.4845, arriba: 0.042, abajo: 0.9665 },
		agachado: { archivo: "PersonajeHAgachado.png", anclaX: 0.4878, arriba: 0.0977, abajo: 0.9212 },
		golpeado: { archivo: "PersonajeHGolpeado.png", anclaX: 0.457, arriba: 0.0345, abajo: 0.9811 },
		// Correr (Q): se alternan estas 2, que vienen de la misma hoja (mismo
		// tamaño y estilo). escalaExtra las iguala al tamaño de las demás.
		corre: { archivo: "PersonajeHCorre.png", anclaX: 0.5466, arriba: 0.0235, abajo: 0.9765, escalaExtra: 2.889 },
		correPaso: { archivo: "PersonajeHCorrePaso.png", anclaX: 0.4656, arriba: 0.0231, abajo: 0.9769, escalaExtra: 2.889 },
	};
	for (const clave in SPRITES_HEROE_CHICO) {
		SPRITES_HEROE_CHICO[clave].cargando = cargarImagen(RUTA_PERSONAJE + SPRITES_HEROE_CHICO[clave].archivo);
	}

	// La Chica: ya tiene las 6 poses con foto propia, igual que el Chico.
	const SPRITES_HEROE_CHICA = {
		quieto: { archivo: "PersonajeMDePie.png", anclaX: 0.4737, arriba: 0.0254, abajo: 0.9772 },
		caminando: { archivo: "PersonajeMCaminando.png", anclaX: 0.47, arriba: 0.0293, abajo: 0.974 },
		caminando2: { archivo: "PersonajeMCaminando2.png", anclaX: 0.4825, arriba: 0.0267, abajo: 0.9857 },
		saltando: { archivo: "PersonajeMSalta.png", anclaX: 0.4892, arriba: 0.0153, abajo: 0.9825 },
		golpe: { archivo: "PersonajeMGolpe.png", anclaX: 0.4685, arriba: 0.0697, abajo: 0.9759 },
		agachado: { archivo: "PersonajeMAgachado.png", anclaX: 0.4706, arriba: 0.0278, abajo: 0.9737 },
		golpeado: { archivo: "PersonajeMGolpeado.png", anclaX: 0.4731, arriba: 0.0482, abajo: 0.9785 },
		corre: { archivo: "PersonajeMCorre.png", anclaX: 0.5351, arriba: 0.0232, abajo: 0.9768, escalaExtra: 2.937 },
		correPaso: { archivo: "PersonajeMCorrePaso.png", anclaX: 0.5092, arriba: 0.0232, abajo: 0.9768, escalaExtra: 2.937 },
	};
	for (const clave in SPRITES_HEROE_CHICA) {
		SPRITES_HEROE_CHICA[clave].cargando = cargarImagen(RUTA_PERSONAJE + SPRITES_HEROE_CHICA[clave].archivo);
	}

	// Qué set de fotos usar según el personaje elegido en la pantalla de
	// inicio.
	const SPRITES_POR_PERSONAJE = {
		chico: SPRITES_HEROE_CHICO,
		chica: SPRITES_HEROE_CHICA,
	};

	// ---------- Piernas animadas por código ----------
	// tools/partes_personaje.py corta la foto "de pie" en torso + muslo y
	// pantorrilla de cada pierna (assets/personaje/partes/, con sus puntos de
	// giro en partes.js). Al caminar y correr se giran desde la cadera y la
	// rodilla: un ciclo continuo con el MISMO dibujo que el personaje quieto.
	// config.js → animacionPiernas: "fotos" vuelve a alternar las 2 fotos de
	// zancada (caminando / caminando2).
	for (const [clave, datos] of Object.entries(window.PARTES_PERSONAJE || {})) {
		const piezas = {};
		for (const [nombre, p] of Object.entries(datos.piezas)) {
			piezas[nombre] = { ...p, cargando: cargarImagen(RUTA_PERSONAJE + "partes/" + p.archivo) };
		}
		if (SPRITES_POR_PERSONAJE[clave]) SPRITES_POR_PERSONAJE[clave].rig = { ...datos, piezas };
	}
	const rigListo = (rig) => rig && CFG.animacionPiernas !== "fotos" && Object.values(rig.piezas).every((p) => p.cargando.elemento);

	// Ángulos de las piernas para la fase de pasos (una vuelta = un paso con
	// cada pierna). marcha: ~0.45 caminando → 1 corriendo (más zancada y más
	// rodilla). "caida": cuánto bajar el cuerpo (px de la foto) para que el
	// pie más bajo quede apoyado en el piso, así el rebote sale solo.
	function posturaPiernas(rig, fase, marcha) {
		const r = clamp((marcha - 0.45) / 0.55, 0, 1);
		const ampMuslo = lerp(0.3, 0.55, r);
		const ampRodilla = lerp(0.55, 1.25, r);
		const flexBase = lerp(0.05, 0.22, r);
		const postura = { caida: Infinity };
		for (const [lado, desfase] of [["A", 0], ["B", Math.PI]]) {
			const f = fase + desfase;
			const muslo = -ampMuslo * Math.sin(f); // negativo = hacia adelante
			// La rodilla se dobla mientras la pierna pasa hacia adelante
			const rodilla = flexBase + ampRodilla * Math.pow(Math.max(0, Math.cos(f - 0.5)), 1.5);
			postura[lado] = { muslo, rodilla };
			const p = rig.piernas[lado];
			const dx1 = p.rodilla[0] - p.cadera[0];
			const dy1 = p.rodilla[1] - p.cadera[1];
			const dy2 = rig.pie - p.rodilla[1];
			const pieY = p.cadera[1] + dx1 * Math.sin(muslo) + dy1 * Math.cos(muslo) + dy2 * Math.cos(muslo + rodilla);
			postura.caida = Math.min(postura.caida, rig.pie - pieY);
			// Cada brazo va al revés que la pierna de su lado. Al correr, más
			// balanceo y el codo doblado (como corredor), más aún al ir adelante.
			const hombro = lerp(0.3, 0.75, r) * Math.sin(f);
			const codo = -(lerp(0.12, 1.35, r) + lerp(0.25, 0.35, r) * Math.max(0, -Math.sin(f)));
			postura["brazo" + lado] = { hombro, codo };
		}
		return postura;
	}

	// Pinta el torso y las 4 piezas de las piernas con la misma escala y
	// ancla que la foto "quieto" (meta), girando cada pieza en su articulación.
	function pintarRig(rig, meta, k, postura) {
		const ox = -meta.anclaX * rig.ancho * k;
		const oy = -meta.abajo * rig.alto * k;
		const pieza = (nombre) => {
			const p = rig.piezas[nombre];
			const img = p.cargando.elemento;
			ctx.drawImage(img, ox + p.x * k, oy + p.y * k, img.naturalWidth * k, img.naturalHeight * k);
		};
		const girar = (punto, angulo) => {
			const px = ox + punto[0] * k;
			const py = oy + punto[1] * k;
			ctx.translate(px, py);
			ctx.rotate(angulo);
			ctx.translate(-px, -py);
		};
		ctx.translate(0, postura.caida * k);
		// B (la pierna de atrás en la foto) primero, luego A, y el torso encima
		for (const lado of ["B", "A"]) {
			const pierna = rig.piernas[lado];
			ctx.save();
			girar(pierna.cadera, postura[lado].muslo);
			ctx.save();
			girar(pierna.rodilla, postura[lado].rodilla);
			pieza("pantorrilla" + lado);
			ctx.restore();
			pieza("muslo" + lado);
			ctx.restore();
		}
		// Brazos (si la foto los tiene separados): el de atrás (B) detrás del
		// torso y el de adelante (A) encima
		const brazo = (lado) => {
			const b = rig.brazos && rig.brazos[lado];
			if (!b) return;
			ctx.save();
			girar(b.hombro, postura["brazo" + lado].hombro);
			pieza("brazo" + lado);
			girar(b.codo, postura["brazo" + lado].codo);
			pieza("antebrazo" + lado);
			ctx.restore();
		};
		brazo("B");
		pieza("torso");
		brazo("A");
	}

	// ---------- NPCs con la misma ilustración del héroe ----------
	// Cada NPC usa la foto "de pie" del Chico o la Chica, recoloreando casco,
	// chaleco, pantalón y pelo con sus propios colores. Las máscaras de cada
	// zona (assets/personaje/mascaras/) se generaron aparte, porque abriendo
	// el juego con doble clic (file://) el navegador no deja leer píxeles.
	// "lum" es el brillo medio de cada zona en la foto original: se usa para
	// aclararla antes de teñirla, así el color final sale parejo.
	const RUTA_MASCARAS = RUTA_PERSONAJE + "mascaras/";
	const ZONAS_NPC = { casco: "Casco", chaleco: "Chaleco", pantalon: "Pantalon", pelo: "Pelo" };
	const CUERPOS_NPC = {
		chico: { letra: "H", meta: SPRITES_HEROE_CHICO.quieto, lum: { casco: 0.295, chaleco: 0.532, pantalon: 0.16, pelo: 0.129 } },
		chica: { letra: "M", meta: SPRITES_HEROE_CHICA.quieto, lum: { casco: 0.266, chaleco: 0.5, pantalon: 0.141, pelo: 0.121 } },
	};
	for (const c of Object.values(CUERPOS_NPC)) {
		c.mascaras = {};
		for (const z in ZONAS_NPC) c.mascaras[z] = cargarImagen(RUTA_MASCARAS + "Personaje" + c.letra + ZONAS_NPC[z] + ".png");
	}
	const ALTO_FOTO_NPC = 420; // resolución del lienzo teñido (sobra para su tamaño en pantalla)

	// Devuelve (y guarda en el NPC) el lienzo con la foto ya teñida, o null
	// si las imágenes todavía no terminan de cargar.
	function fotoNpc(n) {
		if (n.foto) return n.foto;
		const cuerpo = CUERPOS_NPC[n.apariencia.cuerpo] || CUERPOS_NPC.chico;
		const base = cuerpo.meta.cargando.elemento;
		if (!base) return null;
		for (const z in ZONAS_NPC) if (!cuerpo.mascaras[z].elemento) return null;

		const h = ALTO_FOTO_NPC;
		const w = Math.round((h * base.naturalWidth) / base.naturalHeight);
		const lienzo = document.createElement("canvas");
		lienzo.width = w;
		lienzo.height = h;
		const g = lienzo.getContext("2d");
		g.drawImage(base, 0, 0, w, h);

		const capa = document.createElement("canvas");
		capa.width = w;
		capa.height = h;
		const c = capa.getContext("2d");
		for (const z in ZONAS_NPC) {
			const tinte = n.apariencia[z];
			if (!tinte) continue;
			c.globalCompositeOperation = "source-over";
			c.clearRect(0, 0, w, h);
			// La foto en escala de grises y aclarada (conserva sombras y brillos)...
			c.filter = `grayscale(1) brightness(${(0.85 / cuerpo.lum[z]).toFixed(2)})`;
			c.drawImage(base, 0, 0, w, h);
			c.filter = "none";
			// ...multiplicada por el color del NPC y recortada a la zona
			c.globalCompositeOperation = "multiply";
			c.fillStyle = tinte;
			c.fillRect(0, 0, w, h);
			c.globalCompositeOperation = "destination-in";
			c.drawImage(cuerpo.mascaras[z].elemento, 0, 0, w, h);
			g.drawImage(capa, 0, 0);
		}
		n.foto = { lienzo, meta: cuerpo.meta };
		return n.foto;
	}

	const azar = crearAzar(20260925);

	// ---------- Zona industrial (el camino de afuera) ----------
	// Fábricas, bodegas, tanques, torres y grúas: al inicio todo es gris y a
	// medida que avanzas cada edificio recupera su color propio (color +
	// acento). Las grúas siempre son amarillas, como las de construcción.
	const TIPOS_INDUSTRIA = ["fabrica", "bodega", "tanques", "torre", "grua"];
	const COLORES_INDUSTRIA = ["#ff6b35", "#ffc93c", "#2ec4b6", "#ef476f", "#3a86ff", "#8ac926", "#9b5de5", "#ff9f1c"];
	function crearEdificioIndustrial(x) {
		const i = Math.floor(azar() * COLORES_INDUSTRIA.length);
		return {
			x,
			tipo: TIPOS_INDUSTRIA[Math.floor(azar() * TIPOS_INDUSTRIA.length)],
			v: azar(), // variación de tamaño dentro de su tipo
			color: COLORES_INDUSTRIA[i],
			acento: COLORES_INDUSTRIA[(i + 3) % COLORES_INDUSTRIA.length],
		};
	}

	// Primer plano: edificios grandes justo detrás de la acera
	const fabricas = [];
	for (let x = 240; x < LARGO - 340; x += 330 + azar() * 230) {
		fabricas.push(crearEdificioIndustrial(x));
	}

	// Plano medio: más chicos y con parallax (como antes los árboles lejanos)
	const fabricasMedias = [];
	for (let x = 60; x < LARGO * 0.68; x += 230 + azar() * 180) {
		fabricasMedias.push(crearEdificioIndustrial(x));
	}

	// Conos y barriles de obra sobre la acera
	const conos = [];
	for (let x = 150; x < LARGO - 150; x += 160 + azar() * 340) {
		conos.push({ x, barril: azar() < 0.35 });
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
	const PALETA_EDIFICIOS_SIMPLES = ["#ff6b6b", "#ffc93c", "#2ec4b6", "#3a86ff", "#9b5de5", "#ff9f1c"];
	const edificiosSimples = [];
	for (let i = 0; i < 6; i++) {
		edificiosSimples.push({
			x: LARGO_META + 20 + i * 150 + (azar() - 0.5) * 60,
			// Grandes, pero un poco más bajos que Atlas (altoBase 450) para que
			// el Atlas siga destacando como el edificio principal.
			alto: 300 + azar() * 140,
			ancho: 95 + azar() * 55,
			color: PALETA_EDIFICIOS_SIMPLES[Math.floor(azar() * PALETA_EDIFICIOS_SIMPLES.length)],
		});
	}

	// Proyectos de Celaque (config.js → PROYECTOS_CELAQUE): torres de fondo
	// repartidas entre los edificios de los módulos. Medidas fijas (sin
	// azar()) para no correrle la secuencia a lo que se genera después.
	const proyectos = (window.PROYECTOS_CELAQUE || []).map((nombre, k) => ({
		nombre,
		logoImg: cargarImagen(RUTA_LOGOS + "proyecto-" + nombreArchivo(nombre) + ".png"),
		x: PRIMER_MODULO + (k * 2 + 0.5) * ESPACIO_MODULO,
		alto: 380 + (k % 2) * 60,
		ancho: 150,
	}));

	// ---------- Decoración de la Cueva ----------
	// Todo esto vive entre LARGO (boca) y LARGO_TOTAL (salida). Se genera con
	// el mismo azar() determinista, DESPUÉS de todo lo de afuera para no
	// correrle la secuencia a los árboles/nubes/etc.
	const murcielagosFondo = [];
	for (let i = 0; i < 32; i++) {
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
	for (let i = 0; i < 45; i++) {
		cristales.push({
			x: LARGO + 80 + azar() * (LARGO_CUEVA - 160),
			tam: 0.6 + azar() * 0.8,
			tono: azar() < 0.5 ? "#5fd6e0" : "#9a7fe0", // turquesa o violeta
			fase: azar() * Math.PI * 2,
		});
	}

	const estalagmitas = [];
	for (let i = 0; i < 52; i++) {
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
		marcha: 0, // 0 quieto, ~0.45 caminando, 1 corriendo (suavizado, ver actualizar)
		moviendo: false,
		corriendo: false,
		y: 0, // altura sobre el suelo (0 = piso), física real de salto
		velY: 0,
		agachado: false,
		atacando: false,
		atacandoT: 0,
		golpeado: false,
		golpeadoT: 0,
		ultimoSuelo: -1, // último instante parado en suelo (salto "coyote", ver saltarAccion)
		saltoPedido: -1, // salto presionado en el aire, sale al aterrizar
	};
	const polvoPasos = []; // nubecitas al correr (ver actualizar/dibujarPolvoPasos)
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
		terminal: $("terminal"),
		terminalTitulo: $("terminal-titulo"),
		terminalProgreso: $("terminal-progreso"),
		terminalPregunta: $("terminal-pregunta"),
		terminalOpciones: $("terminal-opciones"),
		terminalPista: $("terminal-pista"),
		terminalSalir: $("terminal-salir"),
	};

	// Logos en la pantalla (inicio, victoria, computadora): el oficial si ya
	// está en assets/logos/, o el recuadro "LOGO" mientras tanto.
	document.querySelectorAll(".espacio-logo[data-logo]").forEach((caja) => {
		const img = new Image();
		img.alt = caja.getAttribute("aria-label") || "";
		img.onload = () => {
			caja.textContent = "";
			caja.classList.add("con-logo");
			caja.appendChild(img);
		};
		img.src = caja.dataset.logo;
	});

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
		ui.hudTexto.textContent = `Nivel ${nivel} / ${NIVEL_MAX}  ·  ${corazones()}  ·  ${CFG.textos.contadorNpcs}: ${conocidos} / ${npcs.length}`;
	}

	function actualizarHudCueva() {
		const derrotados = enemigos.filter((e) => e.derrotado).length;
		ui.hudRelleno.style.width = ((derrotados / enemigos.length) * 100).toFixed(1) + "%";
		ui.hudTexto.textContent = `Nivel ${nivel}  ·  Vidas: ${corazones()}  ·  Enemigos vencidos: ${derrotados} / ${enemigos.length}`;
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

	// Dibuja a cada personaje en su tarjeta; el elegido camina en su lugar.
	// Usa la foto (constructor) si ese personaje ya tiene sprites cargados,
	// igual que el héroe dentro del juego; si no, cae al dibujo vectorial
	// (mismo respaldo que dibujarHeroe).
	function dibujarVistasPrevias() {
		const sAnterior = S;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		for (const btn of opciones) {
			const lienzo = btn.querySelector("canvas");
			const ancho = 150, alto = 180;
			if (lienzo.width !== ancho * dpr) {
				lienzo.width = ancho * dpr;
				lienzo.height = alto * dpr;
			}
			ctx = lienzo.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, ancho, alto);
			const clave = btn.dataset.personaje;
			const sprites = SPRITES_POR_PERSONAJE[clave];
			// Las fotos quedan más altas que el vector a la misma S (su "alto
			// de contenido" cabeza-a-pie es proporcionalmente mayor), así que
			// con foto se usa una S más chica para que entre completo en la
			// tarjeta (casco y botas incluidos). Siempre quieto -sin caminar-
			// para que no se corte ninguna pose en movimiento.
			S = sprites ? 1.4 : 1.7;
			const o = {
				...aparienciaHeroe(clave, 1, { dir: 1, fase: 0, moviendo: false }),
				agachado: false,
				atacando: false,
			};
			const yaDibujado = sprites && dibujarHeroeSprite(ancho / 2, alto - 10, o, sprites, 1);
			if (!yaDibujado) dibujarPersona(ancho / 2, alto - 10, o);
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
		modulos.forEach((m) => {
			m.completo = false;
			m.visitado = false;
			m.preguntaActual = 0;
			m.brillo = 0;
		});
		nivel = 0;
		vidas = VIDAS_BASE;
		avisos = [];
		cruzoPlanos = false;
		destello = 0;
		heroe.sobre = null;
		dentroCueva = false;
		vistaUrbana = false;
		transicion = null;
		heroe.y = 0;
		heroe.velY = 0;
		heroe.agachado = false;
		heroe.atacando = false;
		heroe.atacandoT = 0;
		petalos = [];
		oficinaActual = null;
		ui.terminal.hidden = true;
		modulos.forEach((m) => {
			m.terminalVisitada = false;
			m.oficina.companero.hablado = false;
		});
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
		ui.retrato.textContent = (npc.inicial || npc.nombre.charAt(0)).toUpperCase();
		ui.retrato.style.background = npc.apariencia.chaleco || npc.apariencia.ropa;
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
		// Con una pregunta abierta, tocar la caja (fuera de las opciones) no
		// hace nada: no hay diálogo que avanzar.
		if (estado !== "dialogo" || !dlg.npc) return;
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

	// Solo la PRIMERA charla con cada NPC sube de nivel (volver a hablarle
	// con E no da nada, así no se puede repetir para subir).
	function subirNivel() {
		if (nivel >= NIVEL_MAX) return;
		nivel++;
		vidas = vidasMax();
		avisos.push({ texto: `¡Nivel ${nivel}! +1 ♥`, t: 0 });
	}

	function cerrarDialogo() {
		// Los compañeros de oficina no suben de nivel: eso lo da el módulo
		if (!dlg.npc.hablado && !dlg.npc.enOficina) subirNivel();
		dlg.npc.hablado = true;
		dlg.npc = null;
		ui.dialogo.hidden = true;
		document.body.classList.remove("con-dialogo");
		if (oficinaActual) {
			estado = "oficina";
			actualizarHudOficina();
		} else {
			estado = "jugando";
			actualizarHud();
		}
	}

	// Para hablar hay que estar cerca Y parado en el mismo andamio que el NPC
	function alAlcance(n, distancia) {
		return Math.abs(n.x - heroe.x) < distancia && heroeEnSuelo() && Math.abs(heroe.y - (n.alto || 0)) < 1;
	}

	function npcCercano() {
		return npcs.find((n) => alAlcance(n, CFG.distanciaParaHablar * 1.3));
	}

	// ---------- Módulos de capacitación (calle de Celaque) ----------
	const modulosCompletos = () => modulos.filter((m) => m.completo).length;
	// El primer módulo sin completar: su reja no deja pasar de su puerta.
	const moduloPendiente = () => modulos.find((m) => !m.completo);

	function limiteUrbano() {
		const m = moduloPendiente();
		return m ? m.x + 30 : LARGO_META;
	}

	function moduloEnPuerta() {
		const m = moduloPendiente();
		return m && estado === "urbano" && Math.abs(heroe.x - m.x) < CFG.distanciaParaHablar && heroeEnSuelo() ? m : null;
	}

	function actualizarHudUrbano() {
		const n = modulosCompletos();
		ui.hudRelleno.style.width = ((n / Math.max(1, modulos.length)) * 100).toFixed(1) + "%";
		ui.hudTexto.textContent = `Nivel ${nivel}  ·  Módulos completados: ${n} / ${modulos.length}`;
	}

	// ---------- Oficina (interior de cada módulo) ----------
	// Al cruzar la puerta de un módulo se entra a su oficina: un compañero
	// te recibe (la intro del módulo) y al fondo hay una computadora con la
	// Terminal Celaque, donde se contestan las preguntas. Al terminar vuelves
	// a la calle con el módulo completo.
	function entrarOficina(m) {
		m.visitado = true;
		heroe.moviendo = heroe.corriendo = false;
		estado = "transicion";
		transicion = {
			t: 0,
			dur: 0.9,
			luego: () => {
				oficinaActual = m;
				heroe.x = m.oficina.x0 + 110;
				heroe.y = 0;
				heroe.velY = 0;
				heroe.dir = 1;
				camara = Math.max(0, heroe.x - W * 0.35);
				estado = "oficina";
				actualizarHudOficina();
			},
		};
	}

	function salirDeOficina() {
		const m = oficinaActual;
		heroe.moviendo = heroe.corriendo = false;
		estado = "transicion";
		transicion = {
			t: 0,
			dur: 0.9,
			luego: () => {
				oficinaActual = null;
				// Completo: sales del otro lado de la reja (ya abierta)
				heroe.x = m.completo ? m.x + 80 : m.x - 50;
				heroe.y = 0;
				heroe.velY = 0;
				heroe.dir = 1;
				camara = Math.max(0, heroe.x - W * 0.35);
				estado = "urbano";
				actualizarHudUrbano();
			},
		};
	}

	function actualizarHudOficina() {
		const of = oficinaActual.oficina;
		const progreso = clamp((heroe.x - of.x0) / (of.terminalX - of.x0), 0, 1);
		ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
		ui.hudTexto.textContent = oficinaActual.completo
			? `Módulo ${oficinaActual.nombre} ✓  ·  Vuelve a la puerta para salir`
			: `Módulo ${oficinaActual.nombre}  ·  Llega a la computadora del fondo`;
	}

	const cercaDe = (x, distancia) => Math.abs(heroe.x - x) < distancia && heroeEnSuelo() && heroe.y === 0;
	const enTerminal = () => estado === "oficina" && cercaDe(oficinaActual.oficina.terminalX - 50, 60);
	const enSalidaOficina = () => estado === "oficina" && cercaDe(oficinaActual.oficina.x0 + 70, 70);
	const companeroCerca = () =>
		estado === "oficina" && cercaDe(oficinaActual.oficina.companero.x, CFG.distanciaParaHablar * 1.3) ? oficinaActual.oficina.companero : null;

	// Preguntas que se hacen en la computadora (menos que antes: config.js →
	// preguntasPorModulo, por defecto 2).
	const preguntasDe = (m) => (m.preguntas || []).slice(0, CFG.preguntasPorModulo || 2);

	function abrirTerminal(m) {
		m.terminalVisitada = true;
		m.preguntaActual = 0;
		estado = "terminal";
		heroe.moviendo = heroe.corriendo = false;
		ui.terminal.hidden = false;
		ui.terminalTitulo.textContent = `Terminal Celaque · Módulo ${m.nombre}`;
		ui.terminalSalir.hidden = true;
		document.body.classList.add("con-dialogo");
		if (!preguntasDe(m).length) terminarModulo(m);
		else mostrarPreguntaTerminal(m);
	}

	function mostrarPreguntaTerminal(m) {
		const preguntas = preguntasDe(m);
		const p = preguntas[m.preguntaActual];
		ui.terminalProgreso.textContent = `Pregunta ${m.preguntaActual + 1} de ${preguntas.length}`;
		ui.terminalPregunta.textContent = p.pregunta;
		ui.terminalPista.textContent = "Elige una respuesta (o presiona 1, 2, 3).";
		ui.terminalOpciones.innerHTML = "";
		p.opciones.forEach((texto, i) => {
			const btn = document.createElement("button");
			btn.className = "opcion-pc";
			btn.innerHTML = "";
			const num = document.createElement("span");
			num.className = "num-pc";
			num.textContent = i + 1;
			btn.append(num, document.createTextNode(texto));
			btn.addEventListener("click", () => responderTerminal(i, m, btn));
			ui.terminalOpciones.appendChild(btn);
		});
	}

	// Sin vidas ni castigo: la opción equivocada se tacha y se vuelve a
	// intentar. Es una capacitación, no un examen.
	function responderTerminal(indice, m, btn) {
		if (btn.disabled) return;
		const p = preguntasDe(m)[m.preguntaActual];
		if (indice !== p.correcta) {
			btn.classList.add("incorrecta");
			btn.disabled = true;
			ui.terminalPista.textContent = "Esa no es. ¡Intenta con otra opción!";
			return;
		}
		btn.classList.add("correcta");
		ui.terminalOpciones.querySelectorAll("button").forEach((b) => (b.disabled = true));
		ui.terminalPista.textContent = p.explicacion ? `¡Correcto! ${p.explicacion}` : "¡Correcto!";
		setTimeout(() => {
			m.preguntaActual++;
			if (m.preguntaActual < preguntasDe(m).length) mostrarPreguntaTerminal(m);
			else terminarModulo(m);
		}, p.explicacion ? 2200 : 900);
	}

	// Completar un módulo sube de nivel, enciende su edificio y abre su reja.
	function terminarModulo(m) {
		if (!m.completo) {
			m.completo = true;
			m.brillo = 1;
			nivel++;
			avisos.push({ texto: `¡Nivel ${nivel}! ${m.nombre} ✓`, t: 0 });
		}
		ui.terminalProgreso.textContent = "Completado";
		ui.terminalPregunta.textContent = `¡Completaste el módulo ${m.nombre}! Subiste al nivel ${nivel}.`;
		ui.terminalOpciones.innerHTML = "";
		ui.terminalPista.textContent = "";
		ui.terminalSalir.hidden = false;
		ui.terminalSalir.focus();
	}

	function cerrarTerminal() {
		ui.terminal.hidden = true;
		document.body.classList.remove("con-dialogo");
		salirDeOficina();
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

	// Altura de la cara superior del obstáculo (roca/caja) que haya en x, o 0.
	// El medio ancho se escala por S para que la zona "pisable" coincida con el
	// dibujo (el mundo es 1:1 con la pantalla en horizontal).
	function obstaculosActivos() {
		if (oficinaActual) return oficinaActual.oficina.obstaculos;
		if (vistaUrbana) return [];
		return dentroCueva ? OBSTACULOS_CUEVA : OBSTACULOS_AFUERA;
	}

	function alturaObstaculoEn(x) {
		let top = 0;
		for (const o of obstaculosActivos()) {
			if (Math.abs(x - o.x) < o.medioAncho * S && o.alto > top) top = o.alto;
		}
		return top;
	}

	// Cualquier superficie sólida sobre la que se pueda aterrizar/pararse:
	// los tubos o los obstáculos de la cueva. La usa la física del salto.
	function alturaSolidaEn(x) {
		return Math.max(alturaTuboEn(x), alturaObstaculoEn(x));
	}

	// Alturas de los andamios que hay en x (solo afuera)
	function alturasPlataformaEn(x) {
		if (dentroCueva || vistaUrbana) return [];
		return PLATAFORMAS.filter((pl) => Math.abs(x - pl.x) < pl.medioAncho).map((pl) => pl.alto);
	}

	// El piso que te sostiene: la superficie más alta en x que quede por
	// DEBAJO de donde venías (así se atraviesan los andamios desde abajo y se
	// aterriza encima), o el suelo (0).
	function sueloBajo(x, desde) {
		let suelo = 0;
		for (const a of [alturaSolidaEn(x), ...alturasPlataformaEn(x)]) {
			if (a <= desde + 0.5 && a > suelo) suelo = a;
		}
		return suelo;
	}

	// Choque lateral con los obstáculos: si los pies van por debajo de la cara
	// superior, no se puede atravesar y se queda pegado a la cara. Si va por
	// encima (saltó lo suficiente), pasa y recorre el techo sin frenar. Devuelve
	// la x corregida. `semi` = medio obstáculo + medio héroe (12*S, igual que
	// el tope frente al tubo).
	function frenarEnObstaculos(viejoX, nuevoX, dir, heroeY) {
		for (const o of obstaculosActivos()) {
			if (heroeY >= o.alto - 3) continue; // por encima: puede pasar/recorrer
			const semi = (o.medioAncho + 12) * S;
			if (dir > 0 && viejoX <= o.x - semi && nuevoX > o.x - semi) return o.x - semi;
			if (dir < 0 && viejoX >= o.x + semi && nuevoX < o.x + semi) return o.x + semi;
		}
		return nuevoX;
	}

	// "Parado" en general: sirve para saltar, sea desde el piso normal o
	// desde encima de un tubo (no exige estar en el tubo específicamente).
	function heroeEnSuelo() {
		if (heroe.velY !== 0) return false;
		return heroe.y === 0 || heroe.y === alturaSolidaEn(heroe.x) || alturasPlataformaEn(heroe.x).includes(heroe.y);
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

	// Igual que con el tubo: un enemigo con foto no es un punto sin ancho.
	// Frenar justo en su x (como se hacía antes) mete al héroe en medio del
	// dibujo — apenas se nota en un enemigo chico, pero es muy visible en el
	// jefe (gigante, escala 2.2). Se calcula cuánto sobresale el sprite hacia
	// el lado por donde se acerca el héroe (siempre desde la izquierda), con
	// la MISMA fórmula de tamaño que usa dibujarEnemigoSprite, y se le suma
	// el medio ancho del héroe (12*S, igual que en limiteFrenteATubo).
	function anchoFrenteEnemigo(en) {
		const sprites = SPRITES_POR_ENEMIGO[en.nombre];
		const meta = sprites && sprites.quieto;
		const el = meta && meta.cargando.elemento;
		if (!el) return 16 * S; // sin foto (vectorial) o la imagen aún no cargó
		const w = el.naturalWidth || el.width;
		const h = el.naturalHeight || el.height;
		const s = S * 1.15 * (en.escala || 1);
		const altoContenido = (meta.abajo - meta.arriba) * h;
		const dw = w * ((100 * s) / altoContenido);
		// El enemigo se voltea para mirar al héroe que se acerca por la
		// izquierda: el lado que sobresale hacia él es (1 - anclaX) del ancho.
		// En los enemigos anchos (Golem, Jefe) esa mitad incluye brazos/cola
		// extendidos que no son el "cuerpo" real — factorFrente (en config.js,
		// por defecto 1) la recorta para que el héroe se acerque más, como con
		// los enemigos más chicos.
		const factorFrente = en.factorFrente ?? 1;
		return (1 - meta.anclaX) * dw * factorFrente + 12 * S;
	}

	// Más fácil para quien no juega seguido: vale saltar un instante después
	// de salir de un borde ("coyote"), y si se presiona justo antes de
	// aterrizar, el salto sale solo al tocar el piso (ver actualizar).
	function saltarAccion() {
		if (estado !== "jugando" && estado !== "cueva" && estado !== "urbano" && estado !== "oficina") return;
		const recienEnSuelo = tiempo - heroe.ultimoSuelo < 0.14 && heroe.velY <= 0;
		if (heroeEnSuelo() || recienEnSuelo) {
			heroe.velY = IMPULSO_SALTO;
			heroe.ultimoSuelo = -1;
			heroe.saltoPedido = -1;
		} else {
			heroe.saltoPedido = tiempo;
		}
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
		// El camino + la Cueva son el módulo de Talento: ya está completo.
		for (const m of modulos) {
			if (m.completoAlSalirDeLaCueva && !m.completo) {
				m.completo = true;
				m.brillo = 1;
				nivel++;
				avisos.push({ texto: `¡Nivel ${nivel}! ${m.nombre} ✓`, t: 0 });
			}
		}
		actualizarHudUrbano();
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
		const vidasTexto = `Vidas: ${corazones()}`;
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
			heroe.golpeado = true;
			heroe.golpeadoT = 0;
			vidas--;
			if (vidas <= 0) setTimeout(perderCueva, 350);
			else ui.pista.textContent = `Incorrecto, intenta de nuevo. Vidas: ${corazones()}`;
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

	// Caerte en un hueco no castiga: vuelves justo antes del hueco (no a la
	// entrada de la cueva) con una pista para pasarlo, así quien no juega
	// seguido no pierde todo lo avanzado.
	function perderPorHueco() {
		const hueco = HUECOS_CUEVA.find((h) => Math.abs(heroe.x - h.x) < ANCHO_HUECO);
		heroe.x = (hueco ? hueco.x : heroe.x) - ANCHO_HUECO / 2 - 70;
		heroe.y = 0;
		heroe.velY = 0;
		heroe.dir = 1;
		heroe.golpeado = true;
		heroe.golpeadoT = 0;
		avisos.push({ texto: esTactil ? "¡Ups! Corre y salta" : "¡Ups! Corre (Q) y salta", t: 0 });
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
		vidas = vidasMax();
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
		} else if (estado === "urbano") {
			const m = moduloEnPuerta();
			if (m) entrarOficina(m);
		} else if (estado === "oficina") {
			const companero = companeroCerca();
			if (enTerminal() && !oficinaActual.completo) abrirTerminal(oficinaActual);
			else if (companero) abrirDialogo(companero);
			else if (enSalidaOficina()) salirDeOficina();
		} else if (estado === "terminal" && !ui.terminalSalir.hidden) {
			cerrarTerminal();
		}
	}

	// La barra espaciadora salta, salvo cuando hay algo que hacer con ella
	// (empezar, avanzar un diálogo, hablar con alguien o entrar a un edificio).
	function hayAccion() {
		if (estado === "inicio" || estado === "dialogo") return true;
		if (estado === "jugando") return !!npcCercano();
		if (estado === "urbano") return !!moduloEnPuerta();
		if (estado === "oficina") return (enTerminal() && !oficinaActual.completo) || !!companeroCerca() || enSalidaOficina();
		if (estado === "terminal") return !ui.terminalSalir.hidden;
		return false;
	}

	// ---------- Controles ----------
	const TECLAS_IZQ = ["ArrowLeft", "a", "A"];
	const TECLAS_DER = ["ArrowRight", "d", "D"];
	const TECLAS_ACCION = [" ", "Enter", "e", "E"];
	const TECLAS_CORRER = ["q", "Q"];
	const TECLAS_SALTAR = ["ArrowUp", "w", "W"];
	const TECLAS_AGACHAR = ["ArrowDown", "s", "S"];

	window.addEventListener("keydown", (e) => {
		// En la computadora de la oficina se responde también con 1, 2, 3...
		if (estado === "terminal" && /^[1-9]$/.test(e.key)) {
			const btn = ui.terminalOpciones.children[Number(e.key) - 1];
			if (btn) btn.click();
			return;
		}
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
			if (e.repeat) return;
			if (e.key === " " && !hayAccion()) saltarAccion();
			else accion();
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
			if (estado !== "jugando" && estado !== "cueva" && estado !== "urbano" && estado !== "oficina") return;
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
	ui.terminalSalir.addEventListener("click", cerrarTerminal);
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
		moverPlataformas();
		// Parado en una plataforma móvil: te lleva con ella (en x y en y)
		if (heroe.sobre && heroe.velY === 0) {
			heroe.x += heroe.sobre.dx;
			heroe.y = heroe.sobre.alto;
		}
		const alturaAntes = heroe.y;
		heroe.velY -= GRAVEDAD * dt;
		heroe.y += heroe.velY * dt;
		// Una superficie (tubo, obstáculo o andamio) solo te sostiene si ya
		// venías desde encima (saltando o caminando sobre ella). Si vas por
		// debajo, no te empuja hacia arriba — el choque lateral
		// (frenarEnObstaculos) evita meterse dentro de los obstáculos, y los
		// andamios se atraviesan desde abajo.
		const suelo = sueloBajo(heroe.x, alturaAntes);
		if (hayHuecoEn(heroe.x) && heroe.y <= suelo) {
			// No hay piso: si no lo saltaste, sigues cayendo hasta perder.
			if (estado === "cueva" && heroe.y < -70) perderPorHueco();
		} else if (heroe.y <= suelo) {
			heroe.y = suelo;
			heroe.velY = 0;
		}
		if (heroeEnSuelo()) {
			heroe.ultimoSuelo = tiempo;
			// Salto presionado justo antes de aterrizar: sale ahora
			if (tiempo - heroe.saltoPedido < 0.15) saltarAccion();
		}
		heroe.sobre =
			heroe.velY === 0 && heroe.y > 0 && !dentroCueva && !vistaUrbana
				? PLATAFORMAS.find((pl) => pl.eje && pl.alto === heroe.y && Math.abs(heroe.x - pl.x) < pl.medioAncho) || null
				: null;

		// Animaciones de pelea: puñetazo del héroe, y de cada enemigo (lanzar
		// golpe si respondiste mal, o caer si respondiste bien).
		if (heroe.atacando) {
			heroe.atacandoT += dt;
			if (heroe.atacandoT >= 0.35) {
				heroe.atacando = false;
				heroe.atacandoT = 0;
			}
		}
		if (heroe.golpeado) {
			heroe.golpeadoT += dt;
			if (heroe.golpeadoT >= 0.5) {
				heroe.golpeado = false;
				heroe.golpeadoT = 0;
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
		if (estado === "jugando" || estado === "cueva" || estado === "urbano" || estado === "oficina") {
			heroe.agachado = entrada.abajo && heroeEnSuelo();
		}

		if (estado === "transicion") {
			transicion.t += dt;
			if (transicion.t >= (transicion.dur || 3)) {
				heroe.agachado = false;
				const luego = transicion.luego;
				transicion = null;
				luego();
			}
		}

		if (estado === "jugando") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
			if (heroe.agachado) dir = 0; // agachado: no avanza hasta soltar abajo

			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;

			// El Guardián de la Entrada vive afuera (x <= LARGO) y bloquea el
			// paso antes de que puedas cruzar hacia la Cueva.
			const guardian = enemigos.find((en) => !en.derrotado && en.x <= LARGO);
			const limite = guardian ? guardian.x - anchoFrenteEnemigo(guardian) : limiteFrenteATubo(LARGO, heroe.y);

			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				const viejoX = heroe.x;
				heroe.x = frenarEnObstaculos(viejoX, clamp(viejoX + dir * velocidad * dt, 40, limite), dir, heroe.y);
				heroe.fase += dt * (heroe.corriendo ? 16 : 9);
				actualizarHud();
			}

			if (!cruzoPlanos && heroe.x >= FIN_PLANOS) {
				cruzoPlanos = true;
				destello = 1;
			}

			// Los NPCs saludan solos la primera vez que te acercas
			const nuevo = npcs.find((n) => !n.hablado && alAlcance(n, CFG.distanciaParaHablar));
			if (nuevo) abrirDialogo(nuevo);
			else if (guardian && heroe.x >= limite) abrirPregunta(guardian);
			// Cruzar el tubo de entrada ahora requiere agacharse (agacharAccion)
		}

		if (estado === "cueva") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
			if (heroe.agachado) dir = 0; // agachado: no avanza hasta soltar abajo
			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;

			const bloqueante = enemigos.find((en) => !en.derrotado);
			const limite = bloqueante ? bloqueante.x - anchoFrenteEnemigo(bloqueante) : limiteFrenteATubo(LARGO_TOTAL, heroe.y);

			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				const viejoX = heroe.x;
				const tentativo = clamp(viejoX + dir * velocidad * dt, LARGO, limite);
				heroe.x = frenarEnObstaculos(viejoX, tentativo, dir, heroe.y);
				heroe.fase += dt * (heroe.corriendo ? 16 : 9);
			}

			if (bloqueante && heroe.x >= limite) abrirPregunta(bloqueante);
			// Cruzar el tubo de salida ahora requiere agacharse (agacharAccion)
			actualizarHudCueva();
		}

		if (estado === "urbano") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
			if (heroe.agachado) dir = 0; // agachado: no avanza hasta soltar abajo
			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;

			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				heroe.x = clamp(heroe.x + dir * velocidad * dt, LARGO_TOTAL, limiteUrbano());
				heroe.fase += dt * (heroe.corriendo ? 16 : 9);
			}

			// La primera vez que llegas a la puerta de un módulo entras solo
			// (después, con E / Espacio / "Hablar" frente a la puerta).
			const pendiente = moduloPendiente();
			if (pendiente && !pendiente.visitado && heroe.x >= pendiente.x - 20 && heroeEnSuelo()) entrarOficina(pendiente);
			else if (heroe.x >= LARGO_META) ganar();
		}

		if (estado === "oficina") {
			const of = oficinaActual.oficina;
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
			if (heroe.agachado) dir = 0;
			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;
			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				const viejoX = heroe.x;
				const tentativo = clamp(viejoX + dir * velocidad * dt, of.x0 + 40, of.terminalX - 50);
				heroe.x = frenarEnObstaculos(viejoX, tentativo, dir, heroe.y);
				heroe.fase += dt * (heroe.corriendo ? 16 : 9);
				actualizarHudOficina();
			}
			// El compañero te habla solo la primera vez; la computadora se
			// abre sola la primera vez que llegas a ella.
			if (!of.companero.hablado && heroe.x >= of.companero.x - 100 && heroeEnSuelo()) abrirDialogo(of.companero);
			else if (!oficinaActual.terminalVisitada && enTerminal()) abrirTerminal(oficinaActual);
		}
		for (const m of modulos) m.brillo = Math.max(0, m.brillo - dt * 0.6);

		// Postura de marcha suavizada: arrancar, frenar o pasar de caminar a
		// correr inclina y acelera el rebote poco a poco, en vez de saltar de
		// golpe entre poses (ver dibujarHeroeSprite).
		const objetivoMarcha = heroe.moviendo ? (heroe.corriendo ? 1 : 0.45) : 0;
		heroe.marcha += (objetivoMarcha - heroe.marcha) * Math.min(1, dt * 8);

		// Polvo al pisar corriendo: una nubecita cada vez que el pie toca el
		// suelo (cada vuelta completa de la fase = una zancada).
		const zancada = Math.floor(heroe.fase / (Math.PI * 2));
		if (heroe.corriendo && heroeEnSuelo() && zancada !== heroe.ultimaZancada) {
			for (let i = 0; i < 3; i++) {
				polvoPasos.push({
					x: heroe.x - heroe.dir * (6 + Math.random() * 8),
					y: heroe.y,
					vx: -heroe.dir * (10 + Math.random() * 25),
					vy: 8 + Math.random() * 14,
					r: 3 + Math.random() * 3,
					vida: 0,
					dura: 0.35 + Math.random() * 0.2,
				});
			}
		}
		heroe.ultimaZancada = zancada;
		for (const p of polvoPasos) {
			p.vida += dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
		}
		while (polvoPasos.length && polvoPasos[0].vida >= polvoPasos[0].dura) polvoPasos.shift();

		if (estado === "dialogo") {
			const linea = lineaActual();
			dlg.visibles = Math.min(linea.length, dlg.visibles + CFG.velocidadTexto * dt);
			const n = Math.floor(dlg.visibles);
			if (n !== dlg.mostradas) {
				dlg.mostradas = n;
				ui.texto.textContent = linea.slice(0, n);
			}
		}

		let objetivo = Math.max(0, heroe.x - W * 0.35);
		// En la oficina la cámara no se pasa de sus paredes
		if (oficinaActual) {
			const of = oficinaActual.oficina;
			objetivo = clamp(objetivo, of.x0 - 40, Math.max(of.x0 - 40, of.terminalX + 160 - W));
		}
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

	// ---------- Dibujo: zona industrial ----------
	// Color de un edificio en un punto del camino: gris al inicio, su color
	// propio (vivo) al acercarse a Celaque.
	const GRIS_INDUSTRIA = "#6b6e73";
	const pintar = (vivo, t, alfa) => mezclar(GRIS_INDUSTRIA, vivo, t, alfa);

	// Bocanadas de humo saliendo de una chimenea: espeso y oscuro al inicio
	// (smog), blanco y ligero cuando el mundo ya tiene color.
	function dibujarHumo(x, y, s, t, semilla) {
		for (let k = 0; k < 4; k++) {
			const f = modulo(tiempo * 0.22 + k / 4 + semilla, 1);
			ctx.fillStyle = color("humo", t, 0.6 * (1 - f) * (1 - 0.45 * t));
			circulo(x + f * 34 * s + Math.sin(f * 6 + semilla * 10) * 4 * s, y - f * 80 * s, (6 + f * 18) * s);
		}
	}

	// Siluetas de fábricas lejanas con chimeneas humeando (parallax lento).
	// Alturas pseudo-azar pero estables por índice, como dibujarSkylineLejano.
	function dibujarIndustriaLejana(t) {
		const baseY = SUELO + 2 * S;
		const paso = 120 * S;
		const par = camara * 0.3;
		const off = modulo(par, paso);
		let i = Math.floor(par / paso) - 1;
		for (let sx = -off - paso; sx < W + paso; sx += paso, i++) {
			const semilla = Math.sin(i * 12.9898) * 43758.5453;
			const frac = semilla - Math.floor(semilla);
			const frac2 = modulo(frac * 7.31, 1);
			const alto = (110 + frac * 170) * S;
			const ancho = (90 + frac2 * 60) * S;
			const vivo = COLORES_INDUSTRIA[modulo(i, COLORES_INDUSTRIA.length)];
			// Más desaturado que el primer plano: queda lejos, entre la bruma
			ctx.fillStyle = mezclar("#7d8187", vivo, t * 0.45);
			ctx.fillRect(sx - ancho / 2, baseY - alto, ancho, alto);
			if (frac2 > 0.45) {
				// Chimenea con humo
				const cx = sx - ancho * 0.25;
				const arriba = baseY - alto - 70 * S * frac2;
				ctx.fillRect(cx - 7 * S, arriba, 14 * S, alto);
				dibujarHumo(cx, arriba, S * 0.8, t, frac);
			} else {
				// Techo de dientes de sierra
				ctx.beginPath();
				for (let k = 0; k < 3; k++) {
					const x0 = sx - ancho / 2 + (k * ancho) / 3;
					ctx.moveTo(x0, baseY - alto);
					ctx.lineTo(x0 + ancho / 3, baseY - alto - 22 * S);
					ctx.lineTo(x0 + ancho / 3, baseY - alto);
				}
				ctx.fill();
			}
		}
	}

	// Bruma de ciudad sobre el horizonte: separa los planos (lejano / medio /
	// cercano) y se va despejando a medida que el mundo toma color.
	function dibujarBruma(t, fuerza) {
		const g = ctx.createLinearGradient(0, SUELO - 380 * S, 0, SUELO);
		g.addColorStop(0, color("cieloAbajo", t, 0));
		g.addColorStop(1, color("cieloAbajo", t, fuerza * (1 - 0.4 * t)));
		ctx.fillStyle = g;
		ctx.fillRect(0, SUELO - 380 * S, W, 380 * S + 2);
	}

	function dibujarFabrica(e, sx, base, s, t) {
		const w = (300 + 80 * e.v) * s;
		const h = (240 + 100 * e.v) * s;
		const L = sx - w / 2;
		const techo = base - h * 0.66;

		// Chimeneas de ladrillo (detrás del cuerpo), con franjas blancas
		const n = e.v > 0.45 ? 2 : 1;
		for (let i = 0; i < n; i++) {
			const cx = L + w * (0.14 + 0.2 * i);
			const cw = 20 * s;
			const arriba = base - h - i * 30 * s;
			ctx.fillStyle = pintar("#d64545", t);
			ctx.fillRect(cx - cw / 2, arriba, cw, base - arriba);
			ctx.fillStyle = mezclar("#85888d", "#ffffff", t);
			ctx.fillRect(cx - cw / 2, arriba + 10 * s, cw, 7 * s);
			ctx.fillRect(cx - cw / 2, arriba + 26 * s, cw, 7 * s);
			ctx.fillStyle = "rgba(0,0,0,0.3)";
			ctx.fillRect(cx - cw / 2 - 2 * s, arriba - 4 * s, cw + 4 * s, 5 * s);
			dibujarHumo(cx, arriba - 4 * s, s, t, e.v + i * 0.37);
		}

		// Techo de dientes de sierra con ventanales
		const dientes = 4;
		const dw = w / dientes;
		const dh = 38 * s;
		for (let k = 0; k < dientes; k++) {
			const x0 = L + k * dw;
			ctx.fillStyle = pintar(e.acento, t);
			ctx.beginPath();
			ctx.moveTo(x0, techo);
			ctx.lineTo(x0 + dw, techo - dh);
			ctx.lineTo(x0 + dw, techo);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = color("vidrio", t);
			ctx.fillRect(x0 + dw - 9 * s, techo - dh + 8 * s, 7 * s, dh - 8 * s);
		}

		// Cuerpo
		ctx.fillStyle = pintar(e.color, t);
		ctx.fillRect(L, techo, w, base - techo);
		ctx.fillStyle = pintar(e.acento, t);
		ctx.fillRect(L, techo, w, 9 * s);

		// Fila de ventanas
		ctx.fillStyle = color("ventana", t);
		const cols = Math.max(3, Math.floor(w / (36 * s)));
		for (let c = 0; c < cols; c++) {
			const vx = L + (c + 0.5) * (w / cols);
			ctx.fillRect(vx - 10 * s, techo + 24 * s, 20 * s, 24 * s);
		}

		// Portón de carga con láminas
		const pw = w * 0.24;
		const px = L + w * 0.6;
		const ph = h * 0.34;
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.fillRect(px, base - ph, pw, ph);
		ctx.fillStyle = mezclar("#5d6066", "#e9ecef", t);
		ctx.fillRect(px + 4 * s, base - ph + 4 * s, pw - 8 * s, ph - 4 * s);
		ctx.fillStyle = "rgba(0,0,0,0.18)";
		for (let y = base - ph + 10 * s; y < base; y += 8 * s) ctx.fillRect(px + 4 * s, y, pw - 8 * s, 1.5 * s);

		// Sombra lateral para dar volumen
		ctx.fillStyle = "rgba(0,0,0,0.13)";
		ctx.fillRect(L + w * 0.92, techo, w * 0.08, base - techo);
	}

	function dibujarBodega(e, sx, base, s, t) {
		const w = (260 + 60 * e.v) * s;
		const h = (190 + 60 * e.v) * s;
		const L = sx - w / 2;
		const arriba = base - h;

		// Techo a dos aguas
		ctx.fillStyle = pintar(e.acento, t);
		ctx.beginPath();
		ctx.moveTo(L - 10 * s, arriba + 26 * s);
		ctx.lineTo(sx, arriba - 22 * s);
		ctx.lineTo(L + w + 10 * s, arriba + 26 * s);
		ctx.closePath();
		ctx.fill();

		// Cuerpo con láminas verticales
		ctx.fillStyle = pintar(e.color, t);
		ctx.fillRect(L, arriba + 22 * s, w, h - 22 * s);
		ctx.fillStyle = "rgba(0,0,0,0.07)";
		for (let x = L + 6 * s; x < L + w; x += 14 * s) ctx.fillRect(x, arriba + 22 * s, 4 * s, h - 22 * s);

		// Letrero
		const lw = w * 0.42;
		rectRedondo(sx - lw / 2, arriba + 34 * s, lw, 30 * s, 5 * s);
		ctx.fillStyle = mezclar("#585b60", "#ffffff", t);
		ctx.fill();
		ctx.fillStyle = pintar(e.acento, t);
		ctx.fillRect(sx - lw / 2 + 12 * s, arriba + 44 * s, lw * 0.45, 4 * s);
		ctx.fillRect(sx - lw / 2 + 12 * s, arriba + 52 * s, lw * 0.7, 4 * s);

		// Portones enrollables
		const n = e.v > 0.5 ? 3 : 2;
		const pw = w * 0.2;
		const ph = h * 0.45;
		for (let i = 0; i < n; i++) {
			const px = L + ((i + 1) * w) / (n + 1) - pw / 2;
			ctx.fillStyle = mezclar("#55585d", "#eef1f4", t);
			ctx.fillRect(px, base - ph, pw, ph);
			ctx.fillStyle = "rgba(0,0,0,0.16)";
			for (let y = base - ph + 6 * s; y < base; y += 7 * s) ctx.fillRect(px, y, pw, 2 * s);
			// Franja de seguridad amarilla arriba del portón
			ctx.fillStyle = color("bordillo", t);
			ctx.fillRect(px - 3 * s, base - ph - 7 * s, pw + 6 * s, 5 * s);
		}
	}

	function dibujarTanques(e, sx, base, s, t) {
		const tw = 66 * s;
		const sep = 12 * s;
		const n = 3;
		const L = sx - (n * tw + (n - 1) * sep) / 2;
		const hMax = (240 + 90 * e.v) * s;

		// Tubería que conecta los tanques
		ctx.fillStyle = mezclar("#5a5d62", "#9aa3ad", t);
		ctx.fillRect(L, base - 46 * s, n * tw + (n - 1) * sep, 9 * s);

		for (let i = 0; i < n; i++) {
			const x = L + i * (tw + sep);
			const alto = hMax * (i === 1 ? 1 : 0.78 + 0.1 * i);
			const vivo = i === 1 ? e.acento : e.color;
			ctx.fillStyle = pintar(vivo, t);
			ctx.fillRect(x, base - alto, tw, alto);
			ctx.beginPath();
			ctx.ellipse(x + tw / 2, base - alto, tw / 2, 9 * s, 0, 0, Math.PI * 2);
			ctx.fill();
			// Volumen cilíndrico
			const g = ctx.createLinearGradient(x, 0, x + tw, 0);
			g.addColorStop(0, "rgba(255,255,255,0.22)");
			g.addColorStop(0.45, "rgba(255,255,255,0)");
			g.addColorStop(1, "rgba(0,0,0,0.25)");
			ctx.fillStyle = g;
			ctx.fillRect(x, base - alto, tw, alto);
			ctx.fillStyle = "rgba(255,255,255,0.25)";
			ctx.beginPath();
			ctx.ellipse(x + tw / 2, base - alto, tw / 2, 9 * s, 0, 0, Math.PI * 2);
			ctx.fill();
			// Anillos
			ctx.fillStyle = "rgba(0,0,0,0.15)";
			for (let y = base - alto + 34 * s; y < base - 20 * s; y += 46 * s) ctx.fillRect(x, y, tw, 4 * s);
			// Escalera
			ctx.strokeStyle = "rgba(0,0,0,0.35)";
			ctx.lineWidth = 1.5 * s;
			ctx.beginPath();
			ctx.moveTo(x + tw - 10 * s, base);
			ctx.lineTo(x + tw - 10 * s, base - alto);
			ctx.moveTo(x + tw - 4 * s, base);
			ctx.lineTo(x + tw - 4 * s, base - alto);
			for (let y = base - 6 * s; y > base - alto; y -= 7 * s) {
				ctx.moveTo(x + tw - 10 * s, y);
				ctx.lineTo(x + tw - 4 * s, y);
			}
			ctx.stroke();
		}
	}

	function dibujarTorre(e, sx, base, s, t) {
		const w = (150 + 40 * e.v) * s;
		const h = (420 + 110 * e.v) * s;
		const L = sx - w / 2;
		const arriba = base - h;

		// Antena con luz roja que parpadea (solo cuando ya hay color)
		ctx.strokeStyle = "#4f535a";
		ctx.lineWidth = 3 * s;
		linea(sx + w * 0.2, arriba, sx + w * 0.2, arriba - 50 * s);
		if (t > 0.3 && Math.sin(tiempo * 4) > 0) {
			ctx.fillStyle = "#ff3b3b";
			circulo(sx + w * 0.2, arriba - 52 * s, 4 * s);
		}

		ctx.fillStyle = pintar(e.color, t);
		ctx.fillRect(L, arriba, w, h);
		ctx.fillStyle = pintar(e.acento, t);
		ctx.fillRect(L - 4 * s, arriba, w + 8 * s, 12 * s);
		// Franja vertical de acento
		ctx.fillRect(sx - w * 0.06, arriba + 12 * s, w * 0.12, h - 12 * s);

		// Ventanales de vidrio (dos columnas a cada lado de la franja)
		ctx.fillStyle = color("vidrio", t);
		const anchoV = (w * 0.82) / 4;
		for (let y = arriba + 26 * s; y < base - 44 * s; y += 28 * s) {
			for (let c = 0; c < 4; c++) {
				const vx = L + w * 0.03 + c * anchoV + (c >= 2 ? w * 0.12 : 0);
				ctx.fillRect(vx + 3 * s, y, anchoV - 6 * s, 16 * s);
			}
		}
		// Entrada
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.fillRect(sx - 22 * s, base - 34 * s, 44 * s, 34 * s);
		ctx.fillStyle = "rgba(0,0,0,0.12)";
		ctx.fillRect(L + w * 0.9, arriba, w * 0.1, h);
	}

	// Grúa torre de construcción, siempre amarilla, con una viga colgando
	function dibujarGrua(e, sx, base, s, t) {
		const h = (460 + 80 * e.v) * s;
		const mx = sx - 50 * s;
		const mw = 22 * s;
		const arriba = base - h;

		ctx.strokeStyle = pintar("#ffc300", t);
		ctx.lineCap = "butt";
		// Mástil de celosía
		ctx.lineWidth = 3.5 * s;
		linea(mx - mw / 2, base, mx - mw / 2, arriba);
		linea(mx + mw / 2, base, mx + mw / 2, arriba);
		ctx.lineWidth = 2 * s;
		ctx.beginPath();
		for (let y = base; y > arriba + mw; y -= mw) {
			ctx.moveTo(mx - mw / 2, y);
			ctx.lineTo(mx + mw / 2, y - mw);
			ctx.moveTo(mx - mw / 2, y - mw);
			ctx.lineTo(mx + mw / 2, y - mw);
		}
		ctx.stroke();

		// Pluma (brazo largo) y contrapluma
		const izq = mx - 90 * s;
		const der = mx + 230 * s;
		const alto = 16 * s;
		ctx.lineWidth = 3 * s;
		linea(izq, arriba, der, arriba);
		linea(izq, arriba + alto, der, arriba + alto);
		ctx.lineWidth = 1.8 * s;
		ctx.beginPath();
		for (let x = izq; x < der; x += alto) {
			ctx.moveTo(x, arriba + alto);
			ctx.lineTo(x + alto, arriba);
		}
		ctx.stroke();
		// Punta y tirantes
		ctx.lineWidth = 2 * s;
		linea(mx, arriba - 46 * s, izq, arriba);
		linea(mx, arriba - 46 * s, der, arriba);
		ctx.lineWidth = 3.5 * s;
		linea(mx, arriba, mx, arriba - 46 * s);
		// Contrapeso
		ctx.fillStyle = mezclar("#55585d", "#9aa3ad", t);
		ctx.fillRect(izq + 6 * s, arriba + alto, 46 * s, 30 * s);
		// Cabina
		ctx.fillStyle = pintar(e.acento, t);
		ctx.fillRect(mx + mw / 2, arriba + alto, 24 * s, 24 * s);
		ctx.fillStyle = color("vidrio", t);
		ctx.fillRect(mx + mw / 2 + 12 * s, arriba + alto + 5 * s, 9 * s, 10 * s);

		// Cable, gancho y viga balanceándose
		const carro = mx + 160 * s;
		const largo = (170 + 40 * e.v) * s;
		const vaiven = Math.sin(tiempo * 1.2 + e.x) * 6 * s;
		ctx.strokeStyle = "rgba(30,30,30,0.8)";
		ctx.lineWidth = 1.5 * s;
		linea(carro, arriba + alto, carro + vaiven, arriba + alto + largo);
		const gy = arriba + alto + largo;
		ctx.fillStyle = pintar(e.color, t);
		ctx.fillRect(carro + vaiven - 50 * s, gy, 100 * s, 10 * s);
		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.fillRect(carro + vaiven - 50 * s, gy + 7 * s, 100 * s, 3 * s);

		// Base de concreto
		ctx.fillStyle = mezclar("#55585d", "#b8bec5", t);
		ctx.fillRect(mx - 26 * s, base - 14 * s, 52 * s, 14 * s);
		ctx.lineCap = "round";
	}

	const DIBUJO_INDUSTRIA = {
		fabrica: dibujarFabrica,
		bodega: dibujarBodega,
		tanques: dibujarTanques,
		torre: dibujarTorre,
		grua: dibujarGrua,
	};

	function dibujarFabricasMedias() {
		for (const e of fabricasMedias) {
			const sx = e.x - camara * 0.65;
			if (sx < -260 || sx > W + 260) continue;
			DIBUJO_INDUSTRIA[e.tipo](e, sx, SUELO + 2 * S, S * 0.6, tono(e.x / 0.65 / LARGO));
		}
	}

	function dibujarFabricas() {
		for (const e of fabricas) {
			const sx = e.x - camara;
			if (sx < -340 || sx > W + 340) continue;
			DIBUJO_INDUSTRIA[e.tipo](e, sx, SUELO + 10 * S, S, tono(e.x / LARGO));
		}
	}

	// Conos y barriles de obra sobre la acera
	function dibujarConos() {
		const base = SUELO + 14 * S;
		for (const c of conos) {
			const sx = c.x - camara;
			if (sx < -30 || sx > W + 30) continue;
			const t = tono(c.x / LARGO);
			const naranja = pintar("#ff7b1c", t);
			const blanco = mezclar("#8a8c90", "#ffffff", t);
			if (c.barril) {
				rectRedondo(sx - 10 * S, base - 28 * S, 20 * S, 28 * S, 4 * S);
				ctx.fillStyle = naranja;
				ctx.fill();
				ctx.fillStyle = blanco;
				ctx.fillRect(sx - 10 * S, base - 22 * S, 20 * S, 4 * S);
				ctx.fillRect(sx - 10 * S, base - 12 * S, 20 * S, 4 * S);
			} else {
				ctx.fillStyle = naranja;
				ctx.beginPath();
				ctx.moveTo(sx - 8 * S, base - 3 * S);
				ctx.lineTo(sx - 2 * S, base - 26 * S);
				ctx.lineTo(sx + 2 * S, base - 26 * S);
				ctx.lineTo(sx + 8 * S, base - 3 * S);
				ctx.closePath();
				ctx.fill();
				ctx.fillRect(sx - 11 * S, base - 4 * S, 22 * S, 4 * S);
				ctx.fillStyle = blanco;
				ctx.fillRect(sx - 5.5 * S, base - 15 * S, 11 * S, 4 * S);
			}
		}
	}

	// ---------- Zona de planos (el inicio) ----------
	// Un espacio vacío y gris hecho de planos: cuadrícula, bocetos punteados de
	// edificios que todavía no existen y hojas flotando. Termina en una puerta
	// de luz con un foco encendido (FIN_PLANOS): el punto donde nacen las
	// ideas. Al cruzarla hay un destello y se entra al mundo con luz.
	// Bocetos y hojas repartidos por toda la zona, sin azar (siempre igual)
	const TIPOS_BOCETO = ["edificio", "casa", "grua", "edificio", "casa"];
	const BOCETOS = [];
	for (let x = 170, i = 0; x < FIN_PLANOS - 250; x += 260 + ((i * 53) % 90), i++) {
		const tipo = TIPOS_BOCETO[i % TIPOS_BOCETO.length];
		BOCETOS.push({ x, tipo, w: tipo === "casa" ? 130 : tipo === "grua" ? 180 : 90 + ((i * 37) % 50), h: tipo === "casa" ? 110 : 230 + ((i * 71) % 130) });
	}
	const HOJAS_PLANOS = [];
	for (let x = 120, i = 0; x < FIN_PLANOS - 150; x += 190 + ((i * 41) % 80), i++) {
		HOJAS_PLANOS.push({ x, y: 0.1 + ((i * 29) % 35) / 100, giro: (((i * 17) % 7) - 3) / 10, fase: i * 1.3 });
	}
	// Frases que acompañan la caminata por los planos
	const FRASES_PLANOS = [
		{ x: 240, texto: "Todo empieza con una idea..." },
		{ x: 1000, texto: "...las ideas toman tiempo..." },
		{ x: 1750, texto: "...hasta que un día se encienden." },
	];
	const TINTA_PLANO = "rgba(170,178,188,"; // gris apagado, casi sin tinta

	function dibujarCota(x1, y1, x2, y2, texto) {
		linea(x1, y1, x2, y2);
		ctx.font = `${12 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, (x1 + x2) / 2 + (x1 === x2 ? -14 * S : 0), (y1 + y2) / 2 + (y1 === y2 ? -10 * S : 0));
	}

	function dibujarBoceto(b, sx, piso) {
		const w = b.w * S;
		const h = b.h * S;
		const L = sx - w / 2;
		if (b.tipo === "edificio") {
			ctx.strokeRect(L, piso - h, w, h);
			for (let y = piso - h + 18 * S; y < piso - 30 * S; y += 32 * S) {
				for (let x = L + 12 * S; x < L + w - 20 * S; x += 28 * S) ctx.strokeRect(x, y, 14 * S, 18 * S);
			}
			dibujarCota(L - 18 * S, piso, L - 18 * S, piso - h, Math.round(b.h / 20) + " m");
		} else if (b.tipo === "casa") {
			ctx.strokeRect(L, piso - h, w, h);
			ctx.beginPath();
			ctx.moveTo(L - 10 * S, piso - h);
			ctx.lineTo(sx, piso - h - 60 * S);
			ctx.lineTo(L + w + 10 * S, piso - h);
			ctx.stroke();
			ctx.strokeRect(sx - 15 * S, piso - 55 * S, 30 * S, 55 * S);
			dibujarCota(L, piso + 14 * S, L + w, piso + 14 * S, Math.round(b.w / 13) + " m");
		} else {
			const mx = sx - w * 0.3;
			linea(mx - 8 * S, piso, mx - 8 * S, piso - h);
			linea(mx + 8 * S, piso, mx + 8 * S, piso - h);
			linea(mx - 50 * S, piso - h, mx + w * 0.8, piso - h);
			linea(mx, piso - h - 40 * S, mx + w * 0.8, piso - h);
			linea(mx + w * 0.6, piso - h, mx + w * 0.6, piso - h + 120 * S);
		}
	}

	function dibujarZonaPlanos() {
		const gx = FIN_PLANOS - camara; // la puerta de luz, en pantalla
		if (gx < 0) return;
		const ancho = Math.min(W, gx);
		const piso = SUELO + 40 * S;
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, ancho, H);
		ctx.clip();

		const g = ctx.createLinearGradient(0, 0, 0, H);
		g.addColorStop(0, "#1e2023");
		g.addColorStop(0.7, "#2f3236");
		g.addColorStop(1, "#26282b");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, ancho, H);

		// Cuadrícula de plano (fina y gruesa)
		ctx.lineWidth = 1;
		for (const [paso, alfa] of [[40 * S, 0.04], [200 * S, 0.09]]) {
			ctx.strokeStyle = TINTA_PLANO + alfa + ")";
			ctx.beginPath();
			for (let x = -modulo(camara, paso); x < ancho; x += paso) {
				ctx.moveTo(x, 0);
				ctx.lineTo(x, piso);
			}
			for (let y = piso; y > 0; y -= paso) {
				ctx.moveTo(0, y);
				ctx.lineTo(ancho, y);
			}
			ctx.stroke();
		}

		// Piso: una hoja de plano en perspectiva
		ctx.fillStyle = "#35383c";
		ctx.fillRect(0, piso, ancho, H - piso);
		ctx.strokeStyle = TINTA_PLANO + "0.1)";
		ctx.beginPath();
		const paso = 60 * S;
		for (let x = -modulo(camara, paso) - W; x < W * 2; x += paso) {
			ctx.moveTo(x, piso);
			ctx.lineTo(x + (x - W / 2) * 0.9, H);
		}
		ctx.stroke();
		ctx.strokeStyle = TINTA_PLANO + "0.4)";
		ctx.lineWidth = 2 * S;
		linea(0, piso, ancho, piso);

		// Bocetos punteados de lo que todavía no existe
		ctx.strokeStyle = TINTA_PLANO + "0.28)";
		ctx.fillStyle = TINTA_PLANO + "0.4)";
		ctx.lineWidth = 1.5 * S;
		ctx.setLineDash([8 * S, 6 * S]);
		for (const b of BOCETOS) {
			const sx = b.x - camara;
			if (sx < -300 || sx > ancho + 300) continue;
			dibujarBoceto(b, sx, piso);
		}
		ctx.setLineDash([]);

		// Hojas de planos flotando
		for (const hj of HOJAS_PLANOS) {
			const sx = hj.x - camara * 0.8;
			const sy = hj.y * SUELO + Math.sin(tiempo * 0.8 + hj.fase) * 10 * S;
			ctx.save();
			ctx.translate(sx, sy);
			ctx.rotate(hj.giro + Math.sin(tiempo * 0.5 + hj.fase) * 0.06);
			ctx.fillStyle = "rgba(120,124,130,0.22)";
			ctx.fillRect(-28 * S, -20 * S, 56 * S, 40 * S);
			ctx.strokeStyle = TINTA_PLANO + "0.45)";
			ctx.lineWidth = 1;
			ctx.strokeRect(-28 * S, -20 * S, 56 * S, 40 * S);
			ctx.strokeRect(-20 * S, -12 * S, 22 * S, 16 * S);
			linea(6 * S, -10 * S, 22 * S, -10 * S);
			linea(6 * S, -3 * S, 18 * S, -3 * S);
			linea(-20 * S, 10 * S, 20 * S, 10 * S);
			ctx.restore();
		}

		ctx.font = `italic ${22 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = TINTA_PLANO + "0.5)";
		for (const f of FRASES_PLANOS) ctx.fillText(f.texto, f.x - camara, SUELO - 260 * S);

		// Viñeta: los bordes se cierran en penumbra
		const vin = ctx.createRadialGradient(W / 2, SUELO * 0.7, SUELO * 0.4, W / 2, SUELO * 0.7, W * 0.8);
		vin.addColorStop(0, "rgba(0,0,0,0)");
		vin.addColorStop(1, "rgba(0,0,0,0.45)");
		ctx.fillStyle = vin;
		ctx.fillRect(0, 0, ancho, H);
		ctx.restore();
	}

	// La puerta de luz con el foco encendido. Se dibuja DESPUÉS de la neblina
	// para que brille de verdad sobre lo gris.
	function dibujarPuertaIdea() {
		const gx = FIN_PLANOS - camara;
		if (gx < -500 || gx > W + 500) return;
		const piso = SUELO + 40 * S;
		const alto = 210 * S;
		const ancho = 74 * S;
		const pulso = 0.85 + Math.sin(tiempo * 2.2) * 0.15;

		// Resplandor general (más fuerte hacia el lado con luz)
		const halo = ctx.createRadialGradient(gx, piso - alto * 0.55, 10 * S, gx, piso - alto * 0.55, 520 * S);
		halo.addColorStop(0, `rgba(255,244,200,${0.6 * pulso})`);
		halo.addColorStop(1, "rgba(255,244,200,0)");
		ctx.fillStyle = halo;
		ctx.fillRect(gx - 520 * S, piso - alto * 0.55 - 520 * S, 1040 * S, 1040 * S);

		// Rayos que se cuelan hacia lo gris
		ctx.fillStyle = `rgba(255,240,195,${0.1 * pulso})`;
		for (const [a, b] of [[0.05, 0.35], [0.45, 0.75], [0.8, 1]]) {
			ctx.beginPath();
			ctx.moveTo(gx - ancho / 2, piso - alto * (1 - a * 0.9));
			ctx.lineTo(gx - ancho / 2, piso - alto * (1 - b * 0.9));
			ctx.lineTo(gx - 600 * S, piso + (b - 0.5) * 300 * S);
			ctx.lineTo(gx - 600 * S, piso + (a - 0.5) * 300 * S);
			ctx.fill();
		}

		// Marco y vano de luz
		const luz = ctx.createLinearGradient(gx - ancho / 2, 0, gx + ancho / 2, 0);
		luz.addColorStop(0, "#fff6d2");
		luz.addColorStop(0.5, "#ffffff");
		luz.addColorStop(1, "#ffefb0");
		ctx.fillStyle = luz;
		ctx.fillRect(gx - ancho / 2, piso - alto, ancho, alto);
		ctx.strokeStyle = TINTA_PLANO + "0.8)";
		ctx.lineWidth = 4 * S;
		ctx.strokeRect(gx - ancho / 2 - 3 * S, piso - alto - 3 * S, ancho + 6 * S, alto + 3 * S);

		// Foco (la idea) encima de la puerta
		const fy = piso - alto - 70 * S;
		const brillo = ctx.createRadialGradient(gx, fy, 4 * S, gx, fy, 90 * S);
		brillo.addColorStop(0, `rgba(255,236,150,${0.9 * pulso})`);
		brillo.addColorStop(1, "rgba(255,236,150,0)");
		ctx.fillStyle = brillo;
		circulo(gx, fy, 90 * S);
		ctx.strokeStyle = `rgba(255,230,140,${0.8 * pulso})`;
		ctx.lineWidth = 3 * S;
		for (let i = 0; i < 8; i++) {
			const ang = (i / 8) * Math.PI * 2 + tiempo * 0.3;
			linea(gx + Math.cos(ang) * 36 * S, fy + Math.sin(ang) * 36 * S, gx + Math.cos(ang) * 50 * S, fy + Math.sin(ang) * 50 * S);
		}
		ctx.fillStyle = "#fff6c8";
		circulo(gx, fy, 24 * S);
		ctx.fillRect(gx - 11 * S, fy + 14 * S, 22 * S, 12 * S);
		ctx.fillStyle = "#9aa3ad";
		ctx.fillRect(gx - 10 * S, fy + 26 * S, 20 * S, 12 * S);
		ctx.strokeStyle = "rgba(90,90,90,0.6)";
		ctx.lineWidth = 1.5 * S;
		linea(gx - 10 * S, fy + 31 * S, gx + 10 * S, fy + 31 * S);
		ctx.strokeStyle = "#f2a516";
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		ctx.moveTo(gx - 7 * S, fy + 14 * S);
		ctx.lineTo(gx - 4 * S, fy - 2 * S);
		ctx.lineTo(gx, fy + 4 * S);
		ctx.lineTo(gx + 4 * S, fy - 2 * S);
		ctx.lineTo(gx + 7 * S, fy + 14 * S);
		ctx.stroke();
		ctx.strokeStyle = CONTORNO_FOCO;
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		ctx.arc(gx, fy, 24 * S, Math.PI * 0.75, Math.PI * 2.25);
		ctx.stroke();
	}
	const CONTORNO_FOCO = "rgba(120,110,80,0.6)";

	// ---------- Avisos flotantes (subir de nivel) ----------
	function dibujarAvisos(dt) {
		for (const a of avisos) a.t += dt;
		avisos = avisos.filter((a) => a.t < 2.4);
		for (const a of avisos) {
			const x = heroe.x - camara;
			const y = SUELO + 38 * S - heroe.y * S - 150 * S - a.t * 35 * S;
			const alfa = Math.min(1, 2.4 - a.t);
			const zoom = 1 + Math.max(0, 0.3 - a.t) * 1.5;
			ctx.save();
			ctx.globalAlpha = alfa;
			ctx.translate(x, y);
			ctx.scale(zoom, zoom);
			ctx.font = `bold ${24 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.lineWidth = 5 * S;
			ctx.strokeStyle = "rgba(60,40,10,0.85)";
			ctx.strokeText(a.texto, 0, 0);
			ctx.fillStyle = "#ffd23f";
			ctx.fillText(a.texto, 0, 0);
			ctx.restore();
		}
	}

	// Andamios de obra: tablón de metal con franja de seguridad, patas y
	// crucetas hasta el piso. Gris al inicio, colores al acercarse a Celaque.
	function dibujarAndamios() {
		const piso = SUELO + 30 * S;
		for (const pl of PLATAFORMAS) {
			const sx = pl.x - camara;
			const w = pl.medioAncho;
			if (sx + w < -20 || sx - w > W + 20) continue;
			const t = tono(pl.x / LARGO);
			const top = SUELO + 38 * S - pl.alto * S;
			const metal = pintar(pl.principal ? "#2f80ed" : pl.eje ? "#ffc300" : "#ff9f1c", t);

			// Patas y crucetas (las plataformas móviles no tienen: van en
			// rieles o colgadas de una grúa)
			if (pl.eje) dibujarGuiaMovil(pl, sx, top, piso, t);
			ctx.strokeStyle = mezclar("#55585d", "#8a96a3", t);
			ctx.lineWidth = 4 * S;
			ctx.lineCap = "butt";
			const patas = pl.eje ? [] : pl.principal ? [-w + 8 * S, 0, w - 8 * S] : [-w + 8 * S, w - 8 * S];
			for (const dx of patas) linea(sx + dx, top, sx + dx, piso);
			ctx.lineWidth = 2 * S;
			ctx.beginPath();
			for (let i = 0; i < patas.length - 1; i++) {
				const a = sx + patas[i];
				const b = sx + patas[i + 1];
				for (let y = top + 12 * S; y < piso - 10 * S; y += 60 * S) {
					const y2 = Math.min(piso, y + 50 * S);
					ctx.moveTo(a, y);
					ctx.lineTo(b, y2);
					ctx.moveTo(b, y);
					ctx.lineTo(a, y2);
				}
			}
			ctx.stroke();
			ctx.lineCap = "round";
			// Base de las patas
			ctx.fillStyle = "rgba(0,0,0,0.35)";
			for (const dx of patas) ctx.fillRect(sx + dx - 6 * S, piso - 3 * S, 12 * S, 4 * S);

			// Tablón con franja amarilla/negra
			ctx.fillStyle = metal;
			ctx.fillRect(sx - w, top, w * 2, 12 * S);
			ctx.fillStyle = "rgba(255,255,255,0.25)";
			ctx.fillRect(sx - w, top, w * 2, 3 * S);
			ctx.fillStyle = "rgba(20,20,20,0.6)";
			ctx.fillRect(sx - w, top + 12 * S, w * 2, 5 * S);
			ctx.fillStyle = color("bordillo", t);
			for (let x = sx - w; x < sx + w - 6 * S; x += 16 * S) ctx.fillRect(x, top + 12 * S, 8 * S, 5 * S);
		}
	}

	// Elevador: dos rieles del piso hasta lo más alto que llega.
	// Viga móvil en x: cuelga de cables, como si la llevara una grúa.
	function dibujarGuiaMovil(pl, sx, top, piso, t) {
		const w = pl.medioAncho;
		if (pl.eje === "y") {
			const arriba = SUELO + 38 * S - (pl.alto0 + pl.amp) * S - 24 * S;
			ctx.strokeStyle = mezclar("#55585d", "#8a96a3", t);
			ctx.lineWidth = 4 * S;
			linea(sx - w - 4 * S, piso, sx - w - 4 * S, arriba);
			linea(sx + w + 4 * S, piso, sx + w + 4 * S, arriba);
			ctx.lineWidth = 6 * S;
			linea(sx - w - 10 * S, arriba, sx + w + 10 * S, arriba);
			// Cable del elevador
			ctx.strokeStyle = "rgba(30,30,30,0.7)";
			ctx.lineWidth = 1.5 * S;
			linea(sx, arriba, sx, top);
		} else {
			const nudo = top - 50 * S;
			ctx.strokeStyle = "rgba(30,30,30,0.75)";
			ctx.lineWidth = 1.5 * S;
			linea(sx - w * 0.7, top, sx, nudo);
			linea(sx + w * 0.7, top, sx, nudo);
			linea(sx, nudo, sx, 0);
			ctx.strokeStyle = "#7d858e";
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.arc(sx, nudo + 6 * S, 6 * S, -Math.PI * 0.5, Math.PI * 0.8);
			ctx.stroke();
		}
	}

	// Barrera de concreto tipo "New Jersey" con franjas de seguridad
	function dibujarBarrera(sx, baseY, topY, w, t) {
		ctx.fillStyle = mezclar("#6e7176", "#d7d9dc", t);
		ctx.beginPath();
		ctx.moveTo(sx - w, baseY);
		ctx.lineTo(sx - w * 0.82, baseY - (baseY - topY) * 0.3);
		ctx.lineTo(sx - w * 0.45, topY);
		ctx.lineTo(sx + w * 0.45, topY);
		ctx.lineTo(sx + w * 0.82, baseY - (baseY - topY) * 0.3);
		ctx.lineTo(sx + w, baseY);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		ctx.fillRect(sx + w * 0.2, topY, w * 0.25, baseY - topY);
		// Franjas diagonales rojas/blancas (se pintan al recuperar el color)
		ctx.save();
		ctx.beginPath();
		ctx.rect(sx - w * 0.6, topY + (baseY - topY) * 0.2, w * 1.2, (baseY - topY) * 0.32);
		ctx.clip();
		ctx.fillStyle = pintar("#e63946", t);
		for (let x = sx - w * 1.2; x < sx + w; x += 14 * S) {
			ctx.beginPath();
			ctx.moveTo(x, topY + (baseY - topY) * 0.52);
			ctx.lineTo(x + 7 * S, topY + (baseY - topY) * 0.52);
			ctx.lineTo(x + 7 * S + (baseY - topY) * 0.32, topY + (baseY - topY) * 0.2);
			ctx.lineTo(x + (baseY - topY) * 0.32, topY + (baseY - topY) * 0.2);
			ctx.fill();
		}
		ctx.restore();
	}

	function dibujarSuelo() {
		const t0 = tono(camara / LARGO);
		const t1 = tono((camara + W) / LARGO);
		const degradado = (clave) => {
			const g = ctx.createLinearGradient(0, 0, W, 0);
			g.addColorStop(0, color(clave, t0));
			g.addColorStop(1, color(clave, t1));
			return g;
		};

		// Asfalto
		ctx.fillStyle = degradado("asfalto");
		ctx.fillRect(0, SUELO, W, H - SUELO);

		// Acera de concreto con juntas
		ctx.fillStyle = degradado("acera");
		ctx.fillRect(0, SUELO - 2 * S, W, 18 * S);
		ctx.fillStyle = "rgba(255,255,255,0.14)";
		ctx.fillRect(0, SUELO - 2 * S, W, 4 * S);
		ctx.fillStyle = "rgba(0,0,0,0.14)";
		const pasoJunta = 64 * S;
		for (let sx = -modulo(camara, pasoJunta); sx < W; sx += pasoJunta) ctx.fillRect(sx, SUELO - 2 * S, 2 * S, 16 * S);

		// Bordillo pintado de seguridad (amarillo / negro)
		ctx.fillStyle = "rgba(25,25,25,0.55)";
		ctx.fillRect(0, SUELO + 14 * S, W, 6 * S);
		ctx.fillStyle = degradado("bordillo");
		const pasoFranja = 26 * S;
		for (let sx = -modulo(camara, pasoFranja); sx < W; sx += pasoFranja) ctx.fillRect(sx, SUELO + 14 * S, 13 * S, 6 * S);

		// Sendero por donde camina el protagonista
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);

		// Línea discontinua de la calle
		ctx.fillStyle = degradado("marca");
		const pasoLinea = 80 * S;
		for (let sx = -modulo(camara, pasoLinea); sx < W; sx += pasoLinea) ctx.fillRect(sx, SUELO + 52 * S, 40 * S, 4 * S);

		// Franja de pasto al frente (el verde vuelve poco a poco)
		ctx.fillStyle = degradado("pasto");
		ctx.fillRect(0, SUELO + 62 * S, W, H - SUELO);
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

	// Obstáculos sólidos de la Cueva (rocas y cajas). Se apoyan en la línea de
	// pies del héroe (SUELO + 38*S = heroe.y 0) y suben `alto*S`, así la cara
	// superior coincide exacto con donde quedan los pies al pararse encima.
	function dibujarObstaculos(lista) {
		const baseY = SUELO + 38 * S;
		for (const o of lista) {
			const sx = o.x - camara;
			const w = o.medioAncho * S;
			if (sx + w < -20 || sx - w > W + 20) continue;
			const topY = baseY - o.alto * S;

			// Sombra en el piso
			ctx.fillStyle = "rgba(0,0,0,0.33)";
			ctx.beginPath();
			ctx.ellipse(sx, baseY + 4 * S, w * 1.12, 6 * S, 0, 0, Math.PI * 2);
			ctx.fill();

			if (MUEBLES[o.tipo]) dibujarMueble(o, sx, baseY, topY, w);
			else if (o.tipo === "roca") dibujarRoca(sx, baseY, topY, w);
			else if (o.tipo === "barrera") dibujarBarrera(sx, baseY, topY, w, tono(o.x / LARGO));
			else dibujarCaja(sx, baseY, topY, w);
		}
	}

	// Roca sólida: bloque de piedra irregular con la misma paleta de la cueva,
	// canto superior más claro y un par de cristales que hacen juego con la
	// decoración. Silueta ancha y maciza para que se lea como "duro".
	function dibujarRoca(sx, baseY, topY, w) {
		const izq = sx - w;
		const der = sx + w;
		ctx.beginPath();
		ctx.moveTo(izq, baseY);
		ctx.lineTo(izq + w * 0.12, topY + (baseY - topY) * 0.28);
		ctx.lineTo(sx - w * 0.45, topY + 4 * S);
		ctx.lineTo(sx - w * 0.1, topY);
		ctx.lineTo(sx + w * 0.4, topY + 3 * S);
		ctx.lineTo(der - w * 0.1, topY + (baseY - topY) * 0.22);
		ctx.lineTo(der, baseY);
		ctx.closePath();
		const g = ctx.createLinearGradient(0, topY, 0, baseY);
		g.addColorStop(0, "#4a4356");
		g.addColorStop(0.5, "#342f3e");
		g.addColorStop(1, "#211d28");
		ctx.fillStyle = g;
		ctx.fill();

		// Canto superior iluminado (por las lámparas del techo)
		ctx.strokeStyle = "rgba(210,198,225,0.5)";
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		ctx.moveTo(sx - w * 0.45, topY + 4 * S);
		ctx.lineTo(sx - w * 0.1, topY);
		ctx.lineTo(sx + w * 0.4, topY + 3 * S);
		ctx.stroke();

		// Grietas
		ctx.strokeStyle = "rgba(0,0,0,0.4)";
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		ctx.moveTo(sx - w * 0.2, topY + 10 * S);
		ctx.lineTo(sx - w * 0.05, baseY - 12 * S);
		ctx.moveTo(sx + w * 0.3, topY + 12 * S);
		ctx.lineTo(sx + w * 0.15, baseY - 8 * S);
		ctx.stroke();

		// Cristalitos que hacen juego con la cueva
		for (const [dx, dyFrac, tam, tono] of [
			[-w * 0.5, 0.86, 6, "#9a7fe0"],
			[w * 0.62, 0.9, 5, "#5fd6e0"],
		]) {
			const cx = sx + dx;
			const cy = baseY - (baseY - topY) * (1 - dyFrac);
			ctx.fillStyle = tono;
			ctx.beginPath();
			ctx.moveTo(cx, cy - tam * S);
			ctx.lineTo(cx + tam * 0.5 * S, cy);
			ctx.lineTo(cx, cy + tam * 0.4 * S);
			ctx.lineTo(cx - tam * 0.5 * S, cy);
			ctx.closePath();
			ctx.fill();
		}
	}

	// Caja de madera: tablones verticales, marco, aspa en X y herrajes en las
	// esquinas. Se ve firme y apoyada, como un cajón de carga de ferrocarril.
	function dibujarCaja(sx, baseY, topY, w) {
		const izq = sx - w;
		const alto = baseY - topY;

		// Cuerpo con veta de madera (gradiente vertical)
		const g = ctx.createLinearGradient(0, topY, 0, baseY);
		g.addColorStop(0, "#8a5f34");
		g.addColorStop(1, "#5e3f22");
		ctx.fillStyle = g;
		ctx.fillRect(izq, topY, w * 2, alto);

		// Tablones verticales (líneas oscuras)
		ctx.strokeStyle = "rgba(60,38,20,0.6)";
		ctx.lineWidth = 2 * S;
		for (let i = 1; i < 4; i++) {
			const lx = izq + (w * 2 * i) / 4;
			ctx.beginPath();
			ctx.moveTo(lx, topY + 3 * S);
			ctx.lineTo(lx, baseY - 3 * S);
			ctx.stroke();
		}

		// Cara superior más clara (le da volumen)
		ctx.fillStyle = "#9a6c3e";
		ctx.fillRect(izq, topY, w * 2, 5 * S);

		// Marco del borde
		ctx.strokeStyle = "#4a3016";
		ctx.lineWidth = 4 * S;
		ctx.strokeRect(izq + 2 * S, topY + 2 * S, w * 2 - 4 * S, alto - 4 * S);

		// Aspa en X
		ctx.strokeStyle = "rgba(120,84,48,0.9)";
		ctx.lineWidth = 5 * S;
		ctx.beginPath();
		ctx.moveTo(izq + 5 * S, topY + 5 * S);
		ctx.lineTo(izq + w * 2 - 5 * S, baseY - 5 * S);
		ctx.moveTo(izq + w * 2 - 5 * S, topY + 5 * S);
		ctx.lineTo(izq + 5 * S, baseY - 5 * S);
		ctx.stroke();

		// Herrajes metálicos en las 4 esquinas
		ctx.fillStyle = "#3a3a42";
		const h = 7 * S;
		ctx.fillRect(izq, topY, h, h);
		ctx.fillRect(izq + w * 2 - h, topY, h, h);
		ctx.fillRect(izq, baseY - h, h, h);
		ctx.fillRect(izq + w * 2 - h, baseY - h, h, h);
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
			ctx.fillStyle = `hsla(${(i * 47) % 360},60%,72%,${0.4 + frac * 0.2})`;
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
			// Cornisa y sombra lateral para dar volumen
			ctx.fillStyle = "rgba(0,0,0,0.18)";
			ctx.fillRect(sx - anchoPx / 2 - 4 * S, baseY - altoPx, anchoPx + 8 * S, 10 * S);
			ctx.fillStyle = "rgba(0,0,0,0.1)";
			ctx.fillRect(sx + anchoPx * 0.38, baseY - altoPx + 10 * S, anchoPx * 0.12, altoPx - 10 * S);

			ctx.fillStyle = "rgba(225,245,255,0.75)";
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

	// Dibuja una imagen (logo) centrada en (cx, cy) dentro de una caja de
	// maxAncho x maxAlto SIN deformarla: se escala por el lado que más limita.
	function dibujarImagenContenida(img, cx, cy, maxAncho, maxAlto) {
		const w = img.naturalWidth || img.width;
		const h = img.naturalHeight || img.height;
		if (!w || !h) return;
		const k = Math.min(maxAncho / w, maxAlto / h);
		ctx.drawImage(img, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
	}

	const FUENTE = `"Trebuchet MS", "Segoe UI", sans-serif`;

	// Dibuja el logo (si su archivo ya está) o, mientras tanto, un recuadro
	// punteado que dice "LOGO" del mismo tamaño, para ver dónde va a quedar.
	function dibujarLogoOEspacio(carga, cx, cy, ancho, alto, claro) {
		const img = carga && carga.elemento;
		if (img) {
			dibujarImagenContenida(img, cx, cy, ancho, alto);
			return;
		}
		ctx.save();
		const color = claro ? "rgba(255,255,255,0.85)" : conAlfa(COLORES.verde, 0.75);
		ctx.setLineDash([5 * S, 4 * S]);
		ctx.lineWidth = 2 * S;
		ctx.strokeStyle = color;
		rectRedondo(cx - ancho / 2, cy - alto / 2, ancho, alto, 8 * S);
		ctx.stroke();
		ctx.fillStyle = color;
		ctx.font = `bold ${Math.max(8, Math.min(alto * 0.34, ancho * 0.24))}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("LOGO", cx, cy + 1 * S);
		ctx.restore();
	}

	// Torres de los proyectos de Celaque, de fondo, con su nombre arriba.
	function dibujarProyectos() {
		const baseY = SUELO + 10 * S;
		for (const p of proyectos) {
			const sx = p.x - camara;
			const ancho = p.ancho * S;
			const alto = p.alto * S;
			if (sx + ancho < -80 || sx - ancho > W + 80) continue;
			const izq = sx - ancho / 2;
			const arriba = baseY - alto;

			// Vidrio: degradado de turquesa a verde Celaque, con pisos y parteluces
			const vidrio = ctx.createLinearGradient(izq, arriba, izq + ancho, baseY);
			vidrio.addColorStop(0, mezclar(COLORES.claro, "#ffffff", 0.35));
			vidrio.addColorStop(1, COLORES.verde);
			ctx.fillStyle = vidrio;
			ctx.fillRect(izq, arriba, ancho, alto);
			ctx.strokeStyle = "rgba(255,255,255,0.28)";
			ctx.lineWidth = 1.5 * S;
			ctx.beginPath();
			for (let y = arriba + 22 * S; y < baseY; y += 22 * S) linea(izq, y, izq + ancho, y);
			for (let x = izq + ancho / 5; x < izq + ancho - 1; x += ancho / 5) linea(x, arriba, x, baseY);
			ctx.stroke();
			ctx.fillStyle = "rgba(255,255,255,0.16)"; // reflejo diagonal
			ctx.beginPath();
			ctx.moveTo(izq, arriba + alto * 0.25);
			ctx.lineTo(izq + ancho * 0.45, arriba);
			ctx.lineTo(izq + ancho * 0.7, arriba);
			ctx.lineTo(izq, arriba + alto * 0.55);
			ctx.fill();
			ctx.fillStyle = COLORES.oscuro;
			ctx.fillRect(izq - 5 * S, arriba - 10 * S, ancho + 10 * S, 12 * S);

			// Logo del proyecto en la fachada, y letrero con su nombre arriba
			ctx.fillStyle = "rgba(243,239,230,0.92)";
			rectRedondo(sx - 52 * S, arriba + 28 * S, 104 * S, 66 * S, 10 * S);
			ctx.fill();
			dibujarLogoOEspacio(p.logoImg, sx, arriba + 61 * S, 92 * S, 54 * S, false);
			ctx.font = `bold ${17 * S}px ${FUENTE}`;
			const anchoLetrero = ctx.measureText(p.nombre).width + 30 * S;
			rectRedondo(sx - anchoLetrero / 2, arriba - 46 * S, anchoLetrero, 32 * S, 8 * S);
			ctx.fillStyle = COLORES.oscuro;
			ctx.fill();
			ctx.fillStyle = COLORES.crema;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(p.nombre, sx, arriba - 30 * S);
		}
	}

	// Letrero de cada módulo (encima del edificio): logo + nombre + subtítulo.
	// El logo (si el módulo trae uno en config.js) se dibuja sin deformar.
	function dibujarLetreroModulo(m, sx, abajo, encendido) {
		ctx.font = `bold ${20 * S}px ${FUENTE}`;
		const anchoNombre = ctx.measureText(m.nombre).width;
		ctx.font = `${12 * S}px ${FUENTE}`;
		const anchoSub = ctx.measureText(m.subtitulo || "").width;
		const logo = 44 * S;
		const ancho = Math.max(anchoNombre, anchoSub) + logo + 44 * S;
		const alto = 62 * S;
		const x0 = sx - ancho / 2;
		const y0 = abajo - alto;

		ctx.save();
		if (encendido) {
			ctx.shadowColor = conAlfa(COLORES.claro, 0.9);
			ctx.shadowBlur = 18 * S;
		}
		rectRedondo(x0, y0, ancho, alto, 12 * S);
		ctx.fillStyle = encendido ? COLORES.crema : "#c9cfce";
		ctx.fill();
		ctx.restore();
		rectRedondo(x0, y0, ancho, alto, 12 * S);
		ctx.lineWidth = 3 * S;
		ctx.strokeStyle = m.color;
		ctx.stroke();

		const lx = x0 + 16 * S + logo / 2;
		const ly = y0 + alto / 2;
		dibujarLogoOEspacio(m.logoImg, lx, ly, logo, logo, false);

		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = COLORES.oscuro;
		ctx.font = `bold ${20 * S}px ${FUENTE}`;
		ctx.fillText(m.nombre, x0 + 28 * S + logo, y0 + alto * 0.38);
		ctx.fillStyle = COLORES.teal;
		ctx.font = `${12 * S}px ${FUENTE}`;
		ctx.fillText(m.subtitulo || "", x0 + 28 * S + logo, y0 + alto * 0.72);

		// Sello de completado
		if (m.completo) {
			const cx = x0 + ancho - 4 * S;
			const cy = y0 + 4 * S;
			ctx.fillStyle = "#2f9e5f";
			circulo(cx, cy, 13 * S);
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.moveTo(cx - 6 * S, cy);
			ctx.lineTo(cx - 1.5 * S, cy + 5 * S);
			ctx.lineTo(cx + 6.5 * S, cy - 5 * S);
			ctx.stroke();
		}
	}

	// Un edificio por módulo. Apagado (gris, ventanas oscuras) hasta que lo
	// completas; entonces se enciende con el color del módulo. La puerta del
	// próximo módulo pendiente brilla para que se vea a dónde ir.
	function dibujarModulos() {
		const baseY = SUELO + 10 * S;
		const pendiente = moduloPendiente();
		modulos.forEach((m, i) => {
			const sx = m.x - camara;
			const ancho = 250 * S;
			const alto = (260 + (i % 2) * 50) * S;
			if (sx + ancho < -120 || sx - ancho > W + 120) return;
			const izq = sx - ancho / 2;
			const arriba = baseY - alto;
			const encendido = m.completo;
			const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);

			if (m === pendiente) {
				const halo = ctx.createRadialGradient(sx, baseY - 50 * S, 10 * S, sx, baseY - 50 * S, 190 * S);
				halo.addColorStop(0, conAlfa(COLORES.claro, 0.35 + 0.25 * pulso));
				halo.addColorStop(1, conAlfa(COLORES.claro, 0));
				ctx.fillStyle = halo;
				ctx.fillRect(sx - 200 * S, baseY - 250 * S, 400 * S, 300 * S);
			}

			ctx.fillStyle = encendido ? m.color : mezclar("#7d8384", m.color, 0.3);
			ctx.fillRect(izq, arriba, ancho, alto);
			ctx.fillStyle = "rgba(0,0,0,0.16)";
			ctx.fillRect(izq + ancho * 0.84, arriba, ancho * 0.16, alto);
			ctx.fillStyle = COLORES.oscuro;
			ctx.fillRect(izq - 7 * S, arriba - 9 * S, ancho + 14 * S, 13 * S);

			// Ventanas: encendidas (cálidas) o apagadas
			const filas = Math.floor((alto - 120 * S) / (36 * S));
			for (let f = 0; f < filas; f++) {
				for (let c = 0; c < 4; c++) {
					const vx = izq + 22 * S + c * 52 * S;
					const vy = arriba + 24 * S + f * 36 * S;
					ctx.fillStyle = encendido
						? (f + c + i) % 5 === 0
							? "rgba(255,255,255,0.85)"
							: "rgba(255,232,160,0.95)"
						: "rgba(25,40,42,0.55)";
					ctx.fillRect(vx, vy, 32 * S, 22 * S);
				}
			}

			// Puerta (de vidrio, con marco oscuro). La del módulo pendiente late.
			const anchoP = 66 * S;
			const altoP = 84 * S;
			ctx.fillStyle = COLORES.oscuro;
			ctx.fillRect(sx - anchoP / 2 - 5 * S, baseY - altoP - 5 * S, anchoP + 10 * S, altoP + 5 * S);
			ctx.save();
			if (m === pendiente) {
				ctx.shadowColor = COLORES.claro;
				ctx.shadowBlur = (16 + 14 * pulso) * S;
			}
			ctx.fillStyle = encendido ? "#fff1c1" : m === pendiente ? mezclar(COLORES.claro, "#ffffff", 0.35 + 0.4 * pulso) : "#2b3a3c";
			ctx.fillRect(sx - anchoP / 2, baseY - altoP, anchoP, altoP);
			ctx.restore();
			ctx.fillStyle = COLORES.oscuro;
			ctx.fillRect(sx - 1.5 * S, baseY - altoP, 3 * S, altoP);

			dibujarLetreroModulo(m, sx, arriba - 16 * S, encendido);

			// "Módulo 3 de 6" sobre la puerta
			ctx.font = `bold ${12 * S}px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = encendido ? "#fff" : "#dfe5e4";
			ctx.fillText(`Módulo ${i + 1} de ${modulos.length}`, sx, baseY - altoP - 18 * S);
			if (m === pendiente && m.visitado && estado === "urbano" && Math.abs(heroe.x - m.x) < CFG.distanciaParaHablar * 1.3) {
				dibujarGlobo(sx, baseY - altoP - 36 * S, esTactil ? "Toca Hablar para entrar" : "E · Entrar", "#c9f7f1");
			}

			if (m.brillo > 0) {
				const destelloM = ctx.createRadialGradient(sx, arriba + alto / 2, 10 * S, sx, arriba + alto / 2, 300 * S);
				destelloM.addColorStop(0, `rgba(255,255,235,${0.75 * m.brillo})`);
				destelloM.addColorStop(1, "rgba(255,255,235,0)");
				ctx.fillStyle = destelloM;
				ctx.fillRect(sx - 300 * S, arriba - 120 * S, 600 * S, alto + 240 * S);
			}
		});
	}

	// Reja con candado justo después de cada módulo sin completar: no se
	// pasa hasta contestar sus preguntas (ver limiteUrbano).
	function dibujarRejas() {
		for (const m of modulos) {
			if (m.completo) continue;
			const sx = m.x + 60 - camara;
			if (sx < -60 || sx > W + 60) continue;
			const piso = SUELO + 40 * S;
			const alto = 74 * S;
			const ancho = 34 * S;
			ctx.fillStyle = COLORES.oscuro;
			ctx.fillRect(sx - ancho / 2 - 4 * S, piso - alto - 6 * S, 7 * S, alto + 6 * S);
			ctx.fillRect(sx + ancho / 2 - 3 * S, piso - alto - 6 * S, 7 * S, alto + 6 * S);
			ctx.fillRect(sx - ancho / 2, piso - alto, ancho, 5 * S);
			ctx.fillRect(sx - ancho / 2, piso - alto * 0.45, ancho, 4 * S);
			ctx.strokeStyle = COLORES.oscuro;
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			for (let k = 1; k < 4; k++) {
				const bx = sx - ancho / 2 + (ancho * k) / 4;
				linea(bx, piso, bx, piso - alto);
			}
			ctx.stroke();
			// Candado
			const cy = piso - alto * 0.62;
			ctx.strokeStyle = "#e8b931";
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.arc(sx, cy - 6 * S, 6 * S, Math.PI, 0);
			ctx.stroke();
			ctx.fillStyle = "#ffcf3f";
			rectRedondo(sx - 9 * S, cy - 6 * S, 18 * S, 15 * S, 3 * S);
			ctx.fill();
		}
	}

	// ---------- Dibujo: oficina (interior de cada módulo) ----------
	// Todo lo de la pared (ventanas, lámparas, logos, pizarras) está fijo en
	// coordenadas de mundo, así se mueve con la cámara igual que los muebles.
	function dibujarFondoOficina(m) {
		const of = m.oficina;
		// Pared
		const pared = ctx.createLinearGradient(0, 0, 0, SUELO);
		pared.addColorStop(0, "#f4f5f1");
		pared.addColorStop(1, "#e2e6e1");
		ctx.fillStyle = pared;
		ctx.fillRect(0, 0, W, SUELO + 40 * S);

		// Techo con lámparas que brillan
		ctx.fillStyle = "#d4d9d6";
		ctx.fillRect(0, 0, W, 34 * S);
		for (let x = of.x0 + 120; x < of.terminalX + 200; x += 300) {
			const sx = x - camara;
			if (sx < -150 || sx > W + 150) continue;
			const luz = ctx.createLinearGradient(0, 34 * S, 0, 260 * S);
			luz.addColorStop(0, "rgba(255,255,235,0.55)");
			luz.addColorStop(1, "rgba(255,255,235,0)");
			ctx.fillStyle = luz;
			ctx.beginPath();
			ctx.moveTo(sx - 45 * S, 34 * S);
			ctx.lineTo(sx + 45 * S, 34 * S);
			ctx.lineTo(sx + 120 * S, 260 * S);
			ctx.lineTo(sx - 120 * S, 260 * S);
			ctx.fill();
			ctx.fillStyle = "#ffffff";
			rectRedondo(sx - 50 * S, 28 * S, 100 * S, 10 * S, 4 * S);
			ctx.fill();
		}

		// Ventanales a la ciudad
		const altoV = Math.min(210 * S, SUELO - 130 * S);
		for (let x = of.x0 + 260; x < of.terminalX - 100; x += 560) {
			const sx = x - camara;
			if (sx < -200 || sx > W + 200) continue;
			const top = 70 * S;
			const cielo = ctx.createLinearGradient(0, top, 0, top + altoV);
			cielo.addColorStop(0, "#8fd3f4");
			cielo.addColorStop(1, "#d9f1fb");
			ctx.fillStyle = cielo;
			ctx.fillRect(sx - 110 * S, top, 220 * S, altoV);
			ctx.fillStyle = "rgba(0,118,122,0.35)"; // ciudad a lo lejos
			for (let k = 0; k < 6; k++) {
				const h = (40 + ((k * 37 + x) % 70)) * S;
				ctx.fillRect(sx - 110 * S + k * 37 * S, top + altoV - h, 30 * S, h);
			}
			ctx.strokeStyle = COLORES.oscuro;
			ctx.lineWidth = 6 * S;
			ctx.strokeRect(sx - 110 * S, top, 220 * S, altoV);
			ctx.lineWidth = 3 * S;
			linea(sx, top, sx, top + altoV);
		}

		// Logo de Celaque y nombre del módulo pintados en la pared
		for (let x = of.x0 + 540; x < of.terminalX - 200; x += 560) {
			const sx = x - camara;
			if (sx < -200 || sx > W + 200) continue;
			const cy = 150 * S;
			dibujarLogoOEspacio(logoCelaque, sx, cy, 120 * S, 80 * S, false);
			ctx.fillStyle = COLORES.verde;
			ctx.font = `bold ${22 * S}px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("CELAQUE", sx, cy + 62 * S);
			ctx.fillStyle = COLORES.teal;
			ctx.font = `${15 * S}px ${FUENTE}`;
			ctx.fillText(`Módulo ${m.nombre}`, sx, cy + 86 * S);
		}

		// Zócalo con el color del módulo
		ctx.fillStyle = m.color;
		ctx.fillRect(0, SUELO - 22 * S, W, 22 * S);
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(0, SUELO - 22 * S, W, 3 * S);

		// Paredes de los extremos
		ctx.fillStyle = COLORES.oscuro;
		const izq = of.x0 - camara;
		if (izq > 0) ctx.fillRect(0, 0, izq, H);
		const der = of.terminalX + 140 - camara;
		if (der < W) ctx.fillRect(der, 0, W - der, H);
	}

	function dibujarSueloOficina() {
		const piso = ctx.createLinearGradient(0, SUELO, 0, H);
		piso.addColorStop(0, "#7a8b88");
		piso.addColorStop(1, "#56625f");
		ctx.fillStyle = piso;
		ctx.fillRect(0, SUELO, W, H - SUELO);
		ctx.fillStyle = "rgba(255,255,255,0.12)";
		ctx.fillRect(0, SUELO, W, 4 * S);
		// Losetas de alfombra
		ctx.strokeStyle = "rgba(0,0,0,0.12)";
		ctx.lineWidth = 1.5 * S;
		ctx.beginPath();
		const paso = 90 * S;
		const off = ((camara % paso) + paso) % paso;
		for (let sx = -off; sx < W; sx += paso) linea(sx, SUELO + 6 * S, sx, H);
		linea(0, SUELO + 50 * S, W, SUELO + 50 * S);
		ctx.stroke();
	}

	// Puerta de salida, al inicio de la oficina
	function dibujarPuertaSalida(m) {
		const sx = m.oficina.x0 + 70 - camara;
		if (sx < -80 || sx > W + 80) return;
		const piso = SUELO + 40 * S;
		ctx.fillStyle = COLORES.oscuro;
		ctx.fillRect(sx - 40 * S, piso - 130 * S, 80 * S, 130 * S);
		ctx.fillStyle = "#b9d9d5";
		ctx.fillRect(sx - 33 * S, piso - 123 * S, 66 * S, 123 * S);
		ctx.fillStyle = "#2f9e5f";
		rectRedondo(sx - 30 * S, piso - 156 * S, 60 * S, 22 * S, 5 * S);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = `bold ${12 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("SALIDA", sx, piso - 145 * S);
		if (estado === "oficina" && enSalidaOficina() && m.completo) {
			dibujarGlobo(sx, piso - 170 * S, esTactil ? "Toca Hablar para salir" : "E · Salir", "#c9f7f1");
		}
	}

	// Muebles de oficina (obstáculos). topY es la cara de arriba, donde se
	// puede parar el héroe; lo que sobresale (respaldo, hojas) es decoración.
	function dibujarMueble(o, sx, baseY, topY, w) {
		const alto = baseY - topY;
		if (o.tipo === "escritorio") {
			ctx.fillStyle = "#8a6a4a";
			ctx.fillRect(sx - w + 6 * S, topY + 8 * S, 8 * S, alto - 8 * S);
			ctx.fillRect(sx + w - 14 * S, topY + 8 * S, 8 * S, alto - 8 * S);
			ctx.fillStyle = "#a07c58";
			ctx.fillRect(sx + w * 0.2, topY + 8 * S, w * 0.6, alto * 0.55); // cajonera
			ctx.fillStyle = "#c89b6d";
			rectRedondo(sx - w, topY, w * 2, 10 * S, 3 * S);
			ctx.fill();
			ctx.fillStyle = "#3a4446"; // laptop cerrada y taza
			ctx.fillRect(sx - w * 0.6, topY - 4 * S, 36 * S, 4 * S);
			ctx.fillStyle = COLORES.teal;
			ctx.fillRect(sx + w * 0.45, topY - 10 * S, 9 * S, 10 * S);
		} else if (o.tipo === "silla") {
			ctx.fillStyle = "#2e3a3c";
			ctx.fillRect(sx - 2 * S, topY + 6 * S, 4 * S, alto - 10 * S);
			ctx.fillRect(sx - w, baseY - 5 * S, w * 2, 5 * S);
			ctx.fillStyle = COLORES.verde;
			rectRedondo(sx - w, topY, w * 2, 9 * S, 4 * S);
			ctx.fill();
			rectRedondo(sx - w, topY - 34 * S, 9 * S, 38 * S, 4 * S); // respaldo
			ctx.fill();
		} else if (o.tipo === "archivero") {
			ctx.fillStyle = "#9aa5a6";
			ctx.fillRect(sx - w, topY, w * 2, alto);
			ctx.strokeStyle = "#6f7a7b";
			ctx.lineWidth = 2 * S;
			for (let k = 1; k < 3; k++) {
				const y = topY + (alto * k) / 3;
				linea(sx - w, y, sx + w, y);
			}
			ctx.fillStyle = "#e7ecec";
			for (let k = 0; k < 3; k++) ctx.fillRect(sx - 8 * S, topY + (alto * (k + 0.4)) / 3, 16 * S, 4 * S);
		} else if (o.tipo === "cajas") {
			ctx.fillStyle = "#c79a5b";
			ctx.fillRect(sx - w, topY + alto * 0.45, w * 2, alto * 0.55);
			ctx.fillStyle = "#d8ad6d";
			ctx.fillRect(sx - w * 0.75, topY, w * 1.5, alto * 0.45);
			ctx.fillStyle = "rgba(0,0,0,0.15)";
			ctx.fillRect(sx - 3 * S, topY, 6 * S, alto * 0.45);
			ctx.fillRect(sx - 3 * S, topY + alto * 0.45, 6 * S, alto * 0.55);
		} else if (o.tipo === "impresora") {
			ctx.fillStyle = "#5e686a";
			ctx.fillRect(sx - w * 0.85, topY + 26 * S, w * 1.7, alto - 26 * S);
			ctx.fillStyle = "#eceff0";
			rectRedondo(sx - w, topY, w * 2, 28 * S, 5 * S);
			ctx.fill();
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(sx - w * 0.5, topY - 6 * S, w, 8 * S); // hojas
			ctx.fillStyle = COLORES.claro;
			circulo(sx + w * 0.65, topY + 10 * S, 3 * S);
		} else if (o.tipo === "planta") {
			ctx.fillStyle = "#3f9b5a";
			for (let k = -2; k <= 2; k++) {
				ctx.beginPath();
				ctx.ellipse(sx + k * 7 * S, topY - 6 * S - Math.abs(k) * -3 * S, 7 * S, 18 * S, k * 0.35, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.fillStyle = "#e9e3d6";
			ctx.beginPath();
			ctx.moveTo(sx - w, topY + alto * 0.35);
			ctx.lineTo(sx + w, topY + alto * 0.35);
			ctx.lineTo(sx + w * 0.75, baseY);
			ctx.lineTo(sx - w * 0.75, baseY);
			ctx.fill();
		} else if (o.tipo === "dispensador") {
			ctx.fillStyle = "#e9edee";
			ctx.fillRect(sx - w, topY + alto * 0.38, w * 2, alto * 0.62);
			ctx.fillStyle = "rgba(90,180,230,0.75)";
			rectRedondo(sx - w * 0.8, topY, w * 1.6, alto * 0.4, 6 * S);
			ctx.fill();
			ctx.fillStyle = "#4a7fb0";
			ctx.fillRect(sx - 3 * S, topY + alto * 0.55, 6 * S, 6 * S);
		}
	}

	// Compañero del módulo (misma foto teñida que los NPCs del camino)
	function dibujarCompanero(m) {
		const n = m.oficina.companero;
		const sx = n.x - camara;
		if (sx < -80 || sx > W + 80) return;
		const pie = SUELO + 36 * S;
		dibujarNpcFoto(sx, pie, n, heroe.x >= n.x ? 1 : -1);
		const arriba = pie - 125 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
		if (!n.hablado) dibujarGlobo(sx, arriba, "!", "#ffe066");
		else if (estado === "oficina" && companeroCerca()) dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
	}

	// Computadora al fondo de la oficina: monitor grande con la Terminal
	// Celaque (colores y logo de Celaque) sobre su escritorio.
	function dibujarComputadora(m) {
		const of = m.oficina;
		const sx = of.terminalX - camara;
		if (sx < -200 || sx > W + 200) return;
		const piso = SUELO + 40 * S;
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);

		// Escritorio
		const topY = piso - 70 * S;
		ctx.fillStyle = COLORES.oscuro;
		ctx.fillRect(sx - 80 * S, topY, 160 * S, 70 * S);
		ctx.fillStyle = COLORES.verde;
		ctx.fillRect(sx - 90 * S, topY - 8 * S, 180 * S, 10 * S);

		// Monitor
		const mw = 150 * S;
		const mh = 100 * S;
		const my = topY - 30 * S - mh;
		ctx.fillStyle = "#1c2526";
		ctx.fillRect(sx - 8 * S, topY - 30 * S, 16 * S, 24 * S);
		ctx.fillRect(sx - 36 * S, topY - 10 * S, 72 * S, 5 * S);
		ctx.save();
		if (!m.completo) {
			ctx.shadowColor = COLORES.claro;
			ctx.shadowBlur = (18 + 16 * pulso) * S;
		}
		rectRedondo(sx - mw / 2 - 8 * S, my - 8 * S, mw + 16 * S, mh + 16 * S, 8 * S);
		ctx.fillStyle = "#1c2526";
		ctx.fill();
		ctx.restore();
		const pantalla = ctx.createLinearGradient(0, my, 0, my + mh);
		pantalla.addColorStop(0, COLORES.teal);
		pantalla.addColorStop(1, COLORES.oscuro);
		ctx.fillStyle = pantalla;
		ctx.fillRect(sx - mw / 2, my, mw, mh);
		dibujarLogoOEspacio(logoCelaqueBlanco, sx, my + mh * 0.4, 76 * S, 44 * S, true);
		ctx.fillStyle = "#fff";
		ctx.font = `bold ${11 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(m.completo ? "✓ Módulo completado" : "Terminal Celaque", sx, my + mh * 0.82);
		if (!m.completo && Math.sin(tiempo * 6) > 0) ctx.fillRect(sx + 50 * S, my + mh * 0.78, 6 * S, 9 * S); // cursor

		// Silla de la computadora
		ctx.fillStyle = COLORES.verde;
		rectRedondo(sx - 60 * S, piso - 42 * S, 36 * S, 8 * S, 4 * S);
		ctx.fill();
		ctx.fillStyle = "#2e3a3c";
		ctx.fillRect(sx - 44 * S, piso - 34 * S, 4 * S, 30 * S);

		if (estado === "oficina" && enTerminal() && !m.completo) {
			dibujarGlobo(sx - 50 * S, my - 22 * S, esTactil ? "Toca Hablar para usarla" : "E · Usar computadora", "#c9f7f1");
		}
	}

	// ---------- Guías de dirección ----------
	// Hacia dónde ir ahora: el próximo NPC por conocer (adelante), el
	// Guardián/tubo de la cueva, el próximo enemigo, la puerta del próximo
	// módulo o el letrero final.
	function objetivoActual() {
		if (estado === "jugando") {
			const npc = npcs.find((n) => !n.hablado && n.x > heroe.x - 400);
			return npc ? npc.x : LARGO;
		}
		if (estado === "cueva") {
			const en = enemigos.find((e) => !e.derrotado && e.x > LARGO);
			return en ? en.x : LARGO_TOTAL;
		}
		if (estado === "urbano") {
			const m = moduloPendiente();
			return m ? m.x : LARGO_META;
		}
		if (estado === "oficina") {
			const of = oficinaActual.oficina;
			if (!of.companero.hablado) return of.companero.x;
			return oficinaActual.completo ? of.x0 + 70 : of.terminalX - 50;
		}
		return null;
	}

	// Columna de luz sobre el objetivo + flechas luminosas a los pies del
	// héroe apuntando hacia él (se apagan al llegar).
	function dibujarGuias() {
		const objetivo = objetivoActual();
		if (objetivo === null) return;

		const fx = objetivo - camara;
		if (fx > -80 && fx < W + 80) {
			const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
			const luz = ctx.createLinearGradient(0, SUELO + 40 * S, 0, SUELO - 320 * S);
			luz.addColorStop(0, conAlfa(COLORES.claro, 0.45 + 0.2 * pulso));
			luz.addColorStop(1, conAlfa(COLORES.claro, 0));
			ctx.fillStyle = luz;
			ctx.fillRect(fx - 34 * S, SUELO - 320 * S, 68 * S, 360 * S);
		}

		const dist = objetivo - heroe.x;
		if (Math.abs(dist) < 100) return;
		const dir = Math.sign(dist);
		const alfa = clamp((Math.abs(dist) - 100) / 160, 0, 1);
		const pie = SUELO + 38 * S - heroe.y * S;
		const y = pie - 16 * S;
		const x0 = heroe.x - camara + dir * 40 * S;
		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.shadowColor = COLORES.claro;
		ctx.shadowBlur = 16 * S;
		for (let k = 0; k < 3; k++) {
			// Una ola de luz recorre las 3 flechas hacia el objetivo
			const a = alfa * (0.35 + 0.65 * Math.max(0, Math.sin(tiempo * 6 - k * 1.1)));
			const cx = x0 + dir * k * 17 * S;
			ctx.strokeStyle = `rgba(220,255,250,${a.toFixed(3)})`;
			ctx.lineWidth = 5 * S;
			ctx.beginPath();
			ctx.moveTo(cx - dir * 6 * S, y - 9 * S);
			ctx.lineTo(cx + dir * 5 * S, y);
			ctx.lineTo(cx - dir * 6 * S, y + 9 * S);
			ctx.stroke();
		}
		ctx.restore();
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
		// Ajuste fino por foto puntual (ej. que el golpe se vea un poco más
		// chico que parado), aparte del tamaño base del enemigo.
		const escalaExtra = meta.escalaExtra ?? 1;

		const s = S * 1.15 * (o.escala || 1);
		// El vaivén de reposo NO debe escalar con "escala": es una animación de
		// vida sutil, no parte del tamaño del cuerpo. Si escalara, un enemigo
		// gigante (el jefe) se movería muchos más píxeles que uno chico y se
		// vería como si flotara en vez de estar parado. Se usa una escala fija
		// (equivalente a escala=1) solo para este vaivén.
		const sVaiven = S * 1.15;
		// Flotar en reposo: la fase se toma de la posición de MUNDO (x + camara),
		// no de la de pantalla. Si se usa la de pantalla, al mover la cámara la
		// fase salta cada cuadro y el enemigo tiembla mientras el héroe camina.
		const rebote = o.moviendo
			? Math.abs(Math.cos(o.fase)) * 2 * sVaiven
			: Math.sin(tiempo * 2 + x + camara) * 0.8 * sVaiven;
		const altoDeseado = 100 * s * embestida * escalaExtra;

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
		// La escala SIEMPRE sale de la foto "quieto" (no de la pose actual):
		// si cada pose normalizara su propio alto de contenido, una pose con
		// bbox más bajo/más alto (ej. una estocada agachada) se vería de
		// tamaño distinto a quieto aunque el cuerpo mida lo mismo -mismo bug
		// que se corrigió para el héroe en dibujarHeroeSprite-.
		const metaQuieto = sprites.quieto;
		const elQuieto = metaQuieto.cargando.elemento;
		const refMeta = elQuieto ? metaQuieto : meta;
		const refEl = elQuieto || el;
		const hRef = refEl.naturalHeight || refEl.height;
		const altoContenidoRef = (refMeta.abajo - refMeta.arriba) * hRef;
		const k = altoDeseado / altoContenidoRef;
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
			if (m.x < FIN_PLANOS + 20) continue; // la zona de planos está vacía
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

		const brillo = ctx.createRadialGradient(sx, pie - 80 * S, 10, sx, pie - 80 * S, 220 * S);
		brillo.addColorStop(0, conAlfa(COLORES.claro, 0.55));
		brillo.addColorStop(1, conAlfa(COLORES.claro, 0));
		ctx.fillStyle = brillo;
		ctx.fillRect(sx - 220 * S, pie - 300 * S, 440 * S, 420 * S);

		const texto = CFG.textos.letreroFinal || CFG.nombreMeta;
		ctx.font = `bold ${26 * S}px ${FUENTE}`;
		const anchoTablero = Math.max(190 * S, ctx.measureText(texto).width + 50 * S);

		ctx.fillStyle = COLORES.oscuro;
		ctx.fillRect(sx - anchoTablero * 0.35, pie - 115 * S, 10 * S, 115 * S);
		ctx.fillRect(sx + anchoTablero * 0.35 - 10 * S, pie - 115 * S, 10 * S, 115 * S);

		ctx.save();
		ctx.shadowColor = COLORES.claro;
		ctx.shadowBlur = 22 * S;
		rectRedondo(sx - anchoTablero / 2, pie - 160 * S, anchoTablero, 56 * S, 12 * S);
		ctx.fillStyle = COLORES.crema;
		ctx.fill();
		ctx.restore();
		ctx.lineWidth = 4 * S;
		ctx.strokeStyle = COLORES.teal;
		ctx.stroke();

		ctx.fillStyle = COLORES.oscuro;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, sx, pie - 131 * S);

		// Logo de Celaque arriba del letrero (sin deformar)
		ctx.fillStyle = COLORES.crema;
		rectRedondo(sx - 58 * S, pie - 242 * S, 116 * S, 74 * S, 12 * S);
		ctx.fill();
		dibujarLogoOEspacio(logoCelaque, sx, pie - 205 * S, 100 * S, 60 * S, false);

		// Bandera ondeando
		const mastil = sx + anchoTablero / 2 + 30 * S;
		ctx.strokeStyle = COLORES.oscuro;
		ctx.lineWidth = 4 * S;
		linea(mastil, pie, mastil, pie - 190 * S);
		const ola = Math.sin(tiempo * 4) * 6 * S;
		ctx.fillStyle = COLORES.teal;
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

	// NPC obrero / ingeniero con el mismo estilo que las fotos del héroe:
	// proporciones realistas en vista 3/4, contorno oscuro, casco, camiseta de
	// manga corta, chaleco reflectivo, cinturón con bolsas, pantalón de
	// trabajo y botas. Coordenadas en "u" (pie = 0, hacia arriba negativo);
	// mide lo mismo que el héroe (~100 u con el casco).
	const CONTORNO = "#1f1a17";
	function figura(u, puntos, relleno) {
		ctx.beginPath();
		ctx.moveTo(puntos[0] * u, puntos[1] * u);
		for (let i = 2; i < puntos.length; i += 2) ctx.lineTo(puntos[i] * u, puntos[i + 1] * u);
		ctx.closePath();
		ctx.fillStyle = relleno;
		ctx.fill();
		ctx.stroke();
	}

	// NPC con la foto del héroe ya teñida (ver fotoNpc). Misma escala, sombra
	// y vaivén que dibujarHeroeSprite, para que se vean del mismo mundo.
	function dibujarNpcFoto(x, pie, n, dir) {
		const f = fotoNpc(n);
		if (!f) return false;
		const s = S * 1.15 * (n.apariencia.escala || 1);
		const rebote = Math.sin(tiempo * 2 + x + camara) * 0.8 * s;
		const k = (100 * s) / ((f.meta.abajo - f.meta.arriba) * f.lienzo.height);
		const dw = f.lienzo.width * k;
		const dh = f.lienzo.height * k;
		ctx.save();
		ctx.translate(x, pie);
		ctx.fillStyle = "rgba(40,40,40,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.translate(0, -rebote);
		ctx.scale(dir, 1);
		ctx.drawImage(f.lienzo, -f.meta.anclaX * dw, -f.meta.abajo * dh, dw, dh);
		ctx.restore();
		return true;
	}

	function dibujarObrero(x, pie, o) {
		const u = S * 1.15;
		// Respiración sutil (fase de MUNDO, para que no tiemble con la cámara)
		const respira = Math.sin(tiempo * 2 + x + camara) * 0.5;
		const sombra = "rgba(0,0,0,0.16)";

		ctx.save();
		ctx.translate(x, pie);
		ctx.fillStyle = "rgba(40,40,40,0.2)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 18 * u, 4 * u, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.scale(o.dir, 1);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.3 * u;
		// El cuerpo va más angosto que el dibujo base (como la silueta
		// delgada del héroe); la cabeza se dibuja después sin angostar.
		ctx.save();
		ctx.scale(0.84, 1);

		// Piernas (la de atrás con sombra) y bolsillo cargo
		figura(u, [-10, -47, -1, -47, -6, -9, -15, -9], o.pantalon);
		ctx.fillStyle = sombra;
		ctx.beginPath();
		ctx.moveTo(-10 * u, -47 * u);
		ctx.lineTo(-6 * u, -47 * u);
		ctx.lineTo(-11 * u, -9 * u);
		ctx.lineTo(-15 * u, -9 * u);
		ctx.fill();
		figura(u, [0, -47, 10, -47, 14, -9, 5, -9], o.pantalon);
		figura(u, [8, -34, 12, -34, 12.8, -25, 8.8, -25], o.pantalon);

		// Botas con suela negra y cordones
		figura(u, [-16, -11, -6, -11, -5, -5, -2, -3, -2, 0, -17, 0], o.botas);
		figura(u, [4, -11, 14, -11, 15, -6, 19.5, -4, 19.5, 0, 4, 0], o.botas);
		ctx.fillStyle = "#1c1c1c";
		ctx.fillRect(-17 * u, -2 * u, 15 * u, 2 * u);
		ctx.fillRect(4 * u, -2 * u, 15.5 * u, 2 * u);
		ctx.strokeStyle = "rgba(255,240,210,0.7)";
		ctx.lineWidth = 0.8 * u;
		for (let k = 0; k < 3; k++) linea((7 + k * 2) * u, (-9 + k * 1.5) * u, (10 + k * 2) * u, (-9 + k * 1.5) * u);
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.3 * u;

		// Del cinturón para arriba "respira"
		ctx.translate(0, respira * u);

		// Martillo colgando del cinturón (como el del héroe)
		if (o.herramienta === "martillo") {
			figura(u, [-14.5, -47, -12.5, -47, -13, -33, -15, -33], "#f2b81c");
			figura(u, [-15, -40, -13, -40, -13, -33, -15, -33], "#2a2a2a");
			figura(u, [-19, -50, -9, -50, -9, -47, -19, -47], "#a3abb4");
		}

		// Brazo de atrás + mano
		figura(u, [-15, -66, -11, -65, -13, -50, -17.5, -50.5], o.piel);
		ctx.fillStyle = o.piel;
		circulo(-15.5 * u, -48 * u, 3 * u);
		ctx.stroke();

		// Camiseta y mangas cortas
		figura(u, [-14, -72, 14, -72, 12, -49, -12, -49], o.ropa);
		figura(u, [-14, -72, -9, -72, -10.5, -63, -17, -64.5], o.ropa);
		figura(u, [9, -72, 14, -72, 17, -64.5, 10.5, -63], o.ropa);

		// Chaleco reflectivo (abierto al centro) con dos franjas
		figura(u, [-13, -72, -4, -73, -1, -58, -1, -49.5, -12, -49.5], o.chaleco);
		figura(u, [4, -73, 13, -72, 12, -49.5, 1, -49.5, 1, -58], o.chaleco);
		ctx.fillStyle = "#d6dce1";
		ctx.fillRect(-12.7 * u, -61 * u, 11.2 * u, 2.6 * u);
		ctx.fillRect(1.5 * u, -61 * u, 11.2 * u, 2.6 * u);
		ctx.fillRect(-12.3 * u, -55 * u, 10.8 * u, 2.6 * u);
		ctx.fillRect(1.5 * u, -55 * u, 10.6 * u, 2.6 * u);
		ctx.fillStyle = sombra;
		ctx.fillRect(-12.7 * u, -72 * u, 3 * u, 22 * u);

		// Cinturón con hebilla y bolsas de herramientas
		figura(u, [-12.5, -50.5, 12.5, -50.5, 12.5, -46.5, -12.5, -46.5], "#6b4424");
		ctx.strokeStyle = "#b9c0c7";
		ctx.lineWidth = 1 * u;
		ctx.strokeRect(1.5 * u, -50 * u, 4 * u, 3 * u);
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.3 * u;
		figura(u, [7.5, -48, 13.5, -48, 13, -39, 8, -39], "#8a5a2b");
		figura(u, [-12.5, -48, -7.5, -48, -8, -41, -12, -41], "#8a5a2b");

		// Planos enrollados bajo el brazo (antes del brazo de adelante)
		if (o.herramienta === "plano") {
			figura(u, [2, -62, 21, -57, 20, -53, 1, -58], "#2f6fd6");
			ctx.fillStyle = "#dbe8ff";
			ctx.beginPath();
			ctx.ellipse(20.5 * u, -55 * u, 1.3 * u, 2 * u, 0.25, 0, Math.PI * 2);
			ctx.fill();
		}

		// Brazo de adelante + mano
		figura(u, [10.5, -65, 15.5, -66, 18.5, -50.5, 14, -50], o.piel);
		ctx.fillStyle = o.piel;
		circulo(16.5 * u, -47.8 * u, 3.1 * u);
		ctx.stroke();

		if (o.herramienta === "portapapeles") {
			figura(u, [14, -57, 23, -56, 22, -43, 13, -44], "#a0703c");
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(15 * u, -54.5 * u, 6 * u, 9 * u);
			ctx.fillStyle = "#9aa3ad";
			ctx.fillRect(16 * u, -57.5 * u, 4.5 * u, 2.5 * u);
		} else if (o.herramienta === "llave") {
			figura(u, [16, -46, 18, -46, 19.5, -36, 17.5, -36], "#a3abb4");
			ctx.strokeStyle = "#a3abb4";
			ctx.lineWidth = 2 * u;
			ctx.beginPath();
			ctx.arc(18.6 * u, -34 * u, 2.4 * u, -0.6, Math.PI + 0.6, true);
			ctx.stroke();
			ctx.strokeStyle = CONTORNO;
			ctx.lineWidth = 1.3 * u;
		}

		ctx.restore();
		ctx.translate(0, respira * u);

		// Cuello y cabeza
		figura(u, [-2, -76, 3, -76, 3, -71, -2, -71], o.piel);
		ctx.fillStyle = o.piel;
		ctx.beginPath();
		ctx.ellipse(1 * u, -83.5 * u, 8.2 * u, 9 * u, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(-4.6 * u, -83 * u, 1.9 * u, 2.7 * u, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		// Pelo: mechones bajo el casco y cola de caballo (si lleva pelo largo)
		if (o.peloLargo) figura(u, [-5, -86, -10, -84, -12, -70, -8, -69, -5, -78], o.pelo);
		figura(u, [-7.5, -89, 7, -90, 8.5, -87, 5, -88.5, 1, -87, -2, -88, -5, -84, -6.5, -79, -8.5, -82], o.pelo);

		// Cara (mirando hacia adelante en 3/4)
		ctx.strokeStyle = o.pelo;
		ctx.lineWidth = 1.2 * u;
		linea(2 * u, -87.2 * u, 4.8 * u, -87.7 * u);
		linea(6.4 * u, -87.7 * u, 8.4 * u, -87 * u);
		ctx.fillStyle = CONTORNO;
		ctx.beginPath();
		ctx.ellipse(3.6 * u, -84.6 * u, 1.1 * u, 1.5 * u, 0, 0, Math.PI * 2);
		ctx.ellipse(7.4 * u, -84.6 * u, 0.95 * u, 1.4 * u, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		circulo(3.9 * u, -85.2 * u, 0.4 * u);
		circulo(7.7 * u, -85.2 * u, 0.35 * u);
		ctx.strokeStyle = "rgba(60,30,20,0.75)";
		ctx.lineWidth = 0.9 * u;
		linea(8.8 * u, -83.6 * u, 9.3 * u, -81.6 * u);
		ctx.beginPath();
		ctx.arc(5.2 * u, -80.6 * u, 2.2 * u, 0.3, Math.PI - 0.7);
		ctx.stroke();
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.3 * u;

		// Casco: cúpula, ala (más larga al frente), cresta y brillo
		ctx.fillStyle = o.casco;
		ctx.beginPath();
		ctx.ellipse(1 * u, -89 * u, 10 * u, 9 * u, 0, Math.PI, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(3.5 * u, -89 * u, 12.5 * u, 2.3 * u, -0.05, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.strokeStyle = "rgba(0,0,0,0.25)";
		ctx.lineWidth = 2 * u;
		ctx.beginPath();
		ctx.ellipse(1 * u, -89 * u, 4.5 * u, 8.5 * u, 0, Math.PI * 1.1, Math.PI * 1.9);
		ctx.stroke();
		ctx.fillStyle = "rgba(255,255,255,0.45)";
		ctx.beginPath();
		ctx.ellipse(5 * u, -95 * u, 2.2 * u, 1.3 * u, -0.3, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	// Globito de pista ("!", "E · Hablar", "↑ · Saltar"...). Más grande y con
	// un halo de luz que late, para que se vea desde lejos.
	function dibujarGlobo(x, y, texto, fondo) {
		ctx.font = `bold ${16 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		const ancho = ctx.measureText(texto).width + 22 * S;
		const alto = 28 * S;
		ctx.save();
		ctx.shadowColor = fondo;
		ctx.shadowBlur = (14 + 8 * Math.sin(tiempo * 4)) * S;
		rectRedondo(x - ancho / 2, y - alto, ancho, alto, 11 * S);
		ctx.fillStyle = fondo;
		ctx.fill();
		ctx.restore();
		ctx.lineWidth = 2 * S;
		ctx.strokeStyle = "rgba(255,255,255,0.9)";
		ctx.stroke();
		ctx.fillStyle = fondo;
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
		for (const n of npcs) {
			const pie = SUELO + 36 * S - (n.alto || 0) * S;
			const sx = n.x - camara;
			if (sx < -60 || sx > W + 60) continue;
			const a = n.apariencia;
			const o = {
				piel: a.piel,
				ropa: a.ropa,
				pantalon: a.pantalon,
				pelo: a.pelo,
				sombrero: a.sombrero,
				peloLargo: a.peloLargo,
				casco: a.casco,
				chaleco: a.chaleco,
				botas: a.botas || "#6b4424",
				herramienta: a.herramienta,
				dir: heroe.x >= n.x ? 1 : -1,
				fase: 0,
				moviendo: false,
			};
			// Con casco + chaleco usa la foto del héroe teñida con sus colores
			// (o, mientras carga, el obrero dibujado); si no, el muñequito simple.
			if (a.casco && a.chaleco) {
				if (!dibujarNpcFoto(sx, pie, n, o.dir)) dibujarObrero(sx, pie, o);
			} else dibujarPersona(sx, pie, o);

			const arriba = pie - 125 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
			if (!n.hablado) {
				dibujarGlobo(sx, arriba, "!", "#ffe066");
			} else if (estado === "jugando" && alAlcance(n, CFG.distanciaParaHablar * 1.3)) {
				dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
			}
		}
	}

	// Dibuja al héroe con fotos (constructor) en vez de vector, eligiendo la
	// pose según su estado actual. Si la foto todavía no cargó, devuelve
	// false y dibujarHeroe cae al vectorial como respaldo (igual que los
	// enemigos con dibujarEnemigoSprite).
	function dibujarHeroeSprite(x, pie, o, sprites, t) {
		// Caminando/corriendo: si hay 2da zancada (caminando2, distinta de la
		// primera), se alterna con la fase de pasos -Math.cos(o.fase)-:
		// cos = 1 pie apoyado (zancada abierta), cos = -1 pierna de paso.
		// Cerca del cambio (|cos| < ANCHO_FUNDIDO) las 2 fotos se funden, así
		// no hay un corte seco entre zancadas.
		// Corriendo (Q) se alternan las fotos de correr (corre / correPaso);
		// caminando, las piernas por código (ver pintarRig), o si no hay, las
		// fotos de zancada (caminando / caminando2).
		const recibeGolpe = o.golpeado && sprites.golpeado;
		const enMarcha = o.moviendo && !recibeGolpe && !o.agachado && !o.atacando && heroeEnSuelo();
		const fotosCorrer = enMarcha && o.corriendo && sprites.corre && sprites.correPaso && sprites.corre.cargando.elemento && sprites.correPaso.cargando.elemento;
		const [zancada1, zancada2] = fotosCorrer ? ["corre", "correPaso"] : ["caminando", "caminando2"];
		const hayZancada2 = sprites[zancada2] && sprites[zancada2] !== sprites[zancada1];
		const conRig = enMarcha && !fotosCorrer && rigListo(sprites.rig);
		const ciclo = Math.cos(o.fase);
		const ANCHO_FUNDIDO = 0.35;
		const peso2 = enMarcha && hayZancada2 && !conRig ? clamp(0.5 - ciclo / (2 * ANCHO_FUNDIDO), 0, 1) : 0;
		const pose = recibeGolpe
			? "golpeado"
			: o.agachado
			? "agachado"
			: o.atacando
			? "golpe"
			: !heroeEnSuelo()
			? "saltando"
			: o.moviendo && !conRig
			? peso2 >= 1
				? zancada2
				: zancada1
			: "quieto";
		const meta = sprites[pose];
		const el = meta.cargando.elemento;
		if (!el) return false;
		const el2 = peso2 > 0 && peso2 < 1 && sprites[zancada2].cargando.elemento;

		// Si el personaje todavía no tiene foto propia para esta pose (p.ej.
		// la Chica, que por ahora solo tiene "de pie"), se reusa la de
		// "quieto" con los mismos trucos del dibujo vectorial: un poco más
		// grande al atacar (como la embestida del murciélago) y achicada
		// verticalmente al agacharse (como el squash de dibujarPersona).
		const sinFotoPropia = pose !== "quieto" && meta === sprites.quieto;
		const embestida = pose === "golpe" && sinFotoPropia ? 1.18 : 1;
		// Agachado con foto propia (no el squash de la Chica): además de
		// quedar más bajo por su propio alto de contenido, se reduce un poco
		// más para que se vea claramente más chico/compacto, no solo bajito.
		const factorAgachado = pose === "agachado" && !sinFotoPropia ? 0.78 : 1;
		// Algunas fotos puntuales vienen dibujadas más chicas/grandes dentro de
		// su propio cuadro que las demás del mismo personaje (zoom distinto de
		// cámara al generarlas), así que con la MISMA escala de referencia
		// (quieto) se ven de tamaño distinto. Se corrige por foto, no por pose
		// -ej. el "caminando2" del Chico lo necesita, pero no todos lo tienen-.
		const factorEscalaPropio = meta.escalaExtra ?? 1;

		const s = S * 1.15;
		// Marcha (0 quieto .. 1 corriendo, ya suavizada): cuánto se inclina,
		// rebota y se estira el cuerpo. Con 2 zancadas, el cuerpo sube en la
		// pierna de paso (cos = -1) y baja al apoyar (cos = 1): un rebote por
		// zancada. Sin 2da zancada se mantiene el golpeteo de 2 por ciclo.
		const marcha = enMarcha ? Math.max(o.marcha, 0.3) : 0;
		const subida = hayZancada2 ? (1 - ciclo) / 2 : Math.abs(Math.sin(o.fase));
		// Vaivén sutil en reposo (fase de MUNDO, no de pantalla, para que no
		// tiemble con la cámara al moverse — ver nota en dibujarEnemigoSprite).
		// Con las piernas por código, el rebote sale solo de apoyar el pie más
		// bajo (postura.caida), así que no se suma otro.
		const rebote = conRig
			? 0
			: enMarcha
			? subida * (1.5 + 4.5 * marcha) * s
			: o.moviendo
			? 0
			: Math.sin(tiempo * 2 + x + camara) * 0.8 * s;
		// Squash & stretch: aplasta un poco al apoyar, estira en el aire (no
		// con las piernas por código: deformaría las piezas).
		const estiro = enMarcha && !conRig ? (subida - 0.5) * 0.06 * marcha : 0;
		// Se inclina hacia adelante al correr, con un cabeceo leve por paso.
		const inclinacion = enMarcha ? 0.13 * marcha + Math.sin(o.fase) * 0.025 * marcha : 0;
		const altoDeseado = 100 * s * embestida * factorAgachado * factorEscalaPropio;

		ctx.save();
		ctx.translate(x, pie);
		// La sombra se achica cuando el cuerpo sube.
		const sombra = 1 - (rebote / (8 * s)) * 0.25;
		ctx.fillStyle = "rgba(40,40,40,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 14 * s * sombra, 4 * s * sombra, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.translate(0, -rebote);
		ctx.scale(o.dir, 1);
		ctx.rotate(inclinacion);
		ctx.scale(1 - estiro * 0.6, 1 + estiro);
		if (pose === "agachado" && sinFotoPropia) ctx.scale(1, 0.55);

		// Gris al inicio del camino, colores vivos al llegar a Celaque — mismo
		// efecto que el dibujo vectorial (aparienciaHeroe), aplicado como
		// filtro sobre la foto en vez de mezclar colores por canal.
		if (t < 1) ctx.filter = `grayscale(${Math.round((1 - t) * 100)}%)`;

		// Escala común: se deriva SIEMPRE de la foto "quieto", no de cada pose
		// por separado. Si cada una normalizara su propio alto de contenido a
		// la misma altura final, una pose más compacta (agachado: rodillas
		// dobladas; saltando: piernas recogidas) se estiraría para alcanzar
		// esa altura completa y terminaría viéndose MÁS GRANDE -en vez de más
		// baja/corta, como debería verse un cuerpo agachado o en el aire-.
		// Con una sola escala de referencia, el ancho ya no se infla.
		const metaQuieto = sprites.quieto;
		const elQuieto = metaQuieto.cargando.elemento;
		const refMeta = elQuieto ? metaQuieto : meta;
		const refEl = elQuieto || el;
		const hRef = refEl.naturalHeight || refEl.height;
		const altoContenidoRef = (refMeta.abajo - refMeta.arriba) * hRef;
		const k = altoDeseado / altoContenidoRef;

		const pintar = (img, m, factor, alfa) => {
			const dw = (img.naturalWidth || img.width) * k * factor;
			const dh = (img.naturalHeight || img.height) * k * factor;
			ctx.globalAlpha = alfa;
			ctx.drawImage(img, -m.anclaX * dw, -m.abajo * dh, dw, dh);
		};
		if (conRig) {
			pintarRig(sprites.rig, meta, k, posturaPiernas(sprites.rig, o.fase, marcha));
		} else if (el2) {
			// Fundido cruzado sin "agujeros": la foto que sale queda opaca
			// hasta la mitad y la que entra se pinta encima; pasada la mitad,
			// la que entra ya está opaca y la de abajo se desvanece.
			pintar(el, meta, 1, Math.min(1, 2 * (1 - peso2)));
			pintar(el2, sprites[zancada2], (sprites[zancada2].escalaExtra ?? 1) / factorEscalaPropio, Math.min(1, 2 * peso2));
		} else {
			pintar(el, meta, 1, 1);
		}

		ctx.restore();
		return true;
	}

	function dibujarPolvoPasos() {
		for (const p of polvoPasos) {
			const avance = p.vida / p.dura;
			const sx = p.x - camara;
			const sy = SUELO + 38 * S - p.y * S;
			ctx.fillStyle = `rgba(150,135,110,${(0.35 * (1 - avance)).toFixed(3)})`;
			ctx.beginPath();
			ctx.arc(sx, sy - 2 * S, p.r * S * (0.6 + avance), 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function dibujarHeroe(t) {
		const o = {
			...aparienciaHeroe(personaje, t, heroe),
			agachado: heroe.agachado,
			atacando: heroe.atacando,
			golpeado: heroe.golpeado,
		};
		const x = heroe.x - camara;
		const pie = SUELO + 38 * S - heroe.y * S;
		const sprites = SPRITES_POR_PERSONAJE[personaje];
		dibujarPolvoPasos();
		const yaDibujado = sprites && dibujarHeroeSprite(x, pie, o, sprites, t);
		if (!yaDibujado) dibujarPersona(x, pie, o);
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
			marcha: pose.marcha || 0,
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
		// | oficina (adentro de un módulo)
		if (oficinaActual) {
			dibujarFondoOficina(oficinaActual);
			dibujarSueloOficina();
			dibujarPuertaSalida(oficinaActual);
			dibujarComputadora(oficinaActual);
			dibujarGuias();
			dibujarObstaculos(oficinaActual.oficina.obstaculos);
			dibujarCompanero(oficinaActual);
			dibujarHeroe(t);
			dibujarAvisos(dt);
			return;
		}
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
			dibujarIndustriaLejana(t);
			dibujarBruma(t, 0.55);
			dibujarFabricasMedias();
			dibujarBruma(t, 0.3);
		}

		if (modo === "cueva") dibujarSueloCueva();
		else if (modo === "urbano") dibujarSueloUrbano();
		else dibujarSuelo();

		if (modo === "afuera") {
			dibujarTuboEntrada(); // se pinta sobre el sendero, no antes
			dibujarFabricas();
			dibujarConos();
			dibujarMatas(false);
			dibujarAndamios();
			dibujarObstaculos(OBSTACULOS_AFUERA);
			dibujarZonaPlanos(); // tapa todo lo que hay antes de la puerta de luz
		} else if (modo === "cueva") {
			dibujarEstalagmitas(); // picos de roca detrás de todo
			dibujarCristales(); // gemas que brillan sobre el camino
			dibujarHuecos();
			dibujarObstaculos(OBSTACULOS_CUEVA); // rocas y cajas sólidas (se saltan/recorren)
			dibujarTuboSalida();
		} else if (modo === "urbano") {
			dibujarEdificiosSimples(); // relleno gris detrás
			dibujarProyectos(); // Zorzales, Astria, Céfiro
			dibujarEdificiosSalida(); // Atlas al frente
			dibujarModulos(); // un edificio por módulo de capacitación
			dibujarRejas();
		}

		dibujarGuias(); // la columna de luz queda detrás del letrero final
		if (modo === "urbano") dibujarMeta(); // el letrero solo se ve ya afuera
		dibujarNpcs();
		if (modo !== "urbano") dibujarEnemigos(); // el Guardián vive afuera, antes de LARGO
		dibujarHeroe(t);
		dibujarAvisos(dt);

		if (modo === "afuera") {
			dibujarMatas(true);
			dibujarMariposas();
			if (heroe.x > FIN_PLANOS) dibujarLluvia(dt, t);

			// Smog gris al inicio y luz cálida al final
			ctx.fillStyle = `rgba(118,122,128,${0.42 * (1 - t)})`;
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = `rgba(255,250,215,${0.08 * t})`;
			ctx.fillRect(0, 0, W, H);

			dibujarPuertaIdea();
			if (destello > 0) {
				ctx.fillStyle = `rgba(255,252,235,${0.85 * destello})`;
				ctx.fillRect(0, 0, W, H);
				destello = Math.max(0, destello - dt * 0.9);
			}
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
