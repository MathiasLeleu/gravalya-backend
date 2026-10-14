
import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

// Simule le service : aucun appel à Sendcloud ni à PostgreSQL.
const state = {
    orderId: null,
    calls: 0,
};

mock.module(
    new URL(
        "../src/services/sendcloudShipmentService.js",
        import.meta.url
    ).href,
    {
        exports: {
            default: {
                async retryForOrder(orderId) {
                    state.orderId = orderId;
                    state.calls++;

                    return {
                        action: "DRY_RUN",
                        orderId,
                    };
                },
            },
        },
    }
);

// Import effectué après l'installation du mock.
const { orderController } = await import(
    "../src/controllers/orderController.js"
);

test(
    "retrySendcloudShipment renvoie 200 avec le résultat du service",
    async () => {
        state.orderId = null;
        state.calls = 0;

        let statusCode;
        let responseBody;

        const req = {
            params: { id: "999" },
        };

        const res = {
            status(code) {
                statusCode = code;
                return this;
            },

            json(body) {
                responseBody = body;
                return this;
            },
        };

        await orderController.retrySendcloudShipment(req, res);

        assert.equal(statusCode, 200);
        assert.equal(state.calls, 1);
        assert.equal(state.orderId, 999);

        assert.deepEqual(responseBody, {
            message: "Traitement de la relance Sendcloud effectué.",
            result: {
                action: "DRY_RUN",
                orderId: 999,
            },
        });
    }
);
