// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 50
    },
    password: {
        type: String,
        required: true
    },
    lulaCoinGameState: {
        type: Object,
        default: {
            balance: 100,
            inventory: { miners: [], racks: [] },
            placedRacksPerRoom: [Array(4).fill(null)],
            totalPower: 0,
            energy: 100,
            lastEnergyUpdate: Date.now()
        }
    },
    fazendaGameState: {
        type: Object,
        default: {
            moedas: 10,
            agua: 10,
            racao: 10,
            veneno: 0,
            sementes: { milho: 3, tomate: 0, girassol: 0, cenoura: 0 },
            animais: { galinha: { quantidade: 0 }, vaca: { quantidade: 0 }, porco: { quantidade: 0 } },
            precoTerreno: 250,
            terrenosComprados: 3, // Começa com 3 terrenos desbloqueados
            canteirosState: [] // <-- ADICIONE ESTA LINHA
        }
    },
    currentRoomIndex: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
