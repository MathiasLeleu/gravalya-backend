
import { Order } from "../models/Order.js";
import { stripe } from "../services/stripeService.js";
import { badRequest, notFound, forbidden, conflict } from "../utils/error.js";

const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

const paymentController = {
    async createCheckoutSession(req, res) {
        const { orderId } = req.params;
        const idempotencyKey = req.get("Idempotency-Key");

        // Vérification des paramètres
        if (!/^\d+$/.test(orderId) || Number(orderId) <= 0) {
            badRequest("L'identifiant de commande est invalide.");
        }

        if (
            typeof idempotencyKey !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                idempotencyKey
            )
        ) {
            badRequest("La clé d'idempotence est invalide ou absente.");
        }

        // Récupération de la commande et de ses lignes
        const order = await Order.findByPk(Number(orderId), {
            include: [
                {
                    association: "orderLines",
                    include: ["product"],
                },
            ],
        });

        if (!order) {
            notFound("Commande introuvable.");
        }

        // La clé doit correspondre à celle utilisée
        // lors de la création initiale de la commande.
        if (order.idempotencyKey !== idempotencyKey) {
            forbidden("Accès à cette commande refusé.");
        }

        if (order.statut !== "EN_ATTENTE") {
            conflict("Cette commande ne peut plus être payée.");
        }

        if (!order.orderLines?.length) {
            badRequest("Cette commande ne contient aucun produit.");
        }

        // Conserver l'identifiant précédent pour distinguer
        // une nouvelle tentative après expiration.
        const previousSessionId = order.stripeSessionId;

        if (previousSessionId) {
            const existingSession =
                await stripe.checkout.sessions.retrieve(
                    previousSessionId
                );

            if (existingSession.payment_status === "paid") {
                conflict("Cette commande a déjà été payée.");
            }

            if (existingSession.status === "open") {
                return res.status(200).json({
                    url: existingSession.url,
                });
            }

            if (existingSession.status === "complete") {
                conflict(
                    "Le paiement de cette commande est terminé ou en cours de traitement."
                );
            }
        }

        // Calcul du sous-total à partir des lignes enregistrées
        // en base, jamais à partir du prix fourni par le frontend.
        let subtotalCents = 0;

        const lineItems = order.orderLines.map((line) => {
            const unitPriceCents = Math.round(
                Number(line.unitPrice) * 100
            );

            if (
                !Number.isSafeInteger(unitPriceCents) ||
                unitPriceCents <= 0 ||
                !Number.isInteger(Number(line.quantity)) ||
                Number(line.quantity) <= 0
            ) {
                badRequest(
                    "Une ligne de commande contient un montant ou une quantité invalide."
                );
            }

            if (!line.product) {
                badRequest(
                    "Un produit de cette commande est introuvable."
                );
            }

            subtotalCents += unitPriceCents * Number(line.quantity);

            return {
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: line.product.name,
                    },
                    unit_amount: unitPriceCents,
                },
                quantity: Number(line.quantity),
            };
        });

        const expectedSubtotalCents = Math.round(
            Number(order.amount) * 100
        );

        if (
            !Number.isSafeInteger(subtotalCents) ||
            subtotalCents !== expectedSubtotalCents
        ) {
            conflict(
                "Le total des produits ne correspond pas au montant enregistré de la commande."
            );
        }

        const shippingCostCents = Math.round(
            Number(order.shippingCost) * 100
        );

        if (
            !Number.isSafeInteger(shippingCostCents) ||
            shippingCostCents < 0
        ) {
            badRequest("Les frais de livraison sont invalides.");
        }

        if (shippingCostCents > 0) {
            lineItems.push({
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: "Frais de livraison",
                    },
                    unit_amount: shippingCostCents,
                },
                quantity: 1,
            });
        }

        // La clé reste stable pour une même tentative.
        // Après expiration, l'ancien identifiant permet
        // de créer une nouvelle tentative idempotente.
        const stripeIdempotencyKey = previousSessionId
            ? `checkout-order-${order.id}-${idempotencyKey}-after-${previousSessionId}`
            : `checkout-order-${order.id}-${idempotencyKey}-first`;

        const session = await stripe.checkout.sessions.create(
            {
                mode: "payment",
                customer_email: order.customerEmail,
                line_items: lineItems,
                client_reference_id: String(order.id),

                metadata: {
                    orderId: String(order.id),
                    orderNumber: order.orderNumber,
                },

                payment_intent_data: {
                    metadata: {
                        orderId: String(order.id),
                        orderNumber: order.orderNumber,
                    },
                },

                success_url: `${FRONTEND_URL}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,

                cancel_url: `${FRONTEND_URL}/commande?payment=cancelled`,
            },
            {
                idempotencyKey: stripeIdempotencyKey,
            }
        );

        // Enregistrer la session pour la réutiliser
        // lors des appels suivants.
        await order.update({
            stripeSessionId: session.id,
        });

        return res.status(201).json({
            url: session.url,
        });
    },

    async getCheckoutStatus(req, res) {
        const { session_id: sessionId } = req.query;

        if (
            typeof sessionId !== "string" ||
            !sessionId.startsWith("cs_")
        ) {
            badRequest("La session de paiement est invalide.");
        }

        const session = await stripe.checkout.sessions.retrieve(
            sessionId
        );

        const orderId = session.metadata?.orderId;

        if (!orderId) {
            notFound("Commande introuvable pour cette session.");
        }

        const order = await Order.findByPk(orderId, {
            include: [
                {
                    association: "orderLines",
                    include: ["product"],
                },
                { association: "orderRelayPoint" },
                { association: "shippingMethod" },
                { association: "shippingRate" },
            ],
        });

        if (!order || order.stripeSessionId !== session.id) {
            notFound("Commande introuvable pour cette session.");
        }

        const expectedAmountCents = Math.round(
            (Number(order.amount) + Number(order.shippingCost)) * 100
        );

        if (
            session.currency !== "eur" ||
            session.amount_total !== expectedAmountCents
        ) {
            conflict("Le montant de la session ne correspond pas à la commande.");
        }

        return res.status(200).json({
            orderNumber: order.orderNumber,
            amount: order.amount,
            shippingCost: order.shippingCost,
            shippingMethod: order.shippingMethod,
            relayPoint: order.orderRelayPoint,
            paymentStatus: session.payment_status,
            orderStatus: order.statut,
        });
    },
};

export { paymentController };