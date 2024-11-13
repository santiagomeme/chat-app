require('dotenv').config(); // Cargar variables del archivo .env
const redis = require('redis');

console.log('REDIS_CONNECTION_URL:', process.env.REDIS_CONNECTION_URL);

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();

const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'https://chat-app-production-a7bb.up.railway.app',
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
        origin: ['https://chat-app-production-a7bb.up.railway.app','http://localhost:3000'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true,
    },
});

const redisClient = redis.createClient({
    url: process.env.REDIS_CONNECTION_URL,
    socket: {
      reconnectStrategy: retries => Math.min(retries * 50, 2000),
      timeout: 5000 // tiempo de espera de 5 segundos
    }
  });
  

redisClient.connect().catch(err => console.error('No se pudo conectar a Redis:', err));


redisClient.on('connect', function() {
    console.log('Conectado a Redis');
    (async () => {
        try {
            await redisClient.ping(); // Verificar la conexión solo cuando esté conectada
            console.log('Conectado a Redis en rayl');
        } catch (err) {
            console.error('Error al conectar a Redis en rayl', err);
        }
    })();
});

redisClient.on('error', (err) => {
    console.error('Error en la conexión de Redis:', err);
});
redisClient.on('reconnecting', () => {
    console.log('Intentando reconectar a Redis...');
});


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
        
        // Asegurarse de que storedPassword no sea null o undefined y compararlo estrictamente
        if (storedPassword !== null && String(storedPassword) === String(roomPassword)) {
            // Contraseña correcta
            socket.join(roomID);
            const messages = await redisClient.sendCommand(['LRANGE', `messages:${roomID}`, '0', '-1']);
            socket.emit('previousMessages', messages);
            console.log(`Usuario se unió a la sala: ${roomID}`);
        } else {
            // Contraseña incorrecta
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
        const messages = await redisClient.lRange(`messages:${roomID}`, 0, -1); // Obtener mensajes de la sala
        socket.emit('previousMessages', messages); // Enviar mensajes al cliente
    });

   // Enviar mensaje en la sala
socket.on('sendMessage', async ({ roomID, message }) => {
    try {
        // Borrar la clave de mensajes si existe previamente
        await redisClient.del(`messages:${roomID}`);

        // Luego, empujar el nuevo mensaje a la lista de mensajes de la sala
        await redisClient.sendCommand(['LPUSH', `messages:${roomID}`, message]);

        // Establecer un tiempo de expiración para los mensajes (opcional)
        await redisClient.expire(`messages:${roomID}`, 60 * 60 * 24);

        // Enviar el mensaje a todos los usuarios conectados a la sala
        io.to(roomID).emit('message', message);
        console.log(`Mensaje guardado en la sala ${roomID}: ${message}`);
    } catch (error) {
        console.error('Error al guardar el mensaje:', error);
    }
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
