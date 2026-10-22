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
	// Paleta oficial de Celaque (config.js → colores; ver manual de marca)
	const COLORES = CFG.colores || {
		verdeProfundo: "#042523",
		verdeInstitucional: "#488478",
		grisClaro: "#CCCCCC",
		beige: "#A99886",
		blanco: "#FFFFFF",
		negro: "#000000",
		verdeProfundoHover: "#063330",
		fondoVerdeClaro: "#e3eeeb",
	};
	// Tipografía oficial (Muli, cargada en style.css desde assets/fuentes/)
	const FUENTE = `"Muli", "Mulish", Arial, sans-serif`;

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
	// Un poco más de impulso que antes (sube ~175 en vez de ~150): es la
	// introducción, y mucha gente nunca ha jugado un plataformero.
	const IMPULSO_SALTO = 1080;
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
	//     (el borde del tubo es 126; un salto normal llega a ~175, así que con
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

	// Acepta "#RRGGBB" y también "rgb(r,g,b)" (lo que devuelve mezclar),
	// así se pueden mezclar colores ya mezclados.
	const cacheRgb = {};
	function hexARgb(hex) {
		if (!cacheRgb[hex]) {
			if (hex[0] === "#") {
				const n = parseInt(hex.slice(1), 16);
				cacheRgb[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
			} else {
				// No se guarda: los colores ya mezclados cambian cada cuadro
				return (hex.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
			}
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
	let W = 0, H = 0, S = 1, SUELO = 0, DPR = 1;

	function redimensionar() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		DPR = dpr;
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
	// Personaje fijo e importante de un mundo (config.js → MODULOS[].anfitrion):
	// casco blanco y chaleco verde institucional, con su nombre siempre a la vista.
	function aparienciaAnfitrion(a, k) {
		return {
			cuerpo: a.cuerpo || "chica",
			casco: "#ffffff",
			chaleco: COLORES.verdeInstitucional,
			pelo: ["#2b1a12", "#3b2414", "#1f1a17"][k % 3],
			pantalon: "#2d3a4a",
		};
	}
	// La de Talento espera en el camino, en el piso (sin andamio)
	const ANFITRION_TALENTO = (MODULOS_DATOS.find((d) => d.completoAlSalirDeLaCueva) || {}).anfitrion;
	const npcs = [
		...window.NPCS,
		...(ANFITRION_TALENTO
			? [
					{
						nombre: ANFITRION_TALENTO.nombre,
						posicion: ANFITRION_TALENTO.posicion ?? 0.08,
						dialogo: ANFITRION_TALENTO.dialogo || [`¡Hola! Soy ${ANFITRION_TALENTO.nombre}.`],
						apariencia: aparienciaAnfitrion(ANFITRION_TALENTO, 0),
						importante: true,
						sinAndamio: true,
					},
				]
			: []),
	]
		.map((d) => ({ ...d, x: d.posicion * LARGO, hablado: false, alto: 0 }))
		.sort((a, b) => a.x - b.x);

	// ---------- Andamios: cada NPC espera arriba de uno ----------
	// Plataformas de un solo sentido (como en Mario): se atraviesan saltando
	// desde abajo y se aterriza encima. Un salto sube ~175 de altura, así que
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
	npcs.filter((n) => !n.sinAndamio).forEach((n, i) => {
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
			// 0.75 y 0.7: más lentas y con menos recorrido que el diseño original,
		// para que subir sea fácil también para quien no juega seguido.
		const onda = Math.sin(tiempo * pl.vel * 0.75 + pl.fase) * pl.amp * 0.7;
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
	// Manual de marca: el logo va siempre sobre un fondo liso de buen
	// contraste (nunca degradado ni foto), sin transparencias ni deformarlo,
	// y en pantalla con al menos 20 px de alto (horizontal).
	const logoCelaque = cargarImagen(RUTA_LOGOS + "celaque-horizontal-verde-profundo.png");
	const logoCelaqueBlanco = cargarImagen(RUTA_LOGOS + "celaque-horizontal-blanco.png");
	const ALTO_MIN_LOGO = 20;
	// Interior de cada módulo: una oficina propia en una franja del mundo
	// aparte (muy lejos de la calle, para que no se mezclen), recorrida de
	// izquierda a derecha: entrada → compañero → muebles → computadora.
	const OFICINA_BASE = LARGO_META + 4000;
	const SEPARACION_OFICINAS = 4000;
	const LARGO_OFICINA = 2600;
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
	// Distancias desde la entrada. Los compañeros esperan en LUGARES_COMPANEROS
	// (entre muebles, con espacio para pararse a hablar). Dejan libre la
	// entrada y el tramo antes de la computadora (ahí van los letreros de obra
	// de la primera oficina).
	const POSICIONES_MUEBLES = [440, 600, 1060, 1240, 1680, 1860, 2300];
	// El primero te recibe (intro); los otros dicen los "comentarios" del módulo
	const LUGARES_COMPANEROS = [800, 1450, 2070];
	// Decoración que no estorba (se pasa por delante): libreros, sillones...
	const DECORACION_OFICINA = [
		{ d: 300, tipo: "librero" },
		{ d: 930, tipo: "sillon" },
		{ d: 1340, tipo: "pizarra" },
		{ d: 1570, tipo: "cafetera" },
		{ d: 1960, tipo: "librero" },
		{ d: 2190, tipo: "plantaAlta" },
		{ d: 2440, tipo: "especial" }, // propio de cada tema (maqueta, robot...)
	];
	const COLORES_PELO = ["#1f1a17", "#3b2414", "#5a2a14", "#2b1a12"];
	// Dónde se contestan las preguntas al fondo de cada oficina (config.js →
	// oficina.estacion). Las preguntas son las mismas; cambia la figurita.
	const ESTACIONES = {
		computadora: {
			lugar: "a la computadora",
			titulo: "Terminal Celaque",
			usar: "Usar computadora",
			carta: (n) => `Contesta ${n} preguntas en la Terminal Celaque.`,
			fin: "",
		},
		robot: {
			lugar: "al taller de IA",
			titulo: "Taller de IA · Arma al asistente",
			usar: "Armar al asistente",
			carta: (n) => `Arma al asistente de IA: cada una de las ${n} respuestas correctas le pone piezas.`,
			fin: "¡El asistente de IA está listo para ayudarte!",
		},
		antivirus: {
			lugar: "al laboratorio",
			titulo: "Laboratorio de Seguridad · Arma el antivirus",
			usar: "Armar el antivirus",
			carta: (n) => `Arma el antivirus: cada una de las ${n} respuestas correctas completa el escudo.`,
			fin: "¡Antivirus activado! La información está protegida.",
		},
	};
	const PIEZAS_ESTACION = 6; // partes del robot o del escudo
	function companeroOficina(d, i, k, x0) {
		if (k === 0 && d.anfitrion) {
			// El personaje fijo del mundo es quien te recibe
			return {
				nombre: d.anfitrion.nombre,
				x: x0 + LUGARES_COMPANEROS[0],
				alto: 0,
				enOficina: true,
				importante: true,
				hablado: false,
				dialogo: d.anfitrion.dialogo && d.anfitrion.dialogo.length ? d.anfitrion.dialogo : d.intro || [`¡Hola! Soy ${d.anfitrion.nombre}.`],
				apariencia: aparienciaAnfitrion(d.anfitrion, i),
			};
		}
		const datos = k === 0 ? d.companero || {} : d.comentarios[k - 1];
		const cuerpo = datos.cuerpo || ((i + k) % 2 ? "chica" : "chico");
		return {
			nombre: datos.nombre || `Equipo de ${d.nombre}`,
			x: x0 + LUGARES_COMPANEROS[k],
			alto: 0,
			enOficina: true,
			hablado: false,
			dialogo:
				k === 0
					? d.intro && d.intro.length ? d.intro : [`Bienvenido al módulo ${d.nombre}.`]
					: datos.dialogo && datos.dialogo.length ? datos.dialogo : ["¡Hola!"],
			apariencia: {
				cuerpo,
				casco: "#ffffff",
				chaleco: k === 0 ? d.color || "#00767a" : k === 1 ? COLORES.beige : COLORES.verdeInstitucional,
				pelo: COLORES_PELO[(i + k) % COLORES_PELO.length],
				pantalon: "#2d3a4a",
			},
		};
	}
	const modulos = MODULOS_DATOS.map((d, i) => {
		const x0 = OFICINA_BASE + i * SEPARACION_OFICINAS;
		const rutaLogo = d.logo || RUTA_LOGOS + "modulo-" + nombreArchivo(d.nombre) + ".png";
		const cuantos = 1 + Math.min((d.comentarios || []).length, LUGARES_COMPANEROS.length - 1);
		return {
			...d,
			indice: i,
			x: PRIMER_MODULO + i * ESPACIO_MODULO,
			completo: false,
			preguntaActual: 0,
			visitado: false, // ya se entró solo una vez al llegar a la puerta
			terminalVisitada: false,
			brillo: 0, // destello al completarlo (1 → 0)
			// Sin "logo" en config.js se busca assets/logos/modulo-<nombre>.png
			rutaLogo,
			logoImg: cargarImagen(rutaLogo),
			oficina: {
				x0,
				terminalX: x0 + LARGO_OFICINA,
				obstaculos: POSICIONES_MUEBLES.map((dist, k) => {
					const tipo = ORDEN_MUEBLES[(k + i * 3) % ORDEN_MUEBLES.length];
					return { x: x0 + dist, tipo, ...MUEBLES[tipo] };
				}),
				decoracion: DECORACION_OFICINA.map((o) => ({ x: x0 + o.d, tipo: o.tipo })),
				// Cómo se ve por dentro (config.js → oficina)
				vista: (d.oficina && d.oficina.vista) || "ciudad",
				tema: (d.oficina && d.oficina.tema) || "planos",
				edificio: (d.oficina && d.oficina.edificio) || "",
				piso: (d.oficina && d.oficina.piso) || 0,
				estacion: ESTACIONES[d.oficina && d.oficina.estacion] ? d.oficina.estacion : "computadora",
				// Compañeros: el primero dice la intro del módulo, los demás sus comentarios
				companeros: Array.from({ length: cuantos }, (_, k) => companeroOficina(d, i, k, x0)),
			},
		};
	});
	// El camino + la Cueva (se completa al salir de ella)
	const moduloTalento = modulos.find((m) => m.completoAlSalirDeLaCueva) || null;
	// El personaje fijo de cada mundo (para el mapa y la carta)
	modulos.forEach((m) => {
		const primero = m.oficina.companeros[0];
		m.anfitrionNpc = m.completoAlSalirDeLaCueva ? npcs.find((n) => n.importante) || null : primero && primero.importante ? primero : null;
	});
	// Oficina en la que está el héroe (null = afuera)
	let oficinaActual = null;

	// ---------- Letreros de obra (guías para quien nunca ha jugado) ----------
	// Caballetes amarillos con balizas que parpadean. Un solo letrero por
	// tipo: la primera vez que aparece algo nuevo (con una vez que se
	// explique alcanza). zona: "afuera" | "cueva" | "urbano" | "oficina" (con
	// su módulo). Cada tipo trae varios lugares posibles ("candidatos", de
	// preferido a menos preferido) y se ubica en el primero donde no choque
	// con nada (ver ubicarLetreros).
	const TIPOS_LETRERO = [];
	const letrero = (zona, candidatos, flecha, teclado, tactil, modulo) =>
		TIPOS_LETRERO.push({ zona, candidatos, flecha, teclado, tactil: tactil || teclado, modulo: modulo || null, x: null });

	letrero("afuera", [INICIO_X + 240], "→", "Camina con ← →", "Camina con ◀ ▶");
	// Al pie del primer escalón del primer NPC, del lado por donde se llega
	const primerNpc = npcs.find((n) => !n.sinAndamio);
	const escalones = primerNpc ? PLATAFORMAS.filter((pl) => !pl.principal && Math.abs(pl.x0 - primerNpc.x) < 420) : [];
	if (escalones.length) {
		const primero = escalones.reduce((a, b) => (b.alto0 < a.alto0 ? b : a));
		const lado = Math.sign(primero.x0 - primerNpc.x) || -1;
		letrero("afuera", [primero.x0 + lado * (primero.medioAncho + 95)], "↑", "Sube saltando hasta el !", "Sube saltando hasta el !");
	}
	letrero("afuera", OBSTACULOS_AFUERA.map((o) => o.x - 160), "↑", "Salta la barrera: Espacio", "Salta la barrera: toca Saltar");
	letrero("afuera", [LARGO - 160], "↓", "Súbete al tubo y agáchate ↓", "Súbete al tubo y toca Agachar");

	letrero("cueva", OBSTACULOS_CUEVA.map((o) => o.x - 150), "↑", "Salta encima: Espacio", "Salta encima: toca Saltar");
	letrero("cueva", HUECOS_CUEVA.map((h) => h.x - 200), "!", "¡Hueco! Corre (Q) y salta", "¡Hueco! Corre y salta");
	letrero("cueva", [LARGO_TOTAL - 230], "↓", "Salida: súbete al tubo y agáchate", "Salida: súbete al tubo y toca Agachar");

	letrero("urbano", [LARGO_TOTAL + 210], "→", "Entra a cada edificio y aprende");

	// Oficinas: solo en la primera que se visita
	const primeraOficina = modulos.find((m) => !m.completoAlSalirDeLaCueva);
	if (primeraOficina) {
		const of = primeraOficina.oficina;
		letrero("oficina", [of.x0 + 250, ...of.obstaculos.map((o) => o.x - 150)], "↑", "Salta los muebles ↑", "Salta los muebles ↑", primeraOficina);
		letrero("oficina", [of.terminalX - 230], "→", "Computadora al fondo", null, primeraOficina);
	}

	// Lo que un letrero NO puede tapar: [desde, hasta] en x de mundo. Depende
	// de S (las cosas se dibujan escaladas), así que se recalcula al cambiar
	// el tamaño de pantalla. Los enemigos no van acá: se mueren y desaparecen,
	// así que el letrero solo se oculta mientras haya uno vivo encima (ver
	// dibujarLetrerosObra).
	const tramo = (x, medio) => [x - medio, x + medio];
	function zonasOcupadas(l) {
		if (l.zona === "afuera")
			return [
				tramo(FIN_PLANOS, 110), // puerta de luz
				tramo(LARGO, 60 * S + 20), // tubo de entrada
				...OBSTACULOS_AFUERA.map((o) => tramo(o.x, o.medioAncho * S + 15)),
				...PLATAFORMAS.filter((pl) => pl.eje === "y").map((pl) => tramo(pl.x0, pl.medioAncho + 14)), // rieles del elevador
				...npcs.filter((n) => n.sinAndamio).map((n) => tramo(n.x, 40 * S)), // personaje fijo, en el piso
			];
		if (l.zona === "cueva")
			return [
				tramo(LARGO, 60 * S + 20),
				tramo(LARGO_TOTAL, 60 * S + 20), // tubo de salida
				...OBSTACULOS_CUEVA.map((o) => tramo(o.x, o.medioAncho * S + 15)),
				...HUECOS_CUEVA.map((h) => tramo(h.x, ANCHO_HUECO / 2 + 20)),
			];
		if (l.zona === "urbano")
			return [...modulos.map((m) => [m.x - 50 * S, m.x + 80 * S]), tramo(LARGO_META, 140 * S)]; // puerta + reja, letrero final
		const of = l.modulo.oficina;
		return [
			tramo(of.x0 + 70, 50 * S), // puerta de salida
			...of.companeros.map((n) => tramo(n.x, 40 * S)),
			tramo(of.terminalX, 100 * S), // computadora
			...of.obstaculos.map((o) => tramo(o.x, o.medioAncho * S + 12)),
		];
	}
	// Medio ancho real del letrero en pantalla (= mundo: 1:1 en horizontal),
	// con el texto más largo de sus dos versiones.
	function medioLetrero(l) {
		ctx.font = `700 ${14 * S}px ${FUENTE}`;
		const texto = Math.max(ctx.measureText(l.teclado).width, ctx.measureText(l.tactil).width);
		return (texto + 56 * S) / 2 + 8;
	}

	// Ubica cada tipo en su primer candidato libre (corriéndolo hasta 260 px
	// a izquierda o derecha si choca), sin encimarse con los ya ubicados.
	const LETREROS = [];
	let escalaLetreros = 0;
	function ubicarLetreros() {
		escalaLetreros = S;
		LETREROS.length = 0;
		for (const l of TIPOS_LETRERO) {
			const medio = medioLetrero(l);
			const ocupado = zonasOcupadas(l);
			const libre = (x) =>
				!ocupado.some(([a, b]) => x + medio > a && x - medio < b) &&
				!LETREROS.some((o) => o.zona === l.zona && o.modulo === l.modulo && Math.abs(o.x - x) < o.medio + medio + 16);
			l.x = null;
			for (const c of l.candidatos) {
				for (let d = 0; d <= 260 && l.x === null; d += 10) {
					if (libre(c - d)) l.x = c - d;
					else if (libre(c + d)) l.x = c + d;
				}
				if (l.x !== null) break;
			}
			if (l.x !== null) LETREROS.push(Object.assign(l, { medio }));
		}
	}

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
	// Lirios.png = Lirios.jpg sin el cielo (horneado igual que Atlas); se ve
	// por el ventanal de la oficina con vista industrial.
	const imagenLirios = cargarImagen(RUTA_EDIFICIOS + "Lirios.png");
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
	let estado = "mapa"; // mapa | jugando | dialogo | cueva | pregunta | transicion | oficina | terminal | victoria
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
		panel: $("mapa-panel"),
		reiniciarProgreso: $("btn-reiniciar-progreso"),
		ayuda: $("ayuda"),
		btnAyuda: $("btn-ayuda"),
		nombreJugador: $("nombre-jugador"),
		nombreEtiqueta: $("nombre-etiqueta"),
		victoriaNombre: $("victoria-nombre"),
		victoriaModulos: $("victoria-modulos"),
		victoriaFecha: $("victoria-fecha"),
		mapaBarra: $("mapa-barra"),
		mapaBarraTexto: $("mapa-barra-texto"),
		mapaAyuda: $("mapa-ayuda"),
		carta: $("carta"),
		cartaLogo: $("carta-logo"),
		cartaMundo: $("carta-mundo"),
		cartaTitulo: $("carta-titulo"),
		cartaModulo: $("carta-modulo"),
		cartaDescripcion: $("carta-descripcion"),
		cartaLista: $("carta-lista"),
		cartaEntrar: $("carta-entrar"),
		cartaEntrarTexto: $("carta-entrar-texto"),
		cartaVolver: $("carta-volver"),
		victoria: $("pantalla-victoria"),
		tactiles: $("controles-tactiles"),
		terminal: $("terminal"),
		terminalTitulo: $("terminal-titulo"),
		terminalProgreso: $("terminal-progreso"),
		terminalPregunta: $("terminal-pregunta"),
		terminalOpciones: $("terminal-opciones"),
		terminalPista: $("terminal-pista"),
		terminalSalir: $("terminal-salir"),
		terminalFigura: $("terminal-figura"),
	};

	// Logos en la pantalla (inicio, victoria, computadora): el oficial si ya
	// está en assets/logos/, o el recuadro "LOGO" mientras tanto.
	document.querySelectorAll(".espacio-logo[data-logo]").forEach((caja) => ponerLogo(caja, caja.dataset.logo));

	$("titulo").textContent = CFG.textos.titulo;
	$("subtitulo").textContent = CFG.textos.subtitulo;
	$("victoria-titulo").textContent = CFG.textos.victoriaTitulo;
	$("victoria-texto").textContent = CFG.textos.victoriaTexto;
	$("victoria-bienvenida").textContent = CFG.textos.bienvenida || "¡Bienvenido a Celaque!";
	$("nombre-pregunta").textContent = CFG.textos.pideNombre || "Tu nombre";
	let nombreJugador = ""; // se pide en el mapa antes de entrar al primer mundo
	document.title = CFG.textos.titulo;

	const esTactil = window.matchMedia("(pointer: coarse)").matches;

	function actualizarHud() {
		const progreso = clamp((heroe.x - INICIO_X) / (LARGO - INICIO_X), 0, 1);
		ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
		const conocidos = npcs.filter((n) => n.hablado).length;
		ui.hudTexto.textContent = `Nivel ${nivel}  ·  ${corazones()}  ·  ${CFG.textos.contadorNpcs}: ${conocidos} / ${npcs.length}`;
	}

	function actualizarHudCueva() {
		const derrotados = enemigos.filter((e) => e.derrotado).length;
		ui.hudRelleno.style.width = ((derrotados / enemigos.length) * 100).toFixed(1) + "%";
		ui.hudTexto.textContent = `Nivel ${nivel}  ·  Vidas: ${corazones()}  ·  Antivalores vencidos: ${derrotados} / ${enemigos.length}`;
	}

	// ---------- Selector de personaje ----------
	const opciones = [...document.querySelectorAll(".opcion")];

	function elegirPersonaje(clave) {
		personaje = clave;
		opciones.forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.personaje === clave)));
	}

	opciones.forEach((btn) => {
		btn.querySelector("span").textContent = CFG.personajes[btn.dataset.personaje].nombre;
		btn.addEventListener("click", () => {
			elegirPersonaje(btn.dataset.personaje);
			guardarProgreso();
		});
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
			// Ojo: un canvas nuevo mide 300x150; con dpr 2 el ancho ya "coincide"
			if (lienzo.width !== ancho * dpr || lienzo.height !== alto * dpr) {
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

	// Cada nivel se entra desde el mapa (ver "Mapa: progreso y navegación"):
	// el primero (Talento) es el camino y la Cueva; los demás, la oficina de
	// su módulo.
	function mostrarControlesNivel() {
		ui.hud.hidden = false;
		ui.tactiles.hidden = !esTactil;
	}

	function reiniciarHeroe() {
		heroe.sobre = null;
		heroe.y = 0;
		heroe.velY = 0;
		heroe.agachado = false;
		heroe.atacando = false;
		heroe.atacandoT = 0;
		heroe.golpeado = false;
		heroe.moviendo = heroe.corriendo = false;
		dentroCueva = false;
		vistaUrbana = false;
		transicion = null;
		oficinaActual = null;
	}

	// Deja el camino y la Cueva como al principio (también para repetir Talento)
	function iniciarTalento() {
		reiniciarHeroe();
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
		vidas = vidasMax();
		avisos = [];
		cruzoPlanos = false;
		destello = 0;
		petalos = [];
		estado = "jugando";
		mostrarControlesNivel();
		actualizarHud();
	}

	function iniciarOficina(m) {
		reiniciarHeroe();
		avisos = [];
		petalos = [];
		oficinaActual = m;
		m.visitado = true;
		m.terminalVisitada = m.completo; // ya completo: la computadora no se abre sola
		heroe.x = m.oficina.x0 + 170; // fuera del alcance de la puerta: Espacio salta, no sale
		heroe.dir = 1;
		camara = Math.max(0, heroe.x - W * 0.35);
		estado = "oficina";
		mostrarControlesNivel();
		actualizarHudOficina();
	}

	// Todos los módulos completos: confeti con los colores de la marca sobre
	// el mapa y la tarjeta de bienvenida con el nombre del jugador.
	const COLORES_CONFETI = [COLORES.verdeInstitucional, COLORES.beige, COLORES.blanco, COLORES.verdeProfundo, COLORES.fondoVerdeClaro];
	function ganar() {
		estado = "victoria";
		ocultarMapaUI();
		for (let i = 0; i < 120; i++) {
			petalos.push({
				x: Math.random(),
				y: -Math.random() * 0.8,
				vel: 0.08 + Math.random() * 0.12,
				giro: Math.random() * 6,
				color: COLORES_CONFETI[i % COLORES_CONFETI.length],
			});
		}
		ui.victoriaNombre.textContent = nombreJugador;
		ui.victoriaNombre.hidden = !nombreJugador;
		ui.victoriaModulos.innerHTML = "";
		modulos.forEach((m, i) => {
			const li = document.createElement("li");
			li.textContent = m.nombre;
			li.style.animationDelay = `${1 + i * 0.15}s`; // van apareciendo uno por uno
			ui.victoriaModulos.appendChild(li);
		});
		ui.victoriaFecha.textContent = new Date().toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
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
		ui.nombre.textContent = npc.importante ? `${npc.nombre} ★` : npc.nombre;
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
		// Repetir Talento ya completo tampoco: el nivel se ganó la primera vez
		if (!dlg.npc.hablado && !dlg.npc.enOficina && !(moduloTalento && moduloTalento.completo)) subirNivel();
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
	// En esta rama la calle no se usa: los módulos se eligen en el mapa. Lo
	// "urbano" (y entrarOficina desde la puerta) queda por si se vuelve a ella.
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
	// Desde el mapa se entra a la oficina del módulo (iniciarOficina): los
	// compañeros te reciben (intro y comentarios) y al fondo hay una
	// computadora con la Terminal Celaque, donde se contestan las preguntas.
	// Al terminar vuelves al mapa con el módulo completo.
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

	// Por la puerta de salida se vuelve al mapa (con el módulo completo o no)
	function salirDeOficina() {
		volverAlMapa(oficinaActual.indice, -1);
	}

	function actualizarHudOficina() {
		const of = oficinaActual.oficina;
		const progreso = clamp((heroe.x - of.x0) / (of.terminalX - of.x0), 0, 1);
		ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
		ui.hudTexto.textContent = oficinaActual.completo
			? `Módulo ${oficinaActual.nombre} ✓  ·  Vuelve a la puerta para salir`
			: `Módulo ${oficinaActual.nombre}  ·  Llega ${ESTACIONES[oficinaActual.oficina.estacion].lugar} del fondo`;
	}

	const cercaDe = (x, distancia) => Math.abs(heroe.x - x) < distancia && heroeEnSuelo() && heroe.y === 0;
	const enTerminal = () => estado === "oficina" && cercaDe(oficinaActual.oficina.terminalX - 50, 60);
	const enSalidaOficina = () => estado === "oficina" && cercaDe(oficinaActual.oficina.x0 + 70, 70);
	const companeroCerca = () =>
		(estado === "oficina" && oficinaActual.oficina.companeros.find((n) => cercaDe(n.x, CFG.distanciaParaHablar * 1.3))) || null;

	// Preguntas que se hacen en la computadora (menos que antes: config.js →
	// preguntasPorModulo, por defecto 2).
	const preguntasDe = (m) => (m.preguntas || []).slice(0, CFG.preguntasPorModulo || 2);

	function abrirTerminal(m) {
		m.terminalVisitada = true;
		m.preguntaActual = 0;
		m.aciertos = 0;
		estado = "terminal";
		heroe.moviendo = heroe.corriendo = false;
		ui.terminal.hidden = false;
		const est = m.oficina.estacion;
		ui.terminal.classList.toggle("estacion-robot", est === "robot");
		ui.terminal.classList.toggle("estacion-antivirus", est === "antivirus");
		ui.terminalFigura.hidden = est === "computadora";
		ui.terminalTitulo.textContent = est === "computadora" ? `${ESTACIONES[est].titulo} · Módulo ${m.nombre}` : ESTACIONES[est].titulo;
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
		// Robot o antivirus: la pieza nueva entra ya (ver dibujarFiguraTerminal)
		m.aciertos = m.preguntaActual + 1;
		m.ultimoAcierto = tiempo;
		const conFigura = m.oficina.estacion !== "computadora";
		setTimeout(() => {
			m.preguntaActual++;
			if (m.preguntaActual < preguntasDe(m).length) mostrarPreguntaTerminal(m);
			else terminarModulo(m);
		}, p.explicacion ? 2200 : conFigura ? 1400 : 900);
	}

	// Completar un módulo sube de nivel y abre el siguiente mundo del mapa.
	function terminarModulo(m) {
		m.desbloqueo = completarModulo(m);
		ui.terminalProgreso.textContent = "Completado";
		const fin = ESTACIONES[m.oficina.estacion].fin;
		ui.terminalPregunta.textContent = `${fin ? fin + " " : ""}¡Completaste el módulo ${m.nombre}! Subiste al nivel ${nivel}.`;
		ui.terminalOpciones.innerHTML = "";
		ui.terminalPista.textContent = "";
		ui.terminalSalir.hidden = false;
		ui.terminalSalir.focus();
	}

	function cerrarTerminal() {
		const m = oficinaActual;
		ui.terminal.hidden = true;
		document.body.classList.remove("con-dialogo");
		volverAlMapa(m.indice, m.desbloqueo);
		m.desbloqueo = -1;
	}

	// ---------- Mapa: progreso y navegación ----------
	// Vista general como la de Super Mario Land 2: un mundo (meseta) por
	// módulo alrededor de la meseta central, donde se elige el personaje.
	// Solo se entra al primero y a los ya desbloqueados (completar uno abre
	// el siguiente). Elegir un mundo acerca la vista; tocar su edificio abre
	// su carta (qué sistema es) y desde la carta se entra al nivel.
	const mapa = {
		sel: 0, // mundo señalado (flechas o clic)
		foco: -1, // mundo acercado (-1 = vista general)
		z: 0, // 0 = vista general, 1 = acercado (va hacia zObjetivo)
		zObjetivo: 0,
		carta: false,
		hover: -1,
		sacudir: [], // por mundo: lo que le queda a la sacudida del candado
		abriendo: -1, // mundo recién desbloqueado (su candado se abre)
		abrirT: 0,
		mensaje: "",
		mensajeT: 0,
		victoriaPendiente: false,
		// Ficha del héroe: camina por el mapa hasta el mundo abierto elegido
		heroeMundo: 0,
		heroeX: null,
		heroeY: null,
		fase: 0,
		moviendo: false,
		dir: 1,
		// Huevo de pascua: un delfín que salta del mar de vez en cuando
		delfin: { t: -1, x: 0, y: 0, dir: 1, proxima: 6, cx: 0, cy: 0 },
	};
	// Con el nombre de pruebas (config.js → nombrePruebas) se abren todos
	const modoPruebas = () => !!CFG.nombrePruebas && nombreJugador.toLowerCase() === CFG.nombrePruebas.toLowerCase();
	const desbloqueado = (i) => i === 0 || modoPruebas() || (!!modulos[i - 1] && modulos[i - 1].completo);
	const todosCompletos = () => modulos.length > 0 && modulos.every((m) => m.completo);
	const primerPendiente = () => Math.max(0, modulos.findIndex((m) => !m.completo));

	// Progreso guardado en este navegador. Si no se puede (modo privado o
	// almacenamiento bloqueado), el juego sigue igual y solo dura la partida.
	const CLAVE_PROGRESO = "camino-a-celaque:progreso";
	function guardarProgreso() {
		try {
			const completos = modulos.filter((m) => m.completo).map((m) => m.nombre);
			localStorage.setItem(CLAVE_PROGRESO, JSON.stringify({ completos, nivel, personaje, nombre: nombreJugador }));
		} catch (e) {
			/* sin almacenamiento */
		}
	}

	function cargarProgreso() {
		let d = null;
		try {
			d = JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || "null");
		} catch (e) {
			d = null;
		}
		if (d && Array.isArray(d.completos)) {
			modulos.forEach((m) => (m.completo = d.completos.includes(m.nombre)));
			nivel = Math.max(0, Number(d.nivel) || 0);
			vidas = vidasMax();
			if (CFG.personajes[d.personaje]) elegirPersonaje(d.personaje);
			nombreJugador = typeof d.nombre === "string" ? d.nombre.slice(0, 24) : "";
			ui.nombreJugador.value = nombreJugador;
		}
		mapa.sel = mapa.heroeMundo = primerPendiente();
	}

	// "Empezar de cero" (arriba a la derecha) borra también el nombre y el
	// personaje, para que juegue otra persona; "Jugar de nuevo" (al final) no.
	function reiniciarProgreso(todo) {
		if (todo) {
			nombreJugador = "";
			ui.nombreJugador.value = "";
			elegirPersonaje(CLAVES_PERSONAJE[0]);
		}
		modulos.forEach((m) => {
			m.completo = false;
			m.visitado = false;
			m.terminalVisitada = false;
			m.preguntaActual = 0;
			m.oficina.companeros.forEach((n) => (n.hablado = false));
		});
		nivel = 0;
		vidas = VIDAS_BASE;
		mapa.sel = mapa.heroeMundo = 0;
		mapa.abriendo = -1;
		mapa.victoriaPendiente = false;
		guardarProgreso();
		actualizarPanelMapa();
	}

	// Marca el módulo como completo (sube de nivel) y devuelve el índice del
	// mundo que se acaba de desbloquear, o -1.
	function completarModulo(m) {
		if (m.completo) return -1;
		m.completo = true;
		m.brillo = 1;
		nivel++;
		vidas = vidasMax(); // el corazón nuevo llega lleno
		avisoMapa(`¡Nivel ${nivel}! ${m.nombre} ✓`); // se ve al volver al mapa
		if (todosCompletos()) mapa.victoriaPendiente = true;
		guardarProgreso();
		return m.indice + 1 < modulos.length ? m.indice + 1 : -1;
	}

	function abrirMapa() {
		estado = "mapa";
		petalos = [];
		ui.hud.hidden = true;
		ui.tactiles.hidden = true;
		ui.victoria.hidden = true;
		ui.carta.hidden = !mapa.carta;
		actualizarPanelMapa();
	}

	// Al terminar (o salir de) un nivel: el mapa aparece acercado a ese mundo
	// y se aleja; si se desbloqueó uno nuevo, su candado se abre.
	function mostrarMapaTras(i, nuevo) {
		reiniciarHeroe();
		mapa.foco = i;
		mapa.z = 1;
		mapa.zObjetivo = 0;
		mapa.carta = false;
		mapa.sel = mapa.heroeMundo = i;
		mapa.heroeX = null;
		if (nuevo >= 0) {
			mapa.abriendo = nuevo;
			mapa.abrirT = 0;
		}
		abrirMapa();
	}

	function volverAlMapa(i, nuevo) {
		heroe.moviendo = heroe.corriendo = false;
		ui.hud.hidden = true;
		ui.tactiles.hidden = true;
		estado = "transicion";
		transicion = { t: 0, dur: 0.9, luego: () => mostrarMapaTras(i, nuevo) };
	}

	function ocultarMapaUI() {
		ui.panel.classList.add("oculto");
		ui.reiniciarProgreso.hidden = true;
		ui.btnAyuda.hidden = true;
		ui.ayuda.hidden = true;
		ui.mapaBarra.hidden = true;
		ui.mapaAyuda.hidden = true;
		ui.carta.hidden = true;
	}

	// El rectángulo central solo se ve en la vista general; la barra de
	// arriba, solo con un mundo acercado.
	function actualizarPanelMapa() {
		if (estado !== "mapa") return ocultarMapaUI();
		const general = mapa.foco < 0 && mapa.zObjetivo === 0;
		ui.panel.classList.toggle("oculto", !general);
		ui.mapaAyuda.hidden = !general;
		ui.btnAyuda.hidden = !general;
		ui.reiniciarProgreso.hidden = !general || !(modulos.some((m) => m.completo) || nombreJugador);
		const acercado = mapa.foco >= 0 && mapa.zObjetivo === 1 && !mapa.carta;
		ui.mapaBarra.hidden = !acercado;
		if (acercado) {
			const m = modulos[mapa.foco];
			const como = esTactil ? "Toca" : "Haz clic en";
			ui.mapaBarraTexto.textContent = `Mundo ${mapa.foco + 1} · ${m.nombre} — ${como} el edificio para ver su carta`;
		}
	}

	function avisoMapa(texto) {
		mapa.mensaje = texto;
		mapa.mensajeT = 2.8;
	}

	function avisoCandado(i) {
		mapa.sacudir[i] = 0.5;
		avisoMapa(`Completa «${modulos[i - 1].nombre}» para abrir este mundo`);
	}

	// Sin nombre no se entra: se señala el campo
	function faltaNombre() {
		if (nombreJugador) return false;
		ui.nombreEtiqueta.classList.remove("falta");
		void ui.nombreEtiqueta.offsetWidth; // reinicia la sacudida
		ui.nombreEtiqueta.classList.add("falta");
		ui.nombreJugador.focus();
		avisoMapa("Escribe tu nombre para empezar");
		return true;
	}

	// Cómo se juega: se abre sola la primera vez (se recuerda en el navegador)
	const CLAVE_AYUDA = "camino-a-celaque:ayuda-vista";
	function abrirAyuda() {
		ui.ayuda.hidden = false;
		$("ayuda-cerrar").focus();
	}
	function cerrarAyuda() {
		ui.ayuda.hidden = true;
		try {
			localStorage.setItem(CLAVE_AYUDA, "1");
		} catch (e) {
			/* sin almacenamiento: se volverá a mostrar */
		}
		if (!nombreJugador) ui.nombreJugador.focus();
	}
	function ayudaYaVista() {
		try {
			return localStorage.getItem(CLAVE_AYUDA) === "1";
		} catch (e) {
			return false;
		}
	}

	// Elegir un mundo: con candado se sacude; abierto, el mapa se acerca.
	function elegirMundo(i) {
		if (i < 0 || i >= modulos.length) return;
		mapa.sel = i;
		if (!desbloqueado(i)) return avisoCandado(i);
		if (faltaNombre()) return;
		mapa.heroeMundo = i;
		mapa.foco = i;
		mapa.zObjetivo = 1;
		actualizarPanelMapa();
	}

	function alejarMapa() {
		mapa.zObjetivo = 0;
		cerrarCarta();
	}

	// Flechas: en la vista general mueven la selección; acercado, pasan
	// directo al mundo de al lado (si está abierto).
	function moverSeleccionMapa(paso) {
		if (mapa.carta) return;
		const i = modulo(mapa.sel + paso, modulos.length);
		if (mapa.foco >= 0 && mapa.zObjetivo === 1) {
			if (desbloqueado(i)) elegirMundo(i);
			else avisoCandado(i);
			return;
		}
		mapa.sel = i;
		if (desbloqueado(i)) mapa.heroeMundo = i;
	}

	// Logo en una caja .espacio-logo: el oficial si el archivo existe, o el
	// recuadro "LOGO" mientras tanto.
	function ponerLogo(caja, ruta) {
		caja.dataset.logo = ruta;
		caja.classList.remove("con-logo");
		caja.textContent = "LOGO";
		const img = new Image();
		img.alt = caja.getAttribute("aria-label") || "";
		img.onload = () => {
			if (caja.dataset.logo !== ruta) return; // mientras cargaba se pidió otro
			caja.textContent = "";
			caja.classList.add("con-logo");
			caja.appendChild(img);
		};
		img.src = ruta;
	}

	function abrirCarta(i) {
		const m = modulos[i];
		mapa.carta = true;
		ui.cartaMundo.textContent = `Mundo ${i + 1} de ${modulos.length}${m.completo ? "  ·  ✓ Completado" : ""}`;
		ui.cartaTitulo.textContent = m.sistema || m.nombre;
		ui.cartaModulo.textContent = `Módulo ${m.nombre}${m.subtitulo ? " · " + m.subtitulo : ""}`;
		ui.cartaDescripcion.textContent = m.descripcion || "";
		const anfitrion = m.anfitrionNpc ? [`Te recibe ${m.anfitrionNpc.nombre} ★`] : [];
		const pasos = m.completoAlSalirDeLaCueva
			? [
					`Recorre el camino y conoce a ${npcs.length} personas de la obra.`,
					`Cruza la Cueva y vence a ${enemigos.length} antivalores (como ${enemigos.map((e) => e.antivalor).filter(Boolean).slice(0, 2).join(" y ")}) respondiendo bien.`,
				]
			: [
					`Habla con ${m.oficina.companeros.length} compañeros de la oficina.`,
					ESTACIONES[m.oficina.estacion].carta(preguntasDe(m).length),
				];
		ui.cartaLista.innerHTML = "";
		for (const texto of [...anfitrion, ...pasos]) {
			const li = document.createElement("li");
			li.textContent = texto;
			ui.cartaLista.appendChild(li);
		}
		ui.cartaEntrarTexto.textContent = m.completoAlSalirDeLaCueva ? "Empezar el camino" : "Entrar al edificio";
		ui.cartaLogo.setAttribute("aria-label", `Logo de ${m.nombre}`);
		ponerLogo(ui.cartaLogo, m.rutaLogo);
		ui.carta.hidden = false;
		actualizarPanelMapa();
		ui.cartaEntrar.focus();
	}

	function cerrarCarta() {
		mapa.carta = false;
		ui.carta.hidden = true;
		actualizarPanelMapa();
	}

	function entrarMundo(i) {
		const m = modulos[i];
		if (!m || !desbloqueado(i)) return;
		mapa.carta = false;
		ocultarMapaUI();
		estado = "transicion";
		transicion = { t: 0, dur: 0.9, luego: () => (m.completoAlSalirDeLaCueva ? iniciarTalento() : iniciarOficina(m)) };
	}

	// E / Enter / Espacio en el mapa: acercar → carta → entrar
	function accionMapa() {
		if (mapa.carta) entrarMundo(mapa.foco);
		else if (mapa.foco >= 0 && mapa.zObjetivo === 1) abrirCarta(mapa.foco);
		else elegirMundo(mapa.sel);
	}

	// Esc: cerrar la carta, o alejarse del mundo acercado
	function atrasMapa() {
		if (mapa.carta) cerrarCarta();
		else if (mapa.zObjetivo === 1) alejarMapa();
	}

	function actualizarMapa(dt) {
		const antes = mapa.z;
		mapa.z = mapa.zObjetivo > mapa.z ? Math.min(1, mapa.z + dt * 1.5) : Math.max(0, mapa.z - dt * 1.5);
		if (mapa.z === 0 && mapa.zObjetivo === 0 && mapa.foco >= 0) {
			mapa.foco = -1;
			actualizarPanelMapa();
		} else if (antes < 1 && mapa.z === 1) actualizarPanelMapa();
		for (let i = 0; i < mapa.sacudir.length; i++) if (mapa.sacudir[i] > 0) mapa.sacudir[i] = Math.max(0, mapa.sacudir[i] - dt);
		mapa.mensajeT = Math.max(0, mapa.mensajeT - dt);

		// Candado que se abre (con la vista general ya alejada)
		if (mapa.abriendo >= 0 && mapa.foco < 0) {
			const antesT = mapa.abrirT;
			mapa.abrirT += dt;
			if (antesT < 0.8 && mapa.abrirT >= 0.8) avisoMapa(`¡Se abrió el mundo ${mapa.abriendo + 1}: ${modulos[mapa.abriendo].nombre}!`);
			if (mapa.abrirT >= 1.8) {
				mapa.sel = mapa.heroeMundo = mapa.abriendo;
				mapa.abriendo = -1;
			}
		} else if (mapa.victoriaPendiente && mapa.foco < 0 && estado === "mapa") {
			mapa.victoriaPendiente = false;
			ganar();
		}

		// El delfín: salta (t de 0 a 1 en 1.6 s) y vuelve a aparecer en otro lado
		const d = mapa.delfin;
		if (d.t >= 0) {
			d.t += dt / 1.6;
			if (d.t >= 1) {
				d.t = -1;
				d.proxima = 9 + Math.random() * 12;
			}
		} else if ((d.proxima -= dt) <= 0) {
			const p = lugarDeMar();
			d.proxima = 2;
			if (p) Object.assign(d, { x: p.x, y: p.y, dir: Math.random() < 0.5 ? 1 : -1, t: 0 });
		}

		// La ficha del héroe camina hasta su mundo (en unidades del mapa)
		const q = lugarHeroeMapa(mapa.heroeMundo);
		if (mapa.heroeX === null) {
			mapa.heroeX = q.x;
			mapa.heroeY = q.y;
		}
		const dx = q.x - mapa.heroeX;
		const dy = q.y - mapa.heroeY;
		const dist = Math.hypot(dx, dy);
		mapa.moviendo = dist > 2;
		if (mapa.moviendo) {
			const paso = Math.min(dist, 520 * dt);
			mapa.heroeX += (dx / dist) * paso;
			mapa.heroeY += (dy / dist) * paso;
			if (Math.abs(dx) > 1) mapa.dir = Math.sign(dx);
			mapa.fase += dt * 10;
		}
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
	// Margen extra para aterrizar en la orilla de un andamio: quien recién
	// empieza suele saltar un poco corto o un poco largo, y así igual cae
	// parado en vez de pasar de largo.
	const MARGEN_BORDE = 26;
	function alturasPlataformaEn(x) {
		if (dentroCueva || vistaUrbana) return [];
		return PLATAFORMAS.filter((pl) => Math.abs(x - pl.x) < pl.medioAncho + MARGEN_BORDE).map((pl) => pl.alto);
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

	// (En esta versión ya no se sale a la calle de Celaque: el tubo de salida
	// lleva de vuelta al mapa, que es donde se eligen los demás módulos.)
	function salirACiudad() {
		// El camino + la Cueva son el módulo de Talento: ya está completo.
		const nuevo = moduloTalento ? completarModulo(moduloTalento) : -1;
		ui.hud.hidden = true;
		ui.tactiles.hidden = true;
		mostrarMapaTras(moduloTalento ? moduloTalento.indice : 0, nuevo);
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
		const titulo = enemigo.antivalor || enemigo.nombre;
		ui.nombre.textContent = enemigo.antivalor ? `${titulo} ✗` : titulo;
		ui.retrato.textContent = titulo.replace(/^(El|La|Los|Las)\s+/, "").charAt(0).toUpperCase();
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
		if (estado === "mapa") accionMapa();
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
		if (estado === "mapa" || estado === "dialogo") return true;
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
		// Con "Cómo se juega" abierto, Enter, Espacio o Esc lo cierran
		if (!ui.ayuda.hidden) {
			if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
				e.preventDefault();
				cerrarAyuda();
			}
			return;
		}
		// Escribiendo el nombre: las teclas son para el campo (Enter o Esc lo cierran)
		if (e.target === ui.nombreJugador) {
			if (e.key === "Enter" || e.key === "Escape") ui.nombreJugador.blur();
			return;
		}
		if (e.key === "Escape") {
			if (estado === "mapa") atrasMapa();
			return;
		}
		// En la computadora de la oficina se responde también con 1, 2, 3...
		if (estado === "terminal" && /^[1-9]$/.test(e.key)) {
			const btn = ui.terminalOpciones.children[Number(e.key) - 1];
			if (btn) btn.click();
			return;
		}
		if (TECLAS_IZQ.includes(e.key) || TECLAS_DER.includes(e.key)) {
			e.preventDefault();
			if (estado === "mapa") {
				// En el mapa, las flechas pasan de un mundo a otro
				moverSeleccionMapa(TECLAS_DER.includes(e.key) ? 1 : -1);
				return;
			}
			if (TECLAS_IZQ.includes(e.key)) entrada.izq = true;
			else entrada.der = true;
		} else if (TECLAS_CORRER.includes(e.key)) {
			entrada.correr = true;
		} else if (TECLAS_ACCION.includes(e.key)) {
			if (e.target.tagName === "BUTTON") {
				// Tarjeta de personaje enfocada en el mapa: Enter/Espacio siguen
				// siendo del mapa (acercar / carta). En otro botón, E también lo
				// presiona (Enter y Espacio ya lo hacen solos).
				if (estado === "mapa" && e.target.classList.contains("opcion")) e.target.blur();
				else {
					if (e.key === "e" || e.key === "E") {
						e.preventDefault();
						e.target.click();
					}
					return;
				}
			}
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

	// Victoria: "Jugar de nuevo" borra el progreso; "Ver el mapa" lo conserva
	$("btn-reiniciar").addEventListener("click", () => {
		reiniciarProgreso(false);
		abrirMapa();
	});
	$("btn-cambiar").addEventListener("click", abrirMapa);
	// Empezar de cero pide un segundo toque para confirmar
	let confirmarReinicio = 0;
	ui.reiniciarProgreso.addEventListener("click", () => {
		if (!ui.reiniciarProgreso.classList.contains("confirmar")) {
			ui.reiniciarProgreso.classList.add("confirmar");
			ui.reiniciarProgreso.textContent = "¿Borrar todo? Toca otra vez";
			clearTimeout(confirmarReinicio);
			confirmarReinicio = setTimeout(restaurarBotonReinicio, 3500);
			return;
		}
		clearTimeout(confirmarReinicio);
		restaurarBotonReinicio();
		reiniciarProgreso(true);
		avisoMapa("Progreso borrado: ¡a empezar de nuevo!");
	});
	function restaurarBotonReinicio() {
		ui.reiniciarProgreso.classList.remove("confirmar");
		ui.reiniciarProgreso.textContent = "↻ Empezar de cero";
	}
	ui.btnAyuda.addEventListener("click", abrirAyuda);
	$("ayuda-cerrar").addEventListener("click", cerrarAyuda);
	ui.ayuda.addEventListener("click", (e) => {
		if (e.target === ui.ayuda) cerrarAyuda();
	});
	ui.nombreJugador.addEventListener("input", () => {
		const antes = modoPruebas();
		nombreJugador = ui.nombreJugador.value.trim();
		if (!antes && modoPruebas()) avisoMapa("Modo de pruebas: todos los mundos abiertos");
		ui.nombreEtiqueta.classList.remove("falta");
		guardarProgreso();
		actualizarPanelMapa();
	});
	$("btn-mapa-volver").addEventListener("click", alejarMapa);
	ui.cartaEntrar.addEventListener("click", () => entrarMundo(mapa.foco));
	ui.cartaVolver.addEventListener("click", cerrarCarta);
	ui.carta.addEventListener("click", (e) => {
		if (e.target === ui.carta) cerrarCarta(); // clic fuera de la carta
	});

	// Mapa: clic o toque sobre una meseta. En la vista general la acerca;
	// acercado, el mismo mundo abre su carta, otro abierto pasa a ese, y el
	// agua aleja la vista.
	canvas.addEventListener("click", (e) => {
		if (estado !== "mapa" || mapa.carta) return;
		if (delfinEnPantalla(e.clientX, e.clientY)) return avisoMapa("¡Encontraste al delfín de Celaque!");
		const i = mundoEnPantalla(e.clientX, e.clientY);
		if (mapa.foco >= 0 && mapa.zObjetivo === 1) {
			if (i === mapa.foco) abrirCarta(i);
			else if (i >= 0) elegirMundo(i);
			else alejarMapa();
		} else if (i >= 0) elegirMundo(i);
	});
	canvas.addEventListener("pointermove", (e) => {
		mapa.hover = estado === "mapa" && !mapa.carta ? mundoEnPantalla(e.clientX, e.clientY) : -1;
		canvas.style.cursor = mapa.hover >= 0 ? "pointer" : "";
	});
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
				? PLATAFORMAS.find((pl) => pl.eje && pl.alto === heroe.y && Math.abs(heroe.x - pl.x) < pl.medioAncho + MARGEN_BORDE) || null
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
			// Cada compañero te habla solo la primera vez que llegas a él (en
			// orden); la computadora se abre sola la primera vez que llegas.
			const siguiente = of.companeros.find((n) => !n.hablado);
			if (siguiente && heroe.x >= siguiente.x - 100 && heroeEnSuelo()) abrirDialogo(siguiente);
			else if (!oficinaActual.terminalVisitada && enTerminal()) abrirTerminal(oficinaActual);
		}
		for (const m of modulos) m.brillo = Math.max(0, m.brillo - dt * 0.6);
		if (estado === "mapa") actualizarMapa(dt);

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

		// El sol aparece al salir de la zona de planos y cruza el cielo en arco
		// (de izquierda a derecha) a medida que el jugador avanza, hasta el
		// final de la calle de Celaque.
		const a = vistaUrbana ? 1 : suave(0.3, 0.85, t);
		if (a > 0 && heroe.x > FIN_PLANOS) {
			const avance = clamp((heroe.x - FIN_PLANOS) / (LARGO_META - FIN_PLANOS), 0, 1);
			const sx = W * (0.1 + 0.8 * avance);
			const sy = SUELO * 0.62 - Math.sin(avance * Math.PI * 0.85 + 0.25) * SUELO * 0.48;
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
		ctx.font = `${12 * S}px ${FUENTE}`;
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

		ctx.font = `italic ${22 * S}px ${FUENTE}`;
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
			ctx.font = `bold ${24 * S}px ${FUENTE}`;
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

			// Orilla luminosa + balizas en las puntas: marca bien dónde se puede
			// aterrizar (el margen de MARGEN_BORDE queda dentro del brillo).
			const pulso = 0.55 + 0.45 * Math.sin(tiempo * 4 + pl.x);
			ctx.save();
			ctx.shadowColor = "rgba(255,214,64,0.95)";
			ctx.shadowBlur = 14 * S * pulso;
			ctx.fillStyle = `rgba(255,226,110,${(0.55 + 0.4 * pulso).toFixed(3)})`;
			ctx.fillRect(sx - w - 6 * S, top - 3 * S, w * 2 + 12 * S, 4 * S);
			ctx.fillStyle = `rgba(255,170,30,${(0.6 + 0.4 * pulso).toFixed(3)})`;
			circulo(sx - w - 4 * S, top - 4 * S, 4.5 * S);
			circulo(sx + w + 4 * S, top - 4 * S, 4.5 * S);
			ctx.restore();
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


	// Dibuja el logo (si su archivo ya está) o, mientras tanto, un recuadro
	// punteado que dice "LOGO" del mismo tamaño, para ver dónde va a quedar.
	function dibujarLogoOEspacio(carga, cx, cy, ancho, alto, claro) {
		const img = carga && carga.elemento;
		if (img) {
			// Sin deformar y nunca más bajo que el mínimo del manual
			const w = img.naturalWidth || img.width;
			const h = img.naturalHeight || img.height;
			const k = Math.max(Math.min(ancho / w, alto / h), ALTO_MIN_LOGO / h);
			ctx.drawImage(img, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
			return;
		}
		ctx.save();
		const color = claro ? "rgba(255,255,255,0.85)" : conAlfa(COLORES.verdeProfundo, 0.75);
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
			vidrio.addColorStop(0, mezclar(COLORES.verdeInstitucional, "#ffffff", 0.35));
			vidrio.addColorStop(1, COLORES.verdeProfundo);
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
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(izq - 5 * S, arriba - 10 * S, ancho + 10 * S, 12 * S);

			// Logo del proyecto en la fachada, y letrero con su nombre arriba
			ctx.fillStyle = "rgba(243,239,230,0.92)";
			rectRedondo(sx - 52 * S, arriba + 28 * S, 104 * S, 66 * S, 10 * S);
			ctx.fill();
			dibujarLogoOEspacio(p.logoImg, sx, arriba + 61 * S, 92 * S, 54 * S, false);
			ctx.font = `bold ${17 * S}px ${FUENTE}`;
			const anchoLetrero = ctx.measureText(p.nombre).width + 30 * S;
			rectRedondo(sx - anchoLetrero / 2, arriba - 46 * S, anchoLetrero, 32 * S, 8 * S);
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fill();
			ctx.fillStyle = COLORES.blanco;
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
			ctx.shadowColor = conAlfa(COLORES.verdeInstitucional, 0.9);
			ctx.shadowBlur = 18 * S;
		}
		rectRedondo(x0, y0, ancho, alto, 12 * S);
		ctx.fillStyle = encendido ? COLORES.blanco : "#c9cfce";
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
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.font = `bold ${20 * S}px ${FUENTE}`;
		ctx.fillText(m.nombre, x0 + 28 * S + logo, y0 + alto * 0.38);
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.font = `${12 * S}px ${FUENTE}`;
		ctx.fillText(m.subtitulo || "", x0 + 28 * S + logo, y0 + alto * 0.72);

		// Sello de completado
		if (m.completo) {
			const cx = x0 + ancho - 4 * S;
			const cy = y0 + 4 * S;
			ctx.fillStyle = COLORES.verdeInstitucional;
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
				halo.addColorStop(0, conAlfa(COLORES.verdeInstitucional, 0.35 + 0.25 * pulso));
				halo.addColorStop(1, conAlfa(COLORES.verdeInstitucional, 0));
				ctx.fillStyle = halo;
				ctx.fillRect(sx - 200 * S, baseY - 250 * S, 400 * S, 300 * S);
			}

			ctx.fillStyle = encendido ? m.color : mezclar("#7d8384", m.color, 0.3);
			ctx.fillRect(izq, arriba, ancho, alto);
			ctx.fillStyle = "rgba(0,0,0,0.16)";
			ctx.fillRect(izq + ancho * 0.84, arriba, ancho * 0.16, alto);
			ctx.fillStyle = COLORES.verdeProfundo;
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
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(sx - anchoP / 2 - 5 * S, baseY - altoP - 5 * S, anchoP + 10 * S, altoP + 5 * S);
			ctx.save();
			if (m === pendiente) {
				ctx.shadowColor = COLORES.verdeInstitucional;
				ctx.shadowBlur = (16 + 14 * pulso) * S;
			}
			ctx.fillStyle = encendido ? "#fff1c1" : m === pendiente ? mezclar(COLORES.verdeInstitucional, "#ffffff", 0.35 + 0.4 * pulso) : "#2b3a3c";
			ctx.fillRect(sx - anchoP / 2, baseY - altoP, anchoP, altoP);
			ctx.restore();
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(sx - 1.5 * S, baseY - altoP, 3 * S, altoP);

			dibujarLetreroModulo(m, sx, arriba - 16 * S, encendido);

			// "Módulo 3 de 6" sobre la puerta
			ctx.font = `bold ${12 * S}px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = encendido ? "#fff" : "#dfe5e4";
			ctx.fillText(`Módulo ${i + 1} de ${modulos.length}`, sx, baseY - altoP - 18 * S);
			if (m === pendiente && m.visitado && estado === "urbano" && Math.abs(heroe.x - m.x) < CFG.distanciaParaHablar * 1.3) {
				dibujarGlobo(sx, baseY - altoP - 36 * S, esTactil ? "Toca Hablar para entrar" : "E · Entrar", COLORES.fondoVerdeClaro);
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
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(sx - ancho / 2 - 4 * S, piso - alto - 6 * S, 7 * S, alto + 6 * S);
			ctx.fillRect(sx + ancho / 2 - 3 * S, piso - alto - 6 * S, 7 * S, alto + 6 * S);
			ctx.fillRect(sx - ancho / 2, piso - alto, ancho, 5 * S);
			ctx.fillRect(sx - ancho / 2, piso - alto * 0.45, ancho, 4 * S);
			ctx.strokeStyle = COLORES.verdeProfundo;
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
	// La oficina está en lo alto de un edificio: todo el fondo es un ventanal
	// con la vista (cielo, nubes, montañas, la ciudad allá abajo y aves que
	// pasan) y, delante del vidrio, el resto de una oficina enorme a lo lejos,
	// borrosa, con más gente trabajando. Cada capa se mueve más lento que la
	// cámara cuanto más lejos está (parallax), medido desde la entrada de la
	// oficina (cl = cámara local) para que los números no se disparen.
	const azarVista = crearAzar(77);
	const ANCHO_VISTA = 1600; // franja de ciudad que se repite (en px a S = 1)
	const TORRES_VISTA = Array.from({ length: 24 }, (_, k) => ({
		x: k * 66 + azarVista() * 30,
		ancho: 34 + azarVista() * 42,
		alto: 0.3 + azarVista() * 0.6, // cuánto sube desde abajo hacia el horizonte
		tono: k % 4,
		luces: azarVista(),
	}));
	const NUBES_VISTA = Array.from({ length: 10 }, (_, k) => ({
		x: azarVista() * 1900,
		y: azarVista(),
		tam: 0.6 + azarVista() * 0.9,
		vel: 6 + azarVista() * 12,
		cerca: k % 3 === 0, // las cercanas pasan por delante de la ciudad, más rápido
	}));
	// Verdes y grises de la marca, aclarados por la distancia
	const TONOS_TORRE = ["#6f9a91", "#8ea6a1", "#a9b6b3", "#5c8279"];
	// Caminantes de la oficina lejana (en px a S = 1, sobre una franja de 1400)
	const CAMINANTES = [
		{ u: 120, vel: 26, v: 0 },
		{ u: 520, vel: -20, v: 1 },
		{ u: 880, vel: 18, v: 2 },
		{ u: 1240, vel: -28, v: 0 },
	];
	const COLUMNAS_OFICINA = [520, 1150, 1780, 2360];

	// Cielo de cada vista (arriba, horizonte) y color de la bruma de abajo.
	// ciudad = atardecer (IA), nubes = tan alto que solo hay nubes (Atlas)...
	const CIELOS_VISTA = {
		ciudad: ["#2f5258", "#e4cdb4", "rgba(228,205,180,0.8)"],
		construccion: ["#8fcbe6", COLORES.fondoVerdeClaro, "rgba(227,238,235,0.85)"],
		industria: ["#a3b6b3", "#eee0ca", "rgba(225,210,188,0.9)"],
		nubes: ["#3f8fca", "#e6f4fb", "rgba(255,255,255,0)"],
		montana: ["#9bd0e2", "#f0f6ee", "rgba(240,246,238,0.75)"],
	};

	// Degradados que solo cambian con el tamaño de la pantalla (y la vista)
	const cacheFondoOficina = {};
	function degradadosOficina(arriba, abajo, horizonte, vista) {
		const clave = `${vista}:${W}x${H}`;
		if (cacheFondoOficina[clave]) return cacheFondoOficina[clave];
		const colores = CIELOS_VISTA[vista] || CIELOS_VISTA.ciudad;
		const cielo = ctx.createLinearGradient(0, arriba, 0, horizonte);
		cielo.addColorStop(0, colores[0]);
		cielo.addColorStop(1, colores[1]);
		const bruma = ctx.createLinearGradient(0, horizonte, 0, abajo);
		bruma.addColorStop(0, colores[2]);
		bruma.addColorStop(1, "rgba(255,255,255,0)");
		const sol = ctx.createRadialGradient(0, 0, 4 * S, 0, 0, 120 * S);
		sol.addColorStop(0, "rgba(255,250,225,1)");
		sol.addColorStop(0.25, vista === "ciudad" ? "rgba(255,214,170,0.75)" : "rgba(255,244,200,0.7)");
		sol.addColorStop(1, "rgba(255,244,200,0)");
		const pisoLejano = ctx.createLinearGradient(0, abajo, 0, SUELO);
		pisoLejano.addColorStop(0, "#b9c4c1");
		pisoLejano.addColorStop(1, "#97a6a3");
		cacheFondoOficina[clave] = { cielo, bruma, sol, pisoLejano };
		return cacheFondoOficina[clave];
	}

	function nubeVista(x, y, r, alfa) {
		ctx.fillStyle = `rgba(255,255,255,${alfa})`;
		circulo(x, y, r);
		circulo(x + r * 0.9, y + r * 0.2, r * 0.8);
		circulo(x - r * 0.9, y + r * 0.25, r * 0.7);
		circulo(x + r * 0.2, y - r * 0.45, r * 0.75);
		ctx.fillRect(x - r * 1.5, y + r * 0.1, r * 3.1, r * 0.75);
	}

	// Cordillera: altura con senos (u = x de mundo con parallax), rellena hasta abajo
	function cordillera(abajo, base, amp, f, cl, color, semilla) {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(0, abajo);
		for (let x = 0; x <= W + 20; x += 20) {
			const u = (x + cl * f) / S;
			const y = base - (Math.sin(u * 0.004 + semilla) * 0.5 + 0.5) * amp * S - Math.sin(u * 0.013 + semilla * 2) * amp * 0.25 * S;
			ctx.lineTo(x, y);
		}
		ctx.lineTo(W + 20, abajo);
		ctx.fill();
	}

	const posNube = (n, f, cl) => modulo(n.x * S + tiempo * n.vel * S - cl * f, 1900 * S) - 200 * S;
	function nubesLejanas(arriba, alto, cl) {
		for (const n of NUBES_VISTA) if (!n.cerca) nubeVista(posNube(n, 0.1, cl), arriba + alto * (0.06 + n.y * 0.42), 26 * S * n.tam, 0.8);
	}
	function nubesCercanas(horizonte, abajo, cl) {
		for (const n of NUBES_VISTA) if (n.cerca) nubeVista(posNube(n, 0.32, cl), horizonte + (abajo - horizonte) * (0.15 + n.y * 0.5), 34 * S * n.tam, 0.9);
	}

	// Recorre las torres de la franja que se repite (parallax 0.18)
	function porTorre(cl, fn) {
		const franja = ANCHO_VISTA * S;
		const base = modulo(-cl * 0.18, franja);
		for (let rep = -1; base + rep * franja < W; rep++) {
			TORRES_VISTA.forEach((t, k) => {
				const x = base + rep * franja + t.x * S;
				const w = t.ancho * S;
				if (x + w >= -60 * S && x <= W + 60 * S) fn(t, k, x, w);
			});
		}
	}

	// La ciudad allá abajo: techos de torres. "obra" = algunas en construcción
	// con grúas; "puntas" = más altas, con antenas que parpadean (atardecer).
	function vistaTorres(horizonte, abajo, cl, modo) {
		ctx.fillStyle = modo === "puntas" ? "#b9ab9b" : "#c3d3cf";
		ctx.fillRect(0, horizonte, W, abajo - horizonte);
		const encendidas = modo === "puntas";
		porTorre(cl, (t, k, x, w) => {
			const alto = modo === "puntas" ? 0.55 + t.alto * 0.5 : t.alto;
			const top = abajo - (abajo - horizonte) * alto;
			const enObra = modo === "obra" && k % 3 === 0;
			const armazon = enObra ? (abajo - top) * 0.35 : 0;
			ctx.fillStyle = modo === "puntas" ? mezclar(TONOS_TORRE[t.tono], COLORES.verdeProfundo, 0.35) : TONOS_TORRE[t.tono];
			ctx.fillRect(x, top + armazon, w, abajo - top - armazon);
			if (enObra) {
				// Pisos de arriba sin terminar: solo la estructura
				ctx.strokeStyle = "#7d8a87";
				ctx.lineWidth = 2 * S;
				ctx.strokeRect(x, top, w, armazon);
				for (let y = top + 10 * S; y < top + armazon; y += 10 * S) linea(x, y, x + w, y);
				for (let cx = x + w / 3; cx < x + w - 1; cx += w / 3) linea(cx, top, cx, top + armazon);
			} else {
				ctx.fillStyle = "rgba(255,255,255,0.18)"; // azotea
				ctx.fillRect(x - 2 * S, top, w + 4 * S, 3 * S);
			}
			ctx.fillStyle = encendidas || t.luces > 0.5 ? "rgba(255,236,190,0.85)" : "rgba(255,255,255,0.45)";
			for (let y = top + armazon + 9 * S; y < abajo - 4 * S; y += 11 * S) {
				for (let wx = x + 5 * S; wx < x + w - 6 * S; wx += 10 * S) if (!encendidas || (wx + y) % 3 > 0.6) ctx.fillRect(wx, y, 4 * S, 4 * S);
			}
			if (modo === "puntas" && k % 2 === 0) {
				// Antena con luz roja que parpadea
				ctx.strokeStyle = "#3a4446";
				ctx.lineWidth = 2 * S;
				linea(x + w / 2, top, x + w / 2, top - 26 * S);
				if (Math.sin(tiempo * 3 + k) > 0) {
					ctx.save();
					ctx.shadowColor = "#ff5a4e";
					ctx.shadowBlur = 10 * S;
					ctx.fillStyle = "#ff5a4e";
					circulo(x + w / 2, top - 27 * S, 3 * S);
					ctx.restore();
				}
			}
			if (modo === "obra" && k % 5 === 1) dibujarGruaVista(x + w / 2, top, k);
		});
	}

	// Grúa torre: mástil, pluma y un gancho que va y viene con una viga
	function dibujarGruaVista(x, top, k) {
		const amarillo = "#ffc72c";
		const alto = 80 * S;
		ctx.strokeStyle = amarillo;
		ctx.lineWidth = 4 * S;
		linea(x, top, x, top - alto);
		ctx.lineWidth = 3 * S;
		linea(x - 110 * S, top - alto, x + 40 * S, top - alto); // pluma
		linea(x, top - alto - 16 * S, x - 90 * S, top - alto);
		linea(x, top - alto - 16 * S, x + 40 * S, top - alto);
		ctx.fillStyle = "#5e686a";
		ctx.fillRect(x + 26 * S, top - alto, 16 * S, 10 * S); // contrapeso
		const carro = x - (20 + (0.5 + 0.5 * Math.sin(tiempo * 0.5 + k)) * 80) * S;
		const baja = (30 + 14 * Math.sin(tiempo * 0.7 + k)) * S;
		ctx.strokeStyle = "#2b2b2b";
		ctx.lineWidth = 1.5 * S;
		linea(carro, top - alto, carro, top - alto + baja);
		ctx.fillStyle = "#b5524a";
		ctx.fillRect(carro - 16 * S, top - alto + baja, 32 * S, 5 * S);
	}

	// Zona industrial: naves con techo de sierra, chimeneas con humo y tanques
	const INDUSTRIA_VISTA = Array.from({ length: 16 }, (_, k) => ({ x: k * 100 + azarVista() * 40, tipo: k % 4, alto: 0.35 + azarVista() * 0.4 }));
	function vistaIndustria(horizonte, abajo, cl) {
		ctx.fillStyle = "#c9c2b2";
		ctx.fillRect(0, horizonte, W, abajo - horizonte);
		const franja = ANCHO_VISTA * S;
		const base = modulo(-cl * 0.18, franja);
		// El edificio Lirios se asoma detrás de las fábricas (un poco más lento: está más lejos)
		const lirios = imagenLirios.elemento;
		if (lirios) {
			const alto = (abajo - horizonte) * 1.35;
			const ancho = alto * (lirios.naturalWidth / lirios.naturalHeight);
			const franjaL = franja * 1.2;
			ctx.globalAlpha = 0.82; // la bruma industrial lo cubre un poco
			for (let x = modulo(W * 0.55 - cl * 0.12, franjaL) - franjaL; x < W; x += franjaL) {
				if (x + ancho >= 0) ctx.drawImage(lirios, x, abajo - alto, ancho, alto);
			}
			ctx.globalAlpha = 1;
		}
		for (let rep = -1; base + rep * franja < W; rep++) {
			for (const f of INDUSTRIA_VISTA) {
				const x = base + rep * franja + f.x * S;
				if (x < -120 * S || x > W + 120 * S) continue;
				const top = abajo - (abajo - horizonte) * f.alto;
				if (f.tipo === 0 || f.tipo === 2) {
					// Nave con techo de sierra
					const w = 90 * S;
					ctx.fillStyle = f.tipo ? "#8e9a97" : "#9c8f80";
					ctx.fillRect(x, top, w, abajo - top);
					ctx.beginPath();
					for (let k = 0; k < 4; k++) {
						ctx.moveTo(x + k * (w / 4), top);
						ctx.lineTo(x + k * (w / 4), top - 14 * S);
						ctx.lineTo(x + (k + 1) * (w / 4), top);
					}
					ctx.fill();
					ctx.fillStyle = "rgba(255,236,190,0.7)";
					for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 * S + k * 20 * S, top + 12 * S, 10 * S, 6 * S);
				} else if (f.tipo === 1) {
					// Chimenea alta a franjas, con humo que sube
					const cx = x + 20 * S;
					const arriba = top - 70 * S;
					for (let y = arriba, i = 0; y < abajo; y += 14 * S, i++) {
						ctx.fillStyle = i % 2 ? "#e9ece8" : "#b5524a";
						ctx.fillRect(cx - 7 * S, y, 14 * S, 14 * S);
					}
					for (let k = 0; k < 5; k++) {
						const t = (tiempo * 0.18 + k / 5 + f.x * 0.001) % 1;
						ctx.fillStyle = `rgba(205,200,190,${(0.6 * (1 - t)).toFixed(3)})`;
						circulo(cx + t * 46 * S, arriba - t * 110 * S, (6 + t * 22) * S);
					}
				} else {
					// Tanques
					ctx.fillStyle = "#a9b6b3";
					for (let k = 0; k < 2; k++) {
						const tx = x + k * 34 * S;
						ctx.fillRect(tx, top, 28 * S, abajo - top);
						ctx.beginPath();
						ctx.ellipse(tx + 14 * S, top, 14 * S, 6 * S, 0, Math.PI, Math.PI * 2);
						ctx.fill();
					}
				}
			}
		}
	}

	// Tan alto que solo hay nubes: un mar de nubes abajo y, a lo lejos, la
	// cima de una montaña que asoma.
	function vistaMarDeNubes(arriba, horizonte, abajo, cl) {
		ctx.fillStyle = conAlfa(COLORES.verdeInstitucional, 0.55);
		ctx.beginPath();
		const cima = W * 0.3 - cl * 0.03;
		ctx.moveTo(cima - 220 * S, horizonte + 30 * S);
		ctx.lineTo(cima - 40 * S, horizonte - 70 * S);
		ctx.lineTo(cima, horizonte - 88 * S);
		ctx.lineTo(cima + 50 * S, horizonte - 60 * S);
		ctx.lineTo(cima + 240 * S, horizonte + 30 * S);
		ctx.fill();
		const capas = [
			[horizonte - 6 * S, 30, 0.06, 4, "#dfeef5"],
			[horizonte + (abajo - horizonte) * 0.35, 44, 0.16, 7, "#f1f7fa"],
			[horizonte + (abajo - horizonte) * 0.72, 60, 0.3, 11, "#ffffff"],
		];
		// Huevo de pascua: una avioneta con letrero cruza cada tanto
		const vuelo = modulo(tiempo, 26);
		if (vuelo < 9) dibujarAvioneta(-260 * S + (vuelo / 9) * (W + 520 * S), arriba + (horizonte - arriba) * 0.35 + Math.sin(tiempo * 2) * 4 * S);
		for (const [y, r, f, vel, col] of capas) {
			const paso = r * 1.5 * S;
			const off = modulo(cl * f + tiempo * vel * S, paso);
			ctx.fillStyle = col;
			ctx.fillRect(0, y, W, abajo - y);
			for (let x = -off - paso, k = 0; x < W + paso; x += paso, k++) circulo(x, y + Math.sin(k * 1.7) * 6 * S, (r + Math.sin(k * 2.3) * r * 0.35) * S);
		}
	}

	function dibujarAvioneta(x, y) {
		const texto = "¡Bienvenido a Celaque!";
		ctx.font = `700 ${12 * S}px ${FUENTE}`;
		const ancho = ctx.measureText(texto).width + 20 * S;
		const bx = x - 70 * S - ancho;
		ctx.strokeStyle = "#5e686a";
		ctx.lineWidth = 1.2 * S;
		linea(x - 30 * S, y, bx + ancho, y + 2 * S);
		ctx.fillStyle = COLORES.beige;
		ctx.fillRect(bx, y - 9 * S, ancho, 20 * S);
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, bx + ancho / 2, y + 1 * S);
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(x - 34 * S, y - 7 * S, 56 * S, 14 * S, 7 * S);
		ctx.fill();
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.beginPath();
		ctx.moveTo(x - 30 * S, y - 4 * S);
		ctx.lineTo(x - 38 * S, y - 18 * S);
		ctx.lineTo(x - 26 * S, y - 4 * S);
		ctx.fill(); // cola
		ctx.fillRect(x - 10 * S, y - 2 * S, 16 * S, 18 * S * 0.3); // ala
		ctx.fillStyle = "#9fdcff";
		for (let k = 0; k < 3; k++) ctx.fillRect(x - 14 * S + k * 9 * S, y - 4 * S, 5 * S, 4 * S);
		ctx.fillStyle = "#5e686a";
		ctx.fillRect(x + 22 * S, y - 6 * S, 2 * S, 12 * S * (0.5 + 0.5 * Math.sin(tiempo * 40))); // hélice
	}

	// Montaña cercana: cordilleras con bosque de pinos y bruma entre ellas
	function vistaMontana(horizonte, abajo, cl) {
		cordillera(abajo, horizonte, 90, 0.05, cl, "#a9c9c0", 1);
		ctx.fillStyle = "rgba(240,246,238,0.55)";
		ctx.fillRect(0, horizonte - 30 * S, W, 50 * S);
		cordillera(abajo, horizonte + 40 * S, 70, 0.1, cl, mezclar(COLORES.verdeInstitucional, "#ffffff", 0.2), 3);
		ctx.fillStyle = "rgba(240,246,238,0.45)";
		ctx.fillRect(0, horizonte + 30 * S, W, 40 * S);
		const cercaY = horizonte + (abajo - horizonte) * 0.55;
		cordillera(abajo, cercaY, 50, 0.2, cl, mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.4), 5);
		// Pinos sobre la cordillera de adelante
		ctx.fillStyle = mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.7);
		const paso = 26 * S;
		const off = modulo(cl * 0.2, paso);
		for (let x = -off; x < W + paso; x += paso) {
			const u = (x + cl * 0.2) / S;
			const y = cercaY - (Math.sin(u * 0.004 + 5) * 0.5 + 0.5) * 50 * S - Math.sin(u * 0.013 + 10) * 12.5 * S + 6 * S;
			const h = (18 + ((Math.floor(u / 26) * 7) % 10)) * S;
			ctx.beginPath();
			ctx.moveTo(x, y - h);
			ctx.lineTo(x + 8 * S, y + 4 * S);
			ctx.lineTo(x - 8 * S, y + 4 * S);
			ctx.fill();
		}
	}

	// Lo que se ve por el ventanal (recortado al vidrio). Cambia por edificio
	// (config.js → MODULOS[].oficina.vista).
	function dibujarVistaVentanal(arriba, abajo, horizonte, g, cl, dt, vista) {
		const alto = abajo - arriba;
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, arriba, W, alto);
		ctx.clip();

		ctx.fillStyle = g.cielo;
		ctx.fillRect(0, arriba, W, alto);
		if (vista === "ciudad") {
			// Atardecer: estrellas que titilan arriba
			ctx.fillStyle = "#ffffff";
			for (let k = 0; k < 26; k++) {
				const x = modulo(k * 137 * S - cl * 0.02, W + 40 * S) - 20 * S;
				const y = arriba + ((k * 53) % 100) * 0.0028 * alto * 100 * 0.35;
				ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tiempo * 2 + k);
				ctx.fillRect(x, y, 2 * S, 2 * S);
			}
			ctx.globalAlpha = 1;
		}
		ctx.save();
		const solY = vista === "ciudad" ? horizonte - alto * 0.06 : vista === "nubes" ? arriba + alto * 0.16 : arriba + alto * 0.2;
		ctx.translate(W * 0.76 - cl * 0.02, solY);
		if (vista === "nubes") ctx.scale(1.4, 1.4);
		ctx.fillStyle = g.sol;
		ctx.fillRect(-120 * S, -120 * S, 240 * S, 240 * S);
		ctx.restore();

		if (vista === "nubes") {
			vistaMarDeNubes(arriba, horizonte, abajo, cl);
		} else if (vista === "montana") {
			nubesLejanas(arriba, alto, cl);
			vistaMontana(horizonte, abajo, cl);
			ctx.fillStyle = g.bruma;
			ctx.fillRect(0, horizonte, W, abajo - horizonte);
			nubesCercanas(horizonte, abajo, cl);
		} else {
			cordillera(horizonte, horizonte, 70, 0.04, cl, conAlfa(COLORES.verdeInstitucional, 0.35), 70);
			cordillera(horizonte, horizonte, 46, 0.08, cl, conAlfa(COLORES.verdeInstitucional, 0.55), 46);
			nubesLejanas(arriba, alto, cl);
			if (vista === "industria") vistaIndustria(horizonte, abajo, cl);
			else vistaTorres(horizonte, abajo, cl, vista === "construccion" ? "obra" : "puntas");
			ctx.fillStyle = g.bruma;
			ctx.fillRect(0, horizonte, W, abajo - horizonte);
			if (vista !== "ciudad") nubesCercanas(horizonte, abajo, cl);
		}

		dibujarAves(dt, true); // guacamayas y loros cruzan por la ventana
		ctx.restore();
	}

	// Lo que flota en el aire de cada oficina (config.js → oficina.tema):
	// planos que vuelan, engranes, documentos que suben a la nube, escudos o
	// una red de nodos. Se mueven solos y un poco con la cámara.
	const FLOTANTES = Array.from({ length: 11 }, (_, k) => ({
		u: k * 165 + azarVista() * 80,
		y: azarVista(),
		vel: 10 + azarVista() * 16,
		fase: azarVista() * 6,
		tipo: k % 2,
	}));
	function dibujarFlotantesOficina(m, cl) {
		const tema = m.oficina.tema;
		const alto = Math.max(60 * S, SUELO - 300 * S);
		const puntos = FLOTANTES.map((f) => {
			const x = modulo(f.u * S + tiempo * f.vel * S - cl * 0.9, 1800 * S) - 150 * S;
			let y = 70 * S + f.y * alto + Math.sin(tiempo * 1.2 + f.fase) * 10 * S;
			if (tema === "documentos") y = 70 * S + modulo(f.y - tiempo * 0.015 * (f.vel / 16), 1) * alto; // suben a la nube
			return { f, x, y };
		});
		ctx.save();
		ctx.globalAlpha = 0.85;
		if (tema === "ia") {
			// Red: líneas entre nodos cercanos
			ctx.lineWidth = 1.5 * S;
			for (let i = 0; i < puntos.length; i++) {
				for (let j = i + 1; j < puntos.length; j++) {
					const d = Math.hypot(puntos[i].x - puntos[j].x, puntos[i].y - puntos[j].y);
					if (d > 260 * S) continue;
					ctx.strokeStyle = conAlfa(COLORES.verdeInstitucional, 0.55 * (1 - d / (260 * S)));
					linea(puntos[i].x, puntos[i].y, puntos[j].x, puntos[j].y);
				}
			}
		}
		for (const { f, x, y } of puntos) {
			if (x < -80 * S || x > W + 80 * S) continue;
			ctx.save();
			ctx.translate(x, y);
			if (tema === "planos") {
				ctx.rotate(Math.sin(tiempo * 1.5 + f.fase) * 0.25);
				const w = 64 * S;
				const h = 44 * S;
				ctx.fillStyle = "#2c5f8e";
				ctx.fillRect(-w / 2, -h / 2, w, h);
				ctx.strokeStyle = "rgba(255,255,255,0.25)";
				ctx.lineWidth = 1 * S;
				for (let k = 1; k < 4; k++) linea(-w / 2, -h / 2 + (k * h) / 4, w / 2, -h / 2 + (k * h) / 4);
				ctx.strokeStyle = "rgba(255,255,255,0.9)";
				ctx.lineWidth = 1.6 * S;
				ctx.strokeRect(-w / 2 + 3 * S, -h / 2 + 3 * S, w - 6 * S, h - 6 * S);
				if (f.tipo) {
					// Casa con su techo
					ctx.strokeRect(-14 * S, -4 * S, 28 * S, 16 * S);
					ctx.beginPath();
					ctx.moveTo(-17 * S, -4 * S);
					ctx.lineTo(0, -15 * S);
					ctx.lineTo(17 * S, -4 * S);
					ctx.stroke();
				} else {
					// Planta de un edificio con cotas
					ctx.strokeRect(-20 * S, -12 * S, 24 * S, 22 * S);
					ctx.strokeRect(4 * S, -12 * S, 16 * S, 12 * S);
					linea(-20 * S, 15 * S, 20 * S, 15 * S);
				}
			} else if (tema === "procesos") {
				if (f.tipo) {
					ctx.rotate(tiempo * 0.8 * (f.fase > 3 ? 1 : -1));
					ctx.globalAlpha = 0.7;
					dibujarIconoMundo("engranes", 0, 0, 22 * S, f.fase > 3 ? COLORES.beige : COLORES.verdeInstitucional);
				} else {
					// Paso de un diagrama: caja → flecha → rombo
					ctx.fillStyle = COLORES.blanco;
					ctx.strokeStyle = COLORES.verdeInstitucional;
					ctx.lineWidth = 2.5 * S;
					rectRedondo(-34 * S, -12 * S, 34 * S, 24 * S, 6 * S);
					ctx.fill();
					ctx.stroke();
					linea(2 * S, 0, 24 * S, 0);
					ctx.beginPath();
					ctx.moveTo(26 * S, 0);
					ctx.lineTo(40 * S, -12 * S);
					ctx.lineTo(54 * S, 0);
					ctx.lineTo(40 * S, 12 * S);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}
			} else if (tema === "documentos") {
				if (f.tipo) {
					// Hoja con la esquina doblada
					ctx.rotate(Math.sin(tiempo + f.fase) * 0.15);
					ctx.fillStyle = COLORES.blanco;
					ctx.beginPath();
					ctx.moveTo(-16 * S, -21 * S);
					ctx.lineTo(8 * S, -21 * S);
					ctx.lineTo(16 * S, -13 * S);
					ctx.lineTo(16 * S, 21 * S);
					ctx.lineTo(-16 * S, 21 * S);
					ctx.closePath();
					ctx.fill();
					ctx.fillStyle = COLORES.verdeInstitucional;
					ctx.fillRect(-11 * S, -14 * S, 16 * S, 4 * S);
					ctx.fillStyle = COLORES.grisClaro;
					for (let k = 0; k < 4; k++) ctx.fillRect(-11 * S, -5 * S + k * 6 * S, 22 * S, 2.5 * S);
				} else {
					// Carpeta, o una nubecita
					if (f.fase > 3) {
						ctx.fillStyle = COLORES.beige;
						ctx.fillRect(-20 * S, -12 * S, 16 * S, 6 * S);
						rectRedondo(-20 * S, -8 * S, 40 * S, 26 * S, 4 * S);
						ctx.fill();
					} else dibujarIconoMundo("nube", 0, 0, 20 * S, COLORES.blanco);
				}
			} else if (tema === "seguridad") {
				const pulso = 0.5 + 0.5 * Math.sin(tiempo * 2.5 + f.fase);
				ctx.shadowColor = conAlfa(COLORES.verdeInstitucional, 0.8);
				ctx.shadowBlur = (8 + 10 * pulso) * S;
				if (f.tipo) {
					dibujarIconoMundo("escudo", 0, 0, 20 * S, COLORES.verdeProfundo);
				} else {
					ctx.strokeStyle = COLORES.grisClaro;
					ctx.lineWidth = 4 * S;
					ctx.beginPath();
					ctx.arc(0, -8 * S, 8 * S, Math.PI, Math.PI * 2);
					ctx.stroke();
					ctx.fillStyle = COLORES.beige;
					rectRedondo(-13 * S, -8 * S, 26 * S, 22 * S, 4 * S);
					ctx.fill();
					ctx.fillStyle = COLORES.verdeProfundo;
					circulo(0, 1 * S, 3 * S);
				}
			} else if (tema === "ia") {
				ctx.shadowColor = COLORES.verdeInstitucional;
				ctx.shadowBlur = 14 * S;
				if (f.tipo) {
					ctx.fillStyle = COLORES.verdeInstitucional;
					circulo(0, 0, 7 * S);
					ctx.fillStyle = COLORES.blanco;
					circulo(0, 0, 3 * S);
				} else {
					ctx.rotate(tiempo * 0.5 + f.fase);
					dibujarIconoMundo("chispa", 0, 0, 14 * S, COLORES.blanco);
				}
			}
			ctx.restore();
		}
		ctx.restore();
	}

	// Pizarra según el tema: tablero de tareas, diagrama de flujo, carpetas,
	// lista de chequeo o red neuronal. (x0, y0, w, h) = el área blanca.
	function dibujarPizarraTema(tema, x0, y0, w, h) {
		const cx = x0 + w / 2;
		ctx.lineWidth = 2 * S;
		ctx.strokeStyle = COLORES.verdeProfundo;
		ctx.fillStyle = COLORES.verdeProfundo;
		if (tema === "procesos") {
			const cajas = [
				[x0 + 10 * S, y0 + 12 * S],
				[x0 + 10 * S, y0 + 52 * S],
				[x0 + w - 42 * S, y0 + 52 * S],
			];
			ctx.fillStyle = COLORES.fondoVerdeClaro;
			for (const [x, y] of cajas) {
				ctx.fillRect(x, y, 32 * S, 20 * S);
				ctx.strokeRect(x, y, 32 * S, 20 * S);
			}
			linea(x0 + 26 * S, y0 + 32 * S, x0 + 26 * S, y0 + 52 * S);
			linea(x0 + 42 * S, y0 + 62 * S, x0 + w - 42 * S, y0 + 62 * S);
			ctx.fillStyle = "#ffe066";
			ctx.beginPath();
			ctx.moveTo(cx + 18 * S, y0 + 8 * S);
			ctx.lineTo(cx + 34 * S, y0 + 22 * S);
			ctx.lineTo(cx + 18 * S, y0 + 36 * S);
			ctx.lineTo(cx + 2 * S, y0 + 22 * S);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			linea(x0 + 42 * S, y0 + 22 * S, cx + 2 * S, y0 + 22 * S);
		} else if (tema === "documentos") {
			for (let k = 0; k < 4; k++) {
				const x = x0 + 12 * S + (k > 0 ? 18 * S : 0);
				const y = y0 + 12 * S + k * 17 * S;
				if (k > 0) linea(x0 + 20 * S, y - 8 * S, x0 + 20 * S, y + 5 * S), linea(x0 + 20 * S, y + 5 * S, x, y + 5 * S);
				ctx.fillStyle = COLORES.beige;
				ctx.fillRect(x, y, 22 * S, 12 * S);
				ctx.fillStyle = COLORES.grisClaro;
				ctx.fillRect(x + 28 * S, y + 4 * S, 50 * S, 4 * S);
			}
		} else if (tema === "seguridad") {
			for (let k = 0; k < 3; k++) {
				const y = y0 + 16 * S + k * 22 * S;
				ctx.strokeRect(x0 + 12 * S, y - 7 * S, 14 * S, 14 * S);
				ctx.strokeStyle = COLORES.verdeInstitucional;
				ctx.lineWidth = 3 * S;
				ctx.beginPath();
				ctx.moveTo(x0 + 14 * S, y);
				ctx.lineTo(x0 + 18 * S, y + 4 * S);
				ctx.lineTo(x0 + 25 * S, y - 5 * S);
				ctx.stroke();
				ctx.strokeStyle = COLORES.verdeProfundo;
				ctx.lineWidth = 2 * S;
				ctx.fillStyle = COLORES.grisClaro;
				ctx.fillRect(x0 + 34 * S, y - 2 * S, 46 * S, 4 * S);
			}
			dibujarIconoMundo("escudo", x0 + w - 22 * S, y0 + h / 2, 16 * S, COLORES.verdeProfundo);
		} else if (tema === "ia") {
			const capas = [3, 4, 2];
			const nodos = capas.map((n, c) => Array.from({ length: n }, (_, k) => [x0 + 18 * S + c * ((w - 36 * S) / 2), y0 + ((k + 1) * h) / (n + 1)]));
			ctx.strokeStyle = conAlfa(COLORES.verdeInstitucional, 0.7);
			ctx.lineWidth = 1.2 * S;
			for (let c = 0; c + 1 < nodos.length; c++) for (const a of nodos[c]) for (const b of nodos[c + 1]) linea(a[0], a[1], b[0], b[1]);
			for (const capa of nodos) {
				for (const [x, y] of capa) {
					ctx.fillStyle = COLORES.verdeInstitucional;
					circulo(x, y, 5 * S);
				}
			}
		} else {
			// Tablero de tareas (por hacer / en curso / listo)
			const notas = ["#ffe066", "#a8e6cf", "#ffd3b6", COLORES.fondoVerdeClaro];
			ctx.lineWidth = 1.5 * S;
			ctx.strokeStyle = "#9aa5a6";
			for (let c = 0; c < 3; c++) {
				const ccx = x0 + (c + 0.5) * (w / 3);
				if (c) linea(x0 + c * (w / 3), y0 + 8 * S, x0 + c * (w / 3), y0 + h - 6 * S);
				ctx.fillStyle = COLORES.verdeProfundo;
				ctx.fillRect(ccx - 14 * S, y0 + 7 * S, 28 * S, 3 * S);
				for (let n = 0; n < 3 - c + (c === 2 ? 1 : 0); n++) {
					ctx.fillStyle = notas[(c + n) % notas.length];
					ctx.fillRect(ccx - 13 * S, y0 + 16 * S + n * 20 * S, 26 * S, 16 * S);
				}
			}
		}
	}

	// Objeto propio de cada oficina, cerca de la computadora
	function dibujarEspecialOficina(tema, sx, piso) {
		if (tema === "planos") {
			// Maqueta del proyecto sobre una mesa, con su grúa
			ctx.fillStyle = "#c89b6d";
			ctx.fillRect(sx - 50 * S, piso - 56 * S, 100 * S, 8 * S);
			ctx.fillStyle = "#a07c58";
			ctx.fillRect(sx - 44 * S, piso - 48 * S, 6 * S, 48 * S);
			ctx.fillRect(sx + 38 * S, piso - 48 * S, 6 * S, 48 * S);
			ctx.fillStyle = COLORES.blanco;
			ctx.fillRect(sx - 30 * S, piso - 110 * S, 26 * S, 54 * S);
			ctx.fillRect(sx, piso - 86 * S, 24 * S, 30 * S);
			ctx.fillStyle = "#9fdcff";
			for (let y = piso - 104 * S; y < piso - 62 * S; y += 10 * S) ctx.fillRect(sx - 26 * S, y, 18 * S, 5 * S);
			ctx.strokeStyle = "#ffc72c";
			ctx.lineWidth = 3 * S;
			linea(sx + 34 * S, piso - 56 * S, sx + 34 * S, piso - 124 * S);
			linea(sx - 10 * S, piso - 124 * S, sx + 44 * S, piso - 124 * S);
			ctx.fillStyle = "#2c5f8e"; // planos enrollados
			for (let k = 0; k < 3; k++) ctx.fillRect(sx - 58 * S + k * 7 * S, piso - 30 * S - k * 4 * S, 5 * S, 30 * S + k * 4 * S);
		} else if (tema === "procesos") {
			// Banda transportadora con cajas que avanzan
			ctx.fillStyle = "#3a4446";
			rectRedondo(sx - 70 * S, piso - 40 * S, 140 * S, 14 * S, 7 * S);
			ctx.fill();
			ctx.fillRect(sx - 60 * S, piso - 28 * S, 6 * S, 28 * S);
			ctx.fillRect(sx + 54 * S, piso - 28 * S, 6 * S, 28 * S);
			ctx.fillStyle = "#c79a5b";
			for (let k = 0; k < 3; k++) {
				const x = sx - 70 * S + modulo(tiempo * 30 * S + k * 48 * S, 140 * S);
				if (x < sx + 52 * S) ctx.fillRect(x, piso - 60 * S, 20 * S, 20 * S);
			}
			ctx.save();
			ctx.translate(sx, piso - 33 * S);
			ctx.rotate(tiempo * 2);
			dibujarIconoMundo("engranes", 0, 0, 9 * S, COLORES.beige);
			ctx.restore();
		} else if (tema === "documentos") {
			// Servidor con luces que parpadean (donde vive la nube)
			ctx.fillStyle = "#2e3a3c";
			ctx.fillRect(sx - 30 * S, piso - 150 * S, 60 * S, 150 * S);
			for (let k = 0; k < 7; k++) {
				const y = piso - 140 * S + k * 20 * S;
				ctx.fillStyle = "#3f4c4e";
				ctx.fillRect(sx - 24 * S, y, 48 * S, 14 * S);
				ctx.fillStyle = Math.sin(tiempo * 5 + k * 1.7) > 0 ? "#7fd6c8" : "#2f6b61";
				circulo(sx + 16 * S, y + 7 * S, 2.5 * S);
				ctx.fillStyle = Math.sin(tiempo * 3 + k) > 0.3 ? COLORES.beige : "#5d4f42";
				circulo(sx + 8 * S, y + 7 * S, 2.5 * S);
			}
			dibujarIconoMundo("nube", sx, piso - 170 * S, 16 * S, COLORES.verdeInstitucional);
		} else if (tema === "seguridad") {
			// Consola con cámaras de vigilancia
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(sx - 56 * S, piso - 50 * S, 112 * S, 50 * S);
			for (let k = 0; k < 4; k++) {
				const x = sx - 54 * S + (k % 2) * 56 * S;
				const y = piso - 136 * S + Math.floor(k / 2) * 42 * S;
				ctx.fillStyle = "#1c2526";
				ctx.fillRect(x, y, 52 * S, 38 * S);
				ctx.fillStyle = k === Math.floor(tiempo / 2) % 4 ? "#9fd3c8" : "#5f8f86";
				ctx.fillRect(x + 3 * S, y + 3 * S, 46 * S, 32 * S);
				ctx.fillStyle = "rgba(28,37,38,0.45)";
				ctx.fillRect(x + 10 * S, y + 18 * S, 12 * S, 17 * S); // alguien caminando en la cámara
			}
			if (Math.sin(tiempo * 4) > 0) {
				ctx.fillStyle = "#ff5a4e";
				circulo(sx + 46 * S, piso - 42 * S, 3 * S);
			}
		} else if (tema === "ia") {
			// Pantallas holográficas con datos que se mueven
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(sx - 34 * S, piso - 14 * S, 68 * S, 14 * S);
			ctx.fillStyle = conAlfa("#7fd6c8", 0.14);
			ctx.beginPath();
			ctx.moveTo(sx - 28 * S, piso - 14 * S);
			ctx.lineTo(sx + 28 * S, piso - 14 * S);
			ctx.lineTo(sx + 56 * S, piso - 150 * S);
			ctx.lineTo(sx - 56 * S, piso - 150 * S);
			ctx.fill();
			for (let k = 0; k < 2; k++) {
				const x0 = sx - 50 * S + k * 52 * S;
				const y0 = piso - 140 * S + k * 40 * S + Math.sin(tiempo * 1.5 + k) * 4 * S;
				ctx.fillStyle = conAlfa("#7fd6c8", 0.3);
				ctx.fillRect(x0, y0, 48 * S, 34 * S);
				ctx.strokeStyle = conAlfa("#c9fff6", 0.8);
				ctx.lineWidth = 1.5 * S;
				ctx.strokeRect(x0, y0, 48 * S, 34 * S);
				ctx.fillStyle = conAlfa("#c9fff6", 0.85);
				for (let b = 0; b < 4; b++) {
					const h = (6 + (Math.sin(tiempo * 2 + b + k * 2) * 0.5 + 0.5) * 18) * S;
					ctx.fillRect(x0 + 6 * S + b * 10 * S, y0 + 30 * S - h, 6 * S, h);
				}
			}
		}
	}

	// Parteluces del ventanal y reflejos en el vidrio
	function dibujarMarcosVentanal(arriba, abajo, cl) {
		const paso = 230 * S;
		const off = modulo(cl * 0.55, paso);
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		for (let x = -off - paso; x < W + paso; x += paso) {
			ctx.beginPath();
			ctx.moveTo(x + paso * 0.15, abajo);
			ctx.lineTo(x + paso * 0.45, arriba);
			ctx.lineTo(x + paso * 0.62, arriba);
			ctx.lineTo(x + paso * 0.32, abajo);
			ctx.fill();
		}
		ctx.fillStyle = COLORES.verdeProfundo;
		for (let x = -off; x < W + paso; x += paso) ctx.fillRect(x - 4 * S, arriba, 8 * S, abajo - arriba);
		ctx.fillRect(0, arriba + (abajo - arriba) * 0.16, W, 4 * S);
		ctx.fillStyle = "#cfd7d4"; // alféizar
		ctx.fillRect(0, abajo - 3 * S, W, 8 * S);
	}

	// Persona a lo lejos (para la oficina borrosa): sentada o de pie
	function personaLejana(c, x, pie, ropa, piel, sentada) {
		const alto = sentada ? 40 * S : 64 * S;
		if (!sentada) {
			c.fillStyle = "#3a4446";
			c.fillRect(x - 5 * S, pie - 26 * S, 4 * S, 26 * S);
			c.fillRect(x + 1 * S, pie - 26 * S, 4 * S, 26 * S);
		}
		const torsoAbajo = sentada ? pie : pie - 24 * S;
		c.fillStyle = ropa;
		c.beginPath();
		c.moveTo(x - 9 * S, torsoAbajo);
		c.lineTo(x - 8 * S, pie - alto + 14 * S);
		c.quadraticCurveTo(x, pie - alto + 8 * S, x + 8 * S, pie - alto + 14 * S);
		c.lineTo(x + 9 * S, torsoAbajo);
		c.fill();
		c.fillStyle = piel;
		c.beginPath();
		c.arc(x, pie - alto + 4 * S, 7 * S, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#2b1a12";
		c.beginPath();
		c.arc(x, pie - alto + 1.5 * S, 7 * S, Math.PI, Math.PI * 2);
		c.fill();
	}

	// La oficina lejana se dibuja una sola vez por tamaño de pantalla y se
	// desenfoca (filtro blur); así cada cuadro solo copia la imagen.
	let cacheOficinaLejana = null;
	function oficinaLejana() {
		if (cacheOficinaLejana && cacheOficinaLejana.S === S) return cacheOficinaLejana;
		const ROPAS = [COLORES.verdeProfundo, COLORES.verdeInstitucional, COLORES.beige, "#e9ece8", "#3c63b8", "#b5524a"];
		const PIELES = ["#d9a07a", "#c99468", "#e0b08a", "#b98458"];
		const az = crearAzar(31);
		const borroso = (ancho, alto, dibujo) => {
			const crudo = document.createElement("canvas");
			crudo.width = ancho;
			crudo.height = alto;
			dibujo(crudo.getContext("2d"));
			const final = document.createElement("canvas");
			final.width = ancho;
			final.height = alto;
			const f = final.getContext("2d");
			f.filter = `blur(${(2.2 * S).toFixed(1)}px)`; // donde no hay filtro se ve nítido, igual sirve
			f.drawImage(crudo, 0, 0);
			return final;
		};
		const ancho = Math.round(1200 * S);
		const alto = Math.round(120 * S);
		const lienzo = borroso(ancho, alto, (c) => {
			const piso = alto - 6 * S;
			for (let k = 0; k < 8; k++) {
				const x = k * 150 * S + 20 * S;
				const n = 1 + Math.floor(az() * 2);
				for (let p = 0; p < n; p++) {
					personaLejana(c, x + (p ? 96 : 12) * S, piso - 26 * S, ROPAS[Math.floor(az() * ROPAS.length)], PIELES[Math.floor(az() * PIELES.length)], true);
				}
				if (az() < 0.4) personaLejana(c, x + 128 * S, piso, ROPAS[Math.floor(az() * ROPAS.length)], PIELES[Math.floor(az() * PIELES.length)], false);
				// Isla de escritorios con dos monitores encendidos
				c.fillStyle = "#cfd6d3";
				c.fillRect(x, piso - 30 * S, 110 * S, 6 * S);
				c.fillStyle = "#8f9b98";
				c.fillRect(x + 6 * S, piso - 24 * S, 5 * S, 24 * S);
				c.fillRect(x + 99 * S, piso - 24 * S, 5 * S, 24 * S);
				for (const mx of [x + 28 * S, x + 60 * S]) {
					c.fillStyle = "#1c2526";
					c.fillRect(mx, piso - 54 * S, 24 * S, 19 * S);
					c.fillStyle = "rgba(140,210,195,0.95)";
					c.fillRect(mx + 2 * S, piso - 52 * S, 20 * S, 15 * S);
					c.fillStyle = "#1c2526";
					c.fillRect(mx + 10 * S, piso - 35 * S, 4 * S, 5 * S);
				}
				if (k % 3 === 1) {
					c.fillStyle = "#3f9b5a";
					c.beginPath();
					c.ellipse(x - 8 * S, piso - 40 * S, 12 * S, 22 * S, 0, 0, Math.PI * 2);
					c.fill();
					c.fillStyle = "#e9e3d6";
					c.fillRect(x - 16 * S, piso - 20 * S, 16 * S, 20 * S);
				}
			}
		});
		const caminantes = [0, 1, 2].map((v) =>
			borroso(Math.round(40 * S), Math.round(80 * S), (c) => personaLejana(c, 20 * S, 76 * S, ROPAS[(v * 2 + 1) % ROPAS.length], PIELES[v], false))
		);
		cacheOficinaLejana = { S, lienzo, caminantes };
		return cacheOficinaLejana;
	}

	function dibujarOficinaLejana(abajo, g, cl, dt) {
		ctx.fillStyle = g.pisoLejano;
		ctx.fillRect(0, abajo, W, SUELO - abajo);
		const lejana = oficinaLejana();
		const ancho = lejana.lienzo.width;
		const alto = lejana.lienzo.height;
		// Fila más lejana (más chica, más tenue) y fila cercana
		for (const [f, k, alfa, pie] of [
			[0.42, 0.62, 0.6, SUELO - 26 * S],
			[0.6, 1, 0.9, SUELO - 2 * S],
		]) {
			ctx.globalAlpha = alfa;
			const w = ancho * k;
			for (let x = -modulo(cl * f, w); x < W; x += w) ctx.drawImage(lejana.lienzo, x, pie - alto * k, w, alto * k);
			ctx.globalAlpha = 1;
		}
		// Gente caminando entre los escritorios
		const franja = 1400 * S;
		ctx.globalAlpha = 0.85;
		for (const c of CAMINANTES) {
			c.u = modulo(c.u + c.vel * dt, 1400);
			const x = modulo(c.u * S - cl * 0.6, franja) - 100 * S;
			if (x < -50 * S || x > W + 50 * S) continue;
			const img = lejana.caminantes[c.v];
			const rebote = Math.abs(Math.sin(tiempo * 7 + c.u)) * 2 * S;
			ctx.save();
			ctx.translate(x, SUELO - 4 * S - rebote);
			ctx.scale(Math.sign(c.vel), 1);
			ctx.drawImage(img, -img.width / 2, -img.height);
			ctx.restore();
		}
		ctx.globalAlpha = 1;
	}

	function dibujarFondoOficina(m, dt) {
		const of = m.oficina;
		const cl = camara - of.x0;
		const arribaV = 34 * S; // el vidrio empieza bajo el techo...
		const abajoV = SUELO - 46 * S; // ...y termina en el alféizar lejano
		const horizonte = arribaV + (abajoV - arribaV) * 0.56;
		const g = degradadosOficina(arribaV, abajoV, horizonte, of.vista);
		dibujarVistaVentanal(arribaV, abajoV, horizonte, g, cl, dt, of.vista);
		dibujarMarcosVentanal(arribaV, abajoV, cl);
		dibujarOficinaLejana(abajoV, g, cl, dt);

		// Techo con lámparas que brillan
		ctx.fillStyle = "#d4d9d6";
		ctx.fillRect(0, 0, W, 34 * S);
		for (let x = of.x0 + 120; x < of.terminalX + 200; x += 300) {
			const sx = x - camara;
			if (sx < -150 || sx > W + 150) continue;
			const luz = ctx.createLinearGradient(0, 34 * S, 0, 260 * S);
			luz.addColorStop(0, "rgba(255,255,235,0.45)");
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

		dibujarColumnasOficina(m);
		dibujarFlotantesOficina(m, cl);

		// Paredes de los extremos
		ctx.fillStyle = COLORES.verdeProfundo;
		const izq = of.x0 - camara;
		if (izq > 0) ctx.fillRect(0, 0, izq, H);
		const der = of.terminalX + 140 - camara;
		if (der < W) ctx.fillRect(der, 0, W - der, H);
	}

	// Columnas de la oficina: con el logo de Celaque, un afiche del módulo
	// o un reloj. Van al frente (se mueven con la cámara, como los muebles).
	function dibujarColumnasOficina(m) {
		const of = m.oficina;
		const piso = SUELO + 40 * S;
		COLUMNAS_OFICINA.forEach((d, k) => {
			const sx = of.x0 + d - camara;
			if (sx < -200 || sx > W + 200) return;
			const ancho = 54 * S;
			ctx.fillStyle = "#e6eae7";
			ctx.fillRect(sx - ancho / 2, 30 * S, ancho, piso - 30 * S);
			ctx.fillStyle = "rgba(0,0,0,0.08)";
			ctx.fillRect(sx + ancho * 0.22, 30 * S, ancho * 0.28, piso - 30 * S);
			ctx.fillStyle = m.color;
			ctx.fillRect(sx - ancho / 2, piso - 16 * S, ancho, 16 * S);

			const tipo = k % 3;
			if (tipo === 0) {
				// Placa blanca lisa detrás del logo (el manual pide fondo liso)
				const cy = 140 * S;
				ctx.fillStyle = COLORES.blanco;
				rectRedondo(sx - 130 * S, cy - 34 * S, 260 * S, 68 * S, 10 * S);
				ctx.fill();
				ctx.strokeStyle = COLORES.grisClaro;
				ctx.lineWidth = 1.5 * S;
				ctx.stroke();
				dibujarLogoOEspacio(logoCelaque, sx, cy, 230 * S, 42 * S, false);
				ctx.fillStyle = COLORES.verdeProfundo;
				rectRedondo(sx - 80 * S, cy + 42 * S, 160 * S, 26 * S, 8 * S);
				ctx.fill();
				ctx.fillStyle = COLORES.blanco;
				ctx.font = `700 ${14 * S}px ${FUENTE}`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(`Módulo ${m.nombre}`, sx, cy + 55 * S);
			} else if (tipo === 1) {
				// Afiche del sistema del módulo
				const w = 132 * S;
				const h = 164 * S;
				const y0 = 96 * S;
				ctx.fillStyle = m.color;
				rectRedondo(sx - w / 2, y0, w, h, 10 * S);
				ctx.fill();
				ctx.fillStyle = COLORES.blanco;
				circulo(sx, y0 + 56 * S, 34 * S);
				dibujarIconoMundo(m.icono, sx, y0 + 56 * S, 22 * S, m.color);
				const texto = m.sistema || m.nombre;
				let tam = 16;
				ctx.font = `700 ${tam * S}px ${FUENTE}`;
				while (tam > 9 && ctx.measureText(texto).width > w - 16 * S) ctx.font = `700 ${--tam * S}px ${FUENTE}`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(texto, sx, y0 + 112 * S);
				ctx.font = `400 ${11 * S}px ${FUENTE}`;
				if (m.subtitulo !== texto) ctx.fillText(m.subtitulo || "", sx, y0 + 136 * S, w - 12 * S);
			} else {
				// Reloj de pared con la hora real
				const cy = 130 * S;
				const r = 30 * S;
				ctx.fillStyle = COLORES.blanco;
				circulo(sx, cy, r);
				ctx.strokeStyle = COLORES.verdeProfundo;
				ctx.lineWidth = 4 * S;
				ctx.beginPath();
				ctx.arc(sx, cy, r, 0, Math.PI * 2);
				ctx.stroke();
				const ahora = new Date();
				const horas = ((ahora.getHours() % 12) + ahora.getMinutes() / 60) * (Math.PI / 6);
				const minutos = ahora.getMinutes() * (Math.PI / 30);
				const segundos = ahora.getSeconds() * (Math.PI / 30);
				ctx.lineCap = "round";
				for (const [ang, largo, grosor, col] of [
					[horas, 0.5, 4, COLORES.verdeProfundo],
					[minutos, 0.75, 3, COLORES.verdeProfundo],
					[segundos, 0.8, 1.5, COLORES.verdeInstitucional],
				]) {
					ctx.strokeStyle = col;
					ctx.lineWidth = grosor * S;
					linea(sx, cy, sx + Math.sin(ang) * r * largo, cy - Math.cos(ang) * r * largo);
				}
				ctx.lineCap = "butt";
			}
		});
	}

	// Decoración del piso (no estorba: se pasa por delante)
	function dibujarDecoracionOficina(m) {
		const piso = SUELO + 40 * S;
		for (const o of m.oficina.decoracion) {
			const sx = o.x - camara;
			if (sx < -160 || sx > W + 160) continue;
			if (o.tipo === "librero") {
				const w = 74 * S;
				const h = 156 * S;
				ctx.fillStyle = "#8a6a4a";
				ctx.fillRect(sx - w / 2, piso - h, w, h);
				ctx.fillStyle = "#6f5238";
				for (let k = 0; k < 4; k++) {
					const y = piso - h + 8 * S + k * 37 * S;
					ctx.fillRect(sx - w / 2 + 5 * S, y + 28 * S, w - 10 * S, 4 * S);
					const colores = [COLORES.verdeProfundo, COLORES.beige, COLORES.verdeInstitucional, "#e9ece8", "#c79a5b"];
					for (let b = 0; b < 6; b++) {
						ctx.fillStyle = colores[(b + k * 2) % colores.length];
						const alto = (18 + ((b * 7 + k * 3) % 9)) * S;
						ctx.fillRect(sx - w / 2 + 8 * S + b * 10 * S, y + 28 * S - alto, 8 * S, alto);
					}
					ctx.fillStyle = "#6f5238";
				}
			} else if (o.tipo === "sillon") {
				ctx.fillStyle = COLORES.verdeInstitucional;
				rectRedondo(sx - 60 * S, piso - 58 * S, 120 * S, 30 * S, 10 * S); // respaldo
				ctx.fill();
				ctx.fillStyle = mezclar(COLORES.verdeInstitucional, "#ffffff", 0.15);
				rectRedondo(sx - 56 * S, piso - 34 * S, 112 * S, 20 * S, 7 * S); // cojines
				ctx.fill();
				ctx.fillStyle = COLORES.verdeProfundo;
				rectRedondo(sx - 66 * S, piso - 44 * S, 16 * S, 34 * S, 6 * S);
				ctx.fill();
				rectRedondo(sx + 50 * S, piso - 44 * S, 16 * S, 34 * S, 6 * S);
				ctx.fill();
				ctx.fillRect(sx - 54 * S, piso - 12 * S, 6 * S, 12 * S);
				ctx.fillRect(sx + 48 * S, piso - 12 * S, 6 * S, 12 * S);
			} else if (o.tipo === "pizarra") {
				// Pizarra en su caballete; lo que tiene escrito depende del tema
				const w = 130 * S;
				const h = 86 * S;
				const y0 = piso - 150 * S;
				ctx.strokeStyle = "#5e686a";
				ctx.lineWidth = 4 * S;
				linea(sx - w * 0.35, y0 + h, sx - w * 0.42, piso);
				linea(sx + w * 0.35, y0 + h, sx + w * 0.42, piso);
				ctx.fillStyle = COLORES.blanco;
				ctx.fillRect(sx - w / 2, y0, w, h);
				ctx.strokeStyle = "#9aa5a6";
				ctx.lineWidth = 3 * S;
				ctx.strokeRect(sx - w / 2, y0, w, h);
				ctx.lineWidth = 1.5 * S;
				dibujarPizarraTema(m.oficina.tema, sx - w / 2, y0, w, h);
			} else if (o.tipo === "cafetera") {
				ctx.fillStyle = "#c89b6d";
				ctx.fillRect(sx - 40 * S, piso - 64 * S, 80 * S, 64 * S);
				ctx.fillStyle = "#a07c58";
				ctx.fillRect(sx - 36 * S, piso - 56 * S, 34 * S, 50 * S);
				ctx.fillRect(sx + 2 * S, piso - 56 * S, 34 * S, 50 * S);
				ctx.fillStyle = "#2e3a3c"; // máquina de café
				rectRedondo(sx - 30 * S, piso - 106 * S, 34 * S, 42 * S, 4 * S);
				ctx.fill();
				ctx.fillStyle = "#ff7a3d";
				circulo(sx - 20 * S, piso - 96 * S, 2.5 * S);
				ctx.fillStyle = COLORES.blanco; // tazas
				ctx.fillRect(sx + 12 * S, piso - 76 * S, 10 * S, 12 * S);
				ctx.fillStyle = COLORES.verdeInstitucional;
				ctx.fillRect(sx + 26 * S, piso - 76 * S, 10 * S, 12 * S);
				ctx.strokeStyle = "rgba(255,255,255,0.6)"; // vapor
				ctx.lineWidth = 2 * S;
				for (let k = 0; k < 2; k++) {
					const vx = sx + 17 * S + k * 14 * S;
					const ola = Math.sin(tiempo * 3 + k) * 3 * S;
					ctx.beginPath();
					ctx.moveTo(vx, piso - 80 * S);
					ctx.quadraticCurveTo(vx + ola, piso - 90 * S, vx - ola, piso - 100 * S);
					ctx.stroke();
				}
			} else if (o.tipo === "plantaAlta") {
				ctx.fillStyle = "#2f8a4c";
				for (let k = -3; k <= 3; k++) {
					ctx.beginPath();
					ctx.ellipse(sx + k * 8 * S, piso - 90 * S + Math.abs(k) * 9 * S, 9 * S, 34 * S, k * 0.28, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.fillStyle = COLORES.beige;
				ctx.beginPath();
				ctx.moveTo(sx - 24 * S, piso - 46 * S);
				ctx.lineTo(sx + 24 * S, piso - 46 * S);
				ctx.lineTo(sx + 18 * S, piso);
				ctx.lineTo(sx - 18 * S, piso);
				ctx.fill();
			} else if (o.tipo === "especial") {
				dibujarEspecialOficina(m.oficina.tema, sx, piso);
			} else if (o.tipo === "lampara") {
				ctx.strokeStyle = "#3a4446";
				ctx.lineWidth = 4 * S;
				linea(sx, piso, sx, piso - 140 * S);
				ctx.fillStyle = "#3a4446";
				ctx.fillRect(sx - 16 * S, piso - 4 * S, 32 * S, 4 * S);
				ctx.save();
				ctx.shadowColor = "rgba(255,240,190,0.9)";
				ctx.shadowBlur = 30 * S;
				ctx.fillStyle = "#fff1c1";
				ctx.beginPath();
				ctx.moveTo(sx - 14 * S, piso - 150 * S);
				ctx.lineTo(sx + 14 * S, piso - 150 * S);
				ctx.lineTo(sx + 24 * S, piso - 124 * S);
				ctx.lineTo(sx - 24 * S, piso - 124 * S);
				ctx.fill();
				ctx.restore();
			}
		}
	}

	function dibujarSueloOficina(m) {
		const piso = ctx.createLinearGradient(0, SUELO, 0, H);
		piso.addColorStop(0, "#7a8b88");
		piso.addColorStop(1, "#56625f");
		ctx.fillStyle = piso;
		ctx.fillRect(0, SUELO, W, H - SUELO);
		ctx.fillStyle = m.color; // borde de la alfombra con el color del módulo
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
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - 40 * S, piso - 130 * S, 80 * S, 130 * S);
		ctx.fillStyle = "#b9d9d5";
		ctx.fillRect(sx - 33 * S, piso - 123 * S, 66 * S, 123 * S);
		ctx.fillStyle = COLORES.verdeInstitucional;
		rectRedondo(sx - 30 * S, piso - 156 * S, 60 * S, 22 * S, 5 * S);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = `bold ${12 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("SALIDA", sx, piso - 145 * S);
		// Letrero del edificio y el piso (ej. "Torre Atlas · Piso 40")
		const of = m.oficina;
		if (of.edificio) {
			const texto = of.piso ? `${of.edificio} · Piso ${of.piso}` : of.edificio;
			ctx.font = `700 ${13 * S}px ${FUENTE}`;
			const ancho = ctx.measureText(texto).width + 24 * S;
			const lx = sx + Math.max(0, ancho / 2 - 40 * S); // que no quede pegado a la pared
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(lx - ancho / 2, piso - 232 * S, ancho, 26 * S, 8 * S);
			ctx.fill();
			ctx.fillStyle = COLORES.blanco;
			ctx.fillText(texto, lx, piso - 219 * S);
		}
		if (estado === "oficina" && enSalidaOficina()) {
			dibujarGlobo(sx, piso - 170 * S, esTactil ? "Toca Hablar: volver al mapa" : "E · Volver al mapa", COLORES.fondoVerdeClaro);
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
			ctx.fillStyle = COLORES.verdeInstitucional;
			ctx.fillRect(sx + w * 0.45, topY - 10 * S, 9 * S, 10 * S);
		} else if (o.tipo === "silla") {
			ctx.fillStyle = "#2e3a3c";
			ctx.fillRect(sx - 2 * S, topY + 6 * S, 4 * S, alto - 10 * S);
			ctx.fillRect(sx - w, baseY - 5 * S, w * 2, 5 * S);
			ctx.fillStyle = COLORES.verdeProfundo;
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
			ctx.fillStyle = COLORES.verdeInstitucional;
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

	// Compañeros del módulo (misma foto teñida que los NPCs del camino)
	function dibujarCompaneros(m) {
		const cerca = estado === "oficina" ? companeroCerca() : null;
		for (const n of m.oficina.companeros) {
			const sx = n.x - camara;
			if (sx < -80 || sx > W + 80) continue;
			const pie = SUELO + 36 * S;
			dibujarNpcFoto(sx, pie, n, heroe.x >= n.x ? 1 : -1);
			const arriba = pie - 125 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
			if (n.importante) dibujarPlacaImportante(sx, pie - 172 * S, n.nombre);
			if (!n.hablado) dibujarGlobo(sx, arriba, "!", "#ffe066");
			else if (n === cerca) dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
		}
	}

	// Computadora al fondo de la oficina: monitor grande con la Terminal
	// Celaque (colores y logo de Celaque) sobre su escritorio.
	function dibujarComputadora(m) {
		const of = m.oficina;
		const sx = of.terminalX - camara;
		if (sx < -200 || sx > W + 200) return;
		const piso = SUELO + 40 * S;
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
		const tocar = esTactil ? "Toca Hablar para usarla" : `E · ${ESTACIONES[of.estacion].usar}`;
		if (of.estacion !== "computadora") {
			// IA y Seguridad: en vez de computadora, lo que se va armando
			const alto = dibujarEstacionArmable(m, sx, piso);
			if (estado === "oficina" && enTerminal() && !m.completo) dibujarGlobo(sx - 50 * S, piso - alto - 6 * S, tocar, COLORES.fondoVerdeClaro);
			return;
		}

		// Escritorio
		const topY = piso - 70 * S;
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - 80 * S, topY, 160 * S, 70 * S);
		ctx.fillStyle = COLORES.verdeProfundo;
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
			ctx.shadowColor = COLORES.verdeInstitucional;
			ctx.shadowBlur = (18 + 16 * pulso) * S;
		}
		rectRedondo(sx - mw / 2 - 8 * S, my - 8 * S, mw + 16 * S, mh + 16 * S, 8 * S);
		ctx.fillStyle = "#1c2526";
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = COLORES.verdeProfundo; // liso: el logo va encima
		ctx.fillRect(sx - mw / 2, my, mw, mh);
		dibujarLogoOEspacio(logoCelaqueBlanco, sx, my + mh * 0.42, 124 * S, 24 * S, true);
		ctx.fillStyle = "#fff";
		ctx.font = `bold ${11 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(m.completo ? "✓ Módulo completado" : "Terminal Celaque", sx, my + mh * 0.82);
		if (!m.completo && Math.sin(tiempo * 6) > 0) ctx.fillRect(sx + 50 * S, my + mh * 0.78, 6 * S, 9 * S); // cursor

		// Silla de la computadora
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(sx - 60 * S, piso - 42 * S, 36 * S, 8 * S, 4 * S);
		ctx.fill();
		ctx.fillStyle = "#2e3a3c";
		ctx.fillRect(sx - 44 * S, piso - 34 * S, 4 * S, 30 * S);

		if (estado === "oficina" && enTerminal() && !m.completo) {
			dibujarGlobo(sx - 50 * S, my - 22 * S, tocar, COLORES.fondoVerdeClaro);
		}
	}

	// ---------- Dibujo: estaciones que se arman (robot de IA, antivirus) ----------
	// Cuántas piezas lleva armadas una estación (de PIEZAS_ESTACION) y desde
	// cuál entran animadas por el último acierto.
	function piezasEstacion(m) {
		const total = Math.max(1, preguntasDe(m).length);
		if (m.completo && !(estado === "terminal" && m.aciertos < total)) return { piezas: PIEZAS_ESTACION, antes: PIEZAS_ESTACION, listo: true };
		const aciertos = m.aciertos || 0;
		return {
			piezas: Math.floor((aciertos / total) * PIEZAS_ESTACION),
			antes: Math.floor((Math.max(0, aciertos - 1) / total) * PIEZAS_ESTACION),
			listo: aciertos >= total,
		};
	}

	// 0..1: cuánto entró la pieza k (las nuevas caen desde arriba, una tras otra)
	function entradaPieza(m, k, est) {
		if (k < est.antes) return 1;
		return suave(0, 1, (tiempo - (m.ultimoAcierto || 0) - (k - est.antes) * 0.18) / 0.45);
	}

	// Robot asistente armado por partes: 0 base, 1 cuerpo, 2 y 3 brazos,
	// 4 cabeza, 5 cara y antena. Lo que falta se ve punteado.
	function dibujarRobotArmado(cx, piso, m, est) {
		const u = S;
		const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
		const flota = listo ? Math.sin(tiempo * 2) * 3 * u : 0;
		ctx.save();
		ctx.translate(cx, piso);
		// Silueta de lo que falta
		ctx.save();
		ctx.setLineDash([5 * u, 4 * u]);
		ctx.strokeStyle = conAlfa(COLORES.blanco, 0.55);
		ctx.lineWidth = 2 * u;
		if (est.piezas < 2) ctx.strokeRect(-24 * u, -62 * u, 48 * u, 46 * u);
		if (est.piezas < 5) ctx.strokeRect(-20 * u, -100 * u, 40 * u, 34 * u);
		ctx.restore();
		const pieza = (k, dibujo) => {
			if (k >= est.piezas) return;
			const e = entradaPieza(m, k, est);
			if (e <= 0) return;
			ctx.save();
			ctx.globalAlpha = e;
			ctx.translate(0, -(1 - e) * 60 * u + (k > 0 ? flota : 0));
			dibujo();
			ctx.restore();
		};
		pieza(0, () => {
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(-28 * u, -16 * u, 56 * u, 14 * u, 7 * u);
			ctx.fill();
			ctx.fillStyle = COLORES.grisClaro;
			for (const x of [-16, 0, 16]) circulo(x * u, -9 * u, 4 * u);
		});
		pieza(1, () => {
			ctx.fillStyle = COLORES.blanco;
			rectRedondo(-24 * u, -62 * u, 48 * u, 46 * u, 12 * u);
			ctx.fill();
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 3 * u;
			ctx.stroke();
			dibujarIconoMundo("chispa", 0, -39 * u, 10 * u, COLORES.verdeInstitucional);
		});
		ctx.lineCap = "round";
		pieza(2, () => {
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 6 * u;
			linea(-24 * u, -52 * u, -38 * u, -30 * u);
		});
		pieza(3, () => {
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 6 * u;
			const ang = listo ? -1.1 + Math.sin(tiempo * 5) * 0.5 : 1.0; // saluda al terminar
			linea(24 * u, -52 * u, 24 * u + Math.cos(ang) * 22 * u, -52 * u + Math.sin(ang) * 22 * u);
		});
		ctx.lineCap = "butt";
		pieza(4, () => {
			ctx.fillStyle = COLORES.blanco;
			rectRedondo(-20 * u, -100 * u, 40 * u, 34 * u, 10 * u);
			ctx.fill();
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 3 * u;
			ctx.stroke();
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(-15 * u, -94 * u, 30 * u, 20 * u, 7 * u);
			ctx.fill();
		});
		pieza(5, () => {
			const parpadeo = modulo(tiempo, 3) < 0.15 ? 0.3 : 1;
			ctx.save();
			if (listo) {
				ctx.shadowColor = "#7fd6c8";
				ctx.shadowBlur = 12 * u;
			}
			ctx.fillStyle = "#7fd6c8";
			ctx.fillRect(-10 * u, -88 * u, 6 * u, 7 * u * parpadeo);
			ctx.fillRect(4 * u, -88 * u, 6 * u, 7 * u * parpadeo);
			ctx.restore();
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 3 * u;
			linea(0, -100 * u, 0, -112 * u);
			ctx.fillStyle = Math.sin(tiempo * 4) > 0 ? "#7fd6c8" : COLORES.beige;
			circulo(0, -114 * u, 4 * u);
		});
		if (listo) {
			ctx.fillStyle = "rgba(255,236,150,0.9)";
			for (let k = 0; k < 4; k++) {
				const ang = tiempo * 2 + (k * Math.PI) / 2;
				dibujarIconoMundo("chispa", Math.cos(ang) * 52 * u, -58 * u + Math.sin(ang) * 44 * u, 6 * u, "#ffe8a0");
			}
		}
		ctx.restore();
	}

	// Escudo antivirus: se llena por franjas con cada acierto y los virus que
	// lo rodean van desapareciendo; al terminar brilla con su ✓.
	function trazarEscudo(cx, cy, r) {
		ctx.beginPath();
		ctx.moveTo(cx, cy - r);
		ctx.lineTo(cx + r * 0.85, cy - r * 0.65);
		ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.55, cx, cy + r);
		ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.55, cx - r * 0.85, cy - r * 0.65);
		ctx.closePath();
	}

	function dibujarEscudoArmado(cx, cy, r, m, est) {
		const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
		// Virus que quedan (uno menos por pieza armada)
		for (let k = 0; k < PIEZAS_ESTACION; k++) {
			const quita = k < est.piezas ? entradaPieza(m, k, est) : 0;
			if (quita >= 1) continue;
			const ang = k * 1.05 + tiempo * 0.6;
			const d = r * (1.35 + 0.1 * Math.sin(tiempo * 3 + k)) + quita * r;
			const vx = cx + Math.cos(ang) * d;
			const vy = cy + Math.sin(ang) * d * 0.8;
			ctx.save();
			ctx.globalAlpha = 1 - quita;
			ctx.translate(vx, vy);
			ctx.rotate(tiempo * 2 + k);
			ctx.strokeStyle = "#e3262b";
			ctx.lineWidth = 2 * S;
			for (let p = 0; p < 6; p++) {
				const a = (p / 6) * Math.PI * 2;
				linea(Math.cos(a) * 5 * S, Math.sin(a) * 5 * S, Math.cos(a) * 10 * S, Math.sin(a) * 10 * S);
			}
			ctx.fillStyle = "#e3262b";
			circulo(0, 0, 6 * S);
			ctx.fillStyle = COLORES.blanco;
			circulo(-2 * S, -1.5 * S, 1.4 * S);
			circulo(2 * S, -1.5 * S, 1.4 * S);
			ctx.restore();
		}
		ctx.save();
		if (listo) {
			ctx.shadowColor = COLORES.verdeInstitucional;
			ctx.shadowBlur = (16 + 12 * Math.sin(tiempo * 3)) * S;
		}
		trazarEscudo(cx, cy, r);
		ctx.fillStyle = listo ? COLORES.verdeProfundo : conAlfa(COLORES.verdeProfundo, 0.25);
		ctx.fill();
		ctx.restore();
		ctx.save();
		trazarEscudo(cx, cy, r);
		ctx.clip();
		const banda = (r * 2) / PIEZAS_ESTACION;
		for (let k = 0; k < est.piezas && !listo; k++) {
			const e = entradaPieza(m, k, est);
			// Las franjas se llenan de abajo hacia arriba
			const y = cy + r - (k + 1) * banda;
			ctx.fillStyle = e < 1 ? mezclar(COLORES.blanco, COLORES.verdeInstitucional, e) : COLORES.verdeInstitucional;
			ctx.fillRect(cx - r, y + (1 - e) * banda, r * 2, banda * e + 1);
		}
		if (!listo) {
			// Línea de escaneo que sube y baja
			const y = cy + Math.sin(tiempo * 2) * r;
			ctx.fillStyle = "rgba(227,238,235,0.8)";
			ctx.fillRect(cx - r, y, r * 2, 3 * S);
		}
		ctx.restore();
		trazarEscudo(cx, cy, r);
		ctx.save();
		if (!listo) ctx.setLineDash([6 * S, 5 * S]);
		ctx.strokeStyle = listo ? COLORES.beige : COLORES.blanco;
		ctx.lineWidth = 3 * S;
		ctx.stroke();
		ctx.restore();
		if (listo) {
			ctx.strokeStyle = COLORES.blanco;
			ctx.lineWidth = 6 * S;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(cx - r * 0.38, cy);
			ctx.lineTo(cx - r * 0.08, cy + r * 0.3);
			ctx.lineTo(cx + r * 0.42, cy - r * 0.3);
			ctx.stroke();
			ctx.lineCap = "butt";
		}
	}

	// La estación al fondo de la oficina, en el mundo (en vez de la computadora)
	function dibujarEstacionArmable(m, sx, piso) {
		const est = piezasEstacion(m);
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
		if (m.oficina.estacion === "robot") {
			// Plataforma de armado con luz y un brazo de taller
			ctx.save();
			if (!m.completo) {
				ctx.shadowColor = COLORES.verdeInstitucional;
				ctx.shadowBlur = (16 + 14 * pulso) * S;
			}
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(sx - 70 * S, piso - 24 * S, 140 * S, 24 * S, 8 * S);
			ctx.fill();
			ctx.restore();
			ctx.fillStyle = conAlfa("#7fd6c8", 0.18 + 0.1 * pulso);
			ctx.beginPath();
			ctx.moveTo(sx - 60 * S, piso - 24 * S);
			ctx.lineTo(sx + 60 * S, piso - 24 * S);
			ctx.lineTo(sx + 40 * S, piso - 170 * S);
			ctx.lineTo(sx - 40 * S, piso - 170 * S);
			ctx.fill();
			ctx.strokeStyle = "#5e686a";
			ctx.lineWidth = 6 * S;
			ctx.lineCap = "round";
			const giro = Math.sin(tiempo * 1.5) * 0.3;
			linea(sx + 90 * S, piso, sx + 90 * S, piso - 120 * S);
			linea(sx + 90 * S, piso - 120 * S, sx + 90 * S - Math.cos(giro) * 46 * S, piso - 120 * S - Math.sin(giro) * 30 * S);
			ctx.lineCap = "butt";
			ctx.save();
			const tmp = S;
			S = tmp * 1.25;
			dibujarRobotArmado(sx, piso - 24 * tmp, m, est);
			S = tmp;
			ctx.restore();
			return 200 * S;
		}
		// Antivirus: pedestal con el escudo flotando en un holograma
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.beginPath();
		ctx.moveTo(sx - 46 * S, piso);
		ctx.lineTo(sx + 46 * S, piso);
		ctx.lineTo(sx + 32 * S, piso - 50 * S);
		ctx.lineTo(sx - 32 * S, piso - 50 * S);
		ctx.fill();
		ctx.fillStyle = conAlfa("#7fd6c8", 0.16 + 0.1 * pulso);
		ctx.beginPath();
		ctx.moveTo(sx - 30 * S, piso - 50 * S);
		ctx.lineTo(sx + 30 * S, piso - 50 * S);
		ctx.lineTo(sx + 70 * S, piso - 200 * S);
		ctx.lineTo(sx - 70 * S, piso - 200 * S);
		ctx.fill();
		dibujarEscudoArmado(sx, piso - 125 * S + Math.sin(tiempo * 1.5) * 4 * S, 46 * S, m, est);
		return 210 * S;
	}

	// La figurita dentro de la ventana de la terminal (lienzo #terminal-figura)
	function dibujarFiguraTerminal(m) {
		const lienzo = ui.terminalFigura;
		const ancho = 240;
		const alto = 150;
		if (lienzo.width !== ancho * DPR || lienzo.height !== alto * DPR) {
			lienzo.width = ancho * DPR;
			lienzo.height = alto * DPR;
		}
		const anteriorCtx = ctx;
		const anteriorS = S;
		ctx = lienzo.getContext("2d");
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		ctx.clearRect(0, 0, ancho, alto);
		S = 1;
		const est = piezasEstacion(m);
		if (m.oficina.estacion === "robot") dibujarRobotArmado(ancho / 2, alto - 8, m, est);
		else dibujarEscudoArmado(ancho / 2, alto / 2, 52, m, est);
		ctx = anteriorCtx;
		S = anteriorS;
	}

	// ---------- Letreros de obra ----------
	// Caballete amarillo con franjas de seguridad, un ícono, el texto y dos
	// balizas que parpadean alternadas. Brillan (resplandor que late) para
	// que se vean de lejos. El tablero va alto, por encima de los muebles y
	// obstáculos, para que no lo tapen.
	function dibujarLetrerosObra(zona, modulo) {
		if (escalaLetreros !== S) ubicarLetreros();
		const piso = SUELO + 40 * S;
		for (const l of LETREROS) {
			if (l.zona !== zona || (modulo && l.modulo !== modulo)) continue;
			// Un enemigo vivo cerca: el letrero espera a que lo venzas
			if (enemigos.some((e) => !e.derrotado && Math.abs(e.x - l.x) < l.medio + 160 * (e.escala || 1) * S)) continue;
			const sx = l.x - camara;
			if (sx < -200 || sx > W + 200) continue;
			const texto = esTactil ? l.tactil : l.teclado;
			ctx.font = `700 ${14 * S}px ${FUENTE}`;
			const ancho = ctx.measureText(texto).width + 56 * S;
			const alto = 42 * S;
			const x0 = sx - ancho / 2;
			const top = piso - 134 * S;
			const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3.5 + l.x * 0.01);
			// Si el héroe pasa por detrás, el letrero se vuelve casi
			// transparente para no taparlo.
			const detras = Math.abs(heroe.x - camara - sx) < ancho / 2 + 18 * S;
			ctx.save();
			ctx.globalAlpha = detras ? 0.3 : 1;

			// Patas del caballete
			ctx.strokeStyle = "#2b2b2b";
			ctx.lineWidth = 4 * S;
			linea(sx - ancho * 0.3, top + alto, sx - ancho * 0.36, piso);
			linea(sx + ancho * 0.3, top + alto, sx + ancho * 0.36, piso);

			// Tablero con resplandor
			ctx.save();
			ctx.shadowColor = `rgba(255,196,40,${(0.55 + 0.45 * pulso).toFixed(3)})`;
			ctx.shadowBlur = (16 + 18 * pulso) * S;
			rectRedondo(x0, top, ancho, alto, 6 * S);
			ctx.fillStyle = "#ffc72c";
			ctx.fill();
			ctx.restore();

			// Franja de seguridad negra/amarilla abajo del tablero
			ctx.save();
			rectRedondo(x0, top, ancho, alto, 6 * S);
			ctx.clip();
			ctx.fillStyle = "#1e1e1e";
			const franja = 7 * S;
			for (let x = x0 - franja * 2; x < x0 + ancho + franja; x += franja * 2) {
				ctx.beginPath();
				ctx.moveTo(x, top + alto);
				ctx.lineTo(x + franja, top + alto - franja);
				ctx.lineTo(x + franja * 2, top + alto - franja);
				ctx.lineTo(x + franja, top + alto);
				ctx.fill();
			}
			ctx.restore();
			rectRedondo(x0, top, ancho, alto, 6 * S);
			ctx.strokeStyle = "#1e1e1e";
			ctx.lineWidth = 3 * S;
			ctx.stroke();

			// Ícono (flecha / !) en un círculo negro, y el texto
			const cy = top + (alto - franja) / 2 + 1 * S;
			ctx.fillStyle = "#1e1e1e";
			circulo(x0 + 20 * S, cy, 11 * S);
			ctx.textBaseline = "middle";
			ctx.textAlign = "center";
			ctx.fillStyle = "#ffc72c";
			ctx.font = `700 ${15 * S}px ${FUENTE}`;
			ctx.fillText(l.flecha, x0 + 20 * S, cy + 1 * S);
			ctx.textAlign = "left";
			ctx.fillStyle = "#1e1e1e";
			ctx.font = `700 ${14 * S}px ${FUENTE}`;
			ctx.fillText(texto, x0 + 38 * S, cy + 1 * S);

			// Balizas: una encendida y la otra apagada, se turnan
			const encendida = Math.sin(tiempo * 6 + l.x) > 0;
			for (const lado of [-1, 1]) {
				const bx = sx + lado * (ancho / 2 - 10 * S);
				const prendida = lado < 0 ? encendida : !encendida;
				ctx.fillStyle = "#2b2b2b";
				ctx.fillRect(bx - 3 * S, top - 7 * S, 6 * S, 8 * S);
				ctx.save();
				if (prendida) {
					ctx.shadowColor = "#ff9a1a";
					ctx.shadowBlur = 18 * S;
				}
				ctx.fillStyle = prendida ? "#ffb21a" : "#7a5a20";
				circulo(bx, top - 11 * S, 5.5 * S);
				ctx.restore();
			}
			ctx.restore();
		}
	}

	// ---------- Aves: guacamayas y loros ----------
	// Bandadas chicas que cruzan el cielo al salir de la zona de planos y en
	// la ciudad. Se mueven en coordenadas de pantalla (más un poco de
	// parallax con la cámara), aparecen solas cada tantos segundos.
	const TIPOS_AVE = [
		// Guacamaya roja (Ara macao, ave nacional de Honduras)
		{ cuerpo: "#d7262e", ala: "#1d5fbf", banda: "#f2c230", cola: "#c41f28", pico: "#f1e7d0", cola_largo: 38 },
		// Guacamaya azul y amarilla
		{ cuerpo: "#1f6fd1", ala: "#1a55a8", banda: "#f2c230", cola: "#1f6fd1", pecho: "#f2c230", pico: "#2a2a2a", cola_largo: 36 },
		// Loro verde
		{ cuerpo: "#2fa84f", ala: "#1f7a3a", banda: "#1d5fbf", cola: "#2fa84f", cabeza: "#e8d23a", pico: "#f1e7d0", cola_largo: 16 },
	];
	let aves = [];
	let proximaBandada = 2;
	let camaraAves = 0;

	function actualizarAves(dt, activas) {
		// Parallax: el cielo se corre un poco al avanzar la cámara
		const dCam = camara - camaraAves;
		camaraAves = camara;
		if (Math.abs(dCam) > 200) aves = []; // salto de cámara (tubo, oficina): limpiar
		for (const a of aves) {
			a.x += a.dir * a.vel * S * dt - dCam * 0.35; // vuelo + parallax
			a.fase += dt * a.aleteo;
		}
		aves = aves.filter((a) => a.x > -150 * S && a.x < W + 150 * S);
		proximaBandada -= dt;
		if (activas && proximaBandada <= 0) {
			proximaBandada = 5 + Math.random() * 6;
			const dir = Math.random() < 0.5 ? 1 : -1;
			const tipo = TIPOS_AVE[Math.floor(Math.random() * TIPOS_AVE.length)];
			const y = SUELO * (0.12 + Math.random() * 0.3);
			const cuantas = 1 + Math.floor(Math.random() * 4);
			for (let i = 0; i < cuantas; i++) {
				aves.push({
					tipo,
					dir,
					x: dir > 0 ? -60 * S - i * 46 * S : W + 60 * S + i * 46 * S,
					y: y + (i % 2) * 22 * S - i * 6 * S,
					vel: 110 + Math.random() * 50,
					tam: 0.85 + Math.random() * 0.35,
					fase: Math.random() * Math.PI * 2,
					aleteo: 9 + Math.random() * 3,
				});
			}
		}
	}

	function dibujarAve(a) {
		const t = a.tipo;
		const ala = Math.sin(a.fase); // -1 abajo .. 1 arriba
		ctx.save();
		ctx.translate(a.x, a.y + Math.sin(a.fase * 0.5) * 4 * S);
		ctx.scale(a.dir * a.tam * S, a.tam * S);

		// Ala de atrás (más oscura)
		ctx.fillStyle = conAlfa(t.ala, 0.85);
		ctx.beginPath();
		ctx.ellipse(-2, -2 - ala * 9, 15, 5, -0.25 - ala * 0.7, 0, Math.PI * 2);
		ctx.fill();

		// Cola larga
		ctx.fillStyle = t.cola;
		ctx.beginPath();
		ctx.moveTo(-10, -1);
		ctx.lineTo(-10 - t.cola_largo, 3);
		ctx.lineTo(-10 - t.cola_largo * 0.85, 6);
		ctx.lineTo(-8, 3);
		ctx.closePath();
		ctx.fill();

		// Cuerpo, pecho y cabeza
		ctx.fillStyle = t.cuerpo;
		ctx.beginPath();
		ctx.ellipse(0, 0, 15, 6.5, 0, 0, Math.PI * 2);
		ctx.fill();
		if (t.pecho) {
			ctx.fillStyle = t.pecho;
			ctx.beginPath();
			ctx.ellipse(3, 2.5, 9, 3.5, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = t.cabeza || t.cuerpo;
		circulo(14, -3, 6);
		ctx.fillStyle = "#ffffff"; // cara clara de la guacamaya
		circulo(15.5, -3, 3);
		ctx.fillStyle = "#111";
		circulo(16, -3.5, 1.3);
		ctx.fillStyle = t.pico;
		ctx.beginPath();
		ctx.moveTo(19, -5);
		ctx.quadraticCurveTo(25, -4, 22, 1);
		ctx.lineTo(19, -1);
		ctx.closePath();
		ctx.fill();

		// Ala de adelante, con banda de color en la punta
		ctx.save();
		ctx.translate(0, -2);
		ctx.rotate(-0.35 - ala * 0.8);
		ctx.fillStyle = t.ala;
		ctx.beginPath();
		ctx.ellipse(-4, -9, 6, 14, 0.3, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = t.banda;
		ctx.beginPath();
		ctx.ellipse(-6, -17, 3.5, 6, 0.3, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		ctx.restore();
	}

	function dibujarAves(dt, activas) {
		actualizarAves(dt, activas);
		for (const a of aves) dibujarAve(a);
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
			const siguiente = of.companeros.find((n) => !n.hablado);
			if (siguiente) return siguiente.x;
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
			luz.addColorStop(0, conAlfa(COLORES.verdeInstitucional, 0.45 + 0.2 * pulso));
			luz.addColorStop(1, conAlfa(COLORES.verdeInstitucional, 0));
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
		ctx.shadowColor = COLORES.verdeInstitucional;
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
				// Lo que se combate: un antivalor (config.js → antivalor)
				if (e.antivalor) dibujarPlacaImportante(sx, arriba - 46 * S, e.antivalor, true);
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
		brillo.addColorStop(0, conAlfa(COLORES.verdeInstitucional, 0.55));
		brillo.addColorStop(1, conAlfa(COLORES.verdeInstitucional, 0));
		ctx.fillStyle = brillo;
		ctx.fillRect(sx - 220 * S, pie - 300 * S, 440 * S, 420 * S);

		const texto = CFG.textos.letreroFinal || CFG.nombreMeta;
		ctx.font = `bold ${26 * S}px ${FUENTE}`;
		const anchoTablero = Math.max(190 * S, ctx.measureText(texto).width + 50 * S);

		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - anchoTablero * 0.35, pie - 115 * S, 10 * S, 115 * S);
		ctx.fillRect(sx + anchoTablero * 0.35 - 10 * S, pie - 115 * S, 10 * S, 115 * S);

		ctx.save();
		ctx.shadowColor = COLORES.verdeInstitucional;
		ctx.shadowBlur = 22 * S;
		rectRedondo(sx - anchoTablero / 2, pie - 160 * S, anchoTablero, 56 * S, 12 * S);
		ctx.fillStyle = COLORES.blanco;
		ctx.fill();
		ctx.restore();
		ctx.lineWidth = 4 * S;
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.stroke();

		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, sx, pie - 131 * S);

		// Logo de Celaque arriba del letrero (sin deformar)
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(sx - 120 * S, pie - 232 * S, 240 * S, 56 * S, 12 * S);
		ctx.fill();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3 * S;
		ctx.stroke();
		dibujarLogoOEspacio(logoCelaque, sx, pie - 204 * S, 210 * S, 38 * S, false);

		// Bandera ondeando
		const mastil = sx + anchoTablero / 2 + 30 * S;
		ctx.strokeStyle = COLORES.verdeProfundo;
		ctx.lineWidth = 4 * S;
		linea(mastil, pie, mastil, pie - 190 * S);
		const ola = Math.sin(tiempo * 4) * 6 * S;
		ctx.fillStyle = COLORES.verdeInstitucional;
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
	// Placa con el nombre del personaje fijo de cada mundo (siempre visible).
	// enemigo = true: la de un antivalor de la Cueva (negra, con ✗ en rojo).
	function dibujarPlacaImportante(x, y, nombre, enemigo) {
		ctx.font = `700 ${14 * S}px ${FUENTE}`;
		const ancho = ctx.measureText(nombre).width + 40 * S;
		const alto = 26 * S;
		const acento = enemigo ? "#e3262b" : COLORES.beige;
		ctx.save();
		ctx.shadowColor = conAlfa(acento, 0.8);
		ctx.shadowBlur = 12 * S;
		ctx.fillStyle = enemigo ? COLORES.negro : COLORES.verdeProfundo;
		rectRedondo(x - ancho / 2, y - alto / 2, ancho, alto, 13 * S);
		ctx.fill();
		ctx.restore();
		ctx.strokeStyle = acento;
		ctx.lineWidth = 2 * S;
		ctx.stroke();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = acento;
		ctx.fillText(enemigo ? "✗" : "★", x - ancho / 2 + 15 * S, y + 1 * S);
		ctx.fillStyle = COLORES.blanco;
		ctx.fillText(nombre, x + 8 * S, y + 1 * S);
	}

	function dibujarGlobo(x, y, texto, fondo) {
		ctx.font = `bold ${16 * S}px ${FUENTE}`;
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
			if (n.importante) dibujarPlacaImportante(sx, pie - 172 * S, n.nombre);
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
		// caminando, las fotos de zancada (caminando / caminando2).
		const recibeGolpe = o.golpeado && sprites.golpeado;
		const enMarcha = o.moviendo && !recibeGolpe && !o.agachado && !o.atacando && heroeEnSuelo();
		const fotosCorrer = enMarcha && o.corriendo && sprites.corre && sprites.correPaso && sprites.corre.cargando.elemento && sprites.correPaso.cargando.elemento;
		const [zancada1, zancada2] = fotosCorrer ? ["corre", "correPaso"] : ["caminando", "caminando2"];
		const hayZancada2 = sprites[zancada2] && sprites[zancada2] !== sprites[zancada1];
		const ciclo = Math.cos(o.fase);
		const ANCHO_FUNDIDO = 0.35;
		const peso2 = enMarcha && hayZancada2 ? clamp(0.5 - ciclo / (2 * ANCHO_FUNDIDO), 0, 1) : 0;
		const pose = recibeGolpe
			? "golpeado"
			: o.agachado
			? "agachado"
			: o.atacando
			? "golpe"
			: !heroeEnSuelo()
			? "saltando"
			: o.moviendo
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
		const rebote = enMarcha
			? subida * (1.5 + 4.5 * marcha) * s
			: o.moviendo
			? 0
			: Math.sin(tiempo * 2 + x + camara) * 0.8 * s;
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
		if (el2) {
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

	// ---------- Dibujo: mapa ----------
	// Todo el mapa se dibuja en sus propias unidades (MAPA_ANCHO x MAPA_ALTO)
	// y se escala a la pantalla con ctx.setTransform; el acercamiento a un
	// mundo solo cambia esa escala y el centro (ver vistaMapa). Mientras se
	// dibuja el mapa S vale 1 (las funciones de dibujo que usan S quedan en
	// unidades del mapa).
	const MAPA_ANCHO = 1600;
	const MAPA_ALTO = 1000;
	const ACANTILADO = 38; // alto de la pared de roca de cada meseta
	// Un mundo por módulo, en orden alrededor de la meseta central (como un
	// anillo, igual que el mapa de referencia). Si hubiera más de 6 módulos,
	// los extra se acomodan en un círculo.
	const LUGARES_MAPA = [
		{ x: 300, y: 770, rx: 200, ry: 112 },
		{ x: 280, y: 255, rx: 175, ry: 100 },
		{ x: 800, y: 165, rx: 185, ry: 88 },
		{ x: 1320, y: 250, rx: 180, ry: 100 },
		{ x: 1330, y: 745, rx: 185, ry: 108 },
		{ x: 810, y: 865, rx: 185, ry: 88 },
	];
	const CENTRO_MAPA = { x: 800, y: 505, rx: 300, ry: 200 };

	// Orilla irregular de una meseta (puntos fijos con semilla). El punto 0
	// está a la derecha, el 10 abajo, el 20 a la izquierda y el 30 arriba.
	const PUNTOS_MESETA = 40;
	function contornoMeseta(q, semilla) {
		const az = crearAzar(semilla);
		const a = az() * 6;
		const b = az() * 6;
		const puntos = [];
		for (let k = 0; k < PUNTOS_MESETA; k++) {
			const ang = (k / PUNTOS_MESETA) * Math.PI * 2;
			const r = 1 + 0.06 * Math.sin(3 * ang + a) + 0.04 * Math.sin(5 * ang + b) + (az() - 0.5) * 0.025;
			puntos.push([q.x + Math.cos(ang) * q.rx * r, q.y + Math.sin(ang) * q.ry * r]);
		}
		return puntos;
	}

	// Árboles por el borde de atrás y a los lados (no tapan el edificio)
	function arbolesMeseta(q, semilla, cuantos) {
		const az = crearAzar(semilla);
		const lista = [];
		for (let k = 0; k < cuantos; k++) {
			const ang = Math.PI * (1.05 + (k / (cuantos - 1)) * 0.9) + (az() - 0.5) * 0.12;
			const r = 0.8 + az() * 0.1;
			lista.push({ x: q.x + Math.cos(ang) * q.rx * r, y: q.y + Math.sin(ang) * q.ry * r, tam: 15 + az() * 8 });
		}
		for (const lado of [-1, 1]) lista.push({ x: q.x + lado * q.rx * 0.8, y: q.y + q.ry * 0.3, tam: 17 + az() * 6 });
		return lista.sort((p1, p2) => p1.y - p2.y);
	}

	const mesetas = modulos.map((m, i) => {
		const q = LUGARES_MAPA[i] || { x: 800 + Math.cos(i * 1.1) * 640, y: 500 + Math.sin(i * 1.1) * 370, rx: 140, ry: 80 };
		return { ...q, contorno: contornoMeseta(q, 101 + i * 17), arboles: arbolesMeseta(q, 7 + i * 13, 9) };
	});
	const mesetaCentro = { ...CENTRO_MAPA, contorno: contornoMeseta(CENTRO_MAPA, 999), arboles: arbolesMeseta(CENTRO_MAPA, 555, 15) };

	// Dónde se para la ficha del héroe, y dónde llega el camino
	const lugarHeroeMapa = (i) => (mesetas[i] ? { x: mesetas[i].x - mesetas[i].rx * 0.42, y: mesetas[i].y + mesetas[i].ry * 0.42 } : { x: 800, y: 500 });
	const puntaCamino = (q) => ({ x: q.x - q.rx * 0.12, y: q.y + q.ry * 0.5 });

	const azarMapa = crearAzar(4242);
	const OLAS_MAPA = Array.from({ length: 110 }, () => ({ x: azarMapa() * MAPA_ANCHO, y: azarMapa() * MAPA_ALTO, fase: azarMapa() * 6 }));
	const NUBES_MAPA = Array.from({ length: 7 }, (_, k) => ({ x: azarMapa() * 2000, y: 60 + k * 135, tam: 0.7 + azarMapa() * 0.6, vel: 8 + azarMapa() * 10 }));

	// Vista actual: escala k y desplazamiento (ox, oy) de unidades del mapa a
	// pantalla. En la vista general entra todo el mapa; acercado, la meseta
	// del mundo llena la pantalla. En celular vertical el rectángulo del
	// centro va abajo (style.css), así que el mapa usa solo la parte de arriba.
	function vistaMapa() {
		const vertical = H > W && W <= 700;
		const altoUtil = vertical ? Math.max(H * 0.45, H - 330) : H;
		const k0 = Math.min(W / (MAPA_ANCHO + 40), altoUtil / (MAPA_ALTO + 40));
		let cx = MAPA_ANCHO / 2;
		let cy = MAPA_ALTO / 2;
		let k = k0;
		let py = altoUtil / 2;
		if (mapa.foco >= 0) {
			const e = suave(0, 1, mapa.z);
			const q = mesetas[mapa.foco];
			const kz = Math.min(W / (q.rx * 2 * 1.3), (H - 90) / ((q.ry * 2 + ACANTILADO + 230) * 1.08));
			cx = lerp(cx, q.x, e);
			cy = lerp(cy, q.y - 55, e);
			k = lerp(k0, Math.max(k0, kz), e);
			py = lerp(py, H / 2 + 30, e);
		}
		return { k, k0, ox: W / 2 - cx * k, oy: py - cy * k, vertical };
	}

	// Qué mundo hay bajo un punto de la pantalla (-1 = ninguno)
	function mundoEnPantalla(px, py) {
		const v = vistaMapa();
		const x = (px - v.ox) / v.k;
		const y = (py - v.oy) / v.k;
		for (let i = 0; i < mesetas.length; i++) {
			const q = mesetas[i];
			const dx = (x - q.x) / q.rx;
			const dy = (y - (q.y - 30)) / (q.ry + 60); // incluye el edificio y la medalla
			if (dx * dx + dy * dy <= 1) return i;
		}
		return -1;
	}

	// El rectángulo del centro (HTML) va sobre la meseta central y se escala
	// con el mapa. Solo se toca el estilo si cambió.
	let posPanel = "";
	function ubicarPanelMapa(v) {
		const x = v.ox + CENTRO_MAPA.x * v.k0;
		const y = v.oy + CENTRO_MAPA.y * v.k0;
		const k = clamp(Math.min((CENTRO_MAPA.rx * 2 * v.k0 * 0.8) / 380, (CENTRO_MAPA.ry * 2 * v.k0 * 0.9) / 390), 0.55, 1.1);
		const clave = `${x.toFixed(0)},${y.toFixed(0)},${k.toFixed(3)}`;
		if (clave === posPanel) return;
		posPanel = clave;
		ui.panel.style.setProperty("--mapa-x", x.toFixed(0) + "px");
		ui.panel.style.setProperty("--mapa-y", y.toFixed(0) + "px");
		ui.panel.style.setProperty("--mapa-k", k.toFixed(3));
	}

	let cacheAgua = null;
	function degradadoAgua() {
		if (cacheAgua && cacheAgua.H === H) return cacheAgua.g;
		const g = ctx.createLinearGradient(0, 0, 0, H);
		g.addColorStop(0, mezclar(COLORES.verdeInstitucional, "#ffffff", 0.12));
		g.addColorStop(1, mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.5));
		cacheAgua = { H, g };
		return g;
	}

	function trazarContorno(puntos, dx, dy, escala, cx, cy) {
		ctx.beginPath();
		puntos.forEach(([x, y], k) => {
			const px = cx + (x - cx) * escala + dx;
			const py = cy + (y - cy) * escala + dy;
			if (k === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		});
		ctx.closePath();
	}

	// Meseta: espuma en el agua, pared de roca (beige, con vetas) y pasto
	// arriba. apagado (0..1): gris mientras el mundo tiene candado.
	function dibujarMesetaBase(q, apagado) {
		const c = q.contorno;
		const espuma = 1.06 + 0.012 * Math.sin(tiempo * 2 + q.x);
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		trazarContorno(c, 0, ACANTILADO + 6, espuma, q.x, q.y);
		ctx.fill();

		// Pared: la mitad de abajo de la orilla, bajada ACANTILADO
		const mitad = PUNTOS_MESETA / 2;
		ctx.beginPath();
		for (let k = 0; k <= mitad; k++) ctx.lineTo(c[k][0], c[k][1]);
		for (let k = mitad; k >= 0; k--) ctx.lineTo(c[k][0], c[k][1] + ACANTILADO);
		ctx.closePath();
		const roca = mezclar(COLORES.beige, "#b9b9b9", apagado * 0.6);
		ctx.fillStyle = roca;
		ctx.fill();
		ctx.save();
		ctx.clip();
		ctx.strokeStyle = mezclar(roca, COLORES.verdeProfundo, 0.28);
		ctx.lineWidth = 5;
		for (let x = q.x - q.rx * 1.1; x < q.x + q.rx * 1.1; x += 17) linea(x, q.y, x + 3, q.y + q.ry + ACANTILADO + 10);
		ctx.fillStyle = "rgba(4,37,35,0.18)"; // sombra bajo el pasto
		ctx.fillRect(q.x - q.rx * 1.2, q.y, q.rx * 2.4, q.ry * 2);
		ctx.restore();

		// Pasto: base, centro más claro y borde
		const pasto = mezclar(mezclar(COLORES.verdeInstitucional, "#ffffff", 0.16), "#c4c8c7", apagado * 0.75);
		ctx.fillStyle = pasto;
		trazarContorno(c, 0, 0, 1, q.x, q.y);
		ctx.fill();
		ctx.strokeStyle = mezclar(pasto, COLORES.verdeProfundo, 0.45);
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = mezclar(pasto, "#ffffff", 0.16);
		trazarContorno(c, 0, -4, 0.8, q.x, q.y);
		ctx.fill();
	}

	function dibujarArbolMapa(a, apagado) {
		ctx.fillStyle = "rgba(4,37,35,0.22)";
		ctx.beginPath();
		ctx.ellipse(a.x, a.y + 4, a.tam * 0.9, a.tam * 0.35, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = mezclar("#6f5238", "#9a9a9a", apagado);
		ctx.fillRect(a.x - 3, a.y - a.tam * 0.6, 6, a.tam * 0.7);
		ctx.fillStyle = mezclar(mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.45), "#a2a6a5", apagado * 0.7);
		circulo(a.x, a.y - a.tam * 1.05, a.tam);
		ctx.fillStyle = mezclar(mezclar(COLORES.verdeInstitucional, "#ffffff", 0.2), "#c9cccb", apagado * 0.7);
		circulo(a.x - a.tam * 0.3, a.y - a.tam * 1.3, a.tam * 0.45);
	}

	// Íconos simples para la fachada de cada edificio (config.js → icono)
	function dibujarIconoMundo(tipo, cx, cy, r, col) {
		ctx.save();
		ctx.fillStyle = col;
		ctx.strokeStyle = col;
		ctx.lineWidth = r * 0.18;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		if (tipo === "montana") {
			ctx.beginPath();
			ctx.moveTo(cx - r, cy + r * 0.7);
			ctx.lineTo(cx - r * 0.2, cy - r * 0.6);
			ctx.lineTo(cx + r * 0.2, cy);
			ctx.lineTo(cx + r * 0.45, cy - r * 0.35);
			ctx.lineTo(cx + r, cy + r * 0.7);
			ctx.closePath();
			ctx.fill();
		} else if (tipo === "tablero") {
			for (let c = 0; c < 3; c++) {
				const x = cx - r + c * r * 0.72;
				ctx.fillRect(x, cy - r * 0.8, r * 0.56, r * 0.22);
				for (let n = 0; n < 3 - c; n++) ctx.fillRect(x, cy - r * 0.45 + n * r * 0.42, r * 0.56, r * 0.32);
			}
		} else if (tipo === "engranes") {
			ctx.beginPath();
			for (let k = 0; k < 16; k++) {
				const ang = (k / 16) * Math.PI * 2;
				const rr = k % 2 ? r * 0.72 : r;
				ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
			}
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = COLORES.blanco;
			circulo(cx, cy, r * 0.3);
		} else if (tipo === "nube") {
			circulo(cx - r * 0.45, cy + r * 0.15, r * 0.45);
			circulo(cx + r * 0.1, cy - r * 0.2, r * 0.6);
			circulo(cx + r * 0.55, cy + r * 0.2, r * 0.42);
			ctx.fillRect(cx - r * 0.45, cy + r * 0.15, r, r * 0.47);
		} else if (tipo === "escudo") {
			ctx.beginPath();
			ctx.moveTo(cx, cy - r);
			ctx.lineTo(cx + r * 0.85, cy - r * 0.65);
			ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.55, cx, cy + r);
			ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.55, cx - r * 0.85, cy - r * 0.65);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = COLORES.blanco;
			ctx.beginPath();
			ctx.moveTo(cx - r * 0.38, cy);
			ctx.lineTo(cx - r * 0.08, cy + r * 0.3);
			ctx.lineTo(cx + r * 0.42, cy - r * 0.3);
			ctx.stroke();
		} else if (tipo === "chispa") {
			const estrella = (x, y, rr) => {
				ctx.beginPath();
				ctx.moveTo(x, y - rr);
				ctx.quadraticCurveTo(x, y, x + rr, y);
				ctx.quadraticCurveTo(x, y, x, y + rr);
				ctx.quadraticCurveTo(x, y, x - rr, y);
				ctx.quadraticCurveTo(x, y, x, y - rr);
				ctx.fill();
			};
			estrella(cx - r * 0.15, cy + r * 0.1, r * 0.85);
			estrella(cx + r * 0.62, cy - r * 0.55, r * 0.38);
		} else {
			ctx.fillRect(cx - r * 0.6, cy - r * 0.8, r * 1.2, r * 1.6);
		}
		ctx.restore();
	}

	// Edificio de un módulo sobre su meseta (con candado: apagado y gris)
	function dibujarEdificioMapa(bx, by, m, i, apagado, acercado) {
		// La Torre Atlas es la foto real (assets/edificios/Atlas.png)
		const atlas = /atlas/i.test(m.oficina.edificio) && edificiosSalida[0] && edificiosSalida[0].cargando.elemento;
		if (atlas) {
			const k = Math.min(210 / atlas.naturalHeight, 170 / atlas.naturalWidth);
			const w = atlas.naturalWidth * k;
			const h = atlas.naturalHeight * k;
			ctx.fillStyle = "rgba(4,37,35,0.25)";
			ctx.beginPath();
			ctx.ellipse(bx, by + 2, w * 0.55, 12, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.save();
			if (apagado > 0) ctx.filter = `grayscale(${apagado.toFixed(2)}) brightness(${(1 - 0.15 * apagado).toFixed(2)})`;
			if (acercado > 0 && !apagado) {
				ctx.shadowColor = conAlfa(COLORES.blanco, 0.9);
				ctx.shadowBlur = 20 + 18 * (0.5 + 0.5 * Math.sin(tiempo * 4));
			}
			ctx.drawImage(atlas, bx - w / 2, by - h, w, h);
			ctx.restore();
			return;
		}
		const w = 124;
		const h = 108 + (i % 3) * 16;
		const col = mezclar(m.color, "#9aa0a0", apagado * 0.7);
		ctx.fillStyle = "rgba(4,37,35,0.25)";
		ctx.beginPath();
		ctx.ellipse(bx, by + 2, w * 0.65, 12, 0, 0, Math.PI * 2);
		ctx.fill();
		if (acercado > 0 && !apagado) {
			// Al acercar, el edificio late: es lo que hay que tocar
			const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);
			ctx.save();
			ctx.globalAlpha = acercado;
			ctx.shadowColor = conAlfa(COLORES.blanco, 0.9);
			ctx.shadowBlur = 20 + 18 * pulso;
			ctx.fillStyle = col;
			ctx.fillRect(bx - w / 2, by - h, w, h);
			ctx.restore();
		}
		ctx.fillStyle = col;
		ctx.fillRect(bx - w / 2, by - h, w, h);
		ctx.fillStyle = "rgba(0,0,0,0.16)";
		ctx.fillRect(bx + w * 0.3, by - h, w * 0.2, h);
		ctx.fillStyle = mezclar(COLORES.verdeProfundo, "#7b8180", apagado * 0.6);
		ctx.fillRect(bx - w / 2 - 6, by - h - 10, w + 12, 12);
		ctx.fillRect(bx + w * 0.18, by - h - 26, 4, 16); // antena
		// Ventanas: encendidas al completarlo, claras si está abierto
		for (let y = by - h + 54; y < by - 42; y += 20) {
			for (let c = 0; c < 4; c++) {
				ctx.fillStyle = apagado
					? "rgba(40,52,54,0.55)"
					: m.completo
						? (c + y) % 3 === 0
							? "rgba(255,255,255,0.9)"
							: "rgba(255,232,160,0.95)"
						: "rgba(227,238,235,0.85)";
				ctx.fillRect(bx - w / 2 + 12 + c * 27, y, 18, 12);
			}
		}
		// Ícono del sistema en un círculo blanco
		ctx.fillStyle = mezclar(COLORES.blanco, "#c9cccb", apagado);
		circulo(bx, by - h + 26, 20);
		dibujarIconoMundo(m.icono, bx, by - h + 26, 12, col);
		// Puerta
		ctx.fillStyle = mezclar(COLORES.verdeProfundo, "#7b8180", apagado * 0.6);
		ctx.fillRect(bx - 17, by - 38, 34, 38);
		ctx.fillStyle = apagado ? "#5d6667" : m.completo ? "#fff1c1" : mezclar(COLORES.fondoVerdeClaro, COLORES.verdeInstitucional, 0.3 + 0.3 * Math.sin(tiempo * 3));
		ctx.fillRect(bx - 13, by - 34, 26, 34);
	}

	// Talento: el camino por la zona industrial y la Cueva, en miniatura
	function dibujarEscenaTalento(bx, by, acercado) {
		// Montaña de fondo (Celaque)
		ctx.fillStyle = mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.55);
		ctx.beginPath();
		ctx.moveTo(bx - 40, by - 30);
		ctx.lineTo(bx + 50, by - 150);
		ctx.lineTo(bx + 90, by - 110);
		ctx.lineTo(bx + 120, by - 135);
		ctx.lineTo(bx + 190, by - 30);
		ctx.fill();
		// Fábrica con chimenea que echa humo
		ctx.fillStyle = "#8a9294";
		ctx.fillRect(bx - 150, by - 62, 70, 52);
		ctx.fillStyle = "#6f777a";
		ctx.fillRect(bx - 136, by - 104, 14, 44);
		ctx.fillStyle = "#ffe8a0";
		for (let k = 0; k < 3; k++) ctx.fillRect(bx - 142 + k * 20, by - 48, 12, 10);
		for (let k = 0; k < 3; k++) {
			const t = (tiempo * 0.5 + k / 3) % 1;
			ctx.fillStyle = `rgba(240,244,243,${(0.8 * (1 - t)).toFixed(3)})`;
			circulo(bx - 129 + t * 18, by - 110 - t * 46, 8 + t * 10);
		}
		// Camino hacia la cueva
		ctx.strokeStyle = mezclar(COLORES.beige, "#ffffff", 0.45);
		ctx.lineWidth = 18;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(bx - 170, by + 12);
		ctx.quadraticCurveTo(bx - 40, by + 26, bx + 60, by - 4);
		ctx.stroke();
		ctx.lineCap = "butt";
		// Cueva: roca con la boca oscura y cristales
		ctx.fillStyle = "#7d6f62";
		ctx.beginPath();
		ctx.ellipse(bx + 80, by - 4, 70, 60, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#1c1612";
		ctx.beginPath();
		ctx.ellipse(bx + 80, by - 2, 30, 34, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#7fd6c8";
		for (const [x, y] of [
			[bx + 36, by - 30],
			[bx + 124, by - 24],
		]) {
			ctx.beginPath();
			ctx.moveTo(x, y - 10);
			ctx.lineTo(x + 5, y);
			ctx.lineTo(x, y + 6);
			ctx.lineTo(x - 5, y);
			ctx.fill();
		}
		// Tubo verde (la entrada a la cueva)
		ctx.fillStyle = "#2f9e62";
		ctx.fillRect(bx - 44, by - 40, 30, 40);
		ctx.fillStyle = "#3fbf78";
		ctx.fillRect(bx - 50, by - 50, 42, 13);
		if (acercado > 0) {
			const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);
			ctx.strokeStyle = conAlfa(COLORES.blanco, acercado * (0.4 + 0.5 * pulso));
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.ellipse(bx + 10, by - 50, 190, 110, 0, 0, Math.PI * 2);
			ctx.stroke();
		}
	}

	// Candado (cerrado) o medalla con el número del mundo / ✓ al completarlo
	function dibujarMedallaMundo(x, y, i, m, candado, abrir) {
		const bote = Math.sin(tiempo * 2.5 + i) * 3;
		if (candado || abrir < 1.4) {
			const p = candado ? 0 : abrir;
			const sacude = (mapa.sacudir[i] || 0) > 0 ? Math.sin(tiempo * 60) * 6 : p < 0.8 ? Math.sin(tiempo * 50) * 4 * (p / 0.8) : 0;
			const sube = p > 0.8 ? (p - 0.8) / 0.6 : 0; // 0..1: el candado se suelta y desaparece
			ctx.save();
			ctx.globalAlpha = 1 - sube;
			ctx.translate(x + sacude, y + bote - sube * 40);
			ctx.strokeStyle = COLORES.grisClaro;
			ctx.lineWidth = 7;
			ctx.beginPath();
			ctx.arc(0, -14 - sube * 14, 13, Math.PI, Math.PI * 2);
			ctx.lineTo(13, -6 - sube * 14);
			ctx.stroke();
			ctx.fillStyle = COLORES.beige;
			rectRedondo(-21, -14, 42, 34, 7);
			ctx.fill();
			ctx.strokeStyle = mezclar(COLORES.beige, COLORES.verdeProfundo, 0.4);
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.fillStyle = COLORES.verdeProfundo;
			circulo(0, 0, 5);
			ctx.fillRect(-2, 0, 4, 10);
			ctx.restore();
			if (p > 0.8) {
				// Destello al abrirse
				const t = Math.min(1, (p - 0.8) / 0.8);
				ctx.strokeStyle = conAlfa(COLORES.blanco, 1 - t);
				ctx.lineWidth = 6;
				ctx.beginPath();
				ctx.arc(x, y, 20 + t * 90, 0, Math.PI * 2);
				ctx.stroke();
			}
			if (candado || p < 0.9) return;
		}
		const aparece = abrir < 1.8 ? suave(0.9, 1.6, abrir) : 1;
		ctx.save();
		ctx.translate(x, y + bote);
		ctx.scale(aparece, aparece);
		ctx.fillStyle = m.completo ? COLORES.verdeInstitucional : COLORES.verdeProfundo;
		circulo(0, 0, 26);
		ctx.strokeStyle = COLORES.beige;
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.arc(0, 0, 26, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = "rgba(255,255,255,0.35)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, 19, 0, Math.PI * 2);
		ctx.stroke();
		if (m.completo) {
			ctx.strokeStyle = COLORES.blanco;
			ctx.lineWidth = 6;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(-10, 1);
			ctx.lineTo(-3, 9);
			ctx.lineTo(11, -8);
			ctx.stroke();
			ctx.lineCap = "butt";
		} else {
			ctx.fillStyle = COLORES.blanco;
			ctx.font = `700 26px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(String(i + 1), 0, 2);
		}
		ctx.restore();
	}

	function dibujarLetreroMapa(x, y, texto, apagado) {
		ctx.font = `700 22px ${FUENTE}`;
		const ancho = ctx.measureText(texto).width + 30;
		ctx.fillStyle = apagado ? "#7b8180" : COLORES.verdeProfundo;
		rectRedondo(x - ancho / 2, y - 17, ancho, 34, 10);
		ctx.fill();
		ctx.strokeStyle = COLORES.blanco;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = COLORES.blanco;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, x, y + 1);
	}

	// 1 = gris (con candado), 0 = con color; mientras el candado se abre, se va pintando
	function apagadoMundo(i) {
		if (!desbloqueado(i)) return 1;
		return mapa.abriendo === i ? 1 - suave(0.8, 1.5, mapa.abrirT) : 0;
	}

	// Lo que va sobre la meseta (ya dibujada, igual que los caminos)
	function dibujarMundoMapa(q, m, i) {
		const abrir = mapa.abriendo === i ? mapa.abrirT : 99;
		const candado = !desbloqueado(i);
		const apagado = apagadoMundo(i);
		const acercado = mapa.foco === i ? suave(0.6, 1, mapa.z) : 0;
		if (mapa.hover === i || (mapa.sel === i && mapa.foco < 0)) {
			ctx.strokeStyle = conAlfa(COLORES.blanco, 0.55 + 0.35 * Math.sin(tiempo * 5));
			ctx.lineWidth = 6;
			trazarContorno(q.contorno, 0, 0, 1.02, q.x, q.y);
			ctx.stroke();
		}
		const bx = q.x + q.rx * 0.12;
		const by = q.y + q.ry * 0.22;
		for (const a of q.arboles) if (a.y < by) dibujarArbolMapa(a, apagado);
		if (m.completoAlSalirDeLaCueva) dibujarEscenaTalento(bx - 10, by, acercado);
		else dibujarEdificioMapa(bx, by, m, i, apagado, acercado);
		for (const a of q.arboles) if (a.y >= by) dibujarArbolMapa(a, apagado);
		dibujarAnfitrionMapa(q, m, apagado);
		dibujarLetreroMapa(q.x, q.y + q.ry + ACANTILADO * 0.5, m.nombre.toUpperCase(), apagado > 0.5);
		const mx = q.x - q.rx * 0.6;
		const my = q.y - q.ry * 0.5 - 18;
		dibujarMedallaMundo(mx, my, i, m, candado, abrir);
		// Flecha sobre el mundo señalado (vista general)
		if (mapa.sel === i && mapa.foco < 0) {
			const y = my - 46 + Math.sin(tiempo * 5) * 5;
			ctx.fillStyle = COLORES.blanco;
			ctx.strokeStyle = COLORES.verdeProfundo;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(mx - 13, y - 10);
			ctx.lineTo(mx + 13, y - 10);
			ctx.lineTo(mx, y + 6);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	}

	// Caminos entre mundos (en orden) y de la meseta central al primero.
	// Hacia un mundo con candado: gris y punteado.
	function dibujarCaminosMapa() {
		const tramos = [[puntaCamino({ ...CENTRO_MAPA, rx: CENTRO_MAPA.rx * 1.6, ry: CENTRO_MAPA.ry * 1.05 }), puntaCamino(mesetas[0]), 0]];
		for (let i = 0; i + 1 < mesetas.length; i++) tramos.push([puntaCamino(mesetas[i]), puntaCamino(mesetas[i + 1]), i + 1]);
		ctx.lineCap = "round";
		for (const [a, b, destino] of tramos) {
			const abierto = desbloqueado(destino) && mapa.abriendo !== destino;
			const mx = (a.x + b.x) / 2;
			const my = (a.y + b.y) / 2;
			// Curva hacia afuera del centro del mapa
			const ox = mx - MAPA_ANCHO / 2;
			const oy = my - MAPA_ALTO / 2;
			const largo = Math.hypot(ox, oy) || 1;
			const empuje = Math.hypot(b.x - a.x, b.y - a.y) * 0.18;
			const cx = mx + (ox / largo) * empuje;
			const cy = my + (oy / largo) * empuje;
			const trazar = () => {
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.quadraticCurveTo(cx, cy, b.x, b.y);
				ctx.stroke();
			};
			ctx.strokeStyle = conAlfa(COLORES.verdeProfundo, 0.45);
			ctx.lineWidth = 30;
			trazar();
			ctx.strokeStyle = abierto ? mezclar(COLORES.beige, "#ffffff", 0.55) : COLORES.grisClaro;
			ctx.lineWidth = 21;
			trazar();
			ctx.setLineDash([10, 16]);
			ctx.strokeStyle = abierto ? "rgba(255,255,255,0.8)" : "rgba(4,37,35,0.25)";
			ctx.lineWidth = 4;
			trazar();
			ctx.setLineDash([]);
		}
		ctx.lineCap = "butt";
	}

	// Meseta central: plaza de Celaque (el rectángulo HTML va encima)
	function dibujarCentroMapa() {
		const q = mesetaCentro;
		dibujarMesetaBase(q, 0);
		for (const a of q.arboles) dibujarArbolMapa(a, 0);
		ctx.fillStyle = mezclar(COLORES.beige, "#ffffff", 0.55);
		ctx.beginPath();
		ctx.ellipse(q.x, q.y + 10, q.rx * 0.72, q.ry * 0.62, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = conAlfa(COLORES.beige, 0.7);
		ctx.lineWidth = 3;
		ctx.stroke();
	}

	function dibujarOlasMapa() {
		ctx.strokeStyle = conAlfa(COLORES.fondoVerdeClaro, 0.35);
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		for (const o of OLAS_MAPA) {
			const x = o.x + Math.sin(tiempo * 0.8 + o.fase) * 8;
			ctx.beginPath();
			ctx.arc(x, o.y, 9, Math.PI * 1.15, Math.PI * 1.85);
			ctx.arc(x + 16, o.y, 9, Math.PI * 1.15, Math.PI * 1.85);
			ctx.stroke();
		}
		ctx.lineCap = "butt";
	}

	function dibujarNubesMapa() {
		for (const n of NUBES_MAPA) {
			const x = modulo(n.x + tiempo * n.vel, MAPA_ANCHO + 400) - 200;
			const r = 26 * n.tam;
			ctx.fillStyle = "rgba(255,255,255,0.9)";
			circulo(x, n.y, r);
			circulo(x + r * 0.95, n.y + r * 0.25, r * 0.75);
			circulo(x - r * 0.95, n.y + r * 0.3, r * 0.65);
			ctx.fillRect(x - r * 1.5, n.y + r * 0.2, r * 3.1, r * 0.7);
		}
	}

	// El personaje fijo de cada mundo, parado en su meseta con su nombre
	function dibujarAnfitrionMapa(q, m, apagado) {
		const n = m.anfitrionNpc;
		if (!n) return;
		const x = q.x + q.rx * 0.62;
		const pie = q.y + q.ry * 0.52;
		ctx.save();
		if (apagado > 0.5) ctx.globalAlpha = 0.6;
		S = 0.6;
		dibujarNpcFoto(x, pie, n, -1);
		S = 1;
		dibujarPlacaImportante(x, pie - 92, n.nombre);
		ctx.restore();
	}

	// Un punto del mar lejos de las mesetas (para el delfín), o null
	function lugarDeMar() {
		const lejos = (q, x, y) => ((x - q.x) / (q.rx + 110)) ** 2 + ((y - q.y) / (q.ry + ACANTILADO + 90)) ** 2 > 1;
		for (let k = 0; k < 25; k++) {
			const x = 80 + Math.random() * (MAPA_ANCHO - 160);
			const y = 90 + Math.random() * (MAPA_ALTO - 160);
			if (lejos(mesetaCentro, x, y) && mesetas.every((q) => lejos(q, x, y))) return { x, y };
		}
		return null;
	}

	function dibujarDelfin() {
		const d = mapa.delfin;
		if (d.t < 0) return;
		const p = d.t;
		// Salpicadura al salir y al entrar al agua
		for (const [cuando, lado] of [
			[p, -1],
			[1 - p, 1],
		]) {
			if (cuando > 0.25) continue;
			const a = 1 - cuando / 0.25;
			ctx.strokeStyle = `rgba(255,255,255,${(0.85 * a).toFixed(3)})`;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.ellipse(d.x + lado * 70 * d.dir, d.y, 14 + (1 - a) * 22, 5 + (1 - a) * 6, 0, 0, Math.PI * 2);
			ctx.stroke();
		}
		const x = d.x + (p - 0.5) * 140 * d.dir;
		const y = d.y - Math.sin(p * Math.PI) * 80;
		d.cx = x;
		d.cy = y;
		const ang = Math.atan2(-80 * Math.PI * Math.cos(p * Math.PI), 140 * d.dir);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(ang);
		ctx.scale(1, d.dir);
		ctx.fillStyle = "#6f8fa6";
		ctx.beginPath();
		ctx.moveTo(-6, -9);
		ctx.lineTo(4, -23);
		ctx.lineTo(10, -8);
		ctx.fill(); // aleta
		ctx.beginPath();
		ctx.moveTo(-28, 0);
		ctx.lineTo(-42, -10);
		ctx.lineTo(-38, 0);
		ctx.lineTo(-42, 10);
		ctx.closePath();
		ctx.fill(); // cola
		ctx.beginPath();
		ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(31, 2, 8, 4, 0, 0, Math.PI * 2);
		ctx.fill(); // hocico
		ctx.fillStyle = "#dfe8ee";
		ctx.beginPath();
		ctx.ellipse(4, 5, 22, 4.5, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#1a1a1a";
		circulo(20, -3, 2);
		ctx.restore();
	}

	// ¿El toque cayó sobre el delfín? (en px de pantalla)
	function delfinEnPantalla(px, py) {
		const d = mapa.delfin;
		if (d.t < 0) return false;
		const v = vistaMapa();
		return Math.hypot((px - v.ox) / v.k - d.cx, (py - v.oy) / v.k - d.cy) < 45;
	}

	// Ficha del héroe elegido, parada (o caminando) sobre su mundo
	function dibujarHeroeMapa() {
		if (mapa.heroeX === null) return;
		const sAntes = S;
		S = 0.62;
		const o = {
			...aparienciaHeroe(personaje, 1, { dir: mapa.dir, fase: mapa.fase, moviendo: mapa.moviendo, marcha: mapa.moviendo ? 0.45 : 0 }),
			agachado: false,
			atacando: false,
		};
		const sprites = SPRITES_POR_PERSONAJE[personaje];
		if (!(sprites && dibujarHeroeSprite(mapa.heroeX, mapa.heroeY, o, sprites, 1))) dibujarPersona(mapa.heroeX, mapa.heroeY, o);
		S = sAntes;
	}

	// Aviso del mapa (candado, mundo desbloqueado), arriba al centro
	function dibujarMensajeMapa() {
		if (mapa.mensajeT <= 0) return;
		const alfa = Math.min(1, mapa.mensajeT / 0.4);
		ctx.save();
		ctx.globalAlpha = alfa;
		ctx.font = `700 ${Math.round(clamp(W / 50, 15, 22))}px ${FUENTE}`;
		const ancho = Math.min(W - 32, ctx.measureText(mapa.mensaje).width + 40);
		const y = mapa.foco >= 0 ? 92 : 24;
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(W / 2 - ancho / 2, y, ancho, 46, 14);
		ctx.fill();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(mapa.mensaje, W / 2, y + 24, ancho - 24);
		ctx.restore();
	}

	function dibujarMapa(dt) {
		const v = vistaMapa();
		ubicarPanelMapa(v);
		ctx.fillStyle = degradadoAgua();
		ctx.fillRect(0, 0, W, H);
		ctx.setTransform(DPR * v.k, 0, 0, DPR * v.k, DPR * v.ox, DPR * v.oy);
		const sAntes = S;
		S = 1;
		dibujarOlasMapa();
		dibujarDelfin();
		dibujarCentroMapa();
		mesetas.forEach((q, i) => dibujarMesetaBase(q, apagadoMundo(i)));
		dibujarCaminosMapa();
		mesetas.forEach((q, i) => dibujarMundoMapa(q, modulos[i], i));
		dibujarHeroeMapa();
		dibujarNubesMapa();
		S = sAntes;
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		dibujarAves(dt, true); // guacamayas y loros sobre el mar
		dibujarMensajeMapa();
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
		if (estado === "mapa" || estado === "victoria") {
			dibujarMapa(dt);
			dibujarPetalos(dt);
			return;
		}
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
			dibujarFondoOficina(oficinaActual, dt);
			dibujarSueloOficina(oficinaActual);
			dibujarDecoracionOficina(oficinaActual);
			dibujarPuertaSalida(oficinaActual);
			dibujarComputadora(oficinaActual);
			dibujarLetrerosObra("oficina", oficinaActual);
			dibujarGuias();
			dibujarObstaculos(oficinaActual.oficina.obstaculos);
			dibujarCompaneros(oficinaActual);
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
			dibujarAves(dt, heroe.x > FIN_PLANOS); // guacamayas y loros, ya fuera de los planos
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
			dibujarLetrerosObra("cueva");
		} else if (modo === "urbano") {
			dibujarEdificiosSimples(); // relleno gris detrás
			dibujarProyectos(); // Zorzales, Astria, Céfiro
			dibujarEdificiosSalida(); // Atlas al frente
			dibujarModulos(); // un edificio por módulo de capacitación
			dibujarRejas();
			dibujarAves(dt, true); // pasan volando sobre la ciudad
			dibujarLetrerosObra("urbano");
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

			// Los letreros de obra van encima del smog: brillan aunque el mundo
			// todavía esté gris (son la guía)
			dibujarLetrerosObra("afuera");
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

	// ---------- Barrita del jugador ----------
	// Arriba a la izquierda: el nombre, la cara del personaje elegido (un
	// recorte de su foto) y los corazones pixelados. Al recibir un golpe la
	// cara pone la de "golpeado" (con estrellitas) y tiembla; al ganar
	// corazones rebota y salen brillos, y el corazón nuevo aparece de un salto.
	// Recorte del rostro en cada foto, en px de la foto original (1024 x 1536)
	const CARAS = {
		chico: { quieto: [350, 70, 320], golpeado: [490, 90, 320] },
		chica: { quieto: [355, 70, 320], golpeado: [470, 100, 320] },
	};
	// Corazón de 11 x 10 píxeles: k borde, r rojo, w brillo, d sombra
	const CORAZON_PIXEL = [
		"..kk...kk..",
		".krrk.krrk.",
		"krwrrkrrrrk",
		"krwrrrrrrrk",
		"krrrrrrrrdk",
		".krrrrrrdk.",
		"..krrrrdk..",
		"...krrdk...",
		"....kdk....",
		".....k.....",
	];
	const COLOR_PIXEL = { k: "#1a1a1a", r: "#e3262b", w: "#ffd9d9", d: "#a8161b" };
	const COLOR_PIXEL_VACIO = { k: "#1a1a1a", r: "#4a5654", w: "#5f6b69", d: "#3a4442" };
	const barra = {
		cara: $("cara-jugador"),
		corazones: $("corazones-jugador"),
		nombre: $("barra-nombre"),
		vidas: -1,
		dolor: 0, // tiempo que le queda a la cara de golpeado
		feliz: 0,
		salto: [], // por corazón: animación al aparecer (1 → 0)
		roto: -1, // corazón que se acaba de perder
		rotoT: 0,
	};

	function dibujarCorazonPixel(c, x, y, tam, colores) {
		CORAZON_PIXEL.forEach((fila, j) => {
			for (let i = 0; i < fila.length; i++) {
				const k = fila[i];
				if (k === ".") continue;
				c.fillStyle = colores[k];
				c.fillRect(x + i * tam, y + j * tam, tam, tam);
			}
		});
	}

	function actualizarBarraJugador(dt) {
		const ver = !ui.hud.hidden;
		if (barra.cara.parentElement.hidden === ver) barra.cara.parentElement.hidden = !ver;
		if (!ver) {
			barra.vidas = -1;
			return;
		}
		const nombre = nombreJugador || CFG.personajes[personaje].nombre;
		if (barra.nombre.textContent !== nombre) barra.nombre.textContent = nombre;
		const maximo = vidasMax();
		if (barra.vidas >= 0 && vidas > barra.vidas) {
			barra.feliz = 1.4;
			for (let i = barra.vidas; i < vidas; i++) barra.salto[i] = 1;
		} else if (barra.vidas >= 0 && vidas < barra.vidas) {
			barra.dolor = 1;
			barra.roto = vidas;
			barra.rotoT = 0.6;
		}
		if (heroe.golpeado && barra.dolor < 0.5) barra.dolor = 0.9; // también al caer en un hueco
		barra.vidas = vidas;
		barra.dolor = Math.max(0, barra.dolor - dt);
		barra.feliz = barra.dolor > 0 ? 0 : Math.max(0, barra.feliz - dt);
		barra.rotoT = Math.max(0, barra.rotoT - dt);
		for (let i = 0; i < barra.salto.length; i++) if (barra.salto[i] > 0) barra.salto[i] = Math.max(0, barra.salto[i] - dt * 2.5);
		const dpr = DPR;

		// Cara
		const lado = 56;
		const cara = barra.cara;
		if (cara.width !== lado * dpr || cara.height !== lado * dpr) cara.width = cara.height = lado * dpr;
		const c = cara.getContext("2d");
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, lado, lado);
		const sprites = SPRITES_POR_PERSONAJE[personaje];
		const pose = barra.dolor > 0 ? "golpeado" : "quieto";
		const img = sprites && sprites[pose] && sprites[pose].cargando.elemento;
		const recorte = (CARAS[personaje] || CARAS.chico)[pose];
		c.save();
		if (barra.dolor > 0) c.translate(Math.sin(tiempo * 70) * 3 * barra.dolor, 0);
		if (barra.feliz > 0) {
			const bote = Math.abs(Math.sin(barra.feliz * 9)) * 4 * Math.min(1, barra.feliz);
			c.translate(lado / 2, lado / 2 - bote);
			c.scale(1 + 0.06 * Math.min(1, barra.feliz), 1 + 0.06 * Math.min(1, barra.feliz));
			c.translate(-lado / 2, -lado / 2);
		}
		if (img) {
			const k = img.naturalWidth / 1024;
			c.drawImage(img, recorte[0] * k, recorte[1] * k, recorte[2] * k, recorte[2] * k, 0, 0, lado, lado);
		} else {
			c.fillStyle = COLORES.verdeInstitucional;
			c.beginPath();
			c.arc(lado / 2, lado / 2, lado * 0.32, 0, Math.PI * 2);
			c.fill();
		}
		c.restore();
		if (barra.dolor > 0) {
			c.fillStyle = `rgba(227,38,43,${(0.35 * barra.dolor).toFixed(3)})`;
			c.fillRect(0, 0, lado, lado);
		}
		if (barra.feliz > 0) {
			// Brillos alrededor de la cara
			c.fillStyle = `rgba(255,236,150,${Math.min(1, barra.feliz).toFixed(3)})`;
			for (let k = 0; k < 4; k++) {
				const ang = tiempo * 3 + (k * Math.PI) / 2;
				const x = lado / 2 + Math.cos(ang) * 22;
				const y = lado / 2 + Math.sin(ang) * 22;
				c.beginPath();
				c.moveTo(x, y - 5);
				c.lineTo(x + 1.5, y - 1.5);
				c.lineTo(x + 5, y);
				c.lineTo(x + 1.5, y + 1.5);
				c.lineTo(x, y + 5);
				c.lineTo(x - 1.5, y + 1.5);
				c.lineTo(x - 5, y);
				c.lineTo(x - 1.5, y - 1.5);
				c.fill();
			}
		}

		// Corazones (2 px por píxel del dibujo)
		const tam = 2;
		const paso = 11 * tam + 4;
		const anchoC = Math.max(1, maximo) * paso;
		const altoC = 10 * tam + 8; // espacio para el salto
		const lienzo = barra.corazones;
		if (lienzo.width !== anchoC * dpr || lienzo.height !== altoC * dpr) {
			lienzo.width = anchoC * dpr;
			lienzo.height = altoC * dpr;
			lienzo.style.width = anchoC + "px";
			lienzo.style.height = altoC + "px";
		}
		const h = lienzo.getContext("2d");
		h.setTransform(dpr, 0, 0, dpr, 0, 0);
		h.clearRect(0, 0, anchoC, altoC);
		for (let i = 0; i < maximo; i++) {
			const lleno = i < vidas;
			const salto = barra.salto[i] || 0;
			let x = i * paso;
			let y = 6 - Math.sin(salto * Math.PI) * 6;
			if (i === barra.roto && barra.rotoT > 0) {
				x += Math.sin(tiempo * 60) * 2;
				y += (0.6 - barra.rotoT) * 6;
			}
			dibujarCorazonPixel(h, x, y, tam, lleno ? COLOR_PIXEL : COLOR_PIXEL_VACIO);
		}
	}

	// ---------- Bucle principal ----------
	cargarProgreso();
	abrirMapa();
	if (!ayudaYaVista()) abrirAyuda();
	let ultimo = performance.now();
	function bucle(ahora) {
		const dt = Math.min(0.05, (ahora - ultimo) / 1000);
		ultimo = ahora;
		tiempo += dt;
		actualizar(dt);
		dibujar(dt);
		if (estado === "mapa" && mapa.foco < 0) dibujarVistasPrevias();
		actualizarBarraJugador(dt);
		if (estado === "terminal" && oficinaActual && !ui.terminalFigura.hidden) dibujarFiguraTerminal(oficinaActual);
		requestAnimationFrame(bucle);
	}
	requestAnimationFrame(bucle);
})();
