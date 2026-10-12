
import packageEstimationService from "./packageEstimationService.js";

const SHIPPING_OPTION_CODES = {
    "Colissimo-Domicile": "colissimo:home/fr",
    "Colissimo-Point relais": "colissimo:post-office",
    "Chronopost-Domicile": "chronopost:18",
    "Chronopost-Point relais": "chronopost:service_point",
    "Mondial Relay-Domicile":
        "mondial_relay:home_domestic,dualapi/c2c",
    "Mondial Relay-Point relais":
        "mondial_relay:service_point,dualapi/size=l,c2c",
};

const sendcloudShipmentPayloadService = {
    build(order) {
        if (!order || !order.orderNumber) {
            throw new Error(
                "La commande est invalide pour créer une expédition."
            );
        }

        if (order.statut !== "CONFIRMEE") {
            throw new Error(
                "Seule une commande confirmée peut être expédiée."
            );
        }

        if (!process.env.SENDCLOUD_SENDER_ADDRESS_ID) {
            throw new Error(
                "SENDCLOUD_SENDER_ADDRESS_ID est manquant."
            );
        }

        const senderAddressId = Number(
            process.env.SENDCLOUD_SENDER_ADDRESS_ID
        );

        if (
            !Number.isSafeInteger(senderAddressId) ||
            senderAddressId <= 0
        ) {
            throw new Error(
                "L'identifiant de l'adresse expéditeur est invalide."
            );
        }

        if (!order.shippingMethod) {
            throw new Error(
                "La méthode de livraison est absente de la commande."
            );
        }

        // La Lettre Suivie ne passe pas par ce flux d'expédition.
        if (order.shippingMethod.name === "Lettre Suivie") {
            throw new Error(
                "La Lettre Suivie doit être traitée séparément."
            );
        }

        const serviceKey =
            `${order.shippingMethod.name}-${order.shippingMethod.deliveryType}`;

        const shippingOptionCode = SHIPPING_OPTION_CODES[serviceKey];

        if (!shippingOptionCode) {
            throw new Error(
                "Le service de livraison de cette commande n'est pas pris en charge."
            );
        }

        const orderLines = order.orderLines || [];

        const estimatedPackage =
            packageEstimationService.estimate(orderLines);

        const country = String(
            order.shippingCountry || ""
        ).trim().toUpperCase();

        if (!["FRANCE", "FR"].includes(country)) {
            throw new Error(
                "La création d'expéditions internationales nécessite une configuration spécifique."
            );
        }

        if (
            !order.shippingFirstName ||
            !order.shippingLastName ||
            !order.shippingAddress ||
            !order.shippingPostalCode ||
            !order.shippingCity ||
            !order.shippingPhone ||
            !order.customerEmail
        ) {
            throw new Error(
                "Les coordonnées du destinataire sont incomplètes."
            );
        }

        const isRelay =
            order.shippingMethod.deliveryType === "Point relais";

        if (isRelay && !order.orderRelayPoint) {
            throw new Error(
                "Le point relais est absent de la commande."
            );
        }

        const parcelItems = orderLines.map((line) => {
            if (!line.product) {
                throw new Error(
                    `Le produit de la ligne ${line.productId} est absent.`
                );
            }

            return {
                item_id: String(line.productId),
                product_id: String(line.productId),
                description: line.product.name,
                quantity: Number(line.quantity),
                weight: {
                    value: Number(
                        (Number(line.unitWeight) / 1000).toFixed(3)
                    ),
                    unit: "kg",
                },
                price: {
                    value: String(line.unitPrice),
                    currency: "EUR",
                },
            };
        });

        const payload = {
            external_reference_id: `gravelya-${order.orderNumber}`,
            order_number: order.orderNumber,

            from_address: {
                sender_address_id: senderAddressId,
            },

            to_address: {
                name:
                    `${order.shippingFirstName} ${order.shippingLastName}`,
                address_line_1: order.shippingAddress,
                ...(order.shippingAddress2
                    ? {
                        address_line_2: order.shippingAddress2,
                    }
                    : {}),
                postal_code: order.shippingPostalCode,
                city: order.shippingCity,
                country_code: "FR",
                phone_number: order.shippingPhone,
                email: order.customerEmail,
            },

            ship_with: {
                type: "shipping_option_code",
                properties: {
                    shipping_option_code: shippingOptionCode,
                },
            },

            total_order_price: {
                currency: "EUR",
                value: String(order.amount),
            },

            label_details: {
                mime_type: "application/pdf",
                dpi: 72,
            },

            parcels: [
                {
                    dimensions: {
                        length: String(
                            estimatedPackage.dimensions.length
                        ),
                        width: String(
                            estimatedPackage.dimensions.width
                        ),
                        height: String(
                            estimatedPackage.dimensions.height
                        ),
                        unit: "cm",
                    },
                    weight: {
                        value: String(
                            estimatedPackage.weightKg
                        ),
                        unit: "kg",
                    },
                    parcel_items: parcelItems,
                },
            ],
        };

        if (isRelay) {
            payload.to_service_point = {
                id: order.orderRelayPoint.relayPointId,
            };
        }

        return payload;
    },
};

export default sendcloudShipmentPayloadService;