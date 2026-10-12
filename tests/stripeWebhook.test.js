import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const state = {
    event: null,
    order: null,
    orderLines: [],
    saveCalls: 0,
    stockCalls: 0,
    stockUpdates: [],
};

const Order = {
    findByPk: async () => state.order,
};

const OrderLine = {
    findAll: async () => state.orderLines,
};

const Product = {
    increment: async (field, options) => {
        state.stockCalls++;
        state.stockUpdates.push({ 
            field, 
            by: options.by,
            productId: options.where.id,
         });
    },
};

const sequelize = {
    transaction: async (callback) =>
        callback({ LOCK: { UPDATE: "UPDATE" } }),
};

const stripe = {
    webhooks: {
        constructEvent: () => state.event,
    },
};

mock.module(new URL("../src/models/Order.js", import.meta.url).href, {
    exports: { Order },
});

mock.module(
    new URL("../src/models/Order_Line.js", import.meta.url).href,
    { exports: { OrderLine } },
);

mock.module(new URL("../src/models/Product.js", import.meta.url).href, {
    exports: { Product },
});

mock.module(
    new URL("../src/models/connection.js", import.meta.url).href,
    { exports: { sequelize } },
);

mock.module(
    new URL("../src/services/stripeService.js", import.meta.url).href,
    { exports: { stripe } },
);

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

let handleWebhook;

before(async () => {
    ({ stripeWebhookController: { handleWebhook } } =
        await import("../src/controllers/stripeWebhookController.js"));
});

after(() => {
    mock.restoreAll();
});

function prepareTest({ amount = 1067, currency = "eur" } = {}) {
    state.saveCalls = 0;
    state.stockCalls = 0;

    state.orderLines = [];
    state.stockUpdates = [];

    state.order = {
        id: 24,
        orderNumber: "CMD-TEST",
        amount: "3.20",
        shippingCost: "7.47",
        stripeSessionId: "cs_test_session",
        statut: "EN_ATTENTE",
        paidAt: null,
        async save() {
            state.saveCalls++;
        },
    };

    state.event = {
        type: "checkout.session.completed",
        data: {
            object: {
                id: "cs_test_session",
                metadata: { orderId: "24" },
                payment_status: "paid",
                amount_total: amount,
                currency,
            },
        },
    };
}

async function sendWebhook() {
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
        send(body) {
            this.body = body;
            return this;
        },
    };

    await handleWebhook(
        {
            headers: { "stripe-signature": "test_signature" },
            body: Buffer.from("test"),
        },
        res,
    );

    return res;
}

describe("Webhook Stripe — validation du paiement", () => {
    it("rejette un montant incorrect", async () => {
        prepareTest({ amount: 1066 });

        const res = await sendWebhook();

        assert.equal(res.statusCode, 500);
        assert.equal(state.order.statut, "EN_ATTENTE");
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });

    it("rejette une devise incorrecte", async () => {
        prepareTest({ currency: "usd" });

        const res = await sendWebhook();

        assert.equal(res.statusCode, 500);
        assert.equal(state.order.statut, "EN_ATTENTE");
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });

    it("confirme une commande lorsque le paiement est valide", async () => {
        prepareTest();

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "CONFIRMEE");
        assert.ok(state.order.paidAt instanceof Date);
        assert.equal(state.saveCalls, 1);
        assert.equal(state.stockCalls, 0);
    });

    
    it("ignore une session Stripe qui ne correspond pas à la commande", async () => {
        prepareTest();

        state.event.data.object.id = "cs_test_session_incorrecte";

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "EN_ATTENTE");
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });

    
    it("ne traite pas deux fois un paiement déjà confirmé", async () => {
        prepareTest();

        state.order.statut = "CONFIRMEE";
        state.order.paidAt = new Date("2026-10-11T16:28:54.114Z");
        const originalPaidAt = state.order.paidAt;

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "CONFIRMEE");
        assert.equal(state.order.paidAt, originalPaidAt);
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });

    
    it("ne réactive pas une commande annulée après un paiement", async () => {
        prepareTest();

        state.order.statut = "ANNULEE";

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });
});

describe("Webhook Stripe — expiration de session", () => {
    it("annule la commande et restitue le stock à l'expiration", async () => {
        prepareTest();

        state.event.type = "checkout.session.expired";
        state.orderLines = [
            { productId: 1, quantity: 2 },
            { productId: 2, quantity: 3 },
        ];

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.saveCalls, 1);
        assert.equal(state.stockCalls, 2);

        assert.deepEqual(state.stockUpdates, [
            {
                field: "stockQuantity",
                by: 2,
                productId: 1,
            },
            {
                field: "stockQuantity",
                by: 3,
                productId: 2,
            },
        ]);
    });

    it("ne restitue pas le stock deux fois lors d'une expiration répétée", async () => {
        prepareTest();

        state.event.type = "checkout.session.expired";
        state.orderLines = [
            { productId: 1, quantity: 2 },
        ];

        const firstRes = await sendWebhook();

        assert.equal(firstRes.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.stockCalls, 1);

        const secondRes = await sendWebhook();

        assert.equal(secondRes.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.saveCalls, 1);
        assert.equal(state.stockCalls, 1);
    });

    it("ignore une session expirée qui ne correspond pas à la commande", async () => {
        prepareTest();

        state.event.type = "checkout.session.expired";
        state.event.data.object.id = "cs_test_session_incorrecte";
        state.orderLines = [
            { productId: 1, quantity: 2 },
        ];

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "EN_ATTENTE");
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });

    it("ne modifie pas une commande déjà confirmée à l'expiration", async () => {
        prepareTest();

        state.event.type = "checkout.session.expired";
        state.order.statut = "CONFIRMEE";
        state.orderLines = [
            { productId: 1, quantity: 2 },
        ];

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "CONFIRMEE");
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });
});