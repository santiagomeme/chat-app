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



io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

   // Crear una sala
socket.on('createRoom', async ({ roomID, roomPassword }) => {
    socket.join(roomID);
    io.to(roomID).emit('message', 'Sala creada');

    // Guardar la contraseña en Redis
    await redisClient.set(`room:${roomID}`, String(roomPassword));
    console.log(`Sala creada: ${roomID} con contraseña: ${roomPassword}`);
});


   // Unirse a una sala
   socket.on('joinRoom', async ({ roomID, roomPassword }) => {
    try {
        const storedPassword = await redisClient.get(`room:${roomID}`);
        
        if (String(storedPassword) === String(roomPassword)) {
            socket.join(roomID);

            // Asegurarse de que `lRange` sea llamada de esta manera
            const messages = await redisClient.lrange(`messages:${roomID}`, 0, -1);
            socket.emit('previousMessages', messages);
            console.log(`Usuario se unió a la sala: ${roomID}`);
        } else {
            socket.emit('error', 'Contraseña incorrecta');
            console.log(`Contraseña incorrecta para la sala ${roomID}. Esperada: ${storedPassword}, Proporcionada: ${roomPassword}`);
        }
    } catch (error) {
        console.error('Error al unirse a la sala:', error);
        socket.emit('error', 'Error al procesar la solicitud');
    }
});


    // Manejar solicitud de mensajes previos (al hacer clic en el botón de "Ver Mensajes")
    socket.on('requestPreviousMessages', async (roomID) => {
        const messages = await redisClient.lrange(`messages:${roomID}`, 0, -1); // Obtener mensajes de la sala
        socket.emit('previousMessages', messages); // Enviar mensajes al cliente
    });

    // Enviar mensaje en la sala
    socket.on('sendMessage', async ({ roomID, message }) => {
        io.to(roomID).emit('message', message);
        await redisClient.lpush(`messages:${roomID}`, message);
        await redisClient.expire(`messages:${roomID}`, 60 * 60 * 24);
        console.log(`Mensaje guardado en la sala ${roomID}: ${message}`);
    });

    socket.on('leaveRoom', (roomID) => {
        socket.leave(roomID);
        console.log(`Usuario salió de la sala: ${roomID}`);
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
