const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "holiday";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    holiday:{
        type: String,
        required: true
    },
    type:{
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true,
    },
}

const holidaySchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('holiday', holidaySchema, collectionName);