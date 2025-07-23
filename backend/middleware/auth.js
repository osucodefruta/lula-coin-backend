// backend/middleware/auth.js (VERSÃO FINAL LIMPA E FUNCIONAL)

const jwt = require('jsonwebtoken');

// A linha 'require('dotenv').config()' foi removida pois já é chamada no server.js

module.exports = function(req, res, next) {
    // Pega o token do cabeçalho da requisição (Ex: "Bearer TOKEN...")
    const authHeader = req.header('Authorization');
    
    // Checa se o cabeçalho existe e o divide para pegar apenas o token
    const token = authHeader && authHeader.split(' ')[1];

    // Se não houver token, nega o acesso
    if (!token) {
        return res.status(401).json({ msg: 'Não há token, autorização negada.' });
    }

    // Se houver token, verifica se é válido
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Anexa as informações do usuário ao objeto da requisição (req)
        req.user = decoded.user || decoded; 

        // Permite que a requisição continue para a rota principal
        next();
    } catch (err) {
        // Se o token for inválido (assinatura errada ou expirado), nega o acesso
        res.status(401).json({ msg: 'Token não é válido.' });
    }
};
