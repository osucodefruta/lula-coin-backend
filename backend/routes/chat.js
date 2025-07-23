// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage'); // Criaremos este modelo a seguir
const authMiddleware = require('../middleware/auth'); // Para saber quem está enviando

// @route   POST /api/chat/send
// @desc    Envia uma nova mensagem para o chat
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ msg: 'A mensagem não pode estar vazia.' });
        }

        // O `req.user.id` vem do nosso middleware de autenticação
        const user = await User.findById(req.user.id).select('username');

        const newMessage = new ChatMessage({
            username: user.username,
            message: message.substring(0, 150) // Limita o tamanho da mensagem
        });

        await newMessage.save();
        res.status(201).json({ msg: 'Mensagem enviada.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no Servidor');
    }
});

// @route   GET /api/chat/messages
// @desc    Busca as últimas mensagens do chat
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        // Como é uma Capped Collection, o find() já retorna na ordem de inserção.
        const messages = await ChatMessage.find().sort({ $natural: 1 });
        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no Servidor');
    }
});

module.exports = router;
