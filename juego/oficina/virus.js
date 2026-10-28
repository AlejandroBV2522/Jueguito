/* Camino a Celaque — virus que cruzan la oficina de Seguridad. Ver juego/LEEME.md. */
"use strict";

// ---------- Virus en la oficina (mundo.js → oficina.virus) ----------
// Cuando ya hablaste con el anfitrión (él explica qué hacer), salen virus
// desde el fondo hacia ti: los que vuelan alto se esquivan agachándose y
// los que ruedan por el piso, saltando. Si uno te toca pierdes un corazón;
// sin corazones vuelves a empezar este mundo, con los corazones llenos.
// Mientras más avanzas, salen más seguido y, pasada la mitad, a veces en
// pareja (uno alto y uno bajo). Con oficina.anzuelos, además bajan del
// techo anzuelos de phishing (un correo con gancho) en los tramos libres:
// se pasa por debajo cuando suben.
const VIRUS = {
	cada: 2.3, // segundos entre un virus y el siguiente (al principio)
	cadaFinal: 1.5, // ...y al llegar al antivirus
	pareja: 0.8, // segundos entre los dos virus de una pareja
	velocidad: 260, // px por segundo, hacia la izquierda
	radio: 10, // para el choque (en unidades de S, como heroe.y); se dibuja más grande, para perdonar roces
	alto: 92, // altura del centro de los que vuelan (agáchate)
	bajo: 14, // altura del centro de los que ruedan (salta)
	inmune: 1.2, // segundos sin otro golpe después de uno
};
// Alto del héroe para el choque (en unidades de heroe.y)
const ALTO_HEROE_PARADO = 108;
const ALTO_HEROE_AGACHADO = 70;
const ANZUELO = {
	vuelta: 3, // segundos de un ciclo: arriba, baja, se queda abajo, sube
	arriba: 330, // altura de la punta cuando está arriba (ni saltando lo tocas)
	abajo: 12, // ...y cuando baja hasta el piso
	radio: 20, // el correo con el gancho (de la punta hacia arriba: 2 × radio)
	medioAncho: 14,
};
const virusOficina = { oficina: null, lista: [], reloj: 0, cuenta: 0, inmune: 0, avisado: false, pareja: null, relojAnzuelos: 0, avisoAnzuelo: false };

// Dónde cuelgan los anzuelos: a la mitad de cada tramo libre (lejos de los
// muebles y de los compañeros), después del anfitrión y antes del antivirus
function anzuelosDe(of) {
	if (!of.anzuelos) return [];
	if (of.listaAnzuelos) return of.listaAnzuelos;
	const desde = of.companeros[0].x + 250;
	const hasta = of.terminalX - 380;
	const ocupados = [
		...of.obstaculos.map((o) => ({ x: o.x, r: o.medioAncho + 70 })),
		...of.companeros.map((n) => ({ x: n.x, r: 170 })),
		{ x: hasta, r: 0 },
	].sort((a, b) => a.x - b.x);
	of.listaAnzuelos = [];
	for (let k = 1; k < ocupados.length; k++) {
		const izq = ocupados[k - 1].x + ocupados[k - 1].r;
		const der = ocupados[k].x - ocupados[k].r;
		const x = (izq + der) / 2;
		if (der - izq >= 100 && x >= desde && x <= hasta) of.listaAnzuelos.push({ x, fase: of.listaAnzuelos.length * 0.37 });
	}
	return of.listaAnzuelos;
}
// Altura de la punta del anzuelo en el reloj t: arriba, baja rápido, se queda
// abajo un momento y sube
function alturaAnzuelo(a, t) {
	const p = modulo(t / ANZUELO.vuelta + a.fase, 1);
	const suave = (u) => u * u * (3 - 2 * u);
	const bajada = p < 0.45 ? 0 : p < 0.58 ? suave((p - 0.45) / 0.13) : p < 0.8 ? 1 : 1 - suave((p - 0.8) / 0.2);
	return ANZUELO.arriba + (ANZUELO.abajo - ANZUELO.arriba) * bajada;
}

function actualizarVirus(dt) {
	const m = oficinaActual;
	const v = virusOficina;
	if (v.oficina !== m) {
		// Al entrar a una oficina (o salir de ella) no queda ningún virus
		Object.assign(v, { oficina: m, lista: [], reloj: VIRUS.cada * 0.5, cuenta: 0, inmune: 0, avisado: false, pareja: null, relojAnzuelos: 0, avisoAnzuelo: false });
	}
	if (!m || !(m.oficina.virus || m.oficina.anzuelos) || estado !== "oficina") return;
	const of = m.oficina;
	v.inmune = Math.max(0, v.inmune - dt);

	// Salen después de hablar con el anfitrión y dejan de salir cerca del
	// antivirus. Mientras hablas con alguien el juego se detiene: no te dan.
	if (of.virus && of.companeros[0].hablado && heroe.x < of.terminalX - 260) {
		if (!v.avisado) {
			v.avisado = true;
			avisos.push({ texto: esTactil ? "¡Virus! Agáchate o salta" : "¡Virus! ↓ agáchate · ↑ salta", t: 0 });
		}
		const avance = clamp((heroe.x - of.x0) / (of.terminalX - of.x0), 0, 1);
		const salida = Math.min(camara + W + 40, of.terminalX - 120);
		v.reloj -= dt;
		if (v.reloj <= 0) {
			v.reloj = VIRUS.cada + (VIRUS.cadaFinal - VIRUS.cada) * avance;
			// Dos que vuelan alto (agacharse) por cada uno que rueda (saltar)
			const alto = v.cuenta++ % 3 !== 2;
			v.lista.push({ x: salida, alto, giro: 0, pum: 0 });
			// Pasada la mitad, uno de cada cuatro trae pareja (del otro tipo)
			if (avance > 0.45 && v.cuenta % 4 === 0) v.pareja = { t: VIRUS.pareja, alto: !alto };
		}
		if (v.pareja && (v.pareja.t -= dt) <= 0) {
			v.lista.push({ x: salida, alto: v.pareja.alto, giro: 0, pum: 0 });
			v.pareja = null;
		}
	}

	// Anzuelos de phishing: siempre suben y bajan (menos mientras hablas)
	v.relojAnzuelos += dt;
	for (const a of anzuelosDe(of)) {
		const d = a.x - heroe.x;
		if (!v.avisoAnzuelo && d > 0 && d < 420 && of.companeros[0].hablado) {
			v.avisoAnzuelo = true;
			avisos.push({ texto: "¡Anzuelo de phishing! Pasa cuando suba", t: 0 });
		}
		if (v.inmune > 0 || Math.abs(d) > (16 + ANZUELO.medioAncho) * S) continue;
		const punta = alturaAnzuelo(a, v.relojAnzuelos);
		const arriba = heroe.y + (heroe.agachado ? ALTO_HEROE_AGACHADO : ALTO_HEROE_PARADO);
		if (punta < arriba && punta + 2 * ANZUELO.radio > heroe.y) golpear(of);
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
	z.pum = 0.001;
	golpear(of);
}

// Un virus o un anzuelo te dio: te empuja hacia atrás y pierdes un corazón
function golpear(of) {
	const v = virusOficina;
	v.inmune = VIRUS.inmune;
	if (modoFacil()) {
		// Modo fácil (ajustes.js): tu brillo los deshace, ni empujan ni quitan corazones
		lanzarChispas(heroe.x, heroe.y + 60, 10, ["#ffd23f", "#fff1c1", COLORES.blanco]);
		sonar("pieza");
		return;
	}
	heroe.golpeado = true;
	heroe.golpeadoT = 0;
	heroe.x = frenarEnObstaculos(heroe.x, Math.max(of.x0 + 40, heroe.x - 50), -1, heroe.y);
	sonar("golpe");
	if (!perderCorazon()) return;
	// Sin corazones: se repite este mundo desde la entrada (solo este), con
	// los corazones llenos otra vez
	const m = oficinaActual;
	v.lista = [];
	heroe.moviendo = heroe.corriendo = false;
	estado = "transicion";
	transicion = {
		t: 0,
		dur: 0.9,
		luego: () => {
			iniciarOficina(m);
			avisos.push({ texto: `¡Te infectaron! Vuelves a empezar ${m.nombre}`, t: 0 });
		},
	};
}

function dibujarVirusOficina() {
	const v = virusOficina;
	if (v.oficina !== oficinaActual) return;
	for (const a of anzuelosDe(oficinaActual.oficina)) dibujarAnzuelo(a.x - camara, alturaAnzuelo(a, v.relojAnzuelos));
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

// Anzuelo de phishing: cuelga del techo con un sobre de correo de carnada
// y el gancho abajo. punta = altura de la punta (en unidades de heroe.y).
function dibujarAnzuelo(sx, punta) {
	if (sx < -60 || sx > W + 60) return;
	const pie = SUELO + 38 * S;
	const y = pie - punta * S; // la punta del gancho
	const sobre = y - 2 * ANZUELO.radio * S; // arriba del correo
	ctx.strokeStyle = "rgba(4,37,35,0.55)";
	ctx.lineWidth = 1.5 * S;
	ctx.beginPath();
	ctx.moveTo(sx, 34 * S);
	ctx.lineTo(sx, sobre + 4 * S);
	ctx.stroke();
	// Sombra en el piso: más oscura mientras más baja
	ctx.fillStyle = conAlfa("#e3262b", 0.08 + 0.22 * (1 - (punta - ANZUELO.abajo) / (ANZUELO.arriba - ANZUELO.abajo)));
	ctx.beginPath();
	ctx.ellipse(sx, pie, 26 * S, 6 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	// El correo de carnada, con un signo de alerta
	const w = 30 * S, h = 21 * S, cy = sobre + 4 * S;
	ctx.fillStyle = "rgba(255,255,255,0.8)";
	rectRedondo(sx - w / 2 - 3 * S, cy - 3 * S, w + 6 * S, h + 6 * S, 5 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	ctx.strokeStyle = "#e3262b";
	ctx.lineWidth = 2 * S;
	ctx.fillRect(sx - w / 2, cy, w, h);
	ctx.strokeRect(sx - w / 2, cy, w, h);
	ctx.beginPath();
	ctx.moveTo(sx - w / 2, cy);
	ctx.lineTo(sx, cy + h * 0.55);
	ctx.lineTo(sx + w / 2, cy);
	ctx.stroke();
	ctx.fillStyle = "#e3262b";
	circulo(sx + w / 2, cy, 6 * S);
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `bold ${9 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("!", sx + w / 2, cy + 0.5 * S);
	// El gancho, que baja del correo y se curva hacia arriba
	ctx.strokeStyle = "#5d6b70";
	ctx.lineWidth = 3 * S;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(sx, cy + h);
	ctx.lineTo(sx, y - 8 * S);
	ctx.arc(sx + 7 * S, y - 8 * S, 7 * S, Math.PI, 0, true);
	ctx.lineTo(sx + 14 * S, y - 14 * S);
	ctx.stroke();
	ctx.lineCap = "butt";
}
