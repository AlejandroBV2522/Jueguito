/* Mundo 4 · SharePoint: oficina en lo alto de la Torre Atlas (SharePoint, Outlook y Teams).
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "SharePoint",
  subtitulo: "SharePoint, Outlook y Teams",
  sistema: "SharePoint · Outlook · Teams",
  descripcion:
    "SharePoint es el repositorio principal de información de la empresa: guarda, organiza y comparte documentos desde cualquier dispositivo, con historial de versiones. Outlook es tu correo y calendario, y Teams tu chat y reuniones.",
  icono: "nube",
  color: "#488478", // verde institucional
  oficina: { vista: "nubes", tema: "documentos", edificio: "Torre Atlas", piso: 40 },
  anfitrion: {
    nombre: "Luis Morán",
    cuerpo: "chico",
    // ✏️ Borrador: revisar con Luis
    dialogo: [
      "¡Hola! Soy Luis Morán y te doy la bienvenida al edificio de Plataformas, en lo alto de la Torre Atlas.",
      "SharePoint es el repositorio principal de información de la empresa. Outlook es tu correo y calendario, y Teams tu chat y reuniones.",
    ],
  },
  intro: [
    "Bienvenido al edificio de Plataformas.",
    "SharePoint es el repositorio principal de información de la empresa. Outlook es tu correo y calendario, y Teams tu chat y reuniones.",
  ],
  comentarios: [
    {
      nombre: "Soporte de Plataformas",
      cuerpo: "chica",
      dialogo: ["En SharePoint cada área tiene una carpeta por departamento.", "Ahí está la documentación de sus procesos y reportes."],
    },
    {
      nombre: "Equipo de Teams",
      cuerpo: "chico",
      dialogo: ["¿Te equivocaste en un documento? El historial de versiones te deja recuperar uno anterior.", "Y para chatear o reunirte, usa Teams."],
    },
  ],
  preguntas: [
    {
      pregunta: "¿Qué es SharePoint?",
      opciones: [
        "Un juego de Microsoft.",
        "Una plataforma de Microsoft para almacenar, organizar, compartir y acceder a información desde cualquier dispositivo.",
        "Un antivirus.",
      ],
      correcta: 1,
    },
    {
      pregunta: "¿Cómo se organiza la información en el SharePoint de Celaque?",
      opciones: [
        "Cada área tiene una carpeta por departamento con la documentación de sus procesos y reportes.",
        "Todos los archivos van sueltos en una sola carpeta.",
        "Cada persona guarda todo en su correo.",
      ],
      correcta: 0,
    },
    {
      pregunta: "¿Para qué sirve el historial de versiones de un documento?",
      opciones: [
        "Para borrar el documento.",
        "Para cambiarle el nombre.",
        "Para rastrear cambios y recuperar versiones anteriores.",
      ],
      correcta: 2,
    },
    {
      pregunta: "¿Qué herramienta usas para chatear y tener reuniones con otros colaboradores?",
      opciones: ["Microsoft Teams.", "El historial de versiones.", "La papelera de reciclaje."],
      correcta: 0,
      explicacion: "Y en Outlook gestionas tu correo, calendario, contactos y grupos.",
    },
  ],
});
