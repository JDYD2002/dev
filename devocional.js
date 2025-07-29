import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const devocionalSection = document.getElementById("devocional-section");
const welcome = document.getElementById("welcome");
const history = document.getElementById("history");

window.saveDevocional = async () => {
  const texto = document.getElementById("input").value.trim();
  const user = auth.currentUser;
  if (!user || !texto) return;

  try {
    await addDoc(collection(db, "devocionais"), {
      uid: user.uid,
      email: user.email,
      texto,
      data: new Date().toLocaleString()
    });
    document.getElementById("input").value = "";
    loadHistory(user.uid);
  } catch (e) {
    alert("Erro ao salvar devocional.");
    console.error("Erro Firestore:", e);
  }
};

async function loadHistory(uid) {
  history.innerHTML = "<li>Carregando...</li>";
  const q = query(collection(db, "devocionais"), where("uid", "==", uid));
  const docs = await getDocs(q);
  const resultado = [];

  docs.forEach(doc => {
    const d = doc.data();
    resultado.push(`<li><strong>${d.data}</strong><br>${d.texto}</li>`);
  });

  history.innerHTML = resultado.length
    ? resultado.join("")
    : "<li>Nenhum devocional salvo ainda.</li>";
}

window.login = () => {
  const email = document.getElementById("username").value;
  const senha = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, senha)
    .catch(err => alert("Erro ao logar: " + err.message));
};

window.register = async () => {
  const email = document.getElementById("username").value;
  const senha = document.getElementById("password").value;
  const nome = document.getElementById("displayName").value;

  if (!email || !senha || !nome) return alert("Preencha todos os campos");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const user = cred.user;

    await addDoc(collection(db, "usuarios"), {
      uid: user.uid,
      email: user.email,
      nome
    });

    alert("Conta criada! Faça login.");
  } catch (err) {
    alert("Erro ao registrar: " + err.message);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    alert("Erro ao sair");
    console.error("Erro ao deslogar:", e);
  }
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginForm.style.display = "none";
    devocionalSection.style.display = "block";

    const q = query(collection(db, "usuarios"), where("uid", "==", user.uid));
    const docsSnap = await getDocs(q);
    let nome = user.email;
    docsSnap.forEach(doc => {
      nome = doc.data().nome;
    });

    welcome.innerText = `Bem-vindo, ${nome}`;
    loadHistory(user.uid);
  } else {
    loginForm.style.display = "block";
    devocionalSection.style.display = "none";
  }
});
