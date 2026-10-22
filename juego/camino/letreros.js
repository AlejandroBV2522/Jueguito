/* Camino a Celaque — dónde van los letreros de obra. Ver juego/LEEME.md. */
"use strict";

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
