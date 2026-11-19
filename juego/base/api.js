/* Camino a Celaque — conecta con el backend (Backend_Camino_a_Celaque). El juego
   necesita esta conexión para jugar y guardar datos: sin servidor, se bloquea con
   el diálogo "Sin conexión" (ver #sin-conexion en index.html) hasta que vuelva.
   La única excepción es el nombre de pruebas (modoPruebas, en mapa.js), que no
   depende del servidor. Ver juego/LEEME.md y Backend_Camino_a_Celaque/README.md. */
"use strict";

// Cambiar esta URL al desplegar el backend en otro lado (y el connect-src del
// Content-Security-Policy en index.html, que debe permitir esta misma dirección).
// Con ruta, sin barra al final aquí y CON barra en el connect-src:
//   API_BASE = "https://desarrollo.apps-celaque.net/celaque-api"
//   connect-src https://desarrollo.apps-celaque.net/celaque-api/
// (node tools/revisar_proyecto.mjs avisa si no coinciden).
const API_BASE = "http://127.0.0.1:8000";

const CLAVE_JUGADOR_API = "camino-a-celaque:jugador-api";
const CLAVE_COLA_INTENTOS = "camino-a-celaque:cola-intentos";
const ESPERA_API_MS = 8000; // si el servidor no contesta en este tiempo, cuenta como "sin conexión"

// Una página https no puede hablar con una API http (el navegador lo bloquea
// como contenido mixto y el juego quedaría para siempre en "Sin conexión").
if (location.protocol === "https:" && API_BASE.startsWith("http:")) {
	console.error(`API_BASE (${API_BASE}) es http y el juego se sirve por https: el navegador va a bloquear cada pedido.`);
}

let jugadorAPI = null; // { id, correo, token, api }, una vez que el servidor lo confirma
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

// "Empezar de cero": que la siguiente persona no quede con la llave ni el
// correo de la anterior en este navegador (sus intentos pendientes sí se
// envían a su nombre, porque cada uno guarda su dueño).
function olvidarJugadorAPI() {
	jugadorAPI = null;
	try {
		localStorage.removeItem(CLAVE_JUGADOR_API);
	} catch (e) {
		/* sin almacenamiento */
	}
}

const correoNormal = (c) => String(c || "").trim().toLowerCase();

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
	// El nombre de pruebas juega sin servidor: no se le bloquea el juego.
	if (!modoPruebas()) mostrarSinConexion();
}

// El servidor no aceptó el correo (mal escrito, o de un dominio no permitido:
// CORREO_DOMINIOS en el backend). Se vuelve a mostrar el campo para corregirlo.
function avisarCorreoRechazado() {
	sesionBloqueada = false;
	actualizarPanelMapa();
	ui.correoEtiqueta.classList.remove("falta");
	void ui.correoEtiqueta.offsetWidth; // reinicia la sacudida
	ui.correoEtiqueta.classList.add("falta");
	ui.correoJugador.focus();
	avisoMapa("El servidor no aceptó ese correo: usa tu correo de Celaque");
}

// fetch con seguimiento de conexión: una respuesta (aunque sea 4xx, como un
// correo mal escrito) cuenta como "conectado"; solo la falta de red, un
// servidor que no contesta en ESPERA_API_MS o un error del propio servidor
// (5xx) cuentan como "sin conexión".
async function llamarAPI(url, opciones = {}, marcarSiResponde = true) {
	let resp;
	const corte = new AbortController();
	const reloj = setTimeout(() => corte.abort(), ESPERA_API_MS);
	try {
		resp = await fetch(url, { ...opciones, signal: corte.signal });
	} catch (e) {
		marcarDesconectado();
		return null;
	} finally {
		clearTimeout(reloj);
	}
	if (resp.status >= 500) marcarDesconectado();
	else if (marcarSiResponde) marcarConectado();
	return resp;
}

// Pregunta al servidor si está disponible. Se llama al cargar la página, cada
// pocos segundos mientras tanto, y al tocar "Reintentar".
async function verificarSalud() {
	// No marca "conectado" hasta saber que también responde la base (si no, el
	// diálogo se cierra y se vuelve a abrir: parpadea).
	const resp = await llamarAPI(`${API_BASE}/salud`, {}, false);
	const datos = resp && resp.ok ? await resp.json().catch(() => null) : null;
	if (!datos || datos.bd !== "ok") {
		marcarDesconectado();
		return false;
	}
	marcarConectado();
	return true;
}

// Crea (o recupera) al jugador en el servidor a partir de su correo. Devuelve
// true si quedó listo para jugar (o si es el nombre de pruebas, que no
// depende del servidor).
// El guardado vale solo si es de este correo, de este servidor y trae su llave.
const jugadorVigente = (j, correo) =>
	!!j && j.correo === correo && j.api === API_BASE && Number.isInteger(j.id) && typeof j.token === "string";

async function crearJugadorAPI() {
	if (modoPruebas()) return true;
	const correo = correoNormal(correoJugador);
	if (!correo) return false;
	const guardado = leerJugadorAPI();
	if (jugadorVigente(guardado, correo)) {
		jugadorAPI = guardado;
		marcarConectado();
		return true;
	}
	const resp = await llamarAPI(`${API_BASE}/jugadores`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ correo, nombre: nombreJugador || "Sin nombre" }),
	});
	if (resp && resp.status === 422) avisarCorreoRechazado();
	if (!resp || !resp.ok) return false; // sin conexión, o correo rechazado por el servidor
	const j = await resp.json().catch(() => null);
	if (!j || !Number.isInteger(j.id) || typeof j.token !== "string") return false;
	guardarJugadorAPI({ id: j.id, correo, token: j.token, api: API_BASE });
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

// npcs: la gente del camino de Talento (juego/camino/npcs-y-andamios.js).
// modulos: los otros 6 mundos (juego/oficina/modulos.js). Cada uno tiene su
// anfitrión/compañeros en oficina.companeros, y el de la Cafetería además su
// dj en djNpc. Corre al terminar de cargar la página (ver el final del archivo).
function sincronizarPersonajes() {
	npcs.forEach(sincronizarPersonaje);
	for (const m of modulos) {
		m.oficina.companeros.forEach(sincronizarPersonaje);
		if (m.djNpc) sincronizarPersonaje(m.djNpc);
	}
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
// (modulos[].preguntas). Corre al terminar de cargar la página.
function sincronizarPreguntas() {
	enemigos.forEach((en) => en.preguntas.forEach(sincronizarPregunta));
	for (const m of modulos) {
		(m.preguntas || []).forEach(sincronizarPregunta);
		if (m.oficina.enemigos) m.oficina.enemigos.forEach((en) => en.preguntas.forEach(sincronizarPregunta));
		if (m.mision && m.mision.etapas) m.mision.etapas.forEach((e) => (e.preguntas || []).forEach(sincronizarPregunta));
	}
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

// Respuestas que vale la pena reintentar más tarde: sin red, el servidor no
// contestó a tiempo (408), pidió calma (429) o falló él mismo (5xx). Las demás
// (403, 404, 413, 422...) no se arreglan reintentando: se descartan.
const reintentable = (resp) => !resp || resp.status === 408 || resp.status === 429 || resp.status >= 500;

// Intenta enviar un intento ya resuelto contra el catálogo; si algo falla (sin
// conexión, catálogo todavía no cargado, pregunta no encontrada), lo encola.
// Cada intento lleva su dueño (correo y, si ya lo tenía, su jugador con la
// llave): así nunca se envía a nombre de otra persona que use el mismo navegador.
async function enviarUnIntento(intento, reintento = false) {
	const correoActual = correoNormal(correoJugador);
	if (!intento.correo) intento.correo = correoActual; // intentos encolados antes de este cambio
	let dueno = intento.jugador;
	if (!dueno && jugadorAPI && intento.correo === jugadorAPI.correo) dueno = jugadorAPI;
	if (!dueno && intento.correo !== correoActual) return; // de otra persona y sin su llave: no se puede atribuir
	if (dueno && dueno.api !== API_BASE) return; // de otro servidor
	const catalogo = await cargarCatalogoAPI();
	if (!dueno || !catalogo) {
		encolarIntento(intento); // todavía sin jugador o sin catálogo: se envía al reconectar
		return;
	}
	const p = catalogo.get(`${intento.mundo}|${intento.enunciado}`);
	const seleccion = p ? intento.indices.map((i) => (p.respuestas.find((r) => r.orden === i + 1) || {}).id).filter(Boolean) : [];
	if (!p || seleccion.length !== intento.indices.length) {
		// La pregunta no está en la base (no tiene id en mundos/*.js) o sus opciones no
		// coinciden: reintentar no lo arregla y solo llenaría la cola. Ver mundos/LEEME.md.
		console.warn("Respuesta sin pareja en la base, no se guarda:", intento.enunciado);
		return;
	}
	const resp = await llamarAPI(`${API_BASE}/intentos`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${dueno.token}` },
		body: JSON.stringify({ jugador_id: dueno.id, pregunta_id: p.id, seleccion, origen: intento.origen }),
	});
	if (resp && resp.ok) return;
	const esDelActual = intento.correo === correoActual;
	if (resp && resp.status === 401 && !reintento && esDelActual) {
		// La llave ya no vale (el servidor cambió su SECRET_KEY): se pide otra y se reenvía una vez.
		olvidarJugadorAPI();
		if (await crearJugadorAPI()) return enviarUnIntento({ ...intento, jugador: null }, true);
	}
	// Lo del jugador actual se reencola sin llave (toma la vigente al reenviarse);
	// lo de otra persona conserva la suya.
	if (reintentable(resp) || resp.status === 401) encolarIntento({ ...intento, jugador: esDelActual ? null : dueno });
	else console.warn(`Intento descartado (${resp.status}):`, intento.enunciado);
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
	const correo = correoNormal(correoJugador);
	const jugador = jugadorAPI && jugadorAPI.correo === correo ? jugadorAPI : null;
	enviarUnIntento({ mundo, enunciado, indices, origen, correo, jugador });
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

// Todo lo que habla con el servidor arranca cuando ya cargaron todos los
// scripts (DOMContentLoaded): así ninguna respuesta llega antes de que existan
// mapa.js (modoPruebas) y el progreso guardado. Después la salud se revisa
// cada 15 s, para notar si el servidor se cae a mitad de partida (el diálogo
// "Sin conexión" bloquea todo).
document.addEventListener("DOMContentLoaded", () => {
	sincronizarPersonajes();
	sincronizarPreguntas();
	verificarSalud();
	setInterval(verificarSalud, 15000);
});
