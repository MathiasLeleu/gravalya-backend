import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";

export class EmailOutbox extends Model {}

EmailOutbox.init(
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        eventKey: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            field: "event_key",
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "order_id",
        },
        eventType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: "event_type",
        },
        recipientEmail: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: "recipient_email",
        },
        payload: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "EN_ATTENTE",
            validate: {
                isIn: [[
                    "EN_ATTENTE",
                    "EN_COURS",
                    "ENVOYE",
                    "ECHEC",
                ]],
            },
        },
        attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        availableAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "available_at",
        },
        lockedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "locked_at",
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "sent_at",
        },
        lastError: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "last_error",
        },
    },
    {
        sequelize,
        tableName: "email_outbox",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);
