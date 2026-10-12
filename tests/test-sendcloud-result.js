import sendcloudShipmentResultService from "../src/services/sendcloudShipmentResultService.js";

const fakeResponse = {
    data: {
        id: 123456,
        parcels: [
            {
                id: 789012,
                tracking_number: "TEST123456",
                tracking_url: "https://example.com/tracking/TEST123456",
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

const result = sendcloudShipmentResultService.extract(fakeResponse);

console.log("Résultat du test :", result);

if (
    result.shipmentId !== "123456" ||
    result.parcelId !== "789012" ||
    result.trackingNumber !== "TEST123456" ||
    result.labelUrl !== "https://example.com/label-test.pdf"
) {
    throw new Error("Le test du parseur Sendcloud a échoué.");
}

console.log("✅ Test réussi. Aucun appel réseau effectué.");