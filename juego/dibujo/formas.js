/* Camino a Celaque — formas básicas de dibujo. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: formas básicas ----------
function circulo(x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

function linea(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function rectRedondo(x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

// Agrega una elipse al trazo actual (para rellenar varias como una sola figura)
function agregarElipse(cx, cy, rx, ry) {
	ctx.moveTo(cx + rx, cy);
	ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}
