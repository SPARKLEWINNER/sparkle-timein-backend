const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "tokens";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = `${moment().toISOString(true).substring(0, 23)}Z`;
const data = {
    token: {
        type: String,
        required: true
    },
        createdAt: {
        type: Date,
        default: current_date,
    }
}

const tokensSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Tokens', tokensSchema, collectionName);