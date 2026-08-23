import { Product } from '../models/Product.js';
import { badRequest, conflict, notFound } from '../utils/error.js';

const productController = {

    // Get all products
    async showAllProducts(req, res) {
        const products = await Product.findAll({
            where: {
                active: true
            },
            include: [
                { association: 'category' },
            ]
        });
        res.status(200).json(products);
    },

    // Get a single product by ID
    async showOneProduct(req, res) {
        const productId = parseInt(req.params.id);
        const product = await Product.findByPk(productId, {
            include: [
                { association: 'category' },
            ]
        });

        if (!product) {
            notFound("Produit non trouvé.");
        }

        res.status(200).json(product);
    },

    // Create a new product
    async createProduct(req, res) {
        const { name, description, price, weight, height, length, width, stockQuantity, categoryId } = req.body;

        if (!name || !description || !price || !weight || !height || !length || !width || !stockQuantity || !categoryId) {
            badRequest('Tous les champs sont requis.');
        }

        const existingName = await Product.findOne({ where: { name: name } });
        if (existingName) {
            conflict('Ce nom de produit est déjà utilisé.');
        }

        const newProduct = await Product.create({
            name,
            description,
            price,
            weight,
            height,
            length,
            width,
            stockQuantity,
            categoryId
        });

        res.status(201).json(newProduct);
    },

    // Update a product by ID
    async updateProduct(req, res) {
        const productId = parseInt(req.params.id);
        const product = await Product.findByPk(productId);

        if (!product) {
            notFound("Produit non trouvé.");
        }

        await product.update(req.body);

        res.status(200).json(product);
        
    }

}

export { productController };