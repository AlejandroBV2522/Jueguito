/* Camino a Celaque — la Cueva, los tubos y las peleas con antivalores. Ver juego/LEEME.md. */
"use strict";

// ---------- La Cueva ----------
function entrarCueva() {
	estado = "cueva";
	dentroCueva = true;
	actualizarHudCueva();
}

// ---------- Tubos (entrada/salida de la Cueva) ----------
function puedeUsarTuboEntrada() {
	return (
		estado === "jugando" &&
		!enemigos.find((en) => !en.derrotado && en.x <= LARGO) &&
		Math.abs(heroe.x - LARGO) < CFG.distanciaParaHablar
	);
}

function puedeUsarTuboSalida() {
	return (
		estado === "cueva" &&
		!enemigos.find((en) => !en.derrotado) &&
		Math.abs(heroe.x - LARGO_TOTAL) < CFG.distanciaParaHablar
	);
}

// Los tubos son los únicos "objetos sólidos": si x cae dentro de su ancho,
// el suelo efectivo ahí es la altura del tubo en vez de 0.
function alturaTuboEn(x) {
	// Cada tubo solo es "sólido" mientras sigue siendo relevante: el de
	// entrada antes de cruzar, el de salida ya adentro de la Cueva. Así,
	// al entrar/salir el héroe cae naturalmente del borde del tubo al
	// suelo normal, en vez de quedar flotando parado sobre uno viejo.
	if (!dentroCueva && Math.abs(x - LARGO) < ANCHO_TUBO_MUNDO / 2) return ALTO_TUBO_MUNDO;
	if (dentroCueva && !vistaUrbana && Math.abs(x - LARGO_TOTAL) < ANCHO_TUBO_MUNDO / 2) return ALTO_TUBO_MUNDO;
	return 0;
}

// Huecos: al revés de los tubos, acá NO hay piso. Si caminas/aterrizas
// dentro de uno sin saltarlo, no hay suelo=0 que te detenga y te sigues
// cayendo hasta perder.
function hayHuecoEn(x) {
	if (!dentroCueva || vistaUrbana) return false;
	return HUECOS_CUEVA.some((h) => Math.abs(x - h.x) < ANCHO_HUECO / 2);
}

// Altura de la cara superior del obstáculo (roca/caja) que haya en x, o 0.
// El medio ancho se escala por S para que la zona "pisable" coincida con el
// dibujo (el mundo es 1:1 con la pantalla en horizontal).
function obstaculosActivos() {
	if (oficinaActual) return oficinaActual.oficina.obstaculos;
	if (vistaUrbana) return [];
	return dentroCueva ? OBSTACULOS_CUEVA : OBSTACULOS_AFUERA;
}

function alturaObstaculoEn(x) {
	let top = 0;
	for (const o of obstaculosActivos()) {
		if (Math.abs(x - o.x) < o.medioAncho * S && o.alto > top) top = o.alto;
	}
	return top;
}

// Cualquier superficie sólida sobre la que se pueda aterrizar/pararse:
// los tubos o los obstáculos de la cueva. La usa la física del salto.
function alturaSolidaEn(x) {
	return Math.max(alturaTuboEn(x), alturaObstaculoEn(x));
}

// Alturas de los andamios que hay en x (solo afuera)
// Margen extra para aterrizar en la orilla de un andamio: quien recién
// empieza suele saltar un poco corto o un poco largo, y así igual cae
// parado en vez de pasar de largo.
const MARGEN_BORDE = 26;
function alturasPlataformaEn(x) {
	if (dentroCueva || vistaUrbana) return [];
	return PLATAFORMAS.filter((pl) => Math.abs(x - pl.x) < pl.medioAncho + MARGEN_BORDE).map((pl) => pl.alto);
}

// El piso que te sostiene: la superficie más alta en x que quede por
// DEBAJO de donde venías (así se atraviesan los andamios desde abajo y se
// aterriza encima), o el suelo (0).
function sueloBajo(x, desde) {
	let suelo = 0;
	for (const a of [alturaSolidaEn(x), ...alturasPlataformaEn(x)]) {
		if (a <= desde + 0.5 && a > suelo) suelo = a;
	}
	return suelo;
}

// Choque lateral con los obstáculos: si los pies van por debajo de la cara
// superior, no se puede atravesar y se queda pegado a la cara. Si va por
// encima (saltó lo suficiente), pasa y recorre el techo sin frenar. Devuelve
// la x corregida. `semi` = medio obstáculo + medio héroe (12*S, igual que
// el tope frente al tubo).
function frenarEnObstaculos(viejoX, nuevoX, dir, heroeY) {
	for (const o of obstaculosActivos()) {
		if (heroeY >= o.alto - 3) continue; // por encima: puede pasar/recorrer
		const semi = (o.medioAncho + 12) * S;
		if (dir > 0 && viejoX <= o.x - semi && nuevoX > o.x - semi) return o.x - semi;
		if (dir < 0 && viejoX >= o.x + semi && nuevoX < o.x + semi) return o.x + semi;
	}
	return nuevoX;
}

// "Parado" en general: sirve para saltar, sea desde el piso normal o
// desde encima de un tubo (no exige estar en el tubo específicamente).
function heroeEnSuelo() {
	if (heroe.velY !== 0) return false;
	return heroe.y === 0 || heroe.y === alturaSolidaEn(heroe.x) || alturasPlataformaEn(heroe.x).includes(heroe.y);
}

// Estricto: solo es verdad si de verdad estás parado ARRIBA de un tubo
// (llegaste ahí saltando), no con solo estar parado en el piso normal
// junto a él.
function estaSobreTubo() {
	const alturaTubo = alturaTuboEn(heroe.x);
	return alturaTubo > 0 && heroe.velY === 0 && heroe.y === alturaTubo;
}

// El tubo es un objeto sólido y uniforme: caminando por el suelo, el héroe
// frena con el CUERPO pegado a la cara del tubo (no se mete adentro). El
// tope es la mitad del ancho visual del tubo + el medio ancho del héroe,
// escalado por S para que se vea igual en cualquier resolución. Ya arriba
// (saltó y aterrizó encima), sí puede llegar al centro.
function limiteFrenteATubo(cx, heroeY) {
	return heroeY >= ALTO_TUBO_MUNDO ? cx : cx - 47 * S;
}

// Igual que con el tubo: un enemigo con foto no es un punto sin ancho.
// Frenar justo en su x (como se hacía antes) mete al héroe en medio del
// dibujo — apenas se nota en un enemigo chico, pero es muy visible en el
// jefe (gigante, escala 2.2). Se calcula cuánto sobresale el sprite hacia
// el lado por donde se acerca el héroe (siempre desde la izquierda), con
// la MISMA fórmula de tamaño que usa dibujarEnemigoSprite, y se le suma
// el medio ancho del héroe (12*S, igual que en limiteFrenteATubo).
function anchoFrenteEnemigo(en) {
	const sprites = SPRITES_POR_ENEMIGO[en.nombre];
	const meta = sprites && sprites.quieto;
	const el = meta && meta.cargando.elemento;
	if (!el) return 16 * S; // sin foto (vectorial) o la imagen aún no cargó
	const w = el.naturalWidth || el.width;
	const h = el.naturalHeight || el.height;
	const s = S * 1.15 * (en.escala || 1);
	const altoContenido = (meta.abajo - meta.arriba) * h;
	const dw = w * ((100 * s) / altoContenido);
	// El enemigo se voltea para mirar al héroe que se acerca por la
	// izquierda: el lado que sobresale hacia él es (1 - anclaX) del ancho.
	// En los enemigos anchos (Golem, Jefe) esa mitad incluye brazos/cola
	// extendidos que no son el "cuerpo" real — factorFrente (en config.js,
	// por defecto 1) la recorta para que el héroe se acerque más, como con
	// los enemigos más chicos.
	const factorFrente = en.factorFrente ?? 1;
	return (1 - meta.anclaX) * dw * factorFrente + 12 * S;
}

// Más fácil para quien no juega seguido: vale saltar un instante después
// de salir de un borde ("coyote"), y si se presiona justo antes de
// aterrizar, el salto sale solo al tocar el piso (ver actualizar).
function saltarAccion() {
	if (estado !== "jugando" && estado !== "cueva" && estado !== "urbano" && estado !== "oficina") return;
	const recienEnSuelo = tiempo - heroe.ultimoSuelo < 0.14 && heroe.velY <= 0;
	if (heroeEnSuelo() || recienEnSuelo) {
		heroe.velY = IMPULSO_SALTO;
		heroe.ultimoSuelo = -1;
		heroe.saltoPedido = -1;
	} else {
		heroe.saltoPedido = tiempo;
	}
}

function agacharAccion() {
	if (heroe.agachado || !estaSobreTubo()) return;
	if (puedeUsarTuboEntrada()) entrarPorTubo(entrarCueva);
	else if (puedeUsarTuboSalida()) entrarPorTubo(salirACiudad);
}

// (En esta versión ya no se sale a la calle de Celaque: el tubo de salida
// lleva de vuelta al mapa, que es donde se eligen los demás módulos.)
function salirACiudad() {
	// El camino + la Cueva son el módulo de Talento: ya está completo.
	const nuevo = moduloTalento ? completarModulo(moduloTalento) : -1;
	ui.hud.hidden = true;
	ui.tactiles.hidden = true;
	mostrarMapaTras(moduloTalento ? moduloTalento.indice : 0, nuevo);
}

// Pantalla negra de 3s al cruzar un tubo (ver el bloque "transicion" en
// actualizar(dt) y dibujar(dt)).
function entrarPorTubo(luego) {
	heroe.agachado = true;
	heroe.moviendo = heroe.corriendo = false;
	estado = "transicion";
	transicion = { t: 0, luego };
}

function abrirPregunta(enemigo) {
	estado = "pregunta";
	heroe.moviendo = heroe.corriendo = false;
	dlg.enemigo = enemigo;
	const p = enemigo.preguntas[enemigo.preguntaActual];
	const titulo = enemigo.antivalor || enemigo.nombre;
	ui.nombre.textContent = enemigo.antivalor ? `${titulo} ✗` : titulo;
	ui.retrato.textContent = titulo.replace(/^(El|La|Los|Las)\s+/, "").charAt(0).toUpperCase();
	ui.retrato.style.background = enemigo.apariencia.ropa;
	ui.texto.textContent = p.pregunta;
	const vidasTexto = `Vidas: ${corazones()}`;
	ui.pista.textContent =
		enemigo.preguntas.length > 1
			? `Pregunta ${enemigo.preguntaActual + 1}/${enemigo.preguntas.length} · ${vidasTexto}`
			: vidasTexto;
	ui.opciones.innerHTML = "";
	ui.opciones.hidden = false;
	p.opciones.forEach((texto, i) => {
		const btn = document.createElement("button");
		btn.className = "boton opcion-respuesta";
		btn.textContent = texto;
		btn.addEventListener("click", (e) => {
			e.stopPropagation(); // no debe disparar el click-to-advance de #dialogo
			responder(i, enemigo);
		});
		ui.opciones.appendChild(btn);
	});
	ui.dialogo.hidden = false;
	ui.dialogo.classList.add("arriba"); // para que se vea la pelea abajo, en el canvas
	document.body.classList.add("con-dialogo");
}

function responder(indice, enemigo) {
	const p = enemigo.preguntas[enemigo.preguntaActual];
	if (indice === p.correcta) {
		// Cierra la caja ya, para que se vea la pelea en el canvas
		ui.opciones.hidden = true;
		ui.opciones.innerHTML = "";
		ui.dialogo.hidden = true;
		document.body.classList.remove("con-dialogo");

		heroe.atacando = true;
		heroe.atacandoT = 0;

		const quedanPreguntas = enemigo.preguntaActual + 1 < enemigo.preguntas.length;
		if (quedanPreguntas) {
			// Todavía no cae: hay que responderle otra pregunta más.
			setTimeout(() => {
				enemigo.preguntaActual++;
				abrirPregunta(enemigo);
			}, 550);
		} else {
			enemigo.cayendo = 0.001; // arranca la animación de caída (ver actualizar)
			setTimeout(() => {
				enemigo.derrotado = true;
				cerrarPregunta(enemigo);
			}, 550);
		}
	} else {
		enemigo.atacando = true;
		enemigo.atacandoT = 0;
		heroe.golpeado = true;
		heroe.golpeadoT = 0;
		vidas--;
		if (vidas <= 0) setTimeout(perderCueva, 350);
		else ui.pista.textContent = `Incorrecto, intenta de nuevo. Vidas: ${corazones()}`;
	}
}

function cerrarPregunta(enemigo) {
	dlg.enemigo = null;
	ui.opciones.hidden = true;
	ui.opciones.innerHTML = "";
	ui.dialogo.hidden = true;
	ui.dialogo.classList.remove("arriba");
	document.body.classList.remove("con-dialogo");
	if (enemigo.x <= LARGO) {
		// Era el Guardián, afuera: sigues caminando el camino normal
		estado = "jugando";
		actualizarHud();
	} else {
		estado = "cueva";
		actualizarHudCueva();
	}
}

// Caerte en un hueco no castiga: vuelves justo antes del hueco (no a la
// entrada de la cueva) con una pista para pasarlo, así quien no juega
// seguido no pierde todo lo avanzado.
function perderPorHueco() {
	const hueco = HUECOS_CUEVA.find((h) => Math.abs(heroe.x - h.x) < ANCHO_HUECO);
	heroe.x = (hueco ? hueco.x : heroe.x) - ANCHO_HUECO / 2 - 70;
	heroe.y = 0;
	heroe.velY = 0;
	heroe.dir = 1;
	heroe.golpeado = true;
	heroe.golpeadoT = 0;
	avisos.push({ texto: esTactil ? "¡Ups! Corre y salta" : "¡Ups! Corre (Q) y salta", t: 0 });
}

function perderCueva() {
	ui.opciones.hidden = true;
	ui.opciones.innerHTML = "";
	const esGuardian = dlg.enemigo && dlg.enemigo.x <= LARGO;
	ui.texto.textContent = esGuardian
		? "Te quedaste sin vidas. Vuelves a intentarlo con el Guardián."
		: "Te quedaste sin vidas. Vuelves a la entrada de la cueva.";
	ui.pista.textContent = "Reintentar ▸";
	dlg.sistema = true; // avanzarDialogo() lo revisa primero
}

function reiniciarCueva() {
	const enemigo = dlg.enemigo;
	vidas = vidasMax();
	heroe.y = 0;
	heroe.velY = 0;
	heroe.atacando = false;
	heroe.atacandoT = 0;
	enemigos.forEach((e) => {
		e.atacando = false;
		e.atacandoT = 0;
		e.preguntaActual = 0;
	});
	if (enemigo && enemigo.x <= LARGO) {
		// Perdiste con el Guardián: sigues afuera, antes de la entrada
		heroe.x = Math.max(40, enemigo.x - 90);
		estado = "jugando";
		dentroCueva = false;
	} else {
		// Perdiste con un enemigo de adentro: reinicia solo la Cueva
		enemigos.forEach((e) => {
			if (e.x > LARGO) {
				e.derrotado = false;
				e.cayendo = 0;
			}
		});
		heroe.x = LARGO + 10;
		estado = "cueva";
	}
	dlg.enemigo = null;
	dlg.sistema = false;
	ui.dialogo.hidden = true;
	document.body.classList.remove("con-dialogo");
	if (estado === "jugando") actualizarHud();
	else actualizarHudCueva();
}

function accion() {
	if (estado === "mapa") accionMapa();
	else if (estado === "dialogo") avanzarDialogo();
	else if (estado === "jugando") {
		const npc = npcCercano();
		if (npc) abrirDialogo(npc);
	} else if (estado === "urbano") {
		const m = moduloEnPuerta();
		if (m) entrarOficina(m);
	} else if (estado === "oficina") {
		const companero = companeroCerca();
		if (enTerminal() && !oficinaActual.completo) abrirTerminal(oficinaActual);
		else if (companero) abrirDialogo(companero);
		else if (enSalidaOficina()) salirDeOficina();
	} else if (estado === "terminal" && !ui.terminalSalir.hidden) {
		cerrarTerminal();
	}
}

// La barra espaciadora salta, salvo cuando hay algo que hacer con ella
// (empezar, avanzar un diálogo, hablar con alguien o entrar a un edificio).
function hayAccion() {
	if (estado === "mapa" || estado === "dialogo") return true;
	if (estado === "jugando") return !!npcCercano();
	if (estado === "urbano") return !!moduloEnPuerta();
	if (estado === "oficina") return (enTerminal() && !oficinaActual.completo) || !!companeroCerca() || enSalidaOficina();
	if (estado === "terminal") return !ui.terminalSalir.hidden;
	return false;
}
