<script setup>
import { ref } from 'vue'
import PlazaCanvas from '@/components/PlazaCanvas.vue'

const elementosMapa = ref([])
</script>

<template>
  <div class="vista-nave">
    <main style="display: flex; gap: 20px; padding: 20px; font-family: sans-serif">
      <PlazaCanvas @mapa-cargado="elementosMapa = $event" />

      <aside
        style="
          min-width: 260px;
          background: #1e293b;
          color: white;
          padding: 16px;
          border-radius: 10px;
        "
      >
        <h3>Objetos del mapa</h3>
        <p v-if="elementosMapa.length === 0">Cargando el mapa…</p>
        <ul>
          <li v-for="(el, i) in elementosMapa" :key="i" style="margin-bottom: 8px">
            <strong>[{{ el.tipo }}]</strong> {{ el.nombre }}
            <span v-if="el.jugadores !== undefined"> &middot; Jugadores: {{ el.jugadores }}</span>
          </li>
        </ul>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.vista-nave {
  width: 100vw;
  margin-left: calc(50% - 50vw);
}
</style>
