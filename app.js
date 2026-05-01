// ============================================================
// MOTOR EA v4.0 (CMS Edition) — PGMAD/UESB
// ============================================================

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = 'https://tdnwnwldrjnhscgxnane.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GIDLJUxHFBIQ7dOO58lqWA_JbPAW1oq';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- ESTADO GLOBAL ---
async function loadConfig() {
  // 1. Tenta buscar do Supabase
  try {
    if (supabase) {
      const { data, error } = await supabase.from('portal_config').select('data').eq('id', 1).single();
      if (data && data.data) {
          console.log("Configuração carregada do Supabase");
          return data.data;
      }
    }
  } catch (e) { console.error("Erro Supabase:", e); }

  // 2. Fallback para LocalStorage
  const dynamic = localStorage.getItem('CONFIG_DISCIPLINA_PORTAL');
  return dynamic ? JSON.parse(dynamic) : CONFIG_DISCIPLINA;
}

async function saveConfig(newConfig, skipDashboardRender = false) {
  localStorage.setItem('CONFIG_DISCIPLINA_PORTAL', JSON.stringify(newConfig));
  APP_CONFIG = newConfig;

  // Sincroniza com Supabase
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

let APP_CONFIG = null;
let currentUser = JSON.parse(sessionStorage.getItem('portalEA_user') || 'null');
let MODO_ADMIN = currentUser ? currentUser.admin : false;
let MODO_PREVIEW_ALUNO = false;
let currentQIndex = 0;
let timerInterval = null;
let moduloIdAtual = null;

const UI = {
  login: document.getElementById('login-screen'),
  header: document.getElementById('app-header'),
  layout: document.getElementById('app-layout'),
  sidebar: document.getElementById('sidebar'),
  main: document.getElementById('main-content'),
  userName: document.getElementById('header-user-name'),
  adminBadge: document.getElementById('admin-badge'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content')
};

// --- MOTOR DE MÍDIA ---
function converterLinkDrive(url) {
  if (!url) return "";
  if (url.includes('drive.google.com')) {
    let id = '';
    if (url.includes('/d/')) id = url.split('/d/')[1].split('/')[0];
    else if (url.includes('id=')) id = url.split('id=')[1].split('&')[0];
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  }
  return url;
}

window.handleInserirPDF = function() {
  const url = prompt("Link do Drive:");
  if (!url) return;
  const link = converterLinkDrive(url.trim());
  const campo = document.getElementById('inputMidiaQuestao');
  if (campo) campo.value = `<iframe src="${link}" width="100%" height="500px" style="border:none" allow="autoplay"></iframe>`;
};

function parseMedia(input) {
  if (!input || input.trim() === "") return null;
  if (input.includes('<') && input.includes('>')) return input;
  const url = converterLinkDrive(input.trim());
  if (url.toLowerCase().endsWith('.pdf') || url.includes('drive.google.com')) {
    return `<iframe src="${url}" width="100%" height="500px" style="border:none; border-radius:8px; background:#eee"></iframe>`;
  }
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = input.match(ytRegex);
  if (match) return `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allowfullscreen></iframe>`;
  return `<img src="${url}" style="max-width:100%; border-radius:8px">`;
}

// --- MOTOR DE MATERIAIS ---
function getIconByTipo(tipo) {
    const icons = { 'pdf': '📄', 'video': '🎬', 'imagem': '🖼️', 'link': '🔗', 'texto': '📝' };
    return icons[tipo.toLowerCase()] || '📁';
}

function renderizarMateriais(modulo) {
    const container = document.getElementById('materiais-container');
    if(!container) return;
    container.innerHTML = ''; 
    if (!modulo.materiais || modulo.materiais.length === 0) {
        container.innerHTML = '<p style="font-size:0.8rem; color:#888">Nenhum material disponível.</p>';
        return;
    }
    const list = document.createElement('div');
    list.className = 'material-list';
    modulo.materiais.forEach(mat => {
        const item = document.createElement('div');
        item.className = 'material-item';
        item.style.cursor = 'pointer';
        item.onclick = () => window.visualizarMaterial(mat.nome, mat.link, mat.tipo);
        item.innerHTML = `
            <div class="material-icon">${getIconByTipo(mat.tipo)}</div>
            <div class="material-info">
                <span class="material-name">${mat.nome}</span>
                <span class="material-type">${mat.tipo}</span>
            </div>
        `;
        list.appendChild(item);
    });
    container.appendChild(list);
}

window.visualizarMaterial = function(nome, link, tipo) {
    let content = '';
    const url = converterLinkDrive(link);
    
    // Adiciona classe para tela cheia
    UI.modalContent.className = 'modal material-viewer';

    if (tipo === 'pdf' || url.includes('drive.google.com')) {
        content = `<iframe src="${url}" style="width:100%; height:100%;" allow="autoplay"></iframe>`;
    } else if (tipo === 'video' || url.includes('youtube.com') || url.includes('youtu.be')) {
        const ytId = url.match(/(?:v=|\/embed\/|\.be\/)([^"&?\/\s]{11})/)?.[1];
        content = ytId ? 
            `<iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen></iframe>` : 
            `<div style="padding:40px"><a href="${url}" target="_blank" class="btn-confirm">Abrir Vídeo Externo</a></div>`;
    } else if (tipo === 'imagem') {
        content = `<div style="overflow:auto; flex:1; display:flex; justify-content:center; align-items:center;">
                    <img src="${url}" style="max-width:100%; max-height:100%; border-radius:8px">
                  </div>`;
    } else {
        content = `<div style="padding:40px"><a href="${url}" target="_blank" class="btn-confirm">Abrir Material em Nova Aba</a></div>`;
    }

    UI.modalContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; width:100%">
            <h3 style="margin:0; color:var(--primary)">${nome}</h3>
            <button onclick="closeModal()" style="background:var(--gray-100); border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:700">Fechar ✕</button>
        </div>
        ${content}
    `;
    UI.modalOverlay.classList.add('visible');
};

// --- FUNÇÃO DE PERSISTÊNCIA DE MATERIAIS ---
window.adicionarMaterialAoModulo = function(moduloId) {
    const nome = document.getElementById('novoMatNome').value;
    const tipo = document.getElementById('novoMatTipo').value;
    let link = document.getElementById('novoMatLink').value;

    if (!nome || !link) {
        alert("Por favor, preencha o nome e o link do material.");
        return;
    }

    // Tratamento de Embed Automático para PDFs (Google Drive)
    if (tipo === 'pdf' && link.includes('drive.google.com')) {
        link = converterLinkDrive(link);
    }

    // Localizar módulo no estado global (que já reflete o localStorage)
    const modulo = APP_CONFIG.modulos.find(m => m.id === moduloId);
    
    if (modulo) {
        if (!modulo.materiais) modulo.materiais = [];
        
        // Push do novo material
        modulo.materiais.push({
            nome: nome,
            tipo: tipo,
            link: link
        });

        // Persistência Local (sem recarregar o dashboard para não perder a visão atual)
        saveConfig(APP_CONFIG, true);

        // Renderização imediata na lista do admin
        renderAdminMatList(modulo);

        // Se estivermos na visualização do módulo, atualizamos o container de materiais do aluno também
        if (document.getElementById('materiais-container')) {
            renderizarMateriais(modulo);
        }

        // Limpar campos
        document.getElementById('novoMatNome').value = '';
        document.getElementById('novoMatLink').value = '';
        
        console.log(`Material "${nome}" adicionado ao módulo ${moduloId}`);
    }
};

// --- LÓGICA DE ACESSO ---
function checkModuleAccess(mod) {
  if (MODO_ADMIN && !MODO_PREVIEW_ALUNO) return { status: 'ADMIN', ok: true };
  const agora = new Date();
  const [ano, mes, dia] = mod.data.split('-').map(Number);
  const [hI, mI] = mod.inicioHora.split(':').map(Number);
  const [hF, mF] = mod.fimHora.split(':').map(Number);
  const inicio = new Date(ano, mes - 1, dia, hI, mI, 0);
  const fim = new Date(ano, mes - 1, dia, hF, mF, 0);
  
  if (agora < inicio) return { status: 'BLOQUEADO', ok: false, countdown: inicio - agora };
  if (agora >= inicio && agora <= fim) return { status: 'ATIVO', ok: true };
  
  // Após o fim do horário, o módulo fica em modo somente leitura
  return { status: 'ENCERRADO', ok: true, readOnly: true };
}

function formatCountdown(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- PERSISTÊNCIA ---
function getStorageKey(suffix) {
  const email = currentUser ? currentUser.email : 'anon';
  return `portalEA_${email}_${suffix}`;
}
async function saveAnswer(qId, val, confirmed = false) {
  const answers = getAnswers();
  answers[qId] = { value: val, confirmed: confirmed, date: new Date().toISOString() };
  localStorage.setItem(getStorageKey('answers'), JSON.stringify(answers));

  // Sincroniza resposta com Supabase
  if (supabase && currentUser) {
      await supabase.from('portal_respostas').upsert({
          aluno_email: currentUser.email,
          aluno_nome: currentUser.nome,
          pergunta_id: qId,
          resposta: val,
          confirmado: confirmed,
          updated_at: new Date().toISOString()
      }, { onConflict: 'aluno_email,pergunta_id' });
  }
}
function getAnswers() { return JSON.parse(localStorage.getItem(getStorageKey('answers')) || '{}'); }

// --- AUTENTICAÇÃO ---
function fazerLogin() {
  const email = document.getElementById('field-email').value.trim();
  const pass = document.getElementById('field-pass').value;
  if (email === APP_CONFIG.admin.email && pass === APP_CONFIG.admin.senha) {
    currentUser = { nome: "Professor Administrador", email: email, admin: true }; MODO_ADMIN = true;
  } else {
    const aluno = APP_CONFIG.alunos.find(a => a.email.toLowerCase() === email.toLowerCase() && a.senha === pass);
    if (aluno) { currentUser = { nome: aluno.nome, email: aluno.email, admin: false }; MODO_ADMIN = false; }
    else { document.getElementById('login-error').textContent = "Dados incorretos."; return; }
  }
  sessionStorage.setItem('portalEA_user', JSON.stringify(currentUser));
  init();
}
function logout() { sessionStorage.removeItem('portalEA_user'); location.reload(); }
function togglePreviewMode() { MODO_PREVIEW_ALUNO = !MODO_PREVIEW_ALUNO; renderDashboard(); }

// --- RENDERIZADORES ---
function renderLogin() {
  UI.login.style.display = 'flex'; UI.header.classList.remove('visible'); UI.layout.style.display = 'none';
  UI.login.innerHTML = `
    <div class="login-left">
      <div class="header-logo">🎓</div>
      <h2>Portal EA</h2>
      <div class="login-form">
        <div class="login-field"><label>E-mail institucional</label><input type="email" id="field-email"></div>
        <div class="login-field"><label>Senha</label><input type="password" id="field-pass"></div>
        <div id="login-error" class="login-error"></div>
        <button class="login-btn" onclick="fazerLogin()">Entrar no Portal →</button>
      </div>
    </div>
    <div class="login-right"><h1>${APP_CONFIG.titulo}</h1><p>PGMAD/UESB</p></div>
  `;
}

function renderDashboard() {
  if (timerInterval) clearInterval(timerInterval);
  UI.login.style.display = 'none'; UI.header.classList.add('visible'); UI.layout.style.display = 'flex';
  UI.userName.textContent = `Olá, ${currentUser.nome}`;
  UI.adminBadge.style.display = MODO_ADMIN ? 'flex' : 'none';
  
  if (MODO_ADMIN) {
      const btnP = document.getElementById('btn-toggle-preview') || document.createElement('button');
      btnP.id = 'btn-toggle-preview'; btnP.className = 'btn-admin-tool';
      btnP.textContent = MODO_PREVIEW_ALUNO ? "👁️ Visão Admin" : "👁️ Visão Aluno";
      btnP.onclick = togglePreviewMode;
      if (!document.getElementById('btn-toggle-preview')) UI.adminBadge.appendChild(btnP);
  }

  renderSidebar();
  UI.main.innerHTML = `
    <div class="fade-in">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px">
        <h2>Atividades por Turno</h2>
        <div style="display:flex; gap:10px">
            ${MODO_ADMIN && !MODO_PREVIEW_ALUNO ? `
                <button class="btn-confirm" onclick="exportarRelatorioRespostas()" style="background:var(--amber)">Relatório de Respostas</button>
                <button class="btn-confirm" onclick="exportConfig()" style="background:var(--gray-800)">Exportar JSON Config</button>
                <button class="btn-confirm" onclick="resetConfig()" style="background:var(--gray-400)">Resetar Padrão</button>
            ` : ''}
        </div>
      </div>
      <div id="modules-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:25px;"></div>
    </div>
  `;
  const grid = document.getElementById('modules-grid');
  function updateGrid() {
    grid.innerHTML = '';
    APP_CONFIG.modulos.forEach(m => {
      const acc = checkModuleAccess(m);
      const card = document.createElement('div');
      card.className = `card ${acc.status}`;
      let badge = `<span class="badge ${acc.status}">${acc.status}</span>`;
      let action = '';
      if (acc.status === 'BLOQUEADO') {
        badge = `<span class="badge yellow">🕒 Libera em: ${formatCountdown(acc.countdown)}</span>`;
        action = `<button class="btn-confirm" disabled style="opacity:0.5; background:var(--gray-300)">Aguardando...</button>`;
      } else if (acc.status === 'ATIVO' || acc.status === 'ADMIN') {
        badge = `<span class="badge green">● DISPONÍVEL</span>`;
        action = `<button class="btn-confirm" onclick="renderModule(${m.id})">Entrar na Pasta →</button>`;
      } else {
        badge = `<span class="badge gray">✕ ENCERRADO</span>`;
        action = `<button class="btn-confirm" onclick="renderModule(${m.id})" style="background:var(--gray-100); color:var(--gray-600)">Revisar (Somente Leitura)</button>`;
      }
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between">
          <div><h4 style="margin:0">${m.titulo}</h4><p style="font-size:0.8rem; margin:5px 0">${m.subtitulo}</p></div>
          ${badge}
        </div>
        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center">
          ${action}
          ${MODO_ADMIN && !MODO_PREVIEW_ALUNO ? `<button class="btn-confirm" onclick="openEditor(${m.id})" style="background:var(--primary-light); color:var(--primary); padding:5px 10px; font-size:0.7rem">Configurações</button>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
  }
  updateGrid(); timerInterval = setInterval(updateGrid, 1000);
}

function renderSidebar() {
  UI.sidebar.innerHTML = '<div class="sidebar-label">Navegação</div>';
  APP_CONFIG.modulos.forEach(m => {
    const item = document.createElement('div');
    item.className = 'sidebar-item'; item.textContent = m.titulo;
    item.onclick = () => renderModule(m.id); UI.sidebar.appendChild(item);
  });
}

function renderModule(mId) {
  if (timerInterval) clearInterval(timerInterval);
  const mod = APP_CONFIG.modulos.find(m => m.id === mId);
  UI.main.innerHTML = `
    <div class="fade-in">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <h2>${mod.titulo}</h2>
        <button class="btn-confirm" onclick="renderDashboard()" style="background:transparent; color:var(--gray-600)">← Voltar</button>
      </div>
      <div class="materials-card" style="margin:25px 0">
        <h3 style="color:var(--primary); margin-bottom:15px">📚 Materiais Preparatórios</h3>
        <div id="materiais-container"></div>
      </div>
      <div id="activity-gate" style="text-align:center; padding:40px; background:var(--white); border-radius:15px; box-shadow:var(--shadow)">
        <h4 style="margin-bottom:20px">Pronto para a Atividade Prática?</h4>
        <button class="btn-confirm" style="padding:15px 40px; font-size:1.1rem" onclick="startStepper(${mod.id})">Iniciar Atividade Agora →</button>
      </div>
      <div id="stepper-area"></div>
    </div>
  `;
  renderizarMateriais(mod);
}

function startStepper(mId) {
    const mod = APP_CONFIG.modulos.find(m => m.id === mId);
    document.getElementById('activity-gate').style.display = 'none';
    currentQIndex = 0;
    renderStepper(mod);
}

function renderStepper(mod) {
  const area = document.getElementById('stepper-area');
  area.innerHTML = '';
  const q = mod.atividades[currentQIndex];
  if(!q) { area.innerHTML = "<h4>Nenhuma questão cadastrada.</h4>"; return; }
  
  const answers = getAnswers();
  const ans = answers[q.id] || {};
  const card = document.createElement('div');
  card.className = 'question-card fade-in';
  const mediaContent = parseMedia(q.midiaApoio);
  
  card.innerHTML = `
    <div class="qc-header" id="qc-header-${q.id}">
      <div id="qc-header-left-${q.id}" style="display:flex; align-items:center; gap:10px"></div>
      <span>${q.tempoSugerido}</span>
    </div>
    <div class="question-media" style="${mediaContent ? '' : 'display:none'}">${mediaContent || ''}</div>
    <div id="q-prompt" class="qc-prompt" style="font-weight:600; margin:20px 0">${q.enunciado}</div>
    <div id="q-body"></div>
    <div id="q-footer" style="margin-top:30px; display:flex; justify-content:space-between; align-items:center"></div>
  `;
  area.appendChild(card);

  const hL = document.getElementById(`qc-header-left-${q.id}`);
  hL.innerHTML = `<span>Questão ${currentQIndex + 1} de ${mod.atividades.length}</span>`;
  if (MODO_ADMIN && !MODO_PREVIEW_ALUNO) {
    const btn = document.createElement('button'); btn.className = 'btn-confirm'; btn.style.cssText = 'padding:2px 10px; font-size:0.6rem; background:var(--amber)';
    btn.textContent = 'EDITAR QUESTÃO'; btn.onclick = () => openQuickEditor(mod.id, q.id); hL.appendChild(btn);
  }

  const acc = checkModuleAccess(mod);
  const isReadOnly = acc.status === 'ENCERRADO' && !MODO_ADMIN;

  const body = document.getElementById('q-body');
  const ta = document.createElement('textarea'); 
  ta.className = 'qc-textarea'; 
  ta.id = `input-${q.id}`; 
  ta.placeholder = isReadOnly ? "O tempo de resposta expirou (Somente Leitura)." : "Digite sua resposta aqui...";
  ta.value = ans.value || ''; 
  ta.disabled = ans.confirmed || isReadOnly; 
  body.appendChild(ta);

  // Auto-save ao digitar (só se não for somente leitura)
  if (!isReadOnly) {
      ta.addEventListener('input', (e) => {
          saveAnswer(q.id, e.target.value, false);
      });
  }

  const footer = document.getElementById('q-footer');
  const nL = document.createElement('div');
  if (MODO_ADMIN || currentQIndex > 0) {
    const b = document.createElement('button'); b.className = 'btn-confirm'; b.style.background = 'var(--gray-100)'; b.style.color = '#555'; b.textContent = '←'; b.onclick = () => { currentQIndex--; renderStepper(mod); };
    if(currentQIndex > 0) nL.appendChild(b);
  }
  const nR = document.createElement('div');
  if (MODO_ADMIN && !MODO_PREVIEW_ALUNO) {
    const b = document.createElement('button'); b.className = 'btn-confirm'; b.textContent = 'Pular →'; b.onclick = () => { if(currentQIndex+1 < mod.atividades.length) { currentQIndex++; renderStepper(mod); } else renderDashboard(); };
    nR.appendChild(b);
  } else if (!ans.confirmed && !isReadOnly) {
    const b = document.createElement('button'); b.className = 'btn-confirm'; b.textContent = 'Confirmar'; b.onclick = () => confirmStep(mod, q.id); nR.appendChild(b);
  } else {
    const b = document.createElement('button'); b.className = 'btn-confirm'; b.textContent = currentQIndex + 1 < mod.atividades.length ? 'Próxima →' : 'Finalizar ✓';
    b.onclick = () => { if(currentQIndex+1 < mod.atividades.length) { currentQIndex++; renderStepper(mod); } else renderDashboard(); }; nR.appendChild(b);
  }
  footer.appendChild(nL); footer.appendChild(nR);
}

function confirmStep(mod, qId) {
  const val = document.getElementById(`input-${qId}`).value;
  saveAnswer(qId, val, true); renderStepper(mod);
}

// --- EDITORES ---
function openEditor(mId) {
  moduloIdAtual = mId;
  const mod = APP_CONFIG.modulos.find(m => m.id === mId);
  UI.modalContent.innerHTML = `
    <div style="text-align:left">
      <h3>Configurações da Pasta</h3>
      <label>Título</label><input type="text" id="edit-title" value="${mod.titulo}" style="width:100%; margin-bottom:10px">
      <label>Subtítulo</label><input type="text" id="edit-sub" value="${mod.subtitulo}" style="width:100%; margin-bottom:10px">
      <label>Data (AAAA-MM-DD)</label><input type="text" id="edit-date" value="${mod.data}" style="width:100%; margin-bottom:10px">
      <div style="display:flex; gap:10px">
        <div style="flex:1"><label>Início (HH:MM)</label><input type="text" id="edit-start" value="${mod.inicioHora}" style="width:100%"></div>
        <div style="flex:1"><label>Fim (HH:MM)</label><input type="text" id="edit-end" value="${mod.fimHora}" style="width:100%"></div>
      </div>
      
      <hr style="margin:20px 0">
      
      <div class="admin-add-material">
          <h4>+ Novo Material de Apoio</h4>
          <input type="text" id="novoMatNome" placeholder="Título do Material (ex: Aula 01)">
          <select id="novoMatTipo">
              <option value="pdf">📄 PDF</option>
              <option value="video">🎬 Vídeo</option>
              <option value="imagem">🖼️ Imagem</option>
              <option value="link">🔗 Link Externo</option>
          </select>
          <input type="text" id="novoMatLink" placeholder="Cole o Link (Drive, YouTube, etc)">
          <button onclick="adicionarMaterialAoModulo(moduloIdAtual)" class="btn-save">Anexar ao Módulo</button>
      </div>

      <div id="admin-mat-list" style="max-height:150px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:8px; margin-top:15px"></div>

      <hr style="margin:20px 0">
      <button class="btn-confirm" onclick="saveModuleEdits(${mId})" style="width:100%">Salvar Todas as Alterações</button>
      <button class="btn-confirm" onclick="closeModal()" style="width:100%; margin-top:10px; background:var(--gray-200); color:#666">Cancelar</button>
    </div>`;
  renderAdminMatList(mod);
  UI.modalOverlay.classList.add('visible');
}

function renderAdminMatList(mod) {
    const list = document.getElementById('admin-mat-list');
    list.innerHTML = mod.materiais.length ? '<strong>Materiais Atuais:</strong><br>' : 'Nenhum material anexado.';
    mod.materiais.forEach((m, i) => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; justify-content:space-between; font-size:0.8rem; margin:5px 0; padding:5px; background:#fff; border-radius:4px';
        item.innerHTML = `<span>${getIconByTipo(m.tipo)} ${m.nome}</span><button onclick="removeMat(${mod.id}, ${i})" style="color:red; background:none; border:none; cursor:pointer">✕</button>`;
        list.appendChild(item);
    });
}

// Removida a função antiga addNewMaterial em favor da nova adicionarMaterialAoModulo

window.removeMat = function(mId, idx) {
    const mod = APP_CONFIG.modulos.find(m => m.id === mId);
    mod.materiais.splice(idx, 1);
    renderAdminMatList(mod);
};

function saveModuleEdits(mId) {
  const mod = APP_CONFIG.modulos.find(m => m.id === mId);
  mod.titulo = document.getElementById('edit-title').value;
  mod.subtitulo = document.getElementById('edit-sub').value;
  mod.data = document.getElementById('edit-date').value;
  mod.inicioHora = document.getElementById('edit-start').value;
  mod.fimHora = document.getElementById('edit-end').value;
  saveConfig(APP_CONFIG); closeModal();
}

function openQuickEditor(mId, qId) {
  const mod = APP_CONFIG.modulos.find(m => m.id === mId);
  const q = mod.atividades.find(a => a.id === qId);
  UI.modalContent.innerHTML = `
    <div style="text-align:left">
      <h3>Editar Questão</h3>
      <label>Enunciado</label><textarea id="q-edit-text" style="width:100%; height:80px">${q.enunciado}</textarea>
      <label>Mídia (YouTube ou Drive)</label><input type="text" id="inputMidiaQuestao" value="${q.midiaApoio || ''}" style="width:100%">
      <button class="btn-confirm" onclick="window.handleInserirPDF()" style="margin-top:5px; font-size:0.7rem; background:var(--blue)">🔗 Assistente de PDF</button>
      <div style="margin-top:15px; display:flex; gap:10px">
        <div style="flex:1"><label>Tempo</label><input type="text" id="edit-q-time" value="${q.tempoSugerido}" style="width:100%"></div>
        <div style="flex:1"><label>Mín. Palavras</label><input type="number" id="edit-q-words" value="${q.minimoPalavras || 1}" style="width:100%"></div>
      </div>
      <button class="btn-confirm" onclick="saveQuickEdit(${mId}, '${qId}')" style="width:100%; margin-top:20px">Salvar Questão</button>
    </div>`;
  UI.modalOverlay.classList.add('visible');
}

function saveQuickEdit(mId, qId) {
  const mod = APP_CONFIG.modulos.find(m => m.id === mId);
  const q = mod.atividades.find(a => a.id === qId);
  q.enunciado = document.getElementById('q-edit-text').value;
  q.midiaApoio = document.getElementById('inputMidiaQuestao').value;
  q.tempoSugerido = document.getElementById('edit-q-time').value;
  q.minimoPalavras = parseInt(document.getElementById('edit-q-words').value);
  saveConfig(APP_CONFIG); closeModal(); renderStepper(mod);
}

function exportConfig() {
  const dl = document.createElement('a'); dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(APP_CONFIG, null, 2)));
  dl.setAttribute("download", "config_portal_ea.json"); document.body.appendChild(dl); dl.click(); dl.remove();
}

window.exportarRelatorioRespostas = function() {
    const todasRespostas = {};
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave.startsWith('portalEA_') && chave.endsWith('_answers')) {
            todasRespostas[chave] = JSON.parse(localStorage.getItem(chave));
        }
    }
    const blob = new Blob([JSON.stringify(todasRespostas, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_respostas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
};

function showModal(title, text) {
  UI.modalContent.innerHTML = `<h3>${title}</h3><p>${text}</p><button class="btn-confirm" onclick="closeModal()">Fechar</button>`;
  UI.modalOverlay.classList.add('visible');
}
function closeModal() { 
    UI.modalOverlay.classList.remove('visible'); 
    UI.modalContent.className = 'modal'; // Reseta para o tamanho padrão ao fechar
}

async function init() { 
  APP_CONFIG = await loadConfig();
  if (currentUser) renderDashboard(); 
  else renderLogin(); 
}
document.addEventListener('DOMContentLoaded', init);
