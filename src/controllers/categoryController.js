import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import {
    badRequest,
    notFound,
    conflict,
} from "../utils/error.js";
import {
    uploadImage,
    deleteImage,
    getImageByPublicId,
} from "../services/cloudinaryService.js";
import { Op } from "sequelize";

const getCategoryCloudinaryImage = async (publicId) => {
    if (!publicId) {
        return null;
    }

    let image;

    try {
        image = await getImageByPublicId(publicId);
    } catch (error) {
        if (error.http_code === 404) {
            badRequest("L'image sélectionnée est introuvable sur Cloudinary.");
        }

        throw error;
    }

    const folder = image.asset_folder;

    if (
        folder !== "categories" &&
        !folder?.startsWith("categories/")
    ) {
        badRequest("L'image sélectionnée n'appartient pas à la bibliothèque des catégories.");
    }

    return image;
};

const categoryController = {
    // Get all categories
    async showAllCategories(req, res) {
        const categories = await Category.findAll({
            include: [
                {
                    association: "products",
                    attributes: ["id"],
                },
            ],
        });

        res.status(200).json(categories);
    },

    // Get one category
    async showOneCategory(req, res) {
        const categoryId = parseInt(req.params.id, 10);

        const category = await Category.findByPk(categoryId, {
            include: [
                {
                    association: "products",
                },
            ],
        });

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        res.status(200).json(category);
    },

    // Create a new category
    async createCategory(req, res) {
        const { name, slug, description } = req.body;

        const image = req.files?.image?.[0];
        const banner = req.files?.banner?.[0];

        const imageCloudinaryPublicId = req.body.imageCloudinaryPublicId;
        const bannerCloudinaryPublicId = req.body.bannerCloudinaryPublicId;

        if ((!image && !imageCloudinaryPublicId) ||
            (!banner && !bannerCloudinaryPublicId)) {
            badRequest(
                "L'image et la bannière de la catégorie sont requises."
            );
        }

        const existingName = await Category.findOne({
            where: { name },
        });

        if (existingName) {
            conflict("Ce nom de catégorie est déjà utilisé.");
        }

        const existingSlug = await Category.findOne({
            where: { slug },
        });

        if (existingSlug) {
            conflict("Ce slug de catégorie est déjà utilisé.");
        }

        let uploadedImage;
        let uploadedBanner;

        try {
            const selectedImage = imageCloudinaryPublicId
                ? await getCategoryCloudinaryImage(imageCloudinaryPublicId)
                : null;

            const selectedBanner = bannerCloudinaryPublicId
                ? await getCategoryCloudinaryImage(bannerCloudinaryPublicId)
                : null;

            if (image && selectedImage) {
                badRequest("Choisissez une seule source pour l'image principale.");
            }

            if (banner && selectedBanner) {
                badRequest("Choisissez une seule source pour la bannière.");
            }

            if (image) {
                uploadedImage = await uploadImage(image.buffer, {
                    folder: `gravelya/categories/${slug}`,
                });
            }

            if (banner) {
                uploadedBanner = await uploadImage(banner.buffer, {
                    folder: `gravelya/categories/${slug}`,
                });
            }

            const newCategory = await Category.create({
                name,
                slug,
                description,
                imageUrl: selectedImage?.secure_url ?? uploadedImage?.secure_url,
                bannerUrl: selectedBanner?.secure_url ?? uploadedBanner?.secure_url,
                imagePublicId: selectedImage?.public_id ?? uploadedImage?.public_id,
                bannerPublicId: selectedBanner?.public_id ?? uploadedBanner?.public_id,
            });

            return res.status(201).json(newCategory);

        } catch (error) {
            const uploadedAssets = [
                uploadedImage?.public_id,
                uploadedBanner?.public_id,
            ].filter(Boolean);

            for (const publicId of uploadedAssets) {
                try {
                    await deleteImage(publicId);
                } catch (cleanupError) {
                    console.error(
                        "Impossible de nettoyer une image Cloudinary après l'échec de création :",
                        cleanupError.message
                    );
                }
            }

            throw error;
        }
    },

    // Update an existing category
    async updateCategory(req, res) {
        const categoryId = parseInt(req.params.id, 10);

        const category = await Category.findByPk(categoryId);

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        const { name, slug, description } = req.body;

        const image = req.files?.image?.[0];
        const banner = req.files?.banner?.[0];

        const imageCloudinaryPublicId = req.body.imageCloudinaryPublicId;
        const bannerCloudinaryPublicId = req.body.bannerCloudinaryPublicId;

        if (
            name === undefined &&
            slug === undefined &&
            description === undefined &&
            !image &&
            !banner &&
            !imageCloudinaryPublicId &&
            !bannerCloudinaryPublicId
        ) {
            badRequest(
                "Au moins un champ doit être fourni pour la mise à jour."
            );
        }

        if (name && name !== category.name) {
            const existingName = await Category.findOne({
                where: { name },
            });

            if (existingName && existingName.id !== categoryId) {
                conflict("Ce nom de catégorie est déjà utilisé.");
            }
        }

        if (slug && slug !== category.slug) {
            const existingSlug = await Category.findOne({
                where: { slug },
            });

            if (existingSlug && existingSlug.id !== categoryId) {
                conflict("Ce slug de catégorie est déjà utilisé.");
            }
        }

        if (image && imageCloudinaryPublicId) {
            badRequest("Choisissez une seule source pour l'image principale.");
        }

        if (banner && bannerCloudinaryPublicId) {
            badRequest("Choisissez une seule source pour la bannière.");
        }

        let uploadedImage;
        let uploadedBanner;

        const previousImagePublicId = category.imagePublicId;
        const previousBannerPublicId = category.bannerPublicId;

        let selectedImage;
        let selectedBanner;

        try {
            if (imageCloudinaryPublicId) {
                selectedImage = await getCategoryCloudinaryImage(
                    imageCloudinaryPublicId
                );
            }

            if (bannerCloudinaryPublicId) {
                selectedBanner = await getCategoryCloudinaryImage(
                    bannerCloudinaryPublicId
                );
            }

            const newSlug = slug ?? category.slug;

            if (image) {
                uploadedImage = await uploadImage(image.buffer, {
                    folder: `gravelya/categories/${newSlug}`,
                });
            }

            if (banner) {
                uploadedBanner = await uploadImage(banner.buffer, {
                    folder: `gravelya/categories/${newSlug}`,
                });
            }

            const updates = {
                name: name ?? category.name,
                slug: newSlug,
                description: description ?? category.description,
            };

            if (selectedImage) {
                updates.imageUrl = selectedImage.secure_url;
                updates.imagePublicId = selectedImage.public_id;
            } else if (uploadedImage) {
                updates.imageUrl = uploadedImage.secure_url;
                updates.imagePublicId = uploadedImage.public_id;
            }

            if (selectedBanner) {
                updates.bannerUrl = selectedBanner.secure_url;
                updates.bannerPublicId = selectedBanner.public_id;
            } else if (uploadedBanner) {
                updates.bannerUrl = uploadedBanner.secure_url;
                updates.bannerPublicId = uploadedBanner.public_id;
            }

            await category.update(updates);

        } catch (error) {
            const uploadedAssets = [
                uploadedImage?.public_id,
                uploadedBanner?.public_id,
            ].filter(Boolean);

            for (const publicId of uploadedAssets) {
                try {
                    await deleteImage(publicId);
                } catch (cleanupError) {
                    console.error(
                        "Impossible de nettoyer une image Cloudinary après l'échec de mise à jour :",
                        cleanupError.message
                    );
                }
            }

            throw error;
        }

        // Delete previous Cloudinary images only if they are no longer used.
        const assetsToDelete = [
            ...new Set([
                uploadedImage &&
                previousImagePublicId !== uploadedImage.public_id
                    ? previousImagePublicId
                    : null,
                uploadedBanner &&
                previousBannerPublicId !== uploadedBanner.public_id
                    ? previousBannerPublicId
                    : null,
            ].filter(Boolean)),
        ];

        for (const publicId of assetsToDelete) {
            const imageStillInUse = await Category.findOne({
                where: {
                    [Op.or]: [
                        { imagePublicId: publicId },
                        { bannerPublicId: publicId },
                    ],
                },
            });

            if (imageStillInUse) {
                continue;
            }

            try {
                const result = await deleteImage(publicId);

                if (
                    result?.result !== "ok" &&
                    result?.result !== "not found"
                ) {
                    console.error(
                        "Cloudinary did not confirm image deletion:",
                        publicId,
                        result?.result
                    );
                }
            } catch (error) {
                console.error(
                    "Error while deleting an old Cloudinary image:",
                    error.message
                );
            }
        }

        res.status(200).json(category);
    },

    // Delete a category
    async deleteCategory(req, res) {
        const categoryId = parseInt(req.params.id, 10);

        const category = await Category.findByPk(categoryId);

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        const product = await Product.findOne({
            where: {
                categoryId,
            },
        });

        if (product) {
            conflict(
                "Impossible de supprimer cette catégorie car elle est utilisée par un ou plusieurs produits."
            );
        }

        const imagePublicId = category.imagePublicId;
        const bannerPublicId = category.bannerPublicId;

        // Remove the category record first.
        await category.destroy();

        // Delete Cloudinary images only if they are
        // not used by any other category.
        const assetsToCheck = [
            ...new Set([imagePublicId, bannerPublicId].filter(Boolean)),
        ];

        for (const publicId of assetsToCheck) {
            const usedByAnotherCategory = await Category.findOne({
                where: {
                    id: {
                        [Op.ne]: categoryId,
                    },
                    [Op.or]: [
                        { imagePublicId: publicId },
                        { bannerPublicId: publicId },
                    ],
                },
            });

            if (usedByAnotherCategory) {
                continue;
            }

            try {
                const result = await deleteImage(publicId);

                if (
                    result?.result !== "ok" &&
                    result?.result !== "not found"
                ) {
                    console.error(
                        "Cloudinary n'a pas confirmé la suppression de l'image :",
                        publicId,
                        result?.result
                    );
                }
            } catch (error) {
                console.error(
                    "Erreur lors de la suppression d'une image Cloudinary :",
                    error.message
                );
            }
        }

        // Legacy local files are not automatically deleted or migrated.
        // They can be cleaned up separately after a safe migration.

        res.status(200).json({
            message: "Catégorie supprimée avec succès.",
        });
    },
};

export { categoryController };