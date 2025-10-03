require('dotenv').config(); // Cargar variables del archivo .env
const redis = require('redis');
const bcrypt = require('bcrypt'); // 🔒 Para contraseñas
const CryptoJS = require('crypto-js'); // 🔒 Para cifrar mensajes

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
app.options('*', cors(corsOptions));
app.use(express.static('public'));

const server = http.createServer(app);

// Configuración de Socket.IO con CORS
const io = socketIO(server, {
    cors: {
        origin: [
            'https://chat-app-production-a7bb.up.railway.app',
            'http://localhost:3000'
        ],
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true,
    },
});

const redisClient = redis.createClient({
    url: process.env.REDIS_CONNECTION_URL,
    socket: {
        reconnectStrategy: retries => Math.min(retries * 50, 2000),
        timeout: 5000
    }
});

redisClient.connect().catch(err => console.error('No se pudo conectar a Redis:', err));

redisClient.on('connect', function() {
    console.log('Conectado a Redis');
    (async () => {
        try {
            await redisClient.ping();
            console.log('Conectado a Redis en railway');
        } catch (err) {
            console.error('Error al conectar a Redis en railway', err);
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

    // ✅ Crear una sala
    socket.on('createRoom', async ({ roomID, roomPassword }) => {
        try {
            socket.join(roomID);

            // 🔒 Hashear contraseña antes de guardar
            const hashedPassword = await bcrypt.hash(roomPassword, 10);
            await redisClient.set(`room:${roomID}`, hashedPassword);

            io.to(roomID).emit('message', 'Sala creada de forma segura');
            console.log(`Sala creada: ${roomID} (contraseña protegida con hash)`);
        } catch (error) {
            console.error('Error al crear sala:', error);
        }
    });

    // ✅ Unirse a una sala (validando con bcrypt)
    socket.on('joinRoom', async ({ roomID, roomPassword }) => {
        try {
            const storedHash = await redisClient.get(`room:${roomID}`);
            if (!storedHash) {
                socket.emit('error', 'La sala no existe');
                return;
            }

            const valid = await bcrypt.compare(roomPassword, storedHash);
            if (!valid) {
                socket.emit('error', 'Contraseña incorrecta ❌');
                return;
            }

            socket.join(roomID);

            // 🔑 Recuperar y descifrar mensajes
            const encryptedMessages = await redisClient.lRange(`messages:${roomID}`, 0, -1);
            const messages = encryptedMessages.map(enc => {
                try {
                    const bytes = CryptoJS.AES.decrypt(enc, roomPassword);
                    return bytes.toString(CryptoJS.enc.Utf8) || "[Mensaje ilegible]";
                } catch {
                    return "[Error al descifrar]";
                }
            });

            socket.emit('previousMessages', messages);
            console.log(`Usuario se unió a la sala: ${roomID}`);
        } catch (error) {
            console.error('Error al unirse a la sala:', error);
            socket.emit('error', 'Error al procesar la solicitud');
        }
    });

    // ✅ Enviar mensaje (cifrado con AES)
    socket.on('sendMessage', async ({ roomID, roomPassword, message }) => {
        try {
            const storedHash = await redisClient.get(`room:${roomID}`);
            if (!storedHash) return;

            const valid = await bcrypt.compare(roomPassword, storedHash);
            if (!valid) {
                socket.emit('error', 'No autorizado para enviar mensajes');
                return;
            }

            // 🔒 Cifrar mensaje antes de guardar
            const encrypted = CryptoJS.AES.encrypt(message, roomPassword).toString();

            await redisClient.lPush(`messages:${roomID}`, encrypted);
            await redisClient.expire(`messages:${roomID}`, 60 * 60 * 24); // expira en 24h

            // Emitir mensaje plano a los clientes (ellos ya tienen la contraseña)
            io.to(roomID).emit('message', message);
            console.log(`Mensaje guardado (cifrado) en la sala ${roomID}`);
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
        }
    });

    // ✅ Solicitar mensajes previos
    socket.on('requestPreviousMessages', async ({ roomID, roomPassword }) => {
        const encryptedMessages = await redisClient.lRange(`messages:${roomID}`, 0, -1);
        const messages = encryptedMessages.map(enc => {
            try {
                const bytes = CryptoJS.AES.decrypt(enc, roomPassword);
                return bytes.toString(CryptoJS.enc.Utf8) || "[Mensaje ilegible]";
            } catch {
                return "[Error al descifrar]";
            }
        });
        socket.emit('previousMessages', messages);
    });

    // Salir de una sala
    socket.on('leaveRoom', (roomID) => {
        socket.leave(roomID);
        console.log(`Usuario salió de la sala: ${roomID}`);
    });

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
