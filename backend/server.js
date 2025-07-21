// backend/server.js
require('dotenv').config(); // Carrega as variáveis de ambiente do ficheiro .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Para permitir pedidos de diferentes origens
const authRoutes = require('./routes/auth'); // Importa as rotas de autenticação
const gameRoutes = require('./routes/game'); // Importa as rotas do jogo

const app = express();

// Configuração do CORS
// Lista de origens permitidas (seu frontend do Netlify e localhost para desenvolvimento)
const allowedOrigins = [
  'https://sweet-praline-ee4bd7.netlify.app', // <-- AGORA INCLUÍDO E CONFIRMADO AQUI!
  'http://localhost:3000' // Para testes locais do seu frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: de ferramentas como Postman ou requisições do mesmo domínio)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Para todas as outras origens, rejeita a requisição
    return callback(new Error('Origem não permitida pelo CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeçalhos permitidos, essencial para o token JWT
  credentials: true // Permite o envio de cookies de credenciais (se usados)
}));


// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB Atlas:', err));

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de autenticação (registro, login)
app.use('/api/game', gameRoutes); // Rotas do jogo (mineração, upgrades, etc.)

// Rota de teste simples para verificar se o backend está online
app.get("/", (req, res) => {
  res.send("Lula Coin Backend online!");
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
