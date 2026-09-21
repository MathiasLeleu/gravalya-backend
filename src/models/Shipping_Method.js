import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class ShippingMethod extends Model {}

ShippingMethod.init(
    {
        name: {
            type: DataTypes.ENUM("Chronopost", "Colissimo", "Mondial Relay"),
            allowNull: false,
        },
        carrier: {
            type: DataTypes.ENUM("Chronopost", "La Poste", "Mondial Relay"),
            allowNull: false,
        },
        deliveryType: {
            type: DataTypes.ENUM("Domicile", "Point relais"),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "shipping_methods"
    }
);