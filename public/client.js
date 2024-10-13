// Detectar si está en producción (Vercel) o en local
const socket = io(
    window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://chat-2j4pygn0q-santiagos-projects-d006ed81.vercel.app'
);

// Elementos del DOM
const messageForm = document.getElementById('message-form');
const roomInput = document.getElementById('roomID');
const passwordInput = document.getElementById('roomPassword');
const messageInput = document.getElementById('messageInput');
const chatWindow = document.getElementById('chat-window');
const roomNameSpan = document.getElementById('roomName'); // Para mostrar el nombre de la sala
const leaveRoomBtn = document.getElementById('leaveRoomBtn');



// Crear una sala
document.getElementById('createRoomBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const roomID = roomInput.value;
    const roomPassword = passwordInput.value;
    if (roomID && roomPassword) {
        socket.emit('createRoom', { roomID, roomPassword });
        chatWindow.innerHTML += `<p>Sala creada: ${roomID}</p>`;
        roomNameSpan.innerText = roomID; // Mostrar el nombre de la sala
    }
});

// Unirse a una sala
document.getElementById('joinRoomBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const roomID = roomInput.value;
    const roomPassword = passwordInput.value;
    if (roomID && roomPassword) {
        socket.emit('joinRoom', { roomID, roomPassword });
        chatWindow.innerHTML += `<p>Te has unido a la sala: ${roomID}</p>`;
        roomNameSpan.innerText = roomID; // Mostrar el nombre de la sala
    }
});


// Enviar mensaje
document.getElementById('sendMessageBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    const roomID = roomInput.value;
    if (message && roomID) {
        socket.emit('sendMessage', { roomID, message });
        messageInput.value = ''; // Limpiar el campo de mensaje
    }
});

// Escuchar los mensajes del servidor
socket.on('message', (message) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerText = message;
    chatWindow.appendChild(messageElement);
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


// Manejar errores
socket.on('error', (errorMessage) => {
    chatWindow.innerHTML += `<p style="color:red;">Error: ${errorMessage}</p>`;
});
