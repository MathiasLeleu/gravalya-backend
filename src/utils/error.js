// Classe d'erreur de base
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;

        Error.captureStackTrace(this, this.constructor);
    }
}

// 400 - Données invalides
class ValidationError extends AppError {
    constructor(message = 'Données invalides', details = []) {
        super(message, 400);
        this.details = details;
    }
}

// 404 - Ressource introuvable
class NotFoundError extends AppError {
    constructor(message = 'Ressource non trouvée') {
        super(message, 404);
    }
}

// 409 - Conflit
class ConflictError extends AppError {
    constructor(message = 'Conflit') {
        super(message, 409);
    }
}

// Fonctions utilitaires
function badRequest(message, details = []) {
    throw new ValidationError(message, details);
}

function notFound(message) {
    throw new NotFoundError(message);
}

function conflict(message) {
    throw new ConflictError(message);
}

export {
    AppError,
    ValidationError,
    NotFoundError,
    ConflictError,
    badRequest,
    notFound,
    conflict
};