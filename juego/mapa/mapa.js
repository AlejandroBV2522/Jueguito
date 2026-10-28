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
	powerUpT: 0, // destello del héroe al activar el modo fácil (ver dibujarHeroeMapa)
	victoriaPendiente: false,
	porAbrir: [], // mundos extra que se abren después del que se está abriendo
	// Ficha del héroe: camina por la calle del mapa hasta el mundo abierto
	// elegido (ruta: los puntos que le faltan, ver rutaMapa)
	heroeMundo: 0,
	heroeEn: 0, // último mundo por el que pasó
	destinoRuta: -1,
	ruta: [],
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
// Los mundos extra (mundo.js → extra, como la Cafetería) son opcionales:
// se abren al completar el de "abreDespues", no suben de nivel ni cuentan
// para terminar la capacitación.
const modulosPrincipales = () => modulos.filter((m) => !m.extra);
// El mundo que hay que completar para abrir el i (null = ya está abierto)
function anteriorDe(i) {
	const m = modulos[i];
	if (m.extra) return modulos.find((x) => x.nombre === m.abreDespues) || null;
	for (let k = i - 1; k >= 0; k--) if (!modulos[k].extra) return modulos[k];
	return null;
}
const desbloqueado = (i) => {
	const antes = anteriorDe(i);
	return modoPruebas() || !antes || antes.completo;
};
const todosCompletos = () => modulosPrincipales().length > 0 && modulosPrincipales().every((m) => m.completo);
const primerPendiente = () => Math.max(0, modulos.findIndex((m) => !m.completo && !m.extra));
// "Mundo 3" (los extra no tienen número)
const numeroMundo = (i) => modulos.slice(0, i + 1).filter((m) => !m.extra).length;
const textoMundo = (i) => (modulos[i].extra ? "Mundo extra" : `Mundo ${numeroMundo(i)}`);

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
		// Los corazones que lleva acumulados (normales y dorados)
		const corazonesGuardados = antes ? { vidas: antes.vidas, doradas: antes.doradas } : { vidas, doradas: vidasDoradas };
		localStorage.setItem(CLAVE_PROGRESO, JSON.stringify({ completos, nivel: nivelGuardado, ...corazonesGuardados, personaje, nombre: nombreJugador }));
	} catch (e) {
		/* sin almacenamiento */
	}
}

function cargarProgreso() {
	const d = leerGuardado();
	if (d && Array.isArray(d.completos)) {
		modulos.forEach((m) => (m.completo = d.completos.includes(m.nombre)));
		nivel = Math.max(0, Number(d.nivel) || 0);
		// Sin corazones guardados (partidas de antes), llenos
		vidas = Number.isFinite(d.vidas) ? clamp(Math.round(d.vidas), 1, vidasMax()) : vidasMax();
		vidasDoradas = Number.isFinite(d.doradas) ? clamp(Math.round(d.doradas), 0, DORADAS_MAX) : 0;
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
	vidasDoradas = 0;
	mapa.porAbrir = [];
	if (!modoPruebas()) borrarConstancia(); // la de pruebas no toca la de nadie
	if (todo) borrarColeccion(); // otra persona: empieza su propia colección
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
	if (m.extra) {
		// Un mundo extra no sube de nivel (su premio es otro)
		avisoMapa(`${m.nombre} ✓`);
		guardarProgreso();
		return -1;
	}
	nivel++;
	ganarCorazon(); // el corazón nuevo llega lleno
	avisoMapa(`¡Nivel ${nivel}! ${m.nombre} ✓`); // se ve al volver al mapa
	sonar("nivel");
	if (todosCompletos()) mapa.victoriaPendiente = true;
	// Los extra que dependen de este se abren después del siguiente
	modulos.forEach((x, k) => {
		if (x.extra && x.abreDespues === m.nombre && !mapa.porAbrir.includes(k)) mapa.porAbrir.push(k);
	});
	guardarProgreso();
	return modulos.findIndex((x, k) => k > m.indice && !x.extra);
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
	guardarProgreso(); // los corazones con los que sales del nivel
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
	uiEstadisticas.boton.hidden = true;
	uiEstadisticas.ventana.hidden = true;
	$("btn-ver-bienvenida").hidden = true;
	uiColeccion.boton.hidden = true;
	uiColeccion.ventana.hidden = true;
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
	uiEstadisticas.boton.hidden = !general || !modoPruebas();
	$("btn-ver-bienvenida").hidden = !general || !modoPruebas();
	uiColeccion.boton.hidden = !general;
	actualizarBotonColeccion();
	const btnConstancia = $("btn-constancia-mapa");
	btnConstancia.hidden = !general || !todosCompletos() || modoPruebas();
	btnConstancia.textContent = leerConstancia() ? "Descargar mi constancia" : "Hacer el repaso final";
	const acercado = mapa.foco >= 0 && mapa.zObjetivo === 1 && !mapa.carta;
	ui.mapaBarra.hidden = !acercado;
	if (acercado) {
		const m = modulos[mapa.foco];
		const como = esTactil ? "Toca" : "Haz clic en";
		ui.mapaBarraTexto.textContent = `${textoMundo(mapa.foco)} · ${m.nombre} — ${como} el edificio para ver su carta`;
	}
}

function avisoMapa(texto) {
	mapa.mensaje = texto;
	mapa.mensajeT = 2.8;
}

function avisoCandado(i) {
	mapa.sacudir[i] = 0.5;
	avisoMapa(`Completa «${anteriorDe(i).nombre}» para abrir este mundo`);
	sonar("candado");
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

// Orden de las flechas: el de la calle (cada extra justo después del
// mundo que lo abre)
function ordenMapa() {
	const orden = [];
	modulos.forEach((m, i) => {
		if (m.extra) return;
		orden.push(i);
		modulos.forEach((x, k) => x.extra && x.abreDespues === m.nombre && orden.push(k));
	});
	modulos.forEach((m, i) => !orden.includes(i) && orden.push(i));
	return orden;
}

// Flechas: en la vista general mueven la selección; acercado, pasan
// directo al mundo de al lado (si está abierto).
function moverSeleccionMapa(paso) {
	if (mapa.carta) return;
	const orden = ordenMapa();
	const i = orden[modulo(orden.indexOf(mapa.sel) + paso, orden.length)];
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
	const cual = m.extra ? "Mundo extra · opcional" : `Mundo ${numeroMundo(i)} de ${modulosPrincipales().length}`;
	ui.cartaMundo.textContent = `${cual}${m.completo ? "  ·  ✓ Completado" : ""}`;
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
					: m.oficina.companeros.length
						? `Escucha lo que te explica ${m.oficina.companeros[0].nombre}.`
						: "Conversa con todo el equipo, que está aquí reunido.",
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
	// Hacia el objetivo y ahí se queda (antes, ya acercado, bajaba y subía
	// cada cuadro: la pantalla temblaba)
	mapa.z = mapa.z < mapa.zObjetivo ? Math.min(mapa.zObjetivo, mapa.z + dt * 1.5) : Math.max(mapa.zObjetivo, mapa.z - dt * 1.5);
	if (mapa.z === 0 && mapa.zObjetivo === 0 && mapa.foco >= 0) {
		mapa.foco = -1;
		actualizarPanelMapa();
	} else if (antes < 1 && mapa.z === 1) actualizarPanelMapa();
	for (let i = 0; i < mapa.sacudir.length; i++) if (mapa.sacudir[i] > 0) mapa.sacudir[i] = Math.max(0, mapa.sacudir[i] - dt);
	mapa.mensajeT = Math.max(0, mapa.mensajeT - dt);
	mapa.powerUpT = Math.max(0, mapa.powerUpT - dt);

	// Candado que se abre (con la vista general ya alejada)
	if (mapa.abriendo >= 0 && mapa.foco < 0) {
		const antesT = mapa.abrirT;
		mapa.abrirT += dt;
		if (antesT < 0.8 && mapa.abrirT >= 0.8) {
			const m = modulos[mapa.abriendo];
			avisoMapa(m.extra ? `¡Se abrió un mundo extra: ${m.nombre}!` : `¡Se abrió el mundo ${numeroMundo(mapa.abriendo)}: ${m.nombre}!`);
			sonar("abrir");
		}
		if (mapa.abrirT >= 1.8) {
			// La ficha va al mundo nuevo (a un extra no: es opcional)
			if (!modulos[mapa.abriendo].extra) mapa.sel = mapa.heroeMundo = mapa.abriendo;
			mapa.abriendo = -1;
		}
	} else if (mapa.porAbrir.length && mapa.foco < 0) {
		mapa.abriendo = mapa.porAbrir.shift();
		mapa.abrirT = 0;
	} else if (mapa.victoriaPendiente && mapa.foco < 0 && estado === "mapa") {
		mapa.victoriaPendiente = false;
		abrirRepaso(); // una pregunta de cada módulo y después la bienvenida
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

	moverHeroeMapa(dt);
}

// La ficha del héroe va por la calle (sin cortar por el agua): sigue los
// puntos de rutaMapa (dibujo-mapa.js) de mundo en mundo. Si eliges otro
// mundo a medio camino, llega al siguiente cruce y de ahí sigue al nuevo.
function moverHeroeMapa(dt) {
	if (mapa.heroeX === null) {
		const q = lugarHeroeMapa(mapa.heroeMundo);
		mapa.heroeX = q.x;
		mapa.heroeY = q.y;
		mapa.heroeEn = mapa.destinoRuta = mapa.heroeMundo;
		mapa.ruta = [];
	}
	if (mapa.destinoRuta !== mapa.heroeMundo) {
		const corte = mapa.ruta.findIndex((p) => p.nodo >= 0);
		const desde = corte >= 0 ? mapa.ruta[corte].nodo : mapa.heroeEn;
		const resto = corte >= 0 ? mapa.ruta.slice(0, corte + 1) : [];
		mapa.ruta = [...resto, ...rutaMapa(desde, mapa.heroeMundo)];
		mapa.destinoRuta = mapa.heroeMundo;
	}
	mapa.moviendo = mapa.ruta.length > 0;
	if (!mapa.moviendo) return;
	// Más rápido mientras más lejos queda (cruzar todo el mapa no tarda tanto)
	let falta = 0;
	let x = mapa.heroeX;
	let y = mapa.heroeY;
	for (const p of mapa.ruta) {
		falta += Math.hypot(p.x - x, p.y - y);
		x = p.x;
		y = p.y;
	}
	let paso = clamp(falta / 1.3, 520, 1500) * dt;
	while (paso > 0 && mapa.ruta.length) {
		const p = mapa.ruta[0];
		const dx = p.x - mapa.heroeX;
		const dy = p.y - mapa.heroeY;
		const dist = Math.hypot(dx, dy);
		if (Math.abs(dx) > 1) mapa.dir = Math.sign(dx);
		if (dist <= paso) {
			mapa.heroeX = p.x;
			mapa.heroeY = p.y;
			paso -= dist;
			if (p.nodo >= 0) mapa.heroeEn = p.nodo;
			mapa.ruta.shift();
		} else {
			mapa.heroeX += (dx / dist) * paso;
			mapa.heroeY += (dy / dist) * paso;
			paso = 0;
		}
	}
	mapa.fase += dt * 10;
}
