/**
 * Room Controller
 * Handles game room creation, joining, and management
 */
const { Room, User } = require('../models');

/**
 * Create a new game room
 * POST /api/rooms
 */
const createRoom = async (req, res) => {
    try {
        const { name, password, settings } = req.body;
        const userId = req.userId;

        // Generate unique room ID
        let roomId;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            roomId = Room.generateRoomId();
            const existing = await Room.findOne({ roomId });
            if (!existing) {
                break;
            }
            attempts++;
        } while (attempts < maxAttempts);

        if (attempts === maxAttempts) {
            return res.status(500).json({
                success: false,
                message: 'Unable to generate unique room ID, please try again',
            });
        }

        // Create room
        const room = await Room.create({
            roomId,
            name,
            host: userId,
            players: [userId],
            password: password || null,
            isPrivate: !!password,
            settings: {
                ...settings,
            },
        });

        // Populate host info
        await room.populate('host', 'username avatar');
        await room.populate('players', 'username avatar isOnline');

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: {
                room: {
                    roomId: room.roomId,
                    name: room.name,
                    host: room.host,
                    players: room.players,
                    isPrivate: room.isPrivate,
                    settings: room.settings,
                    status: room.status,
                    createdAt: room.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating room',
        });
    }
};

/**
 * Get list of public rooms
 * GET /api/rooms
 */
const getRooms = async (req, res) => {
    try {
        const { status = 'waiting', limit = 20, page = 1 } = req.query;

        const query = {
            isPrivate: false,
            status,
        };

        const rooms = await Room.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('host', 'username avatar')
            .lean();

        const total = await Room.countDocuments(query);

        res.json({
            success: true,
            data: {
                rooms: rooms.map((room) => ({
                    roomId: room.roomId,
                    name: room.name,
                    host: room.host,
                    playerCount: room.players.length,
                    maxPlayers: room.settings.maxPlayers,
                    category: room.settings.category,
                    status: room.status,
                    createdAt: room.createdAt,
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching rooms',
        });
    }
};

/**
 * Get room by ID
 * GET /api/rooms/:roomId
 */
const getRoomById = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId })
            .populate('host', 'username avatar isOnline')
            .populate('players', 'username avatar isOnline stats');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        res.json({
            success: true,
            data: {
                room: {
                    roomId: room.roomId,
                    name: room.name,
                    host: room.host,
                    players: room.players,
                    isPrivate: room.isPrivate,
                    settings: room.settings,
                    status: room.status,
                    currentGame: room.currentGame,
                    createdAt: room.createdAt,
                },
            },
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room',
        });
    }
};

/**
 * Join a room
 * POST /api/rooms/:roomId/join
 */
const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { password } = req.body;
        const userId = req.userId;

        // Find room with password field
        const room = await Room.findOne({ roomId }).select('+password');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        // Check if room is in playing state
        if (room.status === 'playing') {
            return res.status(400).json({
                success: false,
                message: 'Cannot join a room with a game in progress',
            });
        }

        // Check if already in room
        if (room.hasPlayer(userId)) {
            return res.status(400).json({
                success: false,
                message: 'You are already in this room',
            });
        }

        // Check if room is full
        if (room.isFull()) {
            return res.status(400).json({
                success: false,
                message: 'Room is full',
            });
        }

        // Check password if room is private
        if (room.isPrivate) {
            if (!password) {
                return res.status(401).json({
                    success: false,
                    message: 'Password required',
                });
            }

            const isMatch = await room.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Incorrect password',
                });
            }
        }

        // Add player to room
        room.players.push(userId);
        await room.save();

        // Populate for response
        await room.populate('host', 'username avatar');
        await room.populate('players', 'username avatar isOnline');

        res.json({
            success: true,
            message: 'Joined room successfully',
            data: {
                room: {
                    roomId: room.roomId,
                    name: room.name,
                    host: room.host,
                    players: room.players,
                    isPrivate: room.isPrivate,
                    settings: room.settings,
                    status: room.status,
                },
            },
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining room',
        });
    }
};

/**
 * Leave a room
 * POST /api/rooms/:roomId/leave
 */
const leaveRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.userId;

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        // Check if user is in room
        if (!room.hasPlayer(userId)) {
            return res.status(400).json({
                success: false,
                message: 'You are not in this room',
            });
        }

        // Remove player from room
        room.players = room.players.filter((id) => id.toString() !== userId.toString());

        // If host leaves, transfer to next player or delete room
        if (room.isHost(userId)) {
            if (room.players.length > 0) {
                room.host = room.players[0];
            } else {
                // No players left, delete room
                await Room.deleteOne({ roomId });
                return res.json({
                    success: true,
                    message: 'Left room and room was deleted',
                    data: { roomDeleted: true },
                });
            }
        }

        await room.save();

        res.json({
            success: true,
            message: 'Left room successfully',
            data: {
                roomDeleted: false,
                newHost: room.host,
            },
        });
    } catch (error) {
        console.error('Leave room error:', error);
        res.status(500).json({
            success: false,
            message: 'Error leaving room',
        });
    }
};

/**
 * Update room settings (host only)
 * PATCH /api/rooms/:roomId/settings
 */
const updateSettings = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.userId;
        const updates = req.body;

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        // Only host can update settings
        if (!room.isHost(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can update room settings',
            });
        }

        // Can't update settings during game
        if (room.status === 'playing') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update settings while game is in progress',
            });
        }

        // Can't reduce max players below current count
        if (updates.maxPlayers && updates.maxPlayers < room.players.length) {
            return res.status(400).json({
                success: false,
                message: `Cannot set max players below current count (${room.players.length})`,
            });
        }

        // Update settings
        Object.keys(updates).forEach((key) => {
            room.settings[key] = updates[key];
        });

        await room.save();

        res.json({
            success: true,
            message: 'Settings updated',
            data: {
                settings: room.settings,
            },
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings',
        });
    }
};

/**
 * Kick a player from room (host only)
 * POST /api/rooms/:roomId/kick/:playerId
 */
const kickPlayer = async (req, res) => {
    try {
        const { roomId, playerId } = req.params;
        const userId = req.userId;

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        // Only host can kick
        if (!room.isHost(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can kick players',
            });
        }

        // Can't kick yourself
        if (playerId === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot kick yourself',
            });
        }

        // Check if player is in room
        if (!room.hasPlayer(playerId)) {
            return res.status(400).json({
                success: false,
                message: 'Player is not in this room',
            });
        }

        // Remove player
        room.players = room.players.filter((id) => id.toString() !== playerId);
        await room.save();

        res.json({
            success: true,
            message: 'Player kicked from room',
        });
    } catch (error) {
        console.error('Kick player error:', error);
        res.status(500).json({
            success: false,
            message: 'Error kicking player',
        });
    }
};

module.exports = {
    createRoom,
    getRooms,
    getRoomById,
    joinRoom,
    leaveRoom,
    updateSettings,
    kickPlayer,
};
