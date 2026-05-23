const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // This links the character to a specific player
    },
    name: { 
        type: String, 
        required: true 
    },
    level: { 
        type: Number, 
        default: 1 
    },
    species: { 
        type: String, 
        required: true 
    },
    charClass: { 
        type: String, 
        required: true 
    },
    imageUrl: { 
        type: String, 
        default: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=100&q=80' 
    },
    
    // Zengin D&D Karakter Detayları
    playerName: {
        type: String,
        default: ''
    },
    expPoints: {
        type: Number,
        default: 0
    },
    stats: {
        type: mongoose.Schema.Types.Mixed,
        default: { Strength: 10, Dexterity: 10, Constitution: 10, Intelligence: 10, Wisdom: 10, Charisma: 10 }
    },
    proficiencies: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    skillOverrides: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    armorClass: {
        type: Number,
        default: 10
    },
    currentHp: {
        type: Number,
        default: 10
    },
    maxHp: {
        type: Number,
        default: 10
    },
    speed: {
        type: Number,
        default: 30
    },
    initiativeOverride: {
        type: String,
        default: ''
    },
    weapons: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    spells: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    spellSlots: {
        type: mongoose.Schema.Types.Mixed,
        default: {
            1: { max: 0, used: 0 }, 2: { max: 0, used: 0 }, 3: { max: 0, used: 0 },
            4: { max: 0, used: 0 }, 5: { max: 0, used: 0 }, 6: { max: 0, used: 0 },
            7: { max: 0, used: 0 }, 8: { max: 0, used: 0 }, 9: { max: 0, used: 0 }
        }
    },
    racialFeatures: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    classFeatures: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    currency: {
        type: mongoose.Schema.Types.Mixed,
        default: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
    },
    inventory: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    
    // Bio & Lore Bilgileri
    portrait: {
        type: String,
        default: null
    },
    languages: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    appearance: {
        type: mongoose.Schema.Types.Mixed,
        default: { age: '', height: '', weight: '', eyes: '', skin: '', hair: '' }
    },
    traits: {
        type: mongoose.Schema.Types.Mixed,
        default: { personality: '', ideals: '', bonds: '', flaws: '' }
    },
    backstory: {
        type: String,
        default: ''
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Character', characterSchema);