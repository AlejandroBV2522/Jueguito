/* Camino a Celaque — diálogos con los NPC. Ver juego/LEEME.md. */
"use strict";

// ---------- Diálogos ----------
function abrirDialogo(npc) {
	estado = "dialogo";
	heroe.moviendo = heroe.corriendo = false;
	heroe.dir = npc.x >= heroe.x ? 1 : -1;
	dlg.npc = npc;
	dlg.linea = 0;
	dlg.visibles = 0;
	dlg.mostradas = -1;
	ui.nombre.textContent = npc.importante ? `${npc.nombre} ★` : npc.nombre;
	ui.retrato.textContent = (npc.inicial || npc.nombre.charAt(0)).toUpperCase();
	ui.retrato.style.background = npc.apariencia.chaleco || npc.apariencia.ropa;
	ui.dialogo.hidden = false;
	ui.dialogo.classList.remove("arriba"); // el diálogo normal de NPC va abajo
	document.body.classList.add("con-dialogo");
	actualizarPista();
	sonar("dialogo");
}

function lineaActual() {
	return dlg.npc.dialogo[dlg.linea] || "";
}

function actualizarPista() {
	const ultima = dlg.linea >= dlg.npc.dialogo.length - 1;
	ui.pista.textContent = ultima ? "Cerrar ✕" : "Continuar ▸";
}

function avanzarDialogo() {
	if (dlg.sistema) {
		reiniciarCueva();
		return;
	}
	// Con una pregunta abierta, tocar la caja (fuera de las opciones) no
	// hace nada: no hay diálogo que avanzar.
	if (estado !== "dialogo" || !dlg.npc) return;
	if (dlg.visibles < lineaActual().length) {
		dlg.visibles = lineaActual().length; // completar la frase de golpe
		return;
	}
	dlg.linea++;
	dlg.visibles = 0;
	dlg.mostradas = -1;
	if (dlg.linea >= dlg.npc.dialogo.length) {
		cerrarDialogo();
	} else {
		actualizarPista();
	}
}

// Solo la PRIMERA charla con cada NPC sube de nivel (volver a hablarle
// con E no da nada, así no se puede repetir para subir).
function subirNivel() {
	if (nivel >= NIVEL_MAX) return;
	nivel++;
	vidas = vidasMax();
	avisos.push({ texto: `¡Nivel ${nivel}! +1 ♥`, t: 0 });
	sonar("nivel");
}

function cerrarDialogo() {
	// Los compañeros de oficina no suben de nivel: eso lo da el módulo
	// Repetir Talento ya completo tampoco: el nivel se ganó la primera vez
	if (!dlg.npc.hablado && !dlg.npc.enOficina && !(moduloTalento && moduloTalento.completo)) subirNivel();
	dlg.npc.hablado = true;
	dlg.npc = null;
	ui.dialogo.hidden = true;
	document.body.classList.remove("con-dialogo");
	if (oficinaActual) {
		estado = "oficina";
		actualizarHudOficina();
	} else {
		estado = "jugando";
		actualizarHud();
	}
}

// Para hablar hay que estar cerca Y parado en el mismo andamio que el NPC
function alAlcance(n, distancia) {
	return Math.abs(n.x - heroe.x) < distancia && heroeEnSuelo() && Math.abs(heroe.y - (n.alto || 0)) < 1;
}

function npcCercano() {
	return npcs.find((n) => alAlcance(n, CFG.distanciaParaHablar * 1.3));
}
