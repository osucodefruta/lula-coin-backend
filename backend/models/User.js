// backend/models/User.js
const mongoose = require('mongoose');

// Este schema define a estrutura dos dados do usuário no MongoDB.
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Garante que cada nome de usuário seja único
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // O estado do jogo é salvo diretamente no documento do usuário.
    // A estrutura é baseada no seu arquivo jogo.html.
    gameState: {
        balance: { type: Number, default: 100 },
        inventory: {
            miners: [{ id: String, quantity: Number }],
            racks: [{ id: String, quantity: Number }]
        },
        energy: { type: Number, default: 100 },
        totalPower: { type: Number, default: 0 },
        incomeRate: { type: Number, default: 0 },
        placedRacksPerRoom: {
            type: [[mongoose.Schema.Types.Mixed]], // Array de arrays, permitindo qualquer estrutura dentro
            default: [Array(4).fill(null)] // Começa com uma sala com 4 slots de rack vazios
        }
    }
}, { timestamps: true }); // `timestamps` adiciona os campos createdAt e updatedAt automaticamente

module.exports = mongoose.model('User', UserSchema);

