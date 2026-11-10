/* Camino a Celaque — las preguntas de los banderines de la torre de nubes (SharePoint). Ver juego/LEEME.md. */
"use strict";

// ---------- Preguntas de los banderines (mundo.js → mision.etapas[].preguntas) ----------
// En la nube de descanso de cada etapa se lee su cartel y, con E (o Hablar),
// se contestan sus preguntas. Al acabarlas se forman las nubes de la etapa
// siguiente (mision.js → bloqueo) y el banderín se dora. No quitan corazones:
// la opción equivocada se tacha y se vuelve a intentar, como en la terminal.
// Usan la misma caja de diálogo que los riesgos de la obra; las teclas 1, 2, 3
// y ↑ ↓ las maneja controles.js para todas las preguntas.
const preguntaTorre = { activa: false, etapa: -1, continuar: null, cableada: false, turno: 0 };

// La etapa de la nube de descanso donde está el héroe, si todavía tiene preguntas por contestar (si no, -1)
function etapaPreguntable() {
	const mi = oficinaActual && oficinaActual.mision;
	if (!mi || !mi.torre || estado !== "oficina" || !mi.enBandera || !heroeEnSuelo()) return -1;
	const e = mi.etapas[mi.etapaBandera];
	return e && e.preguntas && e.preguntas.length && !mi.hechas[mi.etapaBandera] ? mi.etapaBandera : -1;
}

// E o Enter en la nube de descanso (Hablar, en pantallas táctiles); la barra espaciadora sigue siendo saltar.
// En la cima, con la licencia, la misma tecla pone el paracaídas.
window.addEventListener("keydown", (e) => {
	if (e.repeat || !["e", "E", "Enter"].includes(e.key) || e.target.tagName === "BUTTON") return;
	const k = etapaPreguntable();
	if (k >= 0) abrirPreguntaTorre(k);
	else ponerParacaidas(); // en la cima, con la licencia (mision.js)
});
$("btn-hablar").addEventListener("pointerdown", () => {
	const k = etapaPreguntable();
	if (k >= 0) abrirPreguntaTorre(k);
	else ponerParacaidas();
});

// Se conecta la primera vez que se necesita
function cablearPreguntaTorre() {
	if (preguntaTorre.cableada) return;
	preguntaTorre.cableada = true;
	ui.dialogo.addEventListener("click", avanzarPreguntaTorre);
	window.addEventListener("keydown", (e) => {
		if (estado !== "pregunta" || !preguntaTorre.activa || !preguntaTorre.continuar || e.repeat) return;
		if ([" ", "Enter", "e", "E"].includes(e.key)) {
			e.preventDefault();
			avanzarPreguntaTorre();
		}
	});
}

function abrirPreguntaTorre(k) {
	cablearPreguntaTorre();
	estado = "pregunta";
	heroe.moviendo = heroe.corriendo = false;
	preguntaTorre.activa = true;
	preguntaTorre.etapa = k;
	preguntaTorre.continuar = null;
	mostrarPreguntaTorre();
	ui.dialogo.hidden = false;
	ui.dialogo.classList.add("arriba", "obra"); // arriba: que se vea la nube y el héroe; "obra": cabe en pantallas bajas
	document.body.classList.add("con-dialogo");
}

function mostrarPreguntaTorre() {
	const mi = oficinaActual.mision;
	const k = preguntaTorre.etapa;
	const etapa = mi.etapas[k];
	const n = mi.preguntaDe[k];
	const p = etapa.preguntas[n];
	anotarPregunta(oficinaActual.nombre, p.pregunta, false);
	ui.nombre.textContent = `Etapa ${k + 1} · ${etapa.titulo}`;
	ui.retrato.textContent = String(k + 1);
	ui.retrato.style.background = COLORES.verdeInstitucional;
	ui.texto.textContent = p.pregunta;
	ui.pista.textContent = `Pregunta ${n + 1}/${etapa.preguntas.length} · Elige una respuesta (o presiona 1, 2, 3)`;
	ui.opciones.innerHTML = "";
	ui.opciones.hidden = false;
	p.opciones.forEach((texto, i) => {
		const btn = document.createElement("button");
		btn.className = "boton opcion-respuesta";
		btn.textContent = texto;
		btn.addEventListener("click", (e) => {
			e.stopPropagation(); // no debe disparar el clic de la caja (avanzarPreguntaTorre)
			responderPreguntaTorre(i, btn);
		});
		ui.opciones.appendChild(btn);
	});
}

// Sin corazones ni castigo: la opción equivocada se tacha y se vuelve a intentar
function responderPreguntaTorre(indice, btn) {
	if (btn.disabled) return;
	const mi = oficinaActual.mision;
	const k = preguntaTorre.etapa;
	const p = mi.etapas[k].preguntas[mi.preguntaDe[k]];
	if (indice !== p.correcta) {
		btn.classList.add("incorrecta");
		btn.disabled = true;
		ui.pista.textContent = "Esa no es. ¡Intenta con otra opción!";
		anotarPregunta(oficinaActual.nombre, p.pregunta, true);
		sonar("error");
		return;
	}
	btn.classList.add("correcta");
	sonar("acierto");
	ui.opciones.querySelectorAll("button").forEach((b) => (b.disabled = true));
	// Como en la computadora del final: la pregunta y las opciones se quedan (la correcta en verde),
	// la explicación sale debajo y la pregunta sigue sola; un clic en la caja o E la adelantan.
	const turno = ++preguntaTorre.turno;
	ui.pista.textContent = ["¡Correcto!", p.explicacion].filter(Boolean).join(" ");
	preguntaTorre.continuar = siguientePreguntaTorre;
	setTimeout(() => {
		if (preguntaTorre.turno === turno && preguntaTorre.activa && preguntaTorre.continuar) preguntaTorre.continuar();
	}, p.explicacion ? Math.min(4500, 1500 + p.explicacion.length * 28) : 700);
}

// Clic en la caja (o E): sigue sin esperar a que acabe la explicación
function avanzarPreguntaTorre() {
	if (estado === "pregunta" && preguntaTorre.activa && preguntaTorre.continuar) preguntaTorre.continuar();
}

function siguientePreguntaTorre() {
	if (!preguntaTorre.activa) return;
	preguntaTorre.turno++; // el reloj de la pregunta que acaba de terminar ya no cuenta
	preguntaTorre.continuar = null;
	const mi = oficinaActual.mision;
	const k = preguntaTorre.etapa;
	if (mi.preguntaDe[k] + 1 < mi.etapas[k].preguntas.length) {
		mi.preguntaDe[k]++;
		mostrarPreguntaTorre();
		return;
	}
	// Todas contestadas: el banderín se dora y se forman las nubes de arriba
	mi.hechas[k] = true;
	cerrarPreguntaTorre();
	sonar("pieza");
	lanzarChispas(heroe.x, heroe.y + 90, 22, ["#e7c25a", "#fff1c1", COLORES.blanco, COLORES.verdeInstitucional]);
	avisos.push({ texto: k + 1 < mi.etapas.length ? "¡Se forman las nubes de arriba!" : "¡Ya puedes llegar a la licencia!", t: 0 });
}

function cerrarPreguntaTorre() {
	preguntaTorre.activa = false;
	preguntaTorre.continuar = null;
	ui.opciones.hidden = true;
	ui.opciones.innerHTML = "";
	ui.dialogo.hidden = true;
	ui.dialogo.classList.remove("arriba", "obra");
	document.body.classList.remove("con-dialogo");
	estado = "oficina";
	actualizarHudOficina();
}
