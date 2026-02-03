/**
 * Auth Validator
 * Joi schemas for authentication input validation
 */
const Joi = require('joi');

const signupSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(20)
        .required()
        .messages({
            'string.alphanum': 'Username can only contain letters and numbers',
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 20 characters',
            'any.required': 'Username is required',
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email',
            'any.required': 'Email is required',
        }),
    password: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'string.max': 'Password cannot exceed 128 characters',
            'any.required': 'Password is required',
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'any.required': 'Please confirm your password',
        }),
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email',
            'any.required': 'Email is required',
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required',
        }),
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().optional(), // Can come from cookie
});

module.exports = {
    signupSchema,
    loginSchema,
    refreshTokenSchema,
};
