/* Camino a Celaque — misión de llevar algo del punto A al punto B en una oficina. Ver juego/LEEME.md. */
"use strict";

// ---------- Misión A → B (mundo.js → mision) ----------
// Después de hablar con el anfitrión: en el punto B espera alguien que te
// pide algo; lo recoges en el punto A (más al fondo) y se lo llevas de
// vuelta a B, donde te explica para qué sirve. Hasta entregarlo no se abre
// la estación del fondo. B queda donde iría el 2.º compañero y A donde
// iría el 3.º (LUGARES_COMPANEROS): ese mundo no lleva "comentarios".
// Con a.nube, A está arriba, en una nube: se sube saltando por una
// escalera de nubes (se atraviesan desde abajo, como los andamios).
const ALTURAS_NUBES = [80, 160, 240]; // la última es la del punto A (más alto no cabe en celular)
const SEPARACION_NUBES = 175;
function crearMision(d, i, x0) {
	if (!d.mision) return null;
	const b = d.mision.b || {};
	const aX = x0 + LUGARES_COMPANEROS[2];
	const enNube = !!(d.mision.a && d.mision.a.nube);
	return {
		...d.mision,
		aX,
		bX: x0 + LUGARES_COMPANEROS[1],
		nubes: enNube
			? ALTURAS_NUBES.map((alto, k) => ({ x: aX - (ALTURAS_NUBES.length - 1 - k) * SEPARACION_NUBES, alto, medioAncho: k === ALTURAS_NUBES.length - 1 ? 80 : 62 }))
			: [],
		paso: "pedir", // pedir → buscar → llevar → listo
		persona: {
			nombre: b.nombre || "Miembro del equipo",
			x: x0 + LUGARES_COMPANEROS[1],
			alto: 0,
			enOficina: true,
			hablado: false,
			dialogo: b.pide || ["¿Me traes lo que está en el punto A?"],
			apariencia: {
				cuerpo: b.cuerpo || "chico",
				casco: "#ffffff",
				chaleco: COLORES.beige,
				pelo: COLORES_PELO[(i + 1) % COLORES_PELO.length],
				pantalon: "#2d3a4a",
			},
		},
	};
}

function reiniciarMision(mi) {
	mi.paso = "pedir";
	mi.persona.hablado = false;
	mi.persona.dialogo = (mi.b && mi.b.pide) || ["¿Me traes lo que está en el punto A?"];
}

// Alturas de las nubes que hay en x (para pararse encima; ver alturasPlataformaEn)
function alturasNubesEn(x) {
	const mi = oficinaActual && oficinaActual.mision;
	if (!mi) return [];
	return mi.nubes.filter((n) => Math.abs(x - n.x) < (n.medioAncho + 14) * S).map((n) => n.alto);
}
// Altura donde está A: arriba de su nube, o el piso
const alturaPuntoA = (mi) => (mi.nubes.length ? mi.nubes[mi.nubes.length - 1].alto : 0);

// La estación del fondo espera a que se entregue (true si no hay misión)
const misionLista = (m) => !m.mision || m.mision.paso === "listo" || m.completo;

function textoMision(m) {
	const mi = m.mision;
	if (mi.paso === "buscar") return `Ve al punto A por ${mi.objeto}`;
	if (mi.paso === "llevar") return `Lleva ${mi.objeto} al punto B`;
	return "Ve al punto B";
}

function actualizarMision() {
	const m = oficinaActual;
	if (!m || !m.mision || estado !== "oficina" || !heroeEnSuelo()) return;
	const mi = m.mision;
	if (!m.oficina.companeros.every((n) => n.hablado)) return; // primero el anfitrión
	const enB = Math.abs(heroe.x - mi.bX) < 90;
	if (mi.paso === "pedir" && enB) {
		mi.paso = "buscar";
		abrirDialogo(mi.persona);
	} else if ((mi.paso === "pedir" || mi.paso === "buscar") && Math.abs(heroe.x - mi.aX) < 60 && heroe.y === alturaPuntoA(mi)) {
		// (si pasó de largo por B sin que le pidieran nada, igual lo recoge)
		mi.paso = "llevar";
		avisos.push({ texto: `¡Ya tienes ${mi.objeto}! Ve al punto B`, t: 0 });
		actualizarHudOficina();
	} else if (mi.paso === "llevar" && enB) {
		mi.paso = "listo";
		m.terminalVisitada = m.completo; // ahora sí se abre sola al llegar
		mi.persona.dialogo = (mi.b && mi.b.explica) || ["¡Gracias!"];
		abrirDialogo(mi.persona);
	}
}

// Un fólder con su documento (lo que se lleva); x, y = centro
function dibujarFolderMision(x, y, escala) {
	const u = S * escala;
	ctx.fillStyle = COLORES.beige;
	rectRedondo(x - 18 * u, y - 13 * u, 36 * u, 26 * u, 4 * u);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	ctx.fillRect(x - 13 * u, y - 18 * u, 26 * u, 20 * u);
	ctx.fillStyle = COLORES.verdeInstitucional;
	for (const k of [0, 1, 2]) ctx.fillRect(x - 9 * u, y - 14 * u + k * 5 * u, (k === 2 ? 10 : 18) * u, 2 * u);
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(x - 18 * u, y - 4 * u, 36 * u, 17 * u, 4 * u);
	ctx.fill();
	dibujarIconoMundo("escudo", x, y + 4 * u, 5 * u, COLORES.blanco);
}

// Una nube para pararse: la parte de arriba (plana) queda en arriba
function dibujarNubeMision(x, arriba, medio) {
	if (x < -medio - 60 || x > W + medio + 60) return;
	ctx.fillStyle = "rgba(4,37,35,0.10)"; // sombrita abajo
	ctx.beginPath();
	ctx.ellipse(x, arriba + 26 * S, medio * 0.9, 9 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	for (const [dx, dy, r] of [[-0.62, 8, 20], [-0.25, 4, 27], [0.15, 2, 30], [0.55, 7, 22], [0, 14, 22]]) circulo(x + dx * medio, arriba + dy * S, r * S);
	// Panza verde clarito: se distingue de las nubes del ventanal
	ctx.fillStyle = mezclar(COLORES.blanco, COLORES.verdeInstitucional, 0.3);
	rectRedondo(x - medio, arriba + 8 * S, medio * 2, 14 * S, 7 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	rectRedondo(x - medio, arriba, medio * 2, 14 * S, 7 * S);
	ctx.fill();
}

// Un punto (en el piso o a cierta altura) con su letra y su letrero
function dibujarPuntoMision(x, letra, texto, activo, alto = 0) {
	const piso = SUELO + 38 * S - alto;
	const pulso = 0.5 + 0.5 * Math.sin(tiempo * 4);
	ctx.fillStyle = conAlfa("#7fd6c8", activo ? 0.35 + 0.25 * pulso : 0.18);
	ctx.beginPath();
	ctx.ellipse(x, piso, 54 * S, 10 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	// Letra y letrero bien arriba, sobre el punto (no tapan a nadie)
	const y = piso - (alto ? 82 : 178) * S; // en la nube, más cerca (arriba está el HUD)
	ctx.font = `bold ${12 * S}px ${FUENTE}`;
	const w = ctx.measureText(texto).width + 16 * S + 26 * S;
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(x - w / 2, y - 12 * S, w, 24 * S, 12 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	circulo(x - w / 2 + 12 * S, y, 9 * S);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(texto, x + 13 * S, y);
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.font = `bold ${13 * S}px ${FUENTE}`;
	ctx.fillText(letra, x - w / 2 + 12 * S, y + 0.5 * S);
}

function dibujarMision(m) {
	const mi = m.mision;
	if (!mi) return;
	const piso = SUELO + 38 * S;
	// Punto A: en una nube (arriba) o en una mesita de Sistemas (en el piso)
	const ax = mi.aX - camara;
	const altoA = alturaPuntoA(mi) * S;
	for (const n of mi.nubes) dibujarNubeMision(n.x - camara, piso - n.alto * S, n.medioAncho * S);
	if (ax > -200 && ax < W + 200) {
		dibujarPuntoMision(ax, "A", (mi.a && mi.a.letrero) || "Punto A", mi.paso === "buscar", altoA);
		if (!mi.nubes.length) {
			ctx.fillStyle = COLORES.verdeProfundo;
			ctx.fillRect(ax - 30 * S, piso - 46 * S, 60 * S, 8 * S);
			ctx.fillRect(ax - 24 * S, piso - 40 * S, 6 * S, 40 * S);
			ctx.fillRect(ax + 18 * S, piso - 40 * S, 6 * S, 40 * S);
		}
		if (mi.paso === "pedir" || mi.paso === "buscar") dibujarFolderMision(ax, piso - altoA - (mi.nubes.length ? 30 : 66) * S + Math.sin(tiempo * 3) * 3 * S, 1);
	}
	// Punto B: quien espera
	const bx = mi.bX - camara;
	if (bx > -200 && bx < W + 200) {
		dibujarPuntoMision(bx, "B", (mi.b && mi.b.letrero) || "Punto B", mi.paso === "llevar");
		const n = mi.persona;
		dibujarNpcFoto(bx, SUELO + 36 * S, n, heroe.x >= n.x ? 1 : -1);
		const arriba = piso - 127 * S + Math.sin(tiempo * 3 + n.x) * 3 * S;
		if (mi.paso === "pedir" || mi.paso === "llevar") dibujarGlobo(bx, arriba, "!", "#ffe066");
		else if (mi.paso === "listo") dibujarFolderMision(bx + 22 * S, piso - 70 * S, 0.7);
	}
	// Lo que lleva el héroe, flotando sobre su cabeza
	if (mi.paso === "llevar") dibujarFolderMision(heroe.x - camara, piso - heroe.y * S - 150 * S + Math.sin(tiempo * 5) * 3 * S, 1);
}
