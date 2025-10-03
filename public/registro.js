import { auth } from "./firebaseConfig.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// =======================
// 📌 Registrar usuario
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      alert("✅ Usuario registrado: " + userCredential.user.email);
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  });

  // =======================
  // 📌 Login usuario
  // =======================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Sesión iniciada como: " + userCredential.user.email);

      // guardar usuario en localStorage (para usar en tu chat)
      localStorage.setItem("usuario", userCredential.user.email);

      // opcional: redirigir al chat
      window.location.href = "salas.html";
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  });

  // =======================
  // 📌 Logout
  // =======================
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("usuario");
      alert("👋 Sesión cerrada");
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  });
});
