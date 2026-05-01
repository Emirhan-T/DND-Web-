const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    // Oyun kodu (örn: "EPIC2026") - unique ve büyük harf
    gameCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    // Oyunu oluşturan GM'in user ID'si
    gmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Oyunun adı
    name: {
        type: String,
        default: 'New Campaign'
    },
    // Aktif mi?
    isActive: {
        type: Boolean,
        default: true
    },
    // Katılmış oyuncuların listesi (userId'leri)
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
        playerName: String,
        characterName: String,
        joinedAt: { type: Date, default: Date.now }
    }],
    // Aktif harita URL'i (GM ekranda gösterdiği)
    activeMapUrl: {
        type: String,
        default: null
    },
    // Savaş durumu (JSON olarak saklanır)
    combatState: {
        type: mongoose.Schema.Types.Mixed,
        default: { isActive: false, round: 1, currentTurnIndex: 0 }
    },
    // Haritadaki token'lar
    tokens: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Game', gameSchema);
