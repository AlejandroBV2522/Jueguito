/* Camino a Celaque — guías de dirección, enemigos, matas y la meta. Ver juego/LEEME.md. */
"use strict";

// ---------- Guías de dirección ----------
// Hacia dónde ir ahora: el próximo NPC por conocer (adelante), el
// Guardián/tubo de la cueva, el próximo enemigo, la puerta del próximo
// módulo o el letrero final.
function objetivoActual() {
	if (estado === "jugando") {
		const npc = npcs.find((n) => !n.hablado && n.x > heroe.x - 400);
		return npc ? npc.x : LARGO;
	}
	if (estado === "cueva") {
		const en = enemigos.find((e) => !e.derrotado && e.x > LARGO);
		return en ? en.x : LARGO_TOTAL;
	}
	if (estado === "urbano") {
		const m = moduloPendiente();
		return m ? m.x : LARGO_META;
	}
	if (estado === "oficina") {
		const of = oficinaActual.oficina;
		const siguiente = of.companeros.find((n) => !n.hablado);
		if (siguiente) return siguiente.x;
		return oficinaActual.completo ? of.x0 + 70 : of.terminalX - 50;
	}
	return null;
}

// Columna de luz sobre el objetivo, con una flecha que rebota encima
// ("aquí"), + flechas luminosas a los pies del héroe apuntando hacia él
// (se apagan al llegar). Más brillantes que antes: en la reunión pidieron
// guías más iluminadas para quien no juega seguido.
function dibujarGuias() {
	const objetivo = objetivoActual();
	if (objetivo === null) return;

	const fx = objetivo - camara;
	if (fx > -80 && fx < W + 80) {
		const pulso = 0.5 + 0.5 * Math.sin(tiempo * 3);
		const luz = ctx.createLinearGradient(0, SUELO + 40 * S, 0, SUELO - 380 * S);
		luz.addColorStop(0, conAlfa(COLORES.verdeInstitucional, 0.6 + 0.25 * pulso));
		luz.addColorStop(0.6, conAlfa(COLORES.fondoVerdeClaro, 0.18 + 0.1 * pulso));
		luz.addColorStop(1, conAlfa(COLORES.verdeInstitucional, 0));
		ctx.fillStyle = luz;
		ctx.fillRect(fx - 42 * S, SUELO - 380 * S, 84 * S, 420 * S);
		// Flecha hacia abajo que rebota sobre el objetivo
		const ay = SUELO - 250 * S + Math.abs(Math.sin(tiempo * 3.2)) * 18 * S;
		ctx.save();
		ctx.shadowColor = COLORES.verdeInstitucional;
		ctx.shadowBlur = 18 * S;
		ctx.fillStyle = COLORES.blanco;
		ctx.strokeStyle = COLORES.verdeInstitucional;
		ctx.lineWidth = 4 * S;
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(fx - 22 * S, ay - 20 * S);
		ctx.lineTo(fx + 22 * S, ay - 20 * S);
		ctx.lineTo(fx, ay + 8 * S);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	const dist = objetivo - heroe.x;
	if (Math.abs(dist) < 100) return;
	const dir = Math.sign(dist);
	const alfa = clamp((Math.abs(dist) - 100) / 160, 0, 1);
	const pie = SUELO + 38 * S - heroe.y * S;
	const y = pie - 16 * S;
	const x0 = heroe.x - camara + dir * 40 * S;
	ctx.save();
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.shadowColor = COLORES.verdeInstitucional;
	ctx.shadowBlur = 16 * S;
	for (let k = 0; k < 3; k++) {
		// Una ola de luz recorre las 3 flechas hacia el objetivo
		const a = alfa * (0.35 + 0.65 * Math.max(0, Math.sin(tiempo * 6 - k * 1.1)));
		const cx = x0 + dir * k * 21 * S;
		ctx.strokeStyle = `rgba(230,255,250,${Math.min(1, a * 1.15).toFixed(3)})`;
		ctx.lineWidth = 6.5 * S;
		ctx.beginPath();
		ctx.moveTo(cx - dir * 8 * S, y - 12 * S);
		ctx.lineTo(cx + dir * 6 * S, y);
		ctx.lineTo(cx - dir * 8 * S, y + 12 * S);
		ctx.stroke();
	}
	ctx.restore();
}

// Dibuja un enemigo con foto (sprite) en vez de vector, con la misma
// sombra/rebote/flip/caída que dibujarPersona, para que se sienta
// parte del mismo mundo. Si la foto todavía no cargó, devuelve false y
// quien llama debe usar dibujarPersona como respaldo.
function dibujarEnemigoSprite(x, pie, o, sprites) {
	const meta = o.atacando ? sprites.golpe : sprites.quieto;
	const el = meta.cargando.elemento;
	if (!el) return false;

	// Algunos enemigos (el murciélago) no tienen foto propia de golpe: en
	// vez de pedir una segunda imagen, se embiste un poco más grande con
	// la misma foto.
	const sinPoseDeGolpe = sprites.golpe === sprites.quieto;
	const embestida = o.atacando && sinPoseDeGolpe ? 1.18 : 1;
	// Ajuste fino por foto puntual (ej. que el golpe se vea un poco más
	// chico que parado), aparte del tamaño base del enemigo.
	const escalaExtra = meta.escalaExtra ?? 1;

	const s = S * 1.15 * (o.escala || 1);
	// El vaivén de reposo NO debe escalar con "escala": es una animación de
	// vida sutil, no parte del tamaño del cuerpo. Si escalara, un enemigo
	// gigante (el jefe) se movería muchos más píxeles que uno chico y se
	// vería como si flotara en vez de estar parado. Se usa una escala fija
	// (equivalente a escala=1) solo para este vaivén.
	const sVaiven = S * 1.15;
	// Flotar en reposo: la fase se toma de la posición de MUNDO (x + camara),
	// no de la de pantalla. Si se usa la de pantalla, al mover la cámara la
	// fase salta cada cuadro y el enemigo tiembla mientras el héroe camina.
	const rebote = o.moviendo
		? Math.abs(Math.cos(o.fase)) * 2 * sVaiven
		: Math.sin(tiempo * 2 + x + camara) * 0.8 * sVaiven;
	const altoDeseado = 100 * s * embestida * escalaExtra;

	ctx.save();
	ctx.translate(x, pie);
	ctx.fillStyle = "rgba(40,40,40,0.18)";
	ctx.beginPath();
	ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.translate(0, -rebote);
	// Algunas fotos ya vienen mirando hacia la izquierda por cómo quedó
	// la pose (ej. la espada del Esqueleto al frente, del lado
	// izquierdo). Para esas, hay que invertir el flip: dir=1 (mirando a
	// la derecha) debe voltearlas, no dejarlas tal cual.
	ctx.scale(meta.mirarIzquierda ? -o.dir : o.dir, 1);
	if (o.cayendo) {
		ctx.rotate(-Math.PI * 0.42 * o.cayendo);
		ctx.globalAlpha = Math.max(0, 1 - o.cayendo);
	}

	const w = el.naturalWidth || el.width;
	const h = el.naturalHeight || el.height;
	// La escala SIEMPRE sale de la foto "quieto" (no de la pose actual):
	// si cada pose normalizara su propio alto de contenido, una pose con
	// bbox más bajo/más alto (ej. una estocada agachada) se vería de
	// tamaño distinto a quieto aunque el cuerpo mida lo mismo -mismo bug
	// que se corrigió para el héroe en dibujarHeroeSprite-.
	const metaQuieto = sprites.quieto;
	const elQuieto = metaQuieto.cargando.elemento;
	const refMeta = elQuieto ? metaQuieto : meta;
	const refEl = elQuieto || el;
	const hRef = refEl.naturalHeight || refEl.height;
	const altoContenidoRef = (refMeta.abajo - refMeta.arriba) * hRef;
	const k = altoDeseado / altoContenidoRef;
	const dw = w * k;
	const dh = h * k;
	const anclaY = meta.anclaY ?? meta.abajo;
	ctx.drawImage(el, -meta.anclaX * dw, -anclaY * dh, dw, dh);

	ctx.restore();
	return true;
}

function dibujarEnemigos() {
	const pie = SUELO + 36 * S;
	for (const e of enemigos) {
		if (e.x > LARGO && !dentroCueva) continue; // los de adentro no se ven desde afuera
		if (e.cayendo >= 1) continue; // ya cayó del todo, no se dibuja más
		const sx = e.x - camara;
		if (sx < -60 || sx > W + 60) continue;
		const a = e.apariencia;
		const o = {
			piel: a.piel,
			ropa: a.ropa,
			pantalon: a.pantalon,
			pelo: a.pelo,
			sombrero: a.sombrero,
			dir: heroe.x >= e.x ? 1 : -1,
			fase: 0,
			moviendo: false,
			atacando: e.atacando,
			cayendo: e.cayendo,
			escala: e.escala || 1,
		};
		const sprites = SPRITES_POR_ENEMIGO[e.nombre];
		const yaDibujado = sprites && dibujarEnemigoSprite(sx, pie, o, sprites);
		if (!yaDibujado) dibujarPersona(sx, pie, o);

		const arriba = pie - 110 * S * (e.escala || 1) + Math.sin(tiempo * 3 + e.x) * 3 * S;
		if (!e.derrotado && e.cayendo === 0) {
			dibujarGlobo(sx, arriba, esTactil ? "Toca para pelear" : "E · Pelear", "#ffb3b3");
			// Lo que se combate: un antivalor (mundos/talento/cueva.js → antivalor)
			if (e.antivalor) dibujarPlacaImportante(sx, arriba - 46 * S, e.antivalor, true);
		}
	}
}

function dibujarMatas(delante) {
	ctx.lineCap = "round";
	for (const m of matas) {
		if (m.delante !== delante) continue;
		// No dibujar pasto/flores encima del tubo de entrada (en LARGO).
		if (Math.abs(m.x - LARGO) < 55) continue;
		if (m.x < FIN_PLANOS + 20) continue; // la zona de planos está vacía
		const sx = m.x - camara;
		if (sx < -20 || sx > W + 20) continue;
		const p = m.x / LARGO;
		const t = tono(p);
		const y = delante ? SUELO + 66 * S : SUELO + 4 * S;
		const alto = (6 + 10 * m.alto) * S * (0.6 + 0.6 * t);

		ctx.strokeStyle = color("pasto", t);
		ctx.lineWidth = 2 * S;
		ctx.beginPath();
		ctx.moveTo(sx, y);
		ctx.lineTo(sx - 4 * S, y - alto * 0.8);
		ctx.moveTo(sx, y);
		ctx.lineTo(sx, y - alto);
		ctx.moveTo(sx, y);
		ctx.lineTo(sx + 4 * S, y - alto * 0.8);
		ctx.stroke();

		// Las flores aparecen a partir de la mitad del camino
		if (m.flor < suave(0.3, 0.9, p) * 0.85) {
			ctx.fillStyle = m.colorFlor;
			circulo(sx, y - alto - 2 * S, 3.5 * S);
			ctx.fillStyle = "#ffe066";
			circulo(sx, y - alto - 2 * S, 1.4 * S);
		}
	}
}

function dibujarMeta() {
	// El destino real: se camina un poco desde el tubo de salida hasta aquí
	const sx = LARGO_META - camara;
	if (sx < -300 || sx > W + 300) return;
	const pie = SUELO + 22 * S;

	const brillo = ctx.createRadialGradient(sx, pie - 80 * S, 10, sx, pie - 80 * S, 220 * S);
	brillo.addColorStop(0, conAlfa(COLORES.verdeInstitucional, 0.55));
	brillo.addColorStop(1, conAlfa(COLORES.verdeInstitucional, 0));
	ctx.fillStyle = brillo;
	ctx.fillRect(sx - 220 * S, pie - 300 * S, 440 * S, 420 * S);

	const texto = CFG.textos.letreroFinal || CFG.nombreMeta;
	ctx.font = `bold ${26 * S}px ${FUENTE}`;
	const anchoTablero = Math.max(190 * S, ctx.measureText(texto).width + 50 * S);

	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.fillRect(sx - anchoTablero * 0.35, pie - 115 * S, 10 * S, 115 * S);
	ctx.fillRect(sx + anchoTablero * 0.35 - 10 * S, pie - 115 * S, 10 * S, 115 * S);

	ctx.save();
	ctx.shadowColor = COLORES.verdeInstitucional;
	ctx.shadowBlur = 22 * S;
	rectRedondo(sx - anchoTablero / 2, pie - 160 * S, anchoTablero, 56 * S, 12 * S);
	ctx.fillStyle = COLORES.blanco;
	ctx.fill();
	ctx.restore();
	ctx.lineWidth = 4 * S;
	ctx.strokeStyle = COLORES.verdeInstitucional;
	ctx.stroke();

	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, sx, pie - 131 * S);

	// Logo de Celaque arriba del letrero (sin deformar)
	ctx.fillStyle = COLORES.blanco;
	rectRedondo(sx - 120 * S, pie - 232 * S, 240 * S, 56 * S, 12 * S);
	ctx.fill();
	ctx.strokeStyle = COLORES.verdeInstitucional;
	ctx.lineWidth = 3 * S;
	ctx.stroke();
	dibujarLogoOEspacio(logoCelaque, sx, pie - 204 * S, 210 * S, 38 * S, false);

	// Bandera ondeando
	const mastil = sx + anchoTablero / 2 + 30 * S;
	ctx.strokeStyle = COLORES.verdeProfundo;
	ctx.lineWidth = 4 * S;
	linea(mastil, pie, mastil, pie - 190 * S);
	const ola = Math.sin(tiempo * 4) * 6 * S;
	ctx.fillStyle = COLORES.verdeInstitucional;
	ctx.beginPath();
	ctx.moveTo(mastil, pie - 188 * S);
	ctx.quadraticCurveTo(mastil + 30 * S, pie - 188 * S + ola, mastil + 60 * S, pie - 175 * S);
	ctx.quadraticCurveTo(mastil + 30 * S, pie - 160 * S - ola, mastil, pie - 160 * S);
	ctx.closePath();
	ctx.fill();
}
