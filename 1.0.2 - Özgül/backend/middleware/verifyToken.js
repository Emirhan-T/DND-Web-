const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        // Token usually comes as "Bearer <token_string>"
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user info to request
        req.user = verified; 
        next(); // Proceed to the next function
    } catch (error) {
        res.status(400).json({ message: "Invalid token." });
    }
};

module.exports = verifyToken;