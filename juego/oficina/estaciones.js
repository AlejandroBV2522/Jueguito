/* Camino a Celaque — estaciones que se arman (robot de IA, antivirus). Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: estaciones que se arman (robot de IA, antivirus) ----------
// Cuántas piezas lleva armadas una estación (de PIEZAS_ESTACION) y desde
// cuál entran animadas por el último acierto.
function piezasEstacion(m) {
	const total = Math.max(1, preguntasDe(m).length);
	if (m.completo && !(estado === "terminal" && m.aciertos < total)) return { piezas: PIEZAS_ESTACION, antes: PIEZAS_ESTACION, listo: true };
	const aciertos = m.aciertos || 0;
	return {
		piezas: Math.floor((aciertos / total) * PIEZAS_ESTACION),
		antes: Math.floor((Math.max(0, aciertos - 1) / total) * PIEZAS_ESTACION),
		listo: aciertos >= total,
	};
}

// 0..1: cuánto entró la pieza k (las nuevas caen desde arriba, una tras otra)
function entradaPieza(m, k, est) {
	if (k < est.antes) return 1;
	return suave(0, 1, (tiempo - (m.ultimoAcierto || 0) - (k - est.antes) * 0.18) / 0.45);
}

// Robot asistente armado por partes: 0 base, 1 cuerpo, 2 y 3 brazos,
// 4 cabeza, 5 cara y antena. Lo que falta se ve punteado.
function dibujarRobotArmado(cx, piso, m, est) {
	const u = S;
	const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
	const flota = listo ? Math.sin(tiempo * 2) * 3 * u : 0;
	ctx.save();
	ctx.translate(cx, piso);
	// Silueta de lo que falta
	ctx.save();
	ctx.setLineDash([5 * u, 4 * u]);
	ctx.strokeStyle = conAlfa(COLORES.blanco, 0.55);
	ctx.lineWidth = 2 * u;
	if (est.piezas < 2) ctx.strokeRect(-24 * u, -62 * u, 48 * u, 46 * u);
	if (est.piezas < 5) ctx.strokeRect(-20 * u, -100 * u, 40 * u, 34 * u);
	ctx.restore();
	const pieza = (k, dibujo) => {
		if (k >= est.piezas) return;
		const e = entradaPieza(m, k, est);
		if (e <= 0) return;
		ctx.save();
		ctx.globalAlpha = e;
		ctx.translate(0, -(1 - e) * 60 * u + (k > 0 ? flota : 0));
		dibujo();
		ctx.restore();
	};
	pieza(0, () => {
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(-28 * u, -16 * u, 56 * u, 14 * u, 7 * u);
		ctx.fill();
		ctx.fillStyle = COLORES.grisClaro;
		for (const x of [-16, 0, 16]) circulo(x * u, -9 * u, 4 * u);
	});
	pieza(1, () => {
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(-24 * u, -62 * u, 48 * u, 46 * u, 12 * u);
		ctx.fill();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3 * u;
		ctx.stroke();
		dibujarIconoMundo("chispa", 0, -39 * u, 10 * u, COLORES.verdeInstitucional);
	});
	ctx.lineCap = "round";
	pieza(2, () => {
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 6 * u;
		linea(-24 * u, -52 * u, -38 * u, -30 * u);
	});
	pieza(3, () => {
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 6 * u;
		const ang = listo ? -1.1 + Math.sin(tiempo * 5) * 0.5 : 1.0; // saluda al terminar
		linea(24 * u, -52 * u, 24 * u + Math.cos(ang) * 22 * u, -52 * u + Math.sin(ang) * 22 * u);
	});
	ctx.lineCap = "butt";
	pieza(4, () => {
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(-20 * u, -100 * u, 40 * u, 34 * u, 10 * u);
		ctx.fill();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3 * u;
		ctx.stroke();
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(-15 * u, -94 * u, 30 * u, 20 * u, 7 * u);
		ctx.fill();
	});
	pieza(5, () => {
		const parpadeo = modulo(tiempo, 3) < 0.15 ? 0.3 : 1;
		ctx.save();
		if (listo) {
			ctx.shadowColor = "#7fd6c8";
			ctx.shadowBlur = 12 * u;
		}
		ctx.fillStyle = "#7fd6c8";
		ctx.fillRect(-10 * u, -88 * u, 6 * u, 7 * u * parpadeo);
		ctx.fillRect(4 * u, -88 * u, 6 * u, 7 * u * parpadeo);
		ctx.restore();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3 * u;
		linea(0, -100 * u, 0, -112 * u);
		ctx.fillStyle = Math.sin(tiempo * 4) > 0 ? "#7fd6c8" : COLORES.beige;
		circulo(0, -114 * u, 4 * u);
	});
	if (listo) {
		ctx.fillStyle = "rgba(255,236,150,0.9)";
		for (let k = 0; k < 4; k++) {
			const ang = tiempo * 2 + (k * Math.PI) / 2;
			dibujarIconoMundo("chispa", Math.cos(ang) * 52 * u, -58 * u + Math.sin(ang) * 44 * u, 6 * u, "#ffe8a0");
		}
	}
	ctx.restore();
}

// Escudo antivirus: se llena por franjas con cada acierto y los virus que
// lo rodean van desapareciendo; al terminar brilla con su ✓.
function trazarEscudo(cx, cy, r) {
	ctx.beginPath();
	ctx.moveTo(cx, cy - r);
	ctx.lineTo(cx + r * 0.85, cy - r * 0.65);
	ctx.quadraticCurveTo(cx + r * 0.8, cy + r * 0.55, cx, cy + r);
	ctx.quadraticCurveTo(cx - r * 0.8, cy + r * 0.55, cx - r * 0.85, cy - r * 0.65);
	ctx.closePath();
}

function dibujarEscudoArmado(cx, cy, r, m, est) {
	const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
	// Virus que quedan (uno menos por pieza armada)
	for (let k = 0; k < PIEZAS_ESTACION; k++) {
		const quita = k < est.piezas ? entradaPieza(m, k, est) : 0;
		if (quita >= 1) continue;
		const ang = k * 1.05 + tiempo * 0.6;
		const d = r * (1.35 + 0.1 * Math.sin(tiempo * 3 + k)) + quita * r;
		const vx = cx + Math.cos(ang) * d;
		const vy = cy + Math.sin(ang) * d * 0.8;
		ctx.save();
		ctx.globalAlpha = 1 - quita;
		ctx.translate(vx, vy);
		ctx.rotate(tiempo * 2 + k);
		ctx.strokeStyle = "#e3262b";
		ctx.lineWidth = 2 * S;
		for (let p = 0; p < 6; p++) {
			const a = (p / 6) * Math.PI * 2;
			linea(Math.cos(a) * 5 * S, Math.sin(a) * 5 * S, Math.cos(a) * 10 * S, Math.sin(a) * 10 * S);
		}
		ctx.fillStyle = "#e3262b";
		circulo(0, 0, 6 * S);
		ctx.fillStyle = COLORES.blanco;
		circulo(-2 * S, -1.5 * S, 1.4 * S);
		circulo(2 * S, -1.5 * S, 1.4 * S);
		ctx.restore();
	}
	ctx.save();
	if (listo) {
		ctx.shadowColor = COLORES.verdeInstitucional;
		ctx.shadowBlur = (16 + 12 * Math.sin(tiempo * 3)) * S;
	}
	trazarEscudo(cx, cy, r);
	ctx.fillStyle = listo ? COLORES.verdeProfundo : conAlfa(COLORES.verdeProfundo, 0.25);
	ctx.fill();
	ctx.restore();
	ctx.save();
	trazarEscudo(cx, cy, r);
	ctx.clip();
	const banda = (r * 2) / PIEZAS_ESTACION;
	for (let k = 0; k < est.piezas && !listo; k++) {
		const e = entradaPieza(m, k, est);
		// Las franjas se llenan de abajo hacia arriba
		const y = cy + r - (k + 1) * banda;
		ctx.fillStyle = e < 1 ? mezclar(COLORES.blanco, COLORES.verdeInstitucional, e) : COLORES.verdeInstitucional;
		ctx.fillRect(cx - r, y + (1 - e) * banda, r * 2, banda * e + 1);
	}
	if (!listo) {
		// Línea de escaneo que sube y baja
		const y = cy + Math.sin(tiempo * 2) * r;
		ctx.fillStyle = "rgba(227,238,235,0.8)";
		ctx.fillRect(cx - r, y, r * 2, 3 * S);
	}
	ctx.restore();
	trazarEscudo(cx, cy, r);
	ctx.save();
	if (!listo) ctx.setLineDash([6 * S, 5 * S]);
	ctx.strokeStyle = listo ? COLORES.beige : COLORES.blanco;
	ctx.lineWidth = 3 * S;
	ctx.stroke();
	ctx.restore();
	if (listo) {
		ctx.strokeStyle = COLORES.blanco;
		ctx.lineWidth = 6 * S;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.moveTo(cx - r * 0.38, cy);
		ctx.lineTo(cx - r * 0.08, cy + r * 0.3);
		ctx.lineTo(cx + r * 0.42, cy - r * 0.3);
		ctx.stroke();
		ctx.lineCap = "butt";
	}
}

// La estación al fondo de la oficina, en el mundo (en vez de la computadora)
function dibujarEstacionArmable(m, sx, piso) {
	const est = piezasEstacion(m);
	const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
	if (m.oficina.estacion === "robot") {
		// Plataforma de armado con luz y un brazo de taller
		ctx.save();
		if (!m.completo) {
			ctx.shadowColor = COLORES.verdeInstitucional;
			ctx.shadowBlur = (16 + 14 * pulso) * S;
		}
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(sx - 70 * S, piso - 24 * S, 140 * S, 24 * S, 8 * S);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = conAlfa("#7fd6c8", 0.18 + 0.1 * pulso);
		ctx.beginPath();
		ctx.moveTo(sx - 60 * S, piso - 24 * S);
		ctx.lineTo(sx + 60 * S, piso - 24 * S);
		ctx.lineTo(sx + 40 * S, piso - 170 * S);
		ctx.lineTo(sx - 40 * S, piso - 170 * S);
		ctx.fill();
		ctx.strokeStyle = "#5e686a";
		ctx.lineWidth = 6 * S;
		ctx.lineCap = "round";
		const giro = Math.sin(tiempo * 1.5) * 0.3;
		linea(sx + 90 * S, piso, sx + 90 * S, piso - 120 * S);
		linea(sx + 90 * S, piso - 120 * S, sx + 90 * S - Math.cos(giro) * 46 * S, piso - 120 * S - Math.sin(giro) * 30 * S);
		ctx.lineCap = "butt";
		ctx.save();
		const tmp = S;
		S = tmp * 1.25;
		dibujarRobotArmado(sx, piso - 24 * tmp, m, est);
		S = tmp;
		ctx.restore();
		return 200 * S;
	}
	// Antivirus: pedestal con el escudo flotando en un holograma
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.beginPath();
	ctx.moveTo(sx - 46 * S, piso);
	ctx.lineTo(sx + 46 * S, piso);
	ctx.lineTo(sx + 32 * S, piso - 50 * S);
	ctx.lineTo(sx - 32 * S, piso - 50 * S);
	ctx.fill();
	ctx.fillStyle = conAlfa("#7fd6c8", 0.16 + 0.1 * pulso);
	ctx.beginPath();
	ctx.moveTo(sx - 30 * S, piso - 50 * S);
	ctx.lineTo(sx + 30 * S, piso - 50 * S);
	ctx.lineTo(sx + 70 * S, piso - 200 * S);
	ctx.lineTo(sx - 70 * S, piso - 200 * S);
	ctx.fill();
	dibujarEscudoArmado(sx, piso - 125 * S + Math.sin(tiempo * 1.5) * 4 * S, 46 * S, m, est);
	return 210 * S;
}

// La figurita dentro de la ventana de la terminal (lienzo #terminal-figura)
function dibujarFiguraTerminal(m) {
	const lienzo = ui.terminalFigura;
	const ancho = 240;
	const alto = 150;
	if (lienzo.width !== ancho * DPR || lienzo.height !== alto * DPR) {
		lienzo.width = ancho * DPR;
		lienzo.height = alto * DPR;
	}
	const anteriorCtx = ctx;
	const anteriorS = S;
	ctx = lienzo.getContext("2d");
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
	ctx.clearRect(0, 0, ancho, alto);
	S = 1;
	const est = piezasEstacion(m);
	if (m.oficina.estacion === "robot") dibujarRobotArmado(ancho / 2, alto - 8, m, est);
	else dibujarEscudoArmado(ancho / 2, alto / 2, 52, m, est);
	ctx = anteriorCtx;
	S = anteriorS;
}
