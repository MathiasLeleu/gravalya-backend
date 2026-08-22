import { ShippingMethod } from "../models/Shipping_Method.js";
import { notFound } from "../utils/error.js";

const shippingMethodController = {

    // Get all shipping methods
    async showAllShippingMethods(req, res) {
        const shippingMethods = await ShippingMethod.findAll();
        res.status(200).json(shippingMethods)
    },

    // Get one shipping method
    async showOneShippingMethod(req, res) {
        const shippingMethodId = parseInt(req.params.id);
        const shippingMethod = await ShippingMethod.findByPk(shippingMethodId);

        if (!shippingMethod) {
            notFound("Mode de livraison non trouvé.");
        }

        res.status(200).json(shippingMethod)
    },

    // Create a new shipping method
    async createShippingMethod(req, res) {
        const { name, carrier, deliveryType } = req.body;

        const existingShippingMethod = await ShippingMethod.findOne({
            where: {
                name, carrier, deliveryType
            }
        });

        if (existingShippingMethod) {
            return res.status(409).json({ message: "Ce mode de livraison existe déjà." });
        }

        const newShippingMethod = await ShippingMethod.create({
            name, carrier, deliveryType
        });

        res.status(201).json(newShippingMethod)
    },

    // Update an existing shipping method
    async updateShippingMethod(req, res) {
        const shippingMethodId = parseInt(req.params.id);
        const shippingMethod = await ShippingMethod.findByPk(shippingMethodId);

        if (!shippingMethod) {
            notFound("Mode de livraison non trouvé.")
        }

        await shippingMethod.update(req.body);

        res.status(200).json(shippingMethod)
    }

}

export { shippingMethodController }