import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class Category extends Model {}

Category.init(
    {
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "categories"
    }
);
