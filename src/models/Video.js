const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "videotutorials";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    uid:{
        type: String,
        required: true
    },
    store:{
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    youtubeId: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
}

const reportsSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('VideoTutorials', reportsSchema, collectionName);