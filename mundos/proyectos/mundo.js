/* Mundo 2 · Proyectos: oficina de Wrike.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "Proyectos",
  subtitulo: "Nuestro trabajo en Wrike",
  sistema: "Wrike",
  // ✏️ Borrador: revisar con el área de Proyectos
  descripcion:
    "Wrike es la plataforma donde planeamos y damos seguimiento al trabajo en equipo: proyectos, tareas, responsables, fechas y avances, todo en un mismo lugar y a la vista de todos.",
  icono: "tablero",
  color: "#042523", // verde profundo
  foto: "assets/edificios/DistritoArtemisa.png",
  oficina: { vista: "construccion", tema: "planos", edificio: "Distrito Artemisa" },
  anfitrion: {
    nombre: "Nazareth Gallardo",
    cuerpo: "chica",
    // ✏️ Borrador: revisar con Nazareth
    dialogo: [
      "¡Hola! Soy Nazareth Gallardo y te doy la bienvenida al edificio de Proyectos.",
      "Aquí organizamos el trabajo del día a día en Wrike: proyectos, tareas, responsables y fechas.",
    ],
  },
  intro: [
    "Bienvenido al edificio de Proyectos.",
    "Aquí organizamos el trabajo del día a día en Wrike: proyectos, tareas, responsables y fechas.",
  ],
  comentarios: [
    // ✏️ Borrador
    {
      nombre: "Coordinación de Proyectos",
      cuerpo: "chica",
      dialogo: ["Cada tarea en Wrike tiene un responsable y una fecha.", "Así todo el equipo sabe quién hace qué y para cuándo."],
    },
    {
      nombre: "Analista de Proyectos",
      cuerpo: "chico",
      dialogo: ["Cuando avances en una tarea, actualiza su estado.", "La computadora del fondo te va a preguntar sobre esto. ¡Suerte!"],
    },
  ],
  preguntas: [
    {
      // ✏️ Borrador: revisar con el área de Proyectos
      pregunta: "¿Qué es Wrike?",
      opciones: [
        "Una plataforma para planear y dar seguimiento a proyectos y tareas en equipo.",
        "Un programa para editar fotos.",
        "Una red social personal.",
      ],
      correcta: 0,
    },
    {
      // ✏️ Borrador
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
