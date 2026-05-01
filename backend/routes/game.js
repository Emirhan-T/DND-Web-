const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const verifyToken = require('../middleware/verifyToken');

// --- Rastgele 8 karakterli oyun kodu üretici ---
const generateGameCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// POST /api/games/host - GM yeni bir oyun oluşturur
router.post('/host', verifyToken, async (req, res) => {
    try {
        let gameCode;
        let exists = true;
        // Benzersiz bir kod üret
        while (exists) {
            gameCode = generateGameCode();
            exists = await Game.findOne({ gameCode });
        }

        const newGame = new Game({
            gameCode,
            gmId: req.user.id,
            name: req.body.name || 'New Campaign',
        });

        const savedGame = await newGame.save();
        res.status(201).json({ gameCode: savedGame.gameCode, gameId: savedGame._id });
    } catch (error) {
        console.error('Error hosting game:', error);
        res.status(500).json({ message: 'Failed to create game.' });
    }
});

// GET /api/games/join/:gameCode - Oyuncu bir oyuna katılmak için kodu doğrular
router.get('/join/:gameCode', verifyToken, async (req, res) => {
    try {
        const game = await Game.findOne({
            gameCode: req.params.gameCode.toUpperCase(),
            isActive: true
        });

        if (!game) {
            return res.status(404).json({ message: 'Game not found or is no longer active.' });
        }

        res.status(200).json({
            gameCode: game.gameCode,
            gameName: game.name,
            playerCount: game.players.length
        });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ message: 'Failed to join game.' });
    }
});

// POST /api/games/join/:gameCode - Oyuncu bir oyuna resmi olarak katılır
router.post('/join/:gameCode', verifyToken, async (req, res) => {
    try {
        const game = await Game.findOne({
            gameCode: req.params.gameCode.toUpperCase(),
            isActive: true
        });

        if (!game) {
            return res.status(404).json({ message: 'Game not found.' });
        }

        // Zaten katılmış mı kontrol et
        const alreadyJoined = game.players.find(p => p.userId.toString() === req.user.id);
        if (!alreadyJoined) {
            game.players.push({
                userId: req.user.id,
                characterId: req.body.characterId,
                playerName: req.body.playerName,
                characterName: req.body.characterName,
            });
            await game.save();
        }

        res.status(200).json({ message: 'Joined successfully.', gameCode: game.gameCode });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ message: 'Failed to join game.' });
    }
});

// GET /api/games/my-games - GM'in tüm oyunlarını listele
router.get('/my-games', verifyToken, async (req, res) => {
    try {
        const games = await Game.find({ gmId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(games);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch games.' });
    }
});

module.exports = router;
