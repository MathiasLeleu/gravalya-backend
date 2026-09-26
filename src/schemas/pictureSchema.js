import joi from 'joi';

const createPictureSchema = joi.object({
    url: joi.string().min(1).max(255).required().messages({
        'string.min': "L'URL de l'image doit contenir au moins {#limit} caractère",
        'string.max': "L'URL de l'image ne doit pas dépasser {#limit} caractères",
        'any.required': "L'URL de l'image est requise"
    }),

    alt: joi.string().min(1).max(255).required().messages({
        'string.min': "Le texte alternatif de l'image doit contenir au moins {#limit} caractère",
        'string.max': "Le texte alternatif de l'image ne doit pas dépasser {#limit} caractères",
        'any.required': "Le texte alternatif de l'image est requis"
    }),

    isMain: joi.boolean().default(false).messages({
        'boolean.base': "Le champ isMain doit être un booléen"
    })
});

const updatePictureSchema = joi.object({
    url: joi.string().min(1).max(255).messages({
        'string.min': "L'URL de l'image doit contenir au moins {#limit} caractère",
        'string.max': "L'URL de l'image ne doit pas dépasser {#limit} caractères",
    }),

    alt: joi.string().min(1).max(255).messages({
        'string.min': "Le texte alternatif de l'image doit contenir au moins {#limit} caractère",
        'string.max': "Le texte alternatif de l'image ne doit pas dépasser {#limit} caractères",
    }),

    isMain: joi.boolean().messages({
        'boolean.base': "Le champ isMain doit être un booléen"
    })
}).min(1);

export { createPictureSchema, updatePictureSchema };