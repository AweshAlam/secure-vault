const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // "Bearer TOKEN"
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'a_super_secret_key_that_should_be_in_your_env_file');
        req.userData = { userId: decodedToken.userId, username: decodedToken.username };
        next();
    } catch (error) {
        res.status(401).json({ message: "Authentication failed!" });
    }
};