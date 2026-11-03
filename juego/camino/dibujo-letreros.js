/* Camino a Celaque — dibujo de los letreros de obra. Ver juego/LEEME.md. */
"use strict";

// ---------- Letreros de obra ----------
// Caballete amarillo con franjas de seguridad, un ícono, el texto y dos
// balizas que parpadean alternadas. Brillan (resplandor que late) para
// que se vean de lejos. El tablero va alto, por encima de los muebles y
// obstáculos, para que no lo tapen.
function dibujarLetrerosObra(zona, modulo) {
	if (escalaLetreros !== S) ubicarLetreros();
	const piso = SUELO + 40 * S;
	for (const l of LETREROS) {
		if (l.zona !== zona || (modulo && l.modulo !== modulo)) continue;
		// Un enemigo vivo cerca: el letrero espera a que lo venzas
		if ((modulo && modulo.oficina.enemigos ? modulo.oficina.enemigos : enemigos).some((e) => !e.derrotado && Math.abs(e.x - l.x) < l.medio + 160 * (e.escala || 1) * S)) continue;
		const sx = l.x - camara;
		if (sx < -200 || sx > W + 200) continue;
		const texto = esTactil ? l.tactil : l.teclado;
		ctx.font = `700 ${14 * S}px ${FUENTE}`;
		const ancho = ctx.measureText(texto).width + 56 * S;
		const alto = 42 * S;
		const x0 = sx - ancho / 2;
		const top = piso - 134 * S;
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3.5 + l.x * 0.01);
		// Si el héroe pasa por detrás, el letrero se vuelve casi
		// transparente para no taparlo.
		const detras = Math.abs(heroe.x - camara - sx) < ancho / 2 + 18 * S;
		ctx.save();
		ctx.globalAlpha = detras ? 0.3 : 1;

		// Patas del caballete
		ctx.strokeStyle = "#2b2b2b";
		ctx.lineWidth = 4 * S;
		linea(sx - ancho * 0.3, top + alto, sx - ancho * 0.36, piso);
		linea(sx + ancho * 0.3, top + alto, sx + ancho * 0.36, piso);

		// Tablero con resplandor
		ctx.save();
		ctx.shadowColor = `rgba(255,196,40,${(0.55 + 0.45 * pulso).toFixed(3)})`;
		ctx.shadowBlur = (16 + 18 * pulso) * S;
		rectRedondo(x0, top, ancho, alto, 6 * S);
		ctx.fillStyle = "#ffc72c";
		ctx.fill();
		ctx.restore();

		// Franja de seguridad negra/amarilla abajo del tablero
		ctx.save();
		rectRedondo(x0, top, ancho, alto, 6 * S);
		ctx.clip();
		ctx.fillStyle = "#1e1e1e";
		const franja = 7 * S;
		for (let x = x0 - franja * 2; x < x0 + ancho + franja; x += franja * 2) {
			ctx.beginPath();
			ctx.moveTo(x, top + alto);
			ctx.lineTo(x + franja, top + alto - franja);
			ctx.lineTo(x + franja * 2, top + alto - franja);
			ctx.lineTo(x + franja, top + alto);
			ctx.fill();
		}
		ctx.restore();
		rectRedondo(x0, top, ancho, alto, 6 * S);
		ctx.strokeStyle = "#1e1e1e";
		ctx.lineWidth = 3 * S;
		ctx.stroke();

		// Ícono (flecha / !) en un círculo negro, y el texto
		const cy = top + (alto - franja) / 2 + 1 * S;
		ctx.fillStyle = "#1e1e1e";
		circulo(x0 + 20 * S, cy, 11 * S);
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillStyle = "#ffc72c";
		ctx.font = `700 ${15 * S}px ${FUENTE}`;
		ctx.fillText(l.flecha, x0 + 20 * S, cy + 1 * S);
		ctx.textAlign = "left";
		ctx.fillStyle = "#1e1e1e";
		ctx.font = `700 ${14 * S}px ${FUENTE}`;
		ctx.fillText(texto, x0 + 38 * S, cy + 1 * S);

		// Balizas: una encendida y la otra apagada, se turnan
		const encendida = Math.sin(tiempo * 6 + l.x) > 0;
		for (const lado of [-1, 1]) {
			const bx = sx + lado * (ancho / 2 - 10 * S);
			const prendida = lado < 0 ? encendida : !encendida;
			ctx.fillStyle = "#2b2b2b";
			ctx.fillRect(bx - 3 * S, top - 7 * S, 6 * S, 8 * S);
			ctx.save();
			if (prendida) {
				ctx.shadowColor = "#ff9a1a";
				ctx.shadowBlur = 18 * S;
			}
			ctx.fillStyle = prendida ? "#ffb21a" : "#7a5a20";
			circulo(bx, top - 11 * S, 5.5 * S);
			ctx.restore();
		}
		ctx.restore();
	}
}
