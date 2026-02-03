/**
 * Auth Middleware
 * JWT verification for protected routes
 */
const { verifyAccessToken } = require('../services/tokenService');
const { User } = require('../models');

/**
 * Protect route - require valid access token
 */
const protect = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = verifyAccessToken(token);

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};

/**
 * Optional auth - attach user if token present, but don't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId);

            if (user) {
                req.user = user;
                req.userId = user._id;
            }
        }

        next();
    } catch (error) {
        // Token invalid, but continue anyway
        next();
    }
};

module.exports = {
    protect,
    optionalAuth,
};
