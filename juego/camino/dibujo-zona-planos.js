/* Camino a Celaque — la zona de planos del inicio. Ver juego/LEEME.md. */
"use strict";

// ---------- Zona de planos (el inicio) ----------
// Un espacio vacío y gris hecho de planos: cuadrícula, bocetos punteados de
// edificios que todavía no existen y hojas flotando. Termina en una puerta
// de luz con un foco encendido (FIN_PLANOS): el punto donde nacen las
// ideas. Al cruzarla hay un destello y se entra al mundo con luz.
// Bocetos y hojas repartidos por toda la zona, sin azar (siempre igual)
const TIPOS_BOCETO = ["edificio", "casa", "grua", "edificio", "casa"];
const BOCETOS = [];
for (let x = 170, i = 0; x < FIN_PLANOS - 250; x += 260 + ((i * 53) % 90), i++) {
	const tipo = TIPOS_BOCETO[i % TIPOS_BOCETO.length];
	BOCETOS.push({ x, tipo, w: tipo === "casa" ? 130 : tipo === "grua" ? 180 : 90 + ((i * 37) % 50), h: tipo === "casa" ? 110 : 230 + ((i * 71) % 130) });
}
const HOJAS_PLANOS = [];
for (let x = 120, i = 0; x < FIN_PLANOS - 150; x += 190 + ((i * 41) % 80), i++) {
	HOJAS_PLANOS.push({ x, y: 0.1 + ((i * 29) % 35) / 100, giro: (((i * 17) % 7) - 3) / 10, fase: i * 1.3 });
}
// Frases que acompañan la caminata por los planos
const FRASES_PLANOS = [
	{ x: 240, texto: "Todo empieza con una idea..." },
	{ x: 600, texto: "...las ideas toman tiempo..." },
	{ x: 950, texto: "...hasta que un día se encienden." },
];
const TINTA_PLANO = "rgba(170,178,188,"; // gris apagado, casi sin tinta

function dibujarCota(x1, y1, x2, y2, texto) {
	linea(x1, y1, x2, y2);
	ctx.font = `${12 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, (x1 + x2) / 2 + (x1 === x2 ? -14 * S : 0), (y1 + y2) / 2 + (y1 === y2 ? -10 * S : 0));
}

function dibujarBoceto(b, sx, piso) {
	const w = b.w * S;
	const h = b.h * S;
	const L = sx - w / 2;
	if (b.tipo === "edificio") {
		ctx.strokeRect(L, piso - h, w, h);
		for (let y = piso - h + 18 * S; y < piso - 30 * S; y += 32 * S) {
			for (let x = L + 12 * S; x < L + w - 20 * S; x += 28 * S) ctx.strokeRect(x, y, 14 * S, 18 * S);
		}
		dibujarCota(L - 18 * S, piso, L - 18 * S, piso - h, Math.round(b.h / 20) + " m");
	} else if (b.tipo === "casa") {
		ctx.strokeRect(L, piso - h, w, h);
		ctx.beginPath();
		ctx.moveTo(L - 10 * S, piso - h);
		ctx.lineTo(sx, piso - h - 60 * S);
		ctx.lineTo(L + w + 10 * S, piso - h);
		ctx.stroke();
		ctx.strokeRect(sx - 15 * S, piso - 55 * S, 30 * S, 55 * S);
		dibujarCota(L, piso + 14 * S, L + w, piso + 14 * S, Math.round(b.w / 13) + " m");
	} else {
		const mx = sx - w * 0.3;
		linea(mx - 8 * S, piso, mx - 8 * S, piso - h);
		linea(mx + 8 * S, piso, mx + 8 * S, piso - h);
		linea(mx - 50 * S, piso - h, mx + w * 0.8, piso - h);
		linea(mx, piso - h - 40 * S, mx + w * 0.8, piso - h);
		linea(mx + w * 0.6, piso - h, mx + w * 0.6, piso - h + 120 * S);
	}
}

function dibujarZonaPlanos() {
	const gx = FIN_PLANOS - camara; // la puerta de luz, en pantalla
	if (gx < 0) return;
	const ancho = Math.min(W, gx);
	const piso = SUELO + 40 * S;
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, ancho, H);
	ctx.clip();

	const g = ctx.createLinearGradient(0, 0, 0, H);
	g.addColorStop(0, "#1e2023");
	g.addColorStop(0.7, "#2f3236");
	g.addColorStop(1, "#26282b");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, ancho, H);

	// Cuadrícula de plano (fina y gruesa)
	ctx.lineWidth = 1;
	for (const [paso, alfa] of [[40 * S, 0.04], [200 * S, 0.09]]) {
		ctx.strokeStyle = TINTA_PLANO + alfa + ")";
		ctx.beginPath();
		for (let x = -modulo(camara, paso); x < ancho; x += paso) {
			ctx.moveTo(x, 0);
			ctx.lineTo(x, piso);
		}
		for (let y = piso; y > 0; y -= paso) {
			ctx.moveTo(0, y);
			ctx.lineTo(ancho, y);
		}
		ctx.stroke();
	}

	// Piso: una hoja de plano en perspectiva
	ctx.fillStyle = "#35383c";
	ctx.fillRect(0, piso, ancho, H - piso);
	ctx.strokeStyle = TINTA_PLANO + "0.1)";
	ctx.beginPath();
	const paso = 60 * S;
	for (let x = -modulo(camara, paso) - W; x < W * 2; x += paso) {
		ctx.moveTo(x, piso);
		ctx.lineTo(x + (x - W / 2) * 0.9, H);
	}
	ctx.stroke();
	ctx.strokeStyle = TINTA_PLANO + "0.4)";
	ctx.lineWidth = 2 * S;
	linea(0, piso, ancho, piso);

	// Bocetos punteados de lo que todavía no existe
	ctx.strokeStyle = TINTA_PLANO + "0.28)";
	ctx.fillStyle = TINTA_PLANO + "0.4)";
	ctx.lineWidth = 1.5 * S;
	ctx.setLineDash([8 * S, 6 * S]);
	for (const b of BOCETOS) {
		const sx = b.x - camara;
		if (sx < -300 || sx > ancho + 300) continue;
		dibujarBoceto(b, sx, piso);
	}
	ctx.setLineDash([]);

	// Hojas de planos flotando
	for (const hj of HOJAS_PLANOS) {
		const sx = hj.x - camara * 0.8;
		const sy = hj.y * SUELO + Math.sin(tiempo * 0.8 + hj.fase) * 10 * S;
		ctx.save();
		ctx.translate(sx, sy);
		ctx.rotate(hj.giro + Math.sin(tiempo * 0.5 + hj.fase) * 0.06);
		ctx.fillStyle = "rgba(120,124,130,0.22)";
		ctx.fillRect(-28 * S, -20 * S, 56 * S, 40 * S);
		ctx.strokeStyle = TINTA_PLANO + "0.45)";
		ctx.lineWidth = 1;
		ctx.strokeRect(-28 * S, -20 * S, 56 * S, 40 * S);
		ctx.strokeRect(-20 * S, -12 * S, 22 * S, 16 * S);
		linea(6 * S, -10 * S, 22 * S, -10 * S);
		linea(6 * S, -3 * S, 18 * S, -3 * S);
		linea(-20 * S, 10 * S, 20 * S, 10 * S);
		ctx.restore();
	}

	ctx.font = `italic ${22 * S}px ${FUENTE}`;
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = TINTA_PLANO + "0.5)";
	for (const f of FRASES_PLANOS) ctx.fillText(f.texto, f.x - camara, SUELO - 260 * S);

	// Viñeta: los bordes se cierran en penumbra
	const vin = ctx.createRadialGradient(W / 2, SUELO * 0.7, SUELO * 0.4, W / 2, SUELO * 0.7, W * 0.8);
	vin.addColorStop(0, "rgba(0,0,0,0)");
	vin.addColorStop(1, "rgba(0,0,0,0.45)");
	ctx.fillStyle = vin;
	ctx.fillRect(0, 0, ancho, H);
	ctx.restore();
}

// La puerta de luz con el foco encendido. Se dibuja DESPUÉS de la neblina
// para que brille de verdad sobre lo gris.
function dibujarPuertaIdea() {
	const gx = FIN_PLANOS - camara;
	if (gx < -500 || gx > W + 500) return;
	const piso = SUELO + 40 * S;
	const alto = 210 * S;
	const ancho = 74 * S;
	const pulso = 0.85 + Math.sin(tiempo * 2.2) * 0.15;

	// Resplandor general (más fuerte hacia el lado con luz)
	const halo = ctx.createRadialGradient(gx, piso - alto * 0.55, 10 * S, gx, piso - alto * 0.55, 520 * S);
	halo.addColorStop(0, `rgba(255,244,200,${0.6 * pulso})`);
	halo.addColorStop(1, "rgba(255,244,200,0)");
	ctx.fillStyle = halo;
	ctx.fillRect(gx - 520 * S, piso - alto * 0.55 - 520 * S, 1040 * S, 1040 * S);

	// Rayos que se cuelan hacia lo gris
	ctx.fillStyle = `rgba(255,240,195,${0.1 * pulso})`;
	for (const [a, b] of [[0.05, 0.35], [0.45, 0.75], [0.8, 1]]) {
		ctx.beginPath();
		ctx.moveTo(gx - ancho / 2, piso - alto * (1 - a * 0.9));
		ctx.lineTo(gx - ancho / 2, piso - alto * (1 - b * 0.9));
		ctx.lineTo(gx - 600 * S, piso + (b - 0.5) * 300 * S);
		ctx.lineTo(gx - 600 * S, piso + (a - 0.5) * 300 * S);
		ctx.fill();
	}

	// Marco y vano de luz
	const luz = ctx.createLinearGradient(gx - ancho / 2, 0, gx + ancho / 2, 0);
	luz.addColorStop(0, "#fff6d2");
	luz.addColorStop(0.5, "#ffffff");
	luz.addColorStop(1, "#ffefb0");
	ctx.fillStyle = luz;
	ctx.fillRect(gx - ancho / 2, piso - alto, ancho, alto);
	ctx.strokeStyle = TINTA_PLANO + "0.8)";
	ctx.lineWidth = 4 * S;
	ctx.strokeRect(gx - ancho / 2 - 3 * S, piso - alto - 3 * S, ancho + 6 * S, alto + 3 * S);

	// Foco (la idea) encima de la puerta
	const fy = piso - alto - 70 * S;
	const brillo = ctx.createRadialGradient(gx, fy, 4 * S, gx, fy, 90 * S);
	brillo.addColorStop(0, `rgba(255,236,150,${0.9 * pulso})`);
	brillo.addColorStop(1, "rgba(255,236,150,0)");
	ctx.fillStyle = brillo;
	circulo(gx, fy, 90 * S);
	ctx.strokeStyle = `rgba(255,230,140,${0.8 * pulso})`;
	ctx.lineWidth = 3 * S;
	for (let i = 0; i < 8; i++) {
		const ang = (i / 8) * Math.PI * 2 + tiempo * 0.3;
		linea(gx + Math.cos(ang) * 36 * S, fy + Math.sin(ang) * 36 * S, gx + Math.cos(ang) * 50 * S, fy + Math.sin(ang) * 50 * S);
	}
	ctx.fillStyle = "#fff6c8";
	circulo(gx, fy, 24 * S);
	ctx.fillRect(gx - 11 * S, fy + 14 * S, 22 * S, 12 * S);
	ctx.fillStyle = "#9aa3ad";
	ctx.fillRect(gx - 10 * S, fy + 26 * S, 20 * S, 12 * S);
	ctx.strokeStyle = "rgba(90,90,90,0.6)";
	ctx.lineWidth = 1.5 * S;
	linea(gx - 10 * S, fy + 31 * S, gx + 10 * S, fy + 31 * S);
	ctx.strokeStyle = "#f2a516";
	ctx.lineWidth = 2 * S;
	ctx.beginPath();
	ctx.moveTo(gx - 7 * S, fy + 14 * S);
	ctx.lineTo(gx - 4 * S, fy - 2 * S);
	ctx.lineTo(gx, fy + 4 * S);
	ctx.lineTo(gx + 4 * S, fy - 2 * S);
	ctx.lineTo(gx + 7 * S, fy + 14 * S);
	ctx.stroke();
	ctx.strokeStyle = CONTORNO_FOCO;
	ctx.lineWidth = 2 * S;
	ctx.beginPath();
	ctx.arc(gx, fy, 24 * S, Math.PI * 0.75, Math.PI * 2.25);
	ctx.stroke();
}
const CONTORNO_FOCO = "rgba(120,110,80,0.6)";
