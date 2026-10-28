/* Mundo Seguridad · cómo se ve su oficina por dentro (tema "seguridad"): escudos y candados, la lista de chequeo en la pizarra y la consola de cámaras.
   Lo dibuja el motor (juego/oficina/dibujo-oficina.js) para cada mundo cuyo
   mundo.js dice oficina.tema: "seguridad". Usa las herramientas de dibujo del juego:
   ctx, S (escala), tiempo, COLORES, linea, circulo, rectRedondo, conAlfa,
   modulo y dibujarIconoMundo. */
"use strict";

window.TEMAS_OFICINA.seguridad = {
	// Cada cosa que flota (ya centrada en su lugar: dibuja alrededor de 0, 0)
	flotante(f) {
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 2.5 + f.fase);
		ctx.shadowColor = conAlfa(COLORES.verdeInstitucional, 0.8);
		ctx.shadowBlur = (8 + 10 * pulso) * S;
		if (f.tipo) {
			dibujarIconoMundo("escudo", 0, 0, 20 * S, COLORES.verdeProfundo);
		} else {
			ctx.strokeStyle = COLORES.grisClaro;
			ctx.lineWidth = 4 * S;
			ctx.beginPath();
			ctx.arc(0, -8 * S, 8 * S, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.fillStyle = COLORES.beige;
			rectRedondo(-13 * S, -8 * S, 26 * S, 22 * S, 4 * S);
			ctx.fill();
			ctx.fillStyle = COLORES.verdeProfundo;
			circulo(0, 1 * S, 3 * S);
		}
	},
	// La pizarra: (x0, y0, w, h) = el área blanca
	pizarra(x0, y0, w, h) {
		for (let k = 0; k < 3; k++) {
			const y = y0 + 16 * S + k * 22 * S;
			ctx.strokeRect(x0 + 12 * S, y - 7 * S, 14 * S, 14 * S);
			ctx.strokeStyle = COLORES.verdeInstitucional;
			ctx.lineWidth = 3 * S;
			ctx.beginPath();
			ctx.moveTo(x0 + 14 * S, y);
			ctx.lineTo(x0 + 18 * S, y + 4 * S);
			ctx.lineTo(x0 + 25 * S, y - 5 * S);
			ctx.stroke();
			ctx.strokeStyle = COLORES.verdeProfundo;
			ctx.lineWidth = 2 * S;
			ctx.fillStyle = COLORES.grisClaro;
			ctx.fillRect(x0 + 34 * S, y - 2 * S, 46 * S, 4 * S);
		}
		dibujarIconoMundo("escudo", x0 + w - 22 * S, y0 + h / 2, 16 * S, COLORES.verdeProfundo);
	},
	// El objeto propio de la oficina, cerca de la computadora (sx = centro, piso = el suelo)
	especial(sx, piso) {
		// Consola con cámaras de vigilancia
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - 56 * S, piso - 50 * S, 112 * S, 50 * S);
		for (let k = 0; k < 4; k++) {
			const x = sx - 54 * S + (k % 2) * 56 * S;
			const y = piso - 136 * S + Math.floor(k / 2) * 42 * S;
			ctx.fillStyle = "#1c2526";
			ctx.fillRect(x, y, 52 * S, 38 * S);
			ctx.fillStyle = k === Math.floor(tiempo / 2) % 4 ? "#9fd3c8" : "#5f8f86";
			ctx.fillRect(x + 3 * S, y + 3 * S, 46 * S, 32 * S);
			ctx.fillStyle = "rgba(28,37,38,0.45)";
			ctx.fillRect(x + 10 * S, y + 18 * S, 12 * S, 17 * S); // alguien caminando en la cámara
		}
		if (Math.sin(tiempo * 4) > 0) {
			ctx.fillStyle = "#ff5a4e";
			circulo(sx + 46 * S, piso - 42 * S, 3 * S);
		}
	},
};
