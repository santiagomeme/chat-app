const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const redis = require('redis');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configurar CORS
app.use(cors({
    origin: ['https://chat-44dodjwt3-santiagos-projects-d006ed81.vercel.app', 'http://localhost:3000']
}));

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

// Manejo de salas
const rooms = {}; 

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    // Crear una sala
    socket.on('createRoom', async ({ roomID, roomPassword }) => {
        socket.join(roomID);
        io.to(roomID).emit('message', 'Sala creada');

        // Guardar la sala y contraseña en Redis
        await redisClient.hSet(`room:${roomID}`, 'password', roomPassword);

        console.log(`Sala creada: ${roomID} con contraseña: ${roomPassword}`);
    });

    // Unirse a una sala
    socket.on('joinRoom', async ({ roomID, roomPassword }) => {
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

        // Establecer una caducidad para los mensajes (24 horas)
        await redisClient.expire(`messages:${roomID}`, 60 * 60 * 24);

        console.log(`Mensaje guardado en la sala ${roomID}: ${message}`);
    });

    // Prueba para almacenar un mensaje en Redis
    redisClient.set('mensaje', 'Tu mensaje de prueba', (err, reply) => {
        if (err) {
            console.log('Error guardando mensaje en Redis:', err);
        } else {
            console.log('Mensaje guardado en Redis:', reply);
        }
    });

    // Prueba para recuperar un mensaje desde Redis
    redisClient.get('mensaje', (err, reply) => {
        if (err) {
            console.log('Error recuperando mensaje de Redis:', err);
        } else {
            console.log('Mensaje recuperado de Redis:', reply);
        }
    });

    // Desconexión de usuarios
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});


// Manejar la salida de la sala
socket.on('leaveRoom', (roomID) => {
    socket.leave(roomID); // El usuario sale de la sala
    console.log(`Usuario salió de la sala: ${roomID}`);
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
