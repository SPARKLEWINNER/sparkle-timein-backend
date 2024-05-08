const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "breaklistinfo";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    store: {
        type: String,
        required: true,
    },
    breaklistid: {
    	type: Number,
    	required: true,
    }
    employeename: {
        type: String,
        required: true,
    },
    employeeid: {
        type: Number,
        required: true,
    },
    dayswork: {
        type: Number,
        required: true,
        default: 0,
    },
    hourswork: {
        type: Number,
        required: true,
        default: 0,
    },
    hourstardy: {
        type: Number,
       	default: 0,
    },
    overtime: {
        type: Date,
        default: 0,
    },
    specialholiday: {
        type: Number,
        default: 0,
    },
    legalholiday: {
        type: Number,
        default: 0,
    },
    nightdiff: {
        type: Number,
        default: 0,
    },
};

const breaklistInfoSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Breaklistinfo', breaklistInfoSchema, collectionName);