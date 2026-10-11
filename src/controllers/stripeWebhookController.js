import { Order } from "../models/Order.js";
import { OrderLine } from "../models/Order_Line.js";
import { Product } from "../models/Product.js";
import { sequelize } from "../models/connection.js";
import { stripe } from "../services/stripeService.js";

const stripeWebhookController = {
    async handleWebhook(req, res) {
        const signature = req.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!signature || !webhookSecret) {
            return res.status(400).send("Signature Stripe manquante.");
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                signature,
                webhookSecret
            );
        } catch (error) {
            console.error(
                "Signature du webhook Stripe invalide :",
                error.message
            );

            return res.status(400).send("Signature invalide.");
        }

        const supportedEvents = [
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
            "checkout.session.expired",
        ];

        if (!supportedEvents.includes(event.type)) {
            return res.status(200).json({ received: true });
        }

        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (!orderId || !session.id) {
            console.error(
                "Métadonnées de commande absentes de la session Stripe."
            );

            return res.status(400).send(
                "Commande introuvable dans la session."
            );
        }

        try {
            // Une session expirée libère le stock uniquement si la commande
            // est toujours en attente et si la session correspond.
            if (event.type === "checkout.session.expired") {
                await sequelize.transaction(async (t) => {
                    const order = await Order.findByPk(orderId, {
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });

                    if (!order) {
                        console.warn(
                            "Commande introuvable pour la session expirée :",
                            session.id
                        );
                        return;
                    }

                    const orderLines = await OrderLine.findAll({
                        where: { orderId: order.id },
                        transaction: t,
                    });

                    if (order.stripeSessionId !== session.id) {
                        console.warn(
                            "La session expirée ne correspond pas à la commande :",
                            order.orderNumber
                        );
                        return;
                    }

                    if (order.statut !== "EN_ATTENTE") {
                        // Commande déjà confirmée ou annulée :
                        // aucune restitution supplémentaire.
                        return;
                    }

                    order.statut = "ANNULEE";
                    await order.save({ transaction: t });

                    for (const line of orderLines) {
                        await Product.increment("stockQuantity", {
                            by: Number(line.quantity),
                            where: { id: line.productId },
                            transaction: t,
                        });
                    }

                    console.log(
                        `Session Stripe expirée : commande ${order.orderNumber} annulée et stock restitué.`
                    );
                });

                return res.status(200).json({ received: true });
            }

            // Une commande ne peut être confirmée que si Stripe indique
            // explicitement que le paiement est encaissé.
            if (session.payment_status !== "paid") {
                return res.status(200).json({ received: true });
            }

            await sequelize.transaction(async (t) => {
                const order = await Order.findByPk(orderId, {
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                if (!order) {
                    throw new Error(
                        `Commande introuvable pour la session ${session.id}.`
                    );
                }

                if (order.stripeSessionId !== session.id) {
                    console.warn(
                        "La session Stripe ne correspond pas à la commande :",
                        order.orderNumber
                    );
                    return;
                }

                const expectedAmountCents = Math.round(
                    (Number(order.amount) + Number(order.shippingCost)) * 100
                );

                if (
                    session.currency !== "eur" ||
                    session.amount_total !== expectedAmountCents
                ) {
                    throw new Error(
                        `Montant Stripe incorrect pour la commande ${order.orderNumber}.`
                    );
                }

                if (order.statut === "CONFIRMEE") {
                    // Événement déjà traité : aucune modification.
                    return;
                }

                if (order.statut === "ANNULEE") {
                    console.error(
                        `ALERTE : paiement encaissé pour la commande annulée ${order.orderNumber}. Vérification manuelle nécessaire.`
                    );

                    // Ne pas réactiver automatiquement la commande.
                    // Ne pas rembourser automatiquement sans procédure dédiée.
                    return;
                }

                if (order.statut !== "EN_ATTENTE") {
                    console.error(
                        `Statut inattendu après paiement pour ${order.orderNumber} : ${order.statut}`
                    );
                    throw new Error(
                        "Impossible de confirmer la commande après paiement."
                    );
                }

                order.statut = "CONFIRMEE";
                order.paidAt = new Date();

                await order.save({ transaction: t });

                console.log(
                    `Paiement Stripe confirmé pour la commande ${order.orderNumber}.`
                );
            });

            return res.status(200).json({ received: true });
        } catch (error) {
            console.error(
                "Erreur lors du traitement du webhook Stripe :",
                error
            );

            // Réponse 500 pour permettre à Stripe de réessayer.
            return res.status(500).send(
                "Erreur de traitement du webhook."
            );
        }
    },
};

export { stripeWebhookController };
