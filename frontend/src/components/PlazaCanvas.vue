<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Phaser from 'phaser'
import NaveScene from '@/game/NaveScene'
import { bus } from '@/game/bus'
import { useUserStore } from '@/stores/user'

const emit = defineEmits(['mapaCargado'])

const user = useUserStore()
const contenedor = ref(null)
let game = null

// Phaser nos manda la lista de objetos del mapa (zonas, consolas…) y se la pasamos a NaveView
function alRecibirElementos(elementos) {
  emit('mapaCargado', elementos)
}

// Cuando la escena está lista, le decimos a Phaser quién soy (Phaser no puede leer Pinia)
function alEscenaLista() {
  bus.emit('player:init', { id: user.id, name: user.name, color: user.color })
}

onMounted(() => {
  // Los listeners van ANTES de crear el juego, para no perder ningún mensaje
  bus.on('mapa:elementos', alRecibirElementos)
  bus.on('scene:ready', alEscenaLista)

  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 800,
    backgroundColor: '#0f172a',
    pixelArt: true,
    parent: contenedor.value,
    physics: {
      default: 'arcade',
      arcade: { debug: false }, // ponlo a true para ver las cajas de colisión
    },
    scene: [NaveScene],
  })
})

onUnmounted(() => {
  game?.destroy(true)
  bus.all.clear()
})
</script>

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