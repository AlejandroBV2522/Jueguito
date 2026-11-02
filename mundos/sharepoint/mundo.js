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
  logo: "assets/logos/proyecto-atlas.png",
  oficina: { vista: "nubes", tema: "documentos", edificio: "Torre Atlas", piso: 40 },
  anfitrion: {
    nombre: "Luis Morán",
    cuerpo: "chico",
    // ✏️ Revisar con Luis Morán
    dialogo: [
      "¡Hola! Soy Luis Morán y te doy la bienvenida al módulo de Plataformas.",
      "SharePoint es el repositorio principal de información de Celaque: cada área tiene una carpeta por departamento con la documentación de sus procesos y reportes.",
      "Hoy lo vas a conocer subiendo a la nube, etapa por etapa, tal como viene en la capacitación.",
      "Te pido un favor: Aldo, un solicitante, todavía no puede trabajar. Su licencia de Microsoft está en lo más alto de la nube: súbete por ella y bájasela.",
      "Ten cuidado: en el camino vuelan halcones de malas prácticas que te quieren empujar. Si te caes, tendrás que volver a subir. ¡Salto a salto!",
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Directa", sobre: "nube", n: 27, altura: 170, imagen: "assets/trofeos/mayita.png" }, // valor: Comunicación Directa (sobre el descanso de la etapa 3)
  ],
  intro: [
    "Bienvenido al módulo de Plataformas.",
    "SharePoint es el repositorio principal de información de la empresa. Outlook es tu correo y calendario, y Teams tu chat y reuniones.",
  ],
  // Solo Luis: lo demás lo explican las etapas de la torre y quien recibe la licencia en el punto B
  comentarios: [],
  // Subir por la torre de nubes hasta la licencia (punto A, arriba) y bajársela a
  // Aldo (punto B, abajo). Ver mision.js. Si te caes, vuelves a subir desde donde caíste.
  mision: {
    objeto: "la licencia",
    a: { letrero: "Licencia", nube: true },
    // Una etapa de la torre por tema, en el orden de la capacitación (PDF
    // "Capacitación SharePoint, Outlook y Parámetros de Excel"). El cartel
    // sale al llegar a la nube de descanso de cada etapa. Outlook y Teams
    // los explica Aldo: llegan con la licencia.
    // halcon: la mala práctica que vuela en esa etapa y te empuja (✏️ Borrador:
    // es lo contrario de lo que enseña el tema; revisar con Luis Morán).
    etapas: [
      {
        titulo: "Concepto",
        halcon: "Archivo Suelto",
        texto: "SharePoint es la plataforma de Microsoft para almacenar, organizar, compartir y acceder a información desde cualquier dispositivo. Es el repositorio principal de Celaque: cada área tiene una carpeta por departamento.",
      },
      {
        titulo: "Gestión de documentos",
        halcon: "Final_v3_FINAL",
        texto: "Los documentos se guardan y se comparten en bibliotecas centralizadas, con control de versiones: puedes rastrear los cambios y recuperar una versión anterior.",
      },
      {
        titulo: "Colaboración",
        halcon: "Copia por Correo",
        texto: "Su gran ventaja: los equipos trabajan juntos un mismo documento en tiempo real.",
      },
      {
        titulo: "Intranets y sitios internos",
        halcon: "Acceso para Todos",
        texto: "Se pueden separar sitios por empresa, cada uno con sus propios miembros, para compartir noticias y recursos y personalizarlo según lo que necesite.",
      },
    ],
    b: {
      letrero: "Solicitante",
      nombre: "Aldo Anduray",
      cuerpo: "chico",
      pide: [
        "¡Hola! Soy Aldo Anduray y todavía no tengo acceso a nada.",
        "Mi licencia está en lo más alto de la nube: el punto A. Sube saltando de nube en nube, sin caerte. ¿Me la traes?",
      ],
      // ✏️ Revisar con Luis Morán (sobre todo cómo se solicita la licencia)
      explica: [
        "¡Gracias! Ya tengo mi licencia de Microsoft.",
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
