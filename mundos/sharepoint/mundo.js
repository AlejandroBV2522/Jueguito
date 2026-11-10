/* Mundo 4 · Plataformas (SharePoint): oficina en lo alto de la Torre Atlas (SharePoint, Outlook, Teams y Parámetros de Excel).
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   El contenido sale de "Capacitación SharePoint, Outlook y Parámetros de Excel" (16 láminas) y de "Parámetros Excel"
   (la lista de 14 parámetros de formato). Solo lo más importante, como en Proyectos y Procesos.
   Los números de lámina son los de la página del PDF (el número impreso puede diferir). */

"use strict";

window.MODULOS.push({
  nombre: "Plataformas",
  nombreAnterior: "SharePoint", // las partidas guardadas con este nombre siguen contando el mundo como completo
  subtitulo: "SharePoint, Outlook, Teams y Excel",
  sistema: "SharePoint · Outlook · Teams · Excel",
  descripcion:
    "SharePoint es el repositorio principal de información de la empresa: guarda, organiza y comparte documentos desde cualquier dispositivo, con historial de versiones. Outlook es tu correo y calendario, Teams tu chat y reuniones, y los parámetros de Excel dicen cómo dejar una hoja ordenada y fácil de leer.",
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
      "SharePoint es el repositorio principal de Celaque: cada área tiene una carpeta por departamento con la documentación de sus procesos y reportes.",
      "Hoy lo vas a conocer subiendo a la nube, etapa por etapa: SharePoint y, al final, los parámetros de Excel.",
      "Te pido un favor: Aldo, un solicitante, todavía no puede trabajar. Su licencia de Microsoft está en lo más alto de la nube: súbete por ella y bájasela.",
      "Ten cuidado: en el camino vuelan halcones de malas prácticas que te quieren empujar. Si te caes, vuelves a la última nube de descanso. ¡Salto a salto!",
      "En cada banderín lees el tema y te hago unas preguntas: al responder bien se forman las nubes que siguen. No pasa nada si te equivocas: puedes volver a intentar.",
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Directa", sobre: "nube", n: 27, altura: 170, imagen: "assets/trofeos/mayita.png" }, // valor: Comunicación Directa (sobre el descanso de la etapa 3)
  ],
  intro: [
    "Bienvenido al módulo de Plataformas.",
    "SharePoint es el repositorio principal de la empresa. Outlook es tu correo y calendario, Teams tu chat y reuniones, y Excel tiene sus parámetros de formato.",
  ],
  // Solo Luis: lo demás lo explican las etapas de la torre y quien recibe la licencia en el punto B
  comentarios: [],
  // Subir por la torre de nubes hasta la licencia (punto A, arriba) y bajársela a
  // Aldo (punto B, abajo). Ver mision.js y torre-preguntas.js. Si te caes, vuelves a la última nube de descanso.
  mision: {
    objeto: "la licencia",
    a: { letrero: "Licencia", nube: true },
    // Una etapa de la torre por tema, en el orden de la capacitación. El cartel sale al llegar a la nube de
    // descanso de cada etapa (su banderín); ahí se contestan sus preguntas, y al acabarlas se forman las
    // nubes de la etapa siguiente. Outlook y Teams los explica Aldo: llegan con la licencia, y se
    // preguntan en la computadora del fondo.
    // halcon: la mala práctica que vuela en esa etapa y te empuja (✏️ Borrador:
    // es lo contrario de lo que enseña el tema; revisar con Luis Morán).
    // plataformas: cómo son las nubes de la etapa: "nube" (por defecto), "desvanece" (dos se esfuman un
    // rato, avisando antes), "colores" (alternan dos tintes) o "celdas" (celdas de una hoja de Excel).
    etapas: [
      {
        titulo: "Concepto",
        halcon: "Archivo Suelto",
        texto: "SharePoint es la plataforma de Microsoft para almacenar, organizar, compartir y acceder a información desde cualquier dispositivo. Es el repositorio principal de Celaque: cada área tiene una carpeta por departamento.", // lám. 4
        preguntas: [
          {
            pregunta: "¿Qué es SharePoint?",
            opciones: [
              "El programa de correo y calendario de Microsoft.",
              "Una plataforma de Microsoft para almacenar, organizar, compartir y acceder a información desde cualquier dispositivo.",
              "La herramienta de Microsoft para chatear y tener reuniones.",
            ],
            correcta: 1,
            explicacion: "Es el repositorio principal de Celaque: cada área maneja una carpeta por departamento con la documentación de sus procesos y reportes.", // lám. 4
          },
        ],
      },
      {
        titulo: "Gestión de documentos",
        halcon: "Final_v3_FINAL",
        plataformas: "desvanece", // el historial: las versiones van y vienen
        texto: "Los documentos se guardan y se comparten en bibliotecas centralizadas, con control de versiones: puedes rastrear los cambios y recuperar una versión anterior.", // lám. 6
        preguntas: [
          {
            pregunta: "¿Para qué sirve el historial de versiones de un documento?",
            opciones: [
              "Para bloquear el documento y que nadie lo edite.",
              "Para guardar una copia del documento en tu computadora.",
              "Para rastrear los cambios y recuperar versiones anteriores.",
            ],
            correcta: 2,
            explicacion: "Cada cambio queda registrado y puedes volver a una versión anterior.", // lám. 6
          },
        ],
      },
      {
        titulo: "Colaboración",
        halcon: "Copia por Correo",
        texto: "Su gran ventaja: los equipos trabajan juntos un mismo documento en tiempo real.", // lám. 8
        preguntas: [
          {
            pregunta: "¿Cuál es una gran ventaja de SharePoint para el trabajo en equipo?",
            opciones: [
              "Que varias personas pueden trabajar juntas el mismo documento, en tiempo real.",
              "Que cada persona trabaja en su propia copia y luego las juntan por correo.",
              "Que solo una persona a la vez puede abrir el archivo.",
            ],
            correcta: 0,
            explicacion: "Es uno de los puntos fuertes de SharePoint: la colaboración.", // lám. 8
          },
        ],
      },
      {
        titulo: "Intranets y sitios internos",
        halcon: "Acceso para Todos",
        plataformas: "colores", // un tinte por sitio, como las dos empresas de la lámina
        texto: "Se pueden separar sitios por empresa, cada uno con sus propios miembros, para compartir noticias y recursos y personalizarlo según lo que necesite.", // lám. 10
        preguntas: [
          {
            pregunta: "Tienes documentos de empresas distintas. ¿Qué te permite SharePoint?",
            opciones: [
              "Mezclarlos en una sola biblioteca para que todos los vean.",
              "Crear intranets o sitios diferentes, cada uno con sus propios miembros.",
              "Enviarlos por correo a cada empresa.",
            ],
            correcta: 1,
            explicacion: "Así hay mejor control, y cada sitio se puede personalizar para compartir noticias y recursos.", // lám. 10
          },
        ],
      },
      {
        titulo: "Parámetros de Excel",
        halcon: "Hoja Desordenada",
        plataformas: "celdas",
        // Lo más importante de los 14 parámetros del documento "Parámetros Excel"
        texto: "Letra Arial 10 u 11. Título en negrita, arriba a la izquierda y sin subrayar. Encabezados del cuadro en negrita y de color (el azul es buena opción). Sin cuadrícula, sin pestañas vacías y con comas en los valores mayores a mil.",
        preguntas: [
          {
            pregunta: "¿Qué letra se usa en las hojas de Excel?",
            opciones: ["Times New Roman 14.", "Arial 10 u 11.", "Calibri 16."],
            correcta: 1,
            explicacion: "Arial 10 u 11 es el primer parámetro de formato de Excel.", // Parámetros Excel, 1
          },
          {
            pregunta: "¿Cómo debe quedar el título de una hoja de Excel?",
            opciones: [
              "En negrita, en la esquina superior izquierda y sin subrayar.",
              "Centrado y subrayado, para que resalte.",
              "En cursiva, en la esquina inferior derecha.",
            ],
            correcta: 0,
            explicacion: "Después del título se dejan una o dos filas antes del cuadro.", // Parámetros Excel, 2 a 4
          },
          {
            pregunta: "¿Cómo se ponen los encabezados del cuadro en Excel?",
            opciones: [
              "Con el mismo formato que los datos, sin resaltar.",
              "Subrayados y en rojo, para que se noten.",
              "En negrita y de un color agradable: el azul es una buena opción.",
            ],
            correcta: 2,
            explicacion: "Así se distinguen del resto y la hoja se lee más fácil.", // Parámetros Excel, 10
          },
          {
            pregunta: "¿Qué se hace con las pestañas de un archivo de Excel?",
            opciones: [
              "Se dejan todas, por si acaso.",
              "Se eliminan las innecesarias o vacías y se le pone nombre a la que se usa.",
              "Se les pone el nombre de quien las creó.",
            ],
            correcta: 1,
            explicacion: "También se quita la cuadrícula de la página y se usan comas en los valores mayores a mil.", // Parámetros Excel, 6 a 8 y 14
          },
        ],
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
        "Con la licencia tengo mi correo empresarial en Outlook, con calendario, contactos y grupos, en la web o en la aplicación de escritorio.", // lám. 12
        "También Microsoft Teams, para chatear y tener reuniones con mi departamento o con otros.", // lám. 15
        "Y acceso a SharePoint, para guardar y trabajar en equipo los documentos de mi departamento.",
        "La licencia se solicita a Sistemas cuando alguien entra, y Sistemas la registra en su control de licencias.",
        "Ahora ve a la computadora del fondo: te pregunto por Outlook y Teams.",
      ],
    },
  },
  // En la computadora del fondo: lo que explicó Aldo (Outlook y Teams). Las demás preguntas
  // están en los banderines de la torre (mision.etapas[].preguntas).
  preguntasPorModulo: 2,
  preguntas: [
    {
      pregunta: "¿Qué gestionas en tu correo empresarial de Outlook?",
      opciones: [
        "Los documentos y bibliotecas de tu departamento.",
        "Solo tus correos: el calendario se maneja en otra herramienta.",
        "Tu correo, calendario, contactos y grupos, en la web o en la aplicación de escritorio.",
      ],
      correcta: 2,
      explicacion: "En el calendario agendas tus reuniones y capacitaciones con un nuevo evento.", // lám. 12 y 13
    },
    {
      pregunta: "Con la licencia también tienes Microsoft Teams. ¿Para qué sirve?",
      opciones: [
        "Para chatear, tener reuniones y hablar con colaboradores de tu departamento o de otro.",
        "Para guardar y versionar los documentos de la empresa.",
        "Para gestionar tu calendario y tus contactos.",
      ],
      correcta: 0,
      explicacion: "Teams es el chat y las reuniones; los documentos viven en SharePoint y el calendario en Outlook.", // lám. 15
    },
  ],
});
