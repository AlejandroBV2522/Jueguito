/* =====================================================================
   CAMINO A CELAQUE — CONFIGURACIÓN GENERAL
   ---------------------------------------------------------------------
   Lo que vale para todo el juego: velocidad, largo del camino, textos de
   pantalla, colores y los personajes que se pueden elegir.
   Lo de cada mundo (su gente, sus diálogos y sus preguntas) está en su
   carpeta: mundos/<mundo>/ (ver mundos/LEEME.md).
   No necesitas tocar el motor (juego/) para agregar o cambiar NPCs.
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

/* Listas que llenan los archivos de mundos/ (cargados en index.html, en
   orden, después de este archivo):
   - NPCS: la gente del camino de Talento (mundos/talento/npcs.js).
   - PREGUNTAS_CUEVA: los antivalores de la Cueva (mundos/talento/cueva.js).
   - MODULOS: un mundo del mapa por archivo (mundos/<mundo>/mundo.js). */
window.NPCS = [];
window.PREGUNTAS_CUEVA = [];
window.MODULOS = [];

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
                         Si el edificio es "Torre Atlas" o "Edificio Lirios",
                         en el mapa se ve su foto real (assets/edificios/).
                  estacion: dónde se contestan las preguntas: "computadora"
                         (por defecto), "robot" (cada acierto arma una pieza
                         del asistente de IA) o "antivirus" (cada acierto arma
                         una parte del escudo).
   - comentarios: más compañeros dentro de la oficina, cada uno con
                  { nombre, cuerpo: "chico"/"chica", dialogo: [frases] }.
                  Caben 2 (el resto no se muestra).
   - preguntas:   { pregunta, opciones, correcta (índice desde 0),
                    explicacion (opcional, se muestra al acertar) }.

   ✏️ Las preguntas de SharePoint salen de la capacitación "Suite de
   Microsoft". Las demás son un BORRADOR: cada departamento debe
   reemplazarlas con su contenido real.
   --------------------------------------------------------------------- */

/* Proyectos de Celaque que se ven como edificios de fondo en la calle
   (solo decoración, con su nombre en el letrero). */
window.PROYECTOS_CELAQUE = ["Zorzales", "Astria", "Céfiro"];
