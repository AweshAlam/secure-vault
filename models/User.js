const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required.'],
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required.'],
    },
    faceDescriptor: {
        type: [Number],
        required: [true, 'Face descriptor is required.'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('User', UserSchema);