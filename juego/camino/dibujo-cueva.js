/* Camino a Celaque — dibujo de la Cueva y de la calle de Celaque (logos, edificios de llegada). Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: la Cueva (versión simple, foco en la lógica) ----------
function dibujarFondoCueva() {
	// Ambiente algo más claro que antes (era casi negro) para que se vea
	// mejor el diseño, como una cueva de ferrocarril iluminada.
	const cielo = ctx.createLinearGradient(0, 0, 0, SUELO);
	cielo.addColorStop(0, "#17151d");
	cielo.addColorStop(1, "#38333f");
	ctx.fillStyle = cielo;
	ctx.fillRect(0, 0, W, SUELO);

	// Estalactitas (con leve parallax)
	ctx.fillStyle = "#221e2a";
	const paso = 140 * S;
	const desfase = (camara * 0.3) % paso;
	for (let sx = -paso + desfase; sx < W + paso; sx += paso) {
		const alto = (60 + 40 * Math.sin(sx * 0.01)) * S;
		ctx.beginPath();
		ctx.moveTo(sx - paso * 0.22, 0);
		ctx.lineTo(sx + paso * 0.22, 0);
		ctx.lineTo(sx, alto);
		ctx.closePath();
		ctx.fill();
	}

	// Lámparas de ferrocarril: colgadas del techo a intervalos regulares
	// (en coords de mundo, estables). Dan luz cálida pareja a toda la cueva,
	// en vez de iluminar a cada enemigo (eso se quitó).
	const pasoL = 340 * S;
	const offL = ((camara % pasoL) + pasoL) % pasoL;
	for (let sx = -offL; sx < W + pasoL; sx += pasoL) {
		const yLampara = 74 * S;
		const wx = sx + camara;
		const parpadeo = 0.92 + 0.08 * Math.sin(tiempo * 6 + wx * 0.05);

		// Cable desde el techo
		ctx.strokeStyle = "#100e15";
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		ctx.moveTo(sx, 0);
		ctx.lineTo(sx, yLampara - 9 * S);
		ctx.stroke();

		// Carcasa industrial (trapecio)
		ctx.fillStyle = "#2b2733";
		ctx.beginPath();
		ctx.moveTo(sx - 13 * S, yLampara - 9 * S);
		ctx.lineTo(sx + 13 * S, yLampara - 9 * S);
		ctx.lineTo(sx + 9 * S, yLampara + 7 * S);
		ctx.lineTo(sx - 9 * S, yLampara + 7 * S);
		ctx.closePath();
		ctx.fill();

		// Halo alrededor de la bombilla
		const halo = ctx.createRadialGradient(sx, yLampara + 2 * S, 2, sx, yLampara + 2 * S, 70 * S);
		halo.addColorStop(0, `rgba(255,206,128,${0.42 * parpadeo})`);
		halo.addColorStop(1, "rgba(255,206,128,0)");
		ctx.fillStyle = halo;
		ctx.fillRect(sx - 70 * S, yLampara - 68 * S, 140 * S, 140 * S);

		// Bombilla brillante
		ctx.fillStyle = `rgba(255,236,180,${parpadeo})`;
		circulo(sx, yLampara + 3 * S, 5 * S);

		// Pileta de luz cálida que baja hasta el suelo
		const pool = ctx.createRadialGradient(sx, SUELO - 20 * S, 10, sx, SUELO - 20 * S, 210 * S);
		pool.addColorStop(0, `rgba(255,198,120,${0.16 * parpadeo})`);
		pool.addColorStop(1, "rgba(255,198,120,0)");
		ctx.fillStyle = pool;
		ctx.fillRect(sx - 210 * S, SUELO - 230 * S, 420 * S, 300 * S);
	}

	// Claridad de la salida: se ve luz al acercarse al final de la cueva
	const cercaSalida = suave(LARGO_TOTAL - 500, LARGO_TOTAL, heroe.x);
	if (cercaSalida > 0) {
		const sx = LARGO_TOTAL - camara;
		const luz = ctx.createRadialGradient(sx, SUELO - 80 * S, 10, sx, SUELO - 80 * S, 480 * S);
		luz.addColorStop(0, `rgba(255,250,220,${0.85 * cercaSalida})`);
		luz.addColorStop(1, "rgba(255,250,220,0)");
		ctx.fillStyle = luz;
		ctx.fillRect(0, 0, W, H);
	}
}

// Suelo de la Cueva: una costra de roca arriba (donde se camina) sobre una
// base de tierra que se va oscureciendo hacia abajo, igual que el subsuelo
// de afuera pero sin luz. Así los enemigos, tubos y huecos se ven apoyados
// sobre una "carretera" con fondo de tierra, no sobre un plano liso.
function dibujarSueloCueva() {
	// Base de tierra: todo el subsuelo de la cueva.
	const tierra = ctx.createLinearGradient(0, SUELO, 0, H);
	tierra.addColorStop(0, "#40342a");
	tierra.addColorStop(1, "#1f150e");
	ctx.fillStyle = tierra;
	ctx.fillRect(0, SUELO, W, H - SUELO);

	// Piedritas incrustadas en la tierra (world-coords, se desplazan con
	// la cámara) para que no se vea plana.
	ctx.fillStyle = "rgba(0,0,0,0.22)";
	const pasoP = 95 * S;
	const off = ((camara % pasoP) + pasoP) % pasoP;
	for (let sx = -off; sx < W + pasoP; sx += pasoP) {
		const wx = sx + camara;
		const base = SUELO + (46 + 22 * Math.sin(wx * 0.045)) * S;
		circulo(sx + 18 * S * Math.sin(wx * 0.03), base, 3 * S);
		circulo(sx + 58 * S, base + 16 * S, 2.2 * S);
	}

	// Costra de roca de la superficie (la banda por donde se camina).
	ctx.fillStyle = "#2c2833";
	ctx.fillRect(0, SUELO - 2 * S, W, 22 * S);
	ctx.fillStyle = "#3d3747"; // canto superior algo más claro
	ctx.fillRect(0, SUELO - 2 * S, W, 6 * S);
	ctx.fillStyle = "rgba(0,0,0,0.35)"; // sombra bajo la costra, sobre la tierra
	ctx.fillRect(0, SUELO + 20 * S, W, 4 * S);

	// Camino/carretera de la Cueva: franja más clara por donde se camina
	ctx.fillStyle = "rgba(210,195,175,0.14)";
	ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);
}

// Huecos en el piso de la Cueva: un boquete de silueta irregular (roca
// rota) que corta la carretera, con un degradado a negro (se ve sin
// fondo) y un filo claro solo en el borde roto de arriba.
function dibujarHuecos() {
	const ancho = ANCHO_HUECO * S;
	for (const h of HUECOS_CUEVA) {
		const sx = h.x - camara;
		if (sx + ancho / 2 < -20 || sx - ancho / 2 > W + 20) continue;
		const izq = sx - ancho / 2;
		const derecha = izq + ancho;
		const arriba = SUELO + 20 * S; // rompe justo la franja de la carretera
		const abajo = SUELO + 90 * S;

		const dientes = 7;
		const puntos = [];
		for (let i = 0; i <= dientes; i++) {
			const px = izq + (ancho * i) / dientes;
			const variacion = Math.sin(i * 2.4 + h.x * 0.01) * 7 * S;
			puntos.push([px, arriba + variacion]);
		}

		ctx.beginPath();
		ctx.moveTo(izq, abajo);
		for (const [px, py] of puntos) ctx.lineTo(px, py);
		ctx.lineTo(derecha, abajo);
		ctx.closePath();
		const g = ctx.createRadialGradient(sx, arriba + 20 * S, 4 * S, sx, arriba + 20 * S, ancho * 0.8);
		g.addColorStop(0, "#020103");
		g.addColorStop(0.7, "#231810");
		g.addColorStop(1, "#3a2a1a"); // borde tibio: agarra la luz de las antorchas cercanas
		ctx.fillStyle = g;
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(puntos[0][0], puntos[0][1]);
		for (const [px, py] of puntos.slice(1)) ctx.lineTo(px, py);
		ctx.strokeStyle = "rgba(255,225,180,0.55)";
		ctx.lineWidth = 3 * S;
		ctx.stroke();

		// Escombros sueltos al borde, como pedazos de la carretera rota
		ctx.fillStyle = "#2a2632";
		for (const [dx, dy, r] of [
			[-ancho * 0.55, 4, 5],
			[-ancho * 0.3, -6, 4],
			[ancho * 0.35, 2, 4.5],
			[ancho * 0.58, -5, 5],
		]) {
			circulo(sx + dx, arriba + dy * S, r * S);
		}
		// Modo fácil: un puente de luz dorada tapa el hueco (ver hayHuecoEn)
		if (modoFacil()) {
			ctx.save();
			ctx.shadowColor = "rgba(255,214,90,0.9)";
			ctx.shadowBlur = 14 * S;
			ctx.fillStyle = "rgba(255,226,140,0.85)";
			for (let k = 0; k < 5; k++) ctx.fillRect(izq - 6 * S + k * ((ancho + 12 * S) / 5), SUELO + 34 * S, (ancho + 12 * S) / 5 - 3 * S, 8 * S);
			ctx.restore();
		}
	}
}

// Obstáculos sólidos de la Cueva (rocas y cajas). Se apoyan en la línea de
// pies del héroe (SUELO + 38*S = heroe.y 0) y suben `alto*S`, así la cara
// superior coincide exacto con donde quedan los pies al pararse encima.
function dibujarObstaculos(lista) {
	const baseY = SUELO + 38 * S;
	for (const o of lista) {
		const sx = o.x - camara;
		const w = o.medioAncho * S;
		if (sx + w < -20 || sx - w > W + 20) continue;
		const topY = baseY - o.alto * S;

		// Sombra en el piso
		ctx.fillStyle = "rgba(0,0,0,0.33)";
		ctx.beginPath();
		ctx.ellipse(sx, baseY + 4 * S, w * 1.12, 6 * S, 0, 0, Math.PI * 2);
		ctx.fill();

		if (MUEBLES[o.tipo]) dibujarMueble(o, sx, baseY, topY, w);
		else if (o.tipo === "roca") dibujarRoca(sx, baseY, topY, w);
		else if (o.tipo === "barrera") dibujarBarrera(sx, baseY, topY, w, tono(o.x / LARGO));
		else dibujarCaja(sx, baseY, topY, w);
	}
}

// Roca sólida: bloque de piedra irregular con la misma paleta de la cueva,
// canto superior más claro y un par de cristales que hacen juego con la
// decoración. Silueta ancha y maciza para que se lea como "duro".
function dibujarRoca(sx, baseY, topY, w) {
	const izq = sx - w;
	const der = sx + w;
	ctx.beginPath();
	ctx.moveTo(izq, baseY);
	ctx.lineTo(izq + w * 0.12, topY + (baseY - topY) * 0.28);
	ctx.lineTo(sx - w * 0.45, topY + 4 * S);
	ctx.lineTo(sx - w * 0.1, topY);
	ctx.lineTo(sx + w * 0.4, topY + 3 * S);
	ctx.lineTo(der - w * 0.1, topY + (baseY - topY) * 0.22);
	ctx.lineTo(der, baseY);
	ctx.closePath();
	const g = ctx.createLinearGradient(0, topY, 0, baseY);
	g.addColorStop(0, "#4a4356");
	g.addColorStop(0.5, "#342f3e");
	g.addColorStop(1, "#211d28");
	ctx.fillStyle = g;
	ctx.fill();

	// Canto superior iluminado (por las lámparas del techo)
	ctx.strokeStyle = "rgba(210,198,225,0.5)";
	ctx.lineWidth = 3 * S;
	ctx.beginPath();
	ctx.moveTo(sx - w * 0.45, topY + 4 * S);
	ctx.lineTo(sx - w * 0.1, topY);
	ctx.lineTo(sx + w * 0.4, topY + 3 * S);
	ctx.stroke();

	// Grietas
	ctx.strokeStyle = "rgba(0,0,0,0.4)";
	ctx.lineWidth = 2 * S;
	ctx.beginPath();
	ctx.moveTo(sx - w * 0.2, topY + 10 * S);
	ctx.lineTo(sx - w * 0.05, baseY - 12 * S);
	ctx.moveTo(sx + w * 0.3, topY + 12 * S);
	ctx.lineTo(sx + w * 0.15, baseY - 8 * S);
	ctx.stroke();

	// Cristalitos que hacen juego con la cueva
	for (const [dx, dyFrac, tam, tono] of [
		[-w * 0.5, 0.86, 6, "#9a7fe0"],
		[w * 0.62, 0.9, 5, "#5fd6e0"],
	]) {
		const cx = sx + dx;
		const cy = baseY - (baseY - topY) * (1 - dyFrac);
		ctx.fillStyle = tono;
		ctx.beginPath();
		ctx.moveTo(cx, cy - tam * S);
		ctx.lineTo(cx + tam * 0.5 * S, cy);
		ctx.lineTo(cx, cy + tam * 0.4 * S);
		ctx.lineTo(cx - tam * 0.5 * S, cy);
		ctx.closePath();
		ctx.fill();
	}
}

// Caja de madera: tablones verticales, marco, aspa en X y herrajes en las
// esquinas. Se ve firme y apoyada, como un cajón de carga de ferrocarril.
function dibujarCaja(sx, baseY, topY, w) {
	const izq = sx - w;
	const alto = baseY - topY;

	// Cuerpo con veta de madera (gradiente vertical)
	const g = ctx.createLinearGradient(0, topY, 0, baseY);
	g.addColorStop(0, "#8a5f34");
	g.addColorStop(1, "#5e3f22");
	ctx.fillStyle = g;
	ctx.fillRect(izq, topY, w * 2, alto);

	// Tablones verticales (líneas oscuras)
	ctx.strokeStyle = "rgba(60,38,20,0.6)";
	ctx.lineWidth = 2 * S;
	for (let i = 1; i < 4; i++) {
		const lx = izq + (w * 2 * i) / 4;
		ctx.beginPath();
		ctx.moveTo(lx, topY + 3 * S);
		ctx.lineTo(lx, baseY - 3 * S);
		ctx.stroke();
	}

	// Cara superior más clara (le da volumen)
	ctx.fillStyle = "#9a6c3e";
	ctx.fillRect(izq, topY, w * 2, 5 * S);

	// Marco del borde
	ctx.strokeStyle = "#4a3016";
	ctx.lineWidth = 4 * S;
	ctx.strokeRect(izq + 2 * S, topY + 2 * S, w * 2 - 4 * S, alto - 4 * S);

	// Aspa en X
	ctx.strokeStyle = "rgba(120,84,48,0.9)";
	ctx.lineWidth = 5 * S;
	ctx.beginPath();
	ctx.moveTo(izq + 5 * S, topY + 5 * S);
	ctx.lineTo(izq + w * 2 - 5 * S, baseY - 5 * S);
	ctx.moveTo(izq + w * 2 - 5 * S, topY + 5 * S);
	ctx.lineTo(izq + 5 * S, baseY - 5 * S);
	ctx.stroke();

	// Herrajes metálicos en las 4 esquinas
	ctx.fillStyle = "#3a3a42";
	const h = 7 * S;
	ctx.fillRect(izq, topY, h, h);
	ctx.fillRect(izq + w * 2 - h, topY, h, h);
	ctx.fillRect(izq, baseY - h, h, h);
	ctx.fillRect(izq + w * 2 - h, baseY - h, h, h);
}

// Murciélagos de fondo: siluetas que aletean y derivan en el aire oscuro
// de la cueva. Son decorativos (no el enemigo Murciélago), van detrás de
// todo, en la zona media del "cielo" de roca.
function dibujarMurcielagosFondo() {
	ctx.fillStyle = "rgba(8,6,16,0.9)";
	for (const b of murcielagosFondo) {
		const sx = b.x - camara + Math.sin(tiempo * 0.25 + b.fase) * b.vel * S;
		if (sx < -40 || sx > W + 40) continue;
		const sy = SUELO * b.y + Math.sin(tiempo * 0.9 + b.fase) * 16 * S;
		const s = b.tam * S;
		const flap = Math.sin(tiempo * 9 + b.fase) * 0.5 + 0.5; // 0..1
		const ala = (9 + flap * 7) * s;
		const subeAla = (2 + flap * 5) * s;

		ctx.beginPath();
		ctx.moveTo(sx, sy);
		ctx.quadraticCurveTo(sx - ala * 0.5, sy - subeAla, sx - ala, sy - subeAla * 0.4);
		ctx.quadraticCurveTo(sx - ala * 0.55, sy + 2 * s, sx, sy + 1.5 * s);
		ctx.moveTo(sx, sy);
		ctx.quadraticCurveTo(sx + ala * 0.5, sy - subeAla, sx + ala, sy - subeAla * 0.4);
		ctx.quadraticCurveTo(sx + ala * 0.55, sy + 2 * s, sx, sy + 1.5 * s);
		ctx.fill();
		ctx.beginPath();
		ctx.ellipse(sx, sy, 2.6 * s, 3.6 * s, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

// Estalagmitas: picos de roca que suben del piso, detrás de los personajes.
function dibujarEstalagmitas() {
	for (const e of estalagmitas) {
		const sx = e.x - camara;
		if (sx < -40 || sx > W + 40) continue;
		const base = SUELO + 16 * S;
		const alto = e.alto * S;
		const medio = e.ancho * 0.5 * S;
		const grad = ctx.createLinearGradient(0, base - alto, 0, base);
		grad.addColorStop(0, "#3a3448");
		grad.addColorStop(1, "#1b1824");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.moveTo(sx - medio, base);
		ctx.lineTo(sx, base - alto);
		ctx.lineTo(sx + medio, base);
		ctx.closePath();
		ctx.fill();
	}
}

// Cristales brillantes: racimos de gemas que emiten un halo de color y
// pulsan suave, apoyados sobre la carretera de la cueva.
function dibujarCristales() {
	for (const c of cristales) {
		const sx = c.x - camara;
		if (sx < -70 || sx > W + 70) continue;
		const s = c.tam * S;
		const base = SUELO + 34 * S; // sobre la franja del camino
		const pulso = 0.55 + 0.45 * Math.sin(tiempo * 2 + c.fase);

		const glow = ctx.createRadialGradient(sx, base - 14 * s, 2, sx, base - 14 * s, 50 * s);
		glow.addColorStop(0, conAlfa(c.tono, 0.45 * pulso));
		glow.addColorStop(1, conAlfa(c.tono, 0));
		ctx.fillStyle = glow;
		ctx.fillRect(sx - 52 * s, base - 64 * s, 104 * s, 84 * s);

		for (const [dx, an, al] of [
			[0, 7, 26],
			[-7, 4.5, 15],
			[7, 5, 19],
		]) {
			const cx = sx + dx * s;
			ctx.fillStyle = c.tono;
			ctx.beginPath();
			ctx.moveTo(cx - an * s, base);
			ctx.lineTo(cx, base - al * s);
			ctx.lineTo(cx + an * s, base);
			ctx.closePath();
			ctx.fill();
			// arista clara para que brille la cara
			ctx.fillStyle = conAlfa("#ffffff", 0.35 * pulso);
			ctx.beginPath();
			ctx.moveTo(cx, base - al * s);
			ctx.lineTo(cx + an * 0.35 * s, base - al * 0.45 * s);
			ctx.lineTo(cx, base);
			ctx.closePath();
			ctx.fill();
		}
	}
}

// Polvo/esporas flotando: puntitos tenues que suben apenas y titilan.
function dibujarPolvoCueva(dt) {
	for (const p of polvoCueva) {
		p.y -= p.vel * dt;
		if (p.y < -0.02) {
			p.y = 1.02;
			p.x = Math.random();
		}
		const x = p.x * W;
		const y = p.y * H;
		const brillo = 0.15 + 0.2 * (Math.sin(tiempo * 2 + p.fase) * 0.5 + 0.5);
		ctx.fillStyle = `rgba(200,210,230,${brillo})`;
		ctx.fillRect(x, y, 2 * S, 2 * S);
	}
}

// Cielo urbano al salir de la Cueva: mismo cielo diurno, sin la montaña ni
// el paisaje rural (los edificios ya dan el fondo).
function dibujarFondoUrbano(t) {
	dibujarCielo(t);
	dibujarNubes(t);
	dibujarSkylineLejano();
}

// Silueta de ciudad lejana, tenue y con parallax (se mueve lento), detrás
// de los edificios de relleno para dar profundidad. Alturas pseudo-azar
// pero estables por índice (sin tocar la secuencia de azar()).
function dibujarSkylineLejano() {
	const baseY = SUELO + 6 * S;
	const paso = 82 * S;
	const par = camara * 0.45;
	const off = ((par % paso) + paso) % paso;
	let i = Math.floor(par / paso);
	for (let sx = -off; sx < W + paso; sx += paso, i++) {
		const semilla = Math.sin(i * 12.9898) * 43758.5453;
		const frac = semilla - Math.floor(semilla);
		const alto = (130 + frac * 190) * S;
		const ancho = (52 + ((i * 37) % 34)) * S;
		ctx.fillStyle = `hsla(${(i * 47) % 360},60%,72%,${0.4 + frac * 0.2})`;
		ctx.fillRect(sx - ancho / 2, baseY - alto, ancho, alto);
		// unas ventanitas apenas visibles
		ctx.fillStyle = "rgba(255,255,255,0.12)";
		for (let vy = baseY - alto + 14 * S; vy < baseY - 10 * S; vy += 22 * S) {
			for (let vx = sx - ancho / 2 + 8 * S; vx < sx + ancho / 2 - 6 * S; vx += 16 * S) {
				ctx.fillRect(vx, vy, 5 * S, 9 * S);
			}
		}
	}
}

// Piso urbano: misma estructura que el suelo de afuera y de la cueva (base
// + franja de superficie arriba + franja de camino más clara en medio),
// pero en gris de ciudad (pavimento/acera), para que se sienta coherente
// con el resto del juego.
function dibujarSueloUrbano() {
	// Base de pavimento (equivale a la tierra de afuera/cueva).
	const base = ctx.createLinearGradient(0, SUELO, 0, H);
	base.addColorStop(0, "#8f959c");
	base.addColorStop(1, "#6b7178");
	ctx.fillStyle = base;
	ctx.fillRect(0, SUELO, W, H - SUELO);

	// Acera: franja clara de la superficie (equivale al pasto/roca).
	ctx.fillStyle = "#c2c7cc";
	ctx.fillRect(0, SUELO - 2 * S, W, 18 * S);
	ctx.fillStyle = "#d5dade"; // canto claro arriba
	ctx.fillRect(0, SUELO - 2 * S, W, 5 * S);
	ctx.fillStyle = "rgba(0,0,0,0.2)"; // sombra bajo la acera
	ctx.fillRect(0, SUELO + 16 * S, W, 3 * S);

	// Camino/carretera: franja más clara por donde se camina (misma
	// posición que afuera y en la cueva).
	ctx.fillStyle = "rgba(255,255,255,0.22)";
	ctx.fillRect(0, SUELO + 24 * S, W, 20 * S);

	// Juntas de baldosas del pavimento (parte de abajo), sutiles.
	ctx.strokeStyle = "rgba(255,255,255,0.12)";
	ctx.lineWidth = 1.5 * S;
	ctx.beginPath();
	const paso = 82 * S;
	const off = ((camara % paso) + paso) % paso;
	for (let sx = -off; sx < W; sx += paso) {
		linea(sx, SUELO + 48 * S, sx, H);
	}
	ctx.stroke();
}

// Edificios de Celaque, visibles al salir de la cueva (junto a la meta)
function dibujarEdificiosSalida() {
	const baseY = SUELO + 10 * S; // en la orilla del fondo, como los árboles del paisaje
	for (const e of edificiosSalida) {
		const el = e.cargando.elemento;
		if (!el) continue; // todavía procesando (quitando el fondo de cielo)

		const sx = e.x - camara;
		const altoPx = e.altoBase * S;
		const anchoPx = altoPx * (el.width / el.height);
		if (sx + anchoPx / 2 < -60 || sx - anchoPx / 2 > W + 60) continue;

		ctx.globalAlpha = e.alfa;
		ctx.drawImage(el, sx - anchoPx / 2, baseY - altoPx, anchoPx, altoPx);
		ctx.globalAlpha = 1;
	}
}

// Relleno de ciudad: bloques planos con ventanitas, dibujados a mano
// (nada de fotos) para no competir con Atlas/Lirios.
function dibujarEdificiosSimples() {
	const baseY = SUELO + 10 * S; // en la orilla del fondo, como los árboles del paisaje
	for (const e of edificiosSimples) {
		const sx = e.x - camara;
		const altoPx = e.alto * S;
		const anchoPx = e.ancho * S;
		if (sx + anchoPx / 2 < -60 || sx - anchoPx / 2 > W + 60) continue;

		ctx.fillStyle = e.color;
		ctx.fillRect(sx - anchoPx / 2, baseY - altoPx, anchoPx, altoPx);
		// Cornisa y sombra lateral para dar volumen
		ctx.fillStyle = "rgba(0,0,0,0.18)";
		ctx.fillRect(sx - anchoPx / 2 - 4 * S, baseY - altoPx, anchoPx + 8 * S, 10 * S);
		ctx.fillStyle = "rgba(0,0,0,0.1)";
		ctx.fillRect(sx + anchoPx * 0.38, baseY - altoPx + 10 * S, anchoPx * 0.12, altoPx - 10 * S);

		ctx.fillStyle = "rgba(225,245,255,0.75)";
		const filas = Math.max(2, Math.floor(altoPx / (16 * S)));
		const columnas = Math.max(2, Math.floor(anchoPx / (14 * S)));
		for (let f = 0; f < filas; f++) {
			for (let c = 0; c < columnas; c++) {
				const vx = sx - anchoPx / 2 + (c + 0.5) * (anchoPx / columnas);
				const vy = baseY - altoPx + (f + 0.5) * (altoPx / filas);
				ctx.fillRect(vx - 2.5 * S, vy - 4 * S, 5 * S, 8 * S);
			}
		}
	}
}

// Dibuja una imagen (logo) centrada en (cx, cy) dentro de una caja de
// maxAncho x maxAlto SIN deformarla: se escala por el lado que más limita.
function dibujarImagenContenida(img, cx, cy, maxAncho, maxAlto) {
	const w = img.naturalWidth || img.width;
	const h = img.naturalHeight || img.height;
	if (!w || !h) return;
	const k = Math.min(maxAncho / w, maxAlto / h);
	ctx.drawImage(img, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
}


// Dibuja el logo (si su archivo ya está) o, mientras tanto, un recuadro
// punteado que dice "LOGO" del mismo tamaño, para ver dónde va a quedar.
function dibujarLogoOEspacio(carga, cx, cy, ancho, alto, claro) {
	const img = carga && carga.elemento;
	if (img) {
		// Sin deformar y nunca más bajo que el mínimo del manual
		const w = img.naturalWidth || img.width;
		const h = img.naturalHeight || img.height;
		const k = Math.max(Math.min(ancho / w, alto / h), ALTO_MIN_LOGO / h);
		ctx.drawImage(img, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
		return;
	}
	ctx.save();
	const color = claro ? "rgba(255,255,255,0.85)" : conAlfa(COLORES.verdeProfundo, 0.75);
	ctx.setLineDash([5 * S, 4 * S]);
	ctx.lineWidth = 2 * S;
	ctx.strokeStyle = color;
	rectRedondo(cx - ancho / 2, cy - alto / 2, ancho, alto, 8 * S);
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.font = `bold ${Math.max(8, Math.min(alto * 0.34, ancho * 0.24))}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("LOGO", cx, cy + 1 * S);
	ctx.restore();
}

// Torres de los proyectos de Celaque, de fondo, con su nombre arriba.
function dibujarProyectos() {
	const baseY = SUELO + 10 * S;
	for (const p of proyectos) {
		const sx = p.x - camara;
		const ancho = p.ancho * S;
		const alto = p.alto * S;
		if (sx + ancho < -80 || sx - ancho > W + 80) continue;
		const izq = sx - ancho / 2;
		const arriba = baseY - alto;

		// Vidrio: degradado de turquesa a verde Celaque, con pisos y parteluces
		const vidrio = ctx.createLinearGradient(izq, arriba, izq + ancho, baseY);
		vidrio.addColorStop(0, mezclar(COLORES.verdeInstitucional, "#ffffff", 0.35));
		vidrio.addColorStop(1, COLORES.verdeProfundo);
		ctx.fillStyle = vidrio;
		ctx.fillRect(izq, arriba, ancho, alto);
		ctx.strokeStyle = "rgba(255,255,255,0.28)";
		ctx.lineWidth = 1.5 * S;
		ctx.beginPath();
		for (let y = arriba + 22 * S; y < baseY; y += 22 * S) linea(izq, y, izq + ancho, y);
		for (let x = izq + ancho / 5; x < izq + ancho - 1; x += ancho / 5) linea(x, arriba, x, baseY);
		ctx.stroke();
		ctx.fillStyle = "rgba(255,255,255,0.16)"; // reflejo diagonal
		ctx.beginPath();
		ctx.moveTo(izq, arriba + alto * 0.25);
		ctx.lineTo(izq + ancho * 0.45, arriba);
		ctx.lineTo(izq + ancho * 0.7, arriba);
		ctx.lineTo(izq, arriba + alto * 0.55);
		ctx.fill();
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(izq - 5 * S, arriba - 10 * S, ancho + 10 * S, 12 * S);

		// Logo del proyecto en la fachada, y letrero con su nombre arriba
		ctx.fillStyle = "rgba(243,239,230,0.92)";
		rectRedondo(sx - 52 * S, arriba + 28 * S, 104 * S, 66 * S, 10 * S);
		ctx.fill();
		dibujarLogoOEspacio(p.logoImg, sx, arriba + 61 * S, 92 * S, 54 * S, false);
		ctx.font = `bold ${17 * S}px ${FUENTE}`;
		const anchoLetrero = ctx.measureText(p.nombre).width + 30 * S;
		rectRedondo(sx - anchoLetrero / 2, arriba - 46 * S, anchoLetrero, 32 * S, 8 * S);
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fill();
		ctx.fillStyle = COLORES.blanco;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(p.nombre, sx, arriba - 30 * S);
	}
}

// Letrero de cada módulo (encima del edificio): logo + nombre + subtítulo.
// El logo (si el módulo trae uno en su mundo.js) se dibuja sin deformar.
function dibujarLetreroModulo(m, sx, abajo, encendido) {
	ctx.font = `bold ${20 * S}px ${FUENTE}`;
	const anchoNombre = ctx.measureText(m.nombre).width;
	ctx.font = `${12 * S}px ${FUENTE}`;
	const anchoSub = ctx.measureText(m.subtitulo || "").width;
	const logo = 44 * S;
	const ancho = Math.max(anchoNombre, anchoSub) + logo + 44 * S;
	const alto = 62 * S;
	const x0 = sx - ancho / 2;
	const y0 = abajo - alto;

	ctx.save();
	if (encendido) {
		ctx.shadowColor = conAlfa(COLORES.verdeInstitucional, 0.9);
		ctx.shadowBlur = 18 * S;
	}
	rectRedondo(x0, y0, ancho, alto, 12 * S);
	ctx.fillStyle = encendido ? COLORES.blanco : "#c9cfce";
	ctx.fill();
	ctx.restore();
	rectRedondo(x0, y0, ancho, alto, 12 * S);
	ctx.lineWidth = 3 * S;
	ctx.strokeStyle = m.color;
	ctx.stroke();

	const lx = x0 + 16 * S + logo / 2;
	const ly = y0 + alto / 2;
	dibujarLogoOEspacio(m.logoImg, lx, ly, logo, logo, false);

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.font = `bold ${20 * S}px ${FUENTE}`;
	ctx.fillText(m.nombre, x0 + 28 * S + logo, y0 + alto * 0.38);
	ctx.fillStyle = COLORES.verdeInstitucional;
	ctx.font = `${12 * S}px ${FUENTE}`;
	ctx.fillText(m.subtitulo || "", x0 + 28 * S + logo, y0 + alto * 0.72);

	// Sello de completado
	if (m.completo) {
		const cx = x0 + ancho - 4 * S;
		const cy = y0 + 4 * S;
		ctx.fillStyle = COLORES.verdeInstitucional;
		circulo(cx, cy, 13 * S);
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		ctx.moveTo(cx - 6 * S, cy);
		ctx.lineTo(cx - 1.5 * S, cy + 5 * S);
		ctx.lineTo(cx + 6.5 * S, cy - 5 * S);
		ctx.stroke();
	}
}

// Un edificio por módulo. Apagado (gris, ventanas oscuras) hasta que lo
// completas; entonces se enciende con el color del módulo. La puerta del
// próximo módulo pendiente brilla para que se vea a dónde ir.
function dibujarModulos() {
	const baseY = SUELO + 10 * S;
	const pendiente = moduloPendiente();
	modulos.forEach((m, i) => {
		const sx = m.x - camara;
		const ancho = 250 * S;
		const alto = (260 + (i % 2) * 50) * S;
		if (sx + ancho < -120 || sx - ancho > W + 120) return;
		const izq = sx - ancho / 2;
		const arriba = baseY - alto;
		const encendido = m.completo;
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);

		if (m === pendiente) {
			const halo = ctx.createRadialGradient(sx, baseY - 50 * S, 10 * S, sx, baseY - 50 * S, 190 * S);
			halo.addColorStop(0, conAlfa(COLORES.verdeInstitucional, 0.35 + 0.25 * pulso));
			halo.addColorStop(1, conAlfa(COLORES.verdeInstitucional, 0));
			ctx.fillStyle = halo;
			ctx.fillRect(sx - 200 * S, baseY - 250 * S, 400 * S, 300 * S);
		}

		ctx.fillStyle = encendido ? m.color : mezclar("#7d8384", m.color, 0.3);
		ctx.fillRect(izq, arriba, ancho, alto);
		ctx.fillStyle = "rgba(0,0,0,0.16)";
		ctx.fillRect(izq + ancho * 0.84, arriba, ancho * 0.16, alto);
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(izq - 7 * S, arriba - 9 * S, ancho + 14 * S, 13 * S);

		// Ventanas: encendidas (cálidas) o apagadas
		const filas = Math.floor((alto - 120 * S) / (36 * S));
		for (let f = 0; f < filas; f++) {
			for (let c = 0; c < 4; c++) {
				const vx = izq + 22 * S + c * 52 * S;
				const vy = arriba + 24 * S + f * 36 * S;
				ctx.fillStyle = encendido
					? (f + c + i) % 5 === 0
						? "rgba(255,255,255,0.85)"
						: "rgba(255,232,160,0.95)"
					: "rgba(25,40,42,0.55)";
				ctx.fillRect(vx, vy, 32 * S, 22 * S);
			}
		}

		// Puerta (de vidrio, con marco oscuro). La del módulo pendiente late.
		const anchoP = 66 * S;
		const altoP = 84 * S;
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - anchoP / 2 - 5 * S, baseY - altoP - 5 * S, anchoP + 10 * S, altoP + 5 * S);
		ctx.save();
		if (m === pendiente) {
			ctx.shadowColor = COLORES.verdeInstitucional;
			ctx.shadowBlur = (16 + 14 * pulso) * S;
		}
		ctx.fillStyle = encendido ? "#fff1c1" : m === pendiente ? mezclar(COLORES.verdeInstitucional, "#ffffff", 0.35 + 0.4 * pulso) : "#2b3a3c";
		ctx.fillRect(sx - anchoP / 2, baseY - altoP, anchoP, altoP);
		ctx.restore();
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - 1.5 * S, baseY - altoP, 3 * S, altoP);

		dibujarLetreroModulo(m, sx, arriba - 16 * S, encendido);

		// "Módulo 3 de 6" sobre la puerta
		ctx.font = `bold ${12 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = encendido ? "#fff" : "#dfe5e4";
		ctx.fillText(`Módulo ${i + 1} de ${modulos.length}`, sx, baseY - altoP - 18 * S);
		if (m === pendiente && m.visitado && estado === "urbano" && Math.abs(heroe.x - m.x) < CFG.distanciaParaHablar * 1.3) {
			dibujarGlobo(sx, baseY - altoP - 36 * S, esTactil ? "Toca Hablar para entrar" : "E · Entrar", COLORES.fondoVerdeClaro);
		}

		if (m.brillo > 0) {
			const destelloM = ctx.createRadialGradient(sx, arriba + alto / 2, 10 * S, sx, arriba + alto / 2, 300 * S);
			destelloM.addColorStop(0, `rgba(255,255,235,${0.75 * m.brillo})`);
			destelloM.addColorStop(1, "rgba(255,255,235,0)");
			ctx.fillStyle = destelloM;
			ctx.fillRect(sx - 300 * S, arriba - 120 * S, 600 * S, alto + 240 * S);
		}
	});
}

// Reja con candado justo después de cada módulo sin completar: no se
// pasa hasta contestar sus preguntas (ver limiteUrbano).
function dibujarRejas() {
	for (const m of modulos) {
		if (m.completo) continue;
		const sx = m.x + 60 - camara;
		if (sx < -60 || sx > W + 60) continue;
		const piso = SUELO + 40 * S;
		const alto = 74 * S;
		const ancho = 34 * S;
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(sx - ancho / 2 - 4 * S, piso - alto - 6 * S, 7 * S, alto + 6 * S);
		ctx.fillRect(sx + ancho / 2 - 3 * S, piso - alto - 6 * S, 7 * S, alto + 6 * S);
		ctx.fillRect(sx - ancho / 2, piso - alto, ancho, 5 * S);
		ctx.fillRect(sx - ancho / 2, piso - alto * 0.45, ancho, 4 * S);
		ctx.strokeStyle = COLORES.verdeProfundo;
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		for (let k = 1; k < 4; k++) {
			const bx = sx - ancho / 2 + (ancho * k) / 4;
			linea(bx, piso, bx, piso - alto);
		}
		ctx.stroke();
		// Candado
		const cy = piso - alto * 0.62;
		ctx.strokeStyle = "#e8b931";
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		ctx.arc(sx, cy - 6 * S, 6 * S, Math.PI, 0);
		ctx.stroke();
		ctx.fillStyle = "#ffcf3f";
		rectRedondo(sx - 9 * S, cy - 6 * S, 18 * S, 15 * S, 3 * S);
		ctx.fill();
	}
}
