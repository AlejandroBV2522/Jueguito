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
const archivos = ["config.js", ...todos("mundos"), ...todos("juego")].filter((f) => existsSync(join(RAIZ, f)));
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
// Dos tema.js que registran el mismo tema: el segundo pisa al primero en
// silencio (pasa si se copia la carpeta de un mundo y no se cambia el nombre)
const temasDe = {};
for (const s of scripts.filter((s) => s.startsWith("mundos/") && existsSync(join(RAIZ, s))))
	for (const m of leer(s).matchAll(/window\.TEMAS_OFICINA\.(\w+)\s*=/g)) (temasDe[m[1]] = temasDe[m[1]] || []).push(s);
for (const [tema, donde] of Object.entries(temasDe)) if (donde.length > 1) problemas.push(`el tema "${tema}" se registra en ${donde.join(" y en ")}: el último pisa al otro`);
const mundos = w.MODULOS || [];
const npcs = w.NPCS || [];
const cueva = w.PREGUNTAS_CUEVA || [];
function revisarPregunta(p, donde) {
	// Pregunta de ordenar (riesgos de la obra): los pasos van en el orden correcto
	if (p && Array.isArray(p.orden)) {
		if (!p.pregunta || p.orden.length < 2 || p.orden.some((x) => typeof x !== "string" || !x)) problemas.push(`${donde}: pregunta de ordenar sin texto o con menos de 2 pasos`);
		return;
	}
	if (!p || !p.pregunta || !Array.isArray(p.opciones) || p.opciones.length < 2) problemas.push(`${donde}: pregunta sin texto o con menos de 2 opciones`);
	else if (!Number.isInteger(p.correcta) || p.correcta < 0 || p.correcta >= p.opciones.length) problemas.push(`${donde}: "correcta" (${p.correcta}) no es una de sus ${p.opciones.length} opciones`);
}
const nombres = mundos.map((m) => m.nombre);
nombres.forEach((n, i) => nombres.indexOf(n) !== i && problemas.push(`dos mundos se llaman "${n}" (el progreso guardado usa el nombre)`));
mundos.forEach((m, i) => {
	const donde = `mundo ${i + 1} (${m.nombre || "sin nombre"})`;
	if (!m.nombre) problemas.push(`${donde}: falta "nombre"`);
	if (!m.completoAlSalirDeLaCueva && !m.oficina) problemas.push(`${donde}: no es Talento y no tiene "oficina"`);
	if (m.oficina) {
		const tema = m.oficina.tema || "planos";
		const t = (w.TEMAS_OFICINA || {})[tema];
		if (!t) problemas.push(`${donde}: su oficina usa el tema "${tema}", pero ningún tema.js lo registra en window.TEMAS_OFICINA`);
		else for (const parte of ["flotante", "pizarra", "especial"]) if (typeof t[parte] !== "function") problemas.push(`${donde}: al tema "${tema}" le falta ${parte}()`);
		for (const r of m.oficina.robots || []) if (!["tierra", "aereo", "humanoide"].includes(r)) problemas.push(`${donde}: el robot "${r}" no existe (puede ser "tierra", "aereo" o "humanoide")`);
		if (m.oficina.exterior) {
			const zonas = m.oficina.zonas || [];
			if (!zonas.length) problemas.push(`${donde}: su oficina es "exterior" pero no tiene "zonas"`);
			if (!m.anfitrion || !(m.anfitrion.dialogo || []).length) problemas.push(`${donde}: la zona 1 la explica el anfitrión y no tiene diálogo`);
			if (m.oficina.estacion !== "inauguracion") problemas.push(`${donde}: una obra exterior termina en la estación "inauguracion"`);
			zonas.forEach((z, k) => {
				const dz = `${donde}, zona ${k + 1} (${z.nombre || "sin nombre"})`;
				if (!z.nombre) problemas.push(`${dz}: falta "nombre"`);
				if (!["idea", "caseta", "planos", "reunion", "obra"].includes(z.escena)) problemas.push(`${dz}: la escena "${z.escena}" no existe (idea, caseta, planos, reunion u obra)`);
				if (k > 0 && !(z.companero && (z.companero.dialogo || []).length)) problemas.push(`${dz}: falta "companero" con su diálogo`);
				if (z.peligro && (!["zanja", "talanquera"].includes(z.peligro.tipo))) problemas.push(`${dz}: su "peligro" debe ser { tipo: "zanja" } o { tipo: "talanquera" }`);
				const e = z.enemigo;
				if (!e) problemas.push(`${dz}: falta su "enemigo"`);
				else {
					if (!["tarea", "mensaje", "papel", "blob", "reloj"].includes(e.dibujo)) problemas.push(`${dz}: el dibujo "${e.dibujo}" del enemigo no existe`);
					if (!(e.preguntas || []).length) problemas.push(`${dz}: su enemigo no tiene preguntas`);
					(e.preguntas || []).forEach((q, j) => revisarPregunta(q, `${dz}, pregunta ${j + 1}`));
				}
			});
		}
		const porRobot = m.preguntasPorModulo || (w.CONFIG_JUEGO && w.CONFIG_JUEGO.preguntasPorModulo) || 2;
		const robots = (m.oficina.robots || []).length;
		if (robots > 1 && (m.preguntas || []).length < robots * porRobot) problemas.push(`${donde}: tiene ${robots} robots y ${(m.preguntas || []).length} preguntas; cada robot necesita ${porRobot}`);
	}
	if (m.mision && (m.comentarios || []).length) problemas.push(`${donde}: tiene "mision" y "comentarios"; los puntos A y B usan el lugar de los compañeros`);
	(m.preguntas || []).forEach((p, k) => revisarPregunta(p, `${donde}, pregunta ${k + 1}`));
	// Medallas ocultas: si apuntan a algo que no existe, el juego no las crea
	const lugares = m.completoAlSalirDeLaCueva ? { andamio: 99, roca: 4 } : { mueble: m.oficina && m.oficina.exterior ? (m.oficina.zonas || []).length * 2 : 7, ...(m.mision && m.mision.a && m.mision.a.nube ? { nube: 3 } : {}) };
	(m.coleccionables || []).forEach((c, k) => {
		const d = `${donde}, coleccionable ${k + 1} (${c.nombre || "sin nombre"})`;
		if (!c.nombre) problemas.push(`${d}: falta "nombre"`);
		else if (m.coleccionables.findIndex((x) => x.nombre === c.nombre) !== k) problemas.push(`${d}: el nombre se repite en este mundo`);
		if (!(c.sobre in lugares)) problemas.push(`${d}: "sobre" debe ser ${Object.keys(lugares).map((l) => `"${l}"`).join(" o ")} en este mundo`);
		else if (!Number.isInteger(c.n) || c.n < 1 || c.n > lugares[c.sobre]) problemas.push(`${d}: "n" debe ir de 1 a ${lugares[c.sobre]}`);
		if (c.altura !== undefined && typeof c.altura !== "number") problemas.push(`${d}: "altura" debe ser un número (sin comillas)`);
		if (m.coleccionables.findIndex((x) => x.sobre === c.sobre && x.n === c.n) !== k) problemas.push(`${d}: hay otra medalla en el mismo ${c.sobre} ${c.n} (se guardan por ese lugar)`);
	});
});
npcs.forEach((n, i) => (!n.nombre || !Array.isArray(n.dialogo) || !n.dialogo.length) && problemas.push(`NPC ${i + 1} (${n.nombre || "sin nombre"}): falta nombre o diálogo`));
cueva.forEach((e, i) => (e.preguntas || [e]).forEach((p, k) => revisarPregunta(p, `antivalor ${i + 1} (${e.nombre}), pregunta ${k + 1}`)));

// 4. Nada externo y assets que existen
for (const s of [...scripts, "index.html", "style.css"].filter((s) => existsSync(join(RAIZ, s)))) {
	const texto = leer(s);
	for (const m of texto.matchAll(/https?:\/\/[^\s"'`)]+/g)) problemas.push(`${s}: dirección externa ${m[0]}`);
	const sinComentarios = texto.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, "").replace(/^\s*\/\/.*$|\s\/\/.*$/gm, "");
	for (const m of sinComentarios.matchAll(/assets\/[\w./-]+\.(png|jpg|jpeg|webp|svg|ttf|mp3|ogg|wav)/g)) if (!existsSync(join(RAIZ, m[0]))) problemas.push(`${s}: ${m[0]} no existe`);
}

// 5. Sonidos propios (config.js → sonidos): cada uno debe ser un efecto que existe
const efectos = [...leer("juego/base/sonido.js").matchAll(/^\t(\w+): \[/gm)].map((m) => m[1]);
for (const [nombre, ruta] of Object.entries((w.CONFIG_JUEGO && w.CONFIG_JUEGO.sonidos) || {})) {
	if (!efectos.includes(nombre)) problemas.push(`config.js → sonidos: "${nombre}" no es un efecto (hay: ${efectos.join(", ")})`);
	if (ruta && typeof ruta !== "string") problemas.push(`config.js → sonidos.${nombre}: debe ser una ruta entre comillas`);
	else if (ruta && !/^assets\/sonidos\/[\w.-]+\.(mp3|ogg|wav)$/.test(ruta)) problemas.push(`config.js → sonidos.${nombre}: "${ruta}" debe ser assets/sonidos/<archivo>.mp3, .ogg o .wav`);
	else if (ruta && !existsSync(join(RAIZ, ruta))) problemas.push(`config.js → sonidos.${nombre}: ${ruta} no existe`);
}
for (const m of mundos)
	for (const c of m.coleccionables || [])
		if (c.imagen && !existsSync(join(RAIZ, c.imagen))) problemas.push(`${m.nombre}, coleccionable "${c.nombre}": la imagen ${c.imagen} no existe`);

console.log(`${scripts.length} scripts en index.html · ${mundos.length} mundos (${nombres.join(", ")}) · ${npcs.length} NPCs del camino · ${cueva.length} antivalores`);
if (problemas.length) {
	console.log(`\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}`);
	process.exit(1);
}
console.log("Sin problemas.");
