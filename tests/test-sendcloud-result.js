
import assert from "node:assert/strict";
import sendcloudShipmentResultService from "../src/services/sendcloudShipmentResultService.js";

// Cas 1 : expédition avec étiquette et suivi disponibles.
const readyResponse = {
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
                        link: "https://example.com/label-test.pdf",
                    },
                ],
            },
        ],
    },
};

const readyResult =
    sendcloudShipmentResultService.extract(readyResponse);

assert.deepEqual(readyResult, {
    shipmentId: "123456",
    parcelId: "789012",
    trackingNumber: "TEST123456",
    trackingUrl: "https://example.com/tracking/TEST123456",
    labelUrl: "https://example.com/label-test.pdf",
});

console.log("✅ Expédition avec étiquette et suivi disponibles.");

// Cas 2 : expédition créée, mais étiquette et suivi pas encore disponibles.
const pendingResponse = {
    data: {
        id: 654321,
        parcels: [
            {
                id: 987654,
                tracking_number: "",
                tracking_url: null,
                documents: [],
            },
        ],
    },
};

const pendingResult =
    sendcloudShipmentResultService.extract(pendingResponse);

assert.deepEqual(pendingResult, {
    shipmentId: "654321",
    parcelId: "987654",
    trackingNumber: null,
    trackingUrl: null,
    labelUrl: null,
});

console.log(
    "✅ Expédition en attente : identifiants conservés, " +
    "étiquette et suivi absents."
);

// Cas 3 : une réponse sans identifiant d'expédition doit échouer.
assert.throws(
    () => sendcloudShipmentResultService.extract({ data: {} }),
    /identifiant d'expédition/i,
);

console.log("✅ Réponse invalide correctement rejetée.");
console.log("Tous les tests du parseur Sendcloud ont réussi.");