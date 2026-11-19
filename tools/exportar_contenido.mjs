// Lee el contenido del juego (config.js + mundos/*) con sus ids de la base y
// lo deja en JSON con la forma de bd/datos_mundos.sql (mundos, personajes con
// diálogos, preguntas con respuestas). Lo usa el servidor de prueba del backend
// (Backend_camino_a_celaque/tests/e2e/servidor_prueba.py, ver su PRUEBAS.md).
//   node tools/exportar_contenido.mjs . contenido.json
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const [raiz, salida] = process.argv.slice(2);
const html = readFileSync(join(raiz, "index.html"), "utf8");
const archivos = ["config.js", ...[...html.matchAll(/src="(mundos\/[^"]+\.js)"/g)].map((m) => m[1]).filter((f) => !f.endsWith("tema.js"))];

const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of archivos) vm.runInContext(readFileSync(join(raiz, f), "utf8"), ctx, { filename: f });

const mundos = ctx.MODULOS.map((m, i) => ({ id: i + 1, orden: i + 1, nombre: m.nombre }));
const idMundo = (nombre) => mundos.find((m) => m.nombre === nombre).id;
const talento = mundos.find((m) => m.nombre === "Talento") ? "Talento" : mundos[0].nombre;

const personajes = new Map();
const preguntas = new Map();
const errores = [];

function personaje(o, mundo) {
	const dialogos = Array.isArray(o.dialogo) ? o.dialogo : Array.isArray(o.frases) ? o.frases : [];
	if (personajes.has(o.id) && personajes.get(o.id).nombre !== o.nombre) errores.push(`personaje ${o.id} repetido: ${o.nombre}`);
	personajes.set(o.id, { id: o.id, mundo_id: idMundo(mundo), nombre: o.nombre, rol: "npc", dialogos: dialogos.filter((d) => typeof d === "string") });
}

function pregunta(o, mundo) {
	if (preguntas.has(o.id)) return errores.push(`pregunta ${o.id} repetida: ${o.pregunta.slice(0, 40)}`);
	const ordenar = Array.isArray(o.orden);
	const textos = ordenar ? o.orden : o.opciones;
	preguntas.set(o.id, {
		id: o.id,
		mundo_id: idMundo(mundo),
		tipo: ordenar ? "ordenar" : "una",
		enunciado: o.pregunta,
		explicacion: o.explicacion || null,
		respuestas: textos.map((t, k) => ({
			id: o.id * 100 + k + 1,
			orden: k + 1,
			texto: t,
			es_correcta: !ordenar && k === o.correcta,
			posicion_correcta: ordenar ? k + 1 : null,
		})),
	});
}

// Recorre todo el árbol de un mundo: cualquier objeto con id numérico es una
// pregunta (pregunta + opciones/orden) o un personaje (nombre + dialogo/frases).
function recorrer(v, mundo, visto = new Set()) {
	if (!v || typeof v !== "object" || visto.has(v)) return;
	visto.add(v);
	if (Number.isInteger(v.id)) {
		if (typeof v.pregunta === "string" && (Array.isArray(v.opciones) || Array.isArray(v.orden))) pregunta(v, mundo);
		else if (typeof v.nombre === "string" && (v.dialogo || v.frases)) personaje(v, mundo);
	}
	for (const k of Object.keys(v)) recorrer(v[k], mundo, visto);
}

for (const m of ctx.MODULOS) recorrer(m, m.nombre);
recorrer(ctx.NPCS, talento);
recorrer(ctx.PREGUNTAS_CUEVA, talento);

let orden = 0;
const listaPreguntas = [...preguntas.values()].sort((a, b) => a.mundo_id - b.mundo_id || a.id - b.id).map((p) => ({ ...p, orden: ++orden }));
const datos = { mundos, personajes: [...personajes.values()], preguntas: listaPreguntas };
writeFileSync(salida, JSON.stringify(datos, null, 1));
console.log(`mundos ${mundos.length} · personajes ${datos.personajes.length} · preguntas ${listaPreguntas.length} (ordenar: ${listaPreguntas.filter((p) => p.tipo === "ordenar").length})`);
for (const m of mundos) console.log(`  ${m.id} ${m.nombre}: ${listaPreguntas.filter((p) => p.mundo_id === m.id).length} preguntas, ${datos.personajes.filter((p) => p.mundo_id === m.id).length} personajes`);
if (errores.length) console.log("AVISOS:\n  " + errores.join("\n  "));
