/* Camino a Celaque — repaso final y constancia de la inducción. Ver juego/LEEME.md. */
"use strict";

// ---------- Repaso final ----------
// Al completar los 6 módulos, antes de la bienvenida: una pregunta al azar
// de cada módulo ("¿Estás listo?"). Como en las computadoras, no hay
// castigo: la equivocada se tacha y se intenta otra vez. Se cuentan las que
// salieron bien a la primera, y eso va en la constancia.
const repasoFinal = { lista: [], actual: 0, aPrimera: 0, fallo: false };

const uiRepaso = {
	ventana: $("repaso"),
	modulo: $("repaso-modulo"),
	progreso: $("repaso-progreso"),
	pregunta: $("repaso-pregunta"),
	opciones: $("repaso-opciones"),
	pista: $("repaso-pista"),
};

function preguntaDeRepaso(m) {
	const lista = m.completoAlSalirDeLaCueva
		? enemigos.flatMap((e) => e.preguntas)
		: m.oficina.exterior
		? m.oficina.enemigos.flatMap((e) => e.preguntas).filter((p) => !p.orden) // las de ordenar no entran en el repaso
		: preguntasDe(m);
	// El jefe de la Cueva repite preguntas de otros antivalores
	const unicas = lista.filter((p, i) => p && lista.findIndex((q) => q && q.pregunta === p.pregunta) === i);
	return unicas.length ? unicas[Math.floor(Math.random() * unicas.length)] : null;
}

function abrirRepaso() {
	repasoFinal.lista = modulos.map((m) => ({ modulo: m, p: preguntaDeRepaso(m) })).filter((x) => x.p);
	repasoFinal.actual = 0;
	repasoFinal.aPrimera = 0;
	if (!repasoFinal.lista.length) {
		guardarConstancia({ aciertos: 0, total: 0 }); // sin preguntas: constancia sin resultado
		return ganar();
	}
	estado = "repaso";
	ocultarMapaUI();
	uiRepaso.ventana.hidden = false;
	mostrarPreguntaRepaso();
}

function mostrarPreguntaRepaso() {
	const { modulo, p } = repasoFinal.lista[repasoFinal.actual];
	repasoFinal.fallo = false;
	uiRepaso.modulo.textContent = `Módulo ${modulo.nombre}`;
	uiRepaso.progreso.textContent = `Pregunta ${repasoFinal.actual + 1} de ${repasoFinal.lista.length}`;
	uiRepaso.pregunta.textContent = p.pregunta;
	uiRepaso.pista.textContent = esTactil ? "Toca una respuesta." : "Elige una respuesta (o presiona 1, 2, 3).";
	uiRepaso.opciones.innerHTML = "";
	p.opciones.forEach((texto, i) => {
		const btn = document.createElement("button");
		btn.className = "opcion-repaso";
		const num = document.createElement("span");
		num.className = "num-pc";
		num.textContent = i + 1;
		btn.append(num, document.createTextNode(texto));
		btn.addEventListener("click", () => responderRepaso(i, btn));
		uiRepaso.opciones.appendChild(btn);
	});
	anotarPregunta(modulo.nombre, p.pregunta, false);
}

function responderRepaso(indice, btn) {
	if (btn.disabled) return;
	const { modulo, p } = repasoFinal.lista[repasoFinal.actual];
	if (indice !== p.correcta) {
		btn.classList.add("incorrecta");
		btn.disabled = true;
		repasoFinal.fallo = true;
		uiRepaso.pista.textContent = "Esa no es. ¡Intenta con otra opción!";
		anotarPregunta(modulo.nombre, p.pregunta, true);
		sonar("error");
		return;
	}
	btn.classList.add("correcta");
	uiRepaso.opciones.querySelectorAll("button").forEach((b) => (b.disabled = true));
	if (!repasoFinal.fallo) repasoFinal.aPrimera++;
	uiRepaso.pista.textContent = ["¡Correcto!", p.explicacion].filter(Boolean).join(" ");
	sonar("acierto");
	setTimeout(() => {
		repasoFinal.actual++;
		if (repasoFinal.actual < repasoFinal.lista.length) mostrarPreguntaRepaso();
		else terminarRepaso();
	}, p.explicacion ? 2200 : 1100);
}

function terminarRepaso() {
	uiRepaso.ventana.hidden = true;
	guardarConstancia({ aciertos: repasoFinal.aPrimera, total: repasoFinal.lista.length });
	anotarInduccionTerminada();
	ganar();
}

// ---------- Constancia ----------
// Una hoja con el nombre, la fecha, los módulos y el resultado del repaso.
// Se "descarga" con la ventana de imprimir del navegador (Guardar como
// PDF): funciona igual abriendo index.html con doble clic, sin servidor.
const CLAVE_CONSTANCIA = "camino-a-celaque:constancia";

function guardarConstancia(resultado) {
	try {
		localStorage.setItem(CLAVE_CONSTANCIA, JSON.stringify({ ...resultado, nombre: nombreJugador, fecha: new Date().toISOString() }));
	} catch (e) {
		/* sin almacenamiento: la constancia sale sin el resultado del repaso */
	}
}

// Solo vale la de quien está jugando: otra persona pudo terminar antes en
// este navegador y "Empezar de cero" no siempre se usa
function leerConstancia() {
	try {
		const d = JSON.parse(localStorage.getItem(CLAVE_CONSTANCIA) || "null");
		return d && typeof d === "object" && d.nombre === nombreJugador ? d : null;
	} catch (e) {
		return null;
	}
}

function borrarConstancia() {
	try {
		localStorage.removeItem(CLAVE_CONSTANCIA);
	} catch (e) {
		/* sin almacenamiento */
	}
}

// Botón del mapa con todo completo: la constancia o, si este jugador
// todavía no hizo el repaso (recargó antes de que saliera), el repaso
function constanciaDesdeMapa() {
	if (leerConstancia()) imprimirConstancia();
	else abrirRepaso();
}

const textoRepaso = (d) => (d && Number.isFinite(d.total) && d.total > 0 ? `Repaso final: ${d.aciertos} de ${d.total} respuestas correctas a la primera.` : "");
const fechaLarga = (f) => f.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

// Llena la hoja (oculta en pantalla; style.css → @media print la muestra)
function prepararConstancia() {
	const d = leerConstancia();
	const fecha = d && d.fecha ? new Date(d.fecha) : new Date();
	$("constancia-nombre").textContent = nombreJugador;
	$("constancia-fecha").textContent = `${CFG.textos.titulo} · ${fechaLarga(isNaN(fecha) ? new Date() : fecha)}`;
	$("constancia-repaso").textContent = textoRepaso(d);
	const lista = $("constancia-modulos");
	lista.innerHTML = "";
	for (const m of modulos) {
		const li = document.createElement("li");
		// "Seguridad de la información" ya dice Seguridad: no se repite
		li.textContent = !m.sistema || m.sistema.includes(m.nombre) ? m.sistema || m.nombre : `${m.nombre} · ${m.sistema}`;
		lista.appendChild(li);
	}
}

function imprimirConstancia() {
	prepararConstancia();
	window.print();
}
// También con Ctrl+P la hoja sale llena
window.addEventListener("beforeprint", prepararConstancia);
