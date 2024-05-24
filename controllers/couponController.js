const {couponModel} = require('../models/couponModel');
const cartModel = require('../models/cartModel');
const User=require('../models/userModel');
const { logout } = require('./adminController');

const listCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({});
       res.render('listCoupon',{coupons})
    } catch (error) {
        console.error("Error listing coupons:", error.message);
        res.status(500).json({ success: false, message: "Error listing coupons." });
    }
};


const loadcreatecoupon = async(req,res)=>{
    try{
        res.render('createCoupon');
    }catch(error){
        console.log(error.message);
    }
}

const createCoupon = async (req, res) => {
    console.log("calling create coupon")
    try {
        const {
            code,
            description,
            discountPercentage,
            minPurchaseAmount,
            maxPurchaseAmount,
            expirationDate,
            maxUsers
        } = req.body;
        console.log(req.body,'coupon from body');
        if(discountPercentage>=5 && discountPercentage<75 && minPurchaseAmount>0 && maxPurchaseAmount>0){
            const newCoupon = new couponModel({
                code,
                description,
                minimumAmount: minPurchaseAmount,
                maximumAmount: maxPurchaseAmount,
                discountPercentage:discountPercentage,
                expirationDate: new Date(expirationDate),
                maxUsers
            });
            await newCoupon.save();
            console.log(await newCoupon.save(),"coupon saved");
            return res.status(200).json({ success: true, message: "Coupon created successfully." });
        }

        res.status(200).json({ success: false, message: "Coupon not created, enter details as per instructed" });
        }catch (error) {
            console.error("Error creating coupon:", error.message);
            res.status(500).json({ success: false});
        }
        
};

const deleteCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.body;
        // await couponModel.findByIdAndUpdate(couponId, { isActive: isActive });
        await couponModel.findByIdAndDelete(couponId);
        res.status(200).json({ success: true, message: "Coupon deleted successfully." });

    } catch (error) {
        console.error("Error toggling coupon status:", error.message);
        res.status(500).json({ success: false, message: "Failed to toggle coupon status." });
    }
};


module.exports = {
    loadcreatecoupon,
    createCoupon,
    listCoupons,
    deleteCouponStatus
}