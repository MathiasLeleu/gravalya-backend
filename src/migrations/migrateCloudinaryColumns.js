import { sequelize } from "../models/connection.js";
import { DataTypes } from "sequelize";

async function migrateCloudinaryColumns() {
    const queryInterface = sequelize.getQueryInterface();

    const migrations = [
        {
            table: "pictures",
            column: "cloudinary_public_id",
        },
        {
            table: "categories",
            column: "image_public_id",
        },
        {
            table: "categories",
            column: "banner_public_id",
        },
    ];

    try {
        await sequelize.authenticate();
        console.log("Connexion à la base de données réussie.");

        for (const migration of migrations) {
            const columns = await queryInterface.describeTable(
                migration.table
            );

            if (columns[migration.column]) {
                console.log(
                    `Colonne déjà présente : ${migration.table}.${migration.column}`
                );
                continue;
            }

            await queryInterface.addColumn(
                migration.table,
                migration.column,
                {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                }
            );

            console.log(
                `Colonne ajoutée : ${migration.table}.${migration.column}`
            );
        }

        console.log("Migration Cloudinary terminée.");
    } catch (error) {
        console.error("Échec de la migration Cloudinary :", error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

migrateCloudinaryColumns();