// game.js

// Certifique-se de que esta URL base está CORRETA para o seu backend no Render
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';

// Assumindo que userToken e username são variáveis globais ou obtidas de cookies/localStorage
let userToken = getCookie('userToken'); // Função getCookie de auth.js ou similar
let currentUsername = getCookie('username'); // Função getCookie de auth.js ou similar
let lulaCoins = 0;
let level = 1;
let minerValue = 1;
let totalHashrate = 0; // Hashrate total do jogador
let placedGpus = {}; // Para armazenar GPUs colocadas nos racks { 'rack-1-slot-0': { type: 'RTX 3090', hashrate: 100 } }

// Elementos da UI (adapte para os IDs do seu HTML)
const lulaCoinsDisplay = document.getElementById('lula-coins-display');
const levelDisplay = document.getElementById('level-display');
const hashrateDisplay = document.getElementById('hashrate-display');
const minerButton = document.getElementById('miner-button');
const upgradeMinerButton = document.getElementById('upgrade-miner-button');
const saqueButton = document.getElementById('saque-button');
const logoutButton = document.getElementById('logout-button');
const monitorText = document.getElementById('monitor-text');

// Elementos do Overlay de Mensagem (verifique se os IDs correspondem ao seu HTML)
const overlayMessage = document.getElementById('overlay-message');
const overlayMessageText = document.getElementById('overlay-message-text');
const overlayMessageOkButton = document.getElementById('overlay-message-ok-button');

// Elementos da tela de autenticação e jogo (verifique se os IDs correspondem ao seu HTML)
const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');

// Variáveis para funcionalidade de colocar mineradores
const minerSelectionBar = document.getElementById('miner-selection-bar');
const minerOptions = document.querySelectorAll('.miner-option'); // Ex: RTX 3090, RX 6800
let placingItem = null; // Armazena o tipo de GPU que está sendo arrastada
let selectedItemForPlacement = null; // O elemento HTML da GPU selecionada na barra

// Função para exibir o overlay de mensagem
function showOverlayMessage(message, type) {
    if (overlayMessage && overlayMessageText && overlayMessageOkButton) {
        overlayMessageText.textContent = message;
        overlayMessage.style.display = 'flex'; // Mostra o overlay

        // Oculta o overlay ao clicar no botão OK
        overlayMessageOkButton.onclick = () => {
            overlayMessage.style.display = 'none';
        };
    } else {
        console.warn('showOverlayMessage: Elementos do overlay de mensagem não encontrados. Mensagem:', message);
        alert(message); // Fallback para alert se os elementos não existirem
    }
}

// Função para atualizar a interface do jogo com os dados do usuário
function updateGameUI(userData) {
    if (!userData) {
        console.error('Dados do usuário inválidos para atualização da UI.');
        return;
    }
    lulaCoins = userData.lulaCoins || 0;
    level = userData.level || 1;
    minerValue = userData.minerValue || 1;
    totalHashrate = userData.totalHashrate || 0;
    placedGpus = userData.placedGpus || {};

    if (lulaCoinsDisplay) lulaCoinsDisplay.textContent = lulaCoins.toFixed(8);
    if (levelDisplay) levelDisplay.textContent = level;
    if (hashrateDisplay) hashrateDisplay.textContent = totalHashrate.toFixed(2);

    updateMonitorText(userData);
    updateRackDisplay(); // Atualiza a visualização dos racks com as GPUs colocadas
}

// Função para atualizar o texto do monitor
function updateMonitorText(userData) {
    if (monitorText && userData) {
        let text = `
            Status do Minerador:\n
            Usuário: ${currentUsername}\n
            LulaCoins: ${userData.lulaCoins.toFixed(8)}\n
            Nível: ${userData.level}\n
            Hashrate Total: ${userData.totalHashrate.toFixed(2)} MH/s
        `;
        monitorText.textContent = text;
    }
}

// Função para fazer a requisição de minerar (exemplo)
async function mineLulaCoins() {
    if (!userToken) {
        showOverlayMessage('Você precisa estar logado para minerar.', 'error');
        return;
    }
    try {
        console.log(`[GAME] Tentando minerar na URL: ${API_BASE_URL}/api/game/mine`); // Log para depuração
        const response = await fetch(`${API_BASE_URL}/api/game/mine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao minerar.');
        }

        const data = await response.json();
        console.log('[GAME] Mineração bem-sucedida:', data);
        updateGameUI(data.updatedUser);
        showOverlayMessage(`+${data.minedAmount.toFixed(8)} LulaCoins!`, 'success');
    } catch (error) {
        console.error('[GAME] Erro na mineração:', error);
        showOverlayMessage(error.message || 'Erro de conexão ao minerar.', 'error');
    }
}

// Função para buscar dados do usuário (após login ou ao carregar a página)
async function loadUserData() {
    userToken = getCookie('userToken');
    currentUsername = getCookie('username');

    if (!userToken) {
        // Redireciona para a tela de autenticação se não houver token
        if (authScreen) authScreen.style.display = 'flex';
        if (gameScreen) gameScreen.style.display = 'none';
        console.log('Nenhum token encontrado. Redirecionando para autenticação.');
        return;
    }

    try {
        console.log(`[GAME] Tentando carregar dados do usuário na URL: ${API_BASE_URL}/api/game/status`); // Log para depuração
        const response = await fetch(`${API_BASE_URL}/api/game/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (!response.ok) {
            // Se o token for inválido, desloga o usuário
            if (response.status === 401) {
                console.warn('Token JWT inválido ou expirado. Deslogando...');
                eraseCookie('userToken');
                eraseCookie('username');
                if (authScreen) authScreen.style.display = 'flex';
                if (gameScreen) gameScreen.style.display = 'none';
                showOverlayMessage('Sessão expirada. Faça login novamente.', 'info');
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido ao carregar dados do usuário.');
        }

        const data = await response.json();
        console.log('[GAME] Dados do usuário carregados com sucesso:', data);
        updateGameUI(data);
        if (authScreen) authScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'flex'; // ou 'block', 'grid'
    } catch (error) {
        console.error('[GAME] Erro ao carregar dados do usuário:', error);
        showOverlayMessage(error.message || 'Não foi possível conectar ao servidor do jogo. Tente novamente mais tarde.', 'error');
        // Em caso de erro de conexão, ainda exibe a tela de autenticação
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
        console.log(`[GAME] Tentando upgrade de minerador na URL: ${API_BASE_URL}/api/game/upgrade-miner`); // Log para depuração
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
        console.log(`[GAME] Tentando saque na URL: ${API_BASE_URL}/api/game/withdraw`); // Log para depuração
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
// Dados das GPUs (ajuste conforme seu jogo)
const gpuData = {
    'rtx3090': { name: 'RTX 3090', hashrate: 100, price: 1000 },
    'rx6800': { name: 'RX 6800', hashrate: 70, price: 700 },
    'gtx1660': { name: 'GTX 1660', hashrate: 25, price: 250 },
    'minerRig': { name: 'Rig Completa', hashrate: 500, price: 5000 } // Exemplo
};

// Função para iniciar o arrastar de uma GPU
function startPlacingItem(itemType, itemElement) {
    placingItem = itemType;
    selectedItemForPlacement = itemElement;
    minerSelectionBar.classList.add('active'); // Mostra a barra de seleção de mineradores
    showOverlayMessage(`Selecione um slot de rack para colocar a ${gpuData[itemType].name}.`, 'info');
}

// Função para renderizar os racks e slots no HTML
function updateRackDisplay() {
    const racks = document.querySelectorAll('.rack');
    racks.forEach(rack => {
        const rackId = rack.id;
        // Limpa os slots existentes (para evitar duplicatas ao atualizar)
        rack.innerHTML = ''; 

        for (let i = 0; i < 4; i++) { // 4 slots por rack
            const slotId = `${rackId}-slot-${i}`;
            const slot = document.createElement('div');
            slot.classList.add('rack-slot');
            slot.dataset.slotId = slotId;

            // Verifica se há uma GPU colocada neste slot
            if (placedGpus[slotId]) {
                const gpu = placedGpus[slotId];
                slot.innerHTML = `<img src="assets/${gpu.type.toLowerCase().replace(' ', '')}.png" alt="${gpu.name}" class="placed-gpu">
                                  <span class="gpu-hashrate">${gpu.hashrate} MH/s</span>`;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '<span class="empty-slot-text">+</span>';
                slot.classList.remove('filled');
            }
            rack.appendChild(slot);
        }
    });
    // Re-adicionar listeners após a atualização dos racks
    addEventListenersToRackSlots();
}

// Adiciona listeners aos slots dos racks
function addEventListenersToRackSlots() {
    const rackSlots = document.querySelectorAll('.rack-slot');
    rackSlots.forEach(slot => {
        slot.onclick = async () => {
            if (placingItem) { // Se houver um item selecionado para colocar
                const rackId = slot.closest('.rack').id; // rack-1, rack-2, etc.
                const slotIndex = slot.dataset.slotId.split('-').pop(); // 0, 1, 2, 3

                try {
                    console.log(`[GAME] Tentando colocar GPU: ${placingItem} no ${rackId} slot ${slotIndex}`); // Log para depuração
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
                        placingItem = null; // Reseta o item sendo colocado
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


// Event Listeners (certifique-se de que os IDs correspondem ao seu HTML)
document.addEventListener('DOMContentLoaded', () => {
    // Inicialização: Tenta carregar os dados do usuário ao carregar a página
    loadUserData();

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

    updateRackDisplay(); // Inicializa a exibição dos racks
});
