const express = require('express');
const router = express.Router();
const SecureData = require('../models/SecureData');
const auth = require('../middleware/auth');

// GET ALL DATA FOR THE LOGGED-IN USER
router.get('/', auth, async (req, res) => {
    try {
        const data = await SecureData.find({ owner: req.userData.userId }).sort({ createdAt: -1 });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: "Fetching data failed." });
    }
});

// SAVE NEW DATA FOR THE LOGGED-IN USER
router.post('/', auth, async (req, res) => {
    const { title, content } = req.body;
    const newData = new SecureData({
        title,
        content,
        owner: req.userData.userId
    });
    try {
        await newData.save();
        res.status(201).json(newData);
    } catch (error) {
        res.status(500).json({ message: "Saving data failed." });
    }
});

// DELETE DATA FOR THE LOGGED-IN USER
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await SecureData.deleteOne({ _id: req.params.id, owner: req.userData.userId });
        if (result.deletedCount > 0) {
            res.status(200).json({ message: "Data deleted successfully." });
        } else {
            res.status(401).json({ message: "Not authorized or data not found." });
        }
    } catch (error) {
        res.status(500).json({ message: "Deleting data failed." });
    }
});

// --- UPDATE A NOTE FOR THE LOGGED-IN USER ---
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, content } = req.body;
        // This query finds a note by its ID AND verifies the person making the request is the owner.
        const updatedData = await SecureData.findOneAndUpdate(
            { _id: req.params.id, owner: req.userData.userId },
            { title, content }, // The new data to update
            { new: true }       // This option tells Mongoose to return the updated document
        );

        if (!updatedData) {
            return res.status(404).json({ message: "Not authorized or data not found." });
        }
        
        res.status(200).json(updatedData);

    } catch (error) {
        res.status(500).json({ message: "Updating data failed." });
    }
});

module.exports = router;