/* Camino a Celaque — efectos de sonido sintetizados (sin archivos). Ver juego/LEEME.md. */
"use strict";

// ---------- Sonido ----------
// Todo se arma con osciladores de Web Audio: no hay archivos que bajar.
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
	victoria: [
		[523, 0, 0.14, "square", 0.3],
		[659, 0.15, 0.14, "square", 0.3],
		[784, 0.3, 0.14, "square", 0.3],
		[1047, 0.45, 0.3, "square", 0.3],
		[784, 0.78, 0.12, "square", 0.3],
		[1047, 0.92, 0.5, "square", 0.3],
	],
};

function sonar(nombre) {
	const ac = contextoAudio();
	const efecto = EFECTOS[nombre];
	if (!ac || !efecto) return;
	try {
		for (const n of efecto) nota(ac, ...n);
	} catch (e) {
		/* sin sonido */
	}
}
