import { defineStore } from 'pinia'


export const usePlayersStore = defineStore('players', {
    state: () => ({
        byId: {} 
    }),

    getters: {
        list: (state) => Object.values(state.byId),
        count() {
            return this.list.length
        },
        getById: (state) => (id) => state.byId[id] ?? null,
        inZone() {
            return (zoneId) => this.list.filter((p) => p.zoneId === zoneId)
        }
    },

    actions: {
        setAll(players, selfId) {
            this.byId = {}
            for (const p of players) {
                if (p.id !== selfId) this.byId[p.id] = p
            }
        },

        add(player) {
            this.byId[player.id] = player
        },
        remove(id) {
            delete this.byId[id]
        },

        move({ id, x, y, dir, anim }) {
            const p = this.byId[id]
            if (!p) return
            p.x = x
            p.y = y
            p.dir = dir
            p.anim = anim
        },

        update({ id, ...patch }) {
            const p = this.byId[id]
            if (!p) return
            if (patch.media) patch.media = { ...p.media, ...patch.media }
            Object.assign(p, patch)
        },

        setZone(id, zoneId) {
            const p = this.byId[id]
            if (p) p.zoneId = zoneId
        },

        reset() {
            this.byId = {}
        }
    }
})