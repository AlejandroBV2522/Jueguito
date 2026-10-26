/* Camino a Celaque — paleta: de gris a color según el avance. Ver juego/LEEME.md. */
"use strict";

// ---------- Paleta: [gris al inicio, color al llegar a Celaque] ----------
const PALETA = {
	cieloArriba: ["#5b5f66", "#3db4f2"],
	cieloAbajo: ["#8a8e94", "#dff9d0"],
	celaque: ["#63676d", "#2f9e62"],
	asfalto: ["#4a4c50", "#50545c"],
	acera: ["#6d7074", "#d4d7dc"],
	bordillo: ["#7d7f83", "#ffcc1f"],
	marca: ["#76787c", "#fff3b0"],
	pasto: ["#6a6d70", "#5fdc4c"],
	humo: ["#3f4246", "#f4f6f8"],
	ventana: ["#4b5058", "#fff2b3"],
	vidrio: ["#555b63", "#9fdcff"],
	nube: ["#9a9ca0", "#ffffff"],
	heroeMochila: ["#66686b", "#2e9e5b"],
};
const color = (clave, t, alfa) => mezclar(PALETA[clave][0], PALETA[clave][1], t, alfa);
// Qué tan "coloreado" está un punto del camino (0 = gris, 1 = colorido)
// En la zona de planos todo es gris (0); al cruzar la puerta de luz el
// mundo arranca ya con algo de color y sigue subiendo hasta Celaque.
const P_PUERTA = FIN_PLANOS / LARGO;
const tono = (p) => 0.45 * suave(P_PUERTA, P_PUERTA + 0.02, p) + 0.55 * suave(P_PUERTA, 0.92, p);

const COLORES_FLOR = ["#ff6f91", "#ffd23f", "#ffffff", "#c77dff", "#ff9f1c"];
const COLORES_MARIPOSA = ["#ffd54f", "#ff8a80", "#b388ff", "#80d8ff"];
