import { User } from '../models/User.js';
import argon2 from 'argon2';
import { notFound } from '../utils/error.js';

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
                { association: 'orders', 
                    include: ['orderLines']},
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
            return res.status(400).json({ message: 'Les champs Prénom, Nom, Email, Mot de passe et Confirmation du mot de passe sont requis.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Le mot de passe et sa confirmation ne correspondent pas.' });
        }

        const existingEmail = await User.findOne({ where: {email: email} });
        if (existingEmail) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
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
            role: newUser.role };
        res.status(201).json(newUserWithoutPassword);

    },
    
    // Update an existing user
    async updateUser(req, res) {
        const userId = parseInt(req.params.id);
        const user = await User.findByPk(userId);

        if (!user) {
            notFound("Utilisateur non trouvé.");
        }

        const { firstName, lastName, email, password, newPassword, confirmPassword } = req.body;

        if (firstName) { user.firstName = firstName; }
        if (lastName) { user.lastName = lastName; }
        if (email) {
            const existingEmail = await User.findOne({
                where: { email }
            });

            if (existingEmail && existingEmail.id !== user.id) {
                return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
            }
            user.email = email;
         }
        if (password) {

            const hashedPassword = user.password;

            const isMatching = await argon2.verify(hashedPassword, password);

            if (!isMatching) {
                return res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: 'Le mot de passe et sa confirmation ne correspondent pas.' });
            }
            user.password = newPassword
        };

        await user.save();
        const updatedUserWithoutPassword = { 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email, 
            role: user.role };
        res.status(200).json(updatedUserWithoutPassword);

    },
    // Delete a user
};

export { userController };

