/* Camino a Celaque — lógica del juego.
   100% código propio: sin librerías, sin imágenes ni fuentes externas.
   Todo se dibuja con <canvas>. Para editar textos y NPCs usa config.js. */
(function () {
	"use strict";

	const CFG = window.CONFIG_JUEGO;
	const LARGO = CFG.largoDelCamino;
	const INICIO_X = 80;

	// ---------- Utilidades ----------
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const suave = (e0, e1, x) => {
		const t = clamp((x - e0) / (e1 - e0), 0, 1);
		return t * t * (3 - 2 * t);
	};
	const modulo = (a, n) => ((a % n) + n) % n;

	const cacheRgb = {};
	function hexARgb(hex) {
		if (!cacheRgb[hex]) {
			const n = parseInt(hex.slice(1), 16);
			cacheRgb[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
		}
		return cacheRgb[hex];
	}

	function mezclar(a, b, t, alfa) {
		const A = hexARgb(a);
		const B = hexARgb(b);
		const r = Math.round(lerp(A[0], B[0], t));
		const g = Math.round(lerp(A[1], B[1], t));
		const bl = Math.round(lerp(A[2], B[2], t));
		return alfa === undefined ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alfa})`;
	}

	// Generador aleatorio con semilla: el paisaje sale igual en cada partida
	function crearAzar(semilla) {
		return function () {
			semilla = (semilla + 0x6d2b79f5) | 0;
			let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	// ---------- Paleta: [gris al inicio, color al llegar a Celaque] ----------
	const PALETA = {
		cieloArriba: ["#5b5f66", "#3db4f2"],
		cieloAbajo: ["#8a8e94", "#dff9d0"],
		montanaLejana: ["#6c7076", "#7cc6a4"],
		celaque: ["#63676d", "#2f9e62"],
		colinas: ["#5e6267", "#58c86e"],
		tierra: ["#56585b", "#8a6a42"],
		pasto: ["#6a6d70", "#5fdc4c"],
		tronco: ["#4f5053", "#7b5231"],
		hojas: ["#6c6f73", "#2fb64e"],
		hojasLuz: ["#7c7f83", "#8ff06b"],
		nube: ["#9a9ca0", "#ffffff"],
		heroeMochila: ["#66686b", "#2e9e5b"],
	};
	const color = (clave, t, alfa) => mezclar(PALETA[clave][0], PALETA[clave][1], t, alfa);
	// Qué tan "coloreado" está un punto del camino (0 = gris, 1 = colorido)
	const tono = (p) => suave(0.02, 0.92, p);

	const COLORES_FLOR = ["#ff6f91", "#ffd23f", "#ffffff", "#c77dff", "#ff9f1c"];
	const COLORES_MARIPOSA = ["#ffd54f", "#ff8a80", "#b388ff", "#80d8ff"];

	// ---------- Canvas ----------
	const canvas = document.getElementById("juego");
	const ctxJuego = canvas.getContext("2d");
	let ctx = ctxJuego; // se cambia temporalmente al dibujar las vistas previas del selector
	let W = 0, H = 0, S = 1, SUELO = 0;

	function redimensionar() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = window.innerWidth;
		H = window.innerHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		S = clamp(H / 720, 0.7, 1.4);
		SUELO = Math.round(H * 0.72);
	}
	window.addEventListener("resize", redimensionar);
	redimensionar();

	// ---------- Mundo ----------
	const npcs = window.NPCS
		.map((d) => ({ ...d, x: d.posicion * LARGO, hablado: false }))
		.sort((a, b) => a.x - b.x);

	const azar = crearAzar(20260925);

	const arboles = [];
	for (let x = 220; x < LARGO - 250; x += 170 + azar() * 200) {
		if (npcs.some((n) => Math.abs(n.x - x) < 90)) continue;
		arboles.push({ x, tam: 0.75 + azar() * 0.5 });
	}

	const arbolesLejanos = [];
	for (let x = 100; x < LARGO * 0.75; x += 120 + azar() * 160) {
		arbolesLejanos.push({ x, tam: 0.45 + azar() * 0.2 });
	}

	const matas = [];
	for (let x = 0; x < LARGO + 1500; x += 18 + azar() * 14) {
		matas.push({
			x,
			alto: azar(),
			flor: azar(),
			colorFlor: COLORES_FLOR[Math.floor(azar() * COLORES_FLOR.length)],
			delante: azar() < 0.35,
		});
	}

	const nubes = [];
	for (let i = 0; i < 8; i++) {
		nubes.push({ x: azar() * 3000, y: 0.06 + azar() * 0.22, tam: 0.7 + azar() * 0.7, vel: 6 + azar() * 10 });
	}

	const mariposas = [];
	for (let i = 0; i < 14; i++) {
		mariposas.push({
			x: LARGO * (0.55 + azar() * 0.45),
			fase: azar() * 10,
			color: COLORES_MARIPOSA[i % COLORES_MARIPOSA.length],
		});
	}

	const gotas = [];
	for (let i = 0; i < 140; i++) {
		gotas.push({ x: azar(), y: azar(), vel: 0.9 + azar() * 0.5 });
	}

	let petalos = [];

	// ---------- Estado ----------
	let estado = "inicio"; // inicio | jugando | dialogo | victoria
	const heroe = { x: INICIO_X, dir: 1, fase: 0, moviendo: false, corriendo: false };
	const CLAVES_PERSONAJE = Object.keys(CFG.personajes);
	let personaje = CLAVES_PERSONAJE[0];
	let camara = 0;
	let tiempo = 0;
	const entrada = { izq: false, der: false, correr: false, rueda: 0, ruedaHasta: 0 };
	const dlg = { npc: null, linea: 0, visibles: 0, mostradas: -1 };

	// ---------- Interfaz (HTML) ----------
	const $ = (id) => document.getElementById(id);
	const ui = {
		hud: $("hud"),
		hudRelleno: $("hud-relleno"),
		hudTexto: $("hud-texto"),
		dialogo: $("dialogo"),
		retrato: $("dialogo-retrato"),
		nombre: $("dialogo-nombre"),
		texto: $("dialogo-texto"),
		pista: $("dialogo-pista"),
		inicio: $("pantalla-inicio"),
		victoria: $("pantalla-victoria"),
		tactiles: $("controles-tactiles"),
	};

	$("titulo").textContent = CFG.textos.titulo;
	$("subtitulo").textContent = CFG.textos.subtitulo;
	$("victoria-titulo").textContent = CFG.textos.victoriaTitulo;
	$("victoria-texto").textContent = CFG.textos.victoriaTexto;
	document.title = CFG.textos.titulo;

	const esTactil = window.matchMedia("(pointer: coarse)").matches;

	function actualizarHud() {
		const progreso = clamp((heroe.x - INICIO_X) / (LARGO - INICIO_X), 0, 1);
		ui.hudRelleno.style.width = (progreso * 100).toFixed(1) + "%";
		const conocidos = npcs.filter((n) => n.hablado).length;
		ui.hudTexto.textContent = `${CFG.textos.contadorNpcs}: ${conocidos} / ${npcs.length}`;
	}

	// ---------- Selector de personaje ----------
	const opciones = [...document.querySelectorAll(".opcion")];

	function elegirPersonaje(clave) {
		personaje = clave;
		opciones.forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.personaje === clave)));
	}

	opciones.forEach((btn) => {
		btn.querySelector("span").textContent = CFG.personajes[btn.dataset.personaje].nombre;
		btn.addEventListener("click", () => elegirPersonaje(btn.dataset.personaje));
	});
	elegirPersonaje(personaje);

	// Dibuja a cada personaje en su tarjeta; el elegido camina en su lugar
	function dibujarVistasPrevias() {
		const sAnterior = S;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		for (const btn of opciones) {
			const lienzo = btn.querySelector("canvas");
			const ancho = 110, alto = 130;
			if (lienzo.width !== ancho * dpr) {
				lienzo.width = ancho * dpr;
				lienzo.height = alto * dpr;
			}
			ctx = lienzo.getContext("2d");
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, ancho, alto);
			S = 1.2;
			const elegido = btn.dataset.personaje === personaje;
			dibujarPersona(ancho / 2, alto - 10, aparienciaHeroe(btn.dataset.personaje, 1, {
				dir: 1,
				fase: tiempo * 9,
				moviendo: elegido,
			}));
		}
		ctx = ctxJuego;
		S = sAnterior;
	}

	function comenzar() {
		estado = "jugando";
		ui.inicio.hidden = true;
		ui.hud.hidden = false;
		ui.tactiles.hidden = !esTactil;
		actualizarHud();
	}

	function reiniciarMundo() {
		heroe.x = INICIO_X;
		heroe.dir = 1;
		camara = 0;
		npcs.forEach((n) => (n.hablado = false));
		petalos = [];
		ui.victoria.hidden = true;
	}

	function reiniciar() {
		reiniciarMundo();
		comenzar();
	}

	function volverAlInicio() {
		reiniciarMundo();
		estado = "inicio";
		ui.hud.hidden = true;
		ui.tactiles.hidden = true;
		ui.inicio.hidden = false;
	}

	function ganar() {
		estado = "victoria";
		heroe.moviendo = heroe.corriendo = false;
		ui.tactiles.hidden = true;
		for (let i = 0; i < 90; i++) {
			petalos.push({
				x: Math.random(),
				y: -Math.random() * 0.8,
				vel: 0.08 + Math.random() * 0.12,
				giro: Math.random() * 6,
				color: COLORES_FLOR[i % COLORES_FLOR.length],
			});
		}
		setTimeout(() => (ui.victoria.hidden = false), 700);
	}

	// ---------- Diálogos ----------
	function abrirDialogo(npc) {
		estado = "dialogo";
		heroe.moviendo = heroe.corriendo = false;
		heroe.dir = npc.x >= heroe.x ? 1 : -1;
		dlg.npc = npc;
		dlg.linea = 0;
		dlg.visibles = 0;
		dlg.mostradas = -1;
		ui.nombre.textContent = npc.nombre;
		ui.retrato.textContent = npc.nombre.charAt(0).toUpperCase();
		ui.retrato.style.background = npc.apariencia.ropa;
		ui.dialogo.hidden = false;
		document.body.classList.add("con-dialogo");
		actualizarPista();
	}

	function lineaActual() {
		return dlg.npc.dialogo[dlg.linea] || "";
	}

	function actualizarPista() {
		const ultima = dlg.linea >= dlg.npc.dialogo.length - 1;
		ui.pista.textContent = ultima ? "Cerrar ✕" : "Continuar ▸";
	}

	function avanzarDialogo() {
		if (dlg.visibles < lineaActual().length) {
			dlg.visibles = lineaActual().length; // completar la frase de golpe
			return;
		}
		dlg.linea++;
		dlg.visibles = 0;
		dlg.mostradas = -1;
		if (dlg.linea >= dlg.npc.dialogo.length) {
			cerrarDialogo();
		} else {
			actualizarPista();
		}
	}

	function cerrarDialogo() {
		dlg.npc.hablado = true;
		dlg.npc = null;
		ui.dialogo.hidden = true;
		document.body.classList.remove("con-dialogo");
		estado = "jugando";
		actualizarHud();
	}

	function npcCercano() {
		return npcs.find((n) => Math.abs(n.x - heroe.x) < CFG.distanciaParaHablar * 1.3);
	}

	function accion() {
		if (estado === "inicio") comenzar();
		else if (estado === "dialogo") avanzarDialogo();
		else if (estado === "jugando") {
			const npc = npcCercano();
			if (npc) abrirDialogo(npc);
		}
	}

	// ---------- Controles ----------
	const TECLAS_IZQ = ["ArrowLeft", "a", "A"];
	const TECLAS_DER = ["ArrowRight", "d", "D"];
	const TECLAS_ACCION = [" ", "Enter", "e", "E"];
	const TECLAS_CORRER = ["q", "Q"];

	window.addEventListener("keydown", (e) => {
		if (TECLAS_IZQ.includes(e.key) || TECLAS_DER.includes(e.key)) {
			e.preventDefault();
			if (estado === "inicio") {
				// En el inicio, las flechas cambian de personaje
				const i = CLAVES_PERSONAJE.indexOf(personaje) + (TECLAS_DER.includes(e.key) ? 1 : -1);
				elegirPersonaje(CLAVES_PERSONAJE[modulo(i, CLAVES_PERSONAJE.length)]);
				return;
			}
			if (TECLAS_IZQ.includes(e.key)) entrada.izq = true;
			else entrada.der = true;
		} else if (TECLAS_CORRER.includes(e.key)) {
			entrada.correr = true;
		} else if (TECLAS_ACCION.includes(e.key)) {
			if (e.target.tagName === "BUTTON") return; // el botón ya maneja su clic
			e.preventDefault();
			if (!e.repeat) accion();
		}
	});

	window.addEventListener("keyup", (e) => {
		if (TECLAS_IZQ.includes(e.key)) entrada.izq = false;
		if (TECLAS_DER.includes(e.key)) entrada.der = false;
		if (TECLAS_CORRER.includes(e.key)) entrada.correr = false;
	});

	window.addEventListener("blur", () => {
		entrada.izq = entrada.der = entrada.correr = false;
	});

	window.addEventListener(
		"wheel",
		(e) => {
			if (estado !== "jugando") return;
			const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
			if (delta === 0) return;
			entrada.rueda = delta > 0 ? 1 : -1;
			entrada.ruedaHasta = performance.now() + 220;
		},
		{ passive: true }
	);

	$("btn-comenzar").addEventListener("click", comenzar);
	$("btn-reiniciar").addEventListener("click", reiniciar);
	$("btn-cambiar").addEventListener("click", volverAlInicio);
	ui.dialogo.addEventListener("click", avanzarDialogo);

	function botonTactil(id, alPresionar, alSoltar) {
		const btn = $(id);
		btn.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			alPresionar();
		});
		["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, alSoltar));
	}
	botonTactil("btn-izq", () => (entrada.izq = true), () => (entrada.izq = false));
	botonTactil("btn-der", () => (entrada.der = true), () => (entrada.der = false));
	botonTactil("btn-correr", () => (entrada.correr = true), () => (entrada.correr = false));
	botonTactil("btn-hablar", accion, () => {});

	// ---------- Actualización ----------
	function actualizar(dt) {
		if (estado === "jugando") {
			let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
			if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;

			heroe.moviendo = dir !== 0;
			heroe.corriendo = heroe.moviendo && entrada.correr;
			if (heroe.moviendo) {
				const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
				heroe.dir = dir;
				heroe.x = clamp(heroe.x + dir * velocidad * dt, 40, LARGO);
				heroe.fase += dt * (heroe.corriendo ? 15 : 9);
				actualizarHud();
			}

			// Los NPCs saludan solos la primera vez que te acercas
			const nuevo = npcs.find((n) => !n.hablado && Math.abs(n.x - heroe.x) < CFG.distanciaParaHablar);
			if (nuevo) abrirDialogo(nuevo);
			else if (heroe.x >= LARGO) ganar();
		}

		if (estado === "dialogo") {
			const linea = lineaActual();
			dlg.visibles = Math.min(linea.length, dlg.visibles + CFG.velocidadTexto * dt);
			const n = Math.floor(dlg.visibles);
			if (n !== dlg.mostradas) {
				dlg.mostradas = n;
				ui.texto.textContent = linea.slice(0, n);
			}
		}

		const objetivo = Math.max(0, heroe.x - W * 0.35);
		camara += (objetivo - camara) * Math.min(1, dt * 5);
	}

	// ---------- Dibujo: formas básicas ----------
	function circulo(x, y, r) {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}

	function linea(x1, y1, x2, y2) {
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	function rectRedondo(x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	// Agrega una elipse al trazo actual (para rellenar varias como una sola figura)
	function agregarElipse(cx, cy, rx, ry) {
		ctx.moveTo(cx + rx, cy);
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
	}

	// ---------- Dibujo: escenario ----------
	function dibujarCielo(t) {
		const g = ctx.createLinearGradient(0, 0, 0, SUELO);
		g.addColorStop(0, color("cieloArriba", t));
		g.addColorStop(1, color("cieloAbajo", t));
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, SUELO + 2);

		// El sol sale a medida que avanzas
		const a = suave(0.3, 0.85, t);
		if (a > 0) {
			const sx = W * 0.8;
			const sy = H * 0.14 + (1 - a) * H * 0.2;
			const r = 44 * S;
			const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
			halo.addColorStop(0, `rgba(255,244,180,${0.6 * a})`);
			halo.addColorStop(1, "rgba(255,244,180,0)");
			ctx.fillStyle = halo;
			ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
			ctx.fillStyle = `rgba(255,232,130,${a})`;
			circulo(sx, sy, r);
		}
	}

	function dibujarNubes(t) {
		const ancho = W + 600;
		ctx.fillStyle = color("nube", t, 0.85);
		for (const n of nubes) {
			const x = modulo(n.x - camara * 0.12 - tiempo * n.vel, ancho) - 300;
			const y = n.y * H;
			const s = n.tam * S;
			ctx.beginPath();
			agregarElipse(x, y, 60 * s, 22 * s);
			agregarElipse(x - 40 * s, y + 6 * s, 40 * s, 16 * s);
			agregarElipse(x + 45 * s, y + 5 * s, 45 * s, 17 * s);
			agregarElipse(x + 5 * s, y - 14 * s, 35 * s, 20 * s);
			ctx.fill();
		}
	}

	// La montaña Celaque: se asoma en el horizonte y queda al frente al final
	function dibujarCelaque(t) {
		const base = (LARGO - W * 0.35) * 0.2 + W * 0.7;
		const cx = base - camara * 0.2;
		const ancho = H * 0.75;
		const alto = H * 0.5;
		if (cx + ancho < 0 || cx - ancho > W) return;

		const cima = SUELO - alto;
		const g = ctx.createLinearGradient(0, cima, 0, SUELO);
		g.addColorStop(0, mezclar("#7d8187", "#1f7a4a", t));
		g.addColorStop(1, color("celaque", t));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(cx - ancho, SUELO);
		ctx.quadraticCurveTo(cx - ancho * 0.45, SUELO - alto * 0.55, cx - ancho * 0.18, cima + alto * 0.04);
		ctx.lineTo(cx + ancho * 0.12, cima);
		ctx.quadraticCurveTo(cx + ancho * 0.5, SUELO - alto * 0.6, cx + ancho, SUELO);
		ctx.closePath();
		ctx.fill();

		// Bosque nublado alrededor de la cima
		ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * t})`;
		ctx.beginPath();
		ctx.ellipse(cx - ancho * 0.05, cima + alto * 0.1, ancho * 0.28, alto * 0.05, 0, 0, Math.PI * 2);
		ctx.ellipse(cx + ancho * 0.22, cima + alto * 0.16, ancho * 0.2, alto * 0.04, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	function dibujarMontanas(t) {
		ctx.fillStyle = color("montanaLejana", t);
		ctx.beginPath();
		ctx.moveTo(0, SUELO);
		for (let sx = 0; sx <= W + 10; sx += 10) {
			const x = sx + camara * 0.2;
			const h = (110 + 55 * Math.sin(x * 0.0023) + 35 * Math.sin(x * 0.0061 + 1.3) + 15 * Math.sin(x * 0.017)) * S;
			ctx.lineTo(sx, SUELO - h * 0.8);
		}
		ctx.lineTo(W, SUELO);
		ctx.closePath();
		ctx.fill();
	}

	function dibujarColinas(t) {
		ctx.fillStyle = color("colinas", t);
		ctx.beginPath();
		ctx.moveTo(0, SUELO + 2);
		for (let sx = 0; sx <= W + 10; sx += 10) {
			const x = sx + camara * 0.45;
			const h = (50 + 25 * Math.sin(x * 0.004) + 15 * Math.sin(x * 0.009 + 2)) * S;
			ctx.lineTo(sx, SUELO - h);
		}
		ctx.lineTo(W, SUELO + 2);
		ctx.closePath();
		ctx.fill();
	}

	function dibujarArbol(sx, base, tam, p) {
		const t = tono(p);
		const s = S * tam;
		const follaje = suave(0.1, 0.5, p); // al inicio los árboles están secos
		const alto = 120 * s;

		ctx.strokeStyle = color("tronco", t);
		ctx.lineCap = "round";
		ctx.lineWidth = 12 * s;
		linea(sx, base, sx, base - alto);
		ctx.lineWidth = 5 * s;
		linea(sx, base - alto * 0.65, sx - 30 * s, base - alto * 0.95);
		linea(sx, base - alto * 0.75, sx + 28 * s, base - alto * 1.05);
		linea(sx, base - alto * 0.9, sx + 6 * s, base - alto * 1.2);

		if (follaje <= 0) return;
		const r = 48 * s * follaje;
		ctx.fillStyle = color("hojas", t);
		ctx.beginPath();
		ctx.arc(sx, base - alto - 10 * s, r, 0, Math.PI * 2);
		ctx.moveTo(sx - 32 * s + r * 0.8, base - alto + 12 * s);
		ctx.arc(sx - 32 * s, base - alto + 12 * s, r * 0.8, 0, Math.PI * 2);
		ctx.moveTo(sx + 34 * s + r * 0.8, base - alto + 8 * s);
		ctx.arc(sx + 34 * s, base - alto + 8 * s, r * 0.8, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = color("hojasLuz", t, 0.85);
		circulo(sx - 12 * s, base - alto - 26 * s, r * 0.42);

		// Frutos y flores en los árboles cerca de Celaque
		if (p > 0.72) {
			const cantidad = Math.floor(suave(0.72, 0.95, p) * 6);
			ctx.fillStyle = sx % 2 > 1 ? "#ff5d73" : "#ffd23f";
			for (let i = 0; i < cantidad; i++) {
				const ang = i * 2.1 + tam * 5;
				circulo(sx + Math.cos(ang) * r * 0.9, base - alto + Math.sin(ang) * r * 0.6, 4 * s);
			}
		}
	}

	function dibujarArbolesLejanos() {
		ctx.save();
		ctx.globalAlpha = 0.55;
		for (const a of arbolesLejanos) {
			const sx = a.x - camara * 0.7;
			if (sx < -80 || sx > W + 80) continue;
			dibujarArbol(sx, SUELO + 2 * S, a.tam, (a.x / 0.7) / LARGO);
		}
		ctx.restore();
	}

	function dibujarArboles() {
		for (const a of arboles) {
			const sx = a.x - camara;
			if (sx < -120 || sx > W + 120) continue;
			dibujarArbol(sx, SUELO + 10 * S, a.tam, a.x / LARGO);
		}
	}

	function dibujarSuelo() {
		const t0 = tono(camara / LARGO);
		const t1 = tono((camara + W) / LARGO);

		const tierra = ctx.createLinearGradient(0, 0, W, 0);
		tierra.addColorStop(0, color("tierra", t0));
		tierra.addColorStop(1, color("tierra", t1));
		ctx.fillStyle = tierra;
		ctx.fillRect(0, SUELO, W, H - SUELO);

		const pasto = ctx.createLinearGradient(0, 0, W, 0);
		pasto.addColorStop(0, color("pasto", t0));
		pasto.addColorStop(1, color("pasto", t1));
		ctx.fillStyle = pasto;
		ctx.fillRect(0, SUELO - 2 * S, W, 18 * S);
		ctx.fillRect(0, SUELO + 62 * S, W, H - SUELO);

		// Sendero por donde camina el protagonista
		ctx.fillStyle = "rgba(255,255,255,0.1)";
		ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);
	}

	function dibujarMatas(delante) {
		ctx.lineCap = "round";
		for (const m of matas) {
			if (m.delante !== delante) continue;
			const sx = m.x - camara;
			if (sx < -20 || sx > W + 20) continue;
			const p = m.x / LARGO;
			const t = tono(p);
			const y = delante ? SUELO + 66 * S : SUELO + 4 * S;
			const alto = (6 + 10 * m.alto) * S * (0.6 + 0.6 * t);

			ctx.strokeStyle = color("pasto", t);
			ctx.lineWidth = 2 * S;
			ctx.beginPath();
			ctx.moveTo(sx, y);
			ctx.lineTo(sx - 4 * S, y - alto * 0.8);
			ctx.moveTo(sx, y);
			ctx.lineTo(sx, y - alto);
			ctx.moveTo(sx, y);
			ctx.lineTo(sx + 4 * S, y - alto * 0.8);
			ctx.stroke();

			// Las flores aparecen a partir de la mitad del camino
			if (m.flor < suave(0.3, 0.9, p) * 0.85) {
				ctx.fillStyle = m.colorFlor;
				circulo(sx, y - alto - 2 * S, 3.5 * S);
				ctx.fillStyle = "#ffe066";
				circulo(sx, y - alto - 2 * S, 1.4 * S);
			}
		}
	}

	function dibujarMeta() {
		const sx = LARGO - camara;
		if (sx < -300 || sx > W + 300) return;
		const pie = SUELO + 22 * S;

		const brillo = ctx.createRadialGradient(sx, pie - 80 * S, 10, sx, pie - 80 * S, 200 * S);
		brillo.addColorStop(0, "rgba(255,255,210,0.55)");
		brillo.addColorStop(1, "rgba(255,255,210,0)");
		ctx.fillStyle = brillo;
		ctx.fillRect(sx - 200 * S, pie - 280 * S, 400 * S, 400 * S);

		ctx.font = `bold ${26 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		const anchoTablero = Math.max(160 * S, ctx.measureText(CFG.nombreMeta).width + 44 * S);

		ctx.fillStyle = "#6b4424";
		ctx.fillRect(sx - anchoTablero * 0.35, pie - 115 * S, 10 * S, 115 * S);
		ctx.fillRect(sx + anchoTablero * 0.35 - 10 * S, pie - 115 * S, 10 * S, 115 * S);

		rectRedondo(sx - anchoTablero / 2, pie - 155 * S, anchoTablero, 52 * S, 8 * S);
		ctx.fillStyle = "#b07a42";
		ctx.fill();
		ctx.lineWidth = 3 * S;
		ctx.strokeStyle = "#6b4424";
		ctx.stroke();

		ctx.fillStyle = "#fff8e1";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(CFG.nombreMeta, sx, pie - 128 * S);

		// Bandera ondeando
		const mastil = sx + anchoTablero / 2 + 30 * S;
		ctx.strokeStyle = "#5a3a1f";
		ctx.lineWidth = 4 * S;
		linea(mastil, pie, mastil, pie - 190 * S);
		const ola = Math.sin(tiempo * 4) * 6 * S;
		ctx.fillStyle = "#2fbf5a";
		ctx.beginPath();
		ctx.moveTo(mastil, pie - 188 * S);
		ctx.quadraticCurveTo(mastil + 30 * S, pie - 188 * S + ola, mastil + 60 * S, pie - 175 * S);
		ctx.quadraticCurveTo(mastil + 30 * S, pie - 160 * S - ola, mastil, pie - 160 * S);
		ctx.closePath();
		ctx.fill();
	}

	// ---------- Dibujo: personajes ----------
	function dibujarPersona(x, pie, o) {
		const s = S * 1.15;
		const paso = o.moviendo ? Math.sin(o.fase) : 0;
		const rebote = o.moviendo ? Math.abs(Math.cos(o.fase)) * 2 * s : Math.sin(tiempo * 2 + x) * 0.8 * s;

		ctx.save();
		ctx.translate(x, pie);

		ctx.fillStyle = "rgba(40,40,40,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.translate(0, -rebote);
		ctx.scale(o.dir, 1);
		if (o.corriendo) ctx.rotate(0.12); // se inclina hacia adelante al correr
		ctx.lineCap = "round";
		const amplitud = o.corriendo ? 0.9 : 0.55;

		// Piernas
		ctx.strokeStyle = o.pantalon;
		ctx.lineWidth = 6 * s;
		const cadera = -26 * s;
		for (const lado of [1, -1]) {
			const ang = paso * amplitud * lado;
			linea(0, cadera, Math.sin(ang) * 26 * s, cadera + Math.cos(ang) * 26 * s);
		}

		// Pelo largo (cae por la espalda y se mece al caminar)
		if (o.peloLargo) {
			const vaiven = o.moviendo ? Math.sin(o.fase) * (o.corriendo ? 0.3 : 0.15) : 0;
			ctx.save();
			ctx.translate(-4 * s, -66 * s);
			ctx.rotate(0.15 + vaiven);
			rectRedondo(-9 * s, 0, 13 * s, 28 * s, 6 * s);
			ctx.fillStyle = o.pelo;
			ctx.fill();
			ctx.restore();
		}

		// Mochila
		if (o.mochila) {
			rectRedondo(-15 * s, -50 * s, 10 * s, 20 * s, 3 * s);
			ctx.fillStyle = o.mochila;
			ctx.fill();
		}

		// Torso
		rectRedondo(-9 * s, -52 * s, 18 * s, 30 * s, 6 * s);
		ctx.fillStyle = o.ropa;
		ctx.fill();

		// Falda
		if (o.falda) {
			ctx.fillStyle = o.falda;
			ctx.beginPath();
			ctx.moveTo(-9 * s, -31 * s);
			ctx.lineTo(9 * s, -31 * s);
			ctx.lineTo(14 * s, -17 * s);
			ctx.lineTo(-14 * s, -17 * s);
			ctx.closePath();
			ctx.fill();
		}

		// Brazo
		ctx.strokeStyle = o.ropa;
		ctx.lineWidth = 5 * s;
		const brazo = -paso * (o.corriendo ? 1.1 : 0.6);
		linea(0, -46 * s, Math.sin(brazo) * 18 * s, -46 * s + Math.cos(brazo) * 18 * s);
		ctx.fillStyle = o.piel;
		circulo(Math.sin(brazo) * 19 * s, -46 * s + Math.cos(brazo) * 19 * s, 3 * s);

		// Cabeza
		ctx.fillStyle = o.piel;
		circulo(0, -63 * s, 11 * s);
		ctx.fillStyle = o.pelo;
		ctx.beginPath();
		ctx.arc(0, -64 * s, 11.5 * s, Math.PI * 0.95, Math.PI * 2.1);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = "#2b2b2b";
		circulo(5 * s, -63 * s, 1.5 * s);
		ctx.strokeStyle = "rgba(90,40,30,0.6)";
		ctx.lineWidth = 1.2 * s;
		ctx.beginPath();
		ctx.arc(5 * s, -58 * s, 2.5 * s, 0.2, Math.PI - 0.6);
		ctx.stroke();

		// Lazo en el pelo
		if (o.lazo) {
			ctx.fillStyle = o.lazo;
			ctx.beginPath();
			ctx.moveTo(-5 * s, -73 * s);
			ctx.lineTo(-12 * s, -79 * s);
			ctx.lineTo(-12 * s, -67 * s);
			ctx.closePath();
			ctx.moveTo(-5 * s, -73 * s);
			ctx.lineTo(2 * s, -79 * s);
			ctx.lineTo(2 * s, -67 * s);
			ctx.closePath();
			ctx.fill();
			circulo(-5 * s, -73 * s, 2.5 * s);
		}

		if (o.sombrero) {
			ctx.fillStyle = o.sombrero;
			ctx.beginPath();
			ctx.ellipse(0, -72 * s, 17 * s, 3.5 * s, 0, 0, Math.PI * 2);
			ctx.fill();
			rectRedondo(-8 * s, -84 * s, 16 * s, 12 * s, 4 * s);
			ctx.fill();
		}

		ctx.restore();
	}

	function dibujarGlobo(x, y, texto, fondo) {
		ctx.font = `bold ${14 * S}px "Trebuchet MS", "Segoe UI", sans-serif`;
		const ancho = ctx.measureText(texto).width + 18 * S;
		const alto = 24 * S;
		rectRedondo(x - ancho / 2, y - alto, ancho, alto, 10 * S);
		ctx.fillStyle = fondo;
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x - 5 * S, y);
		ctx.lineTo(x + 5 * S, y);
		ctx.lineTo(x, y + 6 * S);
		ctx.fill();
		ctx.fillStyle = "#3a3a2e";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(texto, x, y - alto / 2);
	}

	function dibujarNpcs() {
		const pie = SUELO + 36 * S;
		for (const n of npcs) {
			const sx = n.x - camara;
			if (sx < -60 || sx > W + 60) continue;
			const a = n.apariencia;
			dibujarPersona(sx, pie, {
				piel: a.piel,
				ropa: a.ropa,
				pantalon: a.pantalon,
				pelo: a.pelo,
				sombrero: a.sombrero,
				dir: heroe.x >= n.x ? 1 : -1,
				fase: 0,
				moviendo: false,
			});

			const arriba = pie - 110 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
			if (!n.hablado) {
				dibujarGlobo(sx, arriba, "!", "#ffe066");
			} else if (estado === "jugando" && Math.abs(n.x - heroe.x) < CFG.distanciaParaHablar * 1.3) {
				dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
			}
		}
	}

	function dibujarHeroe(t) {
		dibujarPersona(heroe.x - camara, SUELO + 38 * S, aparienciaHeroe(personaje, t, heroe));
	}

	// Colores del personaje elegido: grises al inicio (t = 0), vivos al final (t = 1)
	function aparienciaHeroe(clave, t, pose) {
		const p = CFG.personajes[clave];
		return {
			piel: p.piel,
			ropa: mezclar("#77797c", p.ropa, t),
			pantalon: mezclar("#595b5f", p.pantalon, t),
			pelo: mezclar("#4a4a4a", p.pelo, t),
			falda: p.falda && mezclar("#6e7073", p.falda, t),
			lazo: p.lazo && mezclar("#8a8c8f", p.lazo, t),
			peloLargo: p.peloLargo,
			mochila: color("heroeMochila", t),
			sombrero: null,
			dir: pose.dir,
			fase: pose.fase,
			moviendo: pose.moviendo,
			corriendo: pose.corriendo,
		};
	}

	// ---------- Dibujo: efectos ----------
	function dibujarMariposas() {
		for (const m of mariposas) {
			const alfa = suave(0.55, 0.75, m.x / LARGO);
			const sx = m.x - camara + Math.sin(tiempo * 0.8 + m.fase) * 40 * S;
			if (alfa <= 0 || sx < -20 || sx > W + 20) continue;
			const sy = SUELO - 40 * S - Math.sin(tiempo * 1.3 + m.fase) * 30 * S;
			const aleteo = 0.3 + Math.abs(Math.sin(tiempo * 12 + m.fase)) * 0.7;
			ctx.save();
			ctx.globalAlpha = alfa;
			ctx.fillStyle = m.color;
			ctx.beginPath();
			ctx.ellipse(sx - 4 * S * aleteo, sy, 5 * S * aleteo, 4 * S, 0, 0, Math.PI * 2);
			ctx.ellipse(sx + 4 * S * aleteo, sy, 5 * S * aleteo, 4 * S, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	function dibujarLluvia(dt, t) {
		const intensidad = 1 - suave(0.08, 0.35, t);
		if (intensidad <= 0.01) return;
		ctx.strokeStyle = `rgba(215,220,228,${0.45 * intensidad})`;
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		for (const g of gotas) {
			g.y += g.vel * dt;
			g.x -= g.vel * 0.12 * dt;
			if (g.y > 1) {
				g.y = -0.05;
				g.x = Math.random() * 1.1;
			}
			const x = g.x * W;
			const y = g.y * H;
			ctx.moveTo(x, y);
			ctx.lineTo(x + 3, y - 14);
		}
		ctx.stroke();
	}

	function dibujarPetalos(dt) {
		for (const p of petalos) {
			p.y += p.vel * dt;
			p.giro += dt * 3;
			if (p.y > 1.05) {
				p.y = -0.05;
				p.x = Math.random();
			}
			ctx.save();
			ctx.translate(p.x * W + Math.sin(p.giro) * 20, p.y * H);
			ctx.rotate(p.giro);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.ellipse(0, 0, 6 * S, 3 * S, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	function dibujar(dt) {
		const t = tono(heroe.x / LARGO);

		dibujarCielo(t);
		dibujarNubes(t);
		dibujarCelaque(t);
		dibujarMontanas(t);
		dibujarColinas(t);
		dibujarArbolesLejanos();
		dibujarSuelo();
		dibujarMatas(false);
		dibujarArboles();
		dibujarMeta();
		dibujarNpcs();
		dibujarHeroe(t);
		dibujarMatas(true);
		dibujarMariposas();
		dibujarLluvia(dt, t);

		// Neblina gris al inicio y luz cálida al final
		ctx.fillStyle = `rgba(125,129,135,${0.35 * (1 - t)})`;
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = `rgba(255,250,215,${0.08 * t})`;
		ctx.fillRect(0, 0, W, H);

		dibujarPetalos(dt);
	}

	// ---------- Bucle principal ----------
	let ultimo = performance.now();
	function bucle(ahora) {
		const dt = Math.min(0.05, (ahora - ultimo) / 1000);
		ultimo = ahora;
		tiempo += dt;
		actualizar(dt);
		dibujar(dt);
		if (estado === "inicio") dibujarVistasPrevias();
		requestAnimationFrame(bucle);
	}
	requestAnimationFrame(bucle);
})();
