<script setup>
import { useUserStore } from '@/stores/user'
import { usePresenceStore } from '@/stores/presence'

const user = useUserStore()
const presence = usePresenceStore()
</script>

<template>
  <main class="hangar">
    <header class="barra">
      <span class="punto" :style="{ background: user.color }"></span>
      <strong>{{ user.name }}</strong>
      <h1>HANGAR</h1>
    </header>

    <section class="columnas">
      <div class="panel">
        <h2>Naves disponibles</h2>
        <p v-if="presence.rooms.length === 0" class="vacio">
          Todavía no hay naves. ¡Crea la primera!
        </p>
      </div>

      <div class="panel">
        <h2>Conectados ({{ presence.users.length }})</h2>
        <ul>
          <li v-for="u in presence.users" :key="u.id">
            <span class="punto" :style="{ background: u.color }"></span>
            {{ u.name }}
            <em v-if="u.id === user.id">(tú)</em>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.columnas { display: flex; gap: 24px; }
.panel { flex: 1; border: 2px solid #333; border-radius: 8px; padding: 16px; }
.punto { display: inline-block; width: 14px; height: 14px; border-radius: 50%; margin-right: 8px; }
ul { list-style: none; padding: 0; }
li { padding: 6px 0; }
.vacio { color: #888; }
</style>