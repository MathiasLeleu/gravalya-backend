import { Picture } from "../models/Picture.js";
import { Product } from "../models/Product.js";
import { badRequest, notFound } from "../utils/error.js";
import {
    uploadImage,
    deleteImage,
    getImageByPublicId,
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
            badRequest("L'URL et le texte alternatif sont requis.");
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

    // Attach an existing Cloudinary library image to a product
    async attachCloudinaryPicture(req, res) {
        const productId = parseInt(req.params.id, 10);
        const { cloudinaryPublicId, alt, isMain } = req.body;

        if (!cloudinaryPublicId || !alt?.trim()) {
            badRequest(
                "L'identifiant Cloudinary et le texte alternatif sont requis."
            );
        }

        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        let cloudinaryImage;

        try {
            cloudinaryImage = await getImageByPublicId(cloudinaryPublicId);
        } catch (error) {
            if (
                error.http_code === 404 ||
                error.error?.http_code === 404
            ) {
                notFound("Image Cloudinary introuvable.");
            }

            throw error;
        }

        const assetFolder = cloudinaryImage.asset_folder || "";
        const isAllowedFolder =
            assetFolder === "produits" ||
            assetFolder.startsWith("produits/");

        if (!isAllowedFolder) {
            badRequest(
                "Cette image ne provient pas de la bibliothèque des produits."
            );
        }

        const existingPicture = await Picture.findOne({
            where: {
                productId,
                cloudinaryPublicId: cloudinaryImage.public_id,
            },
        });

        if (existingPicture) {
            badRequest("Cette image est déjà associée à ce produit.");
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
                        url: cloudinaryImage.secure_url,
                        cloudinaryPublicId: cloudinaryImage.public_id,
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

            if (url !== undefined && url !== picture.url) {
                updates.cloudinaryPublicId = null;
            }

            await picture.update(updates, { transaction });
        });

        res.status(200).json(picture);
    },

    // Delete a picture association
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

        // Never delete the Cloudinary asset here.
        // A library image may be shared by several products.
        await picture.destroy();

        res.status(200).json({
            message: "Image supprimée du produit avec succès.",
        });
    },
};

export { pictureController };