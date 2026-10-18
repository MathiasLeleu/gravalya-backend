import { sequelize } from "../models/associations.js";

async function initializeProduction() {
    try {
        const dbUrl = process.env.DB_URL;

        if (!dbUrl) {
            throw new Error("DB_URL n'est pas configurée.");
        }

        if (process.env.ALLOW_PRODUCTION_SCHEMA_INIT !== "true") {
            throw new Error(
                "Initialisation bloquée : ALLOW_PRODUCTION_SCHEMA_INIT=true est requis."
            );
        }

        const hostname = new URL(dbUrl).hostname;

        if (!hostname.endsWith("neon.tech")) {
            throw new Error(
                "Initialisation bloquée : la base cible n'est pas hébergée sur Neon."
            );
        }

        console.log("🔌 Connexion à Neon...");
        await sequelize.authenticate();

        const tables = await sequelize.getQueryInterface().showAllTables();

        if (tables.length > 0) {
            throw new Error(
                `Initialisation bloquée : ${tables.length} table(s) existent déjà.`
            );
        }

        console.log("🚧 Création du schéma de production...");
        await sequelize.sync();

        console.log("✅ Schéma créé avec succès, sans données de test.");
    } catch (error) {
        console.error("❌ Échec de l'initialisation :", error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

initializeProduction();
