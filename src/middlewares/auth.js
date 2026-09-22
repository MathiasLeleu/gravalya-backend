import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/error.js';

function authMiddleware(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        unauthorized('Authentification requise.');
    }

    const [type, token] = authorization.trim().split(/\s+/);

    if (type?.toLowerCase() !== 'bearer' || !token) {
        unauthorized('Token d\'authentification invalide.');
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256']
            }
        );

        req.user = decoded;

        next();
    } catch (error) {
        unauthorized('Token d\'authentification invalide ou expiré.');
    }
}

export { authMiddleware };