<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import Phaser from 'phaser'
import NaveScene from '@/game/NaveScene'
import { bus } from '@/game/bus'
import { useUserStore } from '@/stores/user'

const emit = defineEmits(['ready', 'mapaCargado'])

const user = useUserStore()
const contenedor = ref(null)

// IMPORTANTE: variables normales, NO ref() ni reactive().
// Vue envolvería los objetos de Phaser en proxies y daría fallos y lentitud.
let game = null
let observer = null

function alRecibirElementos(elementos) {
  emit('mapaCargado', elementos)
}

// Cuando la escena está lista: avisamos a NaveView y le decimos a Phaser quién soy
// (Phaser no puede leer Pinia, así que se lo pasamos por el bus)
function alEscenaLista() {
  emit('ready')
  bus.emit('player:init', { id: user.id, name: user.name, color: user.color })
}

onMounted(() => {
  if (game) return // nunca dos juegos a la vez

  // Antes de crear el juego, para no perder los avisos de la escena
  bus.on('scene:ready', alEscenaLista)
  bus.on('mapa:elementos', alRecibirElementos)

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: contenedor.value,
    // El mapa mide 40x25 tiles de 32 px = 1280x800. El mundo siempre es de este
    // tamaño y FIT lo escala al contenedor manteniendo la proporción.
    width: 1280,
    height: 800,
    backgroundColor: '#0f172a',
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

  game?.destroy(true) // true = quita también el <canvas> del DOM
  game = null

  bus.all.clear() // norma 3 del documento del bus: si no, los mensajes llegan repetidos
})
</script>

<template>
  <div ref="contenedor" class="lienzo-phaser"></div>
</template>

<style scoped>
/* Ancho flexible hasta 1280 px y alto calculado con la proporción del mapa (8:5),
   así no depende de que el padre le dé altura. El marco es un outline (no un border)
   para que no reste espacio al canvas. */
.lienzo-phaser {
  width: 100%;
  max-width: 1280px;
  aspect-ratio: 8 / 5;
  outline: 2px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}
.lienzo-phaser :deep(canvas) {
  display: block;
}
</style>
