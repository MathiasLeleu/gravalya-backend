import { Router } from 'express'
import { userController } from './controllers/userController.js'
import { orderController } from './controllers/orderController.js'
import { productController } from './controllers/productController.js'
import { categoryController } from './controllers/categoryController.js'
import { shippingMethodController } from './controllers/shippingMethodController.js'
import { shippingRateController } from './controllers/shippingRateController.js'

const router = Router();

// USER
router.get('/users', userController.showAllUsers); //
router.get('/users/:id', userController.showOneUser); // ADMIN + USER OWNER
router.post('/users', userController.createUser);
// TODO AUTH: Réactiver la vérification de req.user lorsque JWT sera implémenté.
router.patch('/users/:id', userController.updateUser); // ADMIN + USER OWNER
router.delete('/users/:id', userController.deleteUser); // ADMIN + USER OWNER

// ORDER
router.get('/orders', orderController.showAllOrders); // ADMIN
router.get('/orders/:id', orderController.showOneOrder); // ADMIN + ORDER OWNER
// router.post('/orders', orderController.createOrder); 
// router.patch('/orders/:id', orderController.updateOrderStatus); // ADMIN


// PRODUCT
router.get('/products', productController.showAllProducts);
router.get('/products/:id', productController.showOneProduct);
router.post('/products', productController.createProduct); // ADMIN
router.patch('/products/:id', productController.updateProduct); // ADMIN


// CATEGORY
router.get('/categories', categoryController.showAllCategories);
router.get('/categories/:id', categoryController.showOneCategory);
router.post('/categories', categoryController.createCategory); // ADMIN
router.patch('/categories/:id', categoryController.updateCategory); // ADMIN
router.delete('/categories/:id', categoryController.deleteCategory); // ADMIN


// SHIPPING METHOD
router.get('/shipping-methods', shippingMethodController.showAllShippingMethods);
router.get('/shipping-methods/:id', shippingMethodController.showOneShippingMethod);
router.post('/shipping-methods', shippingMethodController.createShippingMethod); // ADMIN
router.patch('/shipping-methods/:id', shippingMethodController.updateShippingMethod); // ADMIN


// SHIPPING RATE
router.get('/shipping-rates', shippingRateController.showAllShippingRates);
router.get('/shipping-rates/:id', shippingRateController.showOneShippingRate);
router.post('/shipping-rates', shippingRateController.createShippingRate); // ADMIN
router.patch('/shipping-rates/:id', shippingRateController.updateShippingRate); // ADMIN


export { router }