const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Rota para carregar o estado do jogo da fazenda
router.get('/state', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        // Retorna AMBOS os estados para termos o saldo de LCO disponível
        res.json({
            fazendaGameState: user.fazendaGameState,
            lulaCoinGameState: user.lulaCoinGameState
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

// Rota para salvar o estado do jogo da fazenda
router.post('/update', auth, async (req, res) => {
    try {
        const { newFarmState } = req.body;
        await User.findByIdAndUpdate(req.user.id, {
            $set: { fazendaGameState: newFarmState }
        });
        res.status(200).json({ message: 'Progresso da fazenda salvo!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor ao salvar' });
    }
});

// Rota especial para comprar terreno com LULACOINS
router.post('/buy-land', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const lcoBalance = user.lulaCoinGameState.balance;
        const landPrice = user.fazendaGameState.precoTerreno;

        if (lcoBalance < landPrice) {
            return res.status(400).json({ message: 'LulaCoins insuficientes!' });
        }

        // Debita LulaCoins e atualiza o estado da fazenda
        user.lulaCoinGameState.balance -= landPrice;
        user.fazendaGameState.terrenosComprados += 1;
        user.fazendaGameState.precoTerreno += 250; // Aumenta o preço do próximo

        // Informa ao Mongoose que os objetos aninhados foram modificados
        user.markModified('lulaCoinGameState');
        user.markModified('fazendaGameState');

        await user.save();

        // Retorna ambos os estados atualizados
        res.json({
            message: 'Terreno comprado com sucesso!',
            lulaCoinGameState: user.lulaCoinGameState,
            fazendaGameState: user.fazendaGameState
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro no servidor ao comprar terreno' });
    }
});

module.exports = router;
