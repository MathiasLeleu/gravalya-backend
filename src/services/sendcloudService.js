const sendcloudService = {
    async getShippingOptions({
        postalCode,
        city,
        weight,
        carrierCode,
        deliveryType,
    }) {
        const payload = {
            from_address: {
                country_code: "FR",
                postal_code: process.env.SENDCLOUD_FROM_POSTAL_CODE,
                city: process.env.SENDCLOUD_FROM_CITY,
            },
            to_address: {
                country_code: "FR",
                postal_code: postalCode,
                city,
            },
            parcels: [
                {
                    weight: {
                        value: String(weight),
                        unit: "kg",
                    },
                },
            ],
            carrier_code: carrierCode,
            calculate_quotes: true,
        };

        payload.functionalities = {
            last_mile:
                deliveryType === "Point relais"
                    ? "service_point"
                    : "home_delivery",
        };

        const credentials = Buffer.from(
            `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_PRIVATE_KEY}`
        ).toString("base64");

        const response = await fetch(
            "https://panel.sendcloud.sc/api/v3/shipping-options",
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Impossible de récupérer les options de livraison Sendcloud."
            );
        }
        if (carrierCode === "mondial_relay") {
}

        return data;
    },
    
    async getServicePoints({
        countryCode,
        postalCode,
        city,
        carrierCode,
    }) {
        const params = new URLSearchParams({
            country_code: countryCode,
            address_postal_code: postalCode,
            address_city: city,
            carrier_code: carrierCode,
            limit: "10",
        });

        const credentials = Buffer.from(
            `${process.env.SENDCLOUD_PUBLIC_KEY}:${process.env.SENDCLOUD_PRIVATE_KEY}`
        ).toString("base64");

        const response = await fetch(
            `https://panel.sendcloud.sc/api/v3/service-points?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    Accept: "application/json",
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Impossible de récupérer les points relais Sendcloud."
            );
        }

        return data;
    },
};

export default sendcloudService;