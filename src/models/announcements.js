const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "announcements";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    store: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
    },
}

const reportsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Announcements', reportsSchema, collectionName);