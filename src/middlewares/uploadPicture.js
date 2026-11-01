import multer from "multer";

const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const fileFilter = (req, file, cb) => {
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
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

export { uploadPicture };