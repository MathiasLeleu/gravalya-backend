import { sequelize } from './connection.js';
import { Model, DataTypes } from 'sequelize';

export class Picture extends Model {}

Picture.init(
    {
        url: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        alt: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        isMain: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'pictures',
    }
);