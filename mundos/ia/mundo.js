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
  logo: "assets/logos/proyecto-zorzales.png",
  fotoBordes: { abajo: 0.1, izquierda: 0.04, derecha: 0.04 },
  // Primero el taller de prompts (más abajo, taller); después cada robot se
  // arma con 2 preguntas, en este orden (config.js → robots)
  oficina: { vista: "ciudad", tema: "ia", estacion: "robot", robots: ["tierra", "aereo", "humanoide"], edificio: "Zorzales del Merendón" },
  anfitrion: {
    nombre: "Gracia Hidalgo",
    cuerpo: "chica",
    // ✏️ Revisar con Gracia
    dialogo: [
      "¡Hola! Soy Gracia Hidalgo y te doy la bienvenida al módulo de IA.",
      "El único límite para la IA es la imaginación humana. Aquí te inspiras con ella y aprendes a usarla en Celaque.",
      "Lo que más cuesta con la IA: tantas herramientas que abruman, prompts que no dan resultado y datos difíciles de integrar.",
      "También preocupa si la inversión rinde o si es solo una moda. Por eso, aquí practicas.",
      "Al fondo, en el taller de prompts, vas a armar prompts pieza por pieza. Después, tres robots: de tierra, aéreo y humanoide.",
    ],
  },
  // Taller de prompts (juego/oficina/taller-ia.js): en cada ronda, un dron
  // suelta piezas de prompt. Se atrapan un Rol, unas Instrucciones, un
  // Contexto y un Objetivo (claves: rol, instrucciones, contexto, objetivo)
  // y se esquivan las trampas, que se disfrazan de una pieza (parte) y dicen
  // por qué no van (por). Textos de pieza y trampa: 40 caracteres o menos.
  // intro: lo que dice el anfitrión antes de la ronda; respuesta: lo que
  // contesta el modelo de IA al enviar el prompt.
  // ✏️ Revisar con Gracia: retos, piezas, trampas y respuestas redactados a
  // partir de ia.txt (RICO, Master Prompt, tipos de IA, seguridad de la
  // información, 80/20, criterio humano).
  taller: {
    rondas: [
      {
        titulo: "Un correo para un cliente",
        intro: [
          "¡Llegaste al taller de prompts! Reto 1: necesitas un correo para un cliente.",
          "El dron suelta piezas. Atrapa un Rol, unas Instrucciones, un Contexto y un Objetivo: un prompt RICO.",
          "Ojo: algunas piezas son trampas. Lee cada tarjeta antes de atraparla.",
        ],
        piezas: {
          rol: "Asistente con la voz de Celaque",
          instrucciones: "Paso a paso: saludo, respuesta y cierre",
          contexto: "Constructora con más de 200 empleados",
          objetivo: "Correo breve, claro y con empatía",
        },
        trampas: [
          { parte: "contexto", texto: "La contraseña de tu correo", por: "Nunca pongas contraseñas en un prompt" },
          { parte: "instrucciones", texto: "«Hazme un correo» y nada más", por: "Un prompt corto da respuestas genéricas" },
        ],
        respuesta: [
          "¡Prompt recibido! El correo salió claro, cercano y profesional.",
          "Ese rol es el Master Prompt Celaque: voz moderna, accesible y profesional, con claridad, empatía, empuje y foco en resultados.",
        ],
      },
      {
        titulo: "Una imagen para una presentación",
        intro: [
          "Reto 2: necesitas una imagen para una presentación. Para eso se usa IA de texto a imagen.",
          "Antes de pegar datos, cambia los nombres reales y usa licencias Enterprise, no versiones gratuitas.",
        ],
        piezas: {
          rol: "Diseñador experto en arquitectura",
          instrucciones: "Describe la escena paso a paso",
          contexto: "Edificio moderno con mucha luz natural",
          objetivo: "Imagen horizontal y minimalista",
        },
        trampas: [
          { parte: "contexto", texto: "El nombre real del cliente", por: "Cambia los nombres de empresas y personas" },
          { parte: "contexto", texto: "Datos de Celaque en la versión gratuita", por: "Con datos de Celaque, licencias Enterprise" },
          { parte: "instrucciones", texto: "«Haz una imagen bonita»", por: "Un prompt mal diseñado da respuestas genéricas" },
        ],
        respuesta: [
          "¡Imagen lista! Esto es texto a imagen, como DALL-E, Midjourney o Leonardo.",
          "Hay más tipos: texto a texto (ChatGPT, Gemini, Claude), texto a audio (ElevenLabs) y texto a video (Sora, HeyGen, Runway).",
        ],
      },
      {
        titulo: "El resumen de un informe",
        intro: [
          "Reto 3: resume un informe para tu equipo.",
          "Recuerda: el 20 % de la data es lo que tiene valor y es lo que proteges. Cambia nombres y cifras antes de pegarlo.",
        ],
        piezas: {
          rol: "Analista experto en informes",
          instrucciones: "Resume en 5 puntos clave",
          contexto: "El informe con nombres y cifras cambiados",
          objetivo: "Una tabla en markdown, con tono claro",
        },
        trampas: [
          { parte: "contexto", texto: "Las cifras confidenciales tal cual", por: "Protege lo importante: cambia o quita cifras" },
          { parte: "contexto", texto: "El 100 % de los datos, sin filtrar", por: "Es imposible proteger el 100 %: céntrate en lo importante" },
          { parte: "objetivo", texto: "«Resúmelo» y nada más", por: "Di el formato que quieres: tabla, lista…" },
        ],
        respuesta: [
          "¡Resumen listo! Pero la IA no sustituye el criterio humano ni los datos actuales: revísalo siempre.",
          "La calidad del prompt determina la calidad del resultado. Ahora, al fondo, arma los tres robots.",
        ],
      },
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Creativa", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/mayita.png" }, // valor: Creatividad
  ],
  intro: ["Te damos la bienvenida al módulo de IA.", "La inteligencia artificial nos ayuda a trabajar mejor, si la usamos con criterio."],
  comentarios: [
    {
      nombre: "Keidy Duron",
      cuerpo: "chica",
      dialogo: [
        "La calidad del prompt determina la calidad del resultado.",
        "Dale a la IA un rol, instrucciones, contexto y un objetivo. Asignarle un personaje la hace usar las palabras de ese personaje.",
        "Un prompt corto da respuestas distintas cada vez; uno largo y con contexto da resultados estables y predecibles.",
      ],
    },
    {
      nombre: "James Velasquez",
      cuerpo: "chico",
      dialogo: [
        "La IA no sustituye el criterio humano ni los datos actuales: revisa siempre lo que genera.",
        "Celaque tiene su Master Prompt: la IA escribe con nuestra voz, moderna, accesible y profesional, con claridad, empatía y buena energía.",
        "Un bot, como un Custom GPT, es un master prompt: dice quién es, qué hace y qué no, qué pasos sigue y qué documentos usa.",
      ],
    },
    {
      nombre: "Cristian Betancourth",
      cuerpo: "chico",
      dialogo: [
        "En Celaque usamos ChatGPT, Gemini, Claude, Copilot, Canva, Power Automate, Enscape y TestFit, entre otras.",
        "Antes de pegar información en una IA, cambia los nombres de la empresa, productos o personas, y usa las licencias empresariales.",
        "Así cuidas la información de Celaque. ¡Suerte con los robots!",
      ],
    },
  ],
  // ✏️ Revisar con Gracia. 2 por robot: tierra (qué es la IA), aéreo
  // (prompts) y humanoide (cuidar la información y por dónde empezar).
  // Las de prompts, información y por dónde empezar van como situación.
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
      pregunta: "Le pides a ChatGPT «hazme un correo» y la respuesta sale genérica. ¿Qué haces?",
      opciones: [
        "Le das rol, instrucciones, contexto y objetivo, y vuelves a intentar.",
        "Dejas de usar IA: no sirve para el trabajo.",
        "Le repites «hazme un correo» hasta que salga bien.",
      ],
      correcta: 0,
      explicacion: "La calidad del prompt determina la calidad del resultado: aporta contexto, refina las instrucciones y experimenta.",
    },
    {
      pregunta: "Vas a pedirle a la IA que resuma un documento con datos de un cliente. ¿Qué haces antes?",
      opciones: [
        "Lo pegas tal cual en cualquier herramienta gratuita, para ganar tiempo.",
        "Cambias los nombres de la empresa, productos o personas y usas las licencias empresariales.",
        "Le das también tu usuario y contraseña, para que te ayude mejor.",
      ],
      correcta: 1,
      explicacion: "También ayuda usar el modo incógnito.",
    },
    {
      pregunta: "Tu equipo se siente abrumado con tantas herramientas de IA. ¿Por dónde empiezan?",
      opciones: [
        "Por la herramienta de moda, y luego le buscan un uso.",
        "Por un problema real que quieran resolver.",
        "Comprando todas las herramientas que existan.",
      ],
      correcta: 1,
      explicacion: "La IA debe estar centrada en el problema, no en la herramienta.",
    },
  ],
});
