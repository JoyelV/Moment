const mongoose = require("mongoose")
const categoryOfferSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    startingDate:{
        type:Date,
        required:true
        
    },
    endingDate:{
        type:Date,
        required:true
    },
    categoryOffer: {
        category: { type: mongoose.Schema.Types.ObjectId, ref: "categories" },
        discount: { type: Number },
        offerStatus: {
          type: Boolean,
          default: true,
        },
        
      },
      is_active: {  
        type: Boolean,
        default: true  
    }
    
})
categoryOfferSchema.pre("save", function (next) {
    const currentDate = new Date();
    if (currentDate > this.endingDate) {
      this.categoryOffer.offerStatus = false;
    }
    next();
});

  const categoryOfferModel = mongoose.model("categoryOffers", categoryOfferSchema);
  
  module.exports = categoryOfferModel;