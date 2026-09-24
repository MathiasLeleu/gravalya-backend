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

// 401 - Authentification requise
class UnauthorizedError extends AppError {
    constructor(message = 'Authentification requise') {
        super(message, 401);
    }
}

// 403 - Accès interdit
class ForbiddenError extends AppError {
    constructor(message = 'Accès interdit') {
        super(message, 403);
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

function unauthorized(message) {
    throw new UnauthorizedError(message);
}

function notFound(message) {
    throw new NotFoundError(message);
}

function forbidden(message) {
    throw new ForbiddenError(message);
}

function conflict(message) {
    throw new ConflictError(message);
}

export {
    AppError,
    ValidationError,
    UnauthorizedError,
    NotFoundError,
    ConflictError,
    badRequest,
    unauthorized,
    notFound,
    forbidden,
    conflict
};