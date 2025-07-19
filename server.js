require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importe o pacote cors

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// --- ATENÇÃO: CONFIGURAÇÃO CORS ---
// Substitua 'https://sweet-praline-ee4bd7.netlify.app' pelo URL EXATO do seu jogo no Netlify.
// Você pode encontrar o URL na sua dashboard do Netlify, logo que você entra no site do seu projeto.
const allowedOrigins = [
    'https://sweet-praline-ee4bd7.netlify.app', // <-- ESTA LINHA FOI CORRIGIDA (adicionado 'https://' e removida '/' final)
    'http://localhost:3000', // Para desenvolvimento local, se você usar esta porta
    // Adicione outros URLs se tiver mais frontends ou ferramentas que precisam acessar
];

// Configure o middleware CORS
app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem 'origin' (ex: de ferramentas como Postman, curl, ou algumas requisições do próprio servidor)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'A política CORS para este site não permite acesso da origem especificada.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos que seu frontend usará
    allowedHeaders: ['Content-Type', 'Authorization'], // Cabeçalhos permitidos (Authorization para o token JWT)
    credentials: true // Necessário se você usa cookies de sessão ou credenciais
}));
// --- FIM DA CONFIGURAÇÃO CORS ---

// Middleware para processar requisições JSON. DEVE VIR ANTES DAS ROTAS.
app.use(express.json());

// Suas rotas API
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Conexão com o MongoDB e inicialização do servidor
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log('Servidor rodando na porta ' + process.env.PORT);
            console.log('Conectado ao MongoDB!');
        });
    })
    .catch(err => console.error('Erro ao conectar no MongoDB:', err));
