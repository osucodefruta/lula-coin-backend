// backend/routes/chat.js (VERSÃO FINAL SEGURA E FUNCIONAL)

const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Envia uma nova mensagem para o chat
router.post('/send',
    authMiddleware,
    body('message')
        .notEmpty().withMessage('A mensagem não pode estar vazia.')
        .isLength({ max: 200 }).withMessage('A mensagem não pode ter mais de 200 caracteres.')
        .trim()
        .escape(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        try {
            const { message } = req.body;
            const username = req.user.username;

            if (!username) {
                console.warn("Token válido mas sem username:", req.user);
                return res.status(401).json({ message: 'Token inválido: nome de usuário ausente.' });
            }

            const newMessage = new ChatMessage({
                username,
                message
            });

            await newMessage.save();
            res.status(201).json(newMessage);

        } catch (err) {
            console.error("Erro em /api/chat/send:", err.message);
            res.status(500).json({ message: 'Erro no servidor' });
        }
    }
);

// Busca as últimas mensagens do chat
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        const messages = await ChatMessage.find().sort({ timestamp: -1 }).limit(50);
        res.json(messages.reverse());
    } catch (err) {
        console.error("Erro em /api/chat/messages:", err.message);
        res.status(500).json({ message: 'Erro no servidor' });
    }
});

module.exports = router;

