const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema({
   name:{
    type: String,
    required: true 
   },
   email:{
    type: String,
    required: true 
   },
   mobile:{
    type: String,
    required:false
   },
   password:{
    type: String,
    required: false 
   },
   is_admin:{
     type:Number,
     default:0  
   },
   is_varified:{
    type: String,
    default:0 
   },
   block:{
    type: String,
    default:0 
   },
   token: {
        type: String,
      default: ''
   },
   status:{
       type: String,
       default: 0
   },    
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'orders' }],

  googleId: { type: String },

  referralCode: {
    type: String,
  },
  referralToken: {
    type: ObjectId,
  },
  successfullRefferals: [{
    date: {
      type: Date,
      default: Date.now,
    },
    username: {
      type: String,
    },
    status: {
      type: String,
    }
  }],
  refferalRewards: {
    type: Number,
    default: 0,
    min: 0,
  },

});

module.exports = mongoose.model('User',userSchema);


