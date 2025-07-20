// frontend/game.js

// Definindo a URL base da sua API do backend no Render
// ESTA URL É CRÍTICA! Substitua 'https://lula-coin-backend.onrender.com' pela URL REAL do seu backend no Render.
const API_BASE_URL = 'https://lula-coin-backend.onrender.com';

// --- Funções de utilidade para Cookies (Adicionadas para resolver o ReferenceError) ---
// Embora seja preferível usar localStorage para tokens JWT,
// estas funções são incluídas caso o código as utilize em outros contextos.
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}
// --- Fim das Funções de utilidade para Cookies ---


// Variáveis de estado do jogo (carregadas do localStorage e do backend)
let userToken = localStorage.getItem('token'); // Pegar o token do localStorage após o login
let currentUsername = localStorage.getItem('username'); // Pegar o username do localStorage
let lulaCoins = 0;
let level = 1; // Pode vir do backend ou ser calculado no frontend
let minerValue = 1; // Valor base do clique, pode vir do backend
let totalHashrate = 0; // Hashrate total do jogador (minerValue + GPUs)
let placedGpus = {}; // Para armazenar GPUs colocadas nos racks { 'rack-1-slot-0': { type: 'RTX 3090', hashrate: 100 } }
let inventory = {}; // Inventário do jogador { 'RTX 3090': 2, 'GTX 1080': 1 }

// Referências aos elementos da UI do jogo (verifique se os IDs correspondem ao seu HTML)
const lulaCoinsDisplay = document.getElementById('lula-coins-display');
const levelDisplay = document.getElementById('level-display'); // Certifique-se que existe no HTML
const hashrateDisplay = document.getElementById('hashrate-display'); // Certifique-se que existe no HTML
const minerButton = document.getElementById('miner-button');
const upgradeMinerButton = document.getElementById('upgrade-miner-button');
const saqueButton = document.getElementById('saque-button');
const logoutButton = document.getElementById('logout-button');
const monitorText = document.getElementById('monitor-text');
const usernameDisplay = document.getElementById('username-display'); // Adicionado para exibir o username

// Referências aos elementos do overlay de mensagem (para exibir mensagens ao usuário)
const overlayMessage = document.getElementById('overlay-message');
const overlayMessageText = document.getElementById('overlay-message-text');
const overlayMessageOkButton = document.getElementById('overlay-message-ok-button');

// Referências aos elementos do shop e inventory
const shopModal = document.getElementById('shop-modal');
const closeShopBtn = document.getElementById('close-shop-btn');
const openShopBtn = document.getElementById('open-shop-btn');
const shopItemsContainer = document.getElementById('shop-items-container');
const shopCategoryBtns = document.querySelectorAll('.shop-category-btn');

const inventoryModal = document.getElementById('inventory-modal');
const closeInventoryBtn = document.getElementById('close-inventory-btn');
const openInventoryBtn = document.getElementById('open-inventory-btn');
const inventoryItemsContainer = document.getElementById('inventory-items-container');
const inventoryCategoryBtns = document.querySelectorAll('.inventory-category-btn');

const minerSelectionBar = document.getElementById('miner-selection-bar'); // Certifique-se que existe
const cancelSelectionBtn = document.getElementById('cancel-selection-btn'); // Certifique-se que existe
// const minerOptions = document.querySelectorAll('.miner-option'); // Removido, pois não vi uso direto aqui

const miningRoom = document.getElementById('mining-room'); // Div principal do layout do galpão

let placingItem = null; // Guarda o tipo de item (ex: 'RTX 3090') que está sendo arrastado para colocação
let selectedItemForPlacement = null; // Guarda a referência do item no inventário/loja que foi selecionado

// --- Definição dos Itens da Loja ---
// Ajuste os preços, hashrates e descrições conforme o seu jogo
const shopItems = {
    gpus: [
        { id: 'gpu-basic', name: 'GPU Básica', type: 'Basic GPU', price: 100, hashrate: 5, imageUrl: 'assets/gpu/basic.png' },
        { id: 'gpu-rtx3060', name: 'RTX 3060', type: 'RTX 3060', price: 500, hashrate: 20, imageUrl: 'assets/gpu/rtx3060.png' },
        { id: 'gpu-rtx3090', name: 'RTX 3090', type: 'RTX 3090', price: 2000, hashrate: 100, imageUrl: 'assets/gpu/rtx3090.png' }
    ],
    upgrades: [
        // Adicione outros tipos de upgrades aqui se tiver (ex: cooler, fonte)
        { id: 'upgrade-power', name: 'Upgrade de Poder', type: 'Mining Power', price: 1000, effect: '+50 hashrate', imageUrl: 'assets/upgrade/power_upgrade.png' }
    ]
};


// --- Funções Auxiliares de UI ---

// Função para exibir mensagens na UI
function showOverlayMessage(message, type = 'info') {
    if (overlayMessage && overlayMessageText && overlayMessageOkButton) {
        overlayMessageText.textContent = message;
        overlayMessage.style.display = 'flex'; // Mostra o overlay

        // Define a cor de fundo com base no tipo de mensagem
        if (type === 'error') {
            overlayMessage.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        } else if (type === 'success') {
            overlayMessage.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
        } else {
            overlayMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Padrão
        }

        overlayMessageOkButton.onclick = () => {
            overlayMessage.style.display = 'none';
        };
    } else {
        console.warn('Elementos do overlay de mensagem não encontrados. Mensagem: ' + message);
        alert(message); // Fallback para alert se os elementos não existirem
    }
}

// Função para formatar números com separadores de milhar
function formatNumber(num) {
    if (typeof num !== 'number') return num; // Garante que é um número
    return new Intl.NumberFormat('pt-BR').format(num);
}

// Função para atualizar a UI do jogo com dados do usuário
function updateGameUI(userData) {
    if (!userData) {
        console.error("[FRONTEND] Dados do usuário são nulos ao tentar atualizar a UI.");
        return;
    }

    // Carregar dados do usuário, garantindo valores padrão
    lulaCoins = userData.lulaCoins || 0;
    minerValue = userData.miningPower || 1; // Assumindo que 'miningPower' é o 'minerValue' base
    // userData.upgrades deve ser um objeto, com inventory e placedGpus dentro
    placedGpus = (userData.upgrades && userData.upgrades.placedGpus) ? userData.upgrades.placedGpus : {};
    inventory = (userData.upgrades && userData.upgrades.inventory) ? userData.upgrades.inventory : {};

    lulaCoinsDisplay.textContent = formatNumber(lulaCoins);
    usernameDisplay.textContent = currentUsername; // Exibir o nome de usuário atual

    calculateTotalHashrate(); // Recalcula hashrate com base nas GPUs colocadas
    hashrateDisplay.textContent = formatNumber(totalHashrate);
    levelDisplay.textContent = level; // Se o level for calculado no frontend ou tiver um campo no User model

    updateRackDisplay(); // Atualiza a visualização dos racks com as GPUs
    renderInventoryItems('gpus'); // Renderiza o inventário com os itens do usuário
}

// Função para atualizar o texto do monitor (terminal no jogo)
function updateMonitorText(message) {
    if (monitorText) {
        monitorText.textContent = message;
    }
}

// Função para calcular o hashrate total
function calculateTotalHashrate() {
    totalHashrate = minerValue; // Começa com o valor base do minerador
    for (const slotId in placedGpus) {
        const gpuData = placedGpus[slotId];
        if (gpuData && gpuData.hashrate) {
            totalHashrate += gpuData.hashrate;
        } else {
             // Caso a GPU não tenha hashrate direto no objeto, tente buscar na definição
             const shopGpu = shopItems.gpus.find(item => item.type === gpuData.type);
             if (shopGpu) {
                 totalHashrate += shopGpu.hashrate;
             }
        }
    }
    hashrateDisplay.textContent = formatNumber(totalHashrate);
}

// Função para atualizar a exibição dos racks e slots
function updateRackDisplay() {
    const rackSlots = document.querySelectorAll('.rack-slot');
    rackSlots.forEach(slot => {
        const slotId = slot.dataset.slotId; // Ex: 'rack-1-slot-0'
        const gpuData = placedGpus[slotId]; // Pega os dados da GPU para este slot

        if (gpuData) {
            // Se houver uma GPU, mostra a imagem e marca como ocupado
            // Assumindo que o nome do arquivo da imagem é gpuData.type em minúsculas e sem espaços
            const imageUrl = `assets/gpu/${gpuData.type.toLowerCase().replace(/\s/g, '')}.png`;
            slot.innerHTML = `<img src="${imageUrl}" alt="${gpuData.type}" class="placed-gpu">`;
            slot.classList.add('occupied');
        } else {
            // Se não houver GPU, limpa o slot e remove a classe de ocupado
            slot.innerHTML = '';
            slot.classList.remove('occupied');
        }
    });
    // Re-adicionar listeners, pois o innerHTML pode remover eles
    addEventListenersToRackSlots();
}

// Adicionar event listeners aos slots do rack
function addEventListenersToRackSlots() {
    const rackSlots = document.querySelectorAll('.rack-slot');
    rackSlots.forEach(slot => {
        // Remover listeners anteriores para evitar duplicação (se necessário)
        slot.removeEventListener('click', handleSlotClick);
        slot.addEventListener('click', handleSlotClick);
    });
}

// Lidar com o clique em um slot de rack (para colocar GPU)
async function handleSlotClick(event) {
    const clickedSlot = event.currentTarget; // O slot clicado
    const slotId = clickedSlot.dataset.slotId; // Ex: 'rack-1-slot-0'

    if (placingItem) { // Se um item está selecionado para colocação
        if (placedGpus[slotId]) {
            showOverlayMessage('Este slot já está ocupado.', 'error');
            return;
        }

        // Verifica se o item que está sendo colocado está no inventário do usuário
        const itemInInventory = inventory[placingItem.type] || 0;
        if (itemInInventory <= 0) {
            showOverlayMessage(`Você não tem ${placingItem.type} no seu inventário para colocar.`, 'error');
            cancelPlacement();
            return;
        }

        try {
            // Envia a requisição para o backend para colocar a GPU
            const response = await fetch(`${API_BASE_URL}/api/game/placeGpu`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}` // Inclui o token no cabeçalho
                },
                body: JSON.stringify({
                    slotId: slotId,
                    gpuType: placingItem.type,
                    hashrate: placingItem.hashrate // Envia o hashrate para o backend
                })
            });

            const data = await response.json();

            if (response.ok) {
                showOverlayMessage(data.message, 'success');
                updateGameUI(data.updatedUser); // Atualiza a UI com os novos dados do usuário
                updateMonitorText(data.message);
                cancelPlacement(); // Reseta o estado de colocação após sucesso
            } else {
                showOverlayMessage(data.message || 'Erro ao colocar a GPU.', 'error');
            }
        } catch (error) {
            console.error('[FRONTEND] Erro de rede ao colocar GPU:', error);
            showOverlayMessage('Erro de conexão com o servidor ao colocar GPU.', 'error');
        }
    } else if (placedGpus[slotId]) {
        // Se nenhum item está sendo colocado, mas um slot ocupado foi clicado,
        // pode ser para exibir detalhes da GPU ou interagir com ela
        showOverlayMessage(`GPU ${placedGpus[slotId].type} no slot ${slotId} (Hashrate: ${placedGpus[slotId].hashrate}).`, 'info');
        // Implemente a lógica para interagir com a GPU já colocada
    }
}

// Inicia o modo de seleção de GPU para colocação
function startPlacingGpu(gpuTypeData) {
    placingItem = gpuTypeData; // Armazena os dados da GPU a ser colocada
    if (minerSelectionBar) minerSelectionBar.style.display = 'block'; // Mostra a barra de seleção
    showOverlayMessage(`Selecione um slot vazio no rack para colocar a ${gpuTypeData.name}.`);
}

// Cancela o modo de seleção de GPU
function cancelPlacement() {
    placingItem = null;
    selectedItemForPlacement = null;
    if (minerSelectionBar) minerSelectionBar.style.display = 'none';
    showOverlayMessage('Modo de colocação cancelado.');
}


// --- Funções de Lógica do Jogo (Interação com Backend) ---

// Função para mineração (clique no botão)
async function mineLulaCoins() {
    if (!userToken) {
        showOverlayMessage('Faça login para minerar!', 'error');
        return;
    }
    // Envia requisição para o backend para mineração
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/mine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` // Inclui o token no cabeçalho
            },
            body: JSON.stringify({ miningPower: totalHashrate }) // Envia o hashrate total para o backend
        });

        const data = await response.json();
        if (response.ok) {
            updateGameUI(data.updatedUser); // Atualiza UI com dados do backend
            updateMonitorText(data.message);
        } else {
            showOverlayMessage(data.message || 'Erro ao minerar.', 'error');
        }
    } catch (error) {
        console.error('[FRONTEND] Erro de rede ao minerar:', error);
        showOverlayMessage('Erro de conexão com o servidor ao minerar.', 'error');
    }
}

// Função para fazer upgrade do minerador (base)
async function upgradeMiner() {
    if (!userToken) {
        showOverlayMessage('Faça login para fazer upgrade!', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/game/upgradeMiner`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
            // O backend deve decidir o custo e o upgrade com base no usuário e no estado atual
        });

        const data = await response.json();
        if (response.ok) {
            updateGameUI(data.updatedUser);
            showOverlayMessage(data.message, 'success');
            updateMonitorText(data.message);
        } else {
            showOverlayMessage(data.message || 'Erro ao fazer upgrade.', 'error');
        }
    } catch (error) {
        console.error('[FRONTEND] Erro de rede ao fazer upgrade:', error);
        showOverlayMessage('Erro de conexão com o servidor ao fazer upgrade.', 'error');
    }
}

// Função para saque de Lula Coins (exemplo simples)
async function saqueLulaCoins() {
    if (!userToken) {
        showOverlayMessage('Faça login para sacar!', 'error');
        return;
    }
    try {
        // Envie o valor que o usuário quer sacar, ou deixe o backend decidir
        const amountToSaque = lulaCoins; // Exemplo: sacar tudo que tem
        if (amountToSaque <= 0) {
            showOverlayMessage('Você não tem moedas para sacar.', 'info');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/game/saque`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ amount: amountToSaque })
        });

        const data = await response.json();
        if (response.ok) {
            updateGameUI(data.updatedUser); // Atualiza o saldo de moedas
            showOverlayMessage(data.message, 'success');
            updateMonitorText(data.message);
        } else {
            showOverlayMessage(data.message || 'Erro ao sacar.', 'error');
        }
    } catch (error) {
        console.error('[FRONTEND] Erro de rede ao sacar:', error);
        showOverlayMessage('Erro de conexão com o servidor ao sacar.', 'error');
    }
}

// Função para carregar o estado do jogo do backend (ao iniciar a página do jogo)
async function loadGameData() {
    // Tenta obter o token e username do localStorage novamente, para garantir
    userToken = localStorage.getItem('token');
    currentUsername = localStorage.getItem('username');

    if (!userToken) {
        console.log("[FRONTEND] Nenhum token encontrado no localStorage, redirecionando para login...");
        window.location.href = 'index.html'; // Redireciona para a página de login
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/game/loadGame`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}` // Envia o token para autenticação
            }
        });

        const data = await response.json();

        if (response.ok) {
            updateGameUI(data); // Atualiza a UI com os dados do jogo recebidos do backend
            showOverlayMessage('Jogo carregado com sucesso!', 'success');
            updateMonitorText('Dados do jogo carregados.');
            usernameDisplay.textContent = currentUsername; // Atualiza o nome de usuário na UI
        } else {
            // Se o token for inválido/expirado, ou erro no backend, redirecionar para login
            showOverlayMessage(data.message || 'Falha ao carregar o jogo. Por favor, faça login novamente.', 'error');
            console.error('[FRONTEND] Erro ao carregar jogo:', data.message);
            localStorage.clear(); // Limpa dados de login
            userToken = null;
            currentUsername = null;
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000); // Redireciona após 2 segundos
        }
    } catch (error) {
        console.error('[FRONTEND] Erro de rede ao carregar o jogo:', error);
        showOverlayMessage('Erro de conexão com o servidor ao carregar o jogo.', 'error');
        localStorage.clear();
        userToken = null;
        currentUsername = null;
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}


// --- Funções da Loja ---

// Renderizar itens da loja
function renderShopItems(category) {
    shopItemsContainer.innerHTML = ''; // Limpa o container
    const itemsToRender = shopItems[category] || [];

    if (itemsToRender.length === 0) {
        shopItemsContainer.innerHTML = '<p>Nenhum item nesta categoria.</p>';
        return;
    }

    itemsToRender.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('shop-item');
        itemDiv.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p>Hashrate: ${item.hashrate || 'N/A'}</p>
            <p>Preço: ${formatNumber(item.price)} Lula Coins</p>
            <button class="buy-btn" data-item-id="${item.id}" data-item-type="${item.type}" data-item-price="${item.price}" data-item-hashrate="${item.hashrate}">Comprar</button>
        `;
        shopItemsContainer.appendChild(itemDiv);
    });

    // Adicionar listeners aos botões de compra
    document.querySelectorAll('.buy-btn').forEach(button => {
        button.onclick = handleBuyItem;
    });
}

// Lidar com a compra de um item
async function handleBuyItem(event) {
    if (!userToken) {
        showOverlayMessage('Faça login para comprar!', 'error');
        return;
    }

    const itemId = event.target.dataset.itemId;
    const itemType = event.target.dataset.itemType;
    const itemPrice = parseInt(event.target.dataset.itemPrice);
    const itemHashrate = parseInt(event.target.dataset.itemHashrate); // Pode ser N/A

    if (lulaCoins < itemPrice) {
        showOverlayMessage('Moedas insuficientes!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/game/buyItem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ itemId, itemType, itemPrice, hashrate: itemHashrate })
        });

        const data = await response.json();
        if (response.ok) {
            updateGameUI(data.updatedUser); // Atualiza UI com novas moedas e inventário
            showOverlayMessage(data.message, 'success');
            updateMonitorText(data.message);
            renderInventoryItems('gpus'); // Atualiza a visualização do inventário após compra
        } else {
            showOverlayMessage(data.message || 'Erro ao comprar item.', 'error');
        }
    } catch (error) {
        console.error('[FRONTEND] Erro de rede ao comprar item:', error);
        showOverlayMessage('Erro de conexão com o servidor ao comprar item.', 'error');
    }
}

// --- Funções do Inventário ---

// Renderizar itens do inventário
function renderInventoryItems(category) { // Categoria pode ser usada para filtrar se seu inventário tiver categorias
    inventoryItemsContainer.innerHTML = ''; // Limpa o container

    const itemsToRender = inventory; // Seu objeto de inventário global

    if (Object.keys(itemsToRender).length === 0 || Object.values(itemsToRender).every(qty => qty === 0)) {
        inventoryItemsContainer.innerHTML = '<p>Seu inventário está vazio.</p>';
        return;
    }

    for (const type in itemsToRender) {
        if (itemsToRender[type] > 0) {
            // Tenta encontrar a definição do item na loja para obter hashrate e imagem
            const itemDef = shopItems.gpus.find(gpu => gpu.type === type) ||
                            shopItems.upgrades.find(upg => upg.type === type);

            if (!itemDef) {
                console.warn(`[FRONTEND] Definição de item não encontrada para o tipo: ${type}.`);
                continue; // Pular este item se não houver definição
            }

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('inventory-item');
            itemDiv.innerHTML = `
                <img src="${itemDef.imageUrl}" alt="${type}">
                <h3>${itemDef.name || type}</h3>
                <p>Quantidade: ${itemsToRender[type]}</p>
                ${itemDef.hashrate ? `<p>Hashrate: ${itemDef.hashrate}</p>` : ''}
                <button class="place-btn" data-item-type="${type}" data-item-hashrate="${itemDef.hashrate || 0}" data-item-name="${itemDef.name || type}">Colocar</button>
            `;
            inventoryItemsContainer.appendChild(itemDiv);
        }
    }

    // Adicionar listeners aos botões "Colocar"
    document.querySelectorAll('.place-btn').forEach(button => {
        button.onclick = (event) => {
            const gpuType = event.target.dataset.itemType;
            const hashrate = parseInt(event.target.dataset.itemHashrate);
            const name = event.target.dataset.itemName;
            // Fecha o inventário e inicia o modo de colocação
            if (inventoryModal) inventoryModal.style.display = 'none';
            startPlacingGpu({ type: gpuType, hashrate: hashrate, name: name });
        };
    });
}


// --- Event Listeners Globais ---

document.addEventListener('DOMContentLoaded', () => {
    // Carrega o token e username do localStorage ao iniciar
    userToken = localStorage.getItem('token');
    currentUsername = localStorage.getItem('username');

    // Verifica se o usuário está logado e carrega os dados do jogo
    if (userToken && currentUsername) {
        loadGameData(); // Tenta carregar os dados do jogo do backend
    } else {
        // Se não houver token, redireciona para a tela de login/registro
        console.log("[FRONTEND] Usuário não logado, redirecionando para index.html");
        window.location.href = 'index.html';
    }

    // Botões principais do jogo
    if (minerButton) minerButton.onclick = mineLulaCoins;
    if (upgradeMinerButton) upgradeMinerButton.onclick = upgradeMiner;
    if (saqueButton) saqueButton.onclick = saqueLulaCoins;

    // Botão de logout
    if (logoutButton) {
        logoutButton.onclick = () => {
            localStorage.clear(); // Limpa o token e username
            userToken = null;
            currentUsername = null;
            showOverlayMessage('Sessão encerrada. Redirecionando...', 'info');
            setTimeout(() => {
                window.location.href = 'index.html'; // Redireciona para a página de login
            }, 1500);
        };
    }

    // Botões da loja
    if (openShopBtn) openShopBtn.onclick = () => {
        if (shopModal) shopModal.style.display = 'block';
        renderShopItems('gpus'); // Renderiza a categoria inicial (ex: GPUs)
    };
    if (closeShopBtn) closeShopBtn.onclick = () => {
        if (shopModal) shopModal.style.display = 'none';
    };

    shopCategoryBtns.forEach(btn => {
        btn.onclick = () => {
            const category = btn.dataset.category;
            renderShopItems(category);
        };
    });

    // Botões do inventário
    if (openInventoryBtn) openInventoryBtn.onclick = () => {
        if (inventoryModal) inventoryModal.style.display = 'block';
        renderInventoryItems('gpus'); // Renderiza a categoria inicial
    };
    if (closeInventoryBtn) closeInventoryBtn.onclick = () => {
        if (inventoryModal) inventoryModal.style.display = 'none';
    };

    inventoryCategoryBtns.forEach(btn => {
        btn.onclick = () => {
            const category = btn.dataset.category;
            renderInventoryItems(category);
        };
    });

    // Botão de cancelar colocação de GPU
    if (cancelSelectionBtn) cancelSelectionBtn.onclick = cancelPlacement;

    // Inicializa a exibição dos slots dos racks (chame isso para que os slots tenham listeners)
    updateRackDisplay();
});

// Fechar modais ao clicar fora
window.onclick = function(event) {
    if (shopModal && event.target == shopModal) {
        shopModal.style.display = "none";
    }
    if (inventoryModal && event.target == inventoryModal) {
        inventoryModal.style.display = "none";
    }
}
