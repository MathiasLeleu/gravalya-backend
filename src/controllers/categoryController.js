import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { badRequest, notFound, conflict } from '../utils/error.js'
import fs from "fs";
import path from "path";

const categoryController = {

    // Get all categories 
    async showAllCategories(req, res) {
        const categories = await Category.findAll({
            include: [
                {
                    association: 'products',
                    attributes: ['id']
                }
            ]
        });

        res.status(200).json(categories)
    },

    // Get one category
    async showOneCategory(req, res) {
        const categoryId = parseInt(req.params.id);
        const category = await Category.findByPk(categoryId, {
        include: [
            {
                association: 'products'
            }
        ]
        });

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        res.status(200).json(category)
    },

    // Create a new category
    async createCategory(req, res) {
        const { name, slug, description } = req.body;

        const image = req.files?.image?.[0];
        const banner = req.files?.banner?.[0];

        if (!image || !banner) {

            if (image?.path) {
                fs.unlinkSync(image.path);
            }

            if (banner?.path) {
                fs.unlinkSync(banner.path);
            }

            badRequest(
                "L'image et la bannière de la catégorie sont requises."
            );
        }

        const existingName = await Category.findOne({
            where: { name }
        });

        if (existingName) {

            if (image.path) {
                fs.unlinkSync(image.path);
            }

            if (banner.path) {
                fs.unlinkSync(banner.path);
            }

            conflict('Ce nom de catégorie est déjà utilisé.');
        }

        const existingSlug = await Category.findOne({
            where: { slug }
        });

        if (existingSlug) {

            if (image.path) {
                fs.unlinkSync(image.path);
            }

            if (banner.path) {
                fs.unlinkSync(banner.path);
            }

            conflict('Ce slug de catégorie est déjà utilisé.');
        }

        const imageUrl =
            `/uploads/categories/${slug}/${image.filename}`;

        const bannerUrl =
            `/uploads/categories/${slug}/${banner.filename}`;

        try {

            const newCategory = await Category.create({
                name,
                slug,
                description,
                imageUrl,
                bannerUrl
            });

            res.status(201).json(newCategory);

        } catch (error) {

            if (image.path) {
                fs.unlinkSync(image.path);
            }

            if (banner.path) {
                fs.unlinkSync(banner.path);
            }

            throw error;
        }
    },

    // Update an existing category
    async updateCategory(req, res) {
        const categoryId = parseInt(req.params.id);

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

        // Vérification du nom
        if (name && name !== category.name) {
            const existingName = await Category.findOne({
                where: { name }
            });

            if (existingName && existingName.id !== categoryId) {
                if (image?.path) {
                    fs.unlinkSync(image.path);
                }

                if (banner?.path) {
                    fs.unlinkSync(banner.path);
                }

                conflict("Ce nom de catégorie est déjà utilisé.");
            }
        }

        // Vérification du slug
        if (slug && slug !== category.slug) {
            const existingSlug = await Category.findOne({
                where: { slug }
            });

            if (existingSlug && existingSlug.id !== categoryId) {
                if (image?.path) {
                    fs.unlinkSync(image.path);
                }

                if (banner?.path) {
                    fs.unlinkSync(banner.path);
                }

                conflict("Ce slug de catégorie est déjà utilisé.");
            }
        }

        const oldSlug = category.slug;
        const newSlug = slug || oldSlug;

        const oldCategoryPath = path.join(
            process.cwd(),
            "uploads",
            "categories",
            oldSlug
        );

        const newCategoryPath = path.join(
            process.cwd(),
            "uploads",
            "categories",
            newSlug
        );

        const temporaryPath = path.join(
            process.cwd(),
            "uploads",
            "categories",
            ".tmp",
            String(categoryId)
        );

        try {

            /*
            * Si le slug change, on déplace le dossier
            * de l'ancienne catégorie vers le nouveau.
            */
            if (oldSlug !== newSlug) {

                fs.mkdirSync(newCategoryPath, {
                    recursive: true
                });

                if (fs.existsSync(oldCategoryPath)) {

                    const existingFiles = fs.readdirSync(oldCategoryPath);

                    for (const fileName of existingFiles) {

                        const oldFilePath = path.join(
                            oldCategoryPath,
                            fileName
                        );

                        const newFilePath = path.join(
                            newCategoryPath,
                            fileName
                        );

                        fs.renameSync(
                            oldFilePath,
                            newFilePath
                        );
                    }

                    fs.rmSync(oldCategoryPath, {
                        recursive: true,
                        force: true
                    });
                }
            } else {

                fs.mkdirSync(newCategoryPath, {
                    recursive: true
                });
            }

            /*
            * Remplacement de l'image
            */
            let imageUrl = category.imageUrl;

            if (image) {

                const oldImagePath = category.imageUrl
                    ? path.join(
                        process.cwd(),
                        category.imageUrl
                    )
                    : null;

                if (
                    oldImagePath &&
                    fs.existsSync(oldImagePath)
                ) {
                    fs.unlinkSync(oldImagePath);
                }

                const newImagePath = path.join(
                    newCategoryPath,
                    image.filename
                );

                fs.renameSync(
                    image.path,
                    newImagePath
                );

                imageUrl =
                    `/uploads/categories/${newSlug}/${image.filename}`;
            } else if (oldSlug !== newSlug) {

                imageUrl =
                    category.imageUrl.replace(
                        `/categories/${oldSlug}/`,
                        `/categories/${newSlug}/`
                    );
            }

            /*
            * Remplacement de la bannière
            */
            let bannerUrl = category.bannerUrl;

            if (banner) {

                const oldBannerPath = category.bannerUrl
                    ? path.join(
                        process.cwd(),
                        category.bannerUrl
                    )
                    : null;

                if (
                    oldBannerPath &&
                    fs.existsSync(oldBannerPath)
                ) {
                    fs.unlinkSync(oldBannerPath);
                }

                const newBannerPath = path.join(
                    newCategoryPath,
                    banner.filename
                );

                fs.renameSync(
                    banner.path,
                    newBannerPath
                );

                bannerUrl =
                    `/uploads/categories/${newSlug}/${banner.filename}`;
            } else if (oldSlug !== newSlug) {

                bannerUrl =
                    category.bannerUrl.replace(
                        `/categories/${oldSlug}/`,
                        `/categories/${newSlug}/`
                    );
            }

            await category.update({
                name: name ?? category.name,
                slug: newSlug,
                description: description ?? category.description,
                imageUrl,
                bannerUrl
            });

            /*
            * Suppression du dossier temporaire
            */
            if (fs.existsSync(temporaryPath)) {
                fs.rmSync(temporaryPath, {
                    recursive: true,
                    force: true
                });
            }

            res.status(200).json(category);

        } catch (error) {

            /*
            * Nettoyage des fichiers temporaires
            */
            if (fs.existsSync(temporaryPath)) {
                fs.rmSync(temporaryPath, {
                    recursive: true,
                    force: true
                });
            }

            throw error;
        }
    },

    // Delete a category
    async deleteCategory(req, res) {
        const categoryId = parseInt(req.params.id);

        const category = await Category.findByPk(categoryId);

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        const product = await Product.findOne({
            where: {
                categoryId
            }
        });

        if (product) {
            conflict(
                "Impossible de supprimer cette catégorie car elle est utilisée par un ou plusieurs produits."
            );
        }

        const categoryPath = path.join(
            process.cwd(),
            "uploads",
            "categories",
            category.slug
        );

        try {
            if (fs.existsSync(categoryPath)) {
                fs.rmSync(categoryPath, {
                    recursive: true,
                    force: true
                });
            }

            await category.destroy();

            res.status(200).json({
                message: "Catégorie supprimée avec succès."
            });

        } catch (error) {
            throw error;
        }
    }

}

export { categoryController }