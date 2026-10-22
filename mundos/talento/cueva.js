/* ---------------------------------------------------------------------
   La Cueva
   ---------------------------------------------------------------------
   Después del camino, el jugador entra a una cueva con 5 enemigos. Cada
   uno hace una pregunta de opción múltiple: acertar lo derrota y deja
   seguir avanzando; fallar resta una vida (hay 3) y repite la misma
   pregunta. El último es el "jefe final".

   - nombre:    nombre de la criatura (también elige su foto: no cambiarlo).
   - antivalor: lo que se combate: el opuesto de un valor de Celaque. Es el
                nombre que se ve sobre el enemigo y en la caja de diálogo.
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

"use strict";

window.PREGUNTAS_CUEVA = [
  {
    nombre: "Guardián de la Entrada",
    antivalor: "La Mediocridad", // ✏️ Borrador: lo opuesto a la calidad
    posicion: -0.05, // afuera, justo antes de la boca de la cueva (negativo = antes de LARGO)
    escala: 1.4, // centinela de piedra: grande e imponente, el primer reto
    factorFrente: 0.55, // se acerca más al pelear (ver anchoFrenteEnemigo en juego/camino/cueva.js)
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
    antivalor: "El Individualismo", // ✏️ Borrador: lo opuesto al trabajo en equipo
    posicion: 0.22,
    escala: 0.6, // el más débil: el más chico
    apariencia: { piel: "#7a6a8a", ropa: "#3a2a4a", pantalon: "#241a30", pelo: "#120c18", sombrero: null },
    pregunta: "¿Cuál es uno de los valores de Celaque?",
    opciones: ["Trabajo en equipo.", "Desorden.", "Irresponsabilidad."],
    correcta: 0,
  },
  {
    nombre: "Guerrero Esqueleto",
    antivalor: "La Imprudencia", // ✏️ Borrador: lo opuesto a la seguridad
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
    antivalor: "La Improvisación", // ✏️ Borrador: lo opuesto a seguir los procesos
    posicion: 0.645,
    escala: 1.3,
    factorFrente: 0.55, // se acerca más al pelear (ver anchoFrenteEnemigo en juego/camino/cueva.js)
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
    antivalor: "La Indiferencia", // ✏️ Borrador: jefe final, lo opuesto al compromiso
    posicion: 0.865,
    escala: 2.2, // jefe final: el gigante de la Cueva
    factorFrente: 0.5, // se acerca más al pelear (ver anchoFrenteEnemigo en juego/camino/cueva.js)
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
