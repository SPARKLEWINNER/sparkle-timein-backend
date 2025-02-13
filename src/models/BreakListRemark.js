const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "breaklist-remark";

const data = {
    id: {
        type: String, 
        required: true
    }, 
    remark: {
        type: String
    }, 
    breaklistId: {
        type: String
    }
};

const breaklistSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('BreaklistRemark', breaklistSchema, collectionName);