const express = require("express");
const admin_route = express();
const config = require("../config/config");

const bodyParser = require("body-parser");
admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));

admin_route.use(express.static('public'));
admin_route.set("view engine","ejs");
admin_route.set("views","./views/admin");

admin_route.use((req,res,next)=>{
  res.set('Cache-Control','no-store,no-cache,must-revalidate,private');
  next();
});

const multer = require("multer"); 
const path = require('path');

const storage=multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,'./public/productImages');
  
  },
  filename:function(req,file,cb){
    cb(null,file.originalname);
  }
  });

const upload=multer({storage:storage}).array('images', 3);

const auth = require("../middleware/adminAuth");
const adminController = require("../controllers/adminController");
const productController = require("../controllers/productController");
const categoryController = require("../controllers/categoryController");
const couponController = require("../controllers/couponController");
const adminPart2Controller = require("../controllers/adminPart2Controller");
const salesReportController = require("../controllers/salesReportController");

admin_route.get('/',auth.isLogout,adminController.loadLogin);
admin_route.post('/',adminController.verifyLogin);

admin_route.get('/home',auth.isLogin,adminController.getDashboard);
admin_route.get("/bestSelling",auth.isLogin,adminController.getBestSelling);
admin_route.get("/chart",auth.isLogin,adminController.getChartData);

admin_route.get('/logout',auth.isLogin,adminController.logout);

// customer management
admin_route.get('/customers',auth.isLogin,adminController.customersList);
admin_route.post('/block-user/:userId', auth.isLogin, adminController.blockUser);
admin_route.post('/unblock-user/:userId', auth.isLogin, adminController.unblockUser);

// category management
admin_route.get('/category',auth.isLogin,adminController.loadCategory);
admin_route.post('/category',auth.isLogin,categoryController.createCategory);
admin_route.get('/edit-cate',auth.isLogin,categoryController.editCategoryLoad);
admin_route.post('/edit-cate',categoryController.updateCate);
admin_route.get('/delete-cate', auth.isLogin, categoryController.deleteCategory);
admin_route.get('/restore-cate', auth.isLogin, categoryController.restoreCategory);

// product managment
admin_route.get('/product',auth.isLogin,productController.loadProduct);
admin_route.get('/add-product',productController.addProductpage);
admin_route.post('/add-product',upload,productController.addProduct);
admin_route.get('/delete', auth.isLogin, productController.deleteProduct);
admin_route.get('/restore', auth.isLogin, productController.restoreProduct);
admin_route.get('/editproduct',auth.isLogin,productController.loadEdit);
admin_route.post('/editproduct',upload,productController.editProduct);
admin_route.get('/search',productController.searchProductView);

//stock management
admin_route.get("/stocks", productController.getStocks);
admin_route.post("/updateStock", productController.updateStock);
admin_route.get("/searchStock", productController.searchStock);

//order management
admin_route.get('/order',auth.isLogin,adminController.loadorder);
admin_route.get('/adminorderdetails',auth.isLogin,adminController.loadorderdetails);
admin_route.post('/acceptcancel',adminController.requestAccept);
admin_route.post('/rejectcancel',adminController.requestCancel);
admin_route.post('/updateorderstatus',adminController.updateorder);

//coupon management
admin_route.get('/coupon',auth.isLogin,couponController.listCoupons);
admin_route.get('/createcoupon',auth.isLogin,couponController.loadcreatecoupon);
admin_route.post('/createcoupon',couponController.createCoupon);
admin_route.post('/togglecoupon',couponController.deleteCouponStatus);

// Category Offer
admin_route.get('/loadCategoryOffer',auth.isLogin,adminPart2Controller.loadCategoryOfferPage);
admin_route.get('/loadAddCategoryOffer',auth.isLogin,adminPart2Controller.loadAddCategoryOffer);
admin_route.post('/postCategoryOffer',adminPart2Controller.addCategoryOffer);
admin_route.get('/delete-cateOff',auth.isLogin,adminPart2Controller.deleteCategoryOffer)
admin_route.get('/restore-cateOff',auth.isLogin,adminPart2Controller.restoreCategoryOffer)
admin_route.get('/editCategoryOffer',auth.isLogin,adminPart2Controller.loadEditCategoryOffer);
admin_route.post('/updateCategoryOffer',adminPart2Controller.updateCategoryOffer)

// Product Offer
admin_route.get('/loadProductOffer',auth.isLogin,adminPart2Controller.loadProductOfferPage);
admin_route.get('/loadAddProductOffer',auth.isLogin,adminPart2Controller.loadAddProductOffer);
admin_route.post('/PostProductOffer',auth.isLogin,adminPart2Controller.addingProductOffer);
admin_route.post('/block-offer/:id',auth.isLogin,adminPart2Controller.deleteProductOffer);
admin_route.post('/unblock-offer/:id',auth.isLogin,adminPart2Controller.restoreProductOffer);
admin_route.get('/editProductOffer',auth.isLogin,adminPart2Controller.loadEditProductOffer);
admin_route.post('/updateProductOffer',auth.isLogin,adminPart2Controller.updateProductOffer);

// sales report
admin_route.get('/loadSalesReport',auth.isLogin,salesReportController.loadSalesReport);
admin_route.post('/salesReportSelectFilter',auth.isLogin,salesReportController.filterReport);
admin_route.post('/fileterDateRange',auth.isLogin,salesReportController.filterCustomDateOrder)

admin_route.get('*',function(req,res){
    res.redirect('/admin');
});

module.exports = admin_route;