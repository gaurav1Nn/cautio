/**
 * Word Service
 * Handles word validation and random word generation
 */
const axios = require('axios');
const env = require('../config/env');
const FALLBACK_WORDS = require('../utils/fallbackWords');

/**
 * Validate word using Dictionary API
 */
const validateWord = async (word) => {
    try {
        const cleanWord = word.toLowerCase().trim();

        // Basic validation
        if (!cleanWord || cleanWord.length < 3) {
            return { valid: false, message: 'Word must be at least 3 characters' };
        }

        if (cleanWord.length > 20) {
            return { valid: false, message: 'Word cannot exceed 20 characters' };
        }

        if (!/^[a-z]+$/.test(cleanWord)) {
            return { valid: false, message: 'Word must contain only letters' };
        }

        // Validate with Dictionary API
        const response = await axios.get(`${env.DICTIONARY_API_URL}/${cleanWord}`, {
            timeout: 5000,
        });

        if (response.status === 200) {
            return { valid: true, word: cleanWord };
        }

        return { valid: false, message: 'Word not found in dictionary' };
    } catch (error) {
        // If API fails, accept the word (fallback behavior)
        console.warn('Dictionary API failed, accepting word:', error.message);

        // Still do basic validation
        const cleanWord = word.toLowerCase().trim();
        if (/^[a-z]{3,20}$/.test(cleanWord)) {
            return { valid: true, word: cleanWord };
        }

        return { valid: false, message: 'Invalid word format' };
    }
};

/**
 * Get random word from API or fallback
 */
const getRandomWord = async (category = 'all') => {
    try {
        // Try Random Word API first
        const response = await axios.get(env.RANDOM_WORD_API_URL, {
            timeout: 5000,
        });

        if (response.data && response.data.length > 0) {
            const word = response.data[0].toLowerCase();

            // Validate length
            if (word.length >= 4 && word.length <= 15 && /^[a-z]+$/.test(word)) {
                return {
                    success: true,
                    word,
                    category: 'random',
                };
            }
        }

        // Fall through to fallback
        throw new Error('Invalid word from API');
    } catch (error) {
        console.warn('Random Word API failed, using fallback:', error.message);
        return getRandomWordFromFallback(category);
    }
};

/**
 * Get random word from fallback lists
 */
const getRandomWordFromFallback = (category = 'all') => {
    const words = FALLBACK_WORDS[category] || FALLBACK_WORDS.all;
    const randomIndex = Math.floor(Math.random() * words.length);
    const word = words[randomIndex];

    return {
        success: true,
        word,
        category,
    };
};

/**
 * Get masked word (underscores with spaces)
 */
const getMaskedWord = (word, guessedLetters = []) => {
    if (!word) {
        return '';
    }

    return word
        .split('')
        .map((char) => {
            if (char === ' ') {
                return '  '; // Double space for word breaks
            }
            return guessedLetters.includes(char.toLowerCase()) ? char.toUpperCase() : '_';
        })
        .join(' ');
};

/**
 * Check if letter is in word
 */
const checkLetter = (word, letter) => {
    const lowerWord = word.toLowerCase();
    const lowerLetter = letter.toLowerCase();

    if (lowerWord.includes(lowerLetter)) {
        // Count occurrences
        const count = (lowerWord.match(new RegExp(lowerLetter, 'g')) || []).length;
        return {
            correct: true,
            count,
            positions: [...lowerWord].reduce((acc, char, index) => {
                if (char === lowerLetter) {
                    acc.push(index);
                }
                return acc;
            }, []),
        };
    }

    return {
        correct: false,
        count: 0,
        positions: [],
    };
};

/**
 * Check if word is completely revealed
 */
const isWordComplete = (word, guessedLetters) => {
    if (!word) {
        return false;
    }

    const uniqueLetters = [...new Set(word.toLowerCase().split('').filter((c) => c !== ' '))];
    return uniqueLetters.every((letter) => guessedLetters.includes(letter));
};

/**
 * Get word length (excluding spaces)
 */
const getWordLength = (word) => {
    return word.replace(/\s/g, '').length;
};

module.exports = {
    validateWord,
    getRandomWord,
    getRandomWordFromFallback,
    getMaskedWord,
    checkLetter,
    isWordComplete,
    getWordLength,
};
