const mongoose = require('mongoose');
const ObjectID = mongoose.Schema.Types.ObjectId;

const cartSchema = new mongoose.Schema({
  owner : {
  type: ObjectID,
   required: true,
   ref: 'users'
 },

 items: [{
    productId: {
      type: ObjectID,
      ref: 'Products',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min:[1, 'Quantity can not be less then 1.'],
      default: 1
      },
    price: {
      type:Number
    },
   
    selected: {
      type: Boolean, 
      default: false, 
  },
   }],
 
billTotal: {
    type: Number,
    required: true,
   default: 0
  },
  deliveryCharges: {
        type: Number,
        default: 100,
  },
  shipping:{
    type:Number,
    default: 0
  },
  isApplied:{
    type: Boolean, 
    default: false,
  },
  coupon:{
    type:String,
    default:'nil'
  },
  discountPrice:{
    type: Number,
    default: 0,
 }
}, {
timestamps: true
})

const cartModel = mongoose.model('Cart',cartSchema);

module.exports=cartModel;