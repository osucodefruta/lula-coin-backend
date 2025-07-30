// --- CONSTANTES E VARIÁVEIS GLOBAIS ---

// URL base do servidor onde os dados do jogo são salvos.
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';
// Objeto que guardará todo o progresso do jogador na fazenda. É carregado do servidor.
let farmState = {}; 
// Saldo de LCO do jogador, que vem do jogo principal, carregado separadamente.
let lcoBalance = 0;
// Variável para guardar os recursos atuais (moedas, água, etc.). É um atalho para farmState.
let recursos = {};

// --- COMUNICAÇÃO COM O SERVIDOR (API) ---

// Função reutilizável para fazer requisições à API.
const apiRequest = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('token');
    if (!token) { 
        alert("Sessão inválida. Por favor, faça o login novamente.");
        window.location.href = '/index.html'; 
        return null; 
    }
    const options = { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
    if (body) { options.body = JSON.stringify(body); }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Erro de rede');
        }
        if (response.status === 204) return { success: true };
        return response.json();
    } catch (error) {
        console.error("Erro de API:", error);
        notificar(`Erro: ${error.message}`, 'erro'); 
        return null;
    }
};

// Carrega os dados salvos do jogador quando o jogo inicia.
async function loadInitialState() {
    // CONSUMO DE API: Busca o estado salvo da fazenda.
    const data = await apiRequest('/api/fazenda/state');
    if (data) {
        farmState = data.fazendaGameState;
        lcoBalance = data.lulaCoinGameState.balance;
        recursos = farmState;
        console.log("Estado da fazenda carregado:", farmState);
        atualizarInterface();
        renderizarCenarioSalvo();
    }
}
  
// Salva o progresso do jogador no servidor.
async function saveFarmState() {
    if (!farmState || Object.keys(farmState).length === 0) return;
    recursos = farmState;

    // Captura o estado atual dos objetos 3D e dos emojis para salvar.
    farmState.canteirosState = canteiros.map(canteiro => ({
        estado: canteiro.userData.estado,
        estadoOriginal: canteiro.userData.estadoOriginal || canteiro.userData.estado, 
        tipoPlanta: canteiro.userData.tipoPlanta,
        tempoParaCrescer: canteiro.userData.tempoParaCrescer,
        tempoParaAmadurecer: canteiro.userData.tempoParaAmadurecer,
        hasPraga: !!canteiro.userData.pragaElement
    }));

    farmState.animaisState = animais.map(animal => ({
        tipo: animal.tipo,
        id: animal.div.id,
        position: { x: animal.position.x, y: animal.position.y, z: animal.position.z },
        isFed: animal.div.classList.contains('alimentado'),
        produzindo: animal.produzindo,
        hasRecurso: !!animal.recursoElement,
        tempoProducaoRestante: animal.tempoProducaoRestante
    }));
      
    // Usa um "debounce" para evitar salvar muitas vezes seguidas.
    if (window.saveTimeout) clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
        // CONSUMO DE API: Envia o estado atual da fazenda para o servidor.
        await apiRequest('/api/fazenda/update', 'POST', { newFarmState: farmState });
        console.log("Progresso completo da fazenda salvo no servidor!");
    }, 500);
}

// --- SETUP DA CENA 3D (THREE.JS) ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 11, 12); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.enableZoom = false; // Desabilita o zoom
controls.enablePan = false; // Desabilita o pan (mover a câmera lateralmente)
controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.update();
const initialPolarAngle = controls.getPolarAngle();
controls.minPolarAngle = initialPolarAngle;
controls.maxPolarAngle = initialPolarAngle;
controls.minDistance = camera.position.length();
controls.maxDistance = camera.position.length();

// Array para guardar objetos que podem ser clicados.
const objetosClicaveis = [];

// --- FUNÇÕES DE GERAÇÃO DE TEXTURA E CENÁRIO ---
// (Estas funções criam as texturas e os objetos 3D do cenário de forma programática)
function gerarTexturaGrama() { /* ... código ... */ }
function gerarTexturaTerra() { /* ... código ... */ }
function gerarTexturaTijolos() { /* ... código ... */ }
function gerarTexturaTelhado() { /* ... código ... */ }
function gerarTexturaSuperficieAgua() { /* ... código ... */ }
function criarCercaGenerica(comprimento, altura, rotacao) { /* ... código ... */ }
function criarArvore(x, z) { /* ... código ... */ }
function criarPedra(x, z) { /* ... código ... */ }
function criarHasteCurral(x, y, z) { /* ... código ... */ }
function criarTabuaCurral(x, y, z, c, r) { /* ... código ... */ }
function criarCasaDetalhada(x, z) { /* ... código ... */ }
function criarFloresta() { /* ... código ... */ }
function criarCadeado(canteiro) { /* ... código ... */ }

// --- CRIAÇÃO DOS OBJETOS PRINCIPAIS DO CENÁRIO ---
const texturaGrama = gerarTexturaGrama();
const texturaTerra = gerarTexturaTerra();
// ... (criação de materiais, luzes, chão, casa, lago, cercas, etc.) ...
// O código original para criar todos os elementos estáticos da cena vai aqui.
const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ map: texturaGrama })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); const offsetCentro = 5; criarCasaDetalhada(-offsetCentro, -offsetCentro); criarArvore(-offsetCentro - 4.5, -offsetCentro); const canteiros = []; const canteiroStartX = offsetCentro; const canteiroStartZ = -offsetCentro; for (let i = 0; i < 4; i++) { for (let j = 0; j < 3; j++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), canteiroGramaMaterial); c.position.set(canteiroStartX - 3 + i * 2, 0.15, canteiroStartZ - 2 + j * 2); c.castShadow = true; scene.add(c); const e = canteiros.length < 3 ? 'grama' : 'bloqueado'; c.userData = { estado: e, tipoPlanta: null, estagio: null, plantaElement: null, pragaElement: null, cadeadoElement: null, estadoOriginal: null, intervalId: null }; if (e === 'bloqueado') { c.material = canteiroBloqueadoMaterial; criarCadeado(c); } canteiros.push(c); }} const surfaceTexture = gerarTexturaSuperficieAgua(); const waterUniforms = { u_time: { value: 0.0 }, u_colorA: { value: new THREE.Color('#005175')}, u_colorB: { value: new THREE.Color('#00ffff')},  u_surfaceTexture: { value: surfaceTexture } }; const waterMaterial = new THREE.ShaderMaterial({ uniforms: waterUniforms, vertexShader: `varying vec3 v_worldPosition; varying vec2 v_uv; void main() { vec4 modelPosition = modelMatrix * vec4(position, 1.0); v_worldPosition = modelPosition.xyz; v_uv = uv; gl_Position = projectionMatrix * viewMatrix * modelPosition; }`, fragmentShader: `uniform float u_time; uniform vec3 u_colorA; uniform vec3 u_colorB; uniform sampler2D u_surfaceTexture; varying vec3 v_worldPosition; varying vec2 v_uv; void main() { float wave1 = sin(v_worldPosition.x * 1.0 + u_time * 0.9) * 0.5 + 0.5; float wave2 = cos(v_worldPosition.z * 1.5 + u_time * 0.6) * 0.5 + 0.5; float mix_strength = (wave1 + wave2) * 0.5; vec3 baseColor = mix(u_colorA, u_colorB, mix_strength); vec2 uv_scroll1 = v_uv * 2.5 + vec2(u_time * 0.04, u_time * 0.02); vec2 uv_scroll2 = v_uv * 2.5 + vec2(-u_time * 0.03, u_time * 0.05); float surface_noise = texture2D(u_surfaceTexture, uv_scroll1).r * 0.5 + texture2D(u_surfaceTexture, uv_scroll2).r * 0.5; vec3 surfaceColor = vec3(surface_noise); vec3 finalColor = baseColor + surfaceColor * 0.4; gl_FragColor = vec4(finalColor, 1.0); }`, transparent: false }); const lagoX = -offsetCentro; const lagoZ = offsetCentro; const lago = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.3, 64), waterMaterial); lago.position.set(lagoX, -0.1, lagoZ); lago.receiveShadow = true; scene.add(lago); const lagoBorda = new THREE.Mesh(new THREE.RingGeometry(3, 3.5, 32), new THREE.MeshStandardMaterial({ map: texturaTerra })); lagoBorda.rotation.x = -Math.PI / 2; lagoBorda.position.set(lagoX, 0.01, lagoZ); scene.add(lagoBorda); const numPedras = 15; const raioLago = 3.8; for (let i = 0; i < numPedras; i++) { const a = (i / numPedras) * Math.PI * 2; const x = lagoX + raioLago * Math.cos(a) + (Math.random() - 0.5); const z = lagoZ + raioLago * Math.sin(a) + (Math.random() - 0.5); criarPedra(x, z); } const curralCenterX = offsetCentro; const curralCenterZ = offsetCentro; const curralTamanho = 6; for (let i = 0; i < curralTamanho / 2; i++) { criarHasteCurral(curralCenterX - curralTamanho / 2 + i * 2, 0, curralCenterZ - curralTamanho / 2); } criarTabuaCurral(curralCenterX, 0.4, curralCenterZ - curralTamanho / 2, curralTamanho, 0); criarTabuaCurral(curralCenterX, 0.8, curralCenterZ - curralTamanho / 2, curralTamanho, 0); for (let i = 0; i < curralTamanho / 2; i++) { criarHasteCurral(curralCenterX - curralTamanho / 2 + i * 2, 0, curralCenterZ + curralTamanho / 2); } criarTabuaCurral(curralCenterX, 0.4, curralCenterZ + curralTamanho / 2, curralTamanho, 0); criarTabuaCurral(curralCenterX, 0.8, curralCenterZ + curralTamanho / 2, curralTamanho, 0); for (let i = 0; i < curralTamanho / 2; i++) { criarHasteCurral(curralCenterX - curralTamanho / 2, 0, curralCenterZ - curralTamanho / 2 + i * 2); } criarTabuaCurral(curralCenterX - curralTamanho / 2, 0.4, curralCenterZ, curralTamanho, Math.PI / 2); criarTabuaCurral(curralCenterX - curralTamanho / 2, 0.8, curralCenterZ, curralTamanho, Math.PI / 2); for (let i = 0; i < curralTamanho / 2; i++) { criarHasteCurral(curralCenterX + curralTamanho / 2, 0, curralCenterZ - curralTamanho / 2 + i * 2); } criarTabuaCurral(curralCenterX + curralTamanho / 2, 0.4, curralCenterZ, curralTamanho, Math.PI / 2); criarTabuaCurral(curralCenterX + curralTamanho / 2, 0.8, curralCenterZ, curralTamanho, Math.PI / 2); const cercaExterna = new THREE.Group(); const tamanhoFazenda = 30; const cF = criarCercaGenerica(tamanhoFazenda, 1.5, 0); cF.position.set(0, 0.75, -tamanhoFazenda/2); cercaExterna.add(cF); const cT = criarCercaGenerica(tamanhoFazenda, 1.5, 0); cT.position.set(0, 0.75, tamanhoFazenda/2); cercaExterna.add(cT); const cE = criarCercaGenerica(tamanhoFazenda, 1.5, Math.PI/2); cE.position.set(-tamanhoFazenda/2, 0.75, 0); cercaExterna.add(cE); const cD = criarCercaGenerica(tamanhoFazenda, 1.5, Math.PI/2); cD.position.set(tamanhoFazenda/2, 0.75, 0); cercaExterna.add(cD); scene.add(cercaExterna); criarFloresta();
// --- LÓGICA DO JOGO ---

// Array para guardar os objetos dos animais.
const animais = [];
// Objeto que funciona como um "enum" para os estados de um canteiro.
const ESTADOS = { GRAMA: 'grama', BLOQUEADO: 'bloqueado', ARADA: 'arada', ARADA_AGUADA: 'arada_aguada', PLANTADA: 'plantada', CRESCENDO: 'crescendo', MADURA: 'madura', COM_PRAGA: 'com_praga' };
// Constantes que definem os atributos de cada item, como um "banco de dados" do jogo.
const PLANTAS = { /* ... */ };
const ANIMAIS = { /* ... */ };
const ITENS_LOJA = { /* ... */ };

// Variáveis para controlar o estado da interação do jogador.
let ferramentaAtiva = 'enxada', canteiroSelecionado = null, hoveredAnimal = null;
const tooltip = document.getElementById('tooltip');

// ... (Restante de todas as funções de lógica de jogo, UI, e interação) ...
// (O código completo e sem cortes, como no arquivo original, vai aqui)
  function criarAnimal(tipo, x, z) { const div = document.createElement('div'); div.className = 'emoji-3d animal com-fome'; div.id = tipo + (animais.filter(a=>a.tipo===tipo).length); if (tipo === 'galinha') div.textContent = '🐓'; else if (tipo === 'vaca') div.textContent = '🐄'; else if (tipo === 'porco') div.textContent = '🐖'; div.style.left = '50%'; div.style.top = '50%'; document.getElementById('ui-container').appendChild(div); const animal = { tipo, div, position: new THREE.Vector3(x, 0, z), fome: 0, produzindo: false, recursoElement: null, tempoProducaoRestante: null, productionInterval: null }; div.addEventListener('mouseover', () => { hoveredAnimal = animal; }); div.addEventListener('mouseout', () => { hoveredAnimal = null; }); animais.push(animal); return animal; }
  function moverAnimal(animal) { const minX = curralCenterX - curralTamanho / 2 + 1; const maxX = curralCenterX + curralTamanho / 2 - 1; const minZ = curralCenterZ - curralTamanho / 2 + 1; const maxZ = curralCenterZ + curralTamanho / 2 - 1; const novoX = Math.random() * (maxX - minX) + minX; const novoZ = Math.random() * (maxZ - minZ) + minZ; animal.position.set(novoX, 0, novoZ); }
  function criarPraga(canteiro) { if (canteiro.userData.pragaElement) return; canteiro.userData.estadoOriginal = canteiro.userData.estado; canteiro.userData.estado = ESTADOS.COM_PRAGA; const pragaDiv = document.createElement('div'); pragaDiv.className = 'emoji-3d praga'; pragaDiv.textContent = '🐛'; pragaDiv.style.fontSize = '25px'; pragaDiv.addEventListener('click', (event) => { event.stopPropagation(); if (ferramentaAtiva === 'veneno-tool') { removerPraga(canteiro); } else { notificar("Selecione o veneno para remover a praga!", 'info'); } }); document.getElementById('ui-container').appendChild(pragaDiv); canteiro.userData.pragaElement = pragaDiv; notificar("Uma praga apareceu!", 'erro'); }
  function iniciarCicloCrescimento(canteiro) { const plantaConfig = PLANTAS[canteiro.userData.tipoPlanta.toUpperCase()]; if (!plantaConfig) return; if (canteiro.userData.intervalId) { clearInterval(canteiro.userData.intervalId); } if (canteiro.userData.estado === ESTADOS.PLANTADA && !canteiro.userData.tempoParaCrescer) { canteiro.userData.tempoParaCrescer = plantaConfig.tempoEstagio1; } if (canteiro.userData.estado === ESTADOS.CRESCENDO && !canteiro.userData.tempoParaAmadurecer) { canteiro.userData.tempoParaAmadurecer = plantaConfig.tempoEstagio2; } canteiro.userData.intervalId = setInterval(() => { if (canteiro.userData.estado === ESTADOS.COM_PRAGA) { return; } if (Math.random() < 0.005 && !canteiro.userData.pragaElement && (canteiro.userData.estado === ESTADOS.PLANTADA || canteiro.userData.estado === ESTADOS.CRESCENDO)) { criarPraga(canteiro); } if (canteiro.userData.estado === ESTADOS.PLANTADA) { canteiro.userData.tempoParaCrescer -= 1000; if (canteiro.userData.tempoParaCrescer <= 0) { canteiro.userData.estado = ESTADOS.CRESCENDO; canteiro.userData.plantaElement.textContent = plantaConfig.crescendo.emoji; canteiro.userData.plantaElement.style.fontSize = plantaConfig.crescendo.fontSize; canteiro.userData.tempoParaAmadurecer = plantaConfig.tempoEstagio2; canteiro.userData.tempoParaCrescer = 0; } } else if (canteiro.userData.estado === ESTADOS.CRESCENDO) { canteiro.userData.tempoParaAmadurecer -= 1000; if (canteiro.userData.tempoParaAmadurecer <= 0) { canteiro.userData.estado = ESTADOS.MADURA; canteiro.userData.plantaElement.textContent = plantaConfig.maduro.emoji; canteiro.userData.plantaElement.style.fontSize = plantaConfig.maduro.fontSize; clearInterval(canteiro.userData.intervalId); canteiro.userData.intervalId = null; } } }, 1000); }
  function iniciarProducaoCiclo(animal, tempoRestante) { animal.produzindo = true; const animalConfig = ANIMAIS[animal.tipo.toUpperCase()]; if (animal.productionInterval) clearInterval(animal.productionInterval); animal.tempoProducaoRestante = tempoRestante || animalConfig.tempoProducao; const moveInterval = setInterval(() => { moverAnimal(animal); }, 2500); animal.productionInterval = setInterval(() => { animal.tempoProducaoRestante -= 1000; if (animal.tempoProducaoRestante <= 0) { clearInterval(moveInterval); clearInterval(animal.productionInterval); animal.productionInterval = null; animal.tempoProducaoRestante = 0; const recursoDiv = document.createElement('div'); recursoDiv.className = 'emoji-3d recurso-animal'; recursoDiv.textContent = animalConfig.recurso.emoji; recursoDiv.dataset.tipo = animal.tipo; recursoDiv.style.fontSize = '25px'; document.getElementById('ui-container').appendChild(recursoDiv); animal.recursoElement = recursoDiv; animal.produzindo = false; animal.div.classList.remove('alimentado'); animal.div.classList.add('com-fome'); saveFarmState(); } }, 1000); }
  function notificar(msg, tipo) { const n = document.createElement('div'); n.className = 'notificacao'; n.setAttribute('data-type', tipo); n.innerHTML = `<span>${msg}</span>`; document.getElementById('ui-container').appendChild(n); setTimeout(() => n.remove(), 4000); }
  function atualizarInterface() { if (!recursos || !recursos.sementes) return; document.getElementById('lco-balance').textContent = lcoBalance.toFixed(2); document.getElementById('moedas').textContent = recursos.moedas; document.getElementById('agua').textContent = recursos.agua; document.getElementById('racao').textContent = recursos.racao; document.getElementById('veneno').textContent = recursos.veneno; document.getElementById('preco-terreno').textContent = recursos.precoTerreno; atualizarInventarioSementes(); }
  function atualizarInventarioSementes() { const div = document.getElementById('inventario-sementes'); div.innerHTML = '<h3>Minhas Sementes</h3>'; let has = false; for (const tipo in recursos.sementes) { if (recursos.sementes[tipo] > 0) { has = true; const p = PLANTAS[tipo.toUpperCase()]; const i = document.createElement('div'); i.className = 'item-inventario'; i.innerHTML = `${p.emoji} ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} x<span>${recursos.sementes[tipo]}</span>`; div.appendChild(i); } } if (!has) { const p = document.createElement('p'); p.textContent = 'Você não tem sementes.'; div.appendChild(p); } }
  function mostrarModalConfirmacao(msg, onConfirm) { document.getElementById('modal-mensagem').textContent = msg; const confirmBtn = document.getElementById('modal-btn-confirmar'); const cancelBtn = document.getElementById('modal-btn-cancelar'); const newConfirmBtn = confirmBtn.cloneNode(true); confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn); newConfirmBtn.addEventListener('click', () => { onConfirm(); document.getElementById('modal-confirmacao').style.display = 'none'; }); cancelBtn.onclick = () => { document.getElementById('modal-confirmacao').style.display = 'none'; }; document.getElementById('modal-confirmacao').style.display = 'flex'; }
  function mostrarModalSementes() { const o = document.getElementById('opcoes-sementes'); o.innerHTML = ''; let disp = false; for (const tipo in recursos.sementes) { if (recursos.sementes[tipo] > 0) { disp = true; const p = PLANTAS[tipo.toUpperCase()]; const d = document.createElement('div'); d.className = 'opcao-semente'; d.innerHTML = `<span>${p.maduro.emoji} ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span><span>x${recursos.sementes[tipo]}</span>`; d.onclick = () => plantarSemente(tipo); o.appendChild(d); } } if (!disp) { o.innerHTML = '<p>Você não tem sementes.</p>'; } document.getElementById('modal-sementes').style.display = 'flex'; }
  function fecharModalSementes() { document.getElementById('modal-sementes').style.display = 'none'; canteiroSelecionado = null; }
  
  function renderizarCenarioSalvo() {
      if (!farmState) return;
      if (farmState.terrenosComprados) { for(let i = 0; i < farmState.terrenosComprados; i++) { if (canteiros[i] && canteiros[i].userData.estado === ESTADOS.BLOQUEADO) { canteiros[i].userData.estado = ESTADOS.GRAMA; canteiros[i].material = canteiroGramaMaterial; if (canteiros[i].userData.cadeadoElement) { canteiros[i].userData.cadeadoElement.remove(); canteiros[i].userData.cadeadoElement = null; } } } }
      if (farmState.canteirosState && farmState.canteirosState.length > 0) { farmState.canteirosState.forEach((estadoSalvo, index) => { const canteiro = canteiros[index]; if (!canteiro || canteiro.userData.estado === ESTADOS.BLOQUEADO) return; 
          
          canteiro.userData.estado = estadoSalvo.estado;
          canteiro.userData.tipoPlanta = estadoSalvo.tipoPlanta;
          canteiro.userData.tempoParaCrescer = estadoSalvo.tempoParaCrescer;
          canteiro.userData.tempoParaAmadurecer = estadoSalvo.tempoParaAmadurecer;
          canteiro.userData.estadoOriginal = estadoSalvo.estadoOriginal;

          let estadoVisual = estadoSalvo.hasPraga ? estadoSalvo.estadoOriginal : estadoSalvo.estado;

          switch(estadoVisual) {
              case ESTADOS.ARADA: canteiro.material = canteiroTerraMaterial; break;
              case ESTADOS.ARADA_AGUADA: canteiro.material = canteiroTerraMolhadaMaterial; break;
          }

          if (canteiro.userData.tipoPlanta) {
              const plantaConfig = PLANTAS[canteiro.userData.tipoPlanta.toUpperCase()];
              const divPlanta = document.createElement('div');
              divPlanta.className = 'emoji-3d planta';
              
              if (estadoVisual === ESTADOS.PLANTADA) { divPlanta.textContent = plantaConfig.broto.emoji; divPlanta.style.fontSize = plantaConfig.broto.fontSize; } 
              else if (estadoVisual === ESTADOS.CRESCENDO) { divPlanta.textContent = plantaConfig.crescendo.emoji; divPlanta.style.fontSize = plantaConfig.crescendo.fontSize; } 
              else if (estadoVisual === ESTADOS.MADURA) { divPlanta.textContent = plantaConfig.maduro.emoji; divPlanta.style.fontSize = plantaConfig.maduro.fontSize; }
              
              if(divPlanta.textContent) {
                document.getElementById('ui-container').appendChild(divPlanta);
                canteiro.userData.plantaElement = divPlanta;
              }
              
              if (estadoSalvo.estado !== ESTADOS.MADURA) {
                  iniciarCicloCrescimento(canteiro);
              }
          }

          if (estadoSalvo.hasPraga) {
              criarPraga(canteiro);
          }
      }); }
      if (farmState.animaisState && farmState.animaisState.length > 0) { farmState.animaisState.forEach(animalSalvo => { const animalRecriado = criarAnimal(animalSalvo.tipo, animalSalvo.position.x, animalSalvo.position.z); animalRecriado.produzindo = animalSalvo.produzindo; animalRecriado.tempoProducaoRestante = animalSalvo.tempoProducaoRestante; if (animalSalvo.isFed) { animalRecriado.div.classList.remove('com-fome'); animalRecriado.div.classList.add('alimentado'); } if (animalSalvo.hasRecurso) { const animalConfig = ANIMAIS[animalRecriado.tipo.toUpperCase()]; const recursoDiv = document.createElement('div'); recursoDiv.className = 'emoji-3d recurso-animal'; recursoDiv.textContent = animalConfig.recurso.emoji; recursoDiv.dataset.tipo = animalRecriado.tipo; recursoDiv.style.fontSize = '25px'; document.getElementById('ui-container').appendChild(recursoDiv); animalRecriado.recursoElement = recursoDiv; } if(animalRecriado.produzindo) { iniciarProducaoCiclo(animalRecriado, animalRecriado.tempoProducaoRestante); } }); }
  }
  
  function plantarSemente(tipoSemente) { if (!canteiroSelecionado || recursos.sementes[tipoSemente] <= 0) { return fecharModalSementes(); } const p = PLANTAS[tipoSemente.toUpperCase()]; canteiroSelecionado.userData.estado = ESTADOS.PLANTADA; canteiroSelecionado.userData.tipoPlanta = tipoSemente; if (canteiroSelecionado.userData.plantaElement) canteiroSelecionado.userData.plantaElement.remove(); const d = document.createElement('div'); d.className = 'emoji-3d planta'; d.textContent = p.broto.emoji; d.style.fontSize = p.broto.fontSize; document.getElementById('ui-container').appendChild(d); canteiroSelecionado.userData.plantaElement = d; recursos.sementes[tipoSemente]--; notificar(`${tipoSemente.charAt(0).toUpperCase() + tipoSemente.slice(1)} plantada!`, 'sucesso'); atualizarInterface(); iniciarCicloCrescimento(canteiroSelecionado); fecharModalSementes(); saveFarmState(); }
  function colherPlanta(canteiro) { if (canteiro.userData.estado !== ESTADOS.MADURA) return; if (canteiro.userData.intervalId) clearInterval(canteiro.userData.intervalId); const tipo = canteiro.userData.tipoPlanta; const plantaConfig = PLANTAS[tipo.toUpperCase()]; recursos.moedas += plantaConfig.recompensa; notificar(`Você colheu ${tipo}! (+${plantaConfig.recompensa} moedas)`, 'sucesso'); if (canteiro.userData.plantaElement) canteiro.userData.plantaElement.remove(); if (canteiro.userData.pragaElement) canteiro.userData.pragaElement.remove(); canteiro.userData = { ...canteiro.userData, estado: ESTADOS.GRAMA, tipoPlanta: null, estagio: null, plantaElement: null, pragaElement: null, estadoOriginal: null, intervalId: null, tempoParaCrescer: null, tempoParaAmadurecer: null }; canteiro.material = canteiroGramaMaterial; atualizarInterface(); saveFarmState(); }
  function removerPraga(canteiro) { if (recursos.veneno > 0) { recursos.veneno--; canteiro.userData.estado = canteiro.userData.estadoOriginal; canteiro.userData.estadoOriginal = null; if (canteiro.userData.pragaElement) { canteiro.userData.pragaElement.remove(); canteiro.userData.pragaElement = null; } notificar("Praga removida!", 'sucesso'); atualizarInterface(); saveFarmState(); } else { notificar("Você não tem veneno! Compre na loja.", 'erro'); } }
  async function comprarTerrenoComLCO() { const resultado = await apiRequest('/api/fazenda/buy-land', 'POST'); if(resultado) { farmState = resultado.fazendaGameState; lcoBalance = resultado.lulaCoinGameState.balance; recursos = farmState; notificar(`Terreno comprado! Novo saldo de LCO: ${lcoBalance.toFixed(2)}`, 'sucesso'); atualizarInterface(); renderizarCenarioSalvo(); saveFarmState(); } }
  window.comprar = (item) => { const itemUpper = item.toUpperCase(); if (itemUpper === 'TERRENO') { mostrarModalConfirmacao(`Deseja comprar Terreno por ${recursos.precoTerreno} LCO?`, comprarTerrenoComLCO); return; } const c = ITENS_LOJA[itemUpper]; if (!c) return; const precoFinal = c.preco; const nomeFinal = `${c.quantity > 1 ? c.quantity : ''} ${c.nome}`.trim(); mostrarModalConfirmacao(`Deseja comprar ${nomeFinal} por ${precoFinal} moedas?`, () => { if (recursos.moedas < precoFinal) return notificar("Moedas insuficientes!", 'erro'); recursos.moedas -= precoFinal; if (c.tipo === 'semente') { recursos.sementes[c.nome] += c.quantity; } else if (c.tipo === 'recurso') { recursos[c.nome] += c.quantity; } else if (c.tipo === 'animal') { const pX = curralCenterX + (Math.random() * (curralTamanho - 2) - (curralTamanho / 2 - 1)); const pZ = curralCenterZ + (Math.random() * (curralTamanho - 2) - (curralTamanho / 2 - 1)); criarAnimal(c.nome, pX, pZ); } notificar(`${nomeFinal} comprado(s)!`, 'sucesso'); atualizarInterface(); saveFarmState(); }); };
  
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  window.addEventListener('click', async (event) => { 
      
      if (event.target.classList.contains('planta')) {
          const canteiro = canteiros.find(c => c.userData.plantaElement === event.target);
          if (canteiro) {
              if (canteiro.userData.estado === ESTADOS.MADURA && ferramentaAtiva === 'foice') {
                  colherPlanta(canteiro);
                  return; 
              } 
              else if (canteiro.userData.estado === ESTADOS.MADURA && ferramentaAtiva !== 'foice') {
                  notificar("Selecione a foice para colher!", 'info');
                  return;
              }
          }
      }

      if (event.target.classList.contains('animal')) { const animalDivId = event.target.id; const animalObject = animais.find(a => a.div.id === animalDivId); if (!animalObject || animalObject.produzindo || !animalObject.div.classList.contains('com-fome')) return; const animalConfig = ANIMAIS[animalObject.tipo.toUpperCase()]; if (recursos.racao >= animalConfig.custoRacao) { recursos.racao -= animalConfig.custoRacao; notificar(`${animalObject.tipo.charAt(0).toUpperCase() + animalObject.tipo.slice(1)} alimentado(a)!`, 'sucesso'); atualizarInterface(); animalObject.div.classList.remove('com-fome'); animalObject.div.classList.add('alimentado'); iniciarProducaoCiclo(animalObject); saveFarmState(); } else { notificar("Ração insuficiente!", 'erro'); } return; } 
      if (event.target.classList.contains('recurso-animal')) { const tipoAnimal = event.target.dataset.tipo; const animalConfig = ANIMAIS[tipoAnimal.toUpperCase()]; recursos.moedas += animalConfig.recurso.valor; notificar(`${animalConfig.recurso.emoji} coletado! (+${animalConfig.recurso.valor} moedas)`, 'sucesso'); atualizarInterface(); const animal = animais.find(a => a.recursoElement === event.target); if(animal) animal.recursoElement = null; event.target.remove(); saveFarmState(); return; } 
      if (event.target.closest('button, .modal, .praga')) { return; }
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = - (event.clientY / window.innerHeight) * 2 + 1; 
      raycaster.setFromCamera(mouse, camera);
      
      const intersectsCasa = raycaster.intersectObjects(objetosClicaveis);
      if (intersectsCasa.length > 0) {
        canteiros.forEach(c => {
            if (c.userData.estado === ESTADOS.COM_PRAGA) {
                if (c.userData.pragaElement) {
                    c.userData.pragaElement.remove();
                    c.userData.pragaElement = null;
                }
                c.userData.estado = c.userData.estadoOriginal || ESTADOS.PLANTADA;
                c.userData.estadoOriginal = null;
                if (c.userData.tipoPlanta) {
                    iniciarCicloCrescimento(c);
                }
            }
        });
        await saveFarmState();
        mostrarModalConfirmacao("Deseja voltar para a sala de mineração?", () => {
            window.location.href = '/';
        });
        return;
      }
      
      const intersects = raycaster.intersectObjects(canteiros); 
      if (intersects.length > 0) {
        const canteiro = intersects[0].object;
        const { estado } = canteiro.userData;
        
        if (estado === ESTADOS.BLOQUEADO) {
            notificar("Vá até a loja para comprar este terreno com LCO!", 'info');
        } else if (ferramentaAtiva === 'enxada' && estado === ESTADOS.GRAMA) {
            canteiro.userData.estado = ESTADOS.ARADA;
            canteiro.material = canteiroTerraMaterial;
            notificar("Canteiro arado!", 'sucesso');
            saveFarmState();
        } else if (ferramentaAtiva === 'regador' && estado === ESTADOS.ARADA) {
            if (recursos.agua > 0) {
                recursos.agua--;
                canteiro.userData.estado = ESTADOS.ARADA_AGUADA;
                canteiro.material = canteiroTerraMolhadaMaterial;
                notificar("Terra regada!", 'sucesso');
                atualizarInterface();
                saveFarmState();
            } else {
                notificar("Você não tem água! Compre na loja.", 'erro');
            }
        } else if (ferramentaAtiva === 'semente' && estado === ESTADOS.ARADA_AGUADA) {
            canteiroSelecionado = canteiro;
            mostrarModalSementes();
        } else if (ferramentaAtiva === 'semente' && estado === ESTADOS.ARADA) {
            notificar("Você precisa regar a terra antes de plantar!", 'info');
        } else if (ferramentaAtiva === 'foice' && estado === ESTADOS.MADURA) {
            colherPlanta(canteiro);
        } else if (ferramentaAtiva === 'veneno-tool' && estado === ESTADOS.COM_PRAGA) {
            removerPraga(canteiro);
        } else if (estado === ESTADOS.COM_PRAGA) {
            notificar("Use veneno para remover a praga!", 'info');
        } else if (estado === ESTADOS.MADURA && ferramentaAtiva !== 'foice') {
            notificar("Selecione a foice para colher!", 'info');
        }
      } 
  });
  
  window.addEventListener('contextmenu', (event) => event.preventDefault());
  
  function atualizarPosicoes2D() { animais.forEach(animal => { const pos = animal.position.clone().project(camera); animal.div.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`; animal.div.style.top = `${(-(pos.y * 0.5) + 0.5) * window.innerHeight}px`; if (animal.recursoElement) { const rPos = animal.position.clone(); rPos.y += 0.5; const screenPos = rPos.project(camera); animal.recursoElement.style.left = `${(screenPos.x * 0.5 + 0.5) * window.innerWidth}px`; animal.recursoElement.style.top = `${(-(screenPos.y * 0.5) + 0.5) * window.innerHeight}px`; } }); canteiros.forEach(canteiro => { const planta = canteiro.userData.plantaElement; const cadeado = canteiro.userData.cadeadoElement; const praga = canteiro.userData.pragaElement; if (planta) { const pos = canteiro.position.clone().project(camera); const yOffset = -20; planta.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`; planta.style.top = `${(-(pos.y * 0.5) + 0.5) * window.innerHeight + yOffset}px`; } if (cadeado) { const pos = canteiro.position.clone().project(camera); cadeado.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`; cadeado.style.top = `${(-(pos.y * 0.5) + 0.5) * window.innerHeight}px`; } if (praga) { const pos = canteiro.position.clone().project(camera); const yOffset = -35; praga.style.left = `${(pos.x * 0.5 + 0.5) * window.innerWidth}px`; praga.style.top = `${(-(pos.y * 0.5) + 0.5) * window.innerHeight + yOffset}px`; } }); }
  function aplicarFisicaAnimais() { const distanciaMinima = 1.0; const forcaRepulsao = 0.01; for (let i = 0; i < animais.length; i++) { for (let j = i + 1; j < animais.length; j++) { const animalA = animais[i]; const animalB = animais[j]; const vetDist = animalA.position.clone().sub(animalB.position); const distancia = vetDist.length(); if (distancia < distanciaMinima) { const deslocamento = vetDist.normalize().multiplyScalar(forcaRepulsao); animalA.position.add(deslocamento); animalB.position.sub(deslocamento); const minX = curralCenterX - curralTamanho / 2 + 0.5; const maxX = curralCenterX + curralTamanho / 2 - 0.5; const minZ = curralCenterZ - curralTamanho / 2 + 0.5; const maxZ = curralCenterZ + curralTamanho / 2 - 0.5; animalA.position.x = Math.max(minX, Math.min(maxX, animalA.position.x)); animalA.position.z = Math.max(minZ, Math.min(maxZ, animalA.position.z)); animalB.position.x = Math.max(minX, Math.min(maxX, animalB.position.x)); animalB.position.z = Math.max(minZ, Math.min(maxZ, animalB.position.z)); } } } }
  window.addEventListener('mousemove', (event) => { mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = - (event.clientY / window.innerHeight) * 2 + 1; tooltip.style.left = `${event.clientX + 15}px`; tooltip.style.top = `${event.clientY}px`; });
  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
  const clock = new THREE.Clock();
  
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getElapsedTime();
    waterMaterial.uniforms.u_time.value = deltaTime;
    if (animais.length > 1) {
        aplicarFisicaAnimais();
    }
    raycaster.setFromCamera(mouse, camera);

    let isTooltipVisible = false;

    // Lógica de tooltip para canteiros
    const intersects = raycaster.intersectObjects(canteiros);
    if (intersects.length > 0) {
        const canteiro = intersects[0].object;
        const { estado, tempoParaCrescer, tempoParaAmadurecer } = canteiro.userData;
        if (estado === ESTADOS.COM_PRAGA) {
            tooltip.style.display = 'block';
            tooltip.classList.add('alerta-praga');
            tooltip.textContent = 'PRAGA! Use o veneno!';
            isTooltipVisible = true;
        } else if (estado === ESTADOS.PLANTADA || estado === ESTADOS.CRESCENDO) {
            tooltip.style.display = 'block';
            tooltip.classList.remove('alerta-praga');
            let tempoRestante = estado === ESTADOS.PLANTADA ? tempoParaCrescer : tempoParaAmadurecer;
            if (tempoRestante > 0) {
                const minutos = Math.floor(tempoRestante / 60000);
                const segundos = Math.floor((tempoRestante % 60000) / 1000);
                tooltip.textContent = `Tempo: ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
            } else {
                tooltip.textContent = 'Pronto para colher!';
            }
            isTooltipVisible = true;
        } else if (estado === ESTADOS.MADURA) {
            tooltip.style.display = 'block';
            tooltip.classList.remove('alerta-praga');
            tooltip.textContent = 'Pronto para colher!';
            isTooltipVisible = true;
        }
    }

    // Lógica de tooltip para animais
    if (hoveredAnimal && hoveredAnimal.produzindo && hoveredAnimal.tempoProducaoRestante > 0) {
        const tempoRestante = hoveredAnimal.tempoProducaoRestante;
        const minutos = Math.floor(tempoRestante / 60000);
        const segundos = Math.floor((tempoRestante % 60000) / 1000);
        tooltip.textContent = `Produzindo: ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        tooltip.style.display = 'block';
        tooltip.classList.remove('alerta-praga');
        isTooltipVisible = true;
    }

    if (!isTooltipVisible) {
        tooltip.style.display = 'none';
    }

    controls.update();
    renderer.render(scene, camera);
    atualizarPosicoes2D();
  }

  function selecionarFerramenta(id) { if (!document.getElementById(id)) return; ferramentaAtiva = id; document.querySelectorAll('.botao-ferramenta').forEach(btn => btn.classList.remove('active')); document.getElementById(id).classList.add('active'); }
  document.querySelectorAll('.botao-ferramenta').forEach(b => b.addEventListener('click', (e) => { selecionarFerramenta(e.currentTarget.id); }));
  window.addEventListener('keydown', (event) => { switch(event.key) { case '1': selecionarFerramenta('enxada'); break; case '2': selecionarFerramenta('semente'); break; case '3': selecionarFerramenta('regador'); break; case '4': selecionarFerramenta('foice'); break; case '5': selecionarFerramenta('veneno-tool'); break; } });
  document.getElementById('abrir-loja').addEventListener('click', () => { const loja = document.getElementById('loja'); loja.style.display = loja.style.display === 'none' || loja.style.display === '' ? 'flex' : 'none'; });
  document.getElementById('abrir-inventario-sementes').addEventListener('click', () => { const inv = document.getElementById('inventario-sementes'); inv.style.display = inv.style.display === 'none' || inv.style.display === '' ? 'flex' : 'none'; });
  
  // Ponto de entrada do script.
  document.addEventListener('DOMContentLoaded', () => {
      if (!localStorage.getItem('token')) {
          alert("Você precisa estar logado para jogar! Redirecionando...");
          window.location.href = '/index.html';
          return;
      }
      loadInitialState();
      // Salva o progresso quando o jogador está prestes a fechar a página.
      window.addEventListener('beforeunload', () => {
          if (farmState && Object.keys(farmState).length > 0) {
              // sendBeacon é uma forma mais confiável de enviar dados ao fechar a página.
              navigator.sendBeacon(`${API_BASE_URL}/api/fazenda/update`, JSON.stringify({ newFarmState: farmState }));
          }
      });
      animate();
  });
