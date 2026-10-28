/* Camino a Celaque — dibujo de la fábrica de Procesos. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: fábrica (mundo.js → oficina.vista "fabrica", Procesos) ----------
// Una nave industrial: pared con ventanas altas, engranes, tuberías y lámparas
// que se van encendiendo a medida que se avanza; piso de concreto; en cada
// zona su escena, su puerta y su riesgo; y al final la gran máquina. Las zonas,
// los riesgos y las preguntas son los mismos de la obra (obra.js, dibujo-obra.js);
// aquí se añaden sus escenas y sus riesgos propios. Lógica de los obstáculos
// que se mueven: fabrica.js.

const IMG_FABRICA = {
	solicitud: cargarImagen("assets/fabrica/wrike-solicitud.png"),
};
const PARED_FABRICA = ["#2b3938", "#3a4c4a"];

// Un engrane de contorno dentado (cx, cy = centro, r = radio, giro en radianes) con su hueco al centro
function engraneFabrica(cx, cy, r, dientes, giro, color, hueco = 0.34) {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(giro);
	ctx.fillStyle = color;
	ctx.beginPath();
	const da = (Math.PI * 2) / dientes;
	for (let i = 0; i < dientes; i++) {
		const a = i * da;
		const puntos = [[a, 0.8], [a + da * 0.16, 0.8], [a + da * 0.28, 1], [a + da * 0.5, 1], [a + da * 0.62, 0.8]];
		puntos.forEach(([ang, k], j) => {
			const x = Math.cos(ang) * r * k;
			const y = Math.sin(ang) * r * k;
			if (i === 0 && j === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
	}
	ctx.closePath();
	ctx.arc(0, 0, r * hueco, 0, Math.PI * 2);
	ctx.fill("evenodd");
	ctx.restore();
}

// ---------- Fondo ----------
function dibujarFondoFabrica(m, dt) {
	const of = m.oficina;
	const cl = camara - of.x0;
	const avance = avanceObra(of);
	// Pared
	const g = ctx.createLinearGradient(0, 0, 0, SUELO);
	g.addColorStop(0, PARED_FABRICA[0]);
	g.addColorStop(1, PARED_FABRICA[1]);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, SUELO + 2);

	// Ventanas altas con cielo, muy lejanas
	const sepV = 360 * S;
	const f1 = 0.12;
	ctx.save();
	for (let sx = -modulo(cl * f1, sepV) - sepV; sx < W + sepV; sx += sepV) {
		const cielo = ctx.createLinearGradient(0, 26 * S, 0, 118 * S);
		cielo.addColorStop(0, "#a9d6ef");
		cielo.addColorStop(1, "#e3f2f4");
		ctx.fillStyle = cielo;
		ctx.fillRect(sx + 40 * S, 26 * S, 260 * S, 92 * S);
		ctx.strokeStyle = "#1f2a29";
		ctx.lineWidth = 5 * S;
		ctx.strokeRect(sx + 40 * S, 26 * S, 260 * S, 92 * S);
		ctx.lineWidth = 3 * S;
		for (let k = 1; k < 4; k++) linea(sx + 40 * S + k * 65 * S, 26 * S, sx + 40 * S + k * 65 * S, 118 * S);
		linea(sx + 40 * S, 72 * S, sx + 300 * S, 72 * S);
	}
	ctx.restore();

	// Engranes de la pared: giran más rápido a medida que la fábrica avanza
	const giro = tiempo * (0.15 + 0.55 * avance);
	const sepE = 760 * S;
	const f2 = 0.28;
	for (let n = -1; n < Math.ceil(W / sepE) + 2; n++) {
		const sx = n * sepE - modulo(cl * f2, sepE);
		const indice = n + Math.floor((cl * f2) / sepE); // cada engrane arranca en un ángulo distinto
		engraneFabrica(sx + 170 * S, SUELO * 0.58, 96 * S, 12, giro + indice, "#465958");
		engraneFabrica(sx + 316 * S, SUELO * 0.36, 58 * S, 8, -giro * 1.65 - indice, "#506664");
		engraneFabrica(sx + 450 * S, SUELO * 0.66, 44 * S, 8, giro * 2.2, "#3e504e");
	}

	// Tubería a lo largo de la pared
	const f3 = 0.5;
	ctx.fillStyle = "#566766";
	ctx.fillRect(0, SUELO * 0.2, W, 14 * S);
	ctx.fillStyle = "rgba(255,255,255,0.1)";
	ctx.fillRect(0, SUELO * 0.2, W, 4 * S);
	const sepB = 300 * S;
	ctx.fillStyle = "#3d4d4c";
	for (let sx = -modulo(cl * f3, sepB); sx < W + sepB; sx += sepB) ctx.fillRect(sx, SUELO * 0.2 - 4 * S, 12 * S, 22 * S);

	// Columnas y vigas
	const sepC = 520 * S;
	const f4 = 0.7;
	for (let sx = -modulo(cl * f4, sepC); sx < W + sepC; sx += sepC) {
		ctx.fillStyle = "#212d2c";
		ctx.fillRect(sx, 0, 26 * S, SUELO);
		ctx.fillStyle = "rgba(255,255,255,0.06)";
		ctx.fillRect(sx, 0, 6 * S, SUELO);
	}
	ctx.fillStyle = "#1e2928";
	ctx.fillRect(0, 0, W, 20 * S);

	// Lámparas colgadas: se prenden a medida que se avanza
	const sepL = 300 * S;
	const f5 = 0.85;
	const totalL = ((of.terminalX - of.x0) * f5) / sepL;
	for (let sx = -modulo(cl * f5, sepL); sx < W + sepL; sx += sepL) {
		const i = Math.round((cl * f5 + sx) / sepL);
		const encendida = i <= avance * totalL + 2;
		const lx = sx + sepL / 2;
		ctx.strokeStyle = "#141c1b";
		ctx.lineWidth = 2 * S;
		linea(lx, 20 * S, lx, 56 * S);
		if (encendida) {
			const brillo = ctx.createRadialGradient(lx, 70 * S, 4 * S, lx, 70 * S, 120 * S);
			brillo.addColorStop(0, "rgba(255,236,170,0.38)");
			brillo.addColorStop(1, "rgba(255,236,170,0)");
			ctx.fillStyle = brillo;
			ctx.fillRect(lx - 120 * S, 0, 240 * S, 200 * S);
		}
		ctx.fillStyle = "#1c2625";
		ctx.beginPath();
		ctx.moveTo(lx - 26 * S, 70 * S);
		ctx.lineTo(lx - 10 * S, 54 * S);
		ctx.lineTo(lx + 10 * S, 54 * S);
		ctx.lineTo(lx + 26 * S, 70 * S);
		ctx.fill();
		ctx.fillStyle = encendida ? "#fff1b8" : "#46514f";
		ctx.fillRect(lx - 20 * S, 69 * S, 40 * S, 5 * S);
	}

	// Zócalo de la pared: franja baja más oscura y la bruma del piso
	ctx.fillStyle = "rgba(0,0,0,0.22)";
	ctx.fillRect(0, SUELO - 54 * S, W, 54 * S);
	ctx.fillStyle = AMARILLO_OBRA;
	ctx.fillRect(0, SUELO - 54 * S, W, 4 * S);

	// Paredes en los extremos de la fábrica
	const piso = SUELO + 38 * S;
	for (const [x, lado] of [[of.x0 - camara, -1], [of.terminalX + 140 - camara, 1]]) {
		if (lado < 0 ? x <= 0 : x >= W) continue;
		const x0 = lado < 0 ? 0 : x;
		const ancho = lado < 0 ? x : W - x;
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(x0, piso - 220 * S, ancho, H);
		ctx.fillStyle = AMARILLO_OBRA;
		ctx.fillRect(x0, piso - 220 * S, ancho, 12 * S);
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		for (let y = piso - 190 * S; y < H; y += 46 * S) ctx.fillRect(x0, y, ancho, 3 * S);
	}
}

// ---------- Piso ----------
function dibujarSueloFabrica(m) {
	const g = ctx.createLinearGradient(0, SUELO, 0, H);
	g.addColorStop(0, "#9aa5a4");
	g.addColorStop(0.35, "#848f8e");
	g.addColorStop(1, "#5f6a6a");
	ctx.fillStyle = g;
	ctx.fillRect(0, SUELO, W, H - SUELO);
	// Bordillo de seguridad amarillo y negro
	ctx.fillStyle = "rgba(25,25,25,0.55)";
	ctx.fillRect(0, SUELO + 14 * S, W, 6 * S);
	ctx.fillStyle = AMARILLO_OBRA;
	const paso = 26 * S;
	for (let sx = -modulo(camara, paso); sx < W; sx += paso) ctx.fillRect(sx, SUELO + 14 * S, 13 * S, 6 * S);
	// Juntas del concreto
	ctx.strokeStyle = "rgba(0,0,0,0.13)";
	ctx.lineWidth = 2 * S;
	const sepJ = 240 * S;
	for (let sx = -modulo(camara, sepJ); sx < W; sx += sepJ) linea(sx, SUELO + 24 * S, sx - 36 * S, H);
	ctx.fillStyle = "rgba(0,0,0,0.08)";
	ctx.fillRect(0, SUELO + 62 * S, W, 5 * S);
	ctx.fillRect(0, SUELO + 78 * S, W, 5 * S);
	// Manchas de aceite y marcas
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	const azar = crearAzar(11);
	for (let k = 0; k < 40; k++) {
		const u = azar() * 1800;
		const sx = modulo(u * S - camara, 1800 * S) - 60 * S;
		ctx.beginPath();
		ctx.ellipse(sx, SUELO + (28 + azar() * 90) * S, (4 + azar() * 10) * S, (1.5 + azar() * 3) * S, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

// ---------- Escenas de cada zona (se suman a las de la obra: ESCENAS_OBRA) ----------
Object.assign(ESCENAS_OBRA, {
	// 1 · Recepción: un engrane que gira siempre (lo recurrente) y un botón que arranca por un evento (lo secuencial)
	recepcion(z, piso) {
		const base = z.x - camara;
		// El engrane, en su soporte
		const gx = base + 560;
		poste(gx - 80 * S, piso, 190 * S, 8, "#5e686a");
		poste(gx + 80 * S, piso, 190 * S, 8, "#5e686a");
		ctx.fillStyle = "#5e686a";
		ctx.fillRect(gx - 90 * S, piso - 200 * S, 180 * S, 10 * S);
		engraneFabrica(gx, piso - 130 * S, 66 * S, 12, tiempo * 0.9, COLORES.verdeInstitucional);
		engraneFabrica(gx + 64 * S, piso - 70 * S, 34 * S, 8, -tiempo * 1.8 + 0.2, COLORES.beige);
		// El botón: una consola con un botón grande que se hunde de tanto en tanto
		const bx = base + 940;
		poste(bx, piso, 92 * S, 12, "#4b5658");
		ctx.fillStyle = "#cfd7d4";
		rectRedondo(bx - 34 * S, piso - 140 * S, 68 * S, 54 * S, 8 * S);
		ctx.fill();
		const hundido = modulo(tiempo, 4) < 0.5 ? 4 * S : 0;
		ctx.fillStyle = "#8a1f27";
		ctx.fillRect(bx - 22 * S, piso - 112 * S, 44 * S, 8 * S);
		ctx.save();
		ctx.shadowColor = "#ff5a4e";
		ctx.shadowBlur = (hundido ? 4 : 14) * S;
		ctx.fillStyle = "#e63946";
		ctx.beginPath();
		ctx.ellipse(bx, piso - 114 * S + hundido, 22 * S, 12 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	},

	// 2 · Sala de moldes: el molde y las copias que salen de él (la plantilla se duplica)
	moldes(z, piso) {
		const base = z.x - camara;
		const mx = base + 560;
		// Mesa
		ctx.fillStyle = "#6b7778";
		ctx.fillRect(mx - 150 * S, piso - 70 * S, 300 * S, 12 * S);
		ctx.fillStyle = "#4b5658";
		ctx.fillRect(mx - 140 * S, piso - 58 * S, 10 * S, 58 * S);
		ctx.fillRect(mx + 130 * S, piso - 58 * S, 10 * S, 58 * S);
		// El molde (la plantilla): una pieza con borde grueso y un hueco por dentro
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(mx - 130 * S, piso - 130 * S, 70 * S, 60 * S, 8 * S);
		ctx.fill();
		ctx.fillStyle = "#e3f2ee";
		rectRedondo(mx - 118 * S, piso - 120 * S, 46 * S, 40 * S, 5 * S);
		ctx.fill();
		// Las copias, una al lado de otra
		for (let k = 0; k < 3; k++) {
			const cx = mx - 30 * S + k * 62 * S;
			ctx.fillStyle = "#e3f2ee";
			rectRedondo(cx, piso - 112 * S, 46 * S, 40 * S, 5 * S);
			ctx.fill();
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 2.5 * S;
			ctx.stroke();
			ctx.fillStyle = COLORES.verdeInstitucional;
			ctx.fillRect(cx + 8 * S, piso - 100 * S, 30 * S, 4 * S);
			ctx.fillRect(cx + 8 * S, piso - 90 * S, 20 * S, 4 * S);
		}
		// Flecha del molde a las copias
		ctx.fillStyle = COLORES.beige;
		ctx.beginPath();
		ctx.moveTo(mx - 52 * S, piso - 108 * S);
		ctx.lineTo(mx - 40 * S, piso - 100 * S);
		ctx.lineTo(mx - 52 * S, piso - 92 * S);
		ctx.fill();
	},

	// 3 · Ventanilla de pedidos: un mostrador con el formulario real de Wrike en su pantalla
	ventanilla(z, piso) {
		const base = z.x - camara;
		const vx = base + 620;
		// Mostrador
		ctx.fillStyle = "#6b7778";
		ctx.fillRect(vx - 130 * S, piso - 64 * S, 260 * S, 64 * S);
		ctx.fillStyle = "#d6dcdb";
		ctx.fillRect(vx - 138 * S, piso - 72 * S, 276 * S, 10 * S);
		// Cabina con vidrio y toldo
		poste(vx - 120 * S, piso - 72 * S, 150 * S, 8, "#4b5658");
		poste(vx + 120 * S, piso - 72 * S, 150 * S, 8, "#4b5658");
		ctx.fillStyle = "rgba(198,232,240,0.35)";
		ctx.fillRect(vx - 116 * S, piso - 222 * S, 232 * S, 150 * S);
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.fillRect(vx - 140 * S, piso - 232 * S, 280 * S, 16 * S);
		ctx.fillStyle = COLORES.blanco;
		for (let k = 0; k < 7; k++) ctx.fillRect(vx - 140 * S + k * 40 * S + 10 * S, piso - 232 * S, 20 * S, 16 * S);
		// El formulario de Wrike en una pantalla
		const el = IMG_FABRICA.solicitud.elemento;
		const hP = 118 * S;
		const wP = el ? hP * ((el.naturalWidth || el.width) / (el.naturalHeight || el.height)) : hP * 0.8;
		const px = vx - wP / 2;
		const py = piso - 72 * S - hP - 20 * S;
		ctx.fillStyle = "#1c2526";
		rectRedondo(px - 6 * S, py - 6 * S, wP + 12 * S, hP + 12 * S, 6 * S);
		ctx.fill();
		if (el) ctx.drawImage(el, px, py, wP, hP);
		else {
			ctx.fillStyle = COLORES.fondoVerdeClaro;
			ctx.fillRect(px, py, wP, hP);
		}
		// Un tubo neumático por donde llegan los pedidos
		poste(vx + 190 * S, piso, 190 * S, 10, "#8b979a");
		ctx.fillStyle = "#8b979a";
		ctx.fillRect(vx + 120 * S, piso - 190 * S, 76 * S, 10 * S);
		const subida = modulo(tiempo * 0.5, 1);
		ctx.fillStyle = COLORES.beige;
		rectRedondo(vx + 186 * S, piso - 24 * S - subida * 150 * S, 8 * S, 16 * S, 3 * S);
		ctx.fill();
	},

	// 4 · Etiquetado: una máquina que le pone su código a cada caja (las cajas viajan en la cinta de esta zona)
	etiquetado(z, piso) {
		const base = z.x - camara;
		const ex = base + 580;
		ctx.fillStyle = "#4b6563";
		rectRedondo(ex - 70 * S, piso - 150 * S, 140 * S, 150 * S, 10 * S);
		ctx.fill();
		ctx.fillStyle = "#3a504e";
		ctx.fillRect(ex - 70 * S, piso - 60 * S, 140 * S, 8 * S);
		// Rollo de etiquetas
		ctx.fillStyle = COLORES.blanco;
		circulo(ex - 26 * S, piso - 108 * S, 28 * S);
		ctx.fillStyle = "#cfd7d4";
		circulo(ex - 26 * S, piso - 108 * S, 10 * S);
		// Brazo que sella la etiqueta de tanto en tanto
		const baja = Math.max(0, Math.sin(tiempo * 2.4)) * 16 * S;
		ctx.fillStyle = "#cfd7d4";
		ctx.fillRect(ex + 30 * S, piso - 150 * S, 14 * S, 40 * S + baja);
		ctx.fillStyle = AMARILLO_OBRA;
		ctx.fillRect(ex + 20 * S, piso - 112 * S + baja, 34 * S, 8 * S);
		// Luces
		ctx.fillStyle = "#7fe0a8";
		circulo(ex + 24 * S, piso - 40 * S, 6 * S);
		ctx.fillStyle = AMARILLO_OBRA;
		circulo(ex + 44 * S, piso - 40 * S, 6 * S);
		// Cajas ya etiquetadas, apiladas
		for (const [dx, dy] of [[0, 0], [46, 0], [23, 36]]) {
			ctx.fillStyle = "#b08a5a";
			ctx.fillRect(ex - 190 * S + dx * S, piso - 36 * S - dy * S, 42 * S, 36 * S);
			ctx.fillStyle = COLORES.blanco;
			ctx.fillRect(ex - 182 * S + dx * S, piso - 26 * S - dy * S, 22 * S, 12 * S);
			ctx.fillStyle = "#1c2526";
			ctx.fillRect(ex - 179 * S + dx * S, piso - 23 * S - dy * S, 16 * S, 2 * S);
			ctx.fillRect(ex - 179 * S + dx * S, piso - 19 * S - dy * S, 10 * S, 2 * S);
		}
	},

	// 5 · Control de calidad: un arco de inspección con su luz verde y una lista de verificación
	calidad(z, piso) {
		const base = z.x - camara;
		const ax = base + 620;
		// Arco de inspección
		poste(ax - 90 * S, piso, 190 * S, 14, "#4b5658");
		poste(ax + 90 * S, piso, 190 * S, 14, "#4b5658");
		ctx.fillStyle = "#4b5658";
		ctx.fillRect(ax - 98 * S, piso - 200 * S, 196 * S, 20 * S);
		const luz = 0.6 + 0.4 * Math.sin(tiempo * 3);
		ctx.save();
		ctx.shadowColor = "#7fe0a8";
		ctx.shadowBlur = 16 * S;
		ctx.fillStyle = `rgba(127,224,168,${luz})`;
		circulo(ax, piso - 190 * S, 9 * S);
		ctx.restore();
		// Haz de escaneo
		ctx.fillStyle = "rgba(127,224,168,0.14)";
		ctx.fillRect(ax - 84 * S, piso - 182 * S, 168 * S, 182 * S);
		// La lista de verificación en un atril
		const lx = ax + 210 * S;
		poste(lx, piso, 70 * S, 5, "#5e686a");
		ctx.fillStyle = "#f4f6f5";
		rectRedondo(lx - 38 * S, piso - 160 * S, 76 * S, 92 * S, 6 * S);
		ctx.fill();
		ctx.strokeStyle = "#1c2526";
		ctx.lineWidth = 2 * S;
		ctx.stroke();
		for (let k = 0; k < 3; k++) {
			const y = piso - 140 * S + k * 26 * S;
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.moveTo(lx - 28 * S, y);
			ctx.lineTo(lx - 22 * S, y + 6 * S);
			ctx.lineTo(lx - 12 * S, y - 6 * S);
			ctx.stroke();
			ctx.fillStyle = "#b9c3c0";
			ctx.fillRect(lx - 4 * S, y - 2 * S, 30 * S, 4 * S);
		}
	},
});

// ---------- Los riesgos de la fábrica (se suman a los de la obra: DIBUJOS_RIESGO) ----------
// Mismas reglas: unos 100 de alto, pies en (0, 0), mirando a la izquierda.
Object.assign(DIBUJOS_RIESGO, {
	// El Doble Trabajo: un robot con su copia fantasma pegada detrás
	gemelo(e) {
		piernasRiesgo(0, 0, "#59656a");
		// La copia, detrás y desfasada
		ctx.save();
		ctx.globalAlpha = 0.45;
		ctx.fillStyle = "#9db0b2";
		rectRedondo(-18, -100, 64, 74, 10);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = "#cfd7d4";
		rectRedondo(-34, -92, 64, 70, 10);
		ctx.fill();
		ctx.strokeStyle = "#59656a";
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = "#59656a";
		ctx.fillRect(-16, -108, 4, 16);
		circulo(-14, -112, 5);
		ctx.fillStyle = "#e63946";
		ctx.fillRect(-26, -36, 48, 8);
		ojosRiesgo(-4, -68, 11, 4);
		// Brazos
		ctx.strokeStyle = "#59656a";
		ctx.lineWidth = 7;
		ctx.lineCap = "round";
		linea(-34, -70, -52, -50);
		linea(30, -70, 50, -86);
		ctx.lineCap = "butt";
	},
	// La Copia Equivocada: una hoja con otra desalineada y manchas de tinta
	copia(e) {
		piernasRiesgo(0, 0, "#6b6580");
		ctx.save();
		ctx.rotate(0.12);
		ctx.fillStyle = "#c9c4d8";
		rectRedondo(-24, -102, 58, 76, 5);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = "#f4f2fa";
		rectRedondo(-34, -98, 58, 76, 5);
		ctx.fill();
		ctx.strokeStyle = "#6b6580";
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = "#6b6580";
		ctx.beginPath();
		ctx.moveTo(14, -98);
		ctx.lineTo(24, -88);
		ctx.lineTo(14, -88);
		ctx.fill();
		// Líneas de texto mal copiadas
		ctx.strokeStyle = "#8a7f9a";
		ctx.lineWidth = 3;
		linea(-26, -42, 8, -42);
		linea(-26, -34, 2, -34);
		linea(-26, -26, 12, -28);
		ojosRiesgo(-10, -74, 11, 4);
		// Mancha de tinta
		ctx.fillStyle = "#2f2a45";
		ctx.beginPath();
		ctx.ellipse(10, -58, 8, 6, 0.4, 0, Math.PI * 2);
		ctx.ellipse(16, -52, 4, 3, 0, 0, Math.PI * 2);
		ctx.fill();
	},
	// La Solicitud Eterna: un sobre con una cinta de papel que no termina nunca
	solicitud(e) {
		piernasRiesgo(0, 0, "#8a6d45");
		// La cinta interminable, hacia atrás
		ctx.strokeStyle = "#e9d9b8";
		ctx.lineWidth = 9;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(28, -50);
		ctx.bezierCurveTo(70, -90, 60, -10, 104, -46);
		ctx.bezierCurveTo(136, -70, 126, -8, 160, -30);
		ctx.stroke();
		ctx.lineCap = "butt";
		ctx.fillStyle = "#f2e6c8";
		rectRedondo(-38, -88, 76, 58, 5);
		ctx.fill();
		ctx.strokeStyle = "#8a6d45";
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-38, -88);
		ctx.lineTo(0, -58);
		ctx.lineTo(38, -88);
		ctx.stroke();
		ojosRiesgo(0, -46, 12, 4);
		ctx.fillStyle = "#e63946";
		circulo(0, -62, 5);
	},
	// El Código Ilegible: una etiqueta con letras revueltas y un código de barras roto
	codigo(e) {
		piernasRiesgo(0, 0, "#506b78");
		ctx.fillStyle = "#e9eef0";
		rectRedondo(-38, -98, 76, 74, 8);
		ctx.fill();
		ctx.strokeStyle = "#506b78";
		ctx.lineWidth = 3;
		ctx.stroke();
		// Garabatos en vez de letras
		ctx.strokeStyle = "#506b78";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(-28, -84);
		for (let k = 0; k < 7; k++) ctx.lineTo(-28 + k * 9, -84 + (k % 2 ? -7 : 7));
		ctx.stroke();
		ojosRiesgo(0, -62, 12, 4);
		// Código de barras roto
		ctx.fillStyle = "#1c2526";
		for (const [dx, w] of [[-28, 3], [-22, 6], [-12, 3], [-6, 4], [4, 7], [16, 3], [22, 5]]) ctx.fillRect(dx, -40, w, 12);
		ctx.strokeStyle = "#e63946";
		ctx.lineWidth = 3;
		linea(-34, -34, 34, -46);
	},
	// La Subtarea Colgada: una casilla sin marcar que cuelga de un cable
	subtarea(e) {
		piernasRiesgo(0, 0, "#4f6b57");
		// El cable del que cuelga
		ctx.strokeStyle = "#2b2b2b";
		ctx.lineWidth = 3;
		linea(0, -100, 0, -128);
		ctx.fillStyle = "#2b2b2b";
		circulo(0, -130, 5);
		ctx.fillStyle = "#cfe3d3";
		rectRedondo(-34, -100, 68, 80, 12);
		ctx.fill();
		ctx.strokeStyle = "#4f6b57";
		ctx.lineWidth = 3;
		ctx.stroke();
		ojosRiesgo(0, -78, 12, 4);
		// La casilla vacía en el pecho
		ctx.strokeStyle = "#4f6b57";
		ctx.lineWidth = 4;
		ctx.strokeRect(-14, -52, 28, 26);
		// El brazo que cuelga suelto
		ctx.lineCap = "round";
		ctx.lineWidth = 7;
		linea(-34, -70, -52, -40);
		linea(34, -70, 52, -40);
		ctx.lineCap = "butt";
	},
});

// ---------- Cinta transportadora (zonas[].peligro tipo "cinta"; lógica en fabrica.js) ----------
// Va por detrás del héroe: es parte del piso.
function dibujarCintasFabrica(m) {
	const piso = SUELO + 38 * S;
	for (const p of m.oficina.peligros) {
		if (p.tipo !== "cinta") continue;
		if (!p.listo) iniciarPeligroFabrica(p);
		const x1 = p.desde - camara;
		const x2 = p.hasta - camara;
		if (x2 < -60 || x1 > W + 60) continue;
		const sent = sentidoCinta(p.t);
		// Estructura debajo de la banda
		ctx.fillStyle = "#3b4647";
		ctx.fillRect(x1, piso + 12 * S, x2 - x1, 8 * S);
		ctx.fillStyle = "#566264";
		for (let sx = x1 + 30 * S; sx < x2; sx += 120 * S) ctx.fillRect(sx, piso + 12 * S, 8 * S, 26 * S);
		// La banda
		ctx.fillStyle = "#2f3637";
		ctx.fillRect(x1, piso, x2 - x1, 14 * S);
		ctx.fillStyle = AMARILLO_OBRA;
		ctx.fillRect(x1, piso - 2 * S, x2 - x1, 3 * S);
		// Marcas que se desplazan con la banda
		const sep = 46 * S;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x1, piso, x2 - x1, 14 * S);
		ctx.clip();
		ctx.fillStyle = "rgba(255,255,255,0.28)";
		for (let sx = x1 - sep + modulo(p.avance, sep); sx < x2 + sep; sx += sep) {
			const d = p.vel >= 0 ? 1 : -1;
			ctx.beginPath();
			ctx.moveTo(sx - d * 6 * S, piso + 3 * S);
			ctx.lineTo(sx + d * 6 * S, piso + 7 * S);
			ctx.lineTo(sx - d * 6 * S, piso + 11 * S);
			ctx.fill();
		}
		ctx.restore();
		// Rodillos en las puntas
		for (const rx of [x1, x2]) {
			ctx.fillStyle = "#1f2627";
			circulo(rx, piso + 7 * S, 11 * S);
			ctx.fillStyle = "#8b979a";
			circulo(rx, piso + 7 * S, 4 * S);
		}
		// Cajas con su etiqueta que viajan en la banda
		const largo = p.hasta - p.desde;
		for (let k = 0; k < 3; k++) {
			const u = modulo(k * (largo / 3) + p.avance, largo + 80) - 40;
			if (u < 14 * S || u > largo - 14 * S) continue;
			const bx = x1 + u;
			ctx.fillStyle = "#b08a5a";
			ctx.fillRect(bx - 17 * S, piso - 32 * S, 34 * S, 32 * S);
			ctx.fillStyle = "rgba(0,0,0,0.18)";
			ctx.fillRect(bx - 17 * S, piso - 12 * S, 34 * S, 3 * S);
			ctx.fillStyle = COLORES.blanco;
			ctx.fillRect(bx - 9 * S, piso - 24 * S, 18 * S, 10 * S);
			ctx.fillStyle = "#1c2526";
			ctx.fillRect(bx - 6 * S, piso - 21 * S, 12 * S, 2 * S);
			ctx.fillRect(bx - 6 * S, piso - 17 * S, 8 * S, 2 * S);
		}
		// Luces de las puntas: verde si va hacia adelante, naranja si va hacia atrás, apagada si espera
		const luz = sent > 0 ? "#7fe0a8" : sent < 0 ? "#ff9a3c" : "#7b8689";
		for (const lx of [x1 - 22 * S, x2 + 22 * S]) {
			poste(lx, piso + 14 * S, 64 * S, 5, "#3b4647");
			ctx.save();
			ctx.shadowColor = luz;
			ctx.shadowBlur = sent ? 12 * S : 0;
			ctx.fillStyle = luz;
			circulo(lx, piso - 54 * S, 8 * S);
			ctx.restore();
		}
	}
}

// ---------- Prensa (zonas[].peligro tipo "prensa"; lógica en fabrica.js) ----------
// Va por delante del héroe, que pasa por debajo cuando está arriba.
function dibujarPrensasFabrica(m) {
	const piso = SUELO + 38 * S;
	for (const p of m.oficina.peligros) {
		if (p.tipo !== "prensa") continue;
		if (!p.listo) iniciarPeligroFabrica(p);
		const sx = p.x - camara;
		if (sx < -200 || sx > W + 200) continue;
		const mitad = PRENSA.mitad * S;
		const alto = 270 * S;
		const sube = 172 * S; // cuánto sube el cabezal
		const aviso = p.estado === "aviso";
		const tiembla = aviso ? Math.sin(tiempo * 70) * 2 * S : 0;
		const fondoCabezal = piso - (1 - p.h) * sube + tiembla;
		// Zona de impacto marcada en el piso mientras avisa o baja
		if (aviso || p.estado === "bajando" || p.estado === "abajo") {
			ctx.save();
			ctx.globalAlpha = aviso ? 0.35 + 0.25 * Math.sin(tiempo * 24) : 0.45;
			ctx.fillStyle = "#e63946";
			ctx.fillRect(sx - mitad, piso + 4 * S, mitad * 2, 12 * S);
			ctx.restore();
		}
		// Columnas
		ctx.fillStyle = "#2b3535";
		ctx.fillRect(sx - mitad - 22 * S, piso - alto, 16 * S, alto);
		ctx.fillRect(sx + mitad + 6 * S, piso - alto, 16 * S, alto);
		// Viga superior amarilla y negra
		ctx.save();
		ctx.beginPath();
		ctx.rect(sx - mitad - 26 * S, piso - alto - 22 * S, mitad * 2 + 52 * S, 24 * S);
		ctx.clip();
		ctx.fillStyle = AMARILLO_OBRA;
		ctx.fillRect(sx - mitad - 26 * S, piso - alto - 22 * S, mitad * 2 + 52 * S, 24 * S);
		ctx.fillStyle = "#222";
		for (let x = sx - mitad - 50 * S; x < sx + mitad + 30 * S; x += 28 * S) {
			ctx.beginPath();
			ctx.moveTo(x, piso - alto + 2 * S);
			ctx.lineTo(x + 14 * S, piso - alto + 2 * S);
			ctx.lineTo(x + 34 * S, piso - alto - 22 * S);
			ctx.lineTo(x + 20 * S, piso - alto - 22 * S);
			ctx.fill();
		}
		ctx.restore();
		// Vástago y cabezal
		ctx.fillStyle = "#8b979a";
		ctx.fillRect(sx - 7 * S, piso - alto, 14 * S, Math.max(0, fondoCabezal - 56 * S - (piso - alto)));
		ctx.fillStyle = "#59656a";
		rectRedondo(sx - mitad, fondoCabezal - 56 * S, mitad * 2, 56 * S, 6 * S);
		ctx.fill();
		ctx.fillStyle = AMARILLO_OBRA;
		ctx.fillRect(sx - mitad, fondoCabezal - 10 * S, mitad * 2, 10 * S);
		ctx.fillStyle = "#222";
		for (let x = sx - mitad; x < sx + mitad; x += 24 * S) {
			ctx.beginPath();
			ctx.moveTo(x, fondoCabezal);
			ctx.lineTo(x + 12 * S, fondoCabezal);
			ctx.lineTo(x + 24 * S, fondoCabezal - 10 * S);
			ctx.lineTo(x + 12 * S, fondoCabezal - 10 * S);
			ctx.fill();
		}
		// Luz de aviso: parpadea en rojo antes de bajar; verde si se puede pasar
		const peligro = p.estado !== "arriba" && p.estado !== "subiendo";
		const luz = peligro ? "#ff5a4e" : "#7fe0a8";
		ctx.save();
		ctx.globalAlpha = aviso ? 0.5 + 0.5 * Math.sin(tiempo * 24) : 1;
		ctx.shadowColor = luz;
		ctx.shadowBlur = 14 * S;
		ctx.fillStyle = luz;
		circulo(sx, piso - alto - 36 * S, 9 * S);
		ctx.restore();
	}
}

// ---------- La gran máquina: el final de la fábrica ----------
// Se enciende al vencer el último riesgo. Con ella en marcha, se activa y se completa el módulo.
function dibujarGranMaquina(m) {
	const of = m.oficina;
	const sx = of.terminalX - 50 - camara;
	if (sx < -300 || sx > W + 300) return;
	const piso = SUELO + 38 * S;
	const enMarcha = !riesgoPendiente(of);
	const activada = m.completo && enMarcha;
	// Cuerpo
	ctx.fillStyle = "#2d3d3c";
	ctx.fillRect(sx - 124 * S, piso - 20 * S, 248 * S, 20 * S);
	ctx.fillStyle = "#3f5654";
	rectRedondo(sx - 112 * S, piso - 150 * S, 224 * S, 132 * S, 10 * S);
	ctx.fill();
	ctx.fillStyle = "#4e6a67";
	rectRedondo(sx - 84 * S, piso - 236 * S, 168 * S, 92 * S, 10 * S);
	ctx.fill();
	// Chimenea y humo
	ctx.fillStyle = "#2d3d3c";
	ctx.fillRect(sx + 46 * S, piso - 312 * S, 30 * S, 84 * S);
	ctx.fillStyle = AMARILLO_OBRA;
	ctx.fillRect(sx + 46 * S, piso - 312 * S, 30 * S, 8 * S);
	if (enMarcha) {
		for (let k = 0; k < 4; k++) {
			const u = modulo(tiempo * 0.5 + k / 4, 1);
			ctx.fillStyle = `rgba(235,240,238,${0.5 * (1 - u)})`;
			circulo(sx + 61 * S + Math.sin(u * 5 + k) * 8 * S, piso - 316 * S - u * 90 * S, (10 + u * 16) * S);
		}
	}
	// Engrane grande al frente: gira cuando está en marcha
	const giro = enMarcha ? tiempo * (activada ? 1.6 : 0.9) : 0;
	engraneFabrica(sx, piso - 88 * S, 52 * S, 12, giro, enMarcha ? "#e7c25a" : "#7c8886");
	engraneFabrica(sx - 56 * S, piso - 190 * S, 28 * S, 8, -giro * 1.6, enMarcha ? COLORES.beige : "#6f7b79");
	engraneFabrica(sx + 18 * S, piso - 190 * S, 22 * S, 8, giro * 2, enMarcha ? COLORES.verdeInstitucional : "#6f7b79");
	// Luces: rojas si falta, verdes si ya puede activarse
	for (let k = 0; k < 3; k++) {
		const col = enMarcha ? "#7fe0a8" : "#ff5a4e";
		ctx.save();
		ctx.shadowColor = col;
		ctx.shadowBlur = (enMarcha ? 12 : 5) * S;
		ctx.globalAlpha = enMarcha ? 1 : 0.55 + 0.25 * Math.sin(tiempo * 3 + k);
		ctx.fillStyle = col;
		circulo(sx - 96 * S + k * 20 * S, piso - 136 * S, 6 * S);
		ctx.restore();
	}
	// Palanca a un lado
	poste(sx - 150 * S, piso, 46 * S, 8, "#4b5658");
	ctx.strokeStyle = "#e63946";
	ctx.lineWidth = 7 * S;
	ctx.lineCap = "round";
	linea(sx - 150 * S, piso - 46 * S, sx - 150 * S + (enMarcha ? 26 : -26) * S, piso - 84 * S);
	ctx.lineCap = "butt";
	if (estado === "oficina" && enTerminal() && !m.completo) dibujarGlobo(sx, piso - 340 * S, esTactil ? "Toca Hablar: activar la máquina" : `E · ${ESTACIONES.maquina.usar}`, COLORES.fondoVerdeClaro);
}
