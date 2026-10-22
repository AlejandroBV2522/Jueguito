// Revisión rápida del proyecto, sin navegador (Node 22+):
//
//   node tools/revisar_proyecto.mjs
//
// - Cada <script src> de index.html existe, y cada .js del juego está en
//   index.html (una sola vez). Un archivo que falta en la lista no se carga
//   y su mundo o su función simplemente no aparece.
// - Sintaxis de cada archivo (node --check).
// - Orden de carga (tools/orden_de_carga.mjs): ningún archivo usa al
//   cargar algo que se declara en un archivo posterior.
// - Carga config.js y los datos de mundos/ como lo haría el navegador y
//   revisa cada mundo: nombre único, preguntas con su respuesta correcta
//   dentro de las opciones, NPCs y antivalores con diálogo o pregunta.
// - Nada externo (http/https) y toda ruta assets/... del código existe.
// Sale con código 1 si encuentra algún problema.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const problemas = [];
const leer = (r) => readFileSync(join(RAIZ, r), "utf8");

// 1. Lista de scripts de index.html contra los archivos que existen
const html = leer("index.html");
const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
const repetidos = scripts.filter((s, i) => scripts.indexOf(s) !== i);
for (const s of repetidos) problemas.push(`index.html carga dos veces ${s}`);
for (const s of scripts) if (!existsSync(join(RAIZ, s))) problemas.push(`index.html carga ${s}, que no existe`);
const todos = (carpeta) =>
	existsSync(join(RAIZ, carpeta))
		? readdirSync(join(RAIZ, carpeta), { recursive: true })
				.filter((f) => f.endsWith(".js"))
				.map((f) => `${carpeta}/${f.replace(/\\/g, "/")}`)
		: [];
const archivos = ["config.js", "main.js", ...todos("mundos"), ...todos("juego")].filter((f) => existsSync(join(RAIZ, f)));
for (const f of archivos) if (!scripts.includes(f)) problemas.push(`${f} existe pero index.html no lo carga`);

// 2. Sintaxis
for (const s of scripts.filter((s) => existsSync(join(RAIZ, s)))) {
	const r = spawnSync(process.execPath, ["--check", join(RAIZ, s)], { encoding: "utf8" });
	if (r.status !== 0) problemas.push(`sintaxis en ${s}:\n${r.stderr.trim()}`);
}

// 2b. Orden de carga: nada usa al cargar algo de un archivo que va después
const orden = spawnSync(process.execPath, ["--expose-internals", join(RAIZ, "tools", "orden_de_carga.mjs")], { encoding: "utf8" });
try {
	for (const p of JSON.parse(orden.stdout)) problemas.push(`orden de carga: ${p}`);
} catch {
	problemas.push(`no pude revisar el orden de carga:\n${(orden.stderr || orden.stdout).trim()}`);
}

// 3. Datos: config.js y mundos/ en el orden de index.html
const contexto = { window: {}, console };
contexto.window.window = contexto.window;
vm.createContext(contexto);
for (const s of scripts.filter((s) => (s === "config.js" || s.startsWith("mundos/")) && existsSync(join(RAIZ, s)))) {
	try {
		vm.runInContext(leer(s), contexto, { filename: s });
	} catch (e) {
		problemas.push(`al cargar ${s}: ${e.message}`);
	}
}
const w = contexto.window;
const mundos = w.MODULOS || [];
const npcs = w.NPCS || [];
const cueva = w.PREGUNTAS_CUEVA || [];
function revisarPregunta(p, donde) {
	if (!p || !p.pregunta || !Array.isArray(p.opciones) || p.opciones.length < 2) problemas.push(`${donde}: pregunta sin texto o con menos de 2 opciones`);
	else if (!Number.isInteger(p.correcta) || p.correcta < 0 || p.correcta >= p.opciones.length) problemas.push(`${donde}: "correcta" (${p.correcta}) no es una de sus ${p.opciones.length} opciones`);
}
const nombres = mundos.map((m) => m.nombre);
nombres.forEach((n, i) => nombres.indexOf(n) !== i && problemas.push(`dos mundos se llaman "${n}" (el progreso guardado usa el nombre)`));
mundos.forEach((m, i) => {
	const donde = `mundo ${i + 1} (${m.nombre || "sin nombre"})`;
	if (!m.nombre) problemas.push(`${donde}: falta "nombre"`);
	if (!m.completoAlSalirDeLaCueva && !m.oficina) problemas.push(`${donde}: no es Talento y no tiene "oficina"`);
	(m.preguntas || []).forEach((p, k) => revisarPregunta(p, `${donde}, pregunta ${k + 1}`));
});
npcs.forEach((n, i) => (!n.nombre || !Array.isArray(n.dialogo) || !n.dialogo.length) && problemas.push(`NPC ${i + 1} (${n.nombre || "sin nombre"}): falta nombre o diálogo`));
cueva.forEach((e, i) => (e.preguntas || [e]).forEach((p, k) => revisarPregunta(p, `antivalor ${i + 1} (${e.nombre}), pregunta ${k + 1}`)));

// 4. Nada externo y assets que existen
for (const s of [...scripts, "index.html", "style.css"].filter((s) => existsSync(join(RAIZ, s)))) {
	const texto = leer(s);
	for (const m of texto.matchAll(/https?:\/\/[^\s"'`)]+/g)) problemas.push(`${s}: dirección externa ${m[0]}`);
	const sinComentarios = texto.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, "").replace(/^\s*\/\/.*$|\s\/\/.*$/gm, "");
	for (const m of sinComentarios.matchAll(/assets\/[\w./-]+\.(png|jpg|ttf)/g)) if (!existsSync(join(RAIZ, m[0]))) problemas.push(`${s}: ${m[0]} no existe`);
}

console.log(`${scripts.length} scripts en index.html · ${mundos.length} mundos (${nombres.join(", ")}) · ${npcs.length} NPCs del camino · ${cueva.length} antivalores`);
if (problemas.length) {
	console.log(`\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}`);
	process.exit(1);
}
console.log("Sin problemas.");
