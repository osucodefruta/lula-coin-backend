// backend/routes/game.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// --- Definições do Jogo (para validação no backend) ---
const MINERS = [
    { id: 'miner001', name: 'GPU Básica', power: 1, price: 10 },
    { id: 'miner002', name: 'ASIC Médio', power: 5, price: 30 },
    { id: 'miner003', name: 'ASIC Avançado', power: 20, price: 180 },
    { id: 'miner004', name: 'Super ASIC', power: 100, price: 800 },
];

const RACKS = [
    { id: 'rack001', name: 'Rack Pequeno', slots: 2, price: 20 },
    { id: 'rack002', name: 'Rack Médio', slots: 4, price: 30 },
    { id: 'rack003', name: 'Rack Grande', slots: 6, price: 100 },
];

// ROTA: GET /api/game/state
// Função: Obter o estado atual do jogo do usuário.
// A rota é protegida, ou seja, só funciona se o usuário estiver logado.
router.get('/state', protect, async (req, res) => {
    try {
        // O usuário é obtido pelo middleware `protect` (req.user)
        res.json({
            username: req.user.username,
            gameState: req.user.gameState
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

// ROTA: POST /api/game/update
// Função: Salvar o estado completo do jogo vindo do cliente.
router.post('/update', protect, async (req, res) => {
    try {
        const { gameState } = req.body;

        // Validação básica para garantir que gameState foi enviado
        if (!gameState) {
            return res.status(400).json({ message: 'Nenhum estado de jogo fornecido.' });
        }

        // Atualiza o gameState do usuário no banco de dados
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { gameState: gameState } },
            { new: true } // Retorna o documento atualizado
        ).select('-password');

        res.json({
            message: 'Jogo salvo com sucesso!',
            gameState: user.gameState
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

// ROTA: POST /api/game/buy-item
// Função: Comprar um item da loja.
router.post('/buy-item', protect, async (req, res) => {
    const { itemId, category } = req.body;
    const user = req.user;

    const itemConfig = (category === 'miners' ? MINERS : RACKS).find(i => i.id === itemId);

    if (!itemConfig) {
        return res.status(404).json({ message: 'Item não encontrado.' });
    }

    if (user.gameState.balance < itemConfig.price) {
        return res.status(400).json({ message: 'Saldo insuficiente.' });
    }

    // Deduz o preço do saldo
    user.gameState.balance -= itemConfig.price;

    // Adiciona o item ao inventário
    const inventoryList = category === 'miners' ? user.gameState.inventory.miners : user.gameState.inventory.racks;
    const existingItem = inventoryList.find(i => i.id === itemId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        inventoryList.push({ id: itemId, quantity: 1 });
    }
    
    // Marca o caminho do gameState como modificado para o Mongoose salvar corretamente
    user.markModified('gameState');
    await user.save();

    res.json({
        message: `${itemConfig.name} comprado!`,
        gameState: user.gameState
    });
});


module.exports = router;

