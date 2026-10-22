/* Camino a Celaque — cielo, nubes, Celaque y tubos. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: escenario ----------
function dibujarCielo(t) {
	const g = ctx.createLinearGradient(0, 0, 0, SUELO);
	g.addColorStop(0, color("cieloArriba", t));
	g.addColorStop(1, color("cieloAbajo", t));
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, SUELO + 2);

	// El sol aparece al salir de la zona de planos y cruza el cielo en arco
	// (de izquierda a derecha) a medida que el jugador avanza, hasta el
	// final de la calle de Celaque.
	const a = vistaUrbana ? 1 : suave(0.3, 0.85, t);
	if (a > 0 && heroe.x > FIN_PLANOS) {
		const avance = clamp((heroe.x - FIN_PLANOS) / (LARGO_META - FIN_PLANOS), 0, 1);
		const sx = W * (0.1 + 0.8 * avance);
		const sy = SUELO * 0.62 - Math.sin(avance * Math.PI * 0.85 + 0.25) * SUELO * 0.48;
		const r = 44 * S;
		const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
		halo.addColorStop(0, `rgba(255,244,180,${0.6 * a})`);
		halo.addColorStop(1, "rgba(255,244,180,0)");
		ctx.fillStyle = halo;
		ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
		ctx.fillStyle = `rgba(255,232,130,${a})`;
		circulo(sx, sy, r);
	}
}

function dibujarNubes(t) {
	const ancho = W + 600;
	ctx.fillStyle = color("nube", t, 0.85);
	for (const n of nubes) {
		const x = modulo(n.x - camara * 0.12 - tiempo * n.vel, ancho) - 300;
		const y = n.y * H;
		const s = n.tam * S;
		ctx.beginPath();
		agregarElipse(x, y, 60 * s, 22 * s);
		agregarElipse(x - 40 * s, y + 6 * s, 40 * s, 16 * s);
		agregarElipse(x + 45 * s, y + 5 * s, 45 * s, 17 * s);
		agregarElipse(x + 5 * s, y - 14 * s, 35 * s, 20 * s);
		ctx.fill();
	}
}

// La montaña Celaque: se asoma en el horizonte y queda al frente al final
function dibujarCelaque(t) {
	const base = (LARGO - W * 0.35) * 0.2 + W * 0.7;
	const cx = base - camara * 0.2;
	const ancho = H * 0.75;
	const alto = H * 0.5;
	if (cx + ancho < 0 || cx - ancho > W) return;

	const cima = SUELO - alto;
	const g = ctx.createLinearGradient(0, cima, 0, SUELO);
	g.addColorStop(0, mezclar("#7d8187", "#1f7a4a", t));
	g.addColorStop(1, color("celaque", t));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.moveTo(cx - ancho, SUELO);
	ctx.quadraticCurveTo(cx - ancho * 0.45, SUELO - alto * 0.55, cx - ancho * 0.18, cima + alto * 0.04);
	ctx.lineTo(cx + ancho * 0.12, cima);
	ctx.quadraticCurveTo(cx + ancho * 0.5, SUELO - alto * 0.6, cx + ancho, SUELO);
	ctx.closePath();
	ctx.fill();

	// Bosque nublado alrededor de la cima
	ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * t})`;
	ctx.beginPath();
	ctx.ellipse(cx - ancho * 0.05, cima + alto * 0.1, ancho * 0.28, alto * 0.05, 0, 0, Math.PI * 2);
	ctx.ellipse(cx + ancho * 0.22, cima + alto * 0.16, ancho * 0.2, alto * 0.04, 0, 0, Math.PI * 2);
	ctx.fill();
}

// Tubo estilo Mario Bros: se para justo sobre el sendero. Agacharse cerca
// de él (agacharAccion) dispara la transición correspondiente.
// Boca de acceso metálica (tipo túnel/mina), con volumen cilíndrico,
// remaches y un resplandor cálido saliendo de adentro (igual que las
// lámparas de la cueva). MISMA silueta/dimensiones que antes para no tocar
// la física: el héroe se sigue parando en el borde superior (base - alto -
// borde) y agachándose para entrar.
function dibujarTubo(sx, base) {
	const ancho = 70 * S;
	const alto = 110 * S;
	const borde = 22 * S;
	const izq = sx - ancho / 2;
	const topCuerpo = base - alto;
	const topCollar = base - alto - borde; // altura donde se para el héroe

	// Cuerpo cilíndrico: degradado horizontal (luz al centro, oscuro a los
	// lados) para que se lea como un cilindro de metal, no una caja plana.
	const cuerpo = ctx.createLinearGradient(izq, 0, izq + ancho, 0);
	cuerpo.addColorStop(0, "#232a31");
	cuerpo.addColorStop(0.34, "#5a6672");
	cuerpo.addColorStop(0.5, "#6d7a87");
	cuerpo.addColorStop(0.66, "#48525d");
	cuerpo.addColorStop(1, "#1e242a");
	ctx.fillStyle = cuerpo;
	ctx.fillRect(izq, topCuerpo, ancho, alto);

	// Remaches en dos columnas (con reflejito).
	for (let ry = topCuerpo + 16 * S; ry < base - 6 * S; ry += 26 * S) {
		ctx.fillStyle = "rgba(18,22,26,0.6)";
		circulo(izq + 9 * S, ry, 2.4 * S);
		circulo(izq + ancho - 9 * S, ry, 2.4 * S);
		ctx.fillStyle = "rgba(255,255,255,0.18)";
		circulo(izq + 9 * S - 0.7 * S, ry - 0.7 * S, 1 * S);
		circulo(izq + ancho - 9 * S - 0.7 * S, ry - 0.7 * S, 1 * S);
	}

	// Boca cilíndrica: un labio ELÍPTICO (no una tapa plana), para que se
	// vea la abertura del cilindro en perspectiva.
	const rimRx = ancho * 0.62;
	const rimRy = borde * 0.62;
	const rimCy = topCollar + rimRy; // el tope de la elipse queda en topCollar

	const rim = ctx.createLinearGradient(0, rimCy - rimRy, 0, rimCy + rimRy);
	rim.addColorStop(0, "#8b98a5");
	rim.addColorStop(1, "#39424b");
	ctx.fillStyle = rim;
	ctx.beginPath();
	ctx.ellipse(sx, rimCy, rimRx, rimRy, 0, 0, Math.PI * 2);
	ctx.fill();

	// Filo de luz en la mitad superior del labio.
	ctx.strokeStyle = "rgba(255,255,255,0.3)";
	ctx.lineWidth = 2 * S;
	ctx.beginPath();
	ctx.ellipse(sx, rimCy, rimRx - 1.5 * S, rimRy - 1.5 * S, 0, Math.PI * 1.05, Math.PI * 1.95);
	ctx.stroke();

	// Hueco oscuro (elipse más chica, corrida un poco hacia abajo para que
	// se vea el grosor del labio en el borde de atrás).
	const holeRx = rimRx * 0.68;
	const holeRy = rimRy * 0.66;
	const holeCy = rimCy + rimRy * 0.24;
	ctx.fillStyle = "#07060a";
	ctx.beginPath();
	ctx.ellipse(sx, holeCy, holeRx, holeRy, 0, 0, Math.PI * 2);
	ctx.fill();

	// Resplandor cálido saliendo de adentro (como las lámparas).
	const glow = ctx.createRadialGradient(sx, holeCy, 1, sx, holeCy, holeRx * 1.7);
	glow.addColorStop(0, "rgba(255,186,96,0.5)");
	glow.addColorStop(1, "rgba(255,186,96,0)");
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.ellipse(sx, holeCy, holeRx * 1.7, holeRy * 1.9, 0, 0, Math.PI * 2);
	ctx.fill();
}

// Muestra "Saltar" o "Agachar" según en qué paso de la secuencia vas
// (primero saltar encima del tubo, luego agacharte para entrar).
function dibujarPistaTubo(sx, disponible) {
	if (!disponible) return;
	const texto = estaSobreTubo()
		? esTactil
			? "Toca Agachar"
			: "↓ · Agachar"
		: esTactil
		? "Toca Saltar"
		: "↑ · Saltar";
	dibujarGlobo(sx, SUELO - (90 + heroe.y) * S, texto, "#c9f7d1");
}

function dibujarTuboEntrada() {
	const sx = LARGO - camara;
	if (sx < -300 || sx > W + 300) return;
	dibujarTubo(sx, SUELO + 44 * S);
	dibujarPistaTubo(sx, puedeUsarTuboEntrada());
}

function dibujarTuboSalida() {
	const sx = LARGO_TOTAL - camara;
	if (sx < -300 || sx > W + 300) return;
	dibujarTubo(sx, SUELO + 44 * S);
	dibujarPistaTubo(sx, puedeUsarTuboSalida());
}
