/* Camino a Celaque — coleccionables ocultos en el aire y chispas. Ver juego/LEEME.md. */
"use strict";

// ---------- Coleccionables ----------
// Guacamayas escondidas que flotan arriba de un mueble, una nube, un
// andamio o una roca (mundo.js → coleccionables). Solo se alcanzan saltando desde
// ese objeto: desde el piso no llegas. De lejos casi no se ven; al
// acercarte brillan y suena una pista. Lo encontrado se guarda en
// coleccion.js y se ve en el apartado "Colección" del mapa.

// De qué objeto sale cada una (su x y su alto se leen en cada cuadro: los
// andamios que se mueven se llevan la guacamaya con ellos)
function baseColeccionable(m, c) {
	const k = (c.n || 1) - 1;
	if (c.sobre === "andamio") return { zona: "camino", base: PLATAFORMAS[k] };
	if (c.sobre === "roca") return { zona: "cueva", base: OBSTACULOS_CUEVA[k] };
	if (c.sobre === "nube") return { zona: "oficina", base: m.mision && m.mision.nubes[k] };
	return { zona: "oficina", base: m.oficina.obstaculos[k] };
}

const COLECCIONABLES = [];
modulos.forEach((m) =>
	(m.coleccionables || []).forEach((c) => {
		const { zona, base } = baseColeccionable(m, c);
		if (!base) return; // apunta a algo que no existe: no se crea
		// El id (lo que se guarda) sale de dónde está, no del nombre: así
		// cambiar el nombre (todavía borrador) no borra lo ya encontrado
		const id = `${m.nombre}|${c.sobre || "mueble"}${c.n || 1}`;
		// imagen: la del equipo en assets/trofeos/ (sin imagen, la guacamaya dibujada)
		const img = c.imagen ? cargarImagen(c.imagen) : null;
		COLECCIONABLES.push({ id, nombre: c.nombre, modulo: m, zona, base, sobre: c.sobre || "mueble", altura: Number(c.altura) || 200, img, pista: false });
	})
);

// En el modo fácil el salto sube más: la guacamaya también, para que siga
// sin alcanzarse desde el piso (y se alcance igual desde su objeto)
const extraFacil = () => (modoFacil() ? (impulsoSalto() ** 2 - IMPULSO_SALTO ** 2) / (2 * GRAVEDAD) : 0);
const posColeccionable = (c) => ({ x: c.base.x, alto: c.base.alto + c.altura + extraFacil() });

// Las que están en el lugar donde anda el héroe
function coleccionablesAqui() {
	return COLECCIONABLES.filter((c) =>
		c.zona === "oficina" ? oficinaActual === c.modulo : !oficinaActual && (c.zona === "cueva") === dentroCueva && !vistaUrbana
	);
}

// Al cambiar de lugar se rearman las pistas; las que ya están cerca al
// llegar no suenan de golpe
let zonaColeccion = null;

function actualizarColeccionables() {
	if (estado === "mapa") zonaColeccion = null; // volver al mismo nivel también rearma
	if (estado !== "jugando" && estado !== "cueva" && estado !== "oficina") return;
	const zona = oficinaActual ? oficinaActual.nombre : dentroCueva ? "cueva" : "camino";
	const llegando = zona !== zonaColeccion;
	zonaColeccion = zona;
	for (const c of coleccionablesAqui()) {
		if (coleccionEncontrado(c.id)) continue;
		const p = posColeccionable(c);
		const dx = Math.abs(heroe.x - p.x);
		if (llegando) c.pista = dx < 260;
		// Pista: un tintineo la primera vez que te acercas (se vuelve a armar al alejarte)
		if (dx < 260 && !c.pista) {
			c.pista = true;
			sonar("pista");
		} else if (dx > 600) c.pista = false;
		// El cuerpo del héroe va de sus pies (heroe.y) a ~110 más arriba
		if (dx < 36 && p.alto >= heroe.y - 15 && p.alto <= heroe.y + 110) recogerColeccionable(c, p);
	}
}

function recogerColeccionable(c, p) {
	marcarColeccionado(c.id);
	lanzarChispas(p.x, p.alto, 26, ["#ffd23f", "#fff1c1", COLORES.blanco, COLORES.beige]);
	const n = COLECCIONABLES.filter((x) => coleccionEncontrado(x.id)).length;
	if (n === COLECCIONABLES.length) {
		sonar("victoria");
		avisos.push({ texto: "★ ¡Colección completa!", t: 0 });
	} else {
		sonar("coleccionable");
		avisos.push({ texto: `★ ${c.nombre} (${n}/${COLECCIONABLES.length})`, t: 0 });
	}
}

// Guacamaya del coleccionable, alternando roja (Ara macao, ave nacional) y
// azul y amarilla (los mismos colores que las que cruzan el cielo, aves.js).
// Con imagen propia (assets/trofeos/, ya cargada) se dibuja esa, sin
// deformarla, dentro de un cuadro de 2r. tam = tamaño de la guacamaya.
const TIPO_GUACAMAYA = (c) => TIPOS_AVE[COLECCIONABLES.indexOf(c) % 2];
function dibujarTrofeo(c, x, y, r, alfa = 1, fase = 0) {
	ctx.save();
	ctx.globalAlpha = alfa;
	const el = c.img && c.img.elemento;
	if (el) {
		const w = el.naturalWidth || el.width, h = el.naturalHeight || el.height;
		const k = (2 * r) / Math.max(w, h);
		ctx.drawImage(el, x - (w * k) / 2, y - (h * k) / 2, w * k, h * k);
		ctx.restore();
		return;
	}
	// dibujarAve escala por S; aquí se pide el tamaño en píxeles (r)
	const tam = r / (33 * S); // la guacamaya mide ~2r de ancho, como la imagen
	dibujarAve({ tipo: TIPO_GUACAMAYA(c), dir: 1, x: x + 8 * tam * S, y, tam, fase });
	ctx.restore();
}

// Borde de abajo de lo que tapa la parte de arriba de la pantalla en x
// (la barra de progreso y la barrita del jugador), en píxeles del canvas
function techoInterfaz(x) {
	let techo = 0;
	for (const el of [ui.hud, $("barra-jugador")]) {
		if (!el || el.hidden) continue;
		const r = el.getBoundingClientRect();
		if (x > r.left - 20 && x < r.right + 20) techo = Math.max(techo, r.bottom);
	}
	return techo;
}

// Guacamaya escondida detrás de la barra de arriba (pantallas bajas): una
// flecha con estrella justo debajo avisa que está ahí arriba. Se juntan
// al dibujar las guacamayas y se pintan en dibujarChispas, encima del héroe.
let avisosArriba = [];
function dibujarAvisoArriba(sx, techo, alfa) {
	const k = Math.max(S, 1); // en pantallas bajas S es chico: que igual se note
	const y = techo + 16 * k + Math.sin(tiempo * 5) * 3 * k;
	ctx.save();
	ctx.globalAlpha = alfa;
	ctx.fillStyle = "#f0c64a";
	ctx.strokeStyle = "#8a6420";
	ctx.lineWidth = 2 * k;
	ctx.beginPath();
	ctx.moveTo(sx, y - 11 * k);
	ctx.lineTo(sx + 13 * k, y + 8 * k);
	ctx.lineTo(sx - 13 * k, y + 8 * k);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.font = `bold ${16 * k}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.fillText("★", sx, y + 26 * k);
	ctx.restore();
}

function dibujarColeccionables() {
	for (const c of coleccionablesAqui()) {
		if (coleccionEncontrado(c.id)) continue;
		const p = posColeccionable(c);
		const sx = p.x - camara;
		if (sx < -60 || sx > W + 60) continue;
		const sy = SUELO + 38 * S - p.alto * S + Math.sin(tiempo * 2.4 + p.x) * 5 * S;
		// Visibilidad: casi invisible de lejos, brilla al acercarte
		const cerca = clamp(1 - (Math.abs(heroe.x - p.x) - 120) / 380, 0, 1);
		const alfa = 0.14 + 0.86 * cerca;
		const r = 30 * S;
		ctx.save();
		const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 3.2);
		halo.addColorStop(0, `rgba(255,226,120,${(0.45 * alfa).toFixed(3)})`);
		halo.addColorStop(1, "rgba(255,226,120,0)");
		ctx.fillStyle = halo;
		ctx.fillRect(sx - r * 3.2, sy - r * 3.2, r * 6.4, r * 6.4);
		ctx.restore();
		dibujarTrofeo(c, sx, sy, r, alfa, tiempo * 10 + p.x); // aletea en su lugar
		if (cerca > 0.3) {
			const techo = techoInterfaz(sx);
			if (sy < techo + r * 0.5) avisosArriba.push({ sx, techo, alfa: cerca }); // se dibuja después del héroe
		}
		// Destellos que titilan alrededor
		ctx.save();
		ctx.fillStyle = "#fff8dc";
		for (let k = 0; k < 3; k++) {
			const a = tiempo * 1.7 + k * 2.1;
			const brillo = Math.max(0, Math.sin(tiempo * 4 + k * 1.9));
			ctx.globalAlpha = alfa * brillo;
			const bx = sx + Math.cos(a) * r * 1.9, by = sy + Math.sin(a) * r * 1.9;
			const t = 3.5 * S * brillo;
			ctx.beginPath();
			ctx.moveTo(bx, by - t * 2);
			ctx.lineTo(bx + t * 0.5, by);
			ctx.lineTo(bx, by + t * 2);
			ctx.lineTo(bx - t * 0.5, by);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
	}
}

// ---------- Chispas (al recoger, entregar, vencer...) ----------
// En unidades del mundo (x como heroe.x, alto como heroe.y), con gravedad suave.
let chispas = [];
function lanzarChispas(x, alto, n, colores) {
	for (let k = 0; k < n; k++) {
		const a = Math.random() * Math.PI * 2;
		const v = 80 + Math.random() * 180;
		chispas.push({ x, alto, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 90, vida: 0, dura: 0.5 + Math.random() * 0.5, color: colores[k % colores.length], r: 2 + Math.random() * 3 });
	}
}

function actualizarChispas(dt) {
	for (const p of chispas) {
		p.vida += dt;
		p.x += p.vx * dt;
		p.alto += p.vy * dt;
		p.vy -= 420 * dt;
	}
	chispas = chispas.filter((p) => p.vida < p.dura);
}

function dibujarChispas() {
	for (const a of avisosArriba) dibujarAvisoArriba(a.sx, a.techo, a.alfa);
	avisosArriba = [];
	if (!chispas.length) return;
	ctx.save();
	for (const p of chispas) {
		ctx.globalAlpha = 1 - p.vida / p.dura;
		ctx.fillStyle = p.color;
		circulo(p.x - camara, SUELO + 38 * S - p.alto * S, p.r * S);
	}
	ctx.restore();
}
