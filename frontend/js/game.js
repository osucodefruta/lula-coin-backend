// Proteção: Se não houver um token, redireciona para a página de login.
// O caminho absoluto '/login.html' garante que funcione de qualquer lugar do site.
if (!localStorage.getItem('token')) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÕES E CONSTANTES ---
    const API_BASE_URL = 'https://lula-coin-backend.onrender.com';
    const LCO_PER_THS_PER_MINUTE = 0.1;
    const NUM_RACK_PLACEMENT_SLOTS = 5; 
    const MAX_ROOMS = 10;
    const ENERGY_CONSUMPTION_RATE = 100 / 600; 
    const MINERS = [
        { id: 'miner001', name: 'GPU Básica', power: 1, price: 10, color: '#00e0ff' },
        { id: 'miner002', name: 'ASIC Médio', power: 5, price: 30, color: '#ff00e0' },
        { id: 'miner003', name: 'ASIC Avançado', power: 20, price: 180, color: '#00ff7f' },
        { id: 'miner004', name: 'Super ASIC', power: 100, price: 800, color: '#ffa500' },
    ];
    const RACKS = [
        { id: 'rack001', name: 'Rack Pequeno', slots: 2, price: 20, color: '#607d8b' },
        { id: 'rack002', name: 'Rack Médio', slots: 3, price: 30, color: '#4e626e' },
        { id: 'rack003', name: 'Rack Grande', slots: 4, price: 100, color: '#3a4750' },
    ];
    
    // --- ESTADO DO JOGO ---
    let gameState = null;
    let currentRoomIndex = 0;
    let placingItem = null;
    let isTransactionInProgress = false;
    let chatUpdateInterval = null;
    let autoSaveInterval = null;
    let gameLoopInterval, terminalLoopInterval, matchmakingInterval;

    // --- ELEMENTOS DO DOM ---
    const appContainer = document.getElementById('app');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    const balanceElement = document.getElementById('balance');
    const totalPowerElement = document.getElementById('total-power');
    const lcoPerHourElement = document.getElementById('lco-per-hour');
    const rackPlacementArea = document.getElementById('rack-placement-area');
    const miningRoom = document.getElementById('mining-room');
    const terminalTextElement = document.getElementById('terminal-text');
    const roomControls = document.getElementById('room-controls');
    const shopModal = document.getElementById('shop-modal');
    const closeShopBtn = document.getElementById('close-shop-btn');
    const openShopBtn = document.getElementById('open-shop-btn');
    const shopCategoryBtns = document.querySelectorAll('.shop-category-btn');
    const minersShopContent = document.getElementById('miners-shop-content');
    const racksShopContent = document.getElementById('racks-shop-content');
    const inventoryModal = document.getElementById('inventory-modal');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    const openInventoryBtn = document.getElementById('open-inventory-btn');
    const inventoryCategoryBtns = document.querySelectorAll('.inventory-category-btn');
    const minersInventoryContent = document.getElementById('miners-inventory-content');
    const racksInventoryContent = document.getElementById('racks-inventory-content');
    const energyBtn = document.getElementById('energy-btn');
    const energyBar = document.getElementById('energy-bar');
    const energyText = document.getElementById('energy-text');
    const openChatBtn = document.getElementById('open-chat-btn');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatModal = document.getElementById('chat-modal');
    const chatMessagesArea = document.getElementById('chat-messages-area');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const rankingHeader = document.getElementById('ranking-header');
    const rankingBody = document.getElementById('ranking-body');
    const openGamesBtn = document.getElementById('open-games-btn');
    const gamesModal = document.getElementById('games-modal');
    const closeGamesBtn = document.getElementById('close-games-btn');
    const playDamasBtn = document.getElementById('play-damas-btn');
    const damasMatchmakingStatus = document.getElementById('damas-matchmaking-status');
    // CORREÇÃO DE CASE-SENSITIVITY: A variável é declarada com 'g' minúsculo.
    const goToFarmBtn = document.getElementById('go-to-farm-btn');

    // --- FUNÇÕES DE API ---
    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const token = localStorage.getItem('token');
        if (!token) {
            handleLogout(true);
            return null;
        }
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (response.status === 401) {
                handleLogout(true);
                return null;
            }
            if (response.status === 204 || response.headers.get("content-length") === "0") {
                return { success: true, message: "Operação bem-sucedida." };
            }
            if (response.status === 400 || response.status === 429) {
                const errorData = await response.json();
                const errorMessage = errorData.message || (errorData.errors && errorData.errors[0].msg) || 'Erro de validação.';
                if (!endpoint.includes('/api/damas')) {
                    displayTerminalMessage(errorMessage, 'red');
                }
                throw new Error(errorMessage);
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Ocorreu um erro.');
            }
            return data;
        } catch (error) {
            if (!(error.message.includes('mensagens muito rápido') || error.message.includes('A mensagem'))) {
                if (error instanceof SyntaxError) {
                    displayTerminalMessage(`Erro: Resposta inesperada do servidor.`, 'red');
                } else if (!endpoint.includes('/api/damas')) {
                    displayTerminalMessage(`Erro: ${error.message}`, 'red');
                }
            }
            return { message: error.message };
        }
    };

    const handleLogout = (force = false) => {
        if (gameState && !force) {
            saveGame();
        }
        // Limpa todos os loops de atualização do jogo.
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        if (terminalLoopInterval) clearInterval(terminalLoopInterval);
        if (chatUpdateInterval) clearInterval(chatUpdateInterval);
        if (matchmakingInterval) clearInterval(matchmakingInterval);
        
        localStorage.removeItem('token');
        gameState = null;
        
        // CORREÇÃO: Redireciona para a página de login na raiz do site.
        window.location.href = '/login.html';
    };

    // --- FUNÇÕES DE LÓGICA DO JOGO (Ranking, Chat, etc.) ---
    async function fetchGlobalRanking() {
        // ... (código completo da função)
    }
    // ... (todas as outras funções completas como openChat, postMessage, etc.)

    // --- FUNÇÕES DE GERENCIAMENTO DO JOGO ---
    const initializeGame = async () => {
        const data = await apiRequest('/api/game/state');
        if (data && data.gameState) {
            gameState = data.gameState; 
            currentRoomIndex = data.currentRoomIndex || 0;
            appContainer.style.display = 'flex';
            userAvatar.textContent = (data.username ? data.username.charAt(0).toUpperCase() : 'L');
            updateUI(); 
            startLoops();
        } else { 
            handleLogout(true); 
        }
    };
    
    const saveGame = async () => {
        if (!gameState) return;
        gameState.lastEnergyUpdate = Date.now();
        await apiRequest('/api/game/update', 'POST', { gameState, currentRoomIndex });
    };

    // --- FUNÇÕES DE UI E RENDERIZAÇÃO ---
    // ... (código completo de todas as funções como createGpuSprite, renderShop, etc.)
    
    // --- LÓGICA DOS MINIGAMES ---
    function openGames() { gamesModal.style.display = 'flex'; }
    function closeGames() {
        gamesModal.style.display = 'none';
        if (matchmakingInterval) { clearInterval(matchmakingInterval); }
        damasMatchmakingStatus.textContent = '';
        playDamasBtn.disabled = false;
    }

    async function joinDamasMatchmaking() {
        playDamasBtn.disabled = true;
        damasMatchmakingStatus.textContent = 'Entrando na fila...';
        const joinResponse = await apiRequest('/api/damas/matchmaking/join', 'POST');
        if (joinResponse && (joinResponse.message === "Procurando partida..." || joinResponse.message === "Você já está na fila.")) {
            damasMatchmakingStatus.textContent = joinResponse.message;
            if (matchmakingInterval) clearInterval(matchmakingInterval); 
            matchmakingInterval = setInterval(checkMatchmakingStatus, 3000); 
        } else {
            damasMatchmakingStatus.textContent = (joinResponse && joinResponse.message) ? joinResponse.message : 'Erro ao entrar na fila.';
            playDamasBtn.disabled = false;
        }
    }

    async function checkMatchmakingStatus() {
        const statusResponse = await apiRequest('/api/damas/matchmaking/status');
        if (statusResponse && statusResponse.matchFound) {
            clearInterval(matchmakingInterval);
            damasMatchmakingStatus.textContent = 'Partida encontrada! Redirecionando...';
            // CORREÇÃO: Aponta para a pasta /damas/ a partir da raiz.
            window.location.href = `/damas/?gameId=${statusResponse.gameId}`;
        }
    }
    
    // --- LOOPS DO JOGO ---
    function startLoops() {
        // ... (código completo da função startLoops)
    }

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    logoutBtn.addEventListener('click', () => handleLogout(false));
    openShopBtn.addEventListener('click', openShop);
    // ... (código completo de todos os outros event listeners)
    
    // CORREÇÃO DE CASE-SENSITIVITY: Usamos a variável com 'g' minúsculo.
    // CORREÇÃO DE CAMINHO: Aponta para a pasta /fazenda/ a partir da raiz.
    goToFarmBtn.addEventListener('click', () => {
        window.location.href = '/fazenda/';
    });
    
    window.addEventListener('beforeunload', () => { if (gameState) { saveGame(); } });

    // Inicia o jogo.
    initializeGame();
});
