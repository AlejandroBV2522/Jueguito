/* Mundo extra · Cafetería: un descanso opcional, sin preguntas.
   Se abre al completar Proyectos (abreDespues) y no sube de nivel. Al fondo
   está la barra de café: tomarse uno es el easter egg (saltas más alto y
   ganas 2 corazones dorados). Todos los personajes del juego conversan al
   fondo y Heber pone música en la terraza alta, donde hay una mayita oculta.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   Va al final en index.html: los extra no cambian el orden de los demás. */

"use strict";

window.MODULOS.push({
  nombre: "Cafetería",
  subtitulo: "Un descanso con el equipo",
  sistema: "Cafetería Celaque",
  descripcion:
    "Un mundo extra para tomarse un respiro: aquí se junta todo el equipo a conversar. No hay preguntas; tómate un café en la barra y sube a la terraza donde Heber pone la música.",
  icono: "cafe",
  color: "#A99886", // beige
  // En la planta baja de Astria (aún no hay foto del edificio en assets/edificios/:
  // el mapa dibuja una torre con su logo; con foto, se pone en "foto")
  logo: "assets/logos/proyecto-astria.png",
  extra: true, // opcional: no cuenta para terminar la capacitación
  abreDespues: "Proyectos",
  oficina: {
    vista: "montana",
    tema: "cafe",
    edificio: "Astria · Cafetería",
    estacion: "cafe", // la barra de café al fondo (juego/oficina/cafeteria.js)
    fondo: true, // todos los personajes conversando al fondo
    // Al aire libre, en la azotea de Astria al anochecer: cielo, ciudad
    // encendida, baranda de vidrio, pérgola con luces y piso de deck
    azotea: true,
    decoracion: ["jardinera", "sofa", "pizarra", "cafetera", "fogata", "jardinera", "especial"],
    largo: 4400, // más larga que una oficina: así cabe todo el equipo al fondo
    muebles: ["planta", "mesa", "sacos", "mesa", "silla", "mesa", "planta"],
    terraza: 4, // la terraza alta queda sobre el 4.º mueble (una mesa)
    // ✏️ Borrador: frases de Heber, por revisar con él
    dj: {
      nombre: "Heber",
      cuerpo: "chico",
      frases: ["¡Bienvenido a la terraza! Aquí arriba suena mejor ♪", "¿Te gusta la música? ¡Súbele!", "Llegaste con energía de café, ¡eso!"],
    },
  },
  recepcion: false, // nadie te recibe en la entrada: todo el equipo está al fondo
  aviso: "☕ Tómate un café en la barra del fondo", // al entrar, sobre el personaje
  // Una sola mayita, en la terraza: con el café se alcanza saltando desde ahí.
  coleccionables: [
    { nombre: "Mayita Alegre", sobre: "terraza", n: 1, altura: 300, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
  ],
  preguntas: [],
});
