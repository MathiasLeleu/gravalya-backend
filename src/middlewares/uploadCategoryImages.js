import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        let uploadPath;

        if (req.method === "POST") {

            const slug = req.body.slug;

            if (!slug) {
                return cb(
                    new Error("Le slug de la catégorie est requis.")
                );
            }

            uploadPath = path.join(
                process.cwd(),
                "uploads",
                "categories",
                slug
            );

        } else if (req.method === "PATCH") {

            const categoryId = parseInt(req.params.id);

            if (!categoryId) {
                return cb(
                    new Error("L'identifiant de la catégorie est requis.")
                );
            }

            uploadPath = path.join(
                process.cwd(),
                "uploads",
                "categories",
                ".tmp",
                String(categoryId)
            );

        } else {

            return cb(
                new Error("Méthode HTTP non autorisée.")
            );
        }

        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {

        const extensions = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        };

        const extension = extensions[file.mimetype];

        if (!extension) {
            return cb(
                new Error("Format d'image non autorisé.")
            );
        }

        const fileName =
            file.fieldname === "banner"
                ? `banner${extension}`
                : `image${extension}`;

        cb(null, fileName);
    },
});

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(
            new Error(
                "Format d'image non autorisé. Formats acceptés : JPG, PNG et WebP."
            )
        );
    }

    cb(null, true);
};

const uploadCategoryImages = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 2,
    },
});

export { uploadCategoryImages };