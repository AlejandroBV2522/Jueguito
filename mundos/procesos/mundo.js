/* Mundo 3 · Procesos: oficina en el Edificio Lirios.
   Qué significa cada campo: config.js, sección "Módulos de capacitación". */

"use strict";

window.MODULOS.push({
  nombre: "Procesos",
  subtitulo: "Cómo hacemos las cosas",
  sistema: "Procesos de Celaque",
  // ✏️ Borrador: revisar con el área de Procesos
  descripcion:
    "Los procesos describen paso a paso cómo hacemos las cosas en Celaque, para trabajar igual de bien todos los días. Su documentación vive en la carpeta de cada departamento en SharePoint.",
  icono: "engranes",
  color: "#A99886", // beige
  oficina: { vista: "industria", tema: "procesos", edificio: "Edificio Lirios" },
  intro: ["Este es el edificio de Procesos.", "Los procesos nos ayudan a trabajar igual de bien, todos los días."],
  comentarios: [
    // ✏️ Borrador
    {
      nombre: "Calidad y Procesos",
      cuerpo: "chico",
      dialogo: ["¿No entiendes un paso? Pregúntale a tu líder o al área responsable.", "Es mejor preguntar que improvisar."],
    },
    {
      nombre: "Documentación",
      cuerpo: "chica",
      dialogo: ["Los documentos de cada proceso están en la carpeta de tu departamento en SharePoint.", "Nada de guardarlos en una memoria USB."],
    },
  ],
  preguntas: [
    {
      // ✏️ Borrador: revisar con el área de Procesos
      pregunta: "¿Qué debes hacer si no entiendes un proceso de la empresa?",
      opciones: [
        "Improvisar sin avisar a nadie.",
        "Preguntar a tu líder o al área responsable y seguir el proceso establecido.",
        "Saltarte los pasos que no entiendas.",
      ],
      correcta: 1,
    },
    {
      // ✏️ Borrador
      pregunta: "¿Dónde se guardan los documentos de cada proceso?",
      opciones: [
        "En la carpeta del departamento en SharePoint.",
        "En una memoria USB personal.",
        "En el escritorio de tu computadora.",
      ],
      correcta: 0,
    },
  ],
});
