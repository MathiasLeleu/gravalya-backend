import { ShippingRate } from "../models/Shipping_Rate.js";
import { ShippingMethod } from "../models/Shipping_Method.js";
import { notFound } from "../utils/error.js";

const shippingRateController = {

    // Get all shipping rates
    async showAllShippingRates(req, res) {
        const shippingRates = await ShippingRate.findAll({
            include: [
                { association: 'shippingMethod' },
            ]
        });

        res.status(200).json(shippingRates);
    },

    // Get one shipping rate
    async showOneShippingRate(req, res) {
        const shippingRateId = parseInt(req.params.id);
        const shippingRate = await ShippingRate.findByPk(shippingRateId, {
            include: [
                { association: 'shippingMethod'},
            ]
        });

        if (!shippingRate) {
            notFound("Tarif de livraison non trouvé.");
        }

        res.status(200).json(shippingRate);
    },

    // Create a new shipping rate
    async createShippingRate(req, res) {
        const { shippingMethodId, minWeight, maxWeight, cost } = req.body;
        const shippingMethod = await ShippingMethod.findByPk(shippingMethodId);

        if (!shippingMethod) {
            notFound("Mode de livraison non trouvé.");
        }

        const newShippingRate = await ShippingRate.create({
            shippingMethodId, minWeight, maxWeight, cost
        });

        res.status(201).json(newShippingRate);
    },

    // Update an existing shipping rate
    async updateShippingRate(req, res) {
        const shippingRateId = parseInt(req.params.id);
        const shippingRate = await ShippingRate.findByPk(shippingRateId);

        if (!shippingRate) {
            notFound("Tarif de livraison non trouvé.");
        }

        await shippingRate.update(req.body);

        res.status(200).json(shippingRate);
    }

}

export { shippingRateController }