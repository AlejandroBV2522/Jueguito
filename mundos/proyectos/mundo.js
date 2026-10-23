/* Mundo 2 · Proyectos: oficina en el Distrito Artemisa.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "Proyectos",
  subtitulo: "Cómo llevamos un proyecto",
  sistema: "Gestión de proyectos",
  // ✏️ Borrador: revisar con Nazareth Gallardo
  descripcion:
    "Cada proyecto de Celaque se planea desde el inicio: un objetivo claro, un responsable, un cronograma y un presupuesto. Darle seguimiento y avisar a tiempo de cualquier cambio es trabajo de todo el equipo.",
  icono: "tablero",
  color: "#042523", // verde profundo
  foto: "assets/edificios/DistritoArtemisa.png",
  oficina: { vista: "construccion", tema: "planos", edificio: "Distrito Artemisa" },
  anfitrion: {
    nombre: "Nazareth Gallardo",
    cuerpo: "chica",
    // ✏️ Borrador: revisar con Nazareth Gallardo
    dialogo: [
      "¡Hola! Soy Nazareth Gallardo y te doy la bienvenida al módulo de Proyectos.",
      "Aquí aprendes cómo llevamos un proyecto: objetivo, responsable, cronograma y presupuesto.",
    ],
  },
  intro: ["Bienvenido al módulo de Proyectos.", "Aquí aprendes cómo llevamos un proyecto: objetivo, responsable, cronograma y presupuesto."],
  comentarios: [
    // ✏️ Borrador
    {
      nombre: "Coordinación de Proyectos",
      cuerpo: "chica",
      dialogo: ["Todo proyecto empieza con un objetivo claro, un cronograma y un presupuesto.", "Sin eso, cada quien va por su lado."],
    },
    {
      nombre: "Analista de Proyectos",
      cuerpo: "chico",
      dialogo: ["¿Ves que algo se va a atrasar? Avísalo a tiempo: las sorpresas al final salen caras.", "La computadora del fondo te va a preguntar sobre esto. ¡Suerte!"],
    },
  ],
  preguntas: [
    {
      // ✏️ Borrador: revisar con Nazareth Gallardo
      pregunta: "¿Qué necesita todo proyecto desde el inicio?",
      opciones: [
        "Solo las ganas de empezar.",
        "Un objetivo claro, un responsable, un cronograma y un presupuesto.",
        "Esperar a que el cliente diga qué hacer cada día.",
      ],
      correcta: 1,
    },
    {
      // ✏️ Borrador
      pregunta: "Si ves que una actividad del proyecto se va a atrasar, ¿qué es lo correcto?",
      opciones: [
        "Avisar a tiempo al líder del proyecto y proponer cómo recuperarlo.",
        "No decir nada y esperar que nadie se dé cuenta.",
        "Saltarse las actividades siguientes.",
      ],
      correcta: 0,
    },
  ],
});
