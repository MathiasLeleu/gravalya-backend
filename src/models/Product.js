import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class Product extends Model {}

Product.init(
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
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        weight: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        height: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },  
        },
        length: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },  
        width: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        stockQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "products"
    }
);
