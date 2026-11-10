/* Camino a Celaque — la Cafetería (mundo extra): la barra de café, la gente conversando al fondo y la terraza de Eber. Ver juego/LEEME.md. */
"use strict";

// ---------- Cafetería ----------
// Un mundo extra sin preguntas (mundo.js → extra). Al fondo está la barra
// de café (oficina.estacion "cafe"): tomarse uno es el easter egg, saltas
// más alto mientras sigas en la Cafetería y ganas DORADAS_MAX corazones
// dorados (fisica.js), y el mundo queda completo. Con oficina.fondo, todos
// los personajes del juego conversan al fondo en sus mesas; con
// oficina.terraza, arriba de un mueble hay una terraza alta (solo se llega
// con el café) donde está quien diga oficina.dj (Eber), sentado con su
// sopa junto a su parlante. Al fondo, además, hay invitados: unos más en
// los grupos (un grupo de cada tres, sentado en una banca) y otros que
// caminan de un lado a otro, más atrás. Quien habla se ríe dando saltitos.
// Cada grupo con gente del equipo platica de un tema de la Inducción
// (mundo.js → oficina.platicas): en su globo salen frases cortas y, al
// acercarte, con E (o Hablar) escuchas la plática completa. Detrás de la
// barra trabaja la barista, y en el cielo de la noche pasa una guacamaya.

// Reacciones de quien escucha (entre un turno y otro) y globos de los
// grupos sin tema
const FRASES_FONDO = ["jaja", "☕", "♪", "¡Qué bien!", "♥", "¿Y tú?", "¡Claro!", "jeje", "¡Salud!", "¡Ja ja ja!", "¡Qué rico!", "¡Eso!"];

// Quién puede contar una plática: una persona del equipo (los compañeros de
// las oficinas, con nombre y apellido), no la gente del camino de Talento
// (Buena Vibra, Creativa...) ni los invitados sin nombre
const NOMBRE_PERSONA = /^\p{Lu}\p{Ll}+( \p{Lu}\p{Ll}+)+$/u;
const esPersonaDelEquipo = (n) => !npcs.includes(n) && NOMBRE_PERSONA.test(n.nombre || "");
const primerNombre = (n) => n.nombre.split(" ")[0];

// Toda la gente del juego (los compañeros de las oficinas y la del camino
// de Talento), menos la de la misma Cafetería. Se arma la primera vez.
let genteCafeteria = null;
function gentePara(m) {
	if (genteCafeteria) return genteCafeteria;
	const otros = modulos.filter((x) => x !== m).flatMap((x) => x.oficina.companeros);
	genteCafeteria = [...npcs, ...otros].filter((n) => n.apariencia);
	return genteCafeteria;
}

// Invitados sin nombre (más gente en el fondo): ropa de colores distintos
const ROPA_INVITADOS = [COLORES.verdeInstitucional, COLORES.beige, "#d9776a", "#6a8fd9", "#e0b84a", "#8a6ac9", "#4aa3a0", "#c97a9a"];
const INVITADOS_CAFETERIA = Array.from({ length: 16 }, (_, k) => ({
	nombre: "",
	apariencia: {
		cuerpo: k % 2 ? "chica" : "chico",
		casco: "#ffffff",
		chaleco: ROPA_INVITADOS[(k * 3) % ROPA_INVITADOS.length],
		pelo: ["#1f1a17", "#3b2414", "#5a2a14", "#2b1a12"][k % 4],
		pantalon: ["#2d3a4a", "#4a3a2d", "#3a4a3d"][k % 3],
	},
}));
const INVITADOS_EN_GRUPOS = 8; // los primeros van a los grupos; los demás caminan

// Lo que ya ocupa el piso (decoración, columnas, muebles, compañeros, la
// terraza, la puerta y la barra): ahí no se para nadie del fondo, para que
// no se vea encimado. Cada cosa: [desde, hasta] en x del mundo.
const ANCHO_DECORACION = { librero: 60, sillon: 80, pizarra: 80, cafetera: 55, plantaAlta: 35, especial: 70, lampara: 30, jardinera: 85, sofa: 85, fogata: 65, acapulco: 85, chiavari: 80 };
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
	if (of.interior) tramos.push([of.interior - 60, of.interior + 150]); // la puerta de vidrio del local
	return tramos.sort((a, b) => a[0] - b[0]);
}

// Grupos de 2 a 4 alrededor de una mesa alta, en los huecos libres del local
const PASO_GENTE = 44; // entre una persona y la siguiente de un grupo
function gruposFondo(m) {
	if (m.oficina.grupos) return m.oficina.grupos;
	const reales = gentePara(m);
	const gente = [...reales, ...INVITADOS_CAFETERIA.slice(0, INVITADOS_EN_GRUPOS)]; // los invitados, al final: si no caben, no pasa nada
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
			grupos.push({ x: x + ancho / 2, gente: gente.slice(k, k + cuantos), fase: grupos.length * 1.7, sentados: grupos.length % 3 === 1 });
			k += cuantos;
			x += ancho + 70;
		}
		desde = Math.max(desde, b);
	}
	// Cada grupo con alguien del equipo se lleva una plática, en orden
	// (mundo.js → oficina.platicas); "escuchadas" la va cambiando
	const datos = MODULOS_DATOS[m.indice].oficina || {};
	let tema = 0;
	for (const g of grupos) {
		g.hablantes = g.gente.filter(esPersonaDelEquipo);
		g.tema = g.hablantes.length && datos.platicas && datos.platicas.length ? tema++ : -1;
		g.escuchadas = 0;
		g.oida = false;
	}
	of.platicas = datos.platicas || [];
	of.conTema = tema; // cuántos grupos tienen plática
	of.grupos = grupos;
	of.genteFuera = Math.max(0, reales.length - k); // la prueba "cafeteria" revisa que sea 0 (los invitados no cuentan)
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

// Cómo se mueve el brazo de quien platica, cuadro por cuadro
const GESTOS_PLATICA = ["quieto", "platica1", "platica2", "platica2", "platica1"];

// La plática que tiene ahora un grupo (o null si no tiene tema)
function platicaDe(of, g) {
	if (g.tema < 0 || !of.platicas.length) return null;
	return of.platicas[(g.tema + g.escuchadas * of.conTema) % of.platicas.length]; // la 2.ª vez, los temas que no tocó ningún grupo
}

// El último de un grupo de pie (de 3 o más) se va a servir otro café cada
// VUELTA_CAFE segundos: camina hacia afuera desvaneciéndose, tarda un rato
// y vuelve con su taza. Devuelve null mientras está en su lugar, o cuánto
// se ve (alfa), cuánto se alejó (lejos: 0 a 1) y si ya trae la taza.
const VUELTA_CAFE = 26;
function vueltaPorCafe(g, j) {
	if (g.sentados || g.gente.length < 3 || j !== g.gente.length - 1) return null;
	const u = modulo(tiempo / VUELTA_CAFE + g.fase * 0.37, 1);
	if (u < 0.55 || u >= 0.95) return null;
	if (u < 0.62) return { alfa: 1 - (u - 0.55) / 0.07, lejos: (u - 0.55) / 0.07, taza: false };
	if (u < 0.88) return { alfa: 0, lejos: 1, taza: false };
	return { alfa: (u - 0.88) / 0.07, lejos: 1 - (u - 0.88) / 0.07, taza: true };
}

// Dos hilitos de vapor que suben de una taza (x, y: el borde de arriba)
function vaporTaza(x, y, fase) {
	ctx.strokeStyle = COLORES.blanco;
	ctx.lineWidth = 1.3 * S;
	for (let k = 0; k < 2; k++) {
		const u = modulo(tiempo * 0.5 + fase + k * 0.5, 1);
		const vx = x + (k - 0.5) * 3 * S + Math.sin(u * 6 + fase) * 2 * S;
		ctx.globalAlpha = 0.6 * (1 - u);
		ctx.beginPath();
		ctx.moveTo(vx, y - u * 14 * S);
		ctx.quadraticCurveTo(vx + 2.5 * S, y - (u * 14 + 4) * S, vx, y - (u * 14 + 8) * S);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;
}

// Invitados que caminan de un lado a otro del local, más atrás que los
// grupos (más chicos y más arriba); dan la vuelta en las orillas
function dibujarCaminantesCafeteria(m, sAntes) {
	const of = m.oficina;
	const pie = SUELO - 30 * S;
	const largo = of.terminalX - of.x0 - 400;
	INVITADOS_CAFETERIA.slice(INVITADOS_EN_GRUPOS).forEach((n, i) => {
		const vel = 38 + (i % 3) * 9;
		const p = modulo((tiempo * vel) / (2 * largo) + i * 0.137, 1);
		const x = of.x0 + 200 + (p < 0.5 ? p * 2 : 2 - p * 2) * largo;
		const sx = x - camara;
		if (sx < -100 * S || sx > W + 100 * S) return;
		// Un paso cada media vuelta: alterna las 2 fotos de caminar
		const paso = tiempo * vel * 0.14 + i;
		ctx.save();
		ctx.globalAlpha = 0.8;
		S = sAntes * 0.6;
		dibujarNpcFoto(sx, pie - Math.abs(Math.sin(paso)) * 2 * S, n, p < 0.5 ? 1 : -1, Math.floor(paso / Math.PI) % 2 ? "caminando2" : "caminando", x);
		S = sAntes;
		ctx.restore();
	});
}

// La gente conversando al fondo: más chica y más arriba (está más lejos),
// detrás de las columnas y de todo lo demás (dibujo-oficina.js la llama
// antes que las columnas), y solo en los huecos libres (gruposFondo). Los
// grupos sentados están en una banca, con las piernas dobladas (pose
// sentado, de tools/pose_sentado.py) y una mesita de centro. Quien platica de pie
// dobla el brazo para explicar (fotos de tools/pose_platica.py).
function dibujarFondoCafeteria(m) {
	if (!m.oficina.fondo) return;
	const pie = SUELO - 8 * S;
	const k = 0.72; // tamaño, comparado con quien está al frente
	const sAntes = S;
	dibujarCaminantesCafeteria(m, sAntes);
	for (const g of gruposFondo(m)) {
		const sx = g.x - camara;
		if (sx < -200 * S || sx > W + 200 * S) continue;
		const lugares = g.gente.map((_, j) => (j - (g.gente.length - 1) / 2) * PASO_GENTE * S);
		const ancho = (g.gente.length - 1) * PASO_GENTE * S + 40 * S;
		S = sAntes * k;
		const asiento = pie + puntoNpc(g.gente[0], "sentado", 0, CUERPOS_NPC.chico.poses.sentado.meta.asiento).y;
		S = sAntes;
		if (g.sentados) {
			// La banca, detrás de ellos: respaldo, asiento y patas
			ctx.fillStyle = "#8a6748";
			rectRedondo(sx - ancho / 2 - 10 * S, asiento - 34 * S, ancho + 20 * S, 8 * S, 3 * S);
			ctx.fill();
			ctx.fillStyle = "#a07c58";
			rectRedondo(sx - ancho / 2 - 10 * S, asiento - 3 * S, ancho + 20 * S, 7 * S, 3 * S);
			ctx.fill();
			ctx.fillStyle = "#6f5238";
			for (const lado of [-1, 1]) ctx.fillRect(sx + lado * (ancho / 2 + 2 * S) - 2 * S, asiento - 30 * S, 4 * S, pie - asiento + 30 * S);
		} else {
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
			vaporTaza(sx - 7 * S, pie - 64 * S, g.fase);
			vaporTaza(sx + 7 * S, pie - 64 * S, g.fase + 0.4);
		}
		// Quién habla ahora (cambia cada 1.8 s): ese se ríe dando saltitos
		const turno = Math.floor(tiempo / 1.8 + g.fase);
		const hablando = modulo(tiempo / 1.8 + g.fase, 1) < 0.8;
		const quien = turno % g.gente.length;
		const fuera = g.gente.map((_, j) => vueltaPorCafe(g, j));
		// Entre un turno y otro, quien sigue reacciona (y, de pie, levanta la mano)
		const reacciona = hablando ? -1 : (quien + 1) % g.gente.length;
		g.gente.forEach((n, j) => {
			const vuelta = fuera[j];
			if (vuelta) {
				// Va a servirse (o vuelve): camina hacia afuera y hacia atrás
				if (vuelta.alfa <= 0) return;
				const lado = lugares[j] >= 0 ? 1 : -1;
				const x = sx + lugares[j] + lado * vuelta.lejos * 60 * S;
				const y = pie - vuelta.lejos * 10 * S;
				const mira = vuelta.taza ? -lado : lado;
				ctx.save();
				ctx.globalAlpha = 0.9 * vuelta.alfa;
				S = sAntes * k;
				dibujarNpcFoto(x, y, n, mira, Math.floor(tiempo * 6) % 2 ? "caminando2" : "caminando", g.x + j * 7);
				if (vuelta.taza) {
					// La taza nueva, en la mano de adelante
					ctx.fillStyle = COLORES.blanco;
					ctx.fillRect(x + mira * 14 * S - 3 * S, y - 58 * S, 6 * S, 7 * S);
				}
				S = sAntes;
				ctx.restore();
				return;
			}
			const habla = hablando && j === quien;
			// Sentados no saltan (se veían subir y bajar de la banca)
			const risa = g.sentados ? 0 : habla ? Math.abs(Math.sin(tiempo * 9 + j)) * 4 * S : Math.abs(Math.sin(tiempo * 2.4 + g.fase + j * 1.3)) * 1.2 * S;
			// De pie, quien habla gesticula: sube y baja el antebrazo
			const gesto = g.sentados ? "quieto" : habla ? GESTOS_PLATICA[Math.floor(tiempo * 5 + j) % GESTOS_PLATICA.length] : j === reacciona ? "platica1" : "quieto";
			const pose = g.sentados ? "sentado" : gesto;
			ctx.save();
			ctx.globalAlpha = 0.9;
			S = sAntes * k;
			dibujarNpcFoto(sx + lugares[j], pie - risa, n, lugares[j] > 0 ? -1 : 1, pose, g.x + j * 7); // cada uno mira hacia el centro
			S = sAntes;
			ctx.restore();
		});
		if (g.sentados) {
			// Mesita de centro, más baja que las rodillas, con sus tazas
			const mesita = pie - 16 * S;
			ctx.fillStyle = "#6f5238";
			ctx.fillRect(sx - 2 * S, mesita, 4 * S, pie - mesita);
			ctx.fillStyle = "#c89b6d";
			ctx.beginPath();
			ctx.ellipse(sx, mesita, 14 * S, 3.5 * S, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = COLORES.blanco;
			ctx.fillRect(sx - 8 * S, mesita - 7 * S, 5 * S, 6 * S);
			ctx.fillStyle = "#e0b84a";
			ctx.fillRect(sx + 3 * S, mesita - 7 * S, 5 * S, 6 * S);
			vaporTaza(sx - 5.5 * S, mesita - 8 * S, g.fase);
			vaporTaza(sx + 5.5 * S, mesita - 8 * S, g.fase + 0.5);
		}
		// Su globo: una frase del tema que platican (o una genérica si no
		// tienen tema); entre turnos, la reacción de quien escucha
		const altoGlobo = pie - (g.sentados ? 80 : 92) * S;
		const platica = platicaDe(m.oficina, g);
		if (hablando && !fuera[quien]) globoChico(sx + lugares[quien], altoGlobo, platica ? platica.globos[turno % platica.globos.length] : FRASES_FONDO[(turno * 3 + quien) % FRASES_FONDO.length]);
		else if (!hablando && !fuera[reacciona]) globoChico(sx + lugares[reacciona], altoGlobo, FRASES_FONDO[(turno * 5 + reacciona) % FRASES_FONDO.length]);
	}
}

// ---------- Escuchar una plática ----------
// El grupo con tema que tienes enfrente (en el piso, a su altura), o null
function platicaCerca() {
	const m = oficinaActual;
	if (estado !== "oficina" || !m || !m.oficina.fondo || !m.oficina.grupos) return null;
	return m.oficina.grupos.find((g) => platicaDe(m.oficina, g) && cercaDe(g.x, ((g.gente.length - 1) * PASO_GENTE) / 2 + 40)) || null;
}

// Abre la plática como un diálogo: cada página la dice, por turnos, alguien
// del grupo. Cuando te alejas, el grupo pasa a hablar de otra cosa
// (dibujarAvisoPlatica); si no te mueves, la puedes volver a escuchar.
function abrirPlatica(g) {
	const p = platicaDe(oficinaActual.oficina, g);
	g.oida = true;
	abrirDialogo({
		nombre: `☕ ${p.tema}`,
		inicial: "☕",
		apariencia: g.hablantes[0].apariencia,
		dialogo: p.lineas.map((t, k) => `${primerNombre(g.hablantes[k % g.hablantes.length])}: ${t}`),
		x: g.x,
		enOficina: true, // como los compañeros: escuchar no sube de nivel
	});
}

// "E · Escuchar" sobre el grupo que tienes enfrente (lo llama
// dibujarTerraza, que se dibuja después de la decoración y la barra)
function dibujarAvisoPlatica() {
	const g = platicaCerca();
	if (estado === "oficina" && oficinaActual.oficina.grupos)
		for (const otro of oficinaActual.oficina.grupos)
			if (otro.oida && otro !== g) {
				otro.oida = false;
				otro.escuchadas++; // ya te alejaste: ahora platican de otro tema
			}
	if (g) dibujarGlobo(g.x - camara, SUELO - 122 * S, esTactil ? "Toca Hablar para escuchar" : "E · Escuchar", "#fffbea");
}

// Altura en pantalla de algo que está a "alto" sobre el piso (como heroe.y)
const pantallaY = (alto) => SUELO + 38 * S - alto * S;

// La terraza alta: losa con baranda, columnas hasta el piso, plantas,
// foquitos y Eber sentado con su sopa junto a su parlante (y notas de música)
function dibujarTerraza(m) {
	dibujarAvisoPlatica();
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
	// Foquitos colgando del techo hasta la baranda (el cable se mece con el aire)
	const meceY = y - 40 * S + Math.sin(tiempo * 0.9) * 6 * S;
	ctx.strokeStyle = "#3a4446";
	ctx.lineWidth = 1.5 * S;
	ctx.beginPath();
	ctx.moveTo(sx - w, 34 * S);
	ctx.quadraticCurveTo(sx, meceY, sx + w, 34 * S);
	ctx.stroke();
	for (let k = 1; k < 8; k++) {
		const u = k / 8;
		const fx = sx - w + u * 2 * w;
		const fy = (1 - u) * (1 - u) * 34 * S + 2 * u * (1 - u) * meceY + u * u * 34 * S;
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
			ctx.ellipse(px + k * 5 * S, y - 22 * S, 5 * S, 14 * S, k * 0.35 + Math.sin(tiempo * 1.3 + k + lado) * 0.08, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.fillStyle = COLORES.beige;
		ctx.fillRect(px - 10 * S, y - 14 * S, 20 * S, 14 * S);
	}
	// Eber, sentado en su mesita tomándose una sopa, junto a su parlante
	const dj = m.djNpc;
	if (dj) {
		const hx = sx + w * 0.4;
		const meta = (CUERPOS_NPC[dj.apariencia.cuerpo] || CUERPOS_NPC.chico).poses.sentado.meta;
		const mesa = y + puntoNpc(dj, "sentado", 0, meta.regazo).y - 6 * S; // justo arriba del regazo
		const asiento = y + puntoNpc(dj, "sentado", 0, meta.asiento).y;
		const rodilla = puntoNpc(dj, "sentado", 0.6, 0).x;
		// Silla, detrás de él: respaldo, asiento y patas
		ctx.fillStyle = "#6f5238";
		ctx.fillRect(hx - 24 * S, asiento - 46 * S, 5 * S, y - asiento + 46 * S);
		ctx.fillRect(hx + 10 * S, asiento, 4 * S, y - asiento);
		ctx.fillStyle = "#a07c58";
		ctx.fillRect(hx - 26 * S, asiento - 3 * S, 42 * S, 6 * S);
		// Eber completo, sentado y quieto (no sube ni baja)
		dibujarNpcFoto(hx, y, dj, 1, "sentado", t.x);
		// Mesita adelante con mantel: tapa el regazo y la mano que en la foto
		// cuelga sobre la rodilla
		const tx = hx + rodilla - 4 * S;
		const izqMesa = Math.min(tx - 30 * S, hx + puntoNpc(dj, "sentado", 0.46, 0).x);
		ctx.fillStyle = "#c89b6d";
		rectRedondo(izqMesa, mesa - 3 * S, tx + 30 * S - izqMesa, 7 * S, 3 * S);
		ctx.fill();
		ctx.fillStyle = mezclar(COLORES.beige, COLORES.blanco, 0.55); // mantel
		ctx.beginPath();
		ctx.moveTo(izqMesa + 2 * S, mesa + 3 * S);
		ctx.lineTo(tx + 28 * S, mesa + 3 * S);
		ctx.lineTo(tx + 30 * S, y - 4 * S);
		for (let k = 0; k <= 6; k++) ctx.lineTo(tx + 30 * S - ((tx + 30 * S - izqMesa) * k) / 6, y - 4 * S + (k % 2) * 3 * S); // orilla ondulada
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = conAlfa(COLORES.verdeInstitucional, 0.55); // franja del mantel
		ctx.fillRect(izqMesa + 2 * S, mesa + 9 * S, tx + 26 * S - izqMesa, 3 * S);
		ctx.fillStyle = COLORES.blanco; // tazón
		ctx.beginPath();
		ctx.ellipse(tx, mesa - 6 * S, 11 * S, 7 * S, 0, 0, Math.PI);
		ctx.fill();
		ctx.fillStyle = "#e0a24a"; // la sopa
		ctx.beginPath();
		ctx.ellipse(tx, mesa - 6 * S, 10 * S, 2.5 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.7)"; // vapor
		ctx.lineWidth = 1.5 * S;
		for (let k = 0; k < 3; k++) {
			const u = modulo(tiempo * 0.6 + k / 3, 1);
			const vx = tx - 5 * S + k * 5 * S + Math.sin(u * 6 + k) * 3 * S;
			ctx.globalAlpha = 1 - u;
			linea(vx, mesa - 10 * S - u * 22 * S, vx + Math.sin(u * 6 + k + 1) * 3 * S, mesa - 16 * S - u * 22 * S);
		}
		ctx.globalAlpha = 1;
		dibujarPlacaImportante(hx, y - 130 * S, `${dj.nombre} ♪`);
		// Parlante
		const px = sx - w * 0.55; // a la izquierda, lejos de su mesa (tapaba el tazón)
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

// La barista: sin nombre (no es una persona del equipo), con delantal café
const BARISTA_CAFETERIA = {
	nombre: "",
	apariencia: { cuerpo: "chica", casco: COLORES.blanco, chaleco: "#936739", pelo: "#2b1a12", pantalon: "#2d3a4a" },
};
const BARISTA_CICLO = 9; // segundos entre preparar y atender

// La barra de café al fondo (en vez de la computadora)
function dibujarBarraCafe(m, sx, piso) {
	const listo = cafeina > 0;
	const topY = piso - 78 * S;
	// Como la cocina de la foto: gabinetes verdes arriba, con su luz cálida debajo
	ctx.fillStyle = "#466f5d";
	ctx.fillRect(sx - 140 * S, topY - 236 * S, 280 * S, 58 * S);
	ctx.fillStyle = "#3a5e4f";
	for (let k = 1; k < 4; k++) ctx.fillRect(sx - 140 * S + k * 70 * S, topY - 236 * S, 2 * S, 58 * S);
	ctx.fillStyle = "#d9d3c7"; // jaladeras
	for (let k = 0; k < 4; k++) ctx.fillRect(sx - 140 * S + k * 70 * S + 60 * S, topY - 200 * S, 2.5 * S, 14 * S);
	ctx.fillStyle = degradadoAzotea(`led|${topY}|${S}`, () => {
		const g = ctx.createLinearGradient(0, topY - 178 * S, 0, topY - 120 * S);
		g.addColorStop(0, "rgba(255,214,140,0.45)");
		g.addColorStop(1, "rgba(255,214,140,0)");
		return g;
	});
	ctx.fillRect(sx - 140 * S, topY - 178 * S, 280 * S, 58 * S);
	ctx.fillStyle = "#ffe2a6";
	ctx.fillRect(sx - 136 * S, topY - 179 * S, 272 * S, 2 * S);
	// Repisa de madera clara con tazas y el menú
	ctx.fillStyle = "#c9a77c";
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
	// La barista, detrás de la barra (sobre la tarima de atrás: la barra le
	// tapa de la cintura para abajo): un rato
	// mira a la máquina y mueve el brazo preparando, otro rato a la gente
	const ciclo = modulo(tiempo, BARISTA_CICLO);
	const prepara = ciclo < BARISTA_CICLO * 0.45;
	dibujarNpcFoto(sx + 76 * S, piso - 34 * S, BARISTA_CAFETERIA, prepara ? -1 : 1, prepara ? GESTOS_PLATICA[Math.floor(tiempo * 3) % GESTOS_PLATICA.length] : "quieto", 0);
	// Barra: frente de roble claro con listones, cubierta blanca y zócalo verde
	ctx.fillStyle = "#d2b48c";
	ctx.fillRect(sx - 110 * S, topY, 220 * S, 78 * S);
	ctx.fillStyle = "#c2a37a";
	for (let x = sx - 104 * S; x < sx + 104 * S; x += 13 * S) ctx.fillRect(x, topY + 6 * S, 4 * S, 62 * S);
	ctx.fillStyle = COLORES.verdeInstitucional;
	ctx.fillRect(sx - 110 * S, piso - 10 * S, 220 * S, 10 * S);
	ctx.fillStyle = "#f2f0ea";
	rectRedondo(sx - 118 * S, topY - 8 * S, 236 * S, 12 * S, 4 * S);
	ctx.fill();
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.fillRect(sx - 116 * S, topY + 3 * S, 232 * S, 2 * S);
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

// El easter egg: el café te da un salto más alto (mientras sigas aquí) y,
// solo la primera vez, los corazones dorados: son un plus, y si un golpe te
// los quita no se recuperan volviendo por otro café. También completa la
// Cafetería (sin subir de nivel).
function beberCafe(m) {
	m.terminalVisitada = true;
	if (cafeina > 0) {
		avisos.push({ texto: "Ya tienes tu café: ¡aprovecha el salto!", t: 0 });
		return;
	}
	const primeraVez = !m.completo;
	cafeina = Infinity; // dura hasta salir de la Cafetería (reiniciarHeroe lo apaga)
	if (primeraVez) vidasDoradas = DORADAS_MAX;
	heroe.velY = impulsoSalto() * 0.7; // un saltito de alegría
	heroe.ultimoSuelo = -1;
	lanzarChispas(heroe.x, heroe.y + 80, 30, ["#ffd23f", "#fff1c1", COLORES.blanco, COLORES.beige]);
	sonar("victoria");
	avisos.push({ texto: primeraVez ? `☕ ¡Súper salto y +${DORADAS_MAX} ♥ dorados!` : "☕ ¡Súper salto!", t: 0 });
	if (!m.completo) completarModulo(m);
	guardarProgreso();
	actualizarHudOficina();
}

// Eber saluda la primera vez que llegas a su terraza
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
// La Cafetería imita el lugar real (fotos de la terraza y del local). Primero
// la terraza de noche: cielo oscuro, cerros llenos de luces de la ciudad, un
// edificio blanco con sus luces rojas, pérgolas grises con focos, jardineras
// de concreto con zacate y sofás con cojines amarillos. Pasando la puerta de
// vidrio (oficina.interior) está el local: techo blanco con ductos a la
// vista, lámparas de papel, columnas con círculos verdes, cortinas verdes,
// una pantalla y piso de madera clara, con la barra al fondo.
const azarAzotea = crearAzar(3107);
const ANCHO_CIUDAD = 2100; // los cerros con luces se repiten cada tanto (a S = 1)
// Dos capas de cerros (la lejana se mueve menos) con sus lucecitas: u es el
// lugar en la franja (0 a ANCHO_CIUDAD) y v, qué tan abajo del borde del cerro
const CERROS_AZOTEA = [
	{ vel: 0.04, base: 64, a: 20, b: 9, color: "#0f1729", luces: 340, tam: 1.6, olas: [2, 5] },
	{ vel: 0.1, base: 34, a: 12, b: 7, color: "#0a101e", luces: 230, tam: 2.2, olas: [3, 7] },
].map((c) => ({
	...c,
	puntos: Array.from({ length: c.luces }, () => ({ u: azarAzotea() * ANCHO_CIUDAD, v: 0.08 + azarAzotea() ** 0.7 * 0.9, calida: azarAzotea() < 0.78, fase: azarAzotea() * 6 })),
}));
const altoCerro = (c, u) => c.base + c.a * Math.sin((u / ANCHO_CIUDAD) * Math.PI * 2 * c.olas[0]) + c.b * Math.sin((u / ANCHO_CIUDAD) * Math.PI * 2 * c.olas[1] + 1);
// El edificio blanco de la foto (dos en cada franja), entre las dos capas de cerros
const EDIFICIOS_AZOTEA = [
	{ u: 520, w: 250, alto: 150, semilla: 11 },
	{ u: 1500, w: 190, alto: 120, semilla: 29 },
];
const VEL_EDIFICIOS = 0.07;
const ESTRELLAS_AZOTEA = Array.from({ length: 50 }, () => ({ x: azarAzotea(), y: azarAzotea() * 0.5, fase: azarAzotea() * 6 }));
// Nubes oscuras de la noche: alto (fracción del horizonte), ancho y velocidad (a S = 1)
const NUBES_AZOTEA = Array.from({ length: 5 }, (_, k) => ({ x: azarAzotea(), y: 0.12 + k * 0.12, w: 220 + azarAzotea() * 260, vel: 3 + azarAzotea() * 4 }));
// Palomas sobre las jardineras del fondo (x desde la entrada, en el mundo)
const PALOMAS_AZOTEA = [{ x: 760, fase: 0 }, { x: 790, fase: 1.7 }, { x: 1890, fase: 3.1 }];
const VUELO_GUACAMAYA = 30; // cada cuántos segundos cruza el cielo
const COLORES_GUACAMAYA = { cuerpo: "#d7332a", ala: "#f2c230", punta: "#2f6fc2", cara: "#f4efe6" };
// Las pérgolas de la terraza: [desde, hasta] en px desde la entrada (como
// en la foto, dos techos sueltos con cielo abierto entre ellos)
const PERGOLAS_AZOTEA = [
	[360, 1200],
	[1540, 2340],
];
// El local por dentro (px desde oficina.interior)
const COLUMNAS_LOCAL = [360, 1060]; // columnas blancas con círculos verdes
const PANTALLA_LOCAL = 700; // la pantalla de proyección, entre las dos columnas (ahí no hay ventanal)
const PARED_VERDE = 560; // los últimos px antes de la barra: pared verde de la cocina
const LAMPARAS_LOCAL = Array.from({ length: 9 }, (_, k) => {
	const az = crearAzar(500 + k);
	const cuantas = 1 + Math.floor(az() * 3);
	// Racimos de lámparas de papel, colgadas a distintas alturas
	return { d: 130 + k * 215, bolas: Array.from({ length: cuantas }, (_, j) => ({ dx: (j - (cuantas - 1) / 2) * 44 + (az() - 0.5) * 12, cable: 40 + az() * 80, r: 16 + az() * 8 })) };
});

// Los degradados de la azotea se arman una vez por tamaño de pantalla (no
// en cada cuadro): la clave lleva las medidas de las que dependen
const degradadosAzotea = new Map();
function degradadoAzotea(clave, crear) {
	let g = degradadosAzotea.get(clave);
	if (!g) {
		if (degradadosAzotea.size > 40) degradadosAzotea.clear(); // cambió el tamaño de la pantalla
		g = crear();
		degradadosAzotea.set(clave, g);
	}
	return g;
}
// Un halo de luz redondo (radio r, a S actual), armado en el origen: se traslada a su lugar
function haloAzotea(clave, r, color, alfa) {
	return degradadoAzotea(`halo-${clave}|${S}`, () => {
		const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * S);
		g.addColorStop(0, `rgba(${color},${alfa})`);
		g.addColorStop(1, `rgba(${color},0)`);
		return g;
	});
}

// Una paloma parada en la jardinera: picotea de vez en cuando
function dibujarPaloma(x, y, p) {
	const dir = p.fase > 2 ? -1 : 1;
	const pica = modulo(tiempo * 0.5 + p.fase * 0.3, 1) > 0.82 ? 3 * S : 0;
	ctx.fillStyle = "#8d959c";
	ctx.beginPath();
	ctx.ellipse(x, y - 5 * S, 7 * S, 4.5 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#6b737a"; // ala y cola
	ctx.beginPath();
	ctx.ellipse(x - dir * 2 * S, y - 5.5 * S, 5 * S, 3 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillRect(x - dir * 10 * S - (dir < 0 ? 4 * S : 0), y - 6 * S, 4 * S, 2.5 * S);
	ctx.fillStyle = "#9aa3aa"; // cabeza
	circulo(x + dir * 6 * S, y - 9 * S + pica, 2.8 * S);
	ctx.fillStyle = "#e0a24a"; // pico
	ctx.fillRect(x + dir * 8.5 * S - (dir < 0 ? 2.5 * S : 0), y - 9 * S + pica, 2.5 * S, 1.2 * S);
}

// La guacamaya que cruza el cielo de derecha a izquierda, aleteando
function dibujarGuacamaya(horizonte) {
	const p = modulo(tiempo / VUELO_GUACAMAYA, 1);
	if (p > 0.3) return;
	let x = W + 80 * S - (p / 0.3) * (W + 160 * S);
	let y = horizonte * 0.34 + Math.sin(p * 40) * 8 * S;
	const c = COLORES_GUACAMAYA;
	ctx.save();
	ctx.translate(x, y); // se dibuja alrededor de (0, 0), un poco más grande
	ctx.scale(1.5, 1.5);
	x = 0;
	y = 0;
	const ala = Math.sin(tiempo * 12) * 11 * S; // arriba y abajo
	ctx.fillStyle = c.cuerpo; // cola larga, hacia atrás
	ctx.beginPath();
	ctx.moveTo(x + 8 * S, y - 2 * S);
	ctx.lineTo(x + 34 * S, y + 4 * S);
	ctx.lineTo(x + 8 * S, y + 3 * S);
	ctx.fill();
	ctx.fillStyle = c.punta;
	ctx.beginPath();
	ctx.moveTo(x + 22 * S, y + 1.5 * S);
	ctx.lineTo(x + 34 * S, y + 4 * S);
	ctx.lineTo(x + 22 * S, y + 3.5 * S);
	ctx.fill();
	ctx.fillStyle = c.cuerpo; // cuerpo y cabeza
	ctx.beginPath();
	ctx.ellipse(x, y, 12 * S, 5 * S, -0.1, 0, Math.PI * 2);
	ctx.fill();
	circulo(x - 11 * S, y - 2 * S, 4.5 * S);
	ctx.fillStyle = c.cara;
	circulo(x - 12 * S, y - 2.5 * S, 2 * S);
	ctx.fillStyle = "#2b2f33"; // pico
	ctx.beginPath();
	ctx.moveTo(x - 15 * S, y - 3.5 * S);
	ctx.lineTo(x - 19 * S, y - 0.5 * S);
	ctx.lineTo(x - 14.5 * S, y + 0.5 * S);
	ctx.fill();
	for (const [color, largo] of [[c.ala, 1], [c.punta, 0.55]]) {
		// El ala: amarilla al centro y azul en la punta
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(x - 4 * S, y - 1 * S);
		ctx.lineTo(x + 6 * S, y - 1 * S);
		ctx.lineTo(x + (2 + 8 * largo) * S, y - 1 * S - ala * (0.45 + largo));
		ctx.fill();
	}
	ctx.restore();
}

// Dónde empieza el local, en pantalla (Infinity: todo es terraza)
const bordeInterior = (of) => (of.interior ? of.interior - camara : Infinity);

function dibujarFondoAzotea(m, dt) {
	const of = m.oficina;
	const cl = camara - of.x0;
	const ix = bordeInterior(of);
	const tope = SUELO - 46 * S; // donde empiezan las jardineras del fondo
	const horizonte = tope - 6 * S;
	if (ix > 0) {
		ctx.save();
		if (ix < W) {
			ctx.beginPath();
			ctx.rect(0, 0, ix, H);
			ctx.clip();
		}
		dibujarNocheAzotea(of, cl, horizonte, tope);
		ctx.restore();
	}
	if (ix < W) dibujarLocalPorDentro(of, Math.max(0, ix), tope);

	dibujarFondoCafeteria(m); // la gente conversando, detrás de las pérgolas y las lámparas
	if (ix > 0) dibujarPergolas(of, ix);
	if (ix < W) dibujarLamparasLocal(of, ix);
	if (ix > -130 * S && ix < W + 80 * S) dibujarPuertaLocal(ix); // el marco y el letrero llegan hasta ix + 122·S
	dibujarFlotantesOficina(m, cl);

	// Los extremos: la pared de la torre (con la salida) y el fin del local
	ctx.fillStyle = "#c9c2b6";
	const izq = of.x0 - camara;
	if (izq > 0) ctx.fillRect(0, 0, izq, H);
	const der = of.terminalX + 140 - camara;
	if (der < W) {
		if (of.interior) {
			// Con local: la pared verde de la cocina sigue hasta el final (no un hueco liso)
			ctx.fillStyle = "#4f7d67";
			ctx.fillRect(der, 0, W - der, H);
			ctx.fillStyle = "rgba(255,255,255,0.07)";
			for (let xw = Math.ceil((of.terminalX + 140) / 18) * 18; xw - camara < W; xw += 18) ctx.fillRect(xw - camara, 0, 6 * S, SUELO);
			ctx.fillStyle = "rgba(0,0,0,0.18)"; // la esquina
			ctx.fillRect(der, 0, 8 * S, H);
		} else {
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(der, 0, W - der, H);
		}
	}
}

// ---------- La terraza de noche ----------
function dibujarNocheAzotea(of, cl, horizonte, tope) {
	ctx.fillStyle = degradadoAzotea(`noche|${horizonte}`, () => {
		const g = ctx.createLinearGradient(0, 0, 0, horizonte);
		g.addColorStop(0, "#05070f");
		g.addColorStop(0.55, "#0c1325");
		g.addColorStop(0.85, "#18223a");
		g.addColorStop(1, "#27324f");
		return g;
	});
	ctx.fillRect(0, 0, W, horizonte + 2);
	for (const e of ESTRELLAS_AZOTEA) {
		ctx.fillStyle = `rgba(255,255,255,${((0.25 + 0.25 * Math.sin(tiempo * 2 + e.fase)) * (1 - e.y * 1.6)).toFixed(3)})`;
		ctx.fillRect(e.x * W, e.y * horizonte, 2 * S, 2 * S);
	}
	// Nubes oscuras que se van moviendo, apenas iluminadas por la ciudad
	for (const n of NUBES_AZOTEA) {
		const w = n.w * S;
		const x = modulo(n.x * W + tiempo * n.vel * S - cl * 0.03, W + w * 2) - w;
		const y = n.y * horizonte;
		ctx.fillStyle = "rgba(120,132,165,0.13)";
		rectRedondo(x, y, w, 14 * S, 7 * S);
		ctx.fill();
		ctx.fillStyle = "rgba(150,160,190,0.08)";
		rectRedondo(x + w * 0.15, y + 9 * S, w * 0.7, 9 * S, 4.5 * S);
		ctx.fill();
	}
	dibujarGuacamaya(horizonte);
	// Cerros con las luces de la ciudad; el edificio blanco, entre las dos capas
	dibujarCerroAzotea(CERROS_AZOTEA[0], cl, horizonte);
	dibujarEdificiosAzotea(cl, horizonte);
	dibujarCerroAzotea(CERROS_AZOTEA[1], cl, horizonte);
	ctx.fillStyle = "#0a101e"; // la base, hasta las jardineras
	ctx.fillRect(0, horizonte, W, SUELO - horizonte + 2);
	dibujarOrillaTerraza(of, tope);
}

function dibujarCerroAzotea(c, cl, horizonte) {
	const franja = ANCHO_CIUDAD * S;
	ctx.fillStyle = c.color;
	ctx.beginPath();
	ctx.moveTo(0, horizonte + 2);
	for (let x = 0; x <= W + 30; x += 30) ctx.lineTo(x, horizonte - altoCerro(c, x / S + cl * c.vel) * S);
	ctx.lineTo(W + 30, horizonte + 2);
	ctx.fill();
	// Las luces, debajo del borde del cerro (unas cuantas titilan)
	const corrido = modulo(cl * c.vel * S, franja);
	for (const p of c.puntos) {
		for (let x = p.u * S - corrido; x < W; x += franja) {
			if (x < -5) continue;
			const y = horizonte - altoCerro(c, p.u) * S * (1 - p.v);
			ctx.globalAlpha = (0.55 + 0.35 * Math.sin(tiempo * 1.7 + p.fase)) * (p.calida ? 1 : 0.8);
			ctx.fillStyle = p.calida ? "#ffcd82" : "#d7e8ff";
			ctx.fillRect(x, y, c.tam * S, c.tam * S);
		}
	}
	ctx.globalAlpha = 1;
}

// El edificio blanco de la foto: bloque con sus pisos, ventanas (algunas
// encendidas), un ala más baja y luces rojas que parpadean en la azotea
function dibujarEdificiosAzotea(cl, horizonte) {
	const franja = ANCHO_CIUDAD * S;
	const corrido = modulo(cl * VEL_EDIFICIOS * S, franja);
	for (const e of EDIFICIOS_AZOTEA) {
		for (let x = e.u * S - corrido; x < W; x += franja) {
			const w = e.w * S;
			if (x + w * 1.4 < 0) continue;
			const alto = e.alto * S;
			const y = horizonte - alto;
			const ala = { x: x + w * 0.72, w: w * 0.62, y: horizonte - alto * 0.62 };
			for (const b of [ala, { x, w: w * 0.8, y }]) {
				ctx.fillStyle = "#d4d9de";
				ctx.fillRect(b.x, b.y, b.w, horizonte - b.y + 2);
				ctx.fillStyle = "rgba(0,0,0,0.12)"; // sombra de un costado
				ctx.fillRect(b.x + b.w - 8 * S, b.y, 8 * S, horizonte - b.y);
				const az = crearAzar(e.semilla + Math.round(b.w));
				for (let wy = b.y + 9 * S; wy < horizonte - 4 * S; wy += 12 * S) {
					ctx.fillStyle = "#aeb6bf"; // la losa de cada piso
					ctx.fillRect(b.x, wy - 3 * S, b.w, 1.5 * S);
					for (let wx = b.x + 6 * S; wx < b.x + b.w - 12 * S; wx += 11 * S) {
						const r = az();
						ctx.fillStyle = r < 0.22 ? "#ffe3a8" : r < 0.3 ? "#cfe4ff" : "#3a4762";
						ctx.fillRect(wx, wy, 7 * S, 6 * S);
					}
				}
			}
			// Caseta de la azotea y las luces rojas
			ctx.fillStyle = "#c3c9cf";
			ctx.fillRect(x + w * 0.3, y - 12 * S, w * 0.22, 12 * S);
			if (modulo(tiempo + e.semilla * 0.1, 1.6) < 0.9) {
				ctx.fillStyle = "#ff4a3d";
				for (const [lx, ly] of [[x + 4 * S, y], [x + w * 0.41, y - 12 * S], [x + w * 0.8 - 4 * S, y], [ala.x + ala.w - 4 * S, ala.y]]) circulo(lx, ly - 2 * S, 2.2 * S);
			}
		}
	}
}

// Al fondo de la terraza: jardineras de concreto con zacate que se mece,
// arbolitos en maceta, sofás empotrados con cojines amarillos y palomas
function dibujarOrillaTerraza(of, tope) {
	const desde = of.x0 - camara;
	const hasta = Math.min(W, (of.interior || of.terminalX + 140) - camara);
	if (hasta < 0) return;
	const caja = tope + 10 * S;
	// Las hojas del zacate, alineadas al mundo (no tiemblan con la cámara)
	const paso = 26;
	for (let xw = Math.ceil(camara / paso) * paso; xw - camara < hasta; xw += paso) {
		const sx = xw - camara;
		if (sx < desde) continue;
		const az = crearAzar(xw);
		const mece = Math.sin(tiempo * 1.3 + xw * 0.013) * 4 * S;
		ctx.lineWidth = 2.2 * S;
		for (let k = 0; k < 3; k++) {
			ctx.strokeStyle = ["#5f7f4c", "#7f9a5e", "#465f3c"][k];
			const alto = (16 + az() * 16) * S;
			const dx = (k - 1) * 6 * S;
			ctx.beginPath();
			ctx.moveTo(sx + dx, caja);
			ctx.quadraticCurveTo(sx + dx + mece * 0.4, caja - alto * 0.6, sx + dx + (k - 1) * 5 * S + mece, caja - alto);
			ctx.stroke();
		}
	}
	// Arbolitos en maceta, cada tanto
	for (let d = 280; of.x0 + d < (of.interior || of.terminalX); d += 820) {
		const sx = of.x0 + d - camara;
		if (sx < -40 * S || sx > hasta + 40 * S) continue;
		ctx.fillStyle = "#6b5340";
		ctx.fillRect(sx - 2.5 * S, caja - 40 * S, 5 * S, 40 * S);
		ctx.fillStyle = "#3d6a3c";
		ctx.beginPath();
		ctx.ellipse(sx, caja - 60 * S, 15 * S, 30 * S, Math.sin(tiempo * 0.9 + d) * 0.03, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#4f7f4a";
		ctx.beginPath();
		ctx.ellipse(sx - 4 * S, caja - 66 * S, 8 * S, 20 * S, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	// La jardinera corrida de concreto
	ctx.fillStyle = "#8a8379";
	ctx.fillRect(Math.max(0, desde), caja, hasta - Math.max(0, desde), SUELO - caja + 2);
	ctx.fillStyle = "#a59d92";
	ctx.fillRect(Math.max(0, desde), caja, hasta - Math.max(0, desde), 3 * S);
	ctx.fillStyle = "rgba(0,0,0,0.15)"; // juntas entre una caja y otra
	for (let xw = Math.ceil(camara / 240) * 240; xw - camara < hasta; xw += 240) if (xw - camara > desde) ctx.fillRect(xw - camara, caja, 2 * S, SUELO - caja);
	// Sofás empotrados con cojines amarillos, delante de la jardinera
	for (let d = 700; of.x0 + d + 200 < (of.interior || of.terminalX); d += 1000) { // lejos del sofá de adelante y de los postes
		const sx = of.x0 + d - camara;
		const w = 200 * S;
		if (sx + w < 0 || sx > hasta) continue;
		ctx.fillStyle = "#b9b8b1";
		rectRedondo(sx, caja + 6 * S, w, SUELO - caja - 4 * S, 5 * S);
		ctx.fill();
		ctx.fillStyle = "#d3d2cb"; // asiento
		ctx.fillRect(sx + 4 * S, SUELO - 18 * S, w - 8 * S, 8 * S);
		for (let k = 0; k < 4; k++) {
			ctx.fillStyle = k % 2 ? "#f0d36a" : "#e2b93f";
			rectRedondo(sx + 16 * S + k * 46 * S, caja - 2 * S, 24 * S, 18 * S, 5 * S);
			ctx.fill();
		}
	}
	// Lucecitas al pie de la jardinera
	for (let xw = Math.ceil(camara / 180) * 180 + 90; xw - camara < hasta; xw += 180) {
		const sx = xw - camara;
		if (sx < desde) continue;
		ctx.save();
		ctx.translate(sx, SUELO);
		ctx.fillStyle = haloAzotea("pie", 34, "255,206,120", 0.35);
		ctx.fillRect(-34 * S, -34 * S, 68 * S, 36 * S);
		ctx.restore();
		ctx.fillStyle = "#ffe2a6";
		circulo(sx, SUELO - 3 * S, 2 * S);
	}
	for (const p of PALOMAS_AZOTEA) {
		const px = of.x0 + p.x - camara;
		if (px > -20 && px < hasta - 10) dibujarPaloma(px, caja, p);
	}
}

// Las pérgolas: techo de listones grises sobre postes, con focos que
// alumbran hacia abajo (como en la foto); solo en la terraza
function postesPergola(of) {
	const lista = [];
	for (const [a, b] of PERGOLAS_AZOTEA) {
		if (of.interior && of.x0 + b > of.interior - 40) continue; // la pérgola tiene que acabar antes de la puerta
		lista.push(of.x0 + a + 14, of.x0 + b - 14);
	}
	return lista;
}
function dibujarPergolas(of, ix) {
	const viga = 40 * S;
	const piso = SUELO + 40 * S;
	ctx.save();
	if (ix < W) {
		ctx.beginPath();
		ctx.rect(0, 0, ix, H);
		ctx.clip();
	}
	for (const [a, b] of PERGOLAS_AZOTEA) {
		if (of.interior && of.x0 + b > of.interior - 40) continue; // la pérgola tiene que acabar antes de la puerta
		const sa = of.x0 + a - camara;
		const sb = of.x0 + b - camara;
		if (sb < -20 || sa > W + 20) continue;
		// Techo: listones vistos desde abajo y su orilla
		ctx.fillStyle = "#4a5054";
		ctx.fillRect(sa, 0, sb - sa, viga);
		ctx.fillStyle = "#8d9497";
		for (let xw = Math.ceil((of.x0 + a) / 22) * 22; xw < of.x0 + b; xw += 22) ctx.fillRect(xw - camara, 0, 9 * S, viga - 10 * S);
		ctx.fillStyle = "#c7cccd";
		ctx.fillRect(sa - 6 * S, viga - 10 * S, sb - sa + 12 * S, 10 * S);
		ctx.fillStyle = "#9aa1a3";
		ctx.fillRect(sa - 6 * S, viga - 2 * S, sb - sa + 12 * S, 2 * S);
		// Focos: un punto blanco con su halo y un cono de luz muy suave
		for (let d = a + 70; d < b - 40; d += 125) {
			const fx = of.x0 + d - camara;
			if (fx < -60 * S || fx > W + 60 * S) continue;
			ctx.save();
			ctx.translate(fx, viga);
			ctx.fillStyle = degradadoAzotea(`cono|${viga}|${S}`, () => {
				const g = ctx.createLinearGradient(0, 0, 0, 170 * S);
				g.addColorStop(0, "rgba(255,240,205,0.16)");
				g.addColorStop(1, "rgba(255,240,205,0)");
				return g;
			});
			ctx.beginPath();
			ctx.moveTo(-6 * S, 0);
			ctx.lineTo(6 * S, 0);
			ctx.lineTo(50 * S, 170 * S);
			ctx.lineTo(-50 * S, 170 * S);
			ctx.fill();
			ctx.fillStyle = haloAzotea("foco", 26, "255,246,220", 0.7);
			ctx.fillRect(-26 * S, -26 * S, 52 * S, 52 * S);
			ctx.restore();
			ctx.fillStyle = "#fffbea";
			circulo(fx, viga + 1 * S, 3.6 * S);
		}
		// Postes
		for (const px of [sa + 14 * S, sb - 14 * S]) {
			ctx.fillStyle = "#b9bfc0";
			ctx.fillRect(px - 7 * S, viga, 14 * S, piso - viga);
			ctx.fillStyle = "rgba(255,255,255,0.18)";
			ctx.fillRect(px - 7 * S, viga, 4 * S, piso - viga);
		}
	}
	ctx.restore();
}

// ---------- El local por dentro ----------
// x: donde empieza en pantalla (0 si la puerta ya quedó atrás)
function dibujarLocalPorDentro(of, x, tope) {
	const techo = 60 * S;
	const iw = of.interior;
	// Pared de fondo, cálida
	ctx.fillStyle = "#ebe4d8";
	ctx.fillRect(x, 0, W - x, SUELO + 2);
	// Ventanales con la noche afuera y cortinas verdes a los lados
	const arribaV = techo + 26 * S;
	const abajoV = tope - 6 * S;
	const tramos = [0, ...COLUMNAS_LOCAL, of.terminalX - PARED_VERDE - iw];
	for (let k = 0; k + 1 < tramos.length; k++) {
		if (PANTALLA_LOCAL > tramos[k] && PANTALLA_LOCAL < tramos[k + 1]) continue; // pared lisa para la pantalla
		const a = iw + tramos[k] + 70;
		const b = iw + tramos[k + 1] - 70;
		if (b - a < 120) continue;
		const sa = Math.max(x, a - camara);
		const sb = Math.min(W, b - camara);
		if (sb <= sa) continue;
		ctx.fillStyle = degradadoAzotea(`vidrio|${arribaV}|${abajoV}`, () => {
			const g = ctx.createLinearGradient(0, arribaV, 0, abajoV);
			g.addColorStop(0, "#0b1222");
			g.addColorStop(1, "#24304b");
			return g;
		});
		ctx.fillRect(sa, arribaV, sb - sa, abajoV - arribaV);
		// Luces lejanas de la ciudad en el vidrio
		for (let xw = Math.ceil(a / 14) * 14; xw < b; xw += 14) {
			const sx = xw - camara;
			if (sx < sa || sx > sb - 3) continue;
			const az = crearAzar(xw);
			const y = abajoV - (6 + az() * 34) * S;
			if (az() < 0.6) {
				ctx.fillStyle = az() < 0.75 ? "rgba(255,205,130,0.75)" : "rgba(215,232,255,0.6)";
				ctx.fillRect(sx, y, 2 * S, 2 * S);
			}
		}
		ctx.fillStyle = "rgba(255,255,255,0.06)"; // reflejo
		for (let xw = Math.ceil(a / 160) * 160; xw < b; xw += 160) if (xw - camara > sa && xw - camara < sb - 20 * S) ctx.fillRect(xw - camara, arribaV, 14 * S, abajoV - arribaV);
		ctx.fillStyle = "#c9c1b3"; // marco
		ctx.fillRect(sa, arribaV - 4 * S, sb - sa, 4 * S);
		ctx.fillRect(sa, abajoV, sb - sa, 4 * S);
		// Cortinas verdes (salvia), con sus pliegues
		for (const [cx, lado] of [[a - camara, 1], [b - camara, -1]]) {
			const cw = 38 * S;
			const c0 = lado > 0 ? cx - 6 * S : cx - cw + 6 * S;
			if (c0 + cw < x || c0 > W) continue;
			const desdeC = Math.max(x, c0);
			ctx.fillStyle = "#7fa58e";
			ctx.fillRect(desdeC, arribaV - 8 * S, c0 + cw - desdeC, abajoV - arribaV + 22 * S);
			ctx.fillStyle = "#6b927b";
			for (let p = 0; p < 4; p++) {
				const px = c0 + 4 * S + p * 9 * S + Math.sin(tiempo * 0.7 + p + cx * 0.01) * 0.8 * S;
				if (px > x) ctx.fillRect(px, arribaV - 8 * S, 3 * S, abajoV - arribaV + 22 * S);
			}
		}
	}
	// La pared verde de la cocina, antes de la barra
	const verde = of.terminalX - PARED_VERDE - camara;
	if (verde < W) {
		const vx = Math.max(x, verde);
		ctx.fillStyle = "#5c8a73";
		ctx.fillRect(vx, techo, W - vx, SUELO - techo + 2);
		ctx.fillStyle = "rgba(255,255,255,0.07)"; // listones
		for (let xw = Math.ceil((of.terminalX - PARED_VERDE) / 18) * 18; xw - camara < W; xw += 18) if (xw - camara > vx) ctx.fillRect(xw - camara, techo, 6 * S, SUELO - techo);
	}
	// La pantalla de proyección, con una lámina de bienvenida
	const px = iw + PANTALLA_LOCAL - camara;
	if (px + 140 * S > x && px - 140 * S < W) {
		const pw = 240 * S;
		const ph = 136 * S;
		const py = techo + 34 * S;
		ctx.fillStyle = "#3a4446";
		ctx.fillRect(px - pw / 2 - 6 * S, py - 8 * S, pw + 12 * S, 8 * S);
		ctx.save();
		ctx.shadowColor = "rgba(190,230,220,0.6)";
		ctx.shadowBlur = 24 * S;
		ctx.fillStyle = COLORES.verdeProfundo;
		ctx.fillRect(px - pw / 2, py, pw, ph);
		ctx.restore();
		ctx.fillStyle = COLORES.verdeInstitucional;
		ctx.fillRect(px - pw / 2, py + ph - 8 * S, pw, 8 * S);
		dibujarLogoOEspacio(logoCelaqueBlanco, px, py + 46 * S, 140 * S, 30 * S, true);
		ctx.fillStyle = COLORES.blanco;
		ctx.font = `700 ${Math.max(11, 14 * S)}px ${FUENTE}`; // en celular no baja de 11 px
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("¡Bienvenido al equipo!", px, py + 92 * S);
	}
	// Columnas blancas con los círculos verdes de la foto
	for (const d of COLUMNAS_LOCAL) {
		const cx = iw + d - camara;
		const cw = 70 * S;
		if (cx + cw / 2 < x || cx - cw / 2 > W) continue;
		ctx.fillStyle = "#f4f2ec";
		ctx.fillRect(cx - cw / 2, techo, cw, SUELO - techo + 2);
		ctx.fillStyle = "rgba(0,0,0,0.06)";
		ctx.fillRect(cx + cw / 2 - 6 * S, techo, 6 * S, SUELO - techo);
		for (let fy = techo + 16 * S, fila = 0; fy < SUELO - 8 * S; fy += 19 * S, fila++)
			for (let c = 0; c < 3; c++) {
				ctx.fillStyle = (fila + c) % 3 ? "#6f9f83" : "#8db69d";
				circulo(cx + (c - 1) * 20 * S, fy, 7.5 * S);
				ctx.fillStyle = "rgba(255,255,255,0.25)";
				circulo(cx + (c - 1) * 20 * S - 2 * S, fy - 2 * S, 2.5 * S);
			}
	}
	// El techo blanco con los ductos a la vista
	ctx.fillStyle = "#f3f2ee";
	ctx.fillRect(x, 0, W - x, techo);
	ctx.fillStyle = "#dcdbd5"; // ducto grande
	ctx.fillRect(x, 12 * S, W - x, 22 * S);
	ctx.fillStyle = "#fbfbf9";
	ctx.fillRect(x, 14 * S, W - x, 5 * S);
	ctx.fillStyle = "#c4c3bc";
	ctx.fillRect(x, 30 * S, W - x, 4 * S);
	ctx.fillStyle = "#d3d2cc"; // tubo delgado
	ctx.fillRect(x, 44 * S, W - x, 6 * S);
	ctx.fillStyle = "#a9a8a2";
	for (let xw = Math.ceil(Math.max(iw, camara) / 160) * 160; xw - camara < W; xw += 160) {
		const sx = xw - camara;
		if (sx < x) continue;
		ctx.fillRect(sx - 1 * S, 0, 2 * S, 12 * S); // soportes del ducto
		ctx.fillRect(sx - 4 * S, 32 * S, 8 * S, 3 * S); // abrazadera
		ctx.fillRect(sx + 60 * S, 50 * S, 2 * S, 8 * S); // rociador
		ctx.fillRect(sx + 57 * S, 57 * S, 8 * S, 2 * S);
	}
	ctx.fillStyle = "#d9d3c7";
	ctx.fillRect(x, techo, W - x, 3 * S);
}

// Las lámparas de papel: racimos de bolas blancas que brillan cálido,
// colgadas a distintas alturas (se mecen un poquito)
function dibujarLamparasLocal(of, ix) {
	const techo = 60 * S;
	for (const l of LAMPARAS_LOCAL) {
		const lx = of.interior + l.d;
		if (lx > of.terminalX - 120 || Math.abs(l.d - PANTALLA_LOCAL) < 170) continue; // sin tapar la pantalla
		const sx = lx - camara;
		if (sx < Math.max(ix, 0) - 120 * S || sx > W + 120 * S) continue;
		for (const bola of l.bolas) {
			const bx = sx + bola.dx * S + Math.sin(tiempo * 0.8 + l.d) * 1.5 * S;
			if (bx < ix + bola.r * S) continue;
			const by = techo + bola.cable * S;
			const r = bola.r * S;
			ctx.strokeStyle = "#8f8c84";
			ctx.lineWidth = 1.2 * S;
			linea(sx + bola.dx * S, techo, bx, by - r);
			ctx.save();
			ctx.translate(bx, by);
			ctx.fillStyle = haloAzotea("farol", 70, "255,226,160", 0.32);
			ctx.fillRect(-70 * S, -70 * S, 140 * S, 140 * S);
			ctx.fillStyle = "#fff5de";
			ctx.beginPath();
			ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "rgba(214,196,160,0.7)"; // las costillas del papel
			ctx.lineWidth = 1 * S;
			for (const f of [-0.55, -0.2, 0.2, 0.55]) {
				ctx.beginPath();
				ctx.ellipse(0, f * r * 0.9, r * Math.sqrt(1 - f * f), r * 0.12, 0, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.restore();
		}
	}
}

// La entrada al local desde la terraza: el muro, la puerta de vidrio abierta y su letrero
function dibujarPuertaLocal(ix) {
	ctx.fillStyle = "#d6d0c6";
	ctx.fillRect(ix - 16 * S, 0, 32 * S, SUELO + 2);
	ctx.fillStyle = "rgba(0,0,0,0.12)";
	ctx.fillRect(ix - 16 * S, 0, 5 * S, SUELO);
	const alto = 176 * S;
	const y = SUELO - alto;
	const pw = 92 * S;
	const px = ix + 16 * S;
	ctx.fillStyle = "rgba(255,226,170,0.22)"; // la luz del local que sale por la puerta
	ctx.fillRect(px, y, pw, alto);
	ctx.strokeStyle = "#3a4446";
	ctx.lineWidth = 5 * S;
	ctx.strokeRect(px, y, pw, alto);
	ctx.fillStyle = "rgba(200,232,240,0.28)"; // la hoja de vidrio, abierta hacia la terraza
	ctx.beginPath();
	ctx.moveTo(px, y);
	ctx.lineTo(px - 34 * S, y + 10 * S);
	ctx.lineTo(px - 34 * S, SUELO - 4 * S);
	ctx.lineTo(px, SUELO);
	ctx.fill();
	ctx.lineWidth = 3 * S;
	ctx.stroke();
	ctx.fillStyle = "#3a4446";
	ctx.fillRect(px - 30 * S, y + alto * 0.5, 3 * S, 22 * S); // jaladera
	// Letrero
	const ly = y - 34 * S;
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(px - 14 * S, ly, pw + 28 * S, 24 * S, 6 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `700 ${Math.max(11, 12 * S)}px ${FUENTE}`; // en celular no baja de 11 px
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("Cafetería", px + pw / 2, ly + 12 * S);
}

// ---------- El piso ----------
// Deck de madera gris en la terraza y madera clara en el local
function dibujarSueloAzotea(m) {
	const of = m.oficina;
	const ix = Math.max(0, Math.min(W, bordeInterior(of) - 16 * S)); // cambia justo donde empieza el muro de la puerta
	if (ix > 0) {
		ctx.fillStyle = degradadoAzotea(`deck|${SUELO}|${H}`, () => {
			const g = ctx.createLinearGradient(0, SUELO, 0, H);
			g.addColorStop(0, "#857261");
			g.addColorStop(1, "#4f4135");
			return g;
		});
		ctx.fillRect(0, SUELO, ix, H - SUELO);
		ctx.fillStyle = "rgba(255,214,140,0.4)"; // luz baja al borde del deck
		ctx.fillRect(0, SUELO, ix, 3 * S);
		tablasPiso(0, ix, 16 * S, 170 * S, "rgba(0,0,0,0.2)");
	}
	if (ix < W) {
		ctx.fillStyle = degradadoAzotea(`roble|${SUELO}|${H}`, () => {
			const g = ctx.createLinearGradient(0, SUELO, 0, H);
			g.addColorStop(0, "#d2b68f");
			g.addColorStop(1, "#a68762");
			return g;
		});
		ctx.fillRect(ix, SUELO, W - ix, H - SUELO);
		ctx.fillStyle = "#c2b6a4"; // zócalo
		ctx.fillRect(ix, SUELO, W - ix, 4 * S);
		tablasPiso(ix, W, 12 * S, 120 * S, "rgba(90,60,30,0.16)");
	}
}
function tablasPiso(x0, x1, alto, paso, color) {
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5 * S;
	for (let y = SUELO + alto, fila = 0; y < H + alto; y += alto, fila++) {
		linea(x0, y, x1, y);
		const off = modulo(camara + fila * 70 * S, paso);
		for (let x = -off; x < x1; x += paso) if (x > x0) linea(x, y - alto, x, y);
	}
}

// ---------- La decoración ----------
// Lo propio de la azotea (mundo.js → oficina.decoracion). Devuelve false
// si el tipo no es de aquí, para que dibujarDecoracionOficina siga.
function dibujarDecoracionAzotea(tipo, sx, piso) {
	if (tipo === "jardinera") {
		// Jardinera de concreto con zacate, un arbolito y su luz cálida desde abajo
		ctx.save();
		ctx.translate(sx, piso - 40 * S);
		ctx.fillStyle = haloAzotea("jardinera", 90, "255,206,120", 0.4);
		ctx.fillRect(-90 * S, -90 * S, 180 * S, 130 * S);
		ctx.restore();
		const brisa = sx + camara; // las hojas se mecen según su lugar en el mundo
		ctx.fillStyle = "#3d6a3c";
		ctx.beginPath();
		ctx.ellipse(sx + 30 * S, piso - 92 * S, 18 * S, 36 * S, Math.sin(tiempo + brisa * 0.01) * 0.03, 0, Math.PI * 2);
		ctx.fill();
		ctx.lineWidth = 2.5 * S;
		for (let k = -8; k <= 8; k++) {
			ctx.strokeStyle = k % 3 ? (k % 2 ? "#6f8f55" : "#8aa264") : "#4f6f44";
			const alto = (24 + Math.abs(Math.sin(k * 1.7)) * 20) * S;
			const mece = Math.sin(tiempo * 1.2 + k * 0.5 + brisa * 0.01) * 4 * S;
			ctx.beginPath();
			ctx.moveTo(sx + k * 7 * S, piso - 38 * S);
			ctx.quadraticCurveTo(sx + k * 7 * S + mece * 0.4, piso - 38 * S - alto * 0.6, sx + k * 9 * S + mece, piso - 38 * S - alto);
			ctx.stroke();
		}
		ctx.fillStyle = "#8a8379";
		ctx.fillRect(sx - 70 * S, piso - 40 * S, 140 * S, 40 * S);
		ctx.fillStyle = "#a59d92";
		ctx.fillRect(sx - 70 * S, piso - 40 * S, 140 * S, 4 * S);
		ctx.fillStyle = "rgba(255,214,140,0.9)";
		for (const dx of [-45, 0, 45]) circulo(sx + dx * S, piso - 6 * S, 3 * S);
		return true;
	}
	if (tipo === "sofa") {
		// Sofá gris de exterior con cojines amarillos (como en la foto)
		ctx.fillStyle = "#9d9c95";
		rectRedondo(sx - 78 * S, piso - 58 * S, 156 * S, 30 * S, 8 * S);
		ctx.fill();
		ctx.fillStyle = "#c3c2bb";
		rectRedondo(sx - 82 * S, piso - 34 * S, 164 * S, 28 * S, 8 * S);
		ctx.fill();
		for (const [dx, color, giro] of [[-52, "#e2b93f", -0.12], [-14, "#f0d36a", 0.05], [40, "#e2b93f", 0.1]]) {
			ctx.save();
			ctx.translate(sx + dx * S, piso - 50 * S);
			ctx.rotate(giro);
			ctx.fillStyle = color;
			rectRedondo(-15 * S, -13 * S, 30 * S, 26 * S, 7 * S);
			ctx.fill();
			ctx.restore();
		}
		ctx.fillStyle = "#3a4446";
		ctx.fillRect(sx - 74 * S, piso - 6 * S, 8 * S, 6 * S);
		ctx.fillRect(sx + 66 * S, piso - 6 * S, 8 * S, 6 * S);
		return true;
	}
	if (tipo === "acapulco") {
		// Dos sillas acapulco blancas (de hilo, redondas) y una mesita de
		// concreto con su maceta, como en la foto de la terraza
		const sillaAcapulco = (cx, mira) => {
			ctx.strokeStyle = "#e9ecea";
			ctx.lineWidth = 2.5 * S;
			ctx.beginPath(); // patas
			ctx.moveTo(cx - 18 * S, piso);
			ctx.lineTo(cx - 6 * S * mira, piso - 34 * S);
			ctx.lineTo(cx + 18 * S, piso);
			ctx.moveTo(cx - 8 * S, piso);
			ctx.lineTo(cx + 4 * S * mira, piso - 30 * S);
			ctx.stroke();
			ctx.save();
			ctx.translate(cx, piso - 52 * S);
			ctx.rotate(-0.35 * mira); // inclinada hacia atrás
			ctx.fillStyle = "rgba(233,236,234,0.12)";
			ctx.beginPath();
			ctx.ellipse(0, 0, 18 * S, 30 * S, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.lineWidth = 2.5 * S;
			ctx.stroke();
			ctx.lineWidth = 1 * S; // el tejido de hilo
			for (let k = -2; k <= 2; k++) {
				linea(k * 7 * S, -28 * S * Math.sqrt(1 - (k / 2.6) ** 2), k * 7 * S, 28 * S * Math.sqrt(1 - (k / 2.6) ** 2));
				linea(-17 * S * Math.sqrt(1 - (k / 2.6) ** 2), k * 11 * S, 17 * S * Math.sqrt(1 - (k / 2.6) ** 2), k * 11 * S);
			}
			ctx.restore();
		};
		sillaAcapulco(sx - 52 * S, 1);
		sillaAcapulco(sx + 52 * S, -1);
		ctx.fillStyle = "#b8ad9c"; // mesita
		ctx.beginPath();
		ctx.ellipse(sx, piso - 26 * S, 24 * S, 6 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillRect(sx - 20 * S, piso - 26 * S, 40 * S, 26 * S);
		ctx.fillStyle = "#9e9383";
		ctx.fillRect(sx - 20 * S, piso - 8 * S, 40 * S, 8 * S);
		ctx.fillStyle = "#d7d3cb"; // maceta con una planta
		ctx.fillRect(sx - 6 * S, piso - 40 * S, 12 * S, 12 * S);
		ctx.fillStyle = "#5f8f55";
		for (let k = -1; k <= 1; k++) {
			ctx.beginPath();
			ctx.ellipse(sx + k * 4 * S, piso - 46 * S, 3 * S, 8 * S, k * 0.4, 0, Math.PI * 2);
			ctx.fill();
		}
		return true;
	}
	if (tipo === "chiavari") {
		// Una fila de sillas blancas con cojín, como en la foto del local:
		// respaldo de barrotes, asiento acolchado y patas delgadas
		for (let k = 0; k < 4; k++) {
			const cx = sx - 57 * S + k * 38 * S;
			const asiento = piso - 46 * S;
			ctx.fillStyle = "#dfe3e1"; // sombra de las patas de atrás
			ctx.fillRect(cx - 10 * S, asiento, 3 * S, piso - asiento);
			ctx.fillRect(cx + 7 * S, asiento, 3 * S, piso - asiento);
			ctx.fillStyle = "#f2f4f2";
			ctx.fillRect(cx - 15 * S, asiento - 44 * S, 4 * S, 44 * S); // postes del respaldo
			ctx.fillRect(cx + 11 * S, asiento - 44 * S, 4 * S, 44 * S);
			rectRedondo(cx - 16 * S, asiento - 48 * S, 32 * S, 6 * S, 3 * S); // copete
			ctx.fill();
			ctx.fillRect(cx - 15 * S, asiento - 22 * S, 30 * S, 3 * S); // travesaño del respaldo
			for (const dx of [-6, 0, 6]) ctx.fillRect(cx + dx * S - 1 * S, asiento - 42 * S, 2 * S, 20 * S); // barrotes
			ctx.fillStyle = "#fbfbf9"; // cojín
			rectRedondo(cx - 17 * S, asiento - 4 * S, 34 * S, 10 * S, 4 * S);
			ctx.fill();
			ctx.fillStyle = "rgba(0,0,0,0.08)";
			ctx.fillRect(cx - 15 * S, asiento + 6 * S, 30 * S, 2 * S);
			ctx.fillStyle = "#f2f4f2"; // patas de adelante y travesaño
			ctx.fillRect(cx - 15 * S, asiento + 6 * S, 3.5 * S, piso - asiento - 6 * S);
			ctx.fillRect(cx + 11.5 * S, asiento + 6 * S, 3.5 * S, piso - asiento - 6 * S);
			ctx.fillRect(cx - 14 * S, piso - 14 * S, 28 * S, 2.5 * S);
		}
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
