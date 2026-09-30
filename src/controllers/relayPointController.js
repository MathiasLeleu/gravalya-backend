import sendcloudService from "../services/sendcloudService.js";
import { ShippingMethod } from "../models/Shipping_Method.js";
import { badRequest, notFound } from "../utils/error.js";

export const relayPointController = {
    async showServicePoints(req, res) {
        const {
            shippingMethodId,
            postalCode,
            city,
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

        const shippingMethod = await ShippingMethod.findByPk(
            shippingMethodId
        );

        if (!shippingMethod) {
            notFound("Mode de livraison introuvable.");
        }

        if (shippingMethod.deliveryType !== "Point relais") {
            badRequest(
                "Ce mode de livraison ne permet pas la livraison en point relais."
            );
        }

        const carrierCodes = {
            Chronopost: "chronopost",
            Colissimo: "colissimo",
            "Mondial Relay": "mondial_relay",
        };

        const carrierCode = carrierCodes[shippingMethod.name];

        if (!carrierCode) {
            badRequest(
                "Ce transporteur ne permet pas la livraison en point relais."
            );
        }

        const data = await sendcloudService.getServicePoints({
            countryCode: "FR",
            postalCode,
            city,
            carrierCode,
        });

        const servicePoints = data?.data?.results || [];

        const relayPoints = servicePoints.map((point) => ({
            relayPointId: point.id,
            relayPointName: point.name,
            relayPointAddress:
                point.address?.street && point.address?.house_number
                    ? `${point.address.street} ${point.address.house_number}`
                    : point.address?.street || "",
            relayPointPostalCode: point.address?.postal_code || "",
            relayPointCity: point.address?.city || "",
            relayPointCountry: point.address?.country_code || "FR",
            carrier: point.carrier?.name || "",
            distance: point.distance ?? null,
            openingHours: point.opening_hours || [],
        }));

        res.json(relayPoints);
    },
};