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
// ... (resto das definições de RACKS, etc.)

const validateGameState = (gameState) => {
    if (!gameState) return false;
    const requiredFields = ['balance', 'inventory', 'placedRacksPerRoom', 'energy', 'lastEnergyUpdate'];
    return requiredFields.every(field => gameState[field] !== undefined);
};

// ROTA /state com LOGS DE DEPURAÇÃO ADICIONADOS
router.get('/state', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // --- INÍCIO DOS LOGS DE DEPURAÇÃO ---
        console.log("--- [DEBUG] INICIANDO ROTA /STATE ---");
        
        const now = Date.now();
        const lastUpdate = user.gameState.lastEnergyUpdate || now;
        const secondsOffline = (now - lastUpdate) / 1000;

        console.log(`[DEBUG] Timestamp Atual (now): ${now}`);
        console.log(`[DEBUG] Último Update Salvo do DB (lastUpdate): ${lastUpdate}`);
        console.log(`[DEBUG] Segundos Offline Calculado: ${secondsOffline.toFixed(2)}s`);

        if (secondsOffline > 1) {
            const totalPower = calculateTotalPower(user.gameState.placedRacksPerRoom);
            console.log(`[DEBUG] Poder Total (totalPower) calculado: ${totalPower}`);
            console.log(`[DEBUG] Energia Antes do Cálculo: ${user.gameState.energy}`);

            if (totalPower > 0 && user.gameState.energy > 0) {
                const BASE_ENERGY_PER_POWER_SECOND = 0.015;
                const energyConsumptionRate = totalPower * BASE_ENERGY_PER_POWER_SECOND;
                const secondsOfMiningPossible = user.gameState.energy / energyConsumptionRate;
                const secondsMined = Math.min(secondsOffline, secondsOfMiningPossible);

                console.log(`[DEBUG] Segundos Reais de Mineração Possível: ${secondsMined.toFixed(2)}s`);

                if (secondsMined > 0) {
                    const coinsEarned = totalPower * secondsMined;
                    const energyConsumed = secondsMined * energyConsumptionRate;

                    console.log(`[DEBUG] Moedas a serem adicionadas: ${coinsEarned.toFixed(2)}`);
                    console.log(`[DEBUG] Energia a ser consumida: ${energyConsumed.toFixed(2)}`);

                    user.gameState.balance += coinsEarned;
                    user.gameState.energy -= energyConsumed;
                    if (user.gameState.energy < 0) user.gameState.energy = 0;
                }
            } else {
                console.log("[DEBUG] Cálculo de ganhos PULADO: Sem poder de mineração ou sem energia.");
            }
        } else {
            console.log("[DEBUG] Cálculo de ganhos PULADO: Tempo offline menor que 1 segundo.");
        }
        
        user.gameState.lastEnergyUpdate = now;
        user.markModified('gameState');
        await user.save();
        
        console.log("[DEBUG] Estado do jogo SALVO no banco de dados.");
        console.log("--- [DEBUG] FIM DA ROTA /STATE ---");

        res.json({
            username: user.username,
            gameState: user.gameState,
            currentRoomIndex: user.currentRoomIndex || 0
        });

    } catch (err) {
        console.error("--- [ERRO GRAVE NA ROTA /STATE] ---", err);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// ... (resto do seu arquivo game.js sem alterações) ...
// (As funções /update, /buy-item, /buy-room e calculateTotalPower continuam iguais ao código anterior)
// ... (Copie o resto do arquivo da sua versão anterior) ...
