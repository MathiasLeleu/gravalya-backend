import { ValidationError } from '../utils/error.js';

// * fonction de validation des schémas
function validate(schema) {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, { 
        // * Continue la validation (même en cas d'erreurs) et retourne toutes les erreurs détéctées
        abortEarly: false,
        // * Supprime les champs non définis dans le schéma
        stripUnknown: true
      });
      
      // * Si une erreur de schéma est rencontré on map sur le tableau de détails
      if (error) {
        const details = error.details.map(err => ({
          message: err.message,
          path: err.path.join('.')
        }));
        
        throw new ValidationError('Données invalides', details);
      }
      
      // * Remplacer le body par les données validées
      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export { validate }