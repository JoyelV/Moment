const mongoose = require("mongoose")

const productOfferSchema = mongoose.Schema({
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
    productOffer: {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
        discount: { type: Number },
        offerStatus: {
          type: Boolean,
          default: false,
        },
    }
});

productOfferSchema.pre("save", function (next) {
    const currentDate = new Date();
    if (currentDate > this.endingDate) {
      this.productOffer.offerStatus = false;
    }
    next();
});

  const ProductOfferModel = mongoose.model("productOffers", productOfferSchema);
  
  module.exports = ProductOfferModel;