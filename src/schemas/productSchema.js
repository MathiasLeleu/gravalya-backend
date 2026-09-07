import joi from 'joi';

const createProductSchema = joi.object({
    name: joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Le nom du produit doit contenir au moins {#limit} caractères',
            'string.max': 'Le nom du produit ne doit pas dépasser {#limit} caractères',
            'any.required': 'Le nom du produit est requis'
        }),

    description: joi.string()
        .required()
        .messages({
            'any.required': 'La description du produit est requise'
        }),

    price: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .required()
        .messages({
            'number.base': 'Le prix doit être un nombre',
            'number.min': 'Le prix ne peut pas être négatif',
            'number.max': 'Le prix ne peut pas dépasser {#limit}',
            'number.precision': 'Le prix ne peut pas avoir plus de {#limit} décimales',
            'any.required': 'Le prix est requis'
        }),

    weight: joi.number()
        .min(0)
        .max(99999999.999)
        .precision(3)
        .required()
        .messages({
            'number.base': 'Le poids doit être un nombre',
            'number.min': 'Le poids ne peut pas être négatif',
            'number.max': 'Le poids ne peut pas dépasser {#limit} kg',
            'number.precision': 'Le poids ne peut pas avoir plus de {#limit} décimales',
            'any.required': 'Le poids est requis'
        }),

    height: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .required()
        .messages({
            'number.base': 'La hauteur doit être un nombre',
            'number.min': 'La hauteur ne peut pas être négative',
            'number.max': 'La hauteur ne peut pas dépasser {#limit} cm',
            'number.precision': 'La hauteur ne peut pas avoir plus de {#limit} décimales',
            'any.required': 'La hauteur est requise'
        }),

    length: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .required()
        .messages({
            'number.base': 'La longueur doit être un nombre',
            'number.min': 'La longueur ne peut pas être négative',
            'number.max': 'La longueur ne peut pas dépasser {#limit} cm',
            'number.precision': 'La longueur ne peut pas avoir plus de {#limit} décimales',
            'any.required': 'La longueur est requise'
        }),

    width: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .required()
        .messages({
            'number.base': 'La largeur doit être un nombre',
            'number.min': 'La largeur ne peut pas être négative',
            'number.max': 'La largeur ne peut pas dépasser {#limit} cm',
            'number.precision': 'La largeur ne peut pas avoir plus de {#limit} décimales',
            'any.required': 'La largeur est requise'
        }),

    stockQuantity: joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'La quantité en stock doit être un nombre',
            'number.integer': 'La quantité en stock doit être un nombre entier',
            'number.min': 'La quantité en stock ne peut pas être négative',
            'any.required': 'La quantité en stock est requise'
        }),

    categoryId: joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'identifiant de la catégorie doit être un nombre',
            'number.integer': 'L\'identifiant de la catégorie doit être un nombre entier',
            'number.positive': 'L\'identifiant de la catégorie doit être positif',
            'any.required': 'La catégorie est requise'
        })
});

const updateProductSchema = joi.object({
    name: joi.string()
        .min(2)
        .max(100)
        .messages({
            'string.min': 'Le nom du produit doit contenir au moins {#limit} caractères',
            'string.max': 'Le nom du produit ne doit pas dépasser {#limit} caractères'
        }),

    description: joi.string()
        .messages({
            'string.base': 'La description doit être une chaîne de caractères'
        }),

    price: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .messages({
            'number.base': 'Le prix doit être un nombre',
            'number.min': 'Le prix ne peut pas être négatif',
            'number.max': 'Le prix ne peut pas dépasser {#limit}',
            'number.precision': 'Le prix ne peut pas avoir plus de {#limit} décimales'
        }),

    weight: joi.number()
        .min(0)
        .max(99999999.999)
        .precision(3)
        .messages({
            'number.base': 'Le poids doit être un nombre',
            'number.min': 'Le poids ne peut pas être négatif',
            'number.max': 'Le poids ne peut pas dépasser {#limit} kg',
            'number.precision': 'Le poids ne peut pas avoir plus de {#limit} décimales'
        }),

    height: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .messages({
            'number.base': 'La hauteur doit être un nombre',
            'number.min': 'La hauteur ne peut pas être négative',
            'number.max': 'La hauteur ne peut pas dépasser {#limit} cm',
            'number.precision': 'La hauteur ne peut pas avoir plus de {#limit} décimales'
        }),

    length: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .messages({
            'number.base': 'La longueur doit être un nombre',
            'number.min': 'La longueur ne peut pas être négative',
            'number.max': 'La longueur ne peut pas dépasser {#limit} cm',
            'number.precision': 'La longueur ne peut pas avoir plus de {#limit} décimales'
        }),

    width: joi.number()
        .min(0)
        .max(99999999.99)
        .precision(2)
        .messages({
            'number.base': 'La largeur doit être un nombre',
            'number.min': 'La largeur ne peut pas être négative',
            'number.max': 'La largeur ne peut pas dépasser {#limit} cm',
            'number.precision': 'La largeur ne peut pas avoir plus de {#limit} décimales'
        }),

    stockQuantity: joi.number()
        .integer()
        .min(0)
        .messages({
            'number.base': 'La quantité en stock doit être un nombre',
            'number.integer': 'La quantité en stock doit être un nombre entier',
            'number.min': 'La quantité en stock ne peut pas être négative'
        }),

    active: joi.boolean()
        .messages({
            'boolean.base': 'Le statut actif doit être un booléen'
        }),

    categoryId: joi.number()
        .integer()
        .positive()
        .messages({
            'number.base': 'L\'identifiant de la catégorie doit être un nombre',
            'number.integer': 'L\'identifiant de la catégorie doit être un nombre entier',
            'number.positive': 'L\'identifiant de la catégorie doit être positif'
        })

}).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});