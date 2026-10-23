/* Camino a Celaque — mapa: progreso guardado, carta y navegación. Ver juego/LEEME.md. */
"use strict";

// ---------- Mapa: progreso y navegación ----------
// Vista general como la de Super Mario Land 2: un mundo (meseta) por
// módulo alrededor de la meseta central, donde se elige el personaje.
// Solo se entra al primero y a los ya desbloqueados (completar uno abre
// el siguiente). Elegir un mundo acerca la vista; tocar su edificio abre
// su carta (qué sistema es) y desde la carta se entra al nivel.
const mapa = {
	sel: 0, // mundo señalado (flechas o clic)
	foco: -1, // mundo acercado (-1 = vista general)
	z: 0, // 0 = vista general, 1 = acercado (va hacia zObjetivo)
	zObjetivo: 0,
	carta: false,
	hover: -1,
	sacudir: [], // por mundo: lo que le queda a la sacudida del candado
	abriendo: -1, // mundo recién desbloqueado (su candado se abre)
	abrirT: 0,
	mensaje: "",
	mensajeT: 0,
	victoriaPendiente: false,
	// Ficha del héroe: camina por el mapa hasta el mundo abierto elegido
	heroeMundo: 0,
	heroeX: null,
	heroeY: null,
	fase: 0,
	moviendo: false,
	dir: 1,
	// Huevo de pascua: un delfín que salta del mar de vez en cuando
	delfin: { t: -1, x: 0, y: 0, dir: 1, proxima: 6, cx: 0, cy: 0 },
};
// Con el nombre de pruebas (config.js → nombrePruebas) se abren todos
// los mundos, pero ninguno queda completado: se pueden jugar una y otra vez.
const modoPruebas = () => !!CFG.nombrePruebas && nombreJugador.toLowerCase() === CFG.nombrePruebas.toLowerCase();
const desbloqueado = (i) => i === 0 || modoPruebas() || (!!modulos[i - 1] && modulos[i - 1].completo);
const todosCompletos = () => modulos.length > 0 && modulos.every((m) => m.completo);
const primerPendiente = () => Math.max(0, modulos.findIndex((m) => !m.completo));

// Progreso guardado en este navegador. Si no se puede (modo privado o
// almacenamiento bloqueado), el juego sigue igual y solo dura la partida.
const CLAVE_PROGRESO = "camino-a-celaque:progreso";
function leerGuardado() {
	try {
		return JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || "null");
	} catch (e) {
		return null;
	}
}

function guardarProgreso() {
	try {
		// En modo pruebas se guarda el nombre, pero los mundos completados y el
		// nivel se quedan como estaban (al volver a tu nombre siguen ahí)
		const antes = modoPruebas() ? leerGuardado() || {} : null;
		const completos = antes ? antes.completos || [] : modulos.filter((m) => m.completo).map((m) => m.nombre);
		const nivelGuardado = antes ? Number(antes.nivel) || 0 : nivel;
		localStorage.setItem(CLAVE_PROGRESO, JSON.stringify({ completos, nivel: nivelGuardado, personaje, nombre: nombreJugador }));
	} catch (e) {
		/* sin almacenamiento */
	}
}

function cargarProgreso() {
	const d = leerGuardado();
	if (d && Array.isArray(d.completos)) {
		modulos.forEach((m) => (m.completo = d.completos.includes(m.nombre)));
		nivel = Math.max(0, Number(d.nivel) || 0);
		vidas = vidasMax();
		if (CFG.personajes[d.personaje]) elegirPersonaje(d.personaje);
		nombreJugador = typeof d.nombre === "string" ? d.nombre.slice(0, 24) : "";
		ui.nombreJugador.value = nombreJugador;
		if (modoPruebas()) modulos.forEach((m) => (m.completo = false));
	}
	mapa.sel = mapa.heroeMundo = primerPendiente();
}

// "Empezar de cero" (arriba a la derecha) borra también el nombre y el
// personaje, para que juegue otra persona; "Jugar de nuevo" (al final) no.
function reiniciarProgreso(todo) {
	if (todo) {
		nombreJugador = "";
		ui.nombreJugador.value = "";
		elegirPersonaje(CLAVES_PERSONAJE[0]);
	}
	modulos.forEach((m) => {
		m.completo = false;
		m.visitado = false;
		m.terminalVisitada = false;
		m.preguntaActual = 0;
		m.oficina.companeros.forEach((n) => (n.hablado = false));
		if (m.mision) reiniciarMision(m.mision);
	});
	nivel = 0;
	vidas = VIDAS_BASE;
	mapa.sel = mapa.heroeMundo = 0;
	mapa.abriendo = -1;
	mapa.victoriaPendiente = false;
	guardarProgreso();
	actualizarPanelMapa();
}

// Marca el módulo como completo (sube de nivel) y devuelve el índice del
// mundo que se acaba de desbloquear, o -1.
function completarModulo(m) {
	if (m.completo) return -1;
	if (modoPruebas()) {
		// Pruebas: se juega completo, pero no queda terminado ni sube de nivel
		avisoMapa(`Modo de pruebas: ${m.nombre} sigue sin completar`);
		return -1;
	}
	m.completo = true;
	m.brillo = 1;
	nivel++;
	vidas = vidasMax(); // el corazón nuevo llega lleno
	avisoMapa(`¡Nivel ${nivel}! ${m.nombre} ✓`); // se ve al volver al mapa
	if (todosCompletos()) mapa.victoriaPendiente = true;
	guardarProgreso();
	return m.indice + 1 < modulos.length ? m.indice + 1 : -1;
}

function abrirMapa() {
	estado = "mapa";
	petalos = [];
	ui.hud.hidden = true;
	ui.tactiles.hidden = true;
	ui.victoria.hidden = true;
	ui.carta.hidden = !mapa.carta;
	actualizarPanelMapa();
}

// Al terminar (o salir de) un nivel: el mapa aparece acercado a ese mundo
// y se aleja; si se desbloqueó uno nuevo, su candado se abre.
function mostrarMapaTras(i, nuevo) {
	reiniciarHeroe();
	mapa.foco = i;
	mapa.z = 1;
	mapa.zObjetivo = 0;
	mapa.carta = false;
	mapa.sel = mapa.heroeMundo = i;
	mapa.heroeX = null;
	if (nuevo >= 0) {
		mapa.abriendo = nuevo;
		mapa.abrirT = 0;
	}
	abrirMapa();
}

function volverAlMapa(i, nuevo) {
	heroe.moviendo = heroe.corriendo = false;
	ui.hud.hidden = true;
	ui.tactiles.hidden = true;
	estado = "transicion";
	transicion = { t: 0, dur: 0.9, luego: () => mostrarMapaTras(i, nuevo) };
}

function ocultarMapaUI() {
	ui.panel.classList.add("oculto");
	ui.reiniciarProgreso.hidden = true;
	ui.btnAyuda.hidden = true;
	ui.ayuda.hidden = true;
	ui.mapaBarra.hidden = true;
	ui.mapaAyuda.hidden = true;
	ui.carta.hidden = true;
}

// El rectángulo central solo se ve en la vista general; la barra de
// arriba, solo con un mundo acercado.
function actualizarPanelMapa() {
	if (estado !== "mapa") return ocultarMapaUI();
	const general = mapa.foco < 0 && mapa.zObjetivo === 0;
	ui.panel.classList.toggle("oculto", !general);
	ui.mapaAyuda.hidden = !general;
	ui.btnAyuda.hidden = !general;
	ui.reiniciarProgreso.hidden = !general || !(modulos.some((m) => m.completo) || nombreJugador);
	const acercado = mapa.foco >= 0 && mapa.zObjetivo === 1 && !mapa.carta;
	ui.mapaBarra.hidden = !acercado;
	if (acercado) {
		const m = modulos[mapa.foco];
		const como = esTactil ? "Toca" : "Haz clic en";
		ui.mapaBarraTexto.textContent = `Mundo ${mapa.foco + 1} · ${m.nombre} — ${como} el edificio para ver su carta`;
	}
}

function avisoMapa(texto) {
	mapa.mensaje = texto;
	mapa.mensajeT = 2.8;
}

function avisoCandado(i) {
	mapa.sacudir[i] = 0.5;
	avisoMapa(`Completa «${modulos[i - 1].nombre}» para abrir este mundo`);
}

// Sin nombre no se entra: se señala el campo
function faltaNombre() {
	if (nombreJugador) return false;
	ui.nombreEtiqueta.classList.remove("falta");
	void ui.nombreEtiqueta.offsetWidth; // reinicia la sacudida
	ui.nombreEtiqueta.classList.add("falta");
	ui.nombreJugador.focus();
	avisoMapa("Escribe tu nombre para empezar");
	return true;
}

// Cómo se juega: se abre sola la primera vez (se recuerda en el navegador)
const CLAVE_AYUDA = "camino-a-celaque:ayuda-vista";
function abrirAyuda() {
	ui.ayuda.hidden = false;
	$("ayuda-cerrar").focus();
}
function cerrarAyuda() {
	ui.ayuda.hidden = true;
	try {
		localStorage.setItem(CLAVE_AYUDA, "1");
	} catch (e) {
		/* sin almacenamiento: se volverá a mostrar */
	}
	if (!nombreJugador) ui.nombreJugador.focus();
}
function ayudaYaVista() {
	try {
		return localStorage.getItem(CLAVE_AYUDA) === "1";
	} catch (e) {
		return false;
	}
}

// Elegir un mundo: con candado se sacude; abierto, el mapa se acerca.
function elegirMundo(i) {
	if (i < 0 || i >= modulos.length) return;
	mapa.sel = i;
	if (!desbloqueado(i)) return avisoCandado(i);
	if (faltaNombre()) return;
	mapa.heroeMundo = i;
	mapa.foco = i;
	mapa.zObjetivo = 1;
	actualizarPanelMapa();
}

function alejarMapa() {
	mapa.zObjetivo = 0;
	cerrarCarta();
}

// Flechas: en la vista general mueven la selección; acercado, pasan
// directo al mundo de al lado (si está abierto).
function moverSeleccionMapa(paso) {
	if (mapa.carta) return;
	const i = modulo(mapa.sel + paso, modulos.length);
	if (mapa.foco >= 0 && mapa.zObjetivo === 1) {
		if (desbloqueado(i)) elegirMundo(i);
		else avisoCandado(i);
		return;
	}
	mapa.sel = i;
	if (desbloqueado(i)) mapa.heroeMundo = i;
}

function abrirCarta(i) {
	const m = modulos[i];
	mapa.carta = true;
	ui.cartaMundo.textContent = `Mundo ${i + 1} de ${modulos.length}${m.completo ? "  ·  ✓ Completado" : ""}`;
	ui.cartaTitulo.textContent = m.sistema || m.nombre;
	ui.cartaModulo.textContent = `Módulo ${m.nombre}${m.subtitulo ? " · " + m.subtitulo : ""}`;
	ui.cartaDescripcion.textContent = m.descripcion || "";
	const anfitrion = m.anfitrionNpc ? [`Te recibe ${m.anfitrionNpc.nombre} ★`] : [];
	const pasos = m.completoAlSalirDeLaCueva
		? [
				`Recorre el camino y conoce a ${npcs.length} personas de la obra.`,
				`Cruza la Cueva y vence a ${enemigos.length} antivalores (como ${enemigos.map((e) => e.antivalor).filter(Boolean).slice(0, 2).join(" y ")}) respondiendo bien.`,
			]
		: [
				m.oficina.companeros.length > 1
					? `Habla con ${m.oficina.companeros.length} compañeros de la oficina.`
					: `Escucha lo que te explica ${m.oficina.companeros[0].nombre}.`,
				...(m.mision ? [`Lleva ${m.mision.objeto} del punto A al punto B.`] : []),
				ESTACIONES[m.oficina.estacion].carta(preguntasDe(m).length, m),
			];
	ui.cartaLista.innerHTML = "";
	for (const texto of [...anfitrion, ...pasos]) {
		const li = document.createElement("li");
		li.textContent = texto;
		ui.cartaLista.appendChild(li);
	}
	ui.cartaEntrarTexto.textContent = m.completoAlSalirDeLaCueva ? "Empezar el camino" : "Entrar al módulo";
	ui.cartaLogo.setAttribute("aria-label", `Logo de ${m.nombre}`);
	ponerLogo(ui.cartaLogo, m.rutaLogo);
	ui.carta.hidden = false;
	actualizarPanelMapa();
	ui.cartaEntrar.focus();
}

function cerrarCarta() {
	mapa.carta = false;
	ui.carta.hidden = true;
	actualizarPanelMapa();
}

function entrarMundo(i) {
	const m = modulos[i];
	if (!m || !desbloqueado(i)) return;
	mapa.carta = false;
	ocultarMapaUI();
	estado = "transicion";
	transicion = { t: 0, dur: 0.9, luego: () => (m.completoAlSalirDeLaCueva ? iniciarTalento() : iniciarOficina(m)) };
}

// E / Enter / Espacio en el mapa: acercar → carta → entrar
function accionMapa() {
	if (mapa.carta) entrarMundo(mapa.foco);
	else if (mapa.foco >= 0 && mapa.zObjetivo === 1) abrirCarta(mapa.foco);
	else elegirMundo(mapa.sel);
}

// Esc: cerrar la carta, o alejarse del mundo acercado
function atrasMapa() {
	if (mapa.carta) cerrarCarta();
	else if (mapa.zObjetivo === 1) alejarMapa();
}

function actualizarMapa(dt) {
	const antes = mapa.z;
	mapa.z = mapa.zObjetivo > mapa.z ? Math.min(1, mapa.z + dt * 1.5) : Math.max(0, mapa.z - dt * 1.5);
	if (mapa.z === 0 && mapa.zObjetivo === 0 && mapa.foco >= 0) {
		mapa.foco = -1;
		actualizarPanelMapa();
	} else if (antes < 1 && mapa.z === 1) actualizarPanelMapa();
	for (let i = 0; i < mapa.sacudir.length; i++) if (mapa.sacudir[i] > 0) mapa.sacudir[i] = Math.max(0, mapa.sacudir[i] - dt);
	mapa.mensajeT = Math.max(0, mapa.mensajeT - dt);

	// Candado que se abre (con la vista general ya alejada)
	if (mapa.abriendo >= 0 && mapa.foco < 0) {
		const antesT = mapa.abrirT;
		mapa.abrirT += dt;
		if (antesT < 0.8 && mapa.abrirT >= 0.8) avisoMapa(`¡Se abrió el mundo ${mapa.abriendo + 1}: ${modulos[mapa.abriendo].nombre}!`);
		if (mapa.abrirT >= 1.8) {
			mapa.sel = mapa.heroeMundo = mapa.abriendo;
			mapa.abriendo = -1;
		}
	} else if (mapa.victoriaPendiente && mapa.foco < 0 && estado === "mapa") {
		mapa.victoriaPendiente = false;
		ganar();
	}

	// El delfín: salta (t de 0 a 1 en 1.6 s) y vuelve a aparecer en otro lado
	const d = mapa.delfin;
	if (d.t >= 0) {
		d.t += dt / 1.6;
		if (d.t >= 1) {
			d.t = -1;
			d.proxima = 9 + Math.random() * 12;
		}
	} else if ((d.proxima -= dt) <= 0) {
		const p = lugarDeMar();
		d.proxima = 2;
		if (p) Object.assign(d, { x: p.x, y: p.y, dir: Math.random() < 0.5 ? 1 : -1, t: 0 });
	}

	// La ficha del héroe camina hasta su mundo (en unidades del mapa)
	const q = lugarHeroeMapa(mapa.heroeMundo);
	if (mapa.heroeX === null) {
		mapa.heroeX = q.x;
		mapa.heroeY = q.y;
	}
	const dx = q.x - mapa.heroeX;
	const dy = q.y - mapa.heroeY;
	const dist = Math.hypot(dx, dy);
	mapa.moviendo = dist > 2;
	if (mapa.moviendo) {
		const paso = Math.min(dist, 520 * dt);
		mapa.heroeX += (dx / dist) * paso;
		mapa.heroeY += (dy / dist) * paso;
		if (Math.abs(dx) > 1) mapa.dir = Math.sign(dx);
		mapa.fase += dt * 10;
	}
}
