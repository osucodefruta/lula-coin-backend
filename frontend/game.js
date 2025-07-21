// frontend/js/game.js

// Definindo a URL base da sua API do backend no Render
// ESTA URL É CRÍTICA! Substitua 'https://lula-coin-backend.onrender.com' pela URL REAL do seu backend no Render.
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';

// Variáveis de estado do jogo
let lulaCoins = 0;
let level = 1;
let minerValue = 1; // Hashrate base por clique
let totalHashrate = 0; // Hashrate total dos GPUs
let placedGpus = {}; // { "rack-1-slot-0": { id: "gpu1", name: "GPU Básica", hashrate: 10, img: "path/to/img.png" } }
let inventory = {
    gpus: [],
    upgrades: []
};
let isPlacingGpu = false;
let selectedGpuToPlace = null; // Guarda o item do inventário selecionado para colocar

// Referências a elementos do DOM
const usernameDisplay = document.getElementById('username-display');
const lulaCoinsDisplay = document.getElementById('lula-coins-display');
const hashrateDisplay = document.getElementById('hashrate-display');
const levelDisplay = document.getElementById('level-display');
const minerButton = document.getElementById('miner-button');
const upgradeMinerButton = document.getElementById('upgrade-miner-button');
const saqueButton = document.getElementById('saque-button');
const logoutButton = document.getElementById('logout-button');
const monitorText = document.getElementById('monitor-text');

// Modals e seus botões
const shopModal = document.getElementById('shop-modal');
const openShopBtn = document.getElementById('open-shop-btn');
const closeShopBtn = document.getElementById('close-shop-btn');
const shopItemsContainer = document.getElementById('shop-items-container');
const shopCategoryButtons = document.querySelectorAll('.shop-category-btn');

const inventoryModal = document.getElementById('inventory-modal');
const openInventoryBtn = document.getElementById('open-inventory-btn');
const closeInventoryBtn = document.getElementById('close-inventory-btn');
const inventoryItemsContainer = document.getElementById('inventory-items-container');
const inventoryCategoryButtons = document.querySelectorAll('.inventory-category-btn');

const minerSelectionBar = document.getElementById('miner-selection-bar');
const cancelSelectionBtn = document.getElementById('cancel-selection-btn');

// Racks e Slots
const rackSlots = document.querySelectorAll('.rack-slot');

// Overlay de Mensagem (Reutilizado do index.html para consistência)
const overlayMessage = document.getElementById('overlay-message');
const overlayMessageText = document.getElementById('overlay-message-text');
const overlayMessageOkButton = document.getElementById('overlay-message-ok-button');

// Função para exibir mensagens na UI usando o overlay
function showOverlayMessage(message, type = 'info', callback = null) {
    if (overlayMessage && overlayMessageText && overlayMessageOkButton) {
        overlayMessageText.textContent = message;
        overlayMessage.style.display = 'flex'; // Mostra o overlay

        // Define a cor de fundo do overlay com base no tipo de mensagem
        if (type === 'error') {
            overlayMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)'; // Vermelho para erro
        } else if (type === 'success') {
            overlayMessage.style.backgroundColor = 'rgba(0, 128, 0, 0.7)'; // Verde para sucesso
        } else {
            overlayMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; // Preto semi-transparente para info
        }

        overlayMessageOkButton.onclick = () => {
            overlayMessage.style.display = 'none';
            if (callback) {
                callback();
            }
        };
    } else {
        console.warn('Elementos do overlay de mensagem não encontrados. Mensagem: ' + message);
        alert(message); // Fallback para alert se os elementos não existirem
    }
}

// Funções para atualizar a UI
function updateLulaCoinsDisplay() {
    lulaCoinsDisplay.textContent = lulaCoins.toFixed(2); // Mostra 2 casas decimais
}

function updateHashrateDisplay() {
    hashrateDisplay.textContent = totalHashrate;
}

function updateLevelDisplay() {
    levelDisplay.textContent = level;
}

function updateMonitor(message) {
    const timestamp = new Date().toLocaleTimeString();
    monitorText.textContent += `\n[${timestamp}] ${message}`;
    monitorText.scrollTop = monitorText.scrollHeight; // Scroll to bottom
}

function updateUsernameDisplay() {
    const username = localStorage.getItem('username');
    if (usernameDisplay && username) {
        usernameDisplay.textContent = username;
    }
}

// Funções de interação com o Backend
async function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        showOverlayMessage('Sessão expirada. Faça login novamente.', 'error', () => {
            window.location.href = 'index.html'; // Redireciona para login
        });
        return null;
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function fetchGameState() {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/state`, { headers });
        const data = await res.json();

        if (res.ok) {
            lulaCoins = data.lulaCoins;
            level = data.level;
            minerValue = data.minerValue;
            totalHashrate = data.totalHashrate;
            placedGpus = data.placedGpus || {}; // Certifica que é um objeto
            inventory = data.inventory || { gpus: [], upgrades: [] }; // Garante estrutura de inventário
            
            updateLulaCoinsDisplay();
            updateHashrateDisplay();
            updateLevelDisplay();
            updateRackDisplay(); // Atualiza os racks com as GPUs colocadas
            updateMonitor('Estado do jogo carregado.');
        } else {
            showOverlayMessage(data.message || 'Falha ao carregar estado do jogo.', 'error');
            updateMonitor('Falha ao carregar estado do jogo.');
        }
    } catch (err) {
        console.error('Erro ao buscar estado do jogo:', err);
        showOverlayMessage('Erro de conexão com o servidor ao carregar jogo.', 'error');
        updateMonitor('Erro de conexão ao carregar jogo.');
    }
}

async function mineLulaCoins() {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/mine`, {
            method: 'POST',
            headers
        });
        const data = await res.json();

        if (res.ok) {
            lulaCoins = data.lulaCoins;
            level = data.level;
            updateLulaCoinsDisplay();
            updateLevelDisplay();
            updateMonitor(`Minerou ${data.minedAmount.toFixed(2)} Lula Coins.`);
        } else {
            showOverlayMessage(data.message || 'Erro ao minerar.', 'error');
            updateMonitor('Erro ao minerar.');
        }
    } catch (err) {
        console.error('Erro na mineração:', err);
        showOverlayMessage('Erro de conexão com o servidor ao minerar.', 'error');
        updateMonitor('Erro de conexão ao minerar.');
    }
}

async function upgradeMiner() {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/upgrade-miner`, {
            method: 'POST',
            headers
        });
        const data = await res.json();

        if (res.ok) {
            lulaCoins = data.lulaCoins;
            minerValue = data.minerValue;
            totalHashrate = data.totalHashrate; // Atualiza hashrate total, pois upgrades podem afetar
            level = data.level; // O nível também pode mudar com upgrades
            updateLulaCoinsDisplay();
            updateHashrateDisplay();
            updateLevelDisplay();
            showOverlayMessage(data.message || 'Minerador atualizado!', 'success');
            updateMonitor('Minerador de clique atualizado.');
        } else {
            showOverlayMessage(data.message || 'Não foi possível fazer upgrade.', 'error');
            updateMonitor('Falha no upgrade.');
        }
    } catch (err) {
        console.error('Erro no upgrade:', err);
        showOverlayMessage('Erro de conexão com o servidor ao fazer upgrade.', 'error');
        updateMonitor('Erro de conexão ao fazer upgrade.');
    }
}

async function saqueLulaCoins() {
    const headers = await getAuthHeaders();
    if (!headers) return;

    // Você precisaria de um input para o valor a sacar e um destino de carteira
    // Por enquanto, vou simular um saque de todo o saldo
    const amountToWithdraw = lulaCoins; // Exemplo: sacar tudo
    if (amountToWithdraw <= 0) {
        showOverlayMessage('Você não tem Lula Coins para sacar.', 'info');
        updateMonitor('Tentativa de saque sem moedas.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/withdraw`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount: amountToWithdraw })
        });
        const data = await res.json();

        if (res.ok) {
            lulaCoins = data.lulaCoins; // Saldo após o saque
            updateLulaCoinsDisplay();
            showOverlayMessage(data.message || `Sacou ${amountToWithdraw.toFixed(2)} Lula Coins!`, 'success');
            updateMonitor(`Sacou ${amountToWithdraw.toFixed(2)} Lula Coins.`);
        } else {
            showOverlayMessage(data.message || 'Falha ao sacar Lula Coins.', 'error');
            updateMonitor('Falha ao sacar.');
        }
    } catch (err) {
        console.error('Erro ao sacar:', err);
        showOverlayMessage('Erro de conexão com o servidor ao sacar.', 'error');
        updateMonitor('Erro de conexão ao sacar.');
    }
}

async function buyItem(itemId, itemType) {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/buy-item`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ itemId, itemType })
        });
        const data = await res.json();

        if (res.ok) {
            lulaCoins = data.lulaCoins;
            inventory = data.inventory;
            updateLulaCoinsDisplay();
            renderShopItems('gpus'); // Renderiza a loja novamente para mostrar itens comprados
            showOverlayMessage(data.message || 'Item comprado com sucesso!', 'success');
            updateMonitor(`Comprou: ${data.itemName || itemId}.`);
        } else {
            showOverlayMessage(data.message || 'Não foi possível comprar o item.', 'error');
            updateMonitor('Falha na compra.');
        }
    } catch (err) {
        console.error('Erro ao comprar item:', err);
        showOverlayMessage('Erro de conexão com o servidor ao comprar.', 'error');
        updateMonitor('Erro de conexão ao comprar.');
    }
}

async function placeGpu(slotId) {
    const headers = await getAuthHeaders();
    if (!headers) return;

    if (!selectedGpuToPlace) {
        showOverlayMessage('Nenhuma GPU selecionada para colocar.', 'info');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/place-gpu`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                gpuId: selectedGpuToPlace.id,
                slotId: slotId
            })
        });
        const data = await res.json();

        if (res.ok) {
            placedGpus = data.placedGpus; // Recebe o estado atualizado das GPUs colocadas
            inventory = data.inventory; // Inventário atualizado (GPU removida)
            totalHashrate = data.totalHashrate; // Hashrate total atualizado
            updateHashrateDisplay();
            updateRackDisplay();
            renderInventoryItems('gpus'); // Atualiza inventário
            showOverlayMessage(data.message || `${selectedGpuToPlace.name} colocada no ${slotId}!`, 'success');
            updateMonitor(`${selectedGpuToPlace.name} colocada no ${slotId}.`);
            
            // Finaliza o modo de colocação
            isPlacingGpu = false;
            selectedGpuToPlace = null;
            minerSelectionBar.style.display = 'none';
            // Remover a classe 'placing-mode' do body ou elemento pai se tiver sido adicionada
        } else {
            showOverlayMessage(data.message || 'Não foi possível colocar a GPU.', 'error');
            updateMonitor('Falha ao colocar GPU.');
        }
    } catch (err) {
        console.error('Erro ao colocar GPU:', err);
        showOverlayMessage('Erro de conexão com o servidor ao colocar GPU.', 'error');
        updateMonitor('Erro de conexão ao colocar GPU.');
    }
}

async function sellItem(itemId, itemType) {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/game/sell-item`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ itemId, itemType })
        });
        const data = await res.json();

        if (res.ok) {
            lulaCoins = data.lulaCoins;
            inventory = data.inventory;
            totalHashrate = data.totalHashrate; // Se vender GPU, hashrate muda
            updateLulaCoinsDisplay();
            updateHashrateDisplay();
            renderInventoryItems(itemType); // Atualiza inventário
            updateRackDisplay(); // Pode precisar atualizar racks se a GPU vendida estava colocada
            showOverlayMessage(data.message || 'Item vendido com sucesso!', 'success');
            updateMonitor(`Vendeu: ${data.itemName || itemId}.`);
        } else {
            showOverlayMessage(data.message || 'Não foi possível vender o item.', 'error');
            updateMonitor('Falha na venda.');
        }
    } catch (err) {
        console.error('Erro ao vender item:', err);
        showOverlayMessage('Erro de conexão com o servidor ao vender.', 'error');
        updateMonitor('Erro de conexão ao vender.');
    }
}


// Funções de Renderização
function renderShopItems(category) {
    shopItemsContainer.innerHTML = ''; // Limpa o container
    // Mock de itens da loja (no jogo real, viria do backend)
    const shopItems = {
        gpus: [
            { id: "basic_gpu", name: "GPU Básica", hashrate: 10, cost: 100, img: "https://via.placeholder.com/80x80/FF0000/FFFFFF?text=GPU1" },
            { id: "mid_gpu", name: "GPU Intermediária", hashrate: 50, cost: 450, img: "https://via.placeholder.com/80x80/00FF00/000000?text=GPU2" },
            { id: "pro_gpu", name: "GPU Profissional", hashrate: 200, cost: 1500, img: "https://via.placeholder.com/80x80/0000FF/FFFFFF?text=GPU3" }
        ],
        upgrades: [
            { id: "power_supply_1", name: "Fonte de Energia I", effect: "+10% Hashrate", cost: 300, img: "https://via.placeholder.com/80x80/FFFF00/000000?text=PSU1" },
            { id: "cooling_fan_1", name: "Ventoinha Resfriamento I", effect: "Reduz calor", cost: 150, img: "https://via.placeholder.com/80x80/FF00FF/FFFFFF?text=FAN1" }
        ]
    };

    const itemsToRender = shopItems[category] || [];

    if (itemsToRender.length === 0) {
        shopItemsContainer.innerHTML = '<p>Nenhum item nesta categoria.</p>';
        return;
    }

    itemsToRender.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('shop-item');
        itemDiv.innerHTML = `
            <img src="${item.img}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p>Hashrate: ${item.hashrate || 'N/A'}</p>
            <p>Custo: ${item.cost} LC</p>
            <button class="buy-btn" data-item-id="${item.id}" data-item-type="${category}">Comprar</button>
        `;
        shopItemsContainer.appendChild(itemDiv);
    });

    // Adiciona event listeners aos botões de compra
    shopItemsContainer.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const itemId = button.dataset.itemId;
            const itemType = button.dataset.itemType;
            buyItem(itemId, itemType);
        });
    });
}

function renderInventoryItems(category) {
    inventoryItemsContainer.innerHTML = ''; // Limpa o container

    const itemsToRender = inventory[category] || [];

    if (itemsToRender.length === 0) {
        inventoryItemsContainer.innerHTML = '<p>Seu inventário está vazio nesta categoria.</p>';
        return;
    }

    itemsToRender.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('inventory-item');
        itemDiv.innerHTML = `
            <img src="${item.img || 'https://via.placeholder.com/80x80/CCCCCC/000000?text=Item'}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p>Hashrate: ${item.hashrate || 'N/A'}</p>
            <p>Quantidade: ${item.quantity || 1}</p>
            ${category === 'gpus' ? `<button class="place-btn" data-item-id="${item.id}" data-item-name="${item.name}" data-item-hashrate="${item.hashrate}" data-item-img="${item.img}">Colocar</button>` : ''}
            <button class="sell-btn" data-item-id="${item.id}" data-item-type="${category}">Vender</button>
        `;
        inventoryItemsContainer.appendChild(itemDiv);
    });

    // Adiciona event listeners aos botões "Colocar" e "Vender"
    inventoryItemsContainer.querySelectorAll('.place-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedGpuToPlace = {
                id: button.dataset.itemId,
                name: button.dataset.itemName,
                hashrate: parseInt(button.dataset.itemHashrate),
                img: button.dataset.itemImg
            };
            isPlacingGpu = true;
            inventoryModal.style.display = 'none'; // Fecha o inventário
            minerSelectionBar.style.display = 'flex'; // Mostra a barra de seleção
            showOverlayMessage(`Selecione um slot vazio para colocar a ${selectedGpuToPlace.name}.`, 'info');
        });
    });

    inventoryItemsContainer.querySelectorAll('.sell-btn').forEach(button => {
        button.addEventListener('click', () => {
            const itemId = button.dataset.itemId;
            const itemType = button.dataset.itemType;
            sellItem(itemId, itemType);
        });
    });
}

function updateRackDisplay() {
    rackSlots.forEach(slot => {
        const slotId = slot.dataset.slotId;
        slot.innerHTML = ''; // Limpa o slot
        slot.classList.remove('occupied'); // Remove a classe de ocupado

        if (placedGpus[slotId]) {
            const gpu = placedGpus[slotId];
            const img = document.createElement('img');
            img.src = gpu.img || 'https://via.placeholder.com/80x80/999999/000000?text=GPU';
            img.alt = gpu.name;
            img.classList.add('placed-gpu');
            slot.appendChild(img);
            slot.classList.add('occupied'); // Marca como ocupado
        }
    });
}

function addEventListenersToRackSlots() {
    rackSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            if (isPlacingGpu && !slot.classList.contains('occupied')) {
                placeGpu(slot.dataset.slotId);
            } else if (isPlacingGpu && slot.classList.contains('occupied')) {
                showOverlayMessage('Este slot já está ocupado. Escolha outro.', 'info');
            }
        });
    });
}

// Funções de Abertura/Fechamento de Modais
function openShop() {
    shopModal.style.display = 'flex';
    renderShopItems('gpus'); // Renderiza GPs por padrão
    shopCategoryButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.shop-category-btn[data-category="gpus"]').classList.add('active');
}

function closeShop() {
    shopModal.style.display = 'none';
}

function openInventory() {
    inventoryModal.style.display = 'flex';
    renderInventoryItems('gpus'); // Renderiza GPs por padrão
    inventoryCategoryButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.inventory-category-btn[data-category="gpus"]').classList.add('active');
}

function closeInventory() {
    inventoryModal.style.display = 'none';
}

function handleShopCategoryClick(event) {
    shopCategoryButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderShopItems(event.target.dataset.category);
}

function handleInventoryCategoryClick(event) {
    inventoryCategoryButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderInventoryItems(event.target.dataset.category);
}

// Função de Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showOverlayMessage('Sessão encerrada. Redirecionando para a página de login.', 'info', () => {
        window.location.href = 'index.html';
    });
}


// Event Listeners Globais
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está logado (já tratado no jogo.html, mas como fallback)
    const token = localStorage.getItem('token');
    if (!token) {
        showOverlayMessage('Sessão expirada. Faça login novamente.', 'error', () => {
            window.location.href = 'index.html';
        });
        return; // Para o script se não houver token
    }

    updateUsernameDisplay(); // Exibe o nome de usuário logado
    fetchGameState(); // Carrega o estado inicial do jogo

    // Botões Principais
    if (minerButton) minerButton.addEventListener('click', mineLulaCoins);
    if (upgradeMinerButton) upgradeMinerButton.addEventListener('click', upgradeMiner);
    if (saqueButton) saqueButton.addEventListener('click', saqueLulaCoins);
    if (logoutButton) logoutButton.addEventListener('click', logout);

    // Modais
    if (openShopBtn) openShopBtn.addEventListener('click', openShop);
    if (closeShopBtn) closeShopBtn.addEventListener('click', closeShop);
    if (openInventoryBtn) openInventoryBtn.addEventListener('click', openInventory);
    if (closeInventoryBtn) closeInventoryBtn.addEventListener('click', closeInventory);

    // Seleção de categorias na loja e inventário
    shopCategoryButtons.forEach(button => {
        button.addEventListener('click', handleShopCategoryClick);
    });
    inventoryCategoryButtons.forEach(button => {
        button.addEventListener('click', handleInventoryCategoryClick);
    });

    // Barra de seleção de mineradores
    if (cancelSelectionBtn) {
        cancelSelectionBtn.addEventListener('click', () => {
            isPlacingGpu = false;
            selectedGpuToPlace = null;
            minerSelectionBar.style.display = 'none';
            showOverlayMessage('Colocação de GPU cancelada.', 'info');
        });
    }

    addEventListenersToRackSlots(); // Adiciona listeners para os slots do rack
});

// Loop de mineração passiva (exemplo: a cada 5 segundos)
setInterval(async () => {
    // Isso é para mineração passiva baseada no hashrate total
    // O backend já deve lidar com isso e salvar o estado
    // Aqui no frontend, podemos apenas atualizar as moedas se o backend enviar updates
    // Ou, mais robustamente, pedir o estado do jogo periodicamente.
    // Para simplificar, o fetchGameState() já pode ser o suficiente em um intervalo.
    await fetchGameState(); // Busca o estado mais recente a cada X segundos
}, 5000); // A cada 5 segundos
