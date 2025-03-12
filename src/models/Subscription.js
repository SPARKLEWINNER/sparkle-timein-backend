const mongoose = require("mongoose");
const { Schema } = mongoose;
const collectionName = "subscription";
const data = {
    store: {
        type: String,
        required: true,
    },
    feature: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: false,
    },
    length: {
        type: String,
        required: false,
    },
    expiry: {
        type: Date,
        required: false,
        default: new Date()
    },
    createdAt: {
        type: Date,
        default: new Date()
    },
    updatedAt: {
        type: Date,
        default: new Date()
    }
};

const subscriptionSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("Subscription", subscriptionSchema, collectionName);
