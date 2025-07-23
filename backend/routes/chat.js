// backend/routes/chat.js

const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');
// const User = require('../models/User'); // << NÃO PRECISAMOS MAIS DESTA LINHA

// @route   POST /api/chat/send
// @desc    Envia uma nova mensagem para o chat
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ msg: 'A mensagem não pode estar vazia.' });
        }

        // CORREÇÃO: Pegamos o username diretamente do token decodificado pelo middleware,
        // o que é mais rápido e evita o erro.
        const username = req.user.username;
        if (!username) {
            return res.status(401).json({ msg: 'Token inválido ou não contém nome de usuário.' });
        }

        const newMessage = new ChatMessage({
            username: username,
            message: message.substring(0, 150) // Limita o tamanho da mensagem
        });

        await newMessage.save();
        res.status(201).json({ msg: 'Mensagem enviada.' });

    } catch (err) {
        console.error("Erro em /api/chat/send:", err.message);
        res.status(500).json({ msg: 'Erro no Servidor' });
    }
});

// @route   GET /api/chat/messages
// @desc    Busca as últimas mensagens do chat
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        const messages = await ChatMessage.find().sort({ $natural: 1 });
        res.json(messages);
    } catch (err) {
        console.error("Erro em /api/chat/messages:", err.message);
        res.status(500).json({ msg: 'Erro no Servidor' });
    }
});

module.exports = router;
