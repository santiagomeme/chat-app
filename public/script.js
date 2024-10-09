const socket = io();

const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIDInput = document.getElementById('roomID');
const roomPasswordInput = document.getElementById('roomPassword');
const chatDiv = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const roomNameSpan = document.getElementById('roomName');

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
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerText = message;
    messagesDiv.appendChild(messageElement);
});

// Enviar mensaje
sendMessageBtn.addEventListener('click', () => {
    const roomID = roomIDInput.value;
    const message = messageInput.value;
    if (message && roomID) {
        socket.emit('sendMessage', { roomID, message });
        messageInput.value = ''; // Limpiar el campo de mensaje
    }
});

// Mostrar errores
socket.on('error', (errorMessage) => {
    alert(errorMessage);
});
