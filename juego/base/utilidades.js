/* Camino a Celaque — utilidades (números y colores). Ver juego/LEEME.md. */
"use strict";

// ---------- Utilidades ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (e0, e1, x) => {
	const t = clamp((x - e0) / (e1 - e0), 0, 1);
	return t * t * (3 - 2 * t);
};
const modulo = (a, n) => ((a % n) + n) % n;

// Acepta "#RRGGBB" y también "rgb(r,g,b)" (lo que devuelve mezclar),
// así se pueden mezclar colores ya mezclados.
const cacheRgb = {};
function hexARgb(hex) {
	if (!cacheRgb[hex]) {
		if (hex[0] === "#") {
			const n = parseInt(hex.slice(1), 16);
			cacheRgb[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
		} else {
			// No se guarda: los colores ya mezclados cambian cada cuadro
			return (hex.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
		}
	}
	return cacheRgb[hex];
}

function mezclar(a, b, t, alfa) {
	const A = hexARgb(a);
	const B = hexARgb(b);
	const r = Math.round(lerp(A[0], B[0], t));
	const g = Math.round(lerp(A[1], B[1], t));
	const bl = Math.round(lerp(A[2], B[2], t));
	return alfa === undefined ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alfa})`;
}

function conAlfa(hex, a) {
	const [r, g, b] = hexARgb(hex);
	return `rgba(${r},${g},${b},${a})`;
}

// Generador aleatorio con semilla: el paisaje sale igual en cada partida
function crearAzar(semilla) {
	return function () {
		semilla = (semilla + 0x6d2b79f5) | 0;
		let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
