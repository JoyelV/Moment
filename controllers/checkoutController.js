const productModel = require("../models/productModel");
const User = require("../models/userModel");
const cartModel = require("../models/cartModel");
const addressModel = require("../models/addressModel");
const orderModel = require("../models/orderModel")
const wishlistModel = require("../models/wishlistModel");
const walletModel = require("../models/walletModel");
const ProductOfferModel = require("../models/productOfferModel");
const CategoryOfferModel = require("../models/categoryOfferModel");
const {couponModel}=require('../models/couponModel');
const easyinvoice = require("easyinvoice");
const randomstring = require("randomstring");
const Razorpay = require('razorpay');
const crypto = require('crypto');

var instance = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret:process.env.RAZORPAY_SECRET_KEY,
});

const updatepaymentStatus = async (req, res) => {
        try {
            const { razorpay_payment_id, orderID,data } = req.body;
            console.log("reqbody",req.body);

            const paymentOption = data.paymentOption;
            console.log("paymentOption",paymentOption);
            
            const address = data.addressType ;
            if (!paymentOption) {
                return res.status(400);
            }
            if (!address) {
                return res.status(400);
            }

            const user = await User.findById(req.session.user_id);
    
                const cart = await cartModel.findOne({ owner: user._id }).populate({ path: 'items.productId', model: 'Products' });
                if (!cart) {
                    return res.status(400).json({ message: "Cart not found" });
                }
        
                const OrderAddress = await addressModel.findOne({ user: user._id });
                if (!OrderAddress) {
                    return res.status(400).json({ message: "Address not found" });
                }
        
                const addressdetails = OrderAddress.addresses.find(
                    (item) => item.addressType === address
                );
                if (!addressdetails) {
                    return res.status(400).json({ message: "Invalid address ID" });
                }
        
                const selectedItems = cart.items;
        
                for (const item of selectedItems) {
                    const product = await productModel.findOne({ _id: item.productId });
        
                    if (product.countInStock === 0) {
                        return res.status(400).json({ message: "product Out of stock" });
                    }
                    if (product) {
                        if (product.countInStock >= item.quantity) {
                            product.countInStock -= item.quantity;
                            
                            console.log("product countInstock:",product.countInStock);
                            await product.save();
                        }
                        
                    } else {
                        console.log('Product not found');
                    }
                }    

            if (req.body.paymentStatus === 'success') {

                const orderData = new orderModel({
                    user: user._id,
                    cart: cart._id,
                    billTotal: cart.billTotal,
                    oId: orderID,
                    paymentStatus: "Success",
                    paymentMethod: paymentOption,
                    deliveryAddress: addressdetails,
                    deliveryCharges : cart.billTotal/10,
                    discountPrice: cart.discountPrice,
                    coupon : cart.coupon,
                    specialDiscountPercentage: 0,
                });
        
                const selectedItem = cart.items;
        
                var sum = 0;
                for (const item of cart.items) {
                    const productId = item.productId;
        
                    const proOffer = await ProductOfferModel.findOne({ 'productOffer.product': productId, 'productOffer.offerStatus': true });
        
                    var specialDiscount = 0;
                    if (proOffer) {
                        specialDiscount = proOffer.productOffer.discount;
                    }

            const proData = await productModel.findOne({_id:productId});

            const cateOffer = await CategoryOfferModel.findOne({
                'categoryOffer.category': proData.category,
                "is_active": true
              });

            if(cateOffer){
                specialDiscount += cateOffer.categoryOffer.discount;
            }
                    
                    const products = await productModel.findOne({_id:productId});
                    var itemPrice = products.discountPrice - (products.discountPrice*specialDiscount)/100;
                    item.price = itemPrice;
                    sum += itemPrice * item.quantity;
                }
        
                orderData.billTotal = sum + cart.deliveryCharges;
                orderData.specialDiscount = specialDiscount;
        
                for (const item of selectedItem) {
                    orderData.items.push({
                        productId: item.productId._id,
                        image: item.productId.images[0],
                        name: item.productId.name,
                        productPrice: item.productId.price,
                        quantity: item.quantity,
                        price: item.price
                    })
                }
        
                await orderData.save();
        
                cart.items = [];
                cart.isApplied = false;
                cart.coupon = 'nil';
                await cart.save();
    
                res.status(200).json({ message: 'Payment successful' });
            } else {
                const orderData = new orderModel({
                    user: user._id,
                    cart: cart._id,
                    billTotal: cart.billTotal,
                    oId: orderID,
                    paymentStatus: "Failed",
                    paymentMethod: paymentOption,
                    deliveryAddress: addressdetails,
                    deliveryCharges : cart.billTotal/10,
                    discountPrice: cart.discountPrice,
                    coupon : cart.coupon,
                    specialDiscountPercentage: 0,
                });
        
                const selectedItem = cart.items;
        
                var sum = 0;
                for (const item of cart.items) {
                    const productId = item.productId;
        
                    const proOffer = await ProductOfferModel.findOne({ 'productOffer.product': productId, 'productOffer.offerStatus': true });
        
                    var specialDiscount = 0;
                    if (proOffer) {
                        specialDiscount = proOffer.productOffer.discount;
                    }

            const proData = await productModel.findOne({_id:productId});

            const cateOffer = await CategoryOfferModel.findOne({
                'categoryOffer.category': proData.category,
                "is_active": true
              });

            if(cateOffer){
                specialDiscount += cateOffer.categoryOffer.discount;
            }
                    
                    const products = await productModel.findOne({_id:productId});
                    var itemPrice = products.discountPrice - (products.discountPrice*specialDiscount)/100;
                    item.price = itemPrice;
                    sum += itemPrice * item.quantity;
                }
        
                orderData.billTotal = sum + cart.deliveryCharges;
                orderData.specialDiscount = specialDiscount;
        
                for (const item of selectedItem) {
                    orderData.items.push({
                        productId: item.productId._id,
                        image: item.productId.images[0],
                        name: item.productId.name,
                        productPrice: item.productId.price,
                        quantity: item.quantity,
                        price: item.price
                    })
                }
        
                await orderData.save();
        
                cart.items = [];
                cart.isApplied = false;
                cart.coupon = 'nil';
                await cart.save();
    
                res.status(200).json({ message: 'Payment failed, Order placed, pay within one working days' });
            }
    
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).json({ message: 'Error verifying payment' });
        }
};

const repayAmountNow = async(req,res)=>{
    try{
        const { paymentStatus,orderID} = req.body;

        const orderData = await orderModel.findOne({oId:orderID});
        if(paymentStatus === 'success'){
            orderData.paymentStatus = "Success";
            orderData.save();
            return res.status(200).json({ message: 'Payment success, order shipped within two working days' });
        }
        if(paymentStatus === 'failure'){
            res.status(200).json({ message: 'Payment failed, try again' });
        }

    }catch (error) {
        console.error('Error in payment submission:', error);
        res.status(500).json({ message: 'Error in payment submission:' });
    }
};

const loadcheckout = async (req, res) => {
    try {
      let address = await addressModel.findOne({
        user: req.session.user_id
      }) || null;
  
      const cart = await cartModel.findOne({
        owner: req.session.user_id
      }).populate({ path: 'items.productId', model: 'Products' }) || null;
  
      if (!cart) {
        userCart = { items: [], billTotal: 0 }; 
    }
  
      var sum = 0;
      for (const item of cart.items) {
        const productId = item.productId;
  
        const product = await productModel.findOne({ _id: productId, is_deleted: false });
        if (!product) {
            await cartModel.updateOne(
                { owner: req.session.user_id },
                { $pull: { items: { productId: productId } } }
            );
            continue;
        }
  
        const proOffer = await ProductOfferModel.findOne({ 'productOffer.product': productId, 'productOffer.offerStatus': true });
  
        let specialDiscount = 0;
        if (proOffer) {
          specialDiscount += proOffer.productOffer.discount;
        }
  
        const cateOffer = await CategoryOfferModel.findOne({
          'categoryOffer.category': product.category,
          "is_active": true
        });
  
        if (cateOffer) {
          specialDiscount += cateOffer.categoryOffer.discount;
        }
  
        let couponApplied = await couponModel.findOne({ code: cart.coupon });
        let couponDiscount = couponApplied ? couponApplied.discountPercentage : 0;
  
        var itemPrice = product.discountPrice - (product.discountPrice * specialDiscount) / 100 - (product.discountPrice * couponDiscount) / 100;
  
        item.price = itemPrice;
        sum += itemPrice * item.quantity;
      }
  
      cart.billTotal = sum;
  
      const user = await User.findById(req.session.user_id);
      res.render('checkout', { user, address, cart });
    } catch (error) {
      console.log('loadcheckout', error.message);
    }
  };
  

async function generateUniqueOrderID() {

    const randomPart= randomstring.generate({
        length: 6,
        charset: 'numeric',
      });
   
    const currentDate = new Date();
    const datePart = currentDate.toISOString().slice(0, 10).replace(/-/g, "");
    const orderID = `ID_${randomPart}${datePart}`;
  
    return orderID;
}

const loadorderconfirmed = async (req, res) => {
    const orderId = req.query.id; 
    try {
        const order = await orderModel.findOne({oId:orderId});
        console.log("order in loadorderconfirmed:",order);

        if (!order) {
            return res.status(404);
        }
        res.render('orderconfirmed', { order: order }); 
    } catch (error) {
        console.error("Error retrieving order:", error);
        res.status(500).render('errorPage', { message: "An error occurred while retrieving the order." });
    }
};

const Postcheckout = async (req, res) => {
    try {
        const paymentOption = req.body.paymentOption;
        console.log("paymentOption",paymentOption);
        
        const address = req.body.addressType ;
        if (!paymentOption) {
            return res.status(400);
        }
        if (!address) {
            return res.status(400);
        }

    if(paymentOption === 'COD'){
        const user = await User.findById(req.session.user_id);

        const cart = await cartModel.findOne({ owner: user._id }).populate({ path: 'items.productId', model: 'Products' });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }

        const OrderAddress = await addressModel.findOne({ user: user._id });
        if (!OrderAddress) {
            return res.status(400).json({ message: "Address not found" });
        }

        const addressdetails = OrderAddress.addresses.find(
            (item) => item.addressType === address
        );
        if (!addressdetails) {
            return res.status(400).json({ message: "Invalid address ID" });
        }

        const selectedItems = cart.items;

        for (const item of selectedItems) {
            const product = await productModel.findOne({ _id: item.productId });

            if (product.countInStock === 0) {
                return res.status(400).json({ message: "product Out of stock" });
            }
            if (product) {
                if (product.countInStock >= item.quantity) {
                    product.countInStock -= item.quantity;
                    
                    console.log("product countInstock:",product.countInStock);
                    await product.save();
                }
                
            } else {
                console.log('Product not found');
            }
        }
        var order_id = await generateUniqueOrderID();

        const orderData = new orderModel({
            user: user._id,
            cart: cart._id,
            billTotal: cart.billTotal,
            oId: order_id,
            paymentStatus: "Success",
            paymentMethod: paymentOption,
            deliveryAddress: addressdetails,
            discountPrice: cart.discountPrice,
            coupon : cart.coupon,
            specialDiscountPercentage: 0,
        });

        const selectedItem = cart.items;

        var sum = 0;
        for (const item of cart.items) {
            const productId = item.productId;

            const proOffer = await ProductOfferModel.findOne({ 'productOffer.product': productId, 'productOffer.offerStatus': true });

            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount += proOffer.productOffer.discount;
            }

            const proData = await productModel.findOne({_id:productId});

            const cateOffer = await CategoryOfferModel.findOne({
                'categoryOffer.category': proData.category,
                "is_active": true
              });

            if(cateOffer){
                specialDiscount += cateOffer.categoryOffer.discount;
            }
            
            const products = await productModel.findOne({_id:productId});
            var itemPrice = products.discountPrice - (products.discountPrice*specialDiscount)/100;
            item.price = itemPrice;
            sum += itemPrice * item.quantity;
        }

        orderData.billTotal = sum + cart.deliveryCharges;
        orderData.specialDiscount = specialDiscount;

        for (const item of selectedItem) {
            orderData.items.push({
                productId: item.productId._id,
                image: item.productId.images[0],
                name: item.productId.name,
                productPrice: item.productId.price,
                quantity: item.quantity,
                price: item.price
            })
        }

        await orderData.save();

        cart.items = [];
        cart.isApplied = false;
        cart.coupon = 'nil';
        await cart.save();

    }
    else if(paymentOption === 'Wallet') {
        var order_id = await generateUniqueOrderID();

        const user = await User.findById(req.session.user_id);

        const cart = await cartModel.findOne({ owner: user._id }).populate({ path: 'items.productId', model: 'Products' });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }

        const OrderAddress = await addressModel.findOne({ user: user._id });
        if (!OrderAddress) {
            return res.status(400).json({ message: "Address not found" });
        }

        const addressdetails = OrderAddress.addresses.find(
            (item) => item.addressType === address
        );
        if (!addressdetails) {
            return res.status(400).json({ message: "Invalid address ID" });
        }

        const selectedItems = cart.items;

        for (const item of selectedItems) {
            const product = await productModel.findOne({ _id: item.productId });

            if (product.countInStock === 0) {
                return res.status(400).json({ message: "product Out of stock" });
            }
            if (product) {
                if (product.countInStock >= item.quantity) {
                    product.countInStock -= item.quantity;
                    
                    console.log("product countInstock:",product.countInStock);
                    await product.save();
                }
                
            } else {
                console.log('Product not found');
            }
        }

        const userWallet = await walletModel.findOne({ user: user._id });
        console.log("userWallet",userWallet);
        const totalPriceOfCart = cart.billTotal;
    
        if (!userWallet || userWallet.amount < totalPriceOfCart) {
            return res.status(400).json({ message: "Insufficient funds in wallet" });
        }
    
        userWallet.amount -= totalPriceOfCart;
        userWallet.transaction.push({
            date: new Date(),
            paymentMethod: 'wallet',
            amount: totalPriceOfCart,
            paymentStatus: 'debit'
        });
        await userWallet.save();
    
        const orderData = new orderModel({
            user: user._id,
            cart: cart._id,
            billTotal: cart.billTotal,
            oId: order_id,
            paymentMethod: paymentOption,
            paymentStatus: "Success",
            deliveryAddress: addressdetails,
            deliveryCharges : cart.billTotal/10,
            discountPrice: cart.discountPrice,
            coupon : cart.coupon,
            specialDiscountPercentage: 0,
        });

        const selectedItem = cart.items;

        var sum = 0;
        for (const item of cart.items) {
            const productId = item.productId;

            const proOffer = await ProductOfferModel.findOne({ 'productOffer.product': productId, 'productOffer.offerStatus': true });

            var specialDiscount = 0;
            if (proOffer) {
                specialDiscount = proOffer.productOffer.discount;
            }
            const proData = await productModel.findOne({_id:productId});

            const cateOffer = await CategoryOfferModel.findOne({
                'categoryOffer.category': proData.category,
                "is_active": true
              });

            if(cateOffer){
                specialDiscount += cateOffer.categoryOffer.discount;
            }

            const products = await productModel.findOne({_id:productId});
            var itemPrice = products.discountPrice - (products.discountPrice*specialDiscount)/100;
            item.price = itemPrice;
            sum += itemPrice * item.quantity;
        }

        orderData.billTotal = sum + cart.deliveryCharges;
        orderData.specialDiscount = specialDiscount;

        for (const item of selectedItem) {
            orderData.items.push({
                productId: item.productId._id,
                image: item.productId.images[0],
                name: item.productId.name,
                productPrice: item.productId.price,
                quantity: item.quantity,
                price: item.price
            })
        }

        await orderData.save();

        cart.items = [];
        cart.isApplied = false;
        cart.coupon = 'nil';
        await cart.save();

    }else if(paymentOption === 'razorpay'){
        var order_id = await generateUniqueOrderID();
    }
      res.status(200).json({order_id});
    } catch (error) {
        console.log('Post checkout error:', error.message);
        res.status(500).json({ message: "Internal server error" });
        res.redirect('/home');
    }
};

const loadorderdetails = async (req, res) => {
    try {
        const orderId = req.query.id
        const order = await orderModel.findOne({ _id:orderId });
        console.log(order);
  
        res.render('orderdetails', { order });
    } catch (error) {
        console.log('loadorderdetails Error:', error.message);
    }
};

const invoice = async (req, res) => {
    try {
      const id = req.query.id;
      console.log("in loadinvoice download:",id)
      const findOrder = await orderModel.findById({ _id: id }).populate({ path: 'items.productId', model: 'Product' });

      var user = await User.findOne({_id:findOrder.user});
      console.log("username:",user);
  
      if (!findOrder) {
        return res.status(404).send('Order not found');
      }
  
      let pdttotal = 0;
      for (let i = 0; i < findOrder.items.length; i++) {
        pdttotal += findOrder.items[i].subTotal;
      }
      const discountAmount = (pdttotal * (findOrder.discount / 100)).toFixed(2);
      const discount = findOrder.discount;
      const vatRate = (discount / 100); 
      const vatAmount = pdttotal * vatRate;
      const totalWithVAT = pdttotal - vatAmount;
      const data = {
        "documentTitle": "INVOICE", 
        "currency": "INR",
        "taxNotation": "gst", 
        "marginTop": 25,
        "marginRight": 25,
        "marginLeft": 25,
        "marginBottom": 25,
        "logo": "adminassets/imgs/brands/7d02989082b082e58141cce8a7536ee3.jpg", 
        "background": "adminassets/imgs/brands/7d02989082b082e58141cce8a7536ee3.jpg", 
        "sender": {
            "company": "Moment",
            "address": "Brototype Hub, Maradu,Kochi,Ernakulam,Kerala",
            "zip": "682028",
            "city": "Kochi",
            "country": "India" 
        },
        "client": {
            "company": user.name,
            "address": findOrder.deliveryAddress[0].HouseNo,
            "Landmark": findOrder.deliveryAddress[0].Landmark,
            "district": findOrder.deliveryAddress[0].district,
            "zip": findOrder.deliveryAddress[0].pincode,
            "city": findOrder.deliveryAddress[0].city,
            "country": findOrder.deliveryAddress[0].Country 
        },
        "products": findOrder.items.map(item => ({
            "quantity": item.quantity.toString(),
            "description": item.name,
            "price": item.price / item.quantity,
        })),
        "discountApplied": {
            "couponCode": findOrder.coupon        }
      };
  
      const result = await easyinvoice.createInvoice(data);    
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=myInvoice.pdf');
      res.send(Buffer.from(result.pdf, 'base64'));
    } catch (error) {
      console.error('Error generating invoice:', error.message);
      res.status(500).send('Error generating invoice');
    }
};

module.exports = {
    loadcheckout,
    generateUniqueOrderID,
    Postcheckout,
    loadorderconfirmed,
    loadorderdetails,
    invoice,
    updatepaymentStatus,
    repayAmountNow,
}