import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
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
                { 
                    association: 'pictures', 
                    where: { isMain: true },
                }
            
            ]
        });
        res.status(200).json(products);
    },

    // Get all products for admin
    async showAllProductsAdmin(req, res) {
        const products = await Product.findAll({
            include: [
                { association: 'category' },
                {
                    association: 'pictures',
                    where: { isMain: true },
                    required: false,
                }
            ]
        });

        res.status(200).json(products);
    },

    // Get all products from a category
    async showProductsByCategory(req, res) {
        const { slug } = req.params;

        const category = await Category.findOne({
            where: { slug }
        });

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        console.log("Slug reçu :", slug);
        console.log("Catégorie trouvée :", category.id, category.name);

        const products = await Product.findAll({
            where: {
                active: true,
                categoryId: category.id
            },
            include: [
                { association: 'category' },
                {
                    association: 'pictures',
                    where: { isMain: true },
                }
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
                { association: 'pictures' }
            ]
        });

        if (!product) {
            notFound("Produit non trouvé.");
        }

        res.status(200).json(product);
    },

    // Create a new product
    async createProduct(req, res) {
        const {
            name,
            description,
            price,
            weight,
            height,
            length,
            width,
            stockQuantity,
            categoryId,
            madeToOrder = false,
            customizationOptions = {}
        } = req.body;

        if (
            name === undefined || name === null ||
            description === undefined || description === null ||
            price === undefined || price === null ||
            weight === undefined || weight === null ||
            height === undefined || height === null ||
            length === undefined || length === null ||
            width === undefined || width === null ||
            stockQuantity === undefined || stockQuantity === null ||
            categoryId === undefined || categoryId === null
        ) {
            badRequest('Tous les champs requis doivent être renseignés.');
        }

        const existingName = await Product.findOne({
            where: { name }
        });

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
            categoryId,
            madeToOrder,
            customizationOptions
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