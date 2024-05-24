const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true
  },
  rating: {
      type: Number,
      required: true
  },
  reviewText: {
      type: String
  },
  name:{
    type: String,
    required: true 
   },
   email:{
    type: String,
    required: true 
   }
  
}, {
  timestamps: true
});

module.exports = mongoose.model('Review',reviewSchema);

