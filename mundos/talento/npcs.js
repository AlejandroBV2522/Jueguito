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
    nombre: "Don Javi",
    posicion: 0.25, // justo después de la puerta de luz (zona de planos)
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
    posicion: 0.42,
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
    posicion: 0.57,
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
    posicion: 0.72,
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
    posicion: 0.86,
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
