import sendcloudService from "../services/sendcloudService.js";
import { ShippingMethod } from "../models/Shipping_Method.js";
import { badRequest, notFound } from "../utils/error.js";

export const shippingOptionController = {
    async showShippingOptions(req, res) {
        const {
            shippingMethodId,
            postalCode,
            city,
            weight,
        } = req.query;

        if (!shippingMethodId) {
            badRequest("Le mode de livraison est requis.");
        }

        if (!postalCode) {
            badRequest("Le code postal est requis.");
        }

        if (!city) {
            badRequest("La ville est requise.");
        }

        if (weight === undefined) {
            badRequest("Le poids est requis.");
        }

        const shippingMethod = await ShippingMethod.findByPk(
            shippingMethodId
        );

        if (!shippingMethod) {
            notFound("Mode de livraison introuvable.");
        }

        const carrierCodes = {
            Chronopost: "chronopost",
            Colissimo: "colissimo",
            "Mondial Relay": "mondial_relay",
        };

        const carrierCode = carrierCodes[shippingMethod.name];

        if (!carrierCode) {
            badRequest(
                "Ce mode de livraison ne peut pas utiliser Sendcloud."
            );
        }

        const data = await sendcloudService.getShippingOptions({
            postalCode,
            city,
            weight,
            carrierCode,
            deliveryType: shippingMethod.deliveryType,
        });

        res.json(data);
    },
};