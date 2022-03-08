const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "reports";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = `${moment().toISOString(true).substring(0, 23)}Z`;
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
        default: current_date,
    },
    workmate: {
        type: String,
    }
}

const reportsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Reports', reportsSchema, collectionName);