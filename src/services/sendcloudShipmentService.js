
import { Order } from "../models/Order.js";
import { ShippingMethod } from "../models/Shipping_Method.js";
import { sequelize } from "../models/connection.js";

import { notFound, ValidationError } from "../utils/error.js";

import sendcloudService from "./sendcloudService.js";
import sendcloudShipmentPayloadService from "./sendcloudShipmentPayloadService.js";
import sendcloudShipmentResultService from "./sendcloudShipmentResultService.js";

const sendcloudShipmentService = {
    async refreshShipmentForOrder(orderId) {
        if (
            !Number.isSafeInteger(Number(orderId)) ||
            Number(orderId) <= 0
        ) {
            throw new Error("Identifiant de commande invalide.");
        }

        // Charger la commande sans modifier son état.
        const order = await Order.findByPk(Number(orderId));

        if (!order) {
            throw new Error("Commande introuvable.");
        }

        if (!order.sendcloudShipmentId) {
            notFound(
                "Cette commande ne possède aucune expédition Sendcloud enregistrée."
            );
        }

        const shipmentId = String(order.sendcloudShipmentId);

        // Récupérer les informations actuelles chez Sendcloud.
        // Cette opération ne crée aucune nouvelle expédition.
        const response = await sendcloudService.getShipmentById(
            shipmentId
        );

        const result =
            sendcloudShipmentResultService.extract(response);

        // Enregistrer les informations disponibles en protégeant
        // la commande contre les modifications concurrentes.
        return sequelize.transaction(async (transaction) => {
            const lockedOrder = await Order.findByPk(Number(orderId), {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!lockedOrder) {
                throw new Error("Commande introuvable.");
            }

            if (
                String(lockedOrder.sendcloudShipmentId) !== shipmentId
            ) {
                throw new Error(
                    "L'expédition Sendcloud de cette commande a changé. " +
                    "Veuillez relancer le rafraîchissement."
                );
            }

            // Ne jamais remplacer une information existante par une
            // valeur vide ou absente de la réponse Sendcloud.
            if (result.parcelId) {
                lockedOrder.sendcloudParcelId = result.parcelId;
            }

            if (result.trackingNumber) {
                lockedOrder.sendcloudTrackingNumber =
                    result.trackingNumber;
            }

            if (result.trackingUrl) {
                lockedOrder.sendcloudTrackingUrl =
                    result.trackingUrl;
            }

            if (result.labelUrl) {
                lockedOrder.sendcloudLabelUrl = result.labelUrl;
            }

            await lockedOrder.save({ transaction });

            return {
                action: "REFRESHED",
                shipmentId,
                parcelId:
                    lockedOrder.sendcloudParcelId ?? null,
                trackingNumber:
                    lockedOrder.sendcloudTrackingNumber ?? null,
                trackingUrl:
                    lockedOrder.sendcloudTrackingUrl ?? null,
                labelUrl:
                    lockedOrder.sendcloudLabelUrl ?? null,
            };
        });
    },

    async retryForOrder(orderId) {
        const id = Number(orderId);

        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new ValidationError("Identifiant de commande invalide.");
        }

        const order = await Order.findByPk(id);

        if (!order) {
            throw new ValidationError("Commande introuvable.");
        }

        if (order.statut !== "CONFIRMEE") {
            throw new ValidationError(
                "Seule une commande confirmée peut être relancée."
            );
        }

        if (order.sendcloudShipmentId) {
            return {
                action: "IGNORE",
                reason: "EXPEDITION_DEJA_ENREGISTREE",
            };
        }

        if (order.sendcloudStatus !== "ERREUR") {
            throw new ValidationError(
                "Seule une expédition en erreur peut être relancée."
            );
        }

        return this.createForOrder(id);
    },

    async createForOrder(orderId) {
        if (
            !Number.isSafeInteger(Number(orderId)) ||
            Number(orderId) <= 0
        ) {
            throw new Error("Identifiant de commande invalide.");
        }

        // Mode simulation : aucune création Sendcloud et aucune
        // modification de la commande en base de données.
        if (process.env.SENDCLOUD_DRY_RUN === "true") {
            const order = await Order.findByPk(Number(orderId), {
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
                throw new Error("Commande introuvable.");
            }

            if (order.statut !== "CONFIRMEE") {
                throw new Error(
                    "Seule une commande confirmée peut être expédiée."
                );
            }

            if (order.sendcloudShipmentId) {
                return {
                    action: "IGNORE",
                    reason: "EXPEDITION_DEJA_ENREGISTREE",
                };
            }

            if (order.shippingMethod?.name === "Lettre Suivie") {
                return {
                    action: "IGNORE",
                    reason: "LETTRE_SUIVIE",
                };
            }

            const payload = sendcloudShipmentPayloadService.build(order);

            console.log(
                `[Sendcloud DRY RUN] Commande ${order.orderNumber} : ` +
                "payload valide, aucune expédition créée."
            );

            return {
                action: "DRY_RUN",
                orderId: order.id,
                externalReference: payload.external_reference_id,
                shippingOptionCode:
                    payload.ship_with.properties.shipping_option_code,
            };
        }

        let claimedOrderId;
        let retryAfterError = false;

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

            // Une tentative précédente a échoué.
            // Il faudra rechercher l'expédition avant toute création.
            if (order.sendcloudStatus === "ERREUR") {
                retryAfterError = true;
            }

            const method = await ShippingMethod.findByPk(
                order.shippingMethodId,
                { transaction: reservation }
            );

            if (!method) {
                throw new Error("Mode de livraison introuvable.");
            }

            // La Lettre Suivie reste hors du processus Sendcloud.
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
                throw new Error(
                    "Commande introuvable après réservation."
                );
            }

            const payload = sendcloudShipmentPayloadService.build(order);

            let response;

            if (retryAfterError) {
                // Avant une nouvelle création, rechercher une éventuelle
                // expédition issue de la tentative précédente.
                const lookupResponse =
                    await sendcloudService.getShipmentByReference(
                        payload.external_reference_id
                    );

                // On accepte uniquement une liste identifiable.
                // Une réponse inconnue doit bloquer la création.
                const shipments = Array.isArray(lookupResponse?.data)
                    ? lookupResponse.data
                    : Array.isArray(lookupResponse?.data?.shipments)
                        ? lookupResponse.data.shipments
                        : null;

                if (!shipments) {
                    throw new Error(
                        "Réponse Sendcloud inattendue lors de la recherche. " +
                        "Aucune nouvelle expédition n'a été créée."
                    );
                }

                if (shipments.length > 1) {
                    throw new Error(
                        "Plusieurs expéditions correspondent à cette " +
                        "référence. Vérification manuelle nécessaire."
                    );
                }

                if (shipments.length === 1) {
                    // Réutiliser l'expédition existante.
                    response = { data: shipments[0] };

                    console.log(
                        `[Sendcloud] Expédition existante retrouvée pour ` +
                        `${payload.external_reference_id}.`
                    );
                }
            }

            if (!response) {
                try {
                    response = await sendcloudService.createShipment(payload);
                } catch (error) {
                    // La référence externe existe peut-être déjà chez Sendcloud.
                    if (error.status !== 409) {
                        throw error;
                    }

                    const lookupResponse =
                        await sendcloudService.getShipmentByReference(
                            payload.external_reference_id
                        );

                    const shipments = Array.isArray(lookupResponse?.data)
                        ? lookupResponse.data
                        : Array.isArray(lookupResponse?.data?.shipments)
                            ? lookupResponse.data.shipments
                            : null;

                    if (!shipments) {
                        throw new Error(
                            "Sendcloud signale une référence déjà utilisée, " +
                            "mais la réponse de recherche est invalide. " +
                            "Aucune nouvelle création ne sera tentée."
                        );
                    }

                    if (shipments.length !== 1) {
                        throw new Error(
                            shipments.length === 0
                                ? "Sendcloud signale une référence déjà utilisée, " +
                                "mais aucune expédition n'a été retrouvée. " +
                                "Vérification manuelle nécessaire."
                                : "Plusieurs expéditions correspondent à cette " +
                                "référence. Vérification manuelle nécessaire."
                        );
                    }

                    response = { data: shipments[0] };

                    console.log(
                        `[Sendcloud] Expédition récupérée après HTTP 409 : ` +
                        `${payload.external_reference_id}.`
                    );
                }
            }

            const result =
                sendcloudShipmentResultService.extract(response);

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
                action: retryAfterError ? "RECOVERED_OR_CREATED" : "CREATED",
                shipmentId: result.shipmentId,
            };
        } catch (error) {
            // Une erreur Sendcloud ne doit pas annuler le paiement.
            // On conserve l'état ERREUR pour permettre une vérification
            // avant toute nouvelle tentative.
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