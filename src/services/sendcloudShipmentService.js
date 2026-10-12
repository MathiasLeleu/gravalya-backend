
import { Order } from "../models/Order.js";
import { OrderLine } from "../models/Order_Line.js";
import { Product } from "../models/Product.js";
import { ShippingMethod } from "../models/Shipping_Method.js";
import { OrderRelayPoint } from "../models/Order_Relay_Point.js";
import { sequelize } from "../models/connection.js";

import sendcloudService from "./sendcloudService.js";
import sendcloudShipmentPayloadService from "./sendcloudShipmentPayloadService.js";
import sendcloudShipmentResultService from "./sendcloudShipmentResultService.js";

const sendcloudShipmentService = {
    async createForOrder(orderId) {
        if (!Number.isSafeInteger(Number(orderId)) || Number(orderId) <= 0) {
            throw new Error("Identifiant de commande invalide.");
        }

        let claimedOrderId;

        // Réserver la tentative pour empêcher deux créations simultanées.
        const reservation = await sequelize.transaction();

        try {
            const order = await Order.findByPk(Number(orderId), {
                transaction: reservation,
                lock: reservation.LOCK.UPDATE,
            });

            if (!order) {
                throw new Error("Commande introuvable.");
            }

            if (order.statut !== "CONFIRMEE") {
                throw new Error(
                    "Seule une commande confirmée peut être expédiée."
                );
            }

            if (order.sendcloudShipmentId) {
                await reservation.commit();

                return {
                    action: "IGNORE",
                    reason: "EXPEDITION_DEJA_ENREGISTREE",
                };
            }

            if (order.sendcloudStatus === "EN_COURS") {
                await reservation.commit();

                return {
                    action: "IGNORE",
                    reason: "TENTATIVE_DEJA_EN_COURS",
                };
            }

            if (order.sendcloudStatus === "ERREUR") {
                throw new Error(
                    "Une tentative précédente a échoué. Vérifie d'abord " +
                    "dans Sendcloud si une expédition existe avant de réessayer."
                );
            }

            // La Lettre Suivie reste hors du processus Sendcloud.
            const method = await ShippingMethod.findByPk(
                order.shippingMethodId,
                { transaction: reservation }
            );

            if (!method) {
                throw new Error("Mode de livraison introuvable.");
            }

            if (method.name === "Lettre Suivie") {
                await reservation.commit();

                return {
                    action: "IGNORE",
                    reason: "LETTRE_SUIVIE",
                };
            }

            order.sendcloudStatus = "EN_COURS";
            order.sendcloudError = null;

            await order.save({ transaction: reservation });

            claimedOrderId = order.id;

            await reservation.commit();
        } catch (error) {
            if (!reservation.finished) {
                await reservation.rollback();
            }

            throw error;
        }

        try {
            const order = await Order.findByPk(claimedOrderId, {
                include: [
                    {
                        association: "orderLines",
                        include: [{ association: "product" }],
                    },
                    { association: "shippingMethod" },
                    { association: "orderRelayPoint" },
                ],
            });

            if (!order) {
                throw new Error("Commande introuvable après réservation.");
            }

            const payload = sendcloudShipmentPayloadService.build(order);

            // Cet appel crée réellement une expédition.
            // Ne pas exécuter cette méthode sur une commande de test payée
            // tant que les tests d'intégration ne sont pas autorisés.
            const response = await sendcloudService.createShipment(payload);

            const result = sendcloudShipmentResultService.extract(response);

            await sequelize.transaction(async (transaction) => {
                const lockedOrder = await Order.findByPk(claimedOrderId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                if (!lockedOrder) {
                    throw new Error(
                        "Commande introuvable lors de l'enregistrement Sendcloud."
                    );
                }

                if (lockedOrder.sendcloudShipmentId) {
                    return;
                }

                lockedOrder.sendcloudShipmentId = result.shipmentId;
                lockedOrder.sendcloudParcelId = result.parcelId;
                lockedOrder.sendcloudTrackingNumber = result.trackingNumber;
                lockedOrder.sendcloudTrackingUrl = result.trackingUrl;
                lockedOrder.sendcloudLabelUrl = result.labelUrl;
                lockedOrder.sendcloudStatus = "CREEE";
                lockedOrder.sendcloudError = null;
                lockedOrder.sendcloudCreatedAt = new Date();

                await lockedOrder.save({ transaction });
            });

            return {
                action: "CREATED",
                shipmentId: result.shipmentId,
            };
        } catch (error) {
            // Ne pas modifier le statut de paiement de la commande.
            // Une erreur réseau peut être survenue après la création
            // effective de l'expédition chez Sendcloud.
            try {
                await Order.update(
                    {
                        sendcloudStatus: "ERREUR",
                        sendcloudError: String(
                            error.message || "Erreur inconnue Sendcloud."
                        ).slice(0, 5000),
                    },
                    {
                        where: {
                            id: claimedOrderId,
                            sendcloudStatus: "EN_COURS",
                        },
                    }
                );
            } catch (saveError) {
                console.error(
                    "Impossible d'enregistrer l'erreur Sendcloud :",
                    saveError.message
                );
            }

            throw error;
        }
    },
};

export default sendcloudShipmentService;