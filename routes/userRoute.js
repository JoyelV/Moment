const express = require("express");
const bodyParser = require("body-parser");
const user_route = express();

const auth = require("../middleware/userAuth");
const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
const cartController = require("../controllers/cartController");
const checkoutController = require("../controllers/checkoutController");
const wishlistController = require("../controllers/wishlistController");

user_route.use(express.static('public'));
user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');

user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }));

user_route.use((req,res,next)=>{
    res.set('Cache-Control','no-store,no-cache,must-revalidate,private');
    next();
});

// for user registration
user_route.get('/register', auth.isLogout, userController.loadRegister);
user_route.post('/register',userController.insertUser);

// for verify user
user_route.get('/verifyOTP',auth.isLogout,userController.loadOtp);
user_route.post('/verifyOTP',userController.getOtp);
user_route.post('/resendotp',userController.resendOtp);

//for Guest user experience
user_route.get('/',auth.isLogout,userController.loadLandPage);
user_route.get('/landPage',auth.isLogout,userController.loadLandPage);

// for user login
user_route.get('/login', auth.isLogout, userController.loginLoad);
user_route.post('/login', userController.verifyLogin);

// for product Listing
user_route.get('/home',userController.loadHome);
user_route.get('/shop',productController.loadShop); 
user_route.get('/mens',productController.loadMenShop); 
user_route.get('/women',productController.loadWomenShop); 

//for product Details
user_route.get('/productDetails',productController.loadProductPage); 
user_route.post('/productDetails',auth.isLogin,productController.reviewProduct); 

user_route.get('/logout', auth.isLogin,userController.userLogout);

//for forgot password
user_route.get('/forget-password', auth.isLogout, userController.forgetPasswordLoad);
user_route.post('/forget-password', userController.resetPassword);
user_route.get('/forget', auth.isLogout,userController.forgetLoad);
user_route.post('/forget', userController.forgetverify);
user_route.post('/reset-password', userController.resetPassword);

//for user profile and address
user_route.get('/userprofile',auth.isLogin,userController.loaduserprofile);
user_route.post('/userprofile',userController.editprofile)
user_route.get('/addaddress',auth.isLogin,userController.loadaddaddress);
user_route.post('/addaddress',userController.addAddress);
user_route.get('/editaddress',auth.isLogin,userController.loadeditAddress);
user_route.post('/editaddress',userController.editAddress)
user_route.get('/deleteaddress',auth.isLogin,userController.deleteAddress);

// for cart 
user_route.get('/cart',auth.isLogin,cartController.loadAndShowCart);
user_route.get('/addCouponToCart', auth.isLogin,cartController.addCouponToCart);
user_route.get('/removeCouponFromCart', auth.isLogin,cartController.removeCouponFromCart);
user_route.post('/add-to-cart',auth.isLogin,cartController.addTocart);
user_route.post('/increaseQty',auth.isLogin,cartController.increaseQuantity);
user_route.post('/decreaseQty',auth.isLogin,cartController.decreaseQuantity);
user_route.post('/cart-delete',auth.isLogin,cartController.deleteCart);

// for checkout
user_route.get('/checkout',auth.isLogin,checkoutController.loadcheckout);
user_route.post('/checkout',auth.isLogin,checkoutController.Postcheckout);
user_route.post("/updatepayment",auth.isLogin,checkoutController.updatepaymentStatus);
user_route.post("/repayAmount",auth.isLogin,checkoutController.repayAmountNow);

// for order
user_route.get('/orderconfirmed',auth.isLogin,checkoutController.loadorderconfirmed);
user_route.get('/orderdetails',auth.isLogin,checkoutController.loadorderdetails);
user_route.post('/cancelOrder',auth.isLogin,userController.cancelOrder);
user_route.post('/returnOrder',auth.isLogin,userController.returnOrder);

//for wishlist
user_route.get('/wishlist',auth.isLogin,wishlistController.loadWishlist);
user_route.get('/addtowishlist',auth.isLogin,wishlistController.addToWishlist);
user_route.get('/removeWishlist',auth.isLogin,wishlistController.removeWishlist);

//for refferal offer
user_route.get("/refferals", auth.isLogin,userController.getRefferals);
user_route.post('/add-to-wallet', userController.rewardRefferalToWallet);

//for invoice
user_route.get("/loadInvoice",auth.isLogin,userController.loadInvoice)
user_route.get('/pdf',auth.isLogin,checkoutController.invoice);

module.exports = user_route;
