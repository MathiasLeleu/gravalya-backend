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
} from "../services/cloudinaryService.js";

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

        if (!image || !banner) {
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
            uploadedImage = await uploadImage(image.buffer, {
                folder: `gravelya/categories/${slug}`,
            });

            uploadedBanner = await uploadImage(banner.buffer, {
                folder: `gravelya/categories/${slug}`,
            });

            const newCategory = await Category.create({
                name,
                slug,
                description,
                imageUrl: uploadedImage.secure_url,
                bannerUrl: uploadedBanner.secure_url,
                imagePublicId: uploadedImage.public_id,
                bannerPublicId: uploadedBanner.public_id,
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

        if (
            name === undefined &&
            slug === undefined &&
            description === undefined &&
            !image &&
            !banner
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

        let uploadedImage;
        let uploadedBanner;

        const previousImagePublicId = category.imagePublicId;
        const previousBannerPublicId = category.bannerPublicId;

        try {
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

            if (uploadedImage) {
                updates.imageUrl = uploadedImage.secure_url;
                updates.imagePublicId = uploadedImage.public_id;
            }

            if (uploadedBanner) {
                updates.bannerUrl = uploadedBanner.secure_url;
                updates.bannerPublicId = uploadedBanner.public_id;
            }

            // Keep existing local URLs unchanged when only the slug
            // changes. This preserves compatibility with legacy files.
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

        // Delete replaced Cloudinary assets only after the database
        // update succeeds. Legacy local files have no public ID.
        const assetsToDelete = [];

        if (
            uploadedImage &&
            previousImagePublicId &&
            previousImagePublicId !== uploadedImage.public_id
        ) {
            assetsToDelete.push(previousImagePublicId);
        }

        if (
            uploadedBanner &&
            previousBannerPublicId &&
            previousBannerPublicId !== uploadedBanner.public_id
        ) {
            assetsToDelete.push(previousBannerPublicId);
        }

        for (const publicId of assetsToDelete) {
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
                    "Erreur lors de la suppression d'une ancienne image Cloudinary :",
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

        // Clean up Cloudinary assets. A failed remote deletion is logged
        // without restoring the deleted database record.
        for (const publicId of [imagePublicId, bannerPublicId].filter(Boolean)) {
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