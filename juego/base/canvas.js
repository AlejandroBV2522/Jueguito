/* Camino a Celaque — el canvas y su tamaño. Ver juego/LEEME.md. */
"use strict";

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
