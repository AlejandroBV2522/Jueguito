/* Camino a Celaque — virus que cruzan la oficina de Seguridad. Ver juego/LEEME.md. */
"use strict";

// ---------- Virus en la oficina (mundo.js → oficina.virus) ----------
// Cuando ya hablaste con el anfitrión (él explica qué hacer), salen virus
// desde el fondo hacia ti: los que vuelan alto se esquivan agachándose y
// los que ruedan por el piso, saltando. Si uno te toca pierdes un corazón;
// sin corazones retrocedes un tramo y se llenan otra vez (sin más castigo).
const VIRUS = {
	cada: 2.3, // segundos entre un virus y el siguiente
	velocidad: 260, // px por segundo, hacia la izquierda
	radio: 10, // para el choque (en unidades de S, como heroe.y); se dibuja más grande, para perdonar roces
	alto: 92, // altura del centro de los que vuelan (agáchate)
	bajo: 14, // altura del centro de los que ruedan (salta)
	inmune: 1.2, // segundos sin otro golpe después de uno
};
// Alto del héroe para el choque (en unidades de heroe.y)
const ALTO_HEROE_PARADO = 108;
const ALTO_HEROE_AGACHADO = 70;
const virusOficina = { oficina: null, lista: [], reloj: 0, cuenta: 0, inmune: 0, avisado: false };

function actualizarVirus(dt) {
	const m = oficinaActual;
	const v = virusOficina;
	if (v.oficina !== m) {
		// Al entrar a una oficina (o salir de ella) no queda ningún virus
		Object.assign(v, { oficina: m, lista: [], reloj: VIRUS.cada * 0.5, cuenta: 0, inmune: 0, avisado: false });
	}
	if (!m || !m.oficina.virus || estado !== "oficina") return;
	const of = m.oficina;
	v.inmune = Math.max(0, v.inmune - dt);

	// Salen después de hablar con el anfitrión y dejan de salir cerca del
	// antivirus. Mientras hablas con alguien el juego se detiene: no te dan.
	if (of.companeros[0].hablado && heroe.x < of.terminalX - 260) {
		if (!v.avisado) {
			v.avisado = true;
			avisos.push({ texto: esTactil ? "¡Virus! Agáchate o salta" : "¡Virus! ↓ agáchate · ↑ salta", t: 0 });
		}
		v.reloj -= dt;
		if (v.reloj <= 0) {
			v.reloj = VIRUS.cada;
			// Dos que vuelan alto (agacharse) por cada uno que rueda (saltar)
			v.lista.push({ x: Math.min(camara + W + 40, of.terminalX - 120), alto: v.cuenta++ % 3 !== 2, giro: 0, pum: 0 });
		}
	}

	for (const z of v.lista) {
		if (z.pum > 0) {
			z.pum += dt; // se deshace al chocar
			continue;
		}
		z.x -= VIRUS.velocidad * dt;
		z.giro += dt * (z.alto ? 3 : -9); // los del piso ruedan
		if (v.inmune > 0) continue;
		const cy = z.alto ? VIRUS.alto : VIRUS.bajo;
		const arriba = heroe.y + (heroe.agachado ? ALTO_HEROE_AGACHADO : ALTO_HEROE_PARADO);
		const cerca = Math.abs(z.x - heroe.x) < (16 + VIRUS.radio) * S;
		if (cerca && cy - VIRUS.radio < arriba && cy + VIRUS.radio > heroe.y) golpeDeVirus(z, of);
	}
	v.lista = v.lista.filter((z) => z.pum < 0.4 && z.x > camara - 80);
}

function golpeDeVirus(z, of) {
	const v = virusOficina;
	z.pum = 0.001;
	v.inmune = VIRUS.inmune;
	heroe.golpeado = true;
	heroe.golpeadoT = 0;
	heroe.x = frenarEnObstaculos(heroe.x, Math.max(of.x0 + 40, heroe.x - 50), -1, heroe.y);
	vidas--;
	if (vidas > 0) return;
	// Sin corazones: retrocedes un tramo y se llenan otra vez
	vidas = vidasMax();
	v.lista = [];
	v.reloj = VIRUS.cada;
	heroe.y = 0;
	heroe.x = frenarEnObstaculos(heroe.x, Math.max(of.x0 + 110, heroe.x - 350), -1, 0);
	heroe.velY = 0;
	avisos.push({ texto: "¡Te infectaron! Inténtalo otra vez", t: 0 });
}

function dibujarVirusOficina() {
	const v = virusOficina;
	if (v.oficina !== oficinaActual) return;
	for (const z of v.lista) {
		const sx = z.x - camara;
		if (sx < -60 || sx > W + 60) continue;
		const flota = z.alto ? Math.sin(tiempo * 6 + z.x * 0.02) * 3 * S : 0;
		const cy = SUELO + 38 * S - (z.alto ? VIRUS.alto : VIRUS.bajo) * S + flota;
		if (z.pum > 0) {
			// Se deshace en un anillo rojo
			ctx.strokeStyle = conAlfa("#e3262b", 1 - z.pum / 0.4);
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.arc(sx, cy, (14 + z.pum * 60) * S, 0, Math.PI * 2);
			ctx.stroke();
			continue;
		}
		// Estela hacia atrás y un halo blanco para que se vea sobre cualquier fondo
		ctx.fillStyle = conAlfa("#e3262b", 0.25);
		rectRedondo(sx, cy - 7 * S, 60 * S, 14 * S, 7 * S);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.75)";
		circulo(sx, cy, 17 * S);
		dibujarVirus(sx, cy, 1.8, z.giro, 1);
	}
}
