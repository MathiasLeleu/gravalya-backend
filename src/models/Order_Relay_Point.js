import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class OrderRelayPoint extends Model {}

OrderRelayPoint.init(
    {
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        relayPointId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        relayPointName: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        relayPointAddress: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        relayPointPostalCode: {
            type: DataTypes.STRING(5),
            allowNull: false,
        },
        relayPointCity: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        relayPointCountry: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "France",
        },
    },
    {   
        sequelize,
        tableName: "order_relay_points"
    }
);