/* Camino a Celaque — dibujo de la obra al aire libre (Proyectos). Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: obra (mundo.js → oficina.exterior) ----------
// Cielo y ciudad con grúas (los mismos del ventanal de la oficina), el
// edificio del proyecto que se va levantando al fondo, el suelo que cambia
// de zona en zona y, en cada zona, su escena, su puerta y su riesgo.
// Lógica y medidas de la obra: obra.js y OBRA (modulos.js).

CIELOS_VISTA.obra = CIELOS_VISTA.construccion; // mismo cielo, con su propia caché de degradados
const IMG_OBRA = {
	menu: cargarImagen("assets/obra/wrike-menu.png"),
	formularios: cargarImagen("assets/obra/wrike-formularios.png"),
};
// Cómo es el suelo de cada zona: tierra, grava, madera, concreto y pavimento nuevo
const SUELOS_OBRA = ["#a68b63", "#9c9a90", "#b19a74", "#a3a8a8", "#79868a"];
const AMARILLO_OBRA = "#ffc72c";

// ---------- Fondo ----------
function dibujarFondoObra(m, dt) {
	const of = m.oficina;
	const cl = camara - of.x0;
	const horizonte = SUELO * 0.5;
	const g = degradadosOficina(0, SUELO, horizonte, "obra");
	dibujarVistaVentanal(0, SUELO, horizonte, g, cl, dt, "construccion");
	dibujarEdificioEnObra(m);
	// Bruma al pie del horizonte: el suelo no se corta en seco con la ciudad
	const bruma = ctx.createLinearGradient(0, SUELO - 70 * S, 0, SUELO);
	bruma.addColorStop(0, "rgba(227,238,235,0)");
	bruma.addColorStop(1, "rgba(227,238,235,0.55)");
	ctx.fillStyle = bruma;
	ctx.fillRect(0, SUELO - 70 * S, W, 70 * S);

	// Vallas de obra en los extremos
	const piso = SUELO + 38 * S;
	for (const [x, lado] of [[of.x0 - camara, -1], [of.terminalX + 140 - camara, 1]]) {
		if (lado < 0 ? x <= 0 : x >= W) continue;
		const x0 = lado < 0 ? 0 : x;
		const ancho = lado < 0 ? x : W - x;
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(x0, piso - 190 * S, ancho, H);
		ctx.fillStyle = AMARILLO_OBRA;
		ctx.fillRect(x0, piso - 190 * S, ancho, 12 * S);
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		for (let y = piso - 160 * S; y < H; y += 46 * S) ctx.fillRect(x0, y, ancho, 3 * S);
	}
}

// El edificio del proyecto (la foto del Distrito Artemisa) al fondo: se
// levanta con cada riesgo vencido. Lo que todavía no está construido se ve
// como andamio. Con la obra completa, queda terminado.
function dibujarEdificioEnObra(m) {
	const of = m.oficina;
	const alto = SUELO * 0.82;
	const el = m.fotoImg && m.fotoImg.elemento;
	const w0 = el ? el.naturalWidth || el.width : 0;
	const h0 = el ? el.naturalHeight || el.height : 0;
	const ancho = el ? Math.min(alto * (w0 / h0), W * 0.46) : alto * 0.55;
	const x = W * 0.8 - ancho / 2 - (camara - of.x0) * 0.02;
	if (x > W || x + ancho < 0) return;
	const avance = avanceObra(of);
	const f = lerp(0.1, 1, avance);
	const hecho = alto * f;
	// Andamio de lo que falta
	if (f < 0.999) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(x - 6 * S, SUELO - alto - 6 * S, ancho + 12 * S, alto - hecho + 6 * S);
		ctx.clip();
		ctx.strokeStyle = "rgba(120,135,132,0.32)";
		ctx.lineWidth = 2 * S;
		const cw = 36 * S;
		const ch = 32 * S;
		for (let gx = x; gx <= x + ancho + 1; gx += cw) linea(gx, SUELO - alto, gx, SUELO - hecho);
		for (let gy = SUELO - hecho; gy > SUELO - alto - ch; gy -= ch) linea(x, gy, x + ancho, gy);
		ctx.lineWidth = 1.5 * S;
		let fila = 0;
		for (let gy = SUELO - hecho; gy > SUELO - alto; gy -= ch, fila++) {
			for (let gx = x, c = 0; gx < x + ancho; gx += cw, c++) if ((c + fila) % 3 === 0) linea(gx, gy, gx + cw, gy - ch);
		}
		ctx.restore();
	}
	if (el) {
		// Solo la parte de abajo ya construida
		const sh = h0 * f;
		ctx.drawImage(el, 0, h0 - sh, w0, sh, x, SUELO - hecho, ancho, hecho);
	} else {
		ctx.fillStyle = "#8ea6a1";
		ctx.fillRect(x + ancho * 0.1, SUELO - hecho, ancho * 0.8, hecho);
	}
	if (f < 0.999) dibujarGruaVista(x + ancho * 0.22, SUELO - hecho, 7);
}

// ---------- Suelo ----------
function dibujarSueloObra(m) {
	const of = m.oficina;
	const n = of.zonas.length;
	// El suelo cambia de color entre los centros de las zonas (que no miden todas lo mismo)
	const centros = of.zonas.map((z) => z.x + z.ancho / 2);
	const colorEn = (xm) => {
		let k = 0;
		while (k < n - 2 && xm >= centros[k + 1]) k++;
		const t = clamp((xm - centros[k]) / (centros[k + 1] - centros[k]), 0, 1);
		return mezclar(SUELOS_OBRA[k % SUELOS_OBRA.length], SUELOS_OBRA[(k + 1) % SUELOS_OBRA.length], t);
	};
	const g = ctx.createLinearGradient(0, 0, W, 0);
	for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, colorEn(camara + (W * i) / 6));
	ctx.fillStyle = g;
	ctx.fillRect(0, SUELO, W, H - SUELO);
	// Un poco de profundidad: más oscuro hacia abajo
	const sombra = ctx.createLinearGradient(0, SUELO, 0, H);
	sombra.addColorStop(0, "rgba(255,255,255,0.12)");
	sombra.addColorStop(1, "rgba(0,0,0,0.28)");
	ctx.fillStyle = sombra;
	ctx.fillRect(0, SUELO, W, H - SUELO);
	// Bordillo pintado de seguridad (amarillo / negro)
	ctx.fillStyle = "rgba(25,25,25,0.55)";
	ctx.fillRect(0, SUELO + 14 * S, W, 6 * S);
	ctx.fillStyle = AMARILLO_OBRA;
	const paso = 26 * S;
	for (let sx = -modulo(camara, paso); sx < W; sx += paso) ctx.fillRect(sx, SUELO + 14 * S, 13 * S, 6 * S);
	// Sendero por donde se camina y huellas de llantas
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.fillRect(0, SUELO + 26 * S, W, 22 * S);
	ctx.fillStyle = "rgba(0,0,0,0.08)";
	ctx.fillRect(0, SUELO + 62 * S, W, 5 * S);
	ctx.fillRect(0, SUELO + 78 * S, W, 5 * S);
	// Piedritas y manchas que se mueven con el suelo
	ctx.fillStyle = "rgba(0,0,0,0.12)";
	const azar = crearAzar(5);
	for (let k = 0; k < 60; k++) {
		const u = azar() * 1800;
		const sx = modulo(u * S - camara, 1800 * S) - 60 * S;
		circulo(sx, SUELO + (24 + azar() * 90) * S, (1.5 + azar() * 2.5) * S);
	}
}

// ---------- Puerta de la obra (la salida, al inicio) ----------
function dibujarPuertaObra(m) {
	const of = m.oficina;
	const sx = of.x0 + 70 - camara;
	if (sx < -120 || sx > W + 120) return;
	const piso = SUELO + 38 * S;
	// Reja de la obra
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(sx - 50 * S, piso - 120 * S, 8 * S, 120 * S);
	ctx.fillRect(sx + 42 * S, piso - 120 * S, 8 * S, 120 * S);
	ctx.strokeStyle = "#5e686a";
	ctx.lineWidth = 3 * S;
	for (let gx = sx - 38 * S; gx < sx + 40 * S; gx += 14 * S) linea(gx, piso - 8 * S, gx, piso - 112 * S);
	linea(sx - 42 * S, piso - 112 * S, sx + 42 * S, piso - 112 * S);
	linea(sx - 42 * S, piso - 60 * S, sx + 42 * S, piso - 60 * S);
	ctx.fillStyle = COLORES.verdeInstitucional;
	rectRedondo(sx - 34 * S, piso - 156 * S, 68 * S, 24 * S, 6 * S);
	ctx.fill();
	ctx.fillStyle = "#fff";
	ctx.font = `bold ${12 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("SALIDA", sx, piso - 144 * S);
	if (estado === "oficina" && enSalidaOficina()) dibujarGlobo(sx, piso - 166 * S, esTactil ? "Toca Hablar: volver al mapa" : "E · Volver al mapa", COLORES.fondoVerdeClaro);
}

// ---------- Escenas de cada zona ----------
function poste(x, piso, alto, ancho = 5, color = "#5e686a") {
	ctx.fillStyle = color;
	ctx.fillRect(x - (ancho * S) / 2, piso - alto, ancho * S, alto);
}

// Una pantalla (captura de Wrike) con marco y un numerito en la esquina
function pantallaObra(img, x, y, h, numero) {
	const el = img.elemento;
	const w = el ? h * ((el.naturalWidth || el.width) / (el.naturalHeight || el.height)) : h;
	ctx.fillStyle = "#1c2526";
	rectRedondo(x - 5 * S, y - 5 * S, w + 10 * S, h + 10 * S, 6 * S);
	ctx.fill();
	if (el) ctx.drawImage(el, x, y, w, h);
	else {
		ctx.fillStyle = COLORES.fondoVerdeClaro;
		ctx.fillRect(x, y, w, h);
	}
	ctx.fillStyle = COLORES.verdeInstitucional;
	circulo(x, y, 12 * S);
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `700 ${13 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(String(numero), x, y + 1 * S);
	return w;
}

// Lo que se ve en cada zona es poco y claro: lo que explica el tema lo dicen
// la persona de la zona y las preguntas del riesgo, no letreros.
const ESCENAS_OBRA = {
	// 1 · La idea: un terreno baldío con estacas y un foco encendido
	idea(z, piso) {
		const base = z.x - camara;
		for (let k = 0; k < 10; k++) {
			const sx = base + 80 + k * 170;
			poste(sx, piso, 40 * S, 4, "#8a5f34");
			ctx.fillStyle = k % 2 ? "#e63946" : "#ffffff";
			ctx.fillRect(sx, piso - 40 * S, 18 * S, 7 * S);
		}
		ctx.fillStyle = "#8f7752";
		ctx.beginPath();
		ctx.ellipse(base + 620, piso, 70 * S, 28 * S, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		const fx = base + 600;
		poste(fx, piso, 170 * S, 5, "#5e686a");
		ctx.save();
		ctx.shadowColor = "#ffe066";
		ctx.shadowBlur = (24 + 12 * Math.sin(tiempo * 3)) * S;
		ctx.fillStyle = "#fff1a8";
		circulo(fx, piso - 186 * S, 20 * S);
		ctx.restore();
		ctx.fillStyle = "#5e686a";
		ctx.fillRect(fx - 8 * S, piso - 168 * S, 16 * S, 9 * S);
	},

	// 2 · La caseta de solicitudes: dos pantallas de Wrike, una al lado de la otra
	caseta(z, piso) {
		const base = z.x - camara;
		const hP = 110 * S;
		const x0 = base + 640;
		const total = hP * (560 / 516) + hP * (758 / 435) + 28 * S;
		const yTop = piso - 118 * S - hP;
		poste(x0 + 30 * S, piso, 118 * S, 6, "#5e686a");
		poste(x0 + total - 30 * S, piso, 118 * S, 6, "#5e686a");
		ctx.fillStyle = "#f4f6f5";
		rectRedondo(x0 - 10 * S, yTop - 14 * S, total + 20 * S, hP + 28 * S, 10 * S);
		ctx.fill();
		let px = x0 + 6 * S;
		px += pantallaObra(IMG_OBRA.menu, px, yTop, hP, 1) + 16 * S;
		pantallaObra(IMG_OBRA.formularios, px, yTop, hP, 2);
	},

	// 3 · La mesa de planos: el requerimiento de usuario
	planos(z, piso) {
		const base = z.x - camara;
		const px = base + 620;
		const w = 220 * S;
		const h = 120 * S;
		const y0 = piso - 120 * S - h;
		ctx.strokeStyle = "#5e686a";
		ctx.lineWidth = 5 * S;
		linea(px - w * 0.3, y0 + h, px - w * 0.36, piso);
		linea(px + w * 0.3, y0 + h, px + w * 0.36, piso);
		ctx.fillStyle = COLORES.blanco;
		ctx.fillRect(px - w / 2, y0, w, h);
		ctx.strokeStyle = "#9aa5a6";
		ctx.lineWidth = 3 * S;
		ctx.strokeRect(px - w / 2, y0, w, h);
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(px - w / 2, y0, w, 28 * S);
		ctx.fillStyle = COLORES.blanco;
		ctx.font = `700 ${13 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Requerimiento de usuario", px, y0 + 15 * S);
		// Los campos del requerimiento; el de criterios de aceptación, marcado
		ctx.textAlign = "left";
		ctx.font = `700 ${11 * S}px ${FUENTE}`;
		const lx = px - w / 2 + 14 * S;
		["Objetivo", "Descripción de la necesidad", "Criterios de aceptación"].forEach((campo, k) => {
			const y = y0 + 48 * S + k * 24 * S;
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillText(campo, lx + (k === 2 ? 18 * S : 0), y);
			if (k === 2) {
				ctx.strokeStyle = COLORES.verdeInstitucional;
				ctx.lineWidth = 2 * S;
				ctx.strokeRect(lx, y - 6 * S, 11 * S, 11 * S);
				ctx.beginPath();
				ctx.moveTo(lx + 2 * S, y - 1 * S);
				ctx.lineTo(lx + 5 * S, y + 3 * S);
				ctx.lineTo(lx + 11 * S, y - 8 * S);
				ctx.stroke();
			}
			ctx.fillStyle = "#e3e8e7";
			ctx.fillRect(lx, y + 6 * S, w - 28 * S, 4 * S);
		});
	},

	// 4 · La reunión de alcance: una carpa con una mesa de reunión (sin letreros)
	reunion(z, piso) {
		const base = z.x - camara;
		const cx = base + 970;
		const ancho = 250 * S;
		// Postes y techo de la carpa, a franjas
		poste(cx - ancho / 2 + 10 * S, piso, 130 * S, 6, "#5e686a");
		poste(cx + ancho / 2 - 10 * S, piso, 130 * S, 6, "#5e686a");
		const techo = (k) => {
			const x0 = cx - ancho / 2 - 10 * S + k * ((ancho + 20 * S) / 8);
			const w = (ancho + 20 * S) / 8;
			ctx.fillStyle = k % 2 ? COLORES.blanco : COLORES.verdeInstitucional;
			ctx.beginPath();
			ctx.moveTo(x0, piso - 130 * S);
			ctx.lineTo(x0 + w, piso - 130 * S);
			ctx.lineTo(x0 + w * 0.75 + (cx - (x0 + w / 2)) * 0.05, piso - 168 * S);
			ctx.lineTo(x0 + w * 0.25 + (cx - (x0 + w / 2)) * 0.05, piso - 168 * S);
			ctx.closePath();
			ctx.fill();
		};
		for (let k = 0; k < 8; k++) techo(k);
		ctx.fillStyle = "rgba(0,0,0,0.12)";
		ctx.fillRect(cx - ancho / 2 - 10 * S, piso - 130 * S, ancho + 20 * S, 6 * S);
		// Mesa con papeles y una laptop
		ctx.fillStyle = "#a07c58";
		ctx.fillRect(cx - 70 * S, piso - 50 * S, 140 * S, 8 * S);
		ctx.fillRect(cx - 62 * S, piso - 42 * S, 7 * S, 42 * S);
		ctx.fillRect(cx + 55 * S, piso - 42 * S, 7 * S, 42 * S);
		ctx.fillStyle = COLORES.blanco;
		ctx.fillRect(cx - 40 * S, piso - 54 * S, 26 * S, 5 * S);
		ctx.fillRect(cx + 8 * S, piso - 53 * S, 22 * S, 4 * S);
		ctx.fillStyle = "#3a4446";
		ctx.fillRect(cx - 4 * S, piso - 66 * S, 20 * S, 14 * S);
		// Sillas a los lados
		for (const d of [-1, 1]) {
			const sxs = cx + d * 100 * S;
			ctx.fillStyle = COLORES.verdeProfundo;
			rectRedondo(sxs - 14 * S, piso - 34 * S, 28 * S, 7 * S, 3 * S);
			ctx.fill();
			rectRedondo(sxs + d * 10 * S - 3 * S, piso - 62 * S, 6 * S, 30 * S, 3 * S);
			ctx.fill();
			ctx.fillRect(sxs - 2 * S, piso - 28 * S, 4 * S, 28 * S);
		}
	},

	// 5 · La obra y el cierre: un andamio con grúa (sin letreros)
	obra(z, piso) {
		const base = z.x - camara;
		for (const ax of [base + 560]) {
			ctx.strokeStyle = "#7d8a87";
			ctx.lineWidth = 3 * S;
			for (let k = 0; k < 3; k++) linea(ax + k * 44 * S, piso, ax + k * 44 * S, piso - 190 * S);
			for (let k = 1; k <= 4; k++) linea(ax, piso - k * 46 * S, ax + 88 * S, piso - k * 46 * S);
			ctx.strokeStyle = "#a9b4b1";
			for (let k = 0; k < 4; k++) linea(ax, piso - k * 46 * S, ax + 88 * S, piso - (k + 1) * 46 * S);
		}
		dibujarGruaVista(base + 626, piso - 190 * S, 3);
	},
};

// Puerta de cada zona: un arco de obra con el nombre de la zona
function dibujarPuertaZona(z, m) {
	const sx = z.x - camara;
	if (sx < -260 || sx > W + 260) return;
	const piso = SUELO + 38 * S;
	const alto = 200 * S;
	const ancho = 170 * S;
	const abierta = z.indice === 0 || m.oficina.enemigos[z.indice - 1].derrotado;
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(sx - ancho / 2 - 6 * S, piso - alto, 11 * S, alto);
	ctx.fillRect(sx + ancho / 2 - 5 * S, piso - alto, 11 * S, alto);
	// Travesaño amarillo con franjas
	ctx.save();
	ctx.beginPath();
	ctx.rect(sx - ancho / 2 - 6 * S, piso - alto, ancho + 12 * S, 20 * S);
	ctx.clip();
	ctx.fillStyle = AMARILLO_OBRA;
	ctx.fillRect(sx - ancho / 2 - 6 * S, piso - alto, ancho + 12 * S, 20 * S);
	ctx.fillStyle = "#222";
	for (let x = sx - ancho / 2 - 30 * S; x < sx + ancho / 2 + 20 * S; x += 28 * S) {
		ctx.beginPath();
		ctx.moveTo(x, piso - alto + 20 * S);
		ctx.lineTo(x + 14 * S, piso - alto + 20 * S);
		ctx.lineTo(x + 34 * S, piso - alto);
		ctx.lineTo(x + 20 * S, piso - alto);
		ctx.fill();
	}
	ctx.restore();
	// Nombre de la zona colgado del arco; su borde es verde si la zona está
	// abierta (el riesgo anterior ya se venció) y amarillo si no
	ctx.font = `700 ${14 * S}px ${FUENTE}`;
	const texto = z.nombre;
	const w = ctx.measureText(texto).width + 36 * S;
	const cy = piso - alto + 48 * S;
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(sx - w / 2, cy - 18 * S, w, 36 * S, 12 * S);
	ctx.fill();
	ctx.strokeStyle = abierta ? "#7fe0a8" : "#ffc72c";
	ctx.lineWidth = 3 * S;
	ctx.stroke();
	ctx.fillStyle = COLORES.blanco;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, sx, cy + 1 * S);
}

function dibujarEscenasObra(m) {
	const piso = SUELO + 38 * S;
	for (const z of m.oficina.zonas) {
		const dibujo = ESCENAS_OBRA[z.escena];
		const sx = z.x - camara;
		if (dibujo && sx > -z.ancho && sx < W + 200) dibujo(z, piso);
		dibujarPuertaZona(z, m);
	}
}

// ---------- Inauguración (el final de la obra: cortar la cinta) ----------
function dibujarInauguracion(m) {
	const of = m.oficina;
	const sx = of.terminalX - 50 - camara;
	if (sx < -260 || sx > W + 260) return;
	const piso = SUELO + 38 * S;
	const alto = 210 * S;
	const ancho = 190 * S;
	const cortada = m.completo && !riesgoPendiente(of);
	// Postes con globos
	for (const lado of [-1, 1]) {
		poste(sx + lado * ancho / 2, piso, alto, 8, "#cfd7d4");
		const gx = sx + lado * (ancho / 2 + 20 * S);
		for (const [dy, col] of [[0, "#e63946"], [26, AMARILLO_OBRA], [-24, COLORES.verdeInstitucional]]) {
			const flota = Math.sin(tiempo * 1.6 + lado + dy) * 4 * S;
			ctx.strokeStyle = "rgba(0,0,0,0.25)";
			ctx.lineWidth = 1.5 * S;
			linea(gx, piso - alto + 20 * S, gx - lado * 4 * S, piso - alto + 70 * S + dy * S);
			ctx.fillStyle = col;
			ctx.beginPath();
			ctx.ellipse(gx, piso - alto - 8 * S + dy * S * 0.6 + flota, 15 * S, 19 * S, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	// Letrero
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(sx - ancho / 2 - 20 * S, piso - alto - 16 * S, ancho + 40 * S, 44 * S, 10 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `700 ${18 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("INAUGURACIÓN", sx, piso - alto + 6 * S);
	// La cinta: cortada se ve en dos mitades caídas
	const yc = piso - 70 * S;
	ctx.strokeStyle = "#e63946";
	ctx.lineWidth = 12 * S;
	ctx.lineCap = "round";
	if (!cortada) {
		linea(sx - ancho / 2, yc, sx + ancho / 2, yc);
		ctx.fillStyle = "#c1272d";
		ctx.beginPath();
		ctx.moveTo(sx, yc);
		for (const d of [-1, 1]) ctx.quadraticCurveTo(sx + d * 40 * S, yc - 30 * S, sx + d * 28 * S, yc + 22 * S);
		ctx.fill();
	} else {
		linea(sx - ancho / 2, yc, sx - 24 * S, yc + 40 * S);
		linea(sx + ancho / 2, yc, sx + 24 * S, yc + 40 * S);
	}
	ctx.lineCap = "butt";
	if (estado === "oficina" && enTerminal() && !m.completo) dibujarGlobo(sx, piso - alto - 34 * S, esTactil ? "Toca Hablar: cortar la cinta" : `E · ${ESTACIONES.inauguracion.usar}`, COLORES.fondoVerdeClaro);
}

// ---------- Los riesgos: enemigos de cada zona ----------
// Se dibujan con trazos (no con fotos): cada uno en un cuadro de unos 100 de
// alto con los pies en (0, 0), mirando hacia la izquierda (de donde viene el
// héroe). e.atacando lo hace embestir; e.cayendo (0 a 1) lo derrumba.
function ojosRiesgo(x, y, sep, r, mira = -1) {
	for (const d of [-1, 1]) {
		const ex = x + d * sep;
		ctx.fillStyle = "#fff";
		circulo(ex, y, r);
		ctx.fillStyle = "#1c2526";
		circulo(ex + mira * r * 0.35, y + r * 0.1, r * 0.5);
		// Ceja enojada
		ctx.strokeStyle = "#1c2526";
		ctx.lineWidth = r * 0.5;
		ctx.lineCap = "round";
		linea(ex - d * r * 1.1, y - r * 1.5 - d * r * 0.1, ex + d * r * 0.9, y - r * 0.95);
		ctx.lineCap = "butt";
	}
}

function piernasRiesgo(x, y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x - 15, y - 22, 9, 22);
	ctx.fillRect(x + 6, y - 22, 9, 22);
	ctx.fillStyle = "#2b2b2b";
	ctx.beginPath();
	ctx.ellipse(x - 12, y - 1, 11, 5, 0, 0, Math.PI * 2);
	ctx.ellipse(x + 10, y - 1, 11, 5, 0, 0, Math.PI * 2);
	ctx.fill();
}

const DIBUJOS_RIESGO = {
	// La Tarea Disfrazada: lo que se repite todos los meses, con lentes y bigote
	tarea(e) {
		piernasRiesgo(0, 0, "#6e7480");
		ctx.fillStyle = "#cfd3da";
		rectRedondo(-30, -98, 60, 78, 8);
		ctx.fill();
		ctx.fillStyle = "#59606c"; // el sujetapapeles
		rectRedondo(-12, -104, 24, 14, 4);
		ctx.fill();
		// La flecha que se repite (↻)
		ctx.strokeStyle = "#59606c";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.arc(0, -34, 13, 0.4, Math.PI * 1.65);
		ctx.stroke();
		ctx.fillStyle = "#59606c";
		ctx.beginPath();
		ctx.moveTo(8, -52);
		ctx.lineTo(18, -46);
		ctx.lineTo(6, -43);
		ctx.fill();
		// Lentes y bigote del disfraz
		ctx.strokeStyle = "#1c2526";
		ctx.lineWidth = 3;
		for (const d of [-1, 1]) {
			ctx.beginPath();
			ctx.arc(d * 11, -72, 8, 0, Math.PI * 2);
			ctx.stroke();
		}
		linea(-3, -72, 3, -72);
		ojosRiesgo(0, -72, 11, 3.6);
		ctx.fillStyle = "#1c2526";
		ctx.beginPath();
		ctx.moveTo(-14, -56);
		ctx.quadraticCurveTo(-7, -64, 0, -58);
		ctx.quadraticCurveTo(7, -64, 14, -56);
		ctx.quadraticCurveTo(7, -52, 0, -55);
		ctx.quadraticCurveTo(-7, -52, -14, -56);
		ctx.fill();
		// Etiqueta de "PROYECTO" pegada
		ctx.save();
		ctx.translate(-14, -26);
		ctx.rotate(-0.25);
		ctx.fillStyle = "#ffe066";
		ctx.fillRect(-18, -7, 36, 14);
		ctx.fillStyle = "#1c2526";
		ctx.font = "700 8px " + FUENTE;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("PROYECTO", 0, 0.5);
		ctx.restore();
		// Brazos
		const m = e.atacando ? -1.2 : Math.sin(tiempo * 3) * 0.2;
		ctx.strokeStyle = "#6e7480";
		ctx.lineWidth = 5;
		ctx.lineCap = "round";
		linea(-30, -70, -46, -52 + m * 18);
		linea(30, -70, 44, -50);
		ctx.lineCap = "butt";
	},

	// El Mensaje Perdido: un sobre con alas que vuela sin llegar a nadie
	mensaje(e) {
		const vuelo = -34 + Math.sin(tiempo * 4) * 5;
		ctx.save();
		ctx.translate(0, vuelo);
		// Alas
		const aleteo = Math.sin(tiempo * 16) * 0.5;
		ctx.fillStyle = "#f4f6f5";
		ctx.strokeStyle = "#b8c4c1";
		ctx.lineWidth = 2;
		for (const d of [-1, 1]) {
			ctx.save();
			ctx.translate(d * 34, -52);
			ctx.rotate(d * (0.6 + aleteo));
			ctx.beginPath();
			ctx.ellipse(d * 18, 0, 28, 10, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.restore();
		}
		// El sobre
		ctx.fillStyle = "#f2ecda";
		ctx.fillRect(-38, -80, 76, 52);
		ctx.strokeStyle = "#b8ad8a";
		ctx.lineWidth = 3;
		ctx.strokeRect(-38, -80, 76, 52);
		ctx.fillStyle = "#e3d9bb";
		ctx.beginPath();
		ctx.moveTo(-38, -80);
		ctx.lineTo(0, -52);
		ctx.lineTo(38, -80);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#c1272d";
		circulo(0, -52, 7);
		ojosRiesgo(0, -62, 14, 5);
		ctx.fillStyle = "#1c2526";
		ctx.fillRect(-12, -40, 24, 3); // boca
		// Burbujas de mensajes que no llegan
		for (let k = 0; k < 3; k++) {
			const t = (tiempo * 0.5 + k / 3) % 1;
			const bx = -46 - k * 6 + Math.sin(t * 6) * 6;
			const by = -90 - t * 46;
			ctx.globalAlpha = 1 - t;
			ctx.fillStyle = "#3f9b5a";
			rectRedondo(bx - 13, by - 10, 26, 18, 7);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.font = "700 12px " + FUENTE;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("?", bx, by);
			ctx.globalAlpha = 1;
		}
		ctx.restore();
	},

	// El Requerimiento Vago: una hoja arrugada con garabatos y signos de pregunta
	papel(e) {
		const tiembla = Math.sin(tiempo * 5) * 0.03;
		ctx.save();
		ctx.rotate(tiembla);
		piernasRiesgo(0, 0, "#8a7a3a");
		ctx.fillStyle = "#f3e7b5";
		ctx.strokeStyle = "#b9a55a";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(-32, -22);
		const pts = [[-36, -44], [-30, -64], [-36, -84], [-22, -98], [-6, -92], [8, -102], [22, -94], [34, -100], [32, -78], [38, -58], [30, -40], [34, -24], [14, -18], [-6, -24]];
		for (const [px, py] of pts) ctx.lineTo(px, py);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		// Dobleces
		ctx.strokeStyle = "rgba(120,100,40,0.35)";
		ctx.lineWidth = 2;
		linea(-26, -44, 4, -58);
		linea(12, -86, 30, -50);
		// Garabatos
		ctx.strokeStyle = "#5b6b9a";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-26, -34);
		for (let k = 0; k < 8; k++) ctx.lineTo(-26 + k * 6, -34 + (k % 2 ? -5 : 5));
		ctx.stroke();
		ctx.fillStyle = "#c1272d";
		ctx.font = "700 20px " + FUENTE;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("???", 2, -42);
		ojosRiesgo(0, -74, 12, 4.2);
		ctx.strokeStyle = "#1c2526";
		ctx.lineWidth = 3;
		const brazo = e.atacando ? -1 : Math.sin(tiempo * 4) * 0.3;
		ctx.lineCap = "round";
		linea(-34, -58, -50, -42 + brazo * 14);
		linea(34, -58, 50, -44);
		ctx.lineCap = "butt";
		ctx.restore();
	},

	// El Alcance Infinito: una masa verde que no deja de crecer, con "+" que se le pegan
	blob(e) {
		const pulso = 1 + Math.sin(tiempo * 2.4) * 0.05;
		ctx.save();
		ctx.translate(0, -48);
		ctx.scale(pulso, 1 / pulso);
		// Tentáculos
		ctx.strokeStyle = "#4b9a5c";
		ctx.lineWidth = 9;
		ctx.lineCap = "round";
		for (let k = 0; k < 5; k++) {
			const a = Math.PI * (0.85 + k * 0.32);
			const largo = 44 + Math.sin(tiempo * 3 + k) * 8;
			ctx.beginPath();
			ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
			ctx.quadraticCurveTo(Math.cos(a) * 52 + Math.sin(tiempo * 2 + k) * 6, Math.sin(a) * 52, Math.cos(a) * largo * 1.3, Math.sin(a) * largo * 1.3);
			ctx.stroke();
		}
		ctx.lineCap = "butt";
		// Cuerpo de gelatina
		ctx.fillStyle = "#5aa86a";
		ctx.beginPath();
		for (let k = 0; k <= 40; k++) {
			const a = (k / 40) * Math.PI * 2;
			const r = 44 + Math.sin(a * 5 + tiempo * 3) * 4 + Math.sin(a * 3 - tiempo * 2) * 3;
			const px = Math.cos(a) * r;
			const py = Math.sin(a) * r * 0.82;
			if (k === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.beginPath();
		ctx.ellipse(-16, -22, 14, 8, -0.5, 0, Math.PI * 2);
		ctx.fill();
		ojosRiesgo(0, -8, 15, 6);
		// Boca con dientes
		ctx.fillStyle = "#1c2526";
		ctx.beginPath();
		ctx.moveTo(-20, 18);
		ctx.quadraticCurveTo(0, 36, 20, 18);
		ctx.quadraticCurveTo(0, 26, -20, 18);
		ctx.fill();
		ctx.fillStyle = "#fff";
		for (const px of [-12, -4, 4, 12]) {
			ctx.beginPath();
			ctx.moveTo(px - 3, 20);
			ctx.lineTo(px + 3, 20);
			ctx.lineTo(px, 27);
			ctx.fill();
		}
		ctx.restore();
		// Lo que se le va pegando: más y más "+"
		for (let k = 0; k < 4; k++) {
			const a = tiempo * 0.9 + k * 1.6;
			const px = Math.cos(a) * 64;
			const py = -52 + Math.sin(a) * 40;
			ctx.fillStyle = "#ffe066";
			circulo(px, py, 10);
			ctx.fillStyle = "#1c2526";
			ctx.fillRect(px - 5, py - 1.5, 10, 3);
			ctx.fillRect(px - 1.5, py - 5, 3, 10);
		}
	},

	// El Proyecto Eterno: un reloj gigante que nunca llega a la hora del cierre
	reloj(e) {
		piernasRiesgo(0, 0, "#5b2a26");
		ctx.save();
		ctx.translate(0, -66);
		// Hojas de calendario que vuelan
		for (let k = 0; k < 5; k++) {
			const a = tiempo * 1.1 + k * 1.26;
			ctx.save();
			ctx.translate(Math.cos(a) * 70, Math.sin(a) * 46 - 6);
			ctx.rotate(a * 2);
			ctx.fillStyle = "#fff";
			ctx.fillRect(-7, -8, 14, 16);
			ctx.fillStyle = "#c1272d";
			ctx.fillRect(-7, -8, 14, 4);
			ctx.restore();
		}
		// Caja y esfera
		ctx.fillStyle = "#8c2f2a";
		circulo(0, 0, 54);
		ctx.fillStyle = "#f6efdc";
		circulo(0, 0, 45);
		ctx.strokeStyle = "#8c2f2a";
		ctx.lineWidth = 3;
		for (let k = 0; k < 12; k++) {
			const a = (k / 12) * Math.PI * 2;
			linea(Math.cos(a) * 38, Math.sin(a) * 38, Math.cos(a) * 44, Math.sin(a) * 44);
		}
		// Grietas
		ctx.strokeStyle = "rgba(90,40,30,0.6)";
		ctx.lineWidth = 2;
		linea(20, -40, 8, -14);
		linea(8, -14, 22, 2);
		// Infinito
		ctx.fillStyle = "#c1272d";
		ctx.font = "700 30px " + FUENTE;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("∞", 0, 22);
		// Manecillas que giran sin parar
		ctx.strokeStyle = "#1c2526";
		ctx.lineCap = "round";
		ctx.lineWidth = 5;
		linea(0, 0, Math.sin(tiempo * 2) * 22, -Math.cos(tiempo * 2) * 22);
		ctx.lineWidth = 3;
		linea(0, 0, Math.sin(tiempo * 9) * 34, -Math.cos(tiempo * 9) * 34);
		ctx.lineCap = "butt";
		ctx.fillStyle = "#1c2526";
		circulo(0, 0, 4);
		ojosRiesgo(0, -22, 16, 6.5);
		ctx.restore();
		// Brazos con cadenas
		const m = e.atacando ? -1 : Math.sin(tiempo * 3) * 0.2;
		ctx.strokeStyle = "#5b2a26";
		ctx.lineWidth = 7;
		ctx.lineCap = "round";
		linea(-52, -70, -76, -44 + m * 22);
		linea(52, -70, 74, -46);
		ctx.lineCap = "butt";
	},
};

function dibujarRiesgosObra(m) {
	const pie = SUELO + 36 * S;
	for (const e of m.oficina.enemigos) {
		if (e.cayendo >= 1) continue; // ya cayó del todo
		const sx = e.x - camara;
		if (sx < -160 * e.escala || sx > W + 160 * e.escala) continue;
		const dibujo = DIBUJOS_RIESGO[e.dibujo] || DIBUJOS_RIESGO.blob;
		const s = S * 1.15 * e.escala * (e.atacando ? 1.14 : 1);
		const dir = heroe.x >= e.x ? 1 : -1;
		ctx.save();
		ctx.translate(sx, pie);
		ctx.fillStyle = "rgba(40,40,40,0.2)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 36 * s, 7 * s, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.scale(s * -dir, s); // se diseñan mirando a la izquierda
		if (e.cayendo) {
			ctx.rotate(-Math.PI * 0.42 * e.cayendo);
			ctx.globalAlpha = Math.max(0, 1 - e.cayendo);
		}
		dibujo(e);
		ctx.restore();
		if (!e.derrotado && e.cayendo === 0) {
			const arriba = pie - 122 * S * e.escala + Math.sin(tiempo * 3 + e.x) * 3 * S;
			dibujarPlacaImportante(sx, arriba - 8 * S, e.antivalor, true);
		}
	}
}

// ---------- Peligros de la obra: la zanja con su plataforma y la talanquera (zonas[].peligro; lógica en obra.js) ----------
function dibujarPeligrosObra(m) {
	const piso = SUELO + 38 * S;
	for (const p of m.oficina.peligros) {
		const sx = p.x - camara;
		if (sx < -420 || sx > W + 420) continue;
		if (p.tipo === "talanquera") dibujarTalanquera(p, sx, piso);
		else if (p.tipo === "zanja") dibujarPlataformaZanja(p, piso);
	}
}

// La plataforma de la zanja: una vagoneta plana sobre rieles, con ruedas y bordes de seguridad
function dibujarPlataformaZanja(p, piso) {
	const medio = ZANJA.medio * S;
	const cx = p.px - camara;
	if (cx < -medio - 60 || cx > W + medio + 60) return;
	// Rieles que cruzan la zanja
	ctx.fillStyle = "#4a5558";
	ctx.fillRect(p.desde - camara, piso + 22 * S, p.hasta - p.desde, 4 * S);
	// Cubierta, al nivel del piso (donde pisa el héroe)
	ctx.fillStyle = "#6e7a80";
	ctx.fillRect(cx - medio, piso, medio * 2, 12 * S);
	ctx.fillStyle = AMARILLO_OBRA;
	ctx.fillRect(cx - medio, piso, medio * 2, 3 * S);
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(cx - medio, piso + 3 * S, 6 * S, 9 * S);
	ctx.fillRect(cx + medio - 6 * S, piso + 3 * S, 6 * S, 9 * S);
	// Flechas que muestran hacia dónde va
	const ida = p.t % (2 * (ZANJA.pausa + ZANJA.viaje)) < ZANJA.pausa + ZANJA.viaje ? 1 : -1;
	ctx.fillStyle = "#2b2b2b";
	for (const d of [-0.45, 0, 0.45]) {
		const fx = cx + d * medio;
		ctx.beginPath();
		ctx.moveTo(fx - ida * 5 * S, piso + 4 * S);
		ctx.lineTo(fx + ida * 5 * S, piso + 7 * S);
		ctx.lineTo(fx - ida * 5 * S, piso + 10 * S);
		ctx.fill();
	}
	// Ruedas sobre los rieles
	ctx.fillStyle = "#2b2b2b";
	for (const d of [-0.6, 0.6]) circulo(cx + d * medio, piso + 20 * S, 7 * S);
	ctx.fillStyle = "#8b979a";
	for (const d of [-0.6, 0.6]) circulo(cx + d * medio, piso + 20 * S, 2.5 * S);
}

// La zanja misma: se corta el piso y se ve el fondo, con lodo y agua. Va detrás de todo lo demás.
function dibujarZanjasObra(m) {
	const piso = SUELO + 38 * S;
	for (const p of m.oficina.peligros) {
		if (p.tipo !== "zanja") continue;
		const x1 = p.desde - camara;
		const x2 = p.hasta - camara;
		if (x2 < -20 || x1 > W + 20) continue;
		const a = Math.max(x1, -10);
		const b = Math.min(x2, W + 10);
		const arriba = SUELO + 8 * S;
		// Paredes y fondo
		const g = ctx.createLinearGradient(0, arriba, 0, H);
		g.addColorStop(0, "#1d150f");
		g.addColorStop(0.5, "#3b2c1e");
		g.addColorStop(1, "#241a12");
		ctx.fillStyle = g;
		ctx.fillRect(a, arriba, b - a, H - arriba);
		// Agua turbia al fondo, con un poco de ondulación
		ctx.fillStyle = "rgba(110,98,66,0.9)";
		ctx.beginPath();
		ctx.moveTo(a, piso + 60 * S);
		for (let x = a; x <= b; x += 12 * S) ctx.lineTo(x, piso + 60 * S + Math.sin(x * 0.05 + tiempo * 2.2) * 3 * S);
		ctx.lineTo(b, piso + 60 * S + Math.sin(b * 0.05 + tiempo * 2.2) * 3 * S);
		ctx.lineTo(b, H);
		ctx.lineTo(a, H);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		for (let x = a; x <= b; x += 12 * S) {
			const y = piso + 60 * S + Math.sin(x * 0.05 + tiempo * 2.2) * 3 * S;
			if (x === a) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		// Bordes: el labio de tierra y conos de seguridad en cada orilla
		ctx.fillStyle = "#7d6a4e";
		if (x1 > -20) ctx.fillRect(x1 - 4 * S, arriba, 6 * S, 18 * S);
		if (x2 < W + 20) ctx.fillRect(x2 - 2 * S, arriba, 6 * S, 18 * S);
		for (const bx of [x1 - 24 * S, x2 + 24 * S]) {
			if (bx < -30 || bx > W + 30) continue;
			ctx.fillStyle = "#ff7a1a";
			ctx.beginPath();
			ctx.moveTo(bx - 9 * S, piso + 4 * S);
			ctx.lineTo(bx + 9 * S, piso + 4 * S);
			ctx.lineTo(bx + 3 * S, piso - 30 * S);
			ctx.lineTo(bx - 3 * S, piso - 30 * S);
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.fillRect(bx - 6 * S, piso - 18 * S, 12 * S, 5 * S);
		}
	}
}

// La talanquera: una compuerta con franjas rojas y blancas que sube y baja entre dos postes
function dibujarTalanquera(p, sx, piso) {
	const alto = 262 * S;
	const mitad = 46 * S;
	// Franja de piso donde está
	ctx.fillStyle = "rgba(30,30,30,0.25)";
	ctx.fillRect(sx - 60 * S, piso + 6 * S, 120 * S, 6 * S);
	// El panel, que se esconde detrás de la viga cuando sube
	ctx.save();
	ctx.beginPath();
	ctx.rect(sx - mitad, piso - alto, mitad * 2, alto);
	ctx.clip();
	const abajo = piso - p.h * S;
	const arriba = abajo - 250 * S;
	ctx.fillStyle = "#f4f4f4";
	ctx.fillRect(sx - mitad + 3 * S, arriba, mitad * 2 - 6 * S, 250 * S);
	ctx.fillStyle = "#e63946";
	for (let y = arriba; y < abajo + 40 * S; y += 44 * S) {
		ctx.beginPath();
		ctx.moveTo(sx - mitad + 3 * S, y + 30 * S);
		ctx.lineTo(sx + mitad - 3 * S, y);
		ctx.lineTo(sx + mitad - 3 * S, y + 22 * S);
		ctx.lineTo(sx - mitad + 3 * S, y + 52 * S);
		ctx.fill();
	}
	ctx.strokeStyle = "#7a1f27";
	ctx.lineWidth = 3 * S;
	ctx.strokeRect(sx - mitad + 3 * S, arriba, mitad * 2 - 6 * S, 250 * S);
	ctx.restore();
	// Postes y viga amarilla y negra
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(sx - mitad - 8 * S, piso - alto, 10 * S, alto);
	ctx.fillRect(sx + mitad - 2 * S, piso - alto, 10 * S, alto);
	ctx.save();
	ctx.beginPath();
	ctx.rect(sx - mitad - 12 * S, piso - alto - 18 * S, mitad * 2 + 24 * S, 22 * S);
	ctx.clip();
	ctx.fillStyle = AMARILLO_OBRA;
	ctx.fillRect(sx - mitad - 12 * S, piso - alto - 18 * S, mitad * 2 + 24 * S, 22 * S);
	ctx.fillStyle = "#222";
	for (let x = sx - mitad - 30 * S; x < sx + mitad + 20 * S; x += 28 * S) {
		ctx.beginPath();
		ctx.moveTo(x, piso - alto + 4 * S);
		ctx.lineTo(x + 14 * S, piso - alto + 4 * S);
		ctx.lineTo(x + 34 * S, piso - alto - 18 * S);
		ctx.lineTo(x + 20 * S, piso - alto - 18 * S);
		ctx.fill();
	}
	ctx.restore();
	// Luz: roja si no deja pasar, verde si está abierta; parpadea mientras se mueve
	const moviendo = p.estado === "subiendo" || p.estado === "bajando";
	const luz = p.bloquea ? "#ff5a4e" : "#7fe0a8";
	ctx.save();
	ctx.globalAlpha = moviendo ? 0.5 + 0.5 * Math.sin(tiempo * 14) : 1;
	ctx.shadowColor = luz;
	ctx.shadowBlur = 14 * S;
	ctx.fillStyle = luz;
	circulo(sx, piso - alto - 30 * S, 9 * S);
	ctx.restore();
}
