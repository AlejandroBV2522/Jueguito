// Red de seguridad para reorganizar el código sin cambiar el juego: corre
// todos los escenarios de tools/probar_juego.mjs con reloj fijo (computadora
// y celular) y compara cada captura, byte por byte, contra una base guardada.
//
//   node tools/comparar_capturas.mjs base   guarda la base (antes del cambio)
//   node tools/comparar_capturas.mjs        corre de nuevo y compara con la base
//
// Las capturas quedan en capturas/comparar/{base,nuevo}/ (no se sube a git).
// Sale con código 1 si alguna captura cambió, falta o sobra, o si algún
// escenario tuvo errores de JavaScript. Solo sirve para cambios que NO deben
// verse distinto (mover código, partir archivos); si el cambio es visual, las
// diferencias son esperadas y hay que mirarlas.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const modo = process.argv[2] === "base" ? "base" : "nuevo";
const carpeta = join(RAIZ, "capturas", "comparar", modo);
const CELULAR = { ANCHO: "844", ALTO: "390", DPR: "2", MOVIL: "1" };
const CORRIDAS = [
	["mapa"],
	["talento"],
	["cueva"],
	["oficina"],
	["oficinas"],
	["recorridos"],
	["estaciones"],
	["victoria"],
	["mapa", CELULAR],
	["oficinas", CELULAR],
	["cueva", CELULAR],
];

rmSync(carpeta, { recursive: true, force: true });
let fallas = 0;
function correr(escenario, extra) {
	const nombre = escenario + (extra ? "-celular" : "");
	const destino = join(carpeta, nombre);
	rmSync(destino, { recursive: true, force: true });
	mkdirSync(destino, { recursive: true });
	const r = spawnSync(process.execPath, [join(RAIZ, "tools", "probar_juego.mjs"), escenario, destino], {
		env: { ...process.env, RELOJ: "fijo", ...extra },
		encoding: "utf8",
	});
	const ultima = (r.stdout || "").trim().split("\n").pop();
	console.log(`${r.status === 0 ? "ok   " : "FALLA"} ${nombre}: ${ultima}`);
	if (r.status !== 0) {
		fallas++;
		console.log((r.stdout || "") + (r.stderr || ""));
	}
}
for (const [escenario, extra] of CORRIDAS) correr(escenario, extra);

if (modo === "base") {
	console.log(fallas ? `\nBase guardada con ${fallas} escenario(s) fallando.` : "\nBase guardada en capturas/comparar/base.");
	process.exit(fallas ? 1 : 0);
}

const base = join(RAIZ, "capturas", "comparar", "base");
if (!existsSync(base)) {
	console.error("No hay base: corre primero `node tools/comparar_capturas.mjs base` con el código de antes.");
	process.exit(2);
}
const huella = (ruta) => createHash("sha256").update(readFileSync(ruta)).digest("hex");
const listar = (raiz) => readdirSync(raiz, { recursive: true }).filter((f) => f.endsWith(".png")).sort();
function comparar() {
	const antes = listar(base);
	const despues = new Set(listar(carpeta));
	const distintas = [];
	for (const f of antes) {
		if (!despues.has(f)) distintas.push(["falta  ", f]);
		else if (huella(join(base, f)) !== huella(join(carpeta, f))) distintas.push(["cambió ", f]);
		despues.delete(f);
	}
	for (const f of despues) distintas.push(["sobra  ", f]);
	return { total: antes.length, distintas };
}
// Muy de vez en cuando el navegador hace algo que el reloj fijo no controla
// (cuándo termina de cargar una imagen, por ejemplo) y una captura sale
// apenas distinta. Se repite ese escenario hasta 2 veces: una diferencia de
// verdad sale igual cada vez.
let r = comparar();
for (let intento = 1; intento <= 2 && r.distintas.length; intento++) {
	const carpetas = new Set(r.distintas.map(([, f]) => f.split(/[\\/]/)[0]));
	console.log(`\nRepito ${[...carpetas].join(", ")} para descartar una diferencia casual (${intento}/2):`);
	for (const [escenario, extra] of CORRIDAS) if (carpetas.has(escenario + (extra ? "-celular" : ""))) correr(escenario, extra);
	r = comparar();
}
console.log(`\n${r.total - r.distintas.length} de ${r.total} capturas idénticas a la base.`);
if (r.distintas.length) console.log(r.distintas.map((d) => d.join(" ")).join("\n"));
process.exit(r.distintas.length || fallas ? 1 : 0);