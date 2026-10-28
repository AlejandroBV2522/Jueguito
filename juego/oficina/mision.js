/* Camino a Celaque — misión de llevar algo del punto A al punto B en una oficina. Ver juego/LEEME.md. */
"use strict";

// ---------- Misión A → B (mundo.js → mision) ----------
// Después de hablar con el anfitrión: en el punto B espera alguien que te
// pide algo; lo recoges en el punto A (más al fondo) y se lo llevas de
// vuelta a B, donde te explica para qué sirve. Hasta entregarlo no se abre
// la estación del fondo. B queda donde iría el 2.º compañero y A donde
// iría el 3.º (LUGARES_COMPANEROS): ese mundo no lleva "comentarios".
// Con a.nube, A está en lo más alto de una torre de nubes que sale por un
// tragaluz del techo: se sube saltando (las nubes se atraviesan desde
// abajo, como los andamios) y la cámara sube contigo. La torre tiene una
// etapa por cada tema de mision.etapas; cada etapa termina en una nube de
// descanso con su banderín: parado ahí se lee el cartel del tema, a salvo
// de los halcones (vigilarBandera). Si te caes,
// caes de verdad hasta la nube (o el piso) que te toque y desde ahí vuelves
// a subir. Ya con el objeto, bajas como quieras.
// En cada etapa vuelan halcones (etapa.halcon: el nombre de una mala
// práctica, con un archivo en las patas) de un lado a otro: si uno te
// toca te empuja de lado y, si te saca de la nube, te caes.
const NUBES_POR_ETAPA = 9; // la última de cada etapa es la de descanso
const ALTO_PRIMERA_NUBE = 95;
const PASO_NUBES = 105; // de una nube a la siguiente (un salto sube ~175)
const CENTRO_TORRE = 1980; // desde la entrada: entre B (1450) y la computadora (2600)
const COLUMNAS_TORRE = [-170, 0, 170, 0]; // zigzag, en orden de subida
const VUELTA_NUBES = 1.5; // qué tan rápido van y vienen las nubes que se mueven
const HALCON = {
	vuelo: 330, // de cuánto a cada lado del centro de la torre vuela
	velocidad: 150, // en la 1.ª etapa; cada etapa, +35
	sobreNube: 55, // vuela a esta altura sobre su nube (te da si estás parado ahí)
	empuje: 520, // qué tan fuerte te empuja de lado
	alcance: 34, // medio ancho para el choque
};

// Tres halcones por etapa, sobre la 3.ª, la 6.ª y la 8.ª nube de la etapa
function halconesTorre(nubes, etapas) {
	const lista = [];
	(etapas || []).forEach((e, k) => {
		for (const [n, fase] of [[2, 0], [5, 2.2], [7, 4.1]]) {
			const nube = nubes[k * NUBES_POR_ETAPA + n];
			if (!nube) continue;
			lista.push({ nombre: e.halcon || "Mala práctica", alto: nube.alto + HALCON.sobreNube, velocidad: HALCON.velocidad + k * 35, fase: fase + k, x: 0, dir: 1 });
		}
	});
	return lista;
}

// Las nubes de la torre, de abajo hacia arriba (la última es A). Más
// arriba son más chicas y, desde la 2.ª etapa, algunas van y vienen.
// Lo de lado (col, mueve) se mide desde el centro de la torre y se escala
// por S como el ancho de las nubes: así los saltos miden lo mismo en
// cualquier pantalla (la x de cada nube se calcula en moverNubesMision).
function nubesTorre(etapas) {
	const total = etapas * NUBES_POR_ETAPA + 1;
	return Array.from({ length: total }, (_, j) => {
		const etapa = Math.min(etapas - 1, Math.floor(j / NUBES_POR_ETAPA));
		const enEtapa = j % NUBES_POR_ETAPA;
		const descanso = j === total - 1 || enEtapa === NUBES_POR_ETAPA - 1;
		return {
			col: COLUMNAS_TORRE[j % COLUMNAS_TORRE.length],
			x: 0,
			dx: 0,
			fase: j * 1.3,
			mueve: !descanso && etapa >= 1 && (enEtapa % 3 === 1 || (etapa === etapas - 1 && enEtapa === 3)) ? 70 : 0,
			alto: ALTO_PRIMERA_NUBE + j * PASO_NUBES,
			medioAncho: descanso ? 84 : 62 - 4 * etapa,
			etapa: descanso && j < total - 1 ? etapa : -1, // nube de descanso (A no lleva cartel)
		};
	});
}

function crearMision(d, i, x0) {
	if (!d.mision) return null;
	const b = d.mision.b || {};
	const enNube = !!(d.mision.a && d.mision.a.nube);
	const nubes = enNube ? nubesTorre(Math.max(1, (d.mision.etapas || []).length)) : [];
	const mi = {
		...d.mision,
		aX: x0 + LUGARES_COMPANEROS[2], // con torre, la nube de arriba (moverNubesMision)
		bX: x0 + LUGARES_COMPANEROS[1],
		cx: x0 + CENTRO_TORRE,
		nubes,
		halcones: enNube ? halconesTorre(nubes, d.mision.etapas) : [],
		// Hueco del techo por donde sale la torre, desde su centro y sin
		// escalar (dibujarFondoOficina)
		torre: enNube
			? { izq: Math.min(...nubes.map((n) => n.col - n.medioAncho - n.mueve)) - 60, der: Math.max(...nubes.map((n) => n.col + n.medioAncho + n.mueve)) + 60 }
			: null,
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
	reiniciarMision(mi);
	return mi;
}

function reiniciarMision(mi) {
	mi.paso = "pedir"; // pedir → buscar → llevar → listo
	mi.persona.hablado = false;
	mi.persona.dialogo = (mi.b && mi.b.pide) || ["¿Me traes lo que está en el punto A?"];
	mi.reloj = 0; // para las nubes que se mueven
	mi.apoyo = 0; // alto de la última nube que pisaste (para saber si te caíste)
	mi.cartel = null; // { etapa, t }: el tema de la etapa, arriba en la pantalla
	mi.empuje = 0; // velocidad de lado tras el golpe de un halcón
	mi.inmune = 0;
	colocarNubes(mi);
}

// Dónde va cada nube (y A) según el reloj y la escala de la pantalla
const xNube = (mi, n) => mi.cx + (n.col + Math.sin(mi.reloj * VUELTA_NUBES + n.fase) * n.mueve) * S;
function colocarNubes(mi) {
	for (const n of mi.nubes) n.x = xNube(mi, n);
	if (mi.nubes.length) mi.aX = mi.nubes[mi.nubes.length - 1].x;
}

// Alturas de las nubes que hay en x (para pararse encima; ver alturasPlataformaEn)
const sobreNube = (n, x) => Math.abs(x - n.x) < (n.medioAncho + 14) * S;
function alturasNubesEn(x) {
	const mi = oficinaActual && oficinaActual.mision;
	if (!mi) return [];
	return mi.nubes.filter((n) => sobreNube(n, x)).map((n) => n.alto);
}
// Altura donde está A: arriba de su nube, o el piso
const alturaPuntoA = (mi) => (mi.nubes.length ? mi.nubes[mi.nubes.length - 1].alto : 0);

// La estación del fondo espera a que se entregue (true si no hay misión)
const misionLista = (m) => !m.mision || m.mision.paso === "listo" || m.completo;

function textoMision(m) {
	const mi = m.mision;
	if (mi.paso === "buscar") return mi.torre ? `Sube por ${mi.objeto} sin caerte` : `Ve al punto A por ${mi.objeto}`;
	if (mi.paso === "llevar") return mi.torre ? `Baja y lleva ${mi.objeto} al punto B` : `Lleva ${mi.objeto} al punto B`;
	return "Ve al punto B";
}

// Las nubes que van y vienen; si estás parado en una, te lleva con ella
function moverNubesMision(mi, dt) {
	mi.reloj += dt;
	for (const n of mi.nubes) {
		const x = xNube(mi, n);
		n.dx = x - n.x;
		if (n.mueve && heroe.velY === 0 && heroe.y === n.alto && sobreNube(n, heroe.x)) heroe.x += n.dx;
		n.x = x;
	}
	if (mi.nubes.length) mi.aX = mi.nubes[mi.nubes.length - 1].x;
	// Halcones: van y vienen de lado a lado de la torre
	for (const h of mi.halcones) {
		const fase = (mi.reloj * h.velocidad) / HALCON.vuelo + h.fase;
		h.x = mi.cx + Math.sin(fase) * HALCON.vuelo * S;
		h.dir = Math.cos(fase) >= 0 ? 1 : -1;
	}
}

// Un halcón que te toca te empuja de lado, hacia donde vuela
function actualizarHalcones(mi, dt) {
	mi.inmune = Math.max(0, mi.inmune - dt);
	if (mi.empuje) {
		const of = oficinaActual.oficina;
		const nuevo = clamp(heroe.x + mi.empuje * dt, of.x0 + 40, of.terminalX - 50);
		heroe.x = frenarEnObstaculos(heroe.x, nuevo, Math.sign(mi.empuje), heroe.y);
		mi.empuje *= Math.max(0, 1 - dt * 5);
		if (Math.abs(mi.empuje) < 20) mi.empuje = 0;
	}
	if (mi.inmune > 0 || mi.enBandera) return; // en la bandera estás a salvo (leyendo el cartel)
	const arriba = heroe.y + (heroe.agachado ? ALTO_HEROE_AGACHADO : ALTO_HEROE_PARADO);
	for (const h of mi.halcones) {
		if (Math.abs(h.x - heroe.x) > HALCON.alcance * S || h.alto - 14 > arriba || h.alto + 14 < heroe.y) continue;
		mi.inmune = 1;
		if (modoFacil()) {
			// Modo fácil (ajustes.js): tu brillo te protege, el halcón no te empuja
			lanzarChispas(heroe.x, heroe.y + 60, 10, ["#ffd23f", "#fff1c1", COLORES.blanco]);
			avisos.push({ texto: "¡Tu brillo te protege!", t: 0 });
			return;
		}
		mi.empuje = h.dir * HALCON.empuje;
		heroe.golpeado = true;
		heroe.golpeadoT = 0;
		sonar("golpe");
		avisos.push({ texto: `¡Te empujó ${h.nombre}!`, t: 0 });
		return;
	}
}

// Mientras subes: anota la última nube que pisaste (o el piso). Si caíste
// más abajo, solo se cuenta: la caída
// ya te dejó donde tenías que quedar.
function vigilarTorre(mi) {
	if (mi.paso !== "pedir" && mi.paso !== "buscar") {
		mi.apoyo = 0; // con el objeto en la mano se baja libre
		return;
	}
	let n = mi.nubes.find((n) => n.alto === heroe.y && sobreNube(n, heroe.x));
	const nubeAntes = mi.nubes.find((x) => x.alto === mi.apoyo);
	if (heroe.y < mi.apoyo - PASO_NUBES / 2 && modoFacil() && nubeAntes) {
		// Modo fácil (ajustes.js): tu brillo te devuelve a la nube de donde caíste
		heroe.x = nubeAntes.x;
		heroe.y = nubeAntes.alto;
		heroe.velY = 0;
		n = nubeAntes;
		lanzarChispas(heroe.x, heroe.y + 60, 14, ["#ffd23f", "#fff1c1", COLORES.blanco]);
		avisos.push({ texto: "¡Tu brillo te devolvió a la nube!", t: 0 });
	} else if (heroe.y < mi.apoyo - PASO_NUBES / 2) {
		mi.caidas = (mi.caidas || 0) + 1;
		sonar("caida");
		avisos.push({ texto: "¡Te caíste! Vuelve a subir", t: 0 });
	}
	mi.apoyo = n ? n.alto : heroe.y;
}

// El cartel de la etapa solo se ve mientras estás en la nube de la bandera
// (la de descanso): ahí ningún halcón te alcanza y se lee tranquilo. Al
// salir de ella se apaga, para no tapar la subida.
function vigilarBandera(mi, dt) {
	const n = mi.nubes.find((x) => x.etapa >= 0 && sobreNube(x, heroe.x) && heroe.y >= x.alto && heroe.y < x.alto + 60);
	mi.enBandera = !!n && (mi.paso === "pedir" || mi.paso === "buscar");
	if (mi.enBandera) {
		if (!mi.cartel || mi.cartel.etapa !== n.etapa) {
			mi.cartel = { etapa: n.etapa, t: 0, fuera: 0 };
			sonar("pista");
		}
		mi.cartel.fuera = 0;
		mi.cartel.t += dt;
	} else if (mi.cartel && (mi.cartel.fuera += dt) > 0.25) mi.cartel = null;
}

function actualizarMision(dt) {
	const m = oficinaActual;
	if (!m || !m.mision || estado !== "oficina") return;
	const mi = m.mision;
	moverNubesMision(mi, dt);
	if (mi.torre && mi.paso !== "listo") actualizarHalcones(mi, dt); // entregada la licencia, ya no estorban
	// Nada (nube que te lleva, halcón que te empuja) te saca de la oficina
	heroe.x = clamp(heroe.x, m.oficina.x0 + 40, m.oficina.terminalX - 50);
	if (mi.torre) vigilarBandera(mi, dt);
	if (!heroeEnSuelo()) return;
	if (mi.torre) vigilarTorre(mi);
	if (!m.oficina.companeros.every((n) => n.hablado)) return; // primero el anfitrión
	const enB = Math.abs(heroe.x - mi.bX) < 90;
	if (mi.paso === "pedir" && enB) {
		mi.paso = "buscar";
		abrirDialogo(mi.persona);
	} else if ((mi.paso === "pedir" || mi.paso === "buscar") && Math.abs(heroe.x - mi.aX) < 60 && heroe.y === alturaPuntoA(mi)) {
		// (si pasó de largo por B sin que le pidieran nada, igual lo recoge)
		mi.paso = "llevar";
		mi.cartel = null;
		avisos.push({ texto: `¡Ya tienes ${mi.objeto}! ${mi.torre ? "Baja" : "Ve"} al punto B`, t: 0 });
		sonar("recoger");
		lanzarChispas(heroe.x, heroe.y + 60, 14, [COLORES.blanco, COLORES.fondoVerdeClaro, "#ffd23f"]);
		actualizarHudOficina();
	} else if (mi.paso === "llevar" && enB) {
		mi.paso = "listo";
		m.terminalVisitada = m.completo; // ahora sí se abre sola al llegar
		mi.persona.dialogo = (mi.b && mi.b.explica) || ["¡Gracias!"];
		sonar("entregar");
		lanzarChispas(mi.bX, 70, 20, [COLORES.verdeInstitucional, COLORES.blanco, "#ffd23f"]);
		abrirDialogo(mi.persona);
	}
}

// Cámara vertical (camaraY, en unidades de heroe.y): en una oficina con
// torre sube con la última nube pisada (no con cada salto, así no se
// mece) y deja al héroe a un poco más de media pantalla. Al caer lo sigue
// de inmediato, para que nunca se salga por abajo.
let apoyoCamara = 0;
function seguirTorre(dt) {
	const mi = oficinaActual && oficinaActual.mision;
	if (!mi || !mi.torre) return 0;
	apoyoCamara = heroeEnSuelo() ? heroe.y : Math.min(apoyoCamara, heroe.y);
	const pie = SUELO + 38 * S; // los pies con heroe.y = 0
	const objetivo = Math.max(0, apoyoCamara - (pie - H * 0.62) / S);
	let y = camaraY + (objetivo - camaraY) * Math.min(1, dt * 4);
	// En pleno salto, si la cabeza llega bajo la barra de arriba, sube ya
	y = Math.max(y, heroe.y + 120 - (pie - techoInterfaz(heroe.x - camara) - 10) / S);
	return clamp(y, 0, Math.max(0, heroe.y - (pie - H * 0.88) / S));
}

// La licencia (o lo que se lleve): una credencial con la nube; x, y = centro
function dibujarFolderMision(x, y, escala) {
	const u = S * escala;
	ctx.fillStyle = "rgba(4,37,35,0.18)";
	rectRedondo(x - 19 * u, y - 12 * u, 40 * u, 28 * u, 5 * u);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	rectRedondo(x - 20 * u, y - 14 * u, 40 * u, 28 * u, 5 * u);
	ctx.fill();
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(x - 20 * u, y - 14 * u, 40 * u, 9 * u, 5 * u);
	ctx.fill();
	ctx.fillRect(x - 20 * u, y - 9 * u, 40 * u, 4 * u);
	dibujarIconoMundo("nube", x - 9 * u, y + 4 * u, 6 * u, COLORES.verdeInstitucional);
	ctx.fillStyle = COLORES.grisClaro;
	ctx.fillRect(x - 1 * u, y + 0 * u, 15 * u, 2.5 * u);
	ctx.fillRect(x - 1 * u, y + 5 * u, 10 * u, 2.5 * u);
	ctx.fillStyle = "#ffd23f";
	circulo(x + 14 * u, y - 9.5 * u, 2.5 * u);
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

// Banderín con el número de la etapa, en la nube de descanso
function dibujarBanderinEtapa(x, arriba, numero) {
	const palo = arriba - 52 * S;
	ctx.fillStyle = COLORES.verdeProfundo;
	ctx.fillRect(x - 1.5 * S, palo, 3 * S, 52 * S);
	const ondea = Math.sin(tiempo * 4 + numero) * 3 * S;
	ctx.fillStyle = COLORES.verdeInstitucional;
	ctx.beginPath();
	ctx.moveTo(x + 1.5 * S, palo);
	ctx.lineTo(x + 34 * S, palo + 10 * S + ondea);
	ctx.lineTo(x + 1.5 * S, palo + 22 * S);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `bold ${12 * S}px ${FUENTE}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(String(numero), x + 12 * S, palo + 11 * S + ondea * 0.3);
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
	const y = piso - (alto ? 82 : 178) * S; // en la nube, más cerca
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
	// Punto A: en lo alto de la torre de nubes o en una mesita (en el piso)
	const ax = mi.aX - camara;
	const altoA = alturaPuntoA(mi) * S;
	for (const n of mi.nubes) {
		const sx = n.x - camara;
		const arriba = piso - n.alto * S;
		if (arriba < -camaraY * S - 80 * S || arriba > H - camaraY * S + 40 * S) continue; // fuera de la pantalla
		dibujarNubeMision(sx, arriba, n.medioAncho * S);
		if (n.etapa >= 0) dibujarBanderinEtapa(sx + n.medioAncho * S * 0.6, arriba, n.etapa + 1);
	}
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
	for (const h of mi.paso === "listo" ? [] : mi.halcones) {
		const y = piso - h.alto * S;
		if (y > -camaraY * S - 60 * S && y < H - camaraY * S + 60 * S) dibujarHalcon(h.x - camara, y, h.dir, h.nombre, mi.reloj * 9 + h.fase);
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

// Cielo sobre el edificio, visible por el tragaluz y al subir por la
// torre (se dibuja fijo, antes que la oficina, que baja con camaraY)
function dibujarCieloTorre() {
	const alto = camaraY * S + 40 * S;
	const cielo = ctx.createLinearGradient(0, 0, 0, alto);
	cielo.addColorStop(0, "#3f8fca");
	cielo.addColorStop(1, "#e6f4fb");
	ctx.fillStyle = cielo;
	ctx.fillRect(0, 0, W, alto);
	// Nubes lejanas: bajan más despacio que la torre
	for (let k = 0; k < 10; k++) {
		const y = SUELO - (300 + k * 170 - camaraY * 0.6) * S;
		if (y < -60 * S || y > alto + 40 * S) continue;
		const x = modulo(k * 437 - camara * 0.2 + tiempo * 6, W + 400 * S) - 200 * S;
		nubeVista(x, y, (16 + (k % 3) * 6) * S, 0.28); // tenues: que no se confundan con las de pisar
	}
}

// Parte un texto en renglones que quepan en `ancho` (con la fuente ya puesta)
function partirEnRenglones(texto, ancho) {
	const renglones = [];
	let actual = "";
	for (const palabra of texto.split(" ")) {
		const prueba = actual ? `${actual} ${palabra}` : palabra;
		if (actual && ctx.measureText(prueba).width > ancho) {
			renglones.push(actual);
			actual = palabra;
		} else actual = prueba;
	}
	if (actual) renglones.push(actual);
	return renglones;
}

// Cartel de la etapa (mision.etapas), arriba al centro, fijo en la pantalla
function dibujarCartelEtapa(m) {
	const mi = m.mision;
	const etapa = mi && mi.cartel && (mi.etapas || [])[mi.cartel.etapa];
	if (!etapa) return;
	const t = mi.cartel.t;
	const k = Math.max(S, 0.9); // en pantallas bajas S es chico: que igual se lea
	const ancho = Math.min(W - 32, 540 * k);
	const relleno = 16 * k;
	ctx.save();
	ctx.globalAlpha = clamp(Math.min(t * 4, 1 - (mi.cartel.fuera || 0) * 4), 0, 1);
	ctx.font = `${14 * k}px ${FUENTE}`;
	const renglones = partirEnRenglones(etapa.texto || "", ancho - relleno * 2);
	const alto = relleno * 2 + 22 * k + renglones.length * 19 * k;
	const x = (W - ancho) / 2;
	const y = techoInterfaz(W / 2) + 12 * k - Math.max(0, 0.25 - t) * 40 * k;
	ctx.fillStyle = COLORES.verdeProfundo;
	rectRedondo(x, y, ancho, alto, 12 * k);
	ctx.fill();
	ctx.fillStyle = COLORES.verdeInstitucional;
	rectRedondo(x, y, 8 * k, alto, 4 * k);
	ctx.fill();
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillStyle = "#7fd6c8";
	ctx.font = `bold ${15 * k}px ${FUENTE}`;
	ctx.fillText(`Etapa ${mi.cartel.etapa + 1} de ${mi.etapas.length} · ${etapa.titulo}`, x + relleno, y + relleno);
	ctx.fillStyle = COLORES.blanco;
	ctx.font = `${14 * k}px ${FUENTE}`;
	renglones.forEach((r, i) => ctx.fillText(r, x + relleno, y + relleno + 24 * k + i * 19 * k));
	ctx.restore();
}

// Halcón de una mala práctica: café, con su nombre en un letrero rojo.
// x, y = centro del cuerpo; dir = hacia dónde vuela; aleteo = fase
function dibujarHalcon(x, y, dir, nombre, aleteo) {
	if (x < -120 || x > W + 120) return;
	const ala = Math.sin(aleteo) * 16 * S;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(dir * 1.3, 1.3);
	// El archivo que se lleva, colgando de las patas (se mece al volar)
	ctx.save();
	ctx.translate(2 * S, 10 * S);
	ctx.rotate(Math.sin(aleteo * 0.5) * 0.12);
	ctx.fillStyle = COLORES.blanco;
	ctx.strokeStyle = "#8a8f8c";
	ctx.lineWidth = 1 * S;
	ctx.beginPath();
	ctx.moveTo(-10 * S, 2 * S);
	ctx.lineTo(5 * S, 2 * S);
	ctx.lineTo(10 * S, 7 * S);
	ctx.lineTo(10 * S, 26 * S);
	ctx.lineTo(-10 * S, 26 * S);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = "#e3262b";
	ctx.fillRect(-7 * S, 7 * S, 9 * S, 3 * S);
	ctx.fillStyle = COLORES.grisClaro;
	for (let k = 0; k < 3; k++) ctx.fillRect(-7 * S, 13 * S + k * 4 * S, 14 * S, 2 * S);
	ctx.restore();
	// Patas que lo agarran
	ctx.strokeStyle = "#f0b429";
	ctx.lineWidth = 2.2 * S;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(-4 * S, 7 * S);
	ctx.lineTo(-5 * S, 13 * S);
	ctx.moveTo(7 * S, 7 * S);
	ctx.lineTo(8 * S, 13 * S);
	ctx.stroke();
	ctx.lineCap = "butt";
	ctx.fillStyle = "#5a3d24"; // ala de atrás
	ctx.beginPath();
	ctx.moveTo(-4 * S, -2 * S);
	ctx.lineTo(-20 * S, -14 * S - ala);
	ctx.lineTo(8 * S, -4 * S);
	ctx.fill();
	ctx.fillStyle = "#6b4a2b"; // cuerpo y cola
	ctx.beginPath();
	ctx.ellipse(0, 0, 22 * S, 10 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(-18 * S, -4 * S);
	ctx.lineTo(-34 * S, -8 * S);
	ctx.lineTo(-34 * S, 6 * S);
	ctx.lineTo(-18 * S, 4 * S);
	ctx.fill();
	ctx.fillStyle = "#efe6d8"; // pecho
	ctx.beginPath();
	ctx.ellipse(6 * S, 4 * S, 12 * S, 5 * S, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#6b4a2b"; // cabeza
	circulo(20 * S, -4 * S, 8 * S);
	ctx.fillStyle = "#f0b429"; // pico
	ctx.beginPath();
	ctx.moveTo(26 * S, -6 * S);
	ctx.lineTo(34 * S, -2 * S);
	ctx.lineTo(26 * S, 0);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	circulo(22 * S, -6 * S, 2.6 * S);
	ctx.fillStyle = "#000";
	circulo(22.8 * S, -6 * S, 1.3 * S);
	ctx.fillStyle = "#8a5f37"; // ala de adelante
	ctx.beginPath();
	ctx.moveTo(-6 * S, 0);
	ctx.lineTo(-16 * S, -18 * S - ala * 1.4);
	ctx.lineTo(12 * S, -2 * S);
	ctx.fill();
	ctx.restore();
	// Nombre de la mala práctica
	ctx.font = `bold ${11 * S}px ${FUENTE}`;
	const w = ctx.measureText(nombre).width + 14 * S;
	ctx.fillStyle = "#e3262b";
	rectRedondo(x - w / 2, y - 52 * S, w, 18 * S, 9 * S);
	ctx.fill();
	ctx.fillStyle = COLORES.blanco;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(nombre, x, y - 43 * S);
}
