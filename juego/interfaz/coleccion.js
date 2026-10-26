/* Camino a Celaque — lo coleccionado y el apartado "Colección" del mapa. Ver juego/LEEME.md. */
"use strict";

// ---------- Colección ----------
// Las guacamayas encontradas (juego/dibujo/coleccionables.js) se guardan en
// este navegador. "Empezar de cero" las borra; "Jugar de nuevo" no. Con el
// nombre de pruebas se recogen solo durante la partida (no se guardan) y en
// la colección se ven todas desbloqueadas.
const CLAVE_COLECCION = "camino-a-celaque:coleccion";
const coleccionados = new Set();
const coleccionPruebas = new Set();
try {
	const d = JSON.parse(localStorage.getItem(CLAVE_COLECCION) || "null");
	if (Array.isArray(d)) d.forEach((id) => typeof id === "string" && coleccionados.add(id));
} catch (e) {
	/* sin almacenamiento */
}

function guardarColeccion() {
	try {
		localStorage.setItem(CLAVE_COLECCION, JSON.stringify([...coleccionados]));
	} catch (e) {
		/* sin almacenamiento */
	}
}

const coleccionEncontrado = (id) => coleccionados.has(id) || (modoPruebas() && coleccionPruebas.has(id));

function marcarColeccionado(id) {
	if (modoPruebas()) coleccionPruebas.add(id);
	else {
		coleccionados.add(id);
		guardarColeccion();
	}
}

function borrarColeccion() {
	coleccionados.clear();
	coleccionPruebas.clear();
	guardarColeccion();
}

const uiColeccion = {
	ventana: $("coleccion"),
	resumen: $("coleccion-resumen"),
	relleno: $("coleccion-relleno"),
	grilla: $("coleccion-grilla"),
	cerrar: $("coleccion-cerrar"),
	boton: $("btn-coleccion"),
};

// Pista de dónde buscarla (mundo.js → coleccionables[].sobre)
const PISTAS_COLECCION = { mueble: "arriba de un mueble", nube: "arriba de las nubes", andamio: "arriba de un andamio", roca: "en la Cueva, arriba de una roca" };

// En la colección: las encontradas, o todas con el nombre de pruebas (en
// los niveles se siguen pudiendo buscar)
const desbloqueadaEnColeccion = (c) => modoPruebas() || coleccionEncontrado(c.id);
const cuantasEncontradas = () => COLECCIONABLES.filter(desbloqueadaEnColeccion).length;

function actualizarBotonColeccion() {
	uiColeccion.boton.textContent = `★ Colección ${cuantasEncontradas()}/${COLECCIONABLES.length}`;
}

// Una ficha por guacamaya: la guacamaya y su nombre si ya la tienes; si no,
// su silueta y en qué mundo buscarla
function abrirColeccion() {
	const n = cuantasEncontradas();
	const total = COLECCIONABLES.length;
	uiColeccion.resumen.textContent = modoPruebas()
		? `Modo de pruebas: las ${total} guacamayas desbloqueadas para verlas (en los niveles se siguen pudiendo buscar).`
		: n === total
		? `¡Las encontraste todas! ${n} de ${total}.`
		: `Encontraste ${n} de ${total} guacamayas. Están en lo alto: súbete a algo y salta. De lejos casi no se ven, pero brillan al acercarte.`;
	uiColeccion.relleno.style.width = `${((n / Math.max(1, total)) * 100).toFixed(1)}%`;
	uiColeccion.grilla.innerHTML = "";
	const sAntes = S;
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	try {
		for (const c of COLECCIONABLES) {
			const tiene = desbloqueadaEnColeccion(c);
			const ficha = document.createElement("li");
			ficha.className = tiene ? "ficha encontrada" : "ficha";
			const lienzo = document.createElement("canvas");
			lienzo.width = lienzo.height = 56 * dpr;
			lienzo.setAttribute("aria-hidden", "true");
			// Se dibuja con las mismas funciones del juego, en este canvas
			ctx = lienzo.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			S = 1;
			if (tiene) dibujarTrofeo(c, 28, 30, 26, 1, 2.2); // alas arriba
			else {
				ctx.fillStyle = "rgba(4,37,35,0.12)";
				circulo(28, 28, 22);
				ctx.fillStyle = COLORES.verdeInstitucional;
				ctx.font = `bold 22px ${FUENTE}`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("?", 28, 30);
			}
			const nombre = document.createElement("strong");
			nombre.textContent = tiene ? c.nombre : "???";
			const donde = document.createElement("small");
			donde.textContent = `Mundo ${c.modulo.indice + 1} · ${c.modulo.nombre}`;
			const pista = document.createElement("small");
			pista.className = "ficha-pista";
			pista.textContent = PISTAS_COLECCION[c.sobre] || "en lo alto";
			ficha.append(lienzo, nombre, donde, pista);
			uiColeccion.grilla.appendChild(ficha);
		}
	} finally {
		// Pase lo que pase, el juego vuelve a dibujar en su canvas
		ctx = ctxJuego;
		S = sAntes;
	}
	uiColeccion.ventana.hidden = false;
	uiColeccion.cerrar.focus();
}

function cerrarColeccion() {
	uiColeccion.ventana.hidden = true;
}
