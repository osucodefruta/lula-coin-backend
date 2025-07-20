// game.js

// Definindo a URL base da sua API do backend no Render
// ESTA URL É CRÍTICA! Certifique-se de que está exata.
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';

// Variáveis de estado do jogo
let userToken = getCookie('userToken'); // Assume que getCookie está definido em auth.js ou similar
let currentUsername = getCookie('username'); // Assume que getCookie está definido em auth.js ou similar
let lulaCoins = 0;
let level = 1;
let minerValue = 1;
let totalHashrate = 0; // Hashrate total do jogador
let placedGpus = {}; // Para armazenar GPUs colocadas nos racks { 'rack-1-slot-0': { type: 'RTX 3090', hashrate: 100 } }

// Referências aos elementos da UI do jogo (verifique se os IDs correspondem ao seu HTML)
const lulaCoinsDisplay = document.getElementById('lula-coins-display');
const levelDisplay = document.getElementById('level-display');
const hashrateDisplay = document.getElementById('hashrate-display');
const minerButton = document.getElementById('miner-button');
const upgradeMinerButton = document.getElementById('upgrade-miner-button');
const saqueButton = document.getElementById('saque-button');
const logoutButton = document.getElementById('logout-button');
const monitorText = document.getElementById('monitor-text');

// Referências aos elementos do overlay de mensagem (para exibir mensagens ao usuário)
const overlayMessage = document.getElementById('overlay-message');
const overlayMessageText = document.getElementById('overlay-message-text');
const overlayMessageOkButton = document.getElementById('overlay-message-ok-button');

// Referências às telas principal do jogo e autenticação
const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');

// Variáveis para a funcionalidade de arrastar e colocar mineradores (GPUs)
const minerSelectionBar = document.getElementById('miner-selection-bar');
const minerOptions = document.querySelectorAll('.miner-option'); // Ex: RTX 3090, RX 6800
let placingItem = null; // Armazena o tipo de GPU que está sendo arrastada
let selectedItemForPlacement = null; // O elemento HTML da GPU selecionada na barra

// Função para exibir o overlay de mensagem (pode ser a mesma de auth.js, ou aqui para garantir)
function showOverlayMessage(message, type) {
    if (overlayMessage && overlayMessageText && overlayMessageOkButton) {
        overlayMessageText.textContent = message;
        overlayMessage.style.display = 'flex'; // Mostra o overlay

        if (type === 'error') {
            overlayMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        } else if (type === 'success') {
            overlayMessage.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
        } else {
            overlayMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        }

        overlayMessageOkButton.onclick = () => {
            overlayMessage.style.display = 'none';
        };
    } else {
        console.warn('showOverlayMessage: Elementos do overlay de mensagem não encontrados. Mensagem:', message);
        alert(message); // Fallback para alert
    }
}

// Função para atualizar a interface do jogo com os dados do usuário recebidos do backend
function updateGameUI(userData) {
    if (!userData) {
        console.error('Dados do usuário inválidos para atualização da UI.');
        return;
    }
    lulaCoins = userData.lulaCoins || 0;
    level = userData.level || 1;
    minerValue = userData.minerValue || 1; // Se minerValue é um atributo do usuário
    totalHashrate = userData.totalHashrate || 0;
    placedGpus = userData.placedGpus || {}; // Certifica que placedGpus é um objeto

    if (lulaCoinsDisplay) lulaCoinsDisplay.textContent = lulaCoins.toFixed(8);
    if (levelDisplay) levelDisplay.textContent = level;
    if (hashrateDisplay) hashrateDisplay.textContent = totalHashrate.toFixed(2);

    updateMonitorText(userData);
    updateRackDisplay(); // Atualiza a visualização dos racks com as GPUs colocadas
}

// Função para atualizar o texto do monitor (se você tiver um elemento <pre> para isso)
function updateMonitorText(userData) {
    if (monitorText && userData) {
        let text = `
            Status do Minerador:\n
            Usuário: ${currentUsername}\n
            LulaCoins: ${userData.lulaCoins !== undefined ? userData.lulaCoins.toFixed(8) : 'N/A'}\n
            Nível: ${userData.level !== undefined ? userData.level : 'N/A'}\n
            Hashrate Total: ${userData.totalHashrate !== undefined ? userData.totalHashrate.toFixed(2) : 'N/A'} MH/s
        `;
        monitorText.textContent = text;
    }
}

// Função para fazer a requisição de minerar (chama a API do backend)
async function mineLulaCoins() {
    if (!userToken) {
        showOverlayMessage('Você precisa estar logado para minerar.', 'error');
        return;
    }
    try {
        console.log(`[GAME] Tentando minerar na URL: ${API_BASE_URL}/api/game/mine`);
        const response = await fetch(`${API_BASE_URL}/api/game/mine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` // Envia o token de autenticação
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao minerar.');
        }

        const data = await response.json();
        console.log('[GAME] Mineração bem-sucedida:', data);
        updateGameUI(data.updatedUser); // Atualiza a UI com os novos dados do usuário
        showOverlayMessage(`+${data.minedAmount.toFixed(8)} LulaCoins!`, 'success');
    } catch (error) {
        console.error('[GAME] Erro na mineração:', error);
        showOverlayMessage(error.message || 'Erro de conexão ao minerar.', 'error');
    }
}

// Função para buscar dados do usuário (chamada ao carregar a página ou após login)
async function loadUserData() {
    userToken = getCookie('userToken'); // Obtém o token do cookie
    currentUsername = getCookie('username'); // Obtém o username do cookie

    if (!userToken) {
        // Se não houver token, mostra a tela de autenticação
        if (authScreen) authScreen.style.display = 'flex';
        if (gameScreen) gameScreen.style.display = 'none';
        console.log('[GAME] Nenhum token encontrado. Redirecionando para autenticação.');
        return;
    }

    try {
        console.log(`[GAME] Tentando carregar dados do usuário na URL: ${API_BASE_URL}/api/game/status`);
        const response = await fetch(`${API_BASE_URL}/api/game/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (!response.ok) {
            // Se o token for inválido (status 401), desloga o usuário
            if (response.status === 401) {
                console.warn('[GAME] Token JWT inválido ou expirado. Deslogando...');
                eraseCookie('userToken');
                eraseCookie('username');
                userToken = null;
                currentUsername = null;
                if (authScreen) authScreen.style.display = 'flex';
                if (gameScreen) gameScreen.style.display = 'none';
                showOverlayMessage('Sessão expirada. Faça login novamente.', 'info');
                return; // Importante para não continuar executando o código abaixo
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao carregar dados do usuário.');
        }

        const data = await response.json();
        console.log('[GAME] Dados do usuário carregados com sucesso:', data);
        updateGameUI(data); // Atualiza a UI com os dados recebidos
        if (authScreen) authScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'flex'; // Mostra a tela do jogo
    } catch (error) {
        console.error('[GAME] Erro ao carregar dados do usuário:', error);
        showOverlayMessage(error.message || 'Não foi possível conectar ao servidor do jogo. Tente novamente mais tarde.', 'error');
        // Em caso de erro de conexão ou outro erro grave, volta para a tela de autenticação
        if (authScreen) authScreen.style.display = 'flex';
        if (gameScreen) gameScreen.style.display = 'none';
    }
}

// Função para atualizar o minerador (upgrade)
async function upgradeMiner() {
    if (!userToken) {
        showOverlayMessage('Você precisa estar logado para fazer upgrade.', 'error');
        return;
    }
    try {
        console.log(`[GAME] Tentando upgrade de minerador na URL: ${API_BASE_URL}/api/game/upgrade-miner`);
        const response = await fetch(`${API_BASE_URL}/api/game/upgrade-miner`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao fazer upgrade do minerador.');
        }

        const data = await response.json();
        console.log('[GAME] Upgrade bem-sucedido:', data);
        updateGameUI(data.updatedUser);
        showOverlayMessage(data.message || 'Minerador aprimorado!', 'success');
    } catch (error) {
        console.error('[GAME] Erro no upgrade do minerador:', error);
        showOverlayMessage(error.message || 'Erro ao aprimorar o minerador.', 'error');
    }
}

// Função para sacar moedas
async function saqueLulaCoins() {
    if (!userToken) {
        showOverlayMessage('Você precisa estar logado para sacar.', 'error');
        return;
    }
    try {
        console.log(`[GAME] Tentando saque na URL: ${API_BASE_URL}/api/game/withdraw`);
        const response = await fetch(`${API_BASE_URL}/api/game/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao sacar.');
        }

        const data = await response.json();
        console.log('[GAME] Saque bem-sucedido:', data);
        updateGameUI(data.updatedUser);
        showOverlayMessage(data.message || 'LulaCoins sacados com sucesso!', 'success');
    } catch (error) {
        console.error('[GAME] Erro no saque:', error);
        showOverlayMessage(error.message || 'Erro ao sacar LulaCoins.', 'error');
    }
}

// Função de logout
function logout() {
    eraseCookie('userToken');
    eraseCookie('username');
    userToken = null;
    currentUsername = null;
    // Redireciona para a tela de autenticação
    if (authScreen) authScreen.style.display = 'flex';
    if (gameScreen) gameScreen.style.display = 'none';
    showOverlayMessage('Você foi desconectado.', 'info');
    console.log('Usuário desconectado.');
}

// --- Lógica de colocar GPUs nos racks ---
// Dados das GPUs (ajuste conforme seu jogo e o que vem do backend)
const gpuData = {
    'rtx3090': { name: 'RTX 3090', hashrate: 100, price: 1000 },
    'rx6800': { name: 'RX 6800', hashrate: 70, price: 700 },
    'gtx1660': { name: 'GTX 1660', hashrate: 25, price: 250 },
    'minerRig': { name: 'Rig Completa', hashrate: 500, price: 5000 } // Exemplo
};

// Função para iniciar o arrastar de uma GPU (seleção na barra inferior)
function startPlacingItem(itemType, itemElement) {
    placingItem = itemType;
    selectedItemForPlacement = itemElement;
    minerSelectionBar.classList.add('active'); // Mostra a barra de seleção de mineradores
    showOverlayMessage(`Selecione um slot de rack para colocar a ${gpuData[itemType].name}.`, 'info');
}

// Função para renderizar os racks e slots no HTML com base nos dados 'placedGpus' do usuário
function updateRackDisplay() {
    const racks = document.querySelectorAll('.rack');
    racks.forEach(rack => {
        const rackId = rack.id;
        // Limpa os slots existentes antes de redesenhar
        rack.innerHTML = ''; 

        for (let i = 0; i < 4; i++) { // Assumindo 4 slots por rack
            const slotId = `${rackId}-slot-${i}`;
            const slot = document.createElement('div');
            slot.classList.add('rack-slot');
            slot.dataset.slotId = slotId;

            // Verifica se há uma GPU colocada neste slot no estado do usuário
            if (placedGpus[slotId]) {
                const gpu = placedGpus[slotId];
                // Certifique-se de que a imagem existe em 'assets/' e o nome do arquivo está correto
                const imgFileName = gpu.type.toLowerCase().replace(/ /g, '').replace(/\-/g, ''); // Remove espaços e hífens para nome do arquivo
                slot.innerHTML = `<img src="assets/${imgFileName}.png" alt="${gpu.name}" class="placed-gpu">
                                  <span class="gpu-hashrate">${gpu.hashrate} MH/s</span>`;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '<span class="empty-slot-text">+</span>';
                slot.classList.remove('filled');
            }
            rack.appendChild(slot);
        }
    });
    // Re-adicionar listeners após a atualização dos racks, pois os elementos foram recriados
    addEventListenersToRackSlots();
}

// Adiciona event listeners aos slots dos racks para permitir a colocação de GPUs
function addEventListenersToRackSlots() {
    const rackSlots = document.querySelectorAll('.rack-slot');
    rackSlots.forEach(slot => {
        slot.onclick = async () => {
            if (placingItem) { // Se o usuário selecionou uma GPU para colocar
                const rackId = slot.closest('.rack').id; // rack-1, rack-2, etc.
                const slotIndex = slot.dataset.slotId.split('-').pop(); // 0, 1, 2, 3

                try {
                    console.log(`[GAME] Tentando colocar GPU: ${placingItem} no ${rackId} slot ${slotIndex} na URL: ${API_BASE_URL}/api/game/placeGpu`);
                    const response = await fetch(`${API_BASE_URL}/api/game/placeGpu`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        },
                        body: JSON.stringify({ rackId, slotIndex, gpuType: placingItem })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        showOverlayMessage(data.message, 'success');
                        updateGameUI(data.updatedUser); // Atualiza a UI com os novos dados do usuário
                        placingItem = null; // Reseta o item que estava sendo colocado
                        selectedItemForPlacement = null;
                        minerSelectionBar.classList.remove('active'); // Esconde a barra de seleção
                    } else {
                        showOverlayMessage(data.message || 'Erro ao colocar a GPU.', 'error');
                    }
                } catch (error) {
                    console.error('[GAME] Erro de rede ao colocar GPU:', error);
                    showOverlayMessage('Erro de conexão com o servidor ao colocar GPU.', 'error');
                }
            }
        };
    });
}


// Event Listeners Globais - Carrega dados do usuário ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    // Tenta carregar os dados do usuário ao carregar a página
    // Isso decidirá se mostra a tela de login ou a do jogo
    loadUserData();

    // Adiciona event listeners aos botões do jogo
    if (minerButton) minerButton.addEventListener('click', mineLulaCoins);
    if (upgradeMinerButton) upgradeMinerButton.addEventListener('click', upgradeMiner);
    if (saqueButton) saqueButton.addEventListener('click', saqueLulaCoins);
    if (logoutButton) logoutButton.addEventListener('click', logout);

    // Event listeners para as opções de mineradores na barra de seleção
    minerOptions.forEach(option => {
        option.addEventListener('click', () => {
            const gpuType = option.dataset.gpuType; // Ex: 'rtx3090'
            startPlacingItem(gpuType, option);
        });
    });

    // Inicializa a exibição dos racks (irá preencher os slots)
    updateRackDisplay();
});
