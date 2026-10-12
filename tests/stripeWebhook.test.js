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
    refundCalls: [],
    refundShouldFail: false,
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
    refunds: {
        create: async (params, options) => {
            state.refundCalls.push({ params, options });

            if (state.refundShouldFail) {
                throw new Error("Erreur réseau simulée");
            }

            return { id: "re_test_refund", status: "succeeded" };
        },
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


const sendcloudState = {
    calls: [],
    shouldFail: false,
};

const sendcloudShipmentService = {
    createForOrder: async (orderId) => {
        sendcloudState.calls.push(orderId);

        if (sendcloudState.shouldFail) {
            throw new Error("Erreur Sendcloud simulée");
        }

        return {
            status: "CREEE",
            shipmentId: "shipment_test_123",
        };
    },
};


mock.module(
    new URL(
        "../src/services/sendcloudShipmentService.js",
        import.meta.url,
    ).href,
    {
        exports: {
            default: sendcloudShipmentService,
        },
    },
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
    state.refundCalls = [];
    state.refundShouldFail = false;

    sendcloudState.calls = [];
    sendcloudState.shouldFail = false;

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
        refundStatus: "AUCUN",
        stripeRefundId: null,
        refundRequestedAt: null,
        refundCompletedAt: null,
        refundError: null,
    };

    state.event = {
        type: "checkout.session.completed",
        data: {
            object: {
                id: "cs_test_session",
                payment_intent: "pi_test_payment",
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

    it("rembourse un paiement reçu pour une commande annulée sans la réactiver", async () => {
        prepareTest();

        state.order.statut = "ANNULEE";

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");

        // Une sauvegarde avant Stripe, une autre après le succès.
        assert.equal(state.saveCalls, 2);
        assert.equal(state.stockCalls, 0);

        assert.equal(state.refundCalls.length, 1);
        assert.equal(
            state.refundCalls[0].params.payment_intent,
            "pi_test_payment"
        );
        assert.equal(
            state.refundCalls[0].options.idempotencyKey,
            "refund-cancelled-order-24-cs_test_session"
        );

        assert.equal(state.order.refundStatus, "REUSSI");
        assert.equal(state.order.stripeRefundId, "re_test_refund");
        assert.ok(state.order.refundRequestedAt);
        assert.ok(state.order.refundCompletedAt);
        assert.equal(state.order.refundError, null);
    });
    
    it("ne demande pas un second remboursement si le remboursement est déjà réussi", async () => {
        prepareTest();

        state.order.statut = "ANNULEE";
        state.order.refundStatus = "REUSSI";
        state.order.stripeRefundId = "re_test_refund";
        state.order.refundRequestedAt = new Date();
        state.order.refundCompletedAt = new Date();
        state.order.refundError = null;

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.order.refundStatus, "REUSSI");
        assert.equal(state.order.stripeRefundId, "re_test_refund");

        assert.equal(state.refundCalls.length, 0);
        assert.equal(state.saveCalls, 0);
        assert.equal(state.stockCalls, 0);
    });
    
    it("conserve le remboursement en cours si l'appel Stripe échoue", async () => {
        prepareTest();

        state.order.statut = "ANNULEE";
        state.refundShouldFail = true;

        const res = await sendWebhook();

        assert.equal(res.statusCode, 500);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.order.refundStatus, "EN_COURS");
        assert.equal(state.order.refundError, "Erreur réseau simulée");

        assert.ok(state.order.refundRequestedAt);
        assert.equal(state.order.refundCompletedAt, null);
        assert.equal(state.order.stripeRefundId, null);

        assert.equal(state.refundCalls.length, 1);
        assert.equal(state.stockCalls, 0);
    });
    
    it("réussit le remboursement lors d'une nouvelle tentative avec la même clé d'idempotence", async () => {
        prepareTest();

        state.order.statut = "ANNULEE";
        state.refundShouldFail = true;

        // Première tentative : erreur réseau
        const firstRes = await sendWebhook();

        assert.equal(firstRes.statusCode, 500);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.order.refundStatus, "EN_COURS");
        assert.equal(state.order.refundError, "Erreur réseau simulée");
        assert.equal(state.refundCalls.length, 1);

        const firstIdempotencyKey =
            state.refundCalls[0].options.idempotencyKey;

        // Deuxième tentative : Stripe répond avec succès
        state.refundShouldFail = false;

        const secondRes = await sendWebhook();

        assert.equal(secondRes.statusCode, 200);
        assert.equal(state.order.statut, "ANNULEE");
        assert.equal(state.order.refundStatus, "REUSSI");
        assert.equal(state.order.stripeRefundId, "re_test_refund");
        assert.ok(state.order.refundCompletedAt);
        assert.equal(state.order.refundError, null);

        assert.equal(state.refundCalls.length, 2);

        assert.equal(
            state.refundCalls[1].options.idempotencyKey,
            firstIdempotencyKey
        );

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


describe("Webhook Stripe — intégration Sendcloud simulée", () => {
    it("appelle Sendcloud une seule fois lors de la confirmation initiale", async () => {
        prepareTest();

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "CONFIRMEE");
        assert.deepEqual(sendcloudState.calls, [24]);
    });

    it("ne rappelle pas Sendcloud pour un paiement déjà confirmé", async () => {
        prepareTest();

        state.order.statut = "CONFIRMEE";
        state.order.paidAt = new Date("2026-10-11T16:28:54.114Z");

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.deepEqual(sendcloudState.calls, []);
    });

    it("conserve la confirmation du paiement si Sendcloud échoue", async () => {
        prepareTest();
        sendcloudState.shouldFail = true;

        const res = await sendWebhook();

        assert.equal(res.statusCode, 200);
        assert.equal(state.order.statut, "CONFIRMEE");
        assert.deepEqual(sendcloudState.calls, [24]);
    });
});