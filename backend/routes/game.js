// backend/routes/game.js
const express = require('express');
const router = express.Router();
// CORREÇÃO: Trocamos o middleware antigo ('protect') pelo nosso middleware unificado.
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

// Função para validar o estado do jogo
const validateGameState = (gameState) => {
    if (!gameState) return false;
    const requiredFields = ['balance', 'inventory', 'placedRacksPerRoom'];
    return requiredFields.every(field => gameState[field] !== undefined);
};

// CORREÇÃO: Todas as rotas agora usam 'authMiddleware' em vez de 'protect'.
router.get('/state', authMiddleware, async (req, res) => {
    try {
        // Agora usamos req.user.id, que é fornecido pelo nosso middleware padrão.
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Inicializa o gameState se não existir
        if (!user.gameState) {
            user.gameState = {
                balance: 10,
                inventory: {
                    miners: [],
                    racks: []
                },
                placedRacksPerRoom: [Array(4).fill(null)],
                totalPower: 0
            };
            await user.save();
        }

        res.json({
            username: user.username,
            gameState: user.gameState,
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

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 
                $set: { 
                    gameState: gameState,
                    currentRoomIndex: currentRoomIndex || 0
                } 
            },
            { new: true }
        ).select('-password');

        res.json({
            message: 'Jogo salvo com sucesso!',
            gameState: user.gameState
        });

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

        if (user.gameState.balance < itemConfig.price) {
            return res.status(400).json({ message: 'Saldo insuficiente.' });
        }

        user.gameState.balance -= itemConfig.price;

        const inventoryList = category === 'miners' ? user.gameState.inventory.miners : user.gameState.inventory.racks;
        const existingItem = inventoryList.find(i => i.id === itemId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            inventoryList.push({ id: itemId, quantity: 1 });
        }
        
        user.markModified('gameState');
        await user.save();

        res.json({
            message: `${itemConfig.name} comprado!`,
            gameState: user.gameState
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

        if (user.gameState.balance < cost) {
            return res.status(400).json({ message: "Saldo insuficiente!" });
        }

        user.gameState.balance -= cost;
        user.gameState.placedRacksPerRoom.push(Array(4).fill(null));

        user.markModified('gameState');
        await user.save();
        
        res.json({ 
            gameState: user.gameState, 
            message: `Sala comprada por ${cost} LCO!` 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor ao comprar sala.' });
    }
});

// As rotas place-rack e place-miner foram removidas por simplicidade,
// já que a lógica de posicionamento está no frontend e é salva via /update.
// Se você precisar delas no futuro para validações mais complexas, podemos recriá-las.

// Função auxiliar para calcular a potência total
function calculateTotalPower(placedRacksPerRoom) {
    let totalPower = 0;
    if(!placedRacksPerRoom) return 0;
    placedRacksPerRoom.forEach(room => {
        if(!room) return;
        room.forEach(rack => {
            if (rack && rack.placedMiners) {
                rack.placedMiners.forEach(miner => {
                    if (miner) {
                        const minerConfig = MINERS.find(m => m.id === miner.id);
                        if (minerConfig) {
                            totalPower += minerConfig.power;
                        }
                    }
                });
            }
        });
    });
    return totalPower;
}

module.exports = router;
