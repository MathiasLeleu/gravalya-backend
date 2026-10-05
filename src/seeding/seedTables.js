import {
    sequelize,
    User,
    ShippingMethod,
    ShippingRate,
} from "../models/associations.js";

async function runSeed() {
    try {
        console.log("🌱 Création des données de test...");

        // =========================================================
        // USERS
        // =========================================================

        await User.bulkCreate([
            {
                firstName: "Admin",
                lastName: "Principal",
                email: "admin@test.fr",
                password: "Admin123!",
                role: "admin",
            },
            {
                firstName: "Jean",
                lastName: "Dupont",
                email: "jean@test.fr",
                password: "User123!",
                role: "user",
            },
        ], {
            individualHooks: true,
        });

        // =========================================================
        // SHIPPING METHODS
        // =========================================================

        const shippingMethod = await ShippingMethod.create({
            name: "Lettre Suivie",
            carrier: "La Poste",
            deliveryType: "Domicile",
        });

        // =========================================================
        // SHIPPING RATES
        // =========================================================

        await ShippingRate.bulkCreate([
            {
                shippingMethodId: shippingMethod.id,
                minWeight: 0.000,
                maxWeight: 0.020,
                cost: 2.02,
            },
            {
                shippingMethodId: shippingMethod.id,
                minWeight: 0.021,
                maxWeight: 0.050,
                cost: 3.60,
            },
        ]);

        console.log("✅ Seed terminé avec succès !");
    } catch (error) {
        console.error("❌ Erreur lors du seed :", error);
    } finally {
        await sequelize.close();
    }
}

runSeed();