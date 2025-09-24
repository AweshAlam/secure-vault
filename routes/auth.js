const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Setup multer for in-memory file storage. This is efficient for small files.
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- REGISTRATION ROUTE ---
// Handles the upload of 5 images with the field name 'images'.
router.post('/register', upload.array('images', 5), async (req, res) => {
    try {
        const { username, password } = req.body;
        const files = req.files;

        // 1. Validate input
        if (!username || !password || !files || files.length !== 5) {
            return res.status(400).json({ message: "Please provide username, password, and 5 face images." });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username is already taken." });
        }

        // 2. Process all 5 images to generate face descriptors
        let faceDescriptors = [];
        for (const file of files) {
            const image = await canvas.loadImage(file.buffer);
            // Detect a single face in the image and compute its 128-d descriptor
            const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
            if (detection) {
                faceDescriptors.push(detection.descriptor);
            }
        }

        // Ensure a face was found in all images
        if (faceDescriptors.length !== 5) {
            return res.status(400).json({ message: `Could only detect a face in ${faceDescriptors.length} of the 5 images. Please try again.` });
        }

        // 3. Average the descriptors for a more robust and accurate representation
        const avgDescriptor = faceDescriptors.reduce((acc, descriptor) => {
            descriptor.forEach((val, i) => acc[i] += val);
            return acc;
        }, new Float32Array(128).fill(0)).map(val => val / faceDescriptors.length);
        
        // 4. Hash the password and create the new user
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            username,
            password: hashedPassword,
            faceDescriptor: Array.from(avgDescriptor),
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully! You can now log in." });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during registration." });
    }
});


// --- UPDATED MULTI-FACTOR LOGIN ROUTE ---
router.post('/login', upload.single('image'), async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password || !req.file) {
            return res.status(400).json({ message: "Username, password, and face image are required." });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: "Authentication failed: Invalid credentials." });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Authentication failed: Invalid credentials." });
        }

        const image = await canvas.loadImage(req.file.buffer);
        const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
            return res.status(400).json({ message: "No face detected in the image." });
        }

        const distance = faceapi.euclideanDistance(new Float32Array(user.faceDescriptor), detection.descriptor);

        if (distance > 0.55) {
            return res.status(401).json({ message: "Authentication failed: Face not recognized." });
        }
        
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'a_super_secret_key_that_should_be_in_your_env_file',
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            message: `Welcome back, ${user.username}!`, 
            user: user.username,
            token: token
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login." });
    }
});

module.exports = router;