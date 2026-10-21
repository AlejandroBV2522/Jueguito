# Logos e imágenes oficiales

El juego busca estos archivos en esta carpeta. Mientras no existan, en su lugar
se ve un recuadro punteado que dice **LOGO**. Basta con copiar el archivo con
el nombre exacto: no hay que tocar código. Todo se dibuja sin deformar (se
respeta la proporción de cada imagen).

Formato para todos: **PNG con fondo transparente**, recortado al contenido
(sin márgenes vacíos grandes), de al menos **600 px** de ancho.

| Archivo | Qué es | Dónde se ve |
|---|---|---|
| `celaque.png` | Logo de Celaque a color (para fondos claros) | Pared de cada oficina, letrero final "¿Estás listo?" |
| `celaque-blanco.png` | Logo de Celaque en blanco (para fondos oscuros) | Pantalla de inicio, pantalla final, computadora de la oficina |
| `modulo-talento.png` | Logo/ícono del módulo Talento | Letrero del edificio Talento |
| `modulo-proyectos.png` | Logo/ícono del módulo Proyectos | Letrero del edificio Proyectos |
| `modulo-procesos.png` | Logo/ícono del módulo Procesos | Letrero del edificio Procesos |
| `modulo-sharepoint.png` | Logo/ícono del módulo SharePoint | Letrero del edificio SharePoint |
| `modulo-seguridad.png` | Logo/ícono del módulo Seguridad | Letrero del edificio Seguridad |
| `modulo-ia.png` | Logo/ícono del módulo IA | Letrero del edificio IA |
| `proyecto-zorzales.png` | Logo del proyecto Zorzales | Fachada de su torre en la calle |
| `proyecto-astria.png` | Logo del proyecto Astria | Fachada de su torre en la calle |
| `proyecto-cefiro.png` | Logo del proyecto Céfiro | Fachada de su torre en la calle |

Los nombres de módulos y proyectos salen de `config.js` (`MODULOS` y
`PROYECTOS_CELAQUE`), en minúsculas y sin tildes. Si se agrega o renombra uno,
el archivo sigue la misma regla (ej. "Recursos Humanos" → `modulo-recursos-humanos.png`).
