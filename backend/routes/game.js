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
    { id: 'rack002', name: 'Rack Médio', slots: 3, price: 30 },
    { id: 'rack003', name: 'Rack Grande', slots: 4, price: 100 },
];

const validateGameState = (gameState) => {
    if (!gameState) return false;
    // Adicionado energy e lastEnergyUpdate à validação
    const requiredFields = ['balance', 'inventory', 'placedRacksPerRoom', 'energy', 'lastEnergyUpdate'];
    return requiredFields.every(field => gameState[field] !== undefined);
};

// ROTA ATUALIZADA com Lógica de Mineração e Energia Offline
router.get('/state', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // --- INÍCIO: CÁLCULO DE GANHOS E CONSUMO OFFLINE ---
        const now = Date.now();
        // Usa o lastEnergyUpdate para saber a última vez que o jogador esteve ativo
        const lastUpdate = user.gameState.lastEnergyUpdate || now;
        const secondsOffline = (now - lastUpdate) / 1000;

        // Só executa o cálculo se o jogador ficou offline por mais de um segundo
        if (secondsOffline > 1) {
            const totalPower = calculateTotalPower(user.gameState.placedRacksPerRoom);
            
            // A energia só é consumida se houver poder de mineração
            if (totalPower > 0 && user.gameState.energy > 0) {
                const energyConsumptionRate = 100 / 600; // 100% em 10 minutos (600 segundos)

                // Calcula por quantos segundos a energia restante duraria
                const secondsOfMiningPossible = user.gameState.energy / energyConsumptionRate;
                
                // O tempo real que minerou é o menor valor entre o tempo offline e o tempo que tinha energia
                const secondsMined = Math.min(secondsOffline, secondsOfMiningPossible);

                if (secondsMined > 0) {
                    // Calcula as moedas ganhas nesse período
                    const lcoPerSecond = (totalPower * (0.1 / 60)); // 0.1 LCO/TH/minuto -> convertido para segundos
                    const coinsEarned = lcoPerSecond * secondsMined;
                    
                    // Calcula a energia consumida nesse período
                    const energyConsumed = secondsMined * energyConsumptionRate;

                    // Atualiza o estado do jogo
                    user.gameState.balance += coinsEarned;
                    user.gameState.energy -= energyConsumed;
                    if (user.gameState.energy < 0) user.gameState.energy = 0;
                }
            }
        }
        
        // Atualiza o timestamp para o momento atual, para o próximo cálculo offline
        user.gameState.lastEnergyUpdate = now;
        
        // Salva as alterações no banco de dados ANTES de enviar para o jogador
        await user.save();

        // --- FIM: CÁLCULO DE GANHOS E CONSUMO OFFLINE ---

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

        // Garante que o timestamp seja atualizado em qualquer salvamento
        gameState.lastEnergyUpdate = Date.now();

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
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
        
        const itemConfig = (category === 'miners' ? MINERS : RACKS).find(i => i.id === itemId);
        if (!itemConfig) return res.status(404).json({ message: 'Item não encontrado.' });
        
        if (user.gameState.balance < itemConfig.price) return res.status(400).json({ message: 'Saldo insuficiente.' });
        
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
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

        if (user.gameState.balance < cost) return res.status(400).json({ message: "Saldo insuficiente!" });

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
