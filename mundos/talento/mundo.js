/* Mundo 1 · Talento: el camino por la zona industrial y la Cueva (no tiene oficina).
   Su gente del camino está en npcs.js y los antivalores en cueva.js.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "Talento",
  subtitulo: "Celaque: quiénes somos",
  sistema: "Cultura Celaque",
  descripcion:
    "Conoce quiénes somos: nuestro sueño, nuestros valores y la cultura de Celaque. Recorre el camino por la zona industrial, conoce a la gente de la obra y cruza la Cueva respondiendo a sus guardianes.",
  icono: "montana",
  foto: "assets/edificios/Agalta.png", // Agalta, detrás del camino y la Cueva
  fotoBordes: { abajo: 0.12 },
  color: "#488478", // verde institucional
  completoAlSalirDeLaCueva: true, // el camino + la Cueva son este módulo
  anfitrion: {
    nombre: "Nancy Larios",
    cuerpo: "chica",
    posicion: 0.08, // al inicio del camino, en la zona de planos
    // ✏️ Borrador: revisar con Nancy
    dialogo: [
      "¡Hola! Soy Nancy Larios y te doy la bienvenida al módulo de Talento.",
      "Aquí vas a conocer quiénes somos: nuestro sueño, nuestros valores y nuestra cultura.",
      "Recorre el camino, conoce a la gente de la obra y cruza la Cueva. ¡Te espero del otro lado!",
    ],
  },
  // Coleccionables ocultos en el aire (✏️ Borrador: nombres por validar)
  coleccionables: [
    { nombre: "Casco dorado", sobre: "andamio", n: 5, altura: 190 },
    { nombre: "Plano maestro", sobre: "andamio", n: 10, altura: 190 },
    { nombre: "Cristal escondido", sobre: "roca", n: 4, altura: 210 },
  ],
  intro: [],
  preguntas: [],
});
