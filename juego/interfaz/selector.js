/* Camino a Celaque — selector de personaje y arranque de niveles. Ver juego/LEEME.md. */
"use strict";

// ---------- Selector de personaje ----------
const opciones = [...document.querySelectorAll(".opcion")];

function elegirPersonaje(clave) {
	personaje = clave;
	opciones.forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.personaje === clave)));
}

opciones.forEach((btn) => {
	btn.querySelector("span").textContent = CFG.personajes[btn.dataset.personaje].nombre;
	btn.addEventListener("click", () => {
		elegirPersonaje(btn.dataset.personaje);
		guardarProgreso();
	});
});
elegirPersonaje(personaje);

// Dibuja a cada personaje en su tarjeta; el elegido camina en su lugar.
// Usa la foto (constructor) si ese personaje ya tiene sprites cargados,
// igual que el héroe dentro del juego; si no, cae al dibujo vectorial
// (mismo respaldo que dibujarHeroe).
function dibujarVistasPrevias() {
	const sAnterior = S;
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	for (const btn of opciones) {
		const lienzo = btn.querySelector("canvas");
		const ancho = 150, alto = 180;
		// Ojo: un canvas nuevo mide 300x150; con dpr 2 el ancho ya "coincide"
		if (lienzo.width !== ancho * dpr || lienzo.height !== alto * dpr) {
			lienzo.width = ancho * dpr;
			lienzo.height = alto * dpr;
		}
		ctx = lienzo.getContext("2d");
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, ancho, alto);
		const clave = btn.dataset.personaje;
		const sprites = SPRITES_POR_PERSONAJE[clave];
		// Las fotos quedan más altas que el vector a la misma S (su "alto
		// de contenido" cabeza-a-pie es proporcionalmente mayor), así que
		// con foto se usa una S más chica para que entre completo en la
		// tarjeta (casco y botas incluidos). Siempre quieto -sin caminar-
		// para que no se corte ninguna pose en movimiento.
		S = sprites ? 1.4 : 1.7;
		const o = {
			...aparienciaHeroe(clave, 1, { dir: 1, fase: 0, moviendo: false }),
			agachado: false,
			atacando: false,
		};
		const yaDibujado = sprites && dibujarHeroeSprite(ancho / 2, alto - 10, o, sprites, 1);
		if (!yaDibujado) dibujarPersona(ancho / 2, alto - 10, o);
	}
	ctx = ctxJuego;
	S = sAnterior;
}

// Cada nivel se entra desde el mapa (ver "Mapa: progreso y navegación"):
// el primero (Talento) es el camino y la Cueva; los demás, la oficina de
// su módulo.
function mostrarControlesNivel() {
	ui.hud.hidden = false;
	ui.tactiles.hidden = !esTactil;
}

function reiniciarHeroe() {
	heroe.sobre = null;
	heroe.y = 0;
	heroe.velY = 0;
	heroe.agachado = false;
	heroe.atacando = false;
	heroe.atacandoT = 0;
	heroe.golpeado = false;
	heroe.moviendo = heroe.corriendo = false;
	dentroCueva = false;
	vistaUrbana = false;
	transicion = null;
	oficinaActual = null;
}

// Deja el camino y la Cueva como al principio (también para repetir Talento)
function iniciarTalento() {
	reiniciarHeroe();
	heroe.x = INICIO_X;
	heroe.dir = 1;
	camara = 0;
	npcs.forEach((n) => (n.hablado = false));
	enemigos.forEach((e) => {
		e.derrotado = false;
		e.atacando = false;
		e.atacandoT = 0;
		e.cayendo = 0;
		e.preguntaActual = 0;
	});
	vidas = vidasMax();
	avisos = [];
	cruzoPlanos = false;
	destello = 0;
	petalos = [];
	estado = "jugando";
	mostrarControlesNivel();
	actualizarHud();
}

function iniciarOficina(m) {
	reiniciarHeroe();
	avisos = [];
	petalos = [];
	oficinaActual = m;
	virusOficina.oficina = null; // los virus (Seguridad) empiezan de cero
	// La obra de Proyectos: ya completa o en modo de pruebas, se repite desde el principio
	if (m.oficina.exterior && (m.completo || modoPruebas())) reiniciarObra(m);
	vidas = vidasMax();
	m.visitado = true;
	m.terminalVisitada = m.completo; // ya completo: la computadora no se abre sola
	heroe.x = m.oficina.x0 + 170; // fuera del alcance de la puerta: Espacio salta, no sale
	heroe.dir = 1;
	camara = Math.max(0, heroe.x - W * 0.35);
	estado = "oficina";
	mostrarControlesNivel();
	actualizarHudOficina();
}

// Todos los módulos completos: confeti con los colores de la marca sobre
// el mapa y la tarjeta de bienvenida con el nombre del jugador.
const COLORES_CONFETI = [COLORES.verdeInstitucional, COLORES.beige, COLORES.blanco, COLORES.verdeProfundo, COLORES.fondoVerdeClaro];
function ganar() {
	estado = "victoria";
	ocultarMapaUI();
	for (let i = 0; i < 120; i++) {
		petalos.push({
			x: Math.random(),
			y: -Math.random() * 0.8,
			vel: 0.08 + Math.random() * 0.12,
			giro: Math.random() * 6,
			color: COLORES_CONFETI[i % COLORES_CONFETI.length],
		});
	}
	ui.victoriaNombre.textContent = nombreJugador;
	ui.victoriaNombre.hidden = !nombreJugador;
	ui.victoriaModulos.innerHTML = "";
	modulos.forEach((m, i) => {
		const li = document.createElement("li");
		li.textContent = m.nombre;
		li.style.animationDelay = `${1 + i * 0.15}s`; // van apareciendo uno por uno
		ui.victoriaModulos.appendChild(li);
	});
	ui.victoriaFecha.textContent = fechaLarga(new Date());
	const repaso = $("victoria-repaso");
	repaso.textContent = textoRepaso(leerConstancia());
	repaso.hidden = !repaso.textContent;
	sonar("victoria");
	setTimeout(() => {
		ui.victoria.hidden = false;
		$("btn-constancia").focus();
	}, 700);
}
