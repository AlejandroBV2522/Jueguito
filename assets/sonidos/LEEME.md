# Sonidos

Mientras no haya archivos, el juego arma cada sonido por su cuenta (Web Audio,
sin nada que descargar). Esta carpeta es para los sonidos propios: cada efecto
puede usar su archivo.

## Cómo asignar un sonido

1. Pon el archivo en esta carpeta, en minúsculas, sin tildes ni espacios. Por
   ejemplo: `salto.mp3`.
2. En `config.js`, en `sonidos`, escribe la ruta junto al efecto:

   ```js
   sonidos: {
     salto: "assets/sonidos/salto.mp3",
     ...
   },
   ```

3. Revisa con `node tools/revisar_proyecto.mjs`: avisa si el archivo no
   existe o si el nombre del efecto está mal escrito.

Si un archivo no carga, ese efecto vuelve al sonido del juego. El botón
"♪ Sonido" apaga todo, los archivos propios también. `volumenSonidos`, en
`config.js`, ajusta el volumen de los archivos (de 0 a 1).

## Cómo debe ser el archivo

- MP3 (recomendado), OGG o WAV.
- Corto: de 0,1 a 1 segundo. "victoria" puede durar hasta 2.
- Sin silencio al principio, para que suene justo en el momento.
- Con volumen parejo entre todos: se juega en la oficina.
- Solo sonidos con licencia para usar en Celaque (propios, comprados o de uso
  libre). Anota de dónde salió cada uno.

## Efectos

| Efecto | Cuándo suena |
|---|---|
| `salto` | al saltar |
| `acierto` | respuesta correcta |
| `error` | respuesta equivocada |
| `golpe` | te toca un virus (Seguridad) |
| `caida` | caes en un hueco de la Cueva |
| `dialogo` | empieza a hablar alguien |
| `candado` | tocas un mundo con candado en el mapa |
| `tubo` | entras o sales por un tubo |
| `nivel` | subes de nivel |
| `abrir` | se abre un mundo nuevo en el mapa |
| `coleccionable` | recoges una guacamaya oculta |
| `pista` | te acercas a una guacamaya oculta |
| `recoger` | tomas lo del punto A (misión de SharePoint) |
| `entregar` | entregas en el punto B |
| `derrota` | vences a un antivalor |
| `pieza` | encaja una pieza del robot o del escudo |
| `victoria` | terminas todo, o completas la colección |
