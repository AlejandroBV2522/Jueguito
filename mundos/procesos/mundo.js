/* Mundo 3 · Procesos: oficina de Wrike en el Edificio Lirios.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "Procesos",
  subtitulo: "Nuestros procesos en Wrike",
  sistema: "Wrike",
  // ✏️ Borrador: revisar con Astrid Coello
  descripcion:
    "Wrike es la plataforma donde llevamos nuestros procesos y damos seguimiento al trabajo en equipo: tareas, responsables, fechas y avances, todo en un mismo lugar y a la vista de todos.",
  icono: "engranes",
  color: "#A99886", // beige
  foto: "assets/edificios/Lirios.png",
  oficina: { vista: "industria", tema: "procesos", edificio: "Edificio Lirios" },
  anfitrion: {
    nombre: "Astrid Coello",
    cuerpo: "chica",
    // ✏️ Borrador: revisar con Astrid Coello
    dialogo: [
      "¡Hola! Soy Astrid Coello y te doy la bienvenida al módulo de Procesos.",
      "Aquí llevamos el trabajo del día a día en Wrike: tareas, responsables, fechas y avances.",
    ],
  },
  intro: ["Este es el módulo de Procesos.", "Aquí llevamos el trabajo del día a día en Wrike: tareas, responsables, fechas y avances."],
  comentarios: [
    // ✏️ Borrador
    {
      nombre: "Calidad y Procesos",
      cuerpo: "chico",
      dialogo: ["Cada tarea en Wrike tiene un responsable y una fecha.", "Así todo el equipo sabe quién hace qué y para cuándo."],
    },
    {
      nombre: "Seguimiento",
      cuerpo: "chica",
      dialogo: ["Cuando avances en una tarea, actualiza su estado en Wrike.", "La computadora del fondo te va a preguntar sobre esto. ¡Suerte!"],
    },
  ],
  // ✏️ Borrador: se reemplazan con las preguntas de procesos de Astrid Coello
  preguntas: [
    {
      pregunta: "¿Qué es Wrike?",
      opciones: [
        "Una plataforma para dar seguimiento a tareas y procesos en equipo.",
        "Un programa para editar fotos.",
        "Una red social personal.",
      ],
      correcta: 0,
    },
    {
      pregunta: "Si te asignan una tarea en Wrike, ¿qué es lo correcto?",
      opciones: [
        "Ignorarla hasta que alguien pregunte.",
        "Actualizar su estado y avances para que el equipo sepa cómo va.",
        "Borrarla si no te gusta.",
      ],
      correcta: 1,
    },
  ],
});
