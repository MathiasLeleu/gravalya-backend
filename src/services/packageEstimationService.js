
const DEFAULT_MARGIN_CM = 2;

const packageEstimationService = {
    estimate(orderLines) {
        if (!Array.isArray(orderLines) || orderLines.length === 0) {
            throw new Error(
                "Impossible d'estimer un colis sans produits."
            );
        }

        const configuredMargin = Number(
            process.env.SENDCLOUD_PACKAGE_MARGIN_CM ??
            DEFAULT_MARGIN_CM
        );

        if (
            !Number.isFinite(configuredMargin) ||
            configuredMargin < 0
        ) {
            throw new Error(
                "La marge de protection Sendcloud est invalide."
            );
        }

        let totalWeightGrams = 0;
        let totalLengthCm = 0;
        let maxWidthCm = 0;
        let maxHeightCm = 0;

        for (const line of orderLines) {
            const product = line.product;
            const quantity = Number(line.quantity);
            const unitWeightGrams = Number(line.unitWeight);

            if (!product) {
                throw new Error(
                    "Un produit est manquant dans les lignes de commande."
                );
            }

            const length = Number(product.length);
            const width = Number(product.width);
            const height = Number(product.height);

            if (
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                !Number.isFinite(unitWeightGrams) ||
                unitWeightGrams < 0 ||
                !Number.isFinite(length) ||
                length <= 0 ||
                !Number.isFinite(width) ||
                width <= 0 ||
                !Number.isFinite(height) ||
                height <= 0
            ) {
                throw new Error(
                    `Dimensions, poids ou quantité invalides pour "${product.name}".`
                );
            }

            // On autorise la rotation sur la base du produit.
            const baseLength = Math.max(length, width);
            const baseWidth = Math.min(length, width);

            totalWeightGrams += unitWeightGrams * quantity;
            totalLengthCm += baseLength * quantity;
            maxWidthCm = Math.max(maxWidthCm, baseWidth);
            maxHeightCm = Math.max(maxHeightCm, height);
        }

        // Disposition estimée : produits côte à côte sur la longueur.
        // La marge est appliquée sur les deux côtés de chaque dimension.
        const margin = configuredMargin * 2;

        return {
            weightKg: Number(
                (totalWeightGrams / 1000).toFixed(3)
            ),
            dimensions: {
                length: Number((totalLengthCm + margin).toFixed(2)),
                width: Number((maxWidthCm + margin).toFixed(2)),
                height: Number((maxHeightCm + margin).toFixed(2)),
            },
            marginPerSideCm: configuredMargin,
            estimationMethod: "SIDE_BY_SIDE",
        };
    },
};

export default packageEstimationService;