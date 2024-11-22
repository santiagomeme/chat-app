import { db } from "./firebaseConfig.js";
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    updateDoc,
    arrayUnion,
    where
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
const deleteRoomBtn = document.getElementById("deleteRoomBtn");
deleteRoomBtn.addEventListener("click", eliminarSala);

// Validación en tiempo real de la contraseña
roomPasswordInput.addEventListener("input", () => {
    const password = roomPasswordInput.value;
    const feedback = document.getElementById("passwordFeedback"); // Este elemento debe existir en tu HTML

    if (validarPassword(password)) {
        feedback.style.color = "green";
        feedback.textContent = "La contraseña es válida.";
    } else {
        feedback.style.color = "red";
        feedback.textContent = "Debe tener al menos 8 caracteres, una mayúscula, un número y un signo especial.";
    }
});


let currentRoomID = null;


// Validar contraseña
function validarPassword(password) {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(password);
}


// Función para crear una sala con contraseña
async function crearSala() {
    const salaNombre = roomIDInput.value; // Nombre de la sala ingresado por el usuario
    const password = roomPasswordInput.value;

    if (!validarPassword(password)) {
        alert("La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un signo especial.");
        return;
    }

    if (salaNombre && password) {
        try {
            const salasRef = collection(db, "salas");

            // Verificar si ya existe una sala con el mismo nombre
            const existingQuery = await getDocs(query(salasRef, where("nombre", "==", salaNombre)));
            if (!existingQuery.empty) {
                alert("El nombre de la sala ya está en uso. Por favor, elige otro nombre.");
                return;
            }

            // Crear una sala con un ID único y guardar el nombre visible como un campo
            const roomRef = await addDoc(salasRef, {
                nombre: salaNombre, // Campo para el nombre visible
                password: password, // Campo para la contraseña
            });

            currentRoomID = roomRef.id; // ID único de la sala
            roomNameSpan.textContent = salaNombre; // Mostrar el nombre visible
            chatDiv.style.display = "block"; // Mostrar el chat
            escucharMensajes(); // Activar la escucha de mensajes

            alert("Sala creada con éxito.");
        } catch (error) {
            console.error("Error al crear la sala:", error);
        }
    } else {
        alert("Debes ingresar un nombre de sala y una contraseña.");
    }
}



// Función para unirse a una sala y verificar la contraseña
async function unirseSala() {
    const salaNombre = roomIDInput.value; // Nombre de la sala ingresado por el usuario
    const password = roomPasswordInput.value;

    if (salaNombre && password) {
        try {
            // Buscar el documento que coincida con el nombre de la sala
            const salasRef = collection(db, "salas");
            const querySnapshot = await getDocs(query(salasRef, where("nombre", "==", salaNombre)));

            if (querySnapshot.empty) {
                alert("La sala no existe.");
                return;
            }

            // Verificar la contraseña
            let salaEncontrada = null;
            querySnapshot.forEach((doc) => {
                if (doc.data().password === password) {
                    salaEncontrada = doc; // Encontrar la sala con la contraseña correcta
                }
            });

            if (!salaEncontrada) {
                alert("Contraseña incorrecta.");
                return;
            }

            // Si se encuentra la sala, establecer el ID actual y mostrar el chat
            currentRoomID = salaEncontrada.id; // Guardar el ID de la sala
            roomNameSpan.textContent = salaNombre; // Mostrar el nombre visible
            chatDiv.style.display = "block"; // Mostrar el chat
            escucharMensajes(); // Activar la escucha de mensajes

            alert("Unido a la sala con éxito.");
        } catch (error) {
            console.error("Error al unirse a la sala:", error);
        }
    } else {
        alert("Debes ingresar un nombre de sala y una contraseña.");
    }
}


// Función para enviar un mensaje
async function enviarMensaje() {
    const userName = localStorage.getItem("userName"); // Recupera el nombre del usuario almacenado
    const contenido = messageInput.value.trim();

    if (!userName) {
        alert("Por favor, ingresa tu nombre antes de enviar un mensaje.");
        return;
    }

    if (currentRoomID && contenido) {
        try {
            const mensajesRef = collection(db, "salas", currentRoomID, "mensajes");
            await addDoc(mensajesRef, {
                usuario: userName, // Utiliza el nombre del usuario
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

document.getElementById("joinRoomBtn").addEventListener("click", () => {
    const userName = document.getElementById("userName").value;
    const roomName = document.getElementById("roomID").value;
    const roomPassword = document.getElementById("roomPassword").value;
  
    if (!userName || !roomName || !roomPassword) {
      alert("Por favor, completa todos los campos.");
      return;
    }
  
    // Guarda el nombre del usuario al unirse a la sala
    localStorage.setItem("userName", userName);
    
    // Lógica para unirse a la sala...
  });
  


// Función para salir de la sala
function salirSala() {
       location.reload();

}



async function eliminarSala() {
    if (!currentRoomID) {
        alert("No estás en ninguna sala.");
        return;
    }

    try {
        const salaRef = doc(db, "salas", currentRoomID);

        // Intenta eliminar la sala
        await deleteDoc(salaRef);

        alert("Sala eliminada con éxito.");
        // Restablecer la interfaz después de la eliminación
        salirSala();
    } catch (error) {
        console.error("Error al eliminar la sala:", error);
        alert("No se pudo eliminar la sala. Asegúrate de tener permisos.");
    }
}
  

// Asigna eventos a los botones
createRoomBtn.addEventListener("click", crearSala);
joinRoomBtn.addEventListener("click", unirseSala);
sendMessageBtn.addEventListener("click", enviarMensaje);
leaveRoomBtn.addEventListener("click", salirSala);
