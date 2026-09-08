import { Router } from 'express'
import { userController } from './controllers/userController.js'
import { orderController } from './controllers/orderController.js'
import { productController } from './controllers/productController.js'
import { categoryController } from './controllers/categoryController.js'
import { shippingMethodController } from './controllers/shippingMethodController.js'
import { shippingRateController } from './controllers/shippingRateController.js'
import { pictureController } from './controllers/pictureController.js'

import { validate } from './middlewares/validation.js'
import { cw } from './middlewares/controllerWrapper.js'

import { createUserSchema, updateUserSchema } from './schemas/userSchema.js'
import { createOrderSchema, updateOrderSchema } from './schemas/orderSchema.js'
import { createProductSchema, updateProductSchema } from './schemas/productSchema.js'
import { createCategorySchema, updateCategorySchema } from './schemas/categorySchema.js'
import { createShippingMethodSchema, updateShippingMethodSchema } from './schemas/shippingMethodSchema.js'
import { createShippingRateSchema, updateShippingRateSchema } from './schemas/shippingRateSchema.js'
import { createPictureSchema } from './schemas/pictureSchema.js'

const router = Router();

// USER
router.get('/users', cw(userController.showAllUsers)); 
router.get('/users/:id', cw(userController.showOneUser)); // ADMIN + USER OWNER
router.post('/users', validate(createUserSchema), cw(userController.createUser)); // ADMIN + NEW USER
// TODO AUTH: Réactiver la vérification de req.user lorsque JWT sera implémenté.
router.patch('/users/:id', validate(updateUserSchema), cw(userController.updateUser)); // ADMIN + USER OWNER
router.delete('/users/:id', cw(userController.deleteUser)); // ADMIN + USER OWNER

// ORDER
router.get('/orders', cw(orderController.showAllOrders)); // ADMIN
router.get('/orders/:id', cw(orderController.showOneOrder)); // ADMIN + ORDER OWNER
router.post('/orders', validate(createOrderSchema), cw(orderController.createOrder));
router.patch('/orders/:id', validate(updateOrderSchema), cw(orderController.updateOrder)); // ADMIN + ORDER OWNER
router.delete('/orders/:id', cw(orderController.deleteOrder)); // ADMIN


// PRODUCT
router.get('/products', cw(productController.showAllProducts));
router.get('/products/:id', cw(productController.showOneProduct));
router.post('/products', validate(createProductSchema), cw(productController.createProduct)); // ADMIN
router.patch('/products/:id', validate(updateProductSchema), cw(productController.updateProduct)); // ADMIN


// CATEGORY
router.get('/categories', cw(categoryController.showAllCategories));
router.get('/categories/:id', cw(categoryController.showOneCategory));
router.post('/categories', validate(createCategorySchema), cw(categoryController.createCategory)); // ADMIN
router.patch('/categories/:id', validate(updateCategorySchema), cw(categoryController.updateCategory)); // ADMIN
router.delete('/categories/:id', cw(categoryController.deleteCategory)); // ADMIN


// SHIPPING METHOD
router.get('/shipping-methods', cw(shippingMethodController.showAllShippingMethods));
router.get('/shipping-methods/:id', cw(shippingMethodController.showOneShippingMethod)) ;
router.post('/shipping-methods', validate(createShippingMethodSchema), cw(shippingMethodController.createShippingMethod)); // ADMIN
router.patch('/shipping-methods/:id', validate(updateShippingMethodSchema), cw(shippingMethodController.updateShippingMethod))  ; // ADMIN


// SHIPPING RATE
router.get('/shipping-rates', cw(shippingRateController.showAllShippingRates));
router.get('/shipping-rates/:id', cw(shippingRateController.showOneShippingRate));
router.post('/shipping-rates', validate(createShippingRateSchema), cw(shippingRateController.createShippingRate)); // ADMIN
router.patch('/shipping-rates/:id', validate(updateShippingRateSchema), cw(shippingRateController.updateShippingRate)); // ADMIN

// PRODUCT'S PICTURES
router.get('/products/:id/pictures', cw(pictureController.showProductPictures));
router.get('/pictures/main', cw(pictureController.showMainPictures));
router.post('/products/:id/pictures', validate(createPictureSchema), cw(pictureController.createPicture)); // ADMIN
router.delete('/products/:id/pictures/:pictureId', cw(pictureController.deletePicture)) ; // ADMIN

export { router }