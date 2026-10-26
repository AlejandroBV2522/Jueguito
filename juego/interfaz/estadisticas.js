/* Camino a Celaque — qué preguntas se fallan más (para Talento). Ver juego/LEEME.md. */
"use strict";

// ---------- Estadísticas ----------
// Cada vez que sale una pregunta (Cueva, computadoras y repaso final) se
// anota, y también cada respuesta equivocada. Solo se guarda en ESTE
// navegador: sirve en una compu donde varias personas hacen la inducción.
// La ventana se abre desde el mapa con el nombre de pruebas (Kojima), y lo
// que se juega con ese nombre no se anota.
const CLAVE_ESTADISTICAS = "camino-a-celaque:estadisticas";

function leerEstadisticas() {
	try {
		const d = JSON.parse(localStorage.getItem(CLAVE_ESTADISTICAS) || "null");
		if (d && typeof d.preguntas === "object" && d.preguntas) return { preguntas: d.preguntas, terminados: Number(d.terminados) || 0 };
	} catch (e) {
		/* sin almacenamiento */
	}
	return { preguntas: {}, terminados: 0 };
}

function guardarEstadisticas(d) {
	try {
		localStorage.setItem(CLAVE_ESTADISTICAS, JSON.stringify(d));
	} catch (e) {
		/* sin almacenamiento */
	}
}

// fallo = false: la pregunta salió en pantalla; true: la respondieron mal
function anotarPregunta(modulo, pregunta, fallo) {
	if (modoPruebas()) return;
	const d = leerEstadisticas();
	const clave = `${modulo}|${pregunta}`;
	const q = d.preguntas[clave] || (d.preguntas[clave] = { modulo, pregunta, vistas: 0, fallos: 0 });
	if (fallo) q.fallos++;
	else q.vistas++;
	guardarEstadisticas(d);
}

function anotarInduccionTerminada() {
	if (modoPruebas()) return;
	const d = leerEstadisticas();
	d.terminados++;
	guardarEstadisticas(d);
}

const uiEstadisticas = {
	ventana: $("estadisticas"),
	resumen: $("estadisticas-resumen"),
	tabla: $("estadisticas-tabla"),
	borrar: $("estadisticas-borrar"),
	cerrar: $("estadisticas-cerrar"),
	boton: $("btn-estadisticas"),
};

// Las que más se fallan, primero
function abrirEstadisticas() {
	const d = leerEstadisticas();
	const filas = Object.values(d.preguntas).sort((a, b) => b.fallos - a.fallos || b.vistas - a.vistas);
	const vistas = filas.reduce((s, q) => s + q.vistas, 0);
	uiEstadisticas.resumen.textContent = filas.length
		? `Inducciones terminadas: ${d.terminados} · Veces que salió una pregunta: ${vistas} · Solo cuenta lo jugado en este navegador.`
		: "Todavía no hay datos: aquí aparecen las preguntas que se contestan en este navegador.";
	uiEstadisticas.tabla.innerHTML = "";
	for (const q of filas) {
		const tr = document.createElement("tr");
		for (const valor of [q.modulo, q.pregunta, q.vistas, q.fallos]) {
			const td = document.createElement("td");
			td.textContent = valor;
			tr.appendChild(td);
		}
		if (q.fallos > q.vistas) tr.classList.add("cuesta"); // más errores que veces que salió
		uiEstadisticas.tabla.appendChild(tr);
	}
	uiEstadisticas.tabla.closest("table").hidden = !filas.length;
	restaurarBotonBorrarEstadisticas();
	uiEstadisticas.ventana.hidden = false;
	uiEstadisticas.cerrar.focus();
}

function cerrarEstadisticas() {
	uiEstadisticas.ventana.hidden = true;
}

function restaurarBotonBorrarEstadisticas() {
	uiEstadisticas.borrar.classList.remove("confirmar");
	uiEstadisticas.borrar.textContent = "Borrar datos";
}

// Como "Empezar de cero": el primer toque pide confirmar
let confirmarBorrarEstadisticas = 0;
function borrarEstadisticas() {
	if (!uiEstadisticas.borrar.classList.contains("confirmar")) {
		uiEstadisticas.borrar.classList.add("confirmar");
		uiEstadisticas.borrar.textContent = "¿Seguro? Toca otra vez";
		clearTimeout(confirmarBorrarEstadisticas);
		confirmarBorrarEstadisticas = setTimeout(restaurarBotonBorrarEstadisticas, 3500);
		return;
	}
	guardarEstadisticas({ preguntas: {}, terminados: 0 });
	abrirEstadisticas();
}
