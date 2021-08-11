const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "records";
const data = {
    uid: { type: Types.ObjectId, ref: 'Users' },
    date: {
        type: Date,
        required: true
    },
    record: {
        type: Array,
        required: true,
        default: []
    },
    status: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}

const recordSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Record', recordSchema, collectionName);