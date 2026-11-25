<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '@/services/socket'

const router = useRouter()

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
    .emit('client:createRoom', { name: nombreLimpio.value }, (err, respuesta) => {
      enviando.value = false

      if (err) {
        errorServidor.value = 'El servidor no responde. Inténtalo de nuevo'
        return
      }
      if (!respuesta?.ok) {
        errorServidor.value = respuesta?.error || 'No se ha podido crear la nave'
        return
      }

      // El creador pasa directamente a su nave
      router.push(`/nave/${respuesta.room.id}`)
    })
}
</script>

<template>
  <main class="hangar">
    <h1>Hangar</h1>

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
.error {
  color: #d64545;
}
button[type='submit']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>