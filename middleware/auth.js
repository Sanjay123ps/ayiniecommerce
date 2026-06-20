// middleware/auth.js - Authentication middleware for protected routes

const jwt = require('jsonwebtoken');

// Middleware to authenticate user from JWT token
const authenticate = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Attach user info to request
        // ✅ FIXED: Use decoded.id (not decoded.userId)
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware to check if user is admin
const authenticateAdmin = (req, res, next) => {
    authenticate(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

module.exports = {
    authenticate,
    authenticateAdmin
};
