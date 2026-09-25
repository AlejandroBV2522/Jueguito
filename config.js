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
    victoriaTitulo: "¡Llegaste a Celaque!",
    victoriaTexto: "El camino gris quedó atrás. Todo florece a tu alrededor.",
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
      "Allá adelante está el letrero de Celaque. ¡Ve!",
    ],
  },
];
