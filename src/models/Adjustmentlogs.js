const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "timeadjustmentlogs";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    uid: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    processid: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
    },
}

const adjustmentSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Adjustment', adjustmentSchema, collectionName);