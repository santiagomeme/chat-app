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

// 🔒 Importar librería para encriptar (usar en el navegador)
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

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

let currentRoomID = null;
let creadorSala = null; // Guardar el creador de la sala

// Validación en tiempo real de la contraseña
roomPasswordInput.addEventListener("input", () => {
    const password = roomPasswordInput.value;
    const feedback = document.getElementById("passwordFeedback");

    if (validarPassword(password)) {
        feedback.style.color = "green";
        feedback.textContent = "La contraseña es válida.";
    } else {
        feedback.style.color = "red";
        feedback.textContent = "Debe tener al menos 8 caracteres, una mayúscula, un número y un signo especial.";
    }
});

function validarPassword(password) {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(password);
}

// ✅ Importación de bcryptjs en modo ESM

// 🔐 Crear sala con contraseña encriptada
async function crearSala() {
    const salaNombre = roomIDInput.value.trim();
    const userName = document.getElementById("userName").value.trim();
    const password = roomPasswordInput.value.trim();

    if (!userName || !salaNombre || !password) {
        alert("⚠️ Debes ingresar tu nombre, el nombre de la sala y una contraseña.");
        return;
    }

    if (!validarPassword(password)) {
        alert("⚠️ La contraseña no cumple con los requisitos de seguridad.");
        return;
    }

    try {
        const salasRef = collection(db, "salas");

        // Verificar si ya existe la sala
        const existingQuery = await getDocs(query(salasRef, where("nombre", "==", salaNombre)));
        if (!existingQuery.empty) {
            alert("⚠️ El nombre de la sala ya está en uso.");
            return;
        }

        // 🔒 Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        const roomRef = await addDoc(salasRef, {
            nombre: salaNombre,
            password: hashedPassword, // Contraseña encriptada
            creador: userName,        // Guardamos quién creó la sala
            createdAt: serverTimestamp(), // Marca de tiempo para control futuro
        });

        // Guardar datos en localStorage y mostrar sala
        localStorage.setItem("userName", userName);
        currentRoomID = roomRef.id;
        creadorSala = userName;
        roomNameSpan.textContent = salaNombre;
        chatDiv.style.display = "block";
        escucharMensajes();

        alert("✅ Sala creada con éxito.");
    } catch (error) {
        console.error("❌ Error al crear la sala:", error);
        alert("❌ Ocurrió un error al crear la sala.");
    }
}// 🔐 Unirse validando contraseña encriptada
async function unirseSala() {
    const salaNombre = roomIDInput.value.trim();
    const passwordIngresada = roomPasswordInput.value.trim();
    const userName = document.getElementById("userName").value.trim();

    if (!userName || !salaNombre || !passwordIngresada) {
        alert("⚠️ Debes ingresar tu nombre, sala y contraseña.");
        return;
    }

    // 🔒 opcional: prevenir doble clic mientras se procesa
    if (typeof joinRoomBtn !== "undefined") {
        joinRoomBtn.disabled = true;
    }

    try {
        const salasRef = collection(db, "salas");
        const querySnapshot = await getDocs(
            query(salasRef, where("nombre", "==", salaNombre))
        );

        if (querySnapshot.empty) {
            alert("⚠️ La sala no existe.");
            return;
        }

        let salaEncontrada = null;
        querySnapshot.forEach((docSnap) => {
            salaEncontrada = { id: docSnap.id, ...docSnap.data() };
        });

        if (!salaEncontrada) {
            alert("⚠️ No se encontró la sala.");
            return;
        }

        // 🔑 Validar contraseña
        const hashedPasswordGuardada = salaEncontrada.password;
        if (!hashedPasswordGuardada) {
            alert("❌ La sala no tiene contraseña registrada correctamente.");
            return;
        }

        const isMatch = await bcrypt.compare(passwordIngresada, hashedPasswordGuardada);
        if (!isMatch) {
            alert("❌ Contraseña incorrecta.");
            return;
        }

        // ✅ Si coincide, guardar datos de sesión y mostrar chat
        currentRoomID = salaEncontrada.id;
        creadorSala = salaEncontrada.creador;
        localStorage.setItem("userName", userName);
        roomNameSpan.textContent = salaNombre;
        chatDiv.style.display = "block";
        escucharMensajes();

        alert("✅ Unido a la sala con éxito.");
    } catch (error) {
        console.error("❌ Error al unirse a la sala:", error);
        alert("❌ Ocurrió un error al unirse a la sala.");
    } finally {
        // 🔄 Rehabilitar botón siempre
        if (typeof joinRoomBtn !== "undefined") {
            joinRoomBtn.disabled = false;
        }
    }
}

// ✉️ Enviar mensaje con sanitización
async function enviarMensaje() {
    const userName = localStorage.getItem("userName");
    const contenido = messageInput.value.trim();

    if (!userName) {
        alert("Debes ingresar tu nombre.");
        return;
    }
    if (!currentRoomID || !contenido) {
        alert("Debes ingresar un mensaje.");
        return;
    }

    try {
        // Sanitizar mensaje para evitar XSS
        const sanitizedMessage = contenido.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const mensajesRef = collection(db, "salas", currentRoomID, "mensajes");

        // 🕒 Calcular fecha de expiración (20 días desde ahora)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 20);

        await addDoc(mensajesRef, {
            usuario: userName,
            contenido: sanitizedMessage,
            timestamp: serverTimestamp(),
            expiration: expirationDate // 🔹 Guardamos la fecha de expiración
        });

        messageInput.value = "";
    } catch (error) {
        console.error("Error al enviar mensaje:", error);
    }
}
//======================
// 👂 Escuchar mensajes (últimos 20 días y archivar los viejos)
//======================
function escucharMensajes() {
    const mensajesRef = collection(db, "salas", currentRoomID, "mensajes");

    // 📅 Fecha límite = hoy - 20 días
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 20);

    // 🔎 Consulta: solo mensajes con timestamp >= fecha límite
    const q = query(
        mensajesRef,
        orderBy("timestamp", "asc")
    );

    onSnapshot(q, async (snapshot) => {
        messagesDiv.innerHTML = "";
        const ahora = Date.now();
        const limite = 20 * 24 * 60 * 60 * 1000; // 20 días en ms
        const userName = localStorage.getItem("userName");

        for (const docSnap of snapshot.docs) {
            const mensaje = docSnap.data();
            const mensajeID = docSnap.id;

            // ⚡ Verificar si es más viejo que 20 días
            if (mensaje.timestamp?.toMillis && (ahora - mensaje.timestamp.toMillis() > limite)) {
                try {
                    // 👉 Guardar en colección global de archivados
                    await addDoc(collection(db, "mensajesArchivados"), {
                        sala: currentRoomID,
                        ...mensaje,
                    });

                    // 👉 Eliminar del chat activo
                    await deleteDoc(doc(db, "salas", currentRoomID, "mensajes", mensajeID));

                    console.log(`Mensaje archivado y eliminado: ${mensajeID}`);
                } catch (err) {
                    console.error("Error al archivar mensaje:", err);
                }
                continue; // ❌ No mostrar mensajes viejos en la interfaz
            }

            // ✅ Crear contenedor de mensaje
            const mensajeElemento = document.createElement("div");
            mensajeElemento.classList.add("message");

            // Es mío o de otro
            const esMio = (mensaje.usuario === userName);
            mensajeElemento.classList.add(esMio ? "mine" : "other");

            // 🔹 Nombre de usuario (o "Tú")
            const usernameEl = document.createElement("span");
            usernameEl.classList.add("username");
            usernameEl.textContent = esMio ? "Tú" : mensaje.usuario;

            // 🔹 Burbuja con el contenido
            const bubble = document.createElement("div");
            bubble.classList.add("bubble");
            bubble.textContent = mensaje.contenido;

            // 🔹 Hora del mensaje
            let hora = "";
            if (mensaje.timestamp?.toDate) {
                const fecha = mensaje.timestamp.toDate();
                hora = fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }

            const timeEl = document.createElement("div");
            timeEl.classList.add("time");
            timeEl.textContent = hora;

            // 📌 Añadir todo en orden: nombre arriba, luego burbuja, luego hora
            mensajeElemento.appendChild(usernameEl);
            mensajeElemento.appendChild(bubble);
            mensajeElemento.appendChild(timeEl);

            messagesDiv.appendChild(mensajeElemento);
        }

        // 🔽 Auto-scroll al último mensaje
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

//====================
// 🚪 Salir de la sala
//====================
function salirSala() {
    location.reload();
}

// ❌ Eliminar sala (solo creador puede hacerlo)
async function eliminarSala() {
    if (!currentRoomID) {
        alert("No estás en ninguna sala.");
        return;
    }

    const userName = localStorage.getItem("userName");
    if (userName !== creadorSala) {
        alert("Solo el creador puede eliminar la sala.");
        return;
    }

    try {
        const salaRef = doc(db, "salas", currentRoomID);
        await deleteDoc(salaRef);
        alert("Sala eliminada con éxito.");
        salirSala();
    } catch (error) {
        console.error("Error al eliminar la sala:", error);
    }
}

// Eventos
createRoomBtn.addEventListener("click", crearSala);
joinRoomBtn.addEventListener("click", unirseSala);
sendMessageBtn.addEventListener("click", enviarMensaje);
leaveRoomBtn.addEventListener("click", salirSala);
