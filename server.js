require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // <-- Já está aqui, mas é crucial ter!

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// --- INÍCIO DA CONFIGURAÇÃO CORS ATUALIZADA ---
// Lista de origens permitidas (seu frontend no Netlify)
const allowedOrigins = [
    'https://sweet-praline-ee4bd7.netlify.app', // <-- ESTA É A URL DO SEU JOGO NO NETLIFY
    // Se você estiver testando o frontend localmente (por exemplo, com Live Server ou Vite dev server),
    // você pode adicionar as URLs locais aqui. Ex:
    // 'http://localhost:5500', // Exemplo para Live Server do VS Code
    // 'http://localhost:5173'  // Exemplo para um ambiente de desenvolvimento com Vite
];

app.use(cors({
    origin: function (origin, callback) {
        // Se a origem não for definida (ex: requisições do mesmo servidor ou de ferramentas como Postman), permite.
        if (!origin) return callback(null, true);
        // Se a origem estiver na lista de permitidas, permite.
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Caso contrário, bloqueia e retorna o erro CORS.
            const msg = 'A política CORS para este site não permite acesso da origem especificada: ' + origin;
            callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Inclui os métodos HTTP que seu frontend e backend usarão
    allowedHeaders: ['Content-Type', 'Authorization'], // Permite que o frontend envie esses cabeçalhos (importante para tokens de autenticação)
    credentials: true // Permite o envio de cookies de sessão, se você os usar
}));
// --- FIM DA CONFIGURAÇÃO CORS ATUALIZADA ---

// Middleware para JSON (permite que o Express entenda o corpo das requisições em formato JSON)
app.use(express.json());

// Rota raiz para teste (quando você acessa a URL do backend diretamente no navegador)
app.get("/", (req, res) => {
    res.send("Lula Coin Backend online!");
});

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de autenticação (registro, login)
app.use('/api/game', gameRoutes); // Rotas do jogo (minerar, comprar mineradores)

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
