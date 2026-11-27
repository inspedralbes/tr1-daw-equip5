<script setup>
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
