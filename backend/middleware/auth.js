// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
    // Pega o token do cabeçalho da requisição
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    // Verifica se não há token
    if (!token) {
        return res.status(401).json({ msg: 'Não há token, autorização negada.' });
    }

    // Verifica o token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // CORREÇÃO: Em vez de procurar por 'decoded.user',
        // nós agora pegamos todo o conteúdo decodificado do token.
        // Isso é mais robusto e compatível com a forma como seu token é criado.
        req.user = decoded.user || decoded; 

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token não é válido.' });
    }
};
