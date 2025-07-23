// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Este é o "ajudante" que verifica se o usuário está logado
// antes de permitir que ele envie uma mensagem no chat.
module.exports = function(req, res, next) {
    // Pega o token do cabeçalho da requisição
    const token = req.header('Authorization')?.split(' ')[1];

    // Verifica se não há token
    if (!token) {
        return res.status(401).json({ msg: 'Não há token, autorização negada.' });
    }

    // Verifica o token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token não é válido.' });
    }
};
