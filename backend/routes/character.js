const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const verifyToken = require('../middleware/verifyToken');

// POST: CREATE A NEW CHARACTER
router.post('/', verifyToken, async (req, res) => {
    try {
        const newCharacter = new Character({
            userId: req.user.id, // Extracted from the verified token
            name: req.body.name,
            level: req.body.level,
            species: req.body.species,
            charClass: req.body.charClass,
            imageUrl: req.body.imageUrl
        });

        const savedCharacter = await newCharacter.save();
        res.status(201).json(savedCharacter);
    } catch (error) {
        console.error("Error creating character:", error);
        res.status(500).json({ message: "Failed to create character." });
    }
});

// GET: FETCH ALL CHARACTERS FOR THE LOGGED-IN USER
router.get('/', verifyToken, async (req, res) => {
    try {
        // Find characters that belong ONLY to the logged-in user
        const characters = await Character.find({ userId: req.user.id });
        res.status(200).json(characters);
    } catch (error) {
        console.error("Error fetching characters:", error);
        res.status(500).json({ message: "Failed to fetch characters." });
    }
});

module.exports = router;