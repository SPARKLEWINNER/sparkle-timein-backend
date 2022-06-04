const mongoose = require("mongoose");
const { Schema } = mongoose;
const collectionName = "subscription";
const data = {
    name: {
        type: String,
        required: true,
    },
    userLimit: {
        type: Number,
        required: true,
    },
    branchLimit: {
        type: Number,
        required: true,
    },
    details: {
        type: String,
        required: true
    },
    sortBy: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: new Date()
    }
};

const subscriptionSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model("Subscription", subscriptionSchema, collectionName);
