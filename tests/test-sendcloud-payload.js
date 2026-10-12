import sendcloudShipmentPayloadService from "../src/services/sendcloudShipmentPayloadService.js";

process.env.SENDCLOUD_SENDER_ADDRESS_ID = "924199";
process.env.SENDCLOUD_PACKAGE_MARGIN_CM = "2";

const fakeOrder = {
    id: 999,
    orderNumber: "CMD-TEST-SENDCLOUD",
    statut: "CONFIRMEE",
    amount: "16.00",
    customerEmail: "test@example.com",

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

const payload = sendcloudShipmentPayloadService.build(fakeOrder);

console.log("Code de livraison :", payload.ship_with.properties.shipping_option_code);
console.log("Référence externe :", payload.external_reference_id);
console.log("Adresse de destination :", payload.to_address);
console.log("Colis :", payload.parcels[0]);

if (
    payload.external_reference_id !== "gravelya-CMD-TEST-SENDCLOUD" ||
    payload.ship_with.properties.shipping_option_code !== "colissimo:home/fr" ||
    payload.parcels.length !== 1
) {
    throw new Error("Le test du payload Sendcloud a échoué.");
}

console.log("✅ Test du payload réussi. Aucun appel réseau effectué.");