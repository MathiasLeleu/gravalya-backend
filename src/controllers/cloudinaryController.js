import { listImages } from "../services/cloudinaryService.js";
import { badRequest } from "../utils/error.js";

const ALLOWED_FOLDERS = [
    "produits",
    "categories",
];

const cloudinaryController = {
    async showImages(req, res) {
        const folder = req.query.folder;
        const nextCursor = req.query.nextCursor;
        const search = req.query.search?.trim() || "";

        if (!ALLOWED_FOLDERS.includes(folder)) {
            badRequest("Dossier Cloudinary non autorisé.");
        }

        if (
            search.length > 100 ||
            (search && !/^[\p{L}\p{N}_.-]+$/u.test(search))
        ) {
            badRequest("Le terme de recherche est invalide.");
        }

        const result = await listImages({
            folder,
            search,
            nextCursor,
            maxResults: 30,
        });

        const images = result.resources.map((resource) => ({
            publicId: resource.public_id,
            url: resource.secure_url,
            format: resource.format,
            width: resource.width,
            height: resource.height,
            bytes: resource.bytes,
            createdAt: resource.created_at,
            folder,
        }));

        res.status(200).json({
            images,
            nextCursor: result.next_cursor ?? null,
        });
    },
};

export { cloudinaryController };