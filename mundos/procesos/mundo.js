/* Mundo 3 · Procesos: la fábrica de procesos del Edificio Lirios.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   El contenido sale de la capacitación "Procesos & Wrike" (2026): solo lo más importante.
   Los números de lámina son los de la página del PDF (el número impreso en cada lámina es 2 más). */

"use strict";

window.MODULOS.push({
  nombre: "Procesos",
  subtitulo: "Nuestros procesos en Wrike",
  sistema: "Wrike",
  descripcion:
    "En Wrike viven los procesos de Celaque: los recurrentes, que se repiten con una frecuencia, y los secuenciales (plantillas y solicitudes), que se activan por un evento. Los procesos nos dan organización, eficiencia y responsabilidad en el trabajo del día a día.",
  icono: "engranes",
  color: "#A99886", // beige
  foto: "assets/edificios/Lirios.png",
  logo: "assets/logos/proyecto-lirios.png",
  // Una fábrica de 5 zonas, una por tema; cada una termina en un riesgo que pregunta (ver juego/oficina/fabrica.js).
  // Al vencer el último se activa la gran máquina, que completa el módulo.
  oficina: {
    exterior: true,
    vista: "fabrica",
    tema: "procesos",
    estacion: "maquina",
    edificio: "Edificio Lirios",
    zonas: [
      // 1 · Recepción: los dos tipos de procesos y el principio OHIO (lám. 4 y 5)
      {
        nombre: "Recepción",
        escena: "recepcion",
        enemigo: {
          nombre: "El Doble Trabajo",
          riesgo: "El Doble Trabajo",
          dibujo: "gemelo",
          color: "#7a8f8c",
          preguntas: [
            {
              pregunta: "¿En qué se dividen los procesos de Celaque?",
              opciones: [
                "En diarios, semanales y mensuales, según cuándo se hacen.",
                "En recurrentes, que se repiten, y secuenciales, que activa un evento.",
                "En los de cada departamento y los de toda la empresa.",
              ],
              correcta: 1,
              explicacion: "Los secuenciales no tienen frecuencia: se activan cuando pasa un evento.", // lám. 4
            },
            {
              pregunta: "Uno de los principios de los procesos es OHIO. ¿Qué significa?",
              opciones: [
                "Hazlo solo una vez: no repetir lo que el proceso ya resuelve.",
                "Hazlo hoy mismo: ningún proceso se deja para mañana.",
                "Hazlo con otro: cada paso lo revisan dos personas.",
              ],
              correcta: 0,
              explicacion: "OHIO significa «hazlo solo una vez». Un buen proceso evita el trabajo doble.", // lám. 5
            },
          ],
        },
      },
      // Compañeros de cada zona: personas del equipo (✏️ confirmar con Astrid quién explica cada zona)
      // 2 · Sala de moldes: las plantillas y cómo se duplican (lám. 11, 13 y 14); lleva la prensa
      {
        nombre: "Sala de moldes",
        escena: "moldes",
        peligro: { tipo: "prensa" },
        companero: {
          nombre: "Juan Flores",
          cuerpo: "chico",
          dialogo: [
            "Las plantillas son procesos secuenciales: se activan por un evento, no con una frecuencia fija.",
            "Cada departamento tiene las suyas, en su carpeta «Plantillas». Cuando se activa una, se guarda y se trabaja en su carpeta de archivo.",
          ],
        },
        enemigo: {
          nombre: "La Copia Equivocada",
          riesgo: "La Copia Equivocada",
          dibujo: "copia",
          color: "#8a7f9a",
          preguntas: [
            {
              pregunta: "Vas a duplicar una plantilla en Wrike. ¿Qué datos debes indicar?",
              opciones: [
                "El nombre, la carpeta de archivo, el asignado (si no tiene) y la fecha.",
                "Solo el nombre; Wrike completa lo demás por su cuenta.",
                "El departamento, el nivel de revisión y la recurrencia.",
              ],
              correcta: 0,
              explicacion: "Así la copia nace con su nombre, en su carpeta de archivo, con responsable y con fecha.", // lám. 14
            },
          ],
        },
      },
      // 3 · Ventanilla de pedidos: las solicitudes (lám. 16 y 18)
      {
        nombre: "Ventanilla de pedidos",
        escena: "ventanilla",
        companero: {
          nombre: "Encargada de Solicitudes", // ✏️ nombre genérico
          cuerpo: "chica",
          dialogo: [
            "Una solicitud nace cuando ocurre un evento con un inicio y un fin definidos. Cada departamento tiene sus propias solicitudes.",
            "Para pedir algo, el formulario te pide los datos: quién solicita, el motivo, el departamento...",
          ],
        },
        enemigo: {
          nombre: "La Solicitud Eterna",
          riesgo: "La Solicitud Eterna",
          dibujo: "solicitud",
          color: "#b08a5a",
          preguntas: [
            {
              pregunta: "¿Cuándo se genera una solicitud en Wrike?",
              opciones: [
                "Cada mes, en una fecha fija del calendario.",
                "Cuando ocurre un evento con inicio y fin definidos.",
                "Cuando el jefe la asigna en la reunión semanal.",
              ],
              correcta: 1,
              explicacion: "A diferencia de un proceso recurrente, la solicitud no se repite sola: la origina un evento.", // lám. 16
            },
            {
              pregunta: "Ordena los pasos para emitir una solicitud en Wrike.",
              orden: [
                "Clic en el signo + arriba a la derecha y elegir «Solicitud»",
                "Buscar el nombre de la solicitud que necesitas",
                "Completar el formulario con los datos solicitados",
              ],
              explicacion: "Primero el +, luego buscar la solicitud y al final llenar el formulario.", // lám. 18
            },
          ],
        },
      },
      // 4 · Etiquetado: el código de cada proceso (lám. 20); lleva la cinta transportadora
      {
        nombre: "Etiquetado",
        escena: "etiquetado",
        peligro: { tipo: "cinta" },
        companero: {
          nombre: "Andrea Ortiz",
          cuerpo: "chica",
          dialogo: [
            "Cada proceso lleva un código en su nombre. En «T-RH-4-1 Revisión Mensual Talento», la T es el departamento (Talento) y RH es el macroproceso.",
            "El 4 es la recurrencia (mensual) y el 1 es el nivel de revisión. Un buen código es lo que mantiene todo ordenado.",
            "Las recurrencias: 1 diario, 2 semanal, 3 quincenal, 4 mensual, 5 trimestral, 6 semestral y 7 anual.",
            "Y tres más: 8 es más de una vez a la semana, 9 bimensual y 10 cada 4 meses.",
          ],
        },
        enemigo: {
          nombre: "El Código Ilegible",
          riesgo: "El Código Ilegible",
          dibujo: "codigo",
          color: "#6f8f9e",
          preguntas: [
            {
              pregunta: "Arma el código de un proceso, como T-RH-4-1: ¿en qué orden van sus piezas?",
              orden: ["Departamento (T)", "Macroproceso (RH)", "Recurrencia (4)", "Nivel de revisión (1)"],
              explicacion: "T-RH-4-1: departamento, macroproceso, recurrencia y nivel de revisión.", // lám. 20
            },
            {
              pregunta: "Vas a crear un proceso que se hace cada trimestre. ¿Qué número de recurrencia lleva su código?",
              opciones: ["El 3", "El 4", "El 5", "El 7"],
              correcta: 2,
              explicacion: "3 es quincenal, 4 mensual, 5 trimestral y 7 anual.",
            },
          ],
        },
      },
      // 5 · Control de calidad: las buenas prácticas (lám. 24, 25 y 26)
      {
        nombre: "Control de calidad",
        escena: "calidad",
        companero: {
          nombre: "Franklin Matute",
          cuerpo: "chico",
          dialogo: [
            "Antes de dar un proceso por terminado, deja la evidencia de lo que hiciste.",
            "Revisa que no queden subtareas activas y córrelo en un día específico, no en un rango.",
            "Y al documentarlo no uses nombres propios: escribe «notificar al siguiente nivel».",
            "El último riesgo te espera adelante. ¡Cuando lo venzas se activa la gran máquina!",
          ],
        },
        enemigo: {
          nombre: "La Subtarea Colgada",
          riesgo: "La Subtarea Colgada",
          dibujo: "subtarea",
          color: "#7f9a86",
          escala: 1.15,
          preguntas: [
            {
              pregunta: "Terminaste de ejecutar un proceso. ¿Cuál es la buena práctica?",
              opciones: [
                "Marcarlo completado y avisar por chat que ya quedó.",
                "Documentar en la tarea la evidencia: lo que hiciste y sus enlaces.",
                "Guardar la evidencia en tu computadora por si te la piden.",
              ],
              correcta: 1,
              explicacion: "La evidencia deja constancia de que el proceso se cumplió.", // lám. 24
            },
            {
              pregunta: "Un proceso todavía tiene subtareas activas. ¿Lo puedes marcar como completado?",
              opciones: [
                "Sí, si ya pasó su fecha de entrega.",
                "No: primero se completan todas sus subtareas.",
                "Sí, si dejas una nota explicando por qué.",
              ],
              correcta: 1,
              explicacion: "No se completan los procesos que tienen subtareas activas.", // lám. 25
            },
            {
              pregunta: "Al correr un proceso, ¿cómo debe quedar su fecha?",
              opciones: [
                "En un solo día específico (por ejemplo, 10 mar).",
                "En un rango de varios días (por ejemplo, 9–10 mar).",
                "Sin fecha, para que cada quien decida.",
              ],
              correcta: 0,
              explicacion: "Los procesos se corren en un día específico, no en un rango de días.", // lám. 26
            },
            {
              pregunta: "Estás escribiendo los pasos de un proceso. ¿Cuál está bien escrito?",
              opciones: [
                "«Avisarle a Pamela cuando termine».",
                "«Notificar al siguiente nivel».",
                "«Mandarle un mensaje a quien sepa».",
              ],
              correcta: 1,
              explicacion: "En los procesos no se usan nombres propios: se notifica o se etiqueta al siguiente nivel.",
            },
          ],
        },
      },
    ],
  },
  anfitrion: {
    nombre: "Astrid Coello",
    cuerpo: "chica",
    // ✏️ Revisar con Astrid Coello
    dialogo: [
      "¡Hola! Soy Astrid Coello y te doy la bienvenida a la fábrica de procesos.",
      "Los procesos nos dan organización, eficiencia y responsabilidad para el trabajo del día a día, y todos viven en Wrike.",
      "Los encuentras en tus paneles de control, en los espacios «Personal» y «Compartido conmigo», y en Proyectos y carpetas.",
      "Hay dos tipos: los recurrentes, que se repiten con una frecuencia, y los secuenciales (plantillas y solicitudes), que se activan por un evento.",
      "Nuestros principios: OHIO (hazlo solo una vez), niveles de revisión, consistencia, recurrencias y eficiencias. Y recuerda: los procesos no son independientes.",
    ],
  },
  // Mayitas ocultas en el aire, con un valor de Celaque o una emoción alegre (✏️ Borrador: nombres por validar).
  // sobre "mueble" n = el obstáculo n de la fábrica, contando desde la entrada.
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Mayita Feliz", sobre: "mueble", n: 4, altura: 260, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
  ],
  intro: ["Este es el módulo de Procesos.", "Los procesos nos dan organización, eficiencia y responsabilidad, y todos viven en Wrike."],
  comentarios: [],
  preguntas: [],
});
