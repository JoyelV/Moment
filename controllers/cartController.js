const productModel = require("../models/productModel");
const User = require("../models/userModel");
const cartModel = require("../models/cartModel");
const addressModel = require("../models/addressModel");
const wishlistModel = require("../models/wishlistModel");
const ProductOfferModel = require("../models/productOfferModel");
const CategoryOfferModel = require("../models/categoryOfferModel");
const {couponModel}=require('../models/couponModel');

const loadAndShowCart = async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        const userId = user._id;
        let userCart = await cartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });
        const coupon = await couponModel.find();
        const eligibleCoupons = coupon.filter(coupon => {
            return userCart.billTotal >= coupon.minimumAmount && userCart.billTotal <= coupon.maximumAmount && coupon.usersUsed.length<coupon.maxUsers && coupon.isActive &&
            !coupon.usersUsed.includes(req.session.user_id);
        });

        let wish = await wishlistModel.findOne({ user: userId });
        
        if (!wish) {
            wish = null;
        }
        
        if (!userCart) {
            userCart = { items: [], billTotal: 0 }; 
        }
        
        var sum = 0;
        for (const item of userCart.items) {
            const productId = item.productId;

            const proOffer = await ProductOfferModel.findOne({ 'productOffer.product': productId, 'productOffer.offerStatus': true });

            const proData = await productModel.findOne({ _id: productId, is_deleted: false });
            if(!proData){
                await cartModel.updateOne(
                    { owner: userId },
                    { $pull: { items: { productId: productId } } }
                );
                continue;
            }

            let specialDiscount = 0;
            if (proOffer) {
                specialDiscount += proOffer.productOffer.discount;
            }

            const cateOffer = await CategoryOfferModel.findOne({
                'categoryOffer.category': proData.category,
                "is_active": true
              });

            if(cateOffer){
                specialDiscount += cateOffer.categoryOffer.discount;
            }

            const couponApplied = await couponModel.find({code:userCart.coupon});
            const couponDiscount = couponApplied.discountPercentage;

            const products = await productModel.findOne({_id:productId});
            var itemPrice = products.discountPrice - (products.discountPrice*specialDiscount)/100;
            item.price = itemPrice;
            sum += itemPrice * item.quantity;
        }

        userCart.billTotal = sum;

        res.render('cart', { cart: userCart, coupon: eligibleCoupons, wish }); 

    } catch (err) {
        console.log('loadAndShowCart:', err.message);
        res.status(500).send('Error loading cart');
    }
}

const addCouponToCart = async (req, res) => {
    try {
        const { code } = req.query; 

        const coupon = await couponModel.findOne({ code: code, isActive: true });
        if (!coupon) {
            return res.status(400).json({ error: 'Invalid coupon code' });
        }
        const userId = req.session.user_id;
        let userCarts = await cartModel.findOne({ owner: userId }).populate('items');

        for (const item of userCarts.items) {
            const productId = item.productId;

            const proData = await productModel.findOne({ _id: productId, is_deleted: false });
            if(!proData){
                await cartModel.updateOne(
                    { owner: userId },
                    { $pull: { items: { productId: productId } } }
                );
                continue; 
            }
        }
        let userCart = await cartModel.findOne({ owner: userId }).populate('items');

        if (!userCart) {
            userCart = new cartModel({ owner: userId });
        }
        
        if(userCart.coupon === 'nil'){
            userCart.coupon = code; 
            const discountPercentage = coupon.discountPercentage;
            userCart.discountPrice = (userCart.billTotal * discountPercentage) / 100;
            userCart.billTotal -= userCart.discountPrice;
            await userCart.save();
            await coupon.save();

            const couponAdd = await couponModel.findOneAndUpdate(
                { code: code, isActive: true },
                { $addToSet: { usersUsed: userId } }
              );
            await couponAdd.save();
        }

        var couponApplied = await couponModel.findOne({code:userCart.coupon});
        console.log("null",couponApplied)
        if (userCart.coupon === 'nil'){
        }else{
            if(coupon.maximumAmount<userCart.billTotal){
                userCart.coupon = 'nil';
                await userCart.save();
             }
        }

        const updatedUserCart = await cartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });

        const coupons = await couponModel.find();

        const eligibleCoupons = coupons.filter(coupon => {
            return updatedUserCart.billTotal >= coupon.minimumAmount && updatedUserCart.billTotal <= coupon.maximumAmount && coupon.isActive;
        });

        let wish = await wishlistModel.findOne({ user: userId });
        if (!wish) {
            wish = null;
        }
        res.render('cart', { cart: updatedUserCart, coupon: eligibleCoupons, wish });
    } catch (error) {
        console.error('Error adding coupon to cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const removeCouponFromCart = async (req, res) => {
    try {
        const { code } = req.query; 
        const userId = req.session.user_id;

        let userCarts = await cartModel.findOne({ owner: userId }).populate('items');

        for (const item of userCarts.items) {
            const productId = item.productId;

            const proData = await productModel.findOne({ _id: productId, is_deleted: false });
            if(!proData){
                await cartModel.updateOne(
                    { owner: userId },
                    { $pull: { items: { productId: productId } } }
                );
                continue; 
            }
        }
        
        let userCart = await cartModel.findOne({ owner: userId }).populate('items');

        if (!userCart) {
            return res.status(400).json({ error: 'Cart not found' });
        }

        if (userCart.coupon !== code) {
            return res.status(400).json({ error: 'Coupon not found in the cart' });
        }

        const coupon = await couponModel.findOne({ code: userCart.coupon});
        coupon.usersUsed = coupon.usersUsed.filter(id => id.toString() !== userId.toString());
        await coupon.save();

        console.log("userId coupon", userId);
        userCart.coupon = undefined;
        userCart.billTotal = 0;

        userCart.items.forEach(item => {
        userCart.billTotal += item.price;
        });

        await userCart.save();
        res.redirect('/cart');

    } catch (error) {
        console.error('Error removing coupon from cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const addTocart = async (req, res) => {
try {
        const productId = req.body.productId;
        console.log("productId in addtoCart",productId);
        const product = await productModel.findById(productId);
        console.log(product);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const wishlist = await wishlistModel.findOne({ user: req.session.user_id });
        console.log("wishlist",wishlist);
        
        if (wishlist) {
           const index = wishlist.product.findIndex(product => product.toString() === productId);
           if (index !== -1) {
           wishlist.product.splice(index, 1);
           await wishlist.save();
             }
          }

        let userCart = await cartModel.findOne({ owner: req.session.user_id });
        console.log("userCart",userCart);

        if (!userCart) {
            userCart = new cartModel({
                owner: req.session.user_id,
                items: [],
                billTotal: 0,
            });
        }
        
    const existingCartItem = userCart.items.find(item => item.productId.toString() === productId);
    console.log("existingCartItme",existingCartItem);
    
    if (existingCartItem) {
        if (existingCartItem.quantity < product.countInStock && existingCartItem.quantity < 5) {
              
                const proOffer = await ProductOfferModel.findOne({'productOffer.product':productId,    'productOffer.offerStatus': true});

                var specialDiscount = 0;

                if (proOffer) {
                    specialDiscount = proOffer.productOffer.discount;
                }
    
                var productOfferDiscountPrice = product.discountPrice - (product.discountPrice*specialDiscount)/100;

                existingCartItem.quantity += 1;
                existingCartItem.price = existingCartItem.quantity * productOfferDiscountPrice;
                console.log("after updating cart",existingCartItem);

            } else if (existingCartItem.quantity + 1 > product.countInStock) {

                return res.status(409).json({ message: 'Stock Limit Exceeded' });

        } else {

                return res.status(400).json({ message: 'Maximum quantity per person reached' });
            }

    } else {
            const proOffer = await ProductOfferModel.findOne({'productOffer.product':productId,'productOffer.offerStatus': true});
            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount = proOffer.productOffer.discount;
            }

            var productOfferDiscountPrice = product.discountPrice - (product.discountPrice*specialDiscount)/100;

            userCart.items.push({
                productId: productId,
                quantity: 1,
                price: productOfferDiscountPrice,
            });
        }
        userCart.billTotal = userCart.items.reduce((total, item) => total + item.price, 0);
        await userCart.save();
        return res.status(200).json({ message: 'add to cart' });

} catch (err) {
        console.log('Error adding to cart:', err.message);
        return res.status(500).json({ message: 'Internal server error' });
}
};

const increaseQuantity = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user_id;
        
        let cart = await cartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.productId._id.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: 'Product not in cart' });
        }

        if (item.quantity > 5) {
            return res.status(400).json({ message: 'Maximum quantity reached' });
        }

        if (item.quantity + 1 > item.productId.countInStock) {
            return res.status(409).json({ message: 'Stock limit exceeded' });
        }

        item.quantity += 1;

        const proOffer = await ProductOfferModel.findOne({'productOffer.product':productId,'productOffer.offerStatus': true});
        var specialDiscount = 0;
            if (proOffer) {
                specialDiscount = proOffer.productOffer.discount;
            }

        var productOfferDiscountPrice = item.productId.discountPrice - (item.productId.discountPrice*specialDiscount)/100;

        item.price = item.quantity * productOfferDiscountPrice;
        cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);
        var coupon = await couponModel.findOne({code:cart.coupon});
        console.log("null",coupon)
        if (cart.coupon === 'nil'){
            console.log("cart.coupon",cart.coupon)
        }else{
            if(coupon.maximumAmount<cart.billTotal){
                cart.coupon = 'nil';
                console.log("cart.coupon",cart.coupon)
                await cart.save();
             }
        }
        
        console.log("cart coupn",cart.coupon)

        await cart.save();
        return res.status(200).json({ message: 'Quantity increased', cart });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

const decreaseQuantity = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user_id;
        
        const cart = await cartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.productId._id.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: 'Product not in cart' });
        }

        if (item.quantity > 1) {
            item.quantity -= 1;

            const proOffer = await ProductOfferModel.findOne({'productOffer.product':productId,    'productOffer.offerStatus': true});
            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount = proOffer.productOffer.discount;
            }

            var productOfferDiscountPrice = item.productId.discountPrice - (item.productId.discountPrice*specialDiscount)/100;

            console.log("productOfferDiscountPrice:",productOfferDiscountPrice);

            item.price = item.quantity * productOfferDiscountPrice;
        } else {
            return res.status(400).json({ message: 'Minimum quantity reached' });
        }

        cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);

        await cart.save();

        console.log(cart);
        return res.status(200).json({ message: 'Quantity decreased', cart });
    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

const deleteCart = async (req, res) => {
    try {
            const user = await User.findById(req.session.user_id);
            const { productId } = req.body;
            let userCart = await cartModel.findOne({ owner: user });
            if (!userCart) {
                return res.status(404).json({ message: 'Cart not found' });
            }
            userCart.coupon = 'nil';

            const existingCartItemIndex = userCart.items.findIndex(item => item.productId.toString() === productId);
            if (existingCartItemIndex > -1) {
              userCart.items.splice(existingCartItemIndex, 1);
              await cartModel.findOneAndUpdate({ owner: req.session.user_id },{$set:{coupon:"nil"}});

                userCart.billTotal = userCart.items.reduce((total, item) => {
                    let itemPrice = Number(item.price); 
                    let itemQuantity = Number(item.quantity); 
                    let itemTotal = itemPrice * itemQuantity;
                    console.log(`Calculating Item Total: ${itemTotal} (Price: ${itemPrice}, Quantity: ${itemQuantity})`); 
                    return total + (isNaN(itemTotal) ? 0 : itemTotal);
                }, 0);

                console.log("cart.coupon",userCart.coupon);
             
                await userCart.save();
                return res.status(200).json({ success: true, message: 'Item removed from cart' });
            } else {
                return res.status(404).json({ message: 'Item not found in cart' });
            }
    } catch (err) {
            console.error('Error deleting from cart:', err.message);
            return res.status(500).json({ message: 'Internal server error' });
        }
};

module.exports = {
    addTocart,
    increaseQuantity,
    decreaseQuantity,
    deleteCart,
    loadAndShowCart,
    addCouponToCart,
    removeCouponFromCart
}