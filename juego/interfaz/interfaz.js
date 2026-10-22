/* Camino a Celaque — elementos HTML y el HUD. Ver juego/LEEME.md. */
"use strict";

// ---------- Interfaz (HTML) ----------
const $ = (id) => document.getElementById(id);
const ui = {
	hud: $("hud"),
	hudRelleno: $("hud-relleno"),
	hudTexto: $("hud-texto"),
	dialogo: $("dialogo"),
	retrato: $("dialogo-retrato"),
	nombre: $("dialogo-nombre"),
	texto: $("dialogo-texto"),
	pista: $("dialogo-pista"),
	opciones: $("dialogo-opciones"),
	panel: $("mapa-panel"),
	reiniciarProgreso: $("btn-reiniciar-progreso"),
	ayuda: $("ayuda"),
	btnAyuda: $("btn-ayuda"),
	nombreJugador: $("nombre-jugador"),
	nombreEtiqueta: $("nombre-etiqueta"),
	victoriaNombre: $("victoria-nombre"),
	victoriaModulos: $("victoria-modulos"),
	victoriaFecha: $("victoria-fecha"),
	mapaBarra: $("mapa-barra"),
	mapaBarraTexto: $("mapa-barra-texto"),
	mapaAyuda: $("mapa-ayuda"),
	carta: $("carta"),
	cartaLogo: $("carta-logo"),
	cartaMundo: $("carta-mundo"),
	cartaTitulo: $("carta-titulo"),
	cartaModulo: $("carta-modulo"),
	cartaDescripcion: $("carta-descripcion"),
	cartaLista: $("carta-lista"),
	cartaEntrar: $("carta-entrar"),
	cartaEntrarTexto: $("carta-entrar-texto"),
	cartaVolver: $("carta-volver"),
	victoria: $("pantalla-victoria"),
	tactiles: $("controles-tactiles"),
	terminal: $("terminal"),
	terminalTitulo: $("terminal-titulo"),
	terminalProgreso: $("terminal-progreso"),
	terminalPregunta: $("terminal-pregunta"),
	terminalOpciones: $("terminal-opciones"),
	terminalPista: $("terminal-pista"),
	terminalSalir: $("terminal-salir"),
	terminalFigura: $("terminal-figura"),
};

// Logo en una caja .espacio-logo: el oficial si el archivo existe, o el
// recuadro "LOGO" mientras tanto.
function ponerLogo(caja, ruta) {
	caja.dataset.logo = ruta;
	caja.classList.remove("con-logo");
	caja.textContent = "LOGO";
	const img = new Image();
	img.alt = caja.getAttribute("aria-label") || "";
	img.onload = () => {
		if (caja.dataset.logo !== ruta) return; // mientras cargaba se pidió otro
		caja.textContent = "";
		caja.classList.add("con-logo");
		caja.appendChild(img);
	};
	img.src = ruta;
}

// Logos en la pantalla (inicio, victoria, computadora): el oficial si ya
// está en assets/logos/, o el recuadro "LOGO" mientras tanto.
document.querySelectorAll(".espacio-logo[data-logo]").forEach((caja) => ponerLogo(caja, caja.dataset.logo));

$("titulo").textContent = CFG.textos.titulo;
$("subtitulo").textContent = CFG.textos.subtitulo;
$("victoria-titulo").textContent = CFG.textos.victoriaTitulo;
$("victoria-texto").textContent = CFG.textos.victoriaTexto;
$("victoria-bienvenida").textContent = CFG.textos.bienvenida || "¡Bienvenido a Celaque!";
$("nombre-pregunta").textContent = CFG.textos.pideNombre || "Tu nombre";
let nombreJugador = ""; // se pide en el mapa antes de entrar al primer mundo
document.title = CFG.textos.titulo;

const esTactil = window.matchMedia("(pointer: coarse)").matches;

function actualizarHud() {
	const progreso = clamp((heroe.x - INICIO_X) / (LARGO - INICIO_X), 0, 1);
	ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
	const conocidos = npcs.filter((n) => n.hablado).length;
	ui.hudTexto.textContent = `Nivel ${nivel}  ·  ${corazones()}  ·  ${CFG.textos.contadorNpcs}: ${conocidos} / ${npcs.length}`;
}

function actualizarHudCueva() {
	const derrotados = enemigos.filter((e) => e.derrotado).length;
	ui.hudRelleno.style.width = ((derrotados / enemigos.length) * 100).toFixed(1) + "%";
	ui.hudTexto.textContent = `Nivel ${nivel}  ·  Vidas: ${corazones()}  ·  Antivalores vencidos: ${derrotados} / ${enemigos.length}`;
}
