/* Camino a Celaque — medidas del camino, colores y tipografía. Ver juego/LEEME.md. */
"use strict";


const CFG = window.CONFIG_JUEGO;
const LARGO = CFG.largoDelCamino;
const INICIO_X = 80;
const LARGO_CUEVA = 5200; // tramo de la Cueva, después del camino (más largo = enemigos más separados)
const LARGO_TOTAL = LARGO + LARGO_CUEVA;
// Calle de Celaque (al salir de la Cueva): un edificio por cada módulo de
// capacitación (config.js → MODULOS) y, al final, el letrero de llegada.
const MODULOS_DATOS = window.MODULOS || [];
const PRIMER_MODULO = LARGO_TOTAL + 420;
const ESPACIO_MODULO = 640;
const LARGO_META = PRIMER_MODULO + MODULOS_DATOS.length * ESPACIO_MODULO + 80;
// Paleta oficial de Celaque (config.js → colores; ver manual de marca)
const COLORES = CFG.colores || {
	verdeProfundo: "#042523",
	verdeInstitucional: "#488478",
	grisClaro: "#CCCCCC",
	beige: "#A99886",
	blanco: "#FFFFFF",
	negro: "#000000",
	verdeProfundoHover: "#063330",
	fondoVerdeClaro: "#e3eeeb",
};
// Tipografía oficial (Muli, cargada en style.css desde assets/fuentes/)
const FUENTE = `"Muli", "Mulish", Arial, sans-serif`;
