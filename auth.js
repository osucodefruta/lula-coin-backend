const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Certifique-se de que o caminho para o seu modelo User está correto

// Função para registrar um novo usuário
async function registerUser(req, res) {
    const { username, password } = req.body;

    // Adicionado tratamento de erro com try-catch
    try {
        // 1. Verificar se o usuário já existe
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.warn(`Tentativa de registro de usuário já existente: ${username}`);
            return res.status(400).json({ message: 'Nome de usuário já existe.' });
        }

        // 2. Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Criar e salvar o novo usuário
        const newUser = new User({
            username,
            password: hashedPassword,
            lulaCoins: 0, // Inicia com 0 LulaCoins
            level: 1,
            minerValue: 1
        });
        await newUser.save();

        console.log(`Usuário registrado com sucesso: ${username}`);
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });

    } catch (error) {
        // Captura qualquer erro que ocorra durante o processo
        console.error('Erro no registro do usuário:', error);
        // Envia uma resposta de erro 500 para o cliente
        res.status(500).json({ message: 'Erro interno do servidor durante o registro.' });
    }
}

// Função para fazer login
async function loginUser(req, res) {
    const { username, password } = req.body;

    // Adicionado tratamento de erro com try-catch
    try {
        // 1. Encontrar o usuário
        const user = await User.findOne({ username });
        if (!user) {
            console.warn(`Tentativa de login com usuário não encontrado: ${username}`);
            return res.status(400).json({ message: 'Nome de usuário ou senha inválidos.' });
        }

        // 2. Comparar a senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`Tentativa de login com senha incorreta para: ${username}`);
            return res.status(400).json({ message: 'Nome de usuário ou senha inválidos.' });
        }

        // 3. Gerar JWT
        // Verifica se process.env.JWT_SECRET está definido
        if (!process.env.JWT_SECRET) {
            console.error('Erro: Variável de ambiente JWT_SECRET não definida!');
            return res.status(500).json({ message: 'Configuração do servidor incompleta.' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET, // Sua chave secreta
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        console.log(`Usuário logado com sucesso: ${username}`);
        res.json({ token, username: user.username, lulaCoins: user.lulaCoins, level: user.level, minerValue: user.minerValue });

    } catch (error) {
        // Captura qualquer erro que ocorra durante o processo
        console.error('Erro no login do usuário:', error);
        // Envia uma resposta de erro 500 para o cliente
        res.status(500).json({ message: 'Erro interno do servidor durante o login.' });
    }
}

module.exports = {
    registerUser,
    loginUser
};
