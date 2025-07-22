// NOME DO ARQUIVO: routes/ranking.js

const express = require('express');
const router = express.Router();
// Ajuste o caminho se o seu modelo de User estiver em outro lugar
const User = require('../models/User');

/**
 * @route   GET /api/ranking/top5/balance
 * @desc    Retorna os 5 jogadores com maior saldo (LCO)
 * @access  Public
 */
router.get('/top5/balance', async (req, res) => {
    try {
        // Busca os usuários, ordena por saldo (maior para menor), limita a 5
        // e seleciona apenas os campos que precisamos para ser mais eficiente.
        const topPlayers = await User.find({})
            .sort({ 'gameState.balance': -1 })
            .limit(5)
            .select('username gameState.balance');

        res.json(topPlayers);

    } catch (err) {
        console.error("Erro ao buscar ranking:", err.message);
        res.status(500).send('Erro no Servidor');
    }
});

module.exports = router;
