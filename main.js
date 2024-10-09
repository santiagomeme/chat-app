const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Conexión a Redis usando la URL pública de Railway
const redisClient = redis.createClient({
    url: 'redis://default:DVsYLOjBpPMTejNqRYXlhGfmjijEzIUR@junction.proxy.rlwy.net:49133'
});

// Conectar a Redis
redisClient.connect().then(() => {
    console.log('Conectado a Redis en Railway');
}).catch(err => {
    console.error('Error al conectar a Redis', err);
});

const rooms = {}; // Manejará las salas creadas

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    // Crear una sala
    socket.on('createRoom', async ({ roomID, roomPassword }) => {
        rooms[roomID] = roomPassword; // Esto aún está en memoria local
        socket.join(roomID);
        io.to(roomID).emit('message', 'Sala creada');
        
        // Guardar la sala y contraseña en Redis
        await redisClient.hSet(`room:${roomID}`, 'password', roomPassword);
    });

    // Unirse a una sala
    socket.on('joinRoom', async ({ roomID, roomPassword }) => {
        // Verificar contraseña de la sala en Redis
        const storedPassword = await redisClient.hGet(`room:${roomID}`, 'password');
        
        if (storedPassword === roomPassword) {
            socket.join(roomID);
            io.to(roomID).emit('message', 'Nuevo usuario en la sala');
        } else {
            socket.emit('error', 'Contraseña incorrecta');
        }
    });

    // Enviar mensaje en la sala
    socket.on('sendMessage', async ({ roomID, message }) => {
        io.to(roomID).emit('message', message);

        // Guardar el mensaje temporalmente en Redis
        await redisClient.rPush(`messages:${roomID}`, message);

        // Establecer una caducidad para los mensajes (por ejemplo, 24 horas)
        await redisClient.expire(`messages:${roomID}`, 60 * 60 * 24); // 24 horas de vida para los mensajes
    });

    // Desconexión de usuarios
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
