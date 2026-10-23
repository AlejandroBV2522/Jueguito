/* Camino a Celaque — teclado, rueda y botones táctiles. Ver juego/LEEME.md. */
"use strict";

// ---------- Controles ----------
const TECLAS_IZQ = ["ArrowLeft", "a", "A"];
const TECLAS_DER = ["ArrowRight", "d", "D"];
const TECLAS_ACCION = [" ", "Enter", "e", "E"];
const TECLAS_CORRER = ["q", "Q"];
const TECLAS_SALTAR = ["ArrowUp", "w", "W"];
const TECLAS_AGACHAR = ["ArrowDown", "s", "S"];

window.addEventListener("keydown", (e) => {
	// Con "Cómo se juega" abierto, Enter, Espacio o Esc lo cierran
	if (!ui.ayuda.hidden) {
		if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
			e.preventDefault();
			cerrarAyuda();
		}
		return;
	}
	// Escribiendo el nombre: las teclas son para el campo (Enter o Esc lo cierran)
	if (e.target === ui.nombreJugador) {
		if (e.key === "Enter" || e.key === "Escape") ui.nombreJugador.blur();
		return;
	}
	if (e.key === "Escape") {
		if (estado === "mapa") atrasMapa();
		return;
	}
	// En la computadora de la oficina se responde también con 1, 2, 3...
	if (estado === "terminal" && /^[1-9]$/.test(e.key)) {
		const btn = ui.terminalOpciones.children[Number(e.key) - 1];
		if (btn) btn.click();
		return;
	}
	if (TECLAS_IZQ.includes(e.key) || TECLAS_DER.includes(e.key)) {
		e.preventDefault();
		if (estado === "mapa") {
			// En el mapa, las flechas pasan de un mundo a otro
			moverSeleccionMapa(TECLAS_DER.includes(e.key) ? 1 : -1);
			return;
		}
		if (TECLAS_IZQ.includes(e.key)) entrada.izq = true;
		else entrada.der = true;
	} else if (TECLAS_CORRER.includes(e.key)) {
		entrada.correr = true;
	} else if (TECLAS_ACCION.includes(e.key)) {
		if (e.target.tagName === "BUTTON") {
			// Tarjeta de personaje enfocada en el mapa: Enter/Espacio siguen
			// siendo del mapa (acercar / carta). En otro botón, E también lo
			// presiona (Enter y Espacio ya lo hacen solos).
			if (estado === "mapa" && e.target.classList.contains("opcion")) e.target.blur();
			else {
				if (e.key === "e" || e.key === "E") {
					e.preventDefault();
					e.target.click();
				}
				return;
			}
		}
		e.preventDefault();
		if (e.repeat) return;
		if (e.key === " " && !hayAccion()) saltarAccion();
		else accion();
	} else if (TECLAS_SALTAR.includes(e.key)) {
		e.preventDefault();
		if (!e.repeat) saltarAccion();
	} else if (TECLAS_AGACHAR.includes(e.key)) {
		e.preventDefault();
		entrada.abajo = true; // mostrar la pose de agachado mientras se mantiene
		if (!e.repeat) agacharAccion();
	}
});

window.addEventListener("keyup", (e) => {
	if (TECLAS_IZQ.includes(e.key)) entrada.izq = false;
	if (TECLAS_DER.includes(e.key)) entrada.der = false;
	if (TECLAS_CORRER.includes(e.key)) entrada.correr = false;
	if (TECLAS_AGACHAR.includes(e.key)) entrada.abajo = false;
});

window.addEventListener("blur", () => {
	entrada.izq = entrada.der = entrada.correr = entrada.abajo = false;
});

window.addEventListener(
	"wheel",
	(e) => {
		if (estado !== "jugando" && estado !== "cueva" && estado !== "urbano" && estado !== "oficina") return;
		const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
		if (delta === 0) return;
		entrada.rueda = delta > 0 ? 1 : -1;
		entrada.ruedaHasta = performance.now() + 220;
	},
	{ passive: true }
);

// Victoria: "Jugar de nuevo" borra el progreso; "Ver el mapa" lo conserva
$("btn-reiniciar").addEventListener("click", () => {
	reiniciarProgreso(false);
	abrirMapa();
});
$("btn-cambiar").addEventListener("click", abrirMapa);
// Empezar de cero pide un segundo toque para confirmar
let confirmarReinicio = 0;
ui.reiniciarProgreso.addEventListener("click", () => {
	if (!ui.reiniciarProgreso.classList.contains("confirmar")) {
		ui.reiniciarProgreso.classList.add("confirmar");
		ui.reiniciarProgreso.textContent = "¿Borrar todo? Toca otra vez";
		clearTimeout(confirmarReinicio);
		confirmarReinicio = setTimeout(restaurarBotonReinicio, 3500);
		return;
	}
	clearTimeout(confirmarReinicio);
	restaurarBotonReinicio();
	reiniciarProgreso(true);
	avisoMapa("Progreso borrado: ¡a empezar de nuevo!");
});
function restaurarBotonReinicio() {
	ui.reiniciarProgreso.classList.remove("confirmar");
	ui.reiniciarProgreso.textContent = "↻ Empezar de cero";
}
ui.btnAyuda.addEventListener("click", abrirAyuda);
$("ayuda-cerrar").addEventListener("click", cerrarAyuda);
ui.ayuda.addEventListener("click", (e) => {
	if (e.target === ui.ayuda) cerrarAyuda();
});
ui.nombreJugador.addEventListener("input", () => {
	const antes = modoPruebas();
	nombreJugador = ui.nombreJugador.value.trim();
	if (!antes && modoPruebas()) {
		modulos.forEach((m) => (m.completo = false)); // solo en esta partida: lo guardado no se toca
		avisoMapa("Modo de pruebas: todos los mundos abiertos y sin completar");
	} else if (antes && !modoPruebas()) {
		// Sales del modo pruebas: vuelven los mundos que tenías completados
		const d = leerGuardado();
		modulos.forEach((m) => (m.completo = !!d && Array.isArray(d.completos) && d.completos.includes(m.nombre)));
	}
	ui.nombreEtiqueta.classList.remove("falta");
	guardarProgreso();
	actualizarPanelMapa();
});
$("btn-mapa-volver").addEventListener("click", alejarMapa);
ui.cartaEntrar.addEventListener("click", () => entrarMundo(mapa.foco));
ui.cartaVolver.addEventListener("click", cerrarCarta);
ui.carta.addEventListener("click", (e) => {
	if (e.target === ui.carta) cerrarCarta(); // clic fuera de la carta
});

// Mapa: clic o toque sobre una meseta. En la vista general la acerca;
// acercado, el mismo mundo abre su carta, otro abierto pasa a ese, y el
// agua aleja la vista.
canvas.addEventListener("click", (e) => {
	if (estado !== "mapa" || mapa.carta) return;
	if (delfinEnPantalla(e.clientX, e.clientY)) return avisoMapa("¡Encontraste al delfín de Celaque!");
	const i = mundoEnPantalla(e.clientX, e.clientY);
	if (mapa.foco >= 0 && mapa.zObjetivo === 1) {
		if (i === mapa.foco) abrirCarta(i);
		else if (i >= 0) elegirMundo(i);
		else alejarMapa();
	} else if (i >= 0) elegirMundo(i);
});
canvas.addEventListener("pointermove", (e) => {
	mapa.hover = estado === "mapa" && !mapa.carta ? mundoEnPantalla(e.clientX, e.clientY) : -1;
	canvas.style.cursor = mapa.hover >= 0 ? "pointer" : "";
});
ui.terminalSalir.addEventListener("click", cerrarTerminal);
ui.dialogo.addEventListener("click", avanzarDialogo);

function botonTactil(id, alPresionar, alSoltar) {
	const btn = $(id);
	btn.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		alPresionar();
	});
	["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, alSoltar));
}
botonTactil("btn-izq", () => (entrada.izq = true), () => (entrada.izq = false));
botonTactil("btn-der", () => (entrada.der = true), () => (entrada.der = false));
botonTactil("btn-correr", () => (entrada.correr = true), () => (entrada.correr = false));
botonTactil("btn-hablar", accion, () => {});
botonTactil("btn-saltar", saltarAccion, () => {});
botonTactil(
	"btn-agachar",
	() => {
		entrada.abajo = true;
		agacharAccion();
	},
	() => (entrada.abajo = false)
);
