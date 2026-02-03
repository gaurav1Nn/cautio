/**
 * Game Validator
 * Joi schemas for game input validation
 */
const Joi = require('joi');

const startGameSchema = Joi.object({
    roomId: Joi.string()
        .length(6)
        .uppercase()
        .required()
        .messages({
            'string.length': 'Room ID must be exactly 6 characters',
            'any.required': 'Room ID is required',
        }),
});

const submitWordSchema = Joi.object({
    word: Joi.string()
        .min(3)
        .max(20)
        .pattern(/^[a-zA-Z]+$/)
        .when('useRandom', {
            is: true,
            then: Joi.optional(),
            otherwise: Joi.required(),
        })
        .messages({
            'string.min': 'Word must be at least 3 characters',
            'string.max': 'Word cannot exceed 20 characters',
            'string.pattern.base': 'Word must contain only letters',
            'any.required': 'Word is required',
        }),
    category: Joi.string()
        .valid('all', 'movies', 'animals', 'technology', 'sports', 'food', 'countries', 'science')
        .default('all'),
    useRandom: Joi.boolean().default(false),
});

const guessLetterSchema = Joi.object({
    letter: Joi.string()
        .length(1)
        .pattern(/^[a-zA-Z]$/)
        .required()
        .messages({
            'string.length': 'Must be a single letter',
            'string.pattern.base': 'Must be a letter',
            'any.required': 'Letter is required',
        }),
});

const sendHintSchema = Joi.object({
    hint: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.min': 'Hint cannot be empty',
            'string.max': 'Hint cannot exceed 100 characters',
            'any.required': 'Hint is required',
        }),
});

const gameIdParamSchema = Joi.object({
    gameId: Joi.string()
        .required()
        .messages({
            'any.required': 'Game ID is required',
        }),
});

module.exports = {
    startGameSchema,
    submitWordSchema,
    guessLetterSchema,
    sendHintSchema,
    gameIdParamSchema,
};
