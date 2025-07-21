// backend/routes/game.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Middleware de autenticação
const User = require('../models/User'); // Modelo do usuário

// Mock de itens da loja (deveria vir de um banco de dados ou configuração separada)
const shopItems = {
    gpus: [
        { id: "basic_gpu", name: "GPU Básica", hashrate: 10, cost: 100, img: "https://via.placeholder.com/80x80/FF0000/FFFFFF?text=GPU1" },
        { id: "mid_gpu", name: "GPU Intermediária", hashrate: 50, cost: 450, img: "https://via.placeholder.com/80x80/00FF00/000000?text=GPU2" },
        { id: "pro_gpu", name: "GPU Profissional", hashrate: 200, cost: 1500, img: "https://via.placeholder.com/80x80/0000FF/FFFFFF?text=GPU3" }
    ],
    upgrades: [
        { id: "power_supply_1", name: "Fonte de Energia I", effect: "+10% Hashrate", cost: 300, img: "https://via.placeholder.com/80x80/FFFF00/000000?text=PSU1" },
        { id: "cooling_fan_1", name: "Ventoinha de Resfriamento I", effect: "+5% Hashrate", cost: 150, img: "https://via.placeholder.com/80x80/FFA500/FFFFFF?text=FAN1" }
    ]
};

// @route   GET /api/game/state
// @desc    Obter o estado atual do jogo para o usuário logado
// @access  Private
router.get('/state', auth, async (req, res) => {
    try {
        // O req.user já foi populado pelo middleware 'auth' se o token for válido
        // Então, req.user.id deve estar disponível aqui
        const user = await User.findById(req.user.id);
        if (!user) {
            // Este caso deve ser raro se o authMiddleware estiver funcionando bem,
            // pois o middleware já checa se o usuário existe.
            // Mas é uma boa prática ter uma checagem defensiva.
            console.warn(`[Game State] Usuário com ID ${req.user.id} não encontrado após autenticação.`);
            return res.status(404).json({ message: 'Usuário não encontrado no banco de dados.' });
        }

        res.json({
            lulaCoins: user.lulaCoins,
            level: user.level,
            minerValue: user.minerValue,
            totalHashrate: user.totalHashrate,
            inventory: user.inventory,
            placedGpus: user.placedGpus,
            username: user.username // Adicionado para facilitar a exibição no frontend
        });
    } catch (err) {
        console.error('Erro ao obter estado do jogo para o usuário ' + (req.user ? req.user.id : 'desconhecido') + ':', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao carregar estado do jogo.' });
    }
});

// @route   POST /api/game/click
// @desc    Processar um clique de mineração
// @access  Private
router.post('/click', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        user.lulaCoins += user.minerValue; // Adiciona o valor do minerador por clique
        await user.save();
        res.json({ lulaCoins: user.lulaCoins });
    } catch (err) {
        console.error('Erro ao processar clique de mineração:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/buy-item
// @desc    Comprar um item da loja
// @access  Private
router.post('/buy-item', auth, async (req, res) => {
    const { itemId, category } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const itemToBuy = shopItems[category]?.find(item => item.id === itemId);

        if (!itemToBuy) {
            return res.status(404).json({ message: 'Item não encontrado na loja.' });
        }

        if (user.lulaCoins < itemToBuy.cost) {
            return res.status(400).json({ message: 'Lula Coins insuficientes.' });
        }

        user.lulaCoins -= itemToBuy.cost;

        if (category === 'gpus') {
            user.inventory.gpus.push(itemToBuy);
        } else if (category === 'upgrades') {
            user.inventory.upgrades.push(itemToBuy);
        }

        await user.save();

        res.json({
            lulaCoins: user.lulaCoins,
            inventory: user.inventory,
            message: `${itemToBuy.name} comprado com sucesso!`
        });

    } catch (err) {
        console.error('Erro ao comprar item:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/place-gpu
// @desc    Colocar uma GPU em um slot do rack
// @access  Private
router.post('/place-gpu', auth, async (req, res) => {
    const { gpuId, slotId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Encontra a GPU no inventário do usuário
        const gpuIndex = user.inventory.gpus.findIndex(gpu => gpu.id === gpuId);
        if (gpuIndex === -1) {
            return res.status(400).json({ message: 'GPU não encontrada no seu inventário.' });
        }

        const gpuToPlace = user.inventory.gpus[gpuIndex];

        // Verifica se o slot já está ocupado
        if (user.placedGpus[slotId]) {
            return res.status(400).json({ message: 'Slot já ocupado.' });
        }

        // Remove a GPU do inventário
        user.inventory.gpus.splice(gpuIndex, 1);

        // Adiciona a GPU ao placedGpus
        user.placedGpus[slotId] = gpuToPlace;

        // Atualiza o hashrate total do usuário
        user.totalHashrate = Object.values(user.placedGpus).reduce((sum, gpu) => sum + gpu.hashrate, 0);

        await user.save();

        res.json({
            placedGpus: user.placedGpus,
            totalHashrate: user.totalHashrate,
            inventory: user.inventory,
            message: `${gpuToPlace.name} colocada no slot ${slotId}.`
        });

    } catch (err) {
        console.error('Erro ao colocar GPU:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/sell-item
// @desc    Vender um item do inventário
// @access  Private
router.post('/sell-item', auth, async (req, res) => {
    const { itemId, category, isPlaced, slotId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        let itemToSell;
        let itemIndex;
        let sellValue;

        if (isPlaced && slotId) {
            // Vender GPU colocada
            itemToSell = user.placedGpus[slotId];
            if (!itemToSell) {
                return res.status(404).json({ message: 'GPU não encontrada neste slot.' });
            }
            // Valor de venda (ex: 50% do custo original)
            sellValue = itemToSell.cost * 0.5;
            delete user.placedGpus[slotId]; // Remove do rack

            // Recalcula o hashrate total
            user.totalHashrate = Object.values(user.placedGpus).reduce((sum, gpu) => sum + gpu.hashrate, 0);

        } else {
            // Vender item do inventário (GPU ou Upgrade)
            const inventoryCategory = user.inventory[category];
            if (!inventoryCategory) {
                return res.status(400).json({ message: 'Categoria de inventário inválida.' });
            }

            itemIndex = inventoryCategory.findIndex(item => item.id === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({ message: 'Item não encontrado no inventário.' });
            }
            itemToSell = inventoryCategory[itemIndex];
            // Valor de venda (ex: 50% do custo original)
            sellValue = itemToSell.cost * 0.5;
            inventoryCategory.splice(itemIndex, 1); // Remove do inventário
        }

        user.lulaCoins += sellValue;

        await user.save(); // Salva as alterações

        res.json({
            lulaCoins: user.lulaCoins,
            inventory: user.inventory,
            placedGpus: user.placedGpus, // Necessário para atualizar o frontend
            totalHashrate: user.totalHashrate, // Pode ter mudado se vendeu GPU
            message: `${itemToSell.name} vendido por ${sellValue.toFixed(2)} Lula Coins.`
        });

    } catch (err) {
        console.error('Erro ao vender item:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/withdraw
// @desc    Sacar Lula Coins (Simulação)
// @access  Private
router.post('/withdraw', auth, async (req, res) => {
    const { amount } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Valor inválido para saque.' });
        }
        if (user.lulaCoins < amount) {
            return res.status(400).json({ message: 'Lula Coins insuficientes para saque.' });
        }

        user.lulaCoins -= amount;

        await user.save(); // Salva as alterações diretamente

        res.json({
            lulaCoins: user.lulaCoins,
            message: `Você sacou ${amount.toFixed(2)} Lula Coins com sucesso!`
        });

    } catch (err) {
        console.error('Erro no saque:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});


module.exports = router;
