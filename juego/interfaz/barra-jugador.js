/* Camino a Celaque — la barrita del jugador (cara y corazones). Ver juego/LEEME.md. */
"use strict";

// ---------- Barrita del jugador ----------
// Arriba a la izquierda: el nombre, la cara del personaje elegido (un
// recorte de su foto) y los corazones pixelados. Al recibir un golpe la
// cara pone la de "golpeado" (con estrellitas) y tiembla; al ganar
// corazones rebota y salen brillos, y el corazón nuevo aparece de un salto.
// Recorte del rostro en cada foto, en px de la foto original (1024 x 1536)
const CARAS = {
	chico: { quieto: [350, 70, 320], golpeado: [490, 90, 320] },
	chica: { quieto: [355, 70, 320], golpeado: [470, 100, 320] },
};
// Corazón de 11 x 10 píxeles: k borde, r rojo, w brillo, d sombra
const CORAZON_PIXEL = [
	"..kk...kk..",
	".krrk.krrk.",
	"krwrrkrrrrk",
	"krwrrrrrrrk",
	"krrrrrrrrdk",
	".krrrrrrdk.",
	"..krrrrdk..",
	"...krrdk...",
	"....kdk....",
	".....k.....",
];
const COLOR_PIXEL = { k: "#1a1a1a", r: "#e3262b", w: "#ffd9d9", d: "#a8161b" };
const COLOR_PIXEL_VACIO = { k: "#1a1a1a", r: "#4a5654", w: "#5f6b69", d: "#3a4442" };
const barra = {
	cara: $("cara-jugador"),
	corazones: $("corazones-jugador"),
	nombre: $("barra-nombre"),
	vidas: -1,
	dolor: 0, // tiempo que le queda a la cara de golpeado
	feliz: 0,
	salto: [], // por corazón: animación al aparecer (1 → 0)
	roto: -1, // corazón que se acaba de perder
	rotoT: 0,
};

function dibujarCorazonPixel(c, x, y, tam, colores) {
	CORAZON_PIXEL.forEach((fila, j) => {
		for (let i = 0; i < fila.length; i++) {
			const k = fila[i];
			if (k === ".") continue;
			c.fillStyle = colores[k];
			c.fillRect(x + i * tam, y + j * tam, tam, tam);
		}
	});
}

function actualizarBarraJugador(dt) {
	const ver = !ui.hud.hidden;
	if (barra.cara.parentElement.hidden === ver) barra.cara.parentElement.hidden = !ver;
	if (!ver) {
		barra.vidas = -1;
		return;
	}
	const nombre = nombreJugador || CFG.personajes[personaje].nombre;
	if (barra.nombre.textContent !== nombre) barra.nombre.textContent = nombre;
	const maximo = vidasMax();
	if (barra.vidas >= 0 && vidas > barra.vidas) {
		barra.feliz = 1.4;
		for (let i = barra.vidas; i < vidas; i++) barra.salto[i] = 1;
	} else if (barra.vidas >= 0 && vidas < barra.vidas) {
		barra.dolor = 1;
		barra.roto = vidas;
		barra.rotoT = 0.6;
	}
	if (heroe.golpeado && barra.dolor < 0.5) barra.dolor = 0.9; // también al caer en un hueco
	barra.vidas = vidas;
	barra.dolor = Math.max(0, barra.dolor - dt);
	barra.feliz = barra.dolor > 0 ? 0 : Math.max(0, barra.feliz - dt);
	barra.rotoT = Math.max(0, barra.rotoT - dt);
	for (let i = 0; i < barra.salto.length; i++) if (barra.salto[i] > 0) barra.salto[i] = Math.max(0, barra.salto[i] - dt * 2.5);
	const dpr = DPR;

	// Cara
	const lado = 56;
	const cara = barra.cara;
	if (cara.width !== lado * dpr || cara.height !== lado * dpr) cara.width = cara.height = lado * dpr;
	const c = cara.getContext("2d");
	c.setTransform(dpr, 0, 0, dpr, 0, 0);
	c.clearRect(0, 0, lado, lado);
	const sprites = SPRITES_POR_PERSONAJE[personaje];
	const pose = barra.dolor > 0 ? "golpeado" : "quieto";
	const img = sprites && sprites[pose] && sprites[pose].cargando.elemento;
	const recorte = (CARAS[personaje] || CARAS.chico)[pose];
	c.save();
	if (barra.dolor > 0) c.translate(Math.sin(tiempo * 70) * 3 * barra.dolor, 0);
	if (barra.feliz > 0) {
		const bote = Math.abs(Math.sin(barra.feliz * 9)) * 4 * Math.min(1, barra.feliz);
		c.translate(lado / 2, lado / 2 - bote);
		c.scale(1 + 0.06 * Math.min(1, barra.feliz), 1 + 0.06 * Math.min(1, barra.feliz));
		c.translate(-lado / 2, -lado / 2);
	}
	if (img) {
		const k = img.naturalWidth / 1024;
		c.drawImage(img, recorte[0] * k, recorte[1] * k, recorte[2] * k, recorte[2] * k, 0, 0, lado, lado);
	} else {
		c.fillStyle = COLORES.verdeInstitucional;
		c.beginPath();
		c.arc(lado / 2, lado / 2, lado * 0.32, 0, Math.PI * 2);
		c.fill();
	}
	c.restore();
	if (barra.dolor > 0) {
		c.fillStyle = `rgba(227,38,43,${(0.35 * barra.dolor).toFixed(3)})`;
		c.fillRect(0, 0, lado, lado);
	}
	if (barra.feliz > 0) {
		// Brillos alrededor de la cara
		c.fillStyle = `rgba(255,236,150,${Math.min(1, barra.feliz).toFixed(3)})`;
		for (let k = 0; k < 4; k++) {
			const ang = tiempo * 3 + (k * Math.PI) / 2;
			const x = lado / 2 + Math.cos(ang) * 22;
			const y = lado / 2 + Math.sin(ang) * 22;
			c.beginPath();
			c.moveTo(x, y - 5);
			c.lineTo(x + 1.5, y - 1.5);
			c.lineTo(x + 5, y);
			c.lineTo(x + 1.5, y + 1.5);
			c.lineTo(x, y + 5);
			c.lineTo(x - 1.5, y + 1.5);
			c.lineTo(x - 5, y);
			c.lineTo(x - 1.5, y - 1.5);
			c.fill();
		}
	}

	// Corazones (2 px por píxel del dibujo)
	const tam = 2;
	const paso = 11 * tam + 4;
	const anchoC = Math.max(1, maximo) * paso;
	const altoC = 10 * tam + 8; // espacio para el salto
	const lienzo = barra.corazones;
	if (lienzo.width !== anchoC * dpr || lienzo.height !== altoC * dpr) {
		lienzo.width = anchoC * dpr;
		lienzo.height = altoC * dpr;
		lienzo.style.width = anchoC + "px";
		lienzo.style.height = altoC + "px";
	}
	const h = lienzo.getContext("2d");
	h.setTransform(dpr, 0, 0, dpr, 0, 0);
	h.clearRect(0, 0, anchoC, altoC);
	for (let i = 0; i < maximo; i++) {
		const lleno = i < vidas;
		const salto = barra.salto[i] || 0;
		let x = i * paso;
		let y = 6 - Math.sin(salto * Math.PI) * 6;
		if (i === barra.roto && barra.rotoT > 0) {
			x += Math.sin(tiempo * 60) * 2;
			y += (0.6 - barra.rotoT) * 6;
		}
		dibujarCorazonPixel(h, x, y, tam, lleno ? COLOR_PIXEL : COLOR_PIXEL_VACIO);
	}
}
