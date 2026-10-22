/* =====================================================================
   CAMINO A CELAQUE — CONFIGURACIÓN Y DIÁLOGOS
   ---------------------------------------------------------------------
   Este es el archivo para personalizar el juego: velocidad, largo del
   camino, textos de pantalla y los personajes (NPC) con sus diálogos.
   No necesitas tocar main.js para agregar o cambiar NPCs.
   ===================================================================== */

window.CONFIG_JUEGO = {
  velocidadPersonaje: 120,   // píxeles por segundo (súbelo o bájalo a gusto)
  velocidadCorriendo: 320,   // velocidad mientras se mantiene presionada la Q
  largoDelCamino: 7000,      // distancia total desde el inicio hasta Celaque
  nombreMeta: "CELAQUE",     // texto del letrero de llegada
  distanciaParaHablar: 70,   // qué tan cerca debe estar el protagonista de un NPC
  velocidadTexto: 45,        // letras por segundo al escribir los diálogos
  preguntasPorModulo: 2,     // cuántas preguntas hace la computadora de cada oficina (módulo)
  nombrePruebas: "Kojima",   // con este nombre se abren todos los mundos (para probar); "" lo apaga

  textos: {
    titulo: "Camino a Celaque",
    subtitulo: "Elige tu personaje y luego un mundo del mapa.",
    victoriaTitulo: "¿Estás listo?",
    bienvenida: "¡Bienvenido a Celaque!", // título del final, sobre el nombre del jugador
    pideNombre: "¿Cómo te llamas?",
    victoriaTexto: "Completaste todos los módulos de tu capacitación.",
    contadorNpcs: "Personas conocidas",
    letreroFinal: "¿Estás listo?", // letrero al final de la calle de Celaque
  },

  /* Paleta corporativa oficial de Celaque (manual de marca). Prioridad a
     los verdes. Se usa en el dibujo del juego (canvas); los mismos colores
     están en style.css (--cel-...) para la interfaz. */
  colores: {
    verdeProfundo: "#042523",       // texto principal, encabezados, botón primario
    verdeInstitucional: "#488478",  // acento interactivo, estados informativos
    grisClaro: "#CCCCCC",           // divisores y bordes suaves
    beige: "#A99886",               // acentos cálidos y detalles de apoyo
    blanco: "#FFFFFF",              // fondo principal
    negro: "#000000",               // texto alternativo
    // Variantes de interfaz (no oficiales)
    verdeProfundoHover: "#063330",
    fondoVerdeClaro: "#e3eeeb",
  },

  /* Personajes que se pueden elegir al inicio. Los colores son los que
     tendrán al llegar a Celaque (al principio del camino se ven grises).
     - peloLargo: true/false
     - falda / lazo: un color, o null si no lleva */
  personajes: {
    chico: {
      nombre: "Chico",
      piel: "#e0a878", pelo: "#3b2414", ropa: "#ff7a3d", pantalon: "#3c63b8",
      peloLargo: false, falda: null, lazo: null,
    },
    chica: {
      nombre: "Chica",
      piel: "#d9a07a", pelo: "#5a2a14", ropa: "#ff5fa2", pantalon: "#6b4fc1",
      peloLargo: true, falda: "#8e5bd6", lazo: "#ffd23f",
    },
  },
};

/* ---------------------------------------------------------------------
   NPCs
   ---------------------------------------------------------------------
   Cada NPC es un objeto dentro de esta lista. Para agregar más, copia un
   bloque { ... } completo y cambia sus datos. No hay límite de NPCs.

   - nombre:     aparece en la caja de diálogo.
   - posicion:   dónde aparece en el camino. 0 = inicio, 1 = Celaque.
                 (usa valores entre 0.34 y 0.9, sin repetir: antes de
                 0.32 está la zona de planos del inicio)
   - apariencia: colores en formato "#RRGGBB". Todos van vestidos de
                 obra, con la misma ilustración del protagonista teñida
                 con estos colores (casco, chaleco, pantalon y pelo):
                   cuerpo:      "chico" o "chica" (qué ilustración usar).
                   casco:       color del casco (blanco = ingeniero,
                                amarillo = constructor, azul = técnico).
                   chaleco:     color del chaleco reflectivo.
                   botas / herramienta / ropa: solo se usan en el dibujo de
                                respaldo mientras cargan las imágenes.
   - dialogo:    lista de frases. Cada frase es una "página" del diálogo;
                 el jugador avanza con E / Enter / Espacio o tocando la caja.
   --------------------------------------------------------------------- */

window.NPCS = [
  {
    nombre: "Don Javi",
    posicion: 0.36, // justo después de la puerta de luz (zona de planos)
    apariencia: {
      piel: "#c99468", ropa: "#5a7bb5", pantalon: "#3c5a99", pelo: "#dcdcdc", cuerpo: "chico",
      casco: "#ffd23f", chaleco: "#ff7a1a", botas: "#5a3a1f", herramienta: "martillo",
    },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 1
      "Todo se ve tan gris por aquí... hace tiempo que las fábricas no tienen color.",
      "Dicen que si caminas hacia Celaque, el color vuelve poco a poco.",
      "Anda, yo te espero aquí. ¡Y nunca te quites el casco!",
    ],
  },
  {
    nombre: "Keidy",
    posicion: 0.50,
    apariencia: {
      piel: "#ddbfac", ropa: "#6592fd", pantalon: "#5a4a7a", pelo: "#2b1a12", cuerpo: "chica",
      casco: "#ffffff", chaleco: "#c6f432", botas: "#4a3020", herramienta: "plano",
    },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 2
      "¡Hola! ¿Viste? La lluvia ya casi se fue.",
      "Mira las bodegas: ya empiezan a pintarse de colores otra vez.",
    ],
  },
  {
    nombre: "Mario",
    posicion: 0.63,
    apariencia: {
      piel: "#d8a47f", ropa: "#e0664f", pantalon: "#2f5fa8", pelo: "#6e6e6e", cuerpo: "chico",
      casco: "#ffd23f", chaleco: "#ff7a1a", botas: "#5a3a1f", herramienta: "llave",
    },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 3
      "Ya vas a mitad de camino.",
      "Aquí construimos desde hace años. ¿Podemos arreglarlo? ¡Sí, podemos!",
    ],
  },
  {
    nombre: "Ingeniero Allan",
    posicion: 0.76,
    apariencia: {
      piel: "#b98458", ropa: "#3f8f4f", pantalon: "#5b4a2e", pelo: "#3a2616", cuerpo: "chico",
      casco: "#2f80ed", chaleco: "#c6f432", botas: "#3a2616", herramienta: "portapapeles",
    },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 4
      "Esta zona industrial le da trabajo a muchísima gente.",
      "Respeta las señales mientras caminas. Celaque ya está cerca.",
    ],
  },
  {
    nombre: "Carlos",
    posicion: 0.88,
    apariencia: {
      piel: "#e2b08a", ropa: "#2fa3d6", pantalon: "#2d4f7c", pelo: "#a0522d", cuerpo: "chico",
      casco: "#ffffff", chaleco: "#ff7a1a", botas: "#4a3020", herramienta: "plano",
    },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 5
      "¡Lo lograste! Solo un poco más.",
      "Pero antes de llegar, hay una cueva por cruzar. Ten cuidado.",
    ],
  },
];

/* ---------------------------------------------------------------------
   La Cueva
   ---------------------------------------------------------------------
   Después del camino, el jugador entra a una cueva con 5 enemigos. Cada
   uno hace una pregunta de opción múltiple: acertar lo derrota y deja
   seguir avanzando; fallar resta una vida (hay 3) y repite la misma
   pregunta. El último es el "jefe final".

   - nombre:    aparece en la caja de diálogo, igual que los NPCs.
   - posicion:  dónde aparece (0 a 1 = dentro de la cueva, sin repetir).
                El primer enemigo puede llevar un valor negativo (ej. -0.05)
                para quedar afuera, justo antes de la entrada — bloquea el
                paso desde el camino normal, antes de cruzar a la cueva.
   - apariencia: mismos campos que los NPCs (colores en "#RRGGBB").
   - pregunta:  el texto de la pregunta.
   - opciones:  lista de respuestas posibles.
   - correcta:  índice (0, 1, 2...) de la respuesta correcta en "opciones".

   Las preguntas del enemigo 4 y el jefe final son genéricas — reemplázalas
   con el contenido real de la capacitación cuando lo tengas listo.
   --------------------------------------------------------------------- */

window.PREGUNTAS_CUEVA = [
  {
    nombre: "Guardián de la Entrada",
    posicion: -0.05, // afuera, justo antes de la boca de la cueva (negativo = antes de LARGO)
    escala: 1.4, // centinela de piedra: grande e imponente, el primer reto
    factorFrente: 0.55, // se acerca más al pelear (ver anchoFrenteEnemigo en main.js)
    // Colores tomados de la hoja de referencia (assets/edificios/GuardianEntrada.png)
    apariencia: { piel: "#F4C79A", ropa: "#3A3A3A", pantalon: "#1F2937", pelo: "#1F2937", sombrero: "#9CA3AF" },
    pregunta: "¿Cuál es la misión de Celaque?",
    opciones: [
      "Vender productos sin calidad.",
      "Brindar productos y servicios con calidad.",
      "Competir con los clientes.",
    ],
    correcta: 1,
  },
  {
    nombre: "Murciélago de la Cueva",
    posicion: 0.22,
    escala: 0.6, // el más débil: el más chico
    apariencia: { piel: "#7a6a8a", ropa: "#3a2a4a", pantalon: "#241a30", pelo: "#120c18", sombrero: null },
    pregunta: "¿Cuál es uno de los valores de Celaque?",
    opciones: ["Trabajo en equipo.", "Desorden.", "Irresponsabilidad."],
    correcta: 0,
  },
  {
    nombre: "Guerrero Esqueleto",
    posicion: 0.39,
    escala: 1.05,
    apariencia: { piel: "#d8d8d0", ropa: "#8a8a80", pantalon: "#5a5a50", pelo: "#e8e8e0", sombrero: null },
    pregunta: "¿Qué debes usar para protegerte en el trabajo?",
    opciones: [
      "Equipo de protección personal.",
      "Nada.",
      "Solo un casco de juguete.",
    ],
    correcta: 0,
  },
  {
    // ✏️ Marcador de posición: reemplazar con contenido real de la capacitación
    nombre: "Golem de Piedra",
    posicion: 0.645,
    escala: 1.3,
    factorFrente: 0.55, // se acerca más al pelear (ver anchoFrenteEnemigo en main.js)
    apariencia: { piel: "#8a7a6a", ropa: "#6a5a4a", pantalon: "#4a3e34", pelo: "#3a3028", sombrero: null },
    pregunta: "¿Qué debes hacer si no entiendes un proceso de la empresa?",
    opciones: [
      "Preguntar y seguir el proceso establecido.",
      "Improvisar sin avisar a nadie.",
      "Ignorarlo si nadie se da cuenta.",
    ],
    correcta: 0,
  },
  {
    // ✏️ Marcador de posición: jefe final, combina temas anteriores.
    // Trae 2 preguntas ("preguntas" en vez de "pregunta") — hay que
    // responder las 2 en orden para vencerlo, una tras otra.
    nombre: "Guardián de Celaque",
    posicion: 0.865,
    escala: 2.2, // jefe final: el gigante de la Cueva
    factorFrente: 0.5, // se acerca más al pelear (ver anchoFrenteEnemigo en main.js)
    apariencia: { piel: "#c9a876", ropa: "#7a2f3f", pantalon: "#2e2e2e", pelo: "#1a1a1a", sombrero: null },
    preguntas: [
      {
        pregunta: "¿Cuál es uno de los valores de Celaque?",
        opciones: ["Trabajo en equipo.", "Individualismo.", "Competencia interna."],
        correcta: 0,
      },
      {
        pregunta: "¿Qué debes usar para protegerte en el trabajo?",
        opciones: ["Equipo de protección personal.", "Nada, no hace falta.", "Solo si alguien te ve."],
        correcta: 0,
      },
    ],
  },
];

/* ---------------------------------------------------------------------
   Módulos de capacitación = mundos del mapa
   ---------------------------------------------------------------------
   Son 6 módulos y cada uno es un MUNDO (una meseta) del mapa general. Solo
   el primero está abierto; los demás tienen candado hasta completar el
   anterior. Al elegir un mundo el mapa se acerca a él; al tocar su
   edificio aparece su carta (qué sistema es) y desde ahí se entra.

   El primero (Talento) es el camino y la Cueva: se completa al salir de
   ella. Cada uno de los demás es una OFICINA en lo alto de un edificio:
   te reciben compañeros (la "intro" y los "comentarios"), hay muebles que
   saltar, y al fondo una computadora (Terminal Celaque) donde se contestan
   las preguntas. Al terminar vuelves al mapa, subes de nivel y se abre el
   siguiente mundo. Fallar no quita vidas: la opción equivocada se tacha y
   se vuelve a intentar. La computadora hace solo las primeras
   "preguntasPorModulo" (arriba, en CONFIG_JUEGO) de cada módulo.

   - nombre:      nombre del módulo (se ve en el mapa y en la oficina).
   - subtitulo:   texto chico debajo del nombre.
   - sistema:     el sistema o plataforma del módulo (título de su carta).
   - descripcion: qué es ese sistema (texto de la carta en el mapa).
   - icono:       dibujo en la fachada del edificio del mapa: "montana",
                  "tablero", "engranes", "nube", "escudo" o "chispa".
   - color:       color del edificio ("#RRGGBB").
   - logo:        (opcional) ruta a un PNG/SVG con el logo del módulo, ej.
                  "assets/logos/Proyectos.png". Se dibuja SIN deformar
                  (respeta su proporción). Sin logo se ve el recuadro "LOGO".
   - completoAlSalirDeLaCueva: solo para Talento.
   - intro:       lo que dice el compañero que te recibe en la oficina.
   - companero:   (opcional) { nombre: "Ana", cuerpo: "chica" } para el
                  compañero que te recibe. Sin esto: "Equipo de <módulo>".
   - anfitrion:   (opcional) el personaje fijo e importante del mundo: se ve
                  en el mapa y en la carta, y es quien te recibe. Lleva
                  { nombre, cuerpo: "chico"/"chica", dialogo: [frases] }.
                  En Talento espera al inicio del camino ("posicion", igual
                  que los NPCs); en las oficinas reemplaza al que da la intro.
   - oficina:     cómo es el interior de su edificio:
                  vista: lo que se ve por el ventanal: "construccion",
                         "industria", "nubes" (tan alto que solo hay nubes),
                         "montana" o "ciudad" (puntas de edificios).
                  tema:  lo que flota en la oficina y la pizarra: "planos",
                         "procesos", "documentos", "seguridad" o "ia".
                  edificio / piso: (opcionales) letrero junto a la salida.
   - comentarios: más compañeros dentro de la oficina, cada uno con
                  { nombre, cuerpo: "chico"/"chica", dialogo: [frases] }.
                  Caben 2 (el resto no se muestra).
   - preguntas:   { pregunta, opciones, correcta (índice desde 0),
                    explicacion (opcional, se muestra al acertar) }.

   ✏️ Las preguntas de SharePoint salen de la capacitación "Suite de
   Microsoft". Las demás son un BORRADOR: cada departamento debe
   reemplazarlas con su contenido real.
   --------------------------------------------------------------------- */

window.MODULOS = [
  {
    nombre: "Talento",
    subtitulo: "Celaque: quiénes somos",
    sistema: "Cultura Celaque",
    descripcion:
      "Conoce quiénes somos: el propósito, la misión, los valores y la cultura de Celaque. Recorre el camino por la zona industrial, conoce a la gente de la obra y cruza la Cueva respondiendo a sus guardianes.",
    icono: "montana",
    color: "#488478", // verde institucional
    completoAlSalirDeLaCueva: true, // el camino + la Cueva son este módulo
    anfitrion: {
      nombre: "Nancy Larios",
      cuerpo: "chica",
      posicion: 0.08, // al inicio del camino, en la zona de planos
      // ✏️ Borrador: revisar con Nancy
      dialogo: [
        "¡Hola! Soy Nancy Larios y te doy la bienvenida al módulo de Talento.",
        "Aquí vas a conocer quiénes somos: nuestro propósito, misión, valores y cultura.",
        "Recorre el camino, conoce a la gente de la obra y cruza la Cueva. ¡Te espero del otro lado!",
      ],
    },
    intro: [],
    preguntas: [],
  },
  {
    nombre: "Proyectos",
    subtitulo: "Nuestro trabajo en Wrike",
    sistema: "Wrike",
    // ✏️ Borrador: revisar con el área de Proyectos
    descripcion:
      "Wrike es la plataforma donde planeamos y damos seguimiento al trabajo en equipo: proyectos, tareas, responsables, fechas y avances, todo en un mismo lugar y a la vista de todos.",
    icono: "tablero",
    color: "#042523", // verde profundo
    oficina: { vista: "construccion", tema: "planos" },
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
  },
  {
    nombre: "Procesos",
    subtitulo: "Cómo hacemos las cosas",
    sistema: "Procesos de Celaque",
    // ✏️ Borrador: revisar con el área de Procesos
    descripcion:
      "Los procesos describen paso a paso cómo hacemos las cosas en Celaque, para trabajar igual de bien todos los días. Su documentación vive en la carpeta de cada departamento en SharePoint.",
    icono: "engranes",
    color: "#A99886", // beige
    oficina: { vista: "industria", tema: "procesos" },
    intro: ["Este es el edificio de Procesos.", "Los procesos nos ayudan a trabajar igual de bien, todos los días."],
    comentarios: [
      // ✏️ Borrador
      {
        nombre: "Calidad y Procesos",
        cuerpo: "chico",
        dialogo: ["¿No entiendes un paso? Pregúntale a tu líder o al área responsable.", "Es mejor preguntar que improvisar."],
      },
      {
        nombre: "Documentación",
        cuerpo: "chica",
        dialogo: ["Los documentos de cada proceso están en la carpeta de tu departamento en SharePoint.", "Nada de guardarlos en una memoria USB."],
      },
    ],
    preguntas: [
      {
        // ✏️ Borrador: revisar con el área de Procesos
        pregunta: "¿Qué debes hacer si no entiendes un proceso de la empresa?",
        opciones: [
          "Improvisar sin avisar a nadie.",
          "Preguntar a tu líder o al área responsable y seguir el proceso establecido.",
          "Saltarte los pasos que no entiendas.",
        ],
        correcta: 1,
      },
      {
        // ✏️ Borrador
        pregunta: "¿Dónde se guardan los documentos de cada proceso?",
        opciones: [
          "En la carpeta del departamento en SharePoint.",
          "En una memoria USB personal.",
          "En el escritorio de tu computadora.",
        ],
        correcta: 0,
      },
    ],
  },
  {
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
  },
  {
    nombre: "Seguridad",
    subtitulo: "Cuidamos la información",
    sistema: "Seguridad de la información",
    // ✏️ Borrador: revisar con el área de Seguridad
    descripcion:
      "La información de Celaque es valiosa y cuidarla es trabajo de todos: aprende a reconocer correos sospechosos, a no compartir nunca tus contraseñas y a reportar cualquier incidente al área de Sistemas.",
    icono: "escudo",
    color: "#042523", // verde profundo
    oficina: { vista: "montana", tema: "seguridad" },
    anfitrion: {
      nombre: "Sergio",
      cuerpo: "chico",
      // ✏️ Borrador: revisar con Sergio
      dialogo: [
        "¡Hola! Soy Sergio y te doy la bienvenida al edificio de Seguridad.",
        "La información de Celaque es valiosa: cuidarla es trabajo de todos.",
      ],
    },
    intro: ["Este es el edificio de Seguridad.", "La información de Celaque es valiosa: cuidarla es trabajo de todos."],
    comentarios: [
      // ✏️ Borrador
      {
        nombre: "Sistemas",
        cuerpo: "chico",
        dialogo: ["Nadie de Celaque te va a pedir tu contraseña por correo.", "Si te llega algo así, no respondas y repórtalo a Sistemas."],
      },
      {
        nombre: "Seguridad en obra",
        cuerpo: "chica",
        dialogo: ["Y en la obra, la seguridad empieza por tu equipo de protección personal.", "¡Casco puesto siempre!"],
      },
    ],
    preguntas: [
      {
        // ✏️ Borrador: revisar con el área de Seguridad
        pregunta: "Te llega un correo urgente pidiendo tu contraseña. ¿Qué haces?",
        opciones: [
          "La envío rápido para no tener problemas.",
          "No la comparto y lo reporto al área de Sistemas.",
          "Se la reenvío a un compañero.",
        ],
        correcta: 1,
      },
      {
        // ✏️ Borrador
        pregunta: "¿Qué debes usar para protegerte en la obra?",
        opciones: ["Nada.", "Equipo de protección personal.", "Solo un casco de juguete."],
        correcta: 1,
      },
    ],
  },
  {
    nombre: "IA",
    subtitulo: "Inteligencia artificial",
    sistema: "Inteligencia artificial",
    // ✏️ Borrador: revisar con el área responsable
    descripcion:
      "La inteligencia artificial nos ayuda a trabajar mejor si la usamos con criterio: revisa siempre lo que genera antes de usarlo y comparte información de la empresa solo en las herramientas aprobadas.",
    icono: "chispa",
    color: "#A99886", // beige
    oficina: { vista: "ciudad", tema: "ia" },
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
  },
];

/* Proyectos de Celaque que se ven como edificios de fondo en la calle
   (solo decoración, con su nombre en el letrero). */
window.PROYECTOS_CELAQUE = ["Zorzales", "Astria", "Céfiro"];
