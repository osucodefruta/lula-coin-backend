// backend/routes/game.js (VERSÃO FINAL COM ARQUITETURA E CÁLCULOS CORRIGIDOS)
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); 
const User = require('../models/User');

// --- Definições do Jogo (Constantes) ---
// Certifique-se de que estas listas são as mesmas que você tem no seu frontend
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

function calculateTotalPower(placedRacksPerRoom) {
    let totalPower = 0;
    if (!placedRacksPerRoom || !Array.isArray(placedRacksPerRoom)) return 0;
    placedRacksPerRoom.forEach(room => {
        if (room && Array.isArray(room)) {
            room.forEach(rack => {
                if (rack && rack.placedMiners && Array.isArray(rack.placedMiners)) {
                    rack.placedMiners.forEach(miner => {
                        if (miner) {
                            const minerConfig = MINERS.find(m => m.id === miner.id);
                            if (minerConfig) totalPower += minerConfig.power;
                        }
                    });
                }
            });
        }
    });
    return totalPower;
}

const validateGameState = (gameState) => {
    if (!gameState) return false;
    const requiredFields = ['balance', 'inventory', 'placedRacksPerRoom', 'energy', 'lastEnergyUpdate'];
    return requiredFields.every(field => gameState[field] !== undefined);
};

// ROTA /state - APENAS CALCULA E RETORNA, NÃO SALVA
router.get('/state', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

        const now = Date.now();
        const lastUpdate = user.gameState.lastEnergyUpdate || now;
        const secondsOffline = (now - lastUpdate) / 1000;

        // Cria uma cópia profunda para evitar modificar o objeto original do Mongoose
        let updatedGameState = JSON.parse(JSON.stringify(user.gameState)); 

        if (secondsOffline > 1) {
            const totalPower = calculateTotalPower(user.gameState.placedRacksPerRoom);
            if (totalPower > 0 && user.gameState.energy > 0) {
                // Usando as mesmas taxas do seu frontend para consistência
                const LCO_PER_THS_PER_MINUTE = 0.1;
                const ENERGY_CONSUMPTION_RATE = 100 / 600;

                const lcoPerSecond = totalPower * (LCO_PER_THS_PER_MINUTE / 60);
                // A fórmula de consumo offline precisa ser mais simples e consistente
                const energyConsumptionPerSecond = ENERGY_CONSUMPTION_RATE;

                const secondsOfMiningPossible = user.gameState.energy / energyConsumptionPerSecond;
                const secondsMined = Math.min(secondsOffline, secondsOfMiningPossible);

                if (secondsMined > 0) {
                    const coinsEarned = lcoPerSecond * secondsMined;
                    const energyConsumed = energyConsumptionPerSecond * secondsMined;
                    
                    updatedGameState.balance += coinsEarned;
                    updatedGameState.energy -= energyConsumed;
                    if (updatedGameState.energy < 0) updatedGameState.energy = 0;
                }
            }
        }
        
        res.json({
            username: user.username,
            gameState: updatedGameState,
            currentRoomIndex: user.currentRoomIndex || 0
        });

    } catch (err) {
        console.error("--- [ERRO GRAVE NA ROTA /STATE] ---", err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// ROTA /update - ÚNICA RESPONSÁVEL POR SALVAR E ATUALIZAR O TIMESTAMP
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const { gameState, currentRoomIndex } = req.body;
        
        // Atualiza o timestamp para o momento exato do salvamento
        gameState.lastEnergyUpdate = Date.now();

        if (!validateGameState(gameState)) {
            return res.status(400).json({ message: 'Estado do jogo inválido.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { 
                gameState: gameState, 
                currentRoomIndex: currentRoomIndex || 0 
            }},
            { new: true }
        ).select('-password');

        res.json({ message: 'Jogo salvo com sucesso!', gameState: user.gameState });
    } catch (err) {
        console.error("Erro na rota /update:", err.message);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// --- ROTAS DE COMPRA E SALA ---
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
        res.json({ message: `${itemConfig.name} comprado!`, gameState: user.gameState });
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor ao comprar item' });
    }
});

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
        res.json({ gameState: user.gameState, message: `Sala comprada por ${cost} LCO!` });
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor ao comprar sala.' });
    }
});

module.exports = router;
