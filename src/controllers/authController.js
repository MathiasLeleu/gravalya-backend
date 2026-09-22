import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { User } from '../models/User.js';
import { badRequest } from '../utils/error.js';

const authController = {

    // Connexion
    async login(req, res) {
        const { email, password } = req.body;

        const user = await User.findOne({
            where: { email }
        });

        if (!user) {
            badRequest('Email ou mot de passe incorrect.');
        }

        const isMatching = await argon2.verify(
            user.password,
            password
        );

        if (!isMatching) {
            badRequest('Email ou mot de passe incorrect.');
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: '2h'
            }
        );

        res.status(200).json({
            message: 'Connexion réussie.',
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    }

};

export { authController };