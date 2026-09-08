import joi from 'joi';

const createOrderSchema = joi.object({
    items: joi.array()
        .items(
            joi.object({
                productId: joi.number()
                    .integer()
                    .positive()
                    .required()
                    .messages({
                        'number.base': 'L\'ID du produit doit être un nombre',
                        'number.integer': 'L\'ID du produit doit être un entier',
                        'number.positive': 'L\'ID du produit doit être positif',
                        'any.required': 'L\'ID du produit est requis'
                    }),

                quantity: joi.number()
                    .integer()
                    .min(1)
                    .max(100)
                    .required()
                    .messages({
                        'number.base': 'La quantité doit être un nombre',
                        'number.integer': 'La quantité doit être un entier',
                        'number.min': 'La quantité doit être au moins de {#limit}',
                        'number.max': 'La quantité ne peut pas dépasser {#limit}',
                        'any.required': 'La quantité est requise'
                    })
            })
        )
        .min(1)
        .max(50)
        .required()
        .messages({
            'array.min': 'La commande doit contenir au moins un produit',
            'array.max': 'La commande ne peut pas contenir plus de {#limit} produits',
            'any.required': 'Les produits de la commande sont requis'
        }),

    shippingMethodId: joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID de la méthode de livraison doit être un nombre',
            'number.integer': 'L\'ID de la méthode de livraison doit être un entier',
            'number.positive': 'L\'ID de la méthode de livraison doit être positif',
            'any.required': 'La méthode de livraison est requise'
        }),

    shippingFirstName: joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
        .required()
        .messages({
            'string.min': 'Le prénom doit contenir au moins {#limit} caractères',
            'string.max': 'Le prénom ne doit pas dépasser {#limit} caractères',
            'string.pattern.base': 'Le prénom ne doit pas contenir de chiffres ou de caractères spéciaux',
            'any.required': 'Le prénom est requis'
        }),

    shippingLastName: joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
        .required()
        .messages({
            'string.min': 'Le nom doit contenir au moins {#limit} caractères',
            'string.max': 'Le nom ne doit pas dépasser {#limit} caractères',
            'string.pattern.base': 'Le nom ne doit pas contenir de chiffres ou de caractères spéciaux',
            'any.required': 'Le nom est requis'
        }),

    shippingCountry: joi.string()
        .trim()
        .valid('France')
        .required()
        .messages({
            'any.only': 'Le pays de livraison doit être la France',
            'any.required': 'Le pays de livraison est requis'
        }),

    shippingAddress: joi.string()
        .trim()
        .min(2)
        .max(255)
        .required()
        .messages({
            'string.min': 'L\'adresse doit contenir au moins {#limit} caractères',
            'string.max': 'L\'adresse ne doit pas dépasser {#limit} caractères',
            'any.required': 'L\'adresse est requise'
        }),

    shippingAddress2: joi.string()
        .trim()
        .max(255)
        .allow('', null)
        .optional()
        .messages({
            'string.max': 'Le complément d\'adresse ne doit pas dépasser {#limit} caractères'
        }),

    shippingPostalCode: joi.string()
        .trim()
        .pattern(/^[0-9]{5}$/)
        .required()
        .messages({
            'string.pattern.base': 'Le code postal doit contenir exactement 5 chiffres',
            'any.required': 'Le code postal est requis'
        }),

    shippingCity: joi.string()
        .trim()
        .min(2)
        .max(100)
        .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
        .required()
        .messages({
            'string.min': 'La ville doit contenir au moins {#limit} caractères',
            'string.max': 'La ville ne doit pas dépasser {#limit} caractères',
            'string.pattern.base': 'La ville ne doit pas contenir de chiffres ou de caractères spéciaux',
            'any.required': 'La ville est requise'
        }),

    shippingPhone: joi.string()
        .trim()
        .pattern(/^(?:(?:\+33|0)[1-9])(?:[ .-]?[0-9]{2}){4}$/)
        .required()
        .messages({
            'string.pattern.base': 'Le numéro de téléphone est invalide',
            'any.required': 'Le numéro de téléphone est requis'
        }),

    relayPoint: joi.object({
        relayPointId: joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                'number.base': 'L\'ID du point relais doit être un nombre',
                'number.integer': 'L\'ID du point relais doit être un entier',
                'number.positive': 'L\'ID du point relais doit être positif',
                'any.required': 'L\'ID du point relais est requis'
            }),

        relayPointName: joi.string()
            .trim()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'Le nom du point relais doit contenir au moins {#limit} caractères',
                'string.max': 'Le nom du point relais ne doit pas dépasser {#limit} caractères',
                'any.required': 'Le nom du point relais est requis'
            }),

        relayPointAddress: joi.string()
            .trim()
            .min(2)
            .max(255)
            .required()
            .messages({
                'string.min': 'L\'adresse du point relais doit contenir au moins {#limit} caractères',
                'string.max': 'L\'adresse du point relais ne doit pas dépasser {#limit} caractères',
                'any.required': 'L\'adresse du point relais est requise'
            }),

        relayPointPostalCode: joi.string()
            .trim()
            .pattern(/^[0-9]{5}$/)
            .required()
            .messages({
                'string.pattern.base': 'Le code postal du point relais doit contenir exactement 5 chiffres',
                'any.required': 'Le code postal du point relais est requis'
            }),

        relayPointCity: joi.string()
            .trim()
            .min(2)
            .max(100)
            .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
            .required()
            .messages({
                'string.min': 'La ville du point relais doit contenir au moins {#limit} caractères',
                'string.max': 'La ville du point relais ne doit pas dépasser {#limit} caractères',
                'string.pattern.base': 'La ville du point relais ne doit pas contenir de chiffres ou de caractères spéciaux',
                'any.required': 'La ville du point relais est requise'
            }),

        relayPointCountry: joi.string()
            .trim()
            .valid('France')
            .default('France')
            .messages({
                'any.only': 'Le pays du point relais doit être la France'
            })
    }).optional()
});


const updateOrderSchema = joi.object({
    statut: joi.string()
        .valid(
            'EN_ATTENTE',
            'CONFIRMEE',
            'EXPEDIEE',
            'LIVREE',
            'ANNULEE'
        )
        .messages({
            'any.only': 'Le statut de la commande est invalide'
        }),

    shippingFirstName: joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
        .messages({
            'string.min': 'Le prénom doit contenir au moins {#limit} caractères',
            'string.max': 'Le prénom ne doit pas dépasser {#limit} caractères',
            'string.pattern.base': 'Le prénom ne doit pas contenir de chiffres ou de caractères spéciaux'
        }),

    shippingLastName: joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
        .messages({
            'string.min': 'Le nom doit contenir au moins {#limit} caractères',
            'string.max': 'Le nom ne doit pas dépasser {#limit} caractères',
            'string.pattern.base': 'Le nom ne doit pas contenir de chiffres ou de caractères spéciaux'
        }),

    shippingCountry: joi.string()
        .trim()
        .valid('France')
        .messages({
            'any.only': 'Le pays de livraison doit être la France'
        }),

    shippingAddress: joi.string()
        .trim()
        .min(2)
        .max(255)
        .messages({
            'string.min': 'L\'adresse doit contenir au moins {#limit} caractères',
            'string.max': 'L\'adresse ne doit pas dépasser {#limit} caractères'
        }),

    shippingAddress2: joi.string()
        .trim()
        .max(255)
        .allow('', null)
        .optional()
        .messages({
            'string.max': 'Le complément d\'adresse ne doit pas dépasser {#limit} caractères'
        }),

    shippingPostalCode: joi.string()
        .trim()
        .pattern(/^[0-9]{5}$/)
        .messages({
            'string.pattern.base': 'Le code postal doit contenir exactement 5 chiffres'
        }),

    shippingCity: joi.string()
        .trim()
        .min(2)
        .max(100)
        .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/)
        .messages({
            'string.min': 'La ville doit contenir au moins {#limit} caractères',
            'string.max': 'La ville ne doit pas dépasser {#limit} caractères',
            'string.pattern.base': 'La ville ne doit pas contenir de chiffres ou de caractères spéciaux'
        }),

    shippingPhone: joi.string()
        .trim()
        .pattern(/^(?:(?:\+33|0)[1-9])(?:[ .-]?[0-9]{2}){4}$/)
        .messages({
            'string.pattern.base': 'Le numéro de téléphone est invalide'
        })
})
    .min(1)
    .messages({
        'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
    });


export { createOrderSchema, updateOrderSchema };