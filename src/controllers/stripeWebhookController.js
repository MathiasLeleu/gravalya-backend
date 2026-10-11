import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
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

        try {
            if (
                event.type !== "checkout.session.completed" &&
                event.type !== "checkout.session.async_payment_succeeded" &&
                event.type !== "checkout.session.expired"
            ) {
                return res.status(200).json({ received: true });
            }

            const session = event.data.object;
            // Une session Checkout expirée doit libérer le stock
            // uniquement si la commande est encore en attente.
            
            if (event.type === "checkout.session.expired") {
                const orderId = session.metadata?.orderId;

                if (!orderId || !session.id) {
                    console.error(
                        "Métadonnées absentes de la session Stripe expirée."
                    );

                    return res.status(400).send(
                        "Commande introuvable dans la session."
                    );
                }

                const transaction = await Order.sequelize.transaction();

                try {
                    const order = await Order.findByPk(orderId, {
                        include: [{ association: "orderLines" }],
                        transaction,
                    });

                    if (!order) {
                        await transaction.rollback();

                        console.error(
                            "Commande introuvable pour la session expirée :",
                            session.id
                        );

                        return res.status(200).json({ received: true });
                    }

                    if (order.stripeSessionId !== session.id) {
                        await transaction.rollback();

                        console.warn(
                            "La session expirée ne correspond pas à la commande :",
                            order.orderNumber
                        );

                        return res.status(200).json({ received: true });
                    }

                    // Annuler uniquement une commande encore en attente.
                    const [updatedRows] = await Order.update(
                        { statut: "ANNULEE" },
                        {
                            where: {
                                id: order.id,
                                statut: "EN_ATTENTE",
                            },
                            transaction,
                        }
                    );

                    if (updatedRows === 0) {
                        await transaction.rollback();

                        // Commande déjà confirmée ou déjà annulée :
                        // ne jamais restituer le stock une seconde fois.
                        return res.status(200).json({ received: true });
                    }

                    // Restituer le stock dans la même transaction.
                    for (const line of order.orderLines) {
                        await Product.increment("stockQuantity", {
                            by: Number(line.quantity),
                            where: { id: line.productId },
                            transaction,
                        });
                    }

                    await transaction.commit();

                    console.log(
                        `Session Stripe expirée : commande ${order.orderNumber} annulée et stock restitué.`
                    );

                    return res.status(200).json({ received: true });
                } catch (error) {
                    await transaction.rollback();
                    throw error;
                }
            }

            // Un paiement non confirmé ne doit jamais confirmer la commande.
            if (session.payment_status !== "paid") {
                return res.status(200).json({ received: true });
            }

            const orderId = session.metadata?.orderId;

            if (!orderId || !session.id) {
                console.error("Métadonnées de commande absentes du paiement Stripe.");
                return res.status(400).send("Commande introuvable dans la session.");
            }

            const order = await Order.findByPk(orderId);

            if (!order) {
                console.error("Commande introuvable pour la session :", session.id);
                return res.status(500).send("Commande introuvable.");
            }

            // Vérifier que cette session appartient bien à la commande.
            if (order.stripeSessionId !== session.id) {
                console.error(
                    "La session Stripe ne correspond pas à la commande :",
                    order.orderNumber
                );

                return res.status(200).json({ received: true });
            }

            // Vérifier le montant réellement payé par rapport à la commande.
            const expectedAmountCents = Math.round(
                (Number(order.amount) + Number(order.shippingCost)) * 100
            );

            if (
                session.currency !== "eur" ||
                session.amount_total !== expectedAmountCents
            ) {
                console.error(
                    "Montant Stripe incorrect pour la commande :",
                    order.orderNumber
                );

                return res.status(500).send("Montant du paiement invalide.");
            }

            
            const [updatedRows] = await Order.update(
                {
                    statut: "CONFIRMEE",
                    paidAt: new Date(),
                },
                {
                    where: {
                        id: order.id,
                        statut: "EN_ATTENTE",
                    },
                }
            );

            // Une autre requête a pu modifier la commande entre-temps.
            if (updatedRows === 0) {
                const currentOrder = await Order.findByPk(order.id);

                if (currentOrder?.statut === "CONFIRMEE") {
                    // Événement Stripe déjà traité : aucune nouvelle modification.
                    return res.status(200).json({ received: true });
                }

                if (currentOrder?.statut === "ANNULEE") {
                    console.error(
                        `ALERTE : paiement encaissé pour la commande annulée ${order.orderNumber}. Vérification manuelle nécessaire.`
                    );

                    // Le paiement doit être examiné manuellement.
                    // Aucun remboursement automatique n'est effectué ici.
                    return res.status(200).json({ received: true });
                }

                console.error(
                    "Impossible de confirmer la commande après paiement :",
                    order.orderNumber,
                    currentOrder?.statut
                );

                return res.status(500).send(
                    "Impossible de confirmer la commande."
                );
            }

            console.log(
                `Paiement Stripe confirmé pour la commande ${order.orderNumber}.`
            );

            return res.status(200).json({ received: true });
        } catch (error) {
            console.error("Erreur lors du traitement du webhook Stripe :", error);

            // Stripe pourra réessayer si le traitement a échoué.
            return res.status(500).send("Erreur de traitement du webhook.");
        }
    },
};

export { stripeWebhookController };