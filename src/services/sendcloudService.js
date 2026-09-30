const sendcloudService = {
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