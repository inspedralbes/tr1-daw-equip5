<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const router = useRouter()

function embarcar () {
  if (!user.name) return
  router.push('/hangar')
}
</script>

<template>
  <h1>Alerta Roja</h1>
  <input v-model="user.name" placeholder="Tu nombre" />
  <button @click="embarcar">Embarcar</button>
</template>