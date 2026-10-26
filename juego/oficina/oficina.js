/* Camino a Celaque — entrar y salir de las oficinas y su terminal. Ver juego/LEEME.md. */
"use strict";

// ---------- Módulos de capacitación (calle de Celaque) ----------
// En esta rama la calle no se usa: los módulos se eligen en el mapa. Lo
// "urbano" (y entrarOficina desde la puerta) queda por si se vuelve a ella.
const modulosCompletos = () => modulos.filter((m) => m.completo).length;
// El primer módulo sin completar: su reja no deja pasar de su puerta.
const moduloPendiente = () => modulos.find((m) => !m.completo);

function limiteUrbano() {
	const m = moduloPendiente();
	return m ? m.x + 30 : LARGO_META;
}

function moduloEnPuerta() {
	const m = moduloPendiente();
	return m && estado === "urbano" && Math.abs(heroe.x - m.x) < CFG.distanciaParaHablar && heroeEnSuelo() ? m : null;
}

function actualizarHudUrbano() {
	const n = modulosCompletos();
	ui.hudRelleno.style.width = ((n / Math.max(1, modulos.length)) * 100).toFixed(1) + "%";
	ui.hudTexto.textContent = `Nivel ${nivel}  ·  Módulos completados: ${n} / ${modulos.length}`;
}

// ---------- Oficina (interior de cada módulo) ----------
// Desde el mapa se entra a la oficina del módulo (iniciarOficina): los
// compañeros te reciben (intro y comentarios) y al fondo hay una
// computadora con la Terminal Celaque, donde se contestan las preguntas.
// Al terminar vuelves al mapa con el módulo completo.
function entrarOficina(m) {
	m.visitado = true;
	heroe.moviendo = heroe.corriendo = false;
	estado = "transicion";
	transicion = {
		t: 0,
		dur: 0.9,
		luego: () => {
			oficinaActual = m;
			heroe.x = m.oficina.x0 + 110;
			heroe.y = 0;
			heroe.velY = 0;
			heroe.dir = 1;
			camara = Math.max(0, heroe.x - W * 0.35);
			estado = "oficina";
			actualizarHudOficina();
		},
	};
}

// Por la puerta de salida se vuelve al mapa (con el módulo completo o no)
function salirDeOficina() {
	volverAlMapa(oficinaActual.indice, -1);
}

function actualizarHudOficina() {
	const of = oficinaActual.oficina;
	const progreso = clamp((heroe.x - of.x0) / (of.terminalX - of.x0), 0, 1);
	ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
	ui.hudTexto.textContent = oficinaActual.completo
		? `Módulo ${oficinaActual.nombre} ✓  ·  Vuelve a la puerta para salir`
		: !misionLista(oficinaActual) && oficinaActual.oficina.companeros.every((n) => n.hablado)
		? `Módulo ${oficinaActual.nombre}  ·  ${textoMision(oficinaActual)}`
		: `Módulo ${oficinaActual.nombre}  ·  Llega ${ESTACIONES[oficinaActual.oficina.estacion].lugar} del fondo`;
}

const cercaDe = (x, distancia) => Math.abs(heroe.x - x) < distancia && heroeEnSuelo() && heroe.y === 0;
const enTerminal = () => estado === "oficina" && cercaDe(oficinaActual.oficina.terminalX - 50, 60);
const enSalidaOficina = () => estado === "oficina" && cercaDe(oficinaActual.oficina.x0 + 70, 70);
const companeroCerca = () =>
	(estado === "oficina" && oficinaActual.oficina.companeros.find((n) => cercaDe(n.x, CFG.distanciaParaHablar * 1.3))) || null;

// Preguntas que se hacen en la computadora (menos que antes: config.js →
// preguntasPorModulo, por defecto 2; un mundo.js puede pedir otra cantidad
// con su propio preguntasPorModulo). En el taller de IA son esas por cada
// robot (mundo.js → oficina.robots).
const preguntasDe = (m) => (m.preguntas || []).slice(0, (m.preguntasPorModulo || CFG.preguntasPorModulo || 2) * Math.max(1, m.oficina.robots.length));

// Con varios robots, cuál se arma con la pregunta k: cada uno se lleva una
// parte seguida de las preguntas (desde..hasta, sin incluir hasta).
function tramoRobot(m, r) {
	const total = preguntasDe(m).length;
	const n = m.oficina.robots.length;
	return { desde: Math.floor((r * total) / n), hasta: Math.floor(((r + 1) * total) / n) };
}
const robotDePregunta = (m, k) => m.oficina.robots.findIndex((_, r) => k < tramoRobot(m, r).hasta);

function abrirTerminal(m) {
	m.terminalVisitada = true;
	if (!misionLista(m)) {
		const texto = textoMision(m);
		avisos.push({ texto: `Primero: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`, t: 0 });
		return;
	}
	m.preguntaActual = 0;
	m.aciertos = 0;
	estado = "terminal";
	heroe.moviendo = heroe.corriendo = false;
	ui.terminal.hidden = false;
	const est = m.oficina.estacion;
	ui.terminal.classList.toggle("estacion-robot", est === "robot");
	ui.terminal.classList.toggle("estacion-antivirus", est === "antivirus");
	ui.terminal.classList.toggle("robots-varios", m.oficina.robots.length > 1);
	ui.terminalFigura.hidden = est === "computadora";
	ui.terminalTitulo.textContent = est === "computadora" ? `${ESTACIONES[est].titulo} · Módulo ${m.nombre}` : ESTACIONES[est].titulo;
	ui.terminalSalir.hidden = true;
	document.body.classList.add("con-dialogo");
	if (!preguntasDe(m).length) terminarModulo(m);
	else mostrarPreguntaTerminal(m);
}

function mostrarPreguntaTerminal(m) {
	const preguntas = preguntasDe(m);
	const p = preguntas[m.preguntaActual];
	ui.terminalProgreso.textContent = `Pregunta ${m.preguntaActual + 1} de ${preguntas.length}`;
	if (m.oficina.robots.length > 1) ui.terminalTitulo.textContent = `Taller de IA · Arma al robot ${ROBOTS_IA[m.oficina.robots[robotDePregunta(m, m.preguntaActual)]]}`;
	ui.terminalPregunta.textContent = p.pregunta;
	ui.terminalPista.textContent = "Elige una respuesta (o presiona 1, 2, 3).";
	anotarPregunta(m.nombre, p.pregunta, false);
	ui.terminalOpciones.innerHTML = "";
	p.opciones.forEach((texto, i) => {
		const btn = document.createElement("button");
		btn.className = "opcion-pc";
		btn.innerHTML = "";
		const num = document.createElement("span");
		num.className = "num-pc";
		num.textContent = i + 1;
		btn.append(num, document.createTextNode(texto));
		btn.addEventListener("click", () => responderTerminal(i, m, btn));
		ui.terminalOpciones.appendChild(btn);
	});
}

// Sin vidas ni castigo: la opción equivocada se tacha y se vuelve a
// intentar. Es una capacitación, no un examen.
function responderTerminal(indice, m, btn) {
	if (btn.disabled) return;
	const p = preguntasDe(m)[m.preguntaActual];
	if (indice !== p.correcta) {
		btn.classList.add("incorrecta");
		btn.disabled = true;
		ui.terminalPista.textContent = "Esa no es. ¡Intenta con otra opción!";
		anotarPregunta(m.nombre, p.pregunta, true);
		sonar("error");
		return;
	}
	btn.classList.add("correcta");
	sonar("acierto");
	ui.terminalOpciones.querySelectorAll("button").forEach((b) => (b.disabled = true));
	// Robot o antivirus: la pieza nueva entra ya (ver dibujarFiguraTerminal)
	m.aciertos = m.preguntaActual + 1;
	m.ultimoAcierto = tiempo;
	const piezas = m.oficina.estacion === "robot" ? textoPiezasNuevas(m, robotDePregunta(m, m.preguntaActual)) : "";
	ui.terminalPista.textContent = ["¡Correcto!", piezas, p.explicacion].filter(Boolean).join(" ");
	const conFigura = m.oficina.estacion !== "computadora";
	if (conFigura) setTimeout(() => sonar("pieza"), 450); // la pieza del robot o del escudo encaja
	setTimeout(() => {
		m.preguntaActual++;
		if (m.preguntaActual < preguntasDe(m).length) mostrarPreguntaTerminal(m);
		else terminarModulo(m);
	}, (p.explicacion ? 2200 : conFigura ? 1400 : 900) + (piezas ? 900 : 0)); // un rato más para leer qué se armó
}

// Completar un módulo sube de nivel y abre el siguiente mundo del mapa.
function terminarModulo(m) {
	const repaso = m.completo || modoPruebas(); // no sube de nivel
	m.desbloqueo = completarModulo(m);
	ui.terminalProgreso.textContent = "Completado";
	const varios = m.oficina.robots.length > 1;
	if (varios) ui.terminalTitulo.textContent = "Taller de IA · ¡Robots listos!";
	const fin = varios ? "¡Los robots de IA están listos para ayudarte!" : ESTACIONES[m.oficina.estacion].fin;
	ui.terminalPregunta.textContent = `${fin ? fin + " " : ""}${repaso ? `¡Repasaste el módulo ${m.nombre}!` : `¡Completaste el módulo ${m.nombre}! Subiste al nivel ${nivel}.`}`;
	ui.terminalOpciones.innerHTML = "";
	ui.terminalPista.textContent = "";
	ui.terminalSalir.hidden = false;
	ui.terminalSalir.focus();
}

function cerrarTerminal() {
	const m = oficinaActual;
	ui.terminal.hidden = true;
	document.body.classList.remove("con-dialogo");
	volverAlMapa(m.indice, m.desbloqueo);
	m.desbloqueo = -1;
}
