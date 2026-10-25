/* Camino a Celaque — actualización de cada cuadro. Ver juego/LEEME.md. */
"use strict";

// ---------- Actualización ----------
function actualizar(dt) {
	// Física real del salto: gravedad + colisión contra los tubos (el
	// único "objeto sólido" del juego). Corre siempre, sin importar el
	// estado, para que nunca se quede flotando a medio salto.
	moverPlataformas();
	// Parado en una plataforma móvil: te lleva con ella (en x y en y)
	if (heroe.sobre && heroe.velY === 0) {
		heroe.x += heroe.sobre.dx;
		heroe.y = heroe.sobre.alto;
	}
	const alturaAntes = heroe.y;
	heroe.velY -= GRAVEDAD * dt;
	heroe.y += heroe.velY * dt;
	// Una superficie (tubo, obstáculo o andamio) solo te sostiene si ya
	// venías desde encima (saltando o caminando sobre ella). Si vas por
	// debajo, no te empuja hacia arriba — el choque lateral
	// (frenarEnObstaculos) evita meterse dentro de los obstáculos, y los
	// andamios se atraviesan desde abajo.
	const suelo = sueloBajo(heroe.x, alturaAntes);
	if (hayHuecoEn(heroe.x) && heroe.y <= suelo) {
		// No hay piso: si no lo saltaste, sigues cayendo hasta perder.
		if (estado === "cueva" && heroe.y < -70) perderPorHueco();
	} else if (heroe.y <= suelo) {
		heroe.y = suelo;
		heroe.velY = 0;
	}
	if (heroeEnSuelo()) {
		heroe.ultimoSuelo = tiempo;
		// Salto presionado justo antes de aterrizar: sale ahora
		if (tiempo - heroe.saltoPedido < 0.15) saltarAccion();
	}
	heroe.sobre =
		heroe.velY === 0 && heroe.y > 0 && !dentroCueva && !vistaUrbana
			? PLATAFORMAS.find((pl) => pl.eje && pl.alto === heroe.y && Math.abs(heroe.x - pl.x) < pl.medioAncho + MARGEN_BORDE) || null
			: null;

	// Animaciones de pelea: puñetazo del héroe, y de cada enemigo (lanzar
	// golpe si respondiste mal, o caer si respondiste bien).
	if (heroe.atacando) {
		heroe.atacandoT += dt;
		if (heroe.atacandoT >= 0.35) {
			heroe.atacando = false;
			heroe.atacandoT = 0;
		}
	}
	if (heroe.golpeado) {
		heroe.golpeadoT += dt;
		if (heroe.golpeadoT >= 0.5) {
			heroe.golpeado = false;
			heroe.golpeadoT = 0;
		}
	}
	for (const en of enemigos) {
		if (en.atacando) {
			en.atacandoT += dt;
			if (en.atacandoT >= 0.35) {
				en.atacando = false;
				en.atacandoT = 0;
			}
		}
		if (en.cayendo > 0 && en.cayendo < 1) {
			en.cayendo = Math.min(1, en.cayendo + dt / 0.5);
		}
	}

	// Agacharse: mostrar la pose de cuclillas mientras se mantiene la flecha
	// abajo, parado en el piso. (En transición la maneja entrarPorTubo.)
	if (estado === "jugando" || estado === "cueva" || estado === "urbano" || estado === "oficina") {
		heroe.agachado = entrada.abajo && heroeEnSuelo();
	}

	if (estado === "transicion") {
		transicion.t += dt;
		if (transicion.t >= (transicion.dur || 3)) {
			heroe.agachado = false;
			const luego = transicion.luego;
			transicion = null;
			luego();
		}
	}

	if (estado === "jugando") {
		let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
		if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
		if (heroe.agachado) dir = 0; // agachado: no avanza hasta soltar abajo

		heroe.moviendo = dir !== 0;
		heroe.corriendo = heroe.moviendo && entrada.correr;

		// El Guardián de la Entrada vive afuera (x <= LARGO) y bloquea el
		// paso antes de que puedas cruzar hacia la Cueva.
		const guardian = enemigos.find((en) => !en.derrotado && en.x <= LARGO);
		const limite = guardian ? guardian.x - anchoFrenteEnemigo(guardian) : limiteFrenteATubo(LARGO, heroe.y);

		if (heroe.moviendo) {
			const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
			heroe.dir = dir;
			const viejoX = heroe.x;
			heroe.x = frenarEnObstaculos(viejoX, clamp(viejoX + dir * velocidad * dt, 40, limite), dir, heroe.y);
			heroe.fase += dt * (heroe.corriendo ? 16 : 9);
			actualizarHud();
		}

		if (!cruzoPlanos && heroe.x >= FIN_PLANOS) {
			cruzoPlanos = true;
			destello = 1;
		}

		// Los NPCs saludan solos la primera vez que te acercas
		const nuevo = npcs.find((n) => !n.hablado && alAlcance(n, CFG.distanciaParaHablar));
		if (nuevo) abrirDialogo(nuevo);
		else if (guardian && heroe.x >= limite) abrirPregunta(guardian);
		// Cruzar el tubo de entrada ahora requiere agacharse (agacharAccion)
	}

	if (estado === "cueva") {
		let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
		if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
		if (heroe.agachado) dir = 0; // agachado: no avanza hasta soltar abajo
		heroe.moviendo = dir !== 0;
		heroe.corriendo = heroe.moviendo && entrada.correr;

		const bloqueante = enemigos.find((en) => !en.derrotado);
		const limite = bloqueante ? bloqueante.x - anchoFrenteEnemigo(bloqueante) : limiteFrenteATubo(LARGO_TOTAL, heroe.y);

		if (heroe.moviendo) {
			const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
			heroe.dir = dir;
			const viejoX = heroe.x;
			const tentativo = clamp(viejoX + dir * velocidad * dt, LARGO, limite);
			heroe.x = frenarEnObstaculos(viejoX, tentativo, dir, heroe.y);
			heroe.fase += dt * (heroe.corriendo ? 16 : 9);
		}

		if (bloqueante && heroe.x >= limite) abrirPregunta(bloqueante);
		// Cruzar el tubo de salida ahora requiere agacharse (agacharAccion)
		actualizarHudCueva();
	}

	if (estado === "urbano") {
		let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
		if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
		if (heroe.agachado) dir = 0; // agachado: no avanza hasta soltar abajo
		heroe.moviendo = dir !== 0;
		heroe.corriendo = heroe.moviendo && entrada.correr;

		if (heroe.moviendo) {
			const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
			heroe.dir = dir;
			heroe.x = clamp(heroe.x + dir * velocidad * dt, LARGO_TOTAL, limiteUrbano());
			heroe.fase += dt * (heroe.corriendo ? 16 : 9);
		}

		// La primera vez que llegas a la puerta de un módulo entras solo
		// (después, con E / Espacio / "Hablar" frente a la puerta).
		const pendiente = moduloPendiente();
		if (pendiente && !pendiente.visitado && heroe.x >= pendiente.x - 20 && heroeEnSuelo()) entrarOficina(pendiente);
		else if (heroe.x >= LARGO_META) ganar();
	}

	if (estado === "oficina") {
		const of = oficinaActual.oficina;
		let dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
		if (dir === 0 && performance.now() < entrada.ruedaHasta) dir = entrada.rueda;
		if (heroe.agachado) dir = 0;
		heroe.moviendo = dir !== 0;
		heroe.corriendo = heroe.moviendo && entrada.correr;
		if (heroe.moviendo) {
			const velocidad = heroe.corriendo ? CFG.velocidadCorriendo : CFG.velocidadPersonaje;
			heroe.dir = dir;
			const viejoX = heroe.x;
			const tentativo = clamp(viejoX + dir * velocidad * dt, of.x0 + 40, of.terminalX - 50);
			heroe.x = frenarEnObstaculos(viejoX, tentativo, dir, heroe.y);
			heroe.fase += dt * (heroe.corriendo ? 16 : 9);
			actualizarHudOficina();
		}
		// Cada compañero te habla solo la primera vez que llegas a él (en
		// orden); la computadora se abre sola la primera vez que llegas.
		const siguiente = of.companeros.find((n) => !n.hablado);
		if (siguiente && heroe.x >= siguiente.x - 100 && heroeEnSuelo()) abrirDialogo(siguiente);
		else if (!oficinaActual.terminalVisitada && enTerminal()) abrirTerminal(oficinaActual);
	}
	actualizarVirus(dt); // virus de la oficina (mundo.js → oficina.virus)
	actualizarMision(); // llevar algo del punto A al B (mundo.js → mision)
	actualizarColeccionables(); // guacamayas ocultas (mundo.js → coleccionables)
	actualizarChispas(dt);
	for (const m of modulos) m.brillo = Math.max(0, m.brillo - dt * 0.6);
	if (estado === "mapa") actualizarMapa(dt);

	// Postura de marcha suavizada: arrancar, frenar o pasar de caminar a
	// correr inclina y acelera el rebote poco a poco, en vez de saltar de
	// golpe entre poses (ver dibujarHeroeSprite).
	const objetivoMarcha = heroe.moviendo ? (heroe.corriendo ? 1 : 0.45) : 0;
	heroe.marcha += (objetivoMarcha - heroe.marcha) * Math.min(1, dt * 8);

	// Polvo al pisar corriendo: una nubecita cada vez que el pie toca el
	// suelo (cada vuelta completa de la fase = una zancada).
	const zancada = Math.floor(heroe.fase / (Math.PI * 2));
	if (heroe.corriendo && heroeEnSuelo() && zancada !== heroe.ultimaZancada) {
		for (let i = 0; i < 3; i++) {
			polvoPasos.push({
				x: heroe.x - heroe.dir * (6 + Math.random() * 8),
				y: heroe.y,
				vx: -heroe.dir * (10 + Math.random() * 25),
				vy: 8 + Math.random() * 14,
				r: 3 + Math.random() * 3,
				vida: 0,
				dura: 0.35 + Math.random() * 0.2,
			});
		}
	}
	heroe.ultimaZancada = zancada;
	for (const p of polvoPasos) {
		p.vida += dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
	}
	while (polvoPasos.length && polvoPasos[0].vida >= polvoPasos[0].dura) polvoPasos.shift();

	if (estado === "dialogo") {
		const linea = lineaActual();
		dlg.visibles = Math.min(linea.length, dlg.visibles + CFG.velocidadTexto * dt);
		const n = Math.floor(dlg.visibles);
		if (n !== dlg.mostradas) {
			dlg.mostradas = n;
			ui.texto.textContent = linea.slice(0, n);
		}
	}

	let objetivo = Math.max(0, heroe.x - W * 0.35);
	// En la oficina la cámara no se pasa de sus paredes
	if (oficinaActual) {
		const of = oficinaActual.oficina;
		objetivo = clamp(objetivo, of.x0 - 40, Math.max(of.x0 - 40, of.terminalX + 160 - W));
	}
	camara += (objetivo - camara) * Math.min(1, dt * 5);
}
