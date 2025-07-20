require('dotenv').config(); // Carrega as variáveis de ambiente do ficheiro .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Para permitir pedidos de diferentes domínios
const http = require('http'); // Importa o módulo HTTP para criar um servidor
const { Server } = require("socket.io"); // Importa Server do socket.io

// Importar rotas e middleware
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const authMiddleware = require('./middleware/auth'); // Certifique-se de que o caminho está correto

const app = express();
const server = http.createServer(app); // Cria um servidor HTTP a partir da aplicação Express

// Configurar Socket.IO
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5500", "http://127.0.0.1:5500", "https://lula-coin-frontend.onrender.com"], // Adicione a URL do seu frontend em produção
        methods: ["GET", "POST"]
    }
});

// Definir origens permitidas para CORS
const allowedOrigins = [
    'http://localhost:5500', // Para desenvolvimento local
    'http://127.0.0.1:5500', // Outra opção comum para localhost
    'https://lula-coin-frontend.onrender.com' // Adicione o URL do seu frontend no Render ou outro serviço de hosting
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir pedidos sem origem (como aplicações móveis ou postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'A política CORS para este site não permite acesso da origem especificada.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json()); // Habilita o Express a analisar corpos de pedido JSON

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI) // Removidas as opções obsoletas
    .then(() => console.log('MongoDB conectado com sucesso!'))
    .catch(err => {
        console.error('Erro de conexão ao MongoDB:', err.message);
        process.exit(1); // Sai do processo em caso de erro na conexão com o DB
    });

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de autenticação (login, registo)
// As rotas do jogo requerem autenticação, por isso usam o middleware 'authMiddleware'
app.use('/api/game', authMiddleware, gameRoutes);

// Rota de teste simples
app.get('/', (req, res) => {
    res.send('API do Lula Coin Miner está online!');
});

// Configuração do Socket.IO para lidar com eventos
io.on('connection', (socket) => {
    console.log(`Um utilizador conectado: ${socket.id}`);

    // Autenticar o socket (se quiser associar o socket a um utilizador logado)
    socket.on('authenticate', (token) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.user.id; // Armazena o ID do utilizador no objeto socket
            console.log(`Socket ${socket.id} autenticado para o utilizador ${socket.userId}`);
            socket.emit('authenticated'); // Envia feedback ao cliente
        } catch (err) {
            console.error('Falha na autenticação do socket:', err.message);
            socket.emit('unauthorized', 'Token inválido ou expirado.');
            socket.disconnect(); // Desconecta o socket não autorizado
        }
    });

    socket.on('disconnect', () => {
        console.log(`Utilizador desconectado: ${socket.id}`);
    });

    // Exemplo de evento de jogo via Socket.IO
    socket.on('mineAction', (data) => {
        // Aqui você pode processar a ação de mineração, atualizar dados no DB
        // e possivelmente emitir um evento de volta para todos os clientes
        // io.emit('gameUpdate', { message: `Alguém minerou ${data.amount} moedas!` });
        console.log(`Ação de mineração do utilizador ${socket.userId || 'não autenticado'}: ${data.coins}`);
    });

    // Adicione mais ouvintes de eventos de jogo aqui
});

// Iniciar o servidor (usando o servidor HTTP criado com http.createServer)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
