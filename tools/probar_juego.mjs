// Prueba el juego en Chrome (o Edge) sin ventana: lo controla por DevTools
// Protocol con teclas y clics de verdad, saca capturas y avisa si hubo
// errores de JavaScript. No necesita instalar nada (Node 22+ y Python).
//
//   node tools/probar_juego.mjs <escenario> [carpeta-de-capturas]
//
// Escenarios:
//   mapa      mapa → nombre obligatorio → acercar → carta → entra a Talento
//   talento   camina hasta el primer personaje y avanza su diálogo
//   oficina   juega la oficina de Proyectos completa y vuelve al mapa
//   oficinas  entra a las 5 oficinas (con el nombre de pruebas) y captura cada una
//   victoria  completa la última oficina y muestra la tarjeta final
//   estaciones  arma el robot de IA y el antivirus de Seguridad (capturas a medias y al final)
//   cueva     cruza el camino de Talento, la Cueva (respondiendo bien) y sale al mapa
//
// Variables opcionales: ANCHO, ALTO (pantalla, por defecto 1366x768), DPR
// (densidad, por defecto 1), MOVIL=1 (pantalla táctil) y ARCHIVO=1 (abre
// index.html como archivo, igual que con doble clic, en vez de con servidor). Las capturas quedan
// en la carpeta indicada (por defecto ./capturas, que no se sube a git).
// Sale con código 1 si hubo errores de JavaScript (los 404 de logos que
// todavía no existen se ignoran).
//
// Reloj fijo (por defecto): el juego no corre solo, avanza cuadro por cuadro
// cuando la prueba lo pide, con el mismo azar (Math.random) y la misma fecha
// siempre. Así cada corrida saca capturas idénticas, sin importar qué tan
// rápida sea la máquina (lo usa tools/comparar_capturas.mjs). RELOJ=real
// deja correr el juego en tiempo real, como en un navegador normal.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const escenario = process.argv[2] || "mapa";
const salida = process.argv[3] || join(RAIZ, "capturas");
const W = Number(process.env.ANCHO || 1366);
const H = Number(process.env.ALTO || 768);
const DPR = Number(process.env.DPR || 1);
const MOVIL = process.env.MOVIL === "1";
const PUERTO_WEB = 5600 + Math.floor(Math.random() * 300);
const PUERTO_CDP = 9400 + Math.floor(Math.random() * 300);
const CLAVE = "camino-a-celaque:progreso";
const FIJO = process.env.RELOJ !== "real";
const ARCHIVO = process.env.ARCHIVO === "1"; // abre index.html directo (como con doble clic)
mkdirSync(salida, { recursive: true });

// Se inyecta antes que los scripts del juego (solo en la prueba, el juego no
// cambia): reemplaza requestAnimationFrame, setTimeout, performance.now, Date
// y Math.random por versiones que solo avanzan con window.__avanzar(ms).
// Las animaciones CSS también se pausan y se adelantan a mano.
const RELOJ_FIJO = `(() => {
	let reloj = 0;
	let sig = 1;
	let semilla = 20261022;
	Math.random = () => {
		semilla = (semilla + 0x6d2b79f5) | 0;
		let t = semilla;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const BASE = Date.UTC(2026, 9, 22, 16, 0, 0);
	const DateReal = Date;
	window.Date = class extends DateReal {
		constructor(...a) {
			if (a.length) super(...a);
			else super(BASE + reloj);
		}
		static now() {
			return BASE + reloj;
		}
	};
	performance.now = () => reloj;
	let marcos = [];
	const timers = new Map();
	window.requestAnimationFrame = (fn) => (marcos.push(fn), marcos.length);
	window.cancelAnimationFrame = () => {};
	window.setTimeout = (fn, ms, ...args) => {
		timers.set(sig, { t: reloj + (Number(ms) || 0), fn, args });
		return sig++;
	};
	window.clearTimeout = (id) => timers.delete(id);
	const llamar = (fn, args) => {
		try {
			fn(...args);
		} catch (e) {
			console.error((e && e.stack) || String(e));
		}
	};
	// El cursor del campo del nombre parpadea con su propio reloj: se oculta
	document.addEventListener("DOMContentLoaded", () => {
		const hoja = new CSSStyleSheet();
		hoja.replaceSync("* { caret-color: transparent !important; }");
		document.adoptedStyleSheets = [...document.adoptedStyleSheets, hoja];
	});
	const vistas = new WeakSet();
	function animacionesCss(ms) {
		for (const a of document.getAnimations()) {
			if (!vistas.has(a)) {
				vistas.add(a);
				a.pause();
				a.currentTime = 0;
			}
			a.currentTime = (a.currentTime || 0) + ms;
		}
	}
	window.__avanzar = (ms) => {
		const fin = reloj + ms;
		while (reloj < fin - 1e-6) {
			const paso = Math.min(1000 / 60, fin - reloj);
			reloj += paso;
			const listos = [...timers].filter(([, tm]) => tm.t <= reloj).sort((a, b) => a[1].t - b[1].t || a[0] - b[0]);
			for (const [id, tm] of listos) {
				timers.delete(id);
				llamar(tm.fn, tm.args);
			}
			const cuadro = marcos;
			marcos = [];
			for (const fn of cuadro) llamar(fn, [reloj]);
			animacionesCss(paso);
		}
		return reloj;
	};
})();`;

const NAVEGADORES = [
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
];
const navegador = NAVEGADORES.find((r) => existsSync(r));
if (!navegador) {
	console.error("No encontré Chrome ni Edge.");
	process.exit(2);
}
const perfil = join(tmpdir(), `celaque-prueba-${PUERTO_CDP}`);
const web = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(PUERTO_WEB), "--bind", "127.0.0.1"], { cwd: RAIZ, stdio: "ignore" });
const chrome = spawn(navegador, ["--headless=new", `--remote-debugging-port=${PUERTO_CDP}`, `--user-data-dir=${perfil}`, "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
let id = 0;
const pendientes = new Map();
const errores = [];
function terminar(codigo) {
	try {
		ws && ws.close();
	} catch {}
	chrome.kill();
	web.kill();
	setTimeout(() => {
		try {
			rmSync(perfil, { recursive: true, force: true });
		} catch {}
		process.exit(codigo);
	}, 500);
}

async function conectar() {
	for (let i = 0; i < 120 && !ws; i++) {
		try {
			const lista = await (await fetch(`http://127.0.0.1:${PUERTO_CDP}/json`)).json();
			const pagina = lista.find((p) => p.type === "page");
			if (pagina) ws = new WebSocket(pagina.webSocketDebuggerUrl);
		} catch {}
		if (!ws) await espera(250);
	}
	if (!ws) throw new Error("Chrome no abrió el puerto de depuración");
	await new Promise((r) => (ws.onopen = r));
	ws.onmessage = (ev) => {
		const m = JSON.parse(ev.data);
		if (m.id && pendientes.has(m.id)) {
			pendientes.get(m.id)(m);
			pendientes.delete(m.id);
		}
		if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
		if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errores.push(m.params.args.map((a) => a.value || a.description).join(" "));
		if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !/assets\/logos\/|favicon/.test(m.params.entry.url || "")) errores.push(m.params.entry.text + " " + (m.params.entry.url || ""));
	};
}
const cmd = (method, params = {}) =>
	new Promise((r) => {
		const i = ++id;
		pendientes.set(i, r);
		ws.send(JSON.stringify({ id: i, method, params }));
	});
const evalua = async (expr) => (await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
// Deja correr el juego ms milisegundos: con reloj fijo, cuadro por cuadro;
// si no, esperando de verdad. ahora() es el tiempo del juego que ya pasó.
let virtual = 0;
async function paso(ms) {
	if (!FIJO) return espera(ms);
	virtual += ms;
	await evalua(`window.__avanzar(${ms})`);
}
const ahora = () => (FIJO ? virtual : Date.now());
// Tras cargar la página: espera de verdad a que bajen imágenes y fuentes
// (con reloj fijo el juego no ha dibujado nada todavía).
async function cargada() {
	await espera(1500);
	await evalua(`Promise.all(["300 1em Muli", "italic 300 1em Muli", "400 1em Muli", "700 1em Muli"].map((f) => document.fonts.load(f)))`);
	virtual = 0;
}
let n = 0;
async function foto(nombre) {
	const r = await cmd("Page.captureScreenshot", { format: "png" });
	const ruta = join(salida, `${escenario}-${String(++n).padStart(2, "0")}-${nombre}.png`);
	writeFileSync(ruta, Buffer.from(r.result.data, "base64"));
	console.log("captura:", ruta);
}
const CODIGOS = { Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, " ": 32, e: 69, q: 81, 1: 49, 2: 50, 3: 51 };
async function tecla(key, tipo) {
	const code = key === " " ? "Space" : key.length > 1 ? key : /\d/.test(key) ? "Digit" + key : "Key" + key.toUpperCase();
	const base = { key, code, windowsVirtualKeyCode: CODIGOS[key], nativeVirtualKeyCode: CODIGOS[key] };
	// Enter lleva "\r" para que un botón enfocado se active como en un navegador real
	const text = key === "Enter" ? "\r" : key.length === 1 ? key : undefined;
	if (tipo !== "up") await cmd("Input.dispatchKeyEvent", { type: "keyDown", ...base, text });
	if (tipo !== "down") await cmd("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}
const visible = (sel) => evalua(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.hidden && getComputedStyle(e).display !== "none"; })()`);
const texto = (sel) => evalua(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent`);
async function conProgreso(datos) {
	await evalua(`localStorage.setItem(${JSON.stringify(CLAVE)}, ${JSON.stringify(JSON.stringify(datos))})`);
	await evalua(`localStorage.setItem("camino-a-celaque:ayuda-vista", "1")`); // sin el "Cómo se juega"
	await cmd("Page.reload");
	await cargada();
}
// Del mapa general a un nivel: flechas hasta el mundo, acercar, carta, entrar.
// El mapa abre con la selección en el primer mundo pendiente (y las flechas
// dan la vuelta), así que se cuenta desde ahí.
async function entrarAlMundo(indice) {
	const inicio = await evalua(`(() => {
		const c = (JSON.parse(localStorage.getItem(${JSON.stringify(CLAVE)}) || "{}").completos) || [];
		return Math.max(0, window.MODULOS.findIndex((m) => !c.includes(m.nombre)));
	})()`);
	const total = await evalua("window.MODULOS.length");
	for (let k = 0; k < (indice - inicio + total) % total; k++) await tecla("ArrowRight");
	await tecla("Enter");
	await paso(1300);
	await tecla("Enter");
	await paso(400);
	await tecla("Enter");
	await paso(1500);
}
// Recorre una oficina: camina saltando, avanza diálogos y contesta la terminal
async function jugarOficina(limite = 60000, fotoTerminal = "") {
	const t0 = ahora();
	let ultimoSalto = -Infinity;
	let respuestas = 0;
	while (ahora() - t0 < limite) {
		if (await visible("#terminal")) {
			await tecla("ArrowRight", "up");
			if (await visible("#terminal-salir")) {
				if (fotoTerminal) await foto(fotoTerminal + "-terminal-fin");
				return true;
			}
			for (const k of ["1", "2", "3"]) {
				await tecla(k);
				await paso(250);
			}
			if (fotoTerminal) {
				await paso(700);
				await foto(`${fotoTerminal}-terminal-${++respuestas}`);
			}
			await paso(2500);
			continue;
		}
		if (await visible("#dialogo")) {
			await tecla("Enter");
			await paso(120);
			continue;
		}
		await tecla("ArrowRight", "down");
		if (ahora() - ultimoSalto > 450) {
			await tecla("ArrowUp");
			ultimoSalto = ahora();
		}
		await paso(60);
	}
	await tecla("ArrowRight", "up");
	return false;
}
// Talento completo: camina saltando, avanza diálogos, responde bien a cada
// antivalor (busca la opción correcta en config.js) y se agacha en los tubos.
// Saca una captura al entrar a la Cueva, en cada pregunta y al salir al mapa.
// Lee todo lo que necesita de la página en una sola consulta por paso.
const LEER_TALENTO = `(() => {
	const ver = (s) => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== "none"; };
	return {
		fin: /"completos":\\["Talento"/.test(localStorage.getItem(${JSON.stringify(CLAVE)}) || ""),
		hud: (document.querySelector("#hud-texto") || {}).textContent || "",
		opciones: ver("#dialogo-opciones"),
		dialogo: ver("#dialogo"),
		pregunta: (document.querySelector("#dialogo-texto") || {}).textContent || "",
	};
})()`;
// Hace clic en la opción correcta según config.js (pregunta + opciones, porque
// el jefe repite una pregunta de otro antivalor)
const RESPONDER_BIEN = `(() => {
	const botones = [...document.querySelectorAll("#dialogo-opciones button")];
	const texto = document.querySelector("#dialogo-texto").textContent;
	const p = window.PREGUNTAS_CUEVA.flatMap((d) => d.preguntas || [d]).find((q) => q.pregunta === texto && q.opciones.every((o, i) => botones[i] && botones[i].textContent === o));
	if (!p) return false;
	botones[p.correcta].click();
	return true;
})()`;
async function jugarTalento(limite = 400000) {
	const t0 = ahora();
	let ultimoSalto = -Infinity;
	let ultimoAviso = 0;
	let enCueva = false;
	let preguntas = 0;
	let ultimaPregunta = "";
	while (ahora() - t0 < limite) {
		const p = await evalua(LEER_TALENTO);
		if (p.fin) {
			await tecla("ArrowRight", "up");
			await tecla("q", "up");
			await paso(2500);
			await foto("de-vuelta-al-mapa");
			return true;
		}
		if (ahora() - ultimoAviso >= 20000) {
			ultimoAviso = ahora();
			console.log(`  ${Math.round((ahora() - t0) / 1000)} s de juego · ${p.hud}`);
		}
		if (!enCueva && /Antivalores vencidos/.test(p.hud)) {
			enCueva = true;
			await foto("dentro-de-la-cueva");
		}
		if (p.opciones) {
			await tecla("ArrowRight", "up");
			if (p.pregunta !== ultimaPregunta) {
				ultimaPregunta = p.pregunta;
				await foto(`pregunta-${++preguntas}`);
			}
			if (!(await evalua(RESPONDER_BIEN))) throw new Error("No encontré la respuesta de: " + p.pregunta);
			await paso(1200);
			continue;
		}
		if (p.dialogo) {
			await tecla("Enter");
			await paso(120);
			continue;
		}
		await tecla("ArrowRight", "down");
		await tecla("q", "down"); // corriendo: hay huecos que solo se pasan así
		if (ahora() - ultimoSalto > 450) {
			await tecla("ArrowUp");
			ultimoSalto = ahora();
		}
		await tecla("ArrowDown"); // solo hace algo parado sobre un tubo
		await paso(60);
	}
	await tecla("ArrowRight", "up");
	await tecla("q", "up");
	await foto("se-quedo-aqui");
	return false;
}

try {
	await conectar();
	await cmd("Runtime.enable");
	await cmd("Log.enable");
	await cmd("Page.enable");
	if (FIJO) await cmd("Page.addScriptToEvaluateOnNewDocument", { source: RELOJ_FIJO });
	if (MOVIL) await cmd("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
	await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DPR, mobile: MOVIL });
	await cmd("Page.navigate", { url: ARCHIVO ? pathToFileURL(join(RAIZ, "index.html")).href : `http://127.0.0.1:${PUERTO_WEB}/index.html` });
	await cargada();

	if (escenario === "mapa") {
		await evalua("localStorage.clear()");
		await cmd("Page.reload");
		await cargada();
		await paso(100);
		await foto("como-se-juega");
		console.log("se abre 'Cómo se juega':", await visible("#ayuda"));
		await tecla("Enter");
		await paso(400);
		await foto("general");
		// El delfín del mapa sale a los ~6 s (huevo de pascua)
		await paso(4800);
		for (let k = 0; k < 4; k++) {
			await paso(450);
			await foto("buscando-delfin");
		}
		console.log("al cerrar la ayuda, el foco va al campo del nombre:", (await evalua("document.activeElement.id")) === "nombre-jugador");
		await cmd("Input.insertText", { text: "Prueba" });
		await tecla("Enter");
		await tecla("Enter");
		await paso(1300);
		await foto("acercado");
		await tecla("Enter");
		await paso(500);
		await foto("carta");
		console.log("carta:", await texto("#carta-titulo"));
		await tecla("Enter");
		await paso(1600);
		await foto("nivel");
		console.log("hud:", await texto("#hud-texto"));
	} else if (escenario === "talento") {
		await conProgreso({ completos: [], nivel: 0, personaje: "chico", nombre: "Prueba" });
		await entrarAlMundo(0);
		await tecla("ArrowRight", "down");
		await paso(4300);
		await tecla("ArrowRight", "up");
		await paso(900);
		await foto("primer-personaje");
		for (let k = 0; k < 8; k++) {
			await tecla("Enter");
			await paso(150);
		}
		await foto("tras-dialogo");
	} else if (escenario === "cueva") {
		await conProgreso({ completos: [], nivel: 0, personaje: "chica", nombre: "Prueba" });
		await entrarAlMundo(0);
		console.log("Talento completado (salió al mapa):", await jugarTalento());
		console.log("progreso:", await evalua(`localStorage.getItem(${JSON.stringify(CLAVE)})`));
	} else if (escenario === "oficina") {
		await conProgreso({ completos: ["Talento"], nivel: 3, personaje: "chica", nombre: "Prueba" });
		await entrarAlMundo(1);
		await foto("entrada");
		console.log("terminal completada:", await jugarOficina());
		await foto("terminal-fin");
		await tecla("Enter");
		await paso(2500);
		await foto("mapa-desbloqueo");
		console.log("progreso:", await evalua(`localStorage.getItem(${JSON.stringify(CLAVE)})`));
	} else if (escenario === "oficinas") {
		const pruebas = await evalua("window.CONFIG_JUEGO.nombrePruebas");
		const total = await evalua("window.MODULOS.length");
		for (let i = 1; i < total; i++) {
			await conProgreso({ completos: [], nivel: 0, personaje: "chica", nombre: pruebas });
			await entrarAlMundo(i);
			await tecla("ArrowRight", "down");
			await paso(2600);
			await tecla("ArrowRight", "up");
			await foto(`mundo${i + 1}`);
		}
	} else if (escenario === "estaciones") {
		const pruebas = await evalua("window.CONFIG_JUEGO.nombrePruebas");
		const mundos = await evalua("window.MODULOS.map((m, i) => (m.oficina && m.oficina.estacion && m.oficina.estacion !== 'computadora' ? i : -1)).filter((i) => i >= 0)");
		for (const i of mundos) {
			await conProgreso({ completos: [], nivel: 0, personaje: "chico", nombre: pruebas });
			await entrarAlMundo(i);
			console.log(`mundo ${i + 1} completado:`, await jugarOficina(60000, `mundo${i + 1}`));
			await tecla("Enter");
			await paso(1500);
		}
	} else if (escenario === "victoria") {
		const nombres = await evalua("window.MODULOS.map((m) => m.nombre)");
		await conProgreso({ completos: nombres.slice(0, -1), nivel: 8, personaje: "chico", nombre: "Prueba" });
		await entrarAlMundo(nombres.length - 1);
		console.log("última oficina completada:", await jugarOficina());
		await tecla("Enter");
		await paso(4500);
		await foto("final");
		console.log("tarjeta final visible:", await visible("#pantalla-victoria"));
	} else {
		console.error("Escenario desconocido:", escenario);
		terminar(2);
	}
	console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores de JavaScript.");
	terminar(errores.length ? 1 : 0);
} catch (err) {
	console.error("Falló la prueba:", err.message);
	terminar(2);
}
