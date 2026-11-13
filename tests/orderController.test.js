import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const state = {
    order: null,
    orderLines: [],
    updateCalls: [],
    incrementCalls: [],
    enqueueCalls: [],
    updatedRows: 1,
    transactionCalls: 0,
};

const transaction = { id: "transaction-test" };

const Order = {
    findByPk: async (id, options) => {
        if (options?.include) {
            return {
                ...state.order,
                orderLines: state.orderLines,
            };
        }

        return state.order;
    },

    update: async (values, options) => {
        state.updateCalls.push({ values, options });
        return [state.updatedRows];
    },
};

const User = {
    findByPk: async () => ({
        email: "client@example.com",
    }),
};

const OrderLine = {};

const OrderRelayPoint = {
    findOne: async () => null,
    create: async () => ({}),
};

const Product = {
    increment: async (field, options) => {
        state.incrementCalls.push({ field, options });
    },
};

const ShippingMethod = {
    findByPk: async () => ({
        deliveryType: "Domicile",
    }),
};

const ShippingRate = {};

const sequelize = {
    transaction: async (callback) => {
        state.transactionCalls++;
        return callback(transaction);
    },
};

const enqueueEmail = async (params) => {
    state.enqueueCalls.push(params);

    return {
        email: null,
        created: true,
    };
};

mock.module(
    new URL("../src/models/Order.js", import.meta.url).href,
    { exports: { Order } },
);

mock.module(
    new URL("../src/models/User.js", import.meta.url).href,
    { exports: { User } },
);

mock.module(
    new URL("../src/models/Order_Line.js", import.meta.url).href,
    { exports: { OrderLine } },
);

mock.module(
    new URL("../src/models/Order_Relay_Point.js", import.meta.url).href,
    { exports: { OrderRelayPoint } },
);

mock.module(
    new URL("../src/models/Product.js", import.meta.url).href,
    { exports: { Product } },
);

mock.module(
    new URL("../src/models/Shipping_Method.js", import.meta.url).href,
    { exports: { ShippingMethod } },
);

mock.module(
    new URL("../src/models/Shipping_Rate.js", import.meta.url).href,
    { exports: { ShippingRate } },
);

mock.module(
    new URL("../src/models/connection.js", import.meta.url).href,
    { exports: { sequelize } },
);

mock.module(
    new URL("../src/services/emailOutboxService.js", import.meta.url).href,
    { exports: { enqueueEmail } },
);

mock.module(
    new URL("../src/services/sendcloudService.js", import.meta.url).href,
    { exports: { default: {} } },
);

mock.module(
    new URL("../src/services/sendcloudShipmentService.js", import.meta.url).href,
    { exports: { default: {} } },
);

mock.module(
    new URL("../src/services/stripeService.js", import.meta.url).href,
    { exports: { stripe: {} } },
);

let updateOrder;

before(async () => {
    ({ orderController: { updateOrder } } =
        await import("../src/controllers/orderController.js"));
});

after(() => {
    mock.restoreAll();
});

function prepareTest({
    previousStatus,
    nextStatus,
    updatedRows = 1,
}) {
    state.updateCalls = [];
    state.incrementCalls = [];
    state.enqueueCalls = [];
    state.updatedRows = updatedRows;
    state.transactionCalls = 0;

    state.orderLines = [
        {
            quantity: 2,
            productId: 9,
        },
    ];

    state.order = {
        id: 24,
        userId: 2,
        customerEmail: "client@example.com",
        orderNumber: "CMD-TEST",
        shippingMethodId: 5,
        statut: previousStatus,
        sendcloudTrackingNumber: "TRACK-123",
        sendcloudTrackingUrl: "https://tracking.example.com/TRACK-123",

        async save() {},
    };

    const req = {
        params: { id: "24" },
        user: {
            id: 1,
            role: "admin",
        },
        body: {
            statut: nextStatus,
        },
    };

    const res = {
        statusCode: null,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(data) {
            this.body = data;
            return this;
        },
    };

    return { req, res };
}

describe("orderController.updateOrder - emails Outbox", () => {
    const scenarios = [
        {
            name: "annulation",
            previousStatus: "EN_ATTENTE",
            nextStatus: "ANNULEE",
            eventType: "COMMANDE_ANNULEE",
            eventKey: "commande-annulee-24",
            payload: {
                orderNumber: "CMD-TEST",
            },
        },
        {
            name: "confirmation",
            previousStatus: "PREPARATION",
            nextStatus: "CONFIRMEE",
            eventType: "COMMANDE_CONFIRMEE",
            eventKey: "commande-confirmee-24",
            payload: {
                orderNumber: "CMD-TEST",
            },
        },
        {
            name: "expédition",
            previousStatus: "CONFIRMEE",
            nextStatus: "EXPEDIEE",
            eventType: "COMMANDE_EXPEDIEE",
            eventKey: "commande-expediee-24",
            payload: {
                orderNumber: "CMD-TEST",
                trackingNumber: "TRACK-123",
                trackingUrl: "https://tracking.example.com/TRACK-123",
            },
        },
        {
            name: "livraison",
            previousStatus: "EXPEDIEE",
            nextStatus: "LIVREE",
            eventType: "COMMANDE_LIVREE",
            eventKey: "commande-livree-24",
            payload: {
                orderNumber: "CMD-TEST",
            },
        },
    ];

    for (const scenario of scenarios) {
        it(`ajoute l'email de ${scenario.name} dans l'Outbox`, async () => {
            const { req, res } = prepareTest(scenario);

            await updateOrder(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(state.enqueueCalls.length, 1);

            const email = state.enqueueCalls[0];

            assert.equal(email.eventKey, scenario.eventKey);
            assert.equal(email.orderId, 24);
            assert.equal(email.eventType, scenario.eventType);
            assert.equal(email.recipientEmail, "client@example.com");
            assert.deepEqual(email.payload, scenario.payload);
            assert.equal(email.transaction, transaction);

            assert.equal(state.transactionCalls, 1);
            assert.equal(state.updateCalls.length, 1);
        });
    }

    it("restaure le stock lors d'une annulation", async () => {
        const { req, res } = prepareTest({
            previousStatus: "EN_ATTENTE",
            nextStatus: "ANNULEE",
        });

        await updateOrder(req, res);

        assert.equal(state.incrementCalls.length, 1);

        const increment = state.incrementCalls[0];

        assert.equal(increment.field, "stockQuantity");
        assert.equal(increment.options.by, 2);
        assert.equal(increment.options.where.id, 9);
        assert.equal(increment.options.where.madeToOrder, false);
        assert.equal(increment.options.transaction, transaction);
    });

    it("n'ajoute aucun email si la mise à jour SQL échoue", async () => {
        const { req, res } = prepareTest({
            previousStatus: "CONFIRMEE",
            nextStatus: "EXPEDIEE",
            updatedRows: 0,
        });

        await assert.rejects(
            updateOrder(req, res),
            { statusCode: 409 },
        );

        assert.equal(state.enqueueCalls.length, 0);
        assert.equal(state.transactionCalls, 1);
    });
});