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
	["estaciones"],
	["victoria"],
	["mapa", CELULAR],
	["oficinas", CELULAR],
	["cueva", CELULAR],
];

rmSync(carpeta, { recursive: true, force: true });
let fallas = 0;
for (const [escenario, extra] of CORRIDAS) {
	const nombre = escenario + (extra ? "-celular" : "");
	const destino = join(carpeta, nombre);
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
const antes = listar(base);
const despues = new Set(listar(carpeta));
let iguales = 0;
const distintas = [];
for (const f of antes) {
	if (!despues.has(f)) distintas.push(`falta   ${f}`);
	else if (huella(join(base, f)) !== huella(join(carpeta, f))) distintas.push(`cambió  ${f}`);
	else iguales++;
	despues.delete(f);
}
for (const f of despues) distintas.push(`sobra   ${f}`);
console.log(`\n${iguales} de ${antes.length} capturas idénticas a la base.`);
if (distintas.length) console.log(distintas.join("\n"));
process.exit(distintas.length || fallas ? 1 : 0);
