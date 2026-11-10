/* ---------------------------------------------------------------------
   NPCs
   ---------------------------------------------------------------------
   Cada NPC es un objeto dentro de esta lista. Para agregar más, copia un
   bloque { ... } completo y cambia sus datos. No hay límite de NPCs.

   - nombre:     aparece en la caja de diálogo.
   - posicion:   dónde aparece en el camino. 0 = inicio, 1 = Celaque.
                 (usa valores entre 0.24 y 0.9, sin repetir: antes de
                 0.2 está la zona de planos del inicio)
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

"use strict";

window.NPCS = [
  {
    nombre: "Buena Vibra",
    posicion: 0.25, // justo después de la puerta de luz (zona de planos)
    apariencia: {
      piel: "#c99468", ropa: "#5a7bb5", pantalon: "#3c5a99", pelo: "#dcdcdc", cuerpo: "chico",
      casco: "#ffd23f", chaleco: "#ff7a1a", botas: "#5a3a1f", herramienta: "martillo",
    },
    dialogo: [
      // ✏️ Borrador (inducción de Talento): valor Buenas Vibras
      "¡Qué gusto verte en la obra! Por aquí todo se ve gris, pero con Buenas Vibras el color vuelve.",
      "Buenas Vibras es uno de nuestros 4 valores: saludar, dar ánimo y echarle una mano a quien lo necesita.",
      "Si un compañero llega desanimado, una buena actitud contagia a todo el equipo. ¡Recuérdalo en la Cueva!",
    ],
  },
  {
    nombre: "Creativa",
    posicion: 0.42,
    apariencia: {
      piel: "#ddbfac", ropa: "#6592fd", pantalon: "#5a4a7a", pelo: "#2b1a12", cuerpo: "chica",
      casco: "#ffffff", chaleco: "#c6f432", botas: "#4a3020", herramienta: "plano",
    },
    dialogo: [
      // ✏️ Borrador (inducción de Talento): valor Creatividad
      "¡Hola! ¿Ves cómo las bodegas empiezan a pintarse? Eso es Creatividad, otro de nuestros valores.",
      "En Celaque buscamos formas nuevas y más sencillas de hacer las cosas, aunque \"siempre se haya hecho así\".",
      "Si se te ocurre una mejora, compártela con tu equipo. Las buenas ideas no se quedan guardadas.",
    ],
  },
  {
    nombre: "Logrador",
    posicion: 0.57,
    apariencia: {
      piel: "#d8a47f", ropa: "#e0664f", pantalon: "#2f5fa8", pelo: "#6e6e6e", cuerpo: "chico",
      casco: "#ffd23f", chaleco: "#ff7a1a", botas: "#5a3a1f", herramienta: "llave",
    },
    dialogo: [
      // ✏️ Borrador (inducción de Talento): valor Logrador y los ORCs
      "Ya vas a mitad de camino. ¡Eso es ser Logrador: proponerte algo y sacarlo adelante!",
      "Para eso usamos los ORCs: objetivos y resultados clave. Deben ser específicos, medibles, alcanzables y con periodo de caducidad.",
      "Si un ORC se pone difícil, no lo sueltes: haz un plan, pide ayuda y da seguimiento. ¿Podemos? ¡Sí, podemos!",
    ],
  },
  {
    nombre: "Directo",
    posicion: 0.72,
    apariencia: {
      piel: "#b98458", ropa: "#3f8f4f", pantalon: "#5b4a2e", pelo: "#3a2616", cuerpo: "chico",
      casco: "#2f80ed", chaleco: "#c6f432", botas: "#3a2616", herramienta: "portapapeles",
    },
    dialogo: [
      // ✏️ Borrador (inducción de Talento): valor Comunicación Directa y registro de casos
      "Aquí hablamos claro: Comunicación Directa. Si algo no te parece, díselo con respeto a la persona indicada.",
      "Nada de chismes: los problemas se hablan de frente y se resuelven en equipo.",
      "Y cuando algo sale mal, lo anotamos en el registro de casos: así aprendemos de nuestros errores.",
      "Un buen caso busca la raíz, no solo apaga el fuego: tiene responsable, seguimiento y una resolución que perdure.",
    ],
  },
  {
    nombre: "Valiente",
    posicion: 0.86,
    apariencia: {
      piel: "#e2b08a", ropa: "#2fa3d6", pantalon: "#2d4f7c", pelo: "#a0522d", cuerpo: "chico",
      casco: "#ffffff", chaleco: "#ff7a1a", botas: "#4a3020", herramienta: "plano",
    },
    dialogo: [
      // ✏️ Borrador (inducción de Talento): el sueño de Celaque
      "¡Ya casi llegas! ¿Sabes cuál es nuestro sueño? Ser la fuente que desarrolla Honduras.",
      "Lo cumplimos con nuestros 4 valores: Buenas Vibras, Logrador, Creatividad y Comunicación Directa.",
      "Adelante hay una cueva con guardianes que ponen a prueba esos valores. Cambiemos percepciones, cambiemos hábitos. ¡Crezcamos juntos!",
    ],
  },
];
