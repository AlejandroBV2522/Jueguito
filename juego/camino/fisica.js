/* Camino a Celaque — física del salto, huecos y obstáculos de la Cueva, barreras. Ver juego/LEEME.md. */
"use strict";

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
// En el modo fácil (ajustes.js) sube ~32 % más y dura más en el aire:
// caminando ya alcanza para pasar los huecos de la Cueva.
const impulsoSalto = () => IMPULSO_SALTO * (modoFacil() ? 1.15 : 1);
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
const FIN_PLANOS = 1200; // el tramo gris del inicio (antes 2200: se acortó para llegar antes al color)
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
	{ x: 2050, tipo: "barrera", medioAncho: 38, alto: 60 },
	{ x: 2950, tipo: "barrera", medioAncho: 38, alto: 60 },
	{ x: 3850, tipo: "barrera", medioAncho: 38, alto: 70 },
	{ x: 5450, tipo: "barrera", medioAncho: 38, alto: 70 },
];
