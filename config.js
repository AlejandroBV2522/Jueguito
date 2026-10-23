/* =====================================================================
   CAMINO A CELAQUE — CONFIGURACIÓN GENERAL
   ---------------------------------------------------------------------
   Lo que vale para todo el juego: velocidad, largo del camino, textos de
   pantalla, colores y los personajes que se pueden elegir.
   Lo de cada mundo (su gente, sus diálogos y sus preguntas) está en su
   carpeta: mundos/<mundo>/ (ver mundos/LEEME.md).
   No necesitas tocar el motor (juego/) para agregar o cambiar NPCs.
   ===================================================================== */

"use strict";

window.CONFIG_JUEGO = {
  velocidadPersonaje: 120,   // píxeles por segundo (súbelo o bájalo a gusto)
  velocidadCorriendo: 320,   // velocidad mientras se mantiene presionada la Q
  largoDelCamino: 6000,      // distancia desde el inicio hasta la entrada de la Cueva
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

/* Listas que completan los archivos de mundos/ (cargados en index.html, en
   orden, después de este archivo):
   - NPCS: la gente del camino de Talento (la define entera mundos/talento/npcs.js).
   - PREGUNTAS_CUEVA: los antivalores de la Cueva (los define entera mundos/talento/cueva.js).
   - MODULOS: un mundo del mapa por archivo (mundos/<mundo>/mundo.js).
   - TEMAS_OFICINA: cómo se ve cada oficina por dentro (mundos/<mundo>/tema.js). */
window.NPCS = [];
window.PREGUNTAS_CUEVA = [];
window.MODULOS = [];
window.TEMAS_OFICINA = {};

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

   Cada módulo está en su archivo mundos/<mundo>/mundo.js, que hace
   window.MODULOS.push({ ... }) con estos campos. El orden del mapa es el
   orden de esos archivos en index.html.

   - nombre:      nombre del módulo (se ve en el mapa y en la oficina).
                  No lo cambies en un mundo ya publicado: el progreso
                  guardado de cada jugador usa este nombre.
   - subtitulo:   texto chico debajo del nombre.
   - sistema:     el sistema o plataforma del módulo (título de su carta).
   - descripcion: qué es ese sistema (texto de la carta en el mapa).
   - icono:       dibujo en la fachada del edificio del mapa: "montana",
                  "tablero", "engranes", "nube", "escudo" o "chispa".
   - color:       color del edificio ("#RRGGBB").
   - foto:        (opcional) foto real de su edificio en el mapa, ya sin
                  cielo (PNG transparente y recortado), ej.
                  "assets/edificios/Agalta.png". Sin foto se dibuja un
                  edificio genérico del color del módulo.
   - fotoBordes:  (opcional) desvanece los bordes de la foto para que no se
                  vea cortada en línea recta: { arriba, abajo, izquierda,
                  derecha }, cada uno la fracción que se desvanece (ej.
                  abajo: 0.2 la funde con el pasto). Sin esto, la foto
                  se dibuja tal cual (Atlas, Lirios).
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
                  tema:  lo que flota en la oficina, la pizarra y su objeto
                         propio: "planos", "procesos", "documentos",
                         "seguridad" o "ia". Cada tema está dibujado en el
                         tema.js de la carpeta de su mundo (window.TEMAS_OFICINA).
                  edificio / piso: (opcionales) letrero junto a la salida.
                  estacion: dónde se contestan las preguntas: "computadora"
                         (por defecto), "robot" (cada acierto arma piezas de
                         los robots de IA) o "antivirus" (cada acierto arma
                         una parte del escudo).
                  virus: (opcional) true para que crucen virus por la
                         oficina: se esquivan agachándose (los que vuelan) o
                         saltando (los que ruedan). Salen después de hablar
                         con el anfitrión; mientras hablas con alguien se
                         detienen.
                  largo: (opcional) largo de la oficina en px (normal:
                         2600, máximo 3400). Muebles y compañeros se
                         estiran con ella. Seguridad usa 3200.
                  robots: (solo con estacion "robot") cuáles se arman y en
                         qué orden: "tierra", "aereo" y/o "humanoide", ej.
                         ["tierra", "aereo", "humanoide"]. Cada robot hace
                         "preguntasPorModulo" preguntas (con 2: 6 en total).
                         Sin esto, solo el de tierra.
   - comentarios: más compañeros dentro de la oficina, cada uno con
                  { nombre, cuerpo: "chico"/"chica", dialogo: [frases] }.
                  Caben 3 (el resto no se muestra).
   - mision:      (opcional) llevar algo del punto A al punto B antes de
                  la estación del fondo: { objeto: "los permisos",
                  a: { letrero, nube }, b: { letrero, nombre, cuerpo,
                  pide: [frases], explica: [frases] } }. En B espera quien
                  lo pide y, al entregárselo, explica para qué sirve. Con
                  a.nube: true, A está arriba, en una nube, y se sube
                  saltando por una escalera de nubes. Ese
                  mundo no lleva "comentarios" (A y B usan sus lugares).
   - preguntasPorModulo: (opcional) cuántas preguntas hace este mundo, si
                  no son las de CONFIG_JUEGO (arriba). Con robots: por robot.
   - preguntas:   { pregunta, opciones, correcta (índice desde 0),
                    explicacion (opcional, se muestra al acertar) }.

   ✏️ Las preguntas de Proyectos, Procesos, SharePoint e IA salen de las
   capacitaciones de cada área. Las de Seguridad todavía son un BORRADOR:
   el departamento debe reemplazarlas con su contenido real.
   --------------------------------------------------------------------- */

/* Proyectos de Celaque que se ven como edificios de fondo en la calle
   (solo decoración, con su nombre en el letrero). */
window.PROYECTOS_CELAQUE = ["Zorzales", "Astria", "Céfiro"];
