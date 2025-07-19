require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Esta linha está correta aqui

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

// CORREÇÃO AQUI: app.use(express.json()) DEVE VIR ANTES DE app.use(cors())
app.use(express.json()); // Esta linha deve vir primeiro
app.use(cors());         // E esta linha deve vir depois

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log('Servidor rodando na porta ' + process.env.PORT);
        });
    })
    .catch(err => console.error('Erro ao conectar no MongoDB:', err));
