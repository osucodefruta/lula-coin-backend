// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Certifique-se de que o caminho para o modelo User está correto

module.exports = async function (req, res, next) {
    // Obter o token do cabeçalho de autorização
    // Espera-se que o cabeçalho seja "Bearer SEU_TOKEN"
    const token = req.header('Authorization')?.split(' ')[1];

    // Se não houver token, retorna erro 401 (Não Autorizado)
    if (!token) {
        return res.status(401).json({ message: 'Token de autenticação ausente. Por favor, faça login.' });
    }

    try {
        // Verificar o token usando o segredo JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // AQUI ESTÁ A MUDANÇA PRINCIPAL:
        // Seu token JWT está sendo gerado com um payload de { user: { id: user.id } }.
        // Então, você precisa acessar decoded.user.id
        // Se o token foi gerado com payload { id: user.id }, você usaria decoded.id
        // Validamos que user e id existem no payload decodificado
        if (!decoded || !decoded.user || !decoded.user.id) {
            return res.status(401).json({ message: 'Token inválido ou com formato incorreto. Por favor, faça login novamente.' });
        }

        // Buscar o usuário pelo ID decodificado e anexá-lo ao objeto de requisição
        // Excluímos a senha do objeto de usuário retornado
        req.user = await User.findById(decoded.user.id).select('-password');

        // Se o usuário não for encontrado (ex: usuário deletado, token antigo),
        // também é um caso de falha de autenticação.
        if (!req.user) {
            return res.status(401).json({ message: 'Usuário não encontrado. Token válido, mas usuário inexistente.' });
        }

        // Chamar a próxima função middleware ou rota
        next();
    } catch (err) {
        // Capturar erros de verificação do token (expirado, inválido, etc.)
        console.error('Erro de verificação do token:', err.message);
        return res.status(401).json({ message: 'Token inválido ou expirado. Por favor, faça login novamente.' });
    }
};
