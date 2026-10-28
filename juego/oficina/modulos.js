/* Camino a Celaque — los módulos: logos, oficinas, muebles, compañeros y estaciones. Ver juego/LEEME.md. */
"use strict";

// Módulos: cada uno es un edificio en la calle de Celaque. Su puerta
// queda en x; mientras no lo completes, una reja justo después de la
// puerta no te deja seguir (ver limiteUrbano).
const RUTA_LOGOS = "assets/logos/";
// "Céfiro" → "cefiro": nombre de archivo sin tildes, espacios ni mayúsculas
function nombreArchivo(texto) {
	return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Logos oficiales (los pone el equipo en assets/logos/; ver README). Si
// todavía no están, en su lugar se dibuja un recuadro que dice "LOGO".
// Manual de marca: el logo va siempre sobre un fondo liso de buen
// contraste (nunca degradado ni foto), sin transparencias ni deformarlo,
// y en pantalla con al menos 20 px de alto (horizontal).
const logoCelaque = cargarImagen(RUTA_LOGOS + "celaque-horizontal-verde-profundo.png");
const logoCelaqueBlanco = cargarImagen(RUTA_LOGOS + "celaque-horizontal-blanco.png");
const ALTO_MIN_LOGO = 20;
// Interior de cada módulo: una oficina propia en una franja del mundo
// aparte (muy lejos de la calle, para que no se mezclen), recorrida de
// izquierda a derecha: entrada → compañero → muebles → computadora.
const OFICINA_BASE = LARGO_META + 4000;
const SEPARACION_OFICINAS = 11000; // más que la obra de Proyectos (la más larga, ~9700): ninguna se pisa con otra
const LARGO_OFICINA = 2600;
// Muebles = obstáculos sólidos (como las rocas de la cueva): se saltan o
// se camina por encima. Todos de 80 o menos de alto, así un salto normal
// caminando alcanza para subirse (ver nota de OBSTACULOS_CUEVA).
const MUEBLES = {
	escritorio: { medioAncho: 58, alto: 64 },
	silla: { medioAncho: 20, alto: 40 },
	archivero: { medioAncho: 28, alto: 78 },
	cajas: { medioAncho: 32, alto: 54 },
	impresora: { medioAncho: 30, alto: 60 },
	planta: { medioAncho: 18, alto: 50 },
	dispensador: { medioAncho: 18, alto: 74 },
	// Solo de la obra al aire libre (ver OBRA más abajo)
	pila: { medioAncho: 34, alto: 56 },
	tambo: { medioAncho: 22, alto: 64 },
};
const ORDEN_MUEBLES = ["planta", "escritorio", "silla", "archivero", "cajas", "escritorio", "impresora", "dispensador"];
// Distancias desde la entrada. Los compañeros esperan en LUGARES_COMPANEROS
// (entre muebles, con espacio para pararse a hablar). Dejan libre la
// entrada y el tramo antes de la computadora (ahí van los letreros de obra
// de la primera oficina).
const POSICIONES_MUEBLES = [440, 600, 1060, 1240, 1680, 1860, 2300];
// El primero te recibe (intro); los otros dicen los "comentarios" del módulo
const LUGARES_COMPANEROS = [800, 1450, 2070];
// Con 3 "comentarios" (4 personas) el hueco del medio se reparte entre dos
const LUGARES_CUATRO = [800, 1370, 1560, 2070];
const lugaresCompaneros = (cuantos) => (cuantos > LUGARES_COMPANEROS.length ? LUGARES_CUATRO : LUGARES_COMPANEROS);
// Decoración que no estorba (se pasa por delante): libreros, sillones...
const DECORACION_OFICINA = [
	{ d: 300, tipo: "librero" },
	{ d: 930, tipo: "sillon" },
	{ d: 1340, tipo: "pizarra" },
	{ d: 1570, tipo: "cafetera" },
	{ d: 1960, tipo: "librero" },
	{ d: 2190, tipo: "plantaAlta" },
	{ d: 2440, tipo: "especial" }, // propio de cada tema (maqueta, robot...)
];
// Obra al aire libre (mundo.js → oficina.exterior, Proyectos): en vez de una
// oficina, un camino de varias zonas. Cada zona (oficina.zonas) tiene a
// alguien que explica el tema, 2 obstáculos y, al final, un riesgo (enemigo)
// que cierra el paso hasta que se le responde bien. Las distancias son desde
// el inicio de cada zona; las 5 zonas ocupan ANCHO_ZONA_OBRA cada una.
const OBRA = {
	entrada: 260, // de la puerta de la obra a la primera zona
	ancho: 1700, // ancho de cada zona
	final: 480, // después de la última zona, hasta la inauguración (el jefe final queda lejos de la meta)
	companero: 420,
	obstaculos: [800, 1150],
	enemigo: 1500,
	peligro: 1130, // la carga de la grúa (zonas[].peligro): su centro, desde el inicio de la zona
	seguro: 880, // un punto libre justo después del primer obstáculo (para ubicar a alguien o a las pruebas)
	// La zanja con su plataforma (zonas[].peligro tipo "zanja"): dónde empieza (desde el inicio de la zona), cuánto
	// mide y cuánto camino queda después hasta el riesgo. La zona se alarga lo que haga falta.
	zanja: { desde: 900, largo: 840, despues: 180 },
};
const OBSTACULOS_OBRA = [
	["barrera", "pila"],
	["cajas", "tambo"],
	["pila", "barrera"],
	["tambo", "cajas"],
	["barrera", "pila"],
];
const COLORES_PELO = ["#1f1a17", "#3b2414", "#5a2a14", "#2b1a12"];
// Dónde se contestan las preguntas al fondo de cada oficina (mundo.js →
// oficina.estacion). Las preguntas son las mismas; cambia la figurita.
const ESTACIONES = {
	computadora: {
		lugar: "a la computadora",
		titulo: "Terminal Celaque",
		usar: "Usar computadora",
		carta: (n) => `Contesta ${n} preguntas en la Terminal Celaque.`,
		fin: "",
	},
	robot: {
		lugar: "al taller de IA",
		titulo: "Taller de IA · Arma al asistente",
		usar: "Armar al asistente",
		carta: (n, m) =>
			m.oficina.robots.length > 1
				? `Arma ${m.oficina.robots.length} robots de IA (${m.oficina.robots.map((r) => ROBOTS_IA[r]).join(", ")}): cada una de las ${n} respuestas correctas les pone piezas.`
				: `Arma al asistente de IA: cada una de las ${n} respuestas correctas le pone piezas.`,
		fin: "¡El asistente de IA está listo para ayudarte!",
	},
	inauguracion: {
		lugar: "a la inauguración",
		titulo: "Inauguración de la obra",
		usar: "Cortar la cinta",
		carta: (n, m) => `Cruza las ${m.oficina.zonas.length} zonas de la obra y vence a sus riesgos respondiendo bien.`,
		fin: "¡El edificio está terminado! Cortaste la cinta de la inauguración.",
	},
	maquina: {
		lugar: "a la gran máquina",
		titulo: "La gran máquina",
		usar: "Activar la máquina",
		carta: (n, m) => `Cruza las ${m.oficina.zonas.length} zonas de la fábrica y vence a sus riesgos respondiendo bien.`,
		fin: "¡La gran máquina está en marcha! Todos los procesos funcionan.",
	},
	antivirus: {
		lugar: "al laboratorio",
		titulo: "Laboratorio de Seguridad · Repara el antivirus",
		usar: "Reparar el antivirus",
		carta: (n, m) =>
			`${m.oficina.virus ? "Esquiva los virus (agáchate o salta) y repara" : "Repara"} el antivirus: cada una de las ${n} respuestas correctas completa el escudo.`,
		fin: "¡Antivirus reparado! La información está protegida.",
	},
};
const PIEZAS_ESTACION = 6; // partes del robot o del escudo
// Robots que se arman en el taller de IA (mundo.js → oficina.robots), en
// orden: cada uno se lleva su parte de las preguntas. Sin "robots", solo el
// de tierra. Cómo se dibuja cada uno: estaciones.js.
const ROBOTS_IA = { tierra: "de tierra", aereo: "aéreo", humanoide: "humanoide" };
// Las PIEZAS_ESTACION partes de cada robot, en el orden en que se arman
// (lo que dice la terminal al acertar)
const PIEZAS_ROBOT = {
	tierra: ["las ruedas", "el cuerpo", "el brazo izquierdo", "el brazo derecho", "la cabeza", "la cara y la antena"],
	aereo: ["las patas", "el cuerpo", "el brazo izquierdo", "el brazo derecho", "las hélices", "la cámara"],
	humanoide: ["las piernas", "el torso", "el brazo izquierdo", "el brazo derecho", "la cabeza", "la cara"],
};
function robotsDe(oficina) {
	const lista = ((oficina && oficina.robots) || []).filter((r) => ROBOTS_IA[r]);
	return lista.length ? lista : ["tierra"];
}
function companeroOficina(d, i, k, x0, lugares) {
	if (k === 0 && d.anfitrion) {
		// El personaje fijo del mundo es quien te recibe
		return {
			nombre: d.anfitrion.nombre,
			x: x0 + lugares[0],
			alto: 0,
			enOficina: true,
			importante: true,
			hablado: false,
			dialogo: d.anfitrion.dialogo && d.anfitrion.dialogo.length ? d.anfitrion.dialogo : d.intro || [`¡Hola! Soy ${d.anfitrion.nombre}.`],
			apariencia: aparienciaAnfitrion(d.anfitrion, i),
		};
	}
	const datos = k === 0 ? d.companero || {} : d.comentarios[k - 1];
	const cuerpo = datos.cuerpo || ((i + k) % 2 ? "chica" : "chico");
	return {
		nombre: datos.nombre || `Equipo de ${d.nombre}`,
		x: x0 + lugares[k],
		alto: 0,
		enOficina: true,
		hablado: false,
		dialogo:
			k === 0
				? d.intro && d.intro.length ? d.intro : [`Bienvenido al módulo ${d.nombre}.`]
				: datos.dialogo && datos.dialogo.length ? datos.dialogo : ["¡Hola!"],
		apariencia: {
			cuerpo,
			casco: "#ffffff",
			chaleco: k === 0 ? d.color || "#00767a" : k === 1 ? COLORES.beige : COLORES.verdeInstitucional,
			pelo: COLORES_PELO[(i + k) % COLORES_PELO.length],
			pantalon: "#2d3a4a",
		},
	};
}
// ---------- Obra al aire libre (Proyectos) ----------
const esObra = (d) => !!(d.oficina && d.oficina.exterior && (d.oficina.zonas || []).length);
// Dónde está el riesgo de una zona y cuánto mide: la zona de la zanja es más larga, las demás miden OBRA.ancho
const enemigoXObra = (z) => (z.peligro && z.peligro.tipo === "zanja" ? OBRA.zanja.desde + OBRA.zanja.largo + OBRA.zanja.despues : OBRA.enemigo);
const anchoZonaObra = (z) => enemigoXObra(z) + (OBRA.ancho - OBRA.enemigo);
function inicioZonaObra(d, x0, k) {
	let x = x0 + OBRA.entrada;
	for (let j = 0; j < k; j++) x += anchoZonaObra(d.oficina.zonas[j]);
	return x;
}

// Quien explica cada zona: la primera la da el anfitrión del mundo; las
// demás, oficina.zonas[].companero
function companerosObra(d, i, x0) {
	return d.oficina.zonas.map((z, k) => {
		const x = inicioZonaObra(d, x0, k) + OBRA.companero;
		if (k === 0 && d.anfitrion) {
			return {
				nombre: d.anfitrion.nombre,
				x,
				alto: 0,
				enOficina: true,
				importante: true,
				hablado: false,
				dialogo: d.anfitrion.dialogo && d.anfitrion.dialogo.length ? d.anfitrion.dialogo : [`¡Hola! Soy ${d.anfitrion.nombre}.`],
				apariencia: aparienciaAnfitrion(d.anfitrion, i),
			};
		}
		const c = z.companero || {};
		return {
			nombre: c.nombre || `Equipo de ${d.nombre}`,
			x,
			alto: 0,
			enOficina: true,
			hablado: false,
			dialogo: c.dialogo && c.dialogo.length ? c.dialogo : ["¡Hola!"],
			apariencia: {
				cuerpo: c.cuerpo || (k % 2 ? "chica" : "chico"),
				casco: k % 2 ? "#ffd23f" : "#ffffff",
				chaleco: k % 2 ? "#ff7a1a" : COLORES.verdeInstitucional,
				pelo: COLORES_PELO[(i + k) % COLORES_PELO.length],
				pantalon: "#2d3a4a",
			},
		};
	});
}

// El riesgo del final de cada zona: se ve como en la Cueva (nombre sobre el
// enemigo y preguntas en la caja de diálogo), pero se dibuja en obra.js
function enemigosObra(d, x0) {
	return d.oficina.zonas
		.map((z, k) => {
			const e = z.enemigo;
			if (!e) return null;
			return {
				nombre: e.nombre,
				antivalor: e.riesgo || e.nombre,
				dibujo: e.dibujo || "blob",
				escala: e.escala || 1,
				apariencia: { ropa: e.color || COLORES.verdeProfundo },
				x: inicioZonaObra(d, x0, k) + enemigoXObra(z),
				zona: k,
				preguntas: e.preguntas || [],
				preguntaActual: 0,
				derrotado: false,
				atacando: false,
				atacandoT: 0,
				cayendo: 0,
			};
		})
		.filter(Boolean);
}

function obstaculosObra(d, x0) {
	const lista = [];
	d.oficina.zonas.forEach((z, k) =>
		OBRA.obstaculos.forEach((dist, j) => {
			if (z.peligro && j === 1) return; // en las zonas con un peligro, el lugar del 2.º obstáculo es para él
			const tipo = OBSTACULOS_OBRA[k % OBSTACULOS_OBRA.length][j];
			lista.push({ x: inicioZonaObra(d, x0, k) + dist, tipo, ...(MUEBLES[tipo] || { medioAncho: 38, alto: 60 }) });
		})
	);
	return lista;
}

const modulos = MODULOS_DATOS.map((d, i) => {
	const x0 = OFICINA_BASE + i * SEPARACION_OFICINAS;
	const rutaLogo = d.logo || RUTA_LOGOS + "modulo-" + nombreArchivo(d.nombre) + ".png";
	const cuantos = 1 + Math.min((d.comentarios || []).length, LUGARES_CUATRO.length - 1);
	// Una oficina más larga (mundo.js → oficina.largo) estira todo por igual
	const obra = esObra(d);
	const largo = obra ? OBRA.entrada + d.oficina.zonas.reduce((suma, z) => suma + anchoZonaObra(z), 0) + OBRA.final : (d.oficina && d.oficina.largo) || LARGO_OFICINA;
	const estirar = largo / LARGO_OFICINA;
	const lugares = lugaresCompaneros(cuantos).map((l) => Math.round(l * estirar));
	return {
		...d,
		indice: i,
		x: PRIMER_MODULO + i * ESPACIO_MODULO,
		completo: false,
		preguntaActual: 0,
		visitado: false, // ya se entró solo una vez al llegar a la puerta
		terminalVisitada: false,
		brillo: 0, // destello al completarlo (1 → 0)
		// Sin "logo" en su mundo.js se busca assets/logos/modulo-<nombre>.png
		rutaLogo,
		logoImg: cargarImagen(rutaLogo),
		// Foto real de su edificio en el mapa (mundo.js → foto)
		fotoImg: d.foto ? (d.fotoBordes ? cargarImagenFundida(d.foto, d.fotoBordes) : cargarImagen(d.foto)) : null,
		// Llevar algo del punto A al B (mundo.js → mision; ver mision.js)
		mision: crearMision(d, i, x0),
		oficina: {
			x0,
			terminalX: x0 + largo,
			obstaculos: obra
				? obstaculosObra(d, x0)
				: POSICIONES_MUEBLES.map((dist, k) => {
						const tipo = ORDEN_MUEBLES[(k + i * 3) % ORDEN_MUEBLES.length];
						return { x: x0 + Math.round(dist * estirar), tipo, ...MUEBLES[tipo] };
					}),
			decoracion: obra ? [] : DECORACION_OFICINA.map((o) => ({ x: x0 + Math.round(o.d * estirar), tipo: o.tipo })),
			// Obra al aire libre (Proyectos): sus zonas y los riesgos que cierran el paso (obra.js)
			exterior: obra,
			zonas: obra ? d.oficina.zonas.map((z, k) => ({ ...z, x: inicioZonaObra(d, x0, k), ancho: anchoZonaObra(z), indice: k })) : [],
			enemigos: obra ? enemigosObra(d, x0) : null,
			// Peligros en algunas zonas (mundo.js → zonas[].peligro; ver obra.js): la talanquera y la zanja con su plataforma
			peligros: obra
				? d.oficina.zonas
						.map((z, k) => {
							if (!z.peligro) return null;
							const inicio = inicioZonaObra(d, x0, k);
							return {
								tipo: z.peligro.tipo,
								x: inicio + OBRA.peligro,
								zona: k,
								// talanquera
								estado: "cerrada",
								t: 0,
								h: 0,
								bloquea: true,
								// zanja: de dónde a dónde, la plataforma (px = su centro) y la caída del héroe (cae: segundos)
								desde: inicio + OBRA.zanja.desde,
								hasta: inicio + OBRA.zanja.desde + OBRA.zanja.largo,
								px: inicio + OBRA.zanja.desde,
								cae: 0,
								caeX: 0,
							};
						})
						.filter(Boolean)
				: [],
			// Cómo se ve por dentro (mundo.js → oficina)
			vista: (d.oficina && d.oficina.vista) || "ciudad",
			tema: (d.oficina && d.oficina.tema) || "planos",
			edificio: (d.oficina && d.oficina.edificio) || "",
			piso: (d.oficina && d.oficina.piso) || 0,
			estacion: ESTACIONES[d.oficina && d.oficina.estacion] ? d.oficina.estacion : "computadora",
			robots: d.oficina && d.oficina.estacion === "robot" ? robotsDe(d.oficina) : [],
			virus: !!(d.oficina && d.oficina.virus), // virus que cruzan la oficina (virus.js)
			// Compañeros: el primero dice la intro del módulo, los demás sus comentarios
			companeros: obra ? companerosObra(d, i, x0) : Array.from({ length: cuantos }, (_, k) => companeroOficina(d, i, k, x0, lugares)),
		},
	};
});
// El camino + la Cueva (se completa al salir de ella)
const moduloTalento = modulos.find((m) => m.completoAlSalirDeLaCueva) || null;
// El personaje fijo de cada mundo (para el mapa y la carta)
modulos.forEach((m) => {
	const primero = m.oficina.companeros[0];
	m.anfitrionNpc = m.completoAlSalirDeLaCueva ? npcs.find((n) => n.importante) || null : primero && primero.importante ? primero : null;
});
// Oficina en la que está el héroe (null = afuera)
let oficinaActual = null;
