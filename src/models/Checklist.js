const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "checklist";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
    store: {
        type: String,
        required: true,
    },
    checklists: {
        type: Array,
        required: true,
    },
    toggle: {
        type: Boolean,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date()
    },
    updatedAt: {
        type: Date,
        default: new Date()
    }
};

const checklistSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('Checklist', checklistSchema, collectionName);