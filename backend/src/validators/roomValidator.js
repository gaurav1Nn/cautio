/**
 * Room Validator
 * Joi schemas for room input validation
 */
const Joi = require('joi');

const createRoomSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.min': 'Room name must be at least 3 characters',
            'string.max': 'Room name cannot exceed 30 characters',
            'any.required': 'Room name is required',
        }),
    password: Joi.string()
        .min(4)
        .max(20)
        .optional()
        .allow('')
        .messages({
            'string.min': 'Password must be at least 4 characters',
            'string.max': 'Password cannot exceed 20 characters',
        }),
    settings: Joi.object({
        maxPlayers: Joi.number().min(2).max(6).default(6),
        rounds: Joi.number().min(1).max(10).default(5),
        turnTime: Joi.number().min(15).max(60).default(30),
        category: Joi.string()
            .valid('all', 'movies', 'animals', 'technology', 'sports', 'food', 'countries', 'science')
            .default('all'),
    }).optional(),
});

const joinRoomSchema = Joi.object({
    password: Joi.string().optional().allow(''),
});

const updateSettingsSchema = Joi.object({
    maxPlayers: Joi.number().min(2).max(6),
    rounds: Joi.number().min(1).max(10),
    turnTime: Joi.number().min(15).max(60),
    category: Joi.string()
        .valid('all', 'movies', 'animals', 'technology', 'sports', 'food', 'countries', 'science'),
}).min(1).messages({
    'object.min': 'At least one setting is required',
});

const roomIdParamSchema = Joi.object({
    roomId: Joi.string()
        .length(6)
        .uppercase()
        .required()
        .messages({
            'string.length': 'Room ID must be exactly 6 characters',
            'any.required': 'Room ID is required',
        }),
});

module.exports = {
    createRoomSchema,
    joinRoomSchema,
    updateSettingsSchema,
    roomIdParamSchema,
};
