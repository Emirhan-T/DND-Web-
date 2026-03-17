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
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Character', characterSchema);