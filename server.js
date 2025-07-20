const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv'); // Se estiver a usar dotenv para variáveis de ambiente
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const authMiddleware = require('./middleware/authMiddleware'); // Certifique-se de que o caminho está correto

dotenv.config(); // Carrega as variáveis de ambiente do .env

const app = express();

// Middleware para parsing de JSON
app.use(express.json());

// Configuração do CORS
const allowedOrigins = [
  'http://localhost:3000', // Exemplo: Adicione a URL do seu frontend local (se estiver a desenvolver)
  'https://sweet-praline-ee4bd7.netlify.app' // **MUITO IMPORTANTE: Substitua pela URL real do seu frontend implementado**
  // Adicione outras URLs se necessário, por exemplo:
  // 'https://outra-url-do-seu-frontend.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: de Postman, requisições diretas do mesmo servidor)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions)); // A linha 22 que estava a causar o erro

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB conectado com sucesso!'))
.catch(err => console.error('Erro de conexão com o MongoDB:', err));

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de autenticação (login, registro)
app.use('/api/game', authMiddleware, gameRoutes); // Rotas específicas do jogo, protegidas por autenticação

// Rota de teste simples
app.get('/', (req, res) => {
    res.send('API LulaCoin está funcionando!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
