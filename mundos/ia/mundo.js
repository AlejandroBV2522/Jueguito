/* Mundo 6 · IA: oficina con el taller de IA, donde se arman tres robots.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   El contenido sale de la capacitación "Introducción a IA" de Sistemas. */

"use strict";

window.MODULOS.push({
  nombre: "IA",
  subtitulo: "Inteligencia artificial",
  sistema: "Inteligencia artificial",
  descripcion:
    "La IA generativa nos ayuda a trabajar mejor si sabemos pedirle bien: un buen prompt tiene rol, instrucciones, contexto y objetivo. Revisa siempre lo que genera y cuida la información de Celaque.",
  icono: "chispa",
  color: "#A99886", // beige
  foto: "assets/edificios/Zorzales.png",
  fotoBordes: { abajo: 0.1, izquierda: 0.04, derecha: 0.04 },
  // Cada robot se arma con 2 preguntas, en este orden (config.js → robots)
  oficina: { vista: "ciudad", tema: "ia", estacion: "robot", robots: ["tierra", "aereo", "humanoide"], edificio: "Zorzales del Merendón" },
  anfitrion: {
    nombre: "Gracia Hidalgo",
    cuerpo: "chica",
    // ✏️ Revisar con Gracia
    dialogo: [
      "¡Hola! Soy Gracia Hidalgo y te doy la bienvenida al módulo de IA.",
      "Al fondo, en el taller, vas a armar tres robots: uno de tierra, uno aéreo y uno humanoide.",
    ],
  },
  intro: ["Bienvenido al módulo de IA.", "La inteligencia artificial nos ayuda a trabajar mejor, si la usamos con criterio."],
  comentarios: [
    {
      nombre: "Keidy Duron",
      cuerpo: "chica",
      dialogo: ["La calidad del prompt determina la calidad del resultado.", "Dale a la IA un rol, instrucciones, contexto y un objetivo."],
    },
    {
      nombre: "James Velasquez",
      cuerpo: "chico",
      dialogo: ["La IA no sustituye el criterio humano: revisa siempre lo que genera."],
    },
    {
      nombre: "Cristian Betancourth",
      cuerpo: "chico",
      dialogo: ["Antes de pegar información en una IA, cambia los nombres de la empresa, productos o personas.", "Así cuidas la información de Celaque. ¡Suerte con los robots!"],
    },
  ],
  // ✏️ Revisar con Gracia. 2 por robot: tierra (qué es la IA), aéreo
  // (prompts) y humanoide (cuidar la información y por dónde empezar).
  preguntas: [
    {
      pregunta: "¿Qué es un LLM (Large Language Model), como los de ChatGPT, Claude o Gemini?",
      opciones: [
        "Un modelo diseñado para entender y generar texto humano.",
        "Un programa para dibujar planos de construcción.",
        "Un tipo de cable para conectar computadoras.",
      ],
      correcta: 0,
    },
    {
      pregunta: "Si necesitas crear una imagen a partir de un texto, ¿qué tipo de IA usas?",
      opciones: [
        "Texto a audio, como ElevenLabs.",
        "Texto a imagen, como DALL-E, Midjourney o Leonardo.",
        "Texto a video, como Sora o HeyGen.",
      ],
      correcta: 1,
    },
    {
      pregunta: "¿Qué elementos lleva un buen prompt?",
      opciones: [
        "Solo una pregunta corta, como en Google.",
        "Rapidez, idioma, color y ortografía.",
        "Rol, instrucciones, contexto y objetivo.",
      ],
      correcta: 2,
      explicacion: "Por ejemplo: «Eres un experto en selección de personal…», los pasos, quiénes somos y qué resultado quieres.",
    },
    {
      pregunta: "¿Por qué la IA a veces da respuestas genéricas o inútiles?",
      opciones: [
        "Porque el prompt es muy corto, sin contexto y poco claro.",
        "Porque la IA no sirve para el trabajo.",
        "Porque solo entiende inglés.",
      ],
      correcta: 0,
      explicacion: "La calidad del prompt determina la calidad del resultado.",
    },
    {
      pregunta: "¿Cómo cuidas la información de Celaque al usar IA?",
      opciones: [
        "Pegando los datos tal cual en cualquier herramienta gratuita.",
        "Cambiando nombres de la empresa, productos o personas y usando las licencias empresariales.",
        "Dándole tu contraseña a la IA para que te ayude mejor.",
      ],
      correcta: 1,
      explicacion: "También ayuda usar el modo incógnito.",
    },
    {
      pregunta: "¿Por dónde se empieza a usar la IA en el trabajo?",
      opciones: [
        "Por la herramienta de moda, y luego se le busca un uso.",
        "Por un problema real que quieras resolver.",
        "Comprando todas las herramientas que existan.",
      ],
      correcta: 1,
      explicacion: "La IA debe estar centrada en el problema, no en la herramienta.",
    },
  ],
});
