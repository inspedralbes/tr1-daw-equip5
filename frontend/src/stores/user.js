import { defineStore } from 'pinia'

const NAME_MIN = 2
const NAME_MAX = 20

export const useUserStore = defineStore('user', {
    state: () => ({
        id: null,           
        name: '',
        avatarId: null,     
        color: '#64b5f6',   

        roomId: null,
        status: 'idle',      
        error: null,         

        x: 0,
        y: 0,
        dir: 'down',        
        anim: 'idle',      
        zoneId: null,

        media: { audio: true, video: true }
    }),

    getters: {
        isJoined: (state) => state.status === 'joined',
        isJoining: (state) => state.status === 'joining',
        isNameValid: (state) => {
            const n = state.name.trim().length
            return n >= NAME_MIN && n <= NAME_MAX
        },
        canJoin() {
            return this.isNameValid && !!this.avatarId && this.status === 'idle'
        },
        joinPayload: (state) => ({
            name: state.name.trim(),
            avatarId: state.avatarId
        }),
        isInZone: (state) => state.zoneId !== null
    },

    actions: {
        setProfile({ name, avatarId, color }) {
            if (name !== undefined) this.name = name
            if (avatarId !== undefined) this.avatarId = avatarId
            if (color !== undefined) this.color = color
        },

        startJoining(roomId) {
            this.roomId = roomId
            this.status = 'joining'
            this.error = null
        },

        setJoined(self) {
            this.id = self.id
            this.name = self.name
            this.avatarId = self.avatarId
            this.x = self.x
            this.y = self.y
            this.dir = self.dir
            this.anim = self.anim
            this.zoneId = self.zoneId ?? null
            this.media = { ...self.media }
            this.status = 'joined'
            this.error = null
        },

        setJoinError(error) {
            this.status = 'idle'
            this.roomId = null
            this.error = error
        },

        setPosition({ x, y, dir, anim }) {
            this.x = Math.round(x)
            this.y = Math.round(y)
            if (dir) this.dir = dir
            if (anim) this.anim = anim
        },

        correctPosition({ x, y }) {
            this.x = x
            this.y = y
        },

        setZone(zoneId) {
            this.zoneId = zoneId
        },

        toggleAudio() {
            this.media.audio = !this.media.audio
        },
        toggleVideo() {
            this.media.video = !this.media.video
        },

        leave() {
            const { name, avatarId, color } = this
            this.$reset()
            this.name = name
            this.avatarId = avatarId
            this.color = color
        }
    }
})