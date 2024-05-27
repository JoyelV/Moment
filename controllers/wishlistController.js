const User = require('../models/userModel');
const wishlistModel=require('../models/wishlistModel');

const loadWishlist = async (req, res) => {
    try {
        let wishlist = await wishlistModel.findOne({ user:req.session.user_id }).populate({path:"product",model:"Products"});

        if (!wishlist) {
            wishlist = null;
        }
        res.render('wishlist', { wish: wishlist });
        
    } catch (error) {
        console.log(error.message);
    }
};

const addToWishlist = async (req, res) => {
    try {
        const id = req.query.id;
        const user = await User.findById(req.session.user_id);

        let wishlist = await wishlistModel.findOne({ user: user});
        if (!wishlist) {
            wishlist = new wishlistModel({
                user: user,
                product: [id]
            });
            await wishlist.save();
            res.status(200).json({ message: 'Product added to wishlist successfully.' });
        } else {
            const productIndex = wishlist.product.indexOf(id);
            if (productIndex === -1) {
                wishlist.product.push(id);
                await wishlist.save();
                res.status(200).json({ message: 'Product added to wishlist successfully.' });
            } else {
                res.status(200).json({ message: 'Product already in wishlist.' });
            }
        }

    } catch (err) {
        console.error('addToWishlist:', err.message);
        res.status(500).send('Internal Server Error');
    }
};

const removeWishlist = async (req, res) => {
    try {
        const productId = req.query.id; 
        const userId = req.session.user_id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found.');
        }

        let wishlist = await wishlistModel.findOne({ user: user });

        if (!wishlist) {
            return res.status(404).send('Wishlist not found.');
        }

        const index = wishlist.product.findIndex(productIdInWishlist => productIdInWishlist.toString() === productId);

        if (index === -1) {
            return res.status(404).send('Product not found in wishlist.');
        }

        wishlist.product.splice(index, 1);

        await wishlist.save();
        res.status(200).send('Product removed from wishlist successfully.');
    } catch (error) {
        console.error('Error removing product from wishlist:', error.message);
        res.status(500).send('Internal server error.');
    }
};

module.exports = {
    loadWishlist,
    addToWishlist,
    removeWishlist
}