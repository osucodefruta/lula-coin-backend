require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// --- CONFIGURAÇÃO CORS ---
const allowedOrigins = [
    'https://sweet-praline-ee4bd7.netlify.app',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'A política CORS para este site não permite acesso da origem especificada.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// --- FIM CORS ---

// Middleware para JSON
app.use(express.json());

// Rota raiz para teste
app.get("/", (req, res) => {
    res.send("Lula Coin Backend online!");
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log('✅ Servidor rodando na porta ' + PORT);
            console.log('✅ Conectado ao MongoDB!');
        });
    })
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

