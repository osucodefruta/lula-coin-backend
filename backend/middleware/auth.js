// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
    // Pega o token do cabeçalho da requisição (Ex: "Bearer TOKEN...")
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    // Se não houver token, nega o acesso
    if (!token) {
        return res.status(401).json({ msg: 'Não há token, autorização negada.' });
    }

    // Se houver token, verifica se é válido
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Esta linha é a mais importante: ela pega as informações do token
        // e as anexa ao pedido (req) para que as próximas rotas saibam quem é o usuário.
        req.user = decoded.user || decoded; 

        next(); // Permite que a requisição continue para a rota do jogo/chat
    } catch (err) {
        // Se o token for inválido ou expirado, nega o acesso
        res.status(401).json({ msg: 'Token não é válido.' });
    }
};
