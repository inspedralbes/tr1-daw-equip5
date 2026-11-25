<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '@/services/socket'
import { useUserStore } from '@/stores/user'
import { usePresenceStore } from '@/stores/presence'

const router = useRouter()
const user = useUserStore()
const presence = usePresenceStore()

const nombre = ref('')
const tocado = ref(false)
const enviando = ref(false)
const errorServidor = ref('')

const nombreLimpio = computed(() => nombre.value.trim())

const error = computed(() => {
  if (nombreLimpio.value.length === 0) return 'Escribe un nombre para la nave'
  if (nombreLimpio.value.length < 3) return 'Mínimo 3 caracteres'
  if (nombreLimpio.value.length > 20) return 'Máximo 20 caracteres'
  if (!/^[\p{L}\d _-]+$/u.test(nombreLimpio.value)) return 'Solo letras, números, - y _'
  return ''
})

const esValido = computed(() => error.value === '')

function crearNave() {
  tocado.value = true
  errorServidor.value = ''
  if (!esValido.value || enviando.value) return

  if (!socket.connected) {
    errorServidor.value = 'No hay conexión con el servidor'
    return
  }

  enviando.value = true

  // timeout(5000): si el servidor no responde en 5 s, el callback recibe un error
  socket
    .timeout(5000)
    .emit('lobby:create-room', { name: nombreLimpio.value, mapId: 'nave' }, (err, respuesta) => {
      enviando.value = false

      if (err) {
        errorServidor.value = 'El servidor no responde. Inténtalo de nuevo'
        return
      }
      if (!respuesta?.ok) {
        errorServidor.value = respuesta?.error?.message || 'No se ha podido crear la nave'
        return
      }

      nombre.value = ''
      tocado.value = false
    })
}
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
        <ul>
          <li v-for="n in presence.rooms" :key="n.id">
            <strong>{{ n.name }}</strong>
            — {{ n.playerCount }}/{{ n.maxPlayers }}
          </li>
        </ul>
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

    <section>
      <h2>Crear nave</h2>

      <form @submit.prevent="crearNave">
        <label for="nave">Nombre de la nave</label>
        <input id="nave" v-model="nombre" maxlength="20" @blur="tocado = true" />

        <p v-if="tocado && error" class="error">{{ error }}</p>
        <p v-if="errorServidor" class="error">{{ errorServidor }}</p>

        <button type="submit" :disabled="!esValido || enviando">
          {{ enviando ? 'Creando…' : 'Crear nave' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.columnas {
  display: flex;
  gap: 24px;
}
.panel {
  flex: 1;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 16px;
}
.punto {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 8px;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  padding: 6px 0;
}
.vacio {
  color: #888;
}
.error {
  color: #d64545;
}
button[type='submit']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
