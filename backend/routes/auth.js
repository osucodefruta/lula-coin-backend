const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Garanta que o caminho para seu modelo User está correto
const { body, validationResult } = require('express-validator'); // << ADICIONADO

const router = express.Router();

// Rota de Registro com Validação
router.post('/register',
    // --- Regras de Validação Começam Aqui ---
    body('username')
        .isLength({ min: 3 }).withMessage('O nome de usuário precisa ter no mínimo 3 caracteres.')
        .trim()
        .escape(),

    body('password')
        .isLength({ min: 5 }).withMessage('A senha precisa ter no mínimo 5 caracteres.'),
    // --- Regras de Validação Terminam Aqui ---

    async (req, res) => {
        // Verifica se houve erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Se houver erros, retorna uma mensagem de erro 400 (Bad Request)
            return res.status(400).json({ message: errors.array()[0].msg }); // Retorna a primeira mensagem de erro
        }

        try {
            const { username, password } = req.body;

            let user = await User.findOne({ username });
            if (user) {
                return res.status(400).json({ message: 'Usuário já existe.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({
                username,
                password: hashedPassword,
                // O gameState inicial é definido automaticamente pelo Schema
            });

            await user.save();
            res.status(201).json({ message: 'Usuário registrado com sucesso!' });

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Erro no servidor');
        }
    }
);

// Rota de Login com Validação
router.post('/login',
    // Validação simples para garantir que os campos não estão vazios
    body('username').notEmpty().withMessage('O nome de usuário é obrigatório.').escape(),
    body('password').notEmpty().withMessage('A senha é obrigatória.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }

        try {
            const { username, password } = req.body;

            const user = await User.findOne({ username });
            if (!user) {
                return res.status(400).json({ message: 'Credenciais inválidas.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Credenciais inválidas.' });
            }

            const payload = {
                user: {
                    id: user.id
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '7d' }, // Token expira em 7 dias
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Erro no servidor');
        }
    }
);

module.exports = router;
