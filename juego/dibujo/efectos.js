/* Camino a Celaque — efectos (mariposas, lluvia, pétalos) y dibujar(). Ver juego/LEEME.md. */
"use strict";

// ---------- Dibujo: efectos ----------
function dibujarMariposas() {
	for (const m of mariposas) {
		const alfa = suave(0.55, 0.75, m.x / LARGO);
		const sx = m.x - camara + Math.sin(tiempo * 0.8 + m.fase) * 40 * S;
		if (alfa <= 0 || sx < -20 || sx > W + 20) continue;
		const sy = SUELO - 40 * S - Math.sin(tiempo * 1.3 + m.fase) * 30 * S;
		const aleteo = 0.3 + Math.abs(Math.sin(tiempo * 12 + m.fase)) * 0.7;
		ctx.save();
		ctx.globalAlpha = alfa;
		ctx.fillStyle = m.color;
		ctx.beginPath();
		ctx.ellipse(sx - 4 * S * aleteo, sy, 5 * S * aleteo, 4 * S, 0, 0, Math.PI * 2);
		ctx.ellipse(sx + 4 * S * aleteo, sy, 5 * S * aleteo, 4 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

function dibujarLluvia(dt, t) {
	const intensidad = 1 - suave(0.08, 0.35, t);
	if (intensidad <= 0.01) return;
	ctx.strokeStyle = `rgba(215,220,228,${0.45 * intensidad})`;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	for (const g of gotas) {
		g.y += g.vel * dt;
		g.x -= g.vel * 0.12 * dt;
		if (g.y > 1) {
			g.y = -0.05;
			g.x = Math.random() * 1.1;
		}
		const x = g.x * W;
		const y = g.y * H;
		ctx.moveTo(x, y);
		ctx.lineTo(x + 3, y - 14);
	}
	ctx.stroke();
}

function dibujarPetalos(dt) {
	for (const p of petalos) {
		p.y += p.vel * dt;
		p.giro += dt * 3;
		if (p.y > 1.05) {
			p.y = -0.05;
			p.x = Math.random();
		}
		ctx.save();
		ctx.translate(p.x * W + Math.sin(p.giro) * 20, p.y * H);
		ctx.rotate(p.giro);
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.ellipse(0, 0, 6 * S, 3 * S, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

function dibujar(dt) {
	if (estado === "mapa" || estado === "victoria" || estado === "repaso") {
		dibujarMapa(dt);
		dibujarPetalos(dt);
		return;
	}
	if (estado === "transicion") {
		// Pantalla negra mientras cruzas un tubo (ver actualizar(dt))
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, W, H);
		return;
	}

	const t = tono(heroe.x / LARGO);
	// afuera (camino rural) | cueva (oscura) | urbano (al salir, con edificios)
	// | oficina (adentro de un módulo)
	if (oficinaActual) {
		const obra = oficinaActual.oficina.exterior;
		if (obra) {
			dibujarFondoObra(oficinaActual, dt);
			dibujarSueloObra(oficinaActual);
			dibujarEscenasObra(oficinaActual);
			dibujarZanjasObra(oficinaActual);
			dibujarPuertaObra(oficinaActual);
			dibujarInauguracion(oficinaActual);
		} else {
			dibujarFondoOficina(oficinaActual, dt);
			dibujarSueloOficina(oficinaActual);
			dibujarDecoracionOficina(oficinaActual);
			dibujarPuertaSalida(oficinaActual);
			dibujarComputadora(oficinaActual);
		}
		dibujarLetrerosObra("oficina", oficinaActual);
		dibujarGuias();
		dibujarObstaculos(oficinaActual.oficina.obstaculos);
		dibujarMision(oficinaActual);
		dibujarColeccionables();
		dibujarCompaneros(oficinaActual);
		if (obra) dibujarRiesgosObra(oficinaActual);
		dibujarHeroe(t);
		dibujarVirusOficina();
		if (obra) dibujarPeligrosObra(oficinaActual);
		dibujarChispas();
		dibujarAvisos(dt);
		return;
	}
	const modo = vistaUrbana ? "urbano" : dentroCueva ? "cueva" : "afuera";

	if (modo === "cueva") {
		dibujarFondoCueva();
		dibujarMurcielagosFondo(); // siluetas aleteando en el aire oscuro
	} else if (modo === "urbano") {
		dibujarFondoUrbano(t);
	} else {
		dibujarCielo(t);
		dibujarNubes(t);
		dibujarCelaque(t);
		dibujarIndustriaLejana(t);
		dibujarBruma(t, 0.55);
		dibujarFabricasMedias();
		dibujarBruma(t, 0.3);
		dibujarAves(dt, heroe.x > FIN_PLANOS); // guacamayas y loros, ya fuera de los planos
	}

	if (modo === "cueva") dibujarSueloCueva();
	else if (modo === "urbano") dibujarSueloUrbano();
	else dibujarSuelo();

	if (modo === "afuera") {
		dibujarTuboEntrada(); // se pinta sobre el sendero, no antes
		dibujarFabricas();
		dibujarConos();
		dibujarMatas(false);
		dibujarAndamios();
		dibujarObstaculos(OBSTACULOS_AFUERA);
		dibujarZonaPlanos(); // tapa todo lo que hay antes de la puerta de luz
	} else if (modo === "cueva") {
		dibujarEstalagmitas(); // picos de roca detrás de todo
		dibujarCristales(); // gemas que brillan sobre el camino
		dibujarHuecos();
		dibujarObstaculos(OBSTACULOS_CUEVA); // rocas y cajas sólidas (se saltan/recorren)
		dibujarTuboSalida();
		dibujarLetrerosObra("cueva");
	} else if (modo === "urbano") {
		dibujarEdificiosSimples(); // relleno gris detrás
		dibujarProyectos(); // Zorzales, Astria, Céfiro
		dibujarEdificiosSalida(); // Atlas al frente
		dibujarModulos(); // un edificio por módulo de capacitación
		dibujarRejas();
		dibujarAves(dt, true); // pasan volando sobre la ciudad
		dibujarLetrerosObra("urbano");
	}

	dibujarGuias(); // la columna de luz queda detrás del letrero final
	if (modo === "urbano") dibujarMeta(); // el letrero solo se ve ya afuera
	if (modo !== "urbano") dibujarColeccionables();
	dibujarNpcs();
	if (modo !== "urbano") dibujarEnemigos(); // el Guardián vive afuera, antes de LARGO
	dibujarHeroe(t);
	dibujarChispas();
	dibujarAvisos(dt);

	if (modo === "afuera") {
		dibujarMatas(true);
		dibujarMariposas();
		if (heroe.x > FIN_PLANOS) dibujarLluvia(dt, t);

		// Smog gris al inicio y luz cálida al final
		ctx.fillStyle = `rgba(118,122,128,${0.42 * (1 - t)})`;
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = `rgba(255,250,215,${0.08 * t})`;
		ctx.fillRect(0, 0, W, H);

		// Los letreros de obra van encima del smog: brillan aunque el mundo
		// todavía esté gris (son la guía)
		dibujarLetrerosObra("afuera");
		dibujarPuertaIdea();
		if (destello > 0) {
			ctx.fillStyle = `rgba(255,252,235,${0.85 * destello})`;
			ctx.fillRect(0, 0, W, H);
			destello = Math.max(0, destello - dt * 0.9);
		}
	} else if (modo === "cueva") {
		dibujarPolvoCueva(dt); // esporas flotando por delante
		// Viñeta oscura: la cueva se cierra en los bordes de la pantalla
		const vin = ctx.createRadialGradient(W / 2, SUELO * 0.7, SUELO * 0.5, W / 2, SUELO * 0.7, W * 0.75);
		vin.addColorStop(0, "rgba(0,0,0,0)");
		vin.addColorStop(1, "rgba(0,0,0,0.5)");
		ctx.fillStyle = vin;
		ctx.fillRect(0, 0, W, H);
	}

	dibujarPetalos(dt);
}
