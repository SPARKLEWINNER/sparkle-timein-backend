const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "billing";
const data = {
    uid: { type: Types.ObjectId, ref: 'Users' },
    address: {
        type: String,
        required: true
    },
    address2: {
        type: String,
        default: null,
    },
    zipCode: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true,
        default: null,
    },
    city: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    },
    subscription: { type: String, default: 0 },
    createdAt: {
        type: Date,
        default: new Date(),
    },
}

const billingSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Billing', billingSchema, collectionName);