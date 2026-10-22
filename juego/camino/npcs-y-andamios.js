/* Camino a Celaque — la gente del camino, sus andamios y los antivalores de la Cueva. Ver juego/LEEME.md. */
"use strict";

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
