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
  foto: "assets/edificios/Atlas.png",
  oficina: { vista: "nubes", tema: "documentos", edificio: "Torre Atlas", piso: 40 },
  anfitrion: {
    nombre: "Luis Morán",
    cuerpo: "chico",
    // ✏️ Revisar con Luis Morán
    dialogo: [
      "¡Hola! Soy Luis Morán y te doy la bienvenida al módulo de Plataformas.",
      "SharePoint es el repositorio principal de información de Celaque: cada área tiene una carpeta por departamento con la documentación de sus procesos y reportes.",
      "Ahí los equipos trabajan juntos un documento en tiempo real, y el historial de versiones deja ver los cambios y recuperar una versión anterior.",
      "Te pido un favor: Aldo, un solicitante, todavía no puede trabajar. Sube a la nube, al punto A, por sus permisos y llévaselos al punto B.",
    ],
  },
  // Coleccionables ocultos en el aire (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la medalla dibujada).
  coleccionables: [
    { nombre: "Nube secreta", sobre: "nube", n: 2, altura: 170, imagen: "" },
    { nombre: "Carpeta dorada", sobre: "mueble", n: 6, altura: 260, imagen: "" },
  ],
  intro: [
    "Bienvenido al módulo de Plataformas.",
    "SharePoint es el repositorio principal de información de la empresa. Outlook es tu correo y calendario, y Teams tu chat y reuniones.",
  ],
  // Solo Luis: lo demás lo explica quien recibe los permisos en el punto B
  comentarios: [],
  // Llevar los permisos del punto A (arriba, en la nube) al punto B (ver mision.js)
  mision: {
    objeto: "los permisos",
    a: { letrero: "La nube", nube: true },
    b: {
      letrero: "Solicitante",
      nombre: "Aldo Anduray",
      cuerpo: "chico",
      pide: ["¡Hola! Soy Aldo Anduray y todavía no tengo acceso a nada.", "Mis permisos están arriba, en la nube: el punto A. Sube saltando por las nubes. ¿Me los traes?"],
      // ✏️ Revisar con Luis Morán (sobre todo cómo se solicita la licencia)
      explica: [
        "¡Gracias! Con estos permisos llega mi licencia de Microsoft.",
        "Con la licencia tengo mi correo empresarial en Outlook, con calendario, contactos y grupos, en la web o en la aplicación de escritorio.",
        "También Microsoft Teams, para chatear y tener reuniones con mi departamento o con otros.",
        "Y acceso a SharePoint, para guardar y trabajar en equipo los documentos de mi departamento.",
        "Sin licencia no hay correo, ni Teams, ni SharePoint: por eso cada miembro del equipo necesita la suya.",
        "La licencia se solicita a Sistemas cuando alguien entra, y Sistemas la registra en su control de licencias.",
        "Ahora ve a la computadora del fondo y demuestra lo que aprendiste.",
      ],
    },
  },
  preguntasPorModulo: 3,
  preguntas: [
    {
      // ✏️ Revisar con Luis Morán
      pregunta: "¿Por qué cada miembro del equipo necesita su licencia de Microsoft?",
      opciones: [
        "Porque con ella tiene su correo en Outlook, Teams y acceso a SharePoint.",
        "Para poder jugar en la computadora.",
        "No hace falta: todos usan la misma cuenta.",
      ],
      correcta: 0,
      explicacion: "La licencia se solicita a Sistemas cuando alguien entra.",
    },
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
      pregunta: "¿Qué puedes gestionar en tu correo empresarial de Outlook?",
      opciones: [
        "Solo los correos que te llegan.",
        "Los archivos de todos los departamentos.",
        "Tu correo, tu calendario, tus contactos y grupos, en la web o en la aplicación de escritorio.",
      ],
      correcta: 2,
      explicacion: "En el calendario agendas tus reuniones y capacitaciones con un nuevo evento.",
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
      pregunta: "¿Qué herramienta usas para chatear y tener reuniones con otros miembros del equipo?",
      opciones: ["Microsoft Teams.", "El historial de versiones.", "La papelera de reciclaje."],
      correcta: 0,
      explicacion: "Y en Outlook gestionas tu correo, calendario, contactos y grupos.",
    },
    {
      pregunta: "Si tienes documentos de empresas distintas, ¿qué te permite SharePoint?",
      opciones: [
        "Guardarlos todos juntos sin control.",
        "Crear intranets o sitios separados, cada uno con sus propios miembros.",
        "Nada: solo funciona con una empresa.",
      ],
      correcta: 1,
      explicacion: "Cada sitio se puede personalizar para compartir noticias y recursos.",
    },
  ],
});
