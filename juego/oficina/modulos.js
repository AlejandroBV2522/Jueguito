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
const SEPARACION_OFICINAS = 7000; // deja caber una oficina de hasta 6400 (mundo.js → oficina.largo)
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
	mesa: { medioAncho: 40, alto: 62 }, // mesita de café (Cafetería)
	sacos: { medioAncho: 34, alto: 56 }, // sacos de café (Cafetería)
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
	antivirus: {
		lugar: "al laboratorio",
		titulo: "Laboratorio de Seguridad · Repara el antivirus",
		usar: "Reparar el antivirus",
		carta: (n, m) =>
			`${m.oficina.virus ? "Esquiva los virus (agáchate o salta) y repara" : "Repara"} el antivirus: cada una de las ${n} respuestas correctas completa el escudo.`,
		fin: "¡Antivirus reparado! La información está protegida.",
	},
	// La Cafetería: no hay preguntas, se toma un café (ver cafeteria.js)
	cafe: {
		lugar: "a la barra de café",
		titulo: "Barra de café",
		usar: "Tomar café",
		carta: () => "Tómate un café en la barra del fondo (dicen que da energía) y busca la mayita oculta.",
		fin: "",
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
const modulos = MODULOS_DATOS.map((d, i) => {
	const x0 = OFICINA_BASE + i * SEPARACION_OFICINAS;
	const rutaLogo = d.logo || RUTA_LOGOS + "modulo-" + nombreArchivo(d.nombre) + ".png";
	// Con recepcion: false (la Cafetería) nadie te recibe en la entrada
	const cuantos = (d.recepcion === false ? 0 : 1) + Math.min((d.comentarios || []).length, LUGARES_CUATRO.length - 1);
	// Una oficina más larga (mundo.js → oficina.largo) estira todo por igual
	const largo = (d.oficina && d.oficina.largo) || LARGO_OFICINA;
	const estirar = largo / LARGO_OFICINA;
	const lugares = lugaresCompaneros(cuantos).map((l) => Math.round(l * estirar));
	// Muebles propios (mundo.js → oficina.muebles, ej. la Cafetería), o los de oficina
	const tiposMuebles = ((d.oficina && d.oficina.muebles) || []).filter((t) => MUEBLES[t]);
	const obstaculos = POSICIONES_MUEBLES.map((dist, k) => {
		const tipo = tiposMuebles.length ? tiposMuebles[k % tiposMuebles.length] : ORDEN_MUEBLES[(k + i * 3) % ORDEN_MUEBLES.length];
		return { x: x0 + Math.round(dist * estirar), tipo, ...MUEBLES[tipo] };
	});
	// Terraza alta (mundo.js → oficina.terraza: sobre qué mueble, del 1 al 7):
	// una plataforma que se atraviesa desde abajo, como los andamios. Desde
	// el mueble no se alcanza con un salto normal: hace falta el café.
	const bajo = d.oficina && d.oficina.terraza ? obstaculos[d.oficina.terraza - 1] : null;
	const terraza = bajo ? { x: bajo.x, alto: bajo.alto + 205, medioAncho: 120 } : null;
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
			obstaculos,
			terraza,
			// Decoración propia (mundo.js → oficina.decoracion, en el mismo orden), o la de oficina
			decoracion: DECORACION_OFICINA.map((o, k) => ({ x: x0 + Math.round(o.d * estirar), tipo: ((d.oficina && d.oficina.decoracion) || [])[k] || o.tipo })),
			azotea: !!(d.oficina && d.oficina.azotea), // al aire libre: cielo, ciudad y pérgola (cafeteria.js)
			// Cómo se ve por dentro (mundo.js → oficina)
			vista: (d.oficina && d.oficina.vista) || "ciudad",
			tema: (d.oficina && d.oficina.tema) || "planos",
			edificio: (d.oficina && d.oficina.edificio) || "",
			piso: (d.oficina && d.oficina.piso) || 0,
			estacion: ESTACIONES[d.oficina && d.oficina.estacion] ? d.oficina.estacion : "computadora",
			fondo: !!(d.oficina && d.oficina.fondo), // todos los personajes del juego conversando al fondo (cafeteria.js)
			robots: d.oficina && d.oficina.estacion === "robot" ? robotsDe(d.oficina) : [],
			virus: !!(d.oficina && d.oficina.virus), // virus que cruzan la oficina (virus.js)
			anzuelos: !!(d.oficina && d.oficina.anzuelos), // anzuelos de phishing que bajan del techo (virus.js)
			// Compañeros: el primero dice la intro del módulo, los demás sus comentarios
			companeros: Array.from({ length: cuantos }, (_, k) => companeroOficina(d, i, k, x0, lugares)),
		},
	};
});
// El camino + la Cueva (se completa al salir de ella)
const moduloTalento = modulos.find((m) => m.completoAlSalirDeLaCueva) || null;
// El personaje fijo de cada mundo (para el mapa y la carta)
modulos.forEach((m) => {
	const primero = m.oficina.companeros[0];
	m.anfitrionNpc = m.completoAlSalirDeLaCueva ? npcs.find((n) => n.importante) || null : primero && primero.importante ? primero : null;
	// Quien pone la música en la terraza (mundo.js → oficina.dj, cafeteria.js)
	const dj = m.oficina.terraza && MODULOS_DATOS[m.indice].oficina.dj;
	m.djNpc = dj ? { nombre: dj.nombre, apariencia: aparienciaAnfitrion(dj, m.indice), dialogo: dj.frases && dj.frases.length ? dj.frases : ["♪"] } : null;
});
// Oficina en la que está el héroe (null = afuera)
let oficinaActual = null;
