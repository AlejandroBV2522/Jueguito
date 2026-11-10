/* Camino a Celaque — dibujo del taller de prompts de IA: el dron, las piezas, la pared del modelo y el tablero RICO. Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo del taller de prompts (taller-ia.js) ----------
// El dron que suelta las piezas es el robot aéreo del taller, ya armado
// (estaciones.js); la pared de luz con la pantalla del modelo cierra el paso
// hasta terminar las rondas; el tablero de arriba dice qué piezas llevas.
const DRON_ARMADO = { piezas: PIEZAS_ESTACION, antes: PIEZAS_ESTACION, listo: true, recien: false };
const AQUA_TALLER = "#7fd6c8"; // el mismo holograma de las estaciones

// Dónde va el tablero (px de pantalla), debajo del HUD; el dron vuela justo
// debajo de él y las piezas salen del dron. Se calcula una vez por cuadro.
// Si no cabe entre lo de arriba (HUD, barra del jugador, botones de sonido)
// y el piso, como en un celular acostado, no se dibuja: lo dice el HUD.
const tableroTaller = { y: 0, alto: 0, k: 1, ancho: 0, x: 0, visible: true };
const ESTORBOS_TABLERO = ["barra-jugador", "btn-sonido", "btn-musica"];
function medirTableroTaller() {
	const k = Math.max(S, 0.9); // en pantallas bajas S es chico: que igual se lea
	const tb = tableroTaller;
	tb.k = k;
	tb.ancho = Math.min(W - 32, 620 * k);
	tb.x = (W - tb.ancho) / 2;
	tb.alto = 62 * k;
	// Lo más bajo de lo que hay arriba, en el ancho del tablero
	let techo = 0;
	for (const el of [ui.hud, ...ESTORBOS_TABLERO.map((id) => $(id))]) {
		if (!el || el.hidden) continue;
		const r = el.getBoundingClientRect();
		if (r.height && r.right > tb.x && r.left < tb.x + tb.ancho) techo = Math.max(techo, r.bottom);
	}
	tb.visible = techo + 8 * k + tb.alto < SUELO * 0.5;
	// Sin tablero, el dron vuela a la altura de lo más bajo de arriba, para que las piezas salgan a la vista
	tb.y = techo + (tb.visible ? 8 * k : -20 * k);
	if (!tb.visible) tb.alto = 0;
	return tb;
}
// Centro del dron (px de pantalla) y altura de salida de las piezas (unidades de S, base de la carta)
const yDronTaller = () => tableroTaller.y + tableroTaller.alto + 30 * S;
function alturaSalidaTaller() {
	medirTableroTaller();
	const pie = SUELO + 38 * S;
	return Math.max(140, (pie - yDronTaller() - 24 * S) / S - TALLER.carta.alto);
}

function dibujarTallerIA(m) {
	const ta = m.taller;
	if (!ta) return;
	const t = tallerIA;
	const { izq, der } = bordesTaller(ta);
	if (der - camara < -200 || izq - camara > W + 200) return;
	const pie = SUELO + 38 * S;
	const listo = tallerListo(m);
	medirTableroTaller();
	// Piso del taller: una franja de luz suave
	ctx.fillStyle = conAlfa(COLORES.verdeInstitucional, 0.16);
	ctx.fillRect(izq - camara, pie - 3 * S, der - izq, 6 * S);
	dibujarLetreroTaller(izq - 40 - camara, pie, m);
	dibujarParedModelo(der + 10 - camara, pie, listo, t.oficina === m ? t : null);
	if (listo || t.oficina !== m) return;
	// El dron (de espera, en la entrada; en la ronda, donde va a soltar)
	const enRonda = t.paso === "atrapar" || t.paso === "enviando";
	const dx = (enRonda ? t.dron.x : izq + 120) - camara;
	const dy = yDronTaller() + Math.sin(tiempo * 2.2) * 4 * S;
	const tmp = S;
	S = tmp * 0.9;
	dibujarRobotAereo(dx, dy + 72 * S, m, DRON_ARMADO);
	S = tmp;
	for (const p of t.piezas) dibujarPiezaTaller(p);
	if (t.paso !== "espera" && tableroTaller.visible) dibujarTableroTaller(m, t);
}

// Letrero de pie a la entrada del taller
function dibujarLetreroTaller(sx, pie, m) {
	if (sx < -120 || sx > W + 120) return;
	const k = S;
	ctx.fillStyle = "#5e686a";
	ctx.fillRect(sx - 2 * k, pie - 96 * k, 4 * k, 96 * k);
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(sx - 62 * k, pie - 150 * k, 124 * k, 58 * k, 8 * k);
	ctx.fill();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = AQUA_TALLER;
	ctx.font = `bold ${12 * k}px ${FUENTE}`;
	ctx.fillText("Taller de prompts", sx, pie - 134 * k);
	PARTES_PROMPT.forEach((p, i) => {
		const x = sx + (i - 1.5) * 26 * k;
		ctx.fillStyle = p.color === COLORES.verdeProfundo ? COLORES.verdeInstitucional : p.color;
		circulo(x, pie - 110 * k, 10 * k);
		ctx.fillStyle = COLORES.blanco;
		ctx.font = `bold ${11 * k}px ${FUENTE}`;
		ctx.fillText(p.letra, x, pie - 109.5 * k);
	});
}

// La pared de luz con la pantalla del modelo de IA: mientras no termines el
// taller no deja pasar; al enviar un prompt, la pantalla "escribe" la respuesta
function dibujarParedModelo(sx, pie, listo, t) {
	if (sx < -160 || sx > W + 160) return;
	const k = S;
	const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
	if (!listo) {
		ctx.fillStyle = conAlfa(AQUA_TALLER, 0.12 + 0.08 * pulso);
		ctx.fillRect(sx - 6 * k, 40 * k, 12 * k, pie - 40 * k);
		ctx.strokeStyle = conAlfa(AQUA_TALLER, 0.55 + 0.3 * pulso);
		ctx.lineWidth = 2 * k;
		linea(sx - 6 * k, 40 * k, sx - 6 * k, pie);
		linea(sx + 6 * k, 40 * k, sx + 6 * k, pie);
	}
	// Pantalla del modelo, sobre su pie
	const w = 118 * k, h = 78 * k;
	const x = sx + 14 * k, y = pie - 210 * k;
	ctx.fillStyle = "#5e686a";
	ctx.fillRect(x + w / 2 - 4 * k, y + h, 8 * k, pie - y - h);
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(x - 5 * k, y - 5 * k, w + 10 * k, h + 10 * k, 8 * k);
	ctx.fill();
	ctx.fillStyle = "#0b3d39";
	ctx.fillRect(x, y, w, h);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = AQUA_TALLER;
	ctx.font = `bold ${11 * k}px ${FUENTE}`;
	ctx.fillText("MODELO DE IA", x + w / 2, y + 13 * k);
	const enviando = t && t.paso === "enviando";
	if (listo) {
		ctx.font = `bold ${30 * k}px ${FUENTE}`;
		ctx.fillText("✓", x + w / 2, y + h / 2 + 8 * k);
		return;
	}
	// Renglones de la respuesta: crecen mientras se envía; si no, un cursor que parpadea
	const avance = enviando ? clamp(t.envio / TALLER.envio, 0, 1) : t && t.paso === "respuesta" ? 1 : 0;
	ctx.fillStyle = conAlfa(COLORES.blanco, 0.75);
	for (let r = 0; r < 4; r++) {
		const largo = clamp(avance * 4 - r, 0, 1) * (r === 3 ? 0.55 : 0.9) * (w - 20 * k);
		if (largo > 0) ctx.fillRect(x + 10 * k, y + (28 + r * 11) * k, largo, 5 * k);
	}
	if (!avance && Math.sin(tiempo * 6) > 0) ctx.fillRect(x + 10 * k, y + 28 * k, 6 * k, 9 * k);
}

// Una pieza de prompt (o una trampa disfrazada de pieza): una tarjeta con su
// letra y su texto. p.y = altura de la base (unidades de S)
function dibujarPiezaTaller(p) {
	const c = TALLER.carta;
	const sx = p.x - camara;
	if (sx < -c.medioAncho * 2 * S || sx > W + c.medioAncho * 2 * S) return;
	const k = S;
	const w = c.medioAncho * 2 * k, h = c.alto * k;
	const base = SUELO + 38 * S - p.y * S;
	const sale = p.fin > 0 ? clamp(p.fin / TALLER.desvanece, 0, 1) : 0;
	ctx.save();
	ctx.globalAlpha = 1 - sale;
	ctx.translate(sx, base - h / 2);
	if (p.y > 0) ctx.rotate(Math.sin(tiempo * 2.4 + p.x * 0.01) * 0.05); // se mece al caer
	const crece = 1 + (p.atrapada ? sale * 0.35 : 0);
	ctx.scale(crece, crece);
	// Una trampa atrapada se pone roja al deshacerse
	const roja = p.trampa && p.fin > 0 && p.piso < (TALLER.trampaEnPiso - 0.01);
	ctx.fillStyle = "rgba(255,255,255,0.96)";
	rectRedondo(-w / 2, -h / 2, w, h, 8 * k);
	ctx.fill();
	ctx.strokeStyle = roja ? "#e3262b" : p.parte.color;
	ctx.lineWidth = 2.5 * k;
	ctx.stroke();
	// Etiqueta: letra en un círculo y el nombre de la parte
	ctx.fillStyle = p.parte.color;
	circulo(-w / 2 + 14 * k, -h / 2 + 13 * k, 9 * k);
	ctx.fillStyle = COLORES.blanco;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `bold ${11 * k}px ${FUENTE}`;
	ctx.fillText(p.parte.letra, -w / 2 + 14 * k, -h / 2 + 13.5 * k);
	ctx.textAlign = "left";
	ctx.fillStyle = p.parte.color;
	ctx.font = `bold ${10 * k}px ${FUENTE}`;
	ctx.fillText(p.parte.nombre.toUpperCase(), -w / 2 + 28 * k, -h / 2 + 13.5 * k);
	// El texto, en dos renglones como máximo (se parte una vez por escala)
	ctx.font = `${11 * k}px ${FUENTE}`;
	if (p.escala !== k) {
		p.escala = k;
		p.renglones = partirEnRenglones(p.texto, w - 16 * k).slice(0, 2);
	}
	ctx.fillStyle = COLORES.verdeProfundo;
	p.renglones.forEach((r, i) => ctx.fillText(r, -w / 2 + 8 * k, -h / 2 + (32 + i * 14) * k));
	if (roja) {
		ctx.strokeStyle = "#e3262b";
		ctx.lineWidth = 4 * k;
		linea(-w / 2 + 10 * k, -h / 2 + 8 * k, w / 2 - 10 * k, h / 2 - 8 * k);
		linea(w / 2 - 10 * k, -h / 2 + 8 * k, -w / 2 + 10 * k, h / 2 - 8 * k);
	}
	ctx.restore();
}

// Tablero fijo arriba: el reto de la ronda y las 4 piezas del prompt
function dibujarTableroTaller(m, t) {
	const { y, alto, k, ancho, x } = tableroTaller;
	const rel = 10 * k;
	const r = rondaTaller(m);
	ctx.fillStyle = conAlfa(COLORES.verdeProfundo, 0.94);
	rectRedondo(x, y, ancho, alto, 10 * k);
	ctx.fill();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = `bold ${13 * k}px ${FUENTE}`;
	const enviando = t.paso === "enviando";
	// Recién atrapada una trampa, el título dice por qué no va (TALLER.motivo segundos)
	const motivo = !enviando && t.motivo;
	if (motivo) {
		ctx.fillStyle = "#e3262b";
		rectRedondo(x, y, 6 * k, alto, 3 * k);
		ctx.fill();
	}
	ctx.fillStyle = motivo ? "#ffd9d9" : AQUA_TALLER;
	ctx.fillText(
		motivo ? `✕ ${motivo.texto}` : enviando ? "Enviando el prompt al modelo…" : `Prompt ${m.taller.hechas + 1} de ${m.taller.rondas.length} · ${r.titulo}`,
		x + rel,
		y + rel + 7 * k
	);
	const gap = 6 * k;
	const pw = (ancho - 2 * rel - 3 * gap) / 4;
	const py = y + rel + 18 * k;
	const ph = alto - rel - 18 * k - rel;
	PARTES_PROMPT.forEach((p, i) => {
		const px = x + rel + i * (pw + gap);
		const lleno = !!t.hechas[p.clave];
		rectRedondo(px, py, pw, ph, ph / 2);
		if (lleno) {
			ctx.fillStyle = p.color === COLORES.verdeProfundo ? COLORES.verdeInstitucional : p.color;
			ctx.fill();
		} else {
			ctx.strokeStyle = conAlfa(COLORES.blanco, 0.45);
			ctx.lineWidth = 1.5 * k;
			ctx.stroke();
		}
		ctx.fillStyle = lleno ? COLORES.blanco : conAlfa(COLORES.blanco, 0.7);
		ctx.textAlign = "center";
		ctx.font = `${lleno ? "bold " : ""}${12 * k}px ${FUENTE}`;
		const nombre = pw > 92 * k ? p.nombre : p.letra;
		ctx.fillText(lleno ? `✓ ${nombre}` : `${p.letra} · ${nombre === p.letra ? "?" : nombre}`, px + pw / 2, py + ph / 2 + 0.5 * k);
	});
	if (enviando) {
		// Barra de envío debajo de las piezas
		ctx.fillStyle = AQUA_TALLER;
		ctx.fillRect(x + rel, y + alto - 4 * k, (ancho - 2 * rel) * clamp(t.envio / TALLER.envio, 0, 1), 3 * k);
	}
}
