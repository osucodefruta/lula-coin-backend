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
    gameState: {
        balance: { type: Number, default: 100 },
        inventory: {
            miners: [
                {
                    id: { type: String, required: true },
                    quantity: { type: Number, default: 0 }
                }
            ],
            racks: [
                {
                    id: { type: String, required: true },
                    quantity: { type: Number, default: 0 }
                }
            ]
        },
        energy: { type: Number, default: 100 },
        totalPower: { type: Number, default: 0 },
        incomeRate: { type: Number, default: 0 },
        placedRacksPerRoom: {
            type: [[mongoose.Schema.Types.Mixed]],
            default: () => [[null, null, null, null]] // Cria uma nova referência a cada usuário
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

