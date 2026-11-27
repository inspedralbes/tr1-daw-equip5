<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ref, computed } from 'vue'
import { socket } from '@/services/socket'
import CamaraPreview from '@/components/CamaraPreview.vue'

const user = useUserStore()
const router = useRouter()

const colores = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#ff8a65']

const nombre = ref(user.name)
const color = ref(user.color)
const tocado = ref(false)

const nombreLimpio = computed(() => nombre.value.trim())

const error = computed(() => {
  if (nombreLimpio.value.length === 0) return 'Escribe tu nombre'
  if (nombreLimpio.value.length < 2) return 'Mínimo 2 caracteres'
  if (nombreLimpio.value.length > 16) return 'Máximo 16 caracteres'
  if (!/^[\p{L}\d _-]+$/u.test(nombreLimpio.value)) return 'Solo letras, números, - y _'
  return ''
})

const esValido = computed(() => error.value === '')

function embarcar() {
  tocado.value = true
  if (!esValido.value) return // por si acaso

    user.name = nombreLimpio.value
  user.color = color.value

  if (socket.connected) {
    socket.emit('user:hello', { name: user.name, avatar: user.color })
  } else {
    socket.connect()
  }

  router.push('/hangar')
}
</script>

<template>
  <main class="entrada">
    <h1>Alerta Roja</h1>

    <CamaraPreview />
    <form @submit.prevent="embarcar">
      <label for="nombre">Nombre del tripulante</label>
      <input id="nombre" v-model="nombre" maxlength="16" autofocus @blur="tocado = true" />
      <p v-if="tocado && error" class="error">{{ error }}</p>

      <p>Color del traje</p>
      <div class="colores">
        <button
          v-for="c in colores"
          :key="c"
          type="button"
          class="color"
          :class="{ elegido: c === color }"
          :style="{ background: c }"
          @click="color = c"
        ></button>
      </div>

      <div class="avatar" :style="{ background: color }"></div>
      <p>{{ nombreLimpio || 'Tu nombre' }}</p>

      <button type="submit" :disabled="!esValido">Embarcar →</button>
    </form>
  </main>
</template>

<style scoped>
.error {
  color: #d64545;
}
.colores {
  display: flex;
  gap: 12px;
}
.color {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #333;
  cursor: pointer;
}
.elegido {
  border-width: 4px;
  transform: scale(1.15);
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}
button[type='submit']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
