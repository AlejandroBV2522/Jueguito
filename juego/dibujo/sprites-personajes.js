/* Camino a Celaque — imágenes del héroe y de los NPC. Ver juego/LEEME.md. */
"use strict";

// ---------- Sprite del héroe (constructor) ----------
// A diferencia de los enemigos (quietos en un lugar), el héroe camina por
// toda la pantalla, así que una sola foto fija "patinaría". Se cubre con
// 6 poses -quieto/caminando/caminando2/saltando/golpe/agachado- elegidas
// según el estado del héroe en cada cuadro (ver dibujarHeroeSprite).
// anclaX de cada una se midió sobre el TORSO/cadera (no la silueta
// completa), para que el cuerpo no "salte" de lado al cambiar de pose (el
// martillo/los brazos se abren distinto en cada una, pero el torso queda
// clavado en el mismo lugar). "caminando"/"caminando2" son las 2 zancadas
// (pierna izq. y der. adelante) que se alternan con la fase de pasos —
// mismo ciclo que ya usa el rebote— para caminar Y correr.
const RUTA_PERSONAJE = "assets/personaje/";
const SPRITES_HEROE_CHICO = {
	quieto: { archivo: "PersonajeHDePie.png", anclaX: 0.4585, arriba: 0.0163, abajo: 0.9831 },
	caminando: { archivo: "PersonajeHCaminando.png", anclaX: 0.4576, arriba: 0.0365, abajo: 0.9674 },
	caminando2: { archivo: "PersonajeHCaminando2.png", anclaX: 0.4679, arriba: 0.1185, abajo: 0.8919, escalaExtra: 1.25 },
	saltando: { archivo: "PersonajeHSalta.png", anclaX: 0.5139, arriba: 0.0215, abajo: 0.875 },
	golpe: { archivo: "PersonajeHGolpe.png", anclaX: 0.4845, arriba: 0.042, abajo: 0.9665 },
	agachado: { archivo: "PersonajeHAgachado.png", anclaX: 0.4878, arriba: 0.0977, abajo: 0.9212 },
	golpeado: { archivo: "PersonajeHGolpeado.png", anclaX: 0.457, arriba: 0.0345, abajo: 0.9811 },
	// Correr (Q): se alternan estas 2, que vienen de la misma hoja (mismo
	// tamaño y estilo). escalaExtra las iguala al tamaño de las demás.
	corre: { archivo: "PersonajeHCorre.png", anclaX: 0.5466, arriba: 0.0235, abajo: 0.9765, escalaExtra: 2.889 },
	correPaso: { archivo: "PersonajeHCorrePaso.png", anclaX: 0.4656, arriba: 0.0231, abajo: 0.9769, escalaExtra: 2.889 },
};
for (const clave in SPRITES_HEROE_CHICO) {
	SPRITES_HEROE_CHICO[clave].cargando = cargarImagen(RUTA_PERSONAJE + SPRITES_HEROE_CHICO[clave].archivo);
}

// La Chica: ya tiene las 6 poses con foto propia, igual que el Chico.
const SPRITES_HEROE_CHICA = {
	quieto: { archivo: "PersonajeMDePie.png", anclaX: 0.4737, arriba: 0.0254, abajo: 0.9772 },
	caminando: { archivo: "PersonajeMCaminando.png", anclaX: 0.47, arriba: 0.0293, abajo: 0.974 },
	caminando2: { archivo: "PersonajeMCaminando2.png", anclaX: 0.4825, arriba: 0.0267, abajo: 0.9857 },
	saltando: { archivo: "PersonajeMSalta.png", anclaX: 0.4892, arriba: 0.0153, abajo: 0.9825 },
	golpe: { archivo: "PersonajeMGolpe.png", anclaX: 0.4685, arriba: 0.0697, abajo: 0.9759 },
	agachado: { archivo: "PersonajeMAgachado.png", anclaX: 0.4706, arriba: 0.0278, abajo: 0.9737 },
	golpeado: { archivo: "PersonajeMGolpeado.png", anclaX: 0.4731, arriba: 0.0482, abajo: 0.9785 },
	corre: { archivo: "PersonajeMCorre.png", anclaX: 0.5351, arriba: 0.0232, abajo: 0.9768, escalaExtra: 2.937 },
	correPaso: { archivo: "PersonajeMCorrePaso.png", anclaX: 0.5092, arriba: 0.0232, abajo: 0.9768, escalaExtra: 2.937 },
};
for (const clave in SPRITES_HEROE_CHICA) {
	SPRITES_HEROE_CHICA[clave].cargando = cargarImagen(RUTA_PERSONAJE + SPRITES_HEROE_CHICA[clave].archivo);
}

// Qué set de fotos usar según el personaje elegido en la pantalla de
// inicio.
const SPRITES_POR_PERSONAJE = {
	chico: SPRITES_HEROE_CHICO,
	chica: SPRITES_HEROE_CHICA,
};

// ---------- NPCs con la misma ilustración del héroe ----------
// Cada NPC usa la foto "de pie" del Chico o la Chica, recoloreando casco,
// chaleco, pantalón y pelo con sus propios colores. Las máscaras de cada
// zona (assets/personaje/mascaras/) se generaron aparte, porque abriendo
// el juego con doble clic (file://) el navegador no deja leer píxeles.
// "lum" es el brillo medio de cada zona en la foto original: se usa para
// aclararla antes de teñirla, así el color final sale parejo.
const RUTA_MASCARAS = RUTA_PERSONAJE + "mascaras/";
const ZONAS_NPC = { casco: "Casco", chaleco: "Chaleco", pantalon: "Pantalon", pelo: "Pelo" };
const CUERPOS_NPC = {
	chico: { letra: "H", meta: SPRITES_HEROE_CHICO.quieto, lum: { casco: 0.295, chaleco: 0.532, pantalon: 0.16, pelo: 0.129 } },
	chica: { letra: "M", meta: SPRITES_HEROE_CHICA.quieto, lum: { casco: 0.266, chaleco: 0.5, pantalon: 0.141, pelo: 0.121 } },
};
for (const c of Object.values(CUERPOS_NPC)) {
	c.mascaras = {};
	for (const z in ZONAS_NPC) c.mascaras[z] = cargarImagen(RUTA_MASCARAS + "Personaje" + c.letra + ZONAS_NPC[z] + ".png");
}
const ALTO_FOTO_NPC = 420; // resolución del lienzo teñido (sobra para su tamaño en pantalla)

// Devuelve (y guarda en el NPC) el lienzo con la foto ya teñida, o null
// si las imágenes todavía no terminan de cargar.
function fotoNpc(n) {
	if (n.foto) return n.foto;
	const cuerpo = CUERPOS_NPC[n.apariencia.cuerpo] || CUERPOS_NPC.chico;
	const base = cuerpo.meta.cargando.elemento;
	if (!base) return null;
	for (const z in ZONAS_NPC) if (!cuerpo.mascaras[z].elemento) return null;

	const h = ALTO_FOTO_NPC;
	const w = Math.round((h * base.naturalWidth) / base.naturalHeight);
	const lienzo = document.createElement("canvas");
	lienzo.width = w;
	lienzo.height = h;
	const g = lienzo.getContext("2d");
	g.drawImage(base, 0, 0, w, h);

	const capa = document.createElement("canvas");
	capa.width = w;
	capa.height = h;
	const c = capa.getContext("2d");
	for (const z in ZONAS_NPC) {
		const tinte = n.apariencia[z];
		if (!tinte) continue;
		c.globalCompositeOperation = "source-over";
		c.clearRect(0, 0, w, h);
		// La foto en escala de grises y aclarada (conserva sombras y brillos)...
		c.filter = `grayscale(1) brightness(${(0.85 / cuerpo.lum[z]).toFixed(2)})`;
		c.drawImage(base, 0, 0, w, h);
		c.filter = "none";
		// ...multiplicada por el color del NPC y recortada a la zona
		c.globalCompositeOperation = "multiply";
		c.fillStyle = tinte;
		c.fillRect(0, 0, w, h);
		c.globalCompositeOperation = "destination-in";
		c.drawImage(cuerpo.mascaras[z].elemento, 0, 0, w, h);
		g.drawImage(capa, 0, 0);
	}
	n.foto = { lienzo, meta: cuerpo.meta };
	return n.foto;
}

const azar = crearAzar(20260925);
