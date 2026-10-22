/* Camino a Celaque — estado del juego (héroe, cámara, entrada). Ver juego/LEEME.md. */
"use strict";

// ---------- Estado ----------
let estado = "mapa"; // mapa | jugando | dialogo | cueva | pregunta | transicion | oficina | terminal | victoria
// Controla el fondo (afuera vs. cueva oscura): solo se activa al cruzar el
// tubo de entrada, no con solo llegar caminando a x = LARGO (el clamp deja
// al héroe justo ahí antes de agacharse, y aún debe verse el mundo de afuera).
let dentroCueva = false;
// Se activa al salir de la Cueva por el tubo de salida: el paisaje vuelve,
// pero ahora urbano (con los edificios), no el camino rural de antes.
let vistaUrbana = false;
// Pantalla negra al cruzar un tubo (ver entrarPorTubo/actualizar).
let transicion = null;
const heroe = {
	x: INICIO_X,
	dir: 1,
	fase: 0,
	marcha: 0, // 0 quieto, ~0.45 caminando, 1 corriendo (suavizado, ver actualizar)
	moviendo: false,
	corriendo: false,
	y: 0, // altura sobre el suelo (0 = piso), física real de salto
	velY: 0,
	agachado: false,
	atacando: false,
	atacandoT: 0,
	golpeado: false,
	golpeadoT: 0,
	ultimoSuelo: -1, // último instante parado en suelo (salto "coyote", ver saltarAccion)
	saltoPedido: -1, // salto presionado en el aire, sale al aterrizar
};
const polvoPasos = []; // nubecitas al correr (ver actualizar/dibujarPolvoPasos)
const CLAVES_PERSONAJE = Object.keys(CFG.personajes);
let personaje = CLAVES_PERSONAJE[0];
let camara = 0;
let tiempo = 0;
const entrada = { izq: false, der: false, correr: false, abajo: false, rueda: 0, ruedaHasta: 0 };
const dlg = { npc: null, linea: 0, visibles: 0, mostradas: -1, enemigo: null, sistema: false };
