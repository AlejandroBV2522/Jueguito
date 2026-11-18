/* Mundo extra · Cafetería: un descanso opcional, sin preguntas.
   Se abre al completar Proyectos (abreDespues) y no sube de nivel. Al fondo
   está la barra de café: tomarse uno es el easter egg (saltas más alto y
   ganas 2 corazones dorados). Todos los personajes del juego conversan al
   fondo y Eber pone música en la terraza alta, sentado con su sopa, donde hay una mayita oculta.
   Qué significa cada campo: config.js, sección "Módulos de capacitación".
   Va al final en index.html: los extra no cambian el orden de los demás. */

"use strict";

window.MODULOS.push({
  nombre: "Cafetería",
  subtitulo: "Un descanso con el equipo",
  sistema: "Cafetería Celaque",
  descripcion:
    "Un mundo extra para tomarse un respiro: aquí se junta todo el equipo a conversar. No hay preguntas; tómate un café en la barra y sube a la terraza donde Eber pone la música.",
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
    // ✏️ Borrador: frases de Eber, por revisar con él
    dj: {
      nombre: "Eber",
      cuerpo: "chico",
      frases: ["¡Qué bueno que subiste a la terraza! Aquí arriba suena mejor ♪", "¿Gustas sopita? ¡Está buenísima!", "Llegaste con energía de café, ¡eso!"],
    },
    // Lo que platican los grupos del fondo (cafeteria.js): cada grupo con
    // gente del equipo tiene un tema; en su globo salen las frases cortas de
    // "globos" y, al acercarte (E o Hablar), escuchas sus "lineas", dichas
    // por turnos por quienes están en la mesa. Al volver a escuchar el mismo
    // grupo cambia de tema. Los datos salen literal de la Inducción de
    // Nuevos Ingresos (induccion-talento.txt) y del Sistema Operativo Celaque
    // (sistema-operativo.txt); la bóveda de contraseñas no va aquí (sin decidir).
    // ✏️ Borrador: revisar con Talento (la redacción como plática)
    platicas: [
      {
        tema: "Beneficios",
        globos: ["¡Hay becas!", "Mentorías", "Estipendio de libros"],
        lineas: [
          "¿Ya viste los beneficios de Celaque? Hay mentorías y beneficio de graduación.",
          "Y también estipendio de libros, estipendio de aprendizaje y becas.",
          "Si quieres seguir aprendiendo, pregúntale a Talento por cada uno. ¡Crezcamos juntos!",
        ],
      },
      {
        tema: "Política de flexibilidad",
        globos: ["¡Día de cumpleaños!", "Trabajo remoto", "Horas de permiso"],
        lineas: [
          "La política de flexibilidad tiene cinco puntos. Mi favorito: el día de cumpleaños.",
          "Los otros son permisos especiales, cambio de horario, horas de permiso y trabajo remoto.",
          "El trabajo remoto se pide en Flair, igual que las vacaciones.",
        ],
      },
      {
        tema: "Salud",
        globos: ["Seguro privado", "Descuento en óptica"],
        lineas: [
          "En salud tenemos seguro privado y descuento en óptica.",
          "Para un reclamo del seguro privado hay un formulario en los documentos de uso general.",
        ],
      },
      {
        tema: "Familia e hijos",
        globos: ["Paternidad: 10 días", "Guardería", "¿Baby shower?"],
        lineas: [
          "¿Sabías que por matrimonio son 2 días y por paternidad, 10 días?",
          "Hay beneficio de guardería para hijos de 3 meses a 5 años.",
          "También hay permiso por duelo y celebración de baby shower.",
        ],
      },
      {
        tema: "Terrazas de Agalta",
        globos: ["Terraza nivel 19", "¿Y el nivel 22?"],
        lineas: [
          "¿Conoces las terrazas de Agalta? Las de los niveles 19 y 20 se usan sin costo.",
          "Solo necesitas la autorización previa de Talento.",
          "La terraza y los salones del nivel 22 se gestionan con la administración del condominio.",
        ],
      },
      {
        tema: "Beneficios por ley",
        globos: ["Vacaciones: 10 días", "IHSS y RAP", "¡Décimo cuarto!"],
        lineas: [
          "Las vacaciones crecen con los años: 10 días al primer año, 12 al segundo y 15 al tercero.",
          "Con 4 años o más son 20 días.",
          "En planilla tienes IHSS, RAP, décimo tercer mes y décimo cuarto mes.",
        ],
      },
      {
        tema: "Maternidad y lactancia",
        globos: ["Maternidad: 42 días", "Lactancia: 1 hora"],
        lineas: [
          "La maternidad son 42 días, pre- y posparto.",
          "Después viene la lactancia: 1 hora diaria durante 6 meses.",
          "La Guía de maternidad y la solicitud de tiempo de lactancia están en los documentos de uso general.",
        ],
      },
      {
        tema: "Referidos",
        globos: ["¿Referiste a alguien?", "Bono por referido"],
        lineas: [
          "Las plazas disponibles se publican cada semana en el LinkedIn de Celaque.",
          "¿Conoces a alguien con interés en aplicar? Refiérelo con la solicitud en Wrike.",
          "Si contratan a esa persona, puedes recibir un bono por referido.",
          "Ojo: si la persona aplicó antes de ser referida, no hay bono.",
        ],
      },
      {
        tema: "Comunidad",
        globos: ["¡Club de lectura!", "Reunión mensual"],
        lineas: [
          "En la cultura de Celaque hay tiempo de comunidad y reunión mensual de equipo.",
          "También hay foros y club de lectura. ¿Te apuntas?",
        ],
      },
      {
        tema: "Plataformas",
        globos: ["Netsuite", "¿Flair o AGAX?"],
        lineas: [
          "Netsuite es el ERP: facturación, CRM e inventario.",
          "Flair es el administrador de permisos y AGAX, la plataforma institucional.",
        ],
      },
      {
        tema: "Vacaciones en Flair",
        globos: ["Flair › Ausencias", "Enviar solicitud"],
        lineas: [
          "¿Cómo pido vacaciones? Entra a Flair, celaquehr.hub.flair.hr, con tu correo corporativo.",
          "Haz clic en «Ausencias», en el menú lateral izquierdo, y luego en «Añadir nueva ausencia».",
          "Elige el tipo: vacaciones, trabajo remoto, incapacidades… y marca la fecha de inicio y de fin.",
          "Presiona «Enviar solicitud». Te llega una notificación cuando la aprueban o la rechazan.",
        ],
      },
      {
        tema: "Nuestros proyectos",
        globos: ["¿Zorzales o Atlas?", "Centro Morazán"],
        lineas: [
          "Nuestros proyectos: Astria, Agalta, Acacias San Ignacio, Distrito Artemisa, Cipreses San Ignacio y Atlas.",
          "Y también Lirios de Miraflores, Real de Minas, Zorzales del Merendón, Céfiro Azul, Apolo y Aura.",
          "Entre los proyectos anteriores están Centro Morazán, Atenea y Metrópolis.",
        ],
      },
      {
        tema: "Reuniones semanales",
        globos: ["Daily: 15 min", "Retro: 45 min"],
        lineas: [
          "El lunes, 30 minutos de planificación: objetivo y compromisos de la semana.",
          "De lunes a viernes, la Daily: 15 minutos de pie. ¿Qué avancé? ¿Qué me frena?",
          "En la Daily no se resuelve: se asigna.",
          "El viernes, 10 minutos de revisión, y a fin de mes, 45 minutos de retrospectiva.",
        ],
      },
    ],
  },
  recepcion: false, // nadie te recibe en la entrada: todo el equipo está al fondo
  aviso: "☕ Tómate un café en la barra del fondo", // al entrar, sobre el personaje
  // Una sola mayita, en la terraza: con el café se alcanza saltando desde ahí.
  coleccionables: [
    { nombre: "Mayita Alegre", sobre: "terraza", n: 1, altura: 300, imagen: "assets/trofeos/mayita.png" }, // emoción alegre
  ],
  preguntas: [],
});
