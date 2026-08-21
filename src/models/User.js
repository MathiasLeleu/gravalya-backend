import { sequelize } from "./connection.js";
import { Model, DataTypes } from "sequelize";
import argon2 from "argon2";

export class User extends Model {}

User.init(
    {
        firstName: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        lastName: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM("user", "admin"),
            allowNull: false,
            defaultValue: "user",
        },
    },
        {
            sequelize,
            tableName: "users",
            hooks: {
                beforeCreate: async (user) => {
                    if (user.password) {
                        user.password = await argon2.hash(user.password);
                    }
                },
                beforeUpdate: async (user) => {
                    if (user.password) {
                        user.password = await argon2.hash(user.password);
                    }
                }
            }

        }
);