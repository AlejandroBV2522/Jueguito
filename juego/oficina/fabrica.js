/* Camino a Celaque — los obstáculos de la fábrica de Procesos: la prensa y la cinta transportadora. Ver juego/LEEME.md. */
"use strict";

// ---------- Fábrica (mundo.js → oficina.vista "fabrica", Procesos) ----------
// Usa el mismo recorrido por zonas y riesgos de la obra (obra.js, modulos.js);
// aquí solo viven los dos peligros que se mueven (mundo.js → zonas[].peligro):
// la prensa y la cinta transportadora. Cómo se dibujan: dibujo-fabrica.js.

const esFabrica = (of) => !!(of && of.exterior && of.vista === "fabrica");

// ---------- La cinta transportadora (peligro tipo "cinta") ----------
// Un tramo de piso que se mueve solo, primero hacia adelante y luego hacia
// atrás, con una pausa entre uno y otro. Quien camina encima va con ella: a
// favor ayuda y en contra frena, pero nunca impide cruzar ni quita corazones.
const CINTA = { largo: 520, velocidad: 85, tramo: 4.5, pausa: 1 };

// Hacia dónde va la cinta en el instante t: 1 = adelante, -1 = atrás, 0 = quieta
function sentidoCinta(t) {
	const ciclo = 2 * (CINTA.tramo + CINTA.pausa);
	const fase = ((t % ciclo) + ciclo) % ciclo;
	if (fase < CINTA.tramo) return 1;
	if (fase < CINTA.tramo + CINTA.pausa) return 0;
	if (fase < 2 * CINTA.tramo + CINTA.pausa) return -1;
	return 0;
}

function actualizarCinta(p, dt) {
	p.t += dt;
	// Arranca y frena con suavidad
	const meta = sentidoCinta(p.t) * CINTA.velocidad;
	p.vel += clamp(meta - p.vel, -260 * dt, 260 * dt);
	p.avance = (p.avance || 0) + p.vel * dt; // lo que se desplazan las marcas dibujadas
	if (heroe.y <= 2 && heroe.x > p.desde && heroe.x < p.hasta) heroe.x = clamp(heroe.x + p.vel * dt, p.desde - 4, p.hasta + 4);
}

// ---------- La prensa (peligro tipo "prensa") ----------
// Una prensa de fábrica entre dos columnas: espera arriba (se pasa por debajo
// sin problema), avisa con luz y temblor, baja de golpe, queda abajo un
// momento y sube. Quien esté debajo cuando baja sale empujado hacia atrás: no
// pierde corazones, solo tiene que volver a intentar.
const PRENSA = { arriba: 2.6, aviso: 0.8, bajando: 0.14, abajo: 0.9, subiendo: 0.5, mitad: 46 };
const SIGUIENTE_PRENSA = { arriba: "aviso", aviso: "bajando", bajando: "abajo", abajo: "subiendo", subiendo: "arriba" };

function actualizarPrensa(p, dt) {
	p.t += dt;
	if (p.t >= PRENSA[p.estado]) {
		p.t -= PRENSA[p.estado];
		p.estado = SIGUIENTE_PRENSA[p.estado];
		p.golpe = false;
	}
	// Qué tan abajo está el cabezal (0 = arriba del todo, 1 = en el piso)
	const f = p.estado === "bajando" ? p.t / PRENSA.bajando : p.estado === "abajo" ? 1 : p.estado === "subiendo" ? 1 - p.t / PRENSA.subiendo : 0;
	p.h = clamp(f, 0, 1);
	// Cerca del piso, el cabezal ocupa el paso: quien esté debajo sale empujado hacia atrás
	if (p.h > 0.35 && Math.abs(heroe.x - p.x) < (PRENSA.mitad + 12) * S) {
		heroe.x = p.x - (PRENSA.mitad + 30) * S;
		if (!p.golpe) {
			p.golpe = true;
			heroe.golpeado = true;
			heroe.golpeadoT = 0;
			sonar("caida");
			avisos.push({ texto: "¡Cuidado con la prensa!", t: 0 });
		}
	}
}

// ---------- Todos los peligros de la fábrica, cada cuadro ----------
function actualizarPeligrosFabrica(of, dt) {
	for (const p of of.peligros) {
		if (p.tipo !== "cinta" && p.tipo !== "prensa") continue;
		if (!p.listo) iniciarPeligroFabrica(p);
		if (p.tipo === "cinta") actualizarCinta(p, dt);
		else actualizarPrensa(p, dt);
	}
}

// Deja el peligro como al principio (también al repetir la fábrica); la primera vez lo prepara
function iniciarPeligroFabrica(p) {
	p.listo = true;
	p.t = 0;
	if (p.tipo === "cinta") {
		p.desde = p.x - CINTA.largo / 2;
		p.hasta = p.x + CINTA.largo / 2;
		p.vel = 0;
		p.avance = 0;
	} else {
		p.estado = "arriba";
		p.h = 0;
		p.golpe = false;
	}
}
