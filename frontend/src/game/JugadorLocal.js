import Phaser from 'phaser'
import { bus } from './bus'
import { ANIMACIONES, crearAnimaciones } from './AvataresRemotos'

// Velocidad del jugador en píxeles por segundo
const VELOCIDAD = 160

// Mi propio astronauta: se mueve con el teclado, choca con las paredes
// y avisa por el bus ('player:moved') cuando cambia algo.
export default class JugadorLocal {
  constructor(scene, { x, y, paredes }) {
    this.scene = scene
    this.dir = 'down' // hacia dónde mira: 'up' | 'down' | 'left' | 'right'
    this.anim = 'idle' // 'walk' si anda, 'idle' si está quieto
    this.congelado = false // true cuando hay un panel abierto (sprint 2)
    this.ultimoAviso = null // la última posición que mandamos al bus

    // Crea las animaciones si todavía no existen
    crearAnimaciones(scene)

    // ---------- 1. El sprite, CON física ----------
    this.sprite = scene.physics.add.sprite(x, y, 'astronauta', ANIMACIONES.down.reposo).setDepth(12) // por encima de los demás jugadores (10)

    // Caja de colisión solo en los pies (ver explicación abajo)
    this.sprite.body.setSize(16, 12).setOffset(8, 20)

    // No puede salir del mapa
    this.sprite.setCollideWorldBounds(true)

    // Choca con las paredes del mapa
    scene.physics.add.collider(this.sprite, paredes)

    // ---------- 2. El nombre encima de la cabeza ----------
    this.etiqueta = scene.add
      .text(x, y - 24, '', {
        fontSize: '12px',
        color: '#fde68a',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(13)

    // ---------- 3. El teclado ----------
    this.flechas = scene.input.keyboard.createCursorKeys() // ← ↑ → ↓
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D')

    // ---------- 4. Mensajes que llegan de Vue por el bus ----------
    this.alIniciar = ({ name, color }) => {
      this.etiqueta.setText(name ?? '')
      if (color) this.sprite.setTint(Number.parseInt(color.replace('#', ''), 16))
    }
    this.alCongelar = (valor) => {
      this.congelado = valor
    }

    bus.on('player:init', this.alIniciar)
    bus.on('player:freeze', this.alCongelar)

    // Limpiar al cerrar la escena (si no, los mensajes llegarían repetidos)
    scene.events.once('shutdown', () => this.destruir())
    scene.events.once('destroy', () => this.destruir())
  }

  // Phaser llama a esto unas 60 veces por segundo (desde update() de la escena)
  update() {
    // ---------- 1. Leer el teclado ----------
    let vx = 0 // -1 izquierda, 0 nada, 1 derecha
    let vy = 0 // -1 arriba,    0 nada, 1 abajo

    if (!this.congelado) {
      if (this.flechas.left.isDown || this.wasd.A.isDown) vx = -1
      else if (this.flechas.right.isDown || this.wasd.D.isDown) vx = 1

      if (this.flechas.up.isDown || this.wasd.W.isDown) vy = -1
      else if (this.flechas.down.isDown || this.wasd.S.isDown) vy = 1
    }

    // ---------- 2. Mover ----------
    // normalize(): en diagonal no va más rápido que en línea recta
    const velocidad = new Phaser.Math.Vector2(vx, vy).normalize().scale(VELOCIDAD)
    this.sprite.setVelocity(velocidad.x, velocidad.y)

    // ---------- 3. Animar ----------
    if (vx !== 0 || vy !== 0) {
      // En diagonal manda el movimiento horizontal
      if (vx < 0) this.dir = 'left'
      else if (vx > 0) this.dir = 'right'
      else if (vy < 0) this.dir = 'up'
      else this.dir = 'down'

      this.anim = 'walk'
      // true: si ya está sonando esta animación, no la reinicia
      this.sprite.anims.play(ANIMACIONES[this.dir].clave, true)
    } else {
      this.anim = 'idle'
      this.sprite.anims.stop()
      this.sprite.setFrame(ANIMACIONES[this.dir].reposo)
    }

    // ---------- 4. El nombre sigue al sprite ----------
    this.etiqueta.setPosition(this.sprite.x, this.sprite.y - 24)

    // ---------- 5. Avisar al bus ----------
    this.avisar()
  }

  // Solo avisa si algo ha cambiado. El límite de 10 por segundo
  // ya lo pone services/movimiento.js
  avisar() {
    const pos = {
      x: Math.round(this.sprite.x),
      y: Math.round(this.sprite.y),
      dir: this.dir,
      anim: this.anim,
    }

    const u = this.ultimoAviso
    if (u && u.x === pos.x && u.y === pos.y && u.dir === pos.dir && u.anim === pos.anim) return

    this.ultimoAviso = pos
    bus.emit('player:moved', pos)
  }

  destruir() {
    bus.off('player:init', this.alIniciar)
    bus.off('player:freeze', this.alCongelar)
  }
}
