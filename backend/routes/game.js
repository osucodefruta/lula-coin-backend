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

// Função para validar o estado do jogo
const validateGameState = (gameState) => {
    if (!gameState) return false;
    const requiredFields = ['balance', 'inventory', 'placedRacksPerRoom'];
    return requiredFields.every(field => gameState[field] !== undefined);
};

// ROTA: GET /api/game/state
router.get('/state', protect, async (req, res) => {
    try {
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
        res.status(500).send('Erro no servidor');
    }
});

// ROTA: POST /api/game/update
router.post('/update', protect, async (req, res) => {
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
        res.status(500).send('Erro no servidor');
    }
});

// ROTA: POST /api/game/buy-item
router.post('/buy-item', protect, async (req, res) => {
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
        res.status(500).send('Erro no servidor ao comprar item');
    }
});

// ROTA: POST /api/game/buy-room
router.post('/buy-room', protect, async (req, res) => {
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
        res.status(500).send('Erro no servidor ao comprar sala.');
    }
});

// ROTA: POST /api/game/place-rack
router.post('/place-rack', protect, async (req, res) => {
    const { rackId, slotIndex, roomIndex } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const { gameState } = user;

        // Validações
        if (!gameState.placedRacksPerRoom[roomIndex] || 
            slotIndex >= gameState.placedRacksPerRoom[roomIndex].length) {
            return res.status(400).json({ message: "Posição inválida para o rack." });
        }

        const invRack = gameState.inventory.racks.find(r => r.id === rackId);
        if (!invRack || invRack.quantity <= 0) {
            return res.status(400).json({ message: "Rack não encontrado no inventário." });
        }

        if (gameState.placedRacksPerRoom[roomIndex][slotIndex]) {
            return res.status(400).json({ message: "Já existe um rack nesta posição." });
        }

        const selectedRack = RACKS.find(r => r.id === rackId);
        if (!selectedRack) {
            return res.status(400).json({ message: "Tipo de rack inválido." });
        }

        // Atualiza o inventário
        invRack.quantity--;
        if (invRack.quantity === 0) {
            user.gameState.inventory.racks = user.gameState.inventory.racks.filter(r => r.id !== rackId);
        }

        // Coloca o rack na posição especificada
        gameState.placedRacksPerRoom[roomIndex][slotIndex] = {
            id: rackId,
            slots: selectedRack.slots,
            placedMiners: Array(selectedRack.slots).fill(null)
        };

        user.markModified('gameState');
        await user.save();
        
        res.json({ 
            gameState: user.gameState, 
            message: "Rack posicionado com sucesso!" 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor ao posicionar o rack.');
    }
});

// ROTA: POST /api/game/place-miner
router.post('/place-miner', protect, async (req, res) => {
    const { minerId, rackSlotIndex, minerSlotIndex, roomIndex } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const { gameState } = user;

        // Validações
        if (!gameState.placedRacksPerRoom[roomIndex] || 
            !gameState.placedRacksPerRoom[roomIndex][rackSlotIndex]) {
            return res.status(400).json({ message: "Rack não encontrado na posição especificada." });
        }

        const rack = gameState.placedRacksPerRoom[roomIndex][rackSlotIndex];
        if (minerSlotIndex >= rack.placedMiners.length) {
            return res.status(400).json({ message: "Slot de mineradora inválido." });
        }

        const invMiner = gameState.inventory.miners.find(m => m.id === minerId);
        if (!invMiner || invMiner.quantity <= 0) {
            return res.status(400).json({ message: "Mineradora não encontrada no inventário." });
        }

        if (rack.placedMiners[minerSlotIndex]) {
            return res.status(400).json({ message: "Já existe uma mineradora neste slot." });
        }

        const selectedMiner = MINERS.find(m => m.id === minerId);
        if (!selectedMiner) {
            return res.status(400).json({ message: "Tipo de mineradora inválido." });
        }

        // Atualiza o inventário
        invMiner.quantity--;
        if (invMiner.quantity === 0) {
            user.gameState.inventory.miners = user.gameState.inventory.miners.filter(m => m.id !== minerId);
        }

        // Coloca a mineradora no slot especificado
        rack.placedMiners[minerSlotIndex] = {
            id: minerId,
            power: selectedMiner.power
        };

        // Atualiza a potência total
        user.gameState.totalPower = calculateTotalPower(user.gameState.placedRacksPerRoom);

        user.markModified('gameState');
        await user.save();
        
        res.json({ 
            gameState: user.gameState, 
            message: "Mineradora instalada!" 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor ao instalar a mineradora.');
    }
});

// Função auxiliar para calcular a potência total
function calculateTotalPower(placedRacksPerRoom) {
    let totalPower = 0;
    placedRacksPerRoom.forEach(room => {
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
