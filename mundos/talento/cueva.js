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

   ✏️ Salen de la "Inducción Nuevos Ingresos": el sueño de Celaque ("Ser la
   fuente que desarrolla Honduras") y sus 4 valores (Buenas Vibras,
   Logrador, Creatividad y Comunicación Directa). Cada antivalor es lo
   opuesto a un valor y se vence eligiendo cómo actuaría ese valor. Las
   situaciones son un borrador que Talento debe validar.
   --------------------------------------------------------------------- */

"use strict";

window.PREGUNTAS_CUEVA = [
  {
    nombre: "Guardián de la Entrada",
    antivalor: "La Mala Vibra", // ✏️ Borrador: lo opuesto a Buenas Vibras
    posicion: -0.05, // afuera, justo antes de la boca de la cueva (negativo = antes de LARGO)
    escala: 1.4, // centinela de piedra: grande e imponente, el primer reto
    factorFrente: 0.55, // se acerca más al pelear (ver anchoFrenteEnemigo en juego/camino/cueva.js)
    // Colores tomados de la hoja de referencia (assets/edificios/GuardianEntrada.png)
    apariencia: { piel: "#F4C79A", ropa: "#3A3A3A", pantalon: "#1F2937", pelo: "#1F2937", sombrero: "#9CA3AF" },
    // Valor: Buenas Vibras
    pregunta: "Un compañero llega desanimado porque algo le salió mal. ¿Qué haces?",
    opciones: [
      "Me quejo con él de todo lo que sale mal en la oficina.",
      "Lo escucho, lo animo y le ofrezco una mano: las buenas vibras se contagian.",
      "Lo ignoro: no es mi problema.",
    ],
    correcta: 1,
  },
  {
    nombre: "Murciélago de la Cueva",
    antivalor: "El Chisme", // ✏️ Borrador: lo opuesto a Comunicación Directa
    posicion: 0.22,
    escala: 0.6, // el más débil: el más chico
    apariencia: { piel: "#7a6a8a", ropa: "#3a2a4a", pantalon: "#241a30", pelo: "#120c18", sombrero: null },
    // Valor: Comunicación Directa
    pregunta: "No estás de acuerdo con cómo un compañero hizo una tarea. ¿Qué haces?",
    opciones: [
      "Se lo digo directamente a él, con respeto, y buscamos juntos cómo mejorarla.",
      "Lo comento con otros a sus espaldas.",
      "Me quedo callado y dejo que el problema crezca.",
    ],
    correcta: 0,
  },
  {
    nombre: "Guerrero Esqueleto",
    antivalor: "El Conformismo", // ✏️ Borrador: lo opuesto a Creatividad
    posicion: 0.39,
    escala: 1.05,
    apariencia: { piel: "#d8d8d0", ropa: "#8a8a80", pantalon: "#5a5a50", pelo: "#e8e8e0", sombrero: null },
    // Valor: Creatividad
    pregunta: "Ves que una tarea de tu área se podría hacer de una forma más sencilla. ¿Qué haces?",
    opciones: [
      "Nada: siempre se ha hecho así.",
      "Espero a que a alguien más se le ocurra.",
      "Propongo la idea a mi equipo y la probamos.",
    ],
    correcta: 2,
  },
  {
    nombre: "Golem de Piedra",
    antivalor: "La Mediocridad", // ✏️ Borrador: lo opuesto a Logrador
    posicion: 0.645,
    escala: 1.3,
    factorFrente: 0.55, // se acerca más al pelear (ver anchoFrenteEnemigo en juego/camino/cueva.js)
    apariencia: { piel: "#8a7a6a", ropa: "#6a5a4a", pantalon: "#4a3e34", pelo: "#3a3028", sombrero: null },
    // Valor: Logrador (y los ORCs de la inducción)
    pregunta: "Tienes un ORC difícil este trimestre. ¿Qué haría un Logrador?",
    opciones: [
      "Lo dejo para el final y entrego lo que salga.",
      "Lo divido en pasos medibles, le doy seguimiento y lo cumplo a tiempo.",
      "Lo cambio por uno más fácil sin avisar.",
    ],
    correcta: 1,
  },
  {
    // Jefe final: trae 2 preguntas ("preguntas" en vez de "pregunta") —
    // hay que responder las 2 en orden para vencerlo, una tras otra.
    nombre: "Guardián de Celaque",
    antivalor: "La Indiferencia", // ✏️ Borrador: jefe final, lo opuesto al sueño de Celaque
    posicion: 0.865,
    escala: 2.2, // jefe final: el gigante de la Cueva
    factorFrente: 0.5, // se acerca más al pelear (ver anchoFrenteEnemigo en juego/camino/cueva.js)
    apariencia: { piel: "#c9a876", ropa: "#7a2f3f", pantalon: "#2e2e2e", pelo: "#1a1a1a", sombrero: null },
    // El sueño y los 4 valores, tal como vienen en la inducción
    preguntas: [
      {
        pregunta: "¿Cuál es el sueño de Celaque?",
        opciones: [
          "Construir el edificio más alto del país.",
          "Ser la fuente que desarrolla Honduras.",
          "Vender la mayor cantidad de apartamentos.",
        ],
        correcta: 1,
      },
      {
        pregunta: "¿Cuáles son los valores de Celaque?",
        opciones: [
          "Buenas Vibras, Logrador, Creatividad y Comunicación Directa.",
          "Rapidez, Silencio, Obediencia y Rutina.",
          "Competencia, Individualismo, Prisa y Perfección.",
        ],
        correcta: 0,
      },
    ],
  },
];
