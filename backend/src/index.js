const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)   // HTTP server shared by Express and Socket.IO
const io = new Server(server)

const PORT = process.env.BACKEND_PORT || 3000

app.get('/api/estado', (req, res) => {
  res.json({ ok: true })
})

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id)

  socket.on('client:hello', (datos) => {
    console.log('Hola de', datos.name, datos.avatar)
  })

  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Servidor en el puerto ${PORT}`)
})