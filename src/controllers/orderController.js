import { Order } from '../models/orderModel.js';
import { OrderLine } from '../models/Order_Line.js';
import { Product } from '../models/Product.js';
import { ShippingMethod } from '../models/Shipping_Method.js';
import { ShippingRate } from '../models/Shipping_Rate.js';
import { OrderRelayPoint } from '../models/Order_Relay_Point.js';
import { notFound } from '../utils/error.js';

const orderController = {

    // Get all orders
    async showAllOrders(req, res) {
        const orders = await Order.findAll();
        res.status(200).json(orders);
    },

    // Get a single order by ID
    async showOneOrder(req, res) {
        const orderId = parseInt(req.params.id);
        const order = await Order.findByPk(orderId, {
            include: [
                { association: 'orderLines' },
                { association: 'user' },
                { association: 'shippingMethod' },
                { association: 'shippingRate' },
                { association: 'orderRelayPoint' },
            ]
        });

        if (!order) {
            notFound("Commande non trouvée.");
        }

        res.status(200).json(order);
    },

    // Create a new order
    

    // Update an order's status

};

export { orderController };