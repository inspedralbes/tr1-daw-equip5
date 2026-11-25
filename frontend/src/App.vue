<script setup>
import { usePresenceStore } from '@/stores/presence'

usePresenceStore().escuchar()
</script>

<template>
  <RouterView />
</template>