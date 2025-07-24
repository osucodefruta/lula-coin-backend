// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/ranking');
const chatRoutes = require('./routes/chat');
// const damasRoutes = require('./routes/damas'); // << CONTINUA COMENTADO PARA GARANTIR O FOCO

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://sweet-praline-ee4bd7.netlify.app',
  'http://localhost:3000'
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Muitas tentativas de login a partir deste IP, por favor, tente novamente em 15 minutos.',
});
app.use('/api/auth', authLimiter);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Você está enviando mensagens muito rápido!',
});
app.use('/api/chat', chatLimiter);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/damas', damasRoutes); // << CONTINUA COMENTADO PARA GARANTIR O FOCO

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date() });
});
app.get("/", (req, res) => {
  res.send("Lula Coin Miner Backend está online!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
