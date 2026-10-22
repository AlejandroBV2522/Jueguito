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
//
// Variables opcionales: ANCHO, ALTO (pantalla, por defecto 1366x768), DPR
// (densidad, por defecto 1) y MOVIL=1 (pantalla táctil). Las capturas quedan
// en la carpeta indicada (por defecto ./capturas, que no se sube a git).
// Sale con código 1 si hubo errores de JavaScript (los 404 de logos que
// todavía no existen se ignoran).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
mkdirSync(salida, { recursive: true });

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
const evalua = async (expr) => (await cmd("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;
let n = 0;
async function foto(nombre) {
	const r = await cmd("Page.captureScreenshot", { format: "png" });
	const ruta = join(salida, `${escenario}-${String(++n).padStart(2, "0")}-${nombre}.png`);
	writeFileSync(ruta, Buffer.from(r.result.data, "base64"));
	console.log("captura:", ruta);
}
const CODIGOS = { Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, " ": 32, e: 69, q: 81, 1: 49, 2: 50, 3: 51 };
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
	await espera(1500);
}
// Del mapa general a un nivel: flechas hasta el mundo, acercar, carta, entrar
async function entrarAlMundo(indice) {
	for (let k = 0; k < indice; k++) await tecla("ArrowRight");
	await tecla("Enter");
	await espera(1300);
	await tecla("Enter");
	await espera(400);
	await tecla("Enter");
	await espera(1500);
}
// Recorre una oficina: camina saltando, avanza diálogos y contesta la terminal
async function jugarOficina(limite = 60000, fotoTerminal = "") {
	const t0 = Date.now();
	let ultimoSalto = 0;
	let respuestas = 0;
	while (Date.now() - t0 < limite) {
		if (await visible("#terminal")) {
			await tecla("ArrowRight", "up");
			if (await visible("#terminal-salir")) {
				if (fotoTerminal) await foto(fotoTerminal + "-terminal-fin");
				return true;
			}
			for (const k of ["1", "2", "3"]) {
				await tecla(k);
				await espera(250);
			}
			if (fotoTerminal) {
				await espera(700);
				await foto(`${fotoTerminal}-terminal-${++respuestas}`);
			}
			await espera(2500);
			continue;
		}
		if (await visible("#dialogo")) {
			await tecla("Enter");
			await espera(120);
			continue;
		}
		await tecla("ArrowRight", "down");
		if (Date.now() - ultimoSalto > 450) {
			await tecla("ArrowUp");
			ultimoSalto = Date.now();
		}
		await espera(60);
	}
	await tecla("ArrowRight", "up");
	return false;
}

try {
	await conectar();
	await cmd("Runtime.enable");
	await cmd("Log.enable");
	await cmd("Page.enable");
	if (MOVIL) await cmd("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
	await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DPR, mobile: MOVIL });
	await cmd("Page.navigate", { url: `http://127.0.0.1:${PUERTO_WEB}/index.html` });
	await espera(1500);

	if (escenario === "mapa") {
		await evalua("localStorage.clear()");
		await cmd("Page.reload");
		await espera(1500);
		await foto("como-se-juega");
		console.log("se abre 'Cómo se juega':", await visible("#ayuda"));
		await tecla("Enter");
		await espera(400);
		await foto("general");
		// El delfín del mapa sale a los ~6 s (huevo de pascua)
		await espera(4800);
		for (let k = 0; k < 4; k++) {
			await espera(450);
			await foto("buscando-delfin");
		}
		console.log("al cerrar la ayuda, el foco va al campo del nombre:", (await evalua("document.activeElement.id")) === "nombre-jugador");
		await cmd("Input.insertText", { text: "Prueba" });
		await tecla("Enter");
		await tecla("Enter");
		await espera(1300);
		await foto("acercado");
		await tecla("Enter");
		await espera(500);
		await foto("carta");
		console.log("carta:", await texto("#carta-titulo"));
		await tecla("Enter");
		await espera(1600);
		await foto("nivel");
		console.log("hud:", await texto("#hud-texto"));
	} else if (escenario === "talento") {
		await conProgreso({ completos: [], nivel: 0, personaje: "chico", nombre: "Prueba" });
		await entrarAlMundo(0);
		await tecla("ArrowRight", "down");
		await espera(4300);
		await tecla("ArrowRight", "up");
		await espera(900);
		await foto("primer-personaje");
		for (let k = 0; k < 8; k++) {
			await tecla("Enter");
			await espera(150);
		}
		await foto("tras-dialogo");
	} else if (escenario === "oficina") {
		await conProgreso({ completos: ["Talento"], nivel: 3, personaje: "chica", nombre: "Prueba" });
		await entrarAlMundo(1);
		await foto("entrada");
		console.log("terminal completada:", await jugarOficina());
		await foto("terminal-fin");
		await tecla("Enter");
		await espera(2500);
		await foto("mapa-desbloqueo");
		console.log("progreso:", await evalua(`localStorage.getItem(${JSON.stringify(CLAVE)})`));
	} else if (escenario === "oficinas") {
		const pruebas = await evalua("window.CONFIG_JUEGO.nombrePruebas");
		const total = await evalua("window.MODULOS.length");
		for (let i = 1; i < total; i++) {
			await conProgreso({ completos: [], nivel: 0, personaje: "chica", nombre: pruebas });
			await entrarAlMundo(i);
			await tecla("ArrowRight", "down");
			await espera(2600);
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
			await espera(1500);
		}
	} else if (escenario === "victoria") {
		const nombres = await evalua("window.MODULOS.map((m) => m.nombre)");
		await conProgreso({ completos: nombres.slice(0, -1), nivel: 8, personaje: "chico", nombre: "Prueba" });
		await entrarAlMundo(nombres.length - 1);
		console.log("última oficina completada:", await jugarOficina());
		await tecla("Enter");
		await espera(4500);
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
