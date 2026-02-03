/**
 * Validation rules for forms
 */

export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  username: (value) => {
    if (!value) return null;
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be less than 20 characters';
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(value)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  },
  
  password: (value) => {
    if (!value) return null;
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (value.length > 50) {
      return 'Password must be less than 50 characters';
    }
    return null;
  },
  
  confirmPassword: (value, password) => {
    if (!value) return null;
    if (value !== password) {
      return 'Passwords do not match';
    }
    return null;
  },
  
  roomName: (value) => {
    if (!value) return null;
    if (value.length < 2) {
      return 'Room name must be at least 2 characters';
    }
    if (value.length > 30) {
      return 'Room name must be less than 30 characters';
    }
    return null;
  },
  
  roomCode: (value) => {
    if (!value) return null;
    if (value.length !== 6) {
      return 'Room code must be 6 characters';
    }
    const codeRegex = /^[A-Z0-9]+$/;
    if (!codeRegex.test(value.toUpperCase())) {
      return 'Room code can only contain letters and numbers';
    }
    return null;
  },
  
  word: (value) => {
    if (!value) return null;
    if (value.length < 3) {
      return 'Word must be at least 3 characters';
    }
    if (value.length > 15) {
      return 'Word must be less than 15 characters';
    }
    const wordRegex = /^[a-zA-Z]+$/;
    if (!wordRegex.test(value)) {
      return 'Word can only contain letters';
    }
    return null;
  },
  
  hint: (value) => {
    if (!value) return null;
    if (value.length > 100) {
      return 'Hint must be less than 100 characters';
    }
    return null;
  },
};

/**
 * Validate form with multiple fields
 */
export function validateForm(values, rules) {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = values[field];
    
    for (const rule of fieldRules) {
      let error;
      
      if (typeof rule === 'function') {
        error = rule(value, values);
      } else if (rule === 'required') {
        error = validators.required(value);
      } else if (validators[rule]) {
        error = validators[rule](value);
      }
      
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}