/* Mundo Proyectos · cómo se ve su oficina por dentro (tema "planos"): planos que vuelan, el tablero de tareas en la pizarra y la maqueta del proyecto.
   Lo dibuja el motor (juego/oficina/dibujo-oficina.js) para cada mundo cuyo
   mundo.js dice oficina.tema: "planos". Usa las herramientas de dibujo del juego:
   ctx, S (escala), tiempo, COLORES, linea, circulo, rectRedondo, conAlfa,
   modulo y dibujarIconoMundo. */
"use strict";

window.TEMAS_OFICINA.planos = {
	// Cada cosa que flota (ya centrada en su lugar: dibuja alrededor de 0, 0)
	flotante(f) {
		ctx.rotate(Math.sin(tiempo * 1.5 + f.fase) * 0.25);
		const w = 64 * S;
		const h = 44 * S;
		ctx.fillStyle = "#2c5f8e";
		ctx.fillRect(-w / 2, -h / 2, w, h);
		ctx.strokeStyle = "rgba(255,255,255,0.25)";
		ctx.lineWidth = 1 * S;
		for (let k = 1; k < 4; k++) linea(-w / 2, -h / 2 + (k * h) / 4, w / 2, -h / 2 + (k * h) / 4);
		ctx.strokeStyle = "rgba(255,255,255,0.9)";
		ctx.lineWidth = 1.6 * S;
		ctx.strokeRect(-w / 2 + 3 * S, -h / 2 + 3 * S, w - 6 * S, h - 6 * S);
		if (f.tipo) {
			// Casa con su techo
			ctx.strokeRect(-14 * S, -4 * S, 28 * S, 16 * S);
			ctx.beginPath();
			ctx.moveTo(-17 * S, -4 * S);
			ctx.lineTo(0, -15 * S);
			ctx.lineTo(17 * S, -4 * S);
			ctx.stroke();
		} else {
			// Planta de un edificio con cotas
			ctx.strokeRect(-20 * S, -12 * S, 24 * S, 22 * S);
			ctx.strokeRect(4 * S, -12 * S, 16 * S, 12 * S);
			linea(-20 * S, 15 * S, 20 * S, 15 * S);
		}
	},
	// La pizarra: (x0, y0, w, h) = el área blanca
	pizarra(x0, y0, w, h) {
		// Tablero de tareas (por hacer / en curso / listo)
		const notas = ["#ffe066", "#a8e6cf", "#ffd3b6", COLORES.fondoVerdeClaro];
		ctx.lineWidth = 1.5 * S;
		ctx.strokeStyle = "#9aa5a6";
		for (let c = 0; c < 3; c++) {
			const ccx = x0 + (c + 0.5) * (w / 3);
			if (c) linea(x0 + c * (w / 3), y0 + 8 * S, x0 + c * (w / 3), y0 + h - 6 * S);
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(ccx - 14 * S, y0 + 7 * S, 28 * S, 3 * S);
			for (let n = 0; n < 3 - c + (c === 2 ? 1 : 0); n++) {
				ctx.fillStyle = notas[(c + n) % notas.length];
				ctx.fillRect(ccx - 13 * S, y0 + 16 * S + n * 20 * S, 26 * S, 16 * S);
			}
		}
	},
	// El objeto propio de la oficina, cerca de la computadora (sx = centro, piso = el suelo)
	especial(sx, piso) {
		// Maqueta del proyecto sobre una mesa, con su grúa
		ctx.fillStyle = "#c89b6d";
		ctx.fillRect(sx - 50 * S, piso - 56 * S, 100 * S, 8 * S);
		ctx.fillStyle = "#a07c58";
		ctx.fillRect(sx - 44 * S, piso - 48 * S, 6 * S, 48 * S);
		ctx.fillRect(sx + 38 * S, piso - 48 * S, 6 * S, 48 * S);
		ctx.fillStyle = COLORES.blanco;
		ctx.fillRect(sx - 30 * S, piso - 110 * S, 26 * S, 54 * S);
		ctx.fillRect(sx, piso - 86 * S, 24 * S, 30 * S);
		ctx.fillStyle = "#9fdcff";
		for (let y = piso - 104 * S; y < piso - 62 * S; y += 10 * S) ctx.fillRect(sx - 26 * S, y, 18 * S, 5 * S);
		ctx.strokeStyle = "#ffc72c";
		ctx.lineWidth = 3 * S;
		linea(sx + 34 * S, piso - 56 * S, sx + 34 * S, piso - 124 * S);
		linea(sx - 10 * S, piso - 124 * S, sx + 44 * S, piso - 124 * S);
		ctx.fillStyle = "#2c5f8e"; // planos enrollados
		for (let k = 0; k < 3; k++) ctx.fillRect(sx - 58 * S + k * 7 * S, piso - 30 * S - k * 4 * S, 5 * S, 30 * S + k * 4 * S);
	},
};
