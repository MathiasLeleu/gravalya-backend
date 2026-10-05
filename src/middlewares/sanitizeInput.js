import sanitizeHtml from 'sanitize-html';

const MAX_DEPTH = 20;

const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
};

function sanitizeValue(value, depth = 0) {
    if (depth > MAX_DEPTH) {
        const error = new Error(
            "Données trop profondément imbriquées."
        );

        error.status = 400;

        throw error;
    }

    if (typeof value === 'string') {
        return sanitizeHtml(value, sanitizeOptions);
    }

    if (Array.isArray(value)) {
        return value.map((item) =>
            sanitizeValue(item, depth + 1)
        );
    }

    if (value !== null && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            value[key] = sanitizeValue(
                value[key],
                depth + 1
            );
        }
    }

    return value;
}

function sanitizeInput(req, res, next) {
    try {
        if (req.body) {
            req.body = sanitizeValue(req.body);
        }

        if (req.query) {
            req.query = sanitizeValue(req.query);
        }

        next();
    } catch (error) {
        next(error);
    }
}

export { sanitizeInput };