/* Camino a Celaque — la Cafetería (mundo extra): la barra de café, la gente conversando al fondo y la terraza de Heber. Ver juego/LEEME.md. */
"use strict";

// ---------- Cafetería ----------
// Un mundo extra sin preguntas (mundo.js → extra). Al fondo está la barra
// de café (oficina.estacion "cafe"): tomarse uno es el easter egg, saltas
// más alto mientras sigas en la Cafetería y ganas DORADAS_MAX corazones
// dorados (fisica.js), y el mundo queda completo. Con oficina.fondo, todos
// los personajes del juego conversan al fondo en sus mesas; con
// oficina.terraza, arriba de un mueble hay una terraza alta (solo se llega
// con el café) donde está quien diga oficina.dj (Heber) con su parlante.

const FRASES_FONDO = ["jaja", "☕", "♪", "¡Qué bien!", "♥", "¿Y tú?", "¡Claro!", "jeje"];

// Toda la gente del juego (los compañeros de las oficinas y la del camino
// de Talento), menos la de la misma Cafetería. Se arma la primera vez.
let genteCafeteria = null;
function gentePara(m) {
	if (genteCafeteria) return genteCafeteria;
	const otros = modulos.filter((x) => x !== m).flatMap((x) => x.oficina.companeros);
	genteCafeteria = [...npcs, ...otros].filter((n) => n.apariencia);
	return genteCafeteria;
}

// Lo que ya ocupa el piso (decoración, columnas, muebles, compañeros, la
// terraza, la puerta y la barra): ahí no se para nadie del fondo, para que
// no se vea encimado. Cada cosa: [desde, hasta] en x del mundo.
const ANCHO_DECORACION = { librero: 60, sillon: 80, pizarra: 80, cafetera: 55, plantaAlta: 35, especial: 70, lampara: 30, jardinera: 85, sofa: 85, fogata: 65 };
function ocupadoEnCafeteria(of) {
	const tramos = [
		...of.decoracion.map((o) => [o.x - (ANCHO_DECORACION[o.tipo] || 60) - 20, o.x + (ANCHO_DECORACION[o.tipo] || 60) + 20]),
		...(of.azotea ? postesPergola(of) : COLUMNAS_OFICINA.map((d) => of.x0 + d)).map((x) => [x - 45, x + 45]),
		...of.obstaculos.map((o) => [o.x - o.medioAncho - 20, o.x + o.medioAncho + 20]),
		...of.companeros.map((n) => [n.x - 50, n.x + 50]),
		[of.x0 - 100, of.x0 + 170], // la puerta de salida
		[of.terminalX - 170, of.terminalX + 200], // la barra
	];
	if (of.terraza) tramos.push([of.terraza.x - of.terraza.medioAncho - 25, of.terraza.x + of.terraza.medioAncho + 25]);
	return tramos.sort((a, b) => a[0] - b[0]);
}

// Grupos de 2 a 4 alrededor de una mesa alta, en los huecos libres del local
const PASO_GENTE = 44; // entre una persona y la siguiente de un grupo
function gruposFondo(m) {
	if (m.oficina.grupos) return m.oficina.grupos;
	const gente = gentePara(m);
	const of = m.oficina;
	const grupos = [];
	let k = 0;
	let desde = of.x0;
	for (const [a, b] of [...ocupadoEnCafeteria(of), [Infinity, Infinity]]) {
		// Hueco libre [desde, a]: caben grupos de hasta 4, con aire entre ellos
		let x = desde + 20;
		while (k < gente.length) {
			const cuantos = Math.min(4, gente.length - k, Math.floor((a - x - 20) / PASO_GENTE) + 1);
			if (cuantos < 2 || a === Infinity) break;
			const ancho = (cuantos - 1) * PASO_GENTE;
			grupos.push({ x: x + ancho / 2, gente: gente.slice(k, k + cuantos), fase: grupos.length * 1.7 });
			k += cuantos;
			x += ancho + 70;
		}
		desde = Math.max(desde, b);
	}
	of.grupos = grupos;
	of.genteFuera = gente.length - k; // la prueba "cafeteria" revisa que sea 0
	return grupos;
}

function globoChico(x, y, texto) {
	ctx.font = `700 ${12 * S}px ${FUENTE}`;
	const w = ctx.measureText(texto).width + 14 * S;
	const h = 20 * S;
	ctx.fillStyle = "rgba(255,255,255,0.92)";
	rectRedondo(x - w / 2, y - h, w, h, 8 * S);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(x - 4 * S, y);
	ctx.lineTo(x + 4 * S, y);
	ctx.lineTo(x, y + 6 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, x, y - h / 2 + 1 * S);
}

// La gente conversando al fondo: más chica y más arriba (está más lejos),
// detrás de las columnas y de todo lo demás (dibujo-oficina.js la llama
// antes que las columnas), y solo en los huecos libres (gruposFondo)
function dibujarFondoCafeteria(m) {
	if (!m.oficina.fondo) return;
	const pie = SUELO - 8 * S;
	const k = 0.72; // tamaño, comparado con quien está al frente
	const sAntes = S;
	for (const g of gruposFondo(m)) {
		const sx = g.x - camara;
		if (sx < -200 * S || sx > W + 200 * S) continue;
		const lugares = g.gente.map((_, j) => (j - (g.gente.length - 1) / 2) * PASO_GENTE * S);
		// Mesa alta con sus tazas, en medio del grupo
		ctx.fillStyle = "#6f5238";
		ctx.fillRect(sx - 2.5 * S, pie - 52 * S, 5 * S, 52 * S);
		ctx.fillRect(sx - 13 * S, pie - 3 * S, 26 * S, 3 * S);
		ctx.fillStyle = "#c89b6d";
		ctx.beginPath();
		ctx.ellipse(sx, pie - 54 * S, 20 * S, 5 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = COLORES.blanco;
		ctx.fillRect(sx - 10 * S, pie - 63 * S, 6 * S, 7 * S);
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.fillRect(sx + 4 * S, pie - 63 * S, 6 * S, 7 * S);
		// Cada uno mira hacia la mesa
		ctx.save();
		ctx.globalAlpha = 0.88;
		S = sAntes * k;
		g.gente.forEach((n, j) => dibujarNpcFoto(sx + lugares[j], pie, n, lugares[j] > 0 ? -1 : 1));
		S = sAntes;
		ctx.restore();
		// Uno de ellos dice algo (cambia cada 2.5 s)
		const turno = Math.floor(tiempo / 2.5 + g.fase);
		if (modulo(tiempo / 2.5 + g.fase, 1) < 0.75) {
			const j = turno % g.gente.length;
			globoChico(sx + lugares[j], pie - 92 * S, FRASES_FONDO[(turno * 3 + j) % FRASES_FONDO.length]);
		}
	}
}

// Altura en pantalla de algo que está a "alto" sobre el piso (como heroe.y)
const pantallaY = (alto) => SUELO + 38 * S - alto * S;

// La terraza alta: losa con baranda, columnas hasta el piso, plantas,
// foquitos y Heber con su parlante (y notas de música)
function dibujarTerraza(m) {
	const t = m.oficina.terraza;
	if (!t) return;
	const sx = t.x - camara;
	const w = (t.medioAncho + 10) * S;
	if (sx + w < -150 || sx - w > W + 150) return;
	const y = pantallaY(t.alto);
	// Cuelga del techo con cables (sin patas: no choca con nada del piso)
	ctx.strokeStyle = "#5e686a";
	ctx.lineWidth = 3 * S;
	for (const lado of [-1, 1]) {
		linea(sx + lado * (w - 14 * S), 34 * S, sx + lado * (w - 14 * S), y);
		linea(sx + lado * (w - 40 * S), 34 * S, sx + lado * (w - 14 * S), y - 40 * S);
	}
	// Foquitos colgando del techo hasta la baranda
	ctx.strokeStyle = "#3a4446";
	ctx.lineWidth = 1.5 * S;
	ctx.beginPath();
	ctx.moveTo(sx - w, 34 * S);
	ctx.quadraticCurveTo(sx, y - 40 * S, sx + w, 34 * S);
	ctx.stroke();
	for (let k = 1; k < 8; k++) {
		const u = k / 8;
		const fx = sx - w + u * 2 * w;
		const fy = (1 - u) * (1 - u) * 34 * S + 2 * u * (1 - u) * (y - 40 * S) + u * u * 34 * S;
		ctx.fillStyle = k % 2 ? "#fff1c1" : mezclar(COLORES.verdeInstitucional, "#ffffff", 0.5);
		circulo(fx, fy + 4 * S, 3.5 * S);
	}
	// Losa
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.fillRect(sx - w, y, w * 2, 14 * S);
	ctx.fillStyle = COLORES.beige;
	ctx.fillRect(sx - w, y, w * 2, 3 * S);
	// Baranda (atrás del héroe)
	ctx.strokeStyle = COLORES.verdeProfundo;
	ctx.lineWidth = 2.5 * S;
	linea(sx - w, y - 34 * S, sx + w, y - 34 * S);
	for (let x = sx - w; x <= sx + w + 1; x += 16 * S) linea(x, y - 34 * S, x, y);
	// Plantas en las orillas
	for (const lado of [-1, 1]) {
		const px = sx + lado * (w - 14 * S);
		ctx.fillStyle = "#3f9b5a";
		for (let k = -2; k <= 2; k++) {
			ctx.beginPath();
			ctx.ellipse(px + k * 5 * S, y - 22 * S, 5 * S, 14 * S, k * 0.35, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = COLORES.beige;
		ctx.fillRect(px - 10 * S, y - 14 * S, 20 * S, 14 * S);
	}
	// Heber, bailando junto a su parlante
	const dj = m.djNpc;
	if (dj) {
		const hx = sx + w * 0.45;
		const sAntes = S;
		const baile = Math.abs(Math.sin(tiempo * 5)) * 4 * S;
		ctx.save();
		ctx.translate(0, -baile);
		dibujarNpcFoto(hx, y, dj, heroe.x > t.x + t.medioAncho * 0.45 ? 1 : -1);
		ctx.restore();
		S = sAntes;
		dibujarPlacaImportante(hx, y - 150 * S, `${dj.nombre} ♪`);
		// Parlante
		const px = sx + w * 0.75;
		const late = 1 + 0.06 * Math.abs(Math.sin(tiempo * 10));
		ctx.fillStyle = "#1c2526";
		rectRedondo(px - 16 * S, y - 64 * S, 32 * S, 64 * S, 5 * S);
		ctx.fill();
		ctx.fillStyle = "#5e686a";
		circulo(px, y - 22 * S, 11 * S * late);
		circulo(px, y - 48 * S, 6 * S * late);
		ctx.fillStyle = "#1c2526";
		circulo(px, y - 22 * S, 4 * S);
		ctx.fillStyle = COLORES.verdeInstitucional;
		circulo(px + 10 * S, y - 58 * S, 2 * S);
		// Notas que salen del parlante
		ctx.font = `700 ${20 * S}px ${FUENTE}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		for (let k = 0; k < 4; k++) {
			const u = modulo(tiempo * 0.45 + k / 4, 1);
			ctx.fillStyle = conAlfa(k % 2 ? COLORES.verdeInstitucional : COLORES.verdeProfundo, 1 - u);
			ctx.fillText(k % 2 ? "♫" : "♪", px + Math.sin(u * 7 + k) * 18 * S - u * 40 * S, y - 76 * S - u * 120 * S);
		}
	}
}

// La barra de café al fondo (en vez de la computadora)
function dibujarBarraCafe(m, sx, piso) {
	const listo = cafeina > 0;
	const topY = piso - 78 * S;
	// Estante con tazas y el menú
	ctx.fillStyle = "#6f5238";
	ctx.fillRect(sx - 100 * S, topY - 150 * S, 200 * S, 8 * S);
	for (let k = 0; k < 6; k++) {
		ctx.fillStyle = k % 2 ? COLORES.blanco : COLORES.verdeInstitucional;
		ctx.fillRect(sx - 88 * S + k * 30 * S, topY - 166 * S, 14 * S, 16 * S);
	}
	ctx.fillStyle = COLORES.verdeProfundo; // pizarra del menú, lisa: el logo va encima
	ctx.fillRect(sx - 80 * S, topY - 132 * S, 160 * S, 44 * S);
	dibujarLogoOEspacio(logoCelaqueBlanco, sx, topY - 116 * S, 110 * S, 20 * S, true);
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `700 ${11 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("CAFÉ · CAPUCHINO · LATTE", sx, topY - 98 * S);
	// Barra
	ctx.fillStyle = "#8a6a4a";
	ctx.fillRect(sx - 110 * S, topY, 220 * S, 78 * S);
	ctx.fillStyle = "#a07c58";
	for (let k = 0; k < 4; k++) ctx.fillRect(sx - 102 * S + k * 52 * S, topY + 10 * S, 44 * S, 60 * S);
	ctx.fillStyle = "#c89b6d";
	rectRedondo(sx - 118 * S, topY - 8 * S, 236 * S, 12 * S, 4 * S);
	ctx.fill();
	// Máquina de espresso (brilla mientras no te tomes el café)
	ctx.save();
	if (!listo) {
		ctx.shadowColor = "#ffd23f";
		ctx.shadowBlur = (16 + 12 * Math.sin(tiempo * 3)) * S;
	}
	ctx.fillStyle = "#c9cecd";
	rectRedondo(sx - 50 * S, topY - 70 * S, 74 * S, 62 * S, 6 * S);
	ctx.fill();
	ctx.restore();
	ctx.fillStyle = "#5e686a";
	ctx.fillRect(sx - 44 * S, topY - 40 * S, 62 * S, 6 * S);
	ctx.fillStyle = "#3a4446";
	ctx.fillRect(sx - 28 * S, topY - 34 * S, 6 * S, 10 * S);
	ctx.fillRect(sx + 0 * S, topY - 34 * S, 6 * S, 10 * S);
	ctx.fillStyle = "#ff7a3d";
	circulo(sx + 14 * S, topY - 58 * S, 3 * S);
	// La taza lista, con vapor
	if (!listo) {
		ctx.fillStyle = COLORES.blanco;
		ctx.fillRect(sx + 44 * S, topY - 22 * S, 18 * S, 16 * S);
		ctx.strokeStyle = COLORES.blanco;
		ctx.lineWidth = 3 * S;
		ctx.beginPath();
		ctx.arc(sx + 64 * S, topY - 14 * S, 5 * S, -Math.PI / 2, Math.PI / 2);
		ctx.stroke();
		ctx.strokeStyle = "rgba(255,255,255,0.75)";
		ctx.lineWidth = 2 * S;
		for (let k = 0; k < 2; k++) {
			const vx = sx + 49 * S + k * 8 * S;
			const ola = Math.sin(tiempo * 3 + k) * 3 * S;
			ctx.beginPath();
			ctx.moveTo(vx, topY - 26 * S);
			ctx.quadraticCurveTo(vx + ola, topY - 38 * S, vx - ola, topY - 50 * S);
			ctx.stroke();
		}
	}
	const texto = listo ? "☕ ¡Con energía!" : esTactil ? "Toca Hablar: tomar café" : `E · ${ESTACIONES.cafe.usar}`;
	if (estado === "oficina" && enTerminal()) dibujarGlobo(sx - 50 * S, topY - 186 * S, texto, COLORES.fondoVerdeClaro);
}

// El easter egg: el café te da un salto más alto (mientras sigas aquí) y
// los corazones dorados. También completa la Cafetería (sin subir de nivel).
function beberCafe(m) {
	m.terminalVisitada = true;
	if (cafeina > 0) {
		avisos.push({ texto: "Ya tienes tu café: ¡aprovecha el salto!", t: 0 });
		return;
	}
	cafeina = Infinity; // dura hasta salir de la Cafetería (reiniciarHeroe lo apaga)
	vidasDoradas = DORADAS_MAX;
	heroe.velY = impulsoSalto() * 0.7; // un saltito de alegría
	heroe.ultimoSuelo = -1;
	lanzarChispas(heroe.x, heroe.y + 80, 30, ["#ffd23f", "#fff1c1", COLORES.blanco, COLORES.beige]);
	sonar("victoria");
	avisos.push({ texto: `☕ ¡Súper salto y +${DORADAS_MAX} ♥ dorados!`, t: 0 });
	if (!m.completo) completarModulo(m);
	guardarProgreso();
	actualizarHudOficina();
}

// Heber saluda la primera vez que llegas a su terraza
function actualizarCafeteria() {
	const m = oficinaActual;
	if (!m || !m.oficina.terraza || estado !== "oficina") return;
	const t = m.oficina.terraza;
	const arriba = heroe.y === t.alto && Math.abs(heroe.x - t.x) < t.medioAncho + MARGEN_BORDE;
	if (arriba && !m.saludoDj && m.djNpc) {
		m.saludoDj = true;
		const frases = m.djNpc.dialogo;
		avisos.push({ texto: `${m.djNpc.nombre}: ${frases[Math.floor(Math.random() * frases.length)]}`, t: 0 });
		sonar("pista");
	}
}

// ---------- La azotea (oficina.azotea) ----------
// La Cafetería es una terraza en lo alto de Astria, al anochecer: cielo
// de la hora azul, la ciudad con sus ventanas encendidas, una baranda de
// vidrio, pérgola de madera con luces cálidas y piso de deck.
const azarAzotea = crearAzar(3107);
const CIUDAD_AZOTEA = [0.12, 0.28].map((vel, capa) => ({
	vel,
	torres: Array.from({ length: 22 }, (_, k) => ({
		x: k * 95 + azarAzotea() * 40,
		w: 46 + azarAzotea() * 44,
		alto: (capa ? 0.3 : 0.45) + azarAzotea() * (capa ? 0.35 : 0.4),
		semilla: Math.floor(azarAzotea() * 1000),
	})),
}));
const ESTRELLAS_AZOTEA = Array.from({ length: 40 }, () => ({ x: azarAzotea(), y: azarAzotea() * 0.45, fase: azarAzotea() * 6 }));
const ANCHO_CIUDAD = 2100; // la franja de ciudad se repite cada tanto (a S = 1)

function dibujarFondoAzotea(m, dt) {
	const of = m.oficina;
	const cl = camara - of.x0;
	const horizonte = SUELO - 70 * S;
	// Cielo de la hora azul, más cálido abajo
	const cielo = ctx.createLinearGradient(0, 0, 0, horizonte);
	cielo.addColorStop(0, "#102a4c");
	cielo.addColorStop(0.55, "#2c5b8c");
	cielo.addColorStop(0.85, "#6f8fb0");
	cielo.addColorStop(1, "#e9b98a");
	ctx.fillStyle = cielo;
	ctx.fillRect(0, 0, W, horizonte + 2);
	for (const e of ESTRELLAS_AZOTEA) {
		ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.35 * Math.sin(tiempo * 2 + e.fase)).toFixed(3)})`;
		ctx.fillRect(e.x * W, e.y * horizonte, 2 * S, 2 * S);
	}
	// Montañas lejanas
	ctx.fillStyle = "#2b4a6b";
	ctx.beginPath();
	ctx.moveTo(0, horizonte);
	for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, horizonte - (60 + 40 * Math.sin((x + cl * 0.05) * 0.004) + 20 * Math.sin((x + cl * 0.05) * 0.011)) * S);
	ctx.lineTo(W, horizonte);
	ctx.fill();
	// La ciudad, en dos capas, con ventanas encendidas
	CIUDAD_AZOTEA.forEach((capa, c) => {
		for (const t of capa.torres) {
			const x = modulo(t.x * S - cl * capa.vel, ANCHO_CIUDAD * S) - 100 * S;
			const w = t.w * S;
			if (x > W || x + w < 0) continue;
			const alto = t.alto * (horizonte - 40 * S);
			const y = horizonte - alto;
			ctx.fillStyle = c ? "#1b3555" : "#25466b";
			ctx.fillRect(x, y, w, alto + 2);
			const az = crearAzar(t.semilla);
			for (let wy = y + 8 * S; wy < horizonte - 6 * S; wy += 11 * S)
				for (let wx = x + 5 * S; wx < x + w - 6 * S; wx += 9 * S)
					if (az() < 0.45) {
						ctx.fillStyle = az() < 0.8 ? "rgba(255,214,140,0.85)" : "rgba(200,230,255,0.7)";
						ctx.fillRect(wx, wy, 4 * S, 5 * S);
					}
		}
	});
	// La base de la ciudad (sin esto, entre la ciudad y el vidrio quedaba
	// sin pintar y se veía corrido lo del cuadro anterior)
	ctx.fillStyle = "#162d49";
	ctx.fillRect(0, horizonte, W, SUELO - horizonte + 2);
	// Baranda de vidrio al fondo de la terraza
	const tope = SUELO - 46 * S;
	ctx.fillStyle = "rgba(200,232,240,0.18)";
	ctx.fillRect(0, tope, W, SUELO - tope + 2);
	const paso = 150 * S;
	const off = modulo(camara, paso);
	for (let x = -off; x < W + paso; x += paso) {
		ctx.fillStyle = "rgba(255,255,255,0.12)";
		ctx.fillRect(x + 20 * S, tope + 4 * S, 6 * S, SUELO - tope - 6 * S); // reflejo
		ctx.fillStyle = "#3a4446";
		ctx.fillRect(x - 2 * S, tope, 4 * S, SUELO - tope);
	}
	ctx.fillStyle = "#3a4446";
	ctx.fillRect(0, tope - 4 * S, W, 5 * S);

	dibujarFondoCafeteria(m); // la gente conversando, detrás de la pérgola
	dibujarPergola(m);
	dibujarFlotantesOficina(m, cl);

	// Los extremos: la pared de la torre (con la salida) y el fin de la terraza
	ctx.fillStyle = "#c9c2b6";
	const izq = of.x0 - camara;
	if (izq > 0) ctx.fillRect(0, 0, izq, H);
	ctx.fillStyle = COLORES.verdeProfundo;
	const der = of.terminalX + 140 - camara;
	if (der < W) ctx.fillRect(der, 0, W - der, H);
}

// La pérgola: listones de madera arriba con su viga, una tira de luz
// cálida, focos colgando y sus postes de metal (donde van las columnas
// en las oficinas)
function postesPergola(of) {
	const lista = [];
	for (let x = of.x0 + 520; x < of.terminalX - 200; x += 630) lista.push(x);
	return lista;
}
function dibujarPergola(m) {
	const of = m.oficina;
	const viga = 46 * S;
	const paso = 34 * S;
	const off = modulo(camara, paso);
	for (let x = -off; x < W + paso; x += paso) {
		ctx.fillStyle = "#9a6a3a";
		ctx.fillRect(x, 0, 14 * S, viga);
		ctx.fillStyle = "#c08a50";
		ctx.fillRect(x, 0, 4 * S, viga);
	}
	ctx.fillStyle = "#2b2f33";
	ctx.fillRect(0, viga, W, 12 * S);
	const luz = ctx.createLinearGradient(0, viga + 12 * S, 0, viga + 90 * S);
	luz.addColorStop(0, "rgba(255,206,120,0.35)");
	luz.addColorStop(1, "rgba(255,206,120,0)");
	ctx.fillStyle = luz;
	ctx.fillRect(0, viga + 12 * S, W, 78 * S);
	// Focos colgando entre los postes
	const postes = postesPergola(of);
	for (let k = 0; k + 1 < postes.length; k++) {
		const a = postes[k] - camara;
		const b = postes[k + 1] - camara;
		if (b < -50 || a > W + 50) continue;
		ctx.strokeStyle = "#3a4446";
		ctx.lineWidth = 1.5 * S;
		ctx.beginPath();
		ctx.moveTo(a, viga + 12 * S);
		ctx.quadraticCurveTo((a + b) / 2, viga + 80 * S, b, viga + 12 * S);
		ctx.stroke();
		for (let f = 1; f < 10; f++) {
			const u = f / 10;
			const fx = a + (b - a) * u;
			const fy = viga + 12 * S + 2 * u * (1 - u) * 68 * S;
			ctx.fillStyle = `rgba(255,230,160,${(0.75 + 0.25 * Math.sin(tiempo * 3 + f + k)).toFixed(3)})`;
			circulo(fx, fy + 4 * S, 3.5 * S);
		}
	}
	const piso = SUELO + 40 * S;
	for (const x0 of postes) {
		const sx = x0 - camara;
		if (sx < -30 || sx > W + 30) continue;
		ctx.fillStyle = "#2b2f33";
		ctx.fillRect(sx - 7 * S, viga, 14 * S, piso - viga);
		ctx.fillStyle = "rgba(255,255,255,0.08)";
		ctx.fillRect(sx - 7 * S, viga, 4 * S, piso - viga);
	}
}

// Piso de deck: tablas de madera con sus juntas y una línea de luz al borde
function dibujarSueloAzotea(m) {
	const g = ctx.createLinearGradient(0, SUELO, 0, H);
	g.addColorStop(0, "#8a6240");
	g.addColorStop(1, "#5a3e28");
	ctx.fillStyle = g;
	ctx.fillRect(0, SUELO, W, H - SUELO);
	ctx.fillStyle = "rgba(255,214,140,0.5)"; // luz baja al borde del deck
	ctx.fillRect(0, SUELO, W, 3 * S);
	ctx.strokeStyle = "rgba(0,0,0,0.18)";
	ctx.lineWidth = 1.5 * S;
	const alto = 16 * S;
	for (let y = SUELO + alto, fila = 0; y < H + alto; y += alto, fila++) {
		linea(0, y, W, y);
		const paso = 160 * S;
		const off = modulo(camara + fila * 70 * S, paso);
		for (let x = -off; x < W; x += paso) linea(x, y - alto, x, y);
	}
}

// Lo propio de la azotea (mundo.js → oficina.decoracion). Devuelve false
// si el tipo no es de aquí, para que dibujarDecoracionOficina siga.
function dibujarDecoracionAzotea(tipo, sx, piso) {
	if (tipo === "jardinera") {
		// Jardinera larga con plantas y su luz cálida desde abajo
		const halo = ctx.createRadialGradient(sx, piso - 40 * S, 5 * S, sx, piso - 40 * S, 90 * S);
		halo.addColorStop(0, "rgba(255,206,120,0.45)");
		halo.addColorStop(1, "rgba(255,206,120,0)");
		ctx.fillStyle = halo;
		ctx.fillRect(sx - 90 * S, piso - 130 * S, 180 * S, 130 * S);
		for (let k = -5; k <= 5; k++) {
			ctx.fillStyle = k % 2 ? "#3f8f55" : k % 3 ? "#5aa66a" : "#b5532f"; // alguna hoja rojiza
			ctx.beginPath();
			ctx.ellipse(sx + k * 11 * S, piso - 50 * S - Math.abs(Math.sin(k)) * 22 * S, 8 * S, 26 * S, k * 0.18, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = "#2b2f33";
		ctx.fillRect(sx - 70 * S, piso - 38 * S, 140 * S, 38 * S);
		ctx.fillStyle = "rgba(255,214,140,0.9)";
		for (const dx of [-45, 0, 45]) circulo(sx + dx * S, piso - 6 * S, 3 * S);
		return true;
	}
	if (tipo === "sofa") {
		// Sofá de exterior con cojines
		ctx.fillStyle = "#3b4a5c";
		rectRedondo(sx - 75 * S, piso - 56 * S, 150 * S, 26 * S, 9 * S);
		ctx.fill();
		rectRedondo(sx - 80 * S, piso - 36 * S, 160 * S, 30 * S, 9 * S);
		ctx.fill();
		ctx.fillStyle = "#c9cfd6";
		rectRedondo(sx - 62 * S, piso - 62 * S, 34 * S, 24 * S, 7 * S);
		ctx.fill();
		ctx.fillStyle = COLORES.beige;
		rectRedondo(sx + 26 * S, piso - 62 * S, 34 * S, 24 * S, 7 * S);
		ctx.fill();
		ctx.fillStyle = "#2b2f33";
		ctx.fillRect(sx - 72 * S, piso - 6 * S, 8 * S, 6 * S);
		ctx.fillRect(sx + 64 * S, piso - 6 * S, 8 * S, 6 * S);
		return true;
	}
	if (tipo === "fogata") {
		// Mesa de fuego: piedra con llamitas que bailan
		ctx.fillStyle = "#6b6f72";
		ctx.fillRect(sx - 60 * S, piso - 34 * S, 120 * S, 34 * S);
		ctx.fillStyle = "#4a4e51";
		ctx.fillRect(sx - 60 * S, piso - 38 * S, 120 * S, 6 * S);
		ctx.save();
		ctx.shadowColor = "rgba(255,170,60,0.9)";
		ctx.shadowBlur = 18 * S;
		for (let k = 0; k < 7; k++) {
			const fx = sx - 42 * S + k * 14 * S;
			const alto = (12 + 8 * Math.abs(Math.sin(tiempo * 7 + k * 1.7))) * S;
			ctx.fillStyle = k % 2 ? "#ffb347" : "#ffd36e";
			ctx.beginPath();
			ctx.moveTo(fx - 5 * S, piso - 38 * S);
			ctx.quadraticCurveTo(fx, piso - 38 * S - alto * 1.4, fx + 5 * S, piso - 38 * S);
			ctx.fill();
		}
		ctx.restore();
		return true;
	}
	return false;
}
