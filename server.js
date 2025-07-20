require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Certifique-se que 'cors' está instalado e importado

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// --- INÍCIO DA CONFIGURAÇÃO CORS ATUALIZADA ---
// Lista de origens permitidas (seu frontend no Netlify e, opcionalmente, seu ambiente de desenvolvimento local)
const allowedOrigins = [
    'https://sweet-praline-ee4bd7.netlify.app', // URL do seu jogo no Netlify
    // Se você estiver desenvolvendo ou testando localmente, pode adicionar:
    // 'http://localhost:3000', // Se o seu frontend estiver rodando localmente na porta 3000
    // 'http://127.0.0.1:5500' // Exemplo: se estiver usando o Live Server do VS Code, ele roda nessa porta
];

app.use(cors({
    origin: allowedOrigins, // Usa a array de origens permitidas diretamente (mais simples e robusto)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Inclua todos os métodos HTTP que seu frontend pode usar (incluí PATCH por segurança)
    allowedHeaders: ['Content-Type', 'Authorization'], // Importante: Permite cabeçalhos comuns, incluindo o token de autenticação
    credentials: true // Permite que o navegador envie cookies/cabeçalhos de autenticação (se necessário)
}));
// --- FIM DA CONFIGURAÇÃO CORS ATUALIZADA ---

// Middleware para JSON (permite que o Express entenda JSON nas requisições)
app.use(express.json());

// Rota raiz para teste (quando você acessa a URL do backend diretamente)
app.get("/", (req, res) => {
    res.send("Lula Coin Backend online!");
});

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de autenticação (login, registro)
app.use('/api/game', gameRoutes); // Rotas específicas do jogo

// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        const PORT = process.env.PORT || 3000; // Define a porta: usa a do ambiente (Render) ou 3000
        app.listen(PORT, () => {
            console.log('✅ Servidor rodando na porta ' + PORT);
            console.log('✅ Conectado ao MongoDB!');
        });
    })
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));
