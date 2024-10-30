require('dotenv').config(); // Cargar variables del archivo .env
const { Redis } = require('@upstash/redis'); // Importar la biblioteca para Redis de Upstash

console.log('UPSTASH_REDIS_URL:', process.env.UPSTASH_REDIS_URL);
console.log('UPSTASH_REDIS_TOKEN:', process.env.UPSTASH_REDIS_TOKEN);

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();

const corsOptions = {
    origin: ['https://chat-app-e3480.web.app', 'https://chat-app-kohl-psi.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Manejar todas las solicitudes OPTIONS

app.use(express.static('public'));

const server = http.createServer(app);

// Configuración de Socket.IO con CORS
const io = socketIO(server, {
    cors: {
        origin: ['https://chat-app-kohl-psi.vercel.app'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true,
    },
});

// Configuración de Redis
const redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
});

// Conectar y manejar errores
(async () => {
    try {
        await redisClient.ping(); // Verificar la conexión
        console.log('Conectado a Redis en Upstash');
    } catch (err) {
        console.error('Error al conectar a Redis en Upstash', err);
    }
})();

// Manejo de salas
const rooms = {};

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

    // Salir de una sala (sin borrar mensajes)
    socket.on('leaveRoom', (roomID) => {
        socket.leave(roomID); // El usuario sale de la sala
        console.log(`Usuario salió de la sala: ${roomID}`);
    });

    // Desconexión de usuarios
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.use((req, res, next) => {
    res.status(404).send('Página no encontrada');
});

server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
