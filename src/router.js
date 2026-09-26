import { Router } from 'express'
import { userController } from './controllers/userController.js'
import { orderController } from './controllers/orderController.js'
import { productController } from './controllers/productController.js'
import { categoryController } from './controllers/categoryController.js'
import { shippingMethodController } from './controllers/shippingMethodController.js'
import { shippingRateController } from './controllers/shippingRateController.js'
import { pictureController } from './controllers/pictureController.js'
import { authController } from './controllers/authController.js'

import { validate } from './middlewares/validation.js'
import { cw } from './middlewares/controllerWrapper.js'
import { authMiddleware } from './middlewares/auth.js'
import { adminMiddleware } from './middlewares/admin.js'

import { createUserSchema, updateUserSchema } from './schemas/userSchema.js'
import { createOrderSchema, updateOrderSchema } from './schemas/orderSchema.js'
import { createProductSchema, updateProductSchema } from './schemas/productSchema.js'
import { createCategorySchema, updateCategorySchema } from './schemas/categorySchema.js'
import { createShippingMethodSchema, updateShippingMethodSchema } from './schemas/shippingMethodSchema.js'
import { createShippingRateSchema, updateShippingRateSchema } from './schemas/shippingRateSchema.js'
import { createPictureSchema, updatePictureSchema } from './schemas/pictureSchema.js'
import { loginSchema } from './schemas/authSchema.js'

const router = Router();

// AUTH
router.post('/login', validate(loginSchema), cw(authController.login));
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        user: req.user
    });
});

// USER
router.get('/users', authMiddleware, adminMiddleware, cw(userController.showAllUsers)); // ADMIN
router.get('/users/:id', authMiddleware, cw(userController.showOneUser)); // ADMIN + USER OWNER
router.post('/users', validate(createUserSchema), cw(userController.createUser)); // ADMIN + NEW USER
router.patch('/users/:id', authMiddleware, validate(updateUserSchema), cw(userController.updateUser)); // ADMIN + USER OWNER
router.delete('/users/:id', authMiddleware, cw(userController.deleteUser)); // ADMIN + USER OWNER

// ORDER
router.get('/orders', authMiddleware, adminMiddleware, cw(orderController.showAllOrders)); // ADMIN
router.get('/orders/:id', authMiddleware, cw(orderController.showOneOrder)); // ADMIN + ORDER OWNER
router.post('/orders', authMiddleware, validate(createOrderSchema), cw(orderController.createOrder));
router.patch('/orders/:id', authMiddleware, validate(updateOrderSchema), cw(orderController.updateOrder)); // ADMIN + ORDER OWNER
router.delete('/orders/:id', authMiddleware, cw(orderController.deleteOrder)); // ADMIN + ORDER OWNER


// PRODUCT
router.get('/products', cw(productController.showAllProducts));
router.get('/products/:id', cw(productController.showOneProduct));
router.post('/products', authMiddleware, adminMiddleware, validate(createProductSchema), cw(productController.createProduct)); // ADMIN
router.patch('/products/:id', authMiddleware, adminMiddleware, validate(updateProductSchema), cw(productController.updateProduct)); // ADMIN


// CATEGORY
router.get('/categories', cw(categoryController.showAllCategories));
router.get('/categories/:id', cw(categoryController.showOneCategory));
router.post('/categories', authMiddleware, adminMiddleware, validate(createCategorySchema), cw(categoryController.createCategory)); // ADMIN
router.patch('/categories/:id', authMiddleware, adminMiddleware, validate(updateCategorySchema), cw(categoryController.updateCategory)); // ADMIN
router.delete('/categories/:id', authMiddleware, adminMiddleware, cw(categoryController.deleteCategory)); // ADMIN


// SHIPPING METHOD
router.get('/shipping-methods', cw(shippingMethodController.showAllShippingMethods));
router.get('/shipping-methods/:id', cw(shippingMethodController.showOneShippingMethod)) ;
router.post('/shipping-methods', authMiddleware, adminMiddleware, validate(createShippingMethodSchema), cw(shippingMethodController.createShippingMethod)); // ADMIN
router.patch('/shipping-methods/:id', authMiddleware, adminMiddleware, validate(updateShippingMethodSchema), cw(shippingMethodController.updateShippingMethod))  ; // ADMIN


// SHIPPING RATE
router.get('/shipping-rates', cw(shippingRateController.showAllShippingRates));
router.get('/shipping-rates/:id', cw(shippingRateController.showOneShippingRate));
router.post('/shipping-rates', authMiddleware, adminMiddleware, validate(createShippingRateSchema), cw(shippingRateController.createShippingRate)); // ADMIN
router.patch('/shipping-rates/:id', authMiddleware, adminMiddleware, validate(updateShippingRateSchema), cw(shippingRateController.updateShippingRate)); // ADMIN

// PRODUCT'S PICTURES
router.get('/products/:id/pictures', cw(pictureController.showProductPictures));
router.get('/pictures/main', cw(pictureController.showMainPictures));
router.post('/products/:id/pictures', authMiddleware, adminMiddleware, validate(createPictureSchema), cw(pictureController.createPicture)); // ADMIN
router.patch('/products/:id/pictures/:pictureId', authMiddleware, adminMiddleware, validate(updatePictureSchema), cw(pictureController.updatePicture)); // ADMIN
router.delete('/products/:id/pictures/:pictureId', authMiddleware, adminMiddleware, cw(pictureController.deletePicture)) ; // ADMIN

export { router }