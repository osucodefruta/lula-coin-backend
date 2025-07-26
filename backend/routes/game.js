// backend/routes/game.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); 
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

// Função para validar o estado do jogo (opcional, mas bom ter)
const validateGameState = (gameState) => {
    if (!gameState) return false;
    const requiredFields = ['balance', 'inventory', 'placedRacksPerRoom'];
    return requiredFields.every(field => gameState[field] !== undefined);
};

// ROTA: GET /api/game/state
router.get('/state', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // CORRIGIDO: Removemos a lógica que criava um gameState antigo.
        // O Mongoose já cria o lulaCoinGameState com os valores padrão.

        // CORRIGIDO: Enviamos o lulaCoinGameState, mas com o nome 'gameState',
        // para que o frontend index.html não precise ser alterado.
        res.json({
            username: user.username,
            gameState: user.lulaCoinGameState,
            currentRoomIndex: user.currentRoomIndex || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// ROTA: POST /api/game/update
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const { gameState, currentRoomIndex } = req.body;

        if (!validateGameState(gameState)) {
            return res.status(400).json({ message: 'Estado do jogo inválido.' });
        }

        await User.findByIdAndUpdate(
            req.user.id,
            { 
                // CORRIGIDO: Salva os dados recebidos no campo correto do banco de dados.
                $set: { 
                    lulaCoinGameState: gameState,
                    currentRoomIndex: currentRoomIndex || 0
                } 
            }
        );

        res.json({ message: 'Jogo salvo com sucesso!' });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// ROTA: POST /api/game/buy-item
router.post('/buy-item', authMiddleware, async (req, res) => {
    const { itemId, category } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const itemConfig = (category === 'miners' ? MINERS : RACKS).find(i => i.id === itemId);
        if (!itemConfig) {
            return res.status(404).json({ message: 'Item não encontrado.' });
        }

        // CORRIGIDO: Verifica o saldo no local correto.
        if (user.lulaCoinGameState.balance < itemConfig.price) {
            return res.status(400).json({ message: 'Saldo insuficiente.' });
        }

        // CORRIGIDO: Debita o saldo do local correto.
        user.lulaCoinGameState.balance -= itemConfig.price;

        const inventoryList = category === 'miners' ? user.lulaCoinGameState.inventory.miners : user.lulaCoinGameState.inventory.racks;
        const existingItem = inventoryList.find(i => i.id === itemId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            inventoryList.push({ id: itemId, quantity: 1 });
        }
        
        // CORRIGIDO: Informa ao Mongoose que o objeto correto foi modificado.
        user.markModified('lulaCoinGameState');
        await user.save();

        res.json({
            message: `${itemConfig.name} comprado!`,
            gameState: user.lulaCoinGameState // Envia o estado atualizado de volta
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor ao comprar item' });
    }
});

// ROTA: POST /api/game/buy-room
router.post('/buy-room', authMiddleware, async (req, res) => {
    const { cost } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // CORRIGIDO: Verifica o saldo no local correto.
        if (user.lulaCoinGameState.balance < cost) {
            return res.status(400).json({ message: "Saldo insuficiente!" });
        }

        // CORRIGIDO: Modifica os dados no local correto.
        user.lulaCoinGameState.balance -= cost;
        user.lulaCoinGameState.placedRacksPerRoom.push(Array(4).fill(null));

        user.markModified('lulaCoinGameState');
        await user.save();
        
        res.json({ 
            gameState: user.lulaCoinGameState, 
            message: `Sala comprada por ${cost} LCO!` 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor ao comprar sala.' });
    }
});


module.exports = router;
