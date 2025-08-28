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

// Elementos DOM
// Espera o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-dark");

  // 🌓 1. Aplica o tema salvo ao carregar
  const temaSalvo = localStorage.getItem("tema");
  if (temaSalvo === "dark") {
    document.body.classList.add("dark-mode");
    if (toggleBtn) toggleBtn.textContent = "☀️ Tema Claro";
  } else {
    if (toggleBtn) toggleBtn.textContent = "🌙 Tema Escuro";
  }

  // 🌓 2. Ao clicar no botão, alterna e salva no localStorage
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");

      toggleBtn.textContent = isDark ? "☀️ Tema Claro" : "🌙 Tema Escuro";
      localStorage.setItem("tema", isDark ? "dark" : "light");
    });
  }
});

const loginForm = document.getElementById("login-form");
const devocionalSection = document.getElementById("devocional-section");
const welcome = document.getElementById("welcome");
const history = document.getElementById("history");
const displayNameInput = document.getElementById("displayName");
const emailInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const entradaTipo = document.getElementById("entradaTipo");
const entradaTexto = document.getElementById("entradaTexto");
const btnLogin = document.getElementById("btnLogin");
const btnRegister = document.getElementById("btnRegister");
const btnSalvar = document.getElementById("salvarEntrada");
const btnLogout = document.getElementById("btnLogout");

// ✅ Função para mostrar versículo de parabéns
function mostrarVersiculoParabens() {
  const versiculo = `Parabéns por fazer seu devocional! 🙏\n“Tudo o que fizerem, façam de todo o coração, como para o Senhor.” — Colossenses 3:23`;

  const divMsg = document.createElement('div');
  divMsg.innerText = versiculo;
  Object.assign(divMsg.style, {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#2ecc71',
    color: '#fff',
    padding: '16px 24px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    fontSize: '1.1rem',
    whiteSpace: 'pre-line',
    zIndex: 10000,
    opacity: '0',
    transition: 'opacity 0.4s ease',
  });

  document.body.appendChild(divMsg);

  requestAnimationFrame(() => {
    divMsg.style.opacity = '1';
  });

  setTimeout(() => {
    divMsg.style.opacity = '0';
    setTimeout(() => divMsg.remove(), 400);
  }, 6000);
}

// ✅ Função para salvar entrada
async function salvarEntrada() {
  const texto = entradaTexto.value.trim();
  const tipo = entradaTipo.value;
  const user = auth.currentUser;

  if (!user) {
    alert("Você precisa estar logado!");
    return;
  }
  if (!texto) {
    alert("Digite algum texto para salvar.");
    entradaTexto.focus();
    return;
  }

  try {
    await addDoc(collection(db, "entradas"), {
      uid: user.uid,
      email: user.email,
      tipo,
      texto,
      data: new Date().toISOString()
    });

    entradaTexto.value = "";
    carregarHistorico(user.uid);

    // ✅ Mostra versículo após salvar
    mostrarVersiculoParabens();
  } catch (error) {
    console.error("Erro ao salvar entrada:", error);
    alert("Erro ao salvar, tente novamente.");
  }
}

// ✅ Função para carregar histórico do usuário
async function carregarHistorico(uid, filtro = "todos") {
  history.innerHTML = "<li>Carregando...</li>";

  try {
    let q = query(collection(db, "entradas"), where("uid", "==", uid));
    
    const snapshot = await getDocs(q);
    const itens = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (filtro === "todos" || data.tipo === filtro) {
        const dataFormatada = new Date(data.data).toLocaleString('pt-BR');
        itens.push(
          `<li><strong>[${capitalizeFirstLetter(data.tipo)}] ${dataFormatada}</strong><br>${escapeHTML(data.texto)}</li>`
        );
      }
    });

    history.innerHTML = itens.length > 0
      ? itens.join("")
      : "<li>Nenhuma entrada encontrada.</li>";
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    history.innerHTML = "<li>Erro ao carregar histórico.</li>";
  }
}

// Utilitários
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function capitalizeFirstLetter(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
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

    // 🔹 Envia registro para o backend com UID do Firebase
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        nome, 
        email, 
        cep, 
        idade, 
        uid: user.uid  // UID do Firebase
      })
    });

    if (!res.ok) throw new Error("Falha ao registrar no backend.");
    const data = await res.json();
    currentUserId = data.user_id;

    // 🔹 Atualiza interface
    setHeader({ nome, email, cep, idade });
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
    // 🔹 Login no Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 🔹 Envia UID para o backend para buscar dados
    const payload = { uid: user.uid };
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Usuário não encontrado no backend.");
    const data = await res.json();
    currentUserId = data.user_id;

    const safeData = {
      nome: data.nome || user.email,
      idade: data.idade || 30,
      cep: data.cep || "",
      email: data.email || user.email
    };

    setHeader(safeData);
    chatBox.innerHTML = "";
    addMsg("Hoper", `Bem-vindo de volta, ${safeData.nome.split(" ")[0]}! Como posso ajudar hoje?`);
    atualizarHoperPorHumor("");
    showAgent();
  } catch (e) {
    alert(e.message || "Erro ao logar");
  }
});


// ✅ Logout
btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (e) {
    alert("Erro ao sair: " + e.message);
  }
});

// ✅ Atualiza a UI com base no usuário
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginForm.classList.add("hidden");
    devocionalSection.classList.remove("hidden");

    try {
      const q = query(collection(db, "usuarios"), where("uid", "==", user.uid));
      const docs = await getDocs(q);
      let nome = user.email;
      docs.forEach(doc => {
        nome = doc.data().nome || nome;
      });
      welcome.textContent = `Bem-vindo, ${nome}`;
    } catch (error) {
      console.error("Erro ao buscar nome:", error);
      welcome.textContent = `Bem-vindo, ${user.email}`;
    }

    carregarHistorico(user.uid);
  } else {
    loginForm.classList.remove("hidden");
    devocionalSection.classList.add("hidden");
    welcome.textContent = "";
    entradaTexto.value = "";
    history.innerHTML = "";
  }
});

// ✅ Salvar entrada
btnSalvar.addEventListener("click", salvarEntrada);

//filtro
const filtroTipo = document.getElementById("filtroTipo");
if (filtroTipo) {
  filtroTipo.addEventListener("change", () => {
    const user = auth.currentUser;
    if (user) {
      carregarHistorico(user.uid, filtroTipo.value);
    }
  });
}

// // Opcional: Enter para login
// emailInput.addEventListener('keydown', e => { if(e.key==='Enter') btnLogin.click(); });
// passwordInput.addEventListener('keydown', e => { if(e.key==='Enter') btnLogin.click(); });
