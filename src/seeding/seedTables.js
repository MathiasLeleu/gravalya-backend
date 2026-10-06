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

        const shippingMethod = await ShippingMethod.bulkCreate([
        {
            name: "Lettre Suivie",
            carrier: "La Poste",
            deliveryType: "Domicile",
        },
        {
            name: "Chronopost",
            carrier: "Chronopost",
            deliveryType: "Domicile",
        },
        {
            name: "Chronopost",
            carrier: "Chronopost",
            deliveryType: "Point relais",
        },
        {
            name: "Colissimo",
            carrier: "La Poste",
            deliveryType: "Domicile",
        },
        {
            name: "Colissimo",
            carrier: "La Poste",
            deliveryType: "Point relais",
        },
        {
            name: "Mondial Relay",
            carrier: "Mondial Relay",
            deliveryType: "Domicile",
        },
        {
            name: "Mondial Relay",
            carrier: "Mondial Relay",
            deliveryType: "Point relais",
        },
    ]);

        // =========================================================
        // SHIPPING RATES
        // =========================================================

        await ShippingRate.bulkCreate([
            {
                shippingMethodId: shippingMethod[0].id,
                minWeight: 0.000,
                maxWeight: 20.000,
                cost: 2.02,
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