
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Campos obrigatórios faltando' });

        const exists = await User.findOne({ email: username });
        if (exists) return res.status(400).json({ message: 'Usuário já registrado' });

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ email: username, password: hashed });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (err) {
        console.error("Erro no registro:", err);
        res.status(500).json({ message: 'Erro interno ao registrar' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Campos obrigatórios faltando' });

        const user = await User.findOne({ email: username });
        if (!user) return res.status(400).json({ message: 'Usuário não encontrado' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: 'Senha incorreta' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ message: 'Erro interno ao logar' });
    }
});

module.exports = router;
