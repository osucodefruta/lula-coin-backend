// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Importação das rotas
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/ranking');
const chatRoutes = require('./routes/chat');
const damasRoutes = require('./routes/damas'); // Rota de Damas
const fazendaRoutes = require('./routes/fazenda'); // Rota da Fazenda

const app = express();

// --- Middlewares Essenciais ---

// Confiar nos headers de proxy (essencial para serviços como o Render)
app.set('trust proxy', 1);

// Configuração de CORS para permitir requisições do seu frontend
const allowedOrigins = [
  'https://sweet-praline-ee4bd7.netlify.app', // URL do seu frontend no Netlify
  'http://localhost:3000'                      // Para desenvolvimento local
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());


// --- Middlewares de Segurança (Rate Limiting) ---

// Limitador para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: 'Muitas tentativas de login a partir deste IP, por favor, tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitador para as rotas do chat
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20,
  message: 'Você está enviando mensagens muito rápido!',
  standardHeaders: true,
  legacyHeaders: false,
});


// --- Conexão com o Banco de Dados (MongoDB) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));


// --- Definição das Rotas da API ---

// Aplica o limitador apenas nas rotas de autenticação
app.use('/api/auth', authLimiter, authRoutes);

// Aplica o limitador apenas nas rotas de chat
app.use('/api/chat', chatLimiter, chatRoutes);

// Demais rotas
app.use('/api/game', gameRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/damas', damasRoutes);     // << ROTA DE DAMAS ADICIONADA E ATIVA
app.use('/api/fazenda', fazendaRoutes); // << ROTA DA FAZENDA ADICIONADA E ATIVA


// --- Rotas Utilitárias ---

// Rota para verificação de status (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date() });
});

// Rota base para verificar se o servidor está online
app.get("/", (req, res) => {
  res.send("Lula Coin Miner Backend está online!");
});


// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
