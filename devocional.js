import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const BASE_URL = "https://hoperbackk.onrender.com"; // ou sua URL de deploy

// ====================== VARIÁVEIS ======================
let currentUserData = null; // mantém dados do usuário localmente

// ====================== DOM ======================
const authSection = document.getElementById("authSection");
const agentSection = document.getElementById("agentSection");
const chatBox = document.getElementById("chatBox");
const msgInput = document.getElementById("msgInput");
const btnEnviar = document.getElementById("btnEnviar");
const btnLogout = document.getElementById("btnLogout");
const welcome = document.getElementById("welcome");
const userBadge = document.getElementById("userBadge");
const hoperImg = document.getElementById("hoperImg");
const btnSintoma = document.getElementById("btnSintoma");
const btnDica = document.getElementById("btnDica");
const btnPostos = document.getElementById("btnPostos");

// Inputs login
const loginEmail = document.getElementById("loginEmail");
const loginSenha = document.getElementById("loginSenha");
const btnLogin = document.getElementById("btnLogin");

// Inputs registro
const regNome = document.getElementById("regNome");
const regIdade = document.getElementById("regIdade");
const regEmail = document.getElementById("regEmail");
const regCep = document.getElementById("regCep");
const regSenha = document.getElementById("regSenha");
const btnRegister = document.getElementById("btnRegister");

// ====================== FUNÇÕES AUXILIARES ======================
function avatarPorIdade(idade) {
  if (!idade) idade = 30;
  return idade <= 17 ? "hoper_jovem_feliz.gif" : "hoper_adulto_feliz.gif";
}

function atualizarHoperPorHumor(texto) {
  if (!hoperImg || !currentUserData) return;
  const idade = currentUserData.idade || 30;
  const t = (texto || "").toLowerCase();
  if (t.match(/obrigado|ótimo|feliz|melhora|alívio/i)) {
    hoperImg.src = idade <= 17 ? "hoper_jovem_feliz.gif" : "hoper_adulto_feliz.gif";
  } else if (t.match(/dor|problema|sintoma|alerta|urgente/i)) {
    hoperImg.src = idade <= 17 ? "hoper_jovem_preocupado.gif" : "hoper_adulto_preocupado.gif";
  } else {
    hoperImg.src = avatarPorIdade(idade);
  }
}

function setHeader(user) {
  currentUserData = user;
  const primeiroNome = (user?.nome || user?.email || "Usuário").split(" ")[0];
  welcome.textContent = `Bem-vindo(a), ${primeiroNome}`;
  userBadge.textContent = `${user?.cep || ""} • ${user?.idade || ""} anos`;
  if (hoperImg) hoperImg.src = avatarPorIdade(user?.idade);
}

function addMsg(who, text) {
  const row = document.createElement("div");
  row.className = `msg ${who === "Você" ? "user" : "bot"}`;
  row.innerHTML = `
    <div class="who">${who}</div>
    <div class="bubble">${text.replace(/\n/g, "<br>")}</div>
  `;
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showAuth() {
  authSection.classList.remove("hidden");
  agentSection.classList.add("hidden");
}

function showAgent() {
  authSection.classList.add("hidden");
  agentSection.classList.remove("hidden");
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ====================== ABAS LOGIN/REGISTRO ======================
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".form-box").forEach(f => f.classList.add("hidden"));
    document.getElementById(btn.dataset.target).classList.remove("hidden");
  });
});

// ====================== VALIDAÇÕES ======================
function validarNome(nome) {
  return /^[A-Za-zÀ-ú\s]+$/.test(nome.trim());
}

function validarIdade(idade) {
  return !isNaN(idade) && idade > 0 && idade < 150;
}

function validarCEP(cep) {
  return /^\d{8}$/.test(cep);
}

// ====================== REGISTRO ======================
btnRegister.addEventListener("click", async () => {
  const nome = regNome.value.trim();
  const email = regEmail.value.trim();
  const idade = parseInt(regIdade.value, 10);
  const cep = regCep.value.replace(/\D/g, '');
  const senha = regSenha.value.trim();

  if (!nome || !email || !cep || !idade || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  try {
    // 🔹 Cria usuário no Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 🔹 Salva dados do usuário no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      nome,
      email,
      idade,
      cep
    });

    setHeader({ nome, email, idade, cep });
    chatBox.innerHTML = "";
    addMsg("Hoper", `Olá, ${nome.split(" ")[0]}! Estou aqui para ajudar. 👩‍⚕️`);
    showAgent();
  } catch (e) {
    alert(e.message || "Erro ao registrar");
  }
});

// ====================== LOGIN ======================
btnLogin.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const senha = loginSenha.value.trim();

  if (!email && !senha) {
    alert("Informe email e senha.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 🔹 Busca dados do Firestore
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (!docSnap.exists()) throw new Error("Usuário não encontrado no Firestore.");
    setHeader(docSnap.data());

    chatBox.innerHTML = "";
    addMsg("Hoper", `Bem-vindo de volta, ${docSnap.data().nome.split(" ")[0]}! Como posso ajudar hoje?`);
    atualizarHoperPorHumor("");
    showAgent();
  } catch (e) {
    alert(e.message || "Erro ao logar");
  }
});

// ====================== LOGOUT ======================
btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
    currentUserData = null;
    chatBox.innerHTML = "";
    msgInput.value = "";
    loginEmail.value = "";
    loginSenha.value = "";
    hoperImg.src = "hoper_jovem_feliz.gif";
    welcome.textContent = "";
    userBadge.textContent = "";
    showAuth();
    addMsg("Hoper", "Você saiu da conta. Até logo! 👋");
  } catch (e) {
    console.error("Erro ao sair:", e);
    alert("Não foi possível sair da conta.");
  }
});

// ====================== ENVIO DE MENSAGENS ======================
async function enviar(texto) {
  if (!currentUserData) {
    alert("Faça login primeiro.");
    showAuth();
    return;
  }

  addMsg("Você", texto);

  const digitando = document.createElement("div");
  digitando.className = "msg bot";
  digitando.innerHTML = `
    <div class="who">Hoper</div>
    <div class="bubble">digitando…</div>
  `;
  chatBox.appendChild(digitando);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUserData.uid, texto })
    });

    const data = await res.json();
    chatBox.removeChild(digitando);
    addMsg("Hoper", data.resposta || "Não consegui responder.");
    atualizarHoperPorHumor(data.resposta);
  } catch (e) {
    chatBox.removeChild(digitando);
    addMsg("Hoper", "Erro ao conectar ao servidor.");
  }
}

function enviarMsgInput() {
  const t = msgInput.value.trim();
  if (!t) return;
  msgInput.value = "";
  enviar(t);
}

btnEnviar.addEventListener("click", enviarMsgInput);
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    enviarMsgInput();
  }
});

// ====================== BOTÕES DE ATALHO ======================
const atalhos = [
  { btn: btnSintoma, msg: "Me dê um sintoma comum para análise." },
  { btn: btnDica, msg: "Me dê uma dica de prevenção contra doenças comuns." }
];

atalhos.forEach(a => a.btn.addEventListener("click", () => enviar(a.msg)));

// ====================== BOOT / SESSÃO ======================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const docSnap = await getDoc(doc(db, "usuarios", user.uid));
      if (!docSnap.exists()) throw new Error("Usuário não encontrado no Firestore.");
      setHeader(docSnap.data());
      chatBox.innerHTML = "";
      addMsg("Hoper", `Olá, ${docSnap.data().nome.split(" ")[0]}! Retomando nosso atendimento.`);
      atualizarHoperPorHumor("");
      showAgent();
    } catch (e) {
      console.error("Erro ao restaurar sessão:", e);
      showAuth();
    }
  } else {
    showAuth();
  }
});
