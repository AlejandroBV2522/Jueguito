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
// barra trabaja la barista, y en el cielo del atardecer pasa una guacamaya.

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
	// La barista, detrás de la barra (sobre la tarima de atrás: la barra le
	// tapa de la cintura para abajo): un rato
	// mira a la máquina y mueve el brazo preparando, otro rato a la gente
	const ciclo = modulo(tiempo, BARISTA_CICLO);
	const prepara = ciclo < BARISTA_CICLO * 0.45;
	dibujarNpcFoto(sx + 76 * S, piso - 34 * S, BARISTA_CAFETERIA, prepara ? -1 : 1, prepara ? GESTOS_PLATICA[Math.floor(tiempo * 3) % GESTOS_PLATICA.length] : "quieto", 0);
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
const ESTRELLAS_AZOTEA = Array.from({ length: 40 }, () => ({ x: azarAzotea(), y: azarAzotea() * 0.3, fase: azarAzotea() * 6 }));
const ANCHO_CIUDAD = 2100; // la franja de ciudad se repite cada tanto (a S = 1)
// Nubes largas del atardecer: alto (fracción del horizonte), ancho y velocidad (a S = 1)
const NUBES_AZOTEA = Array.from({ length: 5 }, (_, k) => ({ x: azarAzotea(), y: 0.22 + k * 0.1, w: 160 + azarAzotea() * 180, vel: 4 + azarAzotea() * 5 }));
// Palomas sobre la baranda de vidrio (x desde la entrada, en el mundo)
const PALOMAS_AZOTEA = [{ x: 760, fase: 0 }, { x: 790, fase: 1.7 }, { x: 2380, fase: 3.1 }, { x: 3560, fase: 4.4 }];
const VUELO_GUACAMAYA = 30; // cada cuántos segundos cruza el cielo
const COLORES_GUACAMAYA = { cuerpo: "#d7332a", ala: "#f2c230", punta: "#2f6fc2", cara: "#f4efe6" };

// Los degradados de la azotea se arman una vez por tamaño de pantalla (no
// en cada cuadro): la clave lleva las medidas de las que dependen
const degradadosAzotea = new Map();
function degradadoAzotea(clave, crear) {
	let g = degradadosAzotea.get(clave);
	if (!g) {
		if (degradadosAzotea.size > 30) degradadosAzotea.clear(); // cambió el tamaño de la pantalla
		g = crear();
		degradadosAzotea.set(clave, g);
	}
	return g;
}

// Una paloma parada en la baranda: picotea de vez en cuando
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

function dibujarFondoAzotea(m, dt) {
	const of = m.oficina;
	const cl = camara - of.x0;
	const horizonte = SUELO - 70 * S;
	// Cielo del atardecer: azul arriba, malva y naranja hacia el horizonte
	ctx.fillStyle = degradadoAzotea(`cielo|${horizonte}`, () => {
		const g = ctx.createLinearGradient(0, 0, 0, horizonte);
		g.addColorStop(0, "#132849");
		g.addColorStop(0.45, "#33508a");
		g.addColorStop(0.72, "#8f6a95");
		g.addColorStop(0.9, "#e3876a");
		g.addColorStop(1, "#f4c27c");
		return g;
	});
	ctx.fillRect(0, 0, W, horizonte + 2);
	for (const e of ESTRELLAS_AZOTEA) {
		ctx.fillStyle = `rgba(255,255,255,${((0.3 + 0.3 * Math.sin(tiempo * 2 + e.fase)) * (1 - e.y * 2.5)).toFixed(3)})`;
		ctx.fillRect(e.x * W, e.y * horizonte, 2 * S, 2 * S);
	}
	// El sol poniéndose detrás de las montañas, con su resplandor
	const solX = W * 0.7 - cl * 0.015;
	const solY = horizonte - 58 * S;
	ctx.save();
	ctx.translate(solX, solY);
	ctx.fillStyle = degradadoAzotea(`sol|${S}`, () => {
		const g = ctx.createRadialGradient(0, 0, 20 * S, 0, 0, 190 * S);
		g.addColorStop(0, "rgba(255,214,140,0.55)");
		g.addColorStop(1, "rgba(255,214,140,0)");
		return g;
	});
	ctx.fillRect(-190 * S, -190 * S, 380 * S, 380 * S);
	ctx.fillStyle = "#ffd98a";
	circulo(0, 0, 30 * S);
	ctx.restore();
	// Nubes largas que se van moviendo, iluminadas por abajo
	for (const n of NUBES_AZOTEA) {
		const w = n.w * S;
		const x = modulo(n.x * W + tiempo * n.vel * S - cl * 0.03, W + w * 2) - w;
		const y = n.y * horizonte;
		ctx.fillStyle = "rgba(255,196,170,0.28)";
		rectRedondo(x, y, w, 9 * S, 4.5 * S);
		ctx.fill();
		ctx.fillStyle = "rgba(255,226,190,0.3)";
		rectRedondo(x + w * 0.2, y + 5 * S, w * 0.6, 6 * S, 3 * S);
		ctx.fill();
	}
	// Montañas lejanas
	ctx.fillStyle = "#34446e";
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
			if (!c && t.alto > 0.7) {
				// Las torres más altas, con su antena y la luz roja que parpadea
				ctx.fillRect(x + w / 2 - 1 * S, y - 16 * S, 2 * S, 16 * S);
				if (modulo(tiempo + t.semilla * 0.01, 1.6) < 0.8) {
					ctx.fillStyle = "#ff5a4a";
					circulo(x + w / 2, y - 17 * S, 2.2 * S);
				}
			}
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
	dibujarGuacamaya(horizonte);
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
	for (const p of PALOMAS_AZOTEA) {
		const px = of.x0 + p.x - camara;
		if (px > -20 && px < W + 20) dibujarPaloma(px, tope - 4 * S, p);
	}

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
	ctx.fillStyle = degradadoAzotea(`luz|${viga}`, () => {
		const g = ctx.createLinearGradient(0, viga + 12 * S, 0, viga + 90 * S);
		g.addColorStop(0, "rgba(255,206,120,0.35)");
		g.addColorStop(1, "rgba(255,206,120,0)");
		return g;
	});
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
		const cuelga = (68 + Math.sin(tiempo * 0.8 + k * 1.3) * 5) * S; // el cable se mece con el aire
		ctx.quadraticCurveTo((a + b) / 2, viga + 12 * S + cuelga, b, viga + 12 * S);
		ctx.stroke();
		for (let f = 1; f < 10; f++) {
			const u = f / 10;
			const fx = a + (b - a) * u;
			const fy = viga + 12 * S + 2 * u * (1 - u) * cuelga;
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
	ctx.fillStyle = degradadoAzotea(`deck|${SUELO}|${H}`, () => {
		const g = ctx.createLinearGradient(0, SUELO, 0, H);
		g.addColorStop(0, "#8a6240");
		g.addColorStop(1, "#5a3e28");
		return g;
	});
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
		// (el halo se arma una vez, en el origen, y se traslada a su lugar)
		ctx.save();
		ctx.translate(sx, piso - 40 * S);
		ctx.fillStyle = degradadoAzotea(`halo|${S}`, () => {
			const g = ctx.createRadialGradient(0, 0, 5 * S, 0, 0, 90 * S);
			g.addColorStop(0, "rgba(255,206,120,0.45)");
			g.addColorStop(1, "rgba(255,206,120,0)");
			return g;
		});
		ctx.fillRect(-90 * S, -90 * S, 180 * S, 130 * S);
		ctx.restore();
		// Las hojas se mecen con el aire (fase según su lugar en el mundo)
		const brisa = sx + camara;
		for (let k = -5; k <= 5; k++) {
			ctx.fillStyle = k % 2 ? "#3f8f55" : k % 3 ? "#5aa66a" : "#b5532f"; // alguna hoja rojiza
			ctx.beginPath();
			ctx.ellipse(sx + k * 11 * S, piso - 50 * S - Math.abs(Math.sin(k)) * 22 * S, 8 * S, 26 * S, k * 0.18 + Math.sin(tiempo * 1.2 + k * 0.6 + brisa * 0.01) * 0.07, 0, Math.PI * 2);
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
