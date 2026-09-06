import joi from 'joi';

const createShippingMethodSchema = joi.object({
    name: joi.string()
        .valid("Lettre Suivie", "Colissimo", "Mondial Relay")
        .required()
        .messages({
            'any.only': 'Le nom du mode de livraison est invalide',
            'any.required': 'Le nom du mode de livraison est requis'
        }),

    carrier: joi.string()
        .valid("La Poste", "Mondial Relay")
        .required()
        .messages({
            'any.only': 'Le transporteur est invalide',
            'any.required': 'Le transporteur est requis'
        }),

    deliveryType: joi.string()
        .valid("Domicile", "Point relais")
        .required()
        .messages({
            'any.only': 'Le type de livraison est invalide',
            'any.required': 'Le type de livraison est requis'
        })
});

const updateShippingMethodSchema = joi.object({
    name: joi.string()
        .valid("Lettre Suivie", "Colissimo", "Mondial Relay")
        .messages({
            'any.only': 'Le nom du mode de livraison est invalide'
        }),

    carrier: joi.string()
        .valid("La Poste", "Mondial Relay")
        .messages({
            'any.only': 'Le transporteur est invalide'
        }),

    deliveryType: joi.string()
        .valid("Domicile", "Point relais")
        .messages({
            'any.only': 'Le type de livraison est invalide'
        })
}).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

export { createShippingMethodSchema, updateShippingMethodSchema };