/* Camino a Celaque — el taller de prompts de IA: armar un prompt RICO atrapando las piezas que suelta el dron. Ver juego/LEEME.md. */
"use strict";

// ---------- Taller de prompts (mundo.js → taller, IA) ----------
// Antes de los robots del fondo, la oficina tiene un taller. En cada ronda
// (taller.rondas) hay un reto ("necesitas un correo para un cliente") y un
// dron que va soltando piezas de prompt: un Rol, unas Instrucciones, un
// Contexto y un Objetivo (RICO). Se atrapan caminando o saltando hacia
// ellas; también se pueden recoger del piso un momento. Entre las piezas
// caen trampas que parecen piezas (una contraseña, el nombre real de un
// cliente, un prompt corto): atrapar una quita un corazón (en modo fácil,
// no) y dice por qué no va. Con las 4 piezas el prompt se envía al modelo y
// este responde. Sin corazones se repite solo esa ronda, con los corazones
// llenos. Las rondas hechas se guardan mientras dure la partida: salir y
// volver no obliga a repetirlas. Cómo se dibuja: dibujo-taller-ia.js.
const PARTES_PROMPT = [
	{ clave: "rol", letra: "R", nombre: "Rol", color: "#488478" },
	{ clave: "instrucciones", letra: "I", nombre: "Instrucciones", color: "#936739" },
	{ clave: "contexto", letra: "C", nombre: "Contexto", color: "#042523" },
	{ clave: "objetivo", letra: "O", nombre: "Objetivo", color: "#A99886" }, // beige de style.css (ver CRITERIOS.md)
];
const TALLER = {
	desde: -80, // dónde empieza, desde el final de la oficina normal (después del último mueble)
	ancho: 1000, // ancho del taller en px de mundo (en pantallas angostas, lo que quepa: W - 140)
	extra: 1250, // cuánto se alarga la oficina para que quepa el taller (la computadora queda después)
	caida: [58, 68, 78], // velocidad de caída de las piezas en cada ronda (unidades de S por segundo)
	cada: [2.4, 2.1, 1.85], // segundos entre una pieza y la siguiente, por ronda
	trampa: [0.3, 0.38, 0.45], // probabilidad de que la pieza que sale sea una trampa, por ronda
	facil: 0.75, // modo fácil: caen a esta fracción de la velocidad y salen más espaciadas
	maximo: 4, // piezas en el aire a la vez
	enPiso: 2.4, // segundos que una pieza buena queda en el piso (se puede recoger caminando)
	trampaEnPiso: 0.5, // ...y una trampa (se deshace pronto: no estorba el paso)
	desvanece: 0.4, // segundos que tarda en deshacerse una pieza
	inmune: 1.2, // segundos sin otro golpe después de atrapar una trampa
	motivo: 4, // segundos que el tablero dice por qué esa trampa no va en un prompt
	envio: 1.8, // segundos de la animación de enviar el prompt al modelo
	dron: 460, // velocidad del dron (px por segundo)
	altoHeroe: 108, // alto del héroe para atrapar (unidades de S, como heroe.y)
	carta: { medioAncho: 74, alto: 58 }, // medidas de cada pieza (unidades de S)
};
const tallerIA = { oficina: null, paso: "espera", piezas: [], hechas: {}, reloj: 0, inmune: 0, envio: 0, charla: null, dron: { x: 0, meta: 0 }, azar: null, ultimaTrampa: false, trampas: 0, motivo: null }; // trampas: cuántas se atraparon desde que entraste (para las pruebas)

// Lo llama modulos.js al armar cada mundo: el taller va al final de la
// oficina normal (x = donde terminaría), antes de la computadora
function crearTallerIA(d, x) {
	if (!d.taller || !(d.taller.rondas || []).length) return null;
	return { ...d.taller, cx: x + TALLER.desde + TALLER.ancho / 2, hechas: 0 };
}
const extraTallerIA = (d) => (d.taller && (d.taller.rondas || []).length ? TALLER.extra : 0);
const tallerListo = (m) => !m.taller || m.completo || m.taller.hechas >= m.taller.rondas.length;
function reiniciarTallerIA(m) {
	if (m.taller) m.taller.hechas = 0;
}

// Bordes del taller en x del mundo (más angosto si la pantalla es chica)
function bordesTaller(ta) {
	const medio = Math.min(TALLER.ancho, Math.max(360, W - 140)) / 2;
	return { izq: ta.cx - medio, der: ta.cx + medio };
}
const rondaTaller = (m) => m.taller.rondas[Math.min(m.taller.hechas, m.taller.rondas.length - 1)];
const enTallerActivo = () => {
	const p = tallerIA.paso;
	return tallerIA.oficina === oficinaActual && (p === "intro" || p === "atrapar" || p === "enviando" || p === "respuesta");
};

// Texto del HUD mientras el taller no está listo
function textoTaller(m) {
	const n = m.taller.hechas + 1;
	const total = m.taller.rondas.length;
	if (tallerIA.paso === "atrapar" || tallerIA.paso === "enviando") {
		const llevas = PARTES_PROMPT.filter((p) => tallerIA.hechas[p.clave]).length;
		// Sin lugar para el tablero (pantallas bajas, dibujo-taller-ia.js), el HUD dice lo mismo
		if (!tableroTaller.visible) {
			if (tallerIA.motivo) return `✕ ${tallerIA.motivo.texto}`;
			return `Prompt ${n} de ${total}  ·  ${PARTES_PROMPT.map((p) => p.letra + (tallerIA.hechas[p.clave] ? "✓" : "")).join(" ")}`;
		}
		return `Prompt ${n} de ${total}  ·  Piezas: ${llevas} / ${PARTES_PROMPT.length}`; // el reto va en el tablero
	}
	return `Entra al taller de prompts (${m.taller.hechas} / ${total} listos)`;
}

// Una "persona" para la caja de diálogo: quien presenta el reto (el
// anfitrión) o el modelo de IA que responde
function charlaTaller(m, nombre, dialogo, delModelo) {
	const a = m.anfitrionNpc;
	return {
		nombre: delModelo || !a ? nombre : a.nombre,
		inicial: delModelo ? "IA" : undefined,
		importante: !delModelo && !!a,
		enOficina: true,
		hablado: false,
		x: heroe.x + 1,
		dialogo,
		apariencia: delModelo || !a ? { chaleco: COLORES.verdeProfundo } : a.apariencia,
	};
}

function empezarRonda(m) {
	const t = tallerIA;
	const r = rondaTaller(m);
	t.piezas = [];
	t.hechas = {};
	t.motivo = null;
	t.inmune = 0;
	t.envio = 0;
	t.ultimaTrampa = false;
	t.reloj = 0.8;
	t.azar = crearAzar(7 + m.taller.hechas * 31);
	const { izq } = bordesTaller(m.taller);
	t.dron.x = t.dron.meta = izq + 120;
	t.paso = "intro";
	t.charla = charlaTaller(m, "", r.intro && r.intro.length ? r.intro : [r.reto], false);
	abrirDialogo(t.charla);
}

function actualizarTallerIA(dt) {
	const m = oficinaActual;
	const t = tallerIA;
	if (t.oficina !== m) {
		// Al entrar a una oficina (o salir de ella) el taller espera, sin piezas
		Object.assign(t, { oficina: m, paso: "espera", piezas: [], hechas: {}, charla: null, trampas: 0, motivo: null });
	}
	if (!m || !m.taller || estado !== "oficina") return; // con un diálogo abierto, todo espera
	const ta = m.taller;
	if (tallerListo(m)) {
		t.paso = "listo";
		return;
	}
	const { izq, der } = bordesTaller(ta);
	// La pared de luz del modelo no deja pasar hasta terminar el taller
	heroe.x = Math.min(heroe.x, der - 20);
	if (t.paso === "espera") {
		if (heroe.x >= izq + 60 && heroeEnSuelo()) empezarRonda(m);
		return;
	}
	if (t.paso === "intro") {
		if (t.charla.hablado) {
			t.paso = "atrapar";
			avisos.push({ texto: "¡Atrapa R, I, C y O!", t: 0 });
			actualizarHudOficina();
		}
		return;
	}
	heroe.x = Math.max(heroe.x, izq + 20); // en plena ronda no se sale del taller
	if (t.paso === "respuesta") {
		if (!t.charla.hablado) return;
		ta.hechas++;
		if (tallerListo(m)) {
			t.paso = "listo";
			sonar("nivel");
			lanzarChispas(heroe.x, heroe.y + 70, 18, ["#7fd6c8", COLORES.beige, COLORES.blanco]);
			avisos.push({ texto: "¡Taller listo! Al fondo te esperan los robots", t: 0 });
		} else empezarRonda(m);
		actualizarHudOficina();
		return;
	}
	moverDronTaller(t, dt);
	moverPiezasTaller(m, t, dt);
	if (t.paso === "enviando") {
		t.envio += dt;
		if (t.envio >= TALLER.envio) {
			const r = rondaTaller(m);
			t.paso = "respuesta";
			t.piezas = [];
			t.charla = charlaTaller(m, "Modelo de IA", r.respuesta && r.respuesta.length ? r.respuesta : ["¡Listo!"], true);
			abrirDialogo(t.charla);
		}
		return;
	}
	// Soltar piezas: casi siempre una que falta; a veces, una trampa
	t.inmune = Math.max(0, t.inmune - dt);
	if (t.motivo && (t.motivo.t -= dt) <= 0) {
		t.motivo = null;
		actualizarHudOficina();
	}
	t.reloj -= dt;
	const enAire = t.piezas.filter((p) => !p.fin);
	if (t.reloj <= 0 && enAire.length < TALLER.maximo) {
		const k = Math.min(ta.hechas, TALLER.cada.length - 1);
		t.reloj = TALLER.cada[k] / (modoFacil() ? TALLER.facil : 1);
		soltarPiezaTaller(m, t, k, izq, der);
	}
}

function moverDronTaller(t, dt) {
	const d = t.dron;
	d.x += clamp(d.meta - d.x, -TALLER.dron * dt, TALLER.dron * dt);
}

function soltarPiezaTaller(m, t, k, izq, der) {
	const r = rondaTaller(m);
	const faltan = PARTES_PROMPT.filter((p) => !t.hechas[p.clave]);
	const trampas = r.trampas || [];
	// Nunca dos trampas seguidas
	const trampa = trampas.length && !t.ultimaTrampa && t.azar() < TALLER.trampa[k];
	t.ultimaTrampa = !!trampa;
	let pieza;
	if (trampa) {
		const tr = trampas[Math.floor(t.azar() * trampas.length)];
		const parte = PARTES_PROMPT.find((p) => p.clave === tr.parte) || PARTES_PROMPT[0];
		pieza = { parte, texto: tr.texto, por: tr.por || "", trampa: true };
	} else {
		// La que falta y no está cayendo ya; si todas caen, cualquiera que falte
		const cayendo = new Set(t.piezas.filter((p) => !p.fin && !p.trampa).map((p) => p.parte.clave));
		const libres = faltan.filter((p) => !cayendo.has(p.clave));
		const lista = libres.length ? libres : faltan;
		const parte = lista[Math.floor(t.azar() * lista.length)];
		pieza = { parte, texto: (r.piezas || {})[parte.clave] || parte.nombre, trampa: false };
	}
	const vel = TALLER.caida[k] * (modoFacil() ? TALLER.facil : 1);
	t.piezas.push({ ...pieza, x: t.dron.x, y: alturaSalidaTaller(), vel, piso: 0, fin: 0, renglones: null, escala: 0 });
	// El dron va a otro lugar para la siguiente (lejos de donde soltó esta)
	const margen = (TALLER.carta.medioAncho + 10) * S;
	let meta = izq + margen + t.azar() * (der - izq - 2 * margen);
	if (Math.abs(meta - t.dron.x) < 180) meta = clamp(t.dron.x + (meta < t.dron.x ? -260 : 260), izq + margen, der - margen);
	t.dron.meta = meta;
}

function moverPiezasTaller(m, t, dt) {
	const c = TALLER.carta;
	for (const p of t.piezas) {
		if (p.fin > 0) {
			p.fin += dt;
			continue;
		}
		if (p.y > 0) p.y = Math.max(0, p.y - p.vel * dt);
		else {
			p.piso += dt;
			if (p.piso >= (p.trampa ? TALLER.trampaEnPiso : TALLER.enPiso)) p.fin = 0.001;
		}
		// Ya se atrapó otra de su tipo: esta se deshace
		if (!p.trampa && t.hechas[p.parte.clave]) {
			p.fin = 0.001;
			continue;
		}
		if (t.paso !== "atrapar") continue;
		// ¿La toca el héroe? Las buenas se atrapan con margen; las trampas, solo de lleno
		const ancho = (p.trampa ? c.medioAncho - 30 : c.medioAncho - 6) + 14;
		const toca = Math.abs(p.x - heroe.x) < ancho * S && p.y < heroe.y + TALLER.altoHeroe && p.y + c.alto > heroe.y;
		if (!toca) continue;
		if (p.trampa) {
			if (t.inmune > 0) continue;
			atraparTrampa(m, t, p);
			if (t.paso !== "atrapar") return;
		} else atraparPieza(m, t, p);
	}
	t.piezas = t.piezas.filter((p) => p.fin < TALLER.desvanece);
}

function atraparPieza(m, t, p) {
	p.fin = 0.001;
	p.atrapada = true;
	t.hechas[p.parte.clave] = p.texto;
	sonar("pieza");
	lanzarChispas(p.x, p.y + TALLER.carta.alto / 2, 10, ["#7fd6c8", p.parte.color, COLORES.blanco]);
	avisos.push({ texto: `${p.parte.nombre} ✓`, t: 0 });
	if (PARTES_PROMPT.every((q) => t.hechas[q.clave])) {
		// Prompt completo: se envía al modelo
		t.paso = "enviando";
		t.envio = 0;
		sonar("entregar");
	}
	actualizarHudOficina();
}

// Atrapaste una trampa: dice por qué no va y quita un corazón (en modo
// fácil, no). Sin corazones, se repite solo esta ronda.
function atraparTrampa(m, t, p) {
	p.fin = 0.001;
	t.inmune = TALLER.inmune;
	t.trampas++;
	t.motivo = { texto: p.por || "Eso no va en un prompt", t: TALLER.motivo }; // se lee en el tablero (o en el HUD)
	actualizarHudOficina();
	avisos.push({ texto: "✕ ¡Trampa!", t: 0 });
	if (modoFacil()) {
		sonar("error");
		return;
	}
	heroe.golpeado = true;
	heroe.golpeadoT = 0;
	sonar("golpe");
	if (!perderCorazon()) return;
	t.hechas = {};
	t.piezas = [];
	t.reloj = 1.2;
	t.motivo = { texto: "Sin corazones: arma este prompt de nuevo", t: TALLER.motivo };
	avisos.push({ texto: "¡De nuevo!", t: 0 });
	actualizarHudOficina();
}

// La cámara se queda quieta, centrada en el taller, mientras dura una ronda
function camaraTallerIA(objetivo) {
	const m = oficinaActual;
	if (!m || !m.taller || !enTallerActivo()) return objetivo;
	return m.taller.cx - W / 2;
}
