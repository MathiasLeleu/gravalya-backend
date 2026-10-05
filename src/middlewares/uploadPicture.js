import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const productId = parseInt(req.params.id);

        const uploadPath = path.join(
            process.cwd(),
            "uploads",
            "products",
            String(productId)
        );

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
            return cb(new Error("Format d'image non autorisé."));
        }

        cb(
            null,
            `${crypto.randomUUID()}${extension}`
        );
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

const uploadPicture = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

export { uploadPicture };