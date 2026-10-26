/* Camino a Celaque — dibujo del mapa de mundos. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: mapa ----------
// Todo el mapa se dibuja en sus propias unidades (MAPA_ANCHO x MAPA_ALTO)
// y se escala a la pantalla con ctx.setTransform; el acercamiento a un
// mundo solo cambia esa escala y el centro (ver vistaMapa). Mientras se
// dibuja el mapa S vale 1 (las funciones de dibujo que usan S quedan en
// unidades del mapa).
const MAPA_ANCHO = 1600;
const MAPA_ALTO = 1000;
const ACANTILADO = 38; // alto de la pared de roca de cada meseta
// Un mundo por módulo, en orden alrededor de la meseta central (como un
// anillo, igual que el mapa de referencia). Si hubiera más de 6 módulos,
// los extra se acomodan en un círculo.
const LUGARES_MAPA = [
	{ x: 300, y: 770, rx: 200, ry: 112 },
	{ x: 280, y: 255, rx: 175, ry: 100 },
	{ x: 800, y: 165, rx: 185, ry: 88 },
	{ x: 1320, y: 250, rx: 180, ry: 100 },
	{ x: 1330, y: 745, rx: 185, ry: 108 },
	{ x: 810, y: 865, rx: 185, ry: 88 },
];
const CENTRO_MAPA = { x: 800, y: 505, rx: 300, ry: 200 };

// Orilla irregular de una meseta (puntos fijos con semilla). El punto 0
// está a la derecha, el 10 abajo, el 20 a la izquierda y el 30 arriba.
const PUNTOS_MESETA = 40;
function contornoMeseta(q, semilla) {
	const az = crearAzar(semilla);
	const a = az() * 6;
	const b = az() * 6;
	const puntos = [];
	for (let k = 0; k < PUNTOS_MESETA; k++) {
		const ang = (k / PUNTOS_MESETA) * Math.PI * 2;
		const r = 1 + 0.06 * Math.sin(3 * ang + a) + 0.04 * Math.sin(5 * ang + b) + (az() - 0.5) * 0.025;
		puntos.push([q.x + Math.cos(ang) * q.rx * r, q.y + Math.sin(ang) * q.ry * r]);
	}
	return puntos;
}

// Árboles por el borde de atrás y a los lados (no tapan el edificio)
function arbolesMeseta(q, semilla, cuantos) {
	const az = crearAzar(semilla);
	const lista = [];
	for (let k = 0; k < cuantos; k++) {
		const ang = Math.PI * (1.05 + (k / (cuantos - 1)) * 0.9) + (az() - 0.5) * 0.12;
		const r = 0.8 + az() * 0.1;
		lista.push({ x: q.x + Math.cos(ang) * q.rx * r, y: q.y + Math.sin(ang) * q.ry * r, tam: 15 + az() * 8 });
	}
	for (const lado of [-1, 1]) lista.push({ x: q.x + lado * q.rx * 0.8, y: q.y + q.ry * 0.3, tam: 17 + az() * 6 });
	return lista.sort((p1, p2) => p1.y - p2.y);
}

const mesetas = modulos.map((m, i) => {
	const q = LUGARES_MAPA[i] || { x: 800 + Math.cos(i * 1.1) * 640, y: 500 + Math.sin(i * 1.1) * 370, rx: 140, ry: 80 };
	return { ...q, contorno: contornoMeseta(q, 101 + i * 17), arboles: arbolesMeseta(q, 7 + i * 13, 9) };
});
const mesetaCentro = { ...CENTRO_MAPA, contorno: contornoMeseta(CENTRO_MAPA, 999), arboles: arbolesMeseta(CENTRO_MAPA, 555, 15) };

// Dónde se para la ficha del héroe, y dónde llega el camino
const lugarHeroeMapa = (i) => (mesetas[i] ? { x: mesetas[i].x - mesetas[i].rx * 0.42, y: mesetas[i].y + mesetas[i].ry * 0.42 } : { x: 800, y: 500 });
const puntaCamino = (q) => ({ x: q.x - q.rx * 0.12, y: q.y + q.ry * 0.5 });

const azarMapa = crearAzar(4242);
const OLAS_MAPA = Array.from({ length: 110 }, () => ({ x: azarMapa() * MAPA_ANCHO, y: azarMapa() * MAPA_ALTO, fase: azarMapa() * 6 }));
const NUBES_MAPA = Array.from({ length: 7 }, (_, k) => ({ x: azarMapa() * 2000, y: 60 + k * 135, tam: 0.7 + azarMapa() * 0.6, vel: 8 + azarMapa() * 10 }));

// Vista actual: escala k y desplazamiento (ox, oy) de unidades del mapa a
// pantalla. En la vista general entra todo el mapa; acercado, la meseta
// del mundo llena la pantalla. En celular vertical el rectángulo del
// centro va abajo (style.css), así que el mapa usa solo la parte de arriba.
function vistaMapa() {
	const vertical = H > W && W <= 700;
	const altoUtil = vertical ? Math.max(H * 0.45, H - 330) : H;
	const k0 = Math.min(W / (MAPA_ANCHO + 40), altoUtil / (MAPA_ALTO + 40));
	let cx = MAPA_ANCHO / 2;
	let cy = MAPA_ALTO / 2;
	let k = k0;
	let py = altoUtil / 2;
	if (mapa.foco >= 0) {
		const e = suave(0, 1, mapa.z);
		const q = mesetas[mapa.foco];
		const kz = Math.min(W / (q.rx * 2 * 1.3), (H - 90) / ((q.ry * 2 + ACANTILADO + 230) * 1.08));
		cx = lerp(cx, q.x, e);
		cy = lerp(cy, q.y - 55, e);
		k = lerp(k0, Math.max(k0, kz), e);
		py = lerp(py, H / 2 + 30, e);
	}
	return { k, k0, ox: W / 2 - cx * k, oy: py - cy * k, vertical };
}

// Qué mundo hay bajo un punto de la pantalla (-1 = ninguno)
function mundoEnPantalla(px, py) {
	const v = vistaMapa();
	const x = (px - v.ox) / v.k;
	const y = (py - v.oy) / v.k;
	for (let i = 0; i < mesetas.length; i++) {
		const q = mesetas[i];
		const dx = (x - q.x) / q.rx;
		const dy = (y - (q.y - 30)) / (q.ry + 60); // incluye el edificio y la medalla
		if (dx * dx + dy * dy <= 1) return i;
	}
	return -1;
}

// El rectángulo del centro (HTML) va sobre la meseta central y se escala
// con el mapa. Solo se toca el estilo si cambió.
let posPanel = "";
function ubicarPanelMapa(v) {
	const x = v.ox + CENTRO_MAPA.x * v.k0;
	const y = v.oy + CENTRO_MAPA.y * v.k0;
	const k = clamp(Math.min((CENTRO_MAPA.rx * 2 * v.k0 * 0.8) / 380, (CENTRO_MAPA.ry * 2 * v.k0 * 0.9) / 390), 0.55, 1.1);
	const clave = `${x.toFixed(0)},${y.toFixed(0)},${k.toFixed(3)}`;
	if (clave === posPanel) return;
	posPanel = clave;
	ui.panel.style.setProperty("--mapa-x", x.toFixed(0) + "px");
	ui.panel.style.setProperty("--mapa-y", y.toFixed(0) + "px");
	ui.panel.style.setProperty("--mapa-k", k.toFixed(3));
}

let cacheAgua = null;
function degradadoAgua() {
	if (cacheAgua && cacheAgua.H === H) return cacheAgua.g;
	const g = ctx.createLinearGradient(0, 0, 0, H);
	g.addColorStop(0, mezclar(COLORES.verdeInstitucional, "#ffffff", 0.12));
	g.addColorStop(1, mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.5));
	cacheAgua = { H, g };
	return g;
}

function trazarContorno(puntos, dx, dy, escala, cx, cy) {
	ctx.beginPath();
	puntos.forEach(([x, y], k) => {
		const px = cx + (x - cx) * escala + dx;
		const py = cy + (y - cy) * escala + dy;
		if (k === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	});
	ctx.closePath();
}

// Meseta: espuma en el agua, pared de roca (beige, con vetas) y pasto
// arriba. apagado (0..1): gris mientras el mundo tiene candado.
function dibujarMesetaBase(q, apagado) {
	const c = q.contorno;
	const espuma = 1.06 + 0.012 * Math.sin(tiempo * 2 + q.x);
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	trazarContorno(c, 0, ACANTILADO + 6, espuma, q.x, q.y);
	ctx.fill();

	// Pared: la mitad de abajo de la orilla, bajada ACANTILADO
	const mitad = PUNTOS_MESETA / 2;
	ctx.beginPath();
	for (let k = 0; k <= mitad; k++) ctx.lineTo(c[k][0], c[k][1]);
	for (let k = mitad; k >= 0; k--) ctx.lineTo(c[k][0], c[k][1] + ACANTILADO);
	ctx.closePath();
	const roca = mezclar(COLORES.beige, "#b9b9b9", apagado * 0.6);
	ctx.fillStyle = roca;
	ctx.fill();
	ctx.save();
	ctx.clip();
	ctx.strokeStyle = mezclar(roca, COLORES.verdeProfundo, 0.28);
	ctx.lineWidth = 5;
	for (let x = q.x - q.rx * 1.1; x < q.x + q.rx * 1.1; x += 17) linea(x, q.y, x + 3, q.y + q.ry + ACANTILADO + 10);
	ctx.fillStyle = "rgba(4,37,35,0.18)"; // sombra bajo el pasto
	ctx.fillRect(q.x - q.rx * 1.2, q.y, q.rx * 2.4, q.ry * 2);
	ctx.restore();

	// Pasto: base, centro más claro y borde
	const pasto = mezclar(mezclar(COLORES.verdeInstitucional, "#ffffff", 0.16), "#c4c8c7", apagado * 0.75);
	ctx.fillStyle = pasto;
	trazarContorno(c, 0, 0, 1, q.x, q.y);
	ctx.fill();
	ctx.strokeStyle = mezclar(pasto, COLORES.verdeProfundo, 0.45);
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = mezclar(pasto, "#ffffff", 0.16);
	trazarContorno(c, 0, -4, 0.8, q.x, q.y);
	ctx.fill();
}

function dibujarArbolMapa(a, apagado) {
	ctx.fillStyle = "rgba(4,37,35,0.22)";
	ctx.beginPath();
	ctx.ellipse(a.x, a.y + 4, a.tam * 0.9, a.tam * 0.35, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = mezclar("#6f5238", "#9a9a9a", apagado);
	ctx.fillRect(a.x - 3, a.y - a.tam * 0.6, 6, a.tam * 0.7);
	ctx.fillStyle = mezclar(mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.45), "#a2a6a5", apagado * 0.7);
	circulo(a.x, a.y - a.tam * 1.05, a.tam);
	ctx.fillStyle = mezclar(mezclar(COLORES.verdeInstitucional, "#ffffff", 0.2), "#c9cccb", apagado * 0.7);
	circulo(a.x - a.tam * 0.3, a.y - a.tam * 1.3, a.tam * 0.45);
}

// Íconos simples para la fachada de cada edificio (mundo.js → icono)
function dibujarIconoMundo(tipo, cx, cy, r, col) {
	ctx.save();
	ctx.fillStyle = col;
	ctx.strokeStyle = col;
	ctx.lineWidth = r * 0.18;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	if (tipo === "montana") {
		ctx.beginPath();
		ctx.moveTo(cx - r, cy + r * 0.7);
		ctx.lineTo(cx - r * 0.2, cy - r * 0.6);
		ctx.lineTo(cx + r * 0.2, cy);
		ctx.lineTo(cx + r * 0.45, cy - r * 0.35);
		ctx.lineTo(cx + r, cy + r * 0.7);
		ctx.closePath();
		ctx.fill();
	} else if (tipo === "tablero") {
		for (let c = 0; c < 3; c++) {
			const x = cx - r + c * r * 0.72;
			ctx.fillRect(x, cy - r * 0.8, r * 0.56, r * 0.22);
			for (let n = 0; n < 3 - c; n++) ctx.fillRect(x, cy - r * 0.45 + n * r * 0.42, r * 0.56, r * 0.32);
		}
	} else if (tipo === "engranes") {
		ctx.beginPath();
		for (let k = 0; k < 16; k++) {
			const ang = (k / 16) * Math.PI * 2;
			const rr = k % 2 ? r * 0.72 : r;
			ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
		}
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = COLORES.blanco;
		circulo(cx, cy, r * 0.3);
	} else if (tipo === "nube") {
		circulo(cx - r * 0.45, cy + r * 0.15, r * 0.45);
		circulo(cx + r * 0.1, cy - r * 0.2, r * 0.6);
		circulo(cx + r * 0.55, cy + r * 0.2, r * 0.42);
		ctx.fillRect(cx - r * 0.45, cy + r * 0.15, r, r * 0.47);
	} else if (tipo === "escudo") {
		ctx.beginPath();
		ctx.moveTo(cx, cy - r);
		ctx.lineTo(cx + r * 0.85, cy - r * 0.65);
		ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.55, cx, cy + r);
		ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.55, cx - r * 0.85, cy - r * 0.65);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = COLORES.blanco;
		ctx.beginPath();
		ctx.moveTo(cx - r * 0.38, cy);
		ctx.lineTo(cx - r * 0.08, cy + r * 0.3);
		ctx.lineTo(cx + r * 0.42, cy - r * 0.3);
		ctx.stroke();
	} else if (tipo === "chispa") {
		const estrella = (x, y, rr) => {
			ctx.beginPath();
			ctx.moveTo(x, y - rr);
			ctx.quadraticCurveTo(x, y, x + rr, y);
			ctx.quadraticCurveTo(x, y, x, y + rr);
			ctx.quadraticCurveTo(x, y, x - rr, y);
			ctx.quadraticCurveTo(x, y, x, y - rr);
			ctx.fill();
		};
		estrella(cx - r * 0.15, cy + r * 0.1, r * 0.85);
		estrella(cx + r * 0.62, cy - r * 0.55, r * 0.38);
	} else {
		ctx.fillRect(cx - r * 0.6, cy - r * 0.8, r * 1.2, r * 1.6);
	}
	ctx.restore();
}

// Halo verde (de Celaque) alrededor del edificio de un mundo abierto:
// ilumina el contorno de la foto y disimula dónde termina. Sale de la
// silueta original (sin bordes desvanecidos), así brilla justo donde la
// foto se funde. Verde institucional aclarado: sobre el pasto y el agua del
// mapa (también verdes) el puro no se distinguiría.
const VERDE_AURA = mezclar(COLORES.verdeInstitucional, COLORES.blanco, 0.6);

// Se arma una sola vez por foto (difuminar cada cuadro sería caro):
// la silueta, difuminada y pintada de verde, en un lienzo con margen
function haloDeFoto(f) {
	if (f.halo) return f.halo;
	const fuente = f.original || f.elemento;
	const w = fuente.width;
	const h = fuente.height;
	const m = Math.round(Math.max(w, h) * 0.07);
	const c = document.createElement("canvas");
	c.width = w + m * 2;
	c.height = h + m * 2;
	const g = c.getContext("2d");
	g.filter = `blur(${(m / 2.2).toFixed(1)}px)`;
	g.drawImage(fuente, m, m);
	g.drawImage(fuente, m, m); // dos veces: el borde difuminado queda más intenso
	g.filter = "none";
	g.globalCompositeOperation = "source-in";
	g.fillStyle = VERDE_AURA;
	g.fillRect(0, 0, c.width, c.height);
	f.halo = { lienzo: c, margen: m / w };
	return f.halo;
}

// fuerza (0..1) es 1 - apagado: aparece poco a poco al quitarle el
// candado. Acercado late más fuerte (es lo que hay que tocar).
function dibujarHalo(f, x, y, w, h, fuerza, acercado) {
	if (fuerza <= 0) return;
	const halo = haloDeFoto(f);
	const m = halo.margen * w;
	const pulso = 0.8 + 0.2 * Math.sin(tiempo * (acercado > 0 ? 4 : 2.2) + x);
	ctx.save();
	ctx.globalAlpha = fuerza * Math.min(1, pulso + 0.25 * acercado);
	ctx.drawImage(halo.lienzo, x - m, y - m, w + m * 2, h + m * 2);
	ctx.restore();
}

// Edificio de un módulo sobre su meseta (con candado: apagado y gris)
function dibujarEdificioMapa(bx, by, m, i, apagado, acercado) {
	// Con foto real (mundo.js → foto) se dibuja el edificio de verdad
	const foto = m.fotoImg && m.fotoImg.elemento;
	if (foto) {
		const k = Math.min(210 / foto.height, 200 / foto.width);
		const w = foto.width * k;
		const h = foto.height * k;
		ctx.fillStyle = "rgba(4,37,35,0.25)";
		ctx.beginPath();
		ctx.ellipse(bx, by + 2, w * 0.55, 12, 0, 0, Math.PI * 2);
		ctx.fill();
		dibujarHalo(m.fotoImg, bx - w / 2, by - h, w, h, 1 - apagado, acercado);
		ctx.save();
		ctx.imageSmoothingQuality = "high"; // la foto se achica mucho: sin esto se ve granulada
		if (apagado > 0) ctx.filter = `grayscale(${apagado.toFixed(2)}) brightness(${(1 - 0.15 * apagado).toFixed(2)})`;
		ctx.drawImage(foto, bx - w / 2, by - h, w, h);
		ctx.restore();
		return;
	}
	const w = 124;
	const h = 108 + (i % 3) * 16;
	const col = mezclar(m.color, "#9aa0a0", apagado * 0.7);
	ctx.fillStyle = "rgba(4,37,35,0.25)";
	ctx.beginPath();
	ctx.ellipse(bx, by + 2, w * 0.65, 12, 0, 0, Math.PI * 2);
	ctx.fill();
	if (acercado > 0 && !apagado) {
		// Al acercar, el edificio late: es lo que hay que tocar
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);
		ctx.save();
		ctx.globalAlpha = acercado;
		ctx.shadowColor = conAlfa(COLORES.blanco, 0.9);
		ctx.shadowBlur = 20 + 18 * pulso;
		ctx.fillStyle = col;
		ctx.fillRect(bx - w / 2, by - h, w, h);
		ctx.restore();
	}
	ctx.fillStyle = col;
	ctx.fillRect(bx - w / 2, by - h, w, h);
	ctx.fillStyle = "rgba(0,0,0,0.16)";
	ctx.fillRect(bx + w * 0.3, by - h, w * 0.2, h);
	ctx.fillStyle = mezclar(COLORES.verdeProfundo, "#7b8180", apagado * 0.6);
	ctx.fillRect(bx - w / 2 - 6, by - h - 10, w + 12, 12);
	ctx.fillRect(bx + w * 0.18, by - h - 26, 4, 16); // antena
	// Ventanas: encendidas al completarlo, claras si está abierto
	for (let y = by - h + 54; y < by - 42; y += 20) {
		for (let c = 0; c < 4; c++) {
			ctx.fillStyle = apagado
				? "rgba(40,52,54,0.55)"
				: m.completo
					? (c + y) % 3 === 0
						? "rgba(255,255,255,0.9)"
						: "rgba(255,232,160,0.95)"
					: "rgba(227,238,235,0.85)";
			ctx.fillRect(bx - w / 2 + 12 + c * 27, y, 18, 12);
		}
	}
	// Ícono del sistema en un círculo blanco
	ctx.fillStyle = mezclar(COLORES.blanco, "#c9cccb", apagado);
	circulo(bx, by - h + 26, 20);
	dibujarIconoMundo(m.icono, bx, by - h + 26, 12, col);
	// Puerta
	ctx.fillStyle = mezclar(COLORES.verdeProfundo, "#7b8180", apagado * 0.6);
	ctx.fillRect(bx - 17, by - 38, 34, 38);
	ctx.fillStyle = apagado ? "#5d6667" : m.completo ? "#fff1c1" : mezclar(COLORES.fondoVerdeClaro, COLORES.verdeInstitucional, 0.3 + 0.3 * Math.sin(tiempo * 3));
	ctx.fillRect(bx - 13, by - 34, 26, 34);
}

// Talento: el camino por la zona industrial y la Cueva, en miniatura
// Foto del edificio de Talento, detrás de su escena (la tapan el camino y la cueva)
function dibujarFotoEscenaTalento(f, x, y, apagado) {
	const foto = f.elemento;
	const k = 170 / foto.height;
	const w = foto.width * k;
	dibujarHalo(f, x - w / 2, y - 170, w, 170, 1 - apagado, 0);
	ctx.save();
	ctx.imageSmoothingQuality = "high";
	if (apagado > 0) ctx.filter = `grayscale(${apagado.toFixed(2)})`;
	ctx.drawImage(foto, x - w / 2, y - 170, w, 170);
	ctx.restore();
}

function dibujarEscenaTalento(bx, by, acercado) {
	// Montaña de fondo (Celaque)
	ctx.fillStyle = mezclar(COLORES.verdeInstitucional, COLORES.verdeProfundo, 0.55);
	ctx.beginPath();
	ctx.moveTo(bx - 40, by - 30);
	ctx.lineTo(bx + 50, by - 150);
	ctx.lineTo(bx + 90, by - 110);
	ctx.lineTo(bx + 120, by - 135);
	ctx.lineTo(bx + 190, by - 30);
	ctx.fill();
	// Fábrica con chimenea que echa humo
	ctx.fillStyle = "#8a9294";
	ctx.fillRect(bx - 150, by - 62, 70, 52);
	ctx.fillStyle = "#6f777a";
	ctx.fillRect(bx - 136, by - 104, 14, 44);
	ctx.fillStyle = "#ffe8a0";
	for (let k = 0; k < 3; k++) ctx.fillRect(bx - 142 + k * 20, by - 48, 12, 10);
	for (let k = 0; k < 3; k++) {
		const t = (tiempo * 0.5 + k / 3) % 1;
		ctx.fillStyle = `rgba(240,244,243,${(0.8 * (1 - t)).toFixed(3)})`;
		circulo(bx - 129 + t * 18, by - 110 - t * 46, 8 + t * 10);
	}
	// Camino hacia la cueva
	ctx.strokeStyle = mezclar(COLORES.beige, "#ffffff", 0.45);
	ctx.lineWidth = 18;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(bx - 170, by + 12);
	ctx.quadraticCurveTo(bx - 40, by + 26, bx + 60, by - 4);
	ctx.stroke();
	ctx.lineCap = "butt";
	// Cueva: roca con la boca oscura y cristales
	ctx.fillStyle = "#7d6f62";
	ctx.beginPath();
	ctx.ellipse(bx + 80, by - 4, 70, 60, 0, Math.PI, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#1c1612";
	ctx.beginPath();
	ctx.ellipse(bx + 80, by - 2, 30, 34, 0, Math.PI, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#7fd6c8";
	for (const [x, y] of [
		[bx + 36, by - 30],
		[bx + 124, by - 24],
	]) {
		ctx.beginPath();
		ctx.moveTo(x, y - 10);
		ctx.lineTo(x + 5, y);
		ctx.lineTo(x, y + 6);
		ctx.lineTo(x - 5, y);
		ctx.fill();
	}
	// Tubo verde (la entrada a la cueva)
	ctx.fillStyle = "#2f9e62";
	ctx.fillRect(bx - 44, by - 40, 30, 40);
	ctx.fillStyle = "#3fbf78";
	ctx.fillRect(bx - 50, by - 50, 42, 13);
	if (acercado > 0) {
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);
		ctx.strokeStyle = conAlfa(COLORES.blanco, acercado * (0.4 + 0.5 * pulso));
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.ellipse(bx + 10, by - 50, 190, 110, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
}

// Candado (cerrado) o medalla con el número del mundo / ✓ al completarlo
function dibujarMedallaMundo(x, y, i, m, candado, abrir) {
	const bote = Math.sin(tiempo * 2.5 + i) * 3;
	if (candado || abrir < 1.4) {
		const p = candado ? 0 : abrir;
		const sacude = (mapa.sacudir[i] || 0) > 0 ? Math.sin(tiempo * 60) * 6 : p < 0.8 ? Math.sin(tiempo * 50) * 4 * (p / 0.8) : 0;
		const sube = p > 0.8 ? (p - 0.8) / 0.6 : 0; // 0..1: el candado se suelta y desaparece
		ctx.save();
		ctx.globalAlpha = 1 - sube;
		ctx.translate(x + sacude, y + bote - sube * 40);
		ctx.strokeStyle = COLORES.grisClaro;
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.arc(0, -14 - sube * 14, 13, Math.PI, Math.PI * 2);
		ctx.lineTo(13, -6 - sube * 14);
		ctx.stroke();
		ctx.fillStyle = COLORES.beige;
		rectRedondo(-21, -14, 42, 34, 7);
		ctx.fill();
		ctx.strokeStyle = mezclar(COLORES.beige, COLORES.verdeProfundo, 0.4);
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = COLORES.verdeProfundo;
		circulo(0, 0, 5);
		ctx.fillRect(-2, 0, 4, 10);
		ctx.restore();
		if (p > 0.8) {
			// Destello al abrirse
			const t = Math.min(1, (p - 0.8) / 0.8);
			ctx.strokeStyle = conAlfa(COLORES.blanco, 1 - t);
			ctx.lineWidth = 6;
			ctx.beginPath();
			ctx.arc(x, y, 20 + t * 90, 0, Math.PI * 2);
			ctx.stroke();
		}
		if (candado || p < 0.9) return;
	}
	const aparece = abrir < 1.8 ? suave(0.9, 1.6, abrir) : 1;
	ctx.save();
	ctx.translate(x, y + bote);
	ctx.scale(aparece, aparece);
	ctx.fillStyle = m.completo ? COLORES.verdeInstitucional : COLORES.verdeProfundo;
	circulo(0, 0, 26);
	ctx.strokeStyle = COLORES.beige;
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.arc(0, 0, 26, 0, Math.PI * 2);
	ctx.stroke();
	ctx.strokeStyle = "rgba(255,255,255,0.35)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(0, 0, 19, 0, Math.PI * 2);
	ctx.stroke();
	if (m.completo) {
		ctx.strokeStyle = COLORES.blanco;
		ctx.lineWidth = 6;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(-10, 1);
		ctx.lineTo(-3, 9);
		ctx.lineTo(11, -8);
		ctx.stroke();
		ctx.lineCap = "butt";
	} else {
		ctx.fillStyle = COLORES.blanco;
		ctx.font = `700 26px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(String(i + 1), 0, 2);
	}
	ctx.restore();
}

function dibujarLetreroMapa(x, y, texto, apagado) {
	ctx.font = `700 22px ${FUENTE}`;
	const ancho = ctx.measureText(texto).width + 30;
	ctx.fillStyle = apagado ? "#7b8180" : COLORES.verdeProfundo;
	rectRedondo(x - ancho / 2, y - 17, ancho, 34, 10);
	ctx.fill();
	ctx.strokeStyle = COLORES.blanco;
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.fillStyle = COLORES.blanco;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, x, y + 1);
}

// 1 = gris (con candado), 0 = con color; mientras el candado se abre, se va pintando
function apagadoMundo(i) {
	if (!desbloqueado(i)) return 1;
	return mapa.abriendo === i ? 1 - suave(0.8, 1.5, mapa.abrirT) : 0;
}

// Lo que va sobre la meseta (ya dibujada, igual que los caminos)
function dibujarMundoMapa(q, m, i) {
	const abrir = mapa.abriendo === i ? mapa.abrirT : 99;
	const candado = !desbloqueado(i);
	const apagado = apagadoMundo(i);
	const acercado = mapa.foco === i ? suave(0.6, 1, mapa.z) : 0;
	if (mapa.hover === i || (mapa.sel === i && mapa.foco < 0)) {
		ctx.strokeStyle = conAlfa(COLORES.blanco, 0.55 + 0.35 * Math.sin(tiempo * 5));
		ctx.lineWidth = 6;
		trazarContorno(q.contorno, 0, 0, 1.02, q.x, q.y);
		ctx.stroke();
	}
	const bx = q.x + q.rx * 0.12;
	const by = q.y + q.ry * 0.22;
	for (const a of q.arboles) if (a.y < by) dibujarArbolMapa(a, apagado);
	if (m.completoAlSalirDeLaCueva) {
		// Su edificio queda atrás, entre la fábrica y la montaña
		if (m.fotoImg && m.fotoImg.elemento) dibujarFotoEscenaTalento(m.fotoImg, bx - 60, by - 14, apagado);
		dibujarEscenaTalento(bx - 10, by, acercado);
	}
	else dibujarEdificioMapa(bx, by, m, i, apagado, acercado);
	for (const a of q.arboles) if (a.y >= by) dibujarArbolMapa(a, apagado);
	dibujarAnfitrionMapa(q, m, apagado);
	dibujarLetreroMapa(q.x, q.y + q.ry + ACANTILADO * 0.5, m.nombre.toUpperCase(), apagado > 0.5);
	const mx = q.x - q.rx * 0.6;
	const my = q.y - q.ry * 0.5 - 18;
	dibujarMedallaMundo(mx, my, i, m, candado, abrir);
	// Flecha sobre el mundo señalado (vista general)
	if (mapa.sel === i && mapa.foco < 0) {
		const y = my - 46 + Math.sin(tiempo * 5) * 5;
		ctx.fillStyle = COLORES.blanco;
		ctx.strokeStyle = COLORES.verdeProfundo;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(mx - 13, y - 10);
		ctx.lineTo(mx + 13, y - 10);
		ctx.lineTo(mx, y + 6);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
}

// Caminos entre mundos (en orden) y de la meseta central al primero.
// Hacia un mundo con candado: gris y punteado.
function dibujarCaminosMapa() {
	const tramos = [[puntaCamino({ ...CENTRO_MAPA, rx: CENTRO_MAPA.rx * 1.6, ry: CENTRO_MAPA.ry * 1.05 }), puntaCamino(mesetas[0]), 0]];
	for (let i = 0; i + 1 < mesetas.length; i++) tramos.push([puntaCamino(mesetas[i]), puntaCamino(mesetas[i + 1]), i + 1]);
	ctx.lineCap = "round";
	for (const [a, b, destino] of tramos) {
		const abierto = desbloqueado(destino) && mapa.abriendo !== destino;
		const mx = (a.x + b.x) / 2;
		const my = (a.y + b.y) / 2;
		// Curva hacia afuera del centro del mapa
		const ox = mx - MAPA_ANCHO / 2;
		const oy = my - MAPA_ALTO / 2;
		const largo = Math.hypot(ox, oy) || 1;
		const empuje = Math.hypot(b.x - a.x, b.y - a.y) * 0.18;
		const cx = mx + (ox / largo) * empuje;
		const cy = my + (oy / largo) * empuje;
		const trazar = () => {
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.quadraticCurveTo(cx, cy, b.x, b.y);
			ctx.stroke();
		};
		ctx.strokeStyle = conAlfa(COLORES.verdeProfundo, 0.45);
		ctx.lineWidth = 30;
		trazar();
		ctx.strokeStyle = abierto ? mezclar(COLORES.beige, "#ffffff", 0.55) : COLORES.grisClaro;
		ctx.lineWidth = 21;
		trazar();
		ctx.setLineDash([10, 16]);
		ctx.strokeStyle = abierto ? "rgba(255,255,255,0.8)" : "rgba(4,37,35,0.25)";
		ctx.lineWidth = 4;
		trazar();
		ctx.setLineDash([]);
	}
	ctx.lineCap = "butt";
}

// Meseta central: plaza de Celaque (el rectángulo HTML va encima)
function dibujarCentroMapa() {
	const q = mesetaCentro;
	dibujarMesetaBase(q, 0);
	for (const a of q.arboles) dibujarArbolMapa(a, 0);
	ctx.fillStyle = mezclar(COLORES.beige, "#ffffff", 0.55);
	ctx.beginPath();
	ctx.ellipse(q.x, q.y + 10, q.rx * 0.72, q.ry * 0.62, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = conAlfa(COLORES.beige, 0.7);
	ctx.lineWidth = 3;
	ctx.stroke();
}

function dibujarOlasMapa() {
	ctx.strokeStyle = conAlfa(COLORES.fondoVerdeClaro, 0.35);
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	for (const o of OLAS_MAPA) {
		const x = o.x + Math.sin(tiempo * 0.8 + o.fase) * 8;
		ctx.beginPath();
		ctx.arc(x, o.y, 9, Math.PI * 1.15, Math.PI * 1.85);
		ctx.arc(x + 16, o.y, 9, Math.PI * 1.15, Math.PI * 1.85);
		ctx.stroke();
	}
	ctx.lineCap = "butt";
}

function dibujarNubesMapa() {
	for (const n of NUBES_MAPA) {
		const x = modulo(n.x + tiempo * n.vel, MAPA_ANCHO + 400) - 200;
		const r = 26 * n.tam;
		ctx.fillStyle = "rgba(255,255,255,0.9)";
		circulo(x, n.y, r);
		circulo(x + r * 0.95, n.y + r * 0.25, r * 0.75);
		circulo(x - r * 0.95, n.y + r * 0.3, r * 0.65);
		ctx.fillRect(x - r * 1.5, n.y + r * 0.2, r * 3.1, r * 0.7);
	}
}

// El personaje fijo de cada mundo, parado en su meseta con su nombre
function dibujarAnfitrionMapa(q, m, apagado) {
	const n = m.anfitrionNpc;
	if (!n) return;
	const x = q.x + q.rx * 0.62;
	const pie = q.y + q.ry * 0.52;
	ctx.save();
	if (apagado > 0.5) ctx.globalAlpha = 0.6;
	S = 0.6;
	dibujarNpcFoto(x, pie, n, -1);
	S = 1;
	dibujarPlacaImportante(x, pie - 92, n.nombre);
	ctx.restore();
}

// Un punto del mar lejos de las mesetas (para el delfín), o null
function lugarDeMar() {
	const lejos = (q, x, y) => ((x - q.x) / (q.rx + 110)) ** 2 + ((y - q.y) / (q.ry + ACANTILADO + 90)) ** 2 > 1;
	for (let k = 0; k < 25; k++) {
		const x = 80 + Math.random() * (MAPA_ANCHO - 160);
		const y = 90 + Math.random() * (MAPA_ALTO - 160);
		if (lejos(mesetaCentro, x, y) && mesetas.every((q) => lejos(q, x, y))) return { x, y };
	}
	return null;
}

function dibujarDelfin() {
	const d = mapa.delfin;
	if (d.t < 0) return;
	const p = d.t;
	// Salpicadura al salir y al entrar al agua
	for (const [cuando, lado] of [
		[p, -1],
		[1 - p, 1],
	]) {
		if (cuando > 0.25) continue;
		const a = 1 - cuando / 0.25;
		ctx.strokeStyle = `rgba(255,255,255,${(0.85 * a).toFixed(3)})`;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.ellipse(d.x + lado * 70 * d.dir, d.y, 14 + (1 - a) * 22, 5 + (1 - a) * 6, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
	const x = d.x + (p - 0.5) * 140 * d.dir;
	const y = d.y - Math.sin(p * Math.PI) * 80;
	d.cx = x;
	d.cy = y;
	const ang = Math.atan2(-80 * Math.PI * Math.cos(p * Math.PI), 140 * d.dir);
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(ang);
	ctx.scale(1, d.dir);
	ctx.fillStyle = "#6f8fa6";
	ctx.beginPath();
	ctx.moveTo(-6, -9);
	ctx.lineTo(4, -23);
	ctx.lineTo(10, -8);
	ctx.fill(); // aleta
	ctx.beginPath();
	ctx.moveTo(-28, 0);
	ctx.lineTo(-42, -10);
	ctx.lineTo(-38, 0);
	ctx.lineTo(-42, 10);
	ctx.closePath();
	ctx.fill(); // cola
	ctx.beginPath();
	ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.ellipse(31, 2, 8, 4, 0, 0, Math.PI * 2);
	ctx.fill(); // hocico
	ctx.fillStyle = "#dfe8ee";
	ctx.beginPath();
	ctx.ellipse(4, 5, 22, 4.5, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#1a1a1a";
	circulo(20, -3, 2);
	ctx.restore();
}

// ¿El toque cayó sobre el delfín? (en px de pantalla)
function delfinEnPantalla(px, py) {
	const d = mapa.delfin;
	if (d.t < 0) return false;
	const v = vistaMapa();
	return Math.hypot((px - v.ox) / v.k - d.cx, (py - v.oy) / v.k - d.cy) < 45;
}

// Ficha del héroe elegido, parada (o caminando) sobre su mundo
function dibujarHeroeMapa() {
	if (mapa.heroeX === null) return;
	const sAntes = S;
	S = 0.62;
	const o = {
		...aparienciaHeroe(personaje, 1, { dir: mapa.dir, fase: mapa.fase, moviendo: mapa.moviendo, marcha: mapa.moviendo ? 0.45 : 0 }),
		agachado: false,
		atacando: false,
		// Modo fácil: brilla; al activarlo, un destello más fuerte que se apaga
		brillo: modoFacil() ? 1 + 1.5 * mapa.powerUpT : 0,
	};
	// Destello al activar el modo fácil: 2 anillos dorados que se abren
	for (let i = 0; i < 2; i++) {
		const avance = 1 - mapa.powerUpT / 1.2 - i * 0.25;
		if (mapa.powerUpT <= 0 || avance <= 0 || avance >= 1) continue;
		ctx.strokeStyle = `rgba(255,214,90,${(0.8 * (1 - avance)).toFixed(3)})`;
		ctx.lineWidth = 4 * S * (1 - avance) + 1;
		ctx.beginPath();
		ctx.arc(mapa.heroeX, mapa.heroeY - 55 * S, (30 + 90 * avance) * S, 0, Math.PI * 2);
		ctx.stroke();
	}
	const sprites = SPRITES_POR_PERSONAJE[personaje];
	if (!(sprites && dibujarHeroeSprite(mapa.heroeX, mapa.heroeY, o, sprites, 1))) dibujarPersona(mapa.heroeX, mapa.heroeY, o);
	S = sAntes;
}

// Aviso del mapa (candado, mundo desbloqueado), arriba al centro
function dibujarMensajeMapa() {
	if (mapa.mensajeT <= 0) return;
	const alfa = Math.min(1, mapa.mensajeT / 0.4);
	ctx.save();
	ctx.globalAlpha = alfa;
	ctx.font = `700 ${Math.round(clamp(W / 50, 15, 22))}px ${FUENTE}`;
	const ancho = Math.min(W - 32, ctx.measureText(mapa.mensaje).width + 40);
	const y = mapa.foco >= 0 ? 92 : 24;
	ctx.fillStyle = COLORES.blanco;
	rectRedondo(W / 2 - ancho / 2, y, ancho, 46, 14);
	ctx.fill();
	ctx.strokeStyle = COLORES.verdeInstitucional;
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(mapa.mensaje, W / 2, y + 24, ancho - 24);
	ctx.restore();
}

function dibujarMapa(dt) {
	const v = vistaMapa();
	ubicarPanelMapa(v);
	ctx.fillStyle = degradadoAgua();
	ctx.fillRect(0, 0, W, H);
	ctx.setTransform(DPR * v.k, 0, 0, DPR * v.k, DPR * v.ox, DPR * v.oy);
	const sAntes = S;
	S = 1;
	dibujarOlasMapa();
	dibujarDelfin();
	dibujarCentroMapa();
	mesetas.forEach((q, i) => dibujarMesetaBase(q, apagadoMundo(i)));
	dibujarCaminosMapa();
	mesetas.forEach((q, i) => dibujarMundoMapa(q, modulos[i], i));
	dibujarHeroeMapa();
	dibujarNubesMapa();
	S = sAntes;
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
	dibujarAves(dt, true); // guacamayas y loros sobre el mar
	dibujarMensajeMapa();
}
