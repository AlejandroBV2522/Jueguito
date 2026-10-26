/* Camino a Celaque — decoración de la Cueva. Ver juego/LEEME.md. */
"use strict";

// ---------- Decoración de la Cueva ----------
// Todo esto vive entre LARGO (boca) y LARGO_TOTAL (salida). Se genera con
// el mismo azar() determinista, DESPUÉS de todo lo de afuera para no
// correrle la secuencia a los árboles/nubes/etc.
const murcielagosFondo = [];
for (let i = 0; i < 32; i++) {
	murcielagosFondo.push({
		x: LARGO + 120 + azar() * (LARGO_CUEVA - 240),
		y: 0.12 + azar() * 0.4, // fracción de la altura hasta SUELO
		tam: 0.5 + azar() * 0.6,
		fase: azar() * Math.PI * 2,
		vel: 18 + azar() * 26, // deriva horizontal lenta
		aleteo: 7 + azar() * 5,
	});
}

const cristales = [];
for (let i = 0; i < 45; i++) {
	cristales.push({
		x: LARGO + 80 + azar() * (LARGO_CUEVA - 160),
		tam: 0.6 + azar() * 0.8,
		tono: azar() < 0.5 ? "#5fd6e0" : "#9a7fe0", // turquesa o violeta
		fase: azar() * Math.PI * 2,
	});
}

const estalagmitas = [];
for (let i = 0; i < 52; i++) {
	estalagmitas.push({
		x: LARGO + 60 + azar() * (LARGO_CUEVA - 120),
		alto: 20 + azar() * 40,
		ancho: 14 + azar() * 16,
	});
}

// Polvo/esporas flotando: puntitos tenues que suben apenas, en coords de
// pantalla (como la lluvia), solo se dibujan dentro de la cueva.
const polvoCueva = [];
for (let i = 0; i < 60; i++) {
	polvoCueva.push({ x: azar(), y: azar(), vel: 0.02 + azar() * 0.05, fase: azar() * Math.PI * 2 });
}

let petalos = [];
