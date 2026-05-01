/* PORTAL EA - ENGINE v4.0 - INSTANT LOAD EDITION */
console.log("Portal Engine Started - Instant Load");

const SUPABASE_URL = 'https://tdnwnwldrjnhscgxnane.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GIDLJUxHFBIQ7dOO58lqWA_JbPAW1oq';
let supabase = null;

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) { console.error("Supabase Init Error"); }

async function loadConfig() {
  console.log("🚀 Carregamento Instantâneo Iniciado");
  
  // 1. Pega os dados locais IMEDIATAMENTE (LocalStorage ou config.js)
  const dynamic = localStorage.getItem('CONFIG_DISCIPLINA_PORTAL');
  let currentConfig = dynamic ? JSON.parse(dynamic) : CONFIG_DISCIPLINA;

  // 2. Tenta atualizar do Supabase em segundo plano (SEM TRAVAR A TELA)
  if (supabase) {
    supabase.from('portal_config').select('data').eq('id', 1).single()
      .then(({ data }) => {
        if (data && data.data) {
          console.log("✅ Dados do Supabase sincronizados em background");
          localStorage.setItem('CONFIG_DISCIPLINA_PORTAL', JSON.stringify(data.data));
        }
      })
      .catch(() => console.warn("Supabase Offline/Bloqueado - Usando local"));
  }

  return currentConfig;
}

async function saveConfig(newConfig, skipDashboardRender = false) {
  localStorage.setItem('CONFIG_DISCIPLINA_PORTAL', JSON.stringify(newConfig));
  APP_CONFIG = newConfig;

  if (supabase) {
    await supabase.from('portal_config').upsert({ id: 1, data: newConfig });
  }

  if (!skipDashboardRender) renderDashboard();
}

function resetConfig() {
    if (confirm("Isso apagará suas edições manuais e carregará o padrão do código (config.js). Continuar?")) {
        localStorage.removeItem('CONFIG_DISCIPLINA_PORTAL');
        location.reload();
    }
}

// --- ESTADO ---
let APP_CONFIG = null;
let currentUser = JSON.parse(localStorage.getItem('EA_PORTAL_USER')) || null;

// --- ELEMENTOS (Serão preenchidos no init) ---
let UI = {};

function populateUI() {
  UI = {
    headerName: document.getElementById('header-user-name'),
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    loginScreen: document.getElementById('login-screen'),
    appLayout: document.getElementById('app-layout'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalContent: document.getElementById('modal-content'),
    adminBadge: document.getElementById('admin-badge')
  };
}

// --- AUTENTICAÇÃO ---
function login(email) {
  const emailLower = email.toLowerCase().trim();
  const user = CONFIG_STUDENTS.find(s => s.email.toLowerCase().trim() === emailLower);
  
  if (user) {
    currentUser = user;
    localStorage.setItem('EA_PORTAL_USER', JSON.stringify(user));
    renderDashboard();
  } else {
    alert("E-mail não autorizado.");
  }
}

function logout() {
  localStorage.removeItem('EA_PORTAL_USER');
  currentUser = null;
  renderLogin();
}

// --- RENDERIZAÇÃO ---
function renderLogin() {
  UI.loginScreen.style.display = 'flex';
  UI.appLayout.style.display = 'none';
  UI.adminBadge.style.display = 'none';
  
  UI.loginScreen.innerHTML = `
    <div class="login-card">
      <div style="font-size: 48px; margin-bottom: 20px;">🎓</div>
      <h2>Portal EA</h2>
      <p style="color: var(--gray-600); margin-bottom: 24px;">Educação Ambiental — PGMAD/UESB</p>
      <input type="email" id="login-email" placeholder="Seu e-mail institucional" style="width:100%; padding:12px; margin-bottom:16px; border:1px solid var(--gray-200); border-radius:8px;">
      <button class="btn-confirm" style="width:100%" onclick="login(document.getElementById('login-email').value)">Entrar no Portal</button>
      <p style="font-size:12px; color:var(--gray-400); margin-top:20px;">Acesso exclusivo para alunos e docentes autorizados.</p>
    </div>
  `;
}

function renderDashboard() {
  UI.loginScreen.style.display = 'none';
  UI.appLayout.style.display = 'flex';
  UI.headerName.innerText = `Olá, ${currentUser.nome}`;
  
  if (currentUser.role === 'admin') UI.adminBadge.style.display = 'block';

  UI.sidebar.innerHTML = '';
  APP_CONFIG.modulos.forEach((modulo, index) => {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.innerHTML = `<span>Modulo ${index + 1}</span><br><small>${modulo.titulo}</small>`;
    btn.onclick = () => renderModulo(index);
    UI.sidebar.appendChild(btn);
  });
  
  renderModulo(0);
}

function checkModuleAccess(modulo) {
    const now = new Date();
    const start = new Date(modulo.data_inicio);
    const end = new Date(modulo.data_fim);
    
    if (now < start) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        return { 
            locked: true, 
            msg: `Acesso em: ${days}d ${hours}h ${mins}min`,
            readonly: true 
        };
    }
    
    if (now > end) {
        return { locked: false, msg: "Módulo Encerrado (Somente Leitura)", readonly: true };
    }
    
    return { locked: false, msg: "Acesso Liberado", readonly: false };
}

function renderModulo(index) {
  const modulo = APP_CONFIG.modulos[index];
  const access = checkModuleAccess(modulo);
  
  let html = `
    <div class="module-header">
      <div>
        <h2 style="margin:0">${modulo.titulo}</h2>
        <p style="margin:4px 0 0; color:var(--gray-600)">${access.msg}</p>
      </div>
    </div>
    
    <div class="module-stepper">
      ${modulo.atividades.map((_, i) => `
        <div class="step-dot" onclick="renderAtividade(${index}, ${i})" id="dot-${index}-${i}">
          ${i + 1}
        </div>
      `).join('')}
    </div>
    
    <div id="atividade-container"></div>
  `;
  
  UI.mainContent.innerHTML = html;
  renderAtividade(index, 0);
}

function renderAtividade(mIdx, aIdx) {
  const modulo = APP_CONFIG.modulos[mIdx];
  const atividade = modulo.atividades[aIdx];
  const access = checkModuleAccess(modulo);
  
  document.querySelectorAll('.step-dot').forEach(d => d.classList.remove('active'));
  document.getElementById(`dot-${mIdx}-${aIdx}`).classList.add('active');
  
  let contentHtml = '';
  if (access.locked) {
      contentHtml = `
        <div style="text-align:center; padding: 60px; color: var(--gray-400)">
          <div style="font-size:64px; margin-bottom:20px;">🔒</div>
          <h3>Conteúdo Bloqueado</h3>
          <p>Este módulo será liberado em breve conforme o cronograma.</p>
        </div>
      `;
  } else {
      contentHtml = `
        <div class="card">
          <h3>${atividade.pergunta}</h3>
          <p style="color:var(--gray-600); margin-bottom:20px;">${atividade.instrucao || 'Leia o material e responda abaixo:'}</p>
          
          <div class="material-grid">
            ${atividade.materiais.map(m => `
              <div class="material-card" onclick="viewMaterial('${m.tipo}', '${m.url}')">
                <div style="font-size:24px">${m.tipo === 'video' ? '📺' : '📄'}</div>
                <div style="font-size:12px; margin-top:8px">Visualizar</div>
              </div>
            `).join('')}
          </div>

          <textarea 
            id="resp-${mIdx}-${aIdx}" 
            class="answer-area" 
            placeholder="Digite sua resposta aqui..."
            ${access.readonly ? 'disabled' : ''}
            onchange="saveAnswer('${currentUser.email}', '${mIdx}-${aIdx}', this.value)"
          >${getSavedAnswer(currentUser.email, `${mIdx}-${aIdx}`)}</textarea>
          
          ${access.readonly ? '<p style="color:var(--secondary); font-weight:600">⚠️ Modo Somente Leitura: Prazo encerrado.</p>' : ''}
        </div>
      `;
  }
  
  document.getElementById('atividade-container').innerHTML = contentHtml;
}

function viewMaterial(tipo, url) {
    UI.modalContent.className = 'modal material-viewer';
    if (tipo === 'video') {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
        UI.modalContent.innerHTML = `
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
            <button class="btn-confirm" style="position:absolute; top:20px; right:20px;" onclick="closeModal()">Fechar</button>
        `;
    } else {
        UI.modalContent.innerHTML = `
            <iframe src="${url}" width="100%" height="100%"></iframe>
            <button class="btn-confirm" style="position:absolute; top:20px; right:20px;" onclick="closeModal()">Fechar</button>
        `;
    }
    UI.modalOverlay.classList.add('visible');
}

// --- PERSISTÊNCIA DE RESPOSTAS ---
function getSavedAnswer(email, id) {
  const key = `EA_RESP_${email}_${id}`;
  return localStorage.getItem(key) || '';
}

async function saveAnswer(email, id, value) {
  const key = `EA_RESP_${email}_${id}`;
  localStorage.setItem(key, value);
  
  if (supabase) {
    try {
      await supabase.from('portal_respostas').upsert({
        aluno_email: email,
        pergunta_id: id,
        resposta: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'aluno_email, pergunta_id' });
      console.log("☁️ Resposta sincronizada");
    } catch (e) { console.error("Erro sincronia resposta", e); }
  }
}

// --- ADMIN / CMS ---
window.showModal = function(type, subtype) {
  UI.modalContent.className = 'modal';
  if (type === 'Admin') {
    UI.modalContent.innerHTML = `
      <h3>Painel Administrativo</h3>
      <div style="display:grid; gap:10px; margin-top:20px;">
        <button class="btn-confirm" onclick="exportAnswers()">Exportar Respostas (JSON)</button>
        <button class="btn-confirm" style="background:var(--secondary)" onclick="resetConfig()">Resetar Padrão (config.js)</button>
        <button class="btn-confirm" style="background:var(--gray-600)" onclick="closeModal()">Fechar</button>
      </div>
    `;
    UI.modalOverlay.classList.add('visible');
  }
}

async function exportAnswers() {
    let todasRespostas = [];
    if (supabase) {
        const { data } = await supabase.from('portal_respostas').select('*');
        todasRespostas = data;
    } else {
        // Fallback local (apenas do usuário atual)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('EA_RESP_')) {
                todasRespostas.push({ key, val: localStorage.getItem(key) });
            }
        }
    }
    const blob = new Blob([JSON.stringify(todasRespostas, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_respostas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function closeModal() { 
    UI.modalOverlay.classList.remove('visible'); 
    UI.modalContent.className = 'modal';
}

async function init() { 
  populateUI(); // Garante que os elementos do HTML foram encontrados
  APP_CONFIG = await loadConfig();
  if (currentUser) renderDashboard(); 
  else renderLogin(); 
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Booting system...");
    init();
});
