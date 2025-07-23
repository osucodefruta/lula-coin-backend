// backend/models/ChatMessage.js
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Importante: Não defina a coleção como "capped" aqui no Mongoose,
// pois já a criamos manualmente no Atlas.

module.exports = mongoose.model('ChatMessage', ChatMessageSchema, 'chatmessages');
