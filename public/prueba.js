import { db } from "./firebaseConfig.js";
import {
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Elementos del DOM
const roomIDInput = document.getElementById("roomID");
const roomPasswordInput = document.getElementById("roomPassword");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const messagesDiv = document.getElementById("messages");
const roomNameSpan = document.getElementById("roomName");
const chatDiv = document.getElementById("chat");

let currentRoomID = null;

// Función para crear una sala con contraseña
async function crearSala() {
    const salaID = roomIDInput.value;
    const password = roomPasswordInput.value;

    if (salaID && password) {
        try {
            await setDoc(doc(db, "salas", salaID), { password: password });
            currentRoomID = salaID; // Asigna el ID actual
            roomNameSpan.textContent = salaID; // Actualiza el nombre de la sala en la interfaz
            chatDiv.style.display = "block"; // Muestra el chat
            escucharMensajes(); // Activa la escucha de mensajes en la sala creada

            alert("Sala creada con éxito.");
        } catch (error) {
            console.error("Error al crear la sala:", error);
        }
    } else {
        alert("Debes ingresar un ID de sala y una contraseña.");
    }
}


// Función para unirse a una sala y verificar la contraseña
async function unirseSala() {
    const salaID = roomIDInput.value;
    const password = roomPasswordInput.value;

    if (salaID && password) {
        try {
            const salaRef = doc(db, "salas", salaID);
            const salaSnap = await getDoc(salaRef);

            if (!salaSnap.exists()) {
                alert("La sala no existe.");
                return;
            }

            const salaData = salaSnap.data();
            if (salaData.password === password) {
                currentRoomID = salaID;
                roomNameSpan.textContent = salaID;
                chatDiv.style.display = "block";
                messagesDiv.innerHTML = ""; // Limpia mensajes previos
                escucharMensajes();
                alert("Te has unido a la sala.");
            } else {
                alert("Contraseña incorrecta.");
            }
        } catch (error) {
            console.error("Error al unirse a la sala:", error);
        }
    } else {
        alert("Debes ingresar un ID de sala y una contraseña.");
    }
}

// Función para enviar un mensaje
async function enviarMensaje() {
    const contenido = messageInput.value.trim();
    if (currentRoomID && contenido) {
        try {
            const mensajesRef = collection(db, "salas", currentRoomID, "mensajes");
            await addDoc(mensajesRef, {
                usuario: "Usuario", // Puedes modificar para agregar un nombre de usuario dinámico
                contenido: contenido,
                timestamp: serverTimestamp(),
            });
            messageInput.value = ""; // Limpiar el campo de entrada
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
        }
    } else {
        alert("Debes ingresar un mensaje para enviar.");
    }
}

// Función para escuchar mensajes en tiempo real
function escucharMensajes() {
    const mensajesRef = collection(db, "salas", currentRoomID, "mensajes");
    const q = query(mensajesRef, orderBy("timestamp"));

    onSnapshot(q, (snapshot) => {
        messagesDiv.innerHTML = ""; // Limpiar mensajes previos
        snapshot.forEach((doc) => {
            const mensaje = doc.data();
            const mensajeElemento = document.createElement("div");
            mensajeElemento.textContent = `${mensaje.usuario}: ${mensaje.contenido}`;
            messagesDiv.appendChild(mensajeElemento);
        });
    });
}

// Función para salir de la sala
function salirSala() {
    currentRoomID = null;
    roomNameSpan.textContent = "";
    chatDiv.style.display = "none";
    messagesDiv.innerHTML = ""; // Limpiar mensajes de la sala
}

// Asigna eventos a los botones
createRoomBtn.addEventListener("click", crearSala);
joinRoomBtn.addEventListener("click", unirseSala);
sendMessageBtn.addEventListener("click", enviarMensaje);
leaveRoomBtn.addEventListener("click", salirSala);
