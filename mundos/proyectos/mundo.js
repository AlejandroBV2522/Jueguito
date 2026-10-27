/* Mundo 2 · Proyectos: la obra del Distrito Artemisa, al aire libre, en 5 zonas.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   El contenido sale de la capacitación "Gestión de proyectos" de Sistemas (2025).

   Cada zona de la obra es un tema de esa capacitación y termina con un riesgo
   (un enemigo) que cierra el paso hasta que se responde bien:
     1. La idea                    ¿Qué es un proyecto?
     2. La caseta de solicitudes   Emitir la solicitud en Wrike
     3. La mesa de planos          Documentos: el requerimiento de usuario
     4. La reunión de alcance      El flujo de la solicitud (10 pasos)
     5. La obra y el cierre        Gestión del proyecto: las 5 fases
   Al final de la zona 5 se inaugura la obra y el módulo queda completo. */

"use strict";

window.MODULOS.push({
  nombre: "Proyectos",
  subtitulo: "Cómo llevamos un proyecto",
  sistema: "Gestión de proyectos",
  descripcion:
    "Un proyecto es un esfuerzo temporal para crear un producto, servicio o resultado único. Recorre la obra del Distrito Artemisa: pídelo en Wrike, escribe su requerimiento y llévalo de la idea al cierre. Cada zona termina con un riesgo que debes vencer respondiendo bien.",
  icono: "tablero",
  color: "#042523", // verde profundo
  foto: "assets/edificios/DistritoArtemisa.png", // el edificio que se va levantando en el fondo de la obra
  fotoBordes: { abajo: 0.12, izquierda: 0.05, derecha: 0.05 },
  oficina: {
    exterior: true, // la obra es al aire libre y se recorre por zonas (ver juego/oficina/obra.js)
    vista: "construccion",
    tema: "planos",
    estacion: "inauguracion",
    edificio: "Distrito Artemisa",
    zonas: [
      {
        nombre: "La idea",
        tema: "¿Qué es un proyecto?",
        escena: "idea",
        // El anfitrión es quien recibe en la zona 1
        enemigo: {
          nombre: "La Tarea Disfrazada",
          riesgo: "La Tarea Disfrazada", // el nombre que se ve sobre el enemigo y en la caja de preguntas
          dibujo: "tarea",
          escala: 1.1,
          color: "#8a8f9a",
          // ✏️ Revisar con Nazareth Gallardo
          preguntas: [
            {
              pregunta: "Cada mes tu equipo prepara el mismo reporte de ventas. ¿Es un proyecto?",
              opciones: [
                "Sí, porque requiere mucho esfuerzo y participa todo el equipo.",
                "No: se repite siempre; un proyecto es temporal y único.",
                "Sí, porque el reporte se entrega siempre a la gerencia.",
                "No, porque ningún reporte puede ser parte de un proyecto.",
              ],
              correcta: 1,
              explicacion: "Un proyecto tiene un inicio y un fin definidos, y busca un resultado único.",
            },
            {
              pregunta: "¿Cuál de estas NO es una característica clave de un proyecto?",
              opciones: [
                "Es temporal: tiene un inicio y un fin definidos.",
                "Es único: cada proyecto es diferente, aunque se parezca a otros.",
                "Nunca termina: se repite siempre.",
                "Requiere planificación: recursos, tareas y cronograma.",
              ],
              correcta: 2,
              explicacion: "Las características son: temporal, único, propósito claro y requiere planificación.",
            },
          ],
        },
      },
      {
        nombre: "La caseta de solicitudes",
        tema: "Emitir la solicitud en Wrike",
        escena: "caseta",
        // Los compañeros de cada zona tienen nombres genéricos (✏️ se pueden cambiar por personas del equipo)
        companero: {
          nombre: "Guía de Wrike",
          cuerpo: "chica",
          dialogo: [
            "En Celaque los proyectos no se piden por WhatsApp ni de palabra: todo entra por Wrike.",
            "En Wrike toca el signo + de arriba a la derecha, elige «Solicitud» y busca el formulario «S - Nuevo Proyecto».",
            "Llena todos los campos obligatorios: nombre, objetivo, departamento responsable, responsable, cronograma de hitos, fecha de inicio y de finalización.",
            "El formulario también pregunta si el proyecto requiere apoyo de Sistemas y si involucra a otro departamento. ¡Mira los pantallazos de arriba!",
          ],
        },
        enemigo: {
          nombre: "El Mensaje Perdido",
          riesgo: "El Mensaje Perdido",
          dibujo: "mensaje",
          escala: 1,
          color: "#3f9b5a",
          preguntas: [
            {
              pregunta: "Tu área necesita un proyecto nuevo de Sistemas. ¿Cómo lo solicitas?",
              opciones: [
                "Le escribo a alguien de Sistemas por WhatsApp o por correo para que lo anote.",
                "En Wrike: signo +, «Solicitud» y «S - Nuevo Proyecto».",
                "Se lo comento a mi jefe en la reunión para que él lo recuerde después.",
                "Espero a que Sistemas me pregunte qué necesito para empezar a hacerlo.",
              ],
              correcta: 1,
              explicacion: "Se llenan todos los campos de la solicitud y se adjunta el requerimiento detallado del alcance.",
            },
            {
              pregunta: "Además del nombre y el objetivo, ¿qué más pide el formulario «S - Nuevo Proyecto»?",
              opciones: [
                "Solo el nombre del responsable; lo demás lo define Sistemas más adelante, en la reunión.",
                "El presupuesto exacto y el nombre del proveedor que lo va a construir.",
                "Hitos con fechas, inicio y fin, y si requiere apoyo de Sistemas.",
                "Nada más: el resto se explica después por mensaje directo a Sistemas.",
              ],
              correcta: 2,
              explicacion: "También pide el departamento responsable, el responsable y si involucra a otro departamento.",
            },
          ],
        },
      },
      {
        nombre: "La mesa de planos",
        tema: "El requerimiento de usuario",
        escena: "planos",
        // Una zanja muy ancha para saltarla y una plataforma sobre rieles que va y viene: hay que subirse, dejarse llevar y bajarse al otro lado
        peligro: { tipo: "zanja" },
        companero: {
          nombre: "Analista de Requerimientos",
          cuerpo: "chica",
          dialogo: [
            "El requerimiento de usuario explica qué necesitas: el objetivo, la descripción de la necesidad y la priorización.",
            "Se completa con los criterios de aceptación —qué debe cumplirse para dar por bueno el resultado—, los reportes que necesitas, imágenes guía de lo que esperas y las áreas que se ven impactadas.",
          ],
        },
        enemigo: {
          nombre: "El Requerimiento Vago",
          riesgo: "El Requerimiento Vago",
          dibujo: "papel",
          escala: 1.1,
          color: "#d9b44a",
          preguntas: [
            {
              pregunta: "¿Para qué sirven los criterios de aceptación del requerimiento?",
              opciones: [
                "Decidir qué departamento va a pagar el proyecto completo.",
                "Definir qué debe cumplirse para aceptar el resultado.",
                "Nombrar a la persona de Sistemas que lo va a atender.",
                "Cambiar la fecha del proyecto cuando el área lo prefiera.",
              ],
              correcta: 1,
              explicacion: "Por ejemplo: los casos de uso que se van a probar y que todos queden ok del lado del área funcional.",
            },
          ],
        },
      },
      {
        nombre: "La reunión de alcance",
        tema: "El flujo de la solicitud",
        escena: "reunion",
        companero: {
          nombre: "Facilitador de Reuniones",
          cuerpo: "chico",
          dialogo: [
            "Después de la solicitud empieza un camino de 10 pasos. Los dos primeros son del área solicitante: crear la solicitud y llenar el requerimiento.",
            "Tercero, la reunión inicial entre Sistemas y tu área, donde se define el alcance. Cuarto, Sistemas entrega la propuesta de solución.",
            "Quinto: ¿se acepta la propuesta? Si se rechaza, se vuelve a definir el alcance. Si se aprueba, Sistemas prepara los documentos.",
            "Luego Sistemas registra el proyecto en el portafolio, genera su ID, planifica el cronograma y entrega la fecha final.",
            "Y ojo: el alcance debe ser revisado y aprobado por tu N3, que es el gerente de tu área. Si no, no avanza.",
          ],
        },
        enemigo: {
          nombre: "El Alcance Infinito",
          riesgo: "El Alcance Infinito",
          dibujo: "blob",
          escala: 1.3,
          color: "#5aa86a",
          preguntas: [
            {
              pregunta: "Ordena los primeros pasos de la solicitud de un proyecto.",
              orden: [
                "El área solicitante crea la solicitud en Wrike",
                "El área solicitante llena el requerimiento",
                "Reunión inicial: se define el alcance",
                "Sistemas entrega la propuesta de solución",
                "Se acepta o se rechaza la propuesta",
              ],
              explicacion: "Después Sistemas prepara los documentos, registra el proyecto, genera su ID y planifica el cronograma.",
            },
            {
              pregunta: "Sistemas entrega su propuesta de solución y el área solicitante la rechaza. ¿Qué pasa?",
              opciones: [
                "Se registra igual en el portafolio y se planifica el cronograma.",
                "Se vuelve a definir el alcance en la reunión.",
                "Sistemas entrega la misma propuesta otra vez, sin cambios.",
                "El proyecto se cancela sin más trámite ni explicación.",
              ],
              correcta: 1,
              explicacion: "El alcance se define de nuevo hasta que la propuesta se acepta.",
            },
          ],
        },
      },
      {
        nombre: "La obra y el cierre",
        tema: "Las 5 fases de la gestión",
        escena: "obra",
        // Una talanquera (compuerta de obra) que baja y sube: hay que esperar a que se abra
        peligro: { tipo: "talanquera" },
        companero: {
          nombre: "Líder de Calidad",
          cuerpo: "chico",
          dialogo: [
            "Ya con el proyecto en marcha viene su gestión, que tiene 5 fases: inicio, planificación, ejecución, monitoreo y control, y cierre.",
            "En el inicio está el alcance definido y el kick off. En planificación, el cronograma, la matriz de pruebas y el documento técnico.",
            "En ejecución hay demos, certificación de calidad (QA) y control de cambios. En monitoreo y control, seguimiento y Daily Scrum.",
            "Tu área participa: va a las reuniones de seguimiento y ayuda a ejecutar las pruebas. Cualquier cambio pasa por el control de cambios.",
            "Y al final, el cierre: se oficializa con el acta de cierre y la encuesta de calidad.",
          ],
        },
        enemigo: {
          nombre: "El Proyecto Eterno",
          riesgo: "El Proyecto Eterno",
          dibujo: "reloj",
          escala: 1.9,
          color: "#c0443a",
          preguntas: [
            {
              pregunta: "Ordena las 5 fases de la gestión de un proyecto.",
              orden: ["Inicio", "Planificación", "Ejecución", "Monitoreo y control", "Cierre"],
              explicacion: "En cada fase se entregan cosas distintas: del alcance definido al acta de cierre.",
            },
            {
              pregunta: "Durante las pruebas del proyecto, ¿qué se espera del área solicitante?",
              opciones: [
                "Que esté atenta a las reuniones de seguimiento y participe en la ejecución de pruebas.",
                "Que espere a que Sistemas pruebe todo sin involucrarse.",
                "Que apruebe el proyecto sin probarlo, para ahorrar tiempo.",
                "Que revise el resultado solo hasta el cierre.",
              ],
              correcta: 0,
              explicacion: "También debe facilitar los insumos y realizar la revisión y aprobación por todos los niveles.",
            },
            {
              pregunta: "¿Cómo se oficializa el cierre de un proyecto?",
              opciones: [
                "Cuando el equipo deja de usar el sistema.",
                "Con un correo de agradecimiento al equipo.",
                "Al llegar la fecha final, aunque queden tareas.",
                "Con el acta de cierre y la encuesta de calidad.",
              ],
              correcta: 3,
              explicacion: "El cierre es la quinta fase: se oficializa y se mide la calidad con la encuesta.",
            },
          ],
        },
      },
    ],
  },
  anfitrion: {
    nombre: "Nazareth Gallardo",
    cuerpo: "chica",
    // ✏️ Revisar con Nazareth Gallardo
    dialogo: [
      "¡Hola! Soy Nazareth Gallardo, administradora de Proyectos TI, y te doy la bienvenida al módulo de Proyectos.",
      "Recorre la obra del Distrito Artemisa: cada zona es un paso para pedir y llevar un proyecto en Celaque.",
      "Un proyecto es un esfuerzo temporal para crear un producto, servicio o resultado único. Tiene inicio y fin, un propósito claro y requiere planificación.",
      "Al final de cada zona te espera un riesgo que te cierra el paso. Respóndele bien para seguir. ¡Adelante!",
    ],
  },
  // Guacamayas ocultas en el aire (✏️ Borrador: nombres por validar).
  // sobre "mueble" n = el obstáculo n de la obra, contando desde la entrada (2 por zona).
  // imagen: un archivo de assets/trofeos/ (vacío = la guacamaya dibujada).
  coleccionables: [
    { nombre: "Guacamaya del cronograma", sobre: "mueble", n: 4, altura: 260, imagen: "" },
    { nombre: "Guacamaya de la maqueta", sobre: "mueble", n: 2, altura: 260, imagen: "" },
  ],
  intro: ["Bienvenido al módulo de Proyectos."],
  // En la obra las personas de cada zona están en oficina.zonas[].companero
  comentarios: [],
  // Las preguntas están en los enemigos de cada zona (oficina.zonas[].enemigo.preguntas)
  preguntas: [],
});
