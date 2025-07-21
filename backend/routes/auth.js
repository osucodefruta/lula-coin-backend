// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Certifique-se de que o caminho para o modelo User está correto
const jwtSecret = process.env.JWT_SECRET; // Carrega o segredo JWT do .env

// Rota de Registro
router.post('/register', async (req, res) => {
    const { username, password } = req.body; // 'username' será o email

    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Usuário já existe.' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Criação de um novo usuário com dados iniciais para o jogo
        user = new User({
            username,
            password: hashedPassword,
            lulaCoins: 0,
            level: 1,
            minerValue: 1,
            totalHashrate: 0,
            inventory: { gpus: [], upgrades: [] },
            placedGpus: {}
        });

        await user.save(); // Salva o novo usuário diretamente

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });

    } catch (err) {
        console.error('Erro no registro:', err.message);
        res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
    }
});

// Rota de Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // Se as credenciais estiverem corretas, gera o token JWT
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '1h' }, // Token expira em 1 hora
            (err, token) => {
                if (err) throw err;
                res.json({ token, username: user.username }); // Retorna o token e o username (email)
            }
        );

    } catch (err) {
        console.error('Erro no login:', err.message);
        res.status(500).json({ message: 'Erro no servidor. Tente novamente mais tarde.' });
    }
});

module.exports = router;
