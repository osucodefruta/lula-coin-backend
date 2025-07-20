const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

// Função para registrar um novo usuário (dentro do router)
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Altere para email: username se o seu modelo User usa 'email' como campo de login
        const existingUser = await User.findOne({ email: username }); 
        if (existingUser) {
            console.warn(`Tentativa de registro de usuário já existente: ${username}`);
            return res.status(400).json({ message: 'Nome de usuário já existe.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            // Altere para email: username se o seu modelo User usa 'email' como campo de login
            email: username, 
            password: hashedPassword,
            lulaCoins: 0, 
            level: 1,
            minerValue: 1
        });
        await newUser.save();

        console.log(`Usuário registrado com sucesso: ${username}`);
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });

    } catch (error) {
        console.error('Erro no registro do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor durante o registro.' });
    }
});

// Função para fazer login (dentro do router)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Altere para email: username se o seu modelo User usa 'email' como campo de login
        const user = await User.findOne({ email: username }); 
        if (!user) {
            console.warn(`Tentativa de login com usuário não encontrado: ${username}`);
            return res.status(400).json({ message: 'Nome de usuário ou senha inválidos.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`Tentativa de login com senha incorreta para: ${username}`);
            return res.status(400).json({ message: 'Nome de usuário ou senha inválidos.' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('Erro: Variável de ambiente JWT_SECRET não definida!');
            return res.status(500).json({ message: 'Configuração do servidor incompleta.' });
        }

        const token = jwt.sign(
            // Altere para email: user.email se o seu modelo User usa 'email' como campo de login
            { id: user._id, email: user.email, username: username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        console.log(`Usuário logado com sucesso: ${username}`);
        // Altere para username: user.email se o seu modelo User usa 'email' como campo de login
        res.json({ token, username: user.email, lulaCoins: user.lulaCoins, level: user.level, minerValue: user.minerValue }); 

    } catch (error) {
        console.error('Erro no login do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor durante o login.' });
    }
});

module.exports = router;
