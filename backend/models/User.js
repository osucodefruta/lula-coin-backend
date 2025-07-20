const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { // Mantenha 'username' se é o que está a usar para login nas rotas auth.js
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    lulaCoins: { // Campo para o saldo de Lula Coins
        type: Number,
        default: 0
    },
    miningPower: { // Campo para o poder de mineração
        type: Number,
        default: 1
    },
    upgrades: { // Campo para armazenar os upgrades do jogador
        type: Object, // Usar Object para flexibilidade, ou um Schema aninhado se houver estrutura específica
        default: {} // Objeto vazio por padrão, pode armazenar { pickaxeLevel: 1, drillLevel: 0, etc. }
    },
    // Se você tinha um campo 'gameState' genérico, podemos removê-lo ou usá-lo para dados mais complexos
    // Se decidir manter, o schema ficaria assim:
    // gameState: {
    //     coins: { type: Number, default: 0 },
    //     miningPower: { type: Number, default: 1 },
    //     upgrades: { type: Object, default: {} }
    // }
    // Mas para simplificar e corresponder ao auth.js e game.js já fornecidos, é melhor mantê-los no nível superior.
    date: { // Data de criação do utilizador, se necessário
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
