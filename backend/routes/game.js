// backend/routes/game.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Middleware de autenticação
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
        { id: "cooling_fan_1", name: "Ventoinha Resfriamento I", effect: "Reduz calor", cost: 150, img: "https://via.placeholder.com/80x80/FF00FF/FFFFFF?text=FAN1" }
    ]
};

// @route   GET /api/game/state
// @desc    Obter o estado atual do jogo do usuário
// @access  Private
router.get('/state', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclui a senha
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json({
            lulaCoins: user.lulaCoins,
            level: user.level,
            minerValue: user.minerValue,
            totalHashrate: user.totalHashrate,
            inventory: user.inventory,
            placedGpus: user.placedGpus
        });
    } catch (err) {
        console.error('Erro ao obter estado do jogo:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/mine
// @desc    Minerar Lula Coins
// @access  Private
router.post('/mine', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const minedAmount = user.minerValue + user.totalHashrate; // Exemplo de cálculo

        user.lulaCoins += minedAmount;
        // Lógica de nível pode ser adicionada aqui, se baseada em moedas ou cliques
        // Por exemplo: if (user.lulaCoins >= nextLevelRequirement) { user.level++; }

        await user.save(); // Salva as alterações diretamente

        res.json({
            lulaCoins: user.lulaCoins,
            level: user.level,
            minedAmount: minedAmount,
            message: `Minerou ${minedAmount.toFixed(2)} Lula Coins!`
        });

    } catch (err) {
        console.error('Erro na mineração:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/upgrade-miner
// @desc    Fazer upgrade no minerador de clique
// @access  Private
router.post('/upgrade-miner', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Exemplo: Custo e efeito de upgrade. Ajuste conforme sua lógica.
        const upgradeCost = user.level * 50; // Custo aumenta com o nível
        const upgradeValueIncrease = 5; // Aumento do valor por clique
        const nextLevelThreshold = user.level * 1000; // Limite para o próximo nível

        if (user.lulaCoins < upgradeCost) {
            return res.status(400).json({ message: 'Lula Coins insuficientes para o upgrade.' });
        }

        user.lulaCoins -= upgradeCost;
        user.minerValue += upgradeValueIncrease;
        user.level++; // Aumenta o nível

        await user.save(); // Salva as alterações diretamente

        res.json({
            lulaCoins: user.lulaCoins,
            minerValue: user.minerValue,
            level: user.level,
            message: 'Minerador de clique atualizado!'
        });

    } catch (err) {
        console.error('Erro ao fazer upgrade no minerador:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/buy-item
// @desc    Comprar um item da loja
// @access  Private
router.post('/buy-item', auth, async (req, res) => {
    const { itemId, itemType } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const itemToBuy = shopItems[itemType]?.find(item => item.id === itemId);

        if (!itemToBuy) {
            return res.status(404).json({ message: 'Item não encontrado na loja.' });
        }
        if (user.lulaCoins < itemToBuy.cost) {
            return res.status(400).json({ message: 'Lula Coins insuficientes.' });
        }

        user.lulaCoins -= itemToBuy.cost;

        // Adiciona o item ao inventário
        const inventoryCategory = user.inventory[itemType];
        const existingItemIndex = inventoryCategory.findIndex(item => item.id === itemId);

        if (existingItemIndex > -1) {
            inventoryCategory[existingItemIndex].quantity = (inventoryCategory[existingItemIndex].quantity || 1) + 1;
        } else {
            inventoryCategory.push({ ...itemToBuy, quantity: 1 });
        }

        await user.save(); // Salva as alterações diretamente

        res.json({
            lulaCoins: user.lulaCoins,
            inventory: user.inventory,
            itemName: itemToBuy.name,
            message: `${itemToBuy.name} comprado com sucesso!`
        });

    } catch (err) {
        console.error('Erro ao comprar item:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});

// @route   POST /api/game/place-gpu
// @desc    Colocar uma GPU do inventário em um slot de rack
// @access  Private
router.post('/place-gpu', auth, async (req, res) => {
    const { gpuId, slotId } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Verifica se o slot já está ocupado
        if (user.placedGpus[slotId]) {
            return res.status(400).json({ message: 'Este slot já está ocupado.' });
        }

        // Encontra a GPU no inventário do usuário
        const gpuInInventoryIndex = user.inventory.gpus.findIndex(gpu => gpu.id === gpuId);
        if (gpuInInventoryIndex === -1) {
            return res.status(404).json({ message: 'GPU não encontrada no seu inventário.' });
        }

        const gpuToPlace = user.inventory.gpus[gpuInInventoryIndex];

        // Remove a GPU do inventário
        if (gpuToPlace.quantity && gpuToPlace.quantity > 1) {
            gpuToPlace.quantity--;
        } else {
            user.inventory.gpus.splice(gpuInInventoryIndex, 1);
        }

        // Adiciona a GPU aos slots colocados
        user.placedGpus[slotId] = {
            id: gpuToPlace.id,
            name: gpuToPlace.name,
            hashrate: gpuToPlace.hashrate,
            img: gpuToPlace.img
        };

        // Atualiza o hashrate total
        user.totalHashrate += gpuToPlace.hashrate;

        await user.save(); // Salva as alterações diretamente

        res.json({
            placedGpus: user.placedGpus,
            inventory: user.inventory,
            totalHashrate: user.totalHashrate,
            message: `${gpuToPlace.name} colocada no ${slotId}.`
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
    const { itemId, itemType } = req.body; // itemType: 'gpus' ou 'upgrades'

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const inventoryCategory = user.inventory[itemType];
        const itemToSellIndex = inventoryCategory.findIndex(item => item.id === itemId);

        if (itemToSellIndex === -1) {
            return res.status(404).json({ message: 'Item não encontrado no seu inventário.' });
        }

        const itemToSell = inventoryCategory[itemToSellIndex];
        // Valor de venda (ex: 50% do custo original)
        const sellValue = (itemToSell.cost || 0) * 0.5;

        user.lulaCoins += sellValue;

        // Remove ou diminui a quantidade do item no inventário
        if (itemToSell.quantity && itemToSell.quantity > 1) {
            itemToSell.quantity--;
        } else {
            inventoryCategory.splice(itemToSellIndex, 1);
        }

        // Se for uma GPU, verifique se ela estava colocada e remova-a também
        if (itemType === 'gpus') {
            for (const slotId in user.placedGpus) {
                if (user.placedGpus[slotId].id === itemId) {
                    user.totalHashrate -= user.placedGpus[slotId].hashrate;
                    delete user.placedGpus[slotId];
                    break; // Remove apenas a primeira instância encontrada
                }
            }
        }

        await user.save(); // Salva as alterações diretamente

        res.json({
            lulaCoins: user.lulaCoins,
            inventory: user.inventory,
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
        console.error('Erro ao sacar Lula Coins:', err.message);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
});


module.exports = router;
