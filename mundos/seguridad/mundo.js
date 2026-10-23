/* Mundo 5 · Seguridad: oficina con la estación del antivirus.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "Seguridad",
  subtitulo: "Cuidamos la información",
  sistema: "Seguridad de la información",
  // ✏️ Borrador: revisar con el área de Seguridad
  descripcion:
    "La información de Celaque es valiosa y cuidarla es trabajo de todos: aprende a reconocer correos sospechosos, a no compartir nunca tus contraseñas y a reportar cualquier incidente al área de Sistemas.",
  icono: "escudo",
  color: "#042523", // verde profundo
  foto: "assets/edificios/Acacias.png",
  oficina: { vista: "montana", tema: "seguridad", estacion: "antivirus", edificio: "Acacias San Ignacio" },
  anfitrion: {
    nombre: "Sergio Aguiriano",
    cuerpo: "chico",
    // ✏️ Borrador: revisar con Sergio Aguiriano
    dialogo: [
      "¡Hola! Soy Sergio Aguiriano y te doy la bienvenida al módulo de Seguridad.",
      "La información de Celaque es valiosa: cuidarla es trabajo de todos.",
    ],
  },
  intro: ["Este es el módulo de Seguridad.", "La información de Celaque es valiosa: cuidarla es trabajo de todos."],
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
});
