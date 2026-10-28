import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
} = process.env;

if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
) {
    throw new Error(
        "La configuration Cloudinary est incomplète. Vérifiez les variables d'environnement."
    );
}

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Envoie une image en mémoire vers Cloudinary.
 * Retourne notamment son URL sécurisée et son identifiant public.
 */
const uploadImage = (buffer, options = {}) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error("Le fichier image est vide ou invalide.");
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                ...options,
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                if (!result?.secure_url || !result?.public_id) {
                    return reject(
                        new Error("Cloudinary n'a pas retourné les informations de l'image.")
                    );
                }

                resolve(result);
            }
        );

        Readable.from([buffer]).pipe(uploadStream);
    });
};

/**
 * Supprime une image Cloudinary à partir de son public_id.
 * Ne fait rien si aucun identifiant n'est fourni.
 */
const deleteImage = async (publicId) => {
    if (!publicId) {
        return null;
    }

    return cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
    });
};

export { cloudinary, uploadImage, deleteImage };