import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const state = {
    order: null,
    orderLines: [],
    updateCalls: [],
    incrementCalls: [],
    enqueueCalls: [],
    refundCalls: [],
    sessionCalls: [],
    refundResponse: { id: "re_test", status: "succeeded" },
    refundShouldFail: false,
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
        return [1];
    },
};

const User = {
    findByPk: async () => ({
        email: "client@example.com",
    }),
};

const OrderLine = {};

const OrderRelayPoint = {};

const Product = {
    increment: async (field, options) => {
        state.incrementCalls.push({ field, options });
    },
};

const ShippingMethod = {};
const ShippingRate = {};

const sequelize = {
    transaction: async (callback) =>
        callback({
            ...transaction,
            LOCK: {
                UPDATE: "UPDATE",
            },
        }),
};

const enqueueEmail = async (params) => {
    state.enqueueCalls.push(params);

    return {
        email: null,
        created: true,
    };
};

const stripe = {
    checkout: {
        sessions: {
            retrieve: async (sessionId) => {
                state.sessionCalls.push(sessionId);

                return {
                    id: sessionId,
                    payment_status: "paid",
                    payment_intent: "pi_test_123",
                };
            },
        },
    },

    refunds: {
        create: async (params, options) => {
            state.refundCalls.push({ params, options });

            if (state.refundShouldFail) {
                throw new Error("Erreur réseau simulée");
            }

            return state.refundResponse;
        },
    },
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
    { exports: { stripe } },
);

let deleteOrder;

before(async () => {
    ({ orderController: { deleteOrder } } =
        await import("../src/controllers/orderController.js"));
});

after(() => {
    mock.restoreAll();
});

function prepareTest({
    previousStatus = "PREPARATION",
    refundResponse = { id: "re_test", status: "succeeded" },
    refundShouldFail = false,
} = {}) {
    state.updateCalls = [];
    state.incrementCalls = [];
    state.enqueueCalls = [];
    state.refundCalls = [];
    state.sessionCalls = [];
    state.refundResponse = refundResponse;
    state.refundShouldFail = refundShouldFail;

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
        statut: previousStatus,
        stripeSessionId:
            previousStatus === "PREPARATION"
                ? "cs_test_session"
                : null,

        async save() {},
    };

    const req = {
        params: { id: "24" },
        user: {
            id: 1,
            role: "admin",
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

describe("orderController.deleteOrder - emails Outbox", () => {
    it("ajoute uniquement l'email d'annulation sans remboursement pour EN_ATTENTE", async () => {
        const { req, res } = prepareTest({
            previousStatus: "EN_ATTENTE",
        });

        await deleteOrder(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(state.enqueueCalls.length, 1);

        assert.equal(
            state.enqueueCalls[0].eventType,
            "COMMANDE_ANNULEE",
        );

        assert.equal(
            state.enqueueCalls[0].eventKey,
            "commande-annulee-24",
        );

        assert.deepEqual(state.enqueueCalls[0].payload, {
            orderNumber: "CMD-TEST",
        });

        assert.equal(state.refundCalls.length, 0);
        assert.equal(state.sessionCalls.length, 0);
    });

    it("ajoute l'email de remboursement uniquement après succès Stripe", async () => {
        const { req, res } = prepareTest();

        await deleteOrder(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(state.enqueueCalls.length, 2);

        assert.equal(
            state.enqueueCalls[0].eventType,
            "COMMANDE_ANNULEE",
        );

        assert.equal(
            state.enqueueCalls[1].eventType,
            "REMBOURSEMENT_REUSSI",
        );

        assert.equal(
            state.enqueueCalls[1].eventKey,
            "remboursement-reussi-24",
        );

        assert.equal(
            state.enqueueCalls[1].recipientEmail,
            "client@example.com",
        );

        assert.deepEqual(state.enqueueCalls[1].payload, {
            orderNumber: "CMD-TEST",
        });

        assert.equal(
            state.refundCalls[0].params.payment_intent,
            "pi_test_123",
        );

        assert.equal(
            state.refundCalls[0].options.idempotencyKey,
            "refund-cancelled-order-24-cs_test_session",
        );
    });

    it("n'ajoute pas l'email de remboursement si Stripe retourne failed", async () => {
        const { req, res } = prepareTest({
            refundResponse: {
                id: "re_test",
                status: "failed",
            },
        });

        await deleteOrder(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(state.enqueueCalls.length, 1);

        assert.equal(
            state.enqueueCalls[0].eventType,
            "COMMANDE_ANNULEE",
        );

        assert.equal(
            res.body.message.includes("remboursement Stripe a échoué"),
            true,
        );
    });

    it("n'ajoute pas l'email de remboursement si Stripe retourne pending", async () => {
        const { req, res } = prepareTest({
            refundResponse: {
                id: "re_test",
                status: "pending",
            },
        });

        await deleteOrder(req, res);

        assert.equal(res.statusCode, 202);
        assert.equal(state.enqueueCalls.length, 1);

        assert.equal(
            state.enqueueCalls[0].eventType,
            "COMMANDE_ANNULEE",
        );
    });

    it("n'ajoute pas l'email de remboursement en cas d'erreur réseau Stripe", async () => {
        const { req, res } = prepareTest({
            refundShouldFail: true,
        });

        const originalConsoleError = console.error;
        console.error = () => {};

        try {
            await deleteOrder(req, res);
        } finally {
            console.error = originalConsoleError;
        }

        assert.equal(res.statusCode, 202);
        assert.equal(state.enqueueCalls.length, 1);

        assert.equal(
            state.enqueueCalls[0].eventType,
            "COMMANDE_ANNULEE",
        );

        assert.equal(state.updateCalls.length, 2);

        assert.equal(
            state.updateCalls[1].values.refundError,
            "Erreur réseau simulée",
        );
    });
});
