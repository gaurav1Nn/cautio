/**
 * Auth Controller
 * Handles user authentication: signup, login, logout, token refresh
 */
const { User, RefreshToken } = require('../models');
const tokenService = require('../services/tokenService');

/**
 * Register a new user
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) {
            const field = existingUser.email === email ? 'email' : 'username';
            return res.status(400).json({
                success: false,
                message: `User with this ${field} already exists`,
            });
        }

        // Create new user
        const user = await User.create({
            username,
            email,
            password,
        });

        // Generate tokens
        const accessToken = tokenService.generateAccessToken(user._id);
        const refreshToken = tokenService.generateRefreshToken(user._id);

        // Store refresh token in database
        await RefreshToken.createToken(
            user._id,
            refreshToken,
            tokenService.getRefreshTokenExpiry(),
            {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
            }
        );

        // Set refresh token cookie
        tokenService.setRefreshTokenCookie(res, refreshToken);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                user: user.toPublicProfile(),
                accessToken,
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating account',
        });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email (include password for comparison)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Update online status
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        // Generate tokens
        const accessToken = tokenService.generateAccessToken(user._id);
        const refreshToken = tokenService.generateRefreshToken(user._id);

        // Store refresh token
        await RefreshToken.createToken(
            user._id,
            refreshToken,
            tokenService.getRefreshTokenExpiry(),
            {
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
            }
        );

        // Set refresh token cookie
        tokenService.setRefreshTokenCookie(res, refreshToken);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toPublicProfile(),
                accessToken,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
        });
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            // Revoke the refresh token
            await RefreshToken.revokeToken(refreshToken);
        }

        // Update user online status if authenticated
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, {
                isOnline: false,
                lastSeen: new Date(),
            });
        }

        // Clear cookie
        tokenService.clearRefreshTokenCookie(res);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout',
        });
    }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshAccessToken = async (req, res) => {
    try {
        // Get refresh token from cookie
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required',
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = tokenService.verifyRefreshToken(refreshToken);
        } catch (error) {
            tokenService.clearRefreshTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
            });
        }

        // Find valid token in database
        const storedToken = await RefreshToken.findValidToken(refreshToken);

        if (!storedToken) {
            tokenService.clearRefreshTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Refresh token not found or revoked',
            });
        }

        // Generate new access token
        const accessToken = tokenService.generateAccessToken(decoded.userId);

        res.json({
            success: true,
            data: {
                accessToken,
            },
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing token',
        });
    }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            data: {
                user: user.toPublicProfile(),
            },
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
        });
    }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
const logoutAll = async (req, res) => {
    try {
        // Revoke all refresh tokens for user
        await RefreshToken.revokeAllUserTokens(req.userId);

        // Update user online status
        await User.findByIdAndUpdate(req.userId, {
            isOnline: false,
            lastSeen: new Date(),
        });

        // Clear current cookie
        tokenService.clearRefreshTokenCookie(res);

        res.json({
            success: true,
            message: 'Logged out from all devices',
        });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout',
        });
    }
};

/**
 * Get active sessions
 * GET /api/auth/sessions
 */
const getSessions = async (req, res) => {
    try {
        const sessions = await RefreshToken.getActiveSessions(req.userId);

        res.json({
            success: true,
            data: {
                sessions: sessions.map((s) => ({
                    id: s._id,
                    userAgent: s.userAgent,
                    ipAddress: s.ipAddress,
                    createdAt: s.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sessions',
        });
    }
};

module.exports = {
    signup,
    login,
    logout,
    refreshAccessToken,
    getProfile,
    logoutAll,
    getSessions,
};
