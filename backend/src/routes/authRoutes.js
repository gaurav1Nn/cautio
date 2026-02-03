/**
 * Auth Routes
 * Defines authentication endpoints
 */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validation');
const { signupSchema, loginSchema } = require('../validators/authValidator');

// Public routes (with rate limiting)
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshAccessToken);

// Protected routes
router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.get('/profile', protect, authController.getProfile);
router.get('/sessions', protect, authController.getSessions);

module.exports = router;
