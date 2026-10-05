import joi from 'joi';

const createCategorySchema = joi.object({
    name: joi.string().min(2).max(100).required().messages({
        'string.min': 'Le nom de la catégorie doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom de la catégorie ne doit pas dépasser {#limit} caractères',
        'any.required': 'Le nom de la catégorie est requis'
    }),

    slug: joi.string().min(2).max(100).required().messages({
        'string.min': 'Le slug de la catégorie doit contenir au moins {#limit} caractères',
        'string.max': 'Le slug de la catégorie ne doit pas dépasser {#limit} caractères',
        'any.required': 'Le slug de la catégorie est requis'
    }),

    description: joi.string().required().messages({
        'any.required': 'La description de la catégorie est requise'
    })
});

const updateCategorySchema = joi.object({
    name: joi.string().min(2).max(100).messages({
        'string.min': 'Le nom de la catégorie doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom de la catégorie ne doit pas dépasser {#limit} caractères',
        'string.base': 'Le nom de la catégorie doit être une chaîne de caractères'
    }),

    slug: joi.string().min(2).max(100).messages({
        'string.min': 'Le slug de la catégorie doit contenir au moins {#limit} caractères',
        'string.max': 'Le slug de la catégorie ne doit pas dépasser {#limit} caractères',
        'string.base': 'Le slug de la catégorie doit être une chaîne de caractères'
    }),

    description: joi.string().messages({
        'string.base': 'La description de la catégorie doit être une chaîne de caractères'
    })
}).unknown(false);

export { createCategorySchema, updateCategorySchema };

