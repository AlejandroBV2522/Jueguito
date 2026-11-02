/* Camino a Celaque — efectos de sonido: archivos propios o sintetizados. Ver juego/LEEME.md. */
"use strict";

// ---------- Sonido ----------
// Cada efecto puede tener su archivo en assets/sonidos/ (config.js →
// sonidos). Sin archivo, o si no carga, se arma con osciladores de Web
// Audio, sin nada que bajar.
// El navegador solo deja sonar después de un clic o una tecla, y casi
// todo lo que suena pasa justo después de uno. Si el navegador no tiene
// Web Audio, el juego sigue en silencio.
let audio = null;
let volumenGeneral = null;

function contextoAudio() {
	if (!ajustes.sonido) return null;
	try {
		if (!audio) {
			const Contexto = window.AudioContext || window.webkitAudioContext;
			if (!Contexto) return null;
			audio = new Contexto();
			volumenGeneral = audio.createGain();
			volumenGeneral.gain.value = 0.22; // se juega en la oficina: bajito
			volumenGeneral.connect(audio.destination);
		}
		if (audio.state === "suspended") audio.resume();
		return audio;
	} catch (e) {
		return null;
	}
}

// Una nota: frecuencia (Hz), cuándo empieza y cuánto dura (s), forma de
// onda, volumen y, si se da, a qué frecuencia se desliza.
function nota(ac, frec, inicio, dura, forma = "square", vol = 0.5, hasta = 0) {
	const t = ac.currentTime + inicio;
	const osc = ac.createOscillator();
	const env = ac.createGain();
	osc.type = forma;
	osc.frequency.setValueAtTime(frec, t);
	if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t + dura);
	env.gain.setValueAtTime(0.0001, t);
	env.gain.exponentialRampToValueAtTime(vol, t + 0.012);
	env.gain.exponentialRampToValueAtTime(0.0001, t + dura);
	osc.connect(env);
	env.connect(volumenGeneral);
	osc.start(t);
	osc.stop(t + dura + 0.02);
}

// Cada efecto: [frecuencia, inicio, duración, forma, volumen, deslizar a]
const EFECTOS = {
	salto: [[320, 0, 0.14, "square", 0.25, 640]],
	acierto: [
		[660, 0, 0.1, "square", 0.3],
		[990, 0.09, 0.18, "square", 0.3],
	],
	error: [[220, 0, 0.28, "sawtooth", 0.25, 110]],
	golpe: [[180, 0, 0.18, "triangle", 0.6, 60]],
	caida: [[600, 0, 0.5, "triangle", 0.4, 90]],
	dialogo: [[520, 0, 0.06, "triangle", 0.35]],
	candado: [
		[140, 0, 0.08, "square", 0.3],
		[120, 0.09, 0.1, "square", 0.3],
	],
	tubo: [
		[500, 0, 0.12, "square", 0.25, 250],
		[400, 0.13, 0.12, "square", 0.25, 200],
		[300, 0.26, 0.16, "square", 0.25, 150],
	],
	nivel: [
		[523, 0, 0.1, "square", 0.3],
		[659, 0.1, 0.1, "square", 0.3],
		[784, 0.2, 0.1, "square", 0.3],
		[1047, 0.3, 0.22, "square", 0.3],
	],
	abrir: [
		[392, 0, 0.12, "triangle", 0.5],
		[523, 0.12, 0.12, "triangle", 0.5],
		[784, 0.24, 0.3, "triangle", 0.5],
	],
	coleccionable: [
		[1319, 0, 0.08, "triangle", 0.45],
		[1568, 0.07, 0.08, "triangle", 0.45],
		[2093, 0.14, 0.25, "triangle", 0.45],
	],
	pista: [
		[1760, 0, 0.12, "sine", 0.18],
		[2349, 0.1, 0.18, "sine", 0.14],
	],
	recoger: [
		[440, 0, 0.08, "square", 0.25],
		[880, 0.07, 0.14, "square", 0.25],
	],
	entregar: [
		[587, 0, 0.1, "triangle", 0.45],
		[740, 0.1, 0.1, "triangle", 0.45],
		[880, 0.2, 0.28, "triangle", 0.45],
	],
	derrota: [
		[300, 0, 0.3, "square", 0.25, 60],
		[1200, 0.05, 0.12, "triangle", 0.3, 2400],
	],
	pieza: [
		[900, 0, 0.05, "square", 0.25],
		[1350, 0.06, 0.08, "square", 0.25],
	],
	victoria: [
		[523, 0, 0.14, "square", 0.3],
		[659, 0.15, 0.14, "square", 0.3],
		[784, 0.3, 0.14, "square", 0.3],
		[1047, 0.45, 0.3, "square", 0.3],
		[784, 0.78, 0.12, "square", 0.3],
		[1047, 0.92, 0.5, "square", 0.3],
	],
};

// Archivos propios: se cargan al abrir la página y se usan solo si cargaron
const ARCHIVOS_SONIDO = {};
for (const [nombre, ruta] of Object.entries(CFG.sonidos || {})) {
	if (!ruta) continue;
	try {
		const a = new Audio();
		const archivo = { audio: a, listo: false };
		a.preload = "auto";
		a.addEventListener("canplaythrough", () => (archivo.listo = true), { once: true });
		a.addEventListener("error", () => (archivo.listo = false), { once: true });
		a.src = ruta;
		ARCHIVOS_SONIDO[nombre] = archivo;
	} catch (e) {
		/* sin <audio>: queda el sintetizado */
	}
}

function sonarArchivo(nombre) {
	const archivo = ARCHIVOS_SONIDO[nombre];
	if (!archivo || !archivo.listo) return false;
	try {
		const copia = archivo.audio.cloneNode(); // así puede sonar dos veces seguidas
		copia.volume = Math.min(1, Math.max(0, Number(CFG.volumenSonidos ?? 0.6)));
		const p = copia.play();
		if (p && p.catch) p.catch(() => {});
		return true;
	} catch (e) {
		return false;
	}
}

function sonar(nombre) {
	if (!ajustes.sonido) return;
	agacharMusica(); // la música baja un momento (musica.js)
	if (sonarArchivo(nombre)) return;
	const ac = contextoAudio();
	const efecto = EFECTOS[nombre];
	if (!ac || !efecto) return;
	try {
		for (const n of efecto) nota(ac, ...n);
	} catch (e) {
		/* sin sonido */
	}
}
