const mongoose = require('mongoose');

const DamasGameSchema = new mongoose.Schema({
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        color: String // 'p1' (vermelhas) ou 'p2' (azuis)
    }],
    boardState: { // Um array representando o tabuleiro 8x8
        type: [[Number]],
        required: true,
    },
    currentTurn: { // De quem é a vez de jogar (1 ou 2)
        type: Number,
        required: true,
    },
    status: { // 'waiting', 'active', 'finished'
        type: String,
        default: 'active',
    },
    winner: {
        type: String,
        default: null // 'p1' ou 'p2'
    },
    // << CAMPO ADICIONADO >> 
    lastEmoji: {
        emoji: String,
        sender: String, // 'p1' ou 'p2'
        timestamp: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('DamasGame', DamasGameSchema);
