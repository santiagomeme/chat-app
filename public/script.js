document.addEventListener('DOMContentLoaded', () => {

const socket = io(
    window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://chat-app-kohl-psi.vercel.app',
    {
        transports: ['polling'] // Forzar a usar polling si WebSocket falla
    }
);

const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIDInput = document.getElementById('roomID');
const roomPasswordInput = document.getElementById('roomPassword');
const chatDiv = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const roomNameSpan = document.getElementById('roomName');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const showMessagesBtn = document.getElementById('showMessagesBtn');
const messagePanel = document.getElementById('messagePanel');

// Crear sala
createRoomBtn.addEventListener('click', () => {
    const roomID = roomIDInput.value;
    const roomPassword = roomPasswordInput.value;
    if (roomID && roomPassword) {
        socket.emit('createRoom', { roomID, roomPassword });
        chatDiv.style.display = 'block';
        roomNameSpan.innerText = roomID;
    }
});

// Unirse a sala
joinRoomBtn.addEventListener('click', () => {
    const roomID = roomIDInput.value;
    const roomPassword = roomPasswordInput.value;
    if (roomID && roomPassword) {
        socket.emit('joinRoom', { roomID, roomPassword });
        chatDiv.style.display = 'block';
        roomNameSpan.innerText = roomID;
    }
});
// Escuchar mensajes
socket.on('message', (message) => {
    console.log(`Mensaje recibido: ${message}`);

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerText = message;
    messagesDiv.appendChild(messageElement);
});
// Manejo del evento previousMessages (mostrando en el panel)
socket.on('previousMessages', (messages) => {
    messagePanel.style.display = 'block'; // Mostrar el panel
    messagePanel.innerHTML = ''; // Limpiar el contenido previo
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.innerText = message;
        messagePanel.appendChild(messageElement);
    });
});
// Enviar mensaje
sendMessageBtn.addEventListener('click', () => {
    const roomID = roomIDInput.value;
    const message = messageInput.value;
    if (message && roomID) {
        console.log(`Enviando mensaje: ${message} en la sala: ${roomID}`);

        socket.emit('sendMessage', { roomID, message });
        messageInput.value = ''; // Limpiar el campo de mensaje
    }
});

showMessagesBtn.addEventListener('click', () => {
    const roomID = roomIDInput.value;
    if (roomID) {
        messagePanel.style.display = 'block';
        socket.emit('requestPreviousMessages', roomID); // Solicitar mensajes previos
    }
});


// Salir de la sala
leaveRoomBtn.addEventListener('click', () => {
    const roomID = roomIDInput.value;

    if (roomID) {
        socket.emit('leaveRoom', roomID); // Emitir evento para salir de la sala

        // Restablecer los campos de la interfaz
        roomIDInput.value = '';
        roomPasswordInput.value = '';
        messageInput.value = '';
        messagesDiv.innerHTML = ''; // Limpiar la ventana de mensajes
        roomNameSpan.innerText = ''; // Quitar el nombre de la sala mostrada
        chatDiv.style.display = 'none'; // Ocultar la ventana de chat
        alert('Has salido de la sala.');
    }
});

// Mostrar errores
socket.on('error', (errorMessage) => {
    alert(errorMessage);
});
});