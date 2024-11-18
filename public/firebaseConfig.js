 // Import Firebase desde el CDN
      import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
      import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";


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
      
// Luego, inicializas la app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
