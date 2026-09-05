import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { notFound, conflict } from '../utils/error.js'

const categoryController = {

    // Get all categories 
    async showAllCategories(req, res) {
        const categories = await Category.findAll();
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
        const { name, description } = req.body;

        const existingName = await Category.findOne({
            where: { name }
        });

        if (existingName) {
            conflict('Ce nom de catégorie est déjà utilisé.');
        }

        const newCategory = await Category.create({
            name, description
        });

        res.status(201).json(newCategory)
    },

    // Update an existing category
    async updateCategory(req, res) {
        const categoryId = parseInt(req.params.id);
        const category = await Category.findByPk(categoryId);

        if (!category) {
            notFound("Catégorie non trouvée.");
        }

        await category.update(req.body);

        res.status(200).json(category);
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
                conflict("Impossible de supprimer cette catégorie car elle est utilisée par un ou plusieurs produits.");
        }

        await category.destroy();
        res.status(200).json({message: "Catégorie supprimée avec succès."})
    }

}

export { categoryController }