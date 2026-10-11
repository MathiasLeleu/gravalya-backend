
import { Order } from "../models/Order.js";
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
                event.type !== "checkout.session.async_payment_succeeded"
            ) {
                return res.status(200).json({ received: true });
            }

            const session = event.data.object;

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

            // Le webhook peut être reçu plusieurs fois.
            // Une commande déjà confirmée ne doit pas être retraitée.
            if (order.statut === "CONFIRMEE") {
                return res.status(200).json({ received: true });
            }

            if (order.statut !== "EN_ATTENTE") {
                console.error(
                    "Statut inattendu pour une commande payée :",
                    order.orderNumber,
                    order.statut
                );

                return res.status(200).json({ received: true });
            }

            await order.update({
                statut: "CONFIRMEE",
                paidAt: new Date(),
            });

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