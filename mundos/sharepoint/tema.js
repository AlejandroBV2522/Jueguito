/* Mundo SharePoint · cómo se ve su oficina por dentro (tema "documentos"): hojas y carpetas que suben a la nube, el árbol de carpetas en la pizarra y el servidor.
   Lo dibuja el motor (juego/oficina/dibujo-oficina.js) para cada mundo cuyo
   mundo.js dice oficina.tema: "documentos". Usa las herramientas de dibujo del juego:
   ctx, S (escala), tiempo, COLORES, linea, circulo, rectRedondo, conAlfa,
   modulo y dibujarIconoMundo. */
"use strict";

window.TEMAS_OFICINA.documentos = {
	// Los documentos no flotan en su lugar: suben hacia la nube
	alturaFlotante(f, alto) {
		return 70 * S + modulo(f.y - tiempo * 0.015 * (f.vel / 16), 1) * alto;
	},
	// Cada cosa que flota (ya centrada en su lugar: dibuja alrededor de 0, 0)
	flotante(f) {
		if (f.tipo) {
			// Hoja con la esquina doblada
			ctx.rotate(Math.sin(tiempo + f.fase) * 0.15);
			ctx.fillStyle = COLORES.blanco;
			ctx.beginPath();
			ctx.moveTo(-16 * S, -21 * S);
			ctx.lineTo(8 * S, -21 * S);
			ctx.lineTo(16 * S, -13 * S);
			ctx.lineTo(16 * S, 21 * S);
			ctx.lineTo(-16 * S, 21 * S);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = COLORES.verdeInstitucional;
			ctx.fillRect(-11 * S, -14 * S, 16 * S, 4 * S);
			ctx.fillStyle = COLORES.grisClaro;
			for (let k = 0; k < 4; k++) ctx.fillRect(-11 * S, -5 * S + k * 6 * S, 22 * S, 2.5 * S);
		} else {
			// Carpeta, o una nubecita
			if (f.fase > 3) {
				ctx.fillStyle = COLORES.beige;
				ctx.fillRect(-20 * S, -12 * S, 16 * S, 6 * S);
				rectRedondo(-20 * S, -8 * S, 40 * S, 26 * S, 4 * S);
				ctx.fill();
			} else dibujarIconoMundo("nube", 0, 0, 20 * S, COLORES.blanco);
		}
	},
	// La pizarra: (x0, y0, w, h) = el área blanca
	pizarra(x0, y0, w, h) {
		for (let k = 0; k < 4; k++) {
			const x = x0 + 12 * S + (k > 0 ? 18 * S : 0);
			const y = y0 + 12 * S + k * 17 * S;
			if (k > 0) linea(x0 + 20 * S, y - 8 * S, x0 + 20 * S, y + 5 * S), linea(x0 + 20 * S, y + 5 * S, x, y + 5 * S);
			ctx.fillStyle = COLORES.beige;
			ctx.fillRect(x, y, 22 * S, 12 * S);
			ctx.fillStyle = COLORES.grisClaro;
			ctx.fillRect(x + 28 * S, y + 4 * S, 50 * S, 4 * S);
		}
	},
	// El objeto propio de la oficina, cerca de la computadora (sx = centro, piso = el suelo)
	especial(sx, piso) {
		// Servidor con luces que parpadean (donde vive la nube)
		ctx.fillStyle = "#2e3a3c";
		ctx.fillRect(sx - 30 * S, piso - 150 * S, 60 * S, 150 * S);
		for (let k = 0; k < 7; k++) {
			const y = piso - 140 * S + k * 20 * S;
			ctx.fillStyle = "#3f4c4e";
			ctx.fillRect(sx - 24 * S, y, 48 * S, 14 * S);
			ctx.fillStyle = Math.sin(tiempo * 5 + k * 1.7) > 0 ? "#7fd6c8" : "#2f6b61";
			circulo(sx + 16 * S, y + 7 * S, 2.5 * S);
			ctx.fillStyle = Math.sin(tiempo * 3 + k) > 0.3 ? COLORES.beige : "#5d4f42";
			circulo(sx + 8 * S, y + 7 * S, 2.5 * S);
		}
		dibujarIconoMundo("nube", sx, piso - 170 * S, 16 * S, COLORES.verdeInstitucional);
	},
};
