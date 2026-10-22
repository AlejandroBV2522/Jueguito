/* Mundo 6 · IA: oficina con la estación del robot de IA.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "IA",
  subtitulo: "Inteligencia artificial",
  sistema: "Inteligencia artificial",
  // ✏️ Borrador: revisar con el área responsable
  descripcion:
    "La inteligencia artificial nos ayuda a trabajar mejor si la usamos con criterio: revisa siempre lo que genera antes de usarlo y comparte información de la empresa solo en las herramientas aprobadas.",
  icono: "chispa",
  color: "#A99886", // beige
  oficina: { vista: "ciudad", tema: "ia", estacion: "robot" },
  anfitrion: {
    nombre: "Keidy Durón",
    cuerpo: "chica",
    // ✏️ Borrador: revisar con Keidy
    dialogo: [
      "¡Hola! Soy Keidy Durón y te doy la bienvenida al edificio de IA.",
      "La inteligencia artificial nos ayuda a trabajar mejor, si la usamos con criterio.",
    ],
  },
  intro: ["Bienvenido al edificio de IA.", "La inteligencia artificial nos ayuda a trabajar mejor, si la usamos con criterio."],
  comentarios: [
    // ✏️ Borrador
    {
      nombre: "Innovación",
      cuerpo: "chica",
      dialogo: ["Una respuesta de IA puede sonar segura y estar equivocada.", "Revísala y verifícala antes de usarla."],
    },
    {
      nombre: "Datos",
      cuerpo: "chico",
      dialogo: ["La información confidencial va solo en las herramientas aprobadas por la empresa.", "Si tienes dudas, pregunta primero."],
    },
  ],
  preguntas: [
    {
      // ✏️ Borrador: revisar con el área responsable
      pregunta: "¿Qué debes hacer con una respuesta generada por IA antes de usarla?",
      opciones: [
        "Copiarla sin leerla.",
        "Revisarla y verificar que sea correcta.",
        "Enviarla a todos los clientes.",
      ],
      correcta: 1,
    },
    {
      // ✏️ Borrador
      pregunta: "¿Se puede pegar información confidencial de la empresa en cualquier herramienta de IA?",
      opciones: [
        "Sí, siempre.",
        "Solo en las herramientas aprobadas por la empresa.",
        "Sí, si nadie se entera.",
      ],
      correcta: 1,
    },
  ],
});
