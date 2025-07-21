// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// Middleware para permitir requisições de outras origens (CORS)
app.use(cors());

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());

// Conexão com o MongoDB
// As opções `useNewUrlParser` e `useUnifiedTopology` não são mais necessárias nas versões recentes do Mongoose.
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

// Definição das rotas da API
// Todas as rotas começando com /api/auth serão gerenciadas pelo authRoutes
app.use('/api/auth', authRoutes);
// Todas as rotas começando com /api/game serão gerenciadas pelo gameRoutes
app.use('/api/game', gameRoutes);

// Rota de teste para verificar se o servidor está online
app.get("/", (req, res) => {
  res.send("Lula Coin Miner Backend está online!");
});

// Define a porta a partir das variáveis de ambiente ou usa 5000 como padrão
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

