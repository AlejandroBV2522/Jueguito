/* Camino a Celaque — guacamayas y loros. Ver juego/LEEME.md. */
"use strict";

// ---------- Aves: guacamayas y loros ----------
// Bandadas chicas que cruzan el cielo al salir de la zona de planos y en
// la ciudad. Se mueven en coordenadas de pantalla (más un poco de
// parallax con la cámara), aparecen solas cada tantos segundos.
const TIPOS_AVE = [
	// Guacamaya roja (Ara macao, ave nacional de Honduras)
	{ cuerpo: "#d7262e", ala: "#1d5fbf", banda: "#f2c230", cola: "#c41f28", pico: "#f1e7d0", cola_largo: 38 },
	// Guacamaya azul y amarilla
	{ cuerpo: "#1f6fd1", ala: "#1a55a8", banda: "#f2c230", cola: "#1f6fd1", pecho: "#f2c230", pico: "#2a2a2a", cola_largo: 36 },
	// Loro verde
	{ cuerpo: "#2fa84f", ala: "#1f7a3a", banda: "#1d5fbf", cola: "#2fa84f", cabeza: "#e8d23a", pico: "#f1e7d0", cola_largo: 16 },
];
let aves = [];
let proximaBandada = 2;
let camaraAves = 0;

function actualizarAves(dt, activas) {
	// Parallax: el cielo se corre un poco al avanzar la cámara
	const dCam = camara - camaraAves;
	camaraAves = camara;
	if (Math.abs(dCam) > 200) aves = []; // salto de cámara (tubo, oficina): limpiar
	for (const a of aves) {
		a.x += a.dir * a.vel * S * dt - dCam * 0.35; // vuelo + parallax
		a.fase += dt * a.aleteo;
	}
	aves = aves.filter((a) => a.x > -150 * S && a.x < W + 150 * S);
	proximaBandada -= dt;
	if (activas && proximaBandada <= 0) {
		proximaBandada = 5 + Math.random() * 6;
		const dir = Math.random() < 0.5 ? 1 : -1;
		const tipo = TIPOS_AVE[Math.floor(Math.random() * TIPOS_AVE.length)];
		const y = SUELO * (0.12 + Math.random() * 0.3);
		const cuantas = 1 + Math.floor(Math.random() * 4);
		for (let i = 0; i < cuantas; i++) {
			aves.push({
				tipo,
				dir,
				x: dir > 0 ? -60 * S - i * 46 * S : W + 60 * S + i * 46 * S,
				y: y + (i % 2) * 22 * S - i * 6 * S,
				vel: 110 + Math.random() * 50,
				tam: 0.85 + Math.random() * 0.35,
				fase: Math.random() * Math.PI * 2,
				aleteo: 9 + Math.random() * 3,
			});
		}
	}
}

function dibujarAve(a) {
	const t = a.tipo;
	const ala = Math.sin(a.fase); // -1 abajo .. 1 arriba
	ctx.save();
	ctx.translate(a.x, a.y + Math.sin(a.fase * 0.5) * 4 * S);
	ctx.scale(a.dir * a.tam * S, a.tam * S);

	// Ala de atrás (más oscura)
	ctx.fillStyle = conAlfa(t.ala, 0.85);
	ctx.beginPath();
	ctx.ellipse(-2, -2 - ala * 9, 15, 5, -0.25 - ala * 0.7, 0, Math.PI * 2);
	ctx.fill();

	// Cola larga
	ctx.fillStyle = t.cola;
	ctx.beginPath();
	ctx.moveTo(-10, -1);
	ctx.lineTo(-10 - t.cola_largo, 3);
	ctx.lineTo(-10 - t.cola_largo * 0.85, 6);
	ctx.lineTo(-8, 3);
	ctx.closePath();
	ctx.fill();

	// Cuerpo, pecho y cabeza
	ctx.fillStyle = t.cuerpo;
	ctx.beginPath();
	ctx.ellipse(0, 0, 15, 6.5, 0, 0, Math.PI * 2);
	ctx.fill();
	if (t.pecho) {
		ctx.fillStyle = t.pecho;
		ctx.beginPath();
		ctx.ellipse(3, 2.5, 9, 3.5, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = t.cabeza || t.cuerpo;
	circulo(14, -3, 6);
	ctx.fillStyle = "#ffffff"; // cara clara de la guacamaya
	circulo(15.5, -3, 3);
	ctx.fillStyle = "#111";
	circulo(16, -3.5, 1.3);
	ctx.fillStyle = t.pico;
	ctx.beginPath();
	ctx.moveTo(19, -5);
	ctx.quadraticCurveTo(25, -4, 22, 1);
	ctx.lineTo(19, -1);
	ctx.closePath();
	ctx.fill();

	// Ala de adelante, con banda de color en la punta
	ctx.save();
	ctx.translate(0, -2);
	ctx.rotate(-0.35 - ala * 0.8);
	ctx.fillStyle = t.ala;
	ctx.beginPath();
	ctx.ellipse(-4, -9, 6, 14, 0.3, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = t.banda;
	ctx.beginPath();
	ctx.ellipse(-6, -17, 3.5, 6, 0.3, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	ctx.restore();
}

function dibujarAves(dt, activas) {
	actualizarAves(dt, activas);
	for (const a of aves) dibujarAve(a);
}
