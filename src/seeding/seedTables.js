import {
    sequelize,
    User,
    Order,
    Product,
    Category,
    ShippingMethod,
    ShippingRate,
    OrderRelayPoint,
    OrderLine,
} from "../models/associations.js";

async function runSeed() {
    try {
        console.log("🌱 Création des données de test...");

        // =========================================================
        // CATEGORIES
        // =========================================================

        const categories = await Category.bulkCreate([
            {
                name: "Informatique",
                description: "Ordinateurs, composants et accessoires informatiques.",
            },
            {
                name: "Gaming",
                description: "Produits et accessoires dédiés au jeu vidéo.",
            },
            {
                name: "Audio",
                description: "Casques, enceintes et accessoires audio.",
            },
            {
                name: "Maison",
                description: "Produits et accessoires pour la maison.",
            },
        ]);

        // =========================================================
        // PRODUCTS
        // 10 produits répartis dans les 3 premières catégories
        // La catégorie Maison reste volontairement vide.
        // =========================================================

        const products = await Product.bulkCreate([
            // -------------------------
            // Informatique
            // -------------------------
            {
                name: "Clavier mécanique",
                description: "Clavier mécanique RGB avec switches mécaniques.",
                price: 89.99,
                weight: 0.850,
                height: 5.00,
                length: 45.00,
                width: 18.00,
                stockQuantity: 25,
                active: true,
                categoryId: categories[0].id,
            },
            {
                name: "Souris gaming",
                description: "Souris gaming filaire avec capteur haute précision.",
                price: 49.99,
                weight: 0.120,
                height: 4.00,
                length: 12.00,
                width: 7.00,
                stockQuantity: 40,
                active: true,
                categoryId: categories[0].id,
            },
            {
                name: "SSD 1 To",
                description: "SSD NVMe 1 To haute performance.",
                price: 99.90,
                weight: 0.070,
                height: 2.00,
                length: 8.00,
                width: 5.00,
                stockQuantity: 18,
                active: true,
                categoryId: categories[0].id,
            },
            {
                name: "Webcam Full HD",
                description: "Webcam Full HD avec microphone intégré.",
                price: 59.90,
                weight: 0.300,
                height: 6.00,
                length: 10.00,
                width: 5.00,
                stockQuantity: 15,
                active: true,
                categoryId: categories[0].id,
            },

            // -------------------------
            // Gaming
            // -------------------------
            {
                name: "Manette sans fil",
                description: "Manette sans fil compatible PC et consoles.",
                price: 69.99,
                weight: 0.450,
                height: 7.00,
                length: 16.00,
                width: 11.00,
                stockQuantity: 30,
                active: true,
                categoryId: categories[1].id,
            },
            {
                name: "Casque gaming",
                description: "Casque gaming avec microphone et son surround.",
                price: 79.99,
                weight: 0.650,
                height: 20.00,
                length: 22.00,
                width: 10.00,
                stockQuantity: 20,
                active: true,
                categoryId: categories[1].id,
            },
            {
                name: "Tapis de souris XXL",
                description: "Grand tapis de souris gaming antidérapant.",
                price: 29.99,
                weight: 0.800,
                height: 2.00,
                length: 90.00,
                width: 40.00,
                stockQuantity: 35,
                active: true,
                categoryId: categories[1].id,
            },

            // -------------------------
            // Audio
            // -------------------------
            {
                name: "Écouteurs Bluetooth",
                description: "Écouteurs Bluetooth avec boîtier de recharge.",
                price: 39.99,
                weight: 0.080,
                height: 4.00,
                length: 7.00,
                width: 4.00,
                stockQuantity: 50,
                active: true,
                categoryId: categories[2].id,
            },
            {
                name: "Enceinte Bluetooth",
                description: "Enceinte Bluetooth portable.",
                price: 74.99,
                weight: 0.900,
                height: 10.00,
                length: 25.00,
                width: 10.00,
                stockQuantity: 20,
                active: true,
                categoryId: categories[2].id,
            },
            {
                name: "Microphone USB",
                description: "Microphone USB pour streaming et enregistrement.",
                price: 109.99,
                weight: 1.200,
                height: 25.00,
                length: 15.00,
                width: 15.00,
                stockQuantity: 12,
                active: false,
                categoryId: categories[2].id,
            },
        ]);

        // =========================================================
        // USERS
        // =========================================================

        const users = await User.bulkCreate([
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
            {
                firstName: "Marie",
                lastName: "Martin",
                email: "marie@test.fr",
                password: "User123!",
                role: "user",
            },
            {
                firstName: "Lucas",
                lastName: "Bernard",
                email: "lucas@test.fr",
                password: "User123!",
                role: "user",
            },
            {
                firstName: "Emma",
                lastName: "Robert",
                email: "emma@test.fr",
                password: "User123!",
                role: "user",
            },
            {
                firstName: "Thomas",
                lastName: "Petit",
                email: "thomas@test.fr",
                password: "User123!",
                role: "user",
            },
            {
                firstName: "Sophie",
                lastName: "Durand",
                email: "sophie@test.fr",
                password: "User123!",
                role: "user",
            },
        ]);

        // Sophie n'aura volontairement aucune commande.

        // =========================================================
        // SHIPPING METHODS
        // =========================================================

        const shippingMethods = await ShippingMethod.bulkCreate([
            {
                name: "Lettre Suivie",
                carrier: "La Poste",
                deliveryType: "Domicile",
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
        //
        // Les tranches sont compatibles avec ton createOrder :
        //
        // 0.000 - 0.499 kg
        // 0.500 - 0.999 kg
        // 1.000 - 1.999 kg
        // 2.000 - 4.999 kg
        // 5.000 - 10.000 kg
        // =========================================================

        const shippingRatesData = [];

        const prices = [
            // Lettre Suivie
            [2.50, 4.00, 5.50, 8.00, 12.00],

            // Colissimo domicile
            [4.99, 6.99, 8.99, 11.99, 15.99],

            // Colissimo point relais
            [4.49, 6.49, 8.49, 10.99, 14.99],

            // Mondial Relay domicile
            [4.50, 6.50, 8.50, 10.50, 14.50],

            // Mondial Relay point relais
            [3.99, 5.99, 7.99, 9.99, 13.99],
        ];

        const weightRanges = [
            [0.000, 0.499],
            [0.500, 0.999],
            [1.000, 1.999],
            [2.000, 4.999],
            [5.000, 10.000],
        ];

        for (let i = 0; i < shippingMethods.length; i++) {
            for (let j = 0; j < weightRanges.length; j++) {
                shippingRatesData.push({
                    shippingMethodId: shippingMethods[i].id,
                    minWeight: weightRanges[j][0],
                    maxWeight: weightRanges[j][1],
                    cost: prices[i][j],
                });
            }
        }

        const shippingRates = await ShippingRate.bulkCreate(
            shippingRatesData
        );

        // =========================================================
        // HELPER POUR CREER UNE COMMANDE
        // =========================================================

        async function createOrder({
            user,
            orderNumber,
            statut,
            shippingMethod,
            shippingRate,
            lines,
            shipping,
            relayPoint = null,
        }) {
            const amount = lines.reduce(
                (total, line) => total + line.product.price * line.quantity,
                0
            );

            const totalWeight = lines.reduce(
                (total, line) => total + line.product.weight * line.quantity,
                0
            );

            const order = await Order.create({
                orderNumber,
                statut,
                amount: Math.round(amount * 100) / 100,
                totalWeight: Math.round(totalWeight * 1000) / 1000,
                shippingCost: shippingRate.cost,
                shippingMethodId: shippingMethod.id,
                shippingRateId: shippingRate.id,
                userId: user.id,

                shippingFirstName: shipping.firstName,
                shippingLastName: shipping.lastName,
                shippingCountry: shipping.country || "FRANCE",
                shippingAddress: shipping.address,
                shippingAddress2: shipping.address2 || null,
                shippingPostalCode: shipping.postalCode,
                shippingCity: shipping.city,
                shippingPhone: shipping.phone,
            });

            for (const line of lines) {
                await OrderLine.create({
                    orderId: order.id,
                    productId: line.product.id,
                    quantity: line.quantity,
                    unitPrice: line.product.price,
                    unitWeight: line.product.weight,
                });
            }

            if (relayPoint) {
                await OrderRelayPoint.create({
                    orderId: order.id,
                    relayPointId: relayPoint.id,
                    relayPointName: relayPoint.name,
                    relayPointAddress: relayPoint.address,
                    relayPointPostalCode: relayPoint.postalCode,
                    relayPointCity: relayPoint.city,
                    relayPointCountry: "France",
                });
            }

            return order;
        }

        // =========================================================
        // RELAY POINTS
        // =========================================================

        const relayPoints = [
            {
                id: 1001,
                name: "Mondial Relay - Centre Ville",
                address: "10 Rue de la République",
                postalCode: "56000",
                city: "Vannes",
            },
            {
                id: 1002,
                name: "Point Relais - Supermarché",
                address: "25 Avenue de la Gare",
                postalCode: "35000",
                city: "Rennes",
            },
            {
                id: 1003,
                name: "Point Relais - Tabac Presse",
                address: "5 Rue Nationale",
                postalCode: "29000",
                city: "Quimper",
            },
        ];

        // =========================================================
        // COMMANDES
        // =========================================================

        // Commande 1
        // 1 ligne
        // Lettre Suivie
        await createOrder({
            user: users[1],
            orderNumber: "CMD-TEST-001",
            statut: "EN_ATTENTE",
            shippingMethod: shippingMethods[0],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[0].id &&
                    rate.minWeight === "0.000"
            ),
            lines: [
                {
                    product: products[1],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Jean",
                lastName: "Dupont",
                address: "12 Rue de Paris",
                postalCode: "56000",
                city: "Vannes",
                phone: "0601020304",
            },
        });

        // Commande 2
        // Plusieurs lignes
        // Colissimo domicile
        await createOrder({
            user: users[1],
            orderNumber: "CMD-TEST-002",
            statut: "CONFIRMEE",
            shippingMethod: shippingMethods[1],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[1].id &&
                    rate.minWeight === "1.000"
            ),
            lines: [
                {
                    product: products[0],
                    quantity: 1,
                },
                {
                    product: products[2],
                    quantity: 1,
                },
                {
                    product: products[7],
                    quantity: 2,
                },
            ],
            shipping: {
                firstName: "Jean",
                lastName: "Dupont",
                address: "12 Rue de Paris",
                address2: "Appartement 4",
                postalCode: "56000",
                city: "Vannes",
                phone: "0601020304",
            },
        });

        // Commande 3
        // Plusieurs lignes
        // Colissimo point relais
        await createOrder({
            user: users[2],
            orderNumber: "CMD-TEST-003",
            statut: "EXPEDIEE",
            shippingMethod: shippingMethods[2],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[2].id &&
                    rate.minWeight === "1.000"
            ),
            lines: [
                {
                    product: products[4],
                    quantity: 1,
                },
                {
                    product: products[5],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Marie",
                lastName: "Martin",
                address: "8 Rue Victor Hugo",
                postalCode: "29000",
                city: "Quimper",
                phone: "0611223344",
            },
            relayPoint: relayPoints[0],
        });

        // Commande 4
        // 1 ligne
        // Mondial Relay domicile
        await createOrder({
            user: users[2],
            orderNumber: "CMD-TEST-004",
            statut: "LIVREE",
            shippingMethod: shippingMethods[3],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[3].id &&
                    rate.minWeight === "0.500"
            ),
            lines: [
                {
                    product: products[8],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Marie",
                lastName: "Martin",
                address: "20 Rue Nationale",
                postalCode: "35000",
                city: "Rennes",
                phone: "0611223344",
            },
        });

        // Commande 5
        // Plusieurs lignes
        // Mondial Relay point relais
        await createOrder({
            user: users[3],
            orderNumber: "CMD-TEST-005",
            statut: "ANNULEE",
            shippingMethod: shippingMethods[4],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[4].id &&
                    rate.minWeight === "2.000"
            ),
            lines: [
                {
                    product: products[0],
                    quantity: 1,
                },
                {
                    product: products[6],
                    quantity: 2,
                },
                {
                    product: products[8],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Lucas",
                lastName: "Bernard",
                address: "15 Rue de Brest",
                postalCode: "29000",
                city: "Quimper",
                phone: "0622334455",
            },
            relayPoint: relayPoints[1],
        });

        // Commande 6
        // Plusieurs lignes
        // Lettre suivie
        await createOrder({
            user: users[3],
            orderNumber: "CMD-TEST-006",
            statut: "CONFIRMEE",
            shippingMethod: shippingMethods[0],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[0].id &&
                    rate.minWeight === "0.500"
            ),
            lines: [
                {
                    product: products[3],
                    quantity: 1,
                },
                {
                    product: products[7],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Lucas",
                lastName: "Bernard",
                address: "3 Rue du Port",
                postalCode: "56000",
                city: "Vannes",
                phone: "0622334455",
            },
        });

        // Commande 7
        // 1 ligne
        // Colissimo domicile
        await createOrder({
            user: users[4],
            orderNumber: "CMD-TEST-007",
            statut: "EN_ATTENTE",
            shippingMethod: shippingMethods[1],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[1].id &&
                    rate.minWeight === "0.000"
            ),
            lines: [
                {
                    product: products[7],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Emma",
                lastName: "Robert",
                address: "7 Rue Jean Jaurès",
                postalCode: "44000",
                city: "Nantes",
                phone: "0633445566",
            },
        });

        // Commande 8
        // Plusieurs lignes
        // Colissimo point relais
        await createOrder({
            user: users[5],
            orderNumber: "CMD-TEST-008",
            statut: "LIVREE",
            shippingMethod: shippingMethods[2],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[2].id &&
                    rate.minWeight === "1.000"
            ),
            lines: [
                {
                    product: products[0],
                    quantity: 1,
                },
                {
                    product: products[4],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Thomas",
                lastName: "Petit",
                address: "14 Rue du Commerce",
                postalCode: "35000",
                city: "Rennes",
                phone: "0644556677",
            },
            relayPoint: relayPoints[2],
        });

        // Commande 9
        // 1 ligne
        // Mondial Relay domicile
        await createOrder({
            user: users[5],
            orderNumber: "CMD-TEST-009",
            statut: "EXPEDIEE",
            shippingMethod: shippingMethods[3],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[3].id &&
                    rate.minWeight === "1.000"
            ),
            lines: [
                {
                    product: products[5],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Thomas",
                lastName: "Petit",
                address: "2 Rue de Lorient",
                postalCode: "56000",
                city: "Vannes",
                phone: "0644556677",
            },
        });

        // Commande 10
        // Plusieurs lignes
        // Mondial Relay point relais
        await createOrder({
            user: users[1],
            orderNumber: "CMD-TEST-010",
            statut: "EN_ATTENTE",
            shippingMethod: shippingMethods[4],
            shippingRate: shippingRates.find(
                (rate) =>
                    rate.shippingMethodId === shippingMethods[4].id &&
                    rate.minWeight === "1.000"
            ),
            lines: [
                {
                    product: products[2],
                    quantity: 2,
                },
                {
                    product: products[7],
                    quantity: 1,
                },
            ],
            shipping: {
                firstName: "Jean",
                lastName: "Dupont",
                address: "12 Rue de Paris",
                postalCode: "56000",
                city: "Vannes",
                phone: "0601020304",
            },
            relayPoint: relayPoints[0],
        });

        console.log("✅ Seed terminé avec succès !");
    } catch (error) {
        console.error("❌ Erreur lors du seed :", error);
    } finally {
        await sequelize.close();
    }
}

runSeed();