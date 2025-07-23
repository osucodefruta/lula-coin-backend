// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ROTA: POST /api/auth/register
// Função: Registrar um novo usuário.
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Verifica se o usuário já existe
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Usuário já existe.' });
        }

        // Cria um novo usuário com base no modelo
        user = new User({
            username,
            password,
            // O gameState inicial é definido por padrão no modelo
        });

        // Criptografa a senha antes de salvar
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Salva o usuário no banco de dados
        await user.save();

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

// ROTA: POST /api/auth/login
// Função: Autenticar um usuário e retornar um token.
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Verifica se o usuário existe
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // Compara a senha enviada com a senha criptografada no banco
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // --- CORREÇÃO AQUI ---
        // Cria o payload para o token JWT, agora incluindo também o username.
        const payload = {
            user: {
                id: user.id,
                username: user.username // Adicionamos o nome de usuário ao token
            }
        };

        // Gera e assina o token JWT
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' }, // Token expira em 24 horas (está ótimo)
            (err, token) => {
                if (err) throw err;
                // Retorna o token para o cliente
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

module.exports = router;
