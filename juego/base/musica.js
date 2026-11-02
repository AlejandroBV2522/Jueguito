/* Camino a Celaque — música de fondo 8 bits, compuesta para el juego. Ver juego/LEEME.md. */
"use strict";

// ---------- Música ----------
// Melodías propias (no son de nadie más: no hay derechos que cuidar ni
// archivos que bajar) que se tocan con osciladores de Web Audio, como los
// efectos de sonido.js. Suena bajito y, cada vez que suena un efecto, baja
// un momento (agacharMusica) para no taparlo. "Sin sonido" la apaga junto
// con los efectos; "Música" la apaga sola (ajustes.js → ajustes.musica).
// El navegador solo deja sonar después de una tecla o un toque
// (controles.js → musica.permitida).
//
// Cada pista: tempo, y la melodía y el bajo en corcheas, separadas por
// espacios: una nota ("C5", "Bb4"), "-" sigue sonando la anterior y "."
// es silencio. Las dos partes tienen el mismo largo y se repiten. Cada
// compás (8 corcheas) va sobre un acorde (el del bajo) y en los tiempos
// fuertes la melodía toca notas de ese acorde: así no "chocan" entre sí.
// La melodía va dos o tres octavas arriba del bajo, para no encimarse.
const PISTAS_MUSICA = {
	// Camino a Celaque: tranquila, para el mapa y los niveles
	// Acordes: C · Am · F · G | C · Am · F · G-C
	general: {
		bpm: 100,
		melodia:
			"E5 - G5 - C6 - B5 A5  A5 - E5 - C5 - D5 E5  F5 - A5 - C6 A5 G5 F5  D5 - B4 - G4 - . .  " +
			"E5 - G5 - C6 - D6 C6  C6 - A5 - E5 - F5 G5  A5 G5 F5 E5 C5 - E5 F5  D5 - B4 - C5 - - .",
		bajo:
			"C3 . G3 . C3 . G3 .  A2 . E3 . A2 . E3 .  F2 . C3 . F2 . C3 .  G2 . D3 . G2 . D3 .  " +
			"C3 . G3 . C3 . G3 .  A2 . E3 . A2 . E3 .  F2 . C3 . F2 . C3 .  G2 . D3 . C3 - - .",
	},
	// El parlante de Heber en la Cafetería: más alegre
	// Acordes: F · Dm · Bb · C | F · Dm · Bb · C-F
	cafe: {
		bpm: 126,
		melodia:
			"C5 F5 A5 F5 C6 - A5 .  D5 F5 A5 F5 D6 - A5 .  D5 F5 Bb5 - D6 - Bb5 .  E5 G5 C6 - Bb5 - G5 .  " +
			"A5 - A5 C6 - A5 F5 .  F5 - F5 A5 - F5 D5 .  D5 F5 Bb5 - F5 - D5 -  E5 G5 E5 C5 F5 - - .",
		bajo:
			"F2 . F3 . F2 . F3 .  D2 . D3 . D2 . D3 .  Bb1 . Bb2 . Bb1 . Bb2 .  C2 . C3 . C2 . C3 .  " +
			"F2 . F3 . F2 . F3 .  D2 . D3 . D2 . D3 .  Bb1 . Bb2 . Bb1 . Bb2 .  C2 . C3 . F2 - - .",
	},
};
const VOLUMEN_MUSICA = 0.05; // bajo: los efectos (sonido.js) van con 0.22
const SEMITONOS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "Bb4" → frecuencia en Hz; "-" y "." quedan igual
function leerNota(t) {
	const m = /^([A-G])(b|#)?(-?\d)$/.exec(t);
	if (!m) return t;
	const midi = 12 * (Number(m[3]) + 1) + SEMITONOS[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0);
	return 440 * 2 ** ((midi - 69) / 12);
}
// Cada parte como lista de { frec, corcheas } (null = silencio)
function leerParte(texto) {
	const lista = [];
	for (const t of texto.trim().split(/\s+/).map(leerNota)) {
		if (t === "-" && lista.length) lista[lista.length - 1].corcheas++;
		else lista.push({ frec: typeof t === "number" ? t : null, corcheas: 1 });
	}
	return lista;
}
for (const p of Object.values(PISTAS_MUSICA)) {
	p.partes = [
		{ notas: leerParte(p.melodia), forma: "square", vol: 0.5 },
		{ notas: leerParte(p.bajo), forma: "triangle", vol: 0.9 },
	];
}

const musica = { permitida: false, pista: null, salida: null, partes: [], volumen: 1, agachadaHasta: 0 };

// Qué pista va ahora y qué tan fuerte (0..1): en la Cafetería, la de
// Heber, más fuerte cerca de su terraza
function pistaActual() {
	const of = oficinaActual && oficinaActual.oficina;
	if (of && of.estacion === "cafe") {
		const t = of.terraza;
		const cerca = t ? clamp(1 - Math.abs(heroe.x - t.x) / 1400, 0, 1) : 0.5;
		return { nombre: "cafe", volumen: 0.45 + 0.75 * cerca };
	}
	return { nombre: "general", volumen: 1 };
}

// Un efecto acaba de sonar: la música baja un momento
function agacharMusica() {
	if (!musica.salida) return;
	const ac = musica.salida.context;
	musica.agachadaHasta = ac.currentTime + 0.45;
}

// Se llama en cada cuadro (bucle.js): programa las notas de los próximos
// 0.3 s con el reloj del audio (así no tiembla aunque un cuadro se atrase)
function actualizarMusica() {
	if (!musica.permitida || !ajustes.sonido || !ajustes.musica) {
		if (musica.salida) musica.salida.gain.setTargetAtTime(0, musica.salida.context.currentTime, 0.05);
		musica.pista = null;
		return;
	}
	const ac = contextoAudio();
	if (!ac) return;
	try {
		if (!musica.salida) {
			musica.salida = ac.createGain();
			musica.salida.gain.value = 0;
			musica.salida.connect(ac.destination);
		}
		const { nombre, volumen } = pistaActual();
		const ahora = ac.currentTime;
		const objetivo = VOLUMEN_MUSICA * volumen * (ahora < musica.agachadaHasta ? 0.3 : 1);
		musica.salida.gain.setTargetAtTime(objetivo, ahora, ahora < musica.agachadaHasta ? 0.03 : 0.25);
		if (nombre !== musica.pista) {
			// Pista nueva: empieza desde el principio, cuando ya terminó lo que
			// estaba programado de la anterior (las dos no suenan encimadas)
			const libre = Math.max(ahora + 0.15, ...musica.partes.map((p) => p.cuando + 0.1));
			musica.pista = nombre;
			musica.partes = PISTAS_MUSICA[nombre].partes.map(() => ({ k: 0, cuando: libre }));
		}
		const pista = PISTAS_MUSICA[nombre];
		const corchea = 60 / pista.bpm / 2;
		pista.partes.forEach((parte, j) => {
			const estado = musica.partes[j];
			if (estado.cuando < ahora - 0.5) estado.cuando = ahora + 0.05; // la pestaña estuvo dormida
			while (estado.cuando < ahora + 0.3) {
				const n = parte.notas[estado.k];
				const dura = n.corcheas * corchea;
				if (n.frec) notaMusica(ac, n.frec, estado.cuando, dura * 0.88, parte.forma, parte.vol);
				estado.cuando += dura;
				estado.k = (estado.k + 1) % parte.notas.length;
			}
		});
	} catch (e) {
		/* sin música */
	}
}

function notaMusica(ac, frec, t, dura, forma, vol) {
	const osc = ac.createOscillator();
	const env = ac.createGain();
	osc.type = forma;
	osc.frequency.setValueAtTime(frec, t);
	env.gain.setValueAtTime(0.0001, t);
	env.gain.exponentialRampToValueAtTime(vol, t + 0.01);
	env.gain.setValueAtTime(vol * 0.7, t + Math.min(0.08, dura * 0.5));
	env.gain.exponentialRampToValueAtTime(0.0001, t + dura);
	osc.connect(env);
	env.connect(musica.salida);
	osc.start(t);
	osc.stop(t + dura + 0.02);
}
