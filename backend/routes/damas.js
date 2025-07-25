const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const DamasGame = require('../models/DamasGame');

let matchmakingQueue = [];

// Rota para entrar na fila do jogo de damas
router.post('/matchmaking/join', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "Usuário da requisição não foi encontrado." });
        }

        // ✅ CORREÇÃO: Usando 'lulaCoinGameState' em vez de 'gameState'.
        if (!user.lulaCoinGameState || typeof user.lulaCoinGameState.balance === 'undefined' || user.lulaCoinGameState.balance < 25) {
            return res.status(400).json({ message: "Você precisa de pelo menos 25 LCO para jogar." });
        }

        await DamasGame.updateMany(
            { 'players.userId': req.user.id, status: 'active' },
            { $set: { status: 'abandoned' } }
        );
        
        if (matchmakingQueue.find(p => p.userId.toString() === req.user.id)) {
            return res.status(200).json({ message: "Você já está na fila." });
        }

        matchmakingQueue.push({ userId: req.user.id, username: user.username });

        if (matchmakingQueue.length >= 2) {
            const player1Data = matchmakingQueue.shift();
            const player2Data = matchmakingQueue.shift();

            const player1 = await User.findById(player1Data.userId);
            const player2 = await User.findById(player2Data.userId);
            
            if (!player1 || !player2) {
                console.error("Erro crítico: Um dos jogadores da fila não foi encontrado no DB.");
                if(player1Data) matchmakingQueue.unshift(player1Data);
                if(player2Data) matchmakingQueue.unshift(player2Data);
                return res.status(500).json({ message: 'Erro ao formar a partida, tente novamente.'});
            }

            // ✅ CORREÇÃO: Usando 'lulaCoinGameState' para descontar a aposta.
            player1.lulaCoinGameState.balance -= 25;
            player2.lulaCoinGameState.balance -= 25;
            await player1.save();
            await player2.save();
            
            const initialBoardState = [
                [0, 2, 0, 2, 0, 2, 0, 2],
                [2, 0, 2, 0, 2, 0, 2, 0],
                [0, 2, 0, 2, 0, 2, 0, 2],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0],
                [1, 0, 1, 0, 1, 0, 1, 0],
                [0, 1, 0, 1, 0, 1, 0, 1],
                [1, 0, 1, 0, 1, 0, 1, 0]
            ];

            const newGame = new DamasGame({
                players: [
                    { userId: player1._id, username: player1.username, color: 'p1' },
                    { userId: player2._id, username: player2.username, color: 'p2' }
                ],
                boardState: initialBoardState,
                currentTurn: 1, 
            });

            await newGame.save();
        }
        
        res.status(200).json({ message: "Procurando partida..." });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

router.get('/matchmaking/status', auth, async (req, res) => {
    try {
        const game = await DamasGame.findOne({ 'players.userId': req.user.id, status: 'active' });
        if (game) {
            res.json({ matchFound: true, gameId: game._id });
        } else {
            res.json({ matchFound: false });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

router.get('/game/state/:id', auth, async (req, res) => {
    try {
        const game = await DamasGame.findById(req.params.id);
        if (!game) return res.status(404).json({ message: 'Partida não encontrada.' });
        res.json(game);
    } catch (err) {
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

router.post('/game/move/:id', auth, async (req, res) => {
    try {
        const { boardState, nextTurn, winner } = req.body;
        const game = await DamasGame.findById(req.params.id);
        if (!game) return res.status(404).json({ message: 'Partida não encontrada.' });

        game.boardState = boardState;
        game.currentTurn = nextTurn;

        if (winner) {
            game.status = 'finished';
            const winnerData = game.players.find(p => p.color === winner);
            game.winner = winnerData.username;
            
            const winnerUser = await User.findById(winnerData.userId);
            if(winnerUser) {
                // ✅ CORREÇÃO: Usando 'lulaCoinGameState' para pagar o prêmio.
                winnerUser.lulaCoinGameState.balance += 50;
                await winnerUser.save();
            }
        }
        
        await game.save();
        res.json(game);

    } catch (err) {
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

router.post('/game/emoji/:id', auth, async (req, res) => {
    try {
        const { emoji, playerColor } = req.body;
        const game = await DamasGame.findById(req.params.id);
        if (!game) return res.status(404).json({ message: 'Partida não encontrada.' });

        game.lastEmoji = {
            emoji: emoji,
            sender: playerColor,
            timestamp: new Date()
        };
        
        await game.save();
        res.status(200).json({ message: 'Emoji enviado!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

module.exports = router;
