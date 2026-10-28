/* Mundo Cafetería · cómo se ve por dentro (tema "cafe"): granos de café y notas de música que flotan, el menú en la pizarra y la tostadora de café.
   Lo dibuja el motor (juego/oficina/dibujo-oficina.js) para cada mundo cuyo
   mundo.js dice oficina.tema: "cafe". Usa las herramientas de dibujo del juego:
   ctx, S (escala), tiempo, COLORES, linea, circulo, rectRedondo, conAlfa,
   modulo y dibujarIconoMundo. */
"use strict";

window.TEMAS_OFICINA.cafe = {
	// Cada cosa que flota (ya centrada en su lugar: dibuja alrededor de 0, 0)
	flotante(f) {
		if (f.tipo) {
			// Nota de música (la de Heber llega hasta acá)
			ctx.fillStyle = COLORES.verdeInstitucional;
			ctx.font = `700 ${30 * S}px ${FUENTE}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.rotate(Math.sin(tiempo * 2 + f.fase) * 0.2);
			ctx.fillText(f.fase > 3 ? "♫" : "♪", 0, 0);
			return;
		}
		// Grano de café
		ctx.rotate(tiempo * 0.6 + f.fase);
		ctx.fillStyle = "#6f4a2e";
		ctx.beginPath();
		ctx.ellipse(0, 0, 12 * S, 17 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#3e2716";
		ctx.lineWidth = 2.5 * S;
		ctx.beginPath();
		ctx.moveTo(0, -14 * S);
		ctx.quadraticCurveTo(-6 * S, 0, 0, 14 * S);
		ctx.stroke();
	},
	// La pizarra: el menú del día
	pizarra(x0, y0, w, h) {
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.font = `700 ${12 * S}px ${FUENTE}`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText("MENÚ", x0 + 10 * S, y0 + 13 * S);
		ctx.font = `${10 * S}px ${FUENTE}`;
		["Café de altura", "Capuchino", "Latte", "Té de la casa"].forEach((t, k) => {
			const y = y0 + 31 * S + k * 14 * S;
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillText(t, x0 + 10 * S, y);
			ctx.fillStyle = COLORES.beige;
			ctx.fillRect(x0 + w - 26 * S, y - 3 * S, 14 * S, 6 * S);
		});
	},
	// El objeto propio, cerca de la barra: la tostadora de café
	especial(sx, piso) {
		ctx.fillStyle = "#5e686a";
		ctx.fillRect(sx - 30 * S, piso - 40 * S, 8 * S, 40 * S);
		ctx.fillRect(sx + 22 * S, piso - 40 * S, 8 * S, 40 * S);
		ctx.fillStyle = "#b9c0bf";
		rectRedondo(sx - 40 * S, piso - 100 * S, 80 * S, 62 * S, 26 * S);
		ctx.fill();
		ctx.fillStyle = "#3a4446";
		circulo(sx, piso - 69 * S, 18 * S);
		ctx.fillStyle = "#6f4a2e"; // los granos dando vueltas
		for (let k = 0; k < 5; k++) {
			const a = tiempo * 3 + k * 1.26;
			circulo(sx + Math.cos(a) * 10 * S, piso - 69 * S + Math.sin(a) * 10 * S, 3 * S);
		}
		ctx.fillStyle = "#c9cecd"; // tolva
		ctx.beginPath();
		ctx.moveTo(sx - 20 * S, piso - 124 * S);
		ctx.lineTo(sx + 20 * S, piso - 124 * S);
		ctx.lineTo(sx + 8 * S, piso - 100 * S);
		ctx.lineTo(sx - 8 * S, piso - 100 * S);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.6)"; // humito
		ctx.lineWidth = 2 * S;
		const ola = Math.sin(tiempo * 3) * 4 * S;
		ctx.beginPath();
		ctx.moveTo(sx + 30 * S, piso - 100 * S);
		ctx.quadraticCurveTo(sx + 30 * S + ola, piso - 116 * S, sx + 30 * S - ola, piso - 132 * S);
		ctx.stroke();
	},
};
