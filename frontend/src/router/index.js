import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import EntradaView from '@/views/EntradaView.vue'
import HangarView from '@/views/HangarView.vue'
import NaveView from '@/views/NaveView.vue'
import InformeView from '@/views/InformeView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'entrada', component: EntradaView },
    { path: '/hangar', name: 'hangar', component: HangarView, meta: { necesitaNombre: true } },
    { path: '/nave/:roomId', name: 'nave', component: () => import('@/views/NaveView.vue'), meta: { necesitaNombre: true },},
    { path: '/informe', name: 'informe', component: InformeView, meta: { necesitaNombre: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const user = useUserStore()

  if (to.meta.necesitaNombre && !user.name) {
    return { name: 'entrada' }
  }
})

export default router
