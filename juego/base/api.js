/* Camino a Celaque — conecta con el backend (Backend_Camino_a_Celaque). El juego
   necesita esta conexión para jugar y guardar datos: sin servidor, se bloquea con
   el diálogo "Sin conexión" (ver #sin-conexion en index.html) hasta que vuelva.
   La única excepción es el nombre de pruebas (modoPruebas, en mapa.js), que no
   depende del servidor. Ver juego/LEEME.md y Backend_Camino_a_Celaque/README.md. */
"use strict";

// Cambiar esta URL al desplegar el backend en otro lado (y el connect-src del
// Content-Security-Policy en index.html, que debe permitir esta misma dirección).
const API_BASE = "http://127.0.0.1:8000";

const CLAVE_JUGADOR_API = "camino-a-celaque:jugador-api";
const CLAVE_COLA_INTENTOS = "camino-a-celaque:cola-intentos";

let jugadorAPI = null; // { id, correo }, una vez que el servidor lo confirma
let catalogoAPI = null; // Map "Mundo|enunciado" -> { id, respuestas: [{id, orden}, ...] }
let catalogoPersonajes = new Map(); // Map id (tbl_personaje) -> { id, nombre, dialogos: [texto, ...] }
let catalogoPreguntas = new Map(); // Map id (tbl_pregunta) -> { id, enunciado, explicacion, respuestas: [{orden, texto, es_correcta, posicion_correcta}, ...] }
let catalogoCargando = null;
let conexionAPI = true; // se corrige con la primera verificarSalud()
let mundoPendiente = -1; // mundo que se quiso abrir sin conexión, para retomarlo al reconectar

function leerJugadorAPI() {
	try {
		return JSON.parse(localStorage.getItem(CLAVE_JUGADOR_API) || "null");
	} catch (e) {
		return null;
	}
}

function guardarJugadorAPI(j) {
	jugadorAPI = j;
	try {
		localStorage.setItem(CLAVE_JUGADOR_API, JSON.stringify(j));
	} catch (e) {
		/* sin almacenamiento */
	}
}

// ---------- Diálogo "Sin conexión" ----------
function mostrarSinConexion() {
	if (!ui.sinConexion.hidden) return;
	ui.sinConexion.hidden = false;
	ui.sinConexionReintentar.focus();
}

function ocultarSinConexion() {
	if (ui.sinConexion.hidden) return;
	ui.sinConexion.hidden = true;
}

function marcarConectado() {
	conexionAPI = true;
	ocultarSinConexion();
	vaciarColaIntentos();
}

function marcarDesconectado() {
	conexionAPI = false;
	mostrarSinConexion();
}

// fetch con seguimiento de conexión: una respuesta (aunque sea 4xx, como un
// correo mal escrito) cuenta como "conectado"; solo la falta de red o un error
// del propio servidor (5xx) cuentan como "sin conexión".
async function llamarAPI(url, opciones) {
	let resp;
	try {
		resp = await fetch(url, opciones);
	} catch (e) {
		marcarDesconectado();
		return null;
	}
	if (resp.status >= 500) marcarDesconectado();
	else marcarConectado();
	return resp;
}

// Pregunta al servidor si está disponible. Se llama al cargar la página, cada
// pocos segundos mientras tanto, y al tocar "Reintentar".
async function verificarSalud() {
	const resp = await llamarAPI(`${API_BASE}/salud`);
	if (!resp || !resp.ok) return false;
	const datos = await resp.json().catch(() => null);
	if (!datos || datos.bd !== "ok") {
		marcarDesconectado();
		return false;
	}
	return true;
}

// Crea (o recupera) al jugador en el servidor a partir de su correo. Devuelve
// true si quedó listo para jugar (o si es el nombre de pruebas, que no
// depende del servidor).
async function crearJugadorAPI() {
	if (modoPruebas()) return true;
	if (!correoJugador) return false;
	const guardado = leerJugadorAPI();
	if (guardado && guardado.correo === correoJugador) {
		jugadorAPI = guardado;
		marcarConectado();
		return true;
	}
	const resp = await llamarAPI(`${API_BASE}/jugadores`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ correo: correoJugador, nombre: nombreJugador || "Sin nombre" }),
	});
	if (!resp || !resp.ok) return false; // sin conexión, o correo rechazado por el servidor
	guardarJugadorAPI(await resp.json());
	return true;
}

// Trae una sola vez el catálogo (ids de preguntas/respuestas) y arma un mapa
// por "Mundo|enunciado", para traducir lo que el jugador contestó a sus ids.
function cargarCatalogoAPI() {
	if (catalogoAPI) return Promise.resolve(catalogoAPI);
	if (catalogoCargando) return catalogoCargando;
	catalogoCargando = llamarAPI(`${API_BASE}/catalogo`)
		.then((resp) => (resp && resp.ok ? resp.json() : null))
		.then((mundos) => {
			if (!mundos) return null;
			const mapa = new Map();
			for (const m of mundos) {
				for (const p of m.preguntas) {
					mapa.set(`${m.nombre}|${p.enunciado}`, p);
					catalogoPreguntas.set(p.id, p);
				}
				for (const per of m.personajes || []) catalogoPersonajes.set(per.id, per);
			}
			catalogoAPI = mapa;
			return mapa;
		})
		.catch(() => null)
		.finally(() => {
			catalogoCargando = null;
		});
	return catalogoCargando;
}

// Reemplaza nombre y diálogo de un NPC ya creado (visual/posición se quedan
// como están en el archivo del mundo) con lo que diga tbl_personaje/tbl_dialogo,
// por su id. Si no hay conexión o ese id no está en la base, el NPC se queda
// con el texto fijo que ya tenía (no rompe nada).
function sincronizarPersonaje(npc) {
	if (npc.id == null) return;
	cargarCatalogoAPI().then(() => {
		const p = catalogoPersonajes.get(npc.id);
		if (!p) return;
		npc.nombre = p.nombre;
		if (p.dialogos && p.dialogos.length) npc.dialogo = p.dialogos;
	});
}

// npcs: la gente del camino de Talento (juego/camino/npcs-y-andamios.js, que
// carga antes que este archivo).
npcs.forEach(sincronizarPersonaje);

// modulos: los otros 6 mundos (juego/oficina/modulos.js, que también carga
// antes que este archivo). Cada uno tiene su anfitrión/compañeros en
// oficina.companeros, y el de la Cafetería además su dj en djNpc.
for (const m of modulos) {
	m.oficina.companeros.forEach(sincronizarPersonaje);
	if (m.djNpc) sincronizarPersonaje(m.djNpc);
}

// Reemplaza el enunciado, la explicación, el texto de las opciones (o el
// texto y el orden correcto, en las de ordenar) y cuál es la correcta de
// una pregunta ya creada, con lo que diga tbl_pregunta/tbl_respuesta, por su
// id (no por el texto: así sigue encontrándola aunque el enunciado cambie
// en la base). Si no hay conexión o ese id no está en la base, la pregunta
// se queda con el texto fijo que ya tenía.
function sincronizarPregunta(p) {
	if (!p || p.id == null || (!p.opciones && !p.orden)) return;
	cargarCatalogoAPI().then(() => {
		const c = catalogoPreguntas.get(p.id);
		if (!c || !c.respuestas || !c.respuestas.length) return;
		p.pregunta = c.enunciado;
		if (c.explicacion) p.explicacion = c.explicacion;
		const ordenadas = [...c.respuestas].sort((a, b) => a.orden - b.orden);
		if (p.orden) {
			const nuevo = new Array(ordenadas.length);
			const completo = ordenadas.every((r) => {
				if (!r.posicion_correcta || r.posicion_correcta < 1 || r.posicion_correcta > ordenadas.length) return false;
				nuevo[r.posicion_correcta - 1] = r.texto;
				return true;
			});
			if (completo && nuevo.every(Boolean)) p.orden = nuevo;
		} else {
			p.opciones = ordenadas.map((r) => r.texto);
			const correcta = ordenadas.findIndex((r) => r.es_correcta);
			if (correcta >= 0) p.correcta = correcta;
		}
	});
}

// Preguntas de los 7 mundos: la Cueva de Talento (enemigos), las de ordenar
// y las del jefe de cada obra (modulos[].oficina.enemigos), las de la torre
// de nubes de Plataformas (modulos[].mision.etapas) y las de computadora
// (modulos[].preguntas).
enemigos.forEach((en) => en.preguntas.forEach(sincronizarPregunta));
for (const m of modulos) {
	(m.preguntas || []).forEach(sincronizarPregunta);
	if (m.oficina.enemigos) m.oficina.enemigos.forEach((en) => en.preguntas.forEach(sincronizarPregunta));
	if (m.mision && m.mision.etapas) m.mision.etapas.forEach((e) => (e.preguntas || []).forEach(sincronizarPregunta));
}

function leerColaIntentos() {
	try {
		return JSON.parse(localStorage.getItem(CLAVE_COLA_INTENTOS) || "[]");
	} catch (e) {
		return [];
	}
}

function guardarColaIntentos(cola) {
	try {
		localStorage.setItem(CLAVE_COLA_INTENTOS, JSON.stringify(cola.slice(-200))); // no crece sin límite
	} catch (e) {
		/* sin almacenamiento */
	}
}

function encolarIntento(intento) {
	const cola = leerColaIntentos();
	cola.push(intento);
	guardarColaIntentos(cola);
}

// Intenta enviar un intento ya resuelto contra el catálogo; si algo falla (sin
// conexión, catálogo todavía no cargado, pregunta no encontrada), lo encola.
async function enviarUnIntento(intento) {
	const catalogo = await cargarCatalogoAPI();
	const p = catalogo && catalogo.get(`${intento.mundo}|${intento.enunciado}`);
	if (!jugadorAPI || !p) {
		encolarIntento(intento);
		return;
	}
	const seleccion = intento.indices.map((i) => (p.respuestas.find((r) => r.orden === i + 1) || {}).id).filter(Boolean);
	if (seleccion.length !== intento.indices.length) {
		encolarIntento(intento); // el catálogo no coincidió con lo jugado: mejor no perderlo
		return;
	}
	const resp = await llamarAPI(`${API_BASE}/intentos`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ jugador_id: jugadorAPI.id, pregunta_id: p.id, seleccion, origen: intento.origen }),
	});
	if (!resp || !resp.ok) encolarIntento(intento);
}

let vaciandoCola = false;
async function vaciarColaIntentos() {
	if (vaciandoCola || !jugadorAPI) return;
	vaciandoCola = true;
	try {
		const cola = leerColaIntentos();
		if (!cola.length) return;
		guardarColaIntentos([]); // se vacía ya: lo que vuelva a fallar se vuelve a encolar
		for (const intento of cola) await enviarUnIntento(intento);
	} finally {
		vaciandoCola = false;
	}
}

// Punto de entrada único, llamado junto a cada anotarPregunta() de una respuesta
// YA contestada (no cuando la pregunta solo se muestra). indices: la posición
// (o posiciones, en las de ordenar) elegida, en base 0, en el mismo orden que
// trae mundo.js (p.opciones o p.orden).
function enviarIntentoJuego(mundo, enunciado, indices, origen = "mundo") {
	if (modoPruebas() || !correoJugador) return;
	enviarUnIntento({ mundo, enunciado, indices, origen });
}

// Si el backend vuelve a responder (y, si hacía falta, el jugador quedó
// registrado), retoma el mundo que se había quedado esperando conexión.
async function reintentarConexion() {
	const conectado = await verificarSalud();
	if (!conectado) return;
	if (correoJugador && !jugadorAPI) {
		const listo = await crearJugadorAPI();
		if (!listo) return;
	}
	if (mundoPendiente >= 0) {
		const i = mundoPendiente;
		mundoPendiente = -1;
		elegirMundo(i);
	}
}

// Validación mínima: no manda nada hasta que el correo tenga forma de correo.
const pareceCorreo = (c) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c);

// Se revisa al cargar la página y cada 15s mientras se juega, para notar si el
// servidor se cae a mitad de partida (el diálogo "Sin conexión" bloquea todo).
verificarSalud();
setInterval(verificarSalud, 15000);
