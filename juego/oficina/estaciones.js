/* Camino a Celaque — estaciones que se arman (robot de IA, antivirus). Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: estaciones que se arman (robot de IA, antivirus) ----------
// Cuántas piezas lleva armadas una estación (de PIEZAS_ESTACION) y desde
// cuál entran animadas por el último acierto. Con varios robots, r dice de
// cuál: cada uno cuenta solo sus preguntas (tramoRobot).
function piezasEstacion(m, r = 0) {
	const todas = Math.max(1, preguntasDe(m).length);
	if (m.completo && !(estado === "terminal" && m.aciertos < todas))
		return { piezas: PIEZAS_ESTACION, antes: PIEZAS_ESTACION, listo: true, recien: false };
	const { desde, hasta } = m.oficina.robots.length > 1 ? tramoRobot(m, r) : { desde: 0, hasta: todas };
	const aciertos = m.aciertos || 0;
	const parte = (n) => (hasta > desde ? clamp((n - desde) / (hasta - desde), 0, 1) : n >= desde ? 1 : 0);
	return {
		piezas: Math.floor(parte(aciertos) * PIEZAS_ESTACION),
		antes: Math.floor(parte(aciertos - 1) * PIEZAS_ESTACION),
		listo: parte(aciertos) >= 1,
		recien: aciertos === hasta, // lo terminó el último acierto
	};
}

// Qué le puso el último acierto al robot r: "Piezas nuevas del robot
// aéreo: las patas y el cuerpo." o "¡Robot aéreo terminado!"
function textoPiezasNuevas(m, r) {
	const tipo = m.oficina.robots[r];
	const est = piezasEstacion(m, r);
	const nuevas = PIEZAS_ROBOT[tipo].slice(est.antes, est.piezas);
	if (!nuevas.length) return "";
	const lista = nuevas.length > 1 ? `${nuevas.slice(0, -1).join(", ")} y ${nuevas[nuevas.length - 1]}` : nuevas[0];
	const fin = est.listo ? ` ¡Robot ${ROBOTS_IA[tipo]} terminado!` : "";
	return `${nuevas.length > 1 ? "Piezas nuevas" : "Pieza nueva"} del robot ${ROBOTS_IA[tipo]}: ${lista}.${fin}`;
}

// 0..1: cuánto entró la pieza k (las nuevas caen desde arriba, una tras otra)
function entradaPieza(m, k, est) {
	if (k < est.antes) return 1;
	return suave(0, 1, (tiempo - (m.ultimoAcierto || 0) - (k - est.antes) * 0.18) / 0.45);
}

// La pieza k de un robot, si ya está armada: cae desde arriba al entrar.
// dy mueve la pieza (para que flote o respire cuando el robot está listo).
function piezaRobot(m, est, k, dy, dibujo) {
	if (k >= est.piezas) return;
	const e = entradaPieza(m, k, est);
	if (e <= 0) return;
	ctx.save();
	ctx.globalAlpha = e;
	ctx.translate(0, -(1 - e) * 60 * S + dy);
	dibujo();
	ctx.restore();
}

// Silueta punteada de lo que falta (rectángulos x, y, ancho, alto en u)
function siluetaRobot(rects) {
	const u = S;
	ctx.save();
	ctx.setLineDash([5 * u, 4 * u]);
	ctx.strokeStyle = conAlfa(COLORES.blanco, 0.55);
	ctx.lineWidth = 2 * u;
	for (const [x, y, w, h] of rects) ctx.strokeRect(x * u, y * u, w * u, h * u);
	ctx.restore();
}

// Chispas que giran alrededor de un robot terminado (centro en y)
function chispasRobot(y) {
	const u = S;
	for (let k = 0; k < 4; k++) {
		const ang = tiempo * 2 + (k * Math.PI) / 2;
		dibujarIconoMundo("chispa", Math.cos(ang) * 52 * u, y + Math.sin(ang) * 44 * u, 6 * u, "#ffe8a0");
	}
}

// Robot de tierra armado por partes: 0 base con ruedas, 1 cuerpo, 2 y 3
// brazos, 4 cabeza, 5 cara y antena. Lo que falta se ve punteado.
function dibujarRobotTierra(cx, piso, m, est) {
	const u = S;
	const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
	const flota = listo ? Math.sin(tiempo * 2) * 3 * u : 0;
	ctx.save();
	ctx.translate(cx, piso);
	siluetaRobot([...(est.piezas < 1 ? [[-28, -16, 56, 14]] : []), ...(est.piezas < 2 ? [[-24, -62, 48, 46]] : []), ...(est.piezas < 5 ? [[-20, -100, 40, 34]] : [])]);
	const pieza = (k, dibujo) => piezaRobot(m, est, k, k > 0 ? flota : 0, dibujo);
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
	if (listo) chispasRobot(-58 * u);
	ctx.restore();
}

// Robot aéreo (un dron): 0 patas, 1 cuerpo, 2 y 3 brazos con su motor,
// 4 hélices, 5 cámara. Al terminar despega y queda flotando.
function dibujarRobotAereo(cx, piso, m, est) {
	const u = S;
	const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
	const vuelo = listo ? (est.recien ? suave(0, 1, (tiempo - (m.ultimoAcierto || 0) - 0.9) / 0.8) : 1) : 0;
	ctx.save();
	// El origen es el centro del cuerpo; posado, las patas tocan el piso
	ctx.translate(cx, piso - 34 * u - vuelo * (38 * u + Math.sin(tiempo * 2.5) * 4 * u));
	siluetaRobot([...(est.piezas < 1 ? [[-28, 10, 56, 24]] : []), ...(est.piezas < 2 ? [[-22, -11, 44, 22]] : []), ...(est.piezas < 5 ? [[-53, -26, 30, 6], [23, -26, 30, 6]] : [])]);
	const pieza = (k, dibujo) => piezaRobot(m, est, k, 0, dibujo);
	ctx.lineCap = "round";
	pieza(0, () => {
		ctx.strokeStyle = COLORES.verdeProfundo;
		ctx.lineWidth = 4 * u;
		for (const s of [-1, 1]) {
			linea(s * 12 * u, 10 * u, s * 18 * u, 32 * u);
			linea(s * 8 * u, 32 * u, s * 28 * u, 32 * u);
		}
	});
	pieza(1, () => {
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(-22 * u, -11 * u, 44 * u, 22 * u, 10 * u);
		ctx.fill();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3 * u;
		ctx.stroke();
		dibujarIconoMundo("chispa", 0, 0, 7 * u, COLORES.verdeInstitucional);
	});
	for (const [k, s] of [[2, -1], [3, 1]])
		pieza(k, () => {
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 5 * u;
			linea(s * 20 * u, -4 * u, s * 38 * u, -14 * u);
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(s * 38 * u - 5 * u, -21 * u, 10 * u, 9 * u, 3 * u);
			ctx.fill();
		});
	pieza(4, () => {
		for (const s of [-1, 1]) {
			// Giran rápido cuando vuela (se ven como un disco que late)
			const abre = listo ? 0.25 + 0.75 * Math.abs(Math.cos(tiempo * 30 + s)) : 1;
			ctx.fillStyle = conAlfa(COLORES.grisClaro, listo ? 0.75 : 1);
			ctx.beginPath();
			ctx.ellipse(s * 38 * u, -23 * u, 15 * u * abre, 2.5 * u, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = COLORES.verdeProfundo;
			circulo(s * 38 * u, -23 * u, 2.5 * u);
		}
	});
	pieza(5, () => {
		ctx.fillStyle = COLORES.verdeProfundo;
		circulo(0, 13 * u, 6 * u);
		ctx.save();
		if (listo) {
			ctx.shadowColor = "#7fd6c8";
			ctx.shadowBlur = 10 * u;
		}
		ctx.fillStyle = "#7fd6c8";
		circulo(0, 13 * u, 3 * u);
		ctx.restore();
		ctx.fillStyle = Math.sin(tiempo * 4) > 0 ? "#7fd6c8" : COLORES.beige;
		circulo(15 * u, -3 * u, 2.5 * u);
	});
	ctx.lineCap = "butt";
	if (listo) chispasRobot(0);
	ctx.restore();
}

// Robot humanoide: 0 piernas, 1 torso, 2 y 3 brazos, 4 cabeza con sus
// audífonos, 5 cara. Al terminar respira y saluda.
function dibujarRobotHumanoide(cx, piso, m, est) {
	const u = S;
	const listo = est.listo && est.piezas >= PIEZAS_ESTACION;
	const respira = listo ? Math.sin(tiempo * 2) * 1.5 * u : 0;
	ctx.save();
	ctx.translate(cx, piso);
	siluetaRobot([
		...(est.piezas < 1 ? [[-15, -36, 30, 36]] : []),
		...(est.piezas < 2 ? [[-19, -78, 38, 44]] : []),
		...(est.piezas < 5 ? [[-15, -112, 30, 28]] : []),
	]);
	const pieza = (k, dibujo) => piezaRobot(m, est, k, k > 0 ? respira : 0, dibujo);
	const blanco = (x, y, w, h, r) => {
		ctx.fillStyle = COLORES.blanco;
		rectRedondo(x * u, y * u, w * u, h * u, r * u);
		ctx.fill();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 3 * u;
		ctx.stroke();
	};
	pieza(0, () => {
		blanco(-15, -38, 12, 36, 5);
		blanco(3, -38, 12, 36, 5);
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(-17 * u, -6 * u, 16 * u, 6 * u, 3 * u);
		ctx.fill();
		rectRedondo(1 * u, -6 * u, 16 * u, 6 * u, 3 * u);
		ctx.fill();
	});
	ctx.lineCap = "round";
	const brazo = (s, ang) => {
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 6 * u;
		const x = s * 20 * u + Math.cos(ang) * 26 * u * s;
		const y = -72 * u + Math.sin(ang) * 26 * u;
		linea(s * 20 * u, -72 * u, x, y);
		ctx.fillStyle = COLORES.grisClaro;
		circulo(x, y, 4.5 * u);
	};
	pieza(2, () => brazo(-1, 1.2));
	pieza(3, () => brazo(1, listo ? -1.1 + Math.sin(tiempo * 5) * 0.5 : 1.2)); // saluda al terminar
	ctx.lineCap = "butt";
	pieza(1, () => {
		blanco(-19, -78, 38, 44, 12);
		dibujarIconoMundo("chispa", 0, -58 * u, 8 * u, COLORES.verdeInstitucional);
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.fillRect(-19 * u, -42 * u, 38 * u, 3 * u);
	});
	pieza(4, () => {
		ctx.fillStyle = COLORES.grisClaro;
		ctx.fillRect(-4 * u, -85 * u, 8 * u, 8 * u);
		blanco(-15, -112, 30, 28, 12);
		for (const s of [-1, 1]) {
			ctx.fillStyle = COLORES.verdeInstitucional;
			circulo(s * 16 * u, -98 * u, 5.5 * u);
			ctx.fillStyle = COLORES.blanco;
			circulo(s * 16 * u, -98 * u, 2.2 * u);
		}
	});
	pieza(5, () => {
		const parpadeo = modulo(tiempo + 1.3, 3) < 0.15 ? 0.3 : 1;
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(-11 * u, -106 * u, 22 * u, 12 * u, 5 * u);
		ctx.fill();
		ctx.save();
		if (listo) {
			ctx.shadowColor = "#7fd6c8";
			ctx.shadowBlur = 12 * u;
		}
		ctx.fillStyle = "#7fd6c8";
		ctx.fillRect(-7 * u, -103 * u, 5 * u, 6 * u * parpadeo);
		ctx.fillRect(2 * u, -103 * u, 5 * u, 6 * u * parpadeo);
		ctx.restore();
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 2 * u;
		ctx.beginPath();
		ctx.arc(0, -93 * u, 4 * u, 0.2 * Math.PI, 0.8 * Math.PI);
		ctx.stroke();
	});
	if (listo) chispasRobot(-60 * u);
	ctx.restore();
}

const DIBUJO_ROBOT = { tierra: dibujarRobotTierra, aereo: dibujarRobotAereo, humanoide: dibujarRobotHumanoide };

// Un virus rojo con púas y ojitos (escala 1 = 10·S de radio con las púas).
// También lo usan los virus que cruzan la oficina (virus.js).
function dibujarVirus(x, y, escala, giro, alfa) {
	const u = S * escala;
	ctx.save();
	ctx.globalAlpha = alfa;
	ctx.translate(x, y);
	ctx.rotate(giro);
	ctx.strokeStyle = "#e3262b";
	ctx.lineWidth = 2 * u;
	for (let p = 0; p < 6; p++) {
		const a = (p / 6) * Math.PI * 2;
		linea(Math.cos(a) * 5 * u, Math.sin(a) * 5 * u, Math.cos(a) * 10 * u, Math.sin(a) * 10 * u);
	}
	ctx.fillStyle = "#e3262b";
	circulo(0, 0, 6 * u);
	ctx.fillStyle = COLORES.blanco;
	circulo(-2 * u, -1.5 * u, 1.4 * u);
	circulo(2 * u, -1.5 * u, 1.4 * u);
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
		dibujarVirus(vx, vy, 1, tiempo * 2 + k, 1 - quita);
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
		// Plataforma de armado con luz; con un solo robot, también un brazo
		// de taller. Varios robots van en fila, un poco más chicos.
		const robots = m.oficina.robots;
		const varios = robots.length > 1;
		const medio = (varios ? 125 : 70) * S;
		ctx.save();
		if (!m.completo) {
			ctx.shadowColor = COLORES.verdeInstitucional;
			ctx.shadowBlur = (16 + 14 * pulso) * S;
		}
		ctx.fillStyle = COLORES.verdeProfundo;
		rectRedondo(sx - medio, piso - 24 * S, medio * 2, 24 * S, 8 * S);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = conAlfa("#7fd6c8", 0.18 + 0.1 * pulso);
		ctx.beginPath();
		ctx.moveTo(sx - medio + 10 * S, piso - 24 * S);
		ctx.lineTo(sx + medio - 10 * S, piso - 24 * S);
		ctx.lineTo(sx + medio - 30 * S, piso - 170 * S);
		ctx.lineTo(sx - medio + 30 * S, piso - 170 * S);
		ctx.fill();
		if (!varios) {
			ctx.strokeStyle = "#5e686a";
			ctx.lineWidth = 6 * S;
			ctx.lineCap = "round";
			const giro = Math.sin(tiempo * 1.5) * 0.3;
			linea(sx + 90 * S, piso, sx + 90 * S, piso - 120 * S);
			linea(sx + 90 * S, piso - 120 * S, sx + 90 * S - Math.cos(giro) * 46 * S, piso - 120 * S - Math.sin(giro) * 30 * S);
			ctx.lineCap = "butt";
		}
		ctx.save();
		const tmp = S;
		S = tmp * (varios ? 0.9 : 1.25);
		robots.forEach((r, k) => DIBUJO_ROBOT[r](sx + (k - (robots.length - 1) / 2) * 84 * tmp, piso - 24 * tmp, m, piezasEstacion(m, k)));
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
	const robots = m.oficina.robots;
	const ancho = robots.length > 1 ? 360 : 240; // varios robots: más ancha (style.css → .robots-varios)
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
	if (m.oficina.estacion !== "robot") dibujarEscudoArmado(ancho / 2, alto / 2, 52, m, piezasEstacion(m));
	else if (robots.length > 1) {
		// Los robots en fila desde el inicio (punteados lo que falta); el que
		// se arma ahora tiene una luz debajo. Al terminar, todos completos.
		const actual = robotDePregunta(m, m.preguntaActual);
		const piso = alto - 22;
		robots.forEach((r, k) => {
			const x = ancho / 2 + (k - (robots.length - 1) / 2) * 118;
			if (k === actual) {
				ctx.fillStyle = conAlfa("#7fd6c8", 0.25 + 0.15 * Math.sin(tiempo * 4));
				ctx.beginPath();
				ctx.ellipse(x, piso, 46, 7, 0, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.fillStyle = k === actual ? "#7fd6c8" : conAlfa(COLORES.blanco, 0.75);
			ctx.font = `bold 11px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.fillText(r === "tierra" ? "Tierra" : r === "aereo" ? "Aéreo" : "Humanoide", x, alto - 4);
			S = 0.85;
			DIBUJO_ROBOT[r](x, piso, m, piezasEstacion(m, k));
			S = 1;
		});
	} else DIBUJO_ROBOT[robots[0]](ancho / 2, alto - 8, m, piezasEstacion(m));
	ctx = anteriorCtx;
	S = anteriorS;
}
