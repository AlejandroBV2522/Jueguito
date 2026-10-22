// Revisa el orden de los <script> de index.html. Los archivos del juego
// comparten sus nombres (const, let, function), pero un archivo solo ve lo
// que ya se cargó: si al cargar usa algo de un archivo que va después, el
// navegador da "ReferenceError: X is not defined" y el resto de ese archivo
// no se ejecuta.
//
//   node --expose-internals tools/orden_de_carga.mjs
//   (lo corre solo tools/revisar_proyecto.mjs)
//
// Sigue lo que se ejecuta al cargar cada archivo: su código de nivel
// superior, los callbacks que se llaman en el momento (forEach, map…) y,
// de forma transitiva, el cuerpo de las funciones que se llaman ahí. No
// entra en lo que corre después (addEventListener, setTimeout,
// requestAnimationFrame) ni en funciones que solo se guardan.
// Usa el analizador de JavaScript que trae Node (acorn): no instala nada.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const acorn = require("internal/deps/acorn/acorn/dist/acorn");
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(RAIZ, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);

// Nombres de nivel superior de cada archivo: nombre → { archivo, nodo }.
// Un nombre repetido en otro archivo no siempre da error: dos function
// iguales se pisan en silencio (gana la última), y un function o const
// después de un const igual hace que ese archivo entero no se ejecute.
const declarado = new Map();
const repetidos = [];
const arboles = scripts.map((s, i) => {
	const ast = acorn.parse(readFileSync(join(RAIZ, s), "utf8"), { ecmaVersion: "latest", sourceType: "script", locations: true });
	const declarar = (nombre, nodo, linea) => {
		const antes = declarado.get(nombre);
		if (antes) repetidos.push(`"${nombre}" se declara dos veces: en ${scripts[antes.archivo]}:${antes.linea} y en ${s}:${linea}`);
		declarado.set(nombre, { archivo: i, nodo, linea });
	};
	for (const st of ast.body) {
		if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") declarar(st.id.name, st, st.loc.start.line);
		if (st.type === "VariableDeclaration")
			for (const d of st.declarations) for (const nombre of nombresPatron(d.id)) declarar(nombre, d.init && /Function/.test(d.init.type) ? d.init : null, d.loc.start.line);
	}
	return ast;
});
function nombresPatron(p) {
	if (!p) return [];
	if (p.type === "Identifier") return [p.name];
	if (p.type === "ObjectPattern") return p.properties.flatMap((q) => nombresPatron(q.value || q.argument));
	if (p.type === "ArrayPattern") return p.elements.flatMap(nombresPatron);
	if (p.type === "AssignmentPattern") return nombresPatron(p.left);
	if (p.type === "RestElement") return nombresPatron(p.argument);
	return [];
}

const esFuncion = (n) => n && (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression");
// Callbacks que NO corren en el momento, sino con un evento o un temporizador
function correDespues(llamada) {
	const c = llamada.callee;
	const nombre = c.type === "Identifier" ? c.name : c.type === "MemberExpression" && !c.computed ? c.property.name : "";
	return /^(addEventListener|setTimeout|setInterval|requestAnimationFrame|then|catch|finally)$/.test(nombre);
}

// Nombres propios de una función (parámetros y lo que declara adentro, sin
// entrar a sus funciones internas): ahí un nombre igual a uno global es otro.
function localesDe(fn, afuera) {
	const locales = new Set(afuera);
	for (const p of fn.params || []) nombresPatron(p).forEach((n) => locales.add(n));
	(function juntar(n) {
		if (!n || typeof n.type !== "string") return;
		if (n.type === "VariableDeclaration") n.declarations.forEach((d) => nombresPatron(d.id).forEach((x) => locales.add(x)));
		if (n.type === "FunctionDeclaration") return void locales.add(n.id.name);
		if (esFuncion(n) || n.type === "ClassDeclaration") return;
		if (n.type === "CatchClause" && n.param) nombresPatron(n.param).forEach((x) => locales.add(x));
		for (const [k, v] of Object.entries(n)) if (k !== "loc") Array.isArray(v) ? v.forEach(juntar) : v && typeof v.type === "string" && juntar(v);
	})(fn.body);
	return locales;
}

const problemas = [...repetidos];
// Recorre "nodo" como código que corre mientras se carga el archivo
// "cargado". Con "evento", es un callback que se registró al cargar (un
// clic, un temporizador): entre un <script defer> y el siguiente el
// navegador puede atender eventos, así que tampoco debe usar archivos
// posteriores (antes, dentro de un solo main.js, eso no podía pasar).
function recorrer(nodo, cargado, visto, donde, locales = new Set(), evento = false) {
	if (!nodo || typeof nodo.type !== "string") return;
	if (nodo.type === "FunctionDeclaration" || esFuncion(nodo)) return; // solo se define
	if (nodo.type === "Identifier") {
		if (locales.has(nodo.name)) return;
		const d = declarado.get(nodo.name);
		if (!d || d.archivo <= cargado) return;
		const linea = donde || nodo.loc.start.line;
		problemas.push(
			evento
				? `${scripts[cargado]}:${linea} registra al cargar un evento que usa "${nodo.name}", declarado después en ${scripts[d.archivo]} (si el evento llega mientras la página carga, da ReferenceError)`
				: `${scripts[cargado]}:${linea} usa "${nodo.name}" al cargar, pero se declara después, en ${scripts[d.archivo]}`
		);
		return;
	}
	if (nodo.type === "CallExpression" || nodo.type === "NewExpression") {
		const c = nodo.callee;
		// Una función propia que corre (ahora, o con el evento): se sigue su cuerpo
		const seguir = (nombre, linea, comoEvento) => {
			const d = declarado.get(nombre);
			const clave = (comoEvento ? "evento:" : "") + nombre;
			if (d && d.nodo && d.archivo <= cargado && !visto.has(clave)) {
				visto.add(clave);
				recorrer(d.nodo.body, cargado, visto, donde || `${linea} (vía ${nombre})`, localesDe(d.nodo, []), comoEvento);
			}
		};
		if (c.type === "Identifier") seguir(c.name, nodo.loc.start.line, evento);
		if (esFuncion(c)) recorrer(c.body, cargado, visto, donde, localesDe(c, locales), evento); // (() => { … })()
		recorrer(c, cargado, visto, donde, locales, evento);
		const despues = correDespues(nodo);
		for (const a of nodo.arguments) {
			if (esFuncion(a)) recorrer(a.body, cargado, visto, donde || (despues ? `${nodo.loc.start.line}` : ""), localesDe(a, locales), evento || despues);
			else {
				if (despues && a.type === "Identifier" && !locales.has(a.name)) seguir(a.name, nodo.loc.start.line, true);
				recorrer(a, cargado, visto, donde, locales, evento);
			}
		}
		return;
	}
	for (const [clave, valor] of Object.entries(nodo)) {
		if (clave === "loc" || clave === "start" || clave === "end") continue;
		if (nodo.type === "MemberExpression" && clave === "property" && !nodo.computed) continue;
		if (nodo.type === "Property" && clave === "key" && !nodo.computed) continue;
		if (nodo.type === "VariableDeclarator" && clave === "id") continue;
		if (Array.isArray(valor)) valor.forEach((v) => recorrer(v, cargado, visto, donde, locales, evento));
		else if (valor && typeof valor.type === "string") recorrer(valor, cargado, visto, donde, locales, evento);
	}
}
arboles.forEach((ast, i) => {
	for (const st of ast.body) recorrer(st, i, new Set(), "");
});
const unicos = [...new Set(problemas)];
console.log(JSON.stringify(unicos));