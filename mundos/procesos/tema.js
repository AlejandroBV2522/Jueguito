/* Mundo Procesos · cómo se ve su oficina por dentro (tema "procesos"): engranes y pasos de un diagrama, el diagrama de flujo en la pizarra y la banda transportadora.
   Lo dibuja el motor (juego/oficina/dibujo-oficina.js) para cada mundo cuyo
   mundo.js dice oficina.tema: "procesos". Usa las herramientas de dibujo del juego:
   ctx, S (escala), tiempo, COLORES, linea, circulo, rectRedondo, conAlfa,
   modulo y dibujarIconoMundo. */
"use strict";

window.TEMAS_OFICINA.procesos = {
	// Cada cosa que flota (ya centrada en su lugar: dibuja alrededor de 0, 0)
	flotante(f) {
		if (f.tipo) {
			ctx.rotate(tiempo * 0.8 * (f.fase > 3 ? 1 : -1));
			ctx.globalAlpha = 0.7;
			dibujarIconoMundo("engranes", 0, 0, 22 * S, f.fase > 3 ? COLORES.beige : COLORES.verdeInstitucional);
		} else {
			// Paso de un diagrama: caja → flecha → rombo
			ctx.fillStyle = COLORES.blanco;
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 2.5 * S;
			rectRedondo(-34 * S, -12 * S, 34 * S, 24 * S, 6 * S);
			ctx.fill();
			ctx.stroke();
			linea(2 * S, 0, 24 * S, 0);
			ctx.beginPath();
			ctx.moveTo(26 * S, 0);
			ctx.lineTo(40 * S, -12 * S);
			ctx.lineTo(54 * S, 0);
			ctx.lineTo(40 * S, 12 * S);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	},
	// La pizarra: (x0, y0, w, h) = el área blanca
	pizarra(x0, y0, w, h) {
		const cx = x0 + w / 2;
		const cajas = [
			[x0 + 10 * S, y0 + 12 * S],
			[x0 + 10 * S, y0 + 52 * S],
			[x0 + w - 42 * S, y0 + 52 * S],
		];
		ctx.fillStyle = COLORES.fondoVerdeClaro;
		for (const [x, y] of cajas) {
			ctx.fillRect(x, y, 32 * S, 20 * S);
			ctx.strokeRect(x, y, 32 * S, 20 * S);
		}
		linea(x0 + 26 * S, y0 + 32 * S, x0 + 26 * S, y0 + 52 * S);
		linea(x0 + 42 * S, y0 + 62 * S, x0 + w - 42 * S, y0 + 62 * S);
		ctx.fillStyle = "#ffe066";
		ctx.beginPath();
		ctx.moveTo(cx + 18 * S, y0 + 8 * S);
		ctx.lineTo(cx + 34 * S, y0 + 22 * S);
		ctx.lineTo(cx + 18 * S, y0 + 36 * S);
		ctx.lineTo(cx + 2 * S, y0 + 22 * S);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		linea(x0 + 42 * S, y0 + 22 * S, cx + 2 * S, y0 + 22 * S);
	},
	// El objeto propio de la oficina, cerca de la computadora (sx = centro, piso = el suelo)
	especial(sx, piso) {
		// Banda transportadora con cajas que avanzan
		ctx.fillStyle = "#3a4446";
		rectRedondo(sx - 70 * S, piso - 40 * S, 140 * S, 14 * S, 7 * S);
		ctx.fill();
		ctx.fillRect(sx - 60 * S, piso - 28 * S, 6 * S, 28 * S);
		ctx.fillRect(sx + 54 * S, piso - 28 * S, 6 * S, 28 * S);
		ctx.fillStyle = "#c79a5b";
		for (let k = 0; k < 3; k++) {
			const x = sx - 70 * S + modulo(tiempo * 30 * S + k * 48 * S, 140 * S);
			if (x < sx + 52 * S) ctx.fillRect(x, piso - 60 * S, 20 * S, 20 * S);
		}
		ctx.save();
		ctx.translate(sx, piso - 33 * S);
		ctx.rotate(tiempo * 2);
		dibujarIconoMundo("engranes", 0, 0, 9 * S, COLORES.beige);
		ctx.restore();
	},
};
