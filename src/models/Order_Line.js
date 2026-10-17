import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class OrderLine extends Model {}

OrderLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
            },
        },
        unitPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        unitWeight: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        customization: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },  
    },
    {
        sequelize,
        tableName: "order_lines"
    }
);