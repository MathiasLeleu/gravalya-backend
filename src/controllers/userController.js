import { User } from '../models/User.js';

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
        res.status(200).json(user);
    },

    // Create a new user

    // Update an existing user

    // Delete a user
};

export { userController };

