import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.SENDCLOUD_DRY_RUN = "false";
process.env.SENDCLOUD_SENDER_ADDRESS_ID = "924199";
process.env.SENDCLOUD_PACKAGE_MARGIN_CM = "2";

const initialOrder = {
    id: 999,
    orderNumber: "CMD-TEST-RETRY",
    statut: "CONFIRMEE",
    sendcloudStatus: null,
    sendcloudShipmentId: null,
    sendcloudParcelId: null,
    sendcloudTrackingNumber: null,
    sendcloudTrackingUrl: null,
    sendcloudLabelUrl: null,
    sendcloudError: null,
    sendcloudCreatedAt: null,
    shippingMethodId: 4,
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
};

const state = {
    createCalls: 0,
    lookupCalls: 0,
    refreshCalls: 0,
    references: [],
    lookupBehavior: "empty",
    createBehavior: "network-error",
    refreshBehavior: "ready",
    refreshResponse: null,
    orderMissing: false,
    order: structuredClone(initialOrder),
};

const existingShipment = {
    id: 654321,
    parcels: [
        {
            id: 987654,
            tracking_number: "EXISTING123",
            tracking_url:
                "https://example.com/tracking/EXISTING123",
            documents: [
                {
                    type: "label",
                    link: "https://example.com/existing-label.pdf",
                },
            ],
        },
    ],
};

function resetState({
    sendcloudStatus = null,
    lookupBehavior = "empty",
    createBehavior = "network-error",
    refreshBehavior = "ready",
    refreshResponse = null,
    existingOrderValues = {},
    orderMissing = false,
} = {}) {
    state.createCalls = 0;
    state.lookupCalls = 0;
    state.refreshCalls = 0;
    state.references = [];
    state.lookupBehavior = lookupBehavior;
    state.createBehavior = createBehavior;
    state.refreshBehavior = refreshBehavior;
    state.refreshResponse = refreshResponse;
    state.orderMissing = orderMissing;

    state.order = {
        ...structuredClone(initialOrder),
        sendcloudStatus,
        ...existingOrderValues,
    };
}

const makeTransaction = () => ({
    LOCK: { UPDATE: "UPDATE" },
    finished: false,

    async commit() {
        this.finished = "commit";
    },

    async rollback() {
        this.finished = "rollback";
    },
});

const makeOrderInstance = () => {
    const instance = { ...state.order };

    instance.save = async () => {
        for (const [key, value] of Object.entries(instance)) {
            if (key !== "save") {
                state.order[key] = value;
            }
        }
    };

    return instance;
};

const orderModel = {
    async findByPk() {
        if (state.orderMissing) {
            return null;
        }

        return makeOrderInstance();
    },

    async update(values, options = {}) {
        if (
            !options.where ||
            options.where.id === state.order.id
        ) {
            if (
                !options.where?.sendcloudStatus ||
                state.order.sendcloudStatus ===
                    options.where.sendcloudStatus
            ) {
                Object.assign(state.order, values);
            }
        }
    },
};

mock.module(
    new URL("../src/models/Order.js", import.meta.url).href,
    {
        exports: {
            Order: orderModel,
        },
    },
);

mock.module(
    new URL("../src/models/Shipping_Method.js", import.meta.url).href,
    {
        exports: {
            ShippingMethod: {
                async findByPk() {
                    return state.order.shippingMethod;
                },
            },
        },
    },
);

mock.module(
    new URL("../src/models/connection.js", import.meta.url).href,
    {
        exports: {
            sequelize: {
                async transaction(callback) {
                    const transaction = makeTransaction();

                    if (callback) {
                        return callback(transaction);
                    }

                    return transaction;
                },
            },
        },
    },
);

mock.module(
    new URL("../src/services/sendcloudService.js", import.meta.url).href,
    {
        exports: {
            default: {
                async getShipmentById(shipmentId) {
                    state.refreshCalls++;
                    state.references.push(String(shipmentId));

                    if (state.refreshBehavior === "error") {
                        throw new Error(
                            "Erreur de récupération Sendcloud simulée."
                        );
                    }

                    if (state.refreshResponse) {
                        return structuredClone(
                            state.refreshResponse
                        );
                    }

                    if (state.refreshBehavior === "pending") {
                        return {
                            data: {
                                id: Number(shipmentId),
                                parcels: [
                                    {
                                        id: 987654,
                                        tracking_number: "",
                                        tracking_url: null,
                                        documents: [],
                                    },
                                ],
                                documents: [],
                            },
                        };
                    }

                    return {
                        data: {
                            id: Number(shipmentId),
                            parcels: [
                                {
                                    id: 987654,
                                    tracking_number: "UPDATED123",
                                    tracking_url:
                                        "https://example.com/tracking/UPDATED123",
                                    documents: [
                                        {
                                            type: "label",
                                            link:
                                                "https://example.com/updated-label.pdf",
                                        },
                                    ],
                                },
                            ],
                        },
                    };
                },

                async getShipmentByReference(externalReferenceId) {
                    state.lookupCalls++;
                    state.references.push(externalReferenceId);

                    if (state.lookupBehavior === "error") {
                        throw new Error(
                            "Erreur de recherche Sendcloud simulée."
                        );
                    }

                    if (state.lookupBehavior === "found") {
                        return {
                            data: [
                                structuredClone(existingShipment),
                            ],
                        };
                    }

                    return { data: [] };
                },

                async createShipment(payload) {
                    state.createCalls++;
                    state.references.push(
                        payload.external_reference_id,
                    );

                    if (state.createBehavior === "http-409") {
                        const error = new Error(
                            "Cette référence externe existe déjà."
                        );

                        error.status = 409;
                        throw error;
                    }

                    if (
                        state.createBehavior === "network-error" &&
                        state.createCalls === 1
                    ) {
                        const error = new Error(
                            "Erreur réseau simulée."
                        );

                        error.code = "ECONNRESET";
                        throw error;
                    }

                    return {
                        data: {
                            id: 123456,
                            parcels: [
                                {
                                    id: 789012,
                                    tracking_number: "TEST123456",
                                    tracking_url:
                                        "https://example.com/tracking/TEST123456",
                                    documents: [
                                        {
                                            type: "label",
                                            link:
                                                "https://example.com/label-test.pdf",
                                        },
                                    ],
                                },
                            ],
                        },
                    };
                },
            },
        },
    },
);

const { default: service } = await import(
    "../src/services/sendcloudShipmentService.js"
);

// --------------------------------------------------
// TESTS DE CRÉATION ET DE RÉCUPÉRATION
// --------------------------------------------------

test(
    "une commande en erreur recherche avant de retenter la création",
    async () => {
        resetState();

        await assert.rejects(
            service.createForOrder(999),
            /Erreur réseau simulée/,
        );

        assert.equal(state.order.sendcloudStatus, "ERREUR");
        assert.equal(state.createCalls, 1);
        assert.equal(state.lookupCalls, 0);

        const result = await service.createForOrder(999);

        assert.equal(result.action, "RECOVERED_OR_CREATED");
        assert.equal(result.shipmentId, "123456");
        assert.equal(state.lookupCalls, 1);
        assert.equal(state.createCalls, 2);

        assert.deepEqual(state.references, [
            "gravelya-CMD-TEST-RETRY",
            "gravelya-CMD-TEST-RETRY",
            "gravelya-CMD-TEST-RETRY",
        ]);

        assert.equal(state.order.sendcloudStatus, "CREEE");
        assert.equal(state.order.sendcloudShipmentId, "123456");

        console.log("✅ Nouvelle tentative après recherche validée.");
    },
);

test(
    "une expédition existante est récupérée sans nouvelle création",
    async () => {
        resetState({
            sendcloudStatus: "ERREUR",
            lookupBehavior: "found",
        });

        const result = await service.createForOrder(999);

        assert.equal(result.shipmentId, "654321");
        assert.equal(state.lookupCalls, 1);
        assert.equal(state.createCalls, 0);

        assert.equal(state.order.sendcloudStatus, "CREEE");
        assert.equal(state.order.sendcloudShipmentId, "654321");
        assert.equal(state.order.sendcloudParcelId, "987654");
        assert.equal(
            state.order.sendcloudTrackingNumber,
            "EXISTING123",
        );
        assert.equal(
            state.order.sendcloudLabelUrl,
            "https://example.com/existing-label.pdf",
        );

        console.log("✅ Expédition existante récupérée sans doublon.");
    },
);

test(
    "une erreur de recherche bloque toute nouvelle création",
    async () => {
        resetState({
            sendcloudStatus: "ERREUR",
            lookupBehavior: "error",
        });

        await assert.rejects(
            service.createForOrder(999),
            /Erreur de recherche Sendcloud simulée/,
        );

        assert.equal(state.lookupCalls, 1);
        assert.equal(state.createCalls, 0);
        assert.equal(state.order.sendcloudStatus, "ERREUR");
        assert.equal(state.order.sendcloudShipmentId, null);

        console.log("✅ Création bloquée après échec de la recherche.");
    },
);

test(
    "une erreur HTTP 409 récupère l'expédition existante sans doublon",
    async () => {
        resetState({
            createBehavior: "http-409",
            lookupBehavior: "found",
        });

        const result = await service.createForOrder(999);

        assert.equal(result.action, "CREATED");
        assert.equal(result.shipmentId, "654321");

        assert.equal(state.createCalls, 1);
        assert.equal(state.lookupCalls, 1);

        assert.equal(
            state.order.sendcloudShipmentId,
            "654321",
        );
        assert.equal(state.order.sendcloudStatus, "CREEE");

        console.log(
            "✅ HTTP 409 : expédition existante récupérée sans doublon.",
        );
    },
);

// --------------------------------------------------
// TESTS DE RAFRAÎCHISSEMENT
// --------------------------------------------------

test(
    "le rafraîchissement actualise le suivi et l'étiquette sans créer d'expédition",
    async () => {
        resetState({
            existingOrderValues: {
                sendcloudShipmentId: "654321",
                sendcloudStatus: "CREEE",
            },
        });

        const result =
            await service.refreshShipmentForOrder(999);

        assert.equal(result.action, "REFRESHED");
        assert.equal(result.shipmentId, "654321");
        assert.equal(result.parcelId, "987654");
        assert.equal(result.trackingNumber, "UPDATED123");

        assert.equal(
            result.trackingUrl,
            "https://example.com/tracking/UPDATED123",
        );

        assert.equal(
            result.labelUrl,
            "https://example.com/updated-label.pdf",
        );

        assert.equal(state.refreshCalls, 1);
        assert.equal(state.createCalls, 0);

        assert.equal(
            state.order.sendcloudShipmentId,
            "654321",
        );

        assert.equal(
            state.order.sendcloudTrackingNumber,
            "UPDATED123",
        );

        assert.equal(
            state.order.sendcloudLabelUrl,
            "https://example.com/updated-label.pdf",
        );

        console.log("✅ Rafraîchissement des informations réussi.");
    },
);

test(
    "le rafraîchissement conserve les informations si Sendcloud est encore en attente",
    async () => {
        resetState({
            refreshBehavior: "pending",
            existingOrderValues: {
                sendcloudShipmentId: "654321",
                sendcloudStatus: "CREEE",
                sendcloudParcelId: "987654",
                sendcloudTrackingNumber: "OLD123",
                sendcloudTrackingUrl:
                    "https://example.com/tracking/OLD123",
                sendcloudLabelUrl:
                    "https://example.com/old-label.pdf",
            },
        });

        const result =
            await service.refreshShipmentForOrder(999);

        assert.equal(result.action, "REFRESHED");
        assert.equal(result.trackingNumber, "OLD123");

        assert.equal(
            result.trackingUrl,
            "https://example.com/tracking/OLD123",
        );

        assert.equal(
            result.labelUrl,
            "https://example.com/old-label.pdf",
        );

        assert.equal(state.refreshCalls, 1);
        assert.equal(state.createCalls, 0);

        console.log("✅ Les informations existantes sont conservées.");
    },
);

test(
    "le rafraîchissement échoue sans créer d'expédition si Sendcloud est inaccessible",
    async () => {
        resetState({
            refreshBehavior: "error",
            existingOrderValues: {
                sendcloudShipmentId: "654321",
                sendcloudStatus: "CREEE",
            },
        });

        await assert.rejects(
            service.refreshShipmentForOrder(999),
            /Erreur de récupération Sendcloud simulée/,
        );

        assert.equal(state.refreshCalls, 1);
        assert.equal(state.createCalls, 0);

        assert.equal(
            state.order.sendcloudShipmentId,
            "654321",
        );

        assert.equal(
            state.order.sendcloudStatus,
            "CREEE",
        );

        console.log(
            "✅ Une erreur Sendcloud ne déclenche aucune création.",
        );
    },
);

// --------------------------------------------------
// TESTS DE RELANCE MANUELLE
// --------------------------------------------------

test(
    "la relance refuse une commande inexistante",
    async () => {
        resetState({
            orderMissing: true,
        });

        await assert.rejects(
            service.retryForOrder(999),
            /Commande introuvable/,
        );

        assert.equal(state.lookupCalls, 0);
        assert.equal(state.createCalls, 0);
    },
);

test(
    "la relance refuse une commande non confirmée",
    async () => {
        resetState({
            existingOrderValues: {
                statut: "EN_ATTENTE",
            },
        });

        await assert.rejects(
            service.retryForOrder(999),
            /commande confirmée/i,
        );

        assert.equal(state.lookupCalls, 0);
        assert.equal(state.createCalls, 0);
    },
);

test(
    "la relance ignore une expédition déjà enregistrée",
    async () => {
        resetState({
            sendcloudStatus: "ERREUR",
            existingOrderValues: {
                sendcloudShipmentId: "654321",
            },
        });

        const result = await service.retryForOrder(999);

        assert.equal(result.action, "IGNORE");
        assert.equal(
            result.reason,
            "EXPEDITION_DEJA_ENREGISTREE",
        );

        assert.equal(state.lookupCalls, 0);
        assert.equal(state.createCalls, 0);
    },
);

test(
    "la relance refuse une commande qui n'est pas en erreur",
    async () => {
        resetState({
            sendcloudStatus: null,
        });

        await assert.rejects(
            service.retryForOrder(999),
            /expédition en erreur/i,
        );

        assert.equal(state.lookupCalls, 0);
        assert.equal(state.createCalls, 0);
    },
);

test(
    "la relance récupère une expédition existante sans doublon",
    async () => {
        resetState({
            sendcloudStatus: "ERREUR",
            lookupBehavior: "found",
        });

        const result = await service.retryForOrder(999);

        assert.equal(result.shipmentId, "654321");
        assert.equal(state.lookupCalls, 1);
        assert.equal(state.createCalls, 0);

        assert.equal(state.order.sendcloudStatus, "CREEE");
        assert.equal(state.order.sendcloudShipmentId, "654321");
    },
);

test(
    "la relance en DRY_RUN valide le payload sans modifier la commande",
    async () => {
        const previousDryRun = process.env.SENDCLOUD_DRY_RUN;

        process.env.SENDCLOUD_DRY_RUN = "true";

        try {
            resetState({
                sendcloudStatus: "ERREUR",
            });

            const result = await service.retryForOrder(999);

            assert.equal(result.action, "DRY_RUN");
            assert.equal(result.orderId, 999);
            assert.ok(result.externalReference);
            assert.ok(result.shippingOptionCode);

            // Aucun appel réel à Sendcloud.
            assert.equal(state.lookupCalls, 0);
            assert.equal(state.createCalls, 0);

            // La commande simulée reste inchangée en base.
            assert.equal(state.order.sendcloudStatus, "ERREUR");
            assert.equal(state.order.sendcloudShipmentId, null);
            assert.equal(state.order.sendcloudError, null);
        } finally {
            if (previousDryRun === undefined) {
                delete process.env.SENDCLOUD_DRY_RUN;
            } else {
                process.env.SENDCLOUD_DRY_RUN = previousDryRun;
            }
        }
    },
);
