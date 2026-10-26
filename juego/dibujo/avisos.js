/* Camino a Celaque — avisos flotantes, andamios, barreras y suelo. Ver juego/LEEME.md. */
"use strict";

// ---------- Avisos flotantes (subir de nivel) ----------
function dibujarAvisos(dt) {
	for (const a of avisos) a.t += dt;
	avisos = avisos.filter((a) => a.t < 2.4);
	for (const a of avisos) {
		const x = heroe.x - camara;
		// Nunca debajo de la barra de arriba (p. ej. con el héroe en una nube)
		const y = Math.max(105 * S, SUELO + 38 * S - heroe.y * S - 150 * S) - a.t * 35 * S;
		const alfa = Math.min(1, 2.4 - a.t);
		const zoom = 1 + Math.max(0, 0.3 - a.t) * 1.5;
		ctx.save();
		ctx.globalAlpha = alfa;
		ctx.translate(x, y);
		ctx.scale(zoom, zoom);
		ctx.font = `bold ${24 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.lineWidth = 5 * S;
		ctx.strokeStyle = "rgba(60,40,10,0.85)";
		ctx.strokeText(a.texto, 0, 0);
		ctx.fillStyle = "#ffd23f";
		ctx.fillText(a.texto, 0, 0);
		ctx.restore();
	}
}

// Andamios de obra: tablón de metal con franja de seguridad, patas y
// crucetas hasta el piso. Gris al inicio, colores al acercarse a Celaque.
function dibujarAndamios() {
	const piso = SUELO + 30 * S;
	for (const pl of PLATAFORMAS) {
		const sx = pl.x - camara;
		const w = pl.medioAncho;
		if (sx + w < -20 || sx - w > W + 20) continue;
		const t = tono(pl.x / LARGO);
		const top = SUELO + 38 * S - pl.alto * S;
		const metal = pintar(pl.principal ? "#2f80ed" : pl.eje ? "#ffc300" : "#ff9f1c", t);

		// Patas y crucetas (las plataformas móviles no tienen: van en
		// rieles o colgadas de una grúa)
		if (pl.eje) dibujarGuiaMovil(pl, sx, top, piso, t);
		ctx.strokeStyle = mezclar("#55585d", "#8a96a3", t);
		ctx.lineWidth = 4 * S;
		ctx.lineCap = "butt";
		const patas = pl.eje ? [] : pl.principal ? [-w + 8 * S, 0, w - 8 * S] : [-w + 8 * S, w - 8 * S];
		for (const dx of patas) linea(sx + dx, top, sx + dx, piso);
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		for (let i = 0; i < patas.length - 1; i++) {
			const a = sx + patas[i];
			const b = sx + patas[i + 1];
			for (let y = top + 12 * S; y < piso - 10 * S; y += 60 * S) {
				const y2 = Math.min(piso, y + 50 * S);
				ctx.moveTo(a, y);
				ctx.lineTo(b, y2);
				ctx.moveTo(b, y);
				ctx.lineTo(a, y2);
			}
		}
		ctx.stroke();
		ctx.lineCap = "round";
		// Base de las patas
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		for (const dx of patas) ctx.fillRect(sx + dx - 6 * S, piso - 3 * S, 12 * S, 4 * S);

		// Tablón con franja amarilla/negra
		ctx.fillStyle = metal;
		ctx.fillRect(sx - w, top, w * 2, 12 * S);
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(sx - w, top, w * 2, 3 * S);
		ctx.fillStyle = "rgba(20,20,20,0.6)";
		ctx.fillRect(sx - w, top + 12 * S, w * 2, 5 * S);
		ctx.fillStyle = color("bordillo", t);
		for (let x = sx - w; x < sx + w - 6 * S; x += 16 * S) ctx.fillRect(x, top + 12 * S, 8 * S, 5 * S);

		// Orilla luminosa + balizas en las puntas: marca bien dónde se puede
		// aterrizar (el margen de MARGEN_BORDE queda dentro del brillo).
		const pulso = 0.55 + 0.45 * Math.sin(tiempo * 4 + pl.x);
		ctx.save();
		ctx.shadowColor = "rgba(255,214,64,0.95)";
		ctx.shadowBlur = 14 * S * pulso;
		ctx.fillStyle = `rgba(255,226,110,${(0.55 + 0.4 * pulso).toFixed(3)})`;
		ctx.fillRect(sx - w - 6 * S, top - 3 * S, w * 2 + 12 * S, 4 * S);
		ctx.fillStyle = `rgba(255,170,30,${(0.6 + 0.4 * pulso).toFixed(3)})`;
		circulo(sx - w - 4 * S, top - 4 * S, 4.5 * S);
		circulo(sx + w + 4 * S, top - 4 * S, 4.5 * S);
		ctx.restore();
	}
}

// Elevador: dos rieles del piso hasta lo más alto que llega.
// Viga móvil en x: cuelga de cables, como si la llevara una grúa.
function dibujarGuiaMovil(pl, sx, top, piso, t) {
	const w = pl.medioAncho;
	if (pl.eje === "y") {
		const arriba = SUELO + 38 * S - (pl.alto0 + pl.amp) * S - 24 * S;
		ctx.strokeStyle = mezclar("#55585d", "#8a96a3", t);
		ctx.lineWidth = 4 * S;
		linea(sx - w - 4 * S, piso, sx - w - 4 * S, arriba);
		linea(sx + w + 4 * S, piso, sx + w + 4 * S, arriba);
		ctx.lineWidth = 6 * S;
		linea(sx - w - 10 * S, arriba, sx + w + 10 * S, arriba);
		// Cable del elevador
		ctx.strokeStyle = "rgba(30,30,30,0.7)";
		ctx.lineWidth = 1.5 * S;
		linea(sx, arriba, sx, top);
	} else {
		const nudo = top - 50 * S;
		ctx.strokeStyle = "rgba(30,30,30,0.75)";
		ctx.lineWidth = 1.5 * S;
		linea(sx - w * 0.7, top, sx, nudo);
		linea(sx + w * 0.7, top, sx, nudo);
		linea(sx, nudo, sx, 0);
		ctx.strokeStyle = "#7d858e";
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		ctx.arc(sx, nudo + 6 * S, 6 * S, -Math.PI * 0.5, Math.PI * 0.8);
		ctx.stroke();
	}
}

// Barrera de concreto tipo "New Jersey" con franjas de seguridad
function dibujarBarrera(sx, baseY, topY, w, t) {
	ctx.fillStyle = mezclar("#6e7176", "#d7d9dc", t);
	ctx.beginPath();
	ctx.moveTo(sx - w, baseY);
	ctx.lineTo(sx - w * 0.82, baseY - (baseY - topY) * 0.3);
	ctx.lineTo(sx - w * 0.45, topY);
	ctx.lineTo(sx + w * 0.45, topY);
	ctx.lineTo(sx + w * 0.82, baseY - (baseY - topY) * 0.3);
	ctx.lineTo(sx + w, baseY);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "rgba(0,0,0,0.15)";
	ctx.fillRect(sx + w * 0.2, topY, w * 0.25, baseY - topY);
	// Franjas diagonales rojas/blancas (se pintan al recuperar el color)
	ctx.save();
	ctx.beginPath();
	ctx.rect(sx - w * 0.6, topY + (baseY - topY) * 0.2, w * 1.2, (baseY - topY) * 0.32);
	ctx.clip();
	ctx.fillStyle = pintar("#e63946", t);
	for (let x = sx - w * 1.2; x < sx + w; x += 14 * S) {
		ctx.beginPath();
		ctx.moveTo(x, topY + (baseY - topY) * 0.52);
		ctx.lineTo(x + 7 * S, topY + (baseY - topY) * 0.52);
		ctx.lineTo(x + 7 * S + (baseY - topY) * 0.32, topY + (baseY - topY) * 0.2);
		ctx.lineTo(x + (baseY - topY) * 0.32, topY + (baseY - topY) * 0.2);
		ctx.fill();
	}
	ctx.restore();
}

function dibujarSuelo() {
	const t0 = tono(camara / LARGO);
	const t1 = tono((camara + W) / LARGO);
	const degradado = (clave) => {
		const g = ctx.createLinearGradient(0, 0, W, 0);
		g.addColorStop(0, color(clave, t0));
		g.addColorStop(1, color(clave, t1));
		return g;
	};

	// Asfalto
	ctx.fillStyle = degradado("asfalto");
	ctx.fillRect(0, SUELO, W, H - SUELO);

	// Acera de concreto con juntas
	ctx.fillStyle = degradado("acera");
	ctx.fillRect(0, SUELO - 2 * S, W, 18 * S);
	ctx.fillStyle = "rgba(255,255,255,0.14)";
	ctx.fillRect(0, SUELO - 2 * S, W, 4 * S);
	ctx.fillStyle = "rgba(0,0,0,0.14)";
	const pasoJunta = 64 * S;
	for (let sx = -modulo(camara, pasoJunta); sx < W; sx += pasoJunta) ctx.fillRect(sx, SUELO - 2 * S, 2 * S, 16 * S);

	// Bordillo pintado de seguridad (amarillo / negro)
	ctx.fillStyle = "rgba(25,25,25,0.55)";
	ctx.fillRect(0, SUELO + 14 * S, W, 6 * S);
	ctx.fillStyle = degradado("bordillo");
	const pasoFranja = 26 * S;
	for (let sx = -modulo(camara, pasoFranja); sx < W; sx += pasoFranja) ctx.fillRect(sx, SUELO + 14 * S, 13 * S, 6 * S);

	// Sendero por donde camina el protagonista
	ctx.fillStyle = "rgba(255,255,255,0.08)";
	ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);

	// Línea discontinua de la calle
	ctx.fillStyle = degradado("marca");
	const pasoLinea = 80 * S;
	for (let sx = -modulo(camara, pasoLinea); sx < W; sx += pasoLinea) ctx.fillRect(sx, SUELO + 52 * S, 40 * S, 4 * S);

	// Franja de pasto al frente (el verde vuelve poco a poco)
	ctx.fillStyle = degradado("pasto");
	ctx.fillRect(0, SUELO + 62 * S, W, H - SUELO);
}
