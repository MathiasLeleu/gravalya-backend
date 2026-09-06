import joi from 'joi';

const createUserSchema = joi.object({
    firstName: joi.string().min(2).max(50).pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/).required().messages({
        'string.min': 'Le prénom doit contenir au moins {#limit} caractères',
        'string.max': 'Le prénom ne doit pas dépasser {#limit} caractères',
        'string.pattern.base': 'Le prénom ne doit pas contenir de chiffres ou de caractères spéciaux',
        'any.required': 'Le prénom est requis'
    }),
    lastName: joi.string().min(2).max(50).pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/).required().messages({
        'string.min': 'Le nom doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom ne doit pas dépasser {#limit} caractères',
        'string.pattern.base': 'Le nom ne doit pas contenir de chiffres ou de caractères spéciaux',
        'any.required': 'Le nom est requis'
    }),
    email: joi.string().email().max(100).required().messages({
        'string.email': 'Adresse email invalide',
        'string.max': 'L\'adresse email ne doit pas dépasser {#limit} caractères',
        'any.required': 'L\'adresse email est requise'
    }),
    password: joi.string()
    .min(8)
    .required()
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[!@#$%^&*(),.?":{}|<>+]/)
    .messages({
        'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères',
        'any.required': 'Le mot de passe est requis',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
    }),
    confirmPassword: joi.string()
    .min(8)
    .required()
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[!@#$%^&*(),.?":{}|<>+]/)
    .messages({
        'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères',
        'any.required': 'Le mot de passe est requis',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
    }),
    role: joi.string().valid('user', 'admin').default('user')
});

const updateUserSchema = joi.object({
    firstName: joi.string().min(2).max(50).pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/).messages({
        'string.min': 'Le prénom doit contenir au moins {#limit} caractères',
        'string.max': 'Le prénom ne doit pas dépasser {#limit} caractères',
        'string.pattern.base': 'Le prénom ne doit pas contenir de chiffres ou de caractères spéciaux'
    }),
    lastName: joi.string().min(2).max(50).pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/).messages({
        'string.min': 'Le nom doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom ne doit pas dépasser {#limit} caractères',
        'string.pattern.base': 'Le nom ne doit pas contenir de chiffres ou de caractères spéciaux'
    }),
    email: joi.string().email().messages({
        'string.email': 'Adresse email invalide',
    }),
    password: joi.string()
    .min(8)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[!@#$%^&*(),.?":{}|<>+]/)
    .messages({
        'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
    }),
    newPassword: joi.string()
    .min(8)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[!@#$%^&*(),.?":{}|<>+]/)
    .messages({
        'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
    }),
    confirmNewPassword: joi.string()
    .min(8)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[!@#$%^&*(),.?":{}|<>+]/)
    .messages({
        'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
    }),

}).min(1).messages({
  'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

export { createUserSchema, updateUserSchema }
