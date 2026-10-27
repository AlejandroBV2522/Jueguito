/* Mundo 3 · Procesos: oficina de Wrike en el Edificio Lirios.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   El contenido sale de la capacitación "Procesos & Wrike" (2026). */

"use strict";

window.MODULOS.push({
  nombre: "Procesos",
  subtitulo: "Nuestros procesos en Wrike",
  sistema: "Wrike",
  descripcion:
    "En Wrike viven los procesos de Celaque: los recurrentes, que se repiten con una frecuencia, y los secuenciales (plantillas y solicitudes), que se activan por un evento. Los procesos nos dan organización, eficiencia y responsabilidad en el trabajo del día a día.",
  icono: "engranes",
  color: "#A99886", // beige
  foto: "assets/edificios/Lirios.png",
  oficina: { vista: "industria", tema: "procesos", edificio: "Edificio Lirios" },
  anfitrion: {
    nombre: "Astrid Coello",
    cuerpo: "chica",
    // ✏️ Revisar con Astrid Coello
    dialogo: [
      "¡Hola! Soy Astrid Coello y te doy la bienvenida al módulo de Procesos.",
      "Los procesos nos dan organización, eficiencia y responsabilidad para el trabajo del día a día, y todos viven en Wrike.",
      "Los encuentras en tus paneles de control, en los espacios «Personal» y «Compartido conmigo», y en Proyectos y carpetas.",
      "Nuestros principios: OHIO (hazlo solo una vez), niveles de revisión, consistencia, recurrencias y eficiencias. Y recuerda: los procesos no son independientes.",
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Feliz", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
    { nombre: "Mayita Orgullosa", sobre: "mueble", n: 7, altura: 260, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
  ],
  intro: ["Este es el módulo de Procesos.", "Los procesos nos dan organización, eficiencia y responsabilidad, y todos viven en Wrike."],
  comentarios: [
    {
      nombre: "Juan Flores",
      cuerpo: "chico",
      dialogo: [
        "Hay procesos recurrentes, que se repiten: diario, semanal, mensual...",
        "Y secuenciales, que se activan por un evento: las plantillas y las solicitudes.",
        "Al duplicar una plantilla revisa el nombre, la carpeta de archivo, a quién está asignada y la fecha. Las plantillas activadas se trabajan en su carpeta de archivo.",
        "Para pedir algo: signo + arriba a la derecha de Wrike, «Solicitud», buscas la que necesitas y llenas el formulario.",
      ],
    },
    {
      nombre: "Andrea Ortiz",
      cuerpo: "chica",
      dialogo: [
        "Cada proceso tiene un código. En «T-RH-4-1 Revisión Mensual Talento»: T es el departamento, RH el macroproceso, 4 la recurrencia (mensual) y 1 el nivel de revisión.",
      ],
    },
    {
      nombre: "Franklin Matute",
      cuerpo: "chico",
      dialogo: [
        "Una buena práctica: no completes un proceso que todavía tiene subtareas activas, y deja la evidencia de lo que hiciste.",
        "Cada proceso se corre en un día específico (1 día, no 2). Y al documentarlo no uses nombres propios: escribe «notificar al siguiente nivel».",
        "La computadora del fondo te va a preguntar sobre esto. ¡Suerte!",
      ],
    },
  ],
  // ✏️ Revisar con Astrid Coello
  preguntasPorModulo: 6,
  preguntas: [
    {
      pregunta: "¿En qué se dividen los procesos de Celaque?",
      opciones: [
        "En fáciles y difíciles.",
        "En recurrentes (se repiten con una frecuencia) y secuenciales (plantillas y solicitudes).",
        "En los de oficina y los de obra.",
      ],
      correcta: 1,
      explicacion: "Los secuenciales no tienen frecuencia: se activan cuando pasa un evento.",
    },
    {
      pregunta: "En el proceso «T-RH-4-1 Revisión Mensual Talento», ¿qué significa el 4?",
      opciones: [
        "El nivel de revisión.",
        "La cantidad de personas que lo hacen.",
        "La recurrencia: 4 es mensual.",
      ],
      correcta: 2,
      explicacion: "T es Talento, RH el macroproceso, 4 la recurrencia (mensual) y 1 el nivel de revisión.",
    },
    {
      pregunta: "¿Cómo emites una solicitud en Wrike?",
      opciones: [
        "Con el signo + arriba a la derecha, opción «Solicitud»: buscas la que necesitas y llenas el formulario.",
        "Por mensaje directo a la persona encargada.",
        "Creando una carpeta nueva con tu nombre.",
      ],
      correcta: 0,
    },
    {
      pregunta: "Un proceso todavía tiene subtareas activas. ¿Lo puedes marcar como completado?",
      opciones: [
        "Sí, si ya pasó su fecha.",
        "No: primero se completan sus subtareas y se documenta la evidencia.",
        "Sí, nadie lo revisa.",
      ],
      correcta: 1,
      explicacion: "Documentar la evidencia de cumplimiento también es una buena práctica.",
    },
    {
      pregunta: "Duplicaste una plantilla y ya está activada. ¿Dónde se guarda y se trabaja?",
      opciones: [
        "En la carpeta de archivo de esa plantilla.",
        "En la misma carpeta de plantillas, junto a la original.",
        "En tu bandeja de entrada.",
      ],
      correcta: 0,
      explicacion: "Al duplicarla revisa nombre, carpeta de archivo, asignado y fecha.",
    },
    {
      pregunta: "Estás escribiendo los pasos de un proceso. ¿Cuál está bien escrito?",
      opciones: [
        "«Avisarle a Pamela cuando termine».",
        "«Notificar al siguiente nivel».",
        "«Mandarle un mensaje a quien sepa».",
      ],
      correcta: 1,
      explicacion: "En los procesos no se usan nombres propios: se notifica o se etiqueta al siguiente nivel.",
    },
  ],
});
