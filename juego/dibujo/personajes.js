/* Camino a Celaque — héroe, NPC, globos y placas. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: personajes ----------
function dibujarPersona(x, pie, o) {
	const s = S * 1.15 * (o.escala || 1);
	const paso = o.moviendo ? Math.sin(o.fase) : 0;
	// Flotar en reposo con fase de posición de MUNDO (x + camara), no de
	// pantalla, para que no tiemble cuando la cámara se mueve (ver nota en
	// dibujarEnemigoSprite).
	const rebote = o.moviendo ? Math.abs(Math.cos(o.fase)) * 2 * s : Math.sin(tiempo * 2 + x + camara) * 0.8 * s;

	ctx.save();
	ctx.translate(x, pie);

	ctx.fillStyle = "rgba(40,40,40,0.18)";
	ctx.beginPath();
	ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.translate(0, -rebote);
	ctx.scale(o.dir, 1);
	if (o.agachado) ctx.scale(1, 0.55); // se agacha para entrar al tubo
	if (o.cayendo) {
		// El enemigo derrotado se desploma hacia atrás y se desvanece
		ctx.rotate(-Math.PI * 0.42 * o.cayendo);
		ctx.globalAlpha = Math.max(0, 1 - o.cayendo);
	}
	if (o.corriendo || o.atacando) ctx.rotate(0.12); // se inclina hacia adelante
	ctx.lineCap = "round";
	const amplitud = o.corriendo ? 0.9 : 0.55;

	// Piernas
	ctx.strokeStyle = o.pantalon;
	ctx.lineWidth = 6 * s;
	const cadera = -26 * s;
	for (const lado of [1, -1]) {
		const ang = paso * amplitud * lado;
		linea(0, cadera, Math.sin(ang) * 26 * s, cadera + Math.cos(ang) * 26 * s);
	}

	// Pelo largo (cae por la espalda y se mece al caminar)
	if (o.peloLargo) {
		const vaiven = o.moviendo ? Math.sin(o.fase) * (o.corriendo ? 0.3 : 0.15) : 0;
		ctx.save();
		ctx.translate(-4 * s, -66 * s);
		ctx.rotate(0.15 + vaiven);
		rectRedondo(-9 * s, 0, 13 * s, 28 * s, 6 * s);
		ctx.fillStyle = o.pelo;
		ctx.fill();
		ctx.restore();
	}

	// Mochila
	if (o.mochila) {
		rectRedondo(-15 * s, -50 * s, 10 * s, 20 * s, 3 * s);
		ctx.fillStyle = o.mochila;
		ctx.fill();
	}

	// Torso
	rectRedondo(-9 * s, -52 * s, 18 * s, 30 * s, 6 * s);
	ctx.fillStyle = o.ropa;
	ctx.fill();

	// Falda
	if (o.falda) {
		ctx.fillStyle = o.falda;
		ctx.beginPath();
		ctx.moveTo(-9 * s, -31 * s);
		ctx.lineTo(9 * s, -31 * s);
		ctx.lineTo(14 * s, -17 * s);
		ctx.lineTo(-14 * s, -17 * s);
		ctx.closePath();
		ctx.fill();
	}

	// Brazo (puñetazo si está atacando)
	ctx.strokeStyle = o.ropa;
	ctx.lineWidth = 5 * s;
	const brazo = o.atacando ? -1.35 : -paso * (o.corriendo ? 1.1 : 0.6);
	const largoBrazo = o.atacando ? 26 * s : 18 * s;
	linea(0, -46 * s, Math.sin(brazo) * largoBrazo, -46 * s + Math.cos(brazo) * largoBrazo);
	ctx.fillStyle = o.piel;
	circulo(Math.sin(brazo) * (largoBrazo + s), -46 * s + Math.cos(brazo) * (largoBrazo + s), 3 * s);

	// Cabeza
	ctx.fillStyle = o.piel;
	circulo(0, -63 * s, 11 * s);
	ctx.fillStyle = o.pelo;
	ctx.beginPath();
	ctx.arc(0, -64 * s, 11.5 * s, Math.PI * 0.95, Math.PI * 2.1);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "#2b2b2b";
	circulo(5 * s, -63 * s, 1.5 * s);
	ctx.strokeStyle = "rgba(90,40,30,0.6)";
	ctx.lineWidth = 1.2 * s;
	ctx.beginPath();
	ctx.arc(5 * s, -58 * s, 2.5 * s, 0.2, Math.PI - 0.6);
	ctx.stroke();

	// Lazo en el pelo
	if (o.lazo) {
		ctx.fillStyle = o.lazo;
		ctx.beginPath();
		ctx.moveTo(-5 * s, -73 * s);
		ctx.lineTo(-12 * s, -79 * s);
		ctx.lineTo(-12 * s, -67 * s);
		ctx.closePath();
		ctx.moveTo(-5 * s, -73 * s);
		ctx.lineTo(2 * s, -79 * s);
		ctx.lineTo(2 * s, -67 * s);
		ctx.closePath();
		ctx.fill();
		circulo(-5 * s, -73 * s, 2.5 * s);
	}

	if (o.sombrero) {
		ctx.fillStyle = o.sombrero;
		ctx.beginPath();
		ctx.ellipse(0, -72 * s, 17 * s, 3.5 * s, 0, 0, Math.PI * 2);
		ctx.fill();
		rectRedondo(-8 * s, -84 * s, 16 * s, 12 * s, 4 * s);
		ctx.fill();
	}

	ctx.restore();
}

// NPC obrero / ingeniero con el mismo estilo que las fotos del héroe:
// proporciones realistas en vista 3/4, contorno oscuro, casco, camiseta de
// manga corta, chaleco reflectivo, cinturón con bolsas, pantalón de
// trabajo y botas. Coordenadas en "u" (pie = 0, hacia arriba negativo);
// mide lo mismo que el héroe (~100 u con el casco).
const CONTORNO = "#1f1a17";
function figura(u, puntos, relleno) {
	ctx.beginPath();
	ctx.moveTo(puntos[0] * u, puntos[1] * u);
	for (let i = 2; i < puntos.length; i += 2) ctx.lineTo(puntos[i] * u, puntos[i + 1] * u);
	ctx.closePath();
	ctx.fillStyle = relleno;
	ctx.fill();
	ctx.stroke();
}

// NPC con la foto del héroe ya teñida (ver fotoNpc). Misma escala, sombra
// y vaivén que dibujarHeroeSprite, para que se vean del mismo mundo.
function dibujarNpcFoto(x, pie, n, dir) {
	const f = fotoNpc(n);
	if (!f) return false;
	const s = S * 1.15 * (n.apariencia.escala || 1);
	const rebote = Math.sin(tiempo * 2 + x + camara) * 0.8 * s;
	const k = (100 * s) / ((f.meta.abajo - f.meta.arriba) * f.lienzo.height);
	const dw = f.lienzo.width * k;
	const dh = f.lienzo.height * k;
	ctx.save();
	ctx.translate(x, pie);
	ctx.fillStyle = "rgba(40,40,40,0.18)";
	ctx.beginPath();
	ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.translate(0, -rebote);
	ctx.scale(dir, 1);
	ctx.drawImage(f.lienzo, -f.meta.anclaX * dw, -f.meta.abajo * dh, dw, dh);
	ctx.restore();
	return true;
}

function dibujarObrero(x, pie, o) {
	const u = S * 1.15;
	// Respiración sutil (fase de MUNDO, para que no tiemble con la cámara)
	const respira = Math.sin(tiempo * 2 + x + camara) * 0.5;
	const sombra = "rgba(0,0,0,0.16)";

	ctx.save();
	ctx.translate(x, pie);
	ctx.fillStyle = "rgba(40,40,40,0.2)";
	ctx.beginPath();
	ctx.ellipse(0, 0, 18 * u, 4 * u, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.scale(o.dir, 1);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = 1.3 * u;
	// El cuerpo va más angosto que el dibujo base (como la silueta
	// delgada del héroe); la cabeza se dibuja después sin angostar.
	ctx.save();
	ctx.scale(0.84, 1);

	// Piernas (la de atrás con sombra) y bolsillo cargo
	figura(u, [-10, -47, -1, -47, -6, -9, -15, -9], o.pantalon);
	ctx.fillStyle = sombra;
	ctx.beginPath();
	ctx.moveTo(-10 * u, -47 * u);
	ctx.lineTo(-6 * u, -47 * u);
	ctx.lineTo(-11 * u, -9 * u);
	ctx.lineTo(-15 * u, -9 * u);
	ctx.fill();
	figura(u, [0, -47, 10, -47, 14, -9, 5, -9], o.pantalon);
	figura(u, [8, -34, 12, -34, 12.8, -25, 8.8, -25], o.pantalon);

	// Botas con suela negra y cordones
	figura(u, [-16, -11, -6, -11, -5, -5, -2, -3, -2, 0, -17, 0], o.botas);
	figura(u, [4, -11, 14, -11, 15, -6, 19.5, -4, 19.5, 0, 4, 0], o.botas);
	ctx.fillStyle = "#1c1c1c";
	ctx.fillRect(-17 * u, -2 * u, 15 * u, 2 * u);
	ctx.fillRect(4 * u, -2 * u, 15.5 * u, 2 * u);
	ctx.strokeStyle = "rgba(255,240,210,0.7)";
	ctx.lineWidth = 0.8 * u;
	for (let k = 0; k < 3; k++) linea((7 + k * 2) * u, (-9 + k * 1.5) * u, (10 + k * 2) * u, (-9 + k * 1.5) * u);
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = 1.3 * u;

	// Del cinturón para arriba "respira"
	ctx.translate(0, respira * u);

	// Martillo colgando del cinturón (como el del héroe)
	if (o.herramienta === "martillo") {
		figura(u, [-14.5, -47, -12.5, -47, -13, -33, -15, -33], "#f2b81c");
		figura(u, [-15, -40, -13, -40, -13, -33, -15, -33], "#2a2a2a");
		figura(u, [-19, -50, -9, -50, -9, -47, -19, -47], "#a3abb4");
	}

	// Brazo de atrás + mano
	figura(u, [-15, -66, -11, -65, -13, -50, -17.5, -50.5], o.piel);
	ctx.fillStyle = o.piel;
	circulo(-15.5 * u, -48 * u, 3 * u);
	ctx.stroke();

	// Camiseta y mangas cortas
	figura(u, [-14, -72, 14, -72, 12, -49, -12, -49], o.ropa);
	figura(u, [-14, -72, -9, -72, -10.5, -63, -17, -64.5], o.ropa);
	figura(u, [9, -72, 14, -72, 17, -64.5, 10.5, -63], o.ropa);

	// Chaleco reflectivo (abierto al centro) con dos franjas
	figura(u, [-13, -72, -4, -73, -1, -58, -1, -49.5, -12, -49.5], o.chaleco);
	figura(u, [4, -73, 13, -72, 12, -49.5, 1, -49.5, 1, -58], o.chaleco);
	ctx.fillStyle = "#d6dce1";
	ctx.fillRect(-12.7 * u, -61 * u, 11.2 * u, 2.6 * u);
	ctx.fillRect(1.5 * u, -61 * u, 11.2 * u, 2.6 * u);
	ctx.fillRect(-12.3 * u, -55 * u, 10.8 * u, 2.6 * u);
	ctx.fillRect(1.5 * u, -55 * u, 10.6 * u, 2.6 * u);
	ctx.fillStyle = sombra;
	ctx.fillRect(-12.7 * u, -72 * u, 3 * u, 22 * u);

	// Cinturón con hebilla y bolsas de herramientas
	figura(u, [-12.5, -50.5, 12.5, -50.5, 12.5, -46.5, -12.5, -46.5], "#6b4424");
	ctx.strokeStyle = "#b9c0c7";
	ctx.lineWidth = 1 * u;
	ctx.strokeRect(1.5 * u, -50 * u, 4 * u, 3 * u);
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = 1.3 * u;
	figura(u, [7.5, -48, 13.5, -48, 13, -39, 8, -39], "#8a5a2b");
	figura(u, [-12.5, -48, -7.5, -48, -8, -41, -12, -41], "#8a5a2b");

	// Planos enrollados bajo el brazo (antes del brazo de adelante)
	if (o.herramienta === "plano") {
		figura(u, [2, -62, 21, -57, 20, -53, 1, -58], "#2f6fd6");
		ctx.fillStyle = "#dbe8ff";
		ctx.beginPath();
		ctx.ellipse(20.5 * u, -55 * u, 1.3 * u, 2 * u, 0.25, 0, Math.PI * 2);
		ctx.fill();
	}

	// Brazo de adelante + mano
	figura(u, [10.5, -65, 15.5, -66, 18.5, -50.5, 14, -50], o.piel);
	ctx.fillStyle = o.piel;
	circulo(16.5 * u, -47.8 * u, 3.1 * u);
	ctx.stroke();

	if (o.herramienta === "portapapeles") {
		figura(u, [14, -57, 23, -56, 22, -43, 13, -44], "#a0703c");
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(15 * u, -54.5 * u, 6 * u, 9 * u);
		ctx.fillStyle = "#9aa3ad";
		ctx.fillRect(16 * u, -57.5 * u, 4.5 * u, 2.5 * u);
	} else if (o.herramienta === "llave") {
		figura(u, [16, -46, 18, -46, 19.5, -36, 17.5, -36], "#a3abb4");
		ctx.strokeStyle = "#a3abb4";
		ctx.lineWidth = 2 * u;
		ctx.beginPath();
		ctx.arc(18.6 * u, -34 * u, 2.4 * u, -0.6, Math.PI + 0.6, true);
		ctx.stroke();
		ctx.strokeStyle = CONTORNO;
		ctx.lineWidth = 1.3 * u;
	}

	ctx.restore();
	ctx.translate(0, respira * u);

	// Cuello y cabeza
	figura(u, [-2, -76, 3, -76, 3, -71, -2, -71], o.piel);
	ctx.fillStyle = o.piel;
	ctx.beginPath();
	ctx.ellipse(1 * u, -83.5 * u, 8.2 * u, 9 * u, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.ellipse(-4.6 * u, -83 * u, 1.9 * u, 2.7 * u, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// Pelo: mechones bajo el casco y cola de caballo (si lleva pelo largo)
	if (o.peloLargo) figura(u, [-5, -86, -10, -84, -12, -70, -8, -69, -5, -78], o.pelo);
	figura(u, [-7.5, -89, 7, -90, 8.5, -87, 5, -88.5, 1, -87, -2, -88, -5, -84, -6.5, -79, -8.5, -82], o.pelo);

	// Cara (mirando hacia adelante en 3/4)
	ctx.strokeStyle = o.pelo;
	ctx.lineWidth = 1.2 * u;
	linea(2 * u, -87.2 * u, 4.8 * u, -87.7 * u);
	linea(6.4 * u, -87.7 * u, 8.4 * u, -87 * u);
	ctx.fillStyle = CONTORNO;
	ctx.beginPath();
	ctx.ellipse(3.6 * u, -84.6 * u, 1.1 * u, 1.5 * u, 0, 0, Math.PI * 2);
	ctx.ellipse(7.4 * u, -84.6 * u, 0.95 * u, 1.4 * u, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#ffffff";
	circulo(3.9 * u, -85.2 * u, 0.4 * u);
	circulo(7.7 * u, -85.2 * u, 0.35 * u);
	ctx.strokeStyle = "rgba(60,30,20,0.75)";
	ctx.lineWidth = 0.9 * u;
	linea(8.8 * u, -83.6 * u, 9.3 * u, -81.6 * u);
	ctx.beginPath();
	ctx.arc(5.2 * u, -80.6 * u, 2.2 * u, 0.3, Math.PI - 0.7);
	ctx.stroke();
	ctx.strokeStyle = CONTORNO;
	ctx.lineWidth = 1.3 * u;

	// Casco: cúpula, ala (más larga al frente), cresta y brillo
	ctx.fillStyle = o.casco;
	ctx.beginPath();
	ctx.ellipse(1 * u, -89 * u, 10 * u, 9 * u, 0, Math.PI, 0);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.ellipse(3.5 * u, -89 * u, 12.5 * u, 2.3 * u, -0.05, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.strokeStyle = "rgba(0,0,0,0.25)";
	ctx.lineWidth = 2 * u;
	ctx.beginPath();
	ctx.ellipse(1 * u, -89 * u, 4.5 * u, 8.5 * u, 0, Math.PI * 1.1, Math.PI * 1.9);
	ctx.stroke();
	ctx.fillStyle = "rgba(255,255,255,0.45)";
	ctx.beginPath();
	ctx.ellipse(5 * u, -95 * u, 2.2 * u, 1.3 * u, -0.3, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

// Globito de pista ("!", "E · Hablar", "↑ · Saltar"...). Más grande y con
// un halo de luz que late, para que se vea desde lejos.
// Placa con el nombre del personaje fijo de cada mundo (siempre visible).
// enemigo = true: la de un antivalor de la Cueva (negra, con ✗ en rojo).
function dibujarPlacaImportante(x, y, nombre, enemigo) {
	ctx.font = `700 ${14 * S}px ${FUENTE}`;
	const ancho = ctx.measureText(nombre).width + 40 * S;
	const alto = 26 * S;
	const acento = enemigo ? "#e3262b" : COLORES.beige;
	ctx.save();
	ctx.shadowColor = conAlfa(acento, 0.8);
	ctx.shadowBlur = 12 * S;
	ctx.fillStyle = enemigo ? COLORES.negro : COLORES.verdeProfundo;
	rectRedondo(x - ancho / 2, y - alto / 2, ancho, alto, 13 * S);
	ctx.fill();
	ctx.restore();
	ctx.strokeStyle = acento;
	ctx.lineWidth = 2 * S;
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = acento;
	ctx.fillText(enemigo ? "✗" : "★", x - ancho / 2 + 15 * S, y + 1 * S);
	ctx.fillStyle = COLORES.blanco;
	ctx.fillText(nombre, x + 8 * S, y + 1 * S);
}

function dibujarGlobo(x, y, texto, fondo) {
	ctx.font = `bold ${16 * S}px ${FUENTE}`;
	const ancho = ctx.measureText(texto).width + 22 * S;
	const alto = 28 * S;
	ctx.save();
	ctx.shadowColor = fondo;
	ctx.shadowBlur = (14 + 8 * Math.sin(tiempo * 4)) * S;
	rectRedondo(x - ancho / 2, y - alto, ancho, alto, 11 * S);
	ctx.fillStyle = fondo;
	ctx.fill();
	ctx.restore();
	ctx.lineWidth = 2 * S;
	ctx.strokeStyle = "rgba(255,255,255,0.9)";
	ctx.stroke();
	ctx.fillStyle = fondo;
	ctx.beginPath();
	ctx.moveTo(x - 5 * S, y);
	ctx.lineTo(x + 5 * S, y);
	ctx.lineTo(x, y + 6 * S);
	ctx.fill();
	ctx.fillStyle = "#3a3a2e";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, x, y - alto / 2);
}

function dibujarNpcs() {
	for (const n of npcs) {
		const pie = SUELO + 36 * S - (n.alto || 0) * S;
		const sx = n.x - camara;
		if (sx < -60 || sx > W + 60) continue;
		const a = n.apariencia;
		const o = {
			piel: a.piel,
			ropa: a.ropa,
			pantalon: a.pantalon,
			pelo: a.pelo,
			sombrero: a.sombrero,
			peloLargo: a.peloLargo,
			casco: a.casco,
			chaleco: a.chaleco,
			botas: a.botas || "#6b4424",
			herramienta: a.herramienta,
			dir: heroe.x >= n.x ? 1 : -1,
			fase: 0,
			moviendo: false,
		};
		// Con casco + chaleco usa la foto del héroe teñida con sus colores
		// (o, mientras carga, el obrero dibujado); si no, el muñequito simple.
		if (a.casco && a.chaleco) {
			if (!dibujarNpcFoto(sx, pie, n, o.dir)) dibujarObrero(sx, pie, o);
		} else dibujarPersona(sx, pie, o);

		const arriba = pie - 125 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
		if (n.importante) dibujarPlacaImportante(sx, pie - 172 * S, n.nombre);
		if (!n.hablado) {
			dibujarGlobo(sx, arriba, "!", "#ffe066");
		} else if (estado === "jugando" && alAlcance(n, CFG.distanciaParaHablar * 1.3)) {
			dibujarGlobo(sx, arriba, esTactil ? "Hablar" : "E · Hablar", "#fffbea");
		}
	}
}

// Fotos de la marcha, en orden. Corriendo (Q): la hoja de correr
// (cicloCorrer) o, si no hay, corre / correSalto; caminando: caminando /
// caminando2. Se usa una lista solo si ya cargaron todas sus fotos.
function cuadrosDeMarcha(sprites, corriendo) {
	const listas = corriendo ? [sprites.cicloCorrer, [sprites.corre, sprites.correSalto]] : [];
	listas.push([sprites.caminando, sprites.caminando2]);
	for (const lista of listas) {
		const unicas = [...new Set((lista || []).filter(Boolean))];
		if (unicas.length && unicas.every((m) => m.cargando.elemento)) return unicas;
	}
	return [sprites.caminando].filter((m) => m && m.cargando.elemento);
}

// Dibuja al héroe con fotos (constructor) en vez de vector, eligiendo la
// pose según su estado actual. Si la foto todavía no cargó, devuelve
// false y dibujarHeroe cae al vectorial como respaldo (igual que los
// enemigos con dibujarEnemigoSprite).
function dibujarHeroeSprite(x, pie, o, sprites, t) {
	// Caminando/corriendo se recorre una lista de fotos (cuadros) con la
	// fase de pasos: una vuelta de o.fase (2π) pasa por toda la lista, con
	// el 1er cuadro centrado en fase 0 (pie apoyado). Al final de cada
	// cuadro (ANCHO_FUNDIDO de su tramo) se funde con el siguiente, así no
	// hay un corte seco.
	const recibeGolpe = o.golpeado && sprites.golpeado;
	const enMarcha = o.moviendo && !recibeGolpe && !o.agachado && !o.atacando && heroeEnSuelo();
	const cuadros = enMarcha ? cuadrosDeMarcha(sprites, o.corriendo) : [];
	const N = cuadros.length;
	const ANCHO_FUNDIDO = 0.25;
	const pos = (((o.fase / (Math.PI * 2)) * N + 0.5 + ANCHO_FUNDIDO / 2) % N + N) % N;
	const cuadro = cuadros[Math.floor(pos)];
	const siguiente = cuadros[(Math.floor(pos) + 1) % N];
	const peso2 = N > 1 ? clamp((pos - Math.floor(pos) - (1 - ANCHO_FUNDIDO)) / ANCHO_FUNDIDO, 0, 1) : 0;
	const pose = recibeGolpe
		? "golpeado"
		: o.agachado
		? "agachado"
		: o.atacando
		? "golpe"
		: !heroeEnSuelo()
		? "saltando"
		: o.moviendo
		? "marcha"
		: "quieto";
	const meta = pose === "marcha" ? cuadro || sprites.caminando : sprites[pose];
	const el = meta.cargando.elemento;
	if (!el) return false;
	const el2 = peso2 > 0 && siguiente.cargando.elemento;

	// Si el personaje todavía no tiene foto propia para esta pose (p.ej.
	// la Chica, que por ahora solo tiene "de pie"), se reusa la de
	// "quieto" con los mismos trucos del dibujo vectorial: un poco más
	// grande al atacar (como la embestida del murciélago) y achicada
	// verticalmente al agacharse (como el squash de dibujarPersona).
	const sinFotoPropia = pose !== "quieto" && meta === sprites.quieto;
	const embestida = pose === "golpe" && sinFotoPropia ? 1.18 : 1;
	// Agachado con foto propia (no el squash de la Chica): además de
	// quedar más bajo por su propio alto de contenido, se reduce un poco
	// más para que se vea claramente más chico/compacto, no solo bajito.
	const factorAgachado = pose === "agachado" && !sinFotoPropia ? 0.78 : 1;
	// Algunas fotos puntuales vienen dibujadas más chicas/grandes dentro de
	// su propio cuadro que las demás del mismo personaje (zoom distinto de
	// cámara al generarlas), así que con la MISMA escala de referencia
	// (quieto) se ven de tamaño distinto. Se corrige por foto, no por pose
	// -ej. el "caminando2" del Chico lo necesita, pero no todos lo tienen-.
	const factorEscalaPropio = meta.escalaExtra ?? 1;

	const s = S * 1.15;
	// Marcha (0 quieto .. 1 corriendo, ya suavizada): cuánto se inclina,
	// rebota y se estira el cuerpo. Con 2 cuadros, el cuerpo sube en el
	// 2do (pierna de paso) y baja al apoyar: un rebote por cuadro. Con un
	// ciclo completo de más cuadros (las 2 piernas), baja al apoyar cada
	// pie y sube entre medio. Con 1 solo cuadro, 2 golpecitos por ciclo.
	const marcha = enMarcha ? Math.max(o.marcha, 0.3) : 0;
	const subida = N > 1 ? (1 - Math.cos(o.fase * (N > 2 ? 2 : 1))) / 2 : Math.abs(Math.sin(o.fase));
	// Vaivén sutil en reposo (fase de MUNDO, no de pantalla, para que no
	// tiemble con la cámara al moverse — ver nota en dibujarEnemigoSprite).
	const rebote = enMarcha
		? subida * (1.5 + 4.5 * marcha) * s
		: o.moviendo
		? 0
		: Math.sin(tiempo * 2 + x + camara) * 0.8 * s;
	const altoDeseado = 100 * s * embestida * factorAgachado * factorEscalaPropio;

	ctx.save();
	ctx.translate(x, pie);
	// La sombra se achica cuando el cuerpo sube (las de la estela no llevan).
	if (!o.sinSombra) {
		const sombra = 1 - (rebote / (8 * s)) * 0.25;
		ctx.fillStyle = "rgba(40,40,40,0.18)";
		ctx.beginPath();
		ctx.ellipse(0, 0, 14 * s * sombra, 4 * s * sombra, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.translate(0, -rebote);
	ctx.scale(o.dir, 1);
	if (pose === "agachado" && sinFotoPropia) ctx.scale(1, 0.55);

	// Gris al inicio del camino, colores vivos al llegar a Celaque — mismo
	// efecto que el dibujo vectorial (aparienciaHeroe), aplicado como
	// filtro sobre la foto en vez de mezclar colores por canal.
	if (t < 1) ctx.filter = `grayscale(${Math.round((1 - t) * 100)}%)`;

	// Escala común: se deriva SIEMPRE de la foto "quieto", no de cada pose
	// por separado. Si cada una normalizara su propio alto de contenido a
	// la misma altura final, una pose más compacta (agachado: rodillas
	// dobladas; saltando: piernas recogidas) se estiraría para alcanzar
	// esa altura completa y terminaría viéndose MÁS GRANDE -en vez de más
	// baja/corta, como debería verse un cuerpo agachado o en el aire-.
	// Con una sola escala de referencia, el ancho ya no se infla.
	const metaQuieto = sprites.quieto;
	const elQuieto = metaQuieto.cargando.elemento;
	const refMeta = elQuieto ? metaQuieto : meta;
	const refEl = elQuieto || el;
	const hRef = refEl.naturalHeight || refEl.height;
	const altoContenidoRef = (refMeta.abajo - refMeta.arriba) * hRef;
	const k = altoDeseado / altoContenidoRef;

	const pintar = (img, m, factor, alfa) => {
		const dw = (img.naturalWidth || img.width) * k * factor;
		const dh = (img.naturalHeight || img.height) * k * factor;
		ctx.globalAlpha = alfa * (o.alfa ?? 1); // o.alfa: las sombras de la estela
		ctx.drawImage(img, -m.anclaX * dw, -m.abajo * dh, dw, dh);
	};
	if (el2) {
		// Fundido cruzado sin "agujeros": la foto que sale queda opaca
		// hasta la mitad y la que entra se pinta encima; pasada la mitad,
		// la que entra ya está opaca y la de abajo se desvanece.
		pintar(el, meta, 1, Math.min(1, 2 * (1 - peso2)));
		pintar(el2, siguiente, (siguiente.escalaExtra ?? 1) / factorEscalaPropio, Math.min(1, 2 * peso2));
	} else {
		pintar(el, meta, 1, 1);
	}

	ctx.restore();
	return true;
}

// Humo del suelo: cada nube aparece rápido, crece y se desvanece.
function dibujarPolvoPasos() {
	for (const p of polvoPasos) {
		const avance = p.vida / p.dura;
		const sx = p.x - camara;
		const sy = SUELO + 38 * S - p.y * S;
		const alfa = 0.55 * (1 - avance) * Math.min(1, avance / 0.12);
		const r = p.r * S * (0.6 + avance * 1.8);
		// Borde difuso: un degradado del centro hacia afuera
		const g = ctx.createRadialGradient(sx, sy - 2 * S, 0, sx, sy - 2 * S, r);
		g.addColorStop(0, `rgba(200,192,178,${alfa.toFixed(3)})`);
		g.addColorStop(1, "rgba(200,192,178,0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(sx, sy - 2 * S, r, 0, Math.PI * 2);
		ctx.fill();
	}
}

// Estela al correr: "sombras" del héroe donde estuvo hace 70, 140 y 210 ms
// (con la pose de ese momento), cada vez más transparentes, y unas líneas
// de velocidad detrás. Entra y sale con la marcha suavizada, así que solo
// aparece corriendo, no caminando.
function dibujarEstela(x, pie, o, sprites, t) {
	const fuerza = heroe.corriendo ? clamp((heroe.marcha - 0.55) / 0.45, 0, 1) : 0;
	if (!fuerza) return;
	ctx.save();
	ctx.lineCap = "round";
	ctx.lineWidth = 2.5 * S;
	for (let i = 0; i < 4; i++) {
		const avance = (tiempo * 5 + i * 0.37) % 1;
		const y = pie - (22 + i * 21 + (i % 2) * 6) * S;
		const x0 = x - o.dir * (24 + avance * 40) * S;
		const largo = (26 + ((i * 7) % 3) * 14) * S;
		ctx.strokeStyle = `rgba(255,255,255,${(0.45 * fuerza * (1 - avance)).toFixed(3)})`;
		ctx.beginPath();
		ctx.moveTo(x0, y);
		ctx.lineTo(x0 - o.dir * largo, y);
		ctx.stroke();
	}
	ctx.restore();
	if (!sprites) return;
	for (const [k, alfa] of [[6, 0.1], [4, 0.2], [2, 0.32]]) {
		const e = estelaHeroe[k];
		if (!e) continue;
		const sombra = { ...o, fase: e.fase, dir: e.dir, alfa: alfa * fuerza, sinSombra: true };
		dibujarHeroeSprite(e.x - camara, SUELO + 38 * S - e.y * S, sombra, sprites, t);
	}
}

function dibujarHeroe(t) {
	const o = {
		...aparienciaHeroe(personaje, t, heroe),
		agachado: heroe.agachado,
		atacando: heroe.atacando,
		golpeado: heroe.golpeado,
	};
	const x = heroe.x - camara;
	const pie = SUELO + 38 * S - heroe.y * S;
	const sprites = SPRITES_POR_PERSONAJE[personaje];
	dibujarEstela(x, pie, o, sprites, t);
	dibujarPolvoPasos();
	const yaDibujado = sprites && dibujarHeroeSprite(x, pie, o, sprites, t);
	if (!yaDibujado) dibujarPersona(x, pie, o);
}

// Colores del personaje elegido: grises al inicio (t = 0), vivos al final (t = 1)
function aparienciaHeroe(clave, t, pose) {
	const p = CFG.personajes[clave];
	return {
		piel: p.piel,
		ropa: mezclar("#77797c", p.ropa, t),
		pantalon: mezclar("#595b5f", p.pantalon, t),
		pelo: mezclar("#4a4a4a", p.pelo, t),
		falda: p.falda && mezclar("#6e7073", p.falda, t),
		lazo: p.lazo && mezclar("#8a8c8f", p.lazo, t),
		peloLargo: p.peloLargo,
		mochila: color("heroeMochila", t),
		sombrero: null,
		dir: pose.dir,
		fase: pose.fase,
		moviendo: pose.moviendo,
		corriendo: pose.corriendo,
		marcha: pose.marcha || 0,
	};
}
