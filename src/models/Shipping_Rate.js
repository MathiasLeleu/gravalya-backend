import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class ShippingRate extends Model {}

ShippingRate.init(
    {
        shippingMethodId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        minWeight: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        maxWeight: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            validate: {
                min: 0,
            }, 
        },
        cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
    },
    {
        sequelize,
        tableName: "shipping_rates"
    }
);