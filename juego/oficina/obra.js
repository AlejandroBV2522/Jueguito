/* Camino a Celaque — la obra al aire libre de Proyectos: zonas y riesgos. Ver juego/LEEME.md. */
"use strict";

// ---------- Obra (mundo.js → oficina.exterior) ----------
// Es una "oficina" al aire libre: se recorre de izquierda a derecha, pero en
// vez de una computadora al fondo hay varias zonas (oficina.zonas), cada una
// con alguien que explica su tema y, al final, un riesgo (enemigo) que cierra
// el paso hasta que se le responde bien. Al terminar la última zona se llega
// a la inauguración, que completa el módulo. Cómo se arma: modulos.js (OBRA);
// cómo se dibuja: dibujo-obra.js. Las preguntas de los riesgos están más
// abajo y son propias de la obra: no usan ni tocan las de la Cueva (cueva.js).

// La zona donde está el héroe (x de mundo)
function zonaObraEn(of, x) {
	let zona = of.zonas[0];
	for (const z of of.zonas) if (x >= z.x - 100) zona = z;
	return zona;
}

// El primer riesgo sin vencer (el que cierra el paso), si lo hay
const riesgoPendiente = (of) => (of.enemigos ? of.enemigos.find((e) => !e.derrotado) || null : null);

// Hasta dónde se puede llegar caminando: un enemigo no es un punto, ocupa
// lugar según su tamaño (como anchoFrenteEnemigo, de la Cueva)
const limiteFrenteRiesgo = (en) => en.x - (52 * (en.escala || 1) + 24) * S;

// Deja la obra como al principio (también para repetirla)
function reiniciarObra(m) {
	const of = m.oficina;
	if (!of.exterior) return;
	of.companeros.forEach((n) => (n.hablado = false));
	of.peligros.forEach(reiniciarPeligroObra);
	of.enemigos.forEach((e) => {
		e.derrotado = false;
		e.atacando = false;
		e.atacandoT = 0;
		e.cayendo = 0;
		e.preguntaActual = 0;
	});
}

// Qué tan avanzada va la obra (0 a 1): el edificio del fondo se levanta con
// esto. Cuenta las zonas ya terminadas (riesgo vencido) más lo que se camina
// de la zona actual.
function avanceObra(of) {
	const vencidos = of.enemigos.filter((e) => e.derrotado).length;
	const z = zonaObraEn(of, heroe.x);
	const enZona = z.indice === vencidos ? clamp((heroe.x - z.x) / z.ancho, 0, 1) * 0.85 : 0;
	return clamp((vencidos + enZona) / of.zonas.length, 0, 1);
}

// Barajar las opciones de una pregunta de ordenar siempre igual (que nunca
// salgan ya en orden) sin usar Math.random: así cada intento ve lo mismo
function mezclaFija(n, semilla) {
	const idx = Array.from({ length: n }, (_, k) => k);
	let r = semilla * 9301 + 49297;
	for (let k = n - 1; k > 0; k--) {
		r = (r * 9301 + 49297) % 233280;
		const j = r % (k + 1);
		[idx[k], idx[j]] = [idx[j], idx[k]];
	}
	// Si quedó igual a la solución, se corre una posición
	if (idx.every((v, k) => v === k)) idx.push(idx.shift());
	return idx;
}

// ---------- Los riesgos: animación ----------
// Cada cuadro, igual que la de los antivalores de la Cueva (que está en actualizar.js)
function actualizarRiesgosObra(dt) {
	for (const en of oficinaActual.oficina.enemigos) {
		if (en.atacando) {
			en.atacandoT += dt;
			if (en.atacandoT >= 0.35) {
				en.atacando = false;
				en.atacandoT = 0;
			}
		}
		if (en.cayendo > 0 && en.cayendo < 1) en.cayendo = Math.min(1, en.cayendo + dt / 0.5);
	}
}

// ---------- Los riesgos: preguntas ----------
// Un riesgo cierra el paso y pregunta en la caja de diálogo. Con "orden" en
// vez de "opciones" la pregunta es de ORDENAR: los pasos salen revueltos y
// se tocan en orden. Equivocarse quita un corazón (no en modo fácil); sin
// corazones se vuelve al inicio de la zona. Con "explicacion", al acertar se
// lee antes de seguir (clic o E).
const preguntaObra = { enemigo: null, continuar: null, sinVidas: false, cableada: false };

// Se conecta la primera vez que se necesita (cuando ya existe la interfaz)
function cablearPreguntasObra() {
	if (preguntaObra.cableada) return;
	preguntaObra.cableada = true;
	ui.dialogo.addEventListener("click", avanzarPreguntaObra);
	window.addEventListener("keydown", (e) => {
		if (estado !== "pregunta" || !preguntaObra.enemigo) return;
		// 1, 2, 3... contestan
		if (/^[1-9]$/.test(e.key)) {
			const btn = ui.opciones.children[Number(e.key) - 1];
			if (btn && !ui.opciones.hidden) btn.click();
		} else if ([" ", "Enter", "e", "E"].includes(e.key) && (preguntaObra.continuar || preguntaObra.sinVidas) && !e.repeat) {
			e.preventDefault();
			avanzarPreguntaObra();
		}
	});
}

function abrirPreguntaObra(enemigo) {
	cablearPreguntasObra();
	estado = "pregunta";
	heroe.moviendo = heroe.corriendo = false;
	preguntaObra.enemigo = enemigo;
	preguntaObra.continuar = null;
	preguntaObra.sinVidas = false;
	const p = enemigo.preguntas[enemigo.preguntaActual];
	anotarPregunta(oficinaActual.nombre, p.pregunta, false);
	const titulo = enemigo.antivalor || enemigo.nombre;
	ui.nombre.textContent = `${titulo} ✗`;
	ui.retrato.textContent = titulo.replace(/^(El|La|Los|Las)\s+/, "").charAt(0).toUpperCase();
	ui.retrato.style.background = enemigo.apariencia.ropa;
	ui.texto.textContent = p.pregunta;
	const guia = p.orden ? "Toca los pasos en orden · " : "";
	ui.pista.textContent = `${guia}Pregunta ${enemigo.preguntaActual + 1}/${enemigo.preguntas.length} · Vidas: ${corazones()}`;
	ui.opciones.innerHTML = "";
	ui.opciones.hidden = false;
	if (p.orden) armarOrdenObra(p, enemigo);
	else
		p.opciones.forEach((texto, i) => {
			const btn = document.createElement("button");
			btn.className = "boton opcion-respuesta";
			btn.textContent = texto;
			btn.addEventListener("click", (e) => {
				e.stopPropagation(); // no debe disparar el clic de la caja (avanzarPreguntaObra)
				resolverPreguntaObra(i === p.correcta, enemigo);
			});
			ui.opciones.appendChild(btn);
		});
	ui.dialogo.hidden = false;
	ui.dialogo.classList.add("arriba", "obra"); // arriba, para que se vea el riesgo abajo; "obra": cabe en pantallas bajas
	document.body.classList.add("con-dialogo");
}

function armarOrdenObra(p, enemigo) {
	let siguiente = 0;
	const semilla = enemigo.zona * 7 + enemigo.preguntaActual * 3 + p.orden.length;
	for (const k of mezclaFija(p.orden.length, semilla)) {
		const btn = document.createElement("button");
		btn.className = "boton opcion-respuesta";
		btn.textContent = p.orden[k];
		btn.dataset.paso = k;
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			if (btn.disabled) return;
			if (k !== siguiente) {
				btn.classList.add("incorrecta");
				setTimeout(() => btn.classList.remove("incorrecta"), 600);
				resolverPreguntaObra(false, enemigo);
				return;
			}
			siguiente++;
			btn.disabled = true;
			btn.classList.add("correcta");
			btn.textContent = `${siguiente}. ${p.orden[k]}`;
			sonar("pieza");
			if (siguiente === p.orden.length) resolverPreguntaObra(true, enemigo);
		});
		ui.opciones.appendChild(btn);
	}
}

function resolverPreguntaObra(acierto, enemigo) {
	const p = enemigo.preguntas[enemigo.preguntaActual];
	if (acierto) {
		sonar("acierto");
		if (p.explicacion) {
			ui.opciones.hidden = true;
			ui.opciones.innerHTML = "";
			ui.texto.textContent = `¡Correcto! ${p.explicacion}`;
			ui.pista.textContent = "Continuar ▸";
			preguntaObra.continuar = () => vencerPreguntaObra(enemigo);
		} else vencerPreguntaObra(enemigo);
		return;
	}
	enemigo.atacando = true;
	enemigo.atacandoT = 0;
	heroe.golpeado = true;
	heroe.golpeadoT = 0;
	sonar("error");
	anotarPregunta(oficinaActual.nombre, p.pregunta, true);
	if (!modoFacil()) vidas--; // en modo fácil el riesgo golpea, pero no quita corazones
	if (vidas <= 0) setTimeout(perderPreguntaObra, 350);
	else ui.pista.textContent = `Incorrecto, intenta de nuevo. Vidas: ${corazones()}`;
}

// Bien contestada: se cierra la caja y se ve la pelea; si quedan preguntas, sigue la siguiente
function vencerPreguntaObra(enemigo) {
	preguntaObra.continuar = null;
	ui.opciones.hidden = true;
	ui.opciones.innerHTML = "";
	ui.dialogo.hidden = true;
	document.body.classList.remove("con-dialogo");
	heroe.atacando = true;
	heroe.atacandoT = 0;
	if (enemigo.preguntaActual + 1 < enemigo.preguntas.length) {
		setTimeout(() => {
			enemigo.preguntaActual++;
			abrirPreguntaObra(enemigo);
		}, 550);
		return;
	}
	enemigo.cayendo = 0.001; // arranca la caída (ver actualizarRiesgosObra)
	setTimeout(() => {
		sonar("derrota");
		lanzarChispas(enemigo.x, 60 * enemigo.escala, 22, [COLORES.blanco, COLORES.verdeInstitucional, COLORES.beige]);
	}, 200);
	setTimeout(() => {
		enemigo.derrotado = true;
		cerrarPreguntaObra();
	}, 550);
}

function cerrarPreguntaObra() {
	preguntaObra.enemigo = null;
	ui.opciones.hidden = true;
	ui.opciones.innerHTML = "";
	ui.dialogo.hidden = true;
	ui.dialogo.classList.remove("arriba", "obra");
	document.body.classList.remove("con-dialogo");
	estado = "oficina";
	actualizarHudOficina();
}

// Sin corazones: la caja ofrece reintentar
function perderPreguntaObra() {
	ui.opciones.hidden = true;
	ui.opciones.innerHTML = "";
	ui.texto.textContent = "Te quedaste sin vidas. Vuelves al inicio de esta zona.";
	ui.pista.textContent = "Reintentar ▸";
	preguntaObra.sinVidas = true;
}

// Clic en la caja (o E): sigue tras la explicación, o reintenta tras quedarse sin corazones
function avanzarPreguntaObra() {
	if (estado !== "pregunta" || !preguntaObra.enemigo) return;
	if (preguntaObra.sinVidas) reiniciarZonaObra(preguntaObra.enemigo);
	else if (preguntaObra.continuar) preguntaObra.continuar();
}

// Vuelve al inicio de la zona del riesgo, que pregunta otra vez desde el principio
function reiniciarZonaObra(enemigo) {
	const of = oficinaActual.oficina;
	vidas = vidasMax();
	heroe.y = 0;
	heroe.velY = 0;
	heroe.atacando = false;
	heroe.atacandoT = 0;
	enemigo.preguntaActual = 0;
	enemigo.atacando = false;
	enemigo.atacandoT = 0;
	heroe.x = Math.max(of.x0 + 40, of.zonas[enemigo.zona].x + 40);
	preguntaObra.sinVidas = false;
	cerrarPreguntaObra();
}

// ---------- Los peligros que se mueven (mundo.js → zonas[].peligro) ----------
// Se actualizan cada cuadro; solo existen en la obra (cada uno, en su zona).
function actualizarPeligrosObra(of, dt) {
	for (const p of of.peligros) {
		if (p.tipo === "talanquera") actualizarTalanquera(p, dt);
		else if (p.tipo === "zanja") actualizarZanja(p, dt);
	}
}

// Deja un peligro como al principio
function reiniciarPeligroObra(p) {
	if (p.tipo === "talanquera") Object.assign(p, { estado: "cerrada", t: 0, h: 0, bloquea: true });
	else if (p.tipo === "zanja") Object.assign(p, { t: 0, cae: 0, px: p.desde + ZANJA.medio * S });
}

// ---------- La talanquera (mundo.js → zonas[].peligro con tipo "talanquera") ----------
// Una compuerta de obra que baja y sube sola: cerrada no deja pasar (ni
// saltando) y hay que esperar a que se abra; no baja si alguien está debajo.
// Cierra y abre en ciclos: cerrada → subiendo → abierta → bajando.
const TALANQUERA = { cerrada: 2.6, subiendo: 0.5, abierta: 2.2, bajando: 0.5, alto: 150, libre: 118, grosor: 34 };
const SIGUIENTE_TALANQUERA = { cerrada: "subiendo", subiendo: "abierta", abierta: "bajando", bajando: "cerrada" };

function actualizarTalanquera(p, dt) {
	const debajo = Math.abs(heroe.x - p.x) < 28;
	if (p.estado === "bajando" && debajo) {
		// Si alguien está debajo, vuelve a subir desde donde iba (sin saltos)
		p.estado = "subiendo";
		p.t = TALANQUERA.bajando - p.t;
	} else if (!(p.estado === "abierta" && debajo)) p.t += dt;
	if (p.t >= TALANQUERA[p.estado]) {
		p.t -= TALANQUERA[p.estado];
		p.estado = SIGUIENTE_TALANQUERA[p.estado];
	}
	const f = p.estado === "subiendo" ? p.t / TALANQUERA.subiendo : p.estado === "bajando" ? 1 - p.t / TALANQUERA.bajando : p.estado === "abierta" ? 1 : 0;
	p.h = TALANQUERA.alto * clamp(f, 0, 1); // altura del borde de abajo sobre el piso
	p.bloquea = p.h < TALANQUERA.libre;
}

// Cerrada, la talanquera es una pared: no se cruza desde ningún lado
function limitarPorTalanqueras(of, viejoX, nuevoX) {
	for (const p of of.peligros) {
		if (p.tipo !== "talanquera" || !p.bloquea) continue;
		const izq = p.x - TALANQUERA.grosor;
		const der = p.x + TALANQUERA.grosor;
		if (viejoX <= izq && nuevoX > izq) return izq;
		if (viejoX >= der && nuevoX < der) return der;
	}
	return nuevoX;
}

// ---------- La zanja con su plataforma (mundo.js → zonas[].peligro con tipo "zanja") ----------
// Una zanja abierta en el camino, muy ancha para saltarla (ni corriendo ni en
// modo fácil), y una plataforma sobre rieles que va y viene de un lado al
// otro. Se sube en un extremo, la plataforma traslada hasta el otro y ahí se
// baja. Quien se sale de la plataforma dentro de la zanja (o cae en ella
// saltando) se cae: pierde un corazón (no en modo fácil) y reaparece antes de
// la zanja. Se mueve sola con el tiempo; se lleva al héroe que va encima.
const ZANJA = { medio: 55, pausa: 1.4, viaje: 4.6, caida: 0.55 };

// Dónde va la plataforma en el instante t (0 = extremo de entrada, 1 = el otro): espera
// quieta en cada extremo (para subir y bajar con calma), viaja y vuelve
function avancePlataforma(t) {
	const { pausa, viaje } = ZANJA;
	const fase = ((t % (2 * (pausa + viaje))) + 2 * (pausa + viaje)) % (2 * (pausa + viaje));
	const suave = (u) => u * u * (3 - 2 * u);
	if (fase < pausa) return 0;
	if (fase < pausa + viaje) return suave((fase - pausa) / viaje);
	if (fase < 2 * pausa + viaje) return 1;
	return 1 - suave((fase - 2 * pausa - viaje) / viaje);
}

// Dónde está el centro de la plataforma ahora
function centroPlataforma(p) {
	const medio = ZANJA.medio * S;
	return p.desde + medio + (p.hasta - p.desde - medio * 2) * avancePlataforma(p.t);
}

function actualizarZanja(p, dt) {
	const medio = ZANJA.medio * S;
	// Cayendo: se ve bajar un momento y reaparece antes de la zanja
	if (p.cae > 0) {
		p.cae += dt;
		heroe.x = p.caeX;
		heroe.velY = 0;
		heroe.y = -Math.min(p.cae, 0.45) * 520;
		if (p.cae >= ZANJA.caida) {
			p.cae = 0;
			heroe.x = p.desde - 50;
			heroe.y = 0;
			heroe.velY = 0;
			heroe.golpeado = true;
			heroe.golpeadoT = 0;
			if (!modoFacil()) vidas--;
			if (vidas <= 0) vidas = vidasMax();
			avisos.push({ texto: "¡Ups! Usa la plataforma", t: 0 });
		}
		return;
	}
	const antes = p.px;
	p.t += dt;
	p.px = centroPlataforma(p);
	// Encima de la plataforma: se va con ella
	if (Math.abs(heroe.x - antes) < medio && heroe.y <= 2) heroe.x += p.px - antes;
	// Dentro de la zanja y no encima de la plataforma (y no en el aire): se cae
	if (heroe.x > p.desde && heroe.x < p.hasta && Math.abs(heroe.x - p.px) >= medio && heroe.y <= 2) {
		p.cae = 0.0001;
		p.caeX = heroe.x;
		sonar("caida");
	}
}
