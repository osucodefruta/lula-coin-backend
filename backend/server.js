// backend/server.js (ATUALIZADO E SEGURO)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/ranking');
const chatRoutes = require('./routes/chat');

const app = express();

// Middleware para permitir requisições de outras origens (CORS)
app.use(cors());

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());

// --- Limitador de Tentativas para Autenticação (EXISTENTE) ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 10, // Permite no máximo 10 requisições por IP nesta janela
    message: 'Muitas tentativas de login a partir deste IP, por favor, tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplica o limitador de autenticação APENAS às rotas /api/auth
app.use('/api/auth', authLimiter);


// --- NOVO LIMITADOR PARA O CHAT (ADICIONADO) ---
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // Janela de 1 minuto
    max: 20, // Permite no máximo 20 mensagens por minuto por IP
    message: 'Você está enviando mensagens muito rápido!',
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplica o limitador de chat APENAS às rotas /api/chat
app.use('/api/chat', chatLimiter);
// --- FIM DO NOVO LIMITADOR ---


// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

// Definição das rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/chat', chatRoutes); // As rotas do chat já estão aqui

// --- Rota de Health Check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date() });
});

// Rota de teste para verificar se o servidor está online
app.get("/", (req, res) => {
  res.send("Lula Coin Miner Backend está online!");
});

// Define a porta a partir das variáveis de ambiente ou usa 5000 como padrão
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
