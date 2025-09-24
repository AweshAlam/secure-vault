require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Crucial for face-api.js on Node.js
const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const PORT = process.env.PORT || 3000;

// --- Load Face-API Models ---
async function loadModels() {
    const modelPath = path.join(__dirname, 'models', 'face-api');
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
        ]);
        console.log("✅ Face-API models loaded successfully.");
    } catch (error) {
        console.error("🚨 Error loading Face-API models:", error);
        process.exit(1); // Exit if models can't be loaded
    }
}
loadModels();


// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB.'))
    .catch(err => console.error("🚨 MongoDB connection error:", err));


// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data')); // <-- ADD THIS LINE



// --- Server Initialization ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));