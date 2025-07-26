// backend/server.js (VERSÃO FINAL COM CORS AJUSTADO)
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/ranking');
const chatRoutes = require('./routes/chat');
const damasRoutes = require('./routes/damas');
const fazendaRoutes = require('./routes/fazenda'); // << LINHA ADICIONADA PARA A FAZENDA

const app = express();

// --- CORREÇÃO DE PROXY (RENDER) ---
app.set('trust proxy', 1);

// --- CORS PERSONALIZADO ---
// Substitua pela URL real do seu frontend do Netlify
const allowedOrigins = [
  'https://sweet-praline-ee4bd7.netlify.app', // EXEMPLO: 'https://lula-coin.netlify.app'
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Middleware para interpretar JSON
app.use(express.json());

// --- Limitador de Tentativas para Autenticação ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login a partir deste IP, por favor, tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// --- Limitador para o Chat ---
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Você está enviando mensagens muito rápido!',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/chat', chatLimiter);

// --- Conexão com o MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

// --- Rotas da API ---
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/damas', damasRoutes);
app.use('/api/fazenda', fazendaRoutes); // << LINHA ADICIONADA PARA A FAZENDA

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date() });
});

// --- Rota base ---
app.get("/", (req, res) => {
  res.send("Lula Coin Miner Backend está online!");
});

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
