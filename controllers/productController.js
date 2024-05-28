const productModel = require("../models/productModel");
const categoryModel = require('../models/categoryModel');
const userModel = require('../models/userModel');
const Review = require('../models/reviewModel');
const orderModel = require("../models/orderModel")
const wishlistModel = require("../models/wishlistModel")
const { TopologyDescription } = require("mongodb");
const ProductOfferModel = require("../models/productOfferModel");
const CategoryOfferModel = require("../models/categoryOfferModel");

const loadProduct = async (req, res) => {
    try {
        let query = req.query.q;
        if (/^([a-zA-Z\d])\1*[\W\d]*$/.test(query)) {
            query = 'all';
        } 
        if (/^[\*\W\d]+$/.test(query)) {
            query = 'all';
        } 
        if(query === 'all'){
            const page = parseInt(req.query.page) || 1; 
            const limit = 5; 
            query = {};
            const totalProductsCount = await productModel.countDocuments();
            const totalPages = Math.ceil(totalProductsCount / limit);
    
            if (page < 1 || page > totalPages) {
                return res.status(404).send('Page not found');
            }
    
            const skip = (page - 1) * limit;
    
            const productdetails = await productModel.find(query).populate('category').skip(skip).limit(limit);
            const categorydetails = await categoryModel.find();
    
            res.render('view-product', { query, product: productdetails, category: categorydetails, totalPages, currentPage: page });
        }
        else{
        const query = req.query.q; 

        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
    
        const totalProductsCount = await productModel.countDocuments();
        const totalPages = Math.ceil(totalProductsCount / limit);
    
        if (page < 1 || page > totalPages) {
                return res.status(404).send('Page not found');
        }
    
        const skip = (page - 1) * limit;

        const category = await categoryModel.find({});

        const products = await productModel.find({ 
          $and: [
            { is_deleted: false }, 
            { $or: [ 
              { name: { $regex: new RegExp(query, 'i') } }, 
              { brand: { $regex: new RegExp(query, 'i') } } 
            ] }
          ]
        }).populate('category').skip(skip).limit(limit); 
    
        res.render('view-product', { query,product: products, category: category, totalPages, currentPage: page });
    }
    }catch(error){
        console.log(error.message);
    }
}

const addProductpage = async(req,res)=>{
    try{
        const categorydetails = await categoryModel.find({ is_active: true });

        res.render('add-product', { category: categorydetails});
    }catch(error){
        console.log(error.message);
    }
}

const addProduct = async (req, res) => {
    try {  
        if (!req.body.name || !req.body.description || !req.body.brand || !req.body.gender || !req.body.stock || !req.body.category || !req.body.price || !req.body.discountPrice || !req.files) {
            return res.redirect('/admin/product'); 
        }
               
        const images = req.files ? req.files.map(file => file.filename) : [];

        const value = await productModel.countDocuments({ name: req.body.name, category: req.body.category });

        if(value==0){

        const product = new productModel({
            name: req.body.name,
            description: req.body.description,
            brand:req.body.brand,
            gender: req.body.gender,
            images: images,
            countInStock: req.body.stock,
            category: req.body.category,
            price: req.body.price,
            discountPrice: req.body.discountPrice,
        });

        const savedProduct = await product.save();
        
        if (savedProduct) {
            res.redirect('/admin/product');
        }
    }
      else{
        const categoryDetails = await categoryModel.find();
        res.render('add-product', { category: categoryDetails,message:"Product with same category exists"});
      }
    } catch (error) {
        console.error('Error saving product:', error);
        res.status(500).send('Error saving product.');
    }
};

const loadEdit = async (req, res) => {
    try {
        const id = req.query.id;

        const proData = await productModel.findById(id).populate('category');
        if(req.query.delete){
            proData.images = proData.images.filter(img => img.trim() !== req.query.delete.trim());
            await proData.save();
      
        }
        const catData = await categoryModel.find({ is_active: true });

        res.render("editProduct", { catData, proData });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const editProduct = async (req, res) => {
    try {
        let existingImages = [];
        let existingProduct = await productModel.findById(req.query.id);
        
        const categorydetails = await categoryModel.find();
        
        if (existingProduct && existingProduct.images && Array.isArray(existingProduct.images)) {
            existingImages = existingProduct.images;
        }
        console.log(req.body);
        let newImages = [];

        if (req.files && req.files.length) {
            newImages = req.files.map(file => file.filename);
        }
 
        const allImages = existingImages.concat(newImages);

        if (allImages.length > 3) {
            return res.render('editProduct', { catData: categorydetails, proData: existingProduct, message: 'Maximum 3 images per product' });
        } else {
            
            const updatedProduct = await productModel.findByIdAndUpdate(req.query.id, {
                $set: {
                    name: req.body.name,
                    description: req.body.description,
                    images: allImages,
                    brand:req.body.brand,
                    gender: req.body.gender,
                    category: req.body.category,
                    price: req.body.price,
                    discountPrice: req.body.discountPrice,
                    countInStock: req.body.stock,
                }
            }, { new: true }); 

            if (updatedProduct) {
                return res.redirect('/admin/product');
            }
        }
    } catch (error) {
        console.log('update product:', error.message);
        res.status(500).send('An error occurred');
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.query;
        await productModel.findByIdAndUpdate(id, { is_deleted: true });
        res.redirect('/admin/product');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const restoreProduct = async (req, res) => {
    try {
        const { id } = req.query;
        await productModel.findByIdAndUpdate(id, { is_deleted: false });
        res.redirect('/admin/product');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadProductPage = async(req,res)=>{
        try {
            const id = req.query.id;
            const userId = req.session.user_id;

            const productData = await productModel.findById(id).populate('category');
            const relatedProducts = await productModel.find({ category: productData.category }).limit(4);
            const reviewDetails = await Review.find({product:productData._id}).sort({createdAt:1}).limit(3);

            const proOffer = await ProductOfferModel.aggregate([
                {
                  $match: {
                    'productOffer.product': productData._id,
                    'productOffer.offerStatus': true,
                    startingDate: { $lte: new Date() },
                    endingDate: { $gte: new Date() }
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalDiscount: { $sum: "$productOffer.discount" }
                  }
                }
              ]);
          
              const proOfferDiscount = (proOffer.length > 0) ? proOffer[0].totalDiscount : 0;

              const result = await CategoryOfferModel.aggregate([
                {
                  $match: {
                    'categoryOffer.category': productData.category._id,
                    is_active: true,
                    "categoryOffer.offerStatus": true,
                    startingDate: { $lte: new Date() },
                    endingDate: { $gte: new Date() },
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalDiscount: { $sum: "$categoryOffer.discount" }
                  }
                }
              ]);
          
              const totalDis = (result.length > 0) ? result[0].totalDiscount : 0;

            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount += proOfferDiscount;
            }

            if(result){
                specialDiscount += totalDis;
            }

            const isInWishlist = await isProductInWishlist(userId, id);
            console.log("isInWishlisttttt",isInWishlist);
    
            if (productData) {
                res.render('productDetails', {
                    product: productData,
                    category: productData.category.name,
                    relatedProducts,
                    reviewDetails,
                    isInWishlist,
                    specialDiscount
          
                });
            } else {
                res.redirect('/home');
            }
        } catch (error) {
            
            console.log(error.message);
            res.status(500).send("Internal Server Error");
        }
}

async function isProductInWishlist(userId, productId) {
    const wishlist = await wishlistModel.findOne({ user: userId });
    if (!wishlist) return false;
    return wishlist.product.some(product => product.toString() === productId);
}

const loadShop = async (req, res) => {
    try {
        const category = await categoryModel.find({});
        let search = req.query.q;
        let cate = req.query.category;
        let sorted = req.query.sort;
        let query = { is_deleted: false };

        console.log(search,"Hii result")

        if (req.query.q) {
            const searchQuery = req.query.q;

            const searchCondition = {
                $or: [
                    { brand: { $regex: searchQuery, $options: 'i' } },
                    { name: { $regex: searchQuery, $options: 'i' } }
                ]
            };
            query = { ...query, ...searchCondition };
        }
        if(search ==='all'||search==='All'){
            query = { is_deleted: false };
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.brand) {
            query.brand = req.query.brand;
        }

        if (req.query.sort === 'outOfStock') {
            query.countInStock = 0; 
        } else if (req.query.sort === 'inStock') {
            query.countInStock = { $gt: 0 }; 
        }

        const totalProductsCount = await productModel.countDocuments(query);

        let sortOption = {};

        switch (req.query.sort) {
            case 'priceAsc':
                sortOption = { 
                    discountPrice: 1 };
                break;
            case 'priceDsc':
                sortOption = { 
                    discountPrice: -1 };
                break;
            case 'nameAsc':
                sortOption = { name: 1 };
                break;
            case 'nameDsc':
                sortOption = { name: -1 };
                break;
            case 'rating':
                sortOption = { rating: -1 };
                break;
            case 'newness':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { name: 1 };
        }

        let page = parseInt(req.query.page) || 1;
        const limit = 6; 
        const totalPages = Math.ceil(totalProductsCount / limit);
        if(totalPages<2){
            page =  1;
        }
        const skip = (page - 1) * limit;

        const products = await productModel.find(query).sort(sortOption).skip(skip).limit(limit);
        console.log(query,"Hii query result")

        res.render('shop', { product: products, category, totalPages, currentPage: page,query: search,cate:cate,sort:sorted,currentPage:page });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadMenShop = async (req, res) => {
    try {
        const category = await categoryModel.find({});

        let search = req.query.q;
        let cate = req.query.category;
        let sorted = req.query.sort;

        let query = { gender: 'Men', is_deleted: { $ne: 'true' } };

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.q) {
            const searchQuery = req.query.q;
            const searchCondition = {
                $or: [
                    { brand: { $regex: searchQuery, $options: 'i' } },
                    { name: { $regex: searchQuery, $options: 'i' } }
                ]
            };
            query = { ...query, ...searchCondition };
        }

        if (search === 'all' || search === 'All') {
            query = { gender: 'Men', is_deleted: { $ne: 'true' } };
        }

        let sortOption = {};

        switch (req.query.sort) {
            case 'rating':
                sortOption = { rating: -1 };
                break;
            case 'priceAsc':
                sortOption = { discountPrice: 1 };
                break;
            case 'priceDsc': // Changed to match the HTML option value
                sortOption = { discountPrice: -1 };
                break;
            case 'newness':
                sortOption = { createdAt: -1 };
                break;
            case 'nameAsc':
                sortOption = { name: 1 };
                break;
            case 'nameDsc': // Changed to match the HTML option value
                sortOption = { name: -1 };
                break;
            case 'outOfStock':
                query.countInStock = 0;
                break;
            case 'inStock':
                query.countInStock = { $gt: 0 };
                break;
            default:
                sortOption = { name: 1 };
                break;
        }

        let page = parseInt(req.query.page) || 1;
        const limit = 6;

        const totalProductsCount = await productModel.countDocuments(query);
        const totalPages = Math.ceil(totalProductsCount / limit);

        if (totalPages < 2) {
            page = 1;
        }

        const skip = (page - 1) * limit;

        const product = await productModel
            .find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        res.render('mens', { product, category, totalPages, currentPage: page, query: search, cate: cate, sort: sorted });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadWomenShop = async (req, res) => {
    try {
        const category = await categoryModel.find({});

        let query = { gender: 'Women', is_deleted: { $ne: 'true' } };

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.q) {
            const searchQuery = req.query.q;
            const searchCondition = {
                $or: [
                    { brand: { $regex: searchQuery, $options: 'i' } },
                    { name: { $regex: searchQuery, $options: 'i' } }
                ]
            };
            query = { ...query, ...searchCondition };
        }

        let sortOption = {};

        switch (req.query.sort) {
            case 'rating':
                sortOption = { rating: -1 };
                break;
            case 'priceAsc':
                sortOption = { discountPrice: 1 };
                break;
            case 'priceDsc': 
                sortOption = { discountPrice: -1 };
                break;
            case 'newness':
                sortOption = { createdAt: -1 };
                break;
            case 'nameAsc':
                sortOption = { name: 1 };
                break;
            case 'nameDsc': 
                sortOption = { name: -1 };
                break;
            case 'outOfStock':
                query.countInStock = 0;
                break;
            case 'inStock':
                query.countInStock = { $gt: 0 };
                break;
            default:
                sortOption = { createdAt: -1 };
                break;
        }

        let page = parseInt(req.query.page) || 1;
        const limit = 6;

        const totalProductsCount = await productModel.countDocuments(query);
        const totalPages = Math.ceil(totalProductsCount / limit);
        const skip = (page - 1) * limit;

        const product = await productModel
            .find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        res.render('women', { product, category, totalPages, currentPage: page, query: req.query.q, cate: req.query.category, sort: req.query.sort });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const reviewProduct = async (req, res) => {
    try {

        const { name, email, text, rating, productName } = req.body;
        const user = await userModel.findOne({ email: email });
        const product = await productModel.findOne({ name: productName });

        const order = await orderModel.findOne({
            user: user._id,
            'items.name': productName,
            paymentStatus: 'Success',
            status: 'Delivered'
        });

        if (!order) {
            const productData = await productModel.findById(product._id).populate('category');
            const relatedProducts = await productModel.find({ category: productData.category }).limit(5);
            const reviewDetails = await Review.find({ product: productData._id }).sort({ createdAt: 1 }).limit(3);
            
            const userId = req.session.user_id;
            const isInWishlist = await isProductInWishlist(userId, productData._id);
            console.log("isIggggnWishlist",isInWishlist);
            
            const proOffer = await ProductOfferModel.aggregate([
                {
                  $match: {
                    'productOffer.product': productData._id,
                    'productOffer.offerStatus': true,
                    startingDate: { $lte: new Date() },
                    endingDate: { $gte: new Date() }
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalDiscount: { $sum: "$productOffer.discount" }
                  }
                }
              ]);
          
              const proOfferDiscount = (proOffer.length > 0) ? proOffer[0].totalDiscount : 0;

              const result = await CategoryOfferModel.aggregate([
                {
                  $match: {
                    'categoryOffer.category': productData.category._id,
                    is_active: true,
                    "categoryOffer.offerStatus": true,
                    startingDate: { $lte: new Date() },
                    endingDate: { $gte: new Date() },
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalDiscount: { $sum: "$categoryOffer.discount" }
                  }
                }
              ]);
          
            const totalDis = (result.length > 0) ? result[0].totalDiscount : 0;

            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount += proOfferDiscount;
            }

            if(result){
                specialDiscount += totalDis;
            }

            return res.render('productDetails', {
                product: productData,
                category: productData.category.name,
                relatedProducts,
                reviewDetails,
                isInWishlist,
                specialDiscount,
                message: 'You are not purchased this product to review this product.'
            });
        }

        const userReviewExists = await Review.exists({ product: product._id, email: email });
        console.log("userReviewExists",userReviewExists);
        if (userReviewExists) {

            const productData = await productModel.findById(product._id).populate('category');
            const relatedProducts = await productModel.find({ category: productData.category }).limit(5);
            const reviewDetails = await Review.find({ product: productData._id }).sort({ createdAt: 1 }).limit(3);

            const userId = req.session.user_id;

            const isInWishlist = await isProductInWishlist(userId, productData._id);
            console.log("ihhhhhhsInWishlist",isInWishlist);

            const proOffer = await ProductOfferModel.aggregate([
                {
                  $match: {
                    'productOffer.product': productData._id,
                    'productOffer.offerStatus': true,
                    startingDate: { $lte: new Date() },
                    endingDate: { $gte: new Date() }
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalDiscount: { $sum: "$productOffer.discount" }
                  }
                }
              ]);
          
              const proOfferDiscount = (proOffer.length > 0) ? proOffer[0].totalDiscount : 0;

              const result = await CategoryOfferModel.aggregate([
                {
                  $match: {
                    'categoryOffer.category': productData.category._id,
                    is_active: true,
                    "categoryOffer.offerStatus": true,
                    startingDate: { $lte: new Date() },
                    endingDate: { $gte: new Date() },
                  }
                },
                {
                  $group: {
                    _id: null,
                    totalDiscount: { $sum: "$categoryOffer.discount" }
                  }
                }
              ]);
          
            const totalDis = (result.length > 0) ? result[0].totalDiscount : 0;

            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount += proOfferDiscount;
            }

            if(result){
                specialDiscount += totalDis;
            }

            console.log("specialdisocunt if userreview exists",specialDiscount)

            return res.render('productDetails', {
                product: productData,
                category: productData.category.name,
                relatedProducts,
                reviewDetails,
                isInWishlist,
                specialDiscount,
                message: 'You have already reviewed this product.'
            });
        }
        
        const newReview = new Review({
            product: product._id,
            name,
            email,
            rating,
            reviewText: text
        });

        await newReview.save();

        const reviews = await Review.find({ product: product._id });
        const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        product.rating = averageRating;
        await product.save();

        const productData = await productModel.findById(product._id).populate('category');
        const relatedProducts = await productModel.find({ category: productData.category }).limit(5);
        const reviewDetails = await Review.find({ product: productData._id }).sort({ createdAt: 1 }).limit(3);

        const userId = req.session.user_id;

        const isInWishlist = await isProductInWishlist(userId, product._id);
        console.log("isInWishlist",isInWishlist);

        const proOffer = await ProductOfferModel.aggregate([
            {
              $match: {
                'productOffer.product': product._id,
                'productOffer.offerStatus': true,
                startingDate: { $lte: new Date() },
                endingDate: { $gte: new Date() }
              }
            },
            {
              $group: {
                _id: null,
                totalDiscount: { $sum: "$productOffer.discount" }
              }
            }
          ]);
      
          const proOfferDiscount = (proOffer.length > 0) ? proOffer[0].totalDiscount : 0;

        const result = await CategoryOfferModel.aggregate([
            {
              $match: {
                'categoryOffer.category': productData.category._id,
                is_active: true,
                "categoryOffer.offerStatus": true,
                startingDate: { $lte: new Date() },
                endingDate: { $gte: new Date() },
              }
            },
            {
              $group: {
                _id: null,
                totalDiscount: { $sum: "$categoryOffer.discount" }
              }
            }
          ]);
      
        const totalDis = (result.length > 0) ? result[0].totalDiscount : 0;
            
            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount += proOfferDiscount;
            }

            if (result) {
                specialDiscount += totalDis;
            }

        return res.render('productDetails', {
            product: productData,
            category: productData.category.name,
            relatedProducts,
            reviewDetails,
            isInWishlist,
            specialDiscount,
            message: 'Review submitted successfully.'
        });
    
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const searchProductView = async(req,res)=>{
    try{
        let query = req.query.q; 

        if (/^([a-zA-Z\d])\1*[\W\d]*$/.test(query)) {
            query = 'all';
        } 
        if (/^[\*\W\d]+$/.test(query)) {
            query = 'all';
        } 
        
        if(query === 'all'){
            const page = parseInt(req.query.page) || 1; 
            const limit = 5; 
    
            const totalProductsCount = await productModel.countDocuments();
            const totalPages = Math.ceil(totalProductsCount / limit);
    
            if (page < 1 || page > totalPages) {
                return res.status(404).send('Page not found');
            }
    
            const skip = (page - 1) * limit;
    
            const productdetails = await productModel.find().populate('category').skip(skip).limit(limit);
            const categorydetails = await categoryModel.find();
    
            res.render('view-product', { query, product: productdetails, category: categorydetails, totalPages, currentPage: page });
        }
        else{
        const query = req.query.q; 

        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
    
        const totalProductsCount = await productModel.countDocuments();
        const totalPages = Math.ceil(totalProductsCount / limit);
    
        if (page < 1 || page > totalPages) {
                return res.status(404).send('Page not found');
        }
    
        const skip = (page - 1) * limit;

        const category = await categoryModel.find({});

        const products = await productModel.find({ 
          $and: [
            { is_deleted: false }, 
            { $or: [ 
              { name: { $regex: new RegExp(query, 'i') } }, 
              { brand: { $regex: new RegExp(query, 'i') } } 
            ] }
          ]
        }).populate('category').skip(skip).limit(limit); 
    
        res.render('view-product', { query,product: products, category: category, totalPages, currentPage: page });
    }
    }catch(error){
        console.log(error.message);
    }
}

const getStocks = async (req, res) => {
    try {
        const query = req.query.q || ''; 
        
        if (query === 'all') {
            const category = await categoryModel.find({});
            const products = await productModel.find({}).populate('category');
            const totalProducts = await productModel.countDocuments({});
            const totalPages = Math.ceil(totalProducts / 10); 
            console.log("products in search", products);
            return res.render('stocks', { 
                product: products, 
                category,
                currentPage: 1, 
                query: '', 
                totalPages: totalPages 
            });
        } else {
            const category = await categoryModel.find({});
            const products = await productModel.find({
                $and: [
                    { is_deleted: false },
                    {
                        $or: [
                            { name: { $regex: new RegExp(query, 'i') } },
                            { brand: { $regex: new RegExp(query, 'i') } }
                        ]
                    }
                ]
            }).populate('category');
            const totalProducts = await productModel.countDocuments({
                $and: [
                    { is_deleted: false },
                    {
                        $or: [
                            { name: { $regex: new RegExp(query, 'i') } },
                            { brand: { $regex: new RegExp(query, 'i') } }
                        ]
                    }
                ]
            });
            const totalPages = Math.ceil(totalProducts / 10); 
            console.log("products in search", products);
            res.render('stocks', { 
                product: products, 
                category,
                currentPage: 1, 
                query: query, 
                totalPages: totalPages 
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const updateStock = async (req, res) => {
    try {
        for (const productId in req.body) {
            if (Object.hasOwnProperty.call(req.body, productId)) {
                const newStock = parseInt(req.body[productId]);
                console.log("newStock in stocks:", newStock);
                const updated = await productModel.findByIdAndUpdate(productId, { countInStock: newStock });
                console.log("updated in updatestocks:", updated);
            }
        }
        const products = await productModel.find();
        console.log("products in stock:", products);
        const category = await categoryModel.find({});
        const totalProducts = await productModel.countDocuments({}); 
        const totalPages = Math.ceil(totalProducts / 10); 

        const currentPage = 1;
        const query = ''; 

        res.render('stocks', { product: products, category, totalPages: totalPages, currentPage: currentPage, query: query });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while updating stock" });
    }
};

const searchStock = async (req, res) => {
    try {
        const query = req.query.q || ''; 
        
        if (query === 'all') {
            const category = await categoryModel.find({});
            const products = await productModel.find({}).populate('category');
            const totalProducts = await productModel.countDocuments({});
            const totalPages = Math.ceil(totalProducts / 10); 
            console.log("products in search", products);
            return res.render('stocks', { 
                product: products, 
                category,
                currentPage: 1, 
                query: '', 
                totalPages: totalPages 
            });
        } else {
            const category = await categoryModel.find({});
            const products = await productModel.find({
                $and: [
                    { is_deleted: false },
                    {
                        $or: [
                            { name: { $regex: new RegExp(query, 'i') } },
                            { brand: { $regex: new RegExp(query, 'i') } }
                        ]
                    }
                ]
            }).populate('category');
            const totalProducts = await productModel.countDocuments({
                $and: [
                    { is_deleted: false },
                    {
                        $or: [
                            { name: { $regex: new RegExp(query, 'i') } },
                            { brand: { $regex: new RegExp(query, 'i') } }
                        ]
                    }
                ]
            });
            const totalPages = Math.ceil(totalProducts / 10); 
            console.log("products in search", products);
            res.render('stocks', { 
                product: products, 
                category,
                currentPage: 1, 
                query: query, 
                totalPages: totalPages 
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
 
module.exports = {
    loadProduct,
    addProductpage,
    addProduct,
    loadEdit,
    editProduct,
    loadProductPage,
    isProductInWishlist,
    loadShop,
    deleteProduct,
    restoreProduct,
    reviewProduct,
    searchProductView,
    loadMenShop,
    loadWomenShop,
    getStocks,
    updateStock,
    searchStock
}