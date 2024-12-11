const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "breaklist";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    store: {
        type: String,
        required: true,
    },
    breaklistid: {
    	type: String,
    	required: true,
    },
    datefrom: {
        type: Date,
        default: new Date(),
        required: true,
    },
    dateto: {
        type: Date,
        default: new Date(),
        required: true,
    },
    generatedby: {
        type: String,
        required: true,
    },
    approvedby: {
        type: String,
    },
    employeecount: {
        type: Number,
        required: true,
        default: 0,
    },
    approved: {
        type: Boolean,
        default: false,
    },
    cutoff: {
        type: Number,
        required: true,
        default: 0,    
    }
};

const breaklistSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Breaklist', breaklistSchema, collectionName);