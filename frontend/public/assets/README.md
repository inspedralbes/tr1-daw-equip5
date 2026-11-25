# Sprites · Alerta Roja

Todo está a **32×32 px**. Vista previa: [`docs/ux/assets-preview.png`](../../../docs/ux/assets-preview.png).

```
assets/
├── tiles/tileset-nave.png        → tileset para Tiled (4 columnas × 5 filas)
├── personajes/astronauta.png     → spritesheet 4×4 (andar en 4 direcciones)
└── objetos/                      → consola, botón, servidor, señales…
```

## Tileset (`tiles/tileset-nave.png`)

20 tiles de 32×32 en 4 columnas.

- **Filas 1 a 4:** paredes. El negro es la parte de arriba del muro, las líneas claras son el borde y el gris es la cara frontal.
- **Fila 5:**
  - columnas 1 y 2: esquinas rotas o decoración;
  - columna 3: **suelo liso**;
  - columna 4: **suelo con rejilla**.

En **Tiled**: *Nuevo tileset → Imagen → `tileset-nave.png`*, con un tamaño de tile de 32×32.

## Astronauta (`personajes/astronauta.png`)

El traje es **blanco**, para poder cambiarle el color con `setTint()`.

| Fila | Frames | Animación |
|---|---|---|
| 1 | 0–3 | Andar hacia abajo (el frame 0 sirve para "quieto") |
| 2 | 4–7 | Andar hacia arriba |
| 3 | 8–11 | Andar de lado |
| 4 | 12–15 | Andar hacia el otro lado |

## Objetos (`objetos/`)

| Fichero | Tamaño | Uso |
|---|---|---|
| `consola.png` | 2 frames de 32×32 | Consola de avería. Los 2 frames son la pantalla parpadeando |
| `boton-intercom.png` | 2 frames de 32×32 | Intercomunicador (sin pulsar / pulsado) |
| `servidor.png` | 64×32 (2 tiles) | Decoración del reactor y de los motores |
| `rack.png` | 32×32 | Decoración |
| `rejilla-ventilacion.png` | 96×32 (3 tiles) | Decoración del soporte vital |
| `franja-peligro.png` | 32×32 | Suelo junto a las puertas o el reactor |
| `extintor.png` | 32×32 | Decoración |
| `senal-radiacion.png` | 32×32 | Reactor |
| `senal-peligro.png` | 32×32 | Salas con avería |
| `panel-energia.png` | 32×32 | Decoración del puente y de comunicaciones |

## Cargarlos en Phaser

```js
preload () {
  this.load.image('tiles', 'assets/tiles/tileset-nave.png')
  this.load.spritesheet('astronauta', 'assets/personajes/astronauta.png', { frameWidth: 32, frameHeight: 32 })
  this.load.spritesheet('consola', 'assets/objetos/consola.png', { frameWidth: 32, frameHeight: 32 })
  this.load.spritesheet('boton', 'assets/objetos/boton-intercom.png', { frameWidth: 32, frameHeight: 32 })
  this.load.image('servidor', 'assets/objetos/servidor.png')
}

create () {
  this.anims.create({ key: 'abajo', frames: this.anims.generateFrameNumbers('astronauta', { start: 0, end: 3 }), frameRate: 8, repeat: -1 })
  this.anims.create({ key: 'arriba', frames: this.anims.generateFrameNumbers('astronauta', { start: 4, end: 7 }), frameRate: 8, repeat: -1 })
  this.anims.create({ key: 'lado-a', frames: this.anims.generateFrameNumbers('astronauta', { start: 8, end: 11 }), frameRate: 8, repeat: -1 })
  this.anims.create({ key: 'lado-b', frames: this.anims.generateFrameNumbers('astronauta', { start: 12, end: 15 }), frameRate: 8, repeat: -1 })
  this.anims.create({ key: 'consola-on', frames: this.anims.generateFrameNumbers('consola', { start: 0, end: 1 }), frameRate: 2, repeat: -1 })

  const yo = this.add.sprite(100, 100, 'astronauta')
  yo.setTint(0x64b5f6)   // color elegido en la entrada
  yo.play('abajo')
}
```

> En la configuración del juego, pon `pixelArt: true` para que Phaser no difumine los píxeles.

Créditos y licencia: [`CREDITOS.md`](CREDITOS.md).
