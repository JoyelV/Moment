const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectID = mongoose.Schema.Types.ObjectId;

const walletSchema = new Schema({
      user: {
        type: ObjectID,
        ref: 'User',
        required: true,
      },
      amount: {
        type: Number,
        default: 0,
      },
      transaction: [{
        date: {
            type: Date,
            default: Date.now
        },
        paymentMethod:{
            type: String,
            enum : [ 'razorpay','wallet']
        },
        amount:{
            type: Number,
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['refund','debit','credit',"reward"],
            required: true
        }
      }]
    });

    const walletModel = mongoose.model('wallet', walletSchema);

    module.exports = walletModel;

