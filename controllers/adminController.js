const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const randomstring = require('randomstring');
const config = require("../config/config");
const nodemailer = require("nodemailer");
const Category = require("../models/categoryModel");
const orderModel = require("../models/orderModel")
const productModel = require("../models/productModel")
const walletModel = require("../models/walletModel")
const bestSelling = require("../controllers/bestSelling");

const loadLogin = async(req,res)=>{
    try{
        res.render('login');
    } catch (error){
        console.log(error.message);
    }
}

const verifyLogin = async(req,res)=>{
    try{
     const email = req.body.email;
     const password = req.body.password;
     const userData = await User.findOne({email:email});

     if(userData){
        const passwordMatch = await bcrypt.compare(password,userData.password);

            if(passwordMatch){
                if(userData.is_admin === 0){
                    res.render('login',{message:"Email and password is incorrect"});
                }
                else{
                    req.session.user_id = userData._id;
                    res.redirect('/admin/home');
                }
            }
            else{
                res.render('login',{message:"Email and password is incorrect"});
            }
       }
      else{
        res.render('login',{message:"Email and password is incorrect"});
     }

    } catch (error){
        console.log(error.message);
    }
}

const getDashboard = async(req,res)=>{
try{
  const userData = await User.findById({_id:req.session.user_id});
  const users = await User.find();
  const products = await productModel.find();
  const usersCount = await User.find().countDocuments();
  const productsCount = await productModel.find().countDocuments();

  const confirmedOrders = await orderModel.aggregate([
    { $match: { status: "Pending" } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalRevenue: { $sum: "$billTotal" },
      },
    },
  ]).exec();

  const ordersCount = await orderModel.find({
    status: "Pending",
  }).countDocuments();

  // best selling
  let bestSellingProducts = await bestSelling.getBestSellingProducts();
  let bestSellingBrands = await bestSelling.getBestSellingBrands();
  let bestSellingCategories = await bestSelling.getBestSellingCategories();

  res.render("home", {
    users,
    products,
    usersCount,
    ordersCount,
    productsCount,
    bestSellingBrands,
    bestSellingProducts,
    bestSellingCategories,
    totalRevenue: confirmedOrders[0] ? confirmedOrders[0].totalRevenue : 0,
    admin: userData,
  });
    } catch (error){
        console.log(error.message);
    }
}

const getBestSelling = async(req,res)=>{
  try{
    const userData = await User.findById({_id:req.session.user_id});
    const users = await User.find();
    const products = await productModel.find();
    const usersCount = await User.find().countDocuments();
    const productsCount = await productModel.find().countDocuments();
  
    const confirmedOrders = await orderModel.aggregate([
      { $match: { status: "Pending" } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: "$billTotal" },
        },
      },
    ]).exec();
  
    const ordersCount = await orderModel.find({
      status: "Pending",
    }).countDocuments();
  
    // best selling
    let bestSellingProducts = await bestSelling.getBestSellingProducts();
    let bestSellingBrands = await bestSelling.getBestSellingBrands();
    let bestSellingCategories = await bestSelling.getBestSellingCategories();
  
    res.render("home2", {
      users,
      products,
      usersCount,
      ordersCount,
      productsCount,
      bestSellingBrands,
      bestSellingProducts,
      bestSellingCategories,
      totalRevenue: confirmedOrders[0] ? confirmedOrders[0].totalRevenue : 0,
      admin: userData,
    });
      } catch (error){
          console.log(error.message);
      }
}

const getChartData = async(req,res)=>{
  try {
    let timeBaseForSalesChart = req.query.salesChart;
    let timeBaseForOrderNoChart = req.query.orderChart;
    let timeBaseForOrderTypeChart = req.query.orderType;
    let timeBaseForCategoryBasedChart = req.query.categoryChart;

    function getDatesAndQueryData(timeBaseForChart, chartType) {
      let startDate, endDate;

      let groupingQuery, sortQuery;

      if (timeBaseForChart === "yearly") {
        startDate = new Date(new Date().getFullYear(), 0, 1);

        endDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

        groupingQuery = {
          _id: {
            month: { $month: { $toDate: "$createdAt" } },
            year: { $year: { $toDate: "$createdAt" } },
          },
          totalSales: { $sum: "$billTotal" },
          totalOrder: { $sum: 1 },
        };

        sortQuery = { "_id.year": 1, "_id.month": 1 };
      }

      if (timeBaseForChart === "weekly") {
        startDate = new Date();

        endDate = new Date();

        const timezoneOffset = startDate.getTimezoneOffset();

        startDate.setDate(startDate.getDate() - 6);

        startDate.setUTCHours(0, 0, 0, 0);

        startDate.setUTCMinutes(startDate.getUTCMinutes() + timezoneOffset);

        endDate.setUTCHours(0, 0, 0, 0);

        endDate.setDate(endDate.getDate() + 1);

        endDate.setUTCMinutes(endDate.getUTCMinutes() + timezoneOffset);

        groupingQuery = {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalSales: { $sum: "$billTotal" },
          totalOrder: { $sum: 1 },
        };

        sortQuery = { _id: 1 };
      }

      if (timeBaseForChart === "daily") {
        startDate = new Date();
        endDate = new Date();

        const timezoneOffset = startDate.getTimezoneOffset();

        startDate.setUTCHours(0, 0, 0, 0);

        endDate.setUTCHours(0, 0, 0, 0);

        endDate.setDate(endDate.getDate() + 1);

        startDate.setUTCMinutes(startDate.getUTCMinutes() + timezoneOffset);

        endDate.setUTCMinutes(endDate.getUTCMinutes() + timezoneOffset);

        groupingQuery = {
          _id: { $hour: "$createdAt" },
          totalSales: { $sum: "$totalPrice" },
          totalOrder: { $sum: 1 },
        };

        sortQuery = { "_id.hour": 1 };
      }

      if (chartType === "sales") {
        return { groupingQuery, sortQuery, startDate, endDate };
      } else if (chartType === "orderType") {
        return { startDate, endDate };
      } else if (chartType === "categoryBasedChart") {
        return { startDate, endDate };
      } else if (chartType === "orderNoChart") {
        return { groupingQuery, sortQuery, startDate, endDate };
      }
    }

    const salesChartInfo = getDatesAndQueryData(
      timeBaseForSalesChart,
      "sales"
    );

    const orderChartInfo = getDatesAndQueryData(
      timeBaseForOrderTypeChart,
      "orderType"
    );

    const categoryBasedChartInfo = getDatesAndQueryData(
      timeBaseForCategoryBasedChart,
      "categoryBasedChart"
    );

    const orderNoChartInfo = getDatesAndQueryData(
      timeBaseForOrderNoChart,
      "orderNoChart"
    );

    let salesChartData = await orderModel.aggregate([
      {
        $match: {
          $and: [
            {
              createdAt: {
                $gte: salesChartInfo.startDate,
                $lte: salesChartInfo.endDate,
              },
              status: {
                $nin: ["Cancelled", "Failed", "Refunded"],
              },
            },
            {
              paymentStatus: {
                $nin:['Pending', 'Processing','Canceled', 'Returned'],
              },
            },
          ],
        },
      },

      {
        $group: salesChartInfo.groupingQuery,
      },
      {
        $sort: salesChartInfo.sortQuery,
      },
    ]).exec();

    let orderNoChartData = await orderModel.aggregate([
      {
        $match: {
          $and: [
            {
              createdAt: {
                $gte: orderNoChartInfo.startDate,
                $lte: orderNoChartInfo.endDate,
              },
              status: {
                $nin: ['Canceled', 'Returned'],
              },
            },
            {
              paymentStatus: {
                $nin: ["Pending", "Failed", "Refunded", "Cancelled"],
              },
            },
          ],
        },
      },

      {
        $group: orderNoChartInfo.groupingQuery,
      },
      {
        $sort: orderNoChartInfo.sortQuery,
      },
    ]).exec();

    let orderChartData = await orderModel.aggregate([
      {
        $match: {
          $and: [
            {
              createdAt: {
                $gte: orderChartInfo.startDate,
                $lte: orderChartInfo.endDate,
              },
              status: {
                $nin: ['Pending', 'Processing','Canceled', 'Returned'],
              },
            },
            {
              paymentStatus: {
                $nin: ["Pending", "Refunded", "Cancelled","Failed"],
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          totalOrder: { $sum: 1 },
        },
      },
    ]).exec();

    console.log(orderChartData);

    let categoryWiseChartData = await orderModel.aggregate([
      {
        $match: {
          $and: [
            {
              createdAt: {
                $gte: categoryBasedChartInfo.startDate,
                $lte: categoryBasedChartInfo.endDate,
              },
              status: {
                $nin: ['Pending', 'Processing','Canceled', 'Returned'],
              },
            },
            {
              paymentStatus: {
                $nin: ['Pending', 'Failed'],
              },
            },
          ],
        },
      },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $replaceRoot: {
          newRoot: "$productInfo",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "catInfo",
        },
      },
      {
        $addFields: {
          categoryInfo: { $arrayElemAt: ["$catInfo", 0] },
        },
      },
      {
        $project: {
          catInfo: 0,
        },
      },
      {
        $addFields: {
          catName: "$categoryInfo.name",
        },
      },
      {
        $group: {
          _id: "$catName",
          count: { $sum: 1 },
        },
      },
    ]).exec();

    let saleChartInfo = {
      timeBasis: timeBaseForSalesChart,
      data: salesChartData,
    };

    let orderTypeChartInfo = {
      timeBasis: timeBaseForOrderTypeChart,
      data: orderChartData,
    };

    let categoryChartInfo = {
      timeBasis: timeBaseForOrderTypeChart,
      data: categoryWiseChartData,
    };

    let orderQuantityChartInfo = {
      timeBasis: timeBaseForOrderNoChart,
      data: orderNoChartData,
    };

    return res
      .status(200)
      .json({
        saleChartInfo,
        orderTypeChartInfo,
        categoryChartInfo,
        orderQuantityChartInfo,
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

const logout = async(req,res)=>{
    try{
       req.session.destroy();
       res.redirect('/admin');
    } catch (error){
        console.log(error.message); 
    }
}

const customersList = async(req,res)=>{
    try{
      const usersData = await User.find({is_admin:0})
      res.render('customers',{users:usersData});
    }catch(error){
        console.log(error.message);
    }
}

const blockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { block: '1' });
        res.redirect('/admin/customers');
    } catch (error) {
        console.log(error.message);
    }
};

const unblockUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, { block: '0' });

        res.redirect('/admin/customers');
    } catch (error) {
        console.log(error.message);
    }
};

const loadCategory = async(req,res)=>{
    try{
      const category = await Category.find({});  
      res.render('category',{category, message: 'Welcome back to category page'});
    } catch(error){
        console.log(error.message);
    }
}


const loadorder = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        let query = req.query.q;

        if (!query || query.trim() === '') {
            query = 'All';
        }
        const limit = 18; 
        let filter = {};
        const currentPage = parseInt(page) || 1;

        if (query && query.toLowerCase() !== 'all') {
          const users = await User.find({ name: { $regex: new RegExp(query, 'i') } });
          const userIDs = users.map(user => user._id);
    
          if (userIDs.length > 0) {
            filter.user = { $in: userIDs };
          } else {
            switch (query) {
              case 'Delivered':
                filter.status = 'Delivered';
                break;
              case 'Pending':
                filter.status = 'Pending';
                break;
              case 'Processing':
                filter.status = 'Processing';
                break;
              case 'Shipped':
                filter.status = 'Shipped';
                break;
              case 'Canceled':
                filter.status = 'Canceled';
                break;
              case 'Returned':
                filter.status = 'Returned';
                break;
              default:
                filter.oId = query;
            }
          }
        }
    
        var totalOrders = await orderModel.countDocuments(filter);
        if(!totalOrders){
          totalOrders = await orderModel.countDocuments({});
        }
        const totalPages = Math.ceil(totalOrders / limit);
        const adjustedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
        const skip = (adjustedCurrentPage - 1) * limit;
    
        const orders = await orderModel.find(filter)
          .skip(skip)
          .limit(limit)
          .populate('user');
    
        res.render('orders', {
          order: orders,
          currentPage: adjustedCurrentPage,
          totalPages,
          query: query,
        });
      } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send('Internal Server Error');
      }
};

const loadorderdetails = async(req,res)=>{
  try{
    const id =req.query.id;
    const orders = await orderModel.findById(id).populate({path:'user',model:'User'});
    res.render('adminorderdetails',{orders});
  }catch(error){
    console.log(error.message);
  }
}

const requestAccept = async (req, res) => {
    try {
      const { orderId, userId } = req.body;
      console.log("orderId",orderId);

      const canceledOrder = await orderModel.findOne({ oId: orderId });
      // console.log("canceledOrder in requestAccept",canceledOrder);

      // canceledOrder.requests.status = "Accepted";
      // canceledOrder.status = 'Canceled';
      // await canceledOrder.save();

      if (!canceledOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      for (const orderItem of canceledOrder.items) {
        let product = await productModel.findById(orderItem.productId).exec();
  
        if (product) {
          product.countInStock += Number(orderItem.quantity);
          await product.save();
        }
      }
  
      let userWallet = await walletModel.findOne({ user: userId });
      if (!userWallet) {

        userWallet = new walletModel({
          user: userId,
          amount: 0,
          transaction: []
        });
      }
  
      const refundAmount = canceledOrder.billTotal; 
      console.log("refundAmount",refundAmount);
      userWallet.amount += refundAmount;
  
      userWallet.transaction.push({
        date: new Date(),
        paymentMethod: 'wallet',
        amount: refundAmount,
        paymentStatus: 'refund'
      });
  
      await userWallet.save();
  
    for (let request of canceledOrder.requests) {
        if (request.status === 'Pending' && request.type === 'Cancel') {
          const newStatus = 'Canceled';
          console.log("newStatus after accept request:", newStatus);

        const value = await orderModel.findOne({ oId: orderId });
        value.status = newStatus;
        
        value.requests.forEach(request=>{
          request.status = 'Accepted';
        })

        await value.save();
        console.log("value:",value);
        }
        if (request.status === 'Pending' && request.type === 'Return') {
          const newStatus = 'Returned';
          console.log("newStatus after accept request:", newStatus);

        const value = await orderModel.findOne({ oId: orderId });
        value.status = newStatus;
        
        value.requests.forEach(request=>{
          request.status = 'Accepted';
        })

        await value.save();
        console.log("value:",value);
        }
      }
  
       return res.status(200).json({ success: true, message: 'Order status updated successfully' });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const requestCancel = async(req,res)=>{
  try {
      const { orderId} = req.body;
      const Order = await orderModel.findOne({oId:orderId});

      console.log("orderId",orderId);

          if (!Order) {
              return res.status(404).json({ success: false, message: 'Order not found' });
          }
      
      for (const orderItem of Order.items) {
          const product = await productModel.findById(orderItem.productId);

          if (product &&product.countInStock>0 ) {
              await product.save();
          }
      }

      Order.requests.forEach(request=>{
        request.status = 'Rejected';
      })
      
      await Order.save();

      console.log("Order in admin order",Order);
      
  if (Order) {
    return res.status(200).json({ success: true, message: 'Order status rejected'})
  }
  return res.status(201).json({ success: true, message: 'Order status updated successfully' });
 
   }catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Internal server error' });
  }
}

const updateorder = async(req,res)=>{
  try{
      const {newStatus,orderId} = req.body;
     
      const order=await orderModel.findOne({oId:orderId});

      if (newStatus === 'Shipped') {
        for (const orderItem of order.items) {
            const product = await productModel.findById(orderItem.productId);

            if (product) {
                product.countInStock -= orderItem.quantity;
                await product.save();
            }
        }
    } else if(newStatus==='Canceled' || newStatus === 'Returned'){
          for (const orderItem of order.items) {
              let product = await productModel.findById(orderItem.productId);
  
              if (product) {
                  product.countInStock += orderItem.quantity;
                  await product.save();
              }
          }
      }
      const updatedOrder = await orderModel.findOneAndUpdate(
          { oId: orderId },
          {$set:{ status: newStatus } },
      );

      updatedOrder.save();
        
      if (!updatedOrder) {
          return res.status(404).json({ success: false, message: 'Order not found' });
      }

      return res.status(200).json({ success: true, message: 'Order status updated successfully', updatedOrder });
  }
  catch(error){
      console.log('uporder:',error.message);
  }
}


module.exports = {
    loadLogin,
    verifyLogin,
    getDashboard,
    getBestSelling,
    logout,
    customersList,
    blockUser,
    unblockUser,
    loadCategory,
    updateorder,
    requestCancel,
    requestAccept,
    loadorderdetails,
    loadorder,
    getChartData
}