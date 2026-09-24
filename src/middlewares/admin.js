import { forbidden } from '../utils/error.js';

function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        forbidden("Accès réservé aux administrateurs.");
    }

    next();
}

export { adminMiddleware };