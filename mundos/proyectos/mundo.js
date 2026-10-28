/* Mundo 2 · Proyectos: oficina en el Distrito Artemisa.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   El contenido sale de la capacitación "Gestión de proyectos" de Sistemas (2025). */

"use strict";

window.MODULOS.push({
  nombre: "Proyectos",
  subtitulo: "Cómo llevamos un proyecto",
  sistema: "Gestión de proyectos",
  descripcion:
    "Un proyecto es un esfuerzo temporal para crear un producto, servicio o resultado único. En Celaque se solicita en Wrike con el formulario «S - Nuevo Proyecto», se define su alcance con Sistemas y pasa por cinco fases: inicio, planificación, ejecución, monitoreo y control, y cierre.",
  icono: "tablero",
  color: "#042523", // verde profundo
  foto: "assets/edificios/DistritoArtemisa.png",
  logo: "assets/logos/proyecto-distrito-artemisa.png",
  fotoBordes: { abajo: 0.12, izquierda: 0.05, derecha: 0.05 },
  oficina: { vista: "construccion", tema: "planos", edificio: "Distrito Artemisa" },
  anfitrion: {
    nombre: "Nazareth Gallardo",
    cuerpo: "chica",
    // ✏️ Revisar con Nazareth Gallardo
    dialogo: [
      "¡Hola! Soy Nazareth Gallardo, administradora de Proyectos TI, y te doy la bienvenida al módulo de Proyectos.",
      "Un proyecto es temporal, único, con un propósito claro, y requiere planificación: recursos, tareas y cronograma.",
      "¿Tu área necesita uno? Se pide en Wrike: signo + arriba a la derecha, «Solicitud», y el formulario «S - Nuevo Proyecto».",
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Logradora", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/mayita.png" }, // valor: Logrador
  ],
  intro: ["Bienvenido al módulo de Proyectos.", "Aquí aprendes cómo se solicita un proyecto en Wrike y cómo lo llevamos de inicio a cierre."],
  comentarios: [
    {
      nombre: "Keydi Rodriguez",
      cuerpo: "chica",
      dialogo: [
        "Con la solicitud va el requerimiento de usuario: objetivo, descripción de la necesidad, criterios de aceptación y las áreas impactadas.",
        "La historia de usuario siempre lleva tres palabras clave: «Como», «Quiero» y «Para qué».",
        "Por ejemplo: como usuario final, quiero un buscador fácil de usar, para encontrar rápido lo que necesito.",
      ],
    },
    {
      nombre: "Estefanía Amador",
      cuerpo: "chica",
      dialogo: [
        "Todo proyecto pasa por cinco fases: inicio, planificación, ejecución, monitoreo y control, y cierre.",
        "Al final se oficializa el cierre con el acta de cierre y la encuesta de calidad.",
      ],
    },
    {
      nombre: "Carlos Jimenez",
      cuerpo: "chico",
      dialogo: [
        "El área solicitante también tiene su parte: que su N3 apruebe el alcance, ir a las reuniones de seguimiento y participar en las pruebas.",
        "La computadora del fondo te va a preguntar sobre esto. ¡Suerte!",
      ],
    },
  ],
  // ✏️ Revisar con Nazareth Gallardo
  preguntasPorModulo: 4,
  preguntas: [
    {
      pregunta: "¿Qué es un proyecto?",
      opciones: [
        "Cualquier tarea que se repite todos los meses.",
        "Un esfuerzo temporal para crear un producto, servicio o resultado único.",
        "Una reunión para revisar pendientes.",
      ],
      correcta: 1,
      explicacion: "Es temporal (tiene inicio y fin), único, con un propósito claro, y requiere planificación.",
    },
    {
      pregunta: "Tu área necesita un proyecto nuevo de Sistemas. ¿Cómo lo solicitas?",
      opciones: [
        "Por correo o WhatsApp a alguien de Sistemas.",
        "Se lo pides de palabra a tu jefe y esperas.",
        "En Wrike: signo +, «Solicitud» y el formulario «S - Nuevo Proyecto».",
      ],
      correcta: 2,
      explicacion: "Se llenan todos los campos de la solicitud y el requerimiento detallado del alcance.",
    },
    {
      pregunta: "¿Qué palabras clave lleva una historia de usuario bien escrita?",
      opciones: [
        "«Como», «Quiero» y «Para qué».",
        "«Urgente», «Importante» y «Ya».",
        "«Inicio», «Fin» y «Responsable».",
      ],
      correcta: 0,
      explicacion: "«Como» es el rol, «Quiero» lo que necesita y «Para qué» el beneficio que busca.",
    },
    {
      pregunta: "¿En qué fase del proyecto se hacen el acta de cierre y la encuesta de calidad?",
      opciones: [
        "En la planificación.",
        "En el cierre.",
        "En el inicio, antes de empezar.",
      ],
      correcta: 1,
      explicacion: "Las fases son inicio, planificación, ejecución, monitoreo y control, y cierre.",
    },
  ],
});
