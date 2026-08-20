import { sequelize } from './connection.js';
import { User } from './User.js';
import { Order } from './Order.js';
import { Product } from './Product.js';
import { Category } from './Category.js';
import { ShippingMethod } from './Shipping_Method.js';
import { ShippingRate } from './Shipping_Rate.js';
import { OrderRelayPoint } from './Order_Relay_Point.js';
import { OrderLine } from './Order_Line.js';

// One-To-Many relations

User.hasMany(Order, {
    as: 'orders',
    foreignKey: 'userId',
});

Order.belongsTo(User, {
    as: 'user',
    foreignKey: 'userId',
});


Order.hasMany(OrderLine, {
    as: 'orderLines',
    foreignKey: 'orderId',
});

OrderLine.belongsTo(Order, {
    as: 'order',
    foreignKey: 'orderId',
});

Product.hasMany(OrderLine, {
    as: 'orderLines',
    foreignKey: 'productId',
});

OrderLine.belongsTo(Product, {
    as: 'product',
    foreignKey: 'productId',
});


Product.belongsTo(Category, {
    as: 'category',
    foreignKey: 'categoryId',
});

Category.hasMany(Product, {
    as: 'products',
    foreignKey: 'categoryId',
});


Order.hasOne(OrderRelayPoint, {
    as: 'orderRelayPoint',
    foreignKey: 'orderId',
});

OrderRelayPoint.belongsTo(Order, {
    as: 'order',
    foreignKey: 'orderId',
});


Order.belongsTo(ShippingMethod, {
    as: 'shippingMethod',
    foreignKey: 'shippingMethodId',
});

ShippingMethod.hasMany(Order, {
    as: 'orders',
    foreignKey: 'shippingMethodId',
});


Order.belongsTo(ShippingRate, {
    as: 'shippingRate',
    foreignKey: 'shippingRateId',
});

ShippingRate.hasMany(Order, {
    as: 'orders',
    foreignKey: 'shippingRateId',
});


ShippingMethod.hasMany(ShippingRate, {
    as: 'shippingRates',
    foreignKey: 'shippingMethodId',
});

ShippingRate.belongsTo(ShippingMethod, {
    as: 'shippingMethod',
    foreignKey: 'shippingMethodId',
});


// Many-To-Many relations

Order.belongsToMany(Product, {
    through: OrderLine,
    as: 'products',
    foreignKey: 'orderId',
    otherKey: 'productId',
});

Product.belongsToMany(Order, {
    through: OrderLine,
    as: 'orders',
    foreignKey: 'productId',
    otherKey: 'orderId',
});

export { User, Order, Product, Category, ShippingMethod, ShippingRate, OrderRelayPoint, OrderLine, sequelize };