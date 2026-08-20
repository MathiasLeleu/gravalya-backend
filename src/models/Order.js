import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class Order extends Model {}

Order.init(
    {
        statut: {
            type: DataTypes.ENUM("EN_ATTENTE", "CONFIRMEE", "EXPEDIEE", "LIVREE", "ANNULEE"),
            allowNull: false,
            defaultValue: "EN_ATTENTE",
        }, 
        orderNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        totalWeight: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
            validate: {
                min: 0,
            },  
        },
        shippingCost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        shippingMethodId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        shippingRateId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        shippingFirstName: {
            type: DataTypes.STRING(50),
            allowNull: false,
        }, 
        shippingLastName: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        shippingCountry: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "FRANCE",
        },
        shippingAddress: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },shippingAddress2: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        shippingPostalCode: {
            type: DataTypes.STRING(5),
            allowNull: false,
        },
        shippingCity: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        shippingPhone: {
            type: DataTypes.STRING(20),
            allowNull: false,
        }
    },
    {
        sequelize,
        tableName: "orders"
    }
);