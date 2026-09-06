import { User } from '../models/User.js';
import argon2 from 'argon2';
import { badRequest, conflict, notFound } from '../utils/error.js';

const userController = {

    // Get all users
    async showAllUsers(req, res) {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });

        res.status(200).json(users);
    },

    // Get a single user by ID
    async showOneUser(req, res) {
        const userId = parseInt(req.params.id);
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    association: 'orders',
                    include: ['orderLines']
                },
            ]
        });

        if (!user) {
            notFound("Utilisateur non trouvé.");
        }

        res.status(200).json(user);
    },

    // Create a new user
    async createUser(req, res) {
        const { firstName, lastName, email, password, confirmPassword } = req.body;

        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            badRequest(
                'Les champs Prénom, Nom, Email, Mot de passe et Confirmation du mot de passe sont requis.'
            );
        }

        if (password !== confirmPassword) {
            badRequest('Le mot de passe et sa confirmation ne correspondent pas.');
        }

        const existingEmail = await User.findOne({
            where: { email }
        });

        if (existingEmail) {
            conflict('Cet email est déjà utilisé.');
        }

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password,
        });

        const newUserWithoutPassword = {
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role
        };

        res.status(201).json(newUserWithoutPassword);
    },

    // Update a user
    async updateUser(req, res) {
        const userId = parseInt(req.params.id);
        const user = await User.findByPk(userId);

        // TODO: Réactiver lorsque l'authentification sera mise en place.
        // if (req.user?.id !== userId) {
        //     return res.status(403).json({
        //         message: 'Vous n\'êtes pas autorisé à modifier les données de cet utilisateur.'
        //     });
        // }

        if (!user) {
            notFound("Utilisateur non trouvé.");
        }

        const {
            firstName,
            lastName,
            email,
            password,
            newPassword,
            confirmNewPassword
        } = req.body;

        // Modification du prénom
        if (firstName) {
            user.firstName = firstName;
        }

        // Modification du nom
        if (lastName) {
            user.lastName = lastName;
        }

        // Modification de l'email
        if (email) {
            const existingEmail = await User.findOne({
                where: { email }
            });

            if (existingEmail && existingEmail.id !== user.id) {
                conflict('Cet email est déjà utilisé.');
            }

            user.email = email;
        }

        // Modification du mot de passe
        if (password || newPassword || confirmNewPassword) {

            // Les trois champs sont obligatoires
            if (!password || !newPassword || !confirmNewPassword) {
                badRequest(
                    'Pour modifier le mot de passe, le mot de passe actuel, le nouveau mot de passe et sa confirmation sont requis.'
                );
            }

            // Vérification de l'ancien mot de passe
            const isMatching = await argon2.verify(
                user.password,
                password
            );

            if (!isMatching) {
                badRequest('Le mot de passe actuel est incorrect.');
            }

            // Vérification que le nouveau mot de passe
            // est différent de l'ancien
            const isSamePassword = await argon2.verify(
                user.password,
                newPassword
            );

            if (isSamePassword) {
                badRequest(
                    'Le nouveau mot de passe doit être différent de l\'ancien.'
                );
            }

            // Vérification de la confirmation
            if (newPassword !== confirmNewPassword) {
                badRequest(
                    'Le nouveau mot de passe et sa confirmation ne correspondent pas.'
                );
            }

            // Le hook beforeUpdate de User.js
            // se chargera de hasher le nouveau mot de passe
            user.password = newPassword;
        }

        await user.save();

        const updatedUserWithoutPassword = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };

        res.status(200).json(updatedUserWithoutPassword);
    },



    // Delete a user
    async deleteUser(req, res) {
        const userId = parseInt(req.params.id);

        // TODO: Réactiver lorsque l'authentification sera mise en place.
        // if (req.user?.id !== userId) {
        //     return res.status(403).json({
        //         message: 'Vous n\'êtes pas autorisé à supprimer cet utilisateur.'
        //     });
        // }

        const user = await User.findByPk(userId);

        if (!user) {
            notFound('Utilisateur non trouvé.');
        }

        await user.destroy();

        res.status(200).json({
            message: 'Utilisateur supprimé avec succès.'
        });
    }

};

export { userController };