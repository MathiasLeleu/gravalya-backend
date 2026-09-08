import { sequelize } from '../models/connection.js';
import { Order } from '../models/Order.js';
import { OrderLine } from '../models/Order_Line.js';
import { OrderRelayPoint } from '../models/Order_Relay_Point.js';
import { Product } from '../models/Product.js';
import { ShippingMethod } from '../models/Shipping_Method.js';
import { ShippingRate } from '../models/Shipping_Rate.js';
import { Op } from 'sequelize';
import { badRequest, notFound, conflict } from '../utils/error.js';

function generateOrderNumber() {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `CMD-${datePart}-${randomPart}`;
}

const STATUTS_VALIDES = [
    "EN_ATTENTE",
    "CONFIRMEE",
    "EXPEDIEE",
    "LIVREE",
    "ANNULEE"
];

// Includes standards réutilisés sur tous les endpoints qui renvoient une commande,
// pour garantir un "shape" de réponse cohérent partout.
const ORDER_INCLUDES = [
    { association: 'orderLines', include: ['product'] },
    { association: 'orderRelayPoint' },
    { association: 'shippingMethod' },
    { association: 'shippingRate' },
    { association: 'user', attributes: { exclude: ['password'] } },
];

const orderController = {

    // Get all orders
    async showAllOrders(req, res) {
        const orders = await Order.findAll({
            include: ORDER_INCLUDES
        });

        res.status(200).json(orders);
    },

    // Get a single order by ID
    async showOneOrder(req, res) {
        const orderId = parseInt(req.params.id);
        const order = await Order.findByPk(orderId, {
            include: ORDER_INCLUDES
        });

        if (!order) {
            notFound("Commande non trouvée.");
        }

        res.status(200).json(order);
    },

    // Create a new order
    async createOrder(req, res) {
        const {
            items,
            shippingMethodId,
            shippingFirstName,
            shippingLastName,
            shippingCountry,
            shippingAddress,
            shippingAddress2,
            shippingPostalCode,
            shippingCity,
            shippingPhone,
            relayPoint,
        } = req.body;

        //const userId = req.user.id;
        const userId = 1; // TODO: remplacer par l'ID de l'utilisateur authentifié

        if (!Array.isArray(items) || items.length === 0) {
            badRequest('La commande doit contenir au moins un produit.');
        }

        if (
            !shippingMethodId ||
            !shippingFirstName ||
            !shippingLastName ||
            !shippingAddress ||
            !shippingPostalCode ||
            !shippingCity ||
            !shippingPhone
        ) {
            badRequest('Les informations de livraison sont incomplètes.');
        }

        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity < 1) {
                badRequest(
                    'Chaque article doit avoir un productId et une quantity >= 1.'
                );
            }
        }

        const order = await sequelize.transaction(async (t) => {
            const shippingMethod = await ShippingMethod.findByPk(
                shippingMethodId,
                { transaction: t }
            );

            if (!shippingMethod) {
                notFound('Méthode de livraison introuvable.');
            }

            if (
                shippingMethod.deliveryType === "Point relais" &&
                !relayPoint
            ) {
                badRequest(
                    'Un point relais est requis pour cette méthode de livraison.'
                );
            }

            const productIds = items.map((i) => i.productId);

            const products = await Product.findAll({
                where: {
                    id: {
                        [Op.in]: productIds
                    }
                },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });

            const productMap = new Map(
                products.map((p) => [p.id, p])
            );

            let amount = 0;
            let totalWeight = 0;
            const orderLinesData = [];

            for (const item of items) {
                const product = productMap.get(item.productId);

                if (!product) {
                    notFound(
                        `Produit introuvable (id: ${item.productId}).`
                    );
                }

                if (!product.active) {
                    badRequest(
                        `Le produit "${product.name}" n'est plus disponible.`
                    );
                }

                if (product.stockQuantity < item.quantity) {
                    conflict(
                        `Stock insuffisant pour "${product.name}" (disponible: ${product.stockQuantity}, demandé: ${item.quantity}).`
                    );
                }

                const unitPrice = parseFloat(product.price);
                const unitWeight = parseFloat(product.weight);

                amount += unitPrice * item.quantity;
                totalWeight += unitWeight * item.quantity;

                orderLinesData.push({
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice,
                    unitWeight,
                });
            }

            amount = Math.round(amount * 100) / 100;
            totalWeight = Math.round(totalWeight * 1000) / 1000;

            const shippingRate = await ShippingRate.findOne({
                where: {
                    shippingMethodId,
                    minWeight: { [Op.lte]: totalWeight },
                    maxWeight: { [Op.gte]: totalWeight },
                },
                transaction: t,
            });

            if (!shippingRate) {
                badRequest(
                    'Aucun tarif de livraison ne correspond au poids de la commande.'
                );
            }

            const newOrder = await Order.create({
                orderNumber: generateOrderNumber(),
                statut: "EN_ATTENTE",
                amount,
                totalWeight,
                shippingCost: parseFloat(shippingRate.cost),
                shippingMethodId,
                shippingRateId: shippingRate.id,
                userId,
                shippingFirstName,
                shippingLastName,
                shippingCountry: shippingCountry || "France",
                shippingAddress,
                shippingAddress2: shippingAddress2 || null,
                shippingPostalCode,
                shippingCity,
                shippingPhone,
            }, { transaction: t });

            await OrderLine.bulkCreate(
                orderLinesData.map((line) => ({
                    ...line,
                    orderId: newOrder.id
                })),
                { transaction: t }
            );

            for (const item of items) {
                const product = productMap.get(item.productId);

                await product.decrement(
                    "stockQuantity",
                    {
                        by: item.quantity,
                        transaction: t
                    }
                );
            }

            if (shippingMethod.deliveryType === "Point relais") {
                await OrderRelayPoint.create({
                    orderId: newOrder.id,
                    relayPointId: relayPoint.relayPointId,
                    relayPointName: relayPoint.relayPointName,
                    relayPointAddress: relayPoint.relayPointAddress,
                    relayPointPostalCode: relayPoint.relayPointPostalCode,
                    relayPointCity: relayPoint.relayPointCity,
                    relayPointCountry: relayPoint.relayPointCountry || "France",
                }, { transaction: t });
            }

            return Order.findByPk(newOrder.id, {
                include: ORDER_INCLUDES,
                transaction: t,
            });
        });

        res.status(201).json(order);
    },

    // Update an existing order (statut + infos de livraison avant expédition)
    async updateOrder(req, res) {
        const orderId = parseInt(req.params.id);
        const order = await Order.findByPk(orderId);

        if (!order) {
            notFound("Commande non trouvée.");
        }

        // TODO: Réactiver lorsque l'authentification sera mise en place.
        // Seul le propriétaire de la commande ou un admin pourra la modifier.
        //
        // if (req.user.id !== order.userId && req.user.role !== "admin") {
        //     return forbidden(
        //         "Vous n'êtes pas autorisé à modifier cette commande."
        //     );
        // }

        // req.body est déjà validé par le middleware Joi (updateOrderSchema)
        const {
            statut,
            shippingFirstName,
            shippingLastName,
            shippingCountry,
            shippingAddress,
            shippingAddress2,
            shippingPostalCode,
            shippingCity,
            shippingPhone,
        } = req.body;

        // On mémorise le statut ACTUEL avant toute modification,
        // pour ne pas vérifier l'état de livraison contre un statut qu'on vient nous-même de changer
        const statutActuel = order.statut;

        // --- Modification du statut : réservée à un admin ---
        if (statut !== undefined) {
            // TODO: Réactiver lorsque l'authentification sera mise en place.
            //if (req.user.role !== "admin") {
                //return forbidden(
                    //"Seul un administrateur peut modifier le statut de la commande."
                //);
            //}

            order.statut = statut;
        }

        // --- Modification des infos de livraison : interdite si déjà expédiée/livrée ---
        const infosLivraisonModifiees =
            shippingFirstName !== undefined ||
            shippingLastName !== undefined ||
            shippingCountry !== undefined ||
            shippingAddress !== undefined ||
            shippingAddress2 !== undefined ||
            shippingPostalCode !== undefined ||
            shippingCity !== undefined ||
            shippingPhone !== undefined;

        if (
            infosLivraisonModifiees &&
            ["EXPEDIEE", "LIVREE"].includes(statutActuel)
        ) {
            return badRequest(
                "Impossible de modifier les infos de livraison d'une commande déjà expédiée."
            );
        }

        if (shippingFirstName !== undefined) {
            order.shippingFirstName = shippingFirstName;
        }

        if (shippingLastName !== undefined) {
            order.shippingLastName = shippingLastName;
        }

        if (shippingCountry !== undefined) {
            order.shippingCountry = shippingCountry;
        }

        if (shippingAddress !== undefined) {
            order.shippingAddress = shippingAddress;
        }

        if (shippingAddress2 !== undefined) {
            order.shippingAddress2 = shippingAddress2;
        }

        if (shippingPostalCode !== undefined) {
            order.shippingPostalCode = shippingPostalCode;
        }

        if (shippingCity !== undefined) {
            order.shippingCity = shippingCity;
        }

        if (shippingPhone !== undefined) {
            order.shippingPhone = shippingPhone;
        }

        await order.save();

        const updatedOrder = await Order.findByPk(order.id, {
            include: ORDER_INCLUDES,
        });

        res.status(200).json(updatedOrder);
    },

    // Delete (annuler) an order
    async deleteOrder(req, res) {
        const orderId = parseInt(req.params.id);

        const order = await Order.findByPk(orderId, {
            include: [{ association: 'orderLines' }]
        });

        if (!order) {
            notFound('Commande non trouvée.');
        }

        if (["EXPEDIEE", "LIVREE"].includes(order.statut)) {
            badRequest(
                "Impossible d'annuler une commande déjà expédiée ou livrée."
            );
        }

        await sequelize.transaction(async (t) => {
            // Restock des produits
            for (const line of order.orderLines) {
                await Product.increment('stockQuantity', {
                    by: line.quantity,
                    where: { id: line.productId },
                    transaction: t,
                });
            }

            order.statut = "ANNULEE";

            await order.save({ transaction: t });
        });

        res.status(200).json({
            message: 'Commande annulée avec succès.'
        });
    }

};

export { orderController };