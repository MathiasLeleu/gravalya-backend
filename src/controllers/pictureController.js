
import { Picture } from "../models/Picture.js";
import { Product } from "../models/Product.js";
import { badRequest, notFound } from "../utils/error.js";
import {
    uploadImage,
    deleteImage,
} from "../services/cloudinaryService.js";

const pictureController = {
    // Get all main pictures
    async showMainPictures(req, res) {
        const pictures = await Picture.findAll({
            where: {
                isMain: true,
            },
        });

        res.status(200).json(pictures);
    },

    // Get all pictures of a product
    async showProductPictures(req, res) {
        const productId = parseInt(req.params.id, 10);

        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        const pictures = await Picture.findAll({
            where: {
                productId,
            },
        });

        res.status(200).json(pictures);
    },

    // Add a picture using an existing URL
    async createPicture(req, res) {
        const productId = parseInt(req.params.id, 10);
        const { url, alt, isMain } = req.body;

        if (!url || !alt?.trim()) {
            badRequest(
                "L'URL et le texte alternatif sont requis."
            );
        }

        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        const shouldBeMain =
            isMain === true || isMain === "true";

        const newPicture = await Picture.sequelize.transaction(
            async (transaction) => {
                if (shouldBeMain) {
                    await Picture.update(
                        { isMain: false },
                        {
                            where: {
                                productId,
                                isMain: true,
                            },
                            transaction,
                        }
                    );
                }

                return Picture.create(
                    {
                        url,
                        alt: alt.trim(),
                        isMain: shouldBeMain,
                        productId,
                    },
                    { transaction }
                );
            }
        );

        res.status(201).json(newPicture);
    },

    // Upload a picture to Cloudinary
    async uploadPicture(req, res) {
        const productId = parseInt(req.params.id, 10);

        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        if (!req.file) {
            badRequest("Une image est requise.");
        }

        const { alt, isMain } = req.body;

        if (!alt?.trim()) {
            badRequest("Le texte alternatif est requis.");
        }

        const shouldBeMain =
            isMain === true || isMain === "true";

        let uploadedImage;

        try {
            uploadedImage = await uploadImage(req.file.buffer, {
                folder: `gravelya/products/${productId}`,
            });

            const newPicture = await Picture.sequelize.transaction(
                async (transaction) => {
                    if (shouldBeMain) {
                        await Picture.update(
                            { isMain: false },
                            {
                                where: {
                                    productId,
                                    isMain: true,
                                },
                                transaction,
                            }
                        );
                    }

                    return Picture.create(
                        {
                            url: uploadedImage.secure_url,
                            cloudinaryPublicId: uploadedImage.public_id,
                            alt: alt.trim(),
                            isMain: shouldBeMain,
                            productId,
                        },
                        { transaction }
                    );
                }
            );

            return res.status(201).json(newPicture);
        } catch (error) {
            if (uploadedImage?.public_id) {
                try {
                    await deleteImage(uploadedImage.public_id);
                } catch (cleanupError) {
                    console.error(
                        "Impossible de supprimer l'image Cloudinary après un échec :",
                        cleanupError.message
                    );
                }
            }

            throw error;
        }
    },

    // Update a picture's metadata or URL
    async updatePicture(req, res) {
        const productId = parseInt(req.params.id, 10);
        const pictureId = parseInt(req.params.pictureId, 10);

        const picture = await Picture.findOne({
            where: {
                id: pictureId,
                productId,
            },
        });

        if (!picture) {
            notFound("Image non trouvée.");
        }

        const { url, alt, isMain } = req.body;
        const shouldBeMain =
            isMain === true || isMain === "true";

        await Picture.sequelize.transaction(async (transaction) => {
            if (shouldBeMain) {
                await Picture.update(
                    { isMain: false },
                    {
                        where: {
                            productId,
                            isMain: true,
                        },
                        transaction,
                    }
                );
            }

            const updates = {
                url: url ?? picture.url,
                alt: alt ?? picture.alt,
                isMain: isMain === undefined
                    ? picture.isMain
                    : shouldBeMain,
            };

            // A manually changed URL no longer identifies the
            // previously stored Cloudinary asset.
            if (url !== undefined && url !== picture.url) {
                updates.cloudinaryPublicId = null;
            }

            await picture.update(updates, { transaction });
        });

        res.status(200).json(picture);
    },

    // Delete a picture
    async deletePicture(req, res) {
        const productId = parseInt(req.params.id, 10);
        const pictureId = parseInt(req.params.pictureId, 10);

        const picture = await Picture.findOne({
            where: {
                id: pictureId,
                productId,
            },
        });

        if (!picture) {
            notFound("Image non trouvée.");
        }

        const publicId = picture.cloudinaryPublicId;

        // Remove the database record first. Legacy local pictures
        // have no Cloudinary public ID and are left untouched.
        await picture.destroy();

        if (publicId) {
            try {
                const result = await deleteImage(publicId);

                if (result?.result !== "ok" && result?.result !== "not found") {
                    console.error(
                        "Cloudinary n'a pas confirmé la suppression de l'image :",
                        publicId,
                        result?.result
                    );
                }
            } catch (error) {
                // Keep the API deletion successful, but log the remote
                // cleanup failure so it can be investigated.
                console.error(
                    "Erreur lors de la suppression de l'image Cloudinary :",
                    error.message
                );
            }
        }

        res.status(200).json({
            message: "Image supprimée avec succès.",
        });
    },
};

export { pictureController };