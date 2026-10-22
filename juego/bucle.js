/* Camino a Celaque — arranque y bucle principal (va siempre al final). Ver juego/LEEME.md. */
"use strict";

// ---------- Bucle principal ----------
cargarProgreso();
abrirMapa();
if (!ayudaYaVista()) abrirAyuda();
let ultimo = performance.now();
function bucle(ahora) {
	const dt = Math.min(0.05, (ahora - ultimo) / 1000);
	ultimo = ahora;
	tiempo += dt;
	actualizar(dt);
	dibujar(dt);
	if (estado === "mapa" && mapa.foco < 0) dibujarVistasPrevias();
	actualizarBarraJugador(dt);
	if (estado === "terminal" && oficinaActual && !ui.terminalFigura.hidden) dibujarFiguraTerminal(oficinaActual);
	requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
