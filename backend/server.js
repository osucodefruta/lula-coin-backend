const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv'); 

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const authMiddleware = require('./middleware/authMiddleware'); // Certifique-se de que o caminho está correto

dotenv.config(); // Carrega as variáveis de ambiente do .env

const app = express();

// Middleware para parsing de JSON
app.use(express.json());

// Configuração do CORS
const allowedOrigins = [
  'http://localhost:3000', // Adicione a URL do seu frontend local (se estiver a desenvolver)
  'https://sweet-praline-ee4bd7.netlify.app' // **SUA URL REAL DO FRONTEND NO NETLIFY**
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (ex: de Postman, requisições diretas do mesmo servidor)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// --- Rota de teste simples (MOVEMOS PARA CÁ PARA SER PROCESSADA CORRETAMENTE) ---
app.get('/', (req, res) => {
    res.send('API LulaCoin está funcionando!');
});
// ---------------------------------------------------------------------------------

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de autenticação (login, registro)
app.use('/api/game', authMiddleware, gameRoutes); // Rotas específicas do jogo, protegidas por autenticação

// Conexão com o MongoDB e início do servidor (apenas se a conexão for bem-sucedida)
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB conectado com sucesso!');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
})
.catch(err => console.error('Erro de conexão com o MongoDB:', err));
