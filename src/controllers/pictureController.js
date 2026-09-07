import { Picture } from '../models/Picture.js';
import { Product } from '../models/Product.js';
import { badRequest, notFound } from '../utils/error.js';

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

        res.status(204).send();
    }

};

export { pictureController };