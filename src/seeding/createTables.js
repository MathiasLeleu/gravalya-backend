import { sequelize } from "../models/associations.js";

async function runMigration() {
    try {
        console.log("🚧 Définition des tables...");

        await sequelize.sync({ force: true });

        console.log("✅ Migration OK ! Fermeture de la base...");
    } catch (error) {
        console.error("❌ Erreur lors de la migration:", error);
    } finally {
        await sequelize.close();
    }
}

runMigration();