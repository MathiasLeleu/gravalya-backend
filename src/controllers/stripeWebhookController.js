
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

                    if (order.stripeSessionId !== session.id) {
                        console.warn(
                            "La session expirée ne correspond pas à la commande :",
                            order.orderNumber
                        );
                        return;
                    }

                    if (order.statut !== "EN_ATTENTE") {
                        return;
                    }

                    const orderLines = await OrderLine.findAll({
                        where: { orderId: order.id },
                        transaction: t,
                    });

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

            // Seuls les paiements réellement encaissés sont traités.
            if (session.payment_status !== "paid") {
                return res.status(200).json({ received: true });
            }

            // On vérifie la commande et son état dans une transaction.
            const result = await sequelize.transaction(async (t) => {
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

                    return { action: "IGNORE" };
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

                // Un remboursement déjà réussi ne doit jamais être relancé.
                if (order.statut === "ANNULEE") {
                    if (!session.payment_intent) {
                        throw new Error(
                            `PaymentIntent absent pour la commande ${order.orderNumber}.`
                        );
                    }

                    if (order.refundStatus === "REUSSI") {
                        console.log(
                            `Remboursement déjà effectué pour la commande ${order.orderNumber}.`
                        );

                        return { action: "IGNORE" };
                    }

                    // On conserve une clé stable pour la même commande/session.
                    // EN_COURS peut correspondre à une interruption après
                    // l'appel Stripe : on reprend avec la même clé.
                    if (order.refundStatus !== "EN_COURS") {
                        order.refundRequestedAt = new Date();
                    }

                    order.refundStatus = "EN_COURS";
                    order.refundError = null;

                    await order.save({ transaction: t });

                    return {
                        action: "REFUND",
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        sessionId: session.id,
                        paymentIntent:
                            typeof session.payment_intent === "string"
                                ? session.payment_intent
                                : session.payment_intent.id,
                    };
                }

                if (order.statut === "CONFIRMEE") {
                    return { action: "IGNORE" };
                }

                if (order.statut !== "EN_ATTENTE") {
                    throw new Error(
                        `Statut inattendu après paiement pour ${order.orderNumber} : ${order.statut}`
                    );
                }

                order.statut = "CONFIRMEE";
                order.paidAt = new Date();

                await order.save({ transaction: t });

                console.log(
                    `Paiement Stripe confirmé pour la commande ${order.orderNumber}.`
                );

                return { action: "CONFIRM" };
            });

            // L'appel à Stripe est réalisé hors transaction SQL.
            if (result.action === "REFUND") {
                const refund = await stripe.refunds.create(
                    {
                        payment_intent: result.paymentIntent,
                    },
                    {
                        idempotencyKey:
                            `refund-cancelled-order-${result.orderId}-${result.sessionId}`,
                    }
                );

                // On enregistre le résultat dans une nouvelle transaction.
                await sequelize.transaction(async (t) => {
                    const order = await Order.findByPk(result.orderId, {
                        transaction: t,
                        lock: t.LOCK.UPDATE,
                    });

                    if (!order) {
                        throw new Error(
                            `Commande ${result.orderNumber} introuvable après le remboursement Stripe.`
                        );
                    }

                    if (order.stripeSessionId !== result.sessionId) {
                        throw new Error(
                            `La session Stripe ne correspond plus à la commande ${result.orderNumber}.`
                        );
                    }

                    order.stripeRefundId = refund.id;

                    if (refund.status === "succeeded") {
                        order.refundStatus = "REUSSI";
                        order.refundCompletedAt = new Date();
                        order.refundError = null;

                        await order.save({ transaction: t });

                        console.log(
                            `Remboursement Stripe réussi pour la commande ${result.orderNumber}.`
                        );

                        return;
                    }

                    if (refund.status === "failed") {
                        order.refundStatus = "ECHEC";
                        order.refundError =
                            "Stripe indique que le remboursement a échoué.";

                        await order.save({ transaction: t });

                        console.error(
                            `Échec du remboursement Stripe pour la commande ${result.orderNumber}. Intervention nécessaire.`
                        );

                        return;
                    }

                    // Par exemple, Stripe peut encore traiter le remboursement.
                    // On conserve EN_COURS pour ne pas le considérer comme terminé.
                    order.refundStatus = "EN_COURS";
                    order.refundError = null;

                    await order.save({ transaction: t });

                    console.log(
                        `Remboursement Stripe en cours pour la commande ${result.orderNumber} : ${refund.status}.`
                    );
                });
            }

            return res.status(200).json({ received: true });
        } catch (error) {
            console.error(
                "Erreur lors du traitement du webhook Stripe :",
                error
            );

            // On conserve une trace de l'erreur pour permettre le diagnostic.
            // Stripe recevra un HTTP 500 et pourra réessayer le webhook.
            if (
                event.type !== "checkout.session.expired" &&
                session.payment_status === "paid"
            ) {
                try {
                    await sequelize.transaction(async (t) => {
                        const order = await Order.findByPk(orderId, {
                            transaction: t,
                            lock: t.LOCK.UPDATE,
                        });

                        if (
                            order &&
                            order.stripeSessionId === session.id &&
                            order.statut === "ANNULEE" &&
                            order.refundStatus === "EN_COURS"
                        ) {
                            // Le résultat Stripe peut être incertain (erreur réseau,
                            // délai dépassé, interruption). On conserve EN_COURS pour
                            // permettre une reprise avec la même clé d'idempotence.
                            order.refundError = String(
                                error.message || error
                            ).slice(0, 5000);

                            await order.save({ transaction: t });
                        }
                    });
                } catch (trackingError) {
                    console.error(
                        "Impossible d'enregistrer l'erreur de remboursement :",
                        trackingError
                    );
                }
            }

            return res.status(500).send(
                "Erreur de traitement du webhook."
            );
        }
    },
};

export { stripeWebhookController };