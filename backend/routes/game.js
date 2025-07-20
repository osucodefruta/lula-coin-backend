// backend/routes/game.js (ESTE É O ARQUIVO DO BACKEND!)
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // OU './middleware/auth' se o arquivo for auth.js
const User = require('../models/User'); // Importe o modelo de usuário

// Rota para minerar Lula Coins
router.post('/mine', auth, async (req, res) => {
    try {
        const { miningPower } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Adiciona as moedas baseadas no poder de mineração
        user.lulaCoins += miningPower; // Ou alguma lógica mais complexa

        // Assumindo que você tem um sistema de 'level' ou 'xp'
        // user.level = calculateLevel(user.lulaCoins);

        await user.save();
        res.json({ message: `Você minerou ${miningPower} Lula Coins! Total: ${user.lulaCoins}`, updatedUser: user });
    } catch (error) {
        console.error('[BACKEND] Erro ao minerar:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao minerar.' });
    }
});

// Rota para fazer upgrade do minerador (base)
router.post('/upgradeMiner', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Lógica de custo e efeito do upgrade
        const upgradeCost = 100; // Exemplo de custo
        const powerIncrease = 5; // Exemplo de aumento de poder

        if (user.lulaCoins < upgradeCost) {
            return res.status(400).json({ message: 'Moedas insuficientes para o upgrade.' });
        }

        user.lulaCoins -= upgradeCost;
        user.miningPower += powerIncrease; // Aumenta o poder de mineração base

        await user.save();
        res.json({ message: `Upgrade de minerador realizado! Poder atual: ${user.miningPower}`, updatedUser: user });
    } catch (error) {
        console.error('[BACKEND] Erro ao fazer upgrade:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer upgrade.' });
    }
});

// Rota para saque de Lula Coins (exemplo: remover moedas)
router.post('/saque', auth, async (req, res) => {
    try {
        const { amount } = req.body; // O frontend envia o valor a ser sacado
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        if (user.lulaCoins < amount || amount <= 0) {
            return res.status(400).json({ message: 'Valor de saque inválido ou insuficiente.' });
        }

        user.lulaCoins -= amount; // Remove as moedas do usuário
        await user.save();
        res.json({ message: `Você sacou ${amount} Lula Coins! Saldo atual: ${user.lulaCoins}`, updatedUser: user });
    } catch (error) {
        console.error('[BACKEND] Erro ao sacar:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao sacar.' });
    }
});

// Rota para comprar itens (GPUs, upgrades)
router.post('/buyItem', auth, async (req, res) => {
    try {
        const { itemId, itemType, itemPrice, hashrate } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        if (user.lulaCoins < itemPrice) {
            return res.status(400).json({ message: 'Moedas insuficientes para comprar este item.' });
        }

        user.lulaCoins -= itemPrice;

        // Garanta que user.upgrades.inventory e user.upgrades.placedGpus existem
        if (!user.upgrades) user.upgrades = {};
        if (!user.upgrades.inventory) user.upgrades.inventory = {};
        if (!user.upgrades.placedGpus) user.upgrades.placedGpus = {};

        // Adiciona o item ao inventário
        if (!user.upgrades.inventory[itemType]) {
            user.upgrades.inventory[itemType] = 0;
        }
        user.upgrades.inventory[itemType]++;

        await user.save();
        res.json({ message: `${itemType} comprado com sucesso!`, updatedUser: user });
    } catch (error) {
        console.error('[BACKEND] Erro ao comprar item:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao comprar item.' });
    }
});

// Rota para colocar GPUs em um slot
router.post('/placeGpu', auth, async (req, res) => {
    try {
        const { slotId, gpuType, hashrate } = req.body; // Recebe o ID do slot e tipo da GPU
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Garanta que user.upgrades.inventory e user.upgrades.placedGpus existem
        if (!user.upgrades) user.upgrades = {};
        if (!user.upgrades.inventory) user.upgrades.inventory = {};
        if (!user.upgrades.placedGpus) user.upgrades.placedGpus = {};

        // Verifica se o usuário tem a GPU no inventário
        if (!user.upgrades.inventory[gpuType] || user.upgrades.inventory[gpuType] <= 0) {
            return res.status(400).json({ message: `Você não tem ${gpuType} no seu inventário.` });
        }

        // Verifica se o slot já está ocupado
        if (user.upgrades.placedGpus[slotId]) {
            return res.status(400).json({ message: 'Este slot já está ocupado.' });
        }

        // Remove 1 do inventário e adiciona ao slot
        user.upgrades.inventory[gpuType]--;
        user.upgrades.placedGpus[slotId] = { type: gpuType, hashrate: hashrate }; // Armazena a GPU no slot

        await user.save();
        res.json({ message: `${gpuType} colocada no slot ${slotId}!`, updatedUser: user });
    } catch (error) {
        console.error('[BACKEND] Erro ao colocar GPU:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao colocar GPU.' });
    }
});


// Rota para carregar o estado do jogo do usuário
router.get('/loadGame', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Não enviar a senha

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Retorna apenas os dados relevantes para o frontend
        res.json({
            lulaCoins: user.lulaCoins,
            miningPower: user.miningPower, // O poder de mineração base do usuário
            upgrades: user.upgrades || {}, // Inclui inventário e GPUs colocadas
            // Se tiver, adicione level: user.level, etc.
        });
    } catch (error) {
        console.error('[BACKEND] Erro ao carregar o jogo:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao carregar o jogo.' });
    }
});

module.exports = router;
