// backend/routes/chat.js (ATUALIZADO E SEGURO)

const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator'); // << ADICIONADO

// @route   POST /api/chat/send
// @desc    Envia uma nova mensagem para o chat (AGORA COM VALIDAÇÃO E SANITIZAÇÃO)
router.post('/send', 
    authMiddleware, 
    // --- Início das Regras de Segurança ---
    body('message')
        .notEmpty().withMessage('A mensagem não pode estar vazia.')
        .isLength({ max: 200 }).withMessage('A mensagem não pode ter mais de 200 caracteres.')
        .trim()      // Remove espaços em branco no início e no fim
        .escape(),   // << CONVERTE CARACTERES HTML (<, >) EM TEXTO SEGURO
    // --- Fim das Regras de Segurança ---
    async (req, res) => {
        // Verifica se as regras de validação encontraram algum erro
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            // A mensagem já foi limpa e validada. Podemos usá-la com segurança.
            const { message } = req.body;
            const username = req.user.username;
            
            if (!username) {
                // Esta verificação é uma segurança extra, mas o authMiddleware já deve garantir isso.
                return res.status(401).json({ msg: 'Token inválido ou não contém nome de usuário.' });
            }

            const newMessage = new ChatMessage({
                username: username,
                message: message // A mensagem já está sanitizada
            });

            await newMessage.save();
            // A resposta é um pouco diferente para se alinhar com a forma como o frontend vai consumir
            res.status(201).json(newMessage);

        } catch (err) {
            console.error("Erro em /api/chat/send:", err.message);
            res.status(500).json({ msg: 'Erro no Servidor' });
        }
    }
);

// @route   GET /api/chat/messages
// @desc    Busca as últimas mensagens do chat
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        // A ordenação foi alterada para buscar as 50 mais recentes
        const messages = await ChatMessage.find().sort({ timestamp: -1 }).limit(50);
        res.json(messages.reverse()); // Inverte para exibir na ordem correta (antiga para nova)
    } catch (err) {
        console.error("Erro em /api/chat/messages:", err.message);
        res.status(500).json({ msg: 'Erro no Servidor' });
    }
});

module.exports = router;
