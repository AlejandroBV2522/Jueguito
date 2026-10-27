/* Mundo 5 · Seguridad: virus que esquivar y el antivirus que reparar.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   Contenido: inducción de seguridad (ISO 27001) del 26/10/2026. Las buenas
   prácticas van en tres niveles: personal, local (tu equipo) y perimetral
   (la red); cada compañero de la oficina explica uno. */

"use strict";

window.MODULOS.push({
  nombre: "Seguridad",
  subtitulo: "Cuidamos la información",
  sistema: "Seguridad de la información · ISO 27001",
  // ✏️ Borrador: revisar con el área de Seguridad
  descripcion:
    "En Celaque aplicamos la norma ISO 27001 para cuidar los accesos, los equipos y la conexión a internet. Aprende las buenas prácticas en tres niveles: lo personal, tu equipo y la red.",
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
      "En Celaque aplicamos la norma ISO 27001: cuida cómo entramos a los sistemas, los equipos que usamos y cómo nos conectamos a internet.",
      "Hoy tenemos un problema: unos virus dañaron el antivirus del fondo y vienen hacia ti. Agáchate para que no te den los que vuelan alto y salta los que ruedan por el piso.",
      "El equipo te va a dar las buenas prácticas en tres niveles: lo personal, tu equipo y la red. Al hablar con alguien los virus se detienen. Llega al antivirus y repáralo respondiendo bien. ¡Cuento contigo!",
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Agradecida", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
    { nombre: "Mayita Divertida", sobre: "mueble", n: 1, altura: 260, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
  ],
  intro: ["Este es el módulo de Seguridad.", "Aplicamos la norma ISO 27001: cuidar la información es trabajo de todos."],
  // ✏️ Borrador: revisar con Sergio Aguiriano. Un nivel de buenas prácticas por compañero.
  comentarios: [
    {
      // Nivel 1 · Personal: accesos
      nombre: "Mario Flores",
      cuerpo: "chico",
      dialogo: [
        "Nivel 1, lo personal: tus contraseñas van en Bitwarden, nuestra bóveda de contraseñas, nunca en un papel ni en un archivo.",
        "No repitas contraseñas, rótalas cuando toque y activa la verificación en dos pasos (2FA).",
        "Y fíjate en dónde guardas tus archivos: lo que dejas en una carpeta pública lo puede ver cualquiera.",
      ],
    },
    {
      // Nivel 2 · Local: tu equipo
      nombre: "Melida Ordoñez",
      cuerpo: "chica",
      dialogo: [
        "Nivel 2, tu equipo: trabajas con un perfil corporativo y solo se instalan aplicaciones con permiso.",
        "Las memorias USB solo sirven para leer: es el periférico permitido.",
        "Cuando tu computadora pida actualizarse, hazlo: las actualizaciones cierran vulnerabilidades.",
      ],
    },
    {
      // Nivel 3 · Perimetral: la red
      nombre: "Allan Pineda",
      cuerpo: "chico",
      dialogo: [
        "Nivel 3, la red: antes de escribir tus datos en una página, revisa que tenga el candado (SSL).",
        "Sophos revisa los correos para detectar phishing, y cada mes hacemos pruebas de phishing a personas al azar. ¡Si algo se ve raro, repórtalo!",
        "Ya casi llegas al antivirus. ¡Sigue esquivando!",
      ],
    },
  ],
  // Una pregunta por nivel, una de phishing y una de contraseñas (las 5 se hacen en el antivirus)
  preguntasPorModulo: 5,
  preguntas: [
    {
      // ✏️ Borrador: revisar con Sergio Aguiriano · Nivel 1, personal
      pregunta: "¿Dónde guardas tus contraseñas del trabajo?",
      opciones: [
        "En una nota pegada en el monitor.",
        "En un archivo de Excel en el escritorio.",
        "En Bitwarden, con verificación en dos pasos (2FA).",
      ],
      correcta: 2,
      explicacion: "Bitwarden las guarda seguras y el 2FA te protege aunque alguien llegue a saber tu contraseña.",
    },
    {
      // ✏️ Borrador · Nivel 2, local
      pregunta: "Necesitas un programa que no tienes en tu computadora. ¿Qué haces?",
      opciones: [
        "Lo pido: en el perfil corporativo solo se instalan aplicaciones con permiso.",
        "Lo descargo de internet y lo instalo yo.",
        "Le pido su usuario a un compañero para instalarlo.",
      ],
      correcta: 0,
      explicacion: "Las aplicaciones con permiso ya están revisadas; un programa descargado por tu cuenta puede traer un virus.",
    },
    {
      // ✏️ Borrador · Nivel 3, perimetral
      pregunta: "Una página te pide tu usuario y contraseña. ¿Qué revisas primero?",
      opciones: [
        "Que tenga colores bonitos.",
        "Que la dirección sea la correcta y tenga el candado (SSL).",
        "Nada: si apareció en el buscador, es segura.",
      ],
      correcta: 1,
      explicacion: "El candado indica que la conexión va cifrada. Si la dirección no es la de siempre, puede ser phishing.",
    },
    {
      // ✏️ Borrador · Nivel 3, perimetral (phishing)
      pregunta: "Te llega un correo urgente pidiendo tu contraseña. ¿Qué haces?",
      opciones: [
        "La envío rápido para no tener problemas.",
        "No la comparto y lo reporto al área de Sistemas.",
        "Se la reenvío a un compañero.",
      ],
      correcta: 1,
      explicacion: "Nadie de Celaque te pide tu contraseña por correo. Puede ser phishing… o una de las pruebas mensuales de phishing.",
    },
    {
      // ✏️ Borrador · Nivel 1, personal (contraseñas)
      pregunta: "¿Puedes usar la misma contraseña para el correo, Wrike y tu banco?",
      opciones: [
        "Sí, así no se me olvida.",
        "Solo si es larga.",
        "No: cada cuenta lleva su contraseña, guardada en Bitwarden, y se rota cuando toca.",
      ],
      correcta: 2,
      explicacion: "Si una contraseña repetida se filtra, abre todas tus cuentas. Bitwarden te ayuda a tener una distinta para cada una.",
    },
  ],
});
