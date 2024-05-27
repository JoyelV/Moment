const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const otpgenerator = require("otp-generator"); 
const config = require("../config/config");
const randomstring = require("randomstring");
const productModel = require("../models/productModel");
const categoryModel = require('../models/categoryModel');
const addressModel = require("../models/addressModel");
const orderModel = require("../models/orderModel");
const Wallet = require('../models/walletModel');
const cartModel = require("../models/cartModel");
const walletModel = require("../models/walletModel");
const couponModel = require("../models/couponModel");

const securePassword = async(password)=>{

    try{
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    } catch(error){
        throw error; 
    }
}

const sendInsertOtp = async (email, otp) => {
    try{
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure:false,
            requireTLS: true,
            auth: {
                user:config.emailUser,
                pass:config.emailPassword
            }
        });
        const mailOptions = {
            from : config.emailUser,
            to: email,
            subject: 'Your one time password',
            html:`Hi, Your OTP is ${otp}`
        }
        transporter.sendMail(mailOptions,function(error,info){
            if(error){
                console.log(error);
            }
            else{
                console.log("email has been sent:-",info.response);
            }
        })
    }catch (error){
        console.log(error.message);
    }
};


//for reset password send mail
const sentResetPasswordMail = async(name,email,token)=>{
    try{
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure:false,
            requireTLS: true,
            auth: {
                user:config.emailUser,
                pass:config.emailPassword
            }
        });
        const mailOptions = {
            from : config.emailUser,
            to: email,
            subject: 'For reset Password',
            html:'<p>Hii'+name+',please click here to <a href="http://127.0.0.1:4002/forget-password?token='+token+'">Reset </a> your password</p>',
        }
        transporter.sendMail(mailOptions,function(error,info){
            if(error){
                console.log(error);
            }
            else{
                console.log("email has been sent:-",info.response);
            }
        })
    }catch (error){
        console.log(error.message);
    }
}
const loadRegister = (req,res)=>{
   try{

    res.render('registration');

   } catch (error){
    console.log(error.message);
   }
}

const generateOTP = () => {
    const OTP = otpgenerator.generate(6,{
        upperCaseAlphabets:false,
        specialChars:false,
        lowerCaseAlphabets:false,
        digits:true
    });
    return { OTP, timestamp: Date.now() };
};

const insertUser = async (req, res) => {
    try {
        const { OTP, timestamp } = generateOTP();
        console.log(OTP);
        console.log("req.body",req.body);
        req.session.Data = { ...req.body, otp: OTP, timestamp };
        req.session.save();
        await sendInsertOtp(req.body.email, OTP);
        res.redirect('/verifyOTP');

    } catch (error) {
        console.log('otp',error.message);
    }
};

const loadOtp = async (req, res) => {
    try {
        res.render('verifyOTP',{message:"OTP sent to given mail id, Please check and verify"});
    } catch (error) {
        console.log(error.message);
    }
}

const getOtp = async(req,res)=>{
    try{
        const otpInBody = req.body.otp;
        const { otp, timestamp } = req.session.Data;

        const currentTime = Date.now();
        const timeDifferenceInSeconds = (currentTime - timestamp) / 1000;
        if (timeDifferenceInSeconds > 60) {
            res.render('verifyOTP',{message:"OTP expired, please click on resend otp"});
        }

        if(otpInBody === otp){
            var {name,email,mobile,password,referral} = req.session.Data
            console.log("referral",referral);
            const passwordHash = await securePassword(req.session.Data.password);
            const existingUser = await User.findOne({email:email})

            if(!existingUser){
                const user = new User({
                    name: name,
                    email: email,
                    mobile: mobile,
                    password: passwordHash,
                    is_admin: 0,
                    is_varified: 1
                });

                let refferal = referral;
                console.log("referral",referral);
                var referralExists = await User.findOne({referralCode:refferal});
                console.log("referralExists", referralExists);

                if(referralExists){
                    user.refferalRewards = 100;
                    await User.findOneAndUpdate(
                        { referralCode: refferal },
                        { 
                            $inc: { refferalRewards: 100 }, 
                            $push: {
                                successfullRefferals: { date: new Date(), username: name, status: 'user registered' }
                            },
                        }
                    );                
                }                
                await user.save();    
                return res.render('login',{message:"User registered successfully"}); 
            }
            else{
                return res.render('registration',{message:"User Email exists, try another email id"}); 
            }
        }
        else{
            res.render('verifyOTP',{message:"Enter Valid OTP"});
        }
    } catch (error) {
        console.log('Error in OTP verification:', error);
        return res.render('verifyOTP', { message: 'An error occurred during OTP verification. Please try again later.' });
    }
};

let resendOtp = async (req, res) => {
    try {
        const { email } = req.session.Data;
        const { OTP, timestamp } = generateOTP();
        // console.log(email, OTP);
        req.session.Data.otp = OTP;
        req.session.Data.timestamp = timestamp;
        await sendInsertOtp(email, OTP);

        res.status(200).json({
            status: true
        });
              
    } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).json({
        status: false,
        message: 'Error resending OTP'
      });
    }
  };

const loginLoad = async(req,res)=>{

    try{
        res.render('login',{message:"Please login for better user experience"});
        
    } catch(error) {
        console.log(error.message);
    }
}

const verifyLogin = async (req, res) => {
try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ email:email });
        if(!userData){
            return res.render('login', { message: "Email and password is incorrect" });
            }
        // console.log(userData.block );
        if(userData.block === '1'){
            return res.render('login',{message:"User is blocked"})
        }

        if (userData.is_admin === 1) {
            return res.render('login',{message:"Admin is blocked"})
        }
        
        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);

            if (passwordMatch) {
                if (userData.is_varified === '0') {
                    return res.render('login', { message: "Email and password is incorrect" });
                }
                else{

                    req.session.user_id=userData._id;
                    console.log("user_id:",req.session.user_id);
                    console.log("session:",req.session);
                    const product= await productModel.find({ is_deleted: { $ne:'true'}}).limit(4);
                    await User.findByIdAndUpdate({_id:userData._id},{$set:{status:1}});
                    let userCart = await cartModel.findOne({ owner: req.session.user_id });

                    if (!userCart) {
                    userCart = new cartModel({
                    owner: req.session.user_id,
                    items: [],
                    billTotal: 0,
                    });
                    }
                    userCart.save();
                    return res.render('home',{user_id: req.session.user_id,product:product})
                }
        } else {
                return res.render('login', { message: "Email and password is incorrect" });
            }
        }
       
    } catch (error) {
        console.log(error.message);
        return res.status(500).render('error', { message: "An error occurred during login." });
    }
};

const loadLandPage = async(req,res)=>{
    try {
        const products = await productModel
            .find({ is_deleted: { $ne: true } })
            .sort({ createdAt: -1 }) 
            .limit(4); 

        res.render('landingPage', { product:products});
        
    } catch (error) {
        console.log(error.message)
    }
}

// user home page 
const loadHome = async(req,res)=>{
    try {
        
        if(req.session.passport){
        req.session.user_id = req.session.passport.user;
        
        let userCart = await cartModel.findOne({ owner: req.session.user_id });
        if (!userCart) {
            userCart = new cartModel({
                owner: req.session.user_id,
                items: [],
                billTotal: 0,
            });
        }
        userCart.save();
        }

        const products = await productModel
            .find({ is_deleted: { $ne: true } })
            .sort({ createdAt: -1 }) 
            .limit(4); 

        res.render('home', { product:products});
        
    } catch (error) {
        console.log(error.message)
    }
}

const userLogout = async(req, res) => {
    try {
        await User.findByIdAndUpdate({_id:req.session.user_id},{$set:{status:0}});
        req.session.destroy();

        res.render('login',{message:"User logged out, please login to checkout our new arrivals"})
    } catch (error) {
        console.log(error.message);
    }
}

//forgot password code start
const forgetLoad = async(req,res)=>{
    try{
        res.render('forget');
    }
    catch(error){
       console.log(error.message);
    }
}

const forgetverify = async(req,res)=>{
    try{
      const email = req.body.email; 
      const userData = await User.findOne({email:email}); 
      if(userData){ 
          if(userData.is_varified === 0){ 
            res.render('forget',{message:"Please verify email"}); 
          } 
          else{ 
        const randomString = randomstring.generate(); 
        const updatedData = await User.updateOne({email:email},{$set:{ token:randomString }});
        sentResetPasswordMail(userData.name,userData.email,randomString); 
        res.render('forget',{message:"Please check your mail to reset password"});         
      }
    }
    else{
        res.render('forget',{message:"User email is incorrect"});
    }
    }catch(error){
        console.log(error.message); 
    }
}

const forgetPasswordLoad = async(req,res)=>{
    try{

        const token = req.query.token;
        const tokenData = await User.findOne({token:token});
        if(tokenData){
            res.render('forgetPassword',{user_id:tokenData._id});
        }
        else{
            res.render('404',{message:"Token is invalid"});
        }
    } catch (error){
        console.log(error.message);
    }
}

const resetPassword = async (req, res) => {
    try {
        const password = req.body.password;
        const user_id = req.body.user_id;

        const secure_password = await securePassword(password);

        const updatedData = await User.findByIdAndUpdate({_id: user_id}, {$set: {password: secure_password}});
      
        res.status(200).send("Password updated successfully. Please login with your new password.");

    } catch (error) {
        console.log(error.message);

        res.status(500).send("An error occurred while updating the password.");
    }
}

const loaduserprofile = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const totalOrdersCount = await orderModel.countDocuments({ user: req.session.user_id });
        const totalPages = Math.ceil(totalOrdersCount / limit);
        const skip = (page - 1) * limit;

        let address = await addressModel.findOne({ user: req.session.user_id }) || null;
        const orders = await orderModel.find({ user: req.session.user_id }).skip(skip).limit(limit).sort({orderDate:-1}) || [];

        const user = await User.findById(req.session.user_id);
        const userId = req.session.user_id; 
        const wallet = await Wallet.findOne({ user: userId }).populate('user');

        if (req.query.ajax) {
            res.json({ orders, totalPages, currentPage: page,wallet });
        } else {
            res.render('userProfile', { user, address, orders, totalPages, currentPage: page, wallet, message: "User registered successfully" });
        }
    } catch (error) {
        console.log('loaduserProfile Error:', error.message);
    }
};
  
const editprofile = async (req, res) => {
    try {
      let address = await addressModel.findOne({ user: req.session.user_id }) || null;
      const { name, mobile, email } = req.body;
  
      const existemail = await User.findOne({ email: email });
      const user = await User.findById(req.session.user_id);
      const page = parseInt(req.query.page) || 1;
      const limit = 8;

      const totalOrdersCount = await orderModel.countDocuments({ user: req.session.user_id });
      const totalPages = Math.ceil(totalOrdersCount / limit);
      const skip = (page - 1) * limit;

      const orders = await orderModel.find({ user: req.session.user_id }).skip(skip).limit(limit).sort({orderDate:-1}) || [];

      const wallet = await Wallet.findOne({ user: req.session.user_id }).populate('user');
  
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.session.user_id },
        {
          $set: {
            name: name,
            mobile: mobile,
          }
        },
        { new: true }
      );
    
      if (updatedUser) {
        return res.render('userProfile', { orders,totalPages, currentPage: page,message: 'Updated successfully!', user: updatedUser, address, orders,wallet });
      } else {
        return res.render('userProfile', { orders,totalPages, currentPage: page,error: 'Failed to update user details.', user: user, address, orders,wallet });
      }
    } catch (error) {
      console.log('editprofile', error.message);
    }
  };
  
    
const loadaddaddress = async(req,res)=>{
      try{
        
        const orders = await orderModel.find({ user: req.session.user_id }).sort({orderDate:-1}) || [];
        res.render('addAddress',{orders});

      } catch(error){
          console.log(error.message); 
      }
}
  
const addAddress = async (req, res) => {
      try {
        const {
          addressType,
          houseNo,
          street,
          landmark,
          pincode,
          city,
          district,
          state,
          country
        } = req.body;
    
     
        const user = await User.findById(req.session.user_id);
        if (!user) {
         console.log('user is not found');
        }
    
       
        let useraddresses = await addressModel.findOne({
          user: user._id
        });
    
        if (!useraddresses) {
          useraddresses = new addressModel({
            user:  user._id,
            addresses: []
          });
        }

        const existingAddress = useraddresses.addresses.find((address) =>
          address.addressType === addressType &&
          address.HouseNo === houseNo &&
          address.Street === street &&
          address.pincode === pincode &&
          address.Landmark === landmark &&
          address.city === city &&
          address.district === district&&
          address.State === state &&
          address.Country === country
        );
        const existtype=useraddresses.addresses.find((address) =>address.addressType === addressType);

        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const totalOrdersCount = await orderModel.countDocuments({ user: req.session.user_id });
        const totalPages = Math.ceil(totalOrdersCount / limit);
        const skip = (page - 1) * limit;

        let address = await addressModel.findOne({ user: req.session.user_id }) || null;
        const orders = await orderModel.find({ user: req.session.user_id }).skip(skip).limit(limit).sort({orderDate:-1}) || [];

        if (existingAddress) {
         
          res.render('addAddress',{orders,totalPages, currentPage: page,error:'Address already exists for this user'});
        }
        
        else if(existtype) {
         
          res.render('addAddress',{orders,totalPages, currentPage: page,error:`${existtype.addressType} is alredy registered`});
        }
      
        else if (useraddresses.addresses.length >= 3) {
          
          res.render('addAddress',{orders,totalPages, currentPage: page,error:'User cannot have more than 3 addresses'});
        }
    else{
        
        const newAddress = {
          addressType: addressType,
          HouseNo: houseNo,
          Street: street,
          Landmark: landmark,
          pincode: pincode,
          city: city,
          district: district,
          State: state,
          Country: country,
        };
    
        useraddresses.addresses.push(newAddress);
    
    
        await useraddresses.save();
    
       res.redirect('/userProfile');
      }
      } catch (err) {
      
        console.log('addaddress:',err.message)
      }
 };
  
const loadeditAddress=async(req,res)=>{
      try{
        const user= await User.findById(req.session.user_id);
        // console.log(user)
        let useraddresses = await addressModel.findOne({
          user:user._id
        });
        //console.log(useraddresses)
        const addressType=req.query.addressType;
        const address = useraddresses.addresses.find(address => address.addressType === addressType);
        const orders = await orderModel.findOne({user:req.session.user_id}).sort({orderDate:-1});
        const wallet = await Wallet.findOne({ user: req.session.user_id }).populate('user');

    if (address) {
        res.render('editAddress', { addresses: address,orders,wallet });
    } else {
        console.log('Address or HouseNo not found');
    }
      }
      catch(error){
        console.log('editAddress',error.message);
      }
};
  
const editAddress = async (req, res) => {
      try {
          const {
              addressType,
              houseNo,
              street,
              landmark,
              pincode,
              city,
              district,
              state,
              country
          } = req.body;
  
          const addresses = await addressModel.findOne({
              user: req.session.user_id
          });
  
          if (!addresses) {
              return res.status(404).send('Address not found');
          }
  
          const addressToEdit = addresses.addresses.find(addr => addr.addressType === addressType);
  
          if (!addressToEdit) {
              return res.status(404).send('Address type not found');
          }
  
          addressToEdit.HouseNo = houseNo;
          addressToEdit.Street = street;
          addressToEdit.Landmark = landmark;
          addressToEdit.pincode = pincode;
          addressToEdit.city = city;
          addressToEdit.district = district;
          addressToEdit.State = state;
          addressToEdit.Country = country;
  
          await addresses.save();
          const user=await User.findById(req.session.user_id);

          const page = parseInt(req.query.page) || 1;
          const limit = 8;
  
          const totalOrdersCount = await orderModel.countDocuments({ user: req.session.user_id });
          const totalPages = Math.ceil(totalOrdersCount / limit);
          const skip = (page - 1) * limit;
  
          let address = await addressModel.findOne({ user: req.session.user_id }) || null;
          const orders = await orderModel.find({ user: req.session.user_id }).skip(skip).limit(limit).sort({orderDate:-1}) || [];

          const wallet = await Wallet.findOne({ user: req.session.user_id }).populate('user');

          return res.render('userProfile', { address:addresses,totalPages, currentPage: page, message: 'Updated successfully!' ,user,orders,wallet});

      } catch (err) {
          console.error('editAddress:', err.message);
          return res.status(500);
      }
};
  
const deleteAddress=async(req,res)=>{
      try{
            const user = await User.findById(req.session.user_id);
            if (!user) {
              return res.status(404).json({
                success: false,
                message: 'User not found'
              });
            } 

            const addresses = await addressModel.findOne({
              user: user._id
            })

            const addressTypeToDelete = req.query.addressType; 

            const addressIndexToDelete = addresses.addresses.findIndex((address) => address.addressType === addressTypeToDelete);

            addresses.addresses.splice(addressIndexToDelete, 1);
            await addresses.save();

            const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const totalOrdersCount = await orderModel.countDocuments({ user: req.session.user_id });
        const totalPages = Math.ceil(totalOrdersCount / limit);
        const skip = (page - 1) * limit;

        let address = await addressModel.findOne({ user: req.session.user_id }) || null;
        const orders = await orderModel.find({ user: req.session.user_id }).skip(skip).limit(limit).sort({orderDate:-1}) || [];
        const wallet = await Wallet.findOne({ user: req.session.user_id }).populate('user');

        res.render('userProfile',{address:addresses,totalPages, currentPage: page,message:`${addressTypeToDelete} Address removed successfully`,user,orders,wallet});
        }
        catch(error){
        console.log('deleteAddress',error.message);
   }
};

const cancelOrder = async (req, res) => {
    try {
        const { reason, oId } = req.body;

        if (!reason || !oId) {
            return res.status(400).json({ success: false, error: "Reason and orderId are required" });
        }

        const order = await orderModel.findOne({ oId });

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ success: false, error: "Cannot cancel a delivered order" });
        }

        const newCancelRequest = {
            type: 'Cancel',
            status: 'Pending',
            reason: reason
        };

        order.requests.push(newCancelRequest);
        await order.save();

        res.json({ success: true, message: "Order cancel request submitted successfully" });
    } catch (error) {
        console.error("cancelOrder error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};


const returnOrder = async (req, res) => {
    try {
        const { reason, oId } = req.body;

        if (!reason || !oId) {
            return res.status(400).json({ success: false, error: "Reason and orderId are required" });
        }

        const order = await orderModel.findOne({ oId });

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, error: "Cannot return an order that is not delivered" });
        }

        const newReturnRequest = {
            type: 'Return',
            status: 'Pending',
            reason: reason
        };

        order.requests.push(newReturnRequest);
        await order.save();

        res.json({ success: true, message: "Order return request submitted successfully" });
    } catch (error) {
        console.error("returnOrder error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

function generateRefferalCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';
    for (let i = 0; i < length; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log("referralCode:",referralCode);
    return referralCode;
  }

const getRefferals = async(req, res) => {

    const user = await User.findOne({ _id: req.session.user_id});
    if(user){
        var referralCode = user.referralCode;
    }
    if(!referralCode){
      const refferalCode = generateRefferalCode(8);
      user.referralCode = refferalCode;
      await user.save();
    }
    
    console.log(user);

    successfullRefferals = user.successfullRefferals.reverse();

    res.render("refferals", {
      refferalCode: user.referralCode,
      successfullRefferals,
      refferalRewards:user.refferalRewards
    })
}

const loadInvoice=async(req,res)=>{
    try {
      const id=req.query.id;
      console.log("in loadinvoice page:",id);

      const invoiceId = `MWS-2024-${Math.floor(100000 + Math.random() * 900000)}`;

      const findOrder=await orderModel.findById({_id:id})
      const proId = [];

      var user = await User.findOne({_id:findOrder.user});
      console.log("username:",user);
  
      for (let i = 0; i < findOrder.items.length; i++) {
        proId.push(findOrder.items[i].productId);
      }
      const proData = [];
  
      for (let i = 0; i < proId.length; i++) {
        proData.push(await productModel.findById({ _id: proId[i] }));
      }

      const date = new Date().toDateString();
      res.render("invoice",{proData, findOrder,user,invoiceId,date});
      
    } catch (error) {
      console.log(error.message)
    }
}

const rewardRefferalToWallet = async (req, res) => {
    try {
        var userId = req.session.user_id;
        console.log("userId:", userId);

        var codeData = await User.findOne({_id: userId });
        console.log("codeData:", codeData);
        console.log("codeDatarefferalRewards:", codeData.refferalRewards);

        let wallet = await walletModel.findOne({ user: userId });

        if (!wallet) {
            console.log("Creating new wallet for user:", codeData._id);
            wallet = new walletModel({ user: userId,amount: codeData.refferalRewards,transaction:[] });
            wallet.transaction.push({
                date: new Date(),
                paymentMethod: 'wallet',
                amount: codeData.refferalRewards,
                paymentStatus: 'reward'
              });
        } else {
            wallet.amount += codeData.refferalRewards;
            wallet.transaction.push({
                date: new Date(),
                paymentMethod: 'wallet',
                amount: codeData.refferalRewards,
                paymentStatus: 'reward'
              });
        }
        await wallet.save();
        codeData.refferalRewards = 0;
        await codeData.save();

        console.log("Updated wallet:", wallet);

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Failed to update wallet." });
    }
};


module.exports = {
    loadRegister,
    loginLoad,
    verifyLogin,
    loadHome,
    userLogout,
    forgetverify,
    forgetLoad,
    sentResetPasswordMail,
    forgetPasswordLoad,
    resetPassword,
    loadOtp,
    insertUser,
    getOtp,
    resendOtp,
    loaduserprofile,
    editprofile,
    loadaddaddress,
    addAddress,
    loadeditAddress,
    editAddress,
    deleteAddress,
    cancelOrder,
    loadLandPage,
    returnOrder,
    getRefferals,
    loadInvoice,
    rewardRefferalToWallet
}
