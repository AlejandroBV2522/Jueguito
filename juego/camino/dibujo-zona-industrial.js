/* Camino a Celaque — dibujo de la zona industrial. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: zona industrial ----------
// Color de un edificio en un punto del camino: gris al inicio, su color
// propio (vivo) al acercarse a Celaque.
const GRIS_INDUSTRIA = "#6b6e73";
const pintar = (vivo, t, alfa) => mezclar(GRIS_INDUSTRIA, vivo, t, alfa);

// Bocanadas de humo saliendo de una chimenea: espeso y oscuro al inicio
// (smog), blanco y ligero cuando el mundo ya tiene color.
function dibujarHumo(x, y, s, t, semilla) {
	for (let k = 0; k < 4; k++) {
		const f = modulo(tiempo * 0.22 + k / 4 + semilla, 1);
		ctx.fillStyle = color("humo", t, 0.6 * (1 - f) * (1 - 0.45 * t));
		circulo(x + f * 34 * s + Math.sin(f * 6 + semilla * 10) * 4 * s, y - f * 80 * s, (6 + f * 18) * s);
	}
}

// Siluetas de fábricas lejanas con chimeneas humeando (parallax lento).
// Alturas pseudo-azar pero estables por índice, como dibujarSkylineLejano.
function dibujarIndustriaLejana(t) {
	const baseY = SUELO + 2 * S;
	const paso = 120 * S;
	const par = camara * 0.3;
	const off = modulo(par, paso);
	let i = Math.floor(par / paso) - 1;
	for (let sx = -off - paso; sx < W + paso; sx += paso, i++) {
		const semilla = Math.sin(i * 12.9898) * 43758.5453;
		const frac = semilla - Math.floor(semilla);
		const frac2 = modulo(frac * 7.31, 1);
		const alto = (110 + frac * 170) * S;
		const ancho = (90 + frac2 * 60) * S;
		const vivo = COLORES_INDUSTRIA[modulo(i, COLORES_INDUSTRIA.length)];
		// Más desaturado que el primer plano: queda lejos, entre la bruma
		ctx.fillStyle = mezclar("#7d8187", vivo, t * 0.45);
		ctx.fillRect(sx - ancho / 2, baseY - alto, ancho, alto);
		if (frac2 > 0.45) {
			// Chimenea con humo
			const cx = sx - ancho * 0.25;
			const arriba = baseY - alto - 70 * S * frac2;
			ctx.fillRect(cx - 7 * S, arriba, 14 * S, alto);
			dibujarHumo(cx, arriba, S * 0.8, t, frac);
		} else {
			// Techo de dientes de sierra
			ctx.beginPath();
			for (let k = 0; k < 3; k++) {
				const x0 = sx - ancho / 2 + (k * ancho) / 3;
				ctx.moveTo(x0, baseY - alto);
				ctx.lineTo(x0 + ancho / 3, baseY - alto - 22 * S);
				ctx.lineTo(x0 + ancho / 3, baseY - alto);
			}
			ctx.fill();
		}
	}
}

// Bruma de ciudad sobre el horizonte: separa los planos (lejano / medio /
// cercano) y se va despejando a medida que el mundo toma color.
function dibujarBruma(t, fuerza) {
	const g = ctx.createLinearGradient(0, SUELO - 380 * S, 0, SUELO);
	g.addColorStop(0, color("cieloAbajo", t, 0));
	g.addColorStop(1, color("cieloAbajo", t, fuerza * (1 - 0.4 * t)));
	ctx.fillStyle = g;
	ctx.fillRect(0, SUELO - 380 * S, W, 380 * S + 2);
}

function dibujarFabrica(e, sx, base, s, t) {
	const w = (300 + 80 * e.v) * s;
	const h = (240 + 100 * e.v) * s;
	const L = sx - w / 2;
	const techo = base - h * 0.66;

	// Chimeneas de ladrillo (detrás del cuerpo), con franjas blancas
	const n = e.v > 0.45 ? 2 : 1;
	for (let i = 0; i < n; i++) {
		const cx = L + w * (0.14 + 0.2 * i);
		const cw = 20 * s;
		const arriba = base - h - i * 30 * s;
		ctx.fillStyle = pintar("#d64545", t);
		ctx.fillRect(cx - cw / 2, arriba, cw, base - arriba);
		ctx.fillStyle = mezclar("#85888d", "#ffffff", t);
		ctx.fillRect(cx - cw / 2, arriba + 10 * s, cw, 7 * s);
		ctx.fillRect(cx - cw / 2, arriba + 26 * s, cw, 7 * s);
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.fillRect(cx - cw / 2 - 2 * s, arriba - 4 * s, cw + 4 * s, 5 * s);
		dibujarHumo(cx, arriba - 4 * s, s, t, e.v + i * 0.37);
	}

	// Techo de dientes de sierra con ventanales
	const dientes = 4;
	const dw = w / dientes;
	const dh = 38 * s;
	for (let k = 0; k < dientes; k++) {
		const x0 = L + k * dw;
		ctx.fillStyle = pintar(e.acento, t);
		ctx.beginPath();
		ctx.moveTo(x0, techo);
		ctx.lineTo(x0 + dw, techo - dh);
		ctx.lineTo(x0 + dw, techo);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = color("vidrio", t);
		ctx.fillRect(x0 + dw - 9 * s, techo - dh + 8 * s, 7 * s, dh - 8 * s);
	}

	// Cuerpo
	ctx.fillStyle = pintar(e.color, t);
	ctx.fillRect(L, techo, w, base - techo);
	ctx.fillStyle = pintar(e.acento, t);
	ctx.fillRect(L, techo, w, 9 * s);

	// Fila de ventanas
	ctx.fillStyle = color("ventana", t);
	const cols = Math.max(3, Math.floor(w / (36 * s)));
	for (let c = 0; c < cols; c++) {
		const vx = L + (c + 0.5) * (w / cols);
		ctx.fillRect(vx - 10 * s, techo + 24 * s, 20 * s, 24 * s);
	}

	// Portón de carga con láminas
	const pw = w * 0.24;
	const px = L + w * 0.6;
	const ph = h * 0.34;
	ctx.fillStyle = "rgba(0,0,0,0.3)";
	ctx.fillRect(px, base - ph, pw, ph);
	ctx.fillStyle = mezclar("#5d6066", "#e9ecef", t);
	ctx.fillRect(px + 4 * s, base - ph + 4 * s, pw - 8 * s, ph - 4 * s);
	ctx.fillStyle = "rgba(0,0,0,0.18)";
	for (let y = base - ph + 10 * s; y < base; y += 8 * s) ctx.fillRect(px + 4 * s, y, pw - 8 * s, 1.5 * s);

	// Sombra lateral para dar volumen
	ctx.fillStyle = "rgba(0,0,0,0.13)";
	ctx.fillRect(L + w * 0.92, techo, w * 0.08, base - techo);
}

function dibujarBodega(e, sx, base, s, t) {
	const w = (260 + 60 * e.v) * s;
	const h = (190 + 60 * e.v) * s;
	const L = sx - w / 2;
	const arriba = base - h;

	// Techo a dos aguas
	ctx.fillStyle = pintar(e.acento, t);
	ctx.beginPath();
	ctx.moveTo(L - 10 * s, arriba + 26 * s);
	ctx.lineTo(sx, arriba - 22 * s);
	ctx.lineTo(L + w + 10 * s, arriba + 26 * s);
	ctx.closePath();
	ctx.fill();

	// Cuerpo con láminas verticales
	ctx.fillStyle = pintar(e.color, t);
	ctx.fillRect(L, arriba + 22 * s, w, h - 22 * s);
	ctx.fillStyle = "rgba(0,0,0,0.07)";
	for (let x = L + 6 * s; x < L + w; x += 14 * s) ctx.fillRect(x, arriba + 22 * s, 4 * s, h - 22 * s);

	// Letrero
	const lw = w * 0.42;
	rectRedondo(sx - lw / 2, arriba + 34 * s, lw, 30 * s, 5 * s);
	ctx.fillStyle = mezclar("#585b60", "#ffffff", t);
	ctx.fill();
	ctx.fillStyle = pintar(e.acento, t);
	ctx.fillRect(sx - lw / 2 + 12 * s, arriba + 44 * s, lw * 0.45, 4 * s);
	ctx.fillRect(sx - lw / 2 + 12 * s, arriba + 52 * s, lw * 0.7, 4 * s);

	// Portones enrollables
	const n = e.v > 0.5 ? 3 : 2;
	const pw = w * 0.2;
	const ph = h * 0.45;
	for (let i = 0; i < n; i++) {
		const px = L + ((i + 1) * w) / (n + 1) - pw / 2;
		ctx.fillStyle = mezclar("#55585d", "#eef1f4", t);
		ctx.fillRect(px, base - ph, pw, ph);
		ctx.fillStyle = "rgba(0,0,0,0.16)";
		for (let y = base - ph + 6 * s; y < base; y += 7 * s) ctx.fillRect(px, y, pw, 2 * s);
		// Franja de seguridad amarilla arriba del portón
		ctx.fillStyle = color("bordillo", t);
		ctx.fillRect(px - 3 * s, base - ph - 7 * s, pw + 6 * s, 5 * s);
	}
}

function dibujarTanques(e, sx, base, s, t) {
	const tw = 66 * s;
	const sep = 12 * s;
	const n = 3;
	const L = sx - (n * tw + (n - 1) * sep) / 2;
	const hMax = (240 + 90 * e.v) * s;

	// Tubería que conecta los tanques
	ctx.fillStyle = mezclar("#5a5d62", "#9aa3ad", t);
	ctx.fillRect(L, base - 46 * s, n * tw + (n - 1) * sep, 9 * s);

	for (let i = 0; i < n; i++) {
		const x = L + i * (tw + sep);
		const alto = hMax * (i === 1 ? 1 : 0.78 + 0.1 * i);
		const vivo = i === 1 ? e.acento : e.color;
		ctx.fillStyle = pintar(vivo, t);
		ctx.fillRect(x, base - alto, tw, alto);
		ctx.beginPath();
		ctx.ellipse(x + tw / 2, base - alto, tw / 2, 9 * s, 0, 0, Math.PI * 2);
		ctx.fill();
		// Volumen cilíndrico
		const g = ctx.createLinearGradient(x, 0, x + tw, 0);
		g.addColorStop(0, "rgba(255,255,255,0.22)");
		g.addColorStop(0.45, "rgba(255,255,255,0)");
		g.addColorStop(1, "rgba(0,0,0,0.25)");
		ctx.fillStyle = g;
		ctx.fillRect(x, base - alto, tw, alto);
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.beginPath();
		ctx.ellipse(x + tw / 2, base - alto, tw / 2, 9 * s, 0, 0, Math.PI * 2);
		ctx.fill();
		// Anillos
		ctx.fillStyle = "rgba(0,0,0,0.15)";
		for (let y = base - alto + 34 * s; y < base - 20 * s; y += 46 * s) ctx.fillRect(x, y, tw, 4 * s);
		// Escalera
		ctx.strokeStyle = "rgba(0,0,0,0.35)";
		ctx.lineWidth = 1.5 * s;
		ctx.beginPath();
		ctx.moveTo(x + tw - 10 * s, base);
		ctx.lineTo(x + tw - 10 * s, base - alto);
		ctx.moveTo(x + tw - 4 * s, base);
		ctx.lineTo(x + tw - 4 * s, base - alto);
		for (let y = base - 6 * s; y > base - alto; y -= 7 * s) {
			ctx.moveTo(x + tw - 10 * s, y);
			ctx.lineTo(x + tw - 4 * s, y);
		}
		ctx.stroke();
	}
}

function dibujarTorre(e, sx, base, s, t) {
	const w = (150 + 40 * e.v) * s;
	const h = (420 + 110 * e.v) * s;
	const L = sx - w / 2;
	const arriba = base - h;

	// Antena con luz roja que parpadea (solo cuando ya hay color)
	ctx.strokeStyle = "#4f535a";
	ctx.lineWidth = 3 * s;
	linea(sx + w * 0.2, arriba, sx + w * 0.2, arriba - 50 * s);
	if (t > 0.3 && Math.sin(tiempo * 4) > 0) {
		ctx.fillStyle = "#ff3b3b";
		circulo(sx + w * 0.2, arriba - 52 * s, 4 * s);
	}

	ctx.fillStyle = pintar(e.color, t);
	ctx.fillRect(L, arriba, w, h);
	ctx.fillStyle = pintar(e.acento, t);
	ctx.fillRect(L - 4 * s, arriba, w + 8 * s, 12 * s);
	// Franja vertical de acento
	ctx.fillRect(sx - w * 0.06, arriba + 12 * s, w * 0.12, h - 12 * s);

	// Ventanales de vidrio (dos columnas a cada lado de la franja)
	ctx.fillStyle = color("vidrio", t);
	const anchoV = (w * 0.82) / 4;
	for (let y = arriba + 26 * s; y < base - 44 * s; y += 28 * s) {
		for (let c = 0; c < 4; c++) {
			const vx = L + w * 0.03 + c * anchoV + (c >= 2 ? w * 0.12 : 0);
			ctx.fillRect(vx + 3 * s, y, anchoV - 6 * s, 16 * s);
		}
	}
	// Entrada
	ctx.fillStyle = "rgba(0,0,0,0.3)";
	ctx.fillRect(sx - 22 * s, base - 34 * s, 44 * s, 34 * s);
	ctx.fillStyle = "rgba(0,0,0,0.12)";
	ctx.fillRect(L + w * 0.9, arriba, w * 0.1, h);
}

// Grúa torre de construcción, siempre amarilla, con una viga colgando
function dibujarGrua(e, sx, base, s, t) {
	const h = (460 + 80 * e.v) * s;
	const mx = sx - 50 * s;
	const mw = 22 * s;
	const arriba = base - h;

	ctx.strokeStyle = pintar("#ffc300", t);
	ctx.lineCap = "butt";
	// Mástil de celosía
	ctx.lineWidth = 3.5 * s;
	linea(mx - mw / 2, base, mx - mw / 2, arriba);
	linea(mx + mw / 2, base, mx + mw / 2, arriba);
	ctx.lineWidth = 2 * s;
	ctx.beginPath();
	for (let y = base; y > arriba + mw; y -= mw) {
		ctx.moveTo(mx - mw / 2, y);
		ctx.lineTo(mx + mw / 2, y - mw);
		ctx.moveTo(mx - mw / 2, y - mw);
		ctx.lineTo(mx + mw / 2, y - mw);
	}
	ctx.stroke();

	// Pluma (brazo largo) y contrapluma
	const izq = mx - 90 * s;
	const der = mx + 230 * s;
	const alto = 16 * s;
	ctx.lineWidth = 3 * s;
	linea(izq, arriba, der, arriba);
	linea(izq, arriba + alto, der, arriba + alto);
	ctx.lineWidth = 1.8 * s;
	ctx.beginPath();
	for (let x = izq; x < der; x += alto) {
		ctx.moveTo(x, arriba + alto);
		ctx.lineTo(x + alto, arriba);
	}
	ctx.stroke();
	// Punta y tirantes
	ctx.lineWidth = 2 * s;
	linea(mx, arriba - 46 * s, izq, arriba);
	linea(mx, arriba - 46 * s, der, arriba);
	ctx.lineWidth = 3.5 * s;
	linea(mx, arriba, mx, arriba - 46 * s);
	// Contrapeso
	ctx.fillStyle = mezclar("#55585d", "#9aa3ad", t);
	ctx.fillRect(izq + 6 * s, arriba + alto, 46 * s, 30 * s);
	// Cabina
	ctx.fillStyle = pintar(e.acento, t);
	ctx.fillRect(mx + mw / 2, arriba + alto, 24 * s, 24 * s);
	ctx.fillStyle = color("vidrio", t);
	ctx.fillRect(mx + mw / 2 + 12 * s, arriba + alto + 5 * s, 9 * s, 10 * s);

	// Cable, gancho y viga balanceándose
	const carro = mx + 160 * s;
	const largo = (170 + 40 * e.v) * s;
	const vaiven = Math.sin(tiempo * 1.2 + e.x) * 6 * s;
	ctx.strokeStyle = "rgba(30,30,30,0.8)";
	ctx.lineWidth = 1.5 * s;
	linea(carro, arriba + alto, carro + vaiven, arriba + alto + largo);
	const gy = arriba + alto + largo;
	ctx.fillStyle = pintar(e.color, t);
	ctx.fillRect(carro + vaiven - 50 * s, gy, 100 * s, 10 * s);
	ctx.fillStyle = "rgba(0,0,0,0.25)";
	ctx.fillRect(carro + vaiven - 50 * s, gy + 7 * s, 100 * s, 3 * s);

	// Base de concreto
	ctx.fillStyle = mezclar("#55585d", "#b8bec5", t);
	ctx.fillRect(mx - 26 * s, base - 14 * s, 52 * s, 14 * s);
	ctx.lineCap = "round";
}

const DIBUJO_INDUSTRIA = {
	fabrica: dibujarFabrica,
	bodega: dibujarBodega,
	tanques: dibujarTanques,
	torre: dibujarTorre,
	grua: dibujarGrua,
};

function dibujarFabricasMedias() {
	for (const e of fabricasMedias) {
		const sx = e.x - camara * 0.65;
		if (sx < -260 || sx > W + 260) continue;
		DIBUJO_INDUSTRIA[e.tipo](e, sx, SUELO + 2 * S, S * 0.6, tono(e.x / 0.65 / LARGO));
	}
}

function dibujarFabricas() {
	for (const e of fabricas) {
		const sx = e.x - camara;
		if (sx < -340 || sx > W + 340) continue;
		DIBUJO_INDUSTRIA[e.tipo](e, sx, SUELO + 10 * S, S, tono(e.x / LARGO));
	}
}

// Conos y barriles de obra sobre la acera
function dibujarConos() {
	const base = SUELO + 14 * S;
	for (const c of conos) {
		const sx = c.x - camara;
		if (sx < -30 || sx > W + 30) continue;
		const t = tono(c.x / LARGO);
		const naranja = pintar("#ff7b1c", t);
		const blanco = mezclar("#8a8c90", "#ffffff", t);
		if (c.barril) {
			rectRedondo(sx - 10 * S, base - 28 * S, 20 * S, 28 * S, 4 * S);
			ctx.fillStyle = naranja;
			ctx.fill();
			ctx.fillStyle = blanco;
			ctx.fillRect(sx - 10 * S, base - 22 * S, 20 * S, 4 * S);
			ctx.fillRect(sx - 10 * S, base - 12 * S, 20 * S, 4 * S);
		} else {
			ctx.fillStyle = naranja;
			ctx.beginPath();
			ctx.moveTo(sx - 8 * S, base - 3 * S);
			ctx.lineTo(sx - 2 * S, base - 26 * S);
			ctx.lineTo(sx + 2 * S, base - 26 * S);
			ctx.lineTo(sx + 8 * S, base - 3 * S);
			ctx.closePath();
			ctx.fill();
			ctx.fillRect(sx - 11 * S, base - 4 * S, 22 * S, 4 * S);
			ctx.fillStyle = blanco;
			ctx.fillRect(sx - 5.5 * S, base - 15 * S, 11 * S, 4 * S);
		}
	}
}
