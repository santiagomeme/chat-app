const socket = io('https://chat-2j4pygn0q-santiagos-projects-d006ed81.vercel.app');

// Elementos del DOM
const roomForm = document.getElementById('room-form');
const messageForm = document.getElementById('message-form');
const roomInput = document.getElementById('room-id');
const passwordInput = document.getElementById('room-password');
const messageInput = document.getElementById('message');
const chatWindow = document.getElementById('chat-window');

// Crear una sala
roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomID = roomInput.value;
    const roomPassword = passwordInput.value;
    socket.emit('createRoom', { roomID, roomPassword });
    chatWindow.innerHTML += `<p>Sala creada: ${roomID}</p>`;
});

// Unirse a una sala
roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomID = roomInput.value;
    const roomPassword = passwordInput.value;
    socket.emit('joinRoom', { roomID, roomPassword });
});

// Enviar mensaje
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    const roomID = roomInput.value;
    socket.emit('sendMessage', { roomID, message });
    messageInput.value = ''; // Limpiar el campo de mensaje
});

// Escuchar los mensajes del servidor
socket.on('message', (message) => {
    chatWindow.innerHTML += `<p>${message}</p>`;
});

// Manejar errores
socket.on('error', (errorMessage) => {
    chatWindow.innerHTML += `<p style="color:red;">Error: ${errorMessage}</p>`;
});
