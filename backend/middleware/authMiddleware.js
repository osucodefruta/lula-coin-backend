// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Verifica se o token está no cabeçalho de autorização e se começa com "Bearer"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extrai o token do cabeçalho (formato: "Bearer TOKEN")
            token = req.headers.authorization.split(' ')[1];

            // Verifica se o token é válido usando o segredo JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Busca o usuário pelo ID contido no token e anexa ao objeto da requisição
            // O `-password` remove o campo de senha do resultado da busca
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                 return res.status(401).json({ message: 'Usuário não encontrado.' });
            }

            next(); // Continua para a próxima função (a rota do jogo)
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Não autorizado, token falhou.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Não autorizado, sem token.' });
    }
};

module.exports = { protect };

