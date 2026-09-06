import joi from 'joi';

const createShippingRateSchema = joi.object({
    shippingMethodId: joi.number()
        .integer()
        .required()
        .messages({
            'number.base': 'L\'identifiant du mode de livraison doit être un nombre',
            'number.integer': 'L\'identifiant du mode de livraison doit être un entier',
            'any.required': 'L\'identifiant du mode de livraison est requis'
        }),

    minWeight: joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Le poids minimum doit être un nombre',
            'number.min': 'Le poids minimum ne peut pas être négatif',
            'any.required': 'Le poids minimum est requis'
        }),

    maxWeight: joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Le poids maximum doit être un nombre',
            'number.min': 'Le poids maximum ne peut pas être négatif',
            'any.required': 'Le poids maximum est requis'
        }),

    cost: joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Le coût doit être un nombre',
            'number.min': 'Le coût ne peut pas être négatif',
            'any.required': 'Le coût est requis'
        })
    }).custom((value, helpers) => {
    if (value.maxWeight < value.minWeight) {
    return helpers.error('any.invalid');
    }

    return value;

    }).messages({
    'any.invalid': 'Le poids maximum doit être supérieur ou égal au poids minimum'
});


const updateShippingRateSchema = joi.object({
    shippingMethodId: joi.number()
        .integer()
        .messages({
            'number.base': 'L\'identifiant du mode de livraison doit être un nombre',
            'number.integer': 'L\'identifiant du mode de livraison doit être un entier'
        }),

    minWeight: joi.number()
        .min(0)
        .messages({
            'number.base': 'Le poids minimum doit être un nombre',
            'number.min': 'Le poids minimum ne peut pas être négatif'
        }),

    maxWeight: joi.number()
        .min(0)
        .messages({
            'number.base': 'Le poids maximum doit être un nombre',
            'number.min': 'Le poids maximum ne peut pas être négatif'
        }),

    cost: joi.number()
        .min(0)
        .messages({
            'number.base': 'Le coût doit être un nombre',
            'number.min': 'Le coût ne peut pas être négatif'
        })
}).min(1).messages({
    'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
});

export { createShippingRateSchema, updateShippingRateSchema };