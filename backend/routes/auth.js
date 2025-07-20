const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Certifique-se de que o caminho para o seu modelo User está correto

// Rota de Registo
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body; // Obter username e password do corpo do pedido

        // Verificar se o utilizador já existe
        let user = await User.findOne({ username });
        if (user) {
            console.warn(`Tentativa de registro de usuário já existente: ${username}`);
            return res.status(400).json({ msg: 'Utilizador já existe.' });
        }

        // Criar hash da palavra-passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Criar novo utilizador
        user = new User({
            username,
            password: hashedPassword,
            // Inicializar dados do jogo para um novo utilizador
            lulaCoins: 0,
            miningPower: 1,
            upgrades: {} // Ou um array vazio, dependendo de como definiu no seu modelo
        });

        await user.save(); // Guardar o novo utilizador na base de dados

        console.log(`Usuário registrado com sucesso: ${username}`);
        res.status(201).json({ msg: 'Utilizador registado com sucesso!' });

    } catch (err) {
        console.error('Erro no registo do utilizador:', err.message);
        res.status(500).send('Erro do Servidor');
    }
});

// Rota de Início de Sessão
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body; // Obter username e password do corpo do pedido

        // Verificar se o utilizador existe
        let user = await User.findOne({ username });
        if (!user) {
            console.warn(`Tentativa de login com usuário não encontrado: ${username}`);
            return res.status(400).json({ msg: 'Credenciais inválidas.' });
        }

        // Validar palavra-passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`Tentativa de login com senha incorreta para: ${username}`);
            return res.status(400).json({ msg: 'Credenciais inválidas.' });
        }

        // Criar e enviar Token JWT
        const payload = {
            user: {
                id: user.id
            }
        };

        if (!process.env.JWT_SECRET) {
            console.error('Erro: JWT_SECRET não está definido nas variáveis de ambiente!');
            return res.status(500).json({ msg: 'Erro de configuração do servidor.' });
        }

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expira em 1 hora
            (err, token) => {
                if (err) {
                    console.error('Erro ao gerar token JWT:', err.message);
                    throw err;
                }
                console.log(`Usuário logado com sucesso: ${username}`);
                res.json({
                    token,
                    // Incluir dados do jogo no login para carregar o estado inicial do cliente
                    gameData: {
                        coins: user.lulaCoins,
                        miningPower: user.miningPower,
                        upgrades: user.upgrades // Certifique-se de que o campo 'upgrades' existe no seu modelo User
                    }
                });
            }
        );

    } catch (err) {
        console.error('Erro no login do utilizador:', err.message);
        res.status(500).send('Erro do Servidor');
    }
});

module.exports = router;
