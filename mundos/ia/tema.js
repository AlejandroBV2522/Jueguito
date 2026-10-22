/* Mundo IA · cómo se ve su oficina por dentro (tema "ia"): una red de nodos, la red neuronal en la pizarra y las pantallas holográficas.
   Lo dibuja el motor (juego/oficina/dibujo-oficina.js) para cada mundo cuyo
   mundo.js dice oficina.tema: "ia". Usa las herramientas de dibujo del juego:
   ctx, S (escala), tiempo, COLORES, linea, circulo, rectRedondo, conAlfa,
   modulo y dibujarIconoMundo. */
"use strict";

window.TEMAS_OFICINA.ia = {
	// Antes de los flotantes: líneas entre los nodos cercanos
	red(puntos) {
		// Red: líneas entre nodos cercanos
		ctx.lineWidth = 1.5 * S;
		for (let i = 0; i < puntos.length; i++) {
			for (let j = i + 1; j < puntos.length; j++) {
				const d = Math.hypot(puntos[i].x - puntos[j].x, puntos[i].y - puntos[j].y);
				if (d > 260 * S) continue;
				ctx.strokeStyle = conAlfa(COLORES.verdeInstitucional, 0.55 * (1 - d / (260 * S)));
				linea(puntos[i].x, puntos[i].y, puntos[j].x, puntos[j].y);
			}
		}
	},
	// Cada cosa que flota (ya centrada en su lugar: dibuja alrededor de 0, 0)
	flotante(f) {
		ctx.shadowColor = COLORES.verdeInstitucional;
		ctx.shadowBlur = 14 * S;
		if (f.tipo) {
			ctx.fillStyle = COLORES.verdeInstitucional;
			circulo(0, 0, 7 * S);
			ctx.fillStyle = COLORES.blanco;
			circulo(0, 0, 3 * S);
		} else {
			ctx.rotate(tiempo * 0.5 + f.fase);
			dibujarIconoMundo("chispa", 0, 0, 14 * S, COLORES.blanco);
		}
	},
	// La pizarra: (x0, y0, w, h) = el área blanca
	pizarra(x0, y0, w, h) {
		const capas = [3, 4, 2];
		const nodos = capas.map((n, c) => Array.from({ length: n }, (_, k) => [x0 + 18 * S + c * ((w - 36 * S) / 2), y0 + ((k + 1) * h) / (n + 1)]));
		ctx.strokeStyle = conAlfa(COLORES.verdeInstitucional, 0.7);
		ctx.lineWidth = 1.2 * S;
		for (let c = 0; c + 1 < nodos.length; c++) for (const a of nodos[c]) for (const b of nodos[c + 1]) linea(a[0], a[1], b[0], b[1]);
		for (const capa of nodos) {
			for (const [x, y] of capa) {
				ctx.fillStyle = COLORES.verdeInstitucional;
				circulo(x, y, 5 * S);
			}
		}
	},
	// El objeto propio de la oficina, cerca de la computadora (sx = centro, piso = el suelo)
	especial(sx, piso) {
		// Pantallas holográficas con datos que se mueven
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - 34 * S, piso - 14 * S, 68 * S, 14 * S);
		ctx.fillStyle = conAlfa("#7fd6c8", 0.14);
		ctx.beginPath();
		ctx.moveTo(sx - 28 * S, piso - 14 * S);
		ctx.lineTo(sx + 28 * S, piso - 14 * S);
		ctx.lineTo(sx + 56 * S, piso - 150 * S);
		ctx.lineTo(sx - 56 * S, piso - 150 * S);
		ctx.fill();
		for (let k = 0; k < 2; k++) {
			const x0 = sx - 50 * S + k * 52 * S;
			const y0 = piso - 140 * S + k * 40 * S + Math.sin(tiempo * 1.5 + k) * 4 * S;
			ctx.fillStyle = conAlfa("#7fd6c8", 0.3);
			ctx.fillRect(x0, y0, 48 * S, 34 * S);
			ctx.strokeStyle = conAlfa("#c9fff6", 0.8);
			ctx.lineWidth = 1.5 * S;
			ctx.strokeRect(x0, y0, 48 * S, 34 * S);
			ctx.fillStyle = conAlfa("#c9fff6", 0.85);
			for (let b = 0; b < 4; b++) {
				const h = (6 + (Math.sin(tiempo * 2 + b + k * 2) * 0.5 + 0.5) * 18) * S;
				ctx.fillRect(x0 + 6 * S + b * 10 * S, y0 + 30 * S - h, 6 * S, h);
			}
		}
	},
};
