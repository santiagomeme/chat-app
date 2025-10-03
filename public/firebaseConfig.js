// Import Firebase desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCu5SgOw2pl6Vpmv5VCPXWKgqWq-niLG9g",
  authDomain: "chat-app-e3480.firebaseapp.com",
  projectId: "chat-app-e3480",
  storageBucket: "chat-app-e3480.appspot.com",
  messagingSenderId: "694686688315",
  appId: "1:694686688315:web:bbd507d3bfdc60fd6a281e",
  measurementId: "G-9WJR08NETT"
};

// Inicializar app y servicios
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportar lo que usarás
export { db, auth };
