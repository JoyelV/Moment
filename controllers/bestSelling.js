const Order = require('../models/orderModel');

module.exports = {

    getBestSellingProducts: async () => {
        const products = await Order.aggregate([
            {
                $unwind: "$items",
            },
            {
                $match: {
                    "status": "Delivered",
                }
            },
            {
                $group: {
                    _id: "$items.productId",
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product",
                },
            },
            {
                $unwind: "$product",
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    product: 1,
                    name: "$product.name",
                },
            },
            {
                $limit: 10,
            }
        ])

        console.log(products);
        return products
    },
    getBestSellingBrands: async () => {
        const brands = await Order.aggregate([
            {
                $unwind: "$items",
            },
            {
                $match: {
                    "status": "Delivered",
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product",
                },
            },
            {
                $unwind: "$product",
            },
            {
                $group: {
                    _id: "$product.brand",
                    count: { $sum: "$items.quantity" }, 
                },
            },
            {
                $sort: { count: -1 } 
            },
            {
                $limit: 10 
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    brand_name: "$_id", 
                },
            }
        ]);
    
        console.log(brands);
        return brands;
    },    

    getBestSellingCategories: async () => {
        const categories = await Order.aggregate([
            {
                $unwind: "$items",
            },
            {
                $match: {
                    "status": "Delivered",
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "items",
                },
            },
            {
                $unwind: "$items",
            },
            {
                $group: {
                    _id: "$items.category",
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category",
                },
            },
            {
                $unwind: "$category",
            },
            {
                $sort: { count: -1 },
            },
            { $limit: 10 },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    category: 1,
                    category_name: "$category.name",
                }
            }
        ])  

        console.log(categories);
        return categories
    },
};
