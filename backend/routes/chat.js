// backend/routes/chat.js

const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// @route   POST /api/chat/send
// @desc    Envia uma nova mensagem para o chat
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ msg: 'A mensagem não pode estar vazia.' });
        }

        const user = await User.findById(req.user.id).select('username');
        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado.' });
        }

        const newMessage = new ChatMessage({
            username: user.username,
            message: message.substring(0, 150)
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
    } catch (err) { // << CORREÇÃO: A chave { que faltava foi adicionada aqui.
        console.error("Erro em /api/chat/messages:", err.message);
        res.status(500).json({ msg: 'Erro no Servidor' });
    }
});

module.exports = router;
