
import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.SENDCLOUD_DRY_RUN = "true";
process.env.SENDCLOUD_SENDER_ADDRESS_ID = "924199";
process.env.SENDCLOUD_PACKAGE_MARGIN_CM = "2";

const state = {
    shipmentCalls: 0,
    orderLookups: 0,
    order: {
        id: 999,
        orderNumber: "CMD-TEST-SENDCLOUD",
        statut: "CONFIRMEE",
        sendcloudShipmentId: null,
        shippingMethod: {
            name: "Colissimo",
            deliveryType: "Domicile",
        },
        shippingFirstName: "Jean",
        shippingLastName: "Test",
        shippingCountry: "France",
        shippingAddress: "1 rue du Test",
        shippingAddress2: null,
        shippingPostalCode: "29000",
        shippingCity: "Quimper",
        shippingPhone: "0600000000",
        customerEmail: "test@example.com",
        orderRelayPoint: null,
        orderLines: [
            {
                productId: 1,
                quantity: 2,
                unitPrice: "8.00",
                unitWeight: "100.000",
                product: {
                    name: "Produit de test",
                    length: 8,
                    width: 4,
                    height: 10,
                },
            },
        ],
    },
};

const orderModel = {
    findByPk: async (id) => {
        state.orderLookups++;
        assert.equal(id, 999);
        return state.order;
    },
};

mock.module(
    new URL("../src/models/Order.js", import.meta.url).href,
    { exports: { Order: orderModel } }
);

mock.module(
    new URL("../src/services/sendcloudService.js", import.meta.url).href,
    {
        exports: {
            default: {
                createShipment: async () => {
                    state.shipmentCalls++;
                    throw new Error(
                        "ERREUR : un appel réel ou simulé interdit a été déclenché."
                    );
                },
            },
        },
    }
);

test("DRY_RUN prépare le payload sans créer d'expédition", async () => {
    const { default: service } = await import(
        "../src/services/sendcloudShipmentService.js"
    );

    const result = await service.createForOrder(999);

    assert.equal(result.action, "DRY_RUN");
    assert.equal(result.orderId, 999);
    assert.equal(
        result.shippingOptionCode,
        "colissimo:home/fr"
    );
    assert.equal(
        result.externalReference,
        "gravelya-CMD-TEST-SENDCLOUD"
    );

    assert.equal(state.shipmentCalls, 0);
    assert.equal(state.orderLookups, 1);

    assert.equal(state.order.sendcloudShipmentId, null);

    console.log("✅ DRY_RUN : aucune création d'expédition.");
});