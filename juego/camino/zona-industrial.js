/* Camino a Celaque — lo que hay en la zona industrial. Ver juego/LEEME.md. */
"use strict";

// ---------- Zona industrial (el camino de afuera) ----------
// Fábricas, bodegas, tanques, torres y grúas: al inicio todo es gris y a
// medida que avanzas cada edificio recupera su color propio (color +
// acento). Las grúas siempre son amarillas, como las de construcción.
const TIPOS_INDUSTRIA = ["fabrica", "bodega", "tanques", "torre", "grua"];
const COLORES_INDUSTRIA = ["#ff6b35", "#ffc93c", "#2ec4b6", "#ef476f", "#3a86ff", "#8ac926", "#9b5de5", "#ff9f1c"];
function crearEdificioIndustrial(x) {
	const i = Math.floor(azar() * COLORES_INDUSTRIA.length);
	return {
		x,
		tipo: TIPOS_INDUSTRIA[Math.floor(azar() * TIPOS_INDUSTRIA.length)],
		v: azar(), // variación de tamaño dentro de su tipo
		color: COLORES_INDUSTRIA[i],
		acento: COLORES_INDUSTRIA[(i + 3) % COLORES_INDUSTRIA.length],
	};
}

// Primer plano: edificios grandes justo detrás de la acera
const fabricas = [];
for (let x = 240; x < LARGO - 340; x += 330 + azar() * 230) {
	fabricas.push(crearEdificioIndustrial(x));
}

// Plano medio: más chicos y con parallax (como antes los árboles lejanos)
const fabricasMedias = [];
for (let x = 60; x < LARGO * 0.68; x += 230 + azar() * 180) {
	fabricasMedias.push(crearEdificioIndustrial(x));
}

// Conos y barriles de obra sobre la acera
const conos = [];
for (let x = 150; x < LARGO - 150; x += 160 + azar() * 340) {
	conos.push({ x, barril: azar() < 0.35 });
}

const matas = [];
for (let x = 0; x < LARGO + 1500; x += 18 + azar() * 14) {
	matas.push({
		x,
		alto: azar(),
		flor: azar(),
		colorFlor: COLORES_FLOR[Math.floor(azar() * COLORES_FLOR.length)],
		delante: azar() < 0.35,
	});
}

const nubes = [];
for (let i = 0; i < 8; i++) {
	nubes.push({ x: azar() * 3000, y: 0.06 + azar() * 0.22, tam: 0.7 + azar() * 0.7, vel: 6 + azar() * 10 });
}

const mariposas = [];
for (let i = 0; i < 14; i++) {
	mariposas.push({
		x: LARGO * (0.55 + azar() * 0.45),
		fase: azar() * 10,
		color: COLORES_MARIPOSA[i % COLORES_MARIPOSA.length],
	});
}

const gotas = [];
for (let i = 0; i < 140; i++) {
	gotas.push({ x: azar(), y: azar(), vel: 0.9 + azar() * 0.5 });
}

// Edificios de relleno: formas geométricas simples (nada de fotos), solo
// para dar sensación de más ciudad alrededor de Atlas y Lirios sin
// competir con ellos. Posiciones/colores al azar pero deterministas.
const PALETA_EDIFICIOS_SIMPLES = ["#ff6b6b", "#ffc93c", "#2ec4b6", "#3a86ff", "#9b5de5", "#ff9f1c"];
const edificiosSimples = [];
for (let i = 0; i < 6; i++) {
	edificiosSimples.push({
		x: LARGO_META + 20 + i * 150 + (azar() - 0.5) * 60,
		// Grandes, pero un poco más bajos que Atlas (altoBase 450) para que
		// el Atlas siga destacando como el edificio principal.
		alto: 300 + azar() * 140,
		ancho: 95 + azar() * 55,
		color: PALETA_EDIFICIOS_SIMPLES[Math.floor(azar() * PALETA_EDIFICIOS_SIMPLES.length)],
	});
}

// Proyectos de Celaque (config.js → PROYECTOS_CELAQUE): torres de fondo
// repartidas entre los edificios de los módulos. Medidas fijas (sin
// azar()) para no correrle la secuencia a lo que se genera después.
const proyectos = (window.PROYECTOS_CELAQUE || []).map((nombre, k) => ({
	nombre,
	logoImg: cargarImagen(RUTA_LOGOS + "proyecto-" + nombreArchivo(nombre) + ".png"),
	x: PRIMER_MODULO + (k * 2 + 0.5) * ESPACIO_MODULO,
	alto: 380 + (k % 2) * 60,
	ancho: 150,
}));
