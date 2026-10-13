const sendcloudShipmentResultService = {
    extract(data) {
        const shipment = data?.data ?? data;

        if (!shipment || shipment.id == null) {
            throw new Error(
                "La réponse Sendcloud ne contient pas d'identifiant d'expédition."
            );
        }

        const parcels = Array.isArray(shipment.parcels)
            ? shipment.parcels
            : [];

        const parcel = parcels[0] ?? null;

        const documents = [
            ...(Array.isArray(shipment.documents)
                ? shipment.documents
                : []),
            ...(Array.isArray(parcel?.documents)
                ? parcel.documents
                : []),
        ];

        const label = documents.find(
            (document) =>
                document.type === "label" ||
                document.type === "shipping_label"
        );

        return {
            shipmentId: String(shipment.id),

            parcelId:
                parcel?.id != null
                    ? String(parcel.id)
                    : null,

            trackingNumber:
                parcel?.tracking_number ||
                shipment.tracking_number ||
                null,

            trackingUrl:
                parcel?.tracking_url ||
                shipment.tracking_url ||
                null,

            labelUrl:
                label?.link ||
                label?.url ||
                null,
        };
    },
};

export default sendcloudShipmentResultService;