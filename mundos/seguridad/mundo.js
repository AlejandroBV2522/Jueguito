/* Mundo 5 · Seguridad: virus que esquivar y el antivirus que reparar.
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
  fotoBordes: { arriba: 0.05, abajo: 0.12, izquierda: 0.08, derecha: 0.08 },
  // virus: salen virus que hay que esquivar (agacharse o saltar) antes del antivirus.
  // largo: oficina más larga que las demás (2600), para esquivar más virus
  oficina: { vista: "montana", tema: "seguridad", estacion: "antivirus", virus: true, largo: 3200, edificio: "Acacias San Ignacio" },
  anfitrion: {
    nombre: "Sergio Aguiriano",
    cuerpo: "chico",
    // ✏️ Borrador: revisar con Sergio Aguiriano
    dialogo: [
      "¡Hola! Soy Sergio Aguiriano y te doy la bienvenida al módulo de Seguridad.",
      "Aquí cuidamos la información de Celaque, y hoy tenemos un problema: unos virus dañaron el antivirus del fondo.",
      "Vienen hacia ti: agáchate para que no te den los que vuelan alto y salta los que ruedan por el piso.",
      "En el camino, el equipo te va a dar unos consejos: al hablar con alguien los virus se detienen. Llega al antivirus y repáralo respondiendo bien. ¡Cuento contigo!",
    ],
  },
  // Coleccionables ocultos en el aire (✏️ Borrador: nombres por validar)
  coleccionables: [
    { nombre: "Llave maestra", sobre: "mueble", n: 4, altura: 260 },
    { nombre: "Escudo dorado", sobre: "mueble", n: 1, altura: 260 },
  ],
  intro: ["Este es el módulo de Seguridad.", "La información de Celaque es valiosa: cuidarla es trabajo de todos."],
  // ✏️ Borrador: revisar con Sergio Aguiriano
  comentarios: [
    {
      nombre: "Mario Flores",
      cuerpo: "chico",
      dialogo: ["Nadie de Celaque te va a pedir tu contraseña por correo.", "Si te llega algo así, no respondas y repórtalo a Sistemas."],
    },
    {
      nombre: "Melida Ordoñez",
      cuerpo: "chica",
      dialogo: ["Si encuentras una memoria USB que no es tuya, no la conectes: entrégala a Sistemas."],
    },
    {
      nombre: "Allan Pineda",
      cuerpo: "chico",
      dialogo: ["Cuidar la información de Celaque es trabajo de todos: reporta cualquier incidente al área de Sistemas.", "Ya casi llegas al antivirus. ¡Sigue esquivando!"],
    },
  ],
  preguntas: [
    {
      // ✏️ Borrador: revisar con Sergio Aguiriano
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
      pregunta: "Encuentras una memoria USB tirada en la oficina. ¿Qué haces?",
      opciones: [
        "La conecto para ver de quién es.",
        "Me la quedo.",
        "No la conecto y se la entrego a Sistemas.",
      ],
      correcta: 2,
    },
  ],
});
