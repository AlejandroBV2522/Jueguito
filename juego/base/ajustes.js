/* Camino a Celaque — ajustes del jugador: sonido y modo fácil. Ver juego/LEEME.md. */
"use strict";

// ---------- Ajustes ----------
// Se recuerdan en este navegador, aparte del progreso: "Empezar de cero"
// no los borra. Si no hay almacenamiento, valen solo para esta partida.
const CLAVE_AJUSTES = "camino-a-celaque:ajustes";
const ajustes = { sonido: true, musica: true, facil: false }; // sonido apaga todo; musica, solo la música
try {
	const guardados = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) || "null");
	if (guardados && typeof guardados === "object") {
		if (typeof guardados.sonido === "boolean") ajustes.sonido = guardados.sonido;
		if (typeof guardados.musica === "boolean") ajustes.musica = guardados.musica;
		if (typeof guardados.facil === "boolean") ajustes.facil = guardados.facil;
	}
} catch (e) {
	/* sin almacenamiento */
}

function guardarAjustes() {
	try {
		localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
	} catch (e) {
		/* sin almacenamiento */
	}
}

// Modo fácil, para quien no juega seguido: salta más alto (caminando ya
// pasa los huecos de la Cueva) y ni las respuestas equivocadas ni los
// virus quitan corazones.
const modoFacil = () => ajustes.facil;
