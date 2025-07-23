// backend/models/ChatMessage.js
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Terceiro parâmetro força o nome da coleção para "chatmessages"
module.exports = mongoose.model('ChatMessage', ChatMessageSchema, 'chatmessages');

