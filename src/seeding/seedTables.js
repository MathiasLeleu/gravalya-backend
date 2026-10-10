import {
    sequelize,
    User,
    Category,
    Product,
    Picture,
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
        // CATEGORY: NOËL
        // =========================================================

        const christmasCategory = await Category.create({
            name: "Noël",
            slug: "noel",
            description: "Décorations et créations personnalisées pour Noël.",
            imageUrl: "/uploads/categories/noel/image.png",
            bannerUrl: "/uploads/categories/noel/banner.png",
        });

        // =========================================================
        // PRODUCT: ORNEMENT BONHOMME DE NEIGE
        // =========================================================

        const snowmanOrnament = await Product.create({
            name: "Ornement de Noël 3D | Bonhomme de Neige",
            description: `Décoration de Noël à suspendre en impression 3D relief « Bonhomme de Neige »

        Sublimez votre sapin de Noël avec cet ornement plat en forme de boule, illustrant une douce scène hivernale et féerique !

        L'illustration représente un adorable bonhomme de neige coiffé d'un bonnet et d'une écharpe rouge vif, entouré de sapins enneigés sous un ciel étoilé et une belle lune. Le contour et le bas de la suspension sont habillés de délicats motifs dentelle/flocons en relief qui encadrent le décor avec élégance.

        Réalisée grâce à la technique d'impression 3D multi filament par superposition de couches, cette suspension offre un superbe effet de relief et une belle profondeur visuelle. Son verso est complètement lisse et d'un noir profond. L'anneau intégré au sommet permet d'y passer facilement un ruban, une ficelle de jute ou un crochet pour l'accrocher directement à votre sapin.

        Un ajout chaleureux à votre décoration de fêtes ou une très belle idée de petite attention à offrir pendant la période de Noël !`,
            price: 3.20,
            weight: 7,
            height: 11.5,
            length: 10,
            width: 0.2,
            stockQuantity: 30,
            active: true,
            categoryId: christmasCategory.id,
        });

        // =========================================================
        // PRODUCT PICTURES
        // =========================================================

        await Picture.bulkCreate([
            {
                url: "/uploads/products/1/ornementbdn1.jpg",
                alt: "Ornement de Noël 3D représentant un bonhomme de neige",
                isMain: true,
                productId: snowmanOrnament.id,
            },
            {
                url: "/uploads/products/1/ornementbdn2.jpg",
                alt: "Deuxième vue de l'ornement de Noël 3D bonhomme de neige",
                isMain: false,
                productId: snowmanOrnament.id,
            },
        ]);

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