import joi from 'joi';

const createCategorySchema = joi.object({
    name: joi.string().min(2).max(100).required().messages({
        'string.min': 'Le nom de la catégorie doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom de la catégorie ne doit pas dépasser {#limit} caractères',
        'any.required': 'Le nom de la catégorie est requis'
    }),

    description: joi.string().required().messages({
        'any.required': 'La description de la catégorie est requise'
    })
});

const updateCategorySchema = joi.object({
    name: joi.string().min(2).max(100).messages({
        'string.min': 'Le nom de la catégorie doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom de la catégorie ne doit pas dépasser {#limit} caractères'
    }),

    description: joi.string().messages({
    'string.base': 'La description de la catégorie doit être une chaîne de caractères'
    })
}).min(1).messages({
'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

export { createCategorySchema, updateCategorySchema };

