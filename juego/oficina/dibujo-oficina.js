/* Camino a Celaque — dibujo de la oficina (vista, temas, muebles, computadora). Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: oficina (interior de cada módulo) ----------
// La oficina está en lo alto de un edificio: todo el fondo es un ventanal
// con la vista (cielo, nubes, montañas, la ciudad allá abajo y aves que
// pasan) y, delante del vidrio, el resto de una oficina enorme a lo lejos,
// borrosa, con más gente trabajando. Cada capa se mueve más lento que la
// cámara cuanto más lejos está (parallax), medido desde la entrada de la
// oficina (cl = cámara local) para que los números no se disparen.
const azarVista = crearAzar(77);
const ANCHO_VISTA = 1600; // franja de ciudad que se repite (en px a S = 1)
const TORRES_VISTA = Array.from({ length: 24 }, (_, k) => ({
	x: k * 66 + azarVista() * 30,
	ancho: 34 + azarVista() * 42,
	alto: 0.3 + azarVista() * 0.6, // cuánto sube desde abajo hacia el horizonte
	tono: k % 4,
	luces: azarVista(),
}));
const NUBES_VISTA = Array.from({ length: 10 }, (_, k) => ({
	x: azarVista() * 1900,
	y: azarVista(),
	tam: 0.6 + azarVista() * 0.9,
	vel: 6 + azarVista() * 12,
	cerca: k % 3 === 0, // las cercanas pasan por delante de la ciudad, más rápido
}));
// Verdes y grises de la marca, aclarados por la distancia
const TONOS_TORRE = ["#6f9a91", "#8ea6a1", "#a9b6b3", "#5c8279"];
// Caminantes de la oficina lejana (en px a S = 1, sobre una franja de 1400)
const CAMINANTES = [
	{ u: 120, vel: 26, v: 0 },
	{ u: 520, vel: -20, v: 1 },
	{ u: 880, vel: 18, v: 2 },
	{ u: 1240, vel: -28, v: 0 },
];
const COLUMNAS_OFICINA = [520, 1150, 1780, 2360];

// Cielo de cada vista (arriba, horizonte) y color de la bruma de abajo.
// ciudad = atardecer (IA), nubes = tan alto que solo hay nubes (Atlas)...
const CIELOS_VISTA = {
	ciudad: ["#2f5258", "#e4cdb4", "rgba(228,205,180,0.8)"],
	construccion: ["#8fcbe6", COLORES.fondoVerdeClaro, "rgba(227,238,235,0.85)"],
	industria: ["#a3b6b3", "#eee0ca", "rgba(225,210,188,0.9)"],
	nubes: ["#3f8fca", "#e6f4fb", "rgba(255,255,255,0)"],
	montana: ["#9bd0e2", "#f0f6ee", "rgba(240,246,238,0.75)"],
};

// Degradados que solo cambian con el tamaño de la pantalla (y la vista)
const cacheFondoOficina = {};
function degradadosOficina(arriba, abajo, horizonte, vista) {
	const clave = `${vista}:${W}x${H}`;
	if (cacheFondoOficina[clave]) return cacheFondoOficina[clave];
	const colores = CIELOS_VISTA[vista] || CIELOS_VISTA.ciudad;
	const cielo = ctx.createLinearGradient(0, arriba, 0, horizonte);
	cielo.addColorStop(0, colores[0]);
	cielo.addColorStop(1, colores[1]);
	const bruma = ctx.createLinearGradient(0, horizonte, 0, abajo);
	bruma.addColorStop(0, colores[2]);
	bruma.addColorStop(1, "rgba(255,255,255,0)");
	const sol = ctx.createRadialGradient(0, 0, 4 * S, 0, 0, 120 * S);
	sol.addColorStop(0, "rgba(255,250,225,1)");
	sol.addColorStop(0.25, vista === "ciudad" ? "rgba(255,214,170,0.75)" : "rgba(255,244,200,0.7)");
	sol.addColorStop(1, "rgba(255,244,200,0)");
	const pisoLejano = ctx.createLinearGradient(0, abajo, 0, SUELO);
	pisoLejano.addColorStop(0, "#b9c4c1");
	pisoLejano.addColorStop(1, "#97a6a3");
	cacheFondoOficina[clave] = { cielo, bruma, sol, pisoLejano };
	return cacheFondoOficina[clave];
}

function nubeVista(x, y, r, alfa) {
	ctx.fillStyle = `rgba(255,255,255,${alfa})`;
	circulo(x, y, r);
	circulo(x + r * 0.9, y + r * 0.2, r * 0.8);
	circulo(x - r * 0.9, y + r * 0.25, r * 0.7);
	circulo(x + r * 0.2, y - r * 0.45, r * 0.75);
	ctx.fillRect(x - r * 1.5, y + r * 0.1, r * 3.1, r * 0.75);
}

// Cordillera: altura con senos (u = x de mundo con parallax), rellena hasta abajo
function cordillera(abajo, base, amp, f, cl, color, semilla) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, abajo);
	for (let x = 0; x <= W + 20; x += 20) {
		const u = (x + cl * f) / S;
		const y = base - (Math.sin(u * 0.004 + semilla) * 0.5 + 0.5) * amp * S - Math.sin(u * 0.013 + semilla * 2) * amp * 0.25 * S;
		ctx.lineTo(x, y);
	}
	ctx.lineTo(W + 20, abajo);
	ctx.fill();
}

const posNube = (n, f, cl) => modulo(n.x * S + tiempo * n.vel * S - cl * f, 1900 * S) - 200 * S;
function nubesLejanas(arriba, alto, cl) {
	for (const n of NUBES_VISTA) if (!n.cerca) nubeVista(posNube(n, 0.1, cl), arriba + alto * (0.06 + n.y * 0.42), 26 * S * n.tam, 0.8);
}
function nubesCercanas(horizonte, abajo, cl) {
	for (const n of NUBES_VISTA) if (n.cerca) nubeVista(posNube(n, 0.32, cl), horizonte + (abajo - horizonte) * (0.15 + n.y * 0.5), 34 * S * n.tam, 0.9);
}

// Recorre las torres de la franja que se repite (parallax 0.18)
function porTorre(cl, fn) {
	const franja = ANCHO_VISTA * S;
	const base = modulo(-cl * 0.18, franja);
	for (let rep = -1; base + rep * franja < W; rep++) {
		TORRES_VISTA.forEach((t, k) => {
			const x = base + rep * franja + t.x * S;
			const w = t.ancho * S;
			if (x + w >= -60 * S && x <= W + 60 * S) fn(t, k, x, w);
		});
	}
}

// La ciudad allá abajo: techos de torres. "obra" = algunas en construcción
// con grúas; "puntas" = más altas, con antenas que parpadean (atardecer).
function vistaTorres(horizonte, abajo, cl, modo) {
	ctx.fillStyle = modo === "puntas" ? "#b9ab9b" : "#c3d3cf";
	ctx.fillRect(0, horizonte, W, abajo - horizonte);
	const encendidas = modo === "puntas";
	porTorre(cl, (t, k, x, w) => {
		const alto = modo === "puntas" ? 0.55 + t.alto * 0.5 : t.alto;
		const top = abajo - (abajo - horizonte) * alto;
		const enObra = modo === "obra" && k % 3 === 0;
		const armazon = enObra ? (abajo - top) * 0.35 : 0;
		ctx.fillStyle = modo === "puntas" ? mezclar(TONOS_TORRE[t.tono], COLORES.verdeProfundo, 0.35) : TONOS_TORRE[t.tono];
		ctx.fillRect(x, top + armazon, w, abajo - top - armazon);
		if (enObra) {
			// Pisos de arriba sin terminar: solo la estructura
			ctx.strokeStyle = "#7d8a87";
			ctx.lineWidth = 2 * S;
			ctx.strokeRect(x, top, w, armazon);
			for (let y = top + 10 * S; y < top + armazon; y += 10 * S) linea(x, y, x + w, y);
			for (let cx = x + w / 3; cx < x + w - 1; cx += w / 3) linea(cx, top, cx, top + armazon);
		} else {
			ctx.fillStyle = "rgba(255,255,255,0.18)"; // azotea
			ctx.fillRect(x - 2 * S, top, w + 4 * S, 3 * S);
		}
		ctx.fillStyle = encendidas || t.luces > 0.5 ? "rgba(255,236,190,0.85)" : "rgba(255,255,255,0.45)";
		for (let y = top + armazon + 9 * S; y < abajo - 4 * S; y += 11 * S) {
			for (let wx = x + 5 * S; wx < x + w - 6 * S; wx += 10 * S) if (!encendidas || (wx + y) % 3 > 0.6) ctx.fillRect(wx, y, 4 * S, 4 * S);
		}
		if (modo === "puntas" && k % 2 === 0) {
			// Antena con luz roja que parpadea
			ctx.strokeStyle = "#3a4446";
			ctx.lineWidth = 2 * S;
			linea(x + w / 2, top, x + w / 2, top - 26 * S);
			if (Math.sin(tiempo * 3 + k) > 0) {
				ctx.save();
				ctx.shadowColor = "#ff5a4e";
				ctx.shadowBlur = 10 * S;
				ctx.fillStyle = "#ff5a4e";
				circulo(x + w / 2, top - 27 * S, 3 * S);
				ctx.restore();
			}
		}
		if (modo === "obra" && k % 5 === 1) dibujarGruaVista(x + w / 2, top, k);
	});
}

// Grúa torre: mástil, pluma y un gancho que va y viene con una viga
function dibujarGruaVista(x, top, k) {
	const amarillo = "#ffc72c";
	const alto = 80 * S;
	ctx.strokeStyle = amarillo;
	ctx.lineWidth = 4 * S;
	linea(x, top, x, top - alto);
	ctx.lineWidth = 3 * S;
	linea(x - 110 * S, top - alto, x + 40 * S, top - alto); // pluma
	linea(x, top - alto - 16 * S, x - 90 * S, top - alto);
	linea(x, top - alto - 16 * S, x + 40 * S, top - alto);
	ctx.fillStyle = "#5e686a";
	ctx.fillRect(x + 26 * S, top - alto, 16 * S, 10 * S); // contrapeso
	const carro = x - (20 + (0.5 + 0.5 * Math.sin(tiempo * 0.5 + k)) * 80) * S;
	const baja = (30 + 14 * Math.sin(tiempo * 0.7 + k)) * S;
	ctx.strokeStyle = "#2b2b2b";
	ctx.lineWidth = 1.5 * S;
	linea(carro, top - alto, carro, top - alto + baja);
	ctx.fillStyle = "#b5524a";
	ctx.fillRect(carro - 16 * S, top - alto + baja, 32 * S, 5 * S);
}

// Zona industrial: naves con techo de sierra, chimeneas con humo y tanques
const INDUSTRIA_VISTA = Array.from({ length: 16 }, (_, k) => ({ x: k * 100 + azarVista() * 40, tipo: k % 4, alto: 0.35 + azarVista() * 0.4 }));
function vistaIndustria(horizonte, abajo, cl) {
	ctx.fillStyle = "#c9c2b2";
	ctx.fillRect(0, horizonte, W, abajo - horizonte);
	const franja = ANCHO_VISTA * S;
	const base = modulo(-cl * 0.18, franja);
	for (let rep = -1; base + rep * franja < W; rep++) {
		for (const f of INDUSTRIA_VISTA) {
			const x = base + rep * franja + f.x * S;
			if (x < -120 * S || x > W + 120 * S) continue;
			const top = abajo - (abajo - horizonte) * f.alto;
			if (f.tipo === 0 || f.tipo === 2) {
				// Nave con techo de sierra
				const w = 90 * S;
				ctx.fillStyle = f.tipo ? "#8e9a97" : "#9c8f80";
				ctx.fillRect(x, top, w, abajo - top);
				ctx.beginPath();
				for (let k = 0; k < 4; k++) {
					ctx.moveTo(x + k * (w / 4), top);
					ctx.lineTo(x + k * (w / 4), top - 14 * S);
					ctx.lineTo(x + (k + 1) * (w / 4), top);
				}
				ctx.fill();
				ctx.fillStyle = "rgba(255,236,190,0.7)";
				for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 * S + k * 20 * S, top + 12 * S, 10 * S, 6 * S);
			} else if (f.tipo === 1) {
				// Chimenea alta a franjas, con humo que sube
				const cx = x + 20 * S;
				const arriba = top - 70 * S;
				for (let y = arriba, i = 0; y < abajo; y += 14 * S, i++) {
					ctx.fillStyle = i % 2 ? "#e9ece8" : "#b5524a";
					ctx.fillRect(cx - 7 * S, y, 14 * S, 14 * S);
				}
				for (let k = 0; k < 5; k++) {
					const t = (tiempo * 0.18 + k / 5 + f.x * 0.001) % 1;
					ctx.fillStyle = `rgba(205,200,190,${(0.6 * (1 - t)).toFixed(3)})`;
					circulo(cx + t * 46 * S, arriba - t * 110 * S, (6 + t * 22) * S);
				}
			} else {
				// Tanques
				ctx.fillStyle = "#a9b6b3";
				for (let k = 0; k < 2; k++) {
					const tx = x + k * 34 * S;
					ctx.fillRect(tx, top, 28 * S, abajo - top);
					ctx.beginPath();
					ctx.ellipse(tx + 14 * S, top, 14 * S, 6 * S, 0, Math.PI, Math.PI * 2);
					ctx.fill();
				}
			}
		}
	}
}

// Tan alto que solo hay nubes: un mar de nubes abajo y, a lo lejos, la
// cima de una montaña que asoma.
function vistaMarDeNubes(arriba, horizonte, abajo, cl) {
	ctx.fillStyle = conAlfa(COLORES.verdeInstitucional, 0.55);
	ctx.beginPath();
	const cima = W * 0.3 - cl * 0.03;
	ctx.moveTo(cima - 220 * S, horizonte + 30 * S);
	ctx.lineTo(cima - 40 * S, horizonte - 70 * S);
	ctx.lineTo(cima, horizonte - 88 * S);
	ctx.lineTo(cima + 50 * S, horizonte - 60 * S);
	ctx.lineTo(cima + 240 * S, horizonte + 30 * S);
	ctx.fill();
	const capas = [
		[horizonte - 6 * S, 30, 0.06, 4, "#dfeef5"],
		[horizonte + (abajo - horizonte) * 0.35, 44, 0.16, 7, "#f1f7fa"],
		[horizonte + (abajo - horizonte) * 0.72, 60, 0.3, 11, "#ffffff"],
	];
	// Huevo de pascua: una avioneta con letrero cruza cada tanto
	const vuelo = modulo(tiempo, 26);
	if (vuelo < 9) dibujarAvioneta(-260 * S + (vuelo / 9) * (W + 520 * S), arriba + (horizonte - arriba) * 0.35 + Math.sin(tiempo * 2) * 4 * S);
	for (const [y, r, f, vel, col] of capas) {
		const paso = r * 1.5 * S;
		const off = modulo(cl * f + tiempo * vel * S, paso);
		ctx.fillStyle = col;
		ctx.fillRect(0, y, W, abajo - y);
		for (let x = -off - paso, k = 0; x < W + paso; x += paso, k++) circulo(x, y + Math.sin(k * 1.7) * 6 * S, (r + Math.sin(k * 2.3) * r * 0.35) * S);
	}
}

function dibujarAvioneta(x, y) {
	const texto = "¡Bienvenido a Celaque!";
	ctx.font = `700 ${12 * S}px ${FUENTE}`;
	const ancho = ctx.measureText(texto).width + 20 * S;
	const bx = x - 70 * S - ancho;
	ctx.strokeStyle = "#5e686a";
	ctx.lineWidth = 1.2 * S;
	linea(x - 30 * S, y, bx + ancho, y + 2 * S);
	ctx.fillStyle = COLORES.beige;
	ctx.fillRect(bx, y - 9 * S, ancho, 20 * S);
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, bx + ancho / 2, y + 1 * S);
	ctx.fillStyle = COLORES.blanco;
	rectRedondo(x - 34 * S, y - 7 * S, 56 * S, 14 * S, 7 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.verdeInstitucional;
	ctx.beginPath();
	ctx.moveTo(x - 30 * S, y - 4 * S);
	ctx.lineTo(x - 38 * S, y - 18 * S);
	ctx.lineTo(x - 26 * S, y - 4 * S);
	ctx.fill(); // cola
	ctx.fillRect(x - 10 * S, y - 2 * S, 16 * S, 18 * S * 0.3); // ala
	ctx.fillStyle = "#9fdcff";
	for (let k = 0; k < 3; k++) ctx.fillRect(x - 14 * S + k * 9 * S, y - 4 * S, 5 * S, 4 * S);
	ctx.fillStyle = "#5e686a";
	ctx.fillRect(x + 22 * S, y - 6 * S, 2 * S, 12 * S * (0.5 + 0.5 * Math.sin(tiempo * 40))); // hélice
}

// Montaña cercana: cordilleras con bosque de pinos y bruma entre ellas
function vistaMontana(horizonte, abajo, cl) {
	cordillera(abajo, horizonte, 90, 0.05, cl, "#a9c9c0", 1);
	ctx.fillStyle = "rgba(240,246,238,0.55)";
	ctx.fillRect(0, horizonte - 30 * S, W, 50 * S);
	cordillera(abajo, horizonte + 40 * S, 70, 0.1, cl, mezclar(COLORES.verdeInstitucional, "#ffffff", 0.2), 3);
	ctx.fillStyle = "rgba(240,246,238,0.45)";
	ctx.fillRect(0, horizonte + 30 * S, W, 40 * S);
	const cercaY = horizonte + (abajo - horizonte) * 0.55;
	cordillera(abajo, cercaY, 50, 0.2, cl, mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.4), 5);
	// Pinos sobre la cordillera de adelante
	ctx.fillStyle = mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.7);
	const paso = 26 * S;
	const off = modulo(cl * 0.2, paso);
	for (let x = -off; x < W + paso; x += paso) {
		const u = (x + cl * 0.2) / S;
		const y = cercaY - (Math.sin(u * 0.004 + 5) * 0.5 + 0.5) * 50 * S - Math.sin(u * 0.013 + 10) * 12.5 * S + 6 * S;
		const h = (18 + ((Math.floor(u / 26) * 7) % 10)) * S;
		ctx.beginPath();
		ctx.moveTo(x, y - h);
		ctx.lineTo(x + 8 * S, y + 4 * S);
		ctx.lineTo(x - 8 * S, y + 4 * S);
		ctx.fill();
	}
}

// Lo que se ve por el ventanal (recortado al vidrio). Cambia por edificio
// (mundo.js → oficina.vista).
function dibujarVistaVentanal(arriba, abajo, horizonte, g, cl, dt, vista) {
	const alto = abajo - arriba;
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, arriba, W, alto);
	ctx.clip();

	ctx.fillStyle = g.cielo;
	ctx.fillRect(0, arriba, W, alto);
	if (vista === "ciudad") {
		// Atardecer: estrellas que titilan arriba
		ctx.fillStyle = "#ffffff";
		for (let k = 0; k < 26; k++) {
			const x = modulo(k * 137 * S - cl * 0.02, W + 40 * S) - 20 * S;
			const y = arriba + ((k * 53) % 100) * 0.0028 * alto * 100 * 0.35;
			ctx.globalAlpha = 0.35 + 0.35 * Math.sin(tiempo * 2 + k);
			ctx.fillRect(x, y, 2 * S, 2 * S);
		}
		ctx.globalAlpha = 1;
	}
	ctx.save();
	const solY = vista === "ciudad" ? horizonte - alto * 0.06 : vista === "nubes" ? arriba + alto * 0.16 : arriba + alto * 0.2;
	ctx.translate(W * 0.76 - cl * 0.02, solY);
	if (vista === "nubes") ctx.scale(1.4, 1.4);
	ctx.fillStyle = g.sol;
	ctx.fillRect(-120 * S, -120 * S, 240 * S, 240 * S);
	ctx.restore();

	if (vista === "nubes") {
		vistaMarDeNubes(arriba, horizonte, abajo, cl);
	} else if (vista === "montana") {
		nubesLejanas(arriba, alto, cl);
		vistaMontana(horizonte, abajo, cl);
		ctx.fillStyle = g.bruma;
		ctx.fillRect(0, horizonte, W, abajo - horizonte);
		nubesCercanas(horizonte, abajo, cl);
	} else {
		cordillera(horizonte, horizonte, 70, 0.04, cl, conAlfa(COLORES.verdeInstitucional, 0.35), 70);
		cordillera(horizonte, horizonte, 46, 0.08, cl, conAlfa(COLORES.verdeInstitucional, 0.55), 46);
		nubesLejanas(arriba, alto, cl);
		if (vista === "industria") vistaIndustria(horizonte, abajo, cl);
		else vistaTorres(horizonte, abajo, cl, vista === "construccion" ? "obra" : "puntas");
		ctx.fillStyle = g.bruma;
		ctx.fillRect(0, horizonte, W, abajo - horizonte);
		if (vista !== "ciudad") nubesCercanas(horizonte, abajo, cl);
	}

	dibujarAves(dt, true); // guacamayas y loros cruzan por la ventana
	ctx.restore();
}

// Cada tema (mundo.js → oficina.tema) está en mundos/<mundo>/tema.js y
// se registra en window.TEMAS_OFICINA: qué flota en el aire, la pizarra y
// el objeto propio de la oficina.
const TEMAS = window.TEMAS_OFICINA || {};

// Lo que flota en el aire de cada oficina (mundo.js → oficina.tema):
// planos que vuelan, engranes, documentos que suben a la nube, escudos o
// una red de nodos. Se mueven solos y un poco con la cámara.
const FLOTANTES = Array.from({ length: 11 }, (_, k) => ({
	u: k * 165 + azarVista() * 80,
	y: azarVista(),
	vel: 10 + azarVista() * 16,
	fase: azarVista() * 6,
	tipo: k % 2,
}));
function dibujarFlotantesOficina(m, cl) {
	const tema = TEMAS[m.oficina.tema] || {};
	const alto = Math.max(60 * S, SUELO - 300 * S);
	const puntos = FLOTANTES.map((f) => {
		const x = modulo(f.u * S + tiempo * f.vel * S - cl * 0.9, 1800 * S) - 150 * S;
		let y = 70 * S + f.y * alto + Math.sin(tiempo * 1.2 + f.fase) * 10 * S;
		if (tema.alturaFlotante) y = tema.alturaFlotante(f, alto);
		return { f, x, y };
	});
	ctx.save();
	ctx.globalAlpha = 0.85;
	if (tema.red) tema.red(puntos);
	for (const { f, x, y } of puntos) {
		if (x < -80 * S || x > W + 80 * S) continue;
		ctx.save();
		ctx.translate(x, y);
		if (tema.flotante) tema.flotante(f);
		ctx.restore();
	}
	ctx.restore();
}

// Pizarra según el tema: tablero de tareas, diagrama de flujo, carpetas,
// lista de chequeo o red neuronal. (x0, y0, w, h) = el área blanca.
function dibujarPizarraTema(tema, x0, y0, w, h) {
	ctx.lineWidth = 2 * S;
	ctx.strokeStyle = COLORES.verdeProfundo;
	ctx.fillStyle = COLORES.verdeProfundo;
	// Con un tema que no existe se ve el tablero de tareas (el de "planos"), como siempre
	const t = TEMAS[tema] || TEMAS.planos;
	if (t && t.pizarra) t.pizarra(x0, y0, w, h);
}

// Objeto propio de cada oficina, cerca de la computadora
function dibujarEspecialOficina(tema, sx, piso) {
	const t = TEMAS[tema];
	if (t && t.especial) t.especial(sx, piso);
}

// Parteluces del ventanal y reflejos en el vidrio
function dibujarMarcosVentanal(arriba, abajo, cl) {
	const paso = 230 * S;
	const off = modulo(cl * 0.55, paso);
	ctx.fillStyle = "rgba(255,255,255,0.08)";
	for (let x = -off - paso; x < W + paso; x += paso) {
		ctx.beginPath();
		ctx.moveTo(x + paso * 0.15, abajo);
		ctx.lineTo(x + paso * 0.45, arriba);
		ctx.lineTo(x + paso * 0.62, arriba);
		ctx.lineTo(x + paso * 0.32, abajo);
		ctx.fill();
	}
	ctx.fillStyle = COLORES.verdeProfundo;
	for (let x = -off; x < W + paso; x += paso) ctx.fillRect(x - 4 * S, arriba, 8 * S, abajo - arriba);
	ctx.fillRect(0, arriba + (abajo - arriba) * 0.16, W, 4 * S);
	ctx.fillStyle = "#cfd7d4"; // alféizar
	ctx.fillRect(0, abajo - 3 * S, W, 8 * S);
}

// Persona a lo lejos (para la oficina borrosa): sentada o de pie
function personaLejana(c, x, pie, ropa, piel, sentada) {
	const alto = sentada ? 40 * S : 64 * S;
	if (!sentada) {
		c.fillStyle = "#3a4446";
		c.fillRect(x - 5 * S, pie - 26 * S, 4 * S, 26 * S);
		c.fillRect(x + 1 * S, pie - 26 * S, 4 * S, 26 * S);
	}
	const torsoAbajo = sentada ? pie : pie - 24 * S;
	c.fillStyle = ropa;
	c.beginPath();
	c.moveTo(x - 9 * S, torsoAbajo);
	c.lineTo(x - 8 * S, pie - alto + 14 * S);
	c.quadraticCurveTo(x, pie - alto + 8 * S, x + 8 * S, pie - alto + 14 * S);
	c.lineTo(x + 9 * S, torsoAbajo);
	c.fill();
	c.fillStyle = piel;
	c.beginPath();
	c.arc(x, pie - alto + 4 * S, 7 * S, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = "#2b1a12";
	c.beginPath();
	c.arc(x, pie - alto + 1.5 * S, 7 * S, Math.PI, Math.PI * 2);
	c.fill();
}

// La oficina lejana se dibuja una sola vez por tamaño de pantalla y se
// desenfoca (filtro blur); así cada cuadro solo copia la imagen.
let cacheOficinaLejana = null;
function oficinaLejana() {
	if (cacheOficinaLejana && cacheOficinaLejana.S === S) return cacheOficinaLejana;
	const ROPAS = [COLORES.verdeProfundo, COLORES.verdeInstitucional, COLORES.beige, "#e9ece8", "#3c63b8", "#b5524a"];
	const PIELES = ["#d9a07a", "#c99468", "#e0b08a", "#b98458"];
	const az = crearAzar(31);
	const borroso = (ancho, alto, dibujo) => {
		const crudo = document.createElement("canvas");
		crudo.width = ancho;
		crudo.height = alto;
		dibujo(crudo.getContext("2d"));
		const final = document.createElement("canvas");
		final.width = ancho;
		final.height = alto;
		const f = final.getContext("2d");
		f.filter = `blur(${(2.2 * S).toFixed(1)}px)`; // donde no hay filtro se ve nítido, igual sirve
		f.drawImage(crudo, 0, 0);
		return final;
	};
	const ancho = Math.round(1200 * S);
	const alto = Math.round(120 * S);
	const lienzo = borroso(ancho, alto, (c) => {
		const piso = alto - 6 * S;
		for (let k = 0; k < 8; k++) {
			const x = k * 150 * S + 20 * S;
			const n = 1 + Math.floor(az() * 2);
			for (let p = 0; p < n; p++) {
				personaLejana(c, x + (p ? 96 : 12) * S, piso - 26 * S, ROPAS[Math.floor(az() * ROPAS.length)], PIELES[Math.floor(az() * PIELES.length)], true);
			}
			if (az() < 0.4) personaLejana(c, x + 128 * S, piso, ROPAS[Math.floor(az() * ROPAS.length)], PIELES[Math.floor(az() * PIELES.length)], false);
			// Isla de escritorios con dos monitores encendidos
			c.fillStyle = "#cfd6d3";
			c.fillRect(x, piso - 30 * S, 110 * S, 6 * S);
			c.fillStyle = "#8f9b98";
			c.fillRect(x + 6 * S, piso - 24 * S, 5 * S, 24 * S);
			c.fillRect(x + 99 * S, piso - 24 * S, 5 * S, 24 * S);
			for (const mx of [x + 28 * S, x + 60 * S]) {
				c.fillStyle = "#1c2526";
				c.fillRect(mx, piso - 54 * S, 24 * S, 19 * S);
				c.fillStyle = "rgba(140,210,195,0.95)";
				c.fillRect(mx + 2 * S, piso - 52 * S, 20 * S, 15 * S);
				c.fillStyle = "#1c2526";
				c.fillRect(mx + 10 * S, piso - 35 * S, 4 * S, 5 * S);
			}
			if (k % 3 === 1) {
				c.fillStyle = "#3f9b5a";
				c.beginPath();
				c.ellipse(x - 8 * S, piso - 40 * S, 12 * S, 22 * S, 0, 0, Math.PI * 2);
				c.fill();
				c.fillStyle = "#e9e3d6";
				c.fillRect(x - 16 * S, piso - 20 * S, 16 * S, 20 * S);
			}
		}
	});
	const caminantes = [0, 1, 2].map((v) =>
		borroso(Math.round(40 * S), Math.round(80 * S), (c) => personaLejana(c, 20 * S, 76 * S, ROPAS[(v * 2 + 1) % ROPAS.length], PIELES[v], false))
	);
	cacheOficinaLejana = { S, lienzo, caminantes };
	return cacheOficinaLejana;
}

function dibujarOficinaLejana(abajo, g, cl, dt) {
	ctx.fillStyle = g.pisoLejano;
	ctx.fillRect(0, abajo, W, SUELO - abajo);
	const lejana = oficinaLejana();
	const ancho = lejana.lienzo.width;
	const alto = lejana.lienzo.height;
	// Fila más lejana (más chica, más tenue) y fila cercana
	for (const [f, k, alfa, pie] of [
		[0.42, 0.62, 0.6, SUELO - 26 * S],
		[0.6, 1, 0.9, SUELO - 2 * S],
	]) {
		ctx.globalAlpha = alfa;
		const w = ancho * k;
		for (let x = -modulo(cl * f, w); x < W; x += w) ctx.drawImage(lejana.lienzo, x, pie - alto * k, w, alto * k);
		ctx.globalAlpha = 1;
	}
	// Gente caminando entre los escritorios
	const franja = 1400 * S;
	ctx.globalAlpha = 0.85;
	for (const c of CAMINANTES) {
		c.u = modulo(c.u + c.vel * dt, 1400);
		const x = modulo(c.u * S - cl * 0.6, franja) - 100 * S;
		if (x < -50 * S || x > W + 50 * S) continue;
		const img = lejana.caminantes[c.v];
		const rebote = Math.abs(Math.sin(tiempo * 7 + c.u)) * 2 * S;
		ctx.save();
		ctx.translate(x, SUELO - 4 * S - rebote);
		ctx.scale(Math.sign(c.vel), 1);
		ctx.drawImage(img, -img.width / 2, -img.height);
		ctx.restore();
	}
	ctx.globalAlpha = 1;
}

function dibujarFondoOficina(m, dt) {
	const of = m.oficina;
	const cl = camara - of.x0;
	const arribaV = 34 * S; // el vidrio empieza bajo el techo...
	const abajoV = SUELO - 46 * S; // ...y termina en el alféizar lejano
	const horizonte = arribaV + (abajoV - arribaV) * 0.56;
	const g = degradadosOficina(arribaV, abajoV, horizonte, of.vista);
	dibujarVistaVentanal(arribaV, abajoV, horizonte, g, cl, dt, of.vista);
	dibujarMarcosVentanal(arribaV, abajoV, cl);
	dibujarOficinaLejana(abajoV, g, cl, dt);

	// Techo con lámparas que brillan
	ctx.fillStyle = "#d4d9d6";
	ctx.fillRect(0, 0, W, 34 * S);
	for (let x = of.x0 + 120; x < of.terminalX + 200; x += 300) {
		const sx = x - camara;
		if (sx < -150 || sx > W + 150) continue;
		const luz = ctx.createLinearGradient(0, 34 * S, 0, 260 * S);
		luz.addColorStop(0, "rgba(255,255,235,0.45)");
		luz.addColorStop(1, "rgba(255,255,235,0)");
		ctx.fillStyle = luz;
		ctx.beginPath();
		ctx.moveTo(sx - 45 * S, 34 * S);
		ctx.lineTo(sx + 45 * S, 34 * S);
		ctx.lineTo(sx + 120 * S, 260 * S);
		ctx.lineTo(sx - 120 * S, 260 * S);
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		rectRedondo(sx - 50 * S, 28 * S, 100 * S, 10 * S, 4 * S);
		ctx.fill();
	}

	dibujarColumnasOficina(m);
	dibujarFlotantesOficina(m, cl);

	// Paredes de los extremos
	ctx.fillStyle = COLORES.verdeProfundo;
	const izq = of.x0 - camara;
	if (izq > 0) ctx.fillRect(0, 0, izq, H);
	const der = of.terminalX + 140 - camara;
	if (der < W) ctx.fillRect(der, 0, W - der, H);
}

// Columnas de la oficina: con el logo de Celaque, un afiche del módulo
// o un reloj. Van al frente (se mueven con la cámara, como los muebles).
function dibujarColumnasOficina(m) {
	const of = m.oficina;
	const piso = SUELO + 40 * S;
	COLUMNAS_OFICINA.forEach((d, k) => {
		const sx = of.x0 + d - camara;
		if (sx < -200 || sx > W + 200) return;
		const ancho = 54 * S;
		ctx.fillStyle = "#e6eae7";
		ctx.fillRect(sx - ancho / 2, 30 * S, ancho, piso - 30 * S);
		ctx.fillStyle = "rgba(0,0,0,0.08)";
		ctx.fillRect(sx + ancho * 0.22, 30 * S, ancho * 0.28, piso - 30 * S);
		ctx.fillStyle = m.color;
		ctx.fillRect(sx - ancho / 2, piso - 16 * S, ancho, 16 * S);

		const tipo = k % 3;
		if (tipo === 0) {
			// Placa blanca lisa detrás del logo (el manual pide fondo liso)
			const cy = 140 * S;
			ctx.fillStyle = COLORES.blanco;
			rectRedondo(sx - 130 * S, cy - 34 * S, 260 * S, 68 * S, 10 * S);
			ctx.fill();
			ctx.strokeStyle = COLORES.grisClaro;
			ctx.lineWidth = 1.5 * S;
			ctx.stroke();
			dibujarLogoOEspacio(logoCelaque, sx, cy, 230 * S, 42 * S, false);
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(sx - 80 * S, cy + 42 * S, 160 * S, 26 * S, 8 * S);
			ctx.fill();
			ctx.fillStyle = COLORES.blanco;
			ctx.font = `700 ${14 * S}px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(`Módulo ${m.nombre}`, sx, cy + 55 * S);
		} else if (tipo === 1) {
			// Afiche del sistema del módulo
			const w = 132 * S;
			const h = 164 * S;
			const y0 = 96 * S;
			ctx.fillStyle = m.color;
			rectRedondo(sx - w / 2, y0, w, h, 10 * S);
			ctx.fill();
			ctx.fillStyle = COLORES.blanco;
			circulo(sx, y0 + 56 * S, 34 * S);
			dibujarIconoMundo(m.icono, sx, y0 + 56 * S, 22 * S, m.color);
			const texto = m.sistema || m.nombre;
			let tam = 16;
			ctx.font = `700 ${tam * S}px ${FUENTE}`;
			while (tam > 9 && ctx.measureText(texto).width > w - 16 * S) ctx.font = `700 ${--tam * S}px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(texto, sx, y0 + 112 * S);
			ctx.font = `400 ${11 * S}px ${FUENTE}`;
			if (m.subtitulo !== texto) ctx.fillText(m.subtitulo || "", sx, y0 + 136 * S, w - 12 * S);
		} else {
			// Reloj de pared con la hora real
			const cy = 130 * S;
			const r = 30 * S;
			ctx.fillStyle = COLORES.blanco;
			circulo(sx, cy, r);
			ctx.strokeStyle = COLORES.verdeProfundo;
			ctx.lineWidth = 4 * S;
			ctx.beginPath();
			ctx.arc(sx, cy, r, 0, Math.PI * 2);
			ctx.stroke();
			const ahora = new Date();
			const horas = ((ahora.getHours() % 12) + ahora.getMinutes() / 60) * (Math.PI / 6);
			const minutos = ahora.getMinutes() * (Math.PI / 30);
			const segundos = ahora.getSeconds() * (Math.PI / 30);
			ctx.lineCap = "round";
			for (const [ang, largo, grosor, col] of [
				[horas, 0.5, 4, COLORES.verdeProfundo],
				[minutos, 0.75, 3, COLORES.verdeProfundo],
				[segundos, 0.8, 1.5, COLORES.verdeInstitucional],
			]) {
				ctx.strokeStyle = col;
				ctx.lineWidth = grosor * S;
				linea(sx, cy, sx + Math.sin(ang) * r * largo, cy - Math.cos(ang) * r * largo);
			}
			ctx.lineCap = "butt";
		}
	});
}

// Decoración del piso (no estorba: se pasa por delante)
function dibujarDecoracionOficina(m) {
	const piso = SUELO + 40 * S;
	for (const o of m.oficina.decoracion) {
		const sx = o.x - camara;
		if (sx < -160 || sx > W + 160) continue;
		if (o.tipo === "librero") {
			const w = 74 * S;
			const h = 156 * S;
			ctx.fillStyle = "#8a6a4a";
			ctx.fillRect(sx - w / 2, piso - h, w, h);
			ctx.fillStyle = "#6f5238";
			for (let k = 0; k < 4; k++) {
				const y = piso - h + 8 * S + k * 37 * S;
				ctx.fillRect(sx - w / 2 + 5 * S, y + 28 * S, w - 10 * S, 4 * S);
				const colores = [COLORES.verdeProfundo, COLORES.beige, COLORES.verdeInstitucional, "#e9ece8", "#c79a5b"];
				for (let b = 0; b < 6; b++) {
					ctx.fillStyle = colores[(b + k * 2) % colores.length];
					const alto = (18 + ((b * 7 + k * 3) % 9)) * S;
					ctx.fillRect(sx - w / 2 + 8 * S + b * 10 * S, y + 28 * S - alto, 8 * S, alto);
				}
				ctx.fillStyle = "#6f5238";
			}
		} else if (o.tipo === "sillon") {
			ctx.fillStyle = COLORES.verdeInstitucional;
			rectRedondo(sx - 60 * S, piso - 58 * S, 120 * S, 30 * S, 10 * S); // respaldo
			ctx.fill();
			ctx.fillStyle = mezclar(COLORES.verdeInstitucional, "#ffffff", 0.15);
			rectRedondo(sx - 56 * S, piso - 34 * S, 112 * S, 20 * S, 7 * S); // cojines
			ctx.fill();
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(sx - 66 * S, piso - 44 * S, 16 * S, 34 * S, 6 * S);
			ctx.fill();
			rectRedondo(sx + 50 * S, piso - 44 * S, 16 * S, 34 * S, 6 * S);
			ctx.fill();
			ctx.fillRect(sx - 54 * S, piso - 12 * S, 6 * S, 12 * S);
			ctx.fillRect(sx + 48 * S, piso - 12 * S, 6 * S, 12 * S);
		} else if (o.tipo === "pizarra") {
			// Pizarra en su caballete; lo que tiene escrito depende del tema
			const w = 130 * S;
			const h = 86 * S;
			const y0 = piso - 150 * S;
			ctx.strokeStyle = "#5e686a";
			ctx.lineWidth = 4 * S;
			linea(sx - w * 0.35, y0 + h, sx - w * 0.42, piso);
			linea(sx + w * 0.35, y0 + h, sx + w * 0.42, piso);
			ctx.fillStyle = COLORES.blanco;
			ctx.fillRect(sx - w / 2, y0, w, h);
			ctx.strokeStyle = "#9aa5a6";
			ctx.lineWidth = 3 * S;
			ctx.strokeRect(sx - w / 2, y0, w, h);
			ctx.lineWidth = 1.5 * S;
			dibujarPizarraTema(m.oficina.tema, sx - w / 2, y0, w, h);
		} else if (o.tipo === "cafetera") {
			ctx.fillStyle = "#c89b6d";
			ctx.fillRect(sx - 40 * S, piso - 64 * S, 80 * S, 64 * S);
			ctx.fillStyle = "#a07c58";
			ctx.fillRect(sx - 36 * S, piso - 56 * S, 34 * S, 50 * S);
			ctx.fillRect(sx + 2 * S, piso - 56 * S, 34 * S, 50 * S);
			ctx.fillStyle = "#2e3a3c"; // máquina de café
			rectRedondo(sx - 30 * S, piso - 106 * S, 34 * S, 42 * S, 4 * S);
			ctx.fill();
			ctx.fillStyle = "#ff7a3d";
			circulo(sx - 20 * S, piso - 96 * S, 2.5 * S);
			ctx.fillStyle = COLORES.blanco; // tazas
			ctx.fillRect(sx + 12 * S, piso - 76 * S, 10 * S, 12 * S);
			ctx.fillStyle = COLORES.verdeInstitucional;
			ctx.fillRect(sx + 26 * S, piso - 76 * S, 10 * S, 12 * S);
			ctx.strokeStyle = "rgba(255,255,255,0.6)"; // vapor
			ctx.lineWidth = 2 * S;
			for (let k = 0; k < 2; k++) {
				const vx = sx + 17 * S + k * 14 * S;
				const ola = Math.sin(tiempo * 3 + k) * 3 * S;
				ctx.beginPath();
				ctx.moveTo(vx, piso - 80 * S);
				ctx.quadraticCurveTo(vx + ola, piso - 90 * S, vx - ola, piso - 100 * S);
				ctx.stroke();
			}
		} else if (o.tipo === "plantaAlta") {
			ctx.fillStyle = "#2f8a4c";
			for (let k = -3; k <= 3; k++) {
				ctx.beginPath();
				ctx.ellipse(sx + k * 8 * S, piso - 90 * S + Math.abs(k) * 9 * S, 9 * S, 34 * S, k * 0.28, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.fillStyle = COLORES.beige;
			ctx.beginPath();
			ctx.moveTo(sx - 24 * S, piso - 46 * S);
			ctx.lineTo(sx + 24 * S, piso - 46 * S);
			ctx.lineTo(sx + 18 * S, piso);
			ctx.lineTo(sx - 18 * S, piso);
			ctx.fill();
		} else if (o.tipo === "especial") {
			dibujarEspecialOficina(m.oficina.tema, sx, piso);
		} else if (o.tipo === "lampara") {
			ctx.strokeStyle = "#3a4446";
			ctx.lineWidth = 4 * S;
			linea(sx, piso, sx, piso - 140 * S);
			ctx.fillStyle = "#3a4446";
			ctx.fillRect(sx - 16 * S, piso - 4 * S, 32 * S, 4 * S);
			ctx.save();
			ctx.shadowColor = "rgba(255,240,190,0.9)";
			ctx.shadowBlur = 30 * S;
			ctx.fillStyle = "#fff1c1";
			ctx.beginPath();
			ctx.moveTo(sx - 14 * S, piso - 150 * S);
			ctx.lineTo(sx + 14 * S, piso - 150 * S);
			ctx.lineTo(sx + 24 * S, piso - 124 * S);
			ctx.lineTo(sx - 24 * S, piso - 124 * S);
			ctx.fill();
			ctx.restore();
		}
	}
}

function dibujarSueloOficina(m) {
	const piso = ctx.createLinearGradient(0, SUELO, 0, H);
	piso.addColorStop(0, "#7a8b88");
	piso.addColorStop(1, "#56625f");
	ctx.fillStyle = piso;
	ctx.fillRect(0, SUELO, W, H - SUELO);
	ctx.fillStyle = m.color; // borde de la alfombra con el color del módulo
	ctx.fillRect(0, SUELO, W, 4 * S);
	// Losetas de alfombra
	ctx.strokeStyle = "rgba(0,0,0,0.12)";
	ctx.lineWidth = 1.5 * S;
	ctx.beginPath();
	const paso = 90 * S;
	const off = ((camara % paso) + paso) % paso;
	for (let sx = -off; sx < W; sx += paso) linea(sx, SUELO + 6 * S, sx, H);
	linea(0, SUELO + 50 * S, W, SUELO + 50 * S);
	ctx.stroke();
}

// Puerta de salida, al inicio de la oficina
function dibujarPuertaSalida(m) {
	const sx = m.oficina.x0 + 70 - camara;
	if (sx < -80 || sx > W + 80) return;
	const piso = SUELO + 40 * S;
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.fillRect(sx - 40 * S, piso - 130 * S, 80 * S, 130 * S);
	ctx.fillStyle = "#b9d9d5";
	ctx.fillRect(sx - 33 * S, piso - 123 * S, 66 * S, 123 * S);
	ctx.fillStyle = COLORES.verdeInstitucional;
	rectRedondo(sx - 30 * S, piso - 156 * S, 60 * S, 22 * S, 5 * S);
	ctx.fill();
	ctx.fillStyle = "#fff";
	ctx.font = `bold ${12 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("SALIDA", sx, piso - 145 * S);
	// Letrero del edificio y el piso (ej. "Torre Atlas · Piso 40")
	const of = m.oficina;
	if (of.edificio) {
		const texto = of.piso ? `${of.edificio} · Piso ${of.piso}` : of.edificio;
		ctx.font = `700 ${13 * S}px ${FUENTE}`;
		const ancho = ctx.measureText(texto).width + 24 * S;
		const lx = sx + Math.max(0, ancho / 2 - 40 * S); // que no quede pegado a la pared
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(lx - ancho / 2, piso - 232 * S, ancho, 26 * S, 8 * S);
		ctx.fill();
		ctx.fillStyle = COLORES.blanco;
		ctx.fillText(texto, lx, piso - 219 * S);
	}
	if (estado === "oficina" && enSalidaOficina()) {
		dibujarGlobo(sx, piso - 170 * S, esTactil ? "Toca Hablar: volver al mapa" : "E · Volver al mapa", COLORES.fondoVerdeClaro);
	}
}

// Muebles de oficina (obstáculos). topY es la cara de arriba, donde se
// puede parar el héroe; lo que sobresale (respaldo, hojas) es decoración.
function dibujarMueble(o, sx, baseY, topY, w) {
	const alto = baseY - topY;
	if (o.tipo === "escritorio") {
		ctx.fillStyle = "#8a6a4a";
		ctx.fillRect(sx - w + 6 * S, topY + 8 * S, 8 * S, alto - 8 * S);
		ctx.fillRect(sx + w - 14 * S, topY + 8 * S, 8 * S, alto - 8 * S);
		ctx.fillStyle = "#a07c58";
		ctx.fillRect(sx + w * 0.2, topY + 8 * S, w * 0.6, alto * 0.55); // cajonera
		ctx.fillStyle = "#c89b6d";
		rectRedondo(sx - w, topY, w * 2, 10 * S, 3 * S);
		ctx.fill();
		ctx.fillStyle = "#3a4446"; // laptop cerrada y taza
		ctx.fillRect(sx - w * 0.6, topY - 4 * S, 36 * S, 4 * S);
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.fillRect(sx + w * 0.45, topY - 10 * S, 9 * S, 10 * S);
	} else if (o.tipo === "silla") {
		ctx.fillStyle = "#2e3a3c";
		ctx.fillRect(sx - 2 * S, topY + 6 * S, 4 * S, alto - 10 * S);
		ctx.fillRect(sx - w, baseY - 5 * S, w * 2, 5 * S);
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(sx - w, topY, w * 2, 9 * S, 4 * S);
		ctx.fill();
		rectRedondo(sx - w, topY - 34 * S, 9 * S, 38 * S, 4 * S); // respaldo
		ctx.fill();
	} else if (o.tipo === "archivero") {
		ctx.fillStyle = "#9aa5a6";
		ctx.fillRect(sx - w, topY, w * 2, alto);
		ctx.strokeStyle = "#6f7a7b";
		ctx.lineWidth = 2 * S;
		for (let k = 1; k < 3; k++) {
			const y = topY + (alto * k) / 3;
			linea(sx - w, y, sx + w, y);
		}
		ctx.fillStyle = "#e7ecec";
		for (let k = 0; k < 3; k++) ctx.fillRect(sx - 8 * S, topY + (alto * (k + 0.4)) / 3, 16 * S, 4 * S);
	} else if (o.tipo === "cajas") {
		ctx.fillStyle = "#c79a5b";
		ctx.fillRect(sx - w, topY + alto * 0.45, w * 2, alto * 0.55);
		ctx.fillStyle = "#d8ad6d";
		ctx.fillRect(sx - w * 0.75, topY, w * 1.5, alto * 0.45);
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		ctx.fillRect(sx - 3 * S, topY, 6 * S, alto * 0.45);
		ctx.fillRect(sx - 3 * S, topY + alto * 0.45, 6 * S, alto * 0.55);
	} else if (o.tipo === "impresora") {
		ctx.fillStyle = "#5e686a";
		ctx.fillRect(sx - w * 0.85, topY + 26 * S, w * 1.7, alto - 26 * S);
		ctx.fillStyle = "#eceff0";
		rectRedondo(sx - w, topY, w * 2, 28 * S, 5 * S);
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(sx - w * 0.5, topY - 6 * S, w, 8 * S); // hojas
		ctx.fillStyle = COLORES.verdeInstitucional;
		circulo(sx + w * 0.65, topY + 10 * S, 3 * S);
	} else if (o.tipo === "planta") {
		ctx.fillStyle = "#3f9b5a";
		for (let k = -2; k <= 2; k++) {
			ctx.beginPath();
			ctx.ellipse(sx + k * 7 * S, topY - 6 * S - Math.abs(k) * -3 * S, 7 * S, 18 * S, k * 0.35, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "#e9e3d6";
		ctx.beginPath();
		ctx.moveTo(sx - w, topY + alto * 0.35);
		ctx.lineTo(sx + w, topY + alto * 0.35);
		ctx.lineTo(sx + w * 0.75, baseY);
		ctx.lineTo(sx - w * 0.75, baseY);
		ctx.fill();
	} else if (o.tipo === "dispensador") {
		ctx.fillStyle = "#e9edee";
		ctx.fillRect(sx - w, topY + alto * 0.38, w * 2, alto * 0.62);
		ctx.fillStyle = "rgba(90,180,230,0.75)";
		rectRedondo(sx - w * 0.8, topY, w * 1.6, alto * 0.4, 6 * S);
		ctx.fill();
		ctx.fillStyle = "#4a7fb0";
		ctx.fillRect(sx - 3 * S, topY + alto * 0.55, 6 * S, 6 * S);
	} else if (o.tipo === "pila") {
		// Pila de ladrillos (solo en la obra al aire libre)
		const filas = 4;
		const h = alto / filas;
		for (let f = 0; f < filas; f++) {
			const y = topY + f * h;
			ctx.fillStyle = f % 2 ? "#b5524a" : "#c2635a";
			ctx.fillRect(sx - w, y, w * 2, h - 2 * S);
			ctx.fillStyle = "rgba(0,0,0,0.22)";
			for (let b = 1; b < 3; b++) ctx.fillRect(sx - w + (w * 2 * b) / 3 + (f % 2 ? 6 * S : -4 * S), y, 2 * S, h - 2 * S);
		}
	} else if (o.tipo === "tambo") {
		// Tambo de obra azul con aros y franja amarilla
		ctx.fillStyle = "#3f6fa0";
		rectRedondo(sx - w, topY, w * 2, alto, 6 * S);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.14)";
		ctx.fillRect(sx - w * 0.55, topY + 3 * S, w * 0.3, alto - 6 * S);
		ctx.fillStyle = "#2c4f75";
		for (const f of [0.22, 0.78]) ctx.fillRect(sx - w, topY + alto * f, w * 2, 4 * S);
		ctx.fillStyle = "#ffc72c";
		ctx.fillRect(sx - w, topY + alto * 0.42, w * 2, alto * 0.16);
	}
}

// Compañeros del módulo (misma foto teñida que los NPCs del camino)
function dibujarCompaneros(m) {
	const cerca = estado === "oficina" ? companeroCerca() : null;
	for (const n of m.oficina.companeros) {
		const sx = n.x - camara;
		if (sx < -80 || sx > W + 80) continue;
		const pie = SUELO + 36 * S;
		dibujarNpcFoto(sx, pie, n, heroe.x >= n.x ? 1 : -1);
		const arriba = pie - 125 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
		if (n.importante) dibujarPlacaImportante(sx, pie - 172 * S, n.nombre);
		if (!n.hablado) dibujarGlobo(sx, arriba, "!", "#ffe066");
		else if (n === cerca) dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
	}
}

// Computadora al fondo de la oficina: monitor grande con la Terminal
// Celaque (colores y logo de Celaque) sobre su escritorio.
function dibujarComputadora(m) {
	const of = m.oficina;
	const sx = of.terminalX - camara;
	if (sx < -200 || sx > W + 200) return;
	const piso = SUELO + 40 * S;
	const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
	const tocar = esTactil ? "Toca Hablar para usarla" : `E · ${ESTACIONES[of.estacion].usar}`;
	if (of.estacion !== "computadora") {
		// IA y Seguridad: en vez de computadora, lo que se va armando
		const alto = dibujarEstacionArmable(m, sx, piso);
		if (estado === "oficina" && enTerminal()) dibujarGlobo(sx - 50 * S, piso - alto - 6 * S, tocar, COLORES.fondoVerdeClaro);
		return;
	}

	// Escritorio
	const topY = piso - 70 * S;
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.fillRect(sx - 80 * S, topY, 160 * S, 70 * S);
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.fillRect(sx - 90 * S, topY - 8 * S, 180 * S, 10 * S);

	// Monitor
	const mw = 150 * S;
	const mh = 100 * S;
	const my = topY - 30 * S - mh;
	ctx.fillStyle = "#1c2526";
	ctx.fillRect(sx - 8 * S, topY - 30 * S, 16 * S, 24 * S);
	ctx.fillRect(sx - 36 * S, topY - 10 * S, 72 * S, 5 * S);
	ctx.save();
	if (!m.completo) {
		ctx.shadowColor = COLORES.verdeInstitucional;
		ctx.shadowBlur = (18 + 16 * pulso) * S;
	}
	rectRedondo(sx - mw / 2 - 8 * S, my - 8 * S, mw + 16 * S, mh + 16 * S, 8 * S);
	ctx.fillStyle = "#1c2526";
	ctx.fill();
	ctx.restore();
	ctx.fillStyle = COLORES.verdeProfundo; // liso: el logo va encima
	ctx.fillRect(sx - mw / 2, my, mw, mh);
	dibujarLogoOEspacio(logoCelaqueBlanco, sx, my + mh * 0.42, 124 * S, 24 * S, true);
	ctx.fillStyle = "#fff";
	ctx.font = `bold ${11 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(m.completo ? "✓ Módulo completado" : "Terminal Celaque", sx, my + mh * 0.82);
	if (!m.completo && Math.sin(tiempo * 6) > 0) ctx.fillRect(sx + 50 * S, my + mh * 0.78, 6 * S, 9 * S); // cursor

	// Silla de la computadora
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(sx - 60 * S, piso - 42 * S, 36 * S, 8 * S, 4 * S);
	ctx.fill();
	ctx.fillStyle = "#2e3a3c";
	ctx.fillRect(sx - 44 * S, piso - 34 * S, 4 * S, 30 * S);

	if (estado === "oficina" && enTerminal()) {
		dibujarGlobo(sx - 50 * S, my - 22 * S, tocar, COLORES.fondoVerdeClaro);
	}
}
