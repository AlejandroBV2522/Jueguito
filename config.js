/* =====================================================================
   CAMINO A CELAQUE — CONFIGURACIÓN Y DIÁLOGOS
   ---------------------------------------------------------------------
   Este es el archivo para personalizar el juego: velocidad, largo del
   camino, textos de pantalla y los personajes (NPC) con sus diálogos.
   No necesitas tocar main.js para agregar o cambiar NPCs.
   ===================================================================== */

window.CONFIG_JUEGO = {
  velocidadPersonaje: 120,   // píxeles por segundo (súbelo o bájalo a gusto)
  velocidadCorriendo: 240,   // velocidad mientras se mantiene presionada la Q
  largoDelCamino: 7000,      // distancia total desde el inicio hasta Celaque
  nombreMeta: "CELAQUE",     // texto del letrero de llegada
  distanciaParaHablar: 70,   // qué tan cerca debe estar el protagonista de un NPC
  velocidadTexto: 45,        // letras por segundo al escribir los diálogos

  textos: {
    titulo: "Camino a Celaque",
    subtitulo: "Camina, conoce a quienes encuentres y devuélvele el color al mundo.",
    victoriaTitulo: "¡Felicidades!",
    victoriaTexto: "Bienvenido a Celaque.",
    contadorNpcs: "Personas conocidas",
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
                 (usa valores entre 0.08 y 0.95, sin repetir)
   - apariencia: colores en formato "#RRGGBB". "sombrero" puede ser un
                 color o null si no lleva.
   - dialogo:    lista de frases. Cada frase es una "página" del diálogo;
                 el jugador avanza con E / Enter / Espacio o tocando la caja.
   --------------------------------------------------------------------- */

window.NPCS = [
  {
    nombre: "Don Javi",
    posicion: 0.12,
    apariencia: { piel: "#c99468", ropa: "#8d8f91", pantalon: "#4e5054", pelo: "#dcdcdc", sombrero: null },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 1
      "Todo se ve tan gris por aquí... hace tiempo que no sale el sol.",
      "Dicen que si caminas hacia Celaque, el color vuelve poco a poco.",
      "Anda, yo te espero aquí.",
    ],
  },
  {
    nombre: "Keidy",
    posicion: 0.30,
    apariencia: { piel: "#ddbfac", ropa: "#6592fd", pantalon: "#5a4a7a", pelo: "#2b1a12", sombrero: null },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 2
      "¡Hola! ¿Viste? La lluvia ya casi se fue.",
      "Mira los árboles: empiezan a tener hojas otra vez.",
    ],
  },
  {
    nombre: "Mario",
    posicion: 0.50,
    apariencia: { piel: "#d8a47f", ropa: "#e0664f", pantalon: "#6b4b3a", pelo: "#6e6e6e", sombrero: "#e8c872" },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 3
      "Ya vas a mitad de camino.",
      "Aquí siembro flores desde que era niña. Llévate un poco de su color.",
    ],
  },
  {
    nombre: "Guardabosques Allan",
    posicion: 0.70,
    apariencia: { piel: "#b98458", ropa: "#3f8f4f", pantalon: "#5b4a2e", pelo: "#3a2616", sombrero: "#6b8e23" },
    dialogo: [
      // ✏️ Escribe aquí el diálogo del NPC 4
      "Este bosque nublado es hogar de muchísimas especies.",
      "Cuídalo mientras caminas. Celaque ya está cerca.",
    ],
  },
  {
    nombre: "Carlos",
    posicion: 0.88,
    apariencia: { piel: "#e2b08a", ropa: "#2fa3d6", pantalon: "#2d4f7c", pelo: "#a0522d", sombrero: null },
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
    escala: 1, // tamaño base: el primer reto, ni el más débil ni el más grande
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
