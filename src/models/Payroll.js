const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "reoirts";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    uid: { type: String, ref: 'Users' },
    record: {
        type: Array,
        required: true,
        default: []
    },
    date: {
        type: Date,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    from: {
        type: String,
        required: true,
    },
    to: {
        type: String,
        required: true,
    },
    totalHours: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
    },
}

const reportsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Payroll', reportsSchema, collectionName);