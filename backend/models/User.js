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
        //...
        sementes: { milho: 3, tomate: 0, girassol: 0, cenoura: 0 },
        // animais: { ... }, // Linha antiga removida
        animaisState: [], // <-- ADICIONE ESTA LINHA
        precoTerreno: 250,
        //...
    }
},
    currentRoomIndex: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
