const mongoose = require('mongoose')
const { Schema, Types } = mongoose;
const collectionName = "group";
const moment = require('moment-timezone');
moment().tz('Asia/Manila').format();
const current_date = new Date(`${moment().tz('Asia/Manila').toISOString(true).substring(0, 23)}Z`);
const data = {
	groupid: {
		type: Types.ObjectId,
		required: true
	},
   	store: {
    	type: Array,
    	required: true,
    	default: []
   	},
};

const groupSchema = new Schema(data, { timestamps: true });
module.exports = mongoose.model('group', groupSchema, collectionName);