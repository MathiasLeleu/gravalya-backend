import { Picture } from '../models/Picture.js';
import { Product } from '../models/Product.js';
import { badRequest, notFound } from '../utils/error.js';

import fs from "fs";

const pictureController = {

    // Get all main pictures
    async showMainPictures(req, res) {
        const pictures = await Picture.findAll({
            where: {
                isMain: true
            }
        });

        res.status(200).json(pictures);
    },

    // Get all pictures of a product
    async showProductPictures(req, res) {
        const productId = parseInt(req.params.id);

        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        const pictures = await Picture.findAll({
            where: {
                productId
            }
        });

        res.status(200).json(pictures);
    },

    // Add a picture to a product
    async createPicture(req, res) {
        const productId = parseInt(req.params.id);
        const { url, alt, isMain } = req.body;

        if (!url || !alt) {
            badRequest("L'URL et le texte alternatif sont requis.");
        }

        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        if (isMain) {
            await Picture.update(
                { isMain: false },
                {
                    where: {
                        productId,
                        isMain: true
                    }
                }
            );
        }

        const newPicture = await Picture.create({
            url,
            alt,
            isMain: isMain ?? false,
            productId
        });

        res.status(201).json(newPicture);
    },

    // Upload a picture to a product
    async uploadPicture(req, res) {
        const productId = parseInt(req.params.id);

        const product = await Product.findByPk(productId);

        if (!product) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }

            notFound("Produit non trouvé.");
        }

        if (!req.file) {
            badRequest("Une image est requise.");
        }

        const { alt, isMain } = req.body;

        if (!alt?.trim()) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }

            badRequest("Le texte alternatif est requis.");
        }

        const shouldBeMain =
            isMain === true ||
            isMain === "true";

        if (shouldBeMain) {
            await Picture.update(
                { isMain: false },
                {
                    where: {
                        productId,
                        isMain: true,
                    },
                }
            );
        }

        const pictureUrl =
            `/uploads/products/${productId}/${req.file.filename}`;

        try {
            const newPicture = await Picture.create({
                url: pictureUrl,
                alt: alt.trim(),
                isMain: shouldBeMain,
                productId,
            });

            res.status(201).json(newPicture);

        } catch (error) {
            if (req.file?.path) {
                fs.unlinkSync(req.file.path);
            }

            throw error;
        }
    },

    // Update a picture
    async updatePicture(req, res) {
        const productId = parseInt(req.params.id);
        const pictureId = parseInt(req.params.pictureId);

        const picture = await Picture.findOne({
            where: {
                id: pictureId,
                productId
            }
        });

        if (!picture) {
            notFound("Image non trouvée.");
        }

        const { url, alt, isMain } = req.body;

        if (isMain === true) {
            await Picture.update(
                { isMain: false },
                {
                    where: {
                        productId,
                        isMain: true
                    }
                }
            );
        }

        await picture.update({
            url: url ?? picture.url,
            alt: alt ?? picture.alt,
            isMain: isMain ?? picture.isMain
        });

        res.status(200).json(picture);
    },

    // Delete a picture
    async deletePicture(req, res) {
        const productId = parseInt(req.params.id);
        const pictureId = parseInt(req.params.pictureId);

        const picture = await Picture.findOne({
            where: {
                id: pictureId,
                productId
            }
        });

        if (!picture) {
            notFound("Image non trouvée.");
        }

        await picture.destroy();

        res.status(200).json({
            message: "Image supprimée avec succès."
        });
    }

};

export { pictureController };