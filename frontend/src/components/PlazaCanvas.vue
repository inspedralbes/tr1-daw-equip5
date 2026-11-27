<script setup>
<<<<<<< HEAD
import { onMounted, onUnmounted, ref } from 'vue'
import Phaser from 'phaser'
import { bus } from '../game/bus'
import NaveScene from '../game/NaveScene'

const emit = defineEmits(['ready'])

const contenedor = ref(null)

// IMPORTANTE: variables normales, NO ref() ni reactive().
// Vue envolvería los objetos de Phaser en proxies y daría fallos y lentitud.
let game = null
let observer = null

onMounted(() => {
  if (game) return 

  bus.on('scene:ready', () => emit('ready'))

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: contenedor.value,
    // El mapa mide 40x25 tiles de 32 px = 1280x800. El mundo siempre es de este
    // tamaño y FIT lo escala al contenedor manteniendo la proporción.
    width: 1280,
    height: 800,
    backgroundColor: '#0b0f1a',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [NaveScene],
  })

  // El contenedor puede cambiar de tamaño sin que cambie la ventana
  // (p. ej. al abrir el panel de vídeo o el de tripulación) y Phaser no se entera solo.
  observer = new ResizeObserver(() => {
    if (game?.isBooted) game.scale.refresh()
  })
  observer.observe(contenedor.value)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null

  game?.destroy(true) 
  game = null

=======
import { ref, onMounted, onUnmounted } from 'vue'
import Phaser from 'phaser'
import NaveScene from '@/game/NaveScene'
import { bus } from '@/game/bus'

const emit = defineEmits(['mapaCargado'])

const contenedor = ref(null)
let game = null

function alRecibirElementos(elementos) {
  emit('mapaCargado', elementos)
}

onMounted(() => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 800,
    backgroundColor: '#0f172a',
    pixelArt: true,
    parent: contenedor.value,
    scene: [NaveScene],
  })

  bus.on('mapa:elementos', alRecibirElementos)
})

onUnmounted(() => {
  game?.destroy(true)
>>>>>>> origin/dev
  bus.all.clear()
})
</script>

<<<<<<< HEAD
<template>
  <div ref="contenedor" class="plaza-canvas" />
</template>

<style scoped>
.plaza-canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.plaza-canvas :deep(canvas) {
  display: block;
}
</style>
=======
<template><div ref="contenedor" class="lienzo-phaser"></div></template>

<style scoped>
.lienzo-phaser {
  width: 1280px;
  height: 800px;
  border: 2px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}
</style>
>>>>>>> origin/dev
