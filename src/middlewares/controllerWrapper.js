import { AppError, ValidationError } from "../utils/error.js";

// Wrapper pour les controllers async
function cw(controller) {
    return async (req, res, next) => {
        try {
            await controller(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

// Middleware de gestion d'erreurs
function errorHandler(err, req, res, next) {
    console.error("💥 Erreur non gérée :", err);

    // Si c'est une de nos erreurs personnalisées
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,

            // Si l'erreur vient du schéma, on ajoute les détails
            ...(err instanceof ValidationError && {
                details: err.details
            })
        });
    }

    // Pour les erreurs non gérées
    res.status(500).json({
        error: "Une erreur inattendue est survenue, merci de réessayer plus tard."
    });
}

// Middleware pour les routes non trouvées
function notFoundHandler(req, res) {
    res.status(404).json({
        error: "Route non trouvée"
    });
}

export {
    cw,
    errorHandler,
    notFoundHandler
};