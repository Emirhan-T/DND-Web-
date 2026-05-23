const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const verifyToken = require('../middleware/verifyToken');

// POST: CREATE A NEW CHARACTER
router.post('/', verifyToken, async (req, res) => {
    try {
        const newCharacter = new Character({
            ...req.body,
            userId: req.user.id // Extracted from the verified token
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

// PUT: UPDATE AN EXISTING CHARACTER
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const character = await Character.findOne({ _id: req.params.id, userId: req.user.id });
        if (!character) {
            return res.status(404).json({ message: "Character not found or access denied." });
        }

        Object.assign(character, req.body);
        const updatedCharacter = await character.save();
        res.status(200).json(updatedCharacter);
    } catch (error) {
        console.error("Error updating character:", error);
        res.status(500).json({ message: "Failed to update character." });
    }
});

// DELETE: DELETE A CHARACTER
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const character = await Character.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!character) {
            return res.status(404).json({ message: "Character not found or access denied." });
        }
        res.status(200).json({ message: "Character deleted successfully." });
    } catch (error) {
        console.error("Error deleting character:", error);
        res.status(500).json({ message: "Failed to delete character." });
    }
});

module.exports = router;