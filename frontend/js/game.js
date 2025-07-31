// This script contains the main game logic for the Lula Coin Miner application.
document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATIONS AND CONSTANTS ---
    const API_BASE_URL = '[https://lula-coin-backend.onrender.com](https://lula-coin-backend.onrender.com)';
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
    
    // --- GAME STATE ---
    let gameState = null;
    let currentRoomIndex = 0;
    let placingItem = null;
    let isTransactionInProgress = false;
    let chatUpdateInterval = null;
    let autoSaveInterval = null;
    let matchmakingInterval = null; 
    let gameLoopInterval, terminalLoopInterval;

    // --- DOM ELEMENTS ---
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
    // CORREÇÃO 2: Variável declarada com a capitalização correta.
    const goToFarmBtn = document.getElementById('go-to-farm-btn');

    // --- FUNCTION DECLARATIONS (CORREÇÃO 1: Funções antes dos listeners) ---

    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const token = localStorage.getItem('token');
        if (!token) { 
            handleLogout(true);
            return null; 
        }
        const options = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
        if (body) { options.body = JSON.stringify(body); }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (response.status === 401) { 
                handleLogout(true);
                return null; 
            }
            if (response.status === 204 || response.headers.get("content-length") === "0") { return { success: true }; }
            const data = await response.json();
            if (!response.ok) { throw new Error(data.message || 'Ocorreu um erro.'); }
            return data;
        } catch (error) {
            displayTerminalMessage(`Erro: ${error.message}`, 'red');
            return null;
        }
    };

    const handleLogout = (force = false) => {
        if (gameState && !force) saveGame();
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        if (terminalLoopInterval) clearInterval(terminalLoopInterval);
        if (chatUpdateInterval) clearInterval(chatUpdateInterval);
        if (matchmakingInterval) clearInterval(matchmakingInterval);
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    };

    async function fetchGlobalRanking() {
        const rankingList = document.getElementById('ranking-list');
        rankingList.innerHTML = '<li>Carregando...</li>';
        const players = await apiRequest('/api/ranking/top5/balance');
        if (!players || !Array.isArray(players)) {
            rankingList.innerHTML = '<li>Erro ao carregar ranking.</li>';
            return;
        }
        rankingList.innerHTML = players.length === 0 ? '<li>Nenhum jogador no ranking.</li>' : '';
        players.forEach((player, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${player.username}</span> <span>◎ ${player.gameState.balance.toFixed(2)}</span>`;
            rankingList.appendChild(li);
        });
    }

    function handleRankingClick() {
        const isHidden = rankingBody.style.display === 'none';
        rankingBody.style.display = isHidden ? 'block' : 'none';
        if (isHidden) fetchGlobalRanking();
    }

    async function fetchMessages() {
        const messages = await apiRequest('/api/chat/messages');
        if (!messages) return;
        chatMessagesArea.innerHTML = '';
        messages.forEach(displaySecureMessage);
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }

    function displaySecureMessage(msg) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        const usernameElement = document.createElement('span');
        usernameElement.className = 'chat-username';
        usernameElement.textContent = `${msg.username}: `;
        const textElement = document.createElement('span');
        textElement.textContent = msg.message;
        messageElement.append(usernameElement, textElement);
        chatMessagesArea.appendChild(messageElement);
    }

    async function postMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        chatSendBtn.disabled = true;
        const result = await apiRequest('/api/chat/send', 'POST', { message });
        chatSendBtn.disabled = false;
        if (result) {
            chatInput.value = '';
            displaySecureMessage(result);
            chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
        }
    }

    function openChat() {
        chatModal.style.display = 'flex';
        fetchMessages();
        if (chatUpdateInterval) clearInterval(chatUpdateInterval);
        chatUpdateInterval = setInterval(fetchMessages, 5000);
    }

    function closeChat() {
        chatModal.style.display = 'none';
        if (chatUpdateInterval) clearInterval(chatUpdateInterval);
    }

    const initializeGame = async () => {
        const data = await apiRequest('/api/game/state');
        if (data && data.gameState) {
            gameState = data.gameState;
            currentRoomIndex = data.currentRoomIndex || 0;
            if (typeof gameState.energy === 'undefined') {
                gameState.energy = 100;
                gameState.lastEnergyUpdate = Date.now();
            }
            if (!gameState.placedRacksPerRoom || gameState.placedRacksPerRoom.length === 0) {
                gameState.placedRacksPerRoom = [Array(NUM_RACK_PLACEMENT_SLOTS).fill(null)];
            }
            document.getElementById('auth-container').style.display = 'none';
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

    function playSound(soundId) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.error("Error playing sound:", e));
        }
    }

    function createGpuSprite(miner) {
        const gpu = document.createElement('div');
        gpu.className = 'miner-gpu';
        let fanCount = 2, fanSize = 36;
        if (miner.id === 'miner001') fanCount = 1;
        if (miner.id === 'miner003' || miner.id === 'miner004') { fanCount = 3; fanSize = 30; }
        let fansHtml = Array(fanCount).fill(`<div class="gpu-fan" style="width:${fanSize}px;height:${fanSize}px;"><div class="gpu-fan-blades" style="--fan-color:${miner.color};"></div><div class="gpu-fan-hub"></div></div>`).join('');
        const ledsHtml = ['0s', '0.2s', '0.4s', '0.6s', '0.8s'].map(delay => `<div class="gpu-led blinking" style="--led-color:${miner.color};animation-delay:${delay};"></div>`).join('');
        gpu.innerHTML = `<div class="gpu-shroud"><div class="gpu-top-leds">${ledsHtml}</div><div class="gpu-fans-container">${fansHtml}</div></div>`;
        return gpu;
    }

    function createRackSprite(rack) {
        const rackSprite = document.createElement('div');
        rackSprite.className = 'rack-2-5d';
        rackSprite.style.height = `${rack.slots * 60 + 80}px`;
        const slotsHtml = Array(rack.slots).fill('<div class="slot empty"></div>').join('');
        rackSprite.innerHTML = `<div class="rack-top"></div><div class="rack-side"></div><div class="rack-front" style="border-color:${rack.color};"><div class="rack-label">${rack.name}</div><div class="slots-container" style="display:flex;flex-direction:column;gap:10px;height:100%;">${slotsHtml}</div><div class="rack-leg front-left"></div><div class="rack-leg front-right"></div></div>`;
        return rackSprite;
    }

    function updateUI() {
        if (!gameState) return;
        updateBalance();
        updateTotalPower();
        renderRoomControls();
        renderRackPlacementArea();
        updateAddRoomButtonState();
        updateEnergyUI();
    }

    function updateBalance() { balanceElement.textContent = gameState.balance.toFixed(2); }
    function updateTotalPower() {
        let totalPower = 0;
        if (gameState.energy > 0) {
            gameState.placedRacksPerRoom.forEach(room => {
                if (room) room.forEach(rackSlot => {
                    if (rackSlot && rackSlot.placedMiners) {
                        rackSlot.placedMiners.forEach(miner => {
                            if (miner) totalPower += MINERS.find(m => m.id === miner.id)?.power || 0;
                        });
                    }
                });
            });
        }
        gameState.totalPower = totalPower;
        totalPowerElement.textContent = `${totalPower} TH/s`;
        updateLcoPerHour();
    }

    function updateLcoPerHour() {
        if (!gameState) return;
        lcoPerHourElement.textContent = ((gameState.totalPower * LCO_PER_THS_PER_MINUTE) * 60).toFixed(2);
    }

    function displayTerminalMessage(message, color = 'lime') {
        terminalTextElement.innerHTML = `> ${message}`;
        terminalTextElement.style.color = color;
    }

    function renderRoomControls() {
        roomControls.innerHTML = '';
        gameState.placedRacksPerRoom.forEach((_, index) => {
            const roomBtn = document.createElement('button');
            roomBtn.textContent = (index + 1).toString();
            roomBtn.className = `room-btn ${index === currentRoomIndex ? 'active' : ''}`;
            roomBtn.addEventListener('click', () => switchRoom(index));
            roomControls.appendChild(roomBtn);
        });
        const addRoomButton = document.createElement('button');
        addRoomButton.id = 'add-room';
        addRoomButton.addEventListener('click', buyRoom);
        roomControls.appendChild(addRoomButton);
        updateAddRoomButtonState();
    }

    function switchRoom(index) {
        if (index === currentRoomIndex) return;
        currentRoomIndex = index;
        renderRackPlacementArea();
        renderRoomControls();
    }

    async function buyRoom() {
        if (gameState.placedRacksPerRoom.length >= MAX_ROOMS) return displayTerminalMessage("Número máximo de salas atingido.", "red");
        const roomCost = gameState.placedRacksPerRoom.length * 50;
        if (gameState.balance < roomCost) return displayTerminalMessage(`LCO insuficiente! Necessário ${roomCost} LCO.`, "red");
        const data = await apiRequest('/api/game/buy-room', 'POST', { cost: roomCost });
        if (data && data.gameState) {
            gameState = data.gameState;
            currentRoomIndex = gameState.placedRacksPerRoom.length - 1;
            displayTerminalMessage(`Sala ${currentRoomIndex + 1} comprada!`, "lime");
            updateUI();
            saveGame();
        }
    }

    function updateAddRoomButtonState() {
        const addRoomButton = document.getElementById('add-room');
        if (!addRoomButton) return;
        if (gameState.placedRacksPerRoom.length >= MAX_ROOMS) {
            addRoomButton.style.display = 'none';
        } else {
            addRoomButton.style.display = 'inline-block';
            addRoomButton.textContent = `+ Sala (${gameState.placedRacksPerRoom.length * 50} LCO)`;
        }
    }

    function renderRackPlacementArea() {
        rackPlacementArea.innerHTML = '';
        const currentRoomData = gameState.placedRacksPerRoom[currentRoomIndex];
        for (let i = 0; i < NUM_RACK_PLACEMENT_SLOTS; i++) {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'rack-placement-slot';
            slotDiv.dataset.slotIndex = i;
            const rackData = currentRoomData[i];
            if (rackData) {
                slotDiv.classList.add('occupied');
                const rackConfig = RACKS.find(r => r.id === rackData.id);
                const rackElement = createRackSprite(rackConfig);
                if (rackData.isNew) {
                    rackElement.classList.add('item-placed');
                    delete rackData.isNew;
                }
                const slotsContainer = rackElement.querySelector('.slots-container');
                slotsContainer.innerHTML = '';
                for (let j = 0; j < rackConfig.slots; j++) {
                    const minerSlotDiv = document.createElement('div');
                    minerSlotDiv.className = 'slot';
                    minerSlotDiv.dataset.rackSlotIndex = i;
                    minerSlotDiv.dataset.minerSlotIndex = j;
                    const miner = rackData.placedMiners[j];
                    if (miner) {
                        minerSlotDiv.classList.add('occupied');
                        const gpuSprite = createGpuSprite(MINERS.find(m => m.id === miner.id));
                        if (miner.isNew) {
                            gpuSprite.classList.add('item-placed');
                            delete miner.isNew;
                        }
                        minerSlotDiv.appendChild(gpuSprite);
                    } else {
                        minerSlotDiv.classList.add('empty');
                    }
                    minerSlotDiv.addEventListener('click', handleWorldClick);
                    slotsContainer.appendChild(minerSlotDiv);
                }
                rackElement.querySelector('.rack-label').dataset.rackSlotIndex = i;
                rackElement.querySelector('.rack-label').addEventListener('click', handleWorldClick);
                slotDiv.appendChild(rackElement);
            } else {
                slotDiv.classList.add('available');
                slotDiv.addEventListener('click', handleWorldClick);
            }
            rackPlacementArea.appendChild(slotDiv);
        }
    }

    async function buyItem(itemId, category) {
        if (isTransactionInProgress) return displayTerminalMessage("Aguarde a transação anterior...", "orange");
        isTransactionInProgress = true;
        try {
            displayTerminalMessage('Processando compra...', 'yellow');
            const itemData = (category === 'miners' ? MINERS : RACKS).find(i => i.id === itemId);
            if (gameState.balance < itemData.price) return displayTerminalMessage('Saldo insuficiente!', 'red');
            const data = await apiRequest('/api/game/buy-item', 'POST', { itemId, category, price: itemData.price });
            if (data && data.gameState) {
                gameState = data.gameState;
                displayTerminalMessage(data.message, 'lime');
                updateUI();
                renderShop(category);
                renderInventory(category);
                saveGame();
            }
        } finally {
            isTransactionInProgress = false;
        }
    }

    function sellItem(event) {
        const button = event.currentTarget;
        const itemId = button.dataset.id;
        const category = button.dataset.category;
        const itemConfig = (category === 'miners' ? MINERS : RACKS).find(i => i.id === itemId);
        if (!itemConfig) return;
        const sellPrice = itemConfig.price / 2;
        const inventoryCategory = category === 'miners' ? 'miners' : 'racks';
        let invItem = gameState.inventory[inventoryCategory].find(i => i.id === itemId);
        if (invItem && invItem.quantity > 0) {
            invItem.quantity--;
            gameState.balance += sellPrice;
            if (invItem.quantity <= 0) {
                gameState.inventory[inventoryCategory] = gameState.inventory[inventoryCategory].filter(i => i.id !== itemId);
            }
            playSound('sell-sound');
            displayTerminalMessage(`${itemConfig.name} vendido por ◎${sellPrice.toFixed(2)}!`, 'lime');
            updateUI();
            renderInventory(category);
            saveGame();
        }
    }

    function renderShop(category) {
        minersShopContent.style.display = 'none';
        racksShopContent.style.display = 'none';
        const contentArea = category === 'miners' ? minersShopContent : racksShopContent;
        const itemsToRender = category === 'miners' ? MINERS : RACKS;
        contentArea.style.display = 'grid';
        contentArea.innerHTML = '';
        itemsToRender.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `<div class="item-icon">${category === 'miners' ? createGpuSprite(item).outerHTML : createRackSprite(item).outerHTML}</div><div class="item-name">${item.name}</div><div class="item-stats">${item.power ? `Poder: ${item.power} TH/s` : `Slots: ${item.slots}`}</div><div class="item-price">◎ ${item.price.toFixed(2)}</div><button class="buy-btn" data-id="${item.id}" data-category="${category}" ${gameState.balance < item.price ? 'disabled' : ''}>Comprar</button>`;
            contentArea.appendChild(itemDiv);
        });
        contentArea.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', (e) => buyItem(e.currentTarget.dataset.id, e.currentTarget.dataset.category)));
    }

    function renderInventory(category) {
        minersInventoryContent.style.display = 'none';
        racksInventoryContent.style.display = 'none';
        const contentArea = category === 'miners' ? minersInventoryContent : racksInventoryContent;
        const inventorySource = category === 'miners' ? gameState.inventory.miners : gameState.inventory.racks;
        contentArea.style.display = 'grid';
        contentArea.innerHTML = '';
        if (!inventorySource || inventorySource.length === 0) {
            contentArea.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; margin-top: 20px;">Inventário Vazio</p>';
            return;
        }
        inventorySource.forEach(invItem => {
            const itemConfig = (category === 'miners' ? MINERS : RACKS).find(i => i.id === invItem.id);
            if (!itemConfig) return;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.innerHTML = `<div class="item-icon">${category === 'miners' ? createGpuSprite(itemConfig).outerHTML : createRackSprite(itemConfig).outerHTML}</div><div class="item-name">${itemConfig.name} (x${invItem.quantity})</div><div class="item-sell-price">Venda: ◎ ${(itemConfig.price / 2).toFixed(2)}</div><div class="item-actions"><button class="use-item-btn" data-id="${itemConfig.id}" data-category="${category}" ${invItem.quantity === 0 ? 'disabled' : ''}>Usar</button><button class="sell-item-btn" data-id="${itemConfig.id}" data-category="${category}" ${invItem.quantity === 0 ? 'disabled' : ''}>Vender</button></div>`;
            contentArea.appendChild(itemDiv);
        });
        contentArea.querySelectorAll('.use-item-btn').forEach(btn => btn.addEventListener('click', startPlacement));
        contentArea.querySelectorAll('.sell-item-btn').forEach(btn => btn.addEventListener('click', sellItem));
    }

    function openShop() { shopModal.style.display = 'flex'; renderShop('miners'); cancelPlacement(); }
    function closeShop() { shopModal.style.display = 'none'; }
    function openInventory() { inventoryModal.style.display = 'flex'; renderInventory('miners'); cancelPlacement(); }
    function closeInventory() { inventoryModal.style.display = 'none'; }

    function startPlacement(event) {
        const button = event.currentTarget;
        const itemId = button.dataset.id;
        const category = button.dataset.category;
        const itemConfig = (category === 'miners' ? MINERS : RACKS).find(i => i.id === itemId);
        placingItem = { item: itemConfig, type: category === 'miners' ? 'miner' : 'rack' };
        miningRoom.classList.add('placing-item');
        displayTerminalMessage(`Modo de Colocação: Selecione um local para ${itemConfig.name}.`, 'yellow');
        closeInventory();
    }

    function cancelPlacement() {
        if (placingItem) {
            placingItem = null;
            miningRoom.classList.remove('placing-item');
            displayTerminalMessage('Modo de Colocação cancelado.', 'orange');
        }
    }

    function handlePlacement(target) {
        const placeItem = (type, slotIndex, minerSlotIndex = null) => {
            const inventoryCategory = type === 'rack' ? 'racks' : 'miners';
            const invItem = gameState.inventory[inventoryCategory].find(i => i.id === placingItem.item.id);
            invItem.quantity--;
            if (type === 'rack') {
                gameState.placedRacksPerRoom[currentRoomIndex][slotIndex] = { id: placingItem.item.id, placedMiners: Array(placingItem.item.slots).fill(null), isNew: true };
            } else {
                gameState.placedRacksPerRoom[currentRoomIndex][slotIndex].placedMiners[minerSlotIndex] = { id: placingItem.item.id, isNew: true };
            }
            displayTerminalMessage(`${type === 'rack' ? 'Rack' : 'GPU'} ${placingItem.item.name} colocado!`, 'lime');
            cancelPlacement();
            updateUI();
            saveGame();
        };

        if (placingItem.type === 'rack' && target.classList.contains('available')) {
            placeItem('rack', parseInt(target.dataset.slotIndex));
        } else if (placingItem.type === 'miner' && target.classList.contains('empty')) {
            placeItem('miner', parseInt(target.dataset.rackSlotIndex), parseInt(target.dataset.minerSlotIndex));
        } else {
            displayTerminalMessage(`Local inválido para ${placingItem.item.name}!`, 'red');
        }
    }

    function returnItemToInventory(itemId, category) {
        const inventoryCategory = category === 'miner' ? gameState.inventory.miners : gameState.inventory.racks;
        let invItem = inventoryCategory.find(i => i.id === itemId);
        if (invItem) invItem.quantity++;
        else inventoryCategory.push({ id: itemId, quantity: 1 });
    }

    async function handleWorldClick(event) {
        const target = event.currentTarget;
        if (placingItem) {
            handlePlacement(target);
            return;
        }

        const confirmAndRemove = (itemType, message, callback) => {
            if (window.confirm(message)) {
                target.closest('.item-placed, .rack-2-5d, .miner-gpu')?.classList.add('item-removed');
                setTimeout(() => {
                    callback();
                    displayTerminalMessage(`${itemType} guardado no inventário!`, 'lime');
                    updateUI();
                    saveGame();
                }, 300);
            }
        };

        if (target.classList.contains('slot') && target.classList.contains('occupied')) {
            const rackSlotIndex = parseInt(target.dataset.rackSlotIndex);
            const minerSlotIndex = parseInt(target.dataset.minerSlotIndex);
            const minerData = gameState.placedRacksPerRoom[currentRoomIndex][rackSlotIndex].placedMiners[minerSlotIndex];
            confirmAndRemove('GPU', 'Deseja guardar esta GPU no inventário?', () => {
                returnItemToInventory(minerData.id, 'miner');
                gameState.placedRacksPerRoom[currentRoomIndex][rackSlotIndex].placedMiners[minerSlotIndex] = null;
            });
        } else if (target.classList.contains('rack-label')) {
            const rackSlotIndex = parseInt(target.dataset.rackSlotIndex);
            const rackData = gameState.placedRacksPerRoom[currentRoomIndex][rackSlotIndex];
            if (rackData.placedMiners.some(m => m !== null)) return displayTerminalMessage("Esvazie o rack antes de guardá-lo.", "red");
            confirmAndRemove('Rack', 'Deseja guardar este Rack no inventário?', () => {
                returnItemToInventory(rackData.id, 'rack');
                gameState.placedRacksPerRoom[currentRoomIndex][rackSlotIndex] = null;
            });
        }
    }

    function updateEnergyUI() {
        const energyPercent = gameState.energy;
        energyBar.style.width = `${energyPercent}%`;
        energyText.innerHTML = `<span class="energy-icon">⚡</span> <span class="energy-label">Energia:</span> <span class="energy-value">${energyPercent.toFixed(0)}%</span>`;
        energyBtn.disabled = true;
        miningRoom.classList.remove('no-energy');
        energyBtn.classList.remove('rechargeable');

        if (energyPercent <= 0) {
            energyBar.style.backgroundColor = 'var(--energy-empty)';
            energyBtn.style.borderColor = 'var(--energy-empty)';
            energyText.innerHTML = `Recarregar (<span class="energy-value">1 LCO</span>)`;
            energyBtn.disabled = false;
            miningRoom.classList.add('no-energy');
            energyBtn.classList.add('rechargeable');
        } else if (energyPercent <= 20) {
            energyBar.style.backgroundColor = 'var(--energy-low)';
            energyBtn.style.borderColor = 'var(--energy-low)';
            energyText.innerHTML = `<span class="energy-label">Recarregar Grátis</span>`;
            energyBtn.disabled = false;
            energyBtn.classList.add('rechargeable');
        } else {
            energyBar.style.backgroundColor = 'var(--energy-full)';
            energyBtn.style.borderColor = 'var(--energy-full)';
        }
    }

    function handleEnergyRecharge() {
        if (gameState.energy <= 0) {
            if (gameState.balance < 1) return displayTerminalMessage("LCO insuficiente para recarregar!", "red");
            gameState.balance -= 1;
        }
        gameState.energy = 100;
        gameState.lastEnergyUpdate = Date.now();
        displayTerminalMessage("Energia restaurada!", "lime");
        updateUI();
    }

    function openGames() { gamesModal.style.display = 'flex'; }
    function closeGames() {
        gamesModal.style.display = 'none';
        if (matchmakingInterval) clearInterval(matchmakingInterval);
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
            damasMatchmakingStatus.textContent = (joinResponse && joinResponse.message) || 'Erro ao entrar na fila.';
            playDamasBtn.disabled = false;
        }
    }

    async function checkMatchmakingStatus() {
        const statusResponse = await apiRequest('/api/damas/matchmaking/status');
        if (statusResponse && statusResponse.matchFound) {
            clearInterval(matchmakingInterval);
            damasMatchmakingStatus.textContent = 'Partida encontrada! Redirecionando...';
            // CORREÇÃO 3: Roteamento para caminho absoluto
            window.location.href = `/damas3d/?gameId=${statusResponse.gameId}`;
        }
    }

    function startLoops() {
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        if (terminalLoopInterval) clearInterval(terminalLoopInterval);
        if (autoSaveInterval) clearInterval(autoSaveInterval);

        let lastUpdateTime = Date.now();
        gameLoopInterval = setInterval(() => {
            if (!gameState) return;
            const now = Date.now();
            const deltaTime = (now - lastUpdateTime) / 1000;
            lastUpdateTime = now;
            if (gameState.energy > 0) {
                if (gameState.totalPower > 0) gameState.energy -= ENERGY_CONSUMPTION_RATE * deltaTime;
                if (gameState.energy < 0) {
                    gameState.energy = 0;
                    updateTotalPower();
                }
                gameState.balance += (gameState.totalPower * (LCO_PER_THS_PER_MINUTE / 60)) * deltaTime;
            }
            updateBalance();
            updateEnergyUI();
        }, 1000);

        const terminalMessages = ["Conectando ao núcleo...", "Minerando blocos...", "Sincronizando...", "Verificando integridade...", "Aguardando transações..."];
        let terminalMessageIndex = 0;
        const updateTerminal = () => {
            if (!placingItem) {
                displayTerminalMessage(terminalMessages[terminalMessageIndex]);
                terminalMessageIndex = (terminalMessageIndex + 1) % terminalMessages.length;
            }
        };
        updateTerminal();
        terminalLoopInterval = setInterval(updateTerminal, 4000);
        autoSaveInterval = setInterval(() => { if (gameState) saveGame(); }, 30000);
    }
    
    // --- EVENT LISTENERS ---
    logoutBtn.addEventListener('click', () => handleLogout(false));
    openShopBtn.addEventListener('click', openShop);
    closeShopBtn.addEventListener('click', closeShop);
    openInventoryBtn.addEventListener('click', openInventory);
    closeInventoryBtn.addEventListener('click', closeInventory);
    energyBtn.addEventListener('click', handleEnergyRecharge);
    shopCategoryBtns.forEach(btn => btn.addEventListener('click', () => {
        shopCategoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderShop(btn.dataset.category);
    }));
    inventoryCategoryBtns.forEach(btn => btn.addEventListener('click', () => {
        inventoryCategoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderInventory(btn.dataset.category);
    }));
    openChatBtn.addEventListener('click', openChat);
    closeChatBtn.addEventListener('click', closeChat);
    chatSendBtn.addEventListener('click', postMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') postMessage(); });
    rankingHeader.addEventListener('click', handleRankingClick);
    openGamesBtn.addEventListener('click', openGames);
    closeGamesBtn.addEventListener('click', closeGames);
    playDamasBtn.addEventListener('click', joinDamasMatchmaking);
    // CORREÇÃO 2 & 3: Listener para o botão da fazenda com caminho absoluto
    goToFarmBtn.addEventListener('click', () => {
        window.location.href = '/fazenda/';
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cancelPlacement(); });
    window.addEventListener('beforeunload', () => { if (gameState) saveGame(); });

    // --- INITIALIZATION ---
    if (localStorage.getItem('token')) {
        initializeGame();
    } else {
        window.location.href = '/login.html';
    }
});

